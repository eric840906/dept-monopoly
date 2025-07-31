# WebSocket Race Condition Tests

This directory contains comprehensive tests for the WebSocket disconnection fixes implemented to prevent race conditions during captain attempts and turn transitions.

## Quick Start

### Install Dependencies
```bash
npm install
```

### Run All Tests
```bash
npm run test:websocket-fixes
```

### Run Individual Test Suites
```bash
# Mobile client validation tests
npm run test:captain-validation

# Server GameManager transition tests  
npm run test:game-transitions

# Integration and race condition tests
npm run test:websocket-integration
```

## Test Files

- **`__tests__/mobile-captain-validation.test.js`** - Tests the critical captain validation logic in the mobile client's `rollDice()` method
- **`__tests__/gamemanager-transitions.test.js`** - Tests the server-side turn transition and `isTransitioning` state management
- **`__tests__/websocket-integration.test.js`** - Full integration tests simulating race condition scenarios

## What These Tests Validate

### Race Condition Fixes
✅ **Turn Transition Blocking** - Actions are blocked when `isTransitioning = true`  
✅ **Debouncing** - Rapid attempts within 1000ms are blocked  
✅ **Concurrent Prevention** - Duplicate transition calls are ignored  
✅ **State Synchronization** - Client and server states remain consistent  

### Original Bug Scenarios  
✅ **Rapid captain attempts during wrong turn** - No longer cause disconnections  
✅ **Actions during turn transitions** - Gracefully handled with user feedback  
✅ **Multiple simultaneous transitions** - Prevented with proper locking  

### User Experience
✅ **User-friendly error messages** - Clear feedback in Chinese  
✅ **WebSocket stability** - Connections remain stable during error conditions  
✅ **Performance** - High-frequency requests handled efficiently  

## Expected Results

```
Test Suites: 3 passed, 3 total
Tests:       1 skipped, 63 passed, 64 total
Snapshots:   0 total
Time:        ~27 seconds
```

## Key Test Features

- **Mock Socket.IO** - Full client/server simulation
- **Race Condition Simulation** - Exact scenarios that caused original bugs
- **Performance Testing** - High-frequency and concurrent client testing
- **State Validation** - Comprehensive game state consistency checks
- **Error Recovery** - Graceful degradation testing

## Files Modified to Fix Race Conditions

- **`/client/mobile/js/mobile.js`** - Enhanced `rollDice()` validation
- **`/server/game/GameManager.js`** - Added `isTransitioning` state management

See `WEBSOCKET_RACE_CONDITION_TEST_REPORT.md` for detailed test results and analysis.