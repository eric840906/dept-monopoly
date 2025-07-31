#!/usr/bin/env node

/**
 * Load Test Runner - Executes comprehensive testing scenarios
 */

const LoadTester = require('./socket-load-tester');
const fs = require('fs');
const path = require('path');

class LoadTestRunner {
  constructor() {
    this.results = [];
    this.outputDir = path.join(__dirname, '../results');
    
    // Ensure results directory exists
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }
  
  /**
   * Run all testing phases
   */
  async runAllPhases() {
    console.log('🎯 Starting comprehensive load testing suite...\n');
    
    const phases = [
      {
        name: 'Phase 1: Connection Load',
        description: 'Basic connection handling and rate limiting',
        config: {
          maxPlayers: 20,
          rampUpTime: 10000,
          testDuration: 60000,
          reportInterval: 5000
        }
      },
      {
        name: 'Phase 2: Team Formation',
        description: 'Team joining and distribution',
        config: {
          maxPlayers: 60,
          rampUpTime: 20000,
          testDuration: 120000,
          reportInterval: 5000
        }
      },
      {
        name: 'Phase 3: Gameplay Simulation',
        description: 'Full game flow with mini-games',
        config: {
          maxPlayers: 100,
          rampUpTime: 30000,
          testDuration: 180000,
          reportInterval: 5000
        }
      },
      {
        name: 'Phase 4: Peak Load',
        description: 'Maximum capacity testing',
        config: {
          maxPlayers: 120,
          rampUpTime: 40000,
          testDuration: 300000,
          reportInterval: 5000
        }
      },
      {
        name: 'Phase 5: Sustained Load',
        description: 'Long-term stability testing',
        config: {
          maxPlayers: 120,
          rampUpTime: 30000,
          testDuration: 1800000, // 30 minutes
          reportInterval: 10000
        }
      }
    ];
    
    for (let i = 0; i < phases.length; i++) {
      const phase = phases[i];
      console.log(`\n🚀 Starting ${phase.name}`);
      console.log(`📝 ${phase.description}`);
      console.log(`👥 Players: ${phase.config.maxPlayers} | Duration: ${phase.config.testDuration/1000}s\n`);
      
      try {
        const result = await this.runPhase(phase);
        this.results.push({
          phase: phase.name,
          config: phase.config,
          result,
          timestamp: new Date().toISOString()
        });
        
        console.log(`✅ ${phase.name} completed successfully\n`);
        
        // Wait between phases for server recovery
        if (i < phases.length - 1) {
          console.log('⏳ Waiting 30 seconds for server recovery...\n');
          await this.sleep(30000);
        }
        
      } catch (error) {
        console.error(`❌ ${phase.name} failed:`, error);
        this.results.push({
          phase: phase.name,
          config: phase.config,
          error: error.message,
          timestamp: new Date().toISOString()
        });
        
        // Continue with next phase even if one fails
      }
    }
    
    // Generate comprehensive report
    this.generateFinalReport();
  }
  
  /**
   * Run a single testing phase
   */
  async runPhase(phase) {
    return new Promise((resolve, reject) => {
      const tester = new LoadTester(phase.config);
      const reports = [];
      let finalMetrics = null;
      
      // Collect reports during testing
      tester.on('report', (report) => {
        reports.push(report);
      });
      
      // Handle test completion
      tester.on('complete', (metrics) => {
        finalMetrics = metrics;
        
        const phaseResult = {
          reports,
          finalMetrics,
          summary: this.analyzePhasePerfomance(reports, finalMetrics)
        };
        
        // Save phase results
        this.savePhaseResults(phase.name, phaseResult);
        
        resolve(phaseResult);
      });
      
      // Handle errors
      tester.on('error', (error) => {
        reject(error);
      });
      
      // Start the test
      tester.start().catch(reject);
    });
  }
  
  /**
   * Analyze phase performance and generate insights
   */
  analyzePhasePerfomance(reports, metrics) {
    if (!reports.length) return {};
    
    const lastReport = reports[reports.length - 1];
    const connectionSuccess = parseFloat(lastReport.connections.successRate);
    const avgLatency = lastReport.performance.avgLatency;
    const maxLatency = lastReport.performance.maxLatency;
    const errorCount = lastReport.errors;
    const messageRate = lastReport.messages.rate;
    
    // Performance assessment
    const assessment = {
      overall: 'unknown',
      connections: connectionSuccess >= 95 ? 'excellent' : connectionSuccess >= 90 ? 'good' : 'poor',
      latency: avgLatency <= 200 ? 'excellent' : avgLatency <= 500 ? 'good' : 'poor',
      stability: errorCount === 0 ? 'excellent' : errorCount <= 5 ? 'good' : 'poor',
      throughput: messageRate >= 50 ? 'excellent' : messageRate >= 20 ? 'good' : 'poor'
    };
    
    // Overall assessment
    const scores = Object.values(assessment).filter(v => v !== 'unknown');
    const excellentCount = scores.filter(s => s === 'excellent').length;
    const goodCount = scores.filter(s => s === 'good').length;
    
    if (excellentCount >= 3) assessment.overall = 'excellent';
    else if (excellentCount + goodCount >= 3) assessment.overall = 'good';
    else assessment.overall = 'poor';
    
    return {
      assessment,
      metrics: {
        connectionSuccessRate: connectionSuccess,
        avgLatency,
        maxLatency,
        errorCount,
        messageRate,
        totalGameActions: Object.values(lastReport.gameActions).reduce((a, b) => a + b, 0)
      },
      recommendations: this.generateRecommendations(assessment, lastReport)
    };
  }
  
  /**
   * Generate performance recommendations
   */
  generateRecommendations(assessment, report) {
    const recommendations = [];
    
    if (assessment.connections === 'poor') {
      recommendations.push('Consider increasing connection rate limits or optimizing connection handling');
    }
    
    if (assessment.latency === 'poor') {
      recommendations.push('High latency detected - investigate network bottlenecks or server processing delays');
    }
    
    if (assessment.stability === 'poor') {
      recommendations.push('Multiple errors detected - review error logs and implement additional error handling');
    }
    
    if (assessment.throughput === 'poor') {
      recommendations.push('Low message throughput - consider optimizing Socket.IO configuration or message processing');
    }
    
    if (report.performance.maxLatency > 2000) {
      recommendations.push('Peak latency exceeds 2 seconds - investigate server resource constraints');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Performance looks good! Consider testing with additional load or different scenarios');
    }
    
    return recommendations;
  }
  
  /**
   * Save individual phase results
   */
  savePhaseResults(phaseName, result) {
    const filename = `${phaseName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}_${Date.now()}.json`;
    const filepath = path.join(this.outputDir, filename);
    
    try {
      fs.writeFileSync(filepath, JSON.stringify(result, null, 2));
      console.log(`💾 Phase results saved to: ${filepath}`);
    } catch (error) {
      console.error('Failed to save phase results:', error);
    }
  }
  
  /**
   * Generate comprehensive final report
   */
  generateFinalReport() {
    console.log('\n🎯 COMPREHENSIVE LOAD TESTING REPORT');
    console.log('=====================================\n');
    
    const finalReport = {
      testSuite: 'Dept-Monopoly Load Testing',
      timestamp: new Date().toISOString(),
      summary: {
        totalPhases: this.results.length,
        successfulPhases: this.results.filter(r => !r.error).length,
        failedPhases: this.results.filter(r => r.error).length
      },
      phases: this.results,
      recommendations: this.generateOverallRecommendations()
    };
    
    // Display summary
    this.results.forEach((result, index) => {
      console.log(`Phase ${index + 1}: ${result.phase}`);
      
      if (result.error) {
        console.log(`❌ FAILED: ${result.error}\n`);
        return;
      }
      
      const summary = result.result.summary;
      const assessment = summary.assessment.overall;
      const icon = assessment === 'excellent' ? '🟢' : assessment === 'good' ? '🟡' : '🔴';
      
      console.log(`${icon} Overall: ${assessment.toUpperCase()}`);
      console.log(`   Connection Success: ${summary.metrics.connectionSuccessRate}%`);
      console.log(`   Average Latency: ${summary.metrics.avgLatency}ms`);
      console.log(`   Errors: ${summary.metrics.errorCount}`);
      console.log(`   Message Rate: ${summary.metrics.messageRate}/s`);
      
      if (summary.recommendations.length > 0) {
        console.log('   Recommendations:');
        summary.recommendations.forEach(rec => {
          console.log(`   - ${rec}`);
        });
      }
      console.log('');
    });
    
    // Save comprehensive report
    const reportFilename = `comprehensive_report_${Date.now()}.json`;
    const reportPath = path.join(this.outputDir, reportFilename);
    
    try {
      fs.writeFileSync(reportPath, JSON.stringify(finalReport, null, 2));
      console.log(`📋 Comprehensive report saved to: ${reportPath}`);
    } catch (error) {
      console.error('Failed to save comprehensive report:', error);
    }
    
    // Generate CSV summary for easy analysis
    this.generateCSVSummary();
  }
  
  /**
   * Generate overall recommendations
   */
  generateOverallRecommendations() {
    const successfulResults = this.results.filter(r => !r.error);
    const recommendations = [];
    
    if (successfulResults.length === 0) {
      return ['Critical: All test phases failed. Review server configuration and capacity.'];
    }
    
    const lastPhase = successfulResults[successfulResults.length - 1];
    if (lastPhase && lastPhase.result) {
      const lastAssessment = lastPhase.result.summary.assessment.overall;
      
      if (lastAssessment === 'excellent') {
        recommendations.push('System performs excellently under target load');
        recommendations.push('Consider testing higher loads or different scenarios');
      } else if (lastAssessment === 'good') {
        recommendations.push('System performs adequately but has room for improvement');
        recommendations.push('Focus on optimizing identified bottlenecks');
      } else {
        recommendations.push('System struggles under target load');
        recommendations.push('Critical optimizations needed before production deployment');
      }
    }
    
    return recommendations;
  }
  
  /**
   * Generate CSV summary for analysis
   */
  generateCSVSummary() {
    const csvData = ['Phase,Players,Duration,Success Rate,Avg Latency,Max Latency,Errors,Message Rate,Assessment'];
    
    this.results.forEach(result => {
      if (!result.error && result.result) {
        const config = result.config;
        const summary = result.result.summary;
        const metrics = summary.metrics;
        
        csvData.push([
          result.phase,
          config.maxPlayers,
          config.testDuration / 1000,
          metrics.connectionSuccessRate,
          metrics.avgLatency,
          metrics.maxLatency,
          metrics.errorCount,
          metrics.messageRate,
          summary.assessment.overall
        ].join(','));
      }
    });
    
    const csvPath = path.join(this.outputDir, `load_test_summary_${Date.now()}.csv`);
    try {
      fs.writeFileSync(csvPath, csvData.join('\n'));
      console.log(`📊 CSV summary saved to: ${csvPath}`);
    } catch (error) {
      console.error('Failed to save CSV summary:', error);
    }
  }
  
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// CLI usage
if (require.main === module) {
  const runner = new LoadTestRunner();
  
  process.on('SIGINT', () => {
    console.log('\n⚠️  Received SIGINT, stopping test suite...');
    process.exit(0);
  });
  
  // Check if specific phase is requested
  const phaseArg = process.argv.find(arg => arg.startsWith('--phase='));
  
  if (phaseArg) {
    const phaseNumber = parseInt(phaseArg.split('=')[1]);
    // Add logic to run specific phase if needed
    console.log(`Running phase ${phaseNumber} only...`);
  } else {
    runner.runAllPhases().catch(console.error);
  }
}