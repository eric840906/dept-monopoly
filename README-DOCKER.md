# Docker Deployment - Dept Monopoly Game

## Quick Start

### For Developers (Local Testing)

1. **Prepare environment**:
   ```bash
   cp .env.docker .env.production
   # Edit .env.production with your secure values
   ```

2. **Build and deploy**:
   ```bash
   npm run docker:build
   npm run docker:deploy
   ```

3. **Test application**:
   - Main screen: http://localhost:3000
   - Mobile: http://localhost:3000/mobile
   - Health check: `npm run docker:health`

### For IT Team (Production Deployment)

1. **Receive deployment package** from development team
2. **Configure environment** (see DEPLOYMENT_GUIDE.md)
3. **Deploy container**:
   ```bash
   ENV_FILE=.env.production docker-compose up -d
   ```

## Environment Configuration

### Required Variables
- `HOST_TOKEN`: Secure random 64-character string
- `ALLOWED_ORIGINS`: Comma-separated list of allowed domains
- `NODE_ENV`: Set to "production"

### Optional Variables
- `PORT`: Server port (default: 3000)
- `RATE_LIMIT_WINDOW_MS`: Rate limiting window (default: 900000)
- `RATE_LIMIT_MAX_REQUESTS`: Max requests per window (default: 100)

## Docker Commands

```bash
# Build image
npm run docker:build

# Deploy application
npm run docker:deploy

# View logs
npm run docker:logs

# Stop application
npm run docker:stop

# Health check
npm run docker:health
```

## Security Features

✅ **Container Security**:
- Non-root user execution
- Alpine Linux base (minimal attack surface)
- Resource limits enforced
- Health checks enabled

✅ **Application Security**:
- Helmet.js security headers
- CORS with explicit origins
- Content Security Policy (CSP)
- Rate limiting
- Input validation

✅ **Network Security**:
- Mobile device CORS support
- Environment-specific CSP rules
- Secure WebSocket connections

## Mobile Device Access

The application automatically configures CORS and CSP for mobile device access:

- **Development**: Auto-detects local network IPs
- **Production**: Uses ALLOWED_ORIGINS environment variable

### Mobile Testing URLs
```bash
# Find your local IP
ip route get 1.1.1.1 | grep -oP 'src \K\S+'

# Access mobile interface
http://YOUR_LOCAL_IP:3000/mobile
```

## Monitoring

### Health Monitoring
```bash
# Container health
docker-compose ps

# Application health
curl http://localhost:3000/network-info

# Resource usage
docker stats
```

### Log Monitoring
```bash
# Follow logs
docker-compose logs -f dept-monopoly

# Search logs
docker-compose logs dept-monopoly | grep ERROR
```

## Troubleshooting

### Common Issues

1. **CORS Errors**:
   - Check ALLOWED_ORIGINS in environment file
   - Verify mobile device IP is included

2. **Container Won't Start**:
   - Check environment variables: `docker-compose config`
   - View startup logs: `docker-compose logs dept-monopoly`

3. **Mobile Access Issues**:
   - Verify firewall allows port 3000
   - Check network connectivity
   - Try `/mobile-debug` endpoint

4. **Performance Issues**:
   - Check resource limits in docker-compose.yml
   - Monitor container stats: `docker stats`

### Debug Commands
```bash
# Validate configuration
docker-compose config

# Interactive container access
docker exec -it dept-monopoly-app sh

# Network diagnostics
docker-compose exec dept-monopoly curl localhost:3000/network-info
```

## Support

For deployment issues:
1. Check DEPLOYMENT_GUIDE.md for detailed instructions
2. Review container logs
3. Verify environment configuration
4. Test health endpoints

Image follows company security standards from onead-creative-cloud project.