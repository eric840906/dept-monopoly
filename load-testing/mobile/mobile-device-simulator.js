#!/usr/bin/env node

/**
 * Mobile Device Simulator
 * Simulates various mobile device behaviors, network conditions, and constraints
 */

const { io } = require('socket.io-client');
const EventEmitter = require('events');

class MobileDeviceSimulator extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.config = {
      serverUrl: options.serverUrl || 'http://localhost:3000',
      deviceCount: options.deviceCount || 60,
      testDuration: options.testDuration || 600000, // 10 minutes
      mobileRatio: options.mobileRatio || 0.8, // 80% mobile devices
      ...options
    };
    
    // Mobile device profiles based on real-world data
    this.deviceProfiles = {
      // High-end smartphones (flagship devices)
      flagship: {
        name: 'Flagship Smartphone',
        marketShare: 0.15, // 15%
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
        networkCapabilities: {
          types: ['5G', '4G', 'WiFi'],
          preferences: { '5G': 0.4, '4G': 0.4, 'WiFi': 0.2 }
        },
        performance: {
          cpuPower: 1.0, // Baseline
          memoryCapacity: 8192, // 8GB
          batteryLife: 1440, // 24 hours in minutes
          screenResolution: '1170x2532'
        },
        behaviorPatterns: {
          sessionDuration: [30, 120], // 30-120 minutes
          backgroundingSensitivity: 0.1, // 10% chance to background
          reconnectionSpeed: [1000, 3000], // 1-3 seconds
          multitaskingLikelihood: 0.3 // 30% chance to multitask
        }
      },
      
      // Mid-range smartphones (most common)
      midrange: {
        name: 'Mid-range Smartphone',
        marketShare: 0.55, // 55%
        userAgent: 'Mozilla/5.0 (Linux; Android 12; SM-A525F) AppleWebKit/537.36',
        networkCapabilities: {
          types: ['4G', '3G', 'WiFi'],
          preferences: { '4G': 0.6, '3G': 0.1, 'WiFi': 0.3 }
        },
        performance: {
          cpuPower: 0.7,
          memoryCapacity: 4096, // 4GB
          batteryLife: 720, // 12 hours
          screenResolution: '1080x2400'
        },
        behaviorPatterns: {
          sessionDuration: [15, 60], // 15-60 minutes
          backgroundingSensitivity: 0.25, // 25% chance
          reconnectionSpeed: [2000, 8000], // 2-8 seconds
          multitaskingLikelihood: 0.5 // 50% chance
        }
      },
      
      // Budget smartphones
      budget: {
        name: 'Budget Smartphone',
        marketShare: 0.25, // 25%
        userAgent: 'Mozilla/5.0 (Linux; Android 11; SAMSUNG SM-A125F) AppleWebKit/537.36',
        networkCapabilities: {
          types: ['4G', '3G', '2G', 'WiFi'],
          preferences: { '4G': 0.4, '3G': 0.3, '2G': 0.1, 'WiFi': 0.2 }
        },
        performance: {
          cpuPower: 0.4,
          memoryCapacity: 2048, // 2GB
          batteryLife: 480, // 8 hours
          screenResolution: '720x1560'
        },
        behaviorPatterns: {
          sessionDuration: [10, 45], // 10-45 minutes
          backgroundingSensitivity: 0.4, // 40% chance
          reconnectionSpeed: [5000, 15000], // 5-15 seconds
          multitaskingLikelihood: 0.7 // 70% chance (resource constraints)
        }
      },
      
      // Tablets
      tablet: {
        name: 'Tablet Device',
        marketShare: 0.05, // 5%
        userAgent: 'Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
        networkCapabilities: {
          types: ['WiFi', '4G'],
          preferences: { 'WiFi': 0.8, '4G': 0.2 }
        },
        performance: {
          cpuPower: 0.9,
          memoryCapacity: 6144, // 6GB
          batteryLife: 720, // 12 hours
          screenResolution: '1668x2388'
        },
        behaviorPatterns: {
          sessionDuration: [45, 180], // 45-180 minutes
          backgroundingSensitivity: 0.15, // 15% chance
          reconnectionSpeed: [1000, 4000], // 1-4 seconds
          multitaskingLikelihood: 0.2 // 20% chance
        }
      }
    };
    
    // Network conditions specific to mobile
    this.mobileNetworkConditions = {
      '5G': {
        latency: { min: 15, max: 50 },
        bandwidth: { download: 50000, upload: 10000 },
        stability: 0.95,
        coverageArea: 0.3 // 30% coverage
      },
      '4G': {
        latency: { min: 50, max: 150 },
        bandwidth: { download: 12000, upload: 3000 },
        stability: 0.88,
        coverageArea: 0.9 // 90% coverage
      },
      '3G': {
        latency: { min: 150, max: 400 },
        bandwidth: { download: 3000, upload: 750 },
        stability: 0.75,
        coverageArea: 0.95 // 95% coverage
      },
      '2G': {
        latency: { min: 300, max: 1000 },
        bandwidth: { download: 256, upload: 64 },
        stability: 0.6,
        coverageArea: 0.98 // 98% coverage
      },
      'WiFi': {
        latency: { min: 10, max: 80 },
        bandwidth: { download: 25000, upload: 5000 },
        stability: 0.92,
        coverageArea: 0.4 // 40% of time on WiFi
      }
    };
    
    this.simulatedDevices = new Map();
    this.testMetrics = {
      deviceTypes: {},
      networkPerformance: {},
      behaviorPatterns: {},
      reliability: {},
      errors: []
    };
  }
  
  /**
   * Start mobile device simulation
   */
  async start() {
    console.log('📱 Starting Mobile Device Simulation');
    console.log(`📊 Simulating ${this.config.deviceCount} devices`);
    console.log(`⏱️  Duration: ${this.config.testDuration / 1000}s\n`);
    
    // Create diverse device mix
    const devices = await this.createDeviceMix();
    
    // Run simulation phases
    await this.runMobileSimulationPhases(devices);
    
    // Generate mobile-specific report
    this.generateMobileReport();
  }
  
  /**
   * Create realistic mix of mobile devices
   */
  async createDeviceMix() {
    const devices = [];
    const mobileDeviceCount = Math.floor(this.config.deviceCount * this.config.mobileRatio);
    const desktopDeviceCount = this.config.deviceCount - mobileDeviceCount;
    
    console.log(`📱 Creating ${mobileDeviceCount} mobile devices and ${desktopDeviceCount} desktop connections`);
    
    // Create mobile devices based on market share
    for (let i = 0; i < mobileDeviceCount; i++) {
      const deviceProfile = this.selectDeviceProfile();
      const device = await this.createMobileDevice(i, deviceProfile);
      devices.push(device);
    }
    
    // Create desktop devices for comparison
    for (let i = mobileDeviceCount; i < this.config.deviceCount; i++) {
      const device = await this.createDesktopDevice(i);
      devices.push(device);
    }
    
    console.log('📊 Device mix created:');
    this.logDeviceMix(devices);
    
    return devices;
  }
  
  /**
   * Select device profile based on market share
   */
  selectDeviceProfile() {
    const profiles = Object.values(this.deviceProfiles);
    const random = Math.random();
    let cumulative = 0;
    
    for (const profile of profiles) {
      cumulative += profile.marketShare;
      if (random <= cumulative) {
        return profile;
      }
    }
    
    return profiles[1]; // Default to mid-range
  }
  
  /**
   * Create a simulated mobile device
   */
  async createMobileDevice(deviceId, profile) {
    const device = {
      id: deviceId,
      type: 'mobile',
      profile,
      currentNetwork: this.selectInitialNetwork(profile),
      batteryLevel: this.randomBetween(20, 100),
      isBackgrounded: false,
      lastActivity: Date.now(),
      socket: null,
      connected: false,
      gameJoined: false,
      teamId: null,
      metrics: {
        connectionAttempts: 0,
        connectionTime: null,
        disconnections: 0,
        reconnections: 0,
        backgroundEvents: 0,
        networkSwitches: 0,
        batteryDrainEvents: 0,
        performanceIssues: 0,
        errors: []
      }
    };
    
    // Connect device
    await this.connectMobileDevice(device);
    
    // Start device behavior simulation
    this.startDeviceBehaviorSimulation(device);
    
    this.simulatedDevices.set(deviceId, device);
    return device;
  }
  
  /**
   * Create a desktop device for comparison
   */
  async createDesktopDevice(deviceId) {
    const device = {
      id: deviceId,
      type: 'desktop',
      profile: {
        name: 'Desktop Browser',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      currentNetwork: 'broadband',
      socket: null,
      connected: false,
      gameJoined: false,
      teamId: null,
      metrics: {
        connectionAttempts: 0,
        connectionTime: null,
        disconnections: 0,
        errors: []
      }
    };
    
    await this.connectDesktopDevice(device);
    return device;
  }
  
  /**
   * Select initial network for mobile device
   */
  selectInitialNetwork(profile) {
    const { networkCapabilities } = profile;
    const random = Math.random();
    let cumulative = 0;
    
    for (const [networkType, probability] of Object.entries(networkCapabilities.preferences)) {
      cumulative += probability;
      if (random <= cumulative) {
        return networkType;
      }
    }
    
    return '4G'; // Default fallback
  }
  
  /**
   * Connect mobile device with realistic constraints
   */
  async connectMobileDevice(device) {
    return new Promise((resolve) => {
      const { profile, currentNetwork } = device;
      const networkCondition = this.mobileNetworkConditions[currentNetwork];
      
      // Simulate connection delay based on network and device performance
      const baseDelay = this.randomBetween(networkCondition.latency.min, networkCondition.latency.max);
      const deviceDelay = Math.floor(baseDelay / profile.performance.cpuPower);
      const connectionDelay = Math.max(1000, deviceDelay);
      
      setTimeout(() => {
        const socketOptions = {
          forceNew: true,
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 2000,
          timeout: 30000, // Longer timeout for mobile
          transports: ['websocket', 'polling'],
          extraHeaders: {
            'User-Agent': profile.userAgent
          }
        };
        
        const connectStart = Date.now();
        device.metrics.connectionAttempts++;
        
        try {
          const socket = io(this.config.serverUrl, socketOptions);
          device.socket = socket;
          
          this.setupMobileSocketHandlers(device, connectStart, resolve);
          
        } catch (error) {
          device.metrics.errors.push({
            type: 'connection_creation_error',
            message: error.message,
            timestamp: Date.now()
          });
          resolve();
        }
        
      }, connectionDelay);
    });
  }
  
  /**
   * Connect desktop device (for comparison)
   */
  async connectDesktopDevice(device) {
    return new Promise((resolve) => {
      const socketOptions = {
        forceNew: true,
        reconnection: true,
        reconnectionAttempts: 3,
        reconnectionDelay: 1000,
        timeout: 20000,
        transports: ['websocket', 'polling'],
        extraHeaders: {
          'User-Agent': device.profile.userAgent
        }
      };
      
      const connectStart = Date.now();
      device.metrics.connectionAttempts++;
      
      const socket = io(this.config.serverUrl, socketOptions);
      device.socket = socket;
      
      socket.on('connect', () => {
        device.connected = true;
        device.metrics.connectionTime = Date.now() - connectStart;
        console.log(`🖥️  Desktop ${device.id} connected - ${device.metrics.connectionTime}ms`);
        resolve();
      });
      
      socket.on('connect_error', (error) => {
        device.metrics.errors.push({
          type: 'connection_error',
          message: error.message,
          timestamp: Date.now()
        });
        resolve();
      });
    });
  }
  
  /**
   * Set up mobile-specific socket event handlers
   */
  setupMobileSocketHandlers(device, connectStart, resolve) {
    const { socket, profile } = device;
    
    socket.on('connect', () => {
      device.connected = true;
      device.metrics.connectionTime = Date.now() - connectStart;
      
      console.log(`📱 ${profile.name} ${device.id} connected (${device.currentNetwork}) - ${device.metrics.connectionTime}ms`);
      
      // Join game immediately
      this.joinGameAsDevice(device);
      resolve();
    });
    
    socket.on('disconnect', (reason) => {
      device.connected = false;
      device.metrics.disconnections++;
      
      console.log(`📵 Device ${device.id} disconnected: ${reason}`);
      
      // Schedule reconnection based on device behavior
      if (!device.isBackgrounded) {
        const reconnectionDelay = this.randomBetween(
          ...profile.behaviorPatterns.reconnectionSpeed
        );
        
        setTimeout(() => {
          this.attemptDeviceReconnection(device);
        }, reconnectionDelay);
      }
    });
    
    socket.on('connect_error', (error) => {
      device.metrics.errors.push({
        type: 'connection_error',
        message: error.message,
        timestamp: Date.now()
      });
      resolve();
    });
    
    socket.on('error', (error) => {
      device.metrics.errors.push({
        type: 'socket_error',
        message: error.message,
        timestamp: Date.now()
      });
    });
    
    // Mobile-specific events
    socket.on('game_state_update', () => {
      device.lastActivity = Date.now();
      this.simulateDeviceResourceUsage(device);
    });
    
    socket.on('mini_game_start', (data) => {
      // Simulate mini-game participation with mobile constraints
      setTimeout(() => {
        this.handleMobileMinigameParticipation(device, data);
      }, this.randomBetween(5000, 30000));
    });
  }
  
  /**
   * Start device behavior simulation
   */
  startDeviceBehaviorSimulation(device) {
    if (device.type !== 'mobile') return;
    
    const { profile } = device;
    
    // Battery drain simulation
    const batteryDrainInterval = setInterval(() => {
      if (device.batteryLevel > 0) {
        device.batteryLevel -= this.randomBetween(1, 3);
        
        if (device.batteryLevel <= 20) {
          device.metrics.batteryDrainEvents++;
          this.handleLowBattery(device);
        }
        
        if (device.batteryLevel <= 0) {
          this.simulateDeviceShutdown(device);
          clearInterval(batteryDrainInterval);
        }
      }
    }, 60000); // Every minute
    
    // App backgrounding simulation
    const backgroundingInterval = setInterval(() => {
      if (device.connected && Math.random() < profile.behaviorPatterns.backgroundingSensitivity) {
        this.simulateAppBackgrounding(device);
      }
    }, this.randomBetween(60000, 300000)); // 1-5 minutes
    
    // Network switching simulation
    const networkSwitchInterval = setInterval(() => {
      if (Math.random() < 0.1) { // 10% chance per interval
        this.simulateNetworkSwitch(device);
      }
    }, this.randomBetween(120000, 600000)); // 2-10 minutes
    
    // Performance degradation simulation
    const performanceInterval = setInterval(() => {
      if (Math.random() < 0.05) { // 5% chance
        this.simulatePerformanceIssue(device);
      }
    }, this.randomBetween(180000, 900000)); // 3-15 minutes
    
    // Cleanup intervals when device disconnects permanently
    device.cleanupIntervals = [
      batteryDrainInterval,
      backgroundingInterval,
      networkSwitchInterval,
      performanceInterval
    ];
  }
  
  /**
   * Join game as mobile device
   */
  async joinGameAsDevice(device) {
    if (!device.connected || device.gameJoined) return;
    
    const joinData = {
      nickname: `${device.profile.name}_${device.id}`,
      department: '測試部門'
    };
    
    device.socket.emit('player_join', joinData);
    device.gameJoined = true;
    
    // Join random team after short delay
    setTimeout(() => {
      this.joinRandomTeamAsDevice(device);
    }, this.randomBetween(2000, 8000));
  }
  
  /**
   * Join random team as device
   */
  joinRandomTeamAsDevice(device) {
    if (!device.connected || device.teamId) return;
    
    const teams = ['team_A', 'team_B', 'team_C', 'team_D', 'team_E', 'team_F'];
    const randomTeam = teams[Math.floor(Math.random() * teams.length)];
    
    device.socket.emit('team_join', { teamId: randomTeam });
    device.teamId = randomTeam;
  }
  
  /**
   * Simulate app backgrounding (common on mobile)
   */
  simulateAppBackgrounding(device) {
    if (device.isBackgrounded) return;
    
    console.log(`📱 Device ${device.id} app backgrounded`);
    device.isBackgrounded = true;
    device.metrics.backgroundEvents++;
    
    // Disconnect socket to simulate backgrounding
    if (device.socket && device.connected) {
      device.socket.disconnect();
    }
    
    // Schedule return to foreground
    const backgroundDuration = this.randomBetween(30000, 300000); // 0.5-5 minutes
    setTimeout(() => {
      this.simulateAppForegrounding(device);
    }, backgroundDuration);
  }
  
  /**
   * Simulate app returning to foreground
   */
  simulateAppForegrounding(device) {
    if (!device.isBackgrounded) return;
    
    console.log(`📱 Device ${device.id} app foregrounded`);
    device.isBackgrounded = false;
    
    // Attempt reconnection
    this.attemptDeviceReconnection(device);
  }
  
  /**
   * Simulate network switching (WiFi <-> Mobile data)
   */
  simulateNetworkSwitch(device) {
    const { profile } = device;
    const availableNetworks = profile.networkCapabilities.types;
    
    let newNetwork;
    do {
      newNetwork = availableNetworks[Math.floor(Math.random() * availableNetworks.length)];
    } while (newNetwork === device.currentNetwork);
    
    console.log(`📶 Device ${device.id} switching from ${device.currentNetwork} to ${newNetwork}`);
    
    const oldNetwork = device.currentNetwork;
    device.currentNetwork = newNetwork;
    device.metrics.networkSwitches++;
    
    // Simulate brief disconnection during switch
    if (device.connected) {
      device.socket.disconnect();
      
      setTimeout(() => {
        this.attemptDeviceReconnection(device);
      }, this.randomBetween(2000, 8000));
    }
  }
  
  /**
   * Simulate performance issues
   */
  simulatePerformanceIssue(device) {
    console.log(`🐌 Device ${device.id} experiencing performance issues`);
    device.metrics.performanceIssues++;
    
    // Simulate delayed responses for a period
    const issueDuration = this.randomBetween(30000, 120000); // 0.5-2 minutes
    device.performanceIssueUntil = Date.now() + issueDuration;
    
    // If performance is too degraded, simulate app crash/restart
    if (device.profile.performance.cpuPower < 0.5 && Math.random() < 0.3) {
      setTimeout(() => {
        this.simulateAppCrash(device);
      }, this.randomBetween(10000, 30000));
    }
  }
  
  /**
   * Handle low battery behavior
   */
  handleLowBattery(device) {
    console.log(`🔋 Device ${device.id} low battery (${device.batteryLevel}%)`);
    
    // Reduce activity and potentially disconnect
    if (device.batteryLevel <= 10 && Math.random() < 0.5) {
      console.log(`🔋 Device ${device.id} entering power saving mode`);
      if (device.socket && device.connected) {
        device.socket.disconnect();
      }
    }
  }
  
  /**
   * Simulate device shutdown
   */
  simulateDeviceShutdown(device) {
    console.log(`📱 Device ${device.id} shutting down (battery depleted)`);
    
    if (device.socket && device.connected) {
      device.socket.disconnect();
    }
    
    device.connected = false;
    
    // Clean up intervals
    if (device.cleanupIntervals) {
      device.cleanupIntervals.forEach(interval => clearInterval(interval));
    }
  }
  
  /**
   * Simulate app crash and restart
   */
  simulateAppCrash(device) {
    console.log(`💥 Device ${device.id} app crashed`);
    
    if (device.socket && device.connected) {
      device.socket.disconnect();
    }
    
    device.connected = false;
    device.gameJoined = false;
    device.teamId = null;
    
    // Restart after delay
    setTimeout(() => {
      console.log(`🔄 Device ${device.id} app restarting`);
      this.connectMobileDevice(device);
    }, this.randomBetween(10000, 60000));
  }
  
  /**
   * Attempt device reconnection
   */
  async attemptDeviceReconnection(device) {
    if (device.connected || device.isBackgrounded) return;
    
    console.log(`🔄 Device ${device.id} attempting reconnection`);
    device.metrics.reconnections++;
    
    await this.connectMobileDevice(device);
  }
  
  /**
   * Handle mobile mini-game participation
   */
  handleMobileMinigameParticipation(device, gameData) {
    if (!device.connected || device.isBackgrounded) return;
    
    // Simulate mobile-specific delays and constraints
    const responseDelay = device.performanceIssueUntil > Date.now()
      ? this.randomBetween(15000, 45000) // Slower response during performance issues
      : this.randomBetween(8000, 25000); // Normal mobile response time
    
    setTimeout(() => {
      if (device.connected && device.teamId) {
        const response = {
          teamId: device.teamId,
          playerId: device.socket.id,
          answer: ['A', 'B', 'C', true, false][Math.floor(Math.random() * 5)]
        };
        
        device.socket.emit('mini_game_submit', response);
      }
    }, responseDelay);
  }
  
  /**
   * Simulate device resource usage
   */
  simulateDeviceResourceUsage(device) {
    // Simulate battery drain from activity
    if (device.type === 'mobile' && Math.random() < 0.1) {
      device.batteryLevel = Math.max(0, device.batteryLevel - 1);
    }
  }
  
  /**
   * Run mobile simulation phases
   */
  async runMobileSimulationPhases(devices) {
    const phases = [
      {
        name: 'Initial Connection Burst',
        duration: 60000,
        description: 'Simulate users opening app simultaneously'
      },
      {
        name: 'Mixed Usage Patterns',
        duration: 180000,
        description: 'Normal usage with backgrounding and network switches'
      },
      {
        name: 'Peak Activity Period',
        duration: 120000,
        description: 'High activity period with mini-games'
      },
      {
        name: 'Gradual Decline',
        duration: 120000,
        description: 'Users gradually leaving or backgrounding'
      }
    ];
    
    for (const phase of phases) {
      console.log(`\n📱 Phase: ${phase.name}`);
      console.log(`📝 ${phase.description}`);
      console.log(`⏱️  Duration: ${phase.duration / 1000}s\n`);
      
      await this.runPhase(phase, devices);
      
      console.log(`✅ Phase ${phase.name} completed\n`);
    }
  }
  
  /**
   * Run a specific simulation phase
   */
  async runPhase(phase, devices) {
    const startTime = Date.now();
    const endTime = startTime + phase.duration;
    
    // Collect metrics during phase
    const metricsInterval = setInterval(() => {
      this.collectPhaseMetrics(phase.name, devices);
    }, 10000); // Every 10 seconds
    
    await this.sleep(phase.duration);
    
    clearInterval(metricsInterval);
  }
  
  /**
   * Collect metrics for current phase
   */
  collectPhaseMetrics(phaseName, devices) {
    const mobileDevices = devices.filter(d => d.type === 'mobile');
    const desktopDevices = devices.filter(d => d.type === 'desktop');
    
    const mobileConnected = mobileDevices.filter(d => d.connected).length;
    const desktopConnected = desktopDevices.filter(d => d.connected).length;
    
    const snapshot = {
      phase: phaseName,
      timestamp: Date.now(),
      mobile: {
        total: mobileDevices.length,
        connected: mobileConnected,
        connectionRate: (mobileConnected / mobileDevices.length) * 100,
        backgrounded: mobileDevices.filter(d => d.isBackgrounded).length
      },
      desktop: {
        total: desktopDevices.length,
        connected: desktopConnected,
        connectionRate: (desktopConnected / desktopDevices.length) * 100
      }
    };
    
    if (!this.testMetrics.phaseSnapshots) {
      this.testMetrics.phaseSnapshots = [];
    }
    
    this.testMetrics.phaseSnapshots.push(snapshot);
    
    console.log(`📊 ${phaseName} - Mobile: ${mobileConnected}/${mobileDevices.length} (${snapshot.mobile.connectionRate.toFixed(1)}%) | Desktop: ${desktopConnected}/${desktopDevices.length} (${snapshot.desktop.connectionRate.toFixed(1)}%)`);
  }
  
  /**
   * Log device mix statistics
   */
  logDeviceMix(devices) {
    const deviceCounts = {};
    
    devices.forEach(device => {
      const type = device.type === 'mobile' ? device.profile.name : 'Desktop';
      deviceCounts[type] = (deviceCounts[type] || 0) + 1;
    });
    
    Object.entries(deviceCounts).forEach(([type, count]) => {
      console.log(`   ${type}: ${count} devices`);
    });
  }
  
  /**
   * Generate mobile-specific report
   */
  generateMobileReport() {
    console.log('\n📱 MOBILE DEVICE SIMULATION REPORT');
    console.log('==================================\n');
    
    const mobileDevices = Array.from(this.simulatedDevices.values()).filter(d => d.type === 'mobile');
    const desktopDevices = Array.from(this.simulatedDevices.values()).filter(d => d.type === 'desktop');
    
    // Connection statistics
    const mobileConnected = mobileDevices.filter(d => d.connected).length;
    const desktopConnected = desktopDevices.filter(d => d.connected).length;
    
    console.log('📊 CONNECTION SUMMARY:');
    console.log(`Mobile Devices: ${mobileConnected}/${mobileDevices.length} connected (${((mobileConnected/mobileDevices.length)*100).toFixed(1)}%)`);
    console.log(`Desktop Devices: ${desktopConnected}/${desktopDevices.length} connected (${((desktopConnected/desktopDevices.length)*100).toFixed(1)}%)`);
    
    // Mobile-specific metrics
    console.log('\n📱 MOBILE DEVICE METRICS:');
    
    const totalDisconnections = mobileDevices.reduce((sum, d) => sum + d.metrics.disconnections, 0);
    const totalReconnections = mobileDevices.reduce((sum, d) => sum + d.metrics.reconnections, 0);
    const totalBackgroundEvents = mobileDevices.reduce((sum, d) => sum + d.metrics.backgroundEvents, 0);
    const totalNetworkSwitches = mobileDevices.reduce((sum, d) => sum + d.metrics.networkSwitches, 0);
    
    console.log(`Total Disconnections: ${totalDisconnections}`);
    console.log(`Total Reconnections: ${totalReconnections}`);
    console.log(`Background Events: ${totalBackgroundEvents}`);
    console.log(`Network Switches: ${totalNetworkSwitches}`);
    
    // Device profile analysis
    console.log('\n📊 DEVICE PROFILE PERFORMANCE:');
    const profileStats = {};
    
    mobileDevices.forEach(device => {
      const profileName = device.profile.name;
      if (!profileStats[profileName]) {
        profileStats[profileName] = {
          count: 0,
          connected: 0,
          avgConnectionTime: 0,
          totalDisconnections: 0,
          totalErrors: 0
        };
      }
      
      const stats = profileStats[profileName];
      stats.count++;
      if (device.connected) stats.connected++;
      if (device.metrics.connectionTime) {
        stats.avgConnectionTime = (stats.avgConnectionTime + device.metrics.connectionTime) / 2;
      }
      stats.totalDisconnections += device.metrics.disconnections;
      stats.totalErrors += device.metrics.errors.length;
    });
    
    Object.entries(profileStats).forEach(([profile, stats]) => {
      const connectionRate = (stats.connected / stats.count) * 100;
      console.log(`${profile}:`);
      console.log(`  Connected: ${stats.connected}/${stats.count} (${connectionRate.toFixed(1)}%)`);
      console.log(`  Avg Connection Time: ${Math.floor(stats.avgConnectionTime)}ms`);
      console.log(`  Disconnections: ${stats.totalDisconnections}`);
      console.log(`  Errors: ${stats.totalErrors}`);
    });
    
    // Recommendations
    console.log('\n💡 MOBILE OPTIMIZATION RECOMMENDATIONS:');
    
    const recommendations = this.generateMobileRecommendations(mobileDevices, profileStats);
    recommendations.forEach(rec => {
      console.log(`  • ${rec}`);
    });
  }
  
  /**
   * Generate mobile-specific recommendations
   */
  generateMobileRecommendations(mobileDevices, profileStats) {
    const recommendations = [];
    
    // Connection reliability
    const avgDisconnections = mobileDevices.reduce((sum, d) => sum + d.metrics.disconnections, 0) / mobileDevices.length;
    if (avgDisconnections > 2) {
      recommendations.push('High disconnection rate on mobile - implement better connection recovery');
    }
    
    // Background handling
    const backgroundEvents = mobileDevices.reduce((sum, d) => sum + d.metrics.backgroundEvents, 0);
    if (backgroundEvents > 0) {
      recommendations.push('Apps are being backgrounded - implement background sync and state recovery');
    }
    
    // Network switching
    const networkSwitches = mobileDevices.reduce((sum, d) => sum + d.metrics.networkSwitches, 0);
    if (networkSwitches > 0) {
      recommendations.push('Network switching detected - implement seamless network transition');
    }
    
    // Device-specific optimizations
    Object.entries(profileStats).forEach(([profile, stats]) => {
      if (profile.includes('Budget') && stats.avgConnectionTime > 5000) {
        recommendations.push(`Optimize for ${profile} devices - connection times are high`);
      }
    });
    
    // Battery optimization
    const batteryIssues = mobileDevices.filter(d => d.batteryLevel < 20).length;
    if (batteryIssues > 0) {
      recommendations.push('Implement battery usage optimization for extended gameplay');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Mobile performance looks good - continue monitoring for production');
    }
    
    return recommendations;
  }
  
  // Utility methods
  randomBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = MobileDeviceSimulator;

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  const config = {};
  
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i]?.replace('--', '');
    const value = args[i + 1];
    
    if (key && value) {
      if (['deviceCount', 'testDuration'].includes(key)) {
        config[key] = parseInt(value);
      } else if (['mobileRatio'].includes(key)) {
        config[key] = parseFloat(value);
      } else {
        config[key] = value;
      }
    }
  }
  
  const simulator = new MobileDeviceSimulator(config);
  
  process.on('SIGINT', () => {
    console.log('\n⚠️  Received SIGINT, stopping mobile simulation...');
    process.exit(0);
  });
  
  simulator.start().catch(console.error);
}