#!/bin/bash

# setup.sh - NEXUS N8N COMPLETE INSTALLATION
# Usage: bash scripts/setup.sh
set -e

echo "🚀 =========================================="
echo "     NEXUS N8N - SETUP COMPLETE"
echo "==========================================="

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 1. VALIDATE PREREQUISITES
echo -e "\n${YELLOW}[1/8]${NC} Validating prerequisites..."

if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker not found. Install at: https://www.docker.com/${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Docker OK${NC}"

if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose not found${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Docker Compose OK${NC}"

if ! command -v git &> /dev/null; then
    echo -e "${RED}❌ Git not found${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Git OK${NC}"

# 2. CREATE .env IF NOT EXISTS
echo -e "\n${YELLOW}[2/8]${NC} Configuring environment variables..."

if [ ! -f ".env" ]; then
    cp .env.example .env 2>/dev/null || cat > .env << 'EOF'
# DATABASE
DB_PASSWORD=SecureN8nPass2025!

# REDIS
REDIS_PASSWORD=RedisN8n2025!

# GRAFANA
GRAFANA_PASSWORD=admin123

# N8N CONFIG
N8N_HOST=localhost
WEBHOOK_TUNNEL_URL=http://localhost:5678
GENERIC_TIMEZONE=America/Sao_Paulo

# NOTIFICATIONS (OPTIONAL)
SLACK_WEBHOOK_URL=
TELEGRAM_BOT_TOKEN=
EMAIL_SMTP_HOST=
EMAIL_SMTP_PORT=587
EMAIL_SMTP_USER=
EMAIL_SMTP_PASS=
EOF
    echo -e "${GREEN}✅ .env created${NC}"
else
    echo -e "${GREEN}✅ .env already exists${NC}"
fi

# 3. CREATE NECESSARY DIRECTORIES
echo -e "\n${YELLOW}[3/8]${NC} Creating directory structure..."

mkdir -p .github/workflows
mkdir -p infrastructure/docker
mkdir -p infrastructure/terraform
mkdir -p infrastructure/kubernetes/manifests
mkdir -p infrastructure/monitoring/prometheus
mkdir -p infrastructure/monitoring/grafana
mkdir -p infrastructure/monitoring/alerting
mkdir -p scripts
mkdir -p templates
mkdir -p docs
mkdir -p tests/{unit,integration,load}
mkdir -p workflows
mkdir -p logs

echo -e "${GREEN}✅ Directory structure created${NC}"

# 4. CREATE MONITORING CONFIGS
echo -e "\n${YELLOW}[4/8]${NC} Creating monitoring configurations..."

# Prometheus config
cat > infrastructure/monitoring/prometheus/prometheus.yml << 'EOF'
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "alert_rules.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093

scrape_configs:
  - job_name: 'n8n'
    static_configs:
      - targets: ['n8n:5678']
    metrics_path: '/metrics'
    scrape_interval: 5s

  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres:9187']
    scrape_interval: 10s

  - job_name: 'redis'
    static_configs:
      - targets: ['redis:9121']
    scrape_interval: 10s
EOF

# Alertmanager config
cat > infrastructure/monitoring/alerting/alertmanager.yml << 'EOF'
global:
  smtp_smarthost: 'localhost:587'
  smtp_from: 'alertmanager@nexus.local'

route:
  group_by: ['alertname']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'slack'
  routes:
  - match:
      severity: critical
    receiver: 'slack-critical'

receivers:
- name: 'slack'
  slack_configs:
  - api_url: 'YOUR_SLACK_WEBHOOK_URL'
    channel: '#n8n-alerts'
    send_resolved: true

- name: 'slack-critical'
  slack_configs:
  - api_url: 'YOUR_SLACK_WEBHOOK_URL'
    channel: '#n8n-critical'
    send_resolved: true
EOF

echo -e "${GREEN}✅ Monitoring configs created${NC}"

# 5. CREATE GRAFANA PROVISIONING
echo -e "\n${YELLOW}[5/8]${NC} Creating Grafana provisioning..."

mkdir -p infrastructure/monitoring/grafana/provisioning/datasources
mkdir -p infrastructure/monitoring/grafana/provisioning/dashboards
mkdir -p infrastructure/monitoring/grafana/dashboards

# Grafana datasource
cat > infrastructure/monitoring/grafana/provisioning/datasources/prometheus.yml << 'EOF'
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: true
EOF

# Grafana dashboard provisioning
cat > infrastructure/monitoring/grafana/provisioning/dashboards/nexus.yml << 'EOF'
apiVersion: 1

providers:
  - name: 'NEXUS'
    type: file
    disableDeletion: false
    updateIntervalSeconds: 10
    allowUiUpdates: true
    options:
      path: /var/lib/grafana/dashboards
EOF

echo -e "${GREEN}✅ Grafana provisioning created${NC}"

# 6. CREATE SAMPLE WORKFLOWS
echo -e "\n${YELLOW}[6/8]${NC} Creating sample workflows..."

# WF_CORE_ROUTER.json
cat > workflows/WF_CORE_ROUTER.json << 'EOF'
{
  "name": "WF_CORE_ROUTER",
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "webhook",
        "responseMode": "responseNode",
        "options": {}
      },
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1,
      "position": [240, 300]
    },
    {
      "parameters": {
        "values": {
          "string": [
            {
              "name": "domain",
              "value": "={{ $json.body.domain || 'unknown' }}"
            }
          ]
        },
        "options": {}
      },
      "name": "Set Domain",
      "type": "n8n-nodes-base.set",
      "typeVersion": 3.2,
      "position": [460, 300]
    },
    {
      "parameters": {
        "values": {
          "string": [
            {
              "name": "workflow_name",
              "value": "={{ 'SW' + ($json.body.domain === 'comercial' ? '1' : $json.body.domain === 'varejo' ? '2' : '3') + '_ROUTER' }}"
            }
          ]
        },
        "options": {}
      },
      "name": "Set Workflow Name",
      "type": "n8n-nodes-base.set",
      "typeVersion": 3.2,
      "position": [680, 300]
    }
  ],
  "connections": {
    "Webhook": {
      "main": [
        [
          {
            "node": "Set Domain",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Set Domain": {
      "main": [
        [
          {
            "node": "Set Workflow Name",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  },
  "settings": {}
}
EOF

echo -e "${GREEN}✅ Sample workflows created${NC}"

# 7. CREATE .env.example
echo -e "\n${YELLOW}[7/8]${NC} Creating .env.example..."

cat > .env.example << 'EOF'
# DATABASE
DB_PASSWORD=SecureN8nPass2025!

# REDIS
REDIS_PASSWORD=RedisN8n2025!

# GRAFANA
GRAFANA_PASSWORD=admin123

# N8N CONFIG
N8N_HOST=localhost
WEBHOOK_TUNNEL_URL=http://localhost:5678
GENERIC_TIMEZONE=America/Sao_Paulo

# NOTIFICATIONS (OPTIONAL)
SLACK_WEBHOOK_URL=
TELEGRAM_BOT_TOKEN=
EMAIL_SMTP_HOST=
EMAIL_SMTP_PORT=587
EMAIL_SMTP_USER=
EMAIL_SMTP_PASS=
EOF

echo -e "${GREEN}✅ .env.example created${NC}"

# 8. FINAL INSTRUCTIONS
echo -e "\n${YELLOW}[8/8]${NC} Setup complete!"
echo ""
echo -e "${GREEN}🎉 NEXUS n8n is ready to run!${NC}"
echo ""
echo "📋 Next steps:"
echo "1. Review and customize .env file"
echo "2. Run: docker-compose up -d"
echo "3. Access n8n at: http://localhost:5678"
echo "4. Access Grafana at: http://localhost:3000 (admin/admin123)"
echo "5. Access Prometheus at: http://localhost:9090"
echo ""
echo "📚 Documentation:"
echo "- Main README: README.md"
echo "- Deployment Guide: DEPLOYMENT_MASTER_GUIDE.md"
echo "- API Documentation: docs/api.md"
echo ""
echo -e "${GREEN}🚀 Happy automating with NEXUS n8n!${NC}"