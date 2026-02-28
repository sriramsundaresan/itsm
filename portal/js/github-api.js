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
    get isConfigured() { return !!(this.repo && this.token); }
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

  // ---- Dashboard Stats ----
  async getStats() {
    const [open, closed] = await Promise.all([
      this.api('/issues?state=open&per_page=100'),
      this.api('/issues?state=closed&per_page=100')
    ]);

    const openIssues = open.filter(i => !i.pull_request);
    const closedIssues = closed.filter(i => !i.pull_request);

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

  if (!repo || !token) {
    showToast('Repository and Token are required!', 'error');
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
  hideSettings();
  showToast('Settings saved! Connected successfully.', 'success');
  const logo = document.querySelector('.logo-text');
  if (logo) logo.textContent = ITSM.config.orgName;
  if (typeof loadPageData === 'function') loadPageData();
}

function checkConfig() {
  if (!ITSM.config.isConfigured) {
    showSettings();
    return false;
  }
  return true;
}
