#!/usr/bin/env node

/**
 * Performance Monitor for Load Testing
 * Monitors server metrics, Socket.IO performance, and system resources
 */

const axios = require('axios');
const EventEmitter = require('events');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class PerformanceMonitor extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.config = {
      serverUrl: options.serverUrl || 'http://localhost:3000',
      monitoringInterval: options.monitoringInterval || 5000, // 5 seconds
      metricsEndpoint: options.metricsEndpoint || '/metrics',
      healthEndpoint: options.healthEndpoint || '/health',
      outputDir: options.outputDir || path.join(__dirname, '../results/monitoring'),
      alertThresholds: {
        cpuUsage: 85,           // Percentage
        memoryUsage: 1024,      // MB
        responseTime: 1000,     // ms
        errorRate: 5,           // Percentage
        connectionDropRate: 10  // Percentage
      },
      ...options
    };
    
    this.metrics = [];
    this.alerts = [];
    this.isMonitoring = false;
    this.startTime = null;
    
    // Ensure output directory exists
    if (!fs.existsSync(this.config.outputDir)) {
      fs.mkdirSync(this.config.outputDir, { recursive: true });
    }
  }
  
  /**
   * Start monitoring
   */
  start() {
    console.log('📊 Starting performance monitoring...');
    console.log(`🎯 Target: ${this.config.serverUrl}`);
    console.log(`⏱️  Interval: ${this.config.monitoringInterval}ms`);
    
    this.isMonitoring = true;
    this.startTime = Date.now();
    
    // Start metric collection
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
    }, this.config.monitoringInterval);
    
    // Initial metric collection
    this.collectMetrics();
  }
  
  /**
   * Stop monitoring
   */
  stop() {
    console.log('🛑 Stopping performance monitoring...');
    
    this.isMonitoring = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    
    this.generateReport();
    this.emit('stopped');
  }
  
  /**
   * Collect comprehensive metrics
   */
  async collectMetrics() {
    const timestamp = Date.now();
    const metric = {
      timestamp,
      datetime: new Date(timestamp).toISOString()
    };
    
    try {
      // Collect server metrics
      const serverMetrics = await this.collectServerMetrics();
      metric.server = serverMetrics;
      
      // Collect system metrics
      const systemMetrics = await this.collectSystemMetrics();
      metric.system = systemMetrics;
      
      // Collect network metrics
      const networkMetrics = await this.collectNetworkMetrics();
      metric.network = networkMetrics;
      
      // Calculate derived metrics
      metric.derived = this.calculateDerivedMetrics(metric);
      
      // Check for alerts
      this.checkAlerts(metric);
      
    } catch (error) {
      console.error('❌ Error collecting metrics:', error.message);
      metric.error = error.message;
    }
    
    this.metrics.push(metric);
    this.emit('metric', metric);
    
    // Log current status
    this.logCurrentStatus(metric);
  }
  
  /**
   * Collect server-specific metrics from /metrics endpoint
   */
  async collectServerMetrics() {
    try {
      const response = await axios.get(`${this.config.serverUrl}${this.config.metricsEndpoint}`, {
        timeout: 5000
      });
      
      return {
        ...response.data,
        responseTime: response.headers['x-response-time'] || null,
        requestSuccess: true
      };
    } catch (error) {
      return {
        error: error.message,
        requestSuccess: false,
        responseTime: null
      };
    }
  }
  
  /**
   * Collect system-level metrics
   */
  async collectSystemMetrics() {
    const metrics = {};
    
    try {
      // CPU usage
      if (process.platform !== 'win32') {
        const cpuInfo = execSync('top -l 1 -s 0 | grep "CPU usage" || grep "Cpu(s)" /proc/stat 2>/dev/null || echo "CPU: N/A"', 
          { encoding: 'utf8', timeout: 3000 }).trim();
        metrics.cpuInfo = cpuInfo;
        
        // Parse CPU percentage (simplified - may need adjustment for different systems)
        const cpuMatch = cpuInfo.match(/(\d+\.?\d*)%/);
        metrics.cpuUsage = cpuMatch ? parseFloat(cpuMatch[1]) : null;
      }
      
      // Memory usage
      if (process.platform === 'linux') {
        const memInfo = execSync('free -m', { encoding: 'utf8', timeout: 3000 });
        const memLines = memInfo.split('\n');
        const memLine = memLines.find(line => line.startsWith('Mem:'));
        if (memLine) {
          const memParts = memLine.split(/\s+/);
          metrics.memory = {
            total: parseInt(memParts[1]),
            used: parseInt(memParts[2]),
            free: parseInt(memParts[3]),
            available: parseInt(memParts[6]) || parseInt(memParts[3])
          };
        }
      } else if (process.platform === 'darwin') {
        const memInfo = execSync('vm_stat', { encoding: 'utf8', timeout: 3000 });
        // Parse macOS memory info (simplified)
        metrics.memoryInfo = memInfo.split('\n').slice(0, 5).join(' ');
      }
      
      // Load average (Unix-like systems)
      if (process.platform !== 'win32') {
        const loadavg = execSync('uptime', { encoding: 'utf8', timeout: 3000 }).trim();
        metrics.loadAverage = loadavg;
        
        const loadMatch = loadavg.match(/load averages?:\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)/i) ||
                         loadavg.match(/load average:\s*([\d.]+),\s*([\d.]+),\s*([\d.]+)/i);
        if (loadMatch) {
          metrics.load = {
            '1min': parseFloat(loadMatch[1]),
            '5min': parseFloat(loadMatch[2]),
            '15min': parseFloat(loadMatch[3])
          };
        }
      }
      
      // Disk usage for current directory
      const diskUsage = execSync('df -h . 2>/dev/null || echo "Disk: N/A"', 
        { encoding: 'utf8', timeout: 3000 }).trim();
      metrics.diskUsage = diskUsage.split('\n')[1] || diskUsage;
      
    } catch (error) {
      metrics.error = error.message;
    }
    
    return metrics;
  }
  
  /**
   * Collect network metrics
   */
  async collectNetworkMetrics() {
    const metrics = {};
    
    try {
      // Ping test for latency
      const pingStart = Date.now();
      const healthResponse = await axios.get(`${this.config.serverUrl}${this.config.healthEndpoint}`, {
        timeout: 5000
      });
      const pingLatency = Date.now() - pingStart;
      
      metrics.pingLatency = pingLatency;
      metrics.healthCheck = healthResponse.data;
      metrics.healthCheckSuccess = healthResponse.status === 200;
      
      // Network connections (Unix-like systems)
      if (process.platform !== 'win32') {
        const netstat = execSync('netstat -an 2>/dev/null | grep :3000 | wc -l || echo "0"', 
          { encoding: 'utf8', timeout: 3000 }).trim();
        metrics.activeConnections = parseInt(netstat) || 0;
      }
      
    } catch (error) {
      metrics.error = error.message;
      metrics.healthCheckSuccess = false;
    }
    
    return metrics;
  }
  
  /**
   * Calculate derived metrics and performance indicators
   */
  calculateDerivedMetrics(metric) {
    const derived = {};
    
    // Memory utilization percentage
    if (metric.system.memory) {
      derived.memoryUtilization = ((metric.system.memory.used / metric.system.memory.total) * 100).toFixed(2);
    }
    
    // Response time trend (if we have previous metrics)
    if (this.metrics.length > 0) {
      const recentMetrics = this.metrics.slice(-5); // Last 5 measurements
      const responseTimes = recentMetrics
        .filter(m => m.server && m.server.responseTime)
        .map(m => m.server.responseTime);
      
      if (responseTimes.length > 0) {
        derived.avgResponseTime = (responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length).toFixed(2);
      }
    }
    
    // Connection health score
    let healthScore = 100;
    if (!metric.network.healthCheckSuccess) healthScore -= 30;
    if (metric.server && !metric.server.requestSuccess) healthScore -= 30;
    if (metric.network.pingLatency > 1000) healthScore -= 20;
    if (metric.system.cpuUsage > 80) healthScore -= 10;
    if (derived.memoryUtilization > 80) healthScore -= 10;
    
    derived.healthScore = Math.max(0, healthScore);
    
    return derived;
  }
  
  /**
   * Check for performance alerts
   */
  checkAlerts(metric) {
    const alerts = [];
    const thresholds = this.config.alertThresholds;
    
    // CPU usage alert
    if (metric.system.cpuUsage && metric.system.cpuUsage > thresholds.cpuUsage) {
      alerts.push({
        type: 'cpu_high',
        message: `High CPU usage: ${metric.system.cpuUsage}%`,
        value: metric.system.cpuUsage,
        threshold: thresholds.cpuUsage
      });
    }
    
    // Memory usage alert
    if (metric.system.memory && metric.system.memory.used > thresholds.memoryUsage) {
      alerts.push({
        type: 'memory_high',
        message: `High memory usage: ${metric.system.memory.used}MB`,
        value: metric.system.memory.used,
        threshold: thresholds.memoryUsage
      });
    }
    
    // Response time alert
    if (metric.network.pingLatency && metric.network.pingLatency > thresholds.responseTime) {
      alerts.push({
        type: 'response_slow',
        message: `Slow response time: ${metric.network.pingLatency}ms`,
        value: metric.network.pingLatency,
        threshold: thresholds.responseTime
      });
    }
    
    // Health check failure
    if (!metric.network.healthCheckSuccess) {
      alerts.push({
        type: 'health_check_failed',
        message: 'Health check endpoint failed',
        value: false,
        threshold: true
      });
    }
    
    // Log and store alerts
    alerts.forEach(alert => {
      alert.timestamp = metric.timestamp;
      alert.datetime = metric.datetime;
      this.alerts.push(alert);
      
      console.log(`🚨 ALERT: ${alert.message}`);
      this.emit('alert', alert);
    });
  }
  
  /**
   * Log current system status
   */
  logCurrentStatus(metric) {
    const elapsed = metric.timestamp - this.startTime;
    const elapsedSeconds = Math.floor(elapsed / 1000);
    
    let status = `📊 [${elapsedSeconds}s]`;
    
    // Health indicator
    const healthScore = metric.derived.healthScore;
    const healthIcon = healthScore >= 90 ? '🟢' : healthScore >= 70 ? '🟡' : '🔴';
    status += ` ${healthIcon} Health: ${healthScore}%`;
    
    // Connected clients
    if (metric.server && metric.server.connections) {
      status += ` | Clients: ${metric.server.connections.total}`;
    }
    
    // Response time
    if (metric.network.pingLatency) {
      status += ` | Latency: ${metric.network.pingLatency}ms`;
    }
    
    // CPU usage
    if (metric.system.cpuUsage) {
      status += ` | CPU: ${metric.system.cpuUsage}%`;
    }
    
    // Memory usage
    if (metric.derived.memoryUtilization) {
      status += ` | RAM: ${metric.derived.memoryUtilization}%`;
    }
    
    console.log(status);
  }
  
  /**
   * Generate monitoring report
   */
  generateReport() {
    console.log('\n📋 PERFORMANCE MONITORING REPORT');
    console.log('================================\n');
    
    if (this.metrics.length === 0) {
      console.log('No metrics collected');
      return;
    }
    
    const report = {
      summary: this.generateSummary(),
      alerts: this.alerts,
      metrics: this.metrics,
      analysis: this.generateAnalysis()
    };
    
    // Display summary
    console.log('📊 SUMMARY:');
    console.log(`Duration: ${report.summary.duration} seconds`);
    console.log(`Metrics collected: ${report.summary.totalMetrics}`);
    console.log(`Alerts triggered: ${report.summary.totalAlerts}`);
    console.log(`Average health score: ${report.summary.averageHealthScore}%`);
    
    if (report.summary.avgResponseTime) {
      console.log(`Average response time: ${report.summary.avgResponseTime}ms`);
    }
    
    if (report.summary.maxConnections) {
      console.log(`Peak connections: ${report.summary.maxConnections}`);
    }
    
    // Alert summary
    if (this.alerts.length > 0) {
      console.log('\n🚨 ALERTS:');
      const alertCounts = {};
      this.alerts.forEach(alert => {
        alertCounts[alert.type] = (alertCounts[alert.type] || 0) + 1;
      });
      
      Object.entries(alertCounts).forEach(([type, count]) => {
        console.log(`  ${type}: ${count} times`);
      });
    }
    
    // Performance analysis
    console.log('\n📈 ANALYSIS:');
    report.analysis.forEach(insight => {
      console.log(`  • ${insight}`);
    });
    
    // Save report
    this.saveReport(report);
  }
  
  /**
   * Generate summary statistics
   */
  generateSummary() {
    const totalDuration = (this.metrics[this.metrics.length - 1].timestamp - this.metrics[0].timestamp) / 1000;
    
    const healthScores = this.metrics
      .filter(m => m.derived && m.derived.healthScore)
      .map(m => m.derived.healthScore);
    
    const responseTimes = this.metrics
      .filter(m => m.network && m.network.pingLatency)
      .map(m => m.network.pingLatency);
    
    const connections = this.metrics
      .filter(m => m.server && m.server.connections && m.server.connections.total)
      .map(m => m.server.connections.total);
    
    return {
      duration: Math.floor(totalDuration),
      totalMetrics: this.metrics.length,
      totalAlerts: this.alerts.length,
      averageHealthScore: healthScores.length > 0 
        ? (healthScores.reduce((a, b) => a + b, 0) / healthScores.length).toFixed(1)
        : 'N/A',
      avgResponseTime: responseTimes.length > 0 
        ? (responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length).toFixed(1)
        : null,
      maxConnections: connections.length > 0 ? Math.max(...connections) : null,
      minHealthScore: healthScores.length > 0 ? Math.min(...healthScores) : null
    };
  }
  
  /**
   * Generate performance analysis insights
   */
  generateAnalysis() {
    const insights = [];
    
    // Alert analysis
    if (this.alerts.length === 0) {
      insights.push('No performance alerts triggered - system performed well');
    } else {
      insights.push(`${this.alerts.length} performance alerts triggered`);
      
      const alertTypes = [...new Set(this.alerts.map(a => a.type))];
      if (alertTypes.includes('cpu_high')) {
        insights.push('CPU usage exceeded threshold - consider scaling or optimization');
      }
      if (alertTypes.includes('memory_high')) {
        insights.push('Memory usage was high - monitor for memory leaks');
      }
      if (alertTypes.includes('response_slow')) {
        insights.push('Response times were slow - investigate network or processing delays');
      }
    }
    
    // Connection analysis
    const connectionMetrics = this.metrics.filter(m => m.server && m.server.connections);
    if (connectionMetrics.length > 0) {
      const maxConnections = Math.max(...connectionMetrics.map(m => m.server.connections.total));
      insights.push(`Peak concurrent connections: ${maxConnections}`);
    }
    
    // Health score trend
    const healthScores = this.metrics
      .filter(m => m.derived && m.derived.healthScore)
      .map(m => m.derived.healthScore);
    
    if (healthScores.length > 5) {
      const firstHalf = healthScores.slice(0, Math.floor(healthScores.length / 2));
      const secondHalf = healthScores.slice(Math.floor(healthScores.length / 2));
      
      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
      
      if (secondAvg < firstAvg - 10) {
        insights.push('Performance degraded over time - investigate resource exhaustion');
      } else if (secondAvg > firstAvg + 5) {
        insights.push('Performance improved over time - system warmed up successfully');
      } else {
        insights.push('Performance remained stable throughout the test');
      }
    }
    
    return insights;
  }
  
  /**
   * Save monitoring report to file
   */
  saveReport(report) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `monitoring_report_${timestamp}.json`;
    const filepath = path.join(this.config.outputDir, filename);
    
    try {
      fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
      console.log(`\n💾 Monitoring report saved to: ${filepath}`);
      
      // Also create a CSV for easy analysis
      this.saveCSVReport(report, timestamp);
      
    } catch (error) {
      console.error('Failed to save monitoring report:', error);
    }
  }
  
  /**
   * Save CSV version of metrics for analysis
   */
  saveCSVReport(report, timestamp) {
    const csvData = ['Timestamp,Health Score,Response Time,CPU Usage,Memory Used,Connections,Alerts'];
    
    this.metrics.forEach(metric => {
      const row = [
        metric.datetime,
        metric.derived.healthScore || '',
        metric.network.pingLatency || '',
        metric.system.cpuUsage || '',
        metric.system.memory ? metric.system.memory.used : '',
        metric.server && metric.server.connections ? metric.server.connections.total : '',
        this.alerts.filter(a => a.timestamp === metric.timestamp).length
      ];
      csvData.push(row.join(','));
    });
    
    const csvFilename = `monitoring_metrics_${timestamp}.csv`;
    const csvPath = path.join(this.config.outputDir, csvFilename);
    
    try {
      fs.writeFileSync(csvPath, csvData.join('\n'));
      console.log(`📊 CSV metrics saved to: ${csvPath}`);
    } catch (error) {
      console.error('Failed to save CSV metrics:', error);
    }
  }
}

module.exports = PerformanceMonitor;

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  const config = {};
  
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i]?.replace('--', '');
    const value = args[i + 1];
    
    if (key && value) {
      if (['monitoringInterval'].includes(key)) {
        config[key] = parseInt(value);
      } else {
        config[key] = value;
      }
    }
  }
  
  const monitor = new PerformanceMonitor(config);
  
  process.on('SIGINT', () => {
    console.log('\n⚠️  Received SIGINT, stopping monitor...');
    monitor.stop();
    setTimeout(() => process.exit(0), 1000);
  });
  
  monitor.start();
}