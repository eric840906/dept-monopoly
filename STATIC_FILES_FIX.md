# Static Files Serving Fix

## Problem
Source files couldn't be loaded due to path problems in both development and production modes.

## Root Causes
1. **Content Security Policy (CSP)** was too restrictive in development mode
2. **Static file serving order** caused conflicts between different middleware
3. **Missing MIME types** for JavaScript and CSS files
4. **Environment-specific configurations** weren't properly handled
5. **Missing fallback handlers** for unmatched static file requests

## Fixes Applied

### 1. Updated Static File Serving Configuration
```javascript
// Configure static file serving with proper headers and caching
const staticOptions = {
  maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0,
  etag: true,
  lastModified: true,
  setHeaders: (res, path, stat) => {
    // Add proper MIME types for JavaScript files
    if (path.endsWith('.js')) {
      res.set('Content-Type', 'application/javascript; charset=utf-8');
    } else if (path.endsWith('.css')) {
      res.set('Content-Type', 'text/css; charset=utf-8');
    }
  }
};
```

### 2. Environment-Specific Content Security Policy
```javascript
// Security middleware with environment-specific CSP
const isDevelopment = process.env.NODE_ENV !== 'production';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      scriptSrc: isDevelopment 
        ? ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.jsdelivr.net", "http://localhost:*", "ws://localhost:*"]
        : ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      // ... other directives
    },
    reportOnly: isDevelopment // Only report violations in development
  }
}));
```

### 3. Debug Middleware for Development
Added logging for static file requests in development mode to help troubleshoot missing files.

### 4. Fallback Static File Handler
Created a comprehensive fallback handler that:
- Detects static file requests
- Searches multiple possible file locations
- Provides detailed logging in development
- Returns appropriate 404 responses

### 5. Updated npm Scripts
```json
{
  "scripts": {
    "start": "NODE_ENV=production node server/index.js",
    "dev": "NODE_ENV=development nodemon server/index.js",
    "dev:debug": "NODE_ENV=development DEBUG=* nodemon server/index.js"
  }
}
```

## File Structure Supported
```
/
├── /js/main.js                    → client/main/js/main.js
├── /scenes/GameScene.js           → client/main/scenes/GameScene.js  
├── /ui/HostControls.js           → client/main/ui/HostControls.js
├── /mobile/js/mobile.js          → client/mobile/js/mobile.js
├── /mobile/styles/mobile.css     → client/mobile/styles/mobile.css
├── /images/teams/team_A.png      → public/images/teams/team_A.png
└── /socket.io/socket.io.js       → Auto-served by Socket.IO
```

## Usage

### Development Mode
```bash
npm run dev
```
- Relaxed CSP for easier debugging
- Detailed logging of static file requests
- No caching of static files
- Error details exposed

### Production Mode  
```bash
npm start
```
- Strict CSP for security
- Static file caching enabled
- Minimal logging
- Error details hidden

## Environment Variables
Create a `.env` file based on `.env.example`:
```env
NODE_ENV=development
PORT=3000
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

## Troubleshooting

### Static File Not Loading
1. Check the browser console for CSP violations
2. Run in development mode: `npm run dev`
3. Look for file path logs in server console
4. Verify file exists in the expected location

### CORS Issues
1. Check `ALLOWED_ORIGINS` environment variable
2. Ensure your domain is included in the allowed origins list
3. For development, use `http://localhost:3000` or `http://127.0.0.1:3000`

### CSP Violations
1. Development mode has relaxed CSP rules
2. Production mode enforces strict CSP
3. Add legitimate sources to CSP directives if needed

## Security Considerations
- Development mode has relaxed security for easier debugging
- Production mode enforces strict Content Security Policy
- Static files are served with appropriate MIME types
- Rate limiting protects against abuse
- Error details are hidden in production mode