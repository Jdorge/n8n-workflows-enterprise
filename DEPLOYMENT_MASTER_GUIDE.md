# NEXUS n8n Production Deployment Guide

## 📋 Pré-Requisitos (Checklist)

- [ ] AWS Account com acesso sa-east-1
- [ ] AWS CLI configurado (`aws configure`)
- [ ] kubectl instalado e configurado
- [ ] Terraform >= 1.6 instalado
- [ ] Docker instalado (para testes locais)
- [ ] GitHub repo criado: `n8n-workflows-enterprise`
- [ ] S3 bucket para Terraform state: `nexus-terraform-state`
- [ ] DynamoDB table para lock: `terraform-locks`

## 🚀 Timeline: 8 Horas para Go-Live

### **19:00 - 20:00: Validação + Setup (1h)**

1. Clonar repositório e validar estrutura

```bash
git clone https://github.com/Jdorge/n8n-workflows-enterprise
cd n8n-workflows-enterprise
```

2. Criar estrutura de diretórios

```bash
mkdir -p .github/workflows
mkdir -p terraform
mkdir -p scripts
mkdir -p kubernetes/manifests
mkdir -p infrastructure/monitoring
```

3. Validar arquivos

```bash
find . -name "*.yml" | wc -l # Deve haver 6+
ls -la terraform/ # Verificar arquivos do Terraform
ls -la .github/workflows/ # Verificar fluxo de trabalho de CI/CD
```

4. Verificação de credenciais da AWS

```bash
aws sts get-caller-identity
aws ec2 describe-regions --region sa-east-1
```

5. Inicialização do Terraform (simulação)

```bash
cd terraform
terraform init -backend=false
terraform validate
cd ..
```

### **20:00 - 21:00: Terraform Staging (1h)**

```bash
cd terraform

# Inicializar backend S3
terraform init \
  -backend-config="bucket=nexus-terraform-state" \
  -backend-config="key=staging/terraform.tfstate" \
  -backend-config="region=sa-east-1"

# Plano para staging
terraform plan \
  -var="environment=staging" \
  -var="n8n_replicas=3" \
  -out=staging.tfplan

# Aplicar plano
terraform apply staging.tfplan

# Capturar outputs
terraform output -json > ../staging-outputs.json
export RDS_ENDPOINT=$(terraform output -raw rds_endpoint)
export REDIS_ENDPOINT=$(terraform output -raw redis_endpoint)
export EKS_CLUSTER=$(terraform output -raw eks_cluster_name)

echo "✅ Terraform Staging Completo"
```

### **21:00 - 22:00: Kubernetes Staging (1h)**

1. Criar namespace

```bash
kubectl create namespace staging
```

2. Configurar kubeconfig

```bash
aws eks update-kubeconfig \
  --region sa-east-1 \
  --name $(terraform output -raw eks_cluster_name)
```

3. Criar secrets

```bash
kubectl create secret generic n8n-secrets \
  --from-literal=db_host=$RDS_ENDPOINT \
  --from-literal=redis_host=$REDIS_ENDPOINT \
  -n staging
```

4. Deploy n8n

```bash
kubectl apply -f kubernetes/deployment-n8n.yml -n staging
```

5. Aguardar pronto

```bash
kubectl wait --for=condition=available --timeout=600s \
  deployment/nexus-n8n -n staging
```

6. Verificar status

```bash
kubectl get pods -n staging
kubectl get svc -n staging
```

echo "✅ Kubernetes Staging Completo"

### **22:00 - 23:00: Monitoring (1h)**

1. Aplicar regras do Prometheus

```bash
kubectl apply -f infrastructure/monitoring/prometheus-rules.yml \
  -n monitoring
```

2. Importar dashboard do Grafana

```bash
curl -X POST \
  -H "Authorization: Bearer $GRAFANA_TOKEN" \
  -H "Content-Type: application/json" \
  -d @grafana-nexus-dashboard.json \
  http://grafana.nexus.internal/api/dashboards/db
```

3. Testar health

```bash
kubectl exec -it deployment/nexus-n8n -n staging -- \
  curl http://localhost:5678/healthz
```

4. Verificar Prometheus

```bash
curl -s http://prometheus.nexus.internal/api/v1/query?query=up | jq .
```

echo "✅ Monitoring Staging Completo"

### **23:00 - 00:00: Backup + Load Test (1h)**

1. Configurar cronjob de backup

```bash
kubectl apply -f - << 'EOF'
apiVersion: batch/v1
kind: CronJob
metadata:
  name: n8n-backup
  namespace: staging
spec:
  schedule: "0 * * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
      - name: backup
        image: busybox
        command: ["/scripts/backup-restore.sh", "backup"]
      restartPolicy: OnFailure
EOF
```

2. Testar backup manual

```bash
kubectl exec -it deployment/nexus-n8n -n staging -- \
  /scripts/backup-restore.sh backup
```

3. Verificar S3

```bash
aws s3 ls s3://nexus-n8n-backups-staging/ --recursive
```

4. Load test

```bash
pip install locust
locust -f locustfile.py \
  --host=http://n8n-staging.nexus.internal \
  --users=100 \
  --spawn-rate=10 \
  --run-time=5m
```

echo "✅ Backup + Load Test Completo"

### **00:00 - 01:00: Production Terraform (1h)**

```bash
cd terraform

# Criar workspace produção
terraform workspace new production || terraform workspace select production

# Planejar produção
terraform plan \
  -var="environment=production" \
  -var="n8n_replicas=5" \
  -out=production.tfplan

# Aplicar
terraform apply production.tfplan

# Gravar outputs
terraform output -json > ../production-outputs.json

echo "✅ Production Terraform Completo"
```

### **01:00 - 02:00: Kubernetes Production (1h)**

1. Criar namespace produção

```bash
kubectl create namespace production
```

2. Criar secrets

```bash
kubectl create secret generic n8n-secrets \
  --from-literal=db_host=$(terraform output -raw rds_endpoint) \
  --from-literal=redis_host=$(terraform output -raw redis_endpoint) \
  -n production
```

3. Deploy produção

```bash
kubectl apply -f kubernetes/deployment-n8n.yml -n production
```

4. Aguardar pronto

```bash
kubectl wait --for=condition=available --timeout=600s \
  deployment/nexus-n8n -n production
```

5. Validar

```bash
kubectl get pods -n production
kubectl get svc -n production
```

echo "✅ Kubernetes Production Completo"

### **02:00 - 03:00: Final Validation (1h)**

1. Health checks

```bash
curl -s http://n8n-production.nexus.internal/healthz | jq .
```

2. Métricas

```bash
curl -s http://prometheus.nexus.internal/api/v1/query?query=up | jq .
```

3. Alertas

```bash
curl -s http://alertmanager.nexus.internal/api/v1/alerts | jq .
```

4. Backup final

```bash
kubectl exec -it deployment/nexus-n8n -n production -- \
  /scripts/backup-restore.sh backup
```

5. Relatório final

```bash
echo "## NEXUS n8n Production Deployment" > deployment-report.md
echo "- Version: v1.0.0" >> deployment-report.md
echo "- Timestamp: $(date)" >> deployment-report.md
echo "- Status: ✅ ATIVO" >> deployment-report.md
```

echo "🎉 NEXUS n8n LIVE EM PRODUÇÃO!"

## 📊 SLA Validation

```bash
# Uptime check
kubectl get deployment nexus-n8n -n production -o jsonpath='{.status.conditions[?(@.type=="Available")].status}'

# Latency check
kubectl top pods -n production

# Backup check
aws s3 ls s3://nexus-n8n-backups-production/ --recursive | tail -5

# Alert check
curl -s http://alertmanager.nexus.internal/api/v1/alerts | jq '.data | length'
```

## 🚨 Contingency

### Se Terraform falhar

```bash
terraform destroy -auto-approve
# Fix issues, retry
```

### Se Kubernetes falhar

```bash
kubectl delete -f kubernetes/deployment-n8n.yml -n staging
# Fix manifests, redeploy
```

### Se Monitoring falhar

```bash
kubectl delete -f infrastructure/monitoring/prometheus-rules.yml
# Fix rules, reapply
```

## ✅ Success Criteria

- [ ] Uptime: 99.99% SLA
- [ ] Latency: P95 < 30s
- [ ] Concurrency: 500+ workflows
- [ ] Backup: Hourly automated
- [ ] Monitoring: 25+ alerts
- [ ] Cost: ~R$ 6k/mês
