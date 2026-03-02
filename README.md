# SDLC Cloud Service Management

> Lightweight, automation-first execution layer for managing **approved cloud workloads** during SDLC phases (Sandbox, Dev, UAT).
>
> Uses GitHub Issues as a single operational backlog. Built on the [Service Management Specification](AdditionInformation.MD).

**⚠️ Cloud Frontdoor Guardrail:** This portal is only applicable **after** a workload has received a positive Cloud Frontdoor outcome. It does not replace or bypass Cloud Frontdoor.

---

## Quick Start

### 1. Create the Repository

```bash
gh repo create YOUR_ORG/cloud-ops-backlog --private --description "SDLC Cloud Service Management"
```

### 2. Push This Code

```bash
git init
git remote add origin https://github.com/YOUR_ORG/cloud-ops-backlog.git
git add .
git commit -m "Initial Cloud Service Management setup"
git push -u origin main
```

### 3. Setup Labels

Creates the 13 standardized labels defined in the spec:

```powershell
# Windows
.\scripts\setup_labels.ps1

# Linux/Mac
bash scripts/setup_labels.sh
```

### 4. Enable GitHub Pages

1. Go to **Settings → Pages**
2. Set source to **Deploy from a branch**
3. Select branch `main`, folder `/docs`
4. Portal is live at `https://YOUR_ORG.github.io/cloud-ops-backlog/`

### 5. Configure the Portal

1. Open the portal URL
2. Click the ⚙️ Settings gear
3. Enter your repository (`YOUR_ORG/cloud-ops-backlog`), GitHub token, and username
4. Select your role: **User** or **Cloud Ops (Admin)**

---

## Request Types

| Type | Prefix | Description |
|---|---|---|
| 🏗️ Environment Provisioning | `ENV` | SDLC environment execution (Sandbox / Dev / UAT) |
| 🔑 Identity & Access | `IAM` | Non-human identity enablement (Managed Identity / Service Principal) |
| 🌐 Network & Connectivity | `NET` | Private endpoints, firewall rules, API exposure |
| ⚙️ Platform Services | `PLAT` | Database, Storage, Queue, Cache, AI/ML provisioning |
| 🛡️ Security Exception | `SEC-EX` | Temporary policy deviation (time-bound, no permanent exceptions) |

---

## Label Taxonomy (13 Labels)

| Category | Labels |
|---|---|
| **Request Type** | `environment`, `iam`, `network`, `platform`, `security-exception` |
| **Environment** | `sandbox`, `dev`, `uat` |
| **Data Classification** | `public`, `confidential`, `restricted` |
| **Cost** | `high-cost` |
| **Lifecycle** | `decommission` |

Labels are applied automatically when a request is submitted.

---

## Operational Flow

```
User submits request via portal form
        ↓
Portal creates GitHub Issue:
  • Auto-generates title (ENV|App|Region, IAM|App, etc.)
  • Builds structured Markdown body
  • Applies type + environment + classification labels
        ↓
Cloud Ops triages backlog
        ↓
IaC PR raised → pipelines enforce governance
        ↓
Deployment executed
        ↓
Full audit trail via Issue + PR history
```

---

## File Structure

```
├── docs/                           ← GitHub Pages portal
│   ├── index.html                  ← Dashboard with stats & quick actions
│   ├── new-ticket.html             ← 5 request type forms
│   ├── tickets.html                ← Request list with filters
│   ├── ticket.html                 ← Request detail view
│   ├── catalog.html                ← Service catalog
│   ├── css/
│   │   └── style.css               ← Portal theme
│   └── js/
│       └── github-api.js           ← API layer & utilities
│
├── scripts/
│   ├── setup_labels.ps1            ← Label setup (Windows)
│   └── setup_labels.sh             ← Label setup (Linux/Mac)
│
├── AdditionInformation.MD          ← Service Management Specification
└── README.md                       ← This file
```

## Scope

### In Scope

- SDLC cloud execution requests (Sandbox, Dev, UAT)
- Non-human IAM at workload level
- Network connectivity enablement
- Standard platform services provisioning
- Time-bound security exceptions (execution only)

### Explicitly Out of Scope

- Cloud suitability decisions (Cloud Frontdoor)
- Production environment provisioning
- User IAM and break-glass access
- Incident and change management
- Regulatory risk acceptance decisions

---

## Roles

| Role | Access |
|---|---|
| **👤 User** | Submit requests, track own requests, add comments |
| **🛡️ Cloud Ops (Admin)** | Full backlog access, close requests, mark for decommission, triage |

---

## Design Principles

1. **Cloud Frontdoor remains authoritative** for onboarding decisions
2. **Execution, not assessment** — no suitability or risk questionnaires
3. **No approval workflows** in the intake layer
4. **Automation first** — governance enforced via pipelines, not humans
5. **Single operational backlog** (GitHub Issues)
6. **Audit by design** — full traceability via Issues, PRs, and pipeline logs

---

## License

Internal use only.
