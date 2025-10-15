(function () {
  const host = document.getElementById('a4a-ai-root');
  if (!host) {
    return;
  }

  if (typeof a4aAI === 'undefined' || !a4aAI.restUrl || !a4aAI.nonce) {
    console.error('axs4all - AI: Missing localized REST configuration.');
    return;
  }

  const shadow = host.attachShadow({ mode: 'open' });

  const baseStyle = document.createElement('style');
  baseStyle.textContent = `
    :host { display:block; }
    .a4a-loading { opacity: .6; pointer-events: none; }
    pre { white-space: pre-wrap; word-break: break-word; }
  `;
  shadow.appendChild(baseStyle);

  const tablerCss = document.createElement('link');
  tablerCss.rel = 'stylesheet';
  tablerCss.href = 'https://cdn.jsdelivr.net/npm/@tabler/[email protected]/dist/css/tabler.min.css';
  shadow.appendChild(tablerCss);

  const tablerIconsCss = document.createElement('link');
  tablerIconsCss.rel = 'stylesheet';
  tablerIconsCss.href = 'https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css';
  shadow.appendChild(tablerIconsCss);

  const app = document.createElement('div');
  app.innerHTML = `
    <div class="page">
      <header class="navbar navbar-expand-md navbar-light">
        <div class="container-xl">
          <a class="navbar-brand" href="#" aria-label="axs4all AI">
            <span class="navbar-brand-text">axs4all · AI URL Manager</span>
          </a>
        </div>
      </header>
      <div class="page-wrapper">
        <div class="page-header d-print-none">
          <div class="container-xl">
            <div class="row g-2 align-items-center">
              <div class="col">
                <h2 class="page-title">Tracked URLs</h2>
                <div class="text-muted mt-1">Maintain crawl targets, schedules, and captured XML payloads.</div>
              </div>
            </div>
          </div>
        </div>
        <div class="page-body">
          <div class="container-xl">
            <div class="row row-cards">
              <div class="col-12">
                <div id="a4a-notice" class="alert alert-info d-none" role="alert"></div>
              </div>
              <div class="col-12 col-lg-7">
                <div class="card" id="a4a-table-card">
                  <div class="card-header">
                    <h3 class="card-title">URL Inventory</h3>
                  </div>
                  <div class="card-body p-0">
                    <div class="table-responsive">
                      <table class="table table-vcenter card-table">
                        <thead>
                          <tr>
                            <th>URL</th>
                            <th>Description</th>
                            <th>Schedule</th>
                            <th>Updated</th>
                            <th class="w-1"></th>
                          </tr>
                        </thead>
                        <tbody id="a4a-table-body">
                          <tr>
                            <td colspan="5" class="text-muted text-center py-4">Loading...</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
              <div class="col-12 col-lg-5">
                <div class="card" id="a4a-form-card">
                  <div class="card-header">
                    <h3 class="card-title" id="a4a-form-title">Add New URL</h3>
                  </div>
                  <div class="card-body">
                    <form id="a4a-form" autocomplete="off">
                      <input type="hidden" id="a4a-id" />
                      <div class="mb-3">
                        <label class="form-label" for="a4a-url">Target URL<span class="text-danger">*</span></label>
                        <input type="url" class="form-control" id="a4a-url" name="url" required placeholder="https://example.com/page" />
                        <div class="form-hint">Provide the exact URL to crawl.</div>
                      </div>
                      <div class="mb-3">
                        <label class="form-label" for="a4a-description">Description</label>
                        <textarea class="form-control" id="a4a-description" name="description" rows="3" placeholder="Optional context for this URL"></textarea>
                      </div>
                      <div class="mb-3">
                        <label class="form-label" for="a4a-schedule">Schedule</label>
                        <input type="text" class="form-control" id="a4a-schedule" name="schedule" placeholder="e.g. daily, weekly, cron pattern" />
                        <div class="form-hint">Define how often the URL should be processed.</div>
                      </div>
                      <div class="mb-3">
                        <label class="form-label" for="a4a-returned">Returned Data (XML)</label>
                        <textarea class="form-control font-monospace" id="a4a-returned" name="returned_data" rows="6" placeholder="<results>...</results>"></textarea>
                      </div>
                      <div class="d-flex gap-2">
                        <button type="submit" class="btn btn-primary" id="a4a-submit">Save URL</button>
                        <button type="button" class="btn btn-light" id="a4a-reset">Clear</button>
                      </div>
                    </form>
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

  const restUrl = a4aAI.restUrl.replace(/\/$/, '');
  const nonce = a4aAI.nonce;

  const state = {
    items: [],
    activeId: null,
    loading: false,
  };

  const els = {
    tableBody: app.querySelector('#a4a-table-body'),
    notice: app.querySelector('#a4a-notice'),
    form: app.querySelector('#a4a-form'),
    idField: app.querySelector('#a4a-id'),
    urlField: app.querySelector('#a4a-url'),
    descriptionField: app.querySelector('#a4a-description'),
    scheduleField: app.querySelector('#a4a-schedule'),
    returnedField: app.querySelector('#a4a-returned'),
    submitButton: app.querySelector('#a4a-submit'),
    resetButton: app.querySelector('#a4a-reset'),
    formTitle: app.querySelector('#a4a-form-title'),
    formCard: app.querySelector('#a4a-form-card'),
    tableCard: app.querySelector('#a4a-table-card'),
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

  function setLoading(flag) {
    state.loading = flag;
    const method = flag ? 'add' : 'remove';
    els.formCard.classList[method]('a4a-loading');
    els.tableCard.classList[method]('a4a-loading');
  }

  function setNotice(message, type = 'info') {
    if (!message) {
      els.notice.classList.add('d-none');
      els.notice.textContent = '';
      return;
    }
    els.notice.classList.remove('d-none');
    els.notice.className = `alert alert-${type}`;
    els.notice.textContent = message;
  }

  function summarize(value, length = 80) {
    const trimmed = (value || '').trim();
    if (trimmed.length <= length) {
      return trimmed;
    }
    return `${trimmed.slice(0, length)}…`;
  }

  function renderTable() {
    if (!state.items.length) {
      els.tableBody.innerHTML = `
        <tr>
          <td colspan="5" class="text-muted text-center py-4">No URLs added yet. Use the form to create one.</td>
        </tr>
      `;
      return;
    }

    const rows = state.items
      .map((item) => {
        const updated = item.modified_gmt ? new Date(item.modified_gmt + 'Z') : null;
        const updatedLabel = updated ? updated.toLocaleString() : '—';
        return `
          <tr>
            <td class="text-nowrap">
              <a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.url)}</a>
            </td>
            <td>${escapeHtml(summarize(item.description, 60)) || '—'}</td>
            <td>${escapeHtml(item.schedule) || '—'}</td>
            <td>${escapeHtml(updatedLabel)}</td>
            <td class="text-end">
              <div class="btn-list flex-nowrap">
                <button class="btn btn-sm btn-outline-primary" data-action="edit" data-id="${item.id}">
                  <i class="ti ti-edit"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" data-action="delete" data-id="${item.id}">
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
    els.submitButton.textContent = 'Save URL';
    els.formTitle.textContent = 'Add New URL';
    els.submitButton.classList.remove('btn-warning');
    els.submitButton.classList.add('btn-primary');
  }

  function populateForm(item) {
    state.activeId = item.id;
    els.idField.value = item.id;
    els.urlField.value = item.url || '';
    els.descriptionField.value = item.description || '';
    els.scheduleField.value = item.schedule || '';
    els.returnedField.value = item.returned_data || '';
    els.submitButton.textContent = 'Update URL';
    els.formTitle.textContent = 'Edit URL';
    els.submitButton.classList.remove('btn-primary');
    els.submitButton.classList.add('btn-warning');
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

    if (response.status === 204) {
      return null;
    }

    return response.json();
  }

  async function fetchItems() {
    setLoading(true);
    try {
      const items = await request('GET', restUrl);
      state.items = Array.isArray(items) ? items : [];
      renderTable();
    } catch (error) {
      console.error(error);
      setNotice(error.message || 'Failed to load URLs.', 'danger');
    } finally {
      setLoading(false);
    }
  }

  els.tableBody.addEventListener('click', (event) => {
    const action = event.target.closest('[data-action]');
    if (!action) {
      return;
    }

    const id = parseInt(action.getAttribute('data-id'), 10);
    if (!id) {
      return;
    }

    const item = state.items.find((entry) => entry.id === id);
    if (!item) {
      return;
    }

    if (action.getAttribute('data-action') === 'edit') {
      populateForm(item);
      host.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (action.getAttribute('data-action') === 'delete') {
      const confirmDelete = window.confirm('Delete this URL? This cannot be undone.');
      if (!confirmDelete) {
        return;
      }
      deleteItem(id);
    }
  });

  els.form.addEventListener('submit', async (event) => {
    event.preventDefault();
    setNotice('');

    const payload = {
      url: els.urlField.value.trim(),
      description: els.descriptionField.value.trim(),
      schedule: els.scheduleField.value.trim(),
      returned_data: els.returnedField.value,
    };

    if (!payload.url) {
      setNotice('URL is required.', 'warning');
      return;
    }

    setLoading(true);

    try {
      if (state.activeId) {
        const url = `${restUrl}/${state.activeId}`;
        const updated = await request('PUT', url, payload);
        setNotice('URL updated.', 'success');
        state.items = state.items.map((item) =>
          item.id === updated.id ? updated : item
        );
      } else {
        const created = await request('POST', restUrl, payload);
        setNotice('URL added.', 'success');
        state.items.unshift(created);
      }
      renderTable();
      resetForm();
    } catch (error) {
      console.error(error);
      setNotice(error.message || 'Failed to save the URL.', 'danger');
    } finally {
      setLoading(false);
    }
  });

  els.resetButton.addEventListener('click', () => {
    resetForm();
    setNotice('');
  });

  async function deleteItem(id) {
    setLoading(true);
    try {
      await request('DELETE', `${restUrl}/${id}`);
      state.items = state.items.filter((item) => item.id !== id);
      renderTable();
      setNotice('URL deleted.', 'success');
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

  resetForm();
  fetchItems();

  const tablerJs = document.createElement('script');
  tablerJs.src = 'https://cdn.jsdelivr.net/npm/@tabler/[email protected]/dist/js/tabler.min.js';
  shadow.appendChild(tablerJs);
})();
