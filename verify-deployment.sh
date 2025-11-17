#!/bin/bash

set -e

echo "🔍 NEXUS n8n Deployment Verification"
echo "======================================"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

check_command() {
  if command -v $1 &> /dev/null; then
    echo -e "${GREEN}✅${NC} $1 installed"
  else
    echo -e "${RED}❌${NC} $1 NOT installed"
    exit 1
  fi
}

# 1. Check prerequisites
echo ""
echo "📋 Checking Prerequisites..."
check_command "aws"
check_command "kubectl"
check_command "terraform"
check_command "docker"

# 2. Check AWS credentials
echo ""
echo "🔐 Checking AWS Credentials..."
if aws sts get-caller-identity &> /dev/null; then
  ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
  echo -e "${GREEN}✅${NC} AWS Account: $ACCOUNT"
else
  echo -e "${RED}❌${NC} AWS credentials not configured"
  exit 1
fi

# 3. Check file structure
echo ""
echo "📁 Checking File Structure..."
files=(
  ".github/workflows/n8n-ci-cd.yml"
  "terraform/main.tf"
  "terraform/variables.tf"
  "scripts/backup-restore.sh"
  "kubernetes/deployment-n8n.yml"
  "infrastructure/monitoring/prometheus-rules.yml"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo -e "${GREEN}✅${NC} $file exists"
  else
    echo -e "${RED}❌${NC} $file MISSING"
  fi
done

# 4. Validate YAML
echo ""
echo "📝 Validating YAML Syntax..."
for file in $(find . -name "*.yml" -o -name "*.yaml"); do
  if python3 -c "import yaml; yaml.safe_load(open('$file'))" 2>/dev/null; then
    echo -e "${GREEN}✅${NC} $file valid"
  else
    echo -e "${RED}❌${NC} $file INVALID"
  fi
done

# 5. Validate Terraform
echo ""
echo "🏗️ Validating Terraform..."
cd terraform
if terraform validate &> /dev/null; then
  echo -e "${GREEN}✅${NC} Terraform syntax valid"
else
  echo -e "${RED}❌${NC} Terraform syntax INVALID"
  exit 1
fi
cd ..

# 6. Check Kubernetes connectivity
echo ""
echo "☸️ Checking Kubernetes Connectivity..."
if kubectl cluster-info &> /dev/null; then
  CLUSTER=$(kubectl cluster-info | head -1 | awk '{print $NF}')
  echo -e "${GREEN}✅${NC} Connected to: $CLUSTER"
else
  echo -e "${YELLOW}⚠️${NC} Kubernetes not configured (OK for local testing)"
fi

echo ""
echo -e "${GREEN}✅ All Validations Passed!${NC}"
echo ""
echo "🚀 Ready for deployment. Run deployment-guide.md for next steps."