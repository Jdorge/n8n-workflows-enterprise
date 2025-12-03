# n8n Workflows

This directory contains all n8n workflow JSON files for the enterprise automation system.

## 📋 Available Workflows

### Core Router
- **WF_CORE_ROUTER_v2.0.0.json** - Central request orchestrator
  - Validates and routes requests to appropriate sub-workflows
  - Handles error management and audit logging
  - Integrates with Notion and Slack for monitoring

### Sub-Workflows

1. **SW1_LEADS_COMERCIAL_v2.0.0.json** - Commercial/Sales Module
   - Automated lead capture and validation
   - Smart lead scoring (0-100)
   - HubSpot CRM integration
   - Deal creation for high-value leads
   - Slack notifications for sales team

2. **SW2_OPERACOES_v2.0.0.json** - Operations Module
   - Task management and assignment
   - Incident reporting and tracking
   - Priority-based routing
   - Google Sheets integration
   - Email alerts for critical incidents

3. **SW3_FINANCEIRO_v2.0.0.json** - Finance Module
   - Transaction recording (income/expense)
   - Multi-currency support
   - Approval workflows for high-value transactions
   - Financial analytics
   - Google Sheets ledger

4. **SW4_CONHECIMENTO_v2.0.0.json** - Knowledge Management Module
   - Documentation storage
   - FAQ management
   - Tutorial creation
   - Keyword extraction and indexing
   - Team collaboration features

5. **SW5_MONITORAMENTO_v2.0.0.json** - Monitoring Module
   - System health checks
   - Performance metrics
   - Error tracking
   - Automated alerts

## 🚀 Deployment

### Deploy All Workflows
```bash
npm run deploy:all
```

### Deploy Single Workflow
```bash
npm run deploy WF_CORE_ROUTER_v2.0.0.json
```

### Manual Import
1. Open n8n UI at http://localhost:5678
2. Go to "Workflows" → "Import from File"
3. Select the desired JSON file
4. Configure credentials for each integration node
5. Save and activate

## 🔧 Workflow Structure

Each workflow follows this structure:

```json
{
  "name": "WORKFLOW_NAME",
  "nodes": [...],          // Array of workflow nodes
  "connections": {...},    // Node connections
  "active": true,          // Auto-activate on deploy
  "settings": {...},       // Workflow settings
  "tags": [...]           // Organization tags
}
```

## 📝 Customization

### Modifying Workflows

1. **Edit in n8n UI** (Recommended)
   - Import workflow
   - Make changes visually
   - Export updated JSON

2. **Edit JSON Directly** (Advanced)
   - Open JSON file in editor
   - Modify node parameters
   - Validate JSON syntax
   - Re-deploy

### Common Customizations

- **Change Webhook URLs:** Update in trigger nodes
- **Modify Business Rules:** Edit code in Function nodes
- **Add Integrations:** Add new credential nodes
- **Adjust Notifications:** Update Slack/Email nodes

## 🧪 Testing Workflows

### Test Core Router
```bash
curl -X POST http://localhost:5678/webhook/process-request \
  -H "Content-Type: application/json" \
  -d '{
    "domain": "comercial",
    "intent": "create_lead",
    "data": {
      "name": "Test User",
      "email": "test@example.com"
    }
  }'
```

### Test Individual Workflows

Each workflow has its own webhook endpoint:
- `/webhook/process-request` - Core Router
- `/webhook/leads-comercial` - Commercial
- `/webhook/operacoes` - Operations
- `/webhook/financeiro` - Finance
- `/webhook/conhecimento` - Knowledge

## 📊 Workflow Metrics

Monitor these metrics for each workflow:
- **Execution Time:** Target < 5 seconds
- **Success Rate:** Target > 95%
- **Error Rate:** Target < 5%
- **Daily Executions:** Varies by workflow

## 🔒 Security Considerations

- Never commit workflows with hardcoded credentials
- Use environment variables for sensitive data
- Regularly audit workflow permissions
- Enable execution logging for compliance
- Implement rate limiting on webhooks

## 📚 Additional Resources

- [Implementation Guide](../docs/IMPLEMENTATION_GUIDE.md)
- [Architecture Overview](../docs/ARCHITECTURE.md)
- [API Credentials](../docs/API_CREDENTIALS.md)
- [n8n Documentation](https://docs.n8n.io)

## 🆘 Troubleshooting

### Workflow Won't Activate
- Check all credentials are configured
- Verify webhook URLs are accessible
- Review execution errors in n8n UI

### Slow Execution
- Check external API response times
- Review node logic for optimization
- Consider caching frequently used data

### Missing Data
- Verify input data format
- Check node mappings
- Review validation rules

---

**Note:** Complete workflow JSON files are available in the GitHub repository due to their size. Download from:
https://github.com/Jdorge/n8n-workflows-enterprise/tree/main/workflows
