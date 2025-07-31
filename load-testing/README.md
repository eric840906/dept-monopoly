# Dept-Monopoly Load Testing Suite

Comprehensive load testing framework designed to validate that the Dept-Monopoly game can reliably support 120 concurrent players with excellent performance.

## 🎯 Overview

This testing suite provides multiple specialized testing approaches:

- **Comprehensive Framework**: Escalating load tests with 7 phases (10→150 players)
- **Network Performance**: Bandwidth, latency, and connection quality testing
- **Mobile Device Simulation**: Realistic mobile behavior and constraints
- **Game Scenario Testing**: Realistic gameplay patterns and user flows
- **Performance Monitoring**: Real-time system metrics and alerting

## 🚀 Quick Start

### Prerequisites

```bash
# Install dependencies
cd load-testing
npm install

# Ensure server is running
cd ..
npm run dev
```

### Run Complete Test Suite

```bash
# Run all test suites (recommended)
node master-test-runner.js

# Run with custom settings
node master-test-runner.js --targetPlayerCount 120 --serverUrl http://localhost:3000
```

### Run Individual Test Suites

```bash
# Comprehensive escalating load tests
npm run test:comprehensive

# Network performance testing
npm run test:network

# Mobile device simulation
npm run test:mobile

# Game scenario testing
npm run test:scenarios

# Basic socket.io load testing
npm run test:socket

# Performance monitoring only
npm run monitor
```

## 📊 Test Suites Explained

### 1. Comprehensive Framework (`framework/`)

**Purpose**: Systematic escalating load testing with defined success criteria

**Phases**:
1. **Connection Baseline** (10 players, 1min) - Basic functionality
2. **Light Load** (25 players, 2min) - Light concurrent load  
3. **Team Formation** (60 players, 3min) - Team joining mechanics
4. **Moderate Load** (90 players, 5min) - Full gameplay simulation
5. **Peak Load** (120 players, 10min) - Maximum capacity test
6. **Sustained Load** (120 players, 30min) - Long-term stability
7. **Stress Test** (150 players, 5min) - Beyond-capacity testing

**Success Criteria**:
- Connection success rate ≥95%
- Average response time ≤500ms  
- CPU usage ≤85%
- Memory usage ≤1GB
- Error rate ≤5%

### 2. Network Performance Testing (`network/`)

**Purpose**: Test various network conditions and mobile network scenarios

**Test Scenarios**:
- **Baseline Performance**: Ideal network conditions
- **Mixed Conditions**: Varied network quality (Excellent/Good/Fair/Poor)
- **Mobile Networks**: 5G/4G/3G simulation with realistic constraints
- **Poor Network Stress**: Edge case network conditions

**Network Profiles**:
- **Excellent**: Fiber/5G (10-30ms, 100Mbps down)
- **Good**: Broadband/4G (30-80ms, 25Mbps down)  
- **Fair**: 3G/Weak WiFi (100-300ms, 5Mbps down)
- **Poor**: 2G/Very weak (300-1000ms, 1Mbps down)

### 3. Mobile Device Simulation (`mobile/`)

**Purpose**: Realistic mobile device behavior and constraints

**Device Profiles**:
- **Flagship** (15% share): High-end smartphones, excellent performance
- **Mid-range** (55% share): Typical smartphones, good performance
- **Budget** (25% share): Low-end devices, limited performance
- **Tablet** (5% share): Tablet devices, mixed usage patterns

**Mobile Behaviors**:
- App backgrounding and foregrounding
- Network switching (WiFi ↔ Mobile data)
- Battery drain and power saving
- Performance degradation
- Connection instability

### 4. Game Scenario Testing (`scenarios/`)

**Purpose**: Realistic gameplay patterns and user flows

**Available Scenarios**:
- **full_game**: Complete 30-minute game simulation
- **team_formation**: Team joining and balancing
- **mini_game_stress**: Intensive mini-game testing
- **connection_storm**: Rapid simultaneous connections
- **mobile_heavy**: Mobile-focused with connection issues

**Player Behaviors**:
- **Realistic**: Natural timing, occasional disconnections
- **Aggressive**: Fast actions, high engagement
- **Passive**: Slow responses, frequent backgrounding

## 📈 Performance Metrics & Thresholds

### Connection Performance
- **Excellent**: ≥99% success, ≤200ms avg response
- **Good**: ≥95% success, ≤500ms avg response  
- **Poor**: <95% success, >500ms avg response

### System Resources
- **CPU Usage**: Target ≤70%, Critical >85%
- **Memory Usage**: Target ≤512MB, Critical >1GB
- **Response Time**: Target ≤200ms, Critical >1s

### Game-Specific Metrics
- **Team Join Success**: Target ≥98%
- **Mini-game Participation**: Target ≥95%
- **Connection Recovery**: Target ≥90% reconnect success

## 🔧 Configuration Options

### Master Test Runner Options

```bash
--serverUrl <url>           # Target server (default: http://localhost:3000)
--targetPlayerCount <num>   # Concurrent players (default: 120)  
--testSuites <list>         # Test suites: comprehensive,network,mobile,scenarios
--outputDir <path>          # Results directory
--enableMonitoring <bool>   # Performance monitoring (default: true)
--generateReport <bool>     # Generate reports (default: true)
```

### Individual Test Options

```bash
# Comprehensive Framework
--maxPlayers 120 --rampUpTime 30000 --testDuration 300000

# Network Testing  
--testCondition mixed --playerCount 60

# Mobile Simulation
--deviceCount 80 --mobileRatio 0.8 --testDuration 600000

# Scenario Testing
--scenario full_game --playerCount 100 --gameplayStyle realistic
```

### MockHost Controller Options (Updated 2025-07-31)

The mock host controller now includes improved game start timing to ensure players have adequate time to join teams before games begin:

```javascript
// New configurable timing parameters
const hostController = new MockHostController({
  // Basic settings
  serverUrl: 'http://localhost:3000',
  hostToken: 'your-host-token',
  autoProgressGame: true,
  
  // Game start timing improvements
  minTeamsWithMembers: 3,        // Wait for at least 3 teams with players
  minPlayerTeamRatio: 0.7,       // 70% of players should be in teams  
  teamJoinWaitTime: 15000,       // Wait 15s after min conditions met
  gameStartDelay: 5000,          // Final 5s delay before starting
  maxWaitTime: 45000,            // Maximum 45s total wait time
  
  // Game progression settings
  turnTimeout: 30000,            // 30s per turn
  maxRounds: 10,                 // Maximum game rounds
  enableMiniGames: true          // Enable mini-game simulation
});
```

**Key Improvements:**
- **Better Team Distribution**: Waits for more balanced team membership before starting
- **Configurable Ratios**: Ensures a minimum percentage of players join teams
- **Smart Timing**: Uses multiple wait periods with intelligent early start conditions
- **Load Testing Optimized**: Parameters tuned for realistic load testing scenarios

## 📋 Report Outputs

### Generated Reports
- **Master Report**: `master_load_test_report_[timestamp].json`
- **Executive Summary**: `load_test_summary_[timestamp].md`
- **Phase Results**: Individual JSON files for each test phase
- **Performance Metrics**: CSV files for analysis
- **Monitoring Data**: System metrics throughout testing

### Report Contents
- **Executive Summary**: Pass/fail status and key findings
- **Performance Metrics**: Detailed timing and resource usage
- **Error Analysis**: Categorized errors and frequencies  
- **Recommendations**: Specific optimization suggestions
- **Next Actions**: Clear steps for production readiness

## 🎮 Realistic Game Simulation

### Team Formation Patterns
- **Balanced**: Even distribution across 6 teams
- **Random**: Organic team selection  
- **Uneven**: Popular teams get more players (realistic)

### Game Flow Simulation
- Turn-based dice rolling with team captains
- Mini-game participation with realistic response times
- Score updates and game state synchronization
- Connection recovery and state restoration

### Mobile-Specific Testing
- iOS/Android user agent simulation
- Network quality variation (5G/4G/3G/WiFi)
- App backgrounding during phone calls/notifications
- Battery optimization and power saving modes
- Device performance constraints (CPU/Memory)

## 🚨 Monitoring & Alerting

### Real-Time Metrics
- Connection count and success rates
- Response times (avg, p95, p99)
- Error rates and categorization
- System resource usage (CPU, Memory, Disk)
- Network quality indicators

### Alert Thresholds
- **CPU Usage** >85%
- **Memory Usage** >1GB
- **Response Time** >1s
- **Error Rate** >5%
- **Connection Drop Rate** >10%

## 🔍 Troubleshooting

### Common Issues

**High Connection Failures**:
- Check rate limiting configuration
- Verify network connectivity
- Review connection timeout settings

**Poor Performance**:
- Monitor system resources during tests
- Check for memory leaks in long-running tests
- Verify database connection pooling

**Mobile Test Issues**:
- Ensure realistic user agent strings
- Check mobile-specific Socket.IO settings
- Verify connection recovery mechanisms

### Debug Mode

```bash
# Enable verbose logging
DEBUG=* node master-test-runner.js

# Run single test with detailed output  
node scripts/socket-load-tester.js --maxPlayers 10 --reportInterval 1000
```

## 📚 Example Usage

### Basic Load Test
```bash
# Test with 60 players for 5 minutes
node scripts/socket-load-tester.js --maxPlayers 60 --testDuration 300000
```

### Network Quality Test
```bash
# Test mixed network conditions
node network/network-performance-tester.js --testCondition mixed
```

### Mobile Simulation
```bash  
# Simulate 80% mobile users
node mobile/mobile-device-simulator.js --deviceCount 100 --mobileRatio 0.8
```

### Game Scenario Test
```bash
# Full game with team formation
node scenarios/game-scenario-simulator.js --scenario full_game --playerCount 90
```

## 📊 Success Criteria Summary

### Production Readiness Checklist
- [ ] All 7 comprehensive test phases pass
- [ ] 120 concurrent players supported
- [ ] <2s connection time for 95% of users  
- [ ] <500ms average response time
- [ ] <5% error rate under peak load
- [ ] Stable performance over 30 minutes
- [ ] Mobile devices connect and play successfully
- [ ] Network quality doesn't prevent gameplay
- [ ] Game scenarios complete without critical errors

### Performance Targets
- **Excellent**: Ready for immediate production deployment
- **Good**: Minor optimizations needed, production-capable  
- **Poor**: Significant improvements required before production

## 🤝 Contributing

When adding new tests or modifying existing ones:

1. Follow the established pattern of EventEmitter-based testing
2. Include comprehensive error handling and reporting
3. Add appropriate success criteria and thresholds
4. Update documentation and help text
5. Test with various network conditions and device types

## 📞 Support

For issues with the load testing suite:

1. Check server logs and test output files
2. Review the generated reports for specific error details
3. Run individual test components to isolate issues
4. Use debug mode for detailed troubleshooting information

---
  # 1. Navigate to project directory
  cd /mnt/d/ONEAD/dept-monopoly

  # 2. Stop any existing server
  pkill -f "node server/index.js" 2>/dev/null || true

  # 3. Start server with load test configuration
  HOST_TOKEN=default-host-token LOAD_TEST_MODE=true CONNECTION_LIMIT_PER_IP=200 npm start > server.log 2>&1 &

  # 4. Wait for server to start
  sleep 5

  # 5. Navigate to load testing directory
  cd load-testing

  # 6. Reset game state (crucial step!)
  HOST_TOKEN=default-host-token node reset-game.js

  # 7. Run comprehensive load test
  HOST_TOKEN=default-host-token node master-test-runner.js --targetPlayerCount 120 --testSuites comprehensive

  🔧 For Individual Test Runs:

  # Quick test (10 players)
  HOST_TOKEN=default-host-token node reset-game.js && \
  HOST_TOKEN=default-host-token node scripts/socket-load-tester.js --maxPlayers 10 --testDuration 30000

  # Medium test (30 players)
  HOST_TOKEN=default-host-token node reset-game.js && \
  HOST_TOKEN=default-host-token node master-test-runner.js --targetPlayerCount 30 --testSuites comprehensive
  
*This load testing suite ensures Dept-Monopoly can handle real-world usage patterns and provides confidence for production deployment.*