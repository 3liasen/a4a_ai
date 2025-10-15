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
    @import url('https://cdn.jsdelivr.net/npm/@tabler/[email protected]/dist/css/tabler.min.css');
    @import url('https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css');
  `;
  shadow.appendChild(tablerImports);

  const baseStyle = document.createElement('style');
  baseStyle.textContent = `
    :host { display:block; }
    .a4a-card-loading { position: relative; }
    .a4a-card-loading::after {
      content: '';
      position: absolute;
      inset: 0;
      background: rgba(255,255,255,0.85);
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
    pre { white-space: pre-wrap; word-break: break-word; }
    .a4a-tagline { max-width: 540px; }
  `;
  shadow.appendChild(baseStyle);

  const app = document.createElement('div');
  app.innerHTML = `
    <div class="page">
      <div class="page-wrapper">
        <div class="page-header d-print-none">
          <div class="container-xl">
            <div class="row g-2 align-items-center">
              <div class="col">
                <div class="page-pretitle">axs4all · AI</div>
                <h2 class="page-title">URL Intelligence Hub</h2>
                <div class="text-muted mt-2 a4a-tagline">
                  Curate crawl targets, assign cadences, and capture XML snapshots ready for AI processing.
                </div>
              </div>
              <div class="col-auto ms-auto d-print-none">
                <div class="btn-list">
                  <button class="btn btn-primary" data-action="new-url">
                    <i class="ti ti-plus"></i>
                    <span class="d-none d-sm-inline ms-1">New URL</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="page-body">
          <div class="container-xl">

            <div class="row row-deck row-cards mb-4">
              <div class="col-sm-6 col-xl-4">
                <div class="card card-sm">
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
              <div class="col-sm-6 col-xl-4">
                <div class="card card-sm">
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
              <div class="col-sm-6 col-xl-4">
                <div class="card card-sm">
                  <div class="card-body">
                    <div class="d-flex align-items-center">
                      <span class="avatar avatar-sm bg-warning-lt text-warning me-3">
                        <i class="ti ti-refresh-dot"></i>
                      </span>
                      <div>
                        <div class="text-muted">Last Update</div>
                        <div class="h2 mb-0" id="a4a-metric-updated">—</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="row row-cards align-items-stretch">
              <div class="col-12 d-none" id="a4a-notice-container"></div>

              <div class="col-12 col-xl-7">
                <div class="card card-stacked" id="a4a-table-card">
                  <div class="card-header align-items-center">
                    <div>
                      <h3 class="card-title">Crawl Targets</h3>
                      <div class="card-subtitle text-muted">Monitor inventory, cadence, and freshness.</div>
                    </div>
                    <div class="card-actions">
                      <button class="btn btn-outline-primary btn-icon" data-action="new-url" aria-label="Add URL">
                        <i class="ti ti-plus"></i>
                      </button>
                    </div>
                  </div>
                  <div id="a4a-empty-state" class="card-body text-center text-muted py-5 d-none">
                    <div class="avatar avatar-xl bg-primary-lt text-primary mb-3">
                      <i class="ti ti-sparkles"></i>
                    </div>
                    <h3 class="mb-1">Start your collection</h3>
                    <p class="text-muted mb-3">
                      Create your first target and define how often the AI should revisit it.
                    </p>
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

              <div class="col-12 col-xl-5">
                <div class="card shadow-sm" id="a4a-form-card">
                  <div class="card-status-top bg-primary"></div>
                  <div class="card-header">
                    <div>
                      <h3 class="card-title" id="a4a-form-title">Create Crawl Target</h3>
                      <div class="card-subtitle text-muted">Curate the URL, cadence, and captured response.</div>
                    </div>
                    <div class="card-actions">
                      <span class="badge bg-primary-lt text-primary" id="a4a-mode-indicator">New</span>
                    </div>
                  </div>
                  <div class="card-body">
                    <form id="a4a-form" autocomplete="off">
                      <input type="hidden" id="a4a-id" />
                      <div class="mb-3">
                        <label class="form-label" for="a4a-url">Target URL <span class="text-danger">*</span></label>
                        <input type="url" class="form-control" id="a4a-url" name="url" required placeholder="https://example.com/page" />
                        <div class="form-hint">Exact address the AI crawler should request.</div>
                      </div>
                      <div class="mb-3">
                        <label class="form-label" for="a4a-description">Description</label>
                        <textarea class="form-control" id="a4a-description" name="description" rows="3" placeholder="Optional context for teammates or the AI prompt"></textarea>
                      </div>
                      <div class="mb-3">
                        <div class="d-flex justify-content-between align-items-center">
                          <label class="form-label mb-0" for="a4a-schedule">Schedule</label>
                          <span class="badge bg-secondary-lt text-secondary" id="a4a-schedule-hint">Draft</span>
                        </div>
                        <input type="text" class="form-control" id="a4a-schedule" name="schedule" placeholder="e.g. Daily at 09:00 CET" />
                        <div class="form-hint">Human-friendly for now—we will translate to Cron later.</div>
                      </div>
                      <div class="mb-3">
                        <label class="form-label" for="a4a-returned">Returned Data (XML)</label>
                        <textarea class="form-control font-monospace" id="a4a-returned" name="returned_data" rows="6" placeholder="<results>...</results>"></textarea>
                        <div class="form-hint">Store the latest response snapshot so the AI can diff and prompt.</div>
                      </div>
                      <div class="btn-list w-100">
                        <button type="submit" class="btn btn-primary w-100" id="a4a-submit">
                          <i class="ti ti-device-floppy"></i>
                          <span class="ms-1">Save Target</span>
                        </button>
                        <button type="button" class="btn btn-outline-secondary w-100" id="a4a-reset">
                          <i class="ti ti-eraser"></i>
                          <span class="ms-1">Reset Form</span>
                        </button>
                      </div>
                    </form>
                  </div>
                  <div class="card-footer">
                    <div class="text-muted small">
                      Roadmap: connect schedules to WP-Cron and hand off to the AI ingestion service.
                    </div>
                  </div>
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
    loading: false,
  };

  const els = {
    notice: app.querySelector('#a4a-notice-container'),
    metrics: {
      total: app.querySelector('#a4a-metric-total'),
      scheduled: app.querySelector('#a4a-metric-scheduled'),
      updated: app.querySelector('#a4a-metric-updated'),
    },
    tableBody: app.querySelector('#a4a-table-body'),
    tableCard: app.querySelector('#a4a-table-card'),
    tableWrap: app.querySelector('#a4a-table-wrap'),
    emptyState: app.querySelector('#a4a-empty-state'),
    formCard: app.querySelector('#a4a-form-card'),
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
    actionNewButtons: app.querySelectorAll('[data-action="new-url"]'),
  };

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
    const diffSeconds = (date.getTime() - Date.now()) / 1000;
    const units = [
      ['year', 60 * 60 * 24 * 365],
      ['month', 60 * 60 * 24 * 30],
      ['week', 60 * 60 * 24 * 7],
      ['day', 60 * 60 * 24],
      ['hour', 60 * 60],
      ['minute', 60],
      ['second', 1],
    ];
    for (const [unit, seconds] of units) {
      const value = diffSeconds / seconds;
      if (Math.abs(value) >= 1 || unit === 'second') {
        return rtf.format(Math.round(value), unit);
      }
    }
    return 'just now';
  }

  function formatModified(gmtString) {
    if (!gmtString) {
      return { relative: 'Never', absolute: '—' };
    }
    const date = new Date(`${gmtString}Z`);
    if (Number.isNaN(date.getTime())) {
      return { relative: 'Never', absolute: '—' };
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
    return `${trimmed.slice(0, length)}…`;
  }

  function setNotice(message, type = 'info') {
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

  els.notice.addEventListener('click', (event) => {
    if (event.target.closest('[data-action="dismiss-notice"]')) {
      event.preventDefault();
      setNotice('');
    }
  });

  function setLoading(flag) {
    state.loading = flag;
    const method = flag ? 'add' : 'remove';
    [els.tableCard, els.formCard].forEach((card) => {
      card.classList[method]('a4a-card-loading');
    });
    els.submitButton.disabled = flag;
    els.resetButton.disabled = flag;
    els.actionNewButtons.forEach((btn) => {
      btn.disabled = flag;
    });
  }

  function updateScheduleHint() {
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
    updateMetrics();

    if (!state.items.length) {
      els.tableWrap.classList.add('d-none');
      els.emptyState.classList.remove('d-none');
      els.tableBody.innerHTML = '';
      return;
    }

    els.tableWrap.classList.remove('d-none');
    els.emptyState.classList.add('d-none');

    const rows = state.items
      .map((item) => {
        const { relative, absolute } = formatModified(item.modified_gmt);
        const description = summarize(item.description, 90);
        const descriptionTitle = escapeHtml(item.description || '');
        const schedule = (item.schedule || '').trim();
        const scheduleBadge = schedule
          ? `<span class="badge bg-blue-lt text-blue">${escapeHtml(schedule)}</span>`
          : '<span class="badge bg-secondary-lt text-secondary">Ad hoc</span>';

        return `
          <tr>
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
              ${scheduleBadge}
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
      })
      .join('');

    els.tableBody.innerHTML = rows;
  }

  function resetForm() {
    state.activeId = null;
    els.idField.value = '';
    els.urlField.value = '';
    els.descriptionField.value = '';
    els.scheduleField.value = '';
    els.returnedField.value = '';
    els.formTitle.textContent = 'Create Crawl Target';
    els.modeIndicator.textContent = 'New';
    els.modeIndicator.className = 'badge bg-primary-lt text-primary';
    updateScheduleHint();
    els.urlField.focus({ preventScroll: true });
  }

  function populateForm(item) {
    state.activeId = item.id;
    els.idField.value = item.id;
    els.urlField.value = item.url || '';
    els.descriptionField.value = item.description || '';
    els.scheduleField.value = item.schedule || '';
    els.returnedField.value = item.returned_data || '';
    els.formTitle.textContent = 'Update Crawl Target';
    els.modeIndicator.textContent = 'Editing';
    els.modeIndicator.className = 'badge bg-orange-lt text-orange';
    updateScheduleHint();
    els.urlField.focus({ preventScroll: true });
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
      const message =
        (error && error.message) ||
        `Request failed with status ${response.status}`;
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
      renderTable();
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
      renderTable();
      setNotice('URL deleted.', 'info');
      if (state.activeId === id) {
        resetForm();
      }
    } catch (error) {
      console.error(error);
      setNotice(error.message || 'Failed to delete the URL.', 'danger');
    } finally {
      setLoading(false);
    }
  }

  function handleTableAction(event) {
    const actionButton = event.target.closest('[data-action]');
    if (!actionButton) {
      return;
    }

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
      host.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (action === 'delete') {
      const confirmDelete = window.confirm('Delete this URL? This cannot be undone.');
      if (confirmDelete) {
        deleteItem(id);
      }
    } else if (action === 'copy-url') {
      copyToClipboard(item.url);
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
        state.items = state.items.map((item) =>
          item.id === response.id ? response : item
        );
        setNotice('URL updated.', 'success');
      } else {
        const created = await request('POST', restUrl, payload);
        state.items.push(created);
        setNotice('URL added.', 'success');
      }
      resortItems();
      renderTable();
      resetForm();
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
    els.scheduleField.addEventListener('input', updateScheduleHint);
    els.form.addEventListener('submit', handleSubmit);
    els.resetButton.addEventListener('click', handleReset);
    els.tableBody.addEventListener('click', handleTableAction);
    els.actionNewButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        resetForm();
        setNotice('');
      });
    });
  }

  resetForm();
  wireEvents();
  fetchItems();

  const tablerJs = document.createElement('script');
  tablerJs.src = 'https://cdn.jsdelivr.net/npm/@tabler/[email protected]/dist/js/tabler.min.js';
  shadow.appendChild(tablerJs);
})();
