#!/bin/bash

# NEXUS n8n Backup & Restore Script
# RTO: < 5min | RPO: < 15min
# Usage: ./backup-restore.sh [backup|restore] [environment]

set -euo pipefail

ENVIRONMENT=${2:-production}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/nexus/backups"
S3_BUCKET="nexus-n8n-backups-${ENVIRONMENT}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}" >&2
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    if ! command -v aws &> /dev/null; then
        error "AWS CLI is not installed"
        exit 1
    fi

    if ! command -v kubectl &> /dev/null; then
        error "kubectl is not installed"
        exit 1
    fi

    if ! command -v pg_dump &> /dev/null; then
        error "pg_dump is not installed"
        exit 1
    fi
}

# Backup database
backup_database() {
    log "Starting database backup..."

    # Get database credentials from Kubernetes secrets
    DB_HOST=$(kubectl get secret nexus-db-secret -n ${ENVIRONMENT} -o jsonpath='{.data.host}' | base64 -d)
    DB_USER=$(kubectl get secret nexus-db-secret -n ${ENVIRONMENT} -o jsonpath='{.data.username}' | base64 -d)
    DB_PASS=$(kubectl get secret nexus-db-secret -n ${ENVIRONMENT} -o jsonpath='{.data.password}' | base64 -d)
    DB_NAME=$(kubectl get secret nexus-db-secret -n ${ENVIRONMENT} -o jsonpath='{.data.database}' | base64 -d)

    # Create backup
    BACKUP_FILE="${BACKUP_DIR}/n8n_db_${TIMESTAMP}.sql.gz"

    mkdir -p ${BACKUP_DIR}

    PGPASSWORD=${DB_PASS} pg_dump \
        -h ${DB_HOST} \
        -U ${DB_USER} \
        -d ${DB_NAME} \
        --no-owner \
        --no-privileges \
        --clean \
        --if-exists \
        --compress=9 \
        | gzip > ${BACKUP_FILE}

    log "Database backup completed: ${BACKUP_FILE}"
}

# Backup Redis
backup_redis() {
    log "Starting Redis backup..."

    REDIS_HOST=$(kubectl get secret nexus-redis-secret -n ${ENVIRONMENT} -o jsonpath='{.data.host}' | base64 -d)
    REDIS_PASS=$(kubectl get secret nexus-redis-secret -n ${ENVIRONMENT} -o jsonpath='{.data.password}' | base64 -d)

    REDIS_BACKUP_FILE="${BACKUP_DIR}/redis_${TIMESTAMP}.rdb"

    # Trigger Redis BGSAVE
    redis-cli -h ${REDIS_HOST} -a ${REDIS_PASS} BGSAVE

    # Wait for save to complete
    while [ "$(redis-cli -h ${REDIS_HOST} -a ${REDIS_PASS} INFO persistence | grep rdb_bgsave_in_progress | cut -d: -f2)" != "0" ]; do
        sleep 1
    done

    # Copy RDB file (assuming mounted volume)
    kubectl cp ${ENVIRONMENT}/nexus-redis-0:/data/dump.rdb ${REDIS_BACKUP_FILE}

    log "Redis backup completed: ${REDIS_BACKUP_FILE}"
}

# Backup configurations and workflows
backup_config() {
    log "Starting configuration backup..."

    CONFIG_BACKUP_FILE="${BACKUP_DIR}/config_${TIMESTAMP}.tar.gz"

    # Backup n8n data directory
    kubectl exec -n ${ENVIRONMENT} deployment/nexus-n8n -- tar czf - /home/node/.n8n > ${CONFIG_BACKUP_FILE}

    log "Configuration backup completed: ${CONFIG_BACKUP_FILE}"
}

# Upload to S3
upload_to_s3() {
    log "Uploading backups to S3..."

    aws s3 cp ${BACKUP_DIR}/ s3://${S3_BUCKET}/${TIMESTAMP}/ --recursive --exclude "*" --include "*.sql.gz" --include "*.rdb" --include "*.tar.gz"

    log "Upload completed"
}

# Cleanup old backups
cleanup_old_backups() {
    log "Cleaning up old backups..."

    # Keep only last 7 days of backups
    find ${BACKUP_DIR} -name "*.sql.gz" -o -name "*.rdb" -o -name "*.tar.gz" -mtime +7 -delete

    # Clean S3 (keep last 30 days)
    aws s3api list-objects-v2 --bucket ${S3_BUCKET} --query 'Contents[?LastModified<`'"$(date -d '30 days ago' +%s)"'`].Key' --output text | xargs -I {} aws s3 rm s3://${S3_BUCKET}/{}

    log "Cleanup completed"
}

# Restore database
restore_database() {
    log "Starting database restore..."

    # Find latest backup
    LATEST_BACKUP=$(aws s3api list-objects-v2 --bucket ${S3_BUCKET} --prefix "${TIMESTAMP}/" --query 'Contents[?contains(Key, `db_`)].Key' --output text | sort | tail -1)

    if [ -z "${LATEST_BACKUP}" ]; then
        error "No database backup found"
        exit 1
    fi

    # Download and restore
    aws s3 cp s3://${S3_BUCKET}/${LATEST_BACKUP} ${BACKUP_DIR}/restore.sql.gz
    gunzip ${BACKUP_DIR}/restore.sql.gz

    DB_HOST=$(kubectl get secret nexus-db-secret -n ${ENVIRONMENT} -o jsonpath='{.data.host}' | base64 -d)
    DB_USER=$(kubectl get secret nexus-db-secret -n ${ENVIRONMENT} -o jsonpath='{.data.username}' | base64 -d)
    DB_PASS=$(kubectl get secret nexus-db-secret -n ${ENVIRONMENT} -o jsonpath='{.data.password}' | base64 -d)
    DB_NAME=$(kubectl get secret nexus-db-secret -n ${ENVIRONMENT} -o jsonpath='{.data.database}' | base64 -d)

    PGPASSWORD=${DB_PASS} psql -h ${DB_HOST} -U ${DB_USER} -d ${DB_NAME} -f ${BACKUP_DIR}/restore.sql

    log "Database restore completed"
}

# Restore Redis
restore_redis() {
    log "Starting Redis restore..."

    LATEST_BACKUP=$(aws s3api list-objects-v2 --bucket ${S3_BUCKET} --prefix "${TIMESTAMP}/" --query 'Contents[?contains(Key, `redis_`)].Key' --output text | sort | tail -1)

    if [ -z "${LATEST_BACKUP}" ]; then
        error "No Redis backup found"
        exit 1
    fi

    aws s3 cp s3://${S3_BUCKET}/${LATEST_BACKUP} ${BACKUP_DIR}/restore.rdb

    # Copy to Redis pod
    kubectl cp ${BACKUP_DIR}/restore.rdb ${ENVIRONMENT}/nexus-redis-0:/data/dump.rdb

    # Restart Redis
    kubectl rollout restart statefulset nexus-redis -n ${ENVIRONMENT}

    log "Redis restore completed"
}

# Main functions
backup() {
    log "Starting NEXUS n8n backup for ${ENVIRONMENT}"

    check_prerequisites
    backup_database
    backup_redis
    backup_config
    upload_to_s3
    cleanup_old_backups

    log "Backup completed successfully"
}

restore() {
    warn "Starting NEXUS n8n restore for ${ENVIRONMENT} - This will overwrite existing data!"

    read -p "Are you sure you want to continue? (yes/no): " confirm
    if [ "${confirm}" != "yes" ]; then
        log "Restore cancelled"
        exit 0
    fi

    check_prerequisites
    restore_database
    restore_redis

    # Restart application
    kubectl rollout restart deployment nexus-n8n -n ${ENVIRONMENT}

    log "Restore completed successfully"
}

# Main script
case "${1:-}" in
    backup)
        backup
        ;;
    restore)
        restore
        ;;
    *)
        echo "Usage: $0 {backup|restore} [environment]"
        echo "Environment defaults to 'production'"
        exit 1
        ;;
esac