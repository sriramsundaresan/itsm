# Change Management Runbook

## Change Types

| Type | Risk | Approval | Examples |
|------|------|----------|----------|
| **Standard** | Low, pre-approved | Auto-approved ✅ | OS patching, scaling up/down, adding monitoring |
| **Normal** | Medium, needs review | Team lead + architect | New deployments, config changes, network changes |
| **Emergency** | Active incident fix | Emergency approver | Hotfix for production outage |

## Change Process Flow

```
1. Requester creates Change Request (GitHub Issue)
       ↓
2. GitHub Actions auto-classifies (Standard / Normal / Emergency)
       ↓
   ┌─────────────────────┬──────────────────────┬─────────────────────┐
   │ STANDARD            │ NORMAL               │ EMERGENCY           │
   │                     │                      │                     │
   │ Auto-approved ✅    │ Review required       │ Expedited review    │
   │ Implement during    │ @change-approvers     │ @emergency-approvers│
   │ maintenance window  │ review within 2 days  │ review within 1 hr  │
   └──────────┬──────────┴──────────┬───────────┴──────────┬──────────┘
              ↓                     ↓                      ↓
3. Implementation (update issue with progress)
       ↓
4. Verification (confirm change works, no side effects)
       ↓
5. Close issue (add result: successful / rolled back / partial)
```

## Pre-Change Checklist

Before submitting a change request, ensure:

- [ ] Tested in non-production environment
- [ ] Rollback plan documented and tested
- [ ] Affected stakeholders notified
- [ ] Backup taken of affected resources
- [ ] Monitoring/alerting configured for the change
- [ ] Scheduled during approved maintenance window (if applicable)

## Maintenance Windows

| Window | Day | Time (UTC) | Scope |
|--------|-----|------------|-------|
| Weekly Standard | Tuesday | 22:00 - 02:00 | Non-critical systems |
| Weekly Standard | Thursday | 22:00 - 02:00 | Non-critical systems |
| Monthly Production | Last Saturday | 22:00 - 06:00 | All production systems |
| Emergency | Any time | Any time | Critical incident remediation only |

## Rollback Procedures

### Azure Resource Rollback

| Resource | Rollback Method |
|----------|----------------|
| App Service | Swap deployment slots back |
| Azure SQL | Point-in-time restore |
| Virtual Machine | Restore from Azure Backup |
| AKS Deployment | `kubectl rollout undo deployment/<name>` |
| Infrastructure (IaC) | Re-apply previous Terraform/Bicep state |
| DNS Changes | Revert record in Azure DNS |
| NSG Rules | Remove added rule / re-add removed rule |

## Post-Change Review

After every **Normal** and **Emergency** change:

1. Verify all services are healthy
2. Check monitoring dashboards for anomalies
3. Confirm rollback plan was not needed (or document if used)
4. Update the change issue with the outcome
5. For failed changes: document lessons learned
