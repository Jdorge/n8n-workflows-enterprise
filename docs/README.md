# Documentation

Comprehensive documentation for the n8n Enterprise Workflows project.

## 📚 Available Guides

### Getting Started
- **[SETUP.md](../SETUP.md)** - Quick setup guide
- **[IMPLEMENTATION_GUIDE.md](IMPLEMENTATION_GUIDE.md)** - Full step-by-step implementation
- **[API_CREDENTIALS.md](API_CREDENTIALS.md)** - API credential configuration

### Technical Documentation
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - System architecture and design decisions
- **[WORKFLOW_SPECIFICATIONS.md](WORKFLOW_SPECIFICATIONS.md)** - Detailed workflow specs
- **[API_REFERENCE.md](API_REFERENCE.md)** - API endpoints and usage

### Operations
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Production deployment guide
- **[MONITORING.md](MONITORING.md)** - Monitoring and observability
- **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** - Common issues and solutions

### Security & Compliance
- **[SECURITY.md](SECURITY.md)** - Security best practices
- **[COMPLIANCE.md](COMPLIANCE.md)** - Compliance guidelines
- **[BACKUP_RECOVERY.md](BACKUP_RECOVERY.md)** - Backup and recovery procedures

## 🎯 Documentation by Role

### For Developers
1. [Architecture](ARCHITECTURE.md)
2. [API Reference](API_REFERENCE.md)
3. [Workflow Specifications](WORKFLOW_SPECIFICATIONS.md)

### For DevOps
1. [Deployment Guide](DEPLOYMENT.md)
2. [Monitoring Setup](MONITORING.md)
3. [Backup & Recovery](BACKUP_RECOVERY.md)

### For Business Users
1. [Quick Setup](../SETUP.md)
2. [Implementation Guide](IMPLEMENTATION_GUIDE.md)
3. [Troubleshooting](TROUBLESHOOTING.md)

## 📖 Reading Order

**New to the project?** Read in this order:
1. [README.md](../README.md) - Project overview
2. [SETUP.md](../SETUP.md) - Quick setup
3. [IMPLEMENTATION_GUIDE.md](IMPLEMENTATION_GUIDE.md) - Detailed implementation
4. [API_CREDENTIALS.md](API_CREDENTIALS.md) - Configure integrations

**Ready to deploy?**
1. [DEPLOYMENT.md](DEPLOYMENT.md)
2. [MONITORING.md](MONITORING.md)
3. [SECURITY.md](SECURITY.md)

## 🔍 Quick Reference

### Common Tasks

**Installing:**
```bash
npm install
cp .env.example .env
npm run deploy:all
```

**Testing:**
```bash
npm test
curl -X POST http://localhost:5678/webhook/process-request ...
```

**Deploying:**
```bash
npm run deploy:all
npm start
```

### Important Links

- **Repository:** https://github.com/Jdorge/n8n-workflows-enterprise
- **n8n Docs:** https://docs.n8n.io
- **HubSpot API:** https://developers.hubspot.com
- **Notion API:** https://developers.notion.com
- **Slack API:** https://api.slack.com

## ✏️ Contributing to Docs

Found an issue or want to improve documentation?

1. Fork the repository
2. Edit the relevant .md file
3. Submit a pull request

### Documentation Standards

- Use clear, concise language
- Include code examples
- Add screenshots where helpful
- Keep formatting consistent
- Update table of contents

## 📝 Documentation TODOs

- [ ] Add video tutorials
- [ ] Create FAQ section
- [ ] Add more examples
- [ ] Translate to Portuguese
- [ ] Add diagrams for workflows

## 🆘 Getting Help

Can't find what you need?

1. Check [Troubleshooting Guide](TROUBLESHOOTING.md)
2. Search GitHub Issues
3. Open a new issue with the `documentation` label

---

**Note:** Download complete documentation from GitHub repository:
https://github.com/Jdorge/n8n-workflows-enterprise/tree/main/docs
