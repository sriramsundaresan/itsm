# Cloud Service Management - Label Setup Script (PowerShell)
#
# Creates the 13 standardized labels defined in the Service Management Specification.
#
# Prerequisites:
#   - GitHub CLI installed: https://cli.github.com/
#   - Authenticated: gh auth login
#
# Usage:
#   .\scripts\setup_labels.ps1
#   .\scripts\setup_labels.ps1 -Repo "OWNER/cloud-ops-backlog"

param(
    [string]$Repo = ""
)

if (-not $Repo) {
    $Repo = gh repo view --json nameWithOwner -q .nameWithOwner
}

Write-Host "Setting up Cloud Service Management labels for: $Repo" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan

$labels = @(
    # Request Type Labels (5)
    @{ name="environment";          desc="Environment provisioning request";              color="0e8a16" },
    @{ name="iam";                  desc="Identity & access request (non-human)";         color="0075ca" },
    @{ name="network";              desc="Network & connectivity request";                color="1d76db" },
    @{ name="platform";             desc="Platform services request";                     color="5319e7" },
    @{ name="security-exception";   desc="Security exception request (time-bound)";       color="d73a4a" },

    # Environment Labels (3)
    @{ name="sandbox";              desc="Sandbox environment";                           color="c5def5" },
    @{ name="dev";                  desc="Development environment";                       color="bfd4f2" },
    @{ name="uat";                  desc="User acceptance testing environment";           color="d4c5f9" },

    # Risk / Data Classification Labels (3)
    @{ name="public";               desc="Public data classification";                    color="0e8a16" },
    @{ name="confidential";         desc="Confidential data classification";              color="fbca04" },
    @{ name="restricted";           desc="Restricted data classification";                color="b60205" },

    # Cost Label (1)
    @{ name="high-cost";            desc="High cost resource - requires cost review";     color="d93f0b" },

    # Lifecycle Label (1)
    @{ name="decommission";         desc="Marked for decommission";                       color="6e5494" }
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
