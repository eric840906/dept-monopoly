# Docker Deployment Guide for Dept Monopoly Game

This guide follows the company's established Docker deployment patterns and IT requirements.

## 🏢 Company Deployment Workflow

Based on the existing onead-creative-cloud project patterns:

1. **Developer** builds Docker image locally/CI
2. **Developer** pushes image to company registry
3. **Developer** sends deployment request to managers with image details
4. **Managers** coordinate with IT for server deployment
5. **IT Team** deploys containers on Linux servers

## 📋 Pre-Deployment Checklist

### For Developers:
- [ ] Application tested locally
- [ ] Docker image builds successfully
- [ ] Environment variables configured
- [ ] Security configurations verified
- [ ] Static assets accessible

### For IT Team:
- [ ] Server resources available (512MB RAM, 1 CPU minimum)
- [ ] Network ports accessible (default: 3000)
- [ ] Domain/subdomain configured
- [ ] SSL certificates ready (if HTTPS)
- [ ] Firewall rules configured for mobile access

## 🔧 Configuration Files

### 1. Environment Configuration (.env.docker)

**⚠️ CRITICAL**: Update these values before deployment:

```bash
# Security Configuration - MUST CHANGE IN PRODUCTION
HOST_TOKEN=your-secure-64-character-random-string-here
ALLOWED_ORIGINS=https://yourdomain.com,https://apps.company.com

# Server Configuration
NODE_ENV=production
PORT=3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 2. Docker Build Command

```bash
# Build the image (follows company Alpine Linux standard)
docker build --platform linux/amd64 -t dept-monopoly:latest .
```

### 3. Deployment Using Docker-Compose

```bash
# Deploy with environment file
ENV_FILE=.env.docker docker-compose up -d
```

## 🚀 Quick Deployment Script

Use the provided deployment script:

```bash
# Make script executable
chmod +x docker-deploy.sh

# Deploy with default settings
./docker-deploy.sh

# Deploy with specific tag and environment
./docker-deploy.sh v1.0.0 .env.production
```

## 🌐 Network Configuration

### Mobile Device Access
The application is configured for mobile device access with proper CORS and CSP policies:

- **Development**: Auto-detects local network IPs
- **Production**: Requires explicit ALLOWED_ORIGINS configuration

### Security Headers
Following company security standards:
- Content Security Policy (CSP)
- CORS with explicit origins
- Rate limiting
- Helmet.js security headers
- No inline scripts in production

## 🔒 Security Configuration

### Environment Variables (Required)
- `HOST_TOKEN`: 64-character random string for host validation
- `ALLOWED_ORIGINS`: Comma-separated list of allowed origins
- `NODE_ENV`: Set to "production" for production deployment

### Network Security
- Container runs as non-root user (nodejs:1001)
- Health checks enabled
- Resource limits enforced
- Proper signal handling with dumb-init

## 📊 Monitoring & Health Checks

### Health Check Endpoint
```bash
curl http://localhost:3000/network-info
```

### Container Health Status
```bash
docker-compose ps
```

### Application Logs
```bash
# Follow logs
docker-compose logs -f dept-monopoly

# View recent logs
docker-compose logs --tail=50 dept-monopoly
```

## 🎮 Application Access Points

After deployment, the application will be available at:

- **Main Game Screen**: `http://your-domain:3000/`
- **Mobile Interface**: `http://your-domain:3000/mobile`
- **Team Join URLs**: `http://your-domain:3000/team/{teamId}`
- **Health Check**: `http://your-domain:3000/network-info`

## 🏗️ IT Deployment Instructions

### Server Requirements
- **OS**: Linux (tested on Alpine/Ubuntu)
- **Memory**: 512MB minimum, 1GB recommended
- **CPU**: 1 core minimum
- **Disk**: 500MB for image + logs
- **Network**: Port 3000 accessible

### Production Deployment Steps

1. **Receive Docker image** from development team
2. **Copy environment file** (.env.docker) to server
3. **Update security configuration**:
   ```bash
   # Generate secure host token
   HOST_TOKEN=$(openssl rand -hex 32)
   
   # Set production origins
   ALLOWED_ORIGINS=https://monopoly.company.com,https://game.company.com
   ```

4. **Deploy container**:
   ```bash
   docker-compose -f docker-compose.yml --env-file .env.docker up -d
   ```

5. **Verify deployment**:
   ```bash
   curl -f http://localhost:3000/network-info
   ```

6. **Configure reverse proxy** (nginx/Apache) if needed
7. **Setup SSL certificates** for HTTPS access

### Maintenance Commands

```bash
# Stop application
docker-compose down

# Update application (with new image)
docker-compose pull
docker-compose up -d

# View logs
docker-compose logs dept-monopoly

# Restart application
docker-compose restart dept-monopoly

# Remove application and data
docker-compose down -v
```

## 🔄 Rollback Procedure

```bash
# Stop current version
docker-compose down

# Deploy previous version
docker tag dept-monopoly:previous dept-monopoly:latest
docker-compose up -d

# Or use specific version
docker tag dept-monopoly:v1.0.0 dept-monopoly:latest
docker-compose up -d
```

## 📞 Support Information

### Application Ports
- **Web Server**: 3000 (HTTP)
- **WebSocket**: 3000 (Socket.IO)

### Log Locations
- **Container logs**: `docker-compose logs dept-monopoly`
- **Application logs**: `./logs/` directory (if mounted)

### Common Issues
1. **CORS errors**: Check ALLOWED_ORIGINS in environment file
2. **Mobile access issues**: Verify network firewall rules
3. **Performance issues**: Check resource limits in docker-compose.yml
4. **Static file 404s**: Verify image build includes all assets

## 📝 Change Log Template

When requesting deployment, include:

```
Version: v1.0.0
Docker Image: dept-monopoly:v1.0.0
Environment: Production
Changes:
- Feature: Added new mini-game
- Fix: Resolved mobile connectivity issues
- Security: Updated dependencies

Testing Status: ✅ Passed
Security Review: ✅ Approved
Ready for Deployment: ✅ Yes
```