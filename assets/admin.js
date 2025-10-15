(function () {
  const host = document.getElementById('a4a-ai-root');
  if (!host) {
    return;
  }

  const config = typeof a4aAI === 'object' ? a4aAI : null;
  if (!config || !config.restUrl || !config.nonce) {
    console.error('axs4all - AI: Missing localized REST configuration.');
    return;
  }

  const shadow = host.attachShadow({ mode: 'open' });

  const tablerImports = document.createElement('style');
  tablerImports.textContent = `
    @import url('https://cdn.jsdelivr.net/npm/@tabler/[email protected]/dist/css/tabler.min.css');
    @import url('https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css');
  `;
  shadow.appendChild(tablerImports);

  const baseStyle = document.createElement('style');
  baseStyle.textContent = `
    :host { display: block; min-height: 100%; background: var(--tblr-body-bg, #f5f7fb); }
    .a4a-card-loading { position: relative; }
    .a4a-card-loading::after {
      content: '';
      position: absolute;
      inset: 0;
      background: rgba(255,255,255,0.82);
      border-radius: var(--tblr-card-border-radius, 1rem);
      z-index: 5;
    }
    .a4a-card-loading::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      width: 2.75rem;
      height: 2.75rem;
      margin: -1.375rem 0 0 -1.375rem;
      border-radius: 50%;
      border: 0.35rem solid rgba(32,107,196,0.25);
      border-top-color: rgba(32,107,196,0.95);
      animation: a4a-spin 0.75s linear infinite;
      z-index: 6;
    }
    @keyframes a4a-spin {
      to { transform: rotate(360deg); }
    }
    .a4a-table-row { cursor: pointer; transition: background 0.2s ease; }
    .a4a-table-row:hover { background: rgba(32,107,196,0.06); }
    .a4a-tagline { max-width: 560px; }
    .a4a-xml-preview { max-height: 220px; overflow: auto; background: #f8fafc; border-radius: 0.6rem; padding: 1rem; font-size: 0.85rem; }
    .a4a-xml-preview code { white-space: pre-wrap; }
    .timeline-one-side .timeline-item-marker { margin-top: 0.35rem; }
    .timeline-one-side .timeline-item-content { padding-top: 0.35rem; }
  `;
  shadow.appendChild(baseStyle);

  const app = document.createElement('div');
  app.innerHTML = `
    <div class="page">
      <header class="navbar navbar-expand-md navbar-light d-print-none shadow-sm">
        <div class="container-xl">
          <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#a4a-navbar" aria-controls="a4a-navbar" aria-expanded="false" aria-label="Toggle navigation">
            <span class="navbar-toggler-icon"></span>
          </button>
          <a class="navbar-brand d-flex align-items-center" href="#">
            <span class="avatar avatar-sm bg-primary text-white">AI</span>
            <span class="ms-2 navbar-brand-text">axs4all Intelligence</span>
          </a>
          <div class="navbar-nav flex-row order-md-last">
            <div class="nav-item me-3 d-none d-md-flex align-items-center text-muted">
              <i class="ti ti-clock-hour-4 me-1"></i>
              <span id="a4a-clock">--:--</span>
            </div>
            <div class="nav-item dropdown">
              <a href="#" class="nav-link d-flex lh-1 text-reset p-0" data-bs-toggle="dropdown" aria-label="Open user menu">
                <span class="avatar avatar-sm">WP</span>
                <div class="d-none d-xl-block ps-2">
                  <div>Administrator</div>
                  <div class="mt-1 small text-muted">axs4all</div>
                </div>
              </a>
              <div class="dropdown-menu dropdown-menu-end dropdown-menu-arrow">
                <a href="#" class="dropdown-item">Profile</a>
                <a href="#" class="dropdown-item">Preferences</a>
                <div class="dropdown-divider"></div>
                <a href="#" class="dropdown-item">Log out</a>
              </div>
            </div>
          </div>
          <div class="collapse navbar-collapse" id="a4a-navbar">
            <div class="navbar-nav">
              <a class="nav-link active" href="#"><i class="ti ti-home me-2"></i>Overview</a>
              <a class="nav-link" href="#"><i class="ti ti-calendar-stats me-2"></i>Schedules</a>
              <a class="nav-link" href="#"><i class="ti ti-chart-bubble me-2"></i>Insights</a>
            </div>
          </div>
        </div>
      </header>
      <div class="page-wrapper">
        <div class="page-header d-print-none">
          <div class="container-xl">
            <div class="row g-2 align-items-center">
              <div class="col">
                <div class="page-pretitle">axs4all / AI</div>
                <h2 class="page-title">URL Intelligence Hub</h2>
                <div class="text-muted mt-2 a4a-tagline">
                  Curate crawl targets, orchestrate schedules, and capture XML payloads ready for the AI ingestion queue.
                </div>
              </div>
              <div class="col-auto ms-auto d-print-none">
                <div class="btn-list">
                  <button class="btn btn-outline-secondary" data-action="new-url">
                    <i class="ti ti-refresh"></i>
                    Sync Later
                  </button>
                  <button class="btn btn-primary" data-action="new-url">
                    <i class="ti ti-plus"></i>
                    New Target
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="page-body">
          <div class="container-xl">

            <div class="row row-deck row-cards mb-4">
              <div class="col-sm-6 col-xl-3">
                <div class="card card-sm shadow-sm">
                  <div class="card-body">
                    <div class="d-flex align-items-center">
                      <span class="avatar avatar-sm bg-primary-lt text-primary me-3">
                        <i class="ti ti-world"></i>
                      </span>
                      <div>
                        <div class="text-muted">Total URLs</div>
                        <div class="h2 mb-0" id="a4a-metric-total">0</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div class="col-sm-6 col-xl-3">
                <div class="card card-sm shadow-sm">
                  <div class="card-body">
                    <div class="d-flex align-items-center">
                      <span class="avatar avatar-sm bg-success-lt text-success me-3">
                        <i class="ti ti-clock-play"></i>
                      </span>
                      <div>
                        <div class="text-muted">Scheduled</div>
                        <div class="h2 mb-0" id="a4a-metric-scheduled">0</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div class="col-sm-6 col-xl-3">
                <div class="card card-sm shadow-sm">
                  <div class="card-body">
                    <div class="d-flex align-items-center">
                      <span class="avatar avatar-sm bg-warning-lt text-warning me-3">
                        <i class="ti ti-refresh-dot"></i>
                      </span>
                      <div>
                        <div class="text-muted">Last Update</div>
                        <div class="h2 mb-0" id="a4a-metric-updated">--</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div class="col-sm-6 col-xl-3">
                <div class="card card-sm shadow-sm">
                  <div class="card-body">
                    <div class="d-flex align-items-center">
                      <span class="avatar avatar-sm bg-indigo-lt text-indigo me-3">
                        <i class="ti ti-robot"></i>
                      </span>
                      <div>
                        <div class="text-muted">AI Ready</div>
                        <div class="h2 mb-0" id="a4a-metric-ai-ready">0</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="row row-cards align-items-stretch mb-4">
              <div class="col-12 d-none" id="a4a-notice-container"></div>

              <div class="col-12 col-xl-8">
                <div class="card card-stacked shadow-sm" id="a4a-table-card">
                  <div class="card-header align-items-center">
                    <div>
                      <h3 class="card-title">Crawl Targets</h3>
                      <div class="card-subtitle text-muted">Monitor cadence, freshness, and recent activity.</div>
                    </div>
                    <div class="card-actions">
                      <button class="btn btn-outline-primary btn-icon" data-action="new-url" aria-label="Add URL">
                        <i class="ti ti-plus"></i>
                      </button>
                    </div>
                  </div>
                  <div id="a4a-empty-state" class="card-body text-center text-muted py-6 d-none">
                    <div class="avatar avatar-xl bg-primary-lt text-primary mb-3">
                      <i class="ti ti-sparkles"></i>
                    </div>
                    <h3 class="mb-1">No targets yet</h3>
                    <p class="text-muted mb-3">Drop in your first URL to kick off the AI ingestion pipeline.</p>
                    <button class="btn btn-primary" data-action="new-url">
                      <i class="ti ti-plus"></i>
                      Create URL
                    </button>
                  </div>
                  <div class="table-responsive" id="a4a-table-wrap">
                    <table class="table table-vcenter table-hover">
                      <thead>
                        <tr>
                          <th>URL &amp; Context</th>
                          <th class="text-nowrap">Cadence</th>
                          <th class="text-nowrap">Updated</th>
                          <th class="w-1"></th>
                        </tr>
                      </thead>
                      <tbody id="a4a-table-body"></tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div class="col-12 col-xl-4">
                <div class="card shadow-sm" id="a4a-detail-card">
                  <div class="card-header">
                    <div>
                      <h3 class="card-title">Selected Target</h3>
                      <div class="card-subtitle text-muted">Quick insight for the highlighted URL.</div>
                    </div>
                  </div>
                  <div class="card-body" id="a4a-detail-body">
                    <div class="empty">
                      <p class="empty-title">Pick a target to inspect</p>
                      <p class="empty-subtitle text-muted">Select a row from the list to preview metadata and captured XML.</p>
                    </div>
                  </div>
                  <div class="card-footer d-flex gap-2">
                    <button class="btn btn-outline-primary w-100" id="a4a-detail-edit" disabled>
                      <i class="ti ti-edit me-1"></i>
                      Quick Edit
                    </button>
                    <button class="btn btn-outline-secondary btn-icon" id="a4a-detail-copy" disabled aria-label="Copy URL">
                      <i class="ti ti-copy"></i>
                    </button>
                  </div>
                </div>

                <div class="card shadow-sm mt-3" id="a4a-timeline-card">
                  <div class="card-header">
                    <h3 class="card-title">Schedule Timeline</h3>
                    <div class="card-subtitle text-muted">Visualise upcoming crawls at a glance.</div>
                  </div>
                  <div class="card-body" id="a4a-timeline">
                    <div class="empty">
                      <p class="empty-title">No schedules yet</p>
                      <p class="empty-subtitle text-muted">Once you add cadences, they will appear here.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="card shadow-sm" id="a4a-form-card">
              <div class="card-header border-0">
                <div>
                  <h3 class="card-title" id="a4a-form-title">Create Crawl Target</h3>
                  <div class="card-subtitle text-muted">Define the essentials and leave the rest to the AI crawler.</div>
                </div>
                <div class="card-actions">
                  <span class="badge bg-primary-lt text-primary" id="a4a-mode-indicator">New</span>
                </div>
              </div>
              <div class="card-body">
                <form id="a4a-form" autocomplete="off">
                  <input type="hidden" id="a4a-id" />
                  <div class="row g-4">
                    <div class="col-md-6">
                      <label class="form-label" for="a4a-url">Target URL <span class="text-danger">*</span></label>
                      <div class="input-icon mb-1">
                        <span class="input-icon-addon">
                          <i class="ti ti-link"></i>
                        </span>
                        <input type="url" class="form-control" id="a4a-url" required placeholder="https://example.com/page" />
                      </div>
                      <div class="form-hint">Exact address the AI crawler should hit.</div>
                    </div>
                    <div class="col-md-6">
                      <label class="form-label" for="a4a-schedule">Schedule</label>
                      <div class="input-icon mb-1">
                        <span class="input-icon-addon">
                          <i class="ti ti-calendar"></i>
                        </span>
                        <input type="text" class="form-control" id="a4a-schedule" placeholder="e.g. Daily at 09:00 CET" />
                      </div>
                      <div class="d-flex align-items-center justify-content-between">
                        <div class="form-hint">Human-friendly cadence for now.</div>
                        <span class="badge bg-secondary-lt text-secondary" id="a4a-schedule-hint">Draft</span>
                      </div>
                    </div>
                    <div class="col-md-12">
                      <label class="form-label" for="a4a-description">Description</label>
                      <textarea class="form-control" id="a4a-description" rows="3" placeholder="Optional context for teammates or future prompts"></textarea>
                    </div>
                    <div class="col-md-6">
                      <label class="form-label">Collection Tags</label>
                      <div class="form-selectgroup form-selectgroup-boxes d-flex flex-wrap">
                        <label class="form-selectgroup-item flex-fill">
                          <input type="checkbox" name="tags" value="marketing" class="form-selectgroup-input" disabled>
                          <span class="form-selectgroup-label d-flex align-items-center">
                            <span class="me-3"><i class="ti ti-speakerphone text-primary"></i></span>
                            Marketing
                          </span>
                        </label>
                        <label class="form-selectgroup-item flex-fill">
                          <input type="checkbox" name="tags" value="product" class="form-selectgroup-input" disabled>
                          <span class="form-selectgroup-label d-flex align-items-center">
                            <span class="me-3"><i class="ti ti-package text-success"></i></span>
                            Product
                          </span>
                        </label>
                      </div>
                      <div class="form-hint">Tagging arrives with AI autoplan.</div>
                    </div>
                    <div class="col-md-6">
                      <label class="form-label">Auto refresh</label>
                      <label class="form-check form-switch">
                        <input class="form-check-input" type="checkbox" id="a4a-auto-refresh" disabled>
                        <span class="form-check-label">Pilot in progress</span>
                      </label>
                      <div class="text-muted small mt-2">
                        Scheduling automation hooks into the upcoming crawler service.
                      </div>
                    </div>
                    <div class="col-12">
                      <label class="form-label" for="a4a-returned">Returned Data (XML)</label>
                      <textarea class="form-control font-monospace" id="a4a-returned" rows="6" placeholder="<results>...</results>"></textarea>
                      <div class="form-hint">Store the latest payload snapshot for AI diffing.</div>
                    </div>
                    <div class="col-12">
                      <div class="btn-list">
                        <button type="submit" class="btn btn-primary" id="a4a-submit">
                          <i class="ti ti-device-floppy"></i>
                          Save Target
                        </button>
                        <button type="button" class="btn btn-outline-secondary" id="a4a-reset">
                          <i class="ti ti-eraser"></i>
                          Reset Form
                        </button>
                        <button type="button" class="btn btn-outline-primary" id="a4a-preview-toggle">
                          <i class="ti ti-code"></i>
                          Preview XML
                        </button>
                      </div>
                    </div>
                  </div>
                </form>
              </div>
              <div class="card-footer">
                <div class="text-muted small">
                  Roadmap: bind these schedules to WP-Cron and push queued URLs through the AI crawler.
                </div>
              </div>
            </div>

            <div class="card shadow-sm mt-4" id="a4a-xml-preview-card" hidden>
              <div class="card-header">
                <h3 class="card-title">XML Preview</h3>
                <div class="card-actions">
                  <button class="btn btn-icon btn-outline-secondary" id="a4a-preview-close" aria-label="Close preview">
                    <i class="ti ti-x"></i>
                  </button>
                </div>
              </div>
              <div class="card-body">
                <div class="a4a-xml-preview">
                  <code id="a4a-preview-content">&lt;!-- nothing to show yet --&gt;</code>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  `;
  shadow.appendChild(app);

  const restUrl = config.restUrl.replace(/\/$/, '');
  const nonce = config.nonce;

  const state = {
    items: [],
    activeId: null,
    selectedId: null,
    loading: false,
  };

  const els = {
    clock: app.querySelector('#a4a-clock'),
    notice: app.querySelector('#a4a-notice-container'),
    metrics: {
      total: app.querySelector('#a4a-metric-total'),
      scheduled: app.querySelector('#a4a-metric-scheduled'),
      updated: app.querySelector('#a4a-metric-updated'),
      aiReady: app.querySelector('#a4a-metric-ai-ready'),
    },
    tableBody: app.querySelector('#a4a-table-body'),
    tableWrap: app.querySelector('#a4a-table-wrap'),
    tableCard: app.querySelector('#a4a-table-card'),
    emptyState: app.querySelector('#a4a-empty-state'),
    detailBody: app.querySelector('#a4a-detail-body'),
    detailEdit: app.querySelector('#a4a-detail-edit'),
    detailCopy: app.querySelector('#a4a-detail-copy'),
    timeline: app.querySelector('#a4a-timeline'),
    form: app.querySelector('#a4a-form'),
    idField: app.querySelector('#a4a-id'),
    urlField: app.querySelector('#a4a-url'),
    descriptionField: app.querySelector('#a4a-description'),
    scheduleField: app.querySelector('#a4a-schedule'),
    returnedField: app.querySelector('#a4a-returned'),
    submitButton: app.querySelector('#a4a-submit'),
    resetButton: app.querySelector('#a4a-reset'),
    formTitle: app.querySelector('#a4a-form-title'),
    modeIndicator: app.querySelector('#a4a-mode-indicator'),
    scheduleHint: app.querySelector('#a4a-schedule-hint'),
    previewToggle: app.querySelector('#a4a-preview-toggle'),
    previewClose: app.querySelector('#a4a-preview-close'),
    previewCard: app.querySelector('#a4a-xml-preview-card'),
    previewContent: app.querySelector('#a4a-preview-content'),
    actionNewButtons: app.querySelectorAll('[data-action="new-url"]'),
  };

  function updateClock() {
    if (!els.clock) {
      return;
    }
    const now = new Date();
    els.clock.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  updateClock();
  setInterval(updateClock, 60000);

  function escapeHtml(str) {
    if (typeof str !== 'string') {
      return '';
    }
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function timeAgo(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
      return 'Never';
    }
    const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
    const diffSeconds = Math.round((date.getTime() - Date.now()) / 1000);
    const units = [
      ['year', 31536000],
      ['month', 2592000],
      ['week', 604800],
      ['day', 86400],
      ['hour', 3600],
      ['minute', 60],
      ['second', 1],
    ];
    for (const [unit, seconds] of units) {
      if (Math.abs(diffSeconds) >= seconds || unit === 'second') {
        return rtf.format(Math.round(diffSeconds / seconds), unit);
      }
    }
    return 'just now';
  }

  function formatModified(gmtString) {
    if (!gmtString) {
      return { relative: 'Never', absolute: '-' };
    }
    const date = new Date(`${gmtString}Z`);
    if (Number.isNaN(date.getTime())) {
      return { relative: 'Never', absolute: '-' };
    }
    return {
      relative: timeAgo(date),
      absolute: date.toLocaleString(),
    };
  }

  function summarize(value, length = 80) {
    const trimmed = (value || '').trim();
    if (!trimmed) {
      return '';
    }
    if (trimmed.length <= length) {
      return trimmed;
    }
    return `${trimmed.slice(0, length)}...`;
  }

  function setNotice(message, type = 'info') {
    if (!els.notice) {
      return;
    }
    if (!message) {
      els.notice.classList.add('d-none');
      els.notice.innerHTML = '';
      return;
    }
    const icons = {
      info: 'ti ti-info-circle',
      success: 'ti ti-circle-check',
      warning: 'ti ti-alert-triangle',
      danger: 'ti ti-alert-octagon',
    };
    const icon = icons[type] || icons.info;
    els.notice.classList.remove('d-none');
    els.notice.innerHTML = `
      <div class="alert alert-${type} alert-important" role="alert">
        <div class="d-flex align-items-center">
          <div class="alert-icon me-2"><i class="${icon}"></i></div>
          <div>${escapeHtml(message)}</div>
        </div>
        <button type="button" class="btn-close" data-action="dismiss-notice" aria-label="Close"></button>
      </div>
    `;
  }

  if (els.notice) {
    els.notice.addEventListener('click', (event) => {
      if (event.target.closest('[data-action="dismiss-notice"]')) {
        setNotice('');
      }
    });
  }

  function setLoading(flag) {
    state.loading = flag;
    const method = flag ? 'add' : 'remove';
    [els.tableCard, app.querySelector('#a4a-form-card')].forEach((card) => {
      if (card) {
        card.classList[method]('a4a-card-loading');
      }
    });
    if (els.submitButton) els.submitButton.disabled = flag;
    if (els.resetButton) els.resetButton.disabled = flag;
    els.actionNewButtons.forEach((btn) => {
      btn.disabled = flag;
    });
  }

  function updateScheduleHint() {
    if (!els.scheduleHint || !els.scheduleField) {
      return;
    }
    const value = els.scheduleField.value.trim();
    if (value) {
      els.scheduleHint.textContent = 'Scheduled';
      els.scheduleHint.className = 'badge bg-success-lt text-success';
    } else {
      els.scheduleHint.textContent = 'Draft';
      els.scheduleHint.className = 'badge bg-secondary-lt text-secondary';
    }
  }

  function updateMetrics() {
    const total = state.items.length;
    const scheduled = state.items.filter((item) => (item.schedule || '').trim().length > 0).length;
    const aiReady = state.items.filter((item) => (item.returned_data || '').trim().length > 0).length;
    let latest = null;
    state.items.forEach((item) => {
      if (item.modified_gmt) {
        const date = new Date(`${item.modified_gmt}Z`);
        if (!Number.isNaN(date.getTime()) && (!latest || date > latest)) {
          latest = date;
        }
      }
    });
    els.metrics.total.textContent = total;
    els.metrics.scheduled.textContent = scheduled;
    els.metrics.aiReady.textContent = aiReady;
    els.metrics.updated.textContent = latest ? timeAgo(latest) : 'Never';
  }

  function resortItems() {
    state.items.sort((a, b) => {
      const dateA = a.modified_gmt ? Date.parse(`${a.modified_gmt}Z`) : 0;
      const dateB = b.modified_gmt ? Date.parse(`${b.modified_gmt}Z`) : 0;
      return dateB - dateA;
    });
  }

  function renderTable() {
    if (!els.tableBody) {
      return;
    }
    if (!state.items.length) {
      if (els.tableWrap) els.tableWrap.classList.add('d-none');
      if (els.emptyState) els.emptyState.classList.remove('d-none');
      els.tableBody.innerHTML = '';
      return;
    }
    if (els.tableWrap) els.tableWrap.classList.remove('d-none');
    if (els.emptyState) els.emptyState.classList.add('d-none');
    const rows = state.items.map((item) => {
      const { relative, absolute } = formatModified(item.modified_gmt);
      const description = summarize(item.description, 90);
      const descriptionTitle = escapeHtml(item.description || '');
      const schedule = (item.schedule || '').trim();
      const badge = schedule
        ? `<span class="badge bg-blue-lt text-blue">${escapeHtml(schedule)}</span>`
        : '<span class="badge bg-secondary-lt text-secondary">Ad hoc</span>';
      const isActive = state.selectedId === item.id;
      const rowClass = isActive ? 'a4a-table-row table-active' : 'a4a-table-row';
      return `
        <tr class="${rowClass}" data-row-id="${item.id}">
          <td>
            <div class="d-flex align-items-start">
              <span class="avatar avatar-sm bg-primary-lt text-primary me-2">
                <i class="ti ti-link"></i>
              </span>
              <div class="flex-fill">
                <a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer" class="fw-semibold text-reset text-wrap">
                  ${escapeHtml(item.url)}
                </a>
                <div class="small text-muted text-truncate" title="${descriptionTitle}">
                  ${description ? escapeHtml(description) : 'Add context for your teammates.'}
                </div>
              </div>
            </div>
          </td>
          <td class="text-nowrap">
            ${badge}
          </td>
          <td class="text-nowrap">
            <div class="fw-semibold small">${escapeHtml(relative)}</div>
            <div class="text-muted small">${escapeHtml(absolute)}</div>
          </td>
          <td class="text-end">
            <div class="btn-list flex-nowrap">
              <button class="btn btn-icon btn-outline-primary" data-action="edit" data-id="${item.id}" aria-label="Edit URL">
                <i class="ti ti-pencil"></i>
              </button>
              <button class="btn btn-icon btn-outline-secondary" data-action="copy-url" data-id="${item.id}" aria-label="Copy URL">
                <i class="ti ti-copy"></i>
              </button>
              <button class="btn btn-icon btn-outline-danger" data-action="delete" data-id="${item.id}" aria-label="Delete URL">
                <i class="ti ti-trash"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
    els.tableBody.innerHTML = rows;
  }

  function getSelectedItem() {
    if (!state.selectedId) {
      return null;
    }
    return state.items.find((item) => item.id === state.selectedId) || null;
  }

  function renderDetailPanel() {
    if (!els.detailBody || !els.detailEdit || !els.detailCopy) {
      return;
    }
    const item = getSelectedItem();
    if (!item) {
      els.detailBody.innerHTML = `
        <div class="empty">
          <p class="empty-title">Pick a target to inspect</p>
          <p class="empty-subtitle text-muted">Select a row from the list to preview metadata and captured XML.</p>
        </div>
      `;
      els.detailEdit.disabled = true;
      els.detailCopy.disabled = true;
      return;
    }
    const schedule = (item.schedule || '').trim();
    const scheduleBadge = schedule
      ? `<span class="badge bg-blue-lt text-blue">${escapeHtml(schedule)}</span>`
      : '<span class="badge bg-secondary-lt text-secondary">Ad hoc</span>';
    const { relative, absolute } = formatModified(item.modified_gmt);
    const xmlContent = (item.returned_data || '').trim()
      ? escapeHtml(item.returned_data)
      : '&lt;!-- No XML captured yet --&gt;';
    els.detailBody.innerHTML = `
      <div class="mb-3">
        <div class="text-muted text-uppercase fw-semibold small">Target URL</div>
        <a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer" class="fw-semibold">
          ${escapeHtml(item.url)}
        </a>
      </div>
      <div class="datagrid mb-3">
        <div class="datagrid-item">
          <div class="datagrid-title">Cadence</div>
          <div class="datagrid-content">${scheduleBadge}</div>
        </div>
        <div class="datagrid-item">
          <div class="datagrid-title">Last update</div>
          <div class="datagrid-content">
            <div>${escapeHtml(relative)}</div>
            <div class="text-muted small">${escapeHtml(absolute)}</div>
          </div>
        </div>
        <div class="datagrid-item">
          <div class="datagrid-title">AI readiness</div>
          <div class="datagrid-content">
            ${(item.returned_data || '').trim().length ? '<span class="badge bg-success-lt text-success">Has snapshot</span>' : '<span class="badge bg-yellow-lt text-yellow">Pending fetch</span>'}
          </div>
        </div>
      </div>
      <div class="mb-3">
        <div class="text-muted text-uppercase fw-semibold small">Description</div>
        <div>${escapeHtml(item.description || 'No description yet. Add some context for future prompts.')}</div>
      </div>
      <div>
        <div class="text-muted text-uppercase fw-semibold small mb-2">Returned XML</div>
        <div class="a4a-xml-preview"><code>${xmlContent}</code></div>
      </div>
    `;
    els.previewContent.innerHTML = xmlContent;
    els.detailEdit.disabled = false;
    els.detailEdit.dataset.id = String(item.id);
    els.detailCopy.disabled = false;
    els.detailCopy.dataset.id = String(item.id);
  }

  function renderTimeline() {
    if (!els.timeline) {
      return;
    }
    const scheduled = state.items
      .filter((item) => (item.schedule || '').trim().length > 0)
      .slice(0, 6);
    if (!scheduled.length) {
      els.timeline.innerHTML = `
        <div class="empty">
          <p class="empty-title">No schedules yet</p>
          <p class="empty-subtitle text-muted">Once you add cadences, they will appear here.</p>
        </div>
      `;
      return;
    }
    const colors = ['primary', 'blue', 'green', 'orange', 'pink', 'indigo'];
    const itemsHtml = scheduled.map((item, index) => {
      const color = colors[index % colors.length];
      const { relative } = formatModified(item.modified_gmt);
      return `
        <div class="timeline-item">
          <div class="timeline-item-marker bg-${color}"></div>
          <div class="timeline-item-content">
            <div class="text-muted mb-1">${escapeHtml(item.schedule)}</div>
            <div class="fw-semibold text-truncate">${escapeHtml(item.url)}</div>
            <div class="small text-muted">${escapeHtml(relative)}</div>
          </div>
        </div>
      `;
    }).join('');
    els.timeline.innerHTML = `<div class="timeline timeline-one-side timeline-slim">${itemsHtml}</div>`;
  }

  function refreshUI() {
    updateMetrics();
    renderTable();
    renderDetailPanel();
    renderTimeline();
  }

  function resetForm() {
    state.activeId = null;
    if (els.idField) els.idField.value = '';
    if (els.urlField) els.urlField.value = '';
    if (els.descriptionField) els.descriptionField.value = '';
    if (els.scheduleField) els.scheduleField.value = '';
    if (els.returnedField) els.returnedField.value = '';
    if (els.formTitle) els.formTitle.textContent = 'Create Crawl Target';
    if (els.modeIndicator) {
      els.modeIndicator.textContent = 'New';
      els.modeIndicator.className = 'badge bg-primary-lt text-primary';
    }
    if (els.previewCard) {
      els.previewCard.hidden = true;
    }
    updateScheduleHint();
    if (els.urlField) {
      els.urlField.focus({ preventScroll: true });
    }
  }

  function populateForm(item) {
    state.activeId = item.id;
    if (els.idField) els.idField.value = item.id;
    if (els.urlField) els.urlField.value = item.url || '';
    if (els.descriptionField) els.descriptionField.value = item.description || '';
    if (els.scheduleField) els.scheduleField.value = item.schedule || '';
    if (els.returnedField) els.returnedField.value = item.returned_data || '';
    if (els.formTitle) els.formTitle.textContent = 'Update Crawl Target';
    if (els.modeIndicator) {
      els.modeIndicator.textContent = 'Editing';
      els.modeIndicator.className = 'badge bg-orange-lt text-orange';
    }
    updateScheduleHint();
    if (els.urlField) {
      els.urlField.focus({ preventScroll: true });
    }
  }

  function selectItem(id) {
    if (!id) {
      state.selectedId = null;
    } else if (!state.selectedId || state.selectedId !== id) {
      state.selectedId = id;
    }
    refreshUI();
  }

  async function request(method, url, payload) {
    const options = {
      method,
      headers: {
        'X-WP-Nonce': nonce,
      },
    };
    if (payload !== undefined) {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(payload);
    }
    const response = await fetch(url, options);
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      const message = (error && error.message) || `Request failed with status ${response.status}`;
      throw new Error(message);
    }
    return response.status === 204 ? null : response.json();
  }

  async function fetchItems() {
    setLoading(true);
    try {
      const items = await request('GET', restUrl);
      state.items = Array.isArray(items) ? items : [];
      resortItems();
      if (!state.items.length) {
        state.selectedId = null;
      } else if (!state.selectedId || !state.items.some((item) => item.id === state.selectedId)) {
        state.selectedId = state.items[0].id;
      }
      refreshUI();
    } catch (error) {
      console.error(error);
      setNotice(error.message || 'Failed to load URLs.', 'danger');
    } finally {
      setLoading(false);
    }
  }

  async function deleteItem(id) {
    setLoading(true);
    try {
      await request('DELETE', `${restUrl}/${id}`);
      state.items = state.items.filter((item) => item.id !== id);
      if (state.activeId === id) {
        state.activeId = null;
        resetForm();
      }
      if (state.selectedId === id) {
        state.selectedId = state.items.length ? state.items[0].id : null;
      }
      refreshUI();
      setNotice('URL deleted.', 'info');
    } catch (error) {
      console.error(error);
      setNotice(error.message || 'Failed to delete the URL.', 'danger');
    } finally {
      setLoading(false);
    }
  }

  function updatePreviewContent() {
    if (!els.previewContent || !els.returnedField) {
      return;
    }
    const value = (els.returnedField.value || '').trim();
    els.previewContent.innerHTML = value ? escapeHtml(value) : '&lt;!-- nothing to show yet --&gt;';
  }

  function togglePreview(forceState) {
    if (!els.previewCard) {
      return;
    }
    const show = forceState !== undefined ? forceState : els.previewCard.hidden;
    els.previewCard.hidden = !show;
    if (show) {
      updatePreviewContent();
      els.previewCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  async function copyToClipboard(text) {
    if (!text) {
      return;
    }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setNotice('URL copied to clipboard.', 'success');
    } catch (error) {
      console.error(error);
      setNotice('Could not copy URL automatically.', 'warning');
    }
  }

  function handleTableClick(event) {
    const actionButton = event.target.closest('[data-action]');
    if (actionButton) {
      const id = parseInt(actionButton.getAttribute('data-id'), 10);
      if (!id) {
        return;
      }
      const item = state.items.find((entry) => entry.id === id);
      if (!item) {
        return;
      }
      const action = actionButton.getAttribute('data-action');
      if (action === 'edit') {
        populateForm(item);
        selectItem(item.id);
        host.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else if (action === 'delete') {
        const confirmDelete = window.confirm('Delete this URL? This cannot be undone.');
        if (confirmDelete) {
          deleteItem(id);
        }
      } else if (action === 'copy-url') {
        copyToClipboard(item.url);
        selectItem(item.id);
      }
      return;
    }
    const row = event.target.closest('tr[data-row-id]');
    if (row) {
      const rowId = parseInt(row.getAttribute('data-row-id'), 10);
      if (rowId) {
        selectItem(rowId);
      }
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setNotice('');
    const payload = {
      url: els.urlField.value.trim(),
      description: els.descriptionField.value.trim(),
      schedule: els.scheduleField.value.trim(),
      returned_data: els.returnedField.value,
    };
    if (!payload.url) {
      setNotice('Please provide a valid URL before saving.', 'warning');
      return;
    }
    setLoading(true);
    try {
      if (state.activeId) {
        const response = await request('PUT', `${restUrl}/${state.activeId}`, payload);
        state.items = state.items.map((item) => (item.id === response.id ? response : item));
        state.selectedId = response.id;
        setNotice('URL updated.', 'success');
      } else {
        const created = await request('POST', restUrl, payload);
        state.items.push(created);
        state.selectedId = created.id;
        setNotice('URL added.', 'success');
      }
      resortItems();
      resetForm();
      refreshUI();
      togglePreview(false);
    } catch (error) {
      console.error(error);
      setNotice(error.message || 'Failed to save the URL.', 'danger');
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    resetForm();
    setNotice('');
  }

  function wireEvents() {
    if (els.scheduleField) {
      els.scheduleField.addEventListener('input', updateScheduleHint);
    }
    if (els.form) {
      els.form.addEventListener('submit', handleSubmit);
    }
    if (els.resetButton) {
      els.resetButton.addEventListener('click', handleReset);
    }
    if (els.tableBody) {
      els.tableBody.addEventListener('click', handleTableClick);
    }
    els.actionNewButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        resetForm();
        setNotice('');
      });
    });
    if (els.detailEdit) {
      els.detailEdit.addEventListener('click', () => {
        const item = getSelectedItem();
        if (item) {
          populateForm(item);
          selectItem(item.id);
          host.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    }
    if (els.detailCopy) {
      els.detailCopy.addEventListener('click', () => {
        const item = getSelectedItem();
        if (item) {
          copyToClipboard(item.url);
        }
      });
    }
    if (els.previewToggle) {
      els.previewToggle.addEventListener('click', () => togglePreview(true));
    }
    if (els.previewClose) {
      els.previewClose.addEventListener('click', () => togglePreview(false));
    }
    if (els.returnedField) {
      els.returnedField.addEventListener('input', () => {
        if (!els.previewCard.hidden) {
          updatePreviewContent();
        }
      });
    }
  }

  resetForm();
  wireEvents();
  fetchItems();

  const tablerJs = document.createElement('script');
  tablerJs.src = 'https://cdn.jsdelivr.net/npm/@tabler/[email protected]/dist/js/tabler.min.js';
  shadow.appendChild(tablerJs);
})();



