# n8n Enterprise Workflows v2.0.0

🚀 **Enterprise-grade workflow automation system built on n8n**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![n8n Compatible](https://img.shields.io/badge/n8n-compatible-blue)](https://n8n.io/)

---

## 📋 Overview

A comprehensive automation solution for enterprise businesses featuring:
- **Multi-domain routing** (Commercial, Operations, Finance, Knowledge, Monitoring)
- **CRM integration** (HubSpot, Notion, Google Sheets)
- **Smart lead scoring** and automatic assignment
- **Financial transaction management**
- **Task & incident management**
- **Knowledge base automation**
- **Real-time notifications** (Slack, Email)
- **Audit logging** and compliance tracking

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    WF_CORE_ROUTER                           │
│             (Central Request Orchestrator)                   │
└──────────┬──────────┬──────────┬──────────┬─────────────────┘
           │          │          │          │           
    ┌──────▼───┐ ┌───▼──────┐ ┌─▼─────────┐ ┌──▼───────────┐
    │   SW1    │ │   SW2    │ │   SW3     │ │    SW4       │
    │  Leads   │ │  Tasks   │ │ Finance   │ │  Knowledge   │
    │          │ │ Incidents│ │           │ │              │
    └──────────┘ └──────────┘ └───────────┘ └──────────────┘
         │             │            │              │
    ┌────▼─────────────▼────────────▼──────────────▼────┐
    │     External Integrations                         │
    │  HubSpot | Notion | Slack | Google | Email        │
    └───────────────────────────────────────────────────┘
```

---

## 🎯 Features

### Core Router (WF_CORE_ROUTER)
- ✅ Request validation & sanitization
- ✅ Domain-based routing
- ✅ Error handling & retry logic
- ✅ Audit logging
- ✅ Real-time monitoring

### Commercial Module (SW1)
- ✅ Automated lead capture
- ✅ Smart lead scoring (0-100)
- ✅ HubSpot CRM sync
- ✅ Deal creation automation
- ✅ Slack notifications for high-value leads
- ✅ Notion database logging

### Operations Module (SW2)
- ✅ Task management
- ✅ Incident reporting
- ✅ Priority-based routing
- ✅ Team notifications
- ✅ Google Sheets integration
- ✅ Email alerts for critical incidents

### Finance Module (SW3)
- ✅ Transaction recording (income/expense)
- ✅ Multi-currency support
- ✅ Approval workflows
- ✅ Google Sheets ledger
- ✅ Financial analytics
- ✅ Compliance notifications

### Knowledge Module (SW4)
- ✅ Documentation storage
- ✅ FAQ management
- ✅ Tutorial creation
- ✅ Keyword extraction
- ✅ Search indexing
- ✅ Team collaboration

---

## 🚀 Quick Start

### Prerequisites
- Node.js >= 18.0.0
- npm >= 9.0.0
- n8n installed globally
- Active accounts: HubSpot, Notion, Slack

### Installation

```bash
# Clone repository
git clone https://github.com/Jdorge/n8n-workflows-enterprise.git
cd n8n-workflows-enterprise

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your credentials

# Start n8n
npm start

# Deploy workflows
npm run deploy:all
```

### Environment Setup

1. **Copy environment template:**
   ```bash
   cp .env.example .env
   ```

2. **Configure credentials in `.env`:**
   - Add Notion API secret
   - Add HubSpot API key
   - Add Slack bot token
   - Configure database IDs

3. **See full configuration guide:** [`docs/API_CREDENTIALS.md`](docs/API_CREDENTIALS.md)

---

## 📚 Documentation

- 📖 **[Implementation Guide](docs/IMPLEMENTATION_GUIDE.md)** - Step-by-step setup instructions
- 🔐 **[API Credentials](docs/API_CREDENTIALS.md)** - Detailed credential configuration
- 🏗️ **[Architecture](docs/ARCHITECTURE.md)** - System architecture & design decisions
- 🧪 **[Testing Guide](docs/TESTING.md)** - Testing workflows & validation

---

## 🔧 Available Scripts

```bash
npm start              # Start n8n server
npm run dev            # Start with ngrok tunnel
npm run deploy         # Deploy single workflow
npm run deploy:all     # Deploy all workflows
npm test               # Run test suite
npm run validate       # Validate workflow files
npm run lint           # Lint JavaScript files
```

---

## 📁 Project Structure

```
n8n-workflows-enterprise/
├── workflows/              # n8n workflow JSON files
│   ├── WF_CORE_ROUTER_v2.0.0.json
│   ├── SW1_LEADS_COMERCIAL_v2.0.0.json
│   ├── SW2_OPERACOES_v2.0.0.json
│   ├── SW3_FINANCEIRO_v2.0.0.json
│   └── SW4_CONHECIMENTO_v2.0.0.json
├── scripts/                # Automation scripts
│   ├── deploy.js          # Workflow deployment
│   ├── test.js            # Test suite
│   ├── validators.js      # Validation utilities
│   └── backup.js          # Backup automation
├── docs/                   # Documentation
│   ├── IMPLEMENTATION_GUIDE.md
│   ├── API_CREDENTIALS.md
│   ├── ARCHITECTURE.md
│   └── TROUBLESHOOTING.md
├── .env.example           # Environment template
├── package.json           # Dependencies
└── README.md              # This file
```

---

## 🧪 Testing

### Run automated tests:
```bash
npm test
```

### Test individual workflow:
```bash
curl -X POST http://localhost:5678/webhook/process-request \
  -H "Content-Type: application/json" \
  -d '{
    "domain": "comercial",
    "intent": "create_lead",
    "data": {
      "name": "João Silva",
      "email": "joao@empresa.com",
      "phone": "+55 11 98765-4321",
      "company": "Empresa XYZ",
      "source": "website"
    }
  }'
```

---

## 🔒 Security

- ✅ All credentials stored in `.env` (never committed)
- ✅ Input sanitization & validation
- ✅ SQL injection protection
- ✅ XSS prevention
- ✅ Rate limiting on webhooks
- ✅ Audit logging for compliance

**⚠️ Important:** Never commit `.env` file to version control!

---

## 📊 Monitoring & Logging

- **Notion Audit Database:** Centralized logging
- **Slack Notifications:** Real-time alerts
- **n8n Execution History:** Detailed debugging
- **Google Sheets:** Transaction ledger

---

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

---

## 📝 License

This project is licensed under the MIT License - see [LICENSE](LICENSE) file for details.

---

## 🆘 Support

- **Documentation:** [docs/](docs/)
- **Issues:** [GitHub Issues](https://github.com/Jdorge/n8n-workflows-enterprise/issues)
- **Discussions:** [GitHub Discussions](https://github.com/Jdorge/n8n-workflows-enterprise/discussions)

---

## 🗺️ Roadmap

- [ ] Add workflow monitoring dashboard
- [ ] Implement workflow versioning
- [ ] Add multi-tenancy support
- [ ] Create workflow templates library
- [ ] Add AI-powered automation suggestions
- [ ] Implement advanced analytics

---

## 👥 Authors

- **Jorge Freitas** - *Initial work* - [@Jdorge](https://github.com/Jdorge)

---

## 🙏 Acknowledgments

- n8n team for the amazing automation platform
- Open source community
- All contributors

---

**Made with ❤️ for enterprise automation**

*Last Updated: December 2024*
*Version: 2.0.0*
