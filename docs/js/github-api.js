/* ============================================
   GitHub Issues API - ITSM Backend
   ============================================ */

const ITSM = {
  config: {
    get repo() { return localStorage.getItem('itsm_repo') || ''; },
    set repo(v) { localStorage.setItem('itsm_repo', v); },
    get token() { return localStorage.getItem('itsm_token') || ''; },
    set token(v) { localStorage.setItem('itsm_token', v); },
    get orgName() { return localStorage.getItem('itsm_org') || 'IT Service Portal'; },
    set orgName(v) { localStorage.setItem('itsm_org', v); },
    get role() { return localStorage.getItem('itsm_role') || 'user'; },
    set role(v) { localStorage.setItem('itsm_role', v); },
    get username() { return localStorage.getItem('itsm_username') || ''; },
    set username(v) { localStorage.setItem('itsm_username', v); },
    get isConfigured() { return !!(this.repo && this.token); },
    get isAdmin() { return this.role === 'admin'; },
    get isApprover() { return this.role === 'approver'; },
    get isUser() { return this.role === 'user'; }
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

  // ---- Issues (Tickets) ----
  async getTickets(filters = {}) {
    const params = new URLSearchParams({
      state: filters.state || 'open',
      per_page: '50',
      sort: 'created',
      direction: 'desc'
    });
    if (filters.labels) params.set('labels', filters.labels);
    const issues = await this.api(`/issues?${params}`);
    return issues.filter(i => !i.pull_request); // exclude PRs
  },

  async getTicket(number) {
    return this.api(`/issues/${number}`);
  },

  async getTicketComments(number) {
    return this.api(`/issues/${number}/comments`);
  },

  async createTicket(title, body, labels = []) {
    return this.api('/issues', {
      method: 'POST',
      body: JSON.stringify({ title, body, labels })
    });
  },

  async addComment(number, body) {
    return this.api(`/issues/${number}/comments`, {
      method: 'POST',
      body: JSON.stringify({ body })
    });
  },

  async closeTicket(number) {
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

  async getApprovalStatus(issue) {
    const labels = issue.labels.map(l => l.name);
    const isChange = labels.includes('change-request');
    const isService = labels.includes('service-request');
    if (!isChange && !isService) return { needsApproval: false };

    const isApproved = labels.includes('approved');
    const isRejected = labels.includes('rejected');
    const isPending = !isApproved && !isRejected && issue.state === 'open';

    return {
      needsApproval: true,
      type: isChange ? 'Change Request' : 'Service Request',
      status: isApproved ? 'approved' : isRejected ? 'rejected' : 'pending',
      isPending,
      isApproved,
      isRejected,
      riskLevel: labels.find(l => l.startsWith('risk-'))?.replace('risk-', '') || 'unknown',
      changeType: labels.find(l => ['standard-change', 'normal-change', 'emergency-change'].includes(l)) || ''
    };
  },

  async getPendingApprovals() {
    const [changes, services] = await Promise.all([
      this.api('/issues?state=open&labels=change-request&per_page=100'),
      this.api('/issues?state=open&labels=service-request&per_page=100')
    ]);
    const all = [...changes, ...services].filter(i => !i.pull_request);
    const pending = all.filter(i => {
      const labels = i.labels.map(l => l.name);
      return !labels.includes('approved') && !labels.includes('rejected');
    });

    // Approvers only see items assigned to them
    if (this.config.isApprover && this.config.username) {
      return pending.filter(i =>
        i.assignee && i.assignee.login.toLowerCase() === this.config.username.toLowerCase()
      );
    }
    return pending;
  },

  // Get tickets filtered by role
  async getMyTickets(filters = {}) {
    const tickets = await this.getTickets(filters);
    if (this.config.isUser && this.config.username) {
      return tickets.filter(t =>
        t.user && t.user.login.toLowerCase() === this.config.username.toLowerCase()
      );
    }
    return tickets;
  },

  // Get stats filtered by role
  async getMyStats() {
    const [open, closed] = await Promise.all([
      this.api('/issues?state=open&per_page=100'),
      this.api('/issues?state=closed&per_page=100')
    ]);

    let openIssues = open.filter(i => !i.pull_request);
    let closedIssues = closed.filter(i => !i.pull_request);

    // Users only see their own tickets
    if (this.config.isUser && this.config.username) {
      const u = this.config.username.toLowerCase();
      openIssues = openIssues.filter(i => i.user && i.user.login.toLowerCase() === u);
      closedIssues = closedIssues.filter(i => i.user && i.user.login.toLowerCase() === u);
    }

    // Approvers see their own submitted + assigned tickets
    if (this.config.isApprover && this.config.username) {
      const u = this.config.username.toLowerCase();
      openIssues = openIssues.filter(i =>
        (i.user && i.user.login.toLowerCase() === u) ||
        (i.assignee && i.assignee.login.toLowerCase() === u)
      );
      closedIssues = closedIssues.filter(i =>
        (i.user && i.user.login.toLowerCase() === u) ||
        (i.assignee && i.assignee.login.toLowerCase() === u)
      );
    }

    const hasLabel = (issue, label) => issue.labels.some(l => l.name === label);

    return {
      total: openIssues.length + closedIssues.length,
      open: openIssues.length,
      closed: closedIssues.length,
      incidents: openIssues.filter(i => hasLabel(i, 'incident')).length,
      changes: openIssues.filter(i => hasLabel(i, 'change-request')).length,
      serviceRequests: openIssues.filter(i => hasLabel(i, 'service-request')).length,
      critical: openIssues.filter(i => hasLabel(i, 'priority-critical')).length,
      high: openIssues.filter(i => hasLabel(i, 'priority-high')).length,
      slaWarning: openIssues.filter(i => hasLabel(i, 'sla-warning')).length,
      slaBreached: openIssues.filter(i => hasLabel(i, 'sla-breached')).length,
      recentTickets: openIssues.slice(0, 10)
    };
  },

  // ---- Helpers ----
  getTicketType(issue) {
    if (issue.labels.some(l => l.name === 'incident')) return 'incident';
    if (issue.labels.some(l => l.name === 'change-request')) return 'change';
    if (issue.labels.some(l => l.name === 'service-request')) return 'service';
    return 'other';
  },

  getPriority(issue) {
    const priorityLabels = ['priority-critical', 'priority-high', 'priority-medium', 'priority-low'];
    const found = issue.labels.find(l => priorityLabels.includes(l.name));
    return found ? found.name.replace('priority-', '') : 'none';
  },

  getSLAStatus(issue) {
    if (issue.labels.some(l => l.name === 'sla-breached')) return 'breached';
    if (issue.labels.some(l => l.name === 'sla-warning')) return 'warning';
    return 'ok';
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

  // ---- Build Issue Body (Markdown) ----
  buildIncidentBody(data) {
    return `## Incident Report

**Severity:** ${data.severity}
**Affected Service:** ${data.service}
**Users Affected:** ${data.usersAffected || 'Unknown'}
**Start Time:** ${data.startTime || 'Unknown'}

### Description
${data.description}

### Business Impact
${data.impact || 'Not specified'}

### Workaround Available
${data.workaround || 'None'}

### Recent Changes
${data.recentChanges || 'None known'}

---
*Submitted via ITSM Portal*`;
  },

  buildChangeBody(data) {
    return `## Change Request

**Change Type:** ${data.changeType}
**Risk Level:** ${data.riskLevel}
**Target Environment:** ${data.environment}
**Planned Date:** ${data.plannedDate || 'TBD'}

### Description
${data.description}

### Justification
${data.justification || 'Not specified'}

### Impact Assessment
${data.impact || 'Not specified'}

### Rollback Plan
${data.rollbackPlan || 'Not specified'}

### Testing Completed
${data.testing || 'Not specified'}

---
*Submitted via ITSM Portal*`;
  },

  buildServiceRequestBody(data) {
    return `## Service Request

**Category:** ${data.category}
**Urgency:** ${data.urgency}
**Cost Center:** ${data.costCenter || 'N/A'}

### Description
${data.description}

### Business Justification
${data.justification || 'Not specified'}

### Duration Needed
${data.duration || 'Permanent'}

---
*Submitted via ITSM Portal*`;
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
    document.getElementById('settingsRepo').value = ITSM.config.repo;
    document.getElementById('settingsToken').value = ITSM.config.token;
    document.getElementById('settingsOrg').value = ITSM.config.orgName;
    const roleSelect = document.getElementById('settingsRole');
    if (roleSelect) roleSelect.value = ITSM.config.role;
    const usernameInput = document.getElementById('settingsUsername');
    if (usernameInput) usernameInput.value = ITSM.config.username;
    overlay.classList.add('active');
  }
}

function hideSettings() {
  document.getElementById('settingsModal')?.classList.remove('active');
}

async function saveSettings() {
  const repo = document.getElementById('settingsRepo').value.trim();
  const token = document.getElementById('settingsToken').value.trim();
  const orgName = document.getElementById('settingsOrg').value.trim() || 'IT Service Portal';
  const role = document.getElementById('settingsRole')?.value || 'user';
  const username = document.getElementById('settingsUsername')?.value.trim() || '';

  if (!repo || !token) {
    showToast('Repository and Token are required!', 'error');
    return;
  }

  if (!username) {
    showToast('GitHub Username is required!', 'error');
    return;
  }

  // Test connection before saving
  try {
    const res = await fetch(`https://api.github.com/repos/${repo}`, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `Bearer ${token}`
      }
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      showToast('Connection failed: ' + (err.message || `HTTP ${res.status}`), 'error');
      return;
    }
  } catch (e) {
    showToast('Connection failed: ' + e.message, 'error');
    return;
  }

  ITSM.config.repo = repo;
  ITSM.config.token = token;
  ITSM.config.orgName = orgName;
  ITSM.config.role = role;
  ITSM.config.username = username;
  hideSettings();
  showToast('Settings saved! Connected as ' + role.toUpperCase() + '.', 'success');
  const logo = document.querySelector('.logo-text');
  if (logo) logo.textContent = ITSM.config.orgName;
  applyRoleUI();
  if (typeof loadPageData === 'function') loadPageData();
}

function checkConfig() {
  if (!ITSM.config.isConfigured) {
    showSettings();
    return false;
  }
  return true;
}

// ---- Role-Based UI ----
function applyRoleUI() {
  const role = ITSM.config.role;

  // Update role badge in nav
  const roleBadge = document.getElementById('roleBadge');
  if (roleBadge) {
    const roleLabels = { admin: '🛡️ Admin', approver: '✅ Approver', user: '👤 User' };
    const roleColors = { admin: '#c62828', approver: '#2e7d32', user: '#1565c0' };
    roleBadge.textContent = roleLabels[role] || '👤 User';
    roleBadge.style.background = roleColors[role] || '#1565c0';
  }

  // Show/hide nav items based on role
  document.querySelectorAll('[data-role]').forEach(el => {
    const allowedRoles = el.getAttribute('data-role').split(',');
    el.style.display = allowedRoles.includes(role) ? '' : 'none';
  });

  // Show/hide elements with data-hide-role
  document.querySelectorAll('[data-hide-role]').forEach(el => {
    const hiddenRoles = el.getAttribute('data-hide-role').split(',');
    el.style.display = hiddenRoles.includes(role) ? 'none' : '';
  });
}
