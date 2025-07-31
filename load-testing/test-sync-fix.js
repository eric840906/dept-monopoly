#!/usr/bin/env node

/**
 * Test script to verify the synchronization fix between load test phases
 * This runs a minimal test with just 2 phases to verify the game resets properly
 */

const TestingFramework = require('./framework/testing-framework');
const path = require('path');

// Configure a minimal test with just 2 short phases
const testConfig = {
  serverUrl: process.env.SERVER_URL || 'http://localhost:3000',
  outputDir: path.join(__dirname, 'results', 'sync-test'),
  phaseRecoveryTime: 10000, // 10 seconds between phases
  enableMonitoring: false
};

// Override the testing phases with minimal ones for sync testing
class SyncTestFramework extends TestingFramework {
  constructor(options) {
    super(options);
    
    // Define minimal testing phases for sync verification
    this.testingPhases = [
      {
        id: 'sync_test_phase_1',
        name: 'Sync Test Phase 1',
        description: 'First phase to test sync - minimal load',
        objective: 'Verify players can join and teams can be formed',
        config: {
          maxPlayers: 10,
          rampUpTime: 5000,  // 5 seconds
          testDuration: 15000, // 15 seconds
          reportInterval: 3000
        },
        successCriteria: [
          'connectionSuccessRate >= 80%',
          'errorRate <= 20%'
        ]
      },
      
      {
        id: 'sync_test_phase_2',
        name: 'Sync Test Phase 2',
        description: 'Second phase to test sync - verify game was reset',
        objective: 'Verify new players can join after game reset',
        config: {
          maxPlayers: 15,
          rampUpTime: 5000,  // 5 seconds
          testDuration: 15000, // 15 seconds
          reportInterval: 3000
        },
        successCriteria: [
          'connectionSuccessRate >= 80%',
          'errorRate <= 20%'
        ]
      }
    ];
  }
}

async function runSyncTest() {
  console.log('🧪 SYNCHRONIZATION FIX TEST');
  console.log('============================\n');
  console.log('This test verifies that the game state is properly reset between load test phases.');
  console.log('If successful, players in Phase 2 should be able to join without "game in progress" errors.\n');

  const framework = new SyncTestFramework(testConfig);
  
  // Set up interrupt handling
  process.on('SIGINT', () => {
    console.log('\n⚠️  Test interrupted by user');
    process.exit(1);
  });

  try {
    const success = await framework.runAllPhases();
    
    console.log('\n🧪 SYNC TEST RESULTS');
    console.log('====================');
    
    if (success) {
      console.log('✅ Synchronization test PASSED');
      console.log('✅ Game state is properly reset between phases');
      console.log('✅ Players can join in subsequent phases without errors');
    } else {
      console.log('❌ Synchronization test FAILED');
      console.log('❌ Game state sync issues detected');
      console.log('❌ Review the logs above for "Cannot join game in progress" errors');
    }
    
    process.exit(success ? 0 : 1);
    
  } catch (error) {
    console.error('❌ Sync test failed with error:', error.message);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  runSyncTest();
}

module.exports = { SyncTestFramework, runSyncTest };