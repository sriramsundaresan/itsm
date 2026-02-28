# Incident Management Runbook

## Quick Reference

| Severity | Response Time | Resolution Target | Escalation |
|----------|--------------|-------------------|------------|
| 🔴 Critical | 15 min | 1 hour | Immediate to incident manager |
| 🟠 High | 30 min | 4 hours | After 2 hours to team lead |
| 🟡 Medium | 2 hours | 8 hours | After 4 hours to team lead |
| 🟢 Low | 4 hours | 48 hours | After 24 hours |

## Common Incidents & First Steps

### Email / Exchange Online Issues

**Symptoms**: Users can't send/receive email, Outlook not connecting

| Step | Action | Expected Outcome |
|------|--------|------------------|
| 1 | Check [Microsoft 365 Service Health](https://admin.microsoft.com/Adminportal/Home#/servicehealth) | Confirm if Microsoft-side outage |
| 2 | Check user's license in Azure AD | Ensure Exchange Online license assigned |
| 3 | Test with OWA (outlook.office.com) | Isolate client vs server issue |
| 4 | Check mail flow rules in Exchange Admin | No blocking rules |
| 5 | Check DNS MX records | Pointing to correct Exchange Online |

### VPN / Remote Access Issues

**Symptoms**: Users can't connect via VPN, connection drops

| Step | Action |
|------|--------|
| 1 | Check Azure VPN Gateway health in Azure Portal |
| 2 | Verify user's VPN client certificate is valid |
| 3 | Check NSG rules on the gateway subnet |
| 4 | Verify on-prem VPN device status (if site-to-site) |
| 5 | Check Azure VPN diagnostic logs |

### Azure VM Unresponsive

**Symptoms**: VM not reachable, RDP/SSH timeout

| Step | Action |
|------|--------|
| 1 | Check VM status in Azure Portal (Running/Stopped/Deallocated) |
| 2 | Check Boot Diagnostics screenshot |
| 3 | Review VM serial console for OS-level errors |
| 4 | Check NSG rules — is inbound traffic allowed? |
| 5 | Try restart from Azure Portal (not inside OS) |
| 6 | Check disk space and CPU metrics in Azure Monitor |

### Azure SQL Database Issues

**Symptoms**: Application can't connect, queries timing out

| Step | Action |
|------|--------|
| 1 | Check Azure SQL server firewall rules |
| 2 | Verify connection string in application config |
| 3 | Check DTU/vCore usage in Azure Monitor — is it maxed out? |
| 4 | Review Query Performance Insight for expensive queries |
| 5 | Check if database is paused (serverless tier) |

### Identity / Azure AD Issues

**Symptoms**: Users can't login, MFA not working, accounts locked

| Step | Action |
|------|--------|
| 1 | Check user status in Azure AD — Enabled? License? |
| 2 | Check Azure AD Sign-in logs for error codes |
| 3 | Verify Conditional Access policies are not blocking |
| 4 | Check MFA registration status |
| 5 | Reset password / unlock account if needed |

## Escalation Path

```
L1 (Service Desk)     → Self-service + known fixes from this runbook
    ↓ (30 min)
L2 (Engineering Team) → Deep troubleshooting, Azure Portal access
    ↓ (2 hours)
L3 (Architect / SME)  → Complex issues, design-level decisions
    ↓ (if Microsoft issue)
Microsoft Support     → Azure support ticket via Azure Portal
```

## Post-Incident Review

For **Critical** and **High** incidents, create a post-incident review:

1. Add the `post-incident-review` label to the closed incident
2. Document in the issue comments:
   - **Timeline**: When detected → triaged → resolved
   - **Root cause**: What actually broke
   - **Resolution**: What fixed it
   - **Prevention**: What to do to prevent recurrence
3. Update this runbook if a new pattern was discovered
