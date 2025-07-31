// Test setup file
// Mock global console methods with more detailed output
const originalConsole = { ...console };

global.console = {
  ...originalConsole,
  log: jest.fn((...args) => {
    if (process.env.NODE_ENV !== 'test' || process.env.VERBOSE_TESTS) {
      originalConsole.log(...args);
    }
  }),
  warn: jest.fn((...args) => {
    if (process.env.NODE_ENV !== 'test' || process.env.VERBOSE_TESTS) {
      originalConsole.warn(...args);
    }
  }),
  error: jest.fn((...args) => {
    if (process.env.NODE_ENV !== 'test' || process.env.VERBOSE_TESTS) {
      originalConsole.error(...args);
    }
  })
};

// Mock DOM methods that might not be available in jsdom
global.alert = jest.fn();
global.confirm = jest.fn();

// Mock URLSearchParams if not available
if (!global.URLSearchParams) {
  global.URLSearchParams = class {
    constructor(search) {
      this.params = new Map();
      if (search) {
        const pairs = search.replace('?', '').split('&');
        pairs.forEach(pair => {
          const [key, value] = pair.split('=');
          if (key) {
            this.params.set(decodeURIComponent(key), decodeURIComponent(value || ''));
          }
        });
      }
    }
    
    get(key) {
      return this.params.get(key);
    }
    
    set(key, value) {
      this.params.set(key, value);
    }
  };
}

// Mock performance.now if not available
if (!global.performance) {
  global.performance = {
    now: jest.fn(() => Date.now())
  };
}

// Setup Jest matchers
expect.extend({
  toBeWithinRange(received, floor, ceiling) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () => `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
});