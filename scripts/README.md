# Scripts Directory

Automation scripts for the n8n workflows enterprise project.

## 📁 Files

### Core Scripts

- **deploy.js** - Workflow deployment automation
- **test.js** - Automated testing suite
- **validators.js** - Reusable validation functions
- **backup.js** - Backup automation

## 🚀 Usage

### Deploy Workflows
```bash
# Deploy all workflows
npm run deploy:all

# Deploy specific workflow
npm run deploy WF_CORE_ROUTER_v2.0.0.json

# Deploy without updating existing
npm run deploy -- --no-update
```

### Run Tests
```bash
# Run full test suite
npm test

# Run with verbose output
npm test -- --verbose
```

### Backup Data
```bash
# Create backup
npm run backup

# Restore from backup
npm run backup -- --restore backup-2024-12-03.json
```

## 📝 Script Details

### deploy.js
- Validates n8n connection
- Checks for existing workflows
- Creates or updates workflows
- Activates workflows automatically
- Provides detailed deployment logs

### test.js
- Validation tests
- Integration tests
- Webhook tests
- Provides test coverage report

### validators.js
Reusable validation utilities:
- `validateEmail()` - Email validation
- `validatePhone()` - Phone number validation
- `validateCNPJ()` - Brazilian CNPJ validation
- `validateLeadSchema()` - Lead data validation
- `calculateLeadScore()` - Lead scoring algorithm
- `sanitizeData()` - Input sanitation
- More...

### backup.js
- Automatic workflow backup
- Credential backup (encrypted)
- Execution history export
- Restore functionality

## 🔧 Environment Variables

Scripts use these environment variables:
```bash
N8N_HOST=localhost
N8N_PORT=5678
N8N_API_KEY=your-api-key
BACKUP_DIR=./backups
```

## 📊 Exit Codes

- `0` - Success
- `1` - General error
- `2` - Configuration error
- `3` - API connection error

## 🧪 Testing

Run tests for scripts:
```bash
npm test scripts/
```

---

**Note:** Download complete script files from GitHub repository:
https://github.com/Jdorge/n8n-workflows-enterprise/tree/main/scripts
