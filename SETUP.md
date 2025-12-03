# 🚀 Quick Setup Guide

## Step 1: Install Dependencies

```bash
cd "Enterprise Empresarial/n8n-workflows"
npm install
```

## Step 2: Configure Environment

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your credentials
notepad .env  # or use your preferred editor
```

**Required Credentials:**
- Notion API Secret
- HubSpot API Key  
- Slack Bot Token
- Google Service Account (optional)

See [docs/API_CREDENTIALS.md](docs/API_CREDENTIALS.md) for detailed setup instructions.

## Step 3: Download Complete Workflow Files

The complete workflow JSON files are large. Download them from:

**GitHub Repository:** https://github.com/Jdorge/n8n-workflows-enterprise

Or create them manually using the templates in the docs.

## Step 4: Start n8n

```bash
# Install n8n globall (if not already installed)
npm install -g n8n

# Start n8n
npm start
```

Access n8n at: http://localhost:5678

## Step 5: Deploy Workflows

```bash
# Deploy all workflows at once
npm run deploy:all

# Or deploy individual workflows
npm run deploy workflows/WF_CORE_ROUTER_v2.0.0.json
```

## Step 6: Test the System

```bash
# Run automated tests
npm test

# Or manually test with curl
curl -X POST http://localhost:5678/webhook/process-request \
  -H "Content-Type: application/json" \
  -d '{
    "domain": "comercial",
    "intent": "create_lead",
    "data": {
      "name": "Test User",
      "email": "test@example.com",
      "phone": "+55 11 98765-4321",
      "source": "website"
    }
  }'
```

## 🆘 Troubleshooting

### "Cannot connect to n8n API"
- Make sure n8n is running: `npm start`
- Check N8N_API_KEY in .env file

### "Notion API authentication failed"
- Verify NOTION_SECRET starts with `secret_`
- Ensure integration is shared with your databases

### "Workflow not found"
- Make sure workflow files are in the `workflows/` directory
- Run `npm run deploy:all` to deploy

## 📚 Documentation

- **Full Implementation Guide:** [docs/IMPLEMENTATION_GUIDE.md](docs/IMPLEMENTATION_GUIDE.md)
- **API Credentials Setup:** [docs/API_CREDENTIALS.md](docs/API_CREDENTIALS.md)
- **Architecture Overview:** [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

## ✅ Verifying Setup

After setup, you should have:
- [x] Dependencies installed (`node_modules/`)
- [x] Environment configured (`.env` file)
- [x] n8n running (http://localhost:5678)
- [x] Workflows deployed (visible in n8n UI)
- [x] Tests passing (`npm test`)

## 🎉 Next Steps

Once everything is working:

1. **Customize workflows** for your business needs
2. **Configure integrations** with your CRM/tools
3. **Set up monitoring** and alerts
4. **Deploy to production** (see deployment guide)

---

**Need Help?**
- Check [README.md](README.md) for overview
- Read full docs in [docs/](docs/)
- Open an issue on GitHub
