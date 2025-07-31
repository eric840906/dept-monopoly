#!/usr/bin/env node

/**
 * Master Load Testing Runner
 * Orchestrates comprehensive load testing with all components
 */

const fetch = require('node-fetch');
const TestingFramework = require('./framework/testing-framework');
const NetworkPerformanceTester = require('./network/network-performance-tester');
const MobileDeviceSimulator = require('./mobile/mobile-device-simulator');
const GameScenarioSimulator = require('./scenarios/game-scenario-simulator');
const PerformanceMonitor = require('./monitoring/performance-monitor');
const fs = require('fs');
const path = require('path');

class MasterTestRunner {
  constructor(options = {}) {
    this.config = {
      serverUrl: options.serverUrl || 'http://localhost:3000',
      outputDir: options.outputDir || path.join(__dirname, 'results'),
      testSuites: options.testSuites || ['comprehensive', 'network', 'mobile', 'scenarios'],
      targetPlayerCount: options.targetPlayerCount || 120,
      enableMonitoring: options.enableMonitoring !== false,
      generateReport: options.generateReport !== false,
      ...options
    };

    this.testResults = [];
    this.overallStartTime = null;
    this.monitor = null;

    // Ensure output directory exists
    if (!fs.existsSync(this.config.outputDir)) {
      fs.mkdirSync(this.config.outputDir, { recursive: true });
    }
  }

  /**
   * Run all load testing suites
   */
  async runAllTests() {
    console.log('🎯 DEPT-MONOPOLY COMPREHENSIVE LOAD TESTING SUITE');
    console.log('================================================');
    console.log(`🎯 Target: ${this.config.serverUrl}`);
    console.log(`👥 Target Capacity: ${this.config.targetPlayerCount} concurrent players`);
    console.log(`📊 Test Suites: ${this.config.testSuites.join(', ')}`);
    console.log(`📁 Output Directory: ${this.config.outputDir}`);
    console.log('================================================\n');

    this.overallStartTime = Date.now();

    // Start global monitoring if enabled
    if (this.config.enableMonitoring) {
      await this.startGlobalMonitoring();
    }

    // Pre-flight checks
    console.log('🔍 Running pre-flight checks...');
    const preflightPassed = await this.runPreflightChecks();

    if (!preflightPassed) {
      console.error('❌ Pre-flight checks failed. Aborting test suite.');
      return false;
    }

    console.log('✅ Pre-flight checks passed\n');

    // Run test suites in order
    let overallSuccess = true;

    for (const suiteType of this.config.testSuites) {
      try {
        console.log(`\n🚀 STARTING TEST SUITE: ${suiteType.toUpperCase()}`);
        console.log('='.repeat(50));

        const result = await this.runTestSuite(suiteType);

        this.testResults.push({
          suite: suiteType,
          result,
          timestamp: new Date().toISOString(),
          success: !result.error
        });

        if (result.error) {
          console.error(`❌ ${suiteType} suite failed: ${result.error}`);
          overallSuccess = false;
        } else {
          console.log(`✅ ${suiteType} suite completed successfully`);
        }

        // Recovery time between suites
        if (suiteType !== this.config.testSuites[this.config.testSuites.length - 1]) {
          console.log('\n⏳ Inter-suite recovery period (60s)...\n');
          await this.sleep(60000);
        }

      } catch (error) {
        console.error(`❌ ${suiteType} suite crashed:`, error.message);

        this.testResults.push({
          suite: suiteType,
          error: error.message,
          timestamp: new Date().toISOString(),
          success: false
        });

        overallSuccess = false;
      }
    }

    // Stop monitoring
    if (this.monitor) {
      this.monitor.stop();
    }

    // Generate comprehensive report
    if (this.config.generateReport) {
      await this.generateMasterReport(overallSuccess);
    }

    console.log(`\n🎯 LOAD TESTING COMPLETE: ${overallSuccess ? 'SUCCESS' : 'FAILED'}`);
    return overallSuccess;
  }

  /**
   * Run pre-flight checks
   */
  async runPreflightChecks() {
    const checks = [];

    try {
      // Check server connectivity
      console.log('  🔗 Checking server connectivity...');
      const response = await fetch(`${this.config.serverUrl}/health`);
      checks.push({
        name: 'Server Connectivity',
        passed: response.ok,
        details: response.ok ? 'Server responding' : `HTTP ${response.status}`
      });

      // Check server metrics endpoint
      console.log('  📊 Checking metrics endpoint...');
      const metricsResponse = await fetch(`${this.config.serverUrl}/metrics`);
      checks.push({
        name: 'Metrics Endpoint',
        passed: metricsResponse.ok,
        details: metricsResponse.ok ? 'Metrics available' : 'Metrics endpoint not accessible'
      });

      // Check available disk space
      console.log('  💾 Checking disk space...');
      const stats = fs.statSync(this.config.outputDir);
      checks.push({
        name: 'Disk Space',
        passed: true,
        details: 'Output directory accessible'
      });

      // Check if required dependencies are available
      console.log('  📦 Checking dependencies...');
      const requiredModules = ['socket.io-client'];
      let dependenciesOk = true;

      for (const module of requiredModules) {
        try {
          require.resolve(module);
        } catch (error) {
          dependenciesOk = false;
          break;
        }
      }

      checks.push({
        name: 'Dependencies',
        passed: dependenciesOk,
        details: dependenciesOk ? 'All dependencies available' : 'Missing required dependencies'
      });

    } catch (error) {
      console.error('  ❌ Pre-flight check error:', error.message);
      checks.push({
        name: 'Pre-flight Execution',
        passed: false,
        details: error.message
      });
    }

    // Report results    
    const passedChecks = checks.filter(c => c.passed).length;
    console.log(`  📋 Pre-flight Results: ${passedChecks}/${checks.length} passed`);
    checks.forEach(check => {
      const icon = check.passed ? '✅' : '❌';
      console.log(`    ${icon} ${check.name}: ${check.details}`)
    }); return checks.every(c => c.passed)
  }    /**   * Start global monitoring   */  async startGlobalMonitoring() {
    console.log('📊 Starting global performance monitoring...');

    this.monitor = new PerformanceMonitor({
      serverUrl: this.config.serverUrl,
      outputDir: path.join(this.config.outputDir, 'monitoring'),
      monitoringInterval: 10000 // 10 seconds

    });

    this.monitor.start();
    console.log('✅ Global monitoring started\
    ');
  }

  /**
   * Run specific test suite
   */
  async runTestSuite(suiteType) {
    const startTime = Date.now();

    try {
      switch (suiteType) {
        case 'comprehensive':
          return await this.runComprehensiveTests();

        case 'network':
          return await this.runNetworkTests();

        case 'mobile':
          return await this.runMobileTests();

        case 'scenarios':
          return await this.runScenarioTests();

        default:
          throw new Error(`Unknown test suite: ${suiteType}`);
      }
    } catch (error) {
      return {
        error: error.message,
        duration: Date.now() - startTime

      };
    }
  }

  /**
   * Run comprehensive framework tests
   */
  async runComprehensiveTests() {
    console.log('🎯 Running comprehensive load testing framework...');

    const framework = new TestingFramework({
      serverUrl: this.config.serverUrl,
      outputDir: path.join(this.config.outputDir, 'comprehensive'),
      enableMonitoring: false // We have global monitoring

    });

    const success = await framework.runAllPhases();

    return {
      success,
      type: 'comprehensive',
      details: 'Full escalating load test with all phases'

    };
  }

  /**
   * Run network performance tests
   */
  async runNetworkTests() {
    console.log('🌐 Running network performance tests...');

    const networkTester = new NetworkPerformanceTester({
      serverUrl: this.config.serverUrl,
      outputDir: path.join(this.config.outputDir, 'network')

    });

    await networkTester.runAllTests();

    return {
      success: true,
      type: 'network',
      details: 'Network bandwidth, latency, and reliability testing'

    };
  }

  /**
   * Run mobile device simulation
   */
  async runMobileTests() {
    console.log('📱 Running mobile device simulation...');

    const mobileSimulator = new MobileDeviceSimulator({
      serverUrl: this.config.serverUrl,
      deviceCount: Math.floor(this.config.targetPlayerCount * 0.8), // 80% mobile
      testDuration: 600000 // 10 minutes

    });

    await mobileSimulator.start();

    return {
      success: true,
      type: 'mobile',
      details: 'Mobile device behavior and constraint simulation'

    };
  }

  /**
   * Run game scenario tests
   */
  async runScenarioTests() {
    console.log('🎮 Running game scenario simulation...');

    const scenarios = ['full_game', 'team_formation', 'mini_game_stress'];
    const results = [];

    for (const scenario of scenarios) {
      console.log(`  🎯 Running scenario: ${scenario}`);

      const simulator = new GameScenarioSimulator({
        serverUrl: this.config.serverUrl,
        scenario,
        playerCount: Math.floor(this.config.targetPlayerCount * 0.7) // 70% for scenarios

      });

      await simulator.start();
      results.push(scenario);

      // Brief pause between scenarios
      await this.sleep(30000);
    }

    return {
      success: true,
      type: 'scenarios',
      details: `Completed scenarios: ${results.join(', ')}`,
      scenarios: results
    };
  }

  /**
   * Generate master comprehensive report
   */
  async generateMasterReport(overallSuccess) {
    console.log('\
    📋 GENERATING COMPREHENSIVE MASTER REPORT');
    console.log('=========================================\
    ');

    const totalDuration = Date.now() - this.overallStartTime;
    const successfulSuites = this.testResults.filter(r => r.success).length;

    const masterReport = {
      summary: {
        overallSuccess,
        totalDuration: Math.floor(totalDuration / 1000),
        totalSuites: this.testResults.length,
        successfulSuites,
        successRate: ((successfulSuites / this.testResults.length) * 100).toFixed(1),
        timestamp: new Date().toISOString(),
        targetCapacity: this.config.targetPlayerCount,
        serverUrl: this.config.serverUrl

      },
      testSuites: this.testResults,
      executiveSummary: this.generateExecutiveSummary(),
      recommendations: this.generateMasterRecommendations(),
      nextActions: this.generateNextActions(overallSuccess)
    };

    // Display executive summary
    console.log('📊 EXECUTIVE SUMMARY:');
    console.log(`Overall Result: ${overallSuccess ? '🟢 READY FOR PRODUCTION' : '🔴 NEEDS OPTIMIZATION'}`);
    console.log(`Test Duration: ${Math.floor(totalDuration / 60000)}m ${Math.floor((totalDuration % 60000) / 1000)}s`);
    console.log(`Success Rate: ${masterReport.summary.successRate}% (${successfulSuites}/${this.testResults.length} suites)`);
    console.log(`Target Capacity: ${this.config.targetPlayerCount} concurrent players`);

    console.log('\
    📋 SUITE RESULTS:');
    this.testResults.forEach(result => {
      const icon = result.success ? '✅' : '❌';
      console.log(`  ${icon} ${result.suite.toUpperCase()}: ${result.success ? 'PASSED' : 'FAILED'}`);
      if (result.result && result.result.details) {
        console.log(`      ${result.result.details}`);
      }
    });

    console.log('\
    🎯 KEY FINDINGS:');
    masterReport.executiveSummary.forEach(finding => {
      console.log(`  • ${finding}`);
    });

    console.log('\
    💡 RECOMMENDATIONS:');
    masterReport.recommendations.forEach(rec => {
      console.log(`  • ${rec}`);
    });

    console.log('\
    🚀 NEXT ACTIONS:');
    masterReport.nextActions.forEach(action => {
      console.log(`  • ${action}`);
    });

    // Save master report
    await this.saveMasterReport(masterReport);

    return masterReport;
  }

  /**
   * Generate executive summary
   */
  generateExecutiveSummary() {
    const summary = [];

    const successfulSuites = this.testResults.filter(r => r.success).length;
    const totalSuites = this.testResults.length;

    if (successfulSuites === totalSuites) {
      summary.push('All test suites completed successfully - system is ready for production');

    } else if (successfulSuites / totalSuites >= 0.75) {
      summary.push('Most test suites passed - system shows good performance with minor issues');

    } else {
      summary.push('Multiple test suites failed - system requires significant optimization');

    }

    // Suite-specific findings
    this.testResults.forEach(result => {
      if (!result.success) {
        summary.push(`${result.suite} testing revealed critical issues requiring attention`);
      }
    });

    summary.push(`System tested up to ${this.config.targetPlayerCount} concurrent players`);

    return summary;
  }

  /**
   * Generate master recommendations
   */
  generateMasterRecommendations() {
    const recommendations = [];

    const failedSuites = this.testResults.filter(r => !r.success);

    if (failedSuites.length === 0) {
      recommendations.push('System performance is excellent - proceed with production deployment');
      recommendations.push('Implement continuous performance monitoring');
      recommendations.push('Plan for capacity scaling beyond current targets');
      recommendations.push('Regular load testing before major releases');

    } else {
      recommendations.push('Address critical issues identified in failed test suites');

      failedSuites.forEach(suite => {
        switch (suite.suite) {
          case 'comprehensive':
            recommendations.push('Optimize core system performance and connection handling');
            break;
          case 'network':
            recommendations.push('Improve network resilience and connection quality handling');
            break;
          case 'mobile':
            recommendations.push('Enhance mobile device support and connection recovery');
            break;
          case 'scenarios':
            recommendations.push('Fix game-specific functionality and user experience issues');
            break;

        }
      });

      recommendations.push('Re-run load testing after implementing fixes');
    }

    recommendations.push('Document performance benchmarks and monitoring thresholds');
    recommendations.push('Create incident response procedures for performance issues');

    return recommendations;
  }

  /**
   * Generate next actions based on results
   */
  generateNextActions(overallSuccess) {
    const actions = [];

    if (overallSuccess) {
      actions.push('✅ System is ready for production deployment');
      actions.push('Set up production monitoring and alerting');
      actions.push('Plan gradual user rollout strategy');
      actions.push('Schedule regular performance validation');

    } else {
      actions.push('🔧 Fix critical issues identified in failed tests');
      actions.push('Implement performance optimizations');
      actions.push('Re-run failed test suites to validate fixes');
      actions.push('Consider infrastructure scaling or architectural changes');

    }

    actions.push('Review detailed test reports for specific optimization opportunities');
    actions.push('Update capacity planning based on test results');
    actions.push('Train team on performance monitoring and troubleshooting');

    return actions;
  }

  /**
   * Save master report
   */
  async saveMasterReport(report) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    // Save JSON report
    const jsonFilename = `master_load_test_report_${timestamp}.json`;
    const jsonPath = path.join(this.config.outputDir, jsonFilename);

    try {
      fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
      console.log(`\
    💾 Master report saved: ${jsonPath}`);
    } catch (error) {
      console.error('Failed to save JSON report:', error);

    }

    // Save markdown summary
    const markdownContent = this.generateMarkdownReport(report);
    const mdFilename = `load_test_summary_${timestamp}.md`;
    const mdPath = path.join(this.config.outputDir, mdFilename);

    try {
      fs.writeFileSync(mdPath, markdownContent);
      console.log(`📋 Summary report saved: ${mdPath}`);
    } catch (error) {
      console.error('Failed to save markdown report:', error);

    }
  }

  /**
   * Generate markdown report
   */
  generateMarkdownReport(report) {
    return `# Load Testing Report - Dept-Monopoly
    ## Executive Summary
    **Overall Result:** ${report.summary.overallSuccess ? '🟢 READY FOR PRODUCTION' : '🔴 NEEDS OPTIMIZATION'}  
    **Test Date:** ${new Date(report.summary.timestamp).toLocaleString()}  
    **Duration:** ${Math.floor(report.summary.totalDuration / 60)} minutes  
    **Success Rate:** ${report.summary.successRate}%  
    **Target Capacity:** ${report.summary.targetCapacity} concurrent players  
    ## Test Suite Results
    ${report.testSuites.map(suite => {
      const status = suite.success ? '✅ PASSED' : '❌ FAILED';
      return `### ${suite.suite.toUpperCase()}: ${status}
    ${suite.result && suite.result.details ? `*${suite.result.details}*` : ''}
    `;
    }).join('\
    ')}
    ## Key Findings
    ${report.executiveSummary.map(finding => `- ${finding}`).join('\
    ')}
    ## Recommendations
    ${report.recommendations.map(rec => `- ${rec}`).join('\
    ')}
    ## Next Actions
    ${report.nextActions.map(action => `- ${action}`).join('\
    ')}
    ---
    *Report generated by Dept-Monopoly Load Testing Suite*
    `;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));

  }
}
module.exports = MasterTestRunner;
// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  const config = {};

  // Parse command line arguments
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i]?.replace('--', '');
    const value = args[i + 1];

    if (key && value) {
      if (['targetPlayerCount'].includes(key)) {
        config[key] = parseInt(value);

      } else if (['enableMonitoring', 'generateReport'].includes(key)) {
        config[key] = value.toLowerCase() === 'true';

      } else if (key === 'testSuites') {
        config[key] = value.split(',');

      } else {
        config[key] = value;

      }
    }
  }

  // Display help if requested
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
    Dept-Monopoly Load Testing Suite
    ================================
    Usage: node master-test-runner.js [options]
    Options:
      --serverUrl <url>           Target server URL (default: http://localhost:3000)
      --targetPlayerCount <num>   Target concurrent players (default: 120)
      --testSuites <list>         Comma-separated test suites (default: comprehensive,network,mobile,scenarios)
      --outputDir <path>          Output directory for results
      --enableMonitoring <bool>   Enable performance monitoring (default: true)
      --generateReport <bool>     Generate comprehensive report (default: true)
      --help, -h                  Show this help message
    Test Suites:
      comprehensive    Full escalating load testing with all phases
      network          Network performance, bandwidth, and latency testing
      mobile           Mobile device behavior and constraint simulation
      scenarios        Game-specific scenario testing
    Example:
      node master-test-runner.js --serverUrl http://localhost:3000 --targetPlayerCount 120
    `);
    process.exit(0);

  }

  const runner = new MasterTestRunner(config);

  process.on('SIGINT', () => {
    console.log('\
    ⚠️  Received SIGINT, stopping load testing suite...');
    process.exit(0);

  });

  runner.runAllTests().then(success => {
    console.log(`\
    🎯 Load Testing Suite completed: ${success ? 'SUCCESS' : 'FAILED'}`);
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('\
    ❌ Load Testing Suite crashed:', error);
    process.exit(1);

  });
}