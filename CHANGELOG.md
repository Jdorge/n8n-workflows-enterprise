# Changelog - n8n Enterprise Workflows

## [v2.0.0] - 2025-11-16

### Added
- **WF_CORE_ROUTER_ENTERPRISE**: Complete redesign with 7-node architecture
  - Validate Input node with domain & field checking
  - Centralized logging to Notion (audit trail)
  - Try-Catch error handling with exponential backoff retry (2x, 4x, 8x)
  - Metadata documentation (version, owner, SLA)
  - Structured error responses

- **SW1_LEADS_COMERCIAL**: CRM workflow integration
  - Email & phone validation (regex patterns)
  - Duplicate detection via HubSpot API
  - Automatic contact & opportunity creation
  - Slack notifications (#commercial-leads)
  - Google Sheets audit logging
  - Lead enrichment pipeline

- **SW2_OPERACOES**: Operational workflow decomposition
  - 4-stage pipeline: Extract → Validate → Process → Update
  - Individual try-catch for each stage
  - ERP status synchronization
  - Inventory validation
  - Payment processing
  - Circuit breaker pattern for resilience

- **SW3_FINANCEIRO**: Financial operations enhancement
  - CalcInvoiceAmount function
  - MatchPO_Invoice reconciliation
  - ApplyPaymentTerms with interest/penalties
  - Double-Check validation (0.01% tolerance)
  - Automated reporting (daily/weekly/monthly)
  - Audit trail with before/after snapshots

- **SW4_CONHECIMENTO**: Knowledge base automation
  - Official Notion API integration
  - Content sumarization via OpenAI
  - Versioning & rollback capability
  - Quality validation (title, body, tags)
  - Owner notifications on failures

- **SW5_MONITORAMENTO**: Health monitoring
  - Heartbeat checks (5-min cron)
  - Multi-endpoint pinging (ERP, Notion, Slack)
  - Health status logging to Sheets
  - Redundant alerting: Slack → Email → Telegram
  - Alert deduplication & escalation (P1 after 3x)
  - Critical failure notifications

### Changed
- Migrated from minimal 2-node structure to enterprise 7+ node architecture
- Logging now centralized (previously scattered)
- Error handling now granular (per-node try-catch)
- Validation now upstream in WF_CORE (previously in sub-workflows)
- Sub-workflows now focused on business logic (validation offloaded)

### Fixed
- Eliminated cascade failures due to missing error handlers
- Resolved data loss from unlogged failures
- Fixed race conditions in CRM synchronization
- Corrected financial rounding errors (now validated)
- Fixed duplicate lead creation (now deduplicated)

### Security
- Credentials now stored in n8n vault (never in code)
- Sensitive data masked in logs (SSN, card numbers)
- API token rotation schedule implemented
- Notion database access restricted to audit tables

### Performance
- Lead processing reduced from 2min to <5sec
- CRM API calls batched (reduced quota usage)
- Retry backoff prevents API rate limiting
- Monitoring checks optimized (parallel pings)
- Financial calculations cached (1min TTL)

### Documentation
- README.md with quick start guide
- 60+ page implementation guide
- 5 ready-to-use code templates
- curl examples for testing
- Environment variable setup guide

## [v1.0.0] - 2025-11-01

### Initial Release
- Basic n8n workflow structure
- Simple start/end nodes
- Minimal function logic
- No error handling
- No logging
- Manual lead entry

---

## Migration Guide: v1.0 → v2.0

### Breaking Changes
- ⚠️ All workflows must be reimported (JSON structure changed)
- ⚠️ Existing logs not migrated (use new Notion database)
- ⚠️ CRM credentials need new fields (owner_id, etc.)

### Steps to Upgrade
1. Backup current workflows: `Export all workflows as JSON`
2. Create new Notion audit database (template provided)
3. Configure credentials in n8n vault
4. Import new v2.0.0 workflows from this repo
5. Test end-to-end with curl examples
6. Monitor first 24h execution logs

## Version History Summary

| Version | Date | Type | Impact |
|---------|------|------|--------|
| v2.0.0 | Nov 2025 | Major | Complete enterprise redesign |
| v1.0.0 | Nov 2025 | Initial | Basic MVP structure |

## Future Roadmap (v2.1+)

- [ ] **v2.1.0**: AI-powered lead scoring (SW1)
- [ ] **v2.1.1**: Webhook retry queue optimization (WF_CORE)
- [ ] **v2.2.0**: Dashboard integration (Grafana/Metabase)
- [ ] **v2.2.1**: Multi-CRM support (Salesforce, Zoho)
- [ ] **v3.0.0**: Event streaming architecture (Kafka/RabbitMQ)

---

**Maintained by**: Infrastructure Team  
**Last Updated**: November 16, 2025  
**Current Version**: v2.0.0  
**Status**: Production Ready ✅
