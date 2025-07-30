// Load environment variables
require('dotenv').config()

const express = require('express')
const http = require('http')
const socketIo = require('socket.io')
const cors = require('cors')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')
const path = require('path')
const fs = require('fs')

const GameManager = require('./game/GameManager')
const { setupSocketHandlers } = require('./socket/handlers')

const app = express()
const server = http.createServer(app)
// Configure allowed origins based on environment
const getLocalNetworkIPs = () => {
  const { networkInterfaces } = require('os')
  const nets = networkInterfaces()
  const ips = []

  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
      if (net.family === 'IPv4' && !net.internal) {
        ips.push(`http://${net.address}:${process.env.PORT || 3000}`)
      }
    }
  }
  return ips
}

const baseOrigins = process.env.ALLOWED_ORIGINS?.split(',') || []
const allowedOrigins =
  process.env.NODE_ENV === 'production'
    ? baseOrigins.length > 0
      ? baseOrigins
      : ['https://yourdomain.com']
    : [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        ...baseOrigins,
        ...getLocalNetworkIPs(), // Auto-detect local network IPs in development
      ]

console.log('🌐 Allowed CORS origins:', allowedOrigins)

const io = socketIo(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  // Add connection rate limiting
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
    skipMiddlewares: true,
  },
})

// Security middleware with environment-specific CSP
const isDevelopment = process.env.NODE_ENV !== 'production'

// Generate CSP-compliant local network sources
const getCSPNetworkSources = () => {
  if (!isDevelopment) return []

  const { networkInterfaces } = require('os')
  const nets = networkInterfaces()
  const sources = []

  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        const port = process.env.PORT || 3000
        sources.push(`http://${net.address}:${port}`)
        sources.push(`ws://${net.address}:${port}`)
      }
    }
  }
  return sources
}

const networkSources = getCSPNetworkSources()
console.log('🔒 CSP Network sources:', networkSources)

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net', ...(isDevelopment ? ["'unsafe-eval'", 'http://localhost:*', ...networkSources] : [])],
        scriptSrcAttr: ["'none'"], // Block all inline event handlers for security
        styleSrc: ["'self'", "'unsafe-inline'"],
        styleSrcAttr: ["'unsafe-inline'"], // Allow inline styles for dynamic styling
        imgSrc: ["'self'", 'data:', 'https:', 'http:', 'blob:'], // Allow blob URLs for Phaser.js
        connectSrc: ["'self'", 'ws:', 'wss:', ...(isDevelopment ? ['http://localhost:*', 'ws://localhost:*', ...networkSources] : [])],
        fontSrc: ["'self'", 'https:', 'data:'],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
      reportOnly: isDevelopment, // Only report violations in development
    },
    // Disable problematic headers in development for local network access
    ...(isDevelopment && {
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: false,
      crossOriginResourcePolicy: false,
      hsts: false, // Disable HSTS in development
    }),
  })
)

// Rate limiting
const limiter = rateLimit({
  windowMs: 3 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
})
app.use(limiter)

// CORS configuration
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    optionsSuccessStatus: 200,
  })
)

// Development middleware to handle HTTPS->HTTP redirects
if (isDevelopment) {
  app.use((req, res, next) => {
    // If request indicates it was originally HTTPS, inform about HTTP requirement
    if (req.headers['x-forwarded-proto'] === 'https' || req.headers['upgrade-insecure-requests']) {
      console.log('⚠️  HTTPS request detected, but server runs on HTTP in development')
      console.log('   Please use HTTP URLs: http://' + req.get('host') + req.originalUrl)
    }

    // Prevent browsers from upgrading to HTTPS
    res.setHeader('Strict-Transport-Security', 'max-age=0')
    next()
  })
}

// Body parsing with size limits
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Configure static file serving with proper headers and caching
const staticOptions = {
  maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0,
  etag: true,
  lastModified: true,
  setHeaders: (res, path, stat) => {
    // Add proper MIME types for JavaScript files
    if (path.endsWith('.js')) {
      res.set('Content-Type', 'application/javascript; charset=utf-8')
    } else if (path.endsWith('.css')) {
      res.set('Content-Type', 'text/css; charset=utf-8')
    }
  },
}

// Serve public assets first (images, etc.)
app.use(express.static(path.join(__dirname, '../public'), staticOptions))

// Explicit image serving with debug logging in development
if (isDevelopment) {
  app.use('/images', (req, res, next) => {
    console.log(`🖼️  Image request: ${req.url}`)
    const imagePath = path.join(__dirname, '../public/images', req.url)
    console.log(`   Looking for: ${imagePath}`)
    console.log(`   Exists: ${fs.existsSync(imagePath)}`)
    next()
  })
}
app.use('/images', express.static(path.join(__dirname, '../public/images'), staticOptions))

// Serve static files for main client
app.use('/js', express.static(path.join(__dirname, '../client/main/js'), staticOptions))
app.use('/scenes', express.static(path.join(__dirname, '../client/main/scenes'), staticOptions))
app.use('/ui', express.static(path.join(__dirname, '../client/main/ui'), staticOptions))
app.use('/sprites', express.static(path.join(__dirname, '../client/main/sprites'), staticOptions))

// Serve static files for mobile client
app.use('/mobile/js', express.static(path.join(__dirname, '../client/mobile/js'), staticOptions))
app.use('/mobile/styles', express.static(path.join(__dirname, '../client/mobile/styles'), staticOptions))
app.use('/mobile/components', express.static(path.join(__dirname, '../client/mobile/components'), staticOptions))

// Fallback for any unmatched static files in client directories
app.use('/client', express.static(path.join(__dirname, '../client'), staticOptions))

// Debug middleware for development
if (isDevelopment) {
  app.use((req, res, next) => {
    if (req.url.endsWith('.js') || req.url.endsWith('.css') || req.url.includes('/js/') || req.url.includes('/scenes/') || req.url.includes('/ui/')) {
      console.log(`📁 Static file request: ${req.method} ${req.url}`)
    }
    next()
  })
}

// API routes (if any) should go here before catch-all routes

// Serve main game screen
app.get('/', (req, res) => {
  if (isDevelopment) {
    res.setHeader('Strict-Transport-Security', 'max-age=0') // Disable HSTS
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
  }
  res.sendFile(path.join(__dirname, '../client/main/index.html'))
})

// Serve mobile interface with development-specific headers
app.get('/mobile', (req, res) => {
  if (isDevelopment) {
    // Headers to prevent HTTPS upgrades and improve mobile compatibility
    res.setHeader('Content-Security-Policy-Report-Only', "default-src 'self'; upgrade-insecure-requests")
    res.setHeader('Strict-Transport-Security', 'max-age=0') // Disable HSTS
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
  }

  res.sendFile(path.join(__dirname, '../client/mobile/index.html'))
})

// Network info endpoint for debugging
app.get('/network-info', (req, res) => {
  const { networkInterfaces } = require('os')
  const nets = networkInterfaces()
  const info = {
    requestOrigin: req.get('origin'),
    requestHost: req.get('host'),
    requestProtocol: req.protocol,
    requestHeaders: req.headers,
    allowedOrigins,
    networkInterfaces: {},
    cspSources: networkSources,
  }

  for (const name of Object.keys(nets)) {
    info.networkInterfaces[name] = nets[name].filter((net) => net.family === 'IPv4')
  }

  res.json(info)
})

// Debug route to serve mobile with minimal restrictions
app.get('/mobile-debug', (req, res) => {
  res.setHeader('Content-Security-Policy', "default-src 'self' 'unsafe-inline' 'unsafe-eval' http: ws: data:")
  res.setHeader('Strict-Transport-Security', 'max-age=0')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Cache-Control', 'no-cache')

  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Mobile Debug</title>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body>
      <h1>Debug Mobile Access</h1>
      <p>Request Protocol: ${req.protocol}</p>
      <p>Request Host: ${req.get('host')}</p>
      <p>User Agent: ${req.get('user-agent')}</p>
      <p><a href="http://${req.get('host')}/mobile">Try HTTP Mobile Link</a></p>
      <p><a href="/network-info">Network Info</a></p>

      <script>
        console.log('Debug page loaded via:', location.protocol);
        console.log('Host:', location.host);
      </script>
    </body>
    </html>
  `)
})

// Mobile access helper page
app.get('/mobile-helper', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/mobile-redirect.html'))
})

// Handle team join routes (dynamic routing)
app.get('/team/:teamId', (req, res) => {
  // Redirect to mobile helper with team ID for easier access
  res.redirect(`/mobile-helper?team=${req.params.teamId}`)
})

// Catch-all handler for missing static files
app.use('*', (req, res, next) => {
  // Check if this is a static file request
  if (req.originalUrl.includes('/js/') || req.originalUrl.includes('/scenes/') || req.originalUrl.includes('/ui/') || req.originalUrl.includes('/mobile/') || req.originalUrl.includes('/sprites/') || req.originalUrl.endsWith('.js') || req.originalUrl.endsWith('.css') || req.originalUrl.endsWith('.png') || req.originalUrl.endsWith('.jpg') || req.originalUrl.endsWith('.svg')) {
    if (isDevelopment) {
      console.log(`⚠️  Missing static file: ${req.originalUrl}`)
      console.log(`📂 Looking in: ${path.join(__dirname, '../')}`)
    }

    // Try to find the file in the filesystem
    const possiblePaths = [path.join(__dirname, '..', req.originalUrl), path.join(__dirname, '../client', req.originalUrl), path.join(__dirname, '../public', req.originalUrl)]

    for (const filePath of possiblePaths) {
      try {
        if (fs.existsSync(filePath)) {
          if (isDevelopment) {
            console.log(`✅ Found file at: ${filePath}`)
          }
          return res.sendFile(filePath)
        }
      } catch (error) {
        // Continue to next path
      }
    }

    return res.status(404).json({ error: 'Static file not found', path: req.originalUrl })
  }

  next()
})

// Initialize game manager
const gameManager = new GameManager()

// Setup socket event handlers
setupSocketHandlers(io, gameManager)

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err)

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV !== 'production'
  const errorMessage = isDevelopment ? err.message : 'Internal server error'
  const errorStack = isDevelopment ? err.stack : undefined

  res.status(err.status || 500).json({
    error: errorMessage,
    ...(errorStack && { stack: errorStack }),
  })
})

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' })
})

const PORT = process.env.PORT || 3000

server.listen(PORT, '0.0.0.0', () => {
  const { networkInterfaces } = require('os')
  const nets = networkInterfaces()

  console.log(`🎮 Game server running on port ${PORT}`)
  console.log(`🖥️  Main screen: http://localhost:${PORT}`)
  console.log(`📱 Mobile interface: http://localhost:${PORT}/mobile`)

  // Show network interfaces for mobile access
  console.log('\n🌐 Network Access URLs:')
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        console.log(`   📱 Mobile: http://${net.address}:${PORT}/mobile`)
        console.log(`   🖥️  Main: http://${net.address}:${PORT}`)
      }
    }
  }

  console.log('\n⚠️  IMPORTANT: Use HTTP (not HTTPS) URLs on mobile devices')

  if (process.env.NODE_ENV === 'production') {
    console.log('🔒 Running in production mode with security enabled')
  } else {
    console.log('⚠️  Running in development mode with relaxed security')
  }
})
