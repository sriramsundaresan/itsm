# ITSM Service Management on GitHub

> Cloud Service Management implementation using GitHub Issues, Projects, and Actions.
> Based on [Microsoft Cloud Service Management Best Practices](docs/runbooks/).

## Quick Start

### 1. Create the GitHub Repository

```bash
gh repo create YOUR_ORG/itsm-service-management --public --description "ITSM Service Management"
```

### 2. Push This Code

```bash
cd "RL - Agent"
git init
git remote add origin https://github.com/YOUR_ORG/itsm-service-management.git
git add .
git commit -m "Initial ITSM setup"
git push -u origin main
```

### 3. Setup Labels

```powershell
# Windows
.\scripts\setup_labels.ps1

# Linux/Mac
bash scripts/setup_labels.sh
```

### 4. Create the GitHub Project Board

1. Go to **GitHub repo → Projects → New Project**
2. Choose **Board** view
3. Add columns: `🆕 New` → `🔍 Triaged` → `🔧 In Progress` → `✅ Resolved`
4. Set auto-filters:
   - **New**: `is:issue is:open -label:triaged -label:in-progress`
   - **Triaged**: `is:issue is:open label:triaged -label:in-progress`
   - **In Progress**: `is:issue is:open label:in-progress`
   - **Resolved**: `is:issue is:closed`

### 5. Configure Teams (CODEOWNERS)

Create `.github/CODEOWNERS` to auto-assign reviewers for change requests:

```
# Change requests need architect approval
.github/ISSUE_TEMPLATE/change_request.yml @change-approvers @senior-architects
```

### 6. Done! Create Your First Ticket

Go to **Issues → New Issue** and choose a template:
- 🔴 **Report an Incident** — service disruption
- 🔄 **Request a Change** — infrastructure/config change
- 📋 **Request a Service** — new resource or access

---

## How It Works

### Incident Flow

```
User creates incident issue
        ↓
GitHub Actions auto-triages:
  • Parses severity from form
  • Applies priority label (critical/high/medium/low)
  • Assigns to team based on affected service
  • Posts SLA timer
        ↓
SLA Monitor (runs every hour):
  • Checks all open incidents
  • Adds ⚠️ sla-warning at 75% time
  • Adds 🚨 sla-breached if overdue
  • Escalates to incident managers
        ↓
Team resolves → closes issue
```

### Change Management Flow

```
User creates change request issue
        ↓
GitHub Actions auto-classifies:
  • Standard → auto-approved ✅
  • Normal → routes to @change-approvers
  • Emergency → routes to @emergency-approvers
        ↓
Checks pre-change checklist:
  • Rollback plan present?
  • Testing done?
  • All boxes checked?
        ↓
Reviewers approve/reject via labels
        ↓
Implement → verify → close
```

### Service Request Flow

```
User creates service request issue
        ↓
GitHub Actions auto-routes:
  • Parses category (compute, database, networking, etc.)
  • Assigns to correct team
  • Generates ticket ID (SR-###)
  • Sets estimated completion date
        ↓
Manager approval (if critical/security)
        ↓
Team fulfills → closes issue
```

---

## File Structure

```
├── .github/
│   ├── ISSUE_TEMPLATE/
│   │   ├── config.yml              ← Template chooser config
│   │   ├── incident.yml            ← 🔴 Incident report form
│   │   ├── change_request.yml      ← 🔄 Change request form
│   │   └── service_request.yml     ← 📋 Service request form
│   │
│   └── workflows/
│       ├── incident_triage.yml     ← Auto-triage incidents
│       ├── change_approval.yml     ← Change approval workflow
│       ├── service_fulfillment.yml ← Service request routing
│       └── sla_monitor.yml         ← Hourly SLA breach check
│
├── docs/
│   ├── service_catalog.md          ← Available services list
│   └── runbooks/
│       ├── incident_management.md  ← Incident handling procedures
│       └── change_management.md    ← Change process & rollback
│
├── scripts/
│   ├── setup_labels.sh             ← Label setup (Linux/Mac)
│   └── setup_labels.ps1            ← Label setup (Windows)
│
└── README.md                       ← This file
```

## ITSM Processes Covered

Based on [Microsoft Cloud Service Management Best Practices](Cloud%20Service%20Management/):

| ITSM Process | Implementation | Status |
|---|---|---|
| **Service Desk** | Issue templates + auto-triage | ✅ Implemented |
| **Incident Management** | Incident form + SLA tracking | ✅ Implemented |
| **Change Management** | Change request + approval workflow | ✅ Implemented |
| **Service Request Fulfillment** | Service catalog + auto-routing | ✅ Implemented |
| **SLA Management** | Hourly SLA monitor + escalation | ✅ Implemented |
| **Knowledge Management** | Runbooks in docs/ folder | ✅ Implemented |
| **Asset & Configuration Mgmt** | Future: integrate with Azure Resource Graph | 🔜 Planned |
| **Financial Management (FinOps)** | Future: cost center tracking + Azure Cost Mgmt | 🔜 Planned |
| **Continuity Management** | Future: DR runbooks + Azure Site Recovery | 🔜 Planned |
| **Policy & Compliance** | Future: Azure Policy integration | 🔜 Planned |

## Key Principles Applied

From the Microsoft Cloud Service Management document:

1. **"Manual efforts are bugs"** → GitHub Actions automates triage, routing, SLA tracking
2. **"Self-service and automation"** → Users self-serve via issue templates (structured forms)
3. **"Service monitoring over fault monitoring"** → SLA monitor tracks end-to-end service health
4. **"Manage end-to-end services"** → Service catalog defines all available services

## Customization

### Add a New Service to the Catalog

1. Edit [docs/service_catalog.md](docs/service_catalog.md)
2. Add the service to the dropdown in [.github/ISSUE_TEMPLATE/service_request.yml](.github/ISSUE_TEMPLATE/service_request.yml)

### Add a New Team

1. Create a GitHub Team in your org
2. Update the routing logic in [.github/workflows/service_fulfillment.yml](.github/workflows/service_fulfillment.yml)
3. Update the routing logic in [.github/workflows/incident_triage.yml](.github/workflows/incident_triage.yml)

### Change SLA Targets

Edit the `slaMap` object in [.github/workflows/sla_monitor.yml](.github/workflows/sla_monitor.yml):

```javascript
const slaMap = {
  'priority-critical': 1,    // hours
  'priority-high': 4,
  'priority-medium': 8,
  'priority-low': 48
};
```

---

## License

Internal use only. Based on Microsoft Cloud Service Management Best Practice Recommendations.
