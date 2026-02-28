# ITSM Labels Setup Script
#
# Run this script with GitHub CLI (gh) to create all required labels
# in your ITSM repository.
#
# Prerequisites:
#   - GitHub CLI installed: https://cli.github.com/
#   - Authenticated: gh auth login
#
# Usage:
#   cd <repo-directory>
#   ./scripts/setup_labels.sh
#
# Or run from anywhere:
#   gh label create "incident" --description "Service incident report" --color "d73a4a" --repo OWNER/REPO

REPO="${1:-$(gh repo view --json nameWithOwner -q .nameWithOwner)}"

echo "Setting up ITSM labels for: $REPO"
echo "================================="

# --- Type Labels ---
gh label create "incident"          --description "Service incident report"           --color "d73a4a" --repo "$REPO" --force
gh label create "change-request"    --description "Infrastructure/app change request" --color "0075ca" --repo "$REPO" --force
gh label create "service-request"   --description "New service or resource request"   --color "a2eeef" --repo "$REPO" --force

# --- Priority Labels ---
gh label create "priority-critical" --description "SLA: 1 hour"                       --color "b60205" --repo "$REPO" --force
gh label create "priority-high"     --description "SLA: 4 hours"                      --color "d93f0b" --repo "$REPO" --force
gh label create "priority-medium"   --description "SLA: 8 hours"                      --color "fbca04" --repo "$REPO" --force
gh label create "priority-low"      --description "SLA: 48 hours"                     --color "0e8a16" --repo "$REPO" --force

# --- Status Labels ---
gh label create "triage"            --description "Needs triage"                      --color "d876e3" --repo "$REPO" --force
gh label create "triaged"           --description "Triaged and assigned"              --color "bfd4f2" --repo "$REPO" --force
gh label create "routed"            --description "Routed to fulfillment team"        --color "c2e0c6" --repo "$REPO" --force
gh label create "in-progress"       --description "Work in progress"                  --color "1d76db" --repo "$REPO" --force
gh label create "pending-review"    --description "Waiting for review/approval"       --color "fbca04" --repo "$REPO" --force
gh label create "approved"          --description "Change approved for implementation"--color "0e8a16" --repo "$REPO" --force
gh label create "rejected"          --description "Change rejected"                   --color "b60205" --repo "$REPO" --force

# --- SLA Labels ---
gh label create "sla-warning"       --description "75% of SLA time used"              --color "e4e669" --repo "$REPO" --force
gh label create "sla-breached"      --description "SLA target exceeded"               --color "b60205" --repo "$REPO" --force

# --- Change Type Labels ---
gh label create "standard-change"   --description "Pre-approved standard change"      --color "0e8a16" --repo "$REPO" --force
gh label create "emergency-change"  --description "Emergency change for active incident" --color "d73a4a" --repo "$REPO" --force

# --- Risk Labels ---
gh label create "risk-low"          --description "Low risk change"                   --color "0e8a16" --repo "$REPO" --force
gh label create "risk-medium"       --description "Medium risk change"                --color "fbca04" --repo "$REPO" --force
gh label create "risk-high"         --description "High risk change"                  --color "b60205" --repo "$REPO" --force

# --- Environment Labels ---
gh label create "env-production"    --description "Production environment"             --color "b60205" --repo "$REPO" --force
gh label create "env-staging"       --description "Staging environment"                --color "fbca04" --repo "$REPO" --force
gh label create "env-development"   --description "Development environment"            --color "0e8a16" --repo "$REPO" --force

# --- Category Labels (Service Requests) ---
gh label create "category-access"      --description "Access & permissions request"   --color "c5def5" --repo "$REPO" --force
gh label create "category-compute"     --description "Compute resource request"       --color "c5def5" --repo "$REPO" --force
gh label create "category-database"    --description "Database service request"       --color "c5def5" --repo "$REPO" --force
gh label create "category-networking"  --description "Networking service request"     --color "c5def5" --repo "$REPO" --force
gh label create "category-storage"     --description "Storage service request"        --color "c5def5" --repo "$REPO" --force
gh label create "category-software"    --description "Software install request"       --color "c5def5" --repo "$REPO" --force
gh label create "category-m365"        --description "Microsoft 365 request"          --color "c5def5" --repo "$REPO" --force
gh label create "category-devops"      --description "DevOps tooling request"         --color "c5def5" --repo "$REPO" --force
gh label create "category-security"    --description "Security service request"       --color "c5def5" --repo "$REPO" --force

# --- Urgency Labels ---
gh label create "urgency-critical"  --description "Needed today"                      --color "b60205" --repo "$REPO" --force
gh label create "urgency-high"      --description "Within 2 business days"            --color "d93f0b" --repo "$REPO" --force
gh label create "urgency-medium"    --description "Within 1 week"                     --color "fbca04" --repo "$REPO" --force
gh label create "urgency-low"       --description "Within 2 weeks"                    --color "0e8a16" --repo "$REPO" --force

# --- Other Labels ---
gh label create "post-incident-review" --description "Needs post-incident review"     --color "5319e7" --repo "$REPO" --force
gh label create "missing-rollback-plan" --description "Change missing rollback plan"  --color "e11d48" --repo "$REPO" --force

echo ""
echo "✅ All ITSM labels created successfully!"
echo "View labels: gh label list --repo $REPO"
