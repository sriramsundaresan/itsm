#!/bin/bash
# Cloud Service Management - Label Setup Script
#
# Creates the 13 standardized labels defined in the Service Management Specification.
#
# Prerequisites:
#   - GitHub CLI installed: https://cli.github.com/
#   - Authenticated: gh auth login
#
# Usage:
#   cd <repo-directory>
#   ./scripts/setup_labels.sh
#   ./scripts/setup_labels.sh OWNER/cloud-ops-backlog

REPO="${1:-$(gh repo view --json nameWithOwner -q .nameWithOwner)}"

echo "Setting up Cloud Service Management labels for: $REPO"
echo "======================================================"

# --- Request Type Labels (5) ---
gh label create "environment"         --description "Environment provisioning request"          --color "0e8a16" --repo "$REPO" --force
gh label create "iam"                 --description "Identity & access request (non-human)"     --color "0075ca" --repo "$REPO" --force
gh label create "network"             --description "Network & connectivity request"             --color "1d76db" --repo "$REPO" --force
gh label create "platform"            --description "Platform services request"                  --color "5319e7" --repo "$REPO" --force
gh label create "security-exception"  --description "Security exception request (time-bound)"    --color "d73a4a" --repo "$REPO" --force

# --- Environment Labels (3) ---
gh label create "sandbox"             --description "Sandbox environment"                         --color "c5def5" --repo "$REPO" --force
gh label create "dev"                 --description "Development environment"                     --color "bfd4f2" --repo "$REPO" --force
gh label create "uat"                 --description "User acceptance testing environment"         --color "d4c5f9" --repo "$REPO" --force

# --- Risk / Data Classification Labels (3) ---
gh label create "public"              --description "Public data classification"                  --color "0e8a16" --repo "$REPO" --force
gh label create "confidential"        --description "Confidential data classification"            --color "fbca04" --repo "$REPO" --force
gh label create "restricted"          --description "Restricted data classification"              --color "b60205" --repo "$REPO" --force

# --- Cost Label (1) ---
gh label create "high-cost"           --description "High cost resource - requires cost review"  --color "d93f0b" --repo "$REPO" --force

# --- Lifecycle Label (1) ---
gh label create "decommission"        --description "Marked for decommission"                    --color "6e5494" --repo "$REPO" --force

echo ""
echo "✅ All Cloud Service Management labels created!"
echo "View labels: gh label list --repo $REPO"
