# 🚀 Deployment Checklist - Dept Monopoly Game

## Pre-Deployment (Development Team)

### Code Preparation
- [ ] Application tested locally with `npm run dev`
- [ ] All dependencies in package.json are production-ready
- [ ] Environment variables documented in .env.example
- [ ] Static assets (images, CSS, JS) are properly organized
- [ ] Security configurations tested (CORS, CSP, rate limiting)

### Docker Preparation
- [ ] Dockerfile builds successfully: `npm run docker:build`
- [ ] Docker image runs locally: `npm run docker:run`
- [ ] Health check endpoint responds: `npm run docker:health`
- [ ] Mobile interface accessible on local network
- [ ] All required files included (check .dockerignore)

### Security Review
- [ ] `.env.docker` has secure HOST_TOKEN (64+ characters)
- [ ] ALLOWED_ORIGINS configured for production domains
- [ ] No sensitive data in image or repository
- [ ] Container runs as non-root user
- [ ] Resource limits configured

### Documentation
- [ ] DEPLOYMENT_GUIDE.md updated with any changes
- [ ] README-DOCKER.md reflects current configuration
- [ ] Environment variables documented
- [ ] Mobile access instructions provided

## Handoff to Managers

### Delivery Package
- [ ] Docker image tagged with version: `dept-monopoly:v1.0.0`
- [ ] `.env.docker` template provided
- [ ] DEPLOYMENT_GUIDE.md included
- [ ] Change log prepared
- [ ] Testing evidence provided

### Communication Template
```
Subject: Docker Deployment Request - Dept Monopoly Game v1.0.0

Docker Image: dept-monopoly:v1.0.0
Environment File: .env.docker (secure values needed)
Port Requirements: 3000 (HTTP + WebSocket)
Resource Requirements: 512MB RAM, 1 CPU

Testing Status: ✅ Complete
Security Review: ✅ Approved
Mobile Compatibility: ✅ Verified

Changes in this version:
- [List key features/fixes]

Please coordinate with IT team for server deployment.
Deployment guide attached: DEPLOYMENT_GUIDE.md
```

## IT Team Deployment

### Server Preparation
- [ ] Linux server available (Ubuntu/Alpine compatible)
- [ ] Docker and docker-compose installed
- [ ] Port 3000 available and accessible
- [ ] SSL certificates ready (if HTTPS required)
- [ ] Reverse proxy configured (nginx/Apache)
- [ ] Firewall rules updated for mobile access

### Environment Configuration
- [ ] Copy `.env.docker` to server
- [ ] Generate secure HOST_TOKEN: `openssl rand -hex 32`
- [ ] Set production ALLOWED_ORIGINS
- [ ] Verify all required variables set
- [ ] Test configuration: `docker-compose config`

### Deployment Execution
- [ ] Load Docker image on server
- [ ] Start services: `docker-compose up -d`
- [ ] Verify container running: `docker-compose ps`
- [ ] Test health endpoint: `curl localhost:3000/network-info`
- [ ] Verify mobile access from test device
- [ ] Check logs for errors: `docker-compose logs`

### Post-Deployment Verification
- [ ] Main application accessible via domain
- [ ] Mobile interface works on company network
- [ ] WebSocket connections established
- [ ] No security warnings in browser console
- [ ] Resource usage within expected limits
- [ ] Logs showing normal operation

## Production Monitoring

### Health Checks
- [ ] Application endpoint: `https://your-domain.com/network-info`
- [ ] Mobile endpoint: `https://your-domain.com/mobile`
- [ ] WebSocket connectivity test
- [ ] Container resource usage monitoring

### Log Monitoring
- [ ] Application logs configured
- [ ] Error alerting set up
- [ ] Log rotation configured
- [ ] Performance metrics tracked

### Backup & Maintenance
- [ ] Container image backup stored
- [ ] Environment configuration backed up
- [ ] Rollback procedure tested
- [ ] Update procedure documented

## Emergency Procedures

### Rollback Steps
```bash
# Stop current version
docker-compose down

# Load previous version
docker tag dept-monopoly:v0.9.0 dept-monopoly:latest

# Restart with previous version
docker-compose up -d
```

### Quick Diagnostics
```bash
# Container status
docker-compose ps

# Recent logs
docker-compose logs --tail=50 dept-monopoly

# Resource usage
docker stats dept-monopoly-app

# Network connectivity
curl -f http://localhost:3000/network-info
```

### Common Issues & Solutions

| Issue | Diagnosis | Solution |
|-------|-----------|----------|
| CORS errors | Mobile can't connect | Check ALLOWED_ORIGINS |
| 404 on static files | Assets not found | Verify image build |
| High memory usage | Resource leak | Check logs, restart if needed |
| WebSocket failures | Connection drops | Check firewall, proxy config |

## Sign-off

### Development Team
- [ ] Code tested and ready: _________________ Date: _______
- [ ] Docker configuration validated: __________ Date: _______
- [ ] Documentation complete: _________________ Date: _______

### Management Approval
- [ ] Deployment authorized: __________________ Date: _______
- [ ] IT team notified: _____________________ Date: _______

### IT Team Deployment
- [ ] Server prepared: _______________________ Date: _______
- [ ] Application deployed: __________________ Date: _______
- [ ] Verification complete: _________________ Date: _______
- [ ] Production ready: _____________________ Date: _______

---

**Note**: This checklist follows the company's established Docker deployment patterns based on the onead-creative-cloud project structure.