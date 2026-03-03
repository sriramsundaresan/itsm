/* ============================================
   Cloud Service Management - GitHub API Layer
   SDLC Execution Model (Sandbox / Dev / UAT)
   ============================================ */

// SECURITY NOTE: This client-side app stores a GitHub PAT in the browser.
// For production, implement a backend middleware/proxy that:
//   1. Holds the token server-side
//   2. Validates JSON schemas per request type
//   3. Targets the fixed cloud-ops-backlog repo
//   4. Enforces role-based access control
// See: https://docs.github.com/en/apps/oauth-apps

// ARCHITECTURAL NOTE: Per the Service Management Specification, the target
// architecture uses webhook-based intake (forms → JSON webhook → middleware → GitHub).
// This client-side implementation is a transitional step.

const CloudOps = {

  // ---- Security Utilities ----
  _obfuscate(str) {
    if (!str) return '';
    return btoa(str.split('').map((c, i) => String.fromCharCode(c.charCodeAt(0) ^ (0x42 + (i % 13)))).join(''));
  },
  _deobfuscate(str) {
    if (!str) return '';
    try {
      const decoded = atob(str);
      return decoded.split('').map((c, i) => String.fromCharCode(c.charCodeAt(0) ^ (0x42 + (i % 13)))).join('');
    } catch (e) {
      return str;
    }
  },

  escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  _rateLimits: {},
  _checkRateLimit(action, maxPerMinute = 30) {
    const now = Date.now();
    if (!this._rateLimits[action]) this._rateLimits[action] = [];
    this._rateLimits[action] = this._rateLimits[action].filter(t => now - t < 60000);
    if (this._rateLimits[action].length >= maxPerMinute) {
      throw new Error(`Rate limit exceeded for ${action}. Please wait before trying again.`);
    }
    this._rateLimits[action].push(now);
  },

  validateInput(value, fieldName, { maxLength = 2000, required = false } = {}) {
    if (required && (!value || !value.trim())) {
      throw new Error(`${fieldName} is required.`);
    }
    if (value && value.length > maxLength) {
      throw new Error(`${fieldName} exceeds maximum length of ${maxLength} characters.`);
    }
    return value ? value.trim() : value;
  },

  // ---- Configuration ----
  config: {
    get repo() { return localStorage.getItem('cloudops_repo') || ''; },
    set repo(v) { localStorage.setItem('cloudops_repo', v); },
    get token() {
      const stored = localStorage.getItem('cloudops_token') || '';
      return CloudOps._deobfuscate(stored);
    },
    set token(v) {
      localStorage.setItem('cloudops_token', CloudOps._obfuscate(v));
    },
    get orgName() { return localStorage.getItem('cloudops_org') || 'Cloud Service Management'; },
    set orgName(v) { localStorage.setItem('cloudops_org', v); },
    get role() { return localStorage.getItem('cloudops_role') || 'user'; },
    set role(v) { localStorage.setItem('cloudops_role', v); },
    get username() { return localStorage.getItem('cloudops_username') || ''; },
    set username(v) { localStorage.setItem('cloudops_username', v); },
    get isConfigured() { return !!(this.repo && this.token); },
    get isAdmin() { return this.role === 'admin'; },
    get isUser() { return this.role === 'user'; }
  },

  // ---- Request Type Definitions ----
  REQUEST_TYPES: {
    environment:          { label: 'environment',         prefix: 'ENV',    name: 'Environment Provisioning', icon: '🏗️', badge: 'env' },
    iam:                  { label: 'iam',                  prefix: 'IAM',    name: 'Identity & Access',        icon: '🔑', badge: 'iam' },
    network:              { label: 'network',              prefix: 'NET',    name: 'Network & Connectivity',   icon: '🌐', badge: 'net' },
    platform:             { label: 'platform',             prefix: 'PLAT',   name: 'Platform Services',        icon: '⚙️',  badge: 'plat' },
    'security-exception': { label: 'security-exception',   prefix: 'SEC-EX', name: 'Security Exception',       icon: '🛡️', badge: 'secex' },
    subscription:         { label: 'subscription',         prefix: 'SUB',    name: 'New Subscription',         icon: '☁️', badge: 'sub' }
  },

  // ---- API Helpers ----
  async api(endpoint, options = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `https://api.github.com/repos/${this.config.repo}${endpoint}`;
    const res = await fetch(url, {
      ...options,
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `Bearer ${this.config.token}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `API Error ${res.status}`);
    }
    return res.status === 204 ? null : res.json();
  },

  // ---- Issues (Requests) ----
  async getRequests(filters = {}) {
    const params = new URLSearchParams({
      state: filters.state || 'open',
      per_page: '50',
      sort: 'created',
      direction: 'desc'
    });
    if (filters.labels) params.set('labels', filters.labels);
    const issues = await this.api(`/issues?${params}`);
    return issues.filter(i => !i.pull_request);
  },

  async getRequest(number) {
    return this.api(`/issues/${number}`);
  },

  async getRequestComments(number) {
    return this.api(`/issues/${number}/comments`);
  },

  async createRequest(title, body, labels = []) {
    this._checkRateLimit('createRequest', 10);
    this.validateInput(title, 'Title', { maxLength: 256, required: true });
    this.validateInput(body, 'Description', { maxLength: 65536, required: true });
    return this.api('/issues', {
      method: 'POST',
      body: JSON.stringify({ title, body, labels })
    });
  },

  async addComment(number, body) {
    this._checkRateLimit('addComment', 20);
    this.validateInput(body, 'Comment', { maxLength: 65536, required: true });
    return this.api(`/issues/${number}/comments`, {
      method: 'POST',
      body: JSON.stringify({ body })
    });
  },

  async closeRequest(number) {
    return this.api(`/issues/${number}`, {
      method: 'PATCH',
      body: JSON.stringify({ state: 'closed' })
    });
  },

  async addLabels(number, labels) {
    return this.api(`/issues/${number}/labels`, {
      method: 'POST',
      body: JSON.stringify({ labels })
    });
  },

  async removeLabel(number, label) {
    return this.api(`/issues/${number}/labels/${encodeURIComponent(label)}`, {
      method: 'DELETE'
    });
  },

  // Get requests filtered by role
  async getMyRequests(filters = {}) {
    const requests = await this.getRequests(filters);
    if (this.config.isUser && this.config.username) {
      return requests.filter(t =>
        t.user && t.user.login.toLowerCase() === this.config.username.toLowerCase()
      );
    }
    return requests;
  },

  // Get dashboard stats
  async getStats() {
    const [open, closed] = await Promise.all([
      this.api('/issues?state=open&per_page=100'),
      this.api('/issues?state=closed&per_page=100')
    ]);

    let openIssues = open.filter(i => !i.pull_request);
    let closedIssues = closed.filter(i => !i.pull_request);

    if (this.config.isUser && this.config.username) {
      const u = this.config.username.toLowerCase();
      openIssues = openIssues.filter(i => i.user && i.user.login.toLowerCase() === u);
      closedIssues = closedIssues.filter(i => i.user && i.user.login.toLowerCase() === u);
    }

    const hasLabel = (issue, label) => issue.labels.some(l => l.name === label);

    return {
      total: openIssues.length + closedIssues.length,
      open: openIssues.length,
      closed: closedIssues.length,
      environment: openIssues.filter(i => hasLabel(i, 'environment')).length,
      iam: openIssues.filter(i => hasLabel(i, 'iam')).length,
      network: openIssues.filter(i => hasLabel(i, 'network')).length,
      platform: openIssues.filter(i => hasLabel(i, 'platform')).length,
      securityException: openIssues.filter(i => hasLabel(i, 'security-exception')).length,
      subscription: openIssues.filter(i => hasLabel(i, 'subscription')).length,
      sandbox: openIssues.filter(i => hasLabel(i, 'sandbox')).length,
      dev: openIssues.filter(i => hasLabel(i, 'dev')).length,
      uat: openIssues.filter(i => hasLabel(i, 'uat')).length,
      highCost: openIssues.filter(i => hasLabel(i, 'high-cost')).length,
      restricted: openIssues.filter(i => hasLabel(i, 'restricted')).length,
      recentRequests: openIssues.slice(0, 10)
    };
  },

  // ---- Helpers ----
  getRequestType(issue) {
    for (const [key, def] of Object.entries(this.REQUEST_TYPES)) {
      if (issue.labels.some(l => l.name === def.label)) return key;
    }
    return 'other';
  },

  getRequestTypeDef(issue) {
    const type = this.getRequestType(issue);
    return this.REQUEST_TYPES[type] || { label: 'other', prefix: '???', name: 'Other', icon: '📋', badge: 'other' };
  },

  getEnvironment(issue) {
    const envLabels = ['sandbox', 'dev', 'uat'];
    const found = issue.labels.find(l => envLabels.includes(l.name));
    return found ? found.name : 'none';
  },

  getDataClassification(issue) {
    const classes = ['public', 'confidential', 'restricted'];
    const found = issue.labels.find(l => classes.includes(l.name));
    return found ? found.name : 'none';
  },

  formatDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  },

  timeAgo(dateStr) {
    const seconds = Math.floor((Date.now() - new Date(dateStr)) / 1000);
    const intervals = [
      { label: 'day', seconds: 86400 },
      { label: 'hour', seconds: 3600 },
      { label: 'minute', seconds: 60 }
    ];
    for (const i of intervals) {
      const count = Math.floor(seconds / i.seconds);
      if (count >= 1) return `${count} ${i.label}${count > 1 ? 's' : ''} ago`;
    }
    return 'just now';
  },

  // ---- Auto-Generate Issue Titles (per spec convention) ----
  generateTitle(type, data) {
    switch (type) {
      case 'environment':        return `ENV | ${data.applicationName} | ${data.region}`;
      case 'iam':                return `IAM | ${data.applicationName}`;
      case 'network':            return `NET | ${data.applicationName}`;
      case 'platform':           return `PLAT | ${data.applicationName}`;
      case 'security-exception': return `SEC-EX | ${data.applicationName}`;
      case 'subscription':       return `SUB | ${data.subscriptionName} | ${data.subscriptionPurpose}`;
      default:                   return data.applicationName || 'Untitled Request';
    }
  },

  // ---- Build Issue Bodies (Markdown) ----
  buildEnvBody(data) {
    return `## Environment Provisioning Request

**Application Name:** ${data.applicationName}
**Business Owner:** ${data.businessOwner}
**Technical Owner:** ${data.technicalOwner}
**Cost Center:** ${data.costCenter}
**Environment Type:** ${data.environmentType}
**Region:** ${data.region}
**Data Classification:** ${data.dataClassification}
**Criticality Tier:** ${data.criticalityTier}
**Internet Exposure:** ${data.internetExposure}
**RTO / RPO:** ${data.rtoRpo || 'Not specified'}
**Cloud Frontdoor Reference ID:** ${data.cfdReferenceId || 'N/A'}
**Expected Go-Live Date:** ${data.goLiveDate || 'TBD'}

### Notes
${data.notes || 'None'}

---
*Submitted via Cloud Service Management Portal*
*This request is only applicable after a positive Cloud Frontdoor outcome.*`;
  },

  buildIAMBody(data) {
    return `## Identity & Access Request (Non-Human)

**Application Name:** ${data.applicationName}
**Identity Type:** ${data.identityType}
**Scope:** ${data.scope}
**Role Requested:** ${data.roleRequested}
**Temporary Access:** ${data.temporaryAccess}
**Duration:** ${data.duration || 'N/A'}

### Business Justification
${data.businessJustification || 'Not specified'}

---
*Submitted via Cloud Service Management Portal*`;
  },

  buildNetBody(data) {
    return `## Network & Connectivity Request

**Application Name:** ${data.applicationName}
**Request Type:** ${data.requestType}
**Source:** ${data.source}
**Destination:** ${data.destination}
**Protocol / Port:** ${data.protocolPort}
**Public Exposure:** ${data.publicExposure}
**Third-Party Integration:** ${data.thirdPartyIntegration}

### Notes
${data.notes || 'None'}

---
*Submitted via Cloud Service Management Portal*`;
  },

  buildPlatBody(data) {
    return `## Platform Services Request

**Application Name:** ${data.applicationName}
**Service Type:** ${data.serviceType}
**SKU:** ${data.sku}
**Estimated Monthly Cost:** ${data.estimatedCost || 'TBD'}
**Backup Required:** ${data.backupRequired}
**Monitoring Required:** ${data.monitoringRequired}

### Notes
${data.notes || 'None'}

---
*Submitted via Cloud Service Management Portal*`;
  },

  buildSecExBody(data) {
    return `## Security Exception Request

**Application Name:** ${data.applicationName}
**Policy / Control Violated:** ${data.policyViolated}
**Expiry Date:** ${data.expiryDate}

### Business Justification
${data.businessJustification}

### Compensating Controls
${data.compensatingControls || 'Not specified'}

### Risk Acknowledgement
${data.riskAcknowledgement ? '✅ Risk acknowledged by submitter' : '❌ Risk not acknowledged'}

---
*Submitted via Cloud Service Management Portal*
*⚠️ No permanent security exceptions allowed. This exception expires on ${data.expiryDate}.*`;
  },

  buildSubscriptionBody(data) {
    return `## New Subscription Creation Request

**Subscription Name:** ${data.subscriptionName}
**Business Owner:** ${data.businessOwner}
**Technical Owner:** ${data.technicalOwner}
**Cost Center:** ${data.costCenter}
**Subscription Purpose:** ${data.subscriptionPurpose}
**Management Group:** ${data.managementGroup || 'Not specified'}
**Budget Limit (monthly):** ${data.budgetLimit || 'Not specified'}
**Region:** ${data.region}
**Data Classification:** ${data.dataClassification}
**Cloud Frontdoor Reference ID:** ${data.cfdReferenceId || 'N/A'}

### Business Justification
${data.businessJustification}

### Notes
${data.notes || 'None'}

---
*Submitted via Cloud Service Management Portal*
*This request is only applicable after a positive Cloud Frontdoor outcome.*`;
  }
};

// ---- Toast Notifications ----
function showToast(message, type = 'info') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => { toast.remove(); }, 4000);
}

// ---- Settings Modal ----
function showSettings() {
  const overlay = document.getElementById('settingsModal');
  if (overlay) {
    document.getElementById('settingsRepo').value = CloudOps.config.repo;
    const tokenInput = document.getElementById('settingsToken');
    tokenInput.value = '';
    tokenInput.placeholder = CloudOps.config.token ? '••••••••••••••••  (saved — enter new value to change)' : 'ghp_...';
    document.getElementById('settingsOrg').value = CloudOps.config.orgName;
    const roleSelect = document.getElementById('settingsRole');
    if (roleSelect) roleSelect.value = CloudOps.config.role;
    const usernameInput = document.getElementById('settingsUsername');
    if (usernameInput) usernameInput.value = CloudOps.config.username;
    overlay.classList.add('active');
  }
}

function hideSettings() {
  document.getElementById('settingsModal')?.classList.remove('active');
}

async function saveSettings() {
  const repo = document.getElementById('settingsRepo').value.trim();
  const newToken = document.getElementById('settingsToken').value.trim();
  const orgName = document.getElementById('settingsOrg').value.trim() || 'Cloud Service Management';
  const role = document.getElementById('settingsRole')?.value || 'user';
  const username = document.getElementById('settingsUsername')?.value.trim() || '';
  const token = newToken || CloudOps.config.token;

  if (!repo || !token) { showToast('Repository and Token are required!', 'error'); return; }
  if (!username) { showToast('GitHub Username is required!', 'error'); return; }
  if (newToken && !/^(ghp_|github_pat_|gho_)[A-Za-z0-9_]+$/.test(newToken)) {
    showToast('Invalid token format. GitHub tokens start with ghp_, github_pat_, or gho_.', 'error'); return;
  }
  if (!/^[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+$/.test(repo)) {
    showToast('Invalid repository format. Use owner/repo (e.g. myorg/cloud-ops-backlog).', 'error'); return;
  }

  try {
    const res = await fetch(`https://api.github.com/repos/${encodeURI(repo)}`, {
      headers: { 'Accept': 'application/vnd.github.v3+json', 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      showToast('Connection failed: ' + (err.message || `HTTP ${res.status}`), 'error'); return;
    }
  } catch (e) { showToast('Connection failed: ' + e.message, 'error'); return; }

  CloudOps.config.repo = repo;
  CloudOps.config.token = token;
  CloudOps.config.orgName = orgName;
  CloudOps.config.role = role;
  CloudOps.config.username = username;
  hideSettings();
  showToast('Settings saved! Connected as ' + CloudOps.escapeHtml(role.toUpperCase()) + '.', 'success');
  const logo = document.querySelector('.logo-text');
  if (logo) logo.textContent = CloudOps.config.orgName;
  applyRoleUI();
  if (typeof loadPageData === 'function') loadPageData();
}

function checkConfig() {
  if (!CloudOps.config.isConfigured) { showSettings(); return false; }
  return true;
}

// ---- Role-Based UI (simplified: user + admin only) ----
function applyRoleUI() {
  const role = CloudOps.config.role;
  const roleBadge = document.getElementById('roleBadge');
  if (roleBadge) {
    const roleLabels = { admin: '🛡️ Cloud Ops', user: '👤 User' };
    const roleColors = { admin: '#c62828', user: '#1565c0' };
    roleBadge.textContent = roleLabels[role] || '👤 User';
    roleBadge.style.background = roleColors[role] || '#1565c0';
  }

  document.querySelectorAll('[data-role]').forEach(el => {
    const allowedRoles = el.getAttribute('data-role').split(',');
    el.style.display = allowedRoles.includes(role) ? '' : 'none';
  });

  document.querySelectorAll('[data-hide-role]').forEach(el => {
    const hiddenRoles = el.getAttribute('data-hide-role').split(',');
    el.style.display = hiddenRoles.includes(role) ? 'none' : '';
  });
}
