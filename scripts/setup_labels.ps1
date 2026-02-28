# ITSM Labels Setup Script (PowerShell)
#
# Run this script to create all required labels in your ITSM GitHub repository.
#
# Prerequisites:
#   - GitHub CLI installed: https://cli.github.com/
#   - Authenticated: gh auth login
#
# Usage:
#   .\scripts\setup_labels.ps1
#   .\scripts\setup_labels.ps1 -Repo "OWNER/REPO"

param(
    [string]$Repo = ""
)

if (-not $Repo) {
    $Repo = gh repo view --json nameWithOwner -q .nameWithOwner
}

Write-Host "Setting up ITSM labels for: $Repo" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan

$labels = @(
    # Type Labels
    @{ name="incident";          desc="Service incident report";                    color="d73a4a" },
    @{ name="change-request";    desc="Infrastructure/app change request";          color="0075ca" },
    @{ name="service-request";   desc="New service or resource request";            color="a2eeef" },

    # Priority Labels
    @{ name="priority-critical"; desc="SLA: 1 hour";                                color="b60205" },
    @{ name="priority-high";     desc="SLA: 4 hours";                               color="d93f0b" },
    @{ name="priority-medium";   desc="SLA: 8 hours";                               color="fbca04" },
    @{ name="priority-low";      desc="SLA: 48 hours";                              color="0e8a16" },

    # Status Labels
    @{ name="triage";            desc="Needs triage";                               color="d876e3" },
    @{ name="triaged";           desc="Triaged and assigned";                       color="bfd4f2" },
    @{ name="routed";            desc="Routed to fulfillment team";                 color="c2e0c6" },
    @{ name="in-progress";       desc="Work in progress";                           color="1d76db" },
    @{ name="pending-review";    desc="Waiting for review/approval";                color="fbca04" },
    @{ name="approved";          desc="Change approved for implementation";         color="0e8a16" },
    @{ name="rejected";          desc="Change rejected";                            color="b60205" },

    # SLA Labels
    @{ name="sla-warning";       desc="75% of SLA time used";                      color="e4e669" },
    @{ name="sla-breached";      desc="SLA target exceeded";                        color="b60205" },

    # Change Type Labels
    @{ name="standard-change";   desc="Pre-approved standard change";               color="0e8a16" },
    @{ name="emergency-change";  desc="Emergency change for active incident";       color="d73a4a" },

    # Risk Labels
    @{ name="risk-low";          desc="Low risk change";                            color="0e8a16" },
    @{ name="risk-medium";       desc="Medium risk change";                         color="fbca04" },
    @{ name="risk-high";         desc="High risk change";                           color="b60205" },

    # Environment Labels
    @{ name="env-production";    desc="Production environment";                     color="b60205" },
    @{ name="env-staging";       desc="Staging environment";                        color="fbca04" },
    @{ name="env-development";   desc="Development environment";                    color="0e8a16" },

    # Category Labels
    @{ name="category-access";     desc="Access & permissions request";             color="c5def5" },
    @{ name="category-compute";    desc="Compute resource request";                 color="c5def5" },
    @{ name="category-database";   desc="Database service request";                 color="c5def5" },
    @{ name="category-networking"; desc="Networking service request";               color="c5def5" },
    @{ name="category-storage";    desc="Storage service request";                  color="c5def5" },
    @{ name="category-software";   desc="Software install request";                color="c5def5" },
    @{ name="category-m365";       desc="Microsoft 365 request";                   color="c5def5" },
    @{ name="category-devops";     desc="DevOps tooling request";                  color="c5def5" },
    @{ name="category-security";   desc="Security service request";                color="c5def5" },

    # Urgency Labels
    @{ name="urgency-critical";  desc="Needed today";                               color="b60205" },
    @{ name="urgency-high";      desc="Within 2 business days";                     color="d93f0b" },
    @{ name="urgency-medium";    desc="Within 1 week";                              color="fbca04" },
    @{ name="urgency-low";       desc="Within 2 weeks";                             color="0e8a16" },

    # Other
    @{ name="post-incident-review";  desc="Needs post-incident review";             color="5319e7" },
    @{ name="missing-rollback-plan"; desc="Change missing rollback plan";           color="e11d48" }
)

$success = 0
$failed = 0

foreach ($label in $labels) {
    try {
        gh label create $label.name --description $label.desc --color $label.color --repo $Repo --force 2>&1 | Out-Null
        Write-Host "  ✅ $($label.name)" -ForegroundColor Green
        $success++
    } catch {
        Write-Host "  ❌ $($label.name): $_" -ForegroundColor Red
        $failed++
    }
}

Write-Host ""
Write-Host "Done! $success labels created, $failed failed." -ForegroundColor Cyan
Write-Host "View labels: gh label list --repo $Repo" -ForegroundColor Gray
