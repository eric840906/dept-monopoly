#!/usr/bin/env node

/**
 * Comprehensive Load Testing Framework
 * Orchestrates testing phases with escalating loads and comprehensive analysis
 */

const LoadTester = require('../scripts/socket-load-tester');
const PerformanceMonitor = require('../monitoring/performance-monitor');
const MockHostController = require('../controllers/mock-host-controller');
const EventEmitter = require('events');
const fs = require('fs');
const path = require('path');

class TestingFramework extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.config = {
      serverUrl: options.serverUrl || 'http://localhost:3000',
      outputDir: options.outputDir || path.join(__dirname, '../results'),
      phaseRecoveryTime: options.phaseRecoveryTime || 30000, // 30 seconds between phases
      enableMonitoring: options.enableMonitoring !== false,
      ...options
    };
    
    this.testResults = [];
    this.currentPhase = null;
    this.monitor = null;
    this.hostController = null;
    this.startTime = null;
    
    // Define performance metrics and thresholds
    this.performanceMetrics = {
      // Connection Performance
      connectionSuccessRate: {
        excellent: 99,    // >= 99%
        good: 95,         // >= 95%
        poor: 0           // < 95%
      },
      
      // Response Time Performance
      avgResponseTime: {
        excellent: 200,   // <= 200ms
        good: 500,        // <= 500ms
        poor: Infinity    // > 500ms
      },
      
      // Socket.IO Latency
      socketLatency: {
        excellent: 100,   // <= 100ms
        good: 300,        // <= 300ms
        poor: Infinity    // > 300ms
      },
      
      // System Resource Usage
      cpuUsage: {
        excellent: 70,    // <= 70%
        good: 85,         // <= 85%
        poor: Infinity    // > 85%
      },
      
      memoryUsage: {
        excellent: 512,   // <= 512MB
        good: 1024,       // <= 1024MB
        poor: Infinity    // > 1024MB
      },
      
      // Error Rates
      errorRate: {
        excellent: 0,     // 0 errors
        good: 1,          // <= 1%
        poor: Infinity    // > 1%
      },
      
      // Message Throughput
      messageRate: {
        excellent: 100,   // >= 100 msg/s
        good: 50,         // >= 50 msg/s
        poor: 0           // < 50 msg/s
      },
      
      // Game-Specific Metrics
      gameActionSuccess: {
        excellent: 99,    // >= 99%
        good: 95,         // >= 95%
        poor: 0           // < 95%
      },
      
      teamJoinSuccess: {
        excellent: 100,   // 100%
        good: 98,         // >= 98%
        poor: 0           // < 98%
      }
    };
    
    // Define testing phases with escalating loads
    this.testingPhases = [
      {
        id: 'connection_baseline',
        name: 'Connection Baseline Test',
        description: 'Establish baseline performance with minimal load',
        objective: 'Validate basic functionality and measure baseline metrics',
        config: {
          maxPlayers: 10,
          rampUpTime: 5000,
          testDuration: 60000,
          reportInterval: 5000
        },
        successCriteria: [
          'connectionSuccessRate >= 99%',
          'avgResponseTime <= 500ms',
          'errorRate == 0%'
        ]
      },
      
      {
        id: 'light_load',
        name: 'Light Load Test',
        description: 'Test with light concurrent load',
        objective: 'Verify system handles light load with good performance',
        config: {
          maxPlayers: 25,
          rampUpTime: 10000,
          testDuration: 120000,
          reportInterval: 5000
        },
        successCriteria: [
          'connectionSuccessRate >= 98%',
          'avgResponseTime <= 300ms',
          'cpuUsage <= 50%',
          'errorRate <= 1%'
        ]
      },
      
      {
        id: 'team_formation',
        name: 'Team Formation Test',
        description: 'Test team joining and distribution mechanisms',
        objective: 'Validate team formation under moderate load',
        config: {
          maxPlayers: 60,
          rampUpTime: 20000,
          testDuration: 180000,
          reportInterval: 5000
        },
        successCriteria: [
          'connectionSuccessRate >= 97%',
          'teamJoinSuccess >= 98%',
          'avgResponseTime <= 400ms',
          'memoryUsage <= 512MB'
        ]
      },
      
      {
        id: 'moderate_load',
        name: 'Moderate Load Test',
        description: 'Test with moderate concurrent load and full gameplay',
        objective: 'Validate full game functionality under realistic load',
        config: {
          maxPlayers: 90,
          rampUpTime: 30000,
          testDuration: 300000,
          reportInterval: 5000
        },
        successCriteria: [
          'connectionSuccessRate >= 95%',
          'gameActionSuccess >= 95%',
          'avgResponseTime <= 500ms',
          'cpuUsage <= 70%',
          'errorRate <= 2%'
        ]
      },
      
      {
        id: 'peak_load',
        name: 'Peak Load Test',
        description: 'Test at maximum expected capacity',
        objective: 'Validate system handles peak load of 120 concurrent players',
        config: {
          maxPlayers: 120,
          rampUpTime: 40000,
          testDuration: 600000,
          reportInterval: 5000
        },
        successCriteria: [
          'connectionSuccessRate >= 95%',
          'avgResponseTime <= 1000ms',
          'cpuUsage <= 85%',
          'memoryUsage <= 1024MB',
          'errorRate <= 5%'
        ]
      },
      
      {
        id: 'sustained_load',
        name: 'Sustained Load Test',
        description: 'Long-term stability test at peak capacity',
        objective: 'Validate system stability over extended period',
        config: {
          maxPlayers: 120,
          rampUpTime: 30000,
          testDuration: 1800000, // 30 minutes
          reportInterval: 10000
        },
        successCriteria: [
          'connectionSuccessRate >= 93%',
          'memoryGrowthRate <= 10MB/min',
          'avgResponseTime <= 1500ms',
          'systemStability == stable'
        ]
      },
      
      {
        id: 'stress_test',
        name: 'Stress Test',
        description: 'Test beyond normal capacity to find breaking point',
        objective: 'Identify system limits and failure modes',
        config: {
          maxPlayers: 150,
          rampUpTime: 45000,
          testDuration: 300000,
          reportInterval: 5000
        },
        successCriteria: [
          'systemDoesNotCrash == true',
          'gracefulDegradation == true',
          'errorHandling == appropriate'
        ]
      }
    ];
    
    // Create output directory
    if (!fs.existsSync(this.config.outputDir)) {
      fs.mkdirSync(this.config.outputDir, { recursive: true });
    }
  }
  
  /**
   * Run all testing phases
   */
  async runAllPhases(startFromPhase = 0) {
    console.log('🎯 STARTING COMPREHENSIVE LOAD TESTING FRAMEWORK');
    console.log('================================================\n');
    
    this.startTime = Date.now();
    
    // Start monitoring if enabled
    if (this.config.enableMonitoring) {
      this.monitor = new PerformanceMonitor({
        serverUrl: this.config.serverUrl,
        outputDir: path.join(this.config.outputDir, 'monitoring')
      });
      this.monitor.start();
    }

    // Start mock host controller for game progression
    console.log('🎯 Starting mock host controller...');
    this.hostController = new MockHostController({
      serverUrl: this.config.serverUrl,
      hostToken: process.env.HOST_TOKEN || 'default-host-token',
      autoProgressGame: true,
      gameProgressInterval: 15000, // 15 seconds
      turnTimeout: 20000, // 20 seconds
      maxRounds: 8,
      enableMiniGames: true,
      // Improved game start timing for load testing
      minTeamsWithMembers: 3, // Wait for at least 3 teams
      minPlayerTeamRatio: 0.6, // 60% of players should be in teams (more lenient for load testing)
      teamJoinWaitTime: 20000, // Wait 20s for team joining after min conditions met
      gameStartDelay: 3000, // 3s final delay before starting game  
      maxWaitTime: 60000 // Maximum 60s wait to accommodate large player counts
    });

    try {
      await this.hostController.connect();
      this.hostController.start();
      console.log('✅ Mock host controller started successfully\n');
      
      // Set up host controller event handlers
      this.hostController.on('gameStateUpdate', (gameState) => {
        this.emit('hostControllerUpdate', gameState);
      });
      
    } catch (error) {
      console.error('❌ Failed to start mock host controller:', error.message);
      console.log('⚠️  Continuing without host controller (players won\'t progress in game)\n');
    }
    
    let overallSuccess = true;
    
    for (let i = startFromPhase; i < this.testingPhases.length; i++) {
      const phase = this.testingPhases[i];
      
      try {
        console.log(`\n🚀 PHASE ${i + 1}/${this.testingPhases.length}: ${phase.name}`);
        console.log(`📝 ${phase.description}`);
        console.log(`🎯 Objective: ${phase.objective}`);
        console.log(`👥 Players: ${phase.config.maxPlayers} | Duration: ${phase.config.testDuration / 1000}s`);
        console.log('Success Criteria:', phase.successCriteria.join(', '));
        console.log('---\n');
        
        const result = await this.runPhase(phase);
        
        // Analyze results
        const analysis = this.analyzePhaseResults(phase, result);
        
        this.testResults.push({
          phase,
          result,
          analysis,
          timestamp: new Date().toISOString()
        });
        
        // Display phase results
        this.displayPhaseResults(phase, result, analysis);
        
        // Check if phase met success criteria
        if (!analysis.success) {
          console.log(`❌ Phase ${phase.name} did not meet success criteria`);
          overallSuccess = false;
          
          // Ask user if they want to continue
          if (i < this.testingPhases.length - 1) {
            console.log('⚠️  Continuing to next phase despite failure...\n');
          }
        } else {
          console.log(`✅ Phase ${phase.name} completed successfully\n`);
        }
        
        // Recovery time between phases
        if (i < this.testingPhases.length - 1) {
          console.log(`⏳ Recovery period: ${this.config.phaseRecoveryTime / 1000}s...\n`);
          
          // Reset game state between phases to ensure clean state
          await this.resetGameForNextPhase();
          
          await this.sleep(this.config.phaseRecoveryTime);
        }
        
      } catch (error) {
        console.error(`❌ Phase ${phase.name} failed with error:`, error.message);
        
        this.testResults.push({
          phase,
          error: error.message,
          timestamp: new Date().toISOString()
        });
        
        overallSuccess = false;
      }
    }
    
    // Stop monitoring
    if (this.monitor) {
      this.monitor.stop();
    }

    // Stop host controller
    if (this.hostController) {
      console.log('🎯 Stopping mock host controller...');
      this.hostController.stop();
      console.log('✅ Mock host controller stopped');
    }
    
    // Generate comprehensive report
    await this.generateFinalReport(overallSuccess);
    
    return overallSuccess;
  }
  
  /**
   * Run a single testing phase
   */
  async runPhase(phase) {
    this.currentPhase = phase;
    
    return new Promise((resolve, reject) => {
      const tester = new LoadTester({
        serverUrl: this.config.serverUrl,
        ...phase.config
      });
      
      const reports = [];
      let finalMetrics = null;
      
      // Collect reports
      tester.on('report', (report) => {
        reports.push(report);
      });
      
      // Handle completion
      tester.on('complete', (metrics) => {
        finalMetrics = metrics;
        resolve({
          reports,
          finalMetrics,
          phase: phase.id
        });
      });
      
      // Handle errors
      tester.on('error', reject);
      
      // Ensure game is in lobby state before starting phase
      this.ensureLobbyStateBeforePhase(phase).then(() => {
        // Start the test
        tester.start().catch(reject);
      }).catch(reject);
    });
  }
  
  /**
   * Analyze phase results against success criteria and performance metrics
   */
  analyzePhaseResults(phase, result) {
    const analysis = {
      success: true,
      criteriaResults: [],
      performanceGrades: {},
      recommendations: [],
      warnings: []
    };
    
    if (!result.reports || result.reports.length === 0) {
      analysis.success = false;
      analysis.warnings.push('No test reports available for analysis');
      return analysis;
    }
    
    const lastReport = result.reports[result.reports.length - 1];
    
    // Evaluate each success criterion
    phase.successCriteria.forEach(criterion => {
      const criterionResult = this.evaluateCriterion(criterion, lastReport, result);
      analysis.criteriaResults.push(criterionResult);
      
      if (!criterionResult.passed) {
        analysis.success = false;
      }
    });
    
    // Grade performance metrics
    analysis.performanceGrades = this.gradePerformanceMetrics(lastReport, result);
    
    // Generate recommendations
    analysis.recommendations = this.generateRecommendations(phase, lastReport, analysis);
    
    return analysis;
  }
  
  /**
   * Evaluate a specific success criterion
   */
  evaluateCriterion(criterion, report, result) {
    const criterionResult = {
      criterion,
      passed: false,
      actualValue: null,
      expectedValue: null,
      message: ''
    };
    
    try {
      // Parse criterion (e.g., "connectionSuccessRate >= 95%")
      const parts = criterion.match(/(\w+)\s*(>=|<=|==|>|<)\s*(.+)/);
      if (!parts) {
        criterionResult.message = 'Invalid criterion format';
        return criterionResult;
      }
      
      const [, metric, operator, expectedStr] = parts;
      const expected = expectedStr.includes('%') 
        ? parseFloat(expectedStr.replace('%', ''))
        : parseFloat(expectedStr);
      
      criterionResult.expectedValue = expected;
      
      // Get actual value based on metric
      let actual = this.getMetricValue(metric, report, result);
      
      if (actual === null) {
        criterionResult.message = `Metric ${metric} not available`;
        return criterionResult;
      }
      
      criterionResult.actualValue = actual;
      
      // Evaluate condition
      switch (operator) {
        case '>=':
          criterionResult.passed = actual >= expected;
          break;
        case '<=':
          criterionResult.passed = actual <= expected;
          break;
        case '==':
          criterionResult.passed = Math.abs(actual - expected) < 0.01;
          break;
        case '>':
          criterionResult.passed = actual > expected;
          break;
        case '<':
          criterionResult.passed = actual < expected;
          break;
      }
      
      criterionResult.message = `${metric}: ${actual} ${operator} ${expected} - ${criterionResult.passed ? 'PASS' : 'FAIL'}`;
      
    } catch (error) {
      criterionResult.message = `Error evaluating criterion: ${error.message}`;
    }
    
    return criterionResult;
  }
  
  /**
   * Get metric value from test results
   */
  getMetricValue(metric, report, result) {
    switch (metric) {
      case 'connectionSuccessRate':
        return parseFloat(report.connections.successRate);
      
      case 'avgResponseTime':
        return report.performance.avgLatency;
      
      case 'errorRate':
        const totalActions = Object.values(report.gameActions).reduce((a, b) => a + b, 0);
        return totalActions > 0 ? (report.errors / totalActions) * 100 : 0;
      
      case 'teamJoinSuccess':
        const { teamJoins, joins } = report.gameActions;
        return joins > 0 ? (teamJoins / joins) * 100 : 100;
      
      case 'gameActionSuccess':
        const totalGameActions = Object.values(report.gameActions).reduce((a, b) => a + b, 0);
        return totalGameActions > 0 ? ((totalGameActions - report.errors) / totalGameActions) * 100 : 100;
      
      case 'cpuUsage':
        // This would come from monitoring data if available
        return null;
      
      case 'memoryUsage':
        // This would come from monitoring data if available
        return null;
      
      default:
        return null;
    }
  }
  
  /**
   * Grade performance metrics
   */
  gradePerformanceMetrics(report, result) {
    const grades = {};
    
    Object.entries(this.performanceMetrics).forEach(([metric, thresholds]) => {
      const value = this.getMetricValue(metric, report, result);
      
      if (value !== null) {
        let grade = 'poor';
        
        if (metric.includes('Rate') || metric.includes('Success')) {
          // Higher is better
          if (value >= thresholds.excellent) grade = 'excellent';
          else if (value >= thresholds.good) grade = 'good';
        } else {
          // Lower is better
          if (value <= thresholds.excellent) grade = 'excellent';
          else if (value <= thresholds.good) grade = 'good';
        }
        
        grades[metric] = {
          value,
          grade,
          thresholds
        };
      }
    });
    
    return grades;
  }
  
  /**
   * Generate recommendations based on results
   */
  generateRecommendations(phase, report, analysis) {
    const recommendations = [];
    
    // Connection issues
    const connSuccess = parseFloat(report.connections.successRate);
    if (connSuccess < 95) {
      recommendations.push('Connection success rate is low - investigate connection limits and timeouts');
    }
    
    // Performance issues
    if (report.performance.avgLatency > 500) {
      recommendations.push('High average latency detected - optimize server processing or check network');
    }
    
    // Error handling
    if (report.errors > 0) {
      recommendations.push('Errors detected during testing - review error logs and improve error handling');
    }
    
    // Resource utilization
    Object.entries(analysis.performanceGrades).forEach(([metric, grade]) => {
      if (grade.grade === 'poor') {
        if (metric.includes('cpu')) {
          recommendations.push('High CPU usage detected - consider optimization or scaling');
        } else if (metric.includes('memory')) {
          recommendations.push('High memory usage detected - check for memory leaks');
        }
      }
    });
    
    // Phase-specific recommendations
    if (phase.id === 'peak_load' && !analysis.success) {
      recommendations.push('System cannot handle peak load - architectural changes may be needed');
    }
    
    if (phase.id === 'sustained_load' && !analysis.success) {
      recommendations.push('System shows instability over time - investigate resource leaks');
    }
    
    return recommendations;
  }
  
  /**
   * Display phase results
   */
  displayPhaseResults(phase, result, analysis) {
    console.log(`📊 PHASE RESULTS: ${phase.name}`);
    console.log('---');
    
    // Success criteria results
    console.log('Success Criteria:');
    analysis.criteriaResults.forEach(cr => {
      const icon = cr.passed ? '✅' : '❌';
      console.log(`  ${icon} ${cr.message}`);
    });
    
    // Performance grades
    console.log('\nPerformance Grades:');
    Object.entries(analysis.performanceGrades).forEach(([metric, grade]) => {
      const icon = grade.grade === 'excellent' ? '🟢' : grade.grade === 'good' ? '🟡' : '🔴';
      console.log(`  ${icon} ${metric}: ${grade.value} (${grade.grade.toUpperCase()})`);
    });
    
    // Recommendations
    if (analysis.recommendations.length > 0) {
      console.log('\nRecommendations:');
      analysis.recommendations.forEach(rec => {
        console.log(`  💡 ${rec}`);
      });
    }
    
    console.log('');
  }
  
  /**
   * Generate comprehensive final report
   */
  async generateFinalReport(overallSuccess) {
    console.log('\n🎯 COMPREHENSIVE TESTING REPORT');
    console.log('===============================\n');
    
    const totalDuration = Date.now() - this.startTime;
    
    const finalReport = {
      summary: {
        overallSuccess,
        totalPhases: this.testingPhases.length,
        completedPhases: this.testResults.length,
        successfulPhases: this.testResults.filter(r => r.analysis && r.analysis.success).length,
        totalDuration: Math.floor(totalDuration / 1000),
        timestamp: new Date().toISOString()
      },
      phases: this.testResults,
      hostControllerMetrics: this.hostController ? this.hostController.getMetrics() : null,
      overallAnalysis: this.generateOverallAnalysis(),
      recommendations: this.generateOverallRecommendations()
    };
    
    // Display summary
    const { summary } = finalReport;
    console.log('📊 EXECUTIVE SUMMARY:');
    console.log(`Overall Result: ${overallSuccess ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`Phases Completed: ${summary.completedPhases}/${summary.totalPhases}`);
    console.log(`Success Rate: ${((summary.successfulPhases / summary.completedPhases) * 100).toFixed(1)}%`);
    console.log(`Total Duration: ${Math.floor(summary.totalDuration / 60)}m ${summary.totalDuration % 60}s`);
    
    // Host controller summary
    if (finalReport.hostControllerMetrics) {
      const hostMetrics = finalReport.hostControllerMetrics;
      console.log('\n🎯 HOST CONTROLLER METRICS:');
      console.log(`Actions Performed: ${hostMetrics.actionsPerformed}`);
      console.log(`Games Controlled: ${hostMetrics.gamesControlled}`);
      console.log(`Actions Per Minute: ${hostMetrics.actionsPerMinute}`);
      console.log(`Runtime: ${Math.floor(hostMetrics.runtime / 60)}m ${hostMetrics.runtime % 60}s`);
      if (hostMetrics.currentGameState) {
        console.log(`Final Game State: ${hostMetrics.currentGameState.phase} (${hostMetrics.currentGameState.playerCount} players, Round ${hostMetrics.currentGameState.round})`);
      }
    }
    
    // Phase summary
    console.log('\n📋 PHASE SUMMARY:');
    this.testResults.forEach((result, index) => {
      const icon = result.analysis && result.analysis.success ? '✅' : '❌';
      const phaseName = result.phase.name;
      console.log(`  ${icon} Phase ${index + 1}: ${phaseName}`);
    });
    
    // Overall recommendations
    console.log('\n💡 OVERALL RECOMMENDATIONS:');
    finalReport.recommendations.forEach(rec => {
      console.log(`  • ${rec}`);
    });
    
    // Save report
    await this.saveFinalReport(finalReport);
  }
  
  /**
   * Generate overall analysis
   */
  generateOverallAnalysis() {
    const analysis = {
      strengths: [],
      weaknesses: [],
      trends: [],
      riskAreas: []
    };
    
    const successfulResults = this.testResults.filter(r => r.analysis && r.analysis.success);
    
    if (successfulResults.length === this.testResults.length) {
      analysis.strengths.push('All testing phases completed successfully');
    }
    
    // Identify common issues
    const commonIssues = {};
    this.testResults.forEach(result => {
      if (result.analysis && result.analysis.recommendations) {
        result.analysis.recommendations.forEach(rec => {
          commonIssues[rec] = (commonIssues[rec] || 0) + 1;
        });
      }
    });
    
    Object.entries(commonIssues).forEach(([issue, count]) => {
      if (count > 1) {
        analysis.riskAreas.push(`${issue} (occurred in ${count} phases)`);
      }
    });
    
    return analysis;
  }
  
  /**
   * Generate overall recommendations
   */
  generateOverallRecommendations() {
    const recommendations = [];
    
    const successCount = this.testResults.filter(r => r.analysis && r.analysis.success).length;
    const totalCount = this.testResults.length;
    
    if (successCount === totalCount) {
      recommendations.push('System is ready for production deployment with 120 concurrent users');
      recommendations.push('Consider implementing continuous performance monitoring');
      recommendations.push('Plan for capacity scaling as user base grows');
    } else if (successCount / totalCount >= 0.7) {
      recommendations.push('System shows good performance but needs optimization');
      recommendations.push('Address identified issues before production deployment');
      recommendations.push('Implement performance monitoring and alerting');
    } else {
      recommendations.push('System requires significant improvements before production');
      recommendations.push('Focus on addressing critical performance bottlenecks');
      recommendations.push('Consider architectural changes for better scalability');
    }
    
    return recommendations;
  }
  
  /**
   * Save final report
   */
  async saveFinalReport(report) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `comprehensive_testing_report_${timestamp}.json`;
    const filepath = path.join(this.config.outputDir, filename);
    
    try {
      fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
      console.log(`\n💾 Final report saved to: ${filepath}`);
      
      // Generate executive summary
      await this.generateExecutiveSummary(report, timestamp);
      
    } catch (error) {
      console.error('Failed to save final report:', error);
    }
  }
  
  /**
   * Generate executive summary document
   */
  async generateExecutiveSummary(report, timestamp) {
    const summary = `# Load Testing Executive Summary
    
## Test Overview
- **Date**: ${report.summary.timestamp}
- **Duration**: ${Math.floor(report.summary.totalDuration / 60)} minutes
- **Result**: ${report.summary.overallSuccess ? 'SUCCESS' : 'FAILED'}
- **Success Rate**: ${((report.summary.successfulPhases / report.summary.completedPhases) * 100).toFixed(1)}%

## Key Findings
${report.overallAnalysis.strengths.map(s => `- ✅ ${s}`).join('\n')}
${report.overallAnalysis.weaknesses.map(w => `- ❌ ${w}`).join('\n')}

## Critical Recommendations
${report.recommendations.map(r => `- ${r}`).join('\n')}

## Phase Results
${report.phases.map((p, i) => {
  const status = p.analysis && p.analysis.success ? '✅ PASS' : '❌ FAIL';
  return `${i + 1}. **${p.phase.name}**: ${status}`;
}).join('\n')}

## Next Steps
1. Review detailed test results and metrics
2. Address identified performance issues
3. Implement monitoring and alerting
4. Plan for production deployment strategy
`;
    
    const summaryPath = path.join(this.config.outputDir, `executive_summary_${timestamp}.md`);
    
    try {
      fs.writeFileSync(summaryPath, summary);
      console.log(`📋 Executive summary saved to: ${summaryPath}`);
    } catch (error) {
      console.error('Failed to save executive summary:', error);
    }
  }
  
  /**
   * Reset game state between phases to ensure clean state
   */
  async resetGameForNextPhase() {
    if (!this.hostController) {
      console.log('⚠️  No host controller available for game reset');
      return;
    }

    try {
      console.log('🔄 Resetting game state for next phase...');
      
      // First prepare the host controller for new phase
      this.hostController.prepareForNewPhase();
      
      // Reset game via host controller
      await this.hostController.resetGameForPhase();
      
      // Wait for game to be fully reset and in lobby state
      await this.waitForLobbyState();
      
      console.log('✅ Game successfully reset to lobby state');
      
    } catch (error) {
      console.error('⚠️  Failed to reset game state:', error.message);
      console.log('⚠️  Continuing with next phase (may cause "game in progress" errors)');
    }
  }

  /**
   * Ensure game is in lobby state before starting a phase
   */
  async ensureLobbyStateBeforePhase(phase) {
    if (!this.hostController) {
      console.log(`⚠️  No host controller available for phase ${phase.name}`);
      return;
    }

    const gameState = this.hostController.gameState;
    if (gameState && gameState.phase === 'lobby') {
      console.log(`✅ Game already in lobby state for phase ${phase.name}`);
      return;
    }

    console.log(`🔄 Waiting for lobby state before starting phase ${phase.name}...`);
    try {
      await this.waitForLobbyState(10000);
    } catch (error) {
      console.error(`⚠️  Failed to ensure lobby state for phase ${phase.name}:`, error.message);
      throw error;
    }
  }

  /**
   * Wait for game to be in lobby state
   */
  async waitForLobbyState(timeout = 15000) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const checkState = () => {
        const gameState = this.hostController?.gameState;
        
        if (gameState && gameState.phase === 'lobby') {
          console.log('✅ Game is now in lobby state');
          resolve();
          return;
        }
        
        const elapsed = Date.now() - startTime;
        if (elapsed > timeout) {
          reject(new Error(`Timeout waiting for lobby state after ${elapsed}ms`));
          return;
        }
        
        // Log current state for debugging
        if (elapsed % 2000 < 500) { // Log every 2 seconds (approximately)
          const phase = gameState?.phase || 'unknown';
          console.log(`🔄 Waiting for lobby state... Current phase: ${phase} (${elapsed}ms elapsed)`);
        }
        
        // Check again in 500ms
        setTimeout(checkState, 500);
      };
      
      checkState();
    });
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = TestingFramework;

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  const config = {};
  
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i]?.replace('--', '');
    const value = args[i + 1];
    
    if (key && value) {
      if (['phaseRecoveryTime'].includes(key)) {
        config[key] = parseInt(value);
      } else if (key === 'enableMonitoring') {
        config[key] = value.toLowerCase() === 'true';
      } else {
        config[key] = value;
      }
    }
  }
  
  const framework = new TestingFramework(config);
  
  process.on('SIGINT', () => {
    console.log('\n⚠️  Received SIGINT, stopping testing framework...');
    process.exit(0);
  });
  
  framework.runAllPhases().then(success => {
    console.log(`\n🎯 Testing completed: ${success ? 'SUCCESS' : 'FAILED'}`);
    process.exit(success ? 0 : 1);
  }).catch(console.error);
}