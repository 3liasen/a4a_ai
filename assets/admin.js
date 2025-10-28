(function () {
  const host = document.getElementById('a4a-ai-root');
  if (!host) {
    return;
  }

  function initDebug() {
    const endpoint = typeof config.debugRestUrl === 'string' ? config.debugRestUrl.replace(/\/$/, '') : '';
    const defaultLogName =
      typeof config.debugLogName === 'string' && config.debugLogName ? config.debugLogName : 'a4a-ai-diagnostics.log';

    const layout = renderAdminLTEPage({
      viewKey: 'debug',
      title: 'Diagnostics',
      subtitle: 'Inspect plugin logs, capture notes, and share details with the engineering team.'
    });
    bindNavigation(layout.navLinks, loadView, layout.toggleButton, layout.sidebar);

    if (!endpoint) {
      layout.content.innerHTML = `
        <div class="alert alert-danger" role="alert">
          Diagnostics endpoint not available. Please reload or check REST configuration.
        </div>
      `;
      return;
    }

    layout.content.innerHTML = `
      <div class="a4a-section">
        <div id="a4a-debug-notice" class="alert d-none" role="alert"></div>
        <div class="a4a-debug-grid">
          <div class="card shadow-sm h-100" data-debug-card>
            <div class="card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
              <h2 class="h6 mb-0">Diagnostics Log</h2>
              <div class="a4a-debug-toolbar">
                <button class="btn btn-outline-secondary btn-sm" type="button" data-action="refresh">${icon('refresh', 'me-1')}Refresh</button>
                <button class="btn btn-outline-secondary btn-sm" type="button" data-action="copy">${icon('copy', 'me-1')}Copy</button>
                <button class="btn btn-outline-secondary btn-sm" type="button" data-action="download">${icon('save', 'me-1')}Download</button>
                <button class="btn btn-outline-danger btn-sm" type="button" data-action="clear">${icon('trash', 'me-1')}Clear</button>
              </div>
            </div>
            <div class="card-body d-flex flex-column gap-3">
              <div class="a4a-debug-meta">
                <span id="a4a-debug-filename">${escapeHtml(defaultLogName)}</span>
                <span id="a4a-debug-size" class="ms-2"></span>
                <span id="a4a-debug-updated" class="ms-2"></span>
              </div>
              <pre class="a4a-debug-log" id="a4a-debug-log">Loading log entries…</pre>
            </div>
          </div>
          <div class="card shadow-sm h-100">
            <div class="card-header">
              <h2 class="h6 mb-0">Append a Diagnostic Note</h2>
            </div>
            <div class="card-body">
              <form id="a4a-debug-form" class="vstack gap-3">
                <div>
                  <label class="form-label" for="a4a-debug-message">Message</label>
                  <textarea class="form-control" id="a4a-debug-message" rows="6" placeholder="Describe recent issues, reproduction steps, or observations."></textarea>
                </div>
                <div class="d-flex flex-wrap gap-2">
                  <button type="submit" class="btn btn-primary">${icon('save', 'me-1')}Append Note</button>
                  <button type="button" class="btn btn-outline-secondary" data-action="reset">${icon('eraser', 'me-1')}Reset</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    `;

    const app = layout.wrapper;
    const els = {
      notice: app.querySelector('#a4a-debug-notice'),
      logCard: app.querySelector('[data-debug-card]'),
      logContent: app.querySelector('#a4a-debug-log'),
      metaFilename: app.querySelector('#a4a-debug-filename'),
      metaSize: app.querySelector('#a4a-debug-size'),
      metaUpdated: app.querySelector('#a4a-debug-updated'),
      refreshBtn: app.querySelector('[data-action="refresh"]'),
      copyBtn: app.querySelector('[data-action="copy"]'),
      downloadBtn: app.querySelector('[data-action="download"]'),
      clearBtn: app.querySelector('[data-action="clear"]'),
      form: app.querySelector('#a4a-debug-form'),
      message: app.querySelector('#a4a-debug-message'),
      resetBtn: app.querySelector('[data-action="reset"]')
    };

    const state = {
      loading: false,
      content: '',
      size: 0,
      truncated: false,
      updated: '',
      filename: defaultLogName
    };

    function setBusy(flag) {
      if (els.logCard) {
        els.logCard.classList.toggle('a4a-busy', Boolean(flag));
      }
      state.loading = Boolean(flag);
    }

    function setNotice(message, type = 'info') {
      if (!els.notice) {
        return;
      }
      if (!message) {
        els.notice.className = 'alert d-none';
        els.notice.innerHTML = '';
        return;
      }
      els.notice.className = `alert alert-${type}`;
      els.notice.innerHTML = `
        <div class="d-flex justify-content-between align-items-center gap-3">
          <span>${escapeHtml(message)}</span>
          <button type="button" class="btn-close" data-debug-dismiss></button>
        </div>
      `;
    }

    if (els.notice) {
      els.notice.addEventListener('click', (event) => {
        if (event.target.closest('[data-debug-dismiss]')) {
          setNotice('');
        }
      });
    }

    function updateView() {
      if (els.logContent) {
        els.logContent.textContent = state.content ? state.content : 'No diagnostic entries recorded yet.';
      }
      if (els.metaFilename) {
        els.metaFilename.textContent = state.filename;
      }
      if (els.metaSize) {
        const base = `Size: ${formatBytes(state.size)}`;
        els.metaSize.textContent = state.truncated ? `${base} (showing last entries)` : base;
      }
      if (els.metaUpdated) {
        els.metaUpdated.textContent = state.updated ? `Updated: ${state.updated}` : 'Updated: --';
      }
    }

    async function refreshLog(showMessage = false) {
      setBusy(true);
      try {
        const response = await request('GET', endpoint);
        state.content = typeof response?.content === 'string' ? response.content : '';
        state.size = Number(response?.size) || 0;
        state.truncated = Boolean(response?.truncated);
        state.filename = response?.basename || defaultLogName;
        state.updated = response?.last_modified ? new Date(response.last_modified).toLocaleString() : '';
        updateView();
        if (showMessage) {
          setNotice('Log refreshed.', 'success');
        } else {
          setNotice('');
        }
      } catch (error) {
        console.error(error);
        setNotice(error.message || 'Failed to load diagnostics log.', 'danger');
      } finally {
        setBusy(false);
      }
    }

    async function clearLog() {
      if (!window.confirm('Clear the diagnostics log? This cannot be undone.')) {
        return;
      }
      setBusy(true);
      try {
        const response = await request('DELETE', endpoint);
        state.content = typeof response?.content === 'string' ? response.content : '';
        state.size = Number(response?.size) || 0;
        state.truncated = Boolean(response?.truncated);
        state.filename = response?.basename || defaultLogName;
        state.updated = response?.last_modified ? new Date(response.last_modified).toLocaleString() : '';
        updateView();
        setNotice('Diagnostics log cleared.', 'success');
      } catch (error) {
        console.error(error);
        setNotice(error.message || 'Failed to clear diagnostics log.', 'danger');
      } finally {
        setBusy(false);
      }
    }

    async function appendLogEntry(message) {
      setBusy(true);
      try {
        const response = await request('POST', endpoint, { message });
        state.content = typeof response?.content === 'string' ? response.content : '';
        state.size = Number(response?.size) || 0;
        state.truncated = Boolean(response?.truncated);
        state.filename = response?.basename || defaultLogName;
        state.updated = response?.last_modified ? new Date(response.last_modified).toLocaleString() : '';
        updateView();
        setNotice('Note appended to diagnostics log.', 'success');
      } catch (error) {
        console.error(error);
        setNotice(error.message || 'Failed to append log entry.', 'danger');
      } finally {
        setBusy(false);
      }
    }

    if (els.refreshBtn) {
      els.refreshBtn.addEventListener('click', () => refreshLog(true));
    }
    if (els.copyBtn) {
      els.copyBtn.addEventListener('click', async () => {
        const payload = state.content || '';
        if (!payload) {
          setNotice('Log is currently empty, nothing to copy.', 'info');
          return;
        }
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(payload);
          } else {
            const textarea = document.createElement('textarea');
            textarea.value = payload;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.focus();
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
          }
          setNotice('Diagnostics log copied to clipboard.', 'success');
        } catch (error) {
          console.error(error);
          setNotice('Could not copy diagnostics log automatically.', 'warning');
        }
      });
    }
    if (els.downloadBtn) {
      els.downloadBtn.addEventListener('click', () => {
        const blob = new Blob([state.content || ''], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = state.filename || defaultLogName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      });
    }
    if (els.clearBtn) {
      els.clearBtn.addEventListener('click', () => {
        clearLog();
      });
    }
    if (els.form) {
      els.form.addEventListener('submit', (event) => {
        event.preventDefault();
        const message = els.message ? els.message.value.trim() : '';
        if (!message) {
          setNotice('Please enter a diagnostic note before appending.', 'warning');
          return;
        }
        appendLogEntry(message);
        if (els.message) {
          els.message.value = '';
        }
      });
    }
    if (els.resetBtn && els.message) {
      els.resetBtn.addEventListener('click', () => {
        els.message.value = '';
        els.message.focus();
      });
    }

    refreshLog();
  }

  const config = typeof a4aAI === 'object' ? a4aAI : null;
  if (!config || !config.restUrl || !config.nonce) {
    console.error('axs4all - AI: Missing localized REST configuration.');
    host.textContent = 'Configuration error: missing REST settings.';
    return;
  }

  const root = host;
  root.innerHTML = '';

  function ensureHead() {
    return document.head || document.getElementsByTagName('head')[0] || document.documentElement;
  }

  const head = ensureHead();

  function escapeHtml(value) {
    if (typeof value !== 'string') {
      return '';
    }
    return value
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
      ['second', 1]
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
      return { relative: 'Never', absolute: '--' };
    }
    const date = new Date(`${gmtString}Z`);
    if (Number.isNaN(date.getTime())) {
      return { relative: 'Never', absolute: '--' };
    }
    const options = {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    };
    return { relative: timeAgo(date), absolute: date.toLocaleString(undefined, options) };
  }

  function formatBytes(bytes) {
    const value = Number(bytes);
    if (!Number.isFinite(value) || value <= 0) {
      return '0 B';
    }
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = value;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    const precision = size >= 100 ? 0 : size >= 10 ? 1 : 2;
    return `${size.toFixed(precision)} ${units[unitIndex]}`;
  }

  let baseStyle = head.querySelector('style#a4a-ai-base-style');
  if (!baseStyle) {
    baseStyle = document.createElement('style');
    baseStyle.id = 'a4a-ai-base-style';
    head.appendChild(baseStyle);
  }

  baseStyle.textContent = `
    #a4a-ai-root {
      display: block;
      font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
      --a4a-color-primary: #0d6efd;
      --a4a-color-success: #198754;
      --a4a-color-danger: #dc3545;
      --a4a-color-success-bg: rgba(25, 135, 84, 0.12);
      --a4a-color-success-border: rgba(25, 135, 84, 0.35);
      --a4a-color-danger-bg: rgba(220, 53, 69, 0.12);
      --a4a-color-danger-border: rgba(220, 53, 69, 0.35);
      --a4a-icon-scale: 1;
    }
    input:not([type="color"]),
    textarea,
    select {
      background: #ffffff;
      border: 1px solid rgba(15, 23, 42, 0.12);
      box-shadow: none;
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
    }
    input:focus,
    textarea:focus,
    select:focus {
      background: #ffffff;
      border-color: var(--a4a-color-primary);
      box-shadow: 0 0 0 0.15rem rgba(13, 110, 253, 0.15);
      outline: none;
    }
    input[type="color"] {
      padding: 0.25rem;
      border: 1px solid rgba(15, 23, 42, 0.12);
      border-radius: 0.75rem;
      background: transparent;
      width: 100%;
      height: 2.75rem;
    }
    .a4a-busy { position: relative; }
    .a4a-busy::after { content: ''; position: absolute; inset: 0; background: rgba(255,255,255,0.65); border-radius: 0.75rem; z-index: 10; }
    .a4a-busy::before { content: ''; position: absolute; top: 50%; left: 50%; width: 2.5rem; height: 2.5rem; margin: -1.25rem 0 0 -1.25rem; border-radius: 50%; border: 0.35rem solid rgba(13,110,253,0.25); border-top-color: rgba(13,110,253,0.8); animation: a4a-spin 0.7s linear infinite; z-index: 11; }
    @keyframes a4a-spin { to { transform: rotate(360deg); } }
    .a4a-stat-card { border: none; border-radius: 1.1rem; box-shadow: 0 18px 42px rgba(15, 23, 42, 0.08); }
    .a4a-stat-card .icon-circle { width: 2.6rem; height: 2.6rem; border-radius: 0.85rem; display: inline-flex; align-items: center; justify-content: center; }
    .a4a-empty { padding: 3rem 1rem; text-align: center; }
    .a4a-empty .icon-circle { width: 3.5rem; height: 3.5rem; border-radius: 1.1rem; margin: 0 auto 1rem; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; }
    .a4a-icon { display: inline-flex; align-items: center; justify-content: center; line-height: 0; }
    .a4a-icon svg { width: calc(var(--a4a-icon-scale) * 1em); height: calc(var(--a4a-icon-scale) * 1em); stroke: currentColor; stroke-width: 1.8; fill: none; stroke-linecap: round; stroke-linejoin: round; }
    .a4a-icon img { width: calc(var(--a4a-icon-scale) * 1em); height: calc(var(--a4a-icon-scale) * 1em); object-fit: contain; }
    .a4a-schedule-badge { display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.25rem 0.75rem; border-radius: 999px; font-size: 0.85rem; font-weight: 600; border: 1px solid transparent; background: rgba(0,0,0,0.05); }
    .a4a-schedule-badge .a4a-icon { font-size: 0.95em; }
    .a4a-schedule-badge--scheduled { background-color: var(--a4a-color-success-bg); color: var(--a4a-color-success); border-color: var(--a4a-color-success-border); }
    .a4a-schedule-badge--adhoc { background-color: var(--a4a-color-danger-bg); color: var(--a4a-color-danger); border-color: var(--a4a-color-danger-border); }
    .a4a-schedule-text--scheduled { color: var(--a4a-color-success); }
    .a4a-schedule-text--adhoc { color: var(--a4a-color-danger); }
    .a4a-xml-preview { max-height: 220px; overflow: auto; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; background: #f8f9fa; border-radius: 0.75rem; padding: 1rem; }
    .a4a-icon-setting-card { border: 1px solid rgba(0,0,0,0.1); border-radius: 0.9rem; padding: 1.1rem; display: flex; flex-direction: column; gap: 0.75rem; background-color: #ffffff; box-shadow: 0 12px 28px rgba(15,23,42,0.08); }
    .a4a-icon-setting-header { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap; }
    .a4a-icon-setting-actions { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
    .a4a-icon-preview { display: inline-flex; align-items: center; justify-content: center; width: 2.75rem; height: 2.75rem; border-radius: 0.85rem; background: rgba(0,0,0,0.05); }
    .a4a-icon-preview .a4a-icon { font-size: 1.5rem; }
    .a4a-icon-filename { font-size: 0.85rem; color: #6c757d; }
    .a4a-icon-picker-backdrop { position: fixed; inset: 0; background: rgba(33,37,41,0.5); display: none; align-items: center; justify-content: center; z-index: 1500; padding: 1.5rem; }
    .a4a-icon-picker-backdrop.is-active { display: flex; }
    .a4a-icon-picker { background: #ffffff; border-radius: 1rem; max-width: min(720px, 100%); width: 100%; box-shadow: 0 24px 60px rgba(15,23,42,0.22); padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; max-height: 90vh; }
    .a4a-icon-picker-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(88px, 1fr)); gap: 0.75rem; overflow: auto; padding: 0.25rem; border: 1px solid rgba(0,0,0,0.05); border-radius: 0.75rem; background: rgba(0,0,0,0.02); flex: 1; }
    .a4a-icon-picker-grid button { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; border: 1px solid rgba(0,0,0,0.1); border-radius: 0.75rem; padding: 0.75rem; background: #ffffff; cursor: pointer; transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease; text-align: center; }
    .a4a-icon-picker-grid button:hover { transform: translateY(-2px); border-color: var(--a4a-color-primary); box-shadow: 0 0.5rem 1.25rem rgba(13,110,253,0.15); }
    .a4a-icon-picker-grid button.is-selected { border-color: var(--a4a-color-primary); background: rgba(13,110,253,0.08); }
    .a4a-icon-picker-grid button .a4a-icon-picker-label { width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 0.8rem; color: #495057; }
    .a4a-icon-picker-empty { text-align: center; padding: 2rem 1rem; color: #6c757d; }
    .a4a-icon-picker-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
    .a4a-section { display: flex; flex-direction: column; gap: 2rem; }
    .a4a-page-header { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: 1.75rem; }
    .a4a-page-title { font-size: 2rem; font-weight: 600; letter-spacing: -0.02em; margin-bottom: 0.35rem; }
    .a4a-page-lead { max-width: 720px; font-size: 1rem; color: #475569; }
    .a4a-page-tag { font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.08em; color: rgba(15,23,42,0.6); display: inline-flex; align-items: center; gap: 0.4rem; font-weight: 600; }
    .a4a-header-actions { display: flex; align-items: center; gap: 1rem; }
    .a4a-header-actions .btn-lg { padding: 0.85rem 1.4rem; border-radius: 0.95rem; font-weight: 600; box-shadow: 0 12px 30px rgba(13,110,253,0.25); }
    .a4a-metric-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 1.5rem; }
    .a4a-stat-card { display: flex; align-items: center; gap: 1.25rem; padding: 1.4rem 1.6rem; border-radius: 1.3rem; background: linear-gradient(150deg, #ffffff 0%, #f4f7ff 100%); border: none; box-shadow: 0 22px 44px rgba(15,23,42,0.08); transition: transform 0.2s ease, box-shadow 0.2s ease; }
    .a4a-stat-card:hover { transform: translateY(-4px); box-shadow: 0 28px 55px rgba(15,23,42,0.12); }
    .a4a-stat-card__icon { width: 3rem; height: 3rem; border-radius: 0.95rem; display: inline-flex; align-items: center; justify-content: center; font-size: 1.35rem; background: rgba(13,110,253,0.12); color: #0d6efd; }
    .a4a-stat-card__label { display: block; font-size: 0.75rem; letter-spacing: 0.08em; text-transform: uppercase; color: rgba(15,23,42,0.55); font-weight: 600; }
    .a4a-stat-card__value { display: block; font-size: 2rem; font-weight: 600; letter-spacing: -0.02em; color: #0f172a; }
    .a4a-stat-card--green .a4a-stat-card__icon { background: rgba(25,135,84,0.14); color: #198754; }
    .a4a-stat-card--amber .a4a-stat-card__icon { background: rgba(255,193,7,0.18); color: #f59f0b; }
    .a4a-stat-card--cyan .a4a-stat-card__icon { background: rgba(13,202,240,0.18); color: #0dcaf0; }
    .a4a-content-grid { display: grid; grid-template-columns: minmax(0, 60%) minmax(0, 38%); gap: 2rem; align-items: start; }
    .a4a-content-grid__aside { display: flex; flex-direction: column; gap: 1.75rem; }
    .a4a-two-column { display: grid; grid-template-columns: minmax(0, 48%) minmax(0, 48%); gap: 2rem; align-items: start; }
    @media (max-width: 1280px) {
      .a4a-content-grid,
      .a4a-two-column { grid-template-columns: 1fr; }
      .a4a-content-grid__aside { flex-direction: column; }
    }
    .a4a-card { border: none; border-radius: 1.25rem; background: #ffffff; box-shadow: 0 16px 40px rgba(15,23,42,0.08); }
    .a4a-card-header { padding: 1.45rem 1.6rem; border-bottom: 1px solid rgba(148,163,184,0.2); display: flex; align-items: flex-start; justify-content: space-between; gap: 1.1rem; flex-wrap: wrap; }
    .a4a-card-body { padding: 1.5rem 1.6rem; }
    .a4a-card-footer { padding: 1.25rem 1.6rem; border-top: 1px solid rgba(148,163,184,0.2); background: rgba(248,249,252,0.65); display: flex; flex-wrap: wrap; gap: 0.75rem; justify-content: flex-end; }
    .a4a-card-title { font-size: 1.125rem; font-weight: 600; margin-bottom: 0.25rem; }
    .a4a-card-subtitle { font-size: 0.9rem; color: #6c757d; margin-bottom: 0; }
    .a4a-table-card .table { margin: 0; font-size: 0.95rem; }
    .a4a-table-card .table thead th { border-bottom: 1px solid rgba(148,163,184,0.25); text-transform: uppercase; font-size: 0.7rem; letter-spacing: 0.08em; color: rgba(15,23,42,0.6); background: transparent; }
    .a4a-table-card .table tbody tr { transition: background 0.2s ease, transform 0.2s ease; }
    .a4a-table-card .table tbody tr:hover { background: rgba(13,110,253,0.06); }
    .a4a-table-card .table tbody tr.table-active { background: rgba(13,110,253,0.12); box-shadow: inset 3px 0 0 #0d6efd; }
    .a4a-table-card .btn-group .btn { border-radius: 0.65rem; }
    .a4a-scroll { max-height: 420px; overflow: auto; }
    .a4a-pill { display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.45rem 0.85rem; border-radius: 999px; font-size: 0.85rem; font-weight: 600; border: 1px solid transparent; background: rgba(15,23,42,0.05); color: #0f172a; }
    .a4a-pill svg { width: 1rem; height: 1rem; }
    .a4a-pill--success { background: rgba(25,135,84,0.12); color: #198754; border-color: rgba(25,135,84,0.22); }
    .a4a-pill--warning { background: rgba(255,193,7,0.18); color: #b7791f; border-color: rgba(255,193,7,0.32); }
    .a4a-pill--muted { background: rgba(148,163,184,0.16); color: #475569; border-color: rgba(148,163,184,0.22); }
    .a4a-detail-list { display: flex; flex-direction: column; gap: 1.25rem; }
    .a4a-detail-label { display: block; font-size: 0.75rem; letter-spacing: 0.08em; text-transform: uppercase; font-weight: 600; color: rgba(15,23,42,0.55); margin-bottom: 0.25rem; }
    .a4a-detail-value { font-weight: 600; color: #0f172a; }
    .a4a-detail-note { color: #6c757d; font-size: 0.9rem; }
    .a4a-code-block { background: rgba(15,23,42,0.05); border-radius: 0.85rem; padding: 1rem; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; white-space: pre-wrap; word-break: break-word; color: #0f172a; }
    .a4a-timeline { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 1rem; }
    .a4a-timeline-item { display: flex; justify-content: space-between; gap: 1rem; padding: 0.75rem 0; border-bottom: 1px solid rgba(148,163,184,0.18); }
    .a4a-timeline-item:last-child { border-bottom: none; }
    .a4a-timeline-info { display: flex; flex-direction: column; gap: 0.35rem; min-width: 0; }
    .a4a-timeline-meta { min-width: 120px; }
    .a4a-form-help { font-size: 0.85rem; color: #6c757d; }
    .a4a-card-body .form-label { font-weight: 600; color: #0f172a; }
    .a4a-card-body .form-control,
    .a4a-card-body .form-select { border-radius: 0.85rem; padding: 0.65rem 0.85rem; border-color: rgba(148,163,184,0.35); transition: border-color 0.2s ease, box-shadow 0.2s ease; }
    .a4a-card-body .form-control:focus,
    .a4a-card-body .form-select:focus { border-color: rgba(13,110,253,0.65); box-shadow: 0 0 0 0.2rem rgba(13,110,253,0.12); }
    .a4a-categories-grid { display: grid; grid-template-columns: minmax(0, 70%) minmax(0, 28%); gap: 2rem; align-items: start; }
    .a4a-categories-grid__library,
    .a4a-categories-grid__form { min-width: 0; }
    @media (max-width: 1200px) {
      .a4a-categories-grid { grid-template-columns: 1fr; gap: 1.75rem; }
    }
    .a4a-debug-grid { display: grid; grid-template-columns: minmax(0, 70%) minmax(0, 28%); gap: 2rem; align-items: start; }
    @media (max-width: 1280px) {
      .a4a-debug-grid { grid-template-columns: 1fr; gap: 1.75rem; }
    }
    .a4a-debug-log { background: #0f172a; color: #e2e8f0; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; border-radius: 0.85rem; padding: 1.25rem; min-height: 320px; max-height: 520px; overflow: auto; white-space: pre-wrap; word-break: break-word; box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.2); }
    .a4a-debug-toolbar { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .a4a-debug-meta { font-size: 0.85rem; color: #6c757d; }
    .a4a-categories-grid .card,
    .a4a-debug-grid .card { width: 100%; min-width: 100%; height: 100%; }
    .a4a-adminlte {
      display: grid;
      grid-template-columns: 240px minmax(0, 1fr);
      grid-template-rows: auto minmax(0, 1fr) auto;
      min-height: calc(100vh - 32px);
      background: #f4f6f9;
      color: #1f2d3d;
      position: relative;
    }
    .a4a-adminlte .main-sidebar {
      grid-row: 1 / span 3;
      grid-column: 1;
      background: #1f2d3d;
      color: #c2c7d0;
      padding-bottom: 2rem;
      position: relative;
      z-index: 1010;
    }
    .a4a-adminlte .main-header,
    .a4a-adminlte .content-wrapper,
    .a4a-adminlte .main-footer {
      grid-column: 2;
    }
    .a4a-adminlte .main-header {
      background: #ffffff;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.08);
      position: sticky;
      top: 0;
      z-index: 1020;
      padding: 0 1.5rem;
      min-height: 60px;
      display: flex;
      align-items: center;
    }
    .a4a-adminlte .navbar-content {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
    }
    .a4a-adminlte .navbar-brand {
      font-weight: 600;
      font-size: 1.05rem;
      margin-bottom: 0;
    }
    .a4a-adminlte .navbar-content .btn-link {
      padding: 0.4rem 0.55rem;
      border-radius: 0.6rem;
      transition: background 0.2s ease, color 0.2s ease;
      color: #6c757d;
    }
    .a4a-adminlte .navbar-content .btn-link:hover {
      background: rgba(13,110,253,0.12);
      color: #0d6efd;
    }
    .a4a-adminlte .content-wrapper {
      padding: 2rem 2.25rem;
      background: #f4f6f9;
    }
    .a4a-adminlte .card {
      width: 100%;
      min-width: 100%;
      display: flex;
      flex-direction: column;
    }
    .a4a-adminlte .display-6 {
      font-size: clamp(1.75rem, 1.75rem + 0.5vw, 2rem);
      letter-spacing: -0.015em;
    }
    .a4a-adminlte .content-header {
      padding-bottom: 0.25rem;
      margin-bottom: 1.5rem;
      border-bottom: 1px solid rgba(15,23,42,0.08);
    }
    .a4a-adminlte .content-header h1 {
      font-weight: 600;
    }
    .a4a-adminlte .breadcrumb {
      background: transparent;
      margin-bottom: 0;
    }
    .a4a-adminlte .main-footer {
      padding: 1.75rem 2.25rem;
      background: transparent;
      border-top: 0;
      color: #6c757d;
    }
    .a4a-adminlte .brand-link {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      font-weight: 600;
      font-size: 1.15rem;
      color: #ffffff;
      background: rgba(255,255,255,0.05);
      margin: 0 1rem 1.5rem;
      border-radius: 0.75rem;
      padding: 1rem 1.25rem;
    }
    .a4a-adminlte .brand-link:hover {
      color: #ffffff;
      text-decoration: none;
      background: rgba(255,255,255,0.12);
    }
    .a4a-adminlte .nav-sidebar {
      padding: 0.25rem 0;
    }
    .a4a-adminlte .nav-sidebar .nav-link {
      border-radius: 0.65rem;
      margin: 0.2rem 0.75rem;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      color: #c2c7d0;
      transition: background 0.2s ease, color 0.2s ease, transform 0.2s ease;
    }
    .a4a-adminlte .nav-sidebar .nav-link .a4a-nav-icon {
      width: 2.35rem;
      height: 2.35rem;
      border-radius: 0.75rem;
      background: rgba(255,255,255,0.08);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: inherit;
      transition: background 0.2s ease, color 0.2s ease;
    }
    .a4a-adminlte .nav-sidebar .nav-link:hover {
      background: rgba(255,255,255,0.08);
      color: #ffffff;
      transform: translateX(4px);
    }
    .a4a-adminlte .nav-sidebar .nav-link.active {
      background: linear-gradient(90deg, rgba(13,110,253,0.95), rgba(13,110,253,0.75));
      color: #ffffff;
      box-shadow: 0 18px 30px rgba(13,110,253,0.35);
    }
    .a4a-adminlte .nav-sidebar .nav-link.active .a4a-nav-icon {
      background: #ffffff;
      color: #0d6efd;
    }
    .a4a-adminlte .nav-sidebar .nav-link-title {
      flex: 1;
    }
    .a4a-adminlte .badge.text-bg-primary-subtle {
      background: rgba(13,110,253,0.12);
      color: #0d6efd;
    }
    @media (max-width: 992px) {
      .a4a-adminlte {
        grid-template-columns: minmax(0, 1fr);
        grid-template-rows: auto auto 1fr auto;
      }
      .a4a-adminlte .main-sidebar {
        grid-column: 1 / -1;
        grid-row: 2;
        display: none;
        margin: 0 1rem;
        border-radius: 1rem;
      }
      .a4a-adminlte .main-sidebar.is-open {
        display: block;
      }
      .a4a-adminlte .main-header,
      .a4a-adminlte .content-wrapper,
      .a4a-adminlte .main-footer {
        grid-column: 1 / -1;
      }
    }
  `;
  root.classList.add('a4a-ai-root');

  let themeStyle = head.querySelector('style#a4a-ai-theme-style');
  if (!themeStyle) {
    themeStyle = document.createElement('style');
    themeStyle.id = 'a4a-ai-theme-style';
    head.appendChild(themeStyle);
  }

  let adminLTEActivated = false;

  function activateAdminLTE() {
    if (adminLTEActivated) {
      return;
    }

    const adminlte = globalThis.adminlte;
    if (!adminlte || typeof adminlte !== 'object') {
      return;
    }

    try {
      if (typeof adminlte.Layout === 'function') {
        const layout = new adminlte.Layout(document.body);
        if (layout && typeof layout.holdTransition === 'function') {
          layout.holdTransition();
        }
      }

      if (typeof adminlte.initAccessibility === 'function') {
        adminlte.initAccessibility({
          announcements: true,
          skipLinks: true,
          focusManagement: true,
          keyboardNavigation: true,
          reducedMotion: true,
        });
      }
    } catch (error) {
      console.warn('axs4all - AI: AdminLTE initialisation warning', error);
    }

    adminLTEActivated = true;
  }

  function renderNavItems(activeView) {
    const entries = [
      { key: 'urls', label: 'URL Hub', icon: 'link' },
      { key: 'clients', label: 'Clients', icon: 'list' },
      { key: 'categories', label: 'Categories', icon: 'sparkles' },
      { key: 'settings', label: 'Settings', icon: 'settings' },
      { key: 'debug', label: 'Diagnostics', icon: 'bug' }
    ];
    return entries
      .map((entry) => {
        const isActive = entry.key === activeView;
        return `
          <li class="nav-item">
            <a href="#" class="nav-link${isActive ? ' active' : ''}" data-view="${entry.key}">
              <span class="a4a-nav-icon">${icon(entry.icon)}</span>
              <span class="nav-link-title">${entry.label}</span>
            </a>
          </li>
        `;
      })
      .join('');
  }

  function renderAdminLTEPage({ viewKey, title, subtitle = '', contentClass = '' }) {
    const wrapper = document.createElement('div');
    wrapper.className = 'wrapper a4a-adminlte';
    const versionLabel = typeof config.version === 'string' ? config.version.trim() : '';
    const year = new Date().getFullYear();
    wrapper.innerHTML = `
      <nav class="main-header navbar navbar-expand navbar-white navbar-light border-bottom">
        <div class="navbar-content">
          <div class="d-flex align-items-center gap-2">
            <button class="btn btn-link text-decoration-none" data-widget="pushmenu" type="button" aria-label="Toggle navigation">
              ${icon('menu')}
            </button>
            <span class="navbar-brand text-body">axs4all Intelligence</span>
          </div>
          <div class="d-flex align-items-center gap-3 small text-muted">
            ${versionLabel ? `<span class="fw-semibold text-uppercase">v${escapeHtml(versionLabel)}</span>` : ''}
            <span class="badge rounded-pill text-bg-primary-subtle text-uppercase">Admin</span>
          </div>
        </div>
      </nav>
      <aside class="main-sidebar sidebar-dark-primary elevation-4">
        <a href="#" class="brand-link text-decoration-none">
          <span class="a4a-nav-icon">${icon('robot')}</span>
          <span class="brand-text fw-semibold">axs4all AI</span>
        </a>
        <div class="sidebar">
          <nav class="mt-2">
            <ul class="nav nav-pills nav-sidebar flex-column" data-widget="treeview" role="menu">
              ${renderNavItems(viewKey)}
            </ul>
          </nav>
        </div>
      </aside>
      <div class="content-wrapper">
        <div class="content-header">
          <div class="container-fluid">
            <div class="row mb-2">
              <div class="col-sm-6">
                <h1 class="m-0">${title}</h1>
                ${subtitle ? `<p class="text-muted mb-0">${subtitle}</p>` : ''}
              </div>
              <div class="col-sm-6">
                <ol class="breadcrumb float-sm-right">
                  <li class="breadcrumb-item"><a href="#" data-view="urls">Dashboard</a></li>
                  <li class="breadcrumb-item active text-capitalize">${viewKey}</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
        <section class="content">
          <div class="container-fluid ${contentClass}" data-content-slot></div>
        </section>
      </div>
      <footer class="main-footer text-sm">
        <strong>&copy; ${year} axs4all.</strong>
        <div class="float-end d-none d-sm-inline">AI Crawl Manager</div>
      </footer>
    `;
    root.appendChild(wrapper);
    activateAdminLTE();
    const toggleButton = wrapper.querySelector('[data-widget="pushmenu"]');
    return {
      wrapper,
      content: wrapper.querySelector('[data-content-slot]'),
      navLinks: wrapper.querySelectorAll('[data-view]'),
      toggleButton: wrapper.querySelector('[data-widget="pushmenu"]'),
      sidebar: wrapper.querySelector('.main-sidebar')
    };
  }

  function bindNavigation(links, onNavigate, toggleButton, sidebar) {
    if (toggleButton && sidebar) {
      toggleButton.addEventListener('click', (event) => {
        event.preventDefault();
        const isOpen = sidebar.classList.toggle('is-open');
        toggleButton.setAttribute('aria-expanded', String(isOpen));
      });
    }

    links.forEach((link) => {
      link.addEventListener('click', (event) => {
        event.preventDefault();
        const target = link.getAttribute('data-view');
        if (!target || typeof onNavigate !== 'function') {
          return;
        }
        if (sidebar && sidebar.classList.contains('is-open')) {
          sidebar.classList.remove('is-open');
          if (toggleButton) {
            toggleButton.setAttribute('aria-expanded', 'false');
          }
        }
        onNavigate(target);
      });
    });
  }

  const ICONS = Object.assign(Object.create(null), {
    plus: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 5v14"/><path d="M5 12h14"/></svg>`,
    list: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M4 6h9"/><path d="M4 12h9"/><path d="M4 18h9"/><polyline points="15 8 17 10 21 6"/><polyline points="15 14 17 16 21 12"/></svg>`,
    clock: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="7"/><path d="M12 8v4l2.5 2.5"/></svg>`,
    refresh: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M21 11a8 8 0 0 0-14.31-4.69L5 8"/><path d="M3 13a8 8 0 0 0 14.31 4.69L19 16"/><path d="M5 8h4V4"/><path d="M19 16h-4v4"/></svg>`,
    robot: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect x="5" y="7" width="14" height="12" rx="2"/><path d="M12 7V4"/><circle cx="9" cy="13" r="1.5" fill="currentColor" stroke="none"/><circle cx="15" cy="13" r="1.5" fill="currentColor" stroke="none"/><path d="M8 17h8"/></svg>`,
    sparkles: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z"/><path d="M5 15l.8 2.2L8 18l-2.2.8L5 21l-.8-2.2L2 18l2.2-.8z"/><path d="M19 12l.6 1.6L21 14l-1.4.4L19 16l-.6-1.6L17 14l1.4-.4z"/></svg>`,
    pencil: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M4 20l3.6-.9 10-10a1.8 1.8 0 0 0-2.6-2.6l-10 10L4 20z"/><path d="M14.8 6.2l3 3"/></svg>`,
    clipboard: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect x="6.5" y="6" width="11" height="14" rx="2"/><path d="M9 6V4h6v2"/><path d="M10 11h6"/><path d="M10 15h6"/></svg>`,
    trash: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M5 7h14"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 7V5h6v2"/><path d="M8 7l1 12a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2l1-12"/></svg>`,
    link: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M9 7H7a4 4 0 0 0 0 8h2"/><path d="M15 9h2a4 4 0 0 1 0 8h-2"/><path d="M9 12h6"/></svg>`,
    calendar: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect x="4" y="6" width="16" height="14" rx="2"/><path d="M8 3v4"/><path d="M16 3v4"/><path d="M4 11h16"/></svg>`,
    save: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 3v12"/><path d="M8 11l4 4 4-4"/><path d="M5 19h14"/></svg>`,
    eraser: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M6 18l-2-2 9-9a2 2 0 0 1 2.8 0l3.2 3.2a2 2 0 0 1 0 2.8l-7 7H6"/><path d="M3 16h7"/></svg>`,
    code: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M8 7l-4 5 4 5"/><path d="M16 7l4 5-4 5"/></svg>`,
    close: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M6 6l12 12"/><path d="M6 18L18 6"/></svg>`,
    copy: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect x="9" y="9" width="10" height="12" rx="2"/><path d="M5 13V7a2 2 0 0 1 2-2h6"/></svg>`,
    circle: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/></svg>`,
    search: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="11" cy="11" r="6"/><path d="m20 20-3-3"/></svg>`,
    bug: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M8 2v3"/><path d="M16 2v3"/><path d="M3 13h4"/><path d="M17 13h4"/><path d="M4 7l3 2"/><path d="M20 7l-3 2"/><path d="M10 9h4"/><path d="M10 13h4"/><path d="M10 17h4"/><path d="M6 15v-2a6 6 0 0 1 12 0v2a6 6 0 0 1-12 0Z"/></svg>`,
    menu: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg>`,
    settings: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`
  });

  const ICON_KEYS = Object.freeze(Object.keys(ICONS));
  const ICON_METADATA = Object.freeze({
    plus: { label: 'Add Item', usage: 'Used for new client and URL buttons.' },
    list: { label: 'Listing', usage: 'Used within list headers.' },
    clock: { label: 'Schedule', usage: 'Used for schedule displays.' },
    refresh: { label: 'Run / Refresh', usage: 'Used for run and refresh actions.' },
    robot: { label: 'Assistant', usage: 'Used in AI helper messaging.' },
    sparkles: { label: 'Highlights', usage: 'Used for emphasis icons.' },
    pencil: { label: 'Edit', usage: 'Used for edit actions.' },
    clipboard: { label: 'Copy', usage: 'Used for clipboard or copy prompts.' },
    trash: { label: 'Delete', usage: 'Used for delete actions.' },
    link: { label: 'Link', usage: 'Used for URL references.' },
    calendar: { label: 'Calendar', usage: 'Used for scheduling fields.' },
    save: { label: 'Save', usage: 'Used for save buttons.' },
    eraser: { label: 'Reset', usage: 'Used for reset buttons.' },
    code: { label: 'Code', usage: 'Used in code view toggles.' },
    close: { label: 'Close', usage: 'Used for close buttons.' },
    copy: { label: 'Duplicate', usage: 'Used for duplicate or copy actions.' },
    circle: { label: 'Default', usage: 'Fallback icon if no icon is found.' },
    search: { label: 'Search', usage: 'Used for search inputs or filters.' },
    menu: { label: 'Navigation', usage: 'Used for sidebar toggle buttons.' },
    settings: { label: 'Settings', usage: 'Used for configuration or preferences actions.' },
    bug: { label: 'Diagnostics', usage: 'Used for debug or troubleshooting sections.' }
  });

  const STORAGE_KEY = 'a4a-ai-settings';
  const DEFAULT_SETTINGS = Object.freeze({
    primaryColor: '#0d6efd',
    successColor: '#198754',
    dangerColor: '#dc3545',
    iconScale: 1,
    iconOverrides: Object.freeze({})
  });

  function normalizeHex(value) {
    if (typeof value !== 'string') {
      return null;
    }
    let hex = value.trim();
    if (!hex) {
      return null;
    }
    if (hex.startsWith('#')) {
      hex = hex.slice(1);
    }
    if (hex.length === 3) {
      hex = hex.split('').map((ch) => ch + ch).join('');
    }
    if (hex.length !== 6 || !/^[0-9a-fA-F]{6}$/.test(hex)) {
      return null;
    }
    return `#${hex.toLowerCase()}`;
  }

  function hexToRgb(hex) {
    const normalized = normalizeHex(hex);
    if (!normalized) {
      return null;
    }
    const value = parseInt(normalized.slice(1), 16);
    return {
      r: (value >> 16) & 255,
      g: (value >> 8) & 255,
      b: value & 255,
      hex: normalized
    };
  }

  function hexToRgba(hex, alpha) {
    const rgb = hexToRgb(hex);
    if (!rgb) {
      return `rgba(0, 0, 0, ${typeof alpha === 'number' ? alpha : 1})`;
    }
    const a = typeof alpha === 'number' ? Math.min(1, Math.max(0, alpha)) : 1;
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${a})`;
  }

  function shadeColor(hex, percent) {
    const rgb = hexToRgb(hex);
    if (!rgb) {
      return hex;
    }
    const ratio = Math.max(-1, Math.min(1, percent));
    const adjust = (channel) => {
      if (ratio < 0) {
        return Math.round(channel * (1 + ratio));
      }
      return Math.round(channel + (255 - channel) * ratio);
    };
    const r = adjust(rgb.r);
    const g = adjust(rgb.g);
    const b = adjust(rgb.b);
    return `rgb(${r}, ${g}, ${b})`;
  }

  function clampIconScale(value) {
    const num = Number(value);
    if (!Number.isFinite(num)) {
      return DEFAULT_SETTINGS.iconScale;
    }
    return Math.min(1.75, Math.max(0.75, Number(num.toFixed(2))));
  }

  function sanitizeIconUrl(value) {
    if (typeof value !== 'string') {
      return null;
    }
    const trimmed = value.trim();
    if (!trimmed || trimmed.length > 500) {
      return null;
    }
    if (/[<>'"]/.test(trimmed)) {
      return null;
    }
    if (!trimmed.endsWith('.svg')) {
      return null;
    }
    if (!trimmed.includes('/wp-content/uploads/fa_icons/')) {
      return null;
    }
    return trimmed;
  }

  function sanitizeIconOverrides(overrides) {
    const sanitized = {};
    if (!overrides || typeof overrides !== 'object') {
      return sanitized;
    }
    ICON_KEYS.forEach((key) => {
      const value = sanitizeIconUrl(overrides[key]);
      if (value) {
        sanitized[key] = value;
      }
    });
    return sanitized;
  }

  function loadSettings() {
    const settings = { ...DEFAULT_SETTINGS, iconOverrides: {} };
    try {
      if (typeof window.localStorage === 'undefined') {
        return settings;
      }
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        return settings;
      }
      let cleaned =
        typeof stored === 'string'
          ? stored.replace(/[\uFEFF\u200B\u200C\u200D\u2060]+/gu, '')
          : stored;
      if (typeof cleaned === 'string') {
        cleaned = cleaned.trim();
        if (cleaned.startsWith("'") && cleaned.endsWith("'")) {
          cleaned = cleaned.slice(1, -1).trim();
        }
        cleaned = cleaned.replace(/\\'/g, "'").replace(/\\"/g, '"');
      }
      if (!cleaned) {
        if (typeof window.localStorage !== 'undefined') {
          window.localStorage.removeItem(STORAGE_KEY);
        }
        return settings;
      }
      const parsed = JSON.parse(cleaned);
      if (parsed && typeof parsed === 'object') {
        if (normalizeHex(parsed.primaryColor)) {
          settings.primaryColor = normalizeHex(parsed.primaryColor);
        }
        if (normalizeHex(parsed.successColor)) {
          settings.successColor = normalizeHex(parsed.successColor);
        }
        if (normalizeHex(parsed.dangerColor)) {
          settings.dangerColor = normalizeHex(parsed.dangerColor);
        }
        if (parsed.iconScale !== undefined) {
          settings.iconScale = clampIconScale(parsed.iconScale);
        }
        if (parsed.iconOverrides) {
          settings.iconOverrides = sanitizeIconOverrides(parsed.iconOverrides);
        }
    }
    } catch (error) {
      if (typeof window.localStorage !== 'undefined') {
        try {
          window.localStorage.removeItem(STORAGE_KEY);
        } catch {
          // Ignore failure to clear corrupted storage.
        }
      }
    }
    return settings;
  }

  function saveSettings(settings) {
    try {
      if (typeof window.localStorage === 'undefined') {
        return;
      }
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.warn('axs4all - AI: unable to persist settings.', error);
    }
  }

  function applySettingsToTheme(settings) {
    const primary = normalizeHex(settings.primaryColor) || DEFAULT_SETTINGS.primaryColor;
    const success = normalizeHex(settings.successColor) || DEFAULT_SETTINGS.successColor;
    const danger = normalizeHex(settings.dangerColor) || DEFAULT_SETTINGS.dangerColor;
    const iconScale = clampIconScale(settings.iconScale);
    const iconOverrides = sanitizeIconOverrides(settings.iconOverrides);

    const primaryHover = shadeColor(primary, -0.1);
    const primaryActive = shadeColor(primary, -0.2);
    const outlinePrimaryBg = hexToRgba(primary, 0.12);
    const outlineDangerBg = hexToRgba(danger, 0.12);

    themeStyle.textContent = `
      #a4a-ai-root {
        --a4a-color-primary: ${primary};
        --a4a-color-success: ${success};
        --a4a-color-danger: ${danger};
        --a4a-color-success-bg: ${hexToRgba(success, 0.12)};
        --a4a-color-success-border: ${hexToRgba(success, 0.35)};
        --a4a-color-danger-bg: ${hexToRgba(danger, 0.12)};
        --a4a-color-danger-border: ${hexToRgba(danger, 0.35)};
        --a4a-icon-scale: ${iconScale};
      }
      .btn-primary,
      .btn-primary:focus,
      .btn-primary:active {
        background-color: ${primary};
        border-color: ${primary};
      }
      .btn-primary:hover {
        background-color: ${primaryHover};
        border-color: ${primaryHover};
      }
      .btn-primary:active {
        background-color: ${primaryActive};
        border-color: ${primaryActive};
      }
      .btn-outline-primary {
        color: ${primary};
        border-color: ${primary};
      }
      .btn-outline-primary:hover,
      .btn-outline-primary:focus,
      .btn-outline-primary:active {
        background-color: ${outlinePrimaryBg};
        border-color: ${primary};
        color: ${primary};
      }
      .btn-outline-danger {
        color: ${danger};
        border-color: ${danger};
      }
      .btn-outline-danger:hover,
      .btn-outline-danger:focus,
      .btn-outline-danger:active {
        background-color: ${outlineDangerBg};
        border-color: ${danger};
        color: ${danger};
      }
      .btn-outline-secondary:hover,
      .btn-outline-secondary:focus,
      .btn-outline-secondary:active {
        color: ${primary};
        border-color: ${primary};
      }
      .badge.text-bg-primary {
        background-color: ${outlinePrimaryBg};
        color: ${primary};
      }
      .a4a-schedule-badge--scheduled {
        background-color: ${hexToRgba(success, 0.12)};
        border-color: ${hexToRgba(success, 0.35)};
        color: ${success};
      }
      .a4a-schedule-badge--adhoc {
        background-color: ${hexToRgba(danger, 0.12)};
        border-color: ${hexToRgba(danger, 0.35)};
        color: ${danger};
      }
      .a4a-schedule-text--scheduled,
      .text-success {
        color: ${success} !important;
      }
      .a4a-schedule-text--adhoc,
      .text-danger {
        color: ${danger} !important;
      }
    `;

    return {
      primaryColor: primary,
      successColor: success,
      dangerColor: danger,
      iconScale,
      iconOverrides
    };
  }

  const settingsState = {
    value: (() => {
      const initial = loadSettings();
      const sanitized = applySettingsToTheme(initial);
      if (JSON.stringify(initial) !== JSON.stringify(sanitized)) {
        saveSettings(sanitized);
      }
      return sanitized;
    })()
  };

  function updateSettingsState(partial) {
    const merged = {
      ...settingsState.value,
      ...partial,
      iconOverrides:
        partial && Object.prototype.hasOwnProperty.call(partial, 'iconOverrides')
          ? { ...(partial.iconOverrides || {}) }
          : { ...(settingsState.value.iconOverrides || {}) }
    };
    const sanitized = applySettingsToTheme(merged);
    settingsState.value = sanitized;
    saveSettings(sanitized);
    return sanitized;
  }

  function resetSettingsState() {
    return updateSettingsState({ ...DEFAULT_SETTINGS, iconOverrides: {} });
  }

  function icon(name, extraClass = '') {
    const overrides = settingsState.value && settingsState.value.iconOverrides ? settingsState.value.iconOverrides : null;
    const overrideUrl = overrides && overrides[name] ? sanitizeIconUrl(overrides[name]) : null;
    const extra = extraClass ? ' ' + extraClass : '';
    if (overrideUrl) {
      return `<span class="a4a-icon${extra}" aria-hidden="true"><img src="${escapeHtml(overrideUrl)}" alt="" loading="lazy" decoding="async" /></span>`;
    }
    const svg = ICONS[name] || ICONS.circle;
    return `<span class="a4a-icon${extra}" aria-hidden="true">${svg}</span>`;
  }

  async function request(method, url, payload) {
    const options = {
      method,
      headers: { 'X-WP-Nonce': config.nonce }
    };
    if (payload !== undefined) {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(payload);
    }
    const response = await fetch(url, options);
    if (!response.ok) {
      let message = `Request failed with status ${response.status}`;
      try {
        const errorData = await response.json();
        if (errorData && errorData.message) {
          message = errorData.message;
        }
      } catch (error) {
        // ignore parsing issues
      }
      throw new Error(message);
    }
    return response.status === 204 ? null : response.json();
  }

  const defaultView = String(
    (host.getAttribute('data-default-view') || config.defaultView || 'urls')
  ).toLowerCase();

  let currentView = defaultView;

  function initClients() {
    const baseClientsUrl = config.clientsRestUrl ? config.clientsRestUrl.replace(/\/$/, '') : '';
    const baseUrlsUrl = config.restUrl ? config.restUrl.replace(/\/$/, '') : '';

    const layout = renderAdminLTEPage({
      viewKey: 'clients',
      title: 'Clients',
      subtitle: 'Manage organisations, metadata, and crawl targets.'
    });
    bindNavigation(layout.navLinks, loadView, layout.toggleButton, layout.sidebar);

    if (!baseClientsUrl) {
      layout.content.innerHTML = `
        <div class="row">
          <div class="col-12">
            <div class="alert alert-danger" role="alert">Clients endpoint not available.</div>
          </div>
        </div>
      `;
      return;
    }

    layout.content.innerHTML = `
      <div class="row g-4">
        <div class="col-12">
          <div id="a4a-clients-notice" class="alert d-none" role="alert"></div>
        </div>
        <div class="col-12">
          <div class="d-flex flex-wrap justify-content-between align-items-center gap-3">
            <p class="text-muted mb-0">Select a client to manage details and orchestrate URL crawls.</p>
            <div class="d-flex flex-wrap gap-2">
              <button class="btn btn-outline-secondary" type="button" data-action="refresh">${icon('refresh', 'me-1')}Refresh</button>
              <button class="btn btn-primary" type="button" data-action="new">${icon('plus', 'me-1')}New Client</button>
            </div>
          </div>
        </div>
        <div class="col-12 col-xl-4">
          <div class="card h-100 shadow-sm">
            <div class="card-body">
              <label class="form-label" for="a4a-client-select">Select client</label>
              <select class="form-select mb-3" id="a4a-client-select"></select>
              <form id="a4a-client-form" class="vstack gap-3">
                <input type="hidden" id="a4a-client-id" />
                <div>
                  <label class="form-label" for="a4a-client-name">Name <span class="text-danger">*</span></label>
                  <input type="text" class="form-control" id="a4a-client-name" placeholder="Client name" required />
                </div>
                <div>
                  <label class="form-label" for="a4a-client-notes">Notes</label>
                  <textarea class="form-control" id="a4a-client-notes" rows="3" placeholder="Optional notes, goals, or contacts"></textarea>
                </div>
                <div>
                  <label class="form-label d-block">Categories</label>
                  <div id="a4a-client-categories" class="vstack gap-2 border rounded p-3 bg-body-secondary"></div>
                  <div class="form-text">Tick the categories this client cares about during crawls.</div>
                </div>
                <div class="d-flex flex-wrap gap-2 justify-content-end">
                  <button type="button" class="btn btn-outline-secondary" id="a4a-client-reset">${icon('eraser', 'me-1')}Reset</button>
                  <button type="button" class="btn btn-outline-danger d-none" id="a4a-client-delete">${icon('trash', 'me-1')}Delete</button>
                  <button type="submit" class="btn btn-primary" id="a4a-client-save">${icon('save', 'me-1')}Save client</button>
                </div>
              </form>
            </div>
          </div>
        </div>
        <div class="col-12 col-xl-8">
          <div class="card shadow-sm mb-4">
            <div class="card-header d-flex justify-content-between align-items-center">
              <h2 class="h5 mb-0">Client URLs</h2>
              <button class="btn btn-outline-primary btn-sm" type="button" id="a4a-client-url-new">${icon('plus', 'me-1')}New URL</button>
            </div>
            <div class="card-body">
              <div class="table-responsive mb-3">
                <table class="table table-hover align-middle mb-0">
                  <thead class="table-light">
                    <tr>
                      <th>URL</th>
                      <th style="width: 140px;">Schedule</th>
                      <th style="width: 160px;">Updated</th>
                      <th class="text-end" style="width: 170px;">Actions</th>
                    </tr>
                  </thead>
                  <tbody id="a4a-client-urls-body">
                    <tr><td colspan="4" class="text-center text-muted py-3">Select a client to view URLs.</td></tr>
                  </tbody>
                </table>
              </div>
              <div class="a4a-empty d-none" id="a4a-client-urls-empty">
                <div class="icon-circle bg-primary-subtle text-primary">${icon('sparkles')}</div>
                <h3 class="h5">No URLs yet</h3>
                <p class="text-muted">Create URLs for this client to orchestrate AI crawls.</p>
                <button class="btn btn-primary" type="button" data-action="new-url">${icon('plus', 'me-1')}Add URL</button>
              </div>
              <form id="a4a-client-url-form" class="row g-3">
                <input type="hidden" id="a4a-client-url-id" />
                <div class="col-12">
                  <label class="form-label" for="a4a-client-url">Target URL <span class="text-danger">*</span></label>
                  <input type="url" class="form-control" id="a4a-client-url" required placeholder="https://example.com/page" />
                </div>
                <div class="col-md-6">
                  <label class="form-label" for="a4a-client-url-schedule">Schedule</label>
                  <input type="text" class="form-control" id="a4a-client-url-schedule" placeholder="e.g. Weekly" />
                </div>
                <div class="col-md-6">
                  <label class="form-label" for="a4a-client-url-description">Description</label>
                  <input type="text" class="form-control" id="a4a-client-url-description" placeholder="Optional short note" />
                </div>
                <div class="col-12">
                  <label class="form-label" for="a4a-client-url-prompt">AI Prompt</label>
                  <textarea class="form-control" id="a4a-client-url-prompt" rows="3" placeholder="Optional AI instructions"></textarea>
                </div>
                <div class="col-12">
                  <label class="form-label" for="a4a-client-url-returned">Returned Data (XML)</label>
                  <textarea class="form-control" id="a4a-client-url-returned" rows="4" placeholder="<results>...</results>"></textarea>
                </div>
                <div class="col-12 d-flex flex-wrap gap-2 justify-content-end">
                  <button type="button" class="btn btn-outline-secondary" id="a4a-client-url-reset">${icon('eraser')}</button>
                  <button type="button" class="btn btn-outline-danger d-none" id="a4a-client-url-delete">${icon('trash')}</button>
                  <button type="button" class="btn btn-outline-success d-none" id="a4a-client-url-run">${icon('refresh')}</button>
                  <button type="submit" class="btn btn-primary" id="a4a-client-url-save">${icon('save', 'me-1')}Save URL</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    `;

    const app = layout.wrapper;

    const els = {
      notice: app.querySelector('#a4a-clients-notice'),
      select: app.querySelector('#a4a-client-select'),
      refresh: app.querySelector('[data-action="refresh"]'),
      newClient: app.querySelector('[data-action="new"]'),
      clientForm: app.querySelector('#a4a-client-form'),
      clientId: app.querySelector('#a4a-client-id'),
      clientName: app.querySelector('#a4a-client-name'),
      clientNotes: app.querySelector('#a4a-client-notes'),
      categoriesContainer: app.querySelector('#a4a-client-categories'),
      clientSave: app.querySelector('#a4a-client-save'),
      clientReset: app.querySelector('#a4a-client-reset'),
      clientDelete: app.querySelector('#a4a-client-delete'),
      urlsBody: app.querySelector('#a4a-client-urls-body'),
      urlForm: app.querySelector('#a4a-client-url-form'),
      urlId: app.querySelector('#a4a-client-url-id'),
      urlInput: app.querySelector('#a4a-client-url'),
      urlSchedule: app.querySelector('#a4a-client-url-schedule'),
      urlDescription: app.querySelector('#a4a-client-url-description'),
      urlPrompt: app.querySelector('#a4a-client-url-prompt'),
      urlReturned: app.querySelector('#a4a-client-url-returned'),
      urlReset: app.querySelector('#a4a-client-url-reset'),
      urlDelete: app.querySelector('#a4a-client-url-delete'),
      urlRun: app.querySelector('#a4a-client-url-run'),
      urlSave: app.querySelector('#a4a-client-url-save'),
      urlNew: app.querySelector('#a4a-client-url-new')
    };

    const state = {
      clients: [],
      selectedId: null,
      urlEditingId: null,
      loading: false,
      categories: [],
      categoriesLoading: false,
      pendingCategories: []
    };

    function setNotice(message, type = 'info') {
      if (!els.notice) {
        return;
      }
      if (!message) {
        els.notice.classList.add('d-none');
        els.notice.textContent = '';
        return;
      }
      const typeClass = type ? `alert-${type}` : 'alert-info';
      els.notice.className = `alert ${typeClass}`;
      els.notice.textContent = message;
      els.notice.classList.remove('d-none');
    }

    function setBusy(isBusy) {
      const target = app.querySelector('.content-wrapper');
      if (!target) {
        return;
      }
      target.classList.toggle('a4a-busy', Boolean(isBusy));
    }

    function getSelectedClient() {
      if (!state.selectedId) {
        return null;
      }
      return state.clients.find((client) => client && client.id === state.selectedId) || null;
    }

    function renderClientSelect() {
      if (!els.select) {
        return;
      }
      if (!state.clients.length) {
        els.select.innerHTML = '<option value="">No clients yet</option>';
        els.select.value = '';
        return;
      }
      const options = ['<option value="">- Select -</option>'];
      state.clients.forEach((client) => {
        if (!client) {
          return;
        }
        const label = escapeHtml(client.name || `Client #${client.id}`);
        const selectedAttr = client.id === state.selectedId ? ' selected' : '';
        options.push(`<option value="${client.id}"${selectedAttr}>${label}</option>`);
      });
      els.select.innerHTML = options.join('');
      if (state.selectedId) {
        els.select.value = String(state.selectedId);
      } else {
        els.select.value = '';
      }
    }

    function resetClientForm() {
      state.pendingCategories = [];
      if (els.clientId) {
        els.clientId.value = '';
      }
      if (els.clientName) {
        els.clientName.value = '';
      }
      if (els.clientNotes) {
        els.clientNotes.value = '';
      }
      if (els.clientDelete) {
        els.clientDelete.classList.add('d-none');
      }
      renderClientCategories(null);
    }

    function populateClientForm(client) {
      if (!client) {
        resetClientForm();
        return;
      }
      if (els.clientId) {
        els.clientId.value = client.id;
      }
      if (els.clientName) {
        els.clientName.value = client.name || '';
      }
      if (els.clientNotes) {
        els.clientNotes.value = client.notes || '';
      }
      if (els.clientDelete) {
        els.clientDelete.classList.remove('d-none');
      }
      state.pendingCategories = Array.isArray(client.category_ids) ? [...client.category_ids] : [];
    }

    function renderClientForm() {
      const client = getSelectedClient();
      if (client) {
        populateClientForm(client);
      } else {
        resetClientForm();
      }
      renderClientCategories(client);
    }

    function renderClientCategories(client) {
      if (!els.categoriesContainer) {
        return;
      }
      if (state.categoriesLoading) {
        els.categoriesContainer.innerHTML = '<div class="text-muted small">Loading categories...</div>';
        return;
      }
      if (!state.categories.length) {
        els.categoriesContainer.innerHTML = '<div class="text-muted small">No categories available yet.</div>';
        return;
      }

      const activeSelection = client && Array.isArray(client.category_ids)
        ? client.category_ids
        : state.pendingCategories;
      const selected = Array.isArray(activeSelection) ? activeSelection.map((id) => String(id)) : [];

      const rows = state.categories
        .map((category) => {
          if (!category) {
            return '';
          }
          const id = String(category.id);
          const label = escapeHtml(category.name || `Category #${category.id}`);
          const description = Array.isArray(category.options) && category.options.length
            ? `<div class="form-text mb-0">Options: ${escapeHtml(category.options.join(', '))}</div>`
            : '';
          const checked = selected.includes(id) ? ' checked' : '';
          const inputId = `a4a-client-category-${id}`;
          return `
            <div class="form-check">
              <input class="form-check-input" type="checkbox" value="${id}" id="${inputId}"${checked}>
              <label class="form-check-label fw-semibold" for="${inputId}">${label}</label>
              ${description}
            </div>
          `;
        })
        .join('');

      els.categoriesContainer.innerHTML = rows;
    }

    function readSelectedCategories() {
      if (!els.categoriesContainer) {
        return [];
      }
      const values = Array.from(els.categoriesContainer.querySelectorAll('input[type="checkbox"]:checked'))
        .map((input) => parseInt(input.value, 10))
        .filter((value) => Number.isFinite(value) && value > 0);
      state.pendingCategories = [...values];
      const client = getSelectedClient();
      if (client && Array.isArray(client.category_ids)) {
        client.category_ids = [...values];
      }
      return values;
    }

    function toggleUrlForm(disabled) {
      if (!els.urlForm) {
        return;
      }
      const controls = els.urlForm.querySelectorAll('input, textarea, button');
      controls.forEach((control) => {
        if (!control) {
          return;
        }
        if (control === els.urlDelete || control === els.urlRun) {
          control.disabled = Boolean(disabled) || control.classList.contains('d-none');
        } else {
          control.disabled = Boolean(disabled);
        }
      });
      if (els.urlNew) {
        els.urlNew.disabled = Boolean(disabled);
      }
      els.urlForm.classList.toggle('opacity-50', Boolean(disabled));
    }

    function resetUrlForm() {
      state.urlEditingId = null;
      if (els.urlId) {
        els.urlId.value = '';
      }
      if (els.urlInput) {
        els.urlInput.value = '';
      }
      if (els.urlSchedule) {
        els.urlSchedule.value = '';
      }
      if (els.urlDescription) {
        els.urlDescription.value = '';
      }
      if (els.urlPrompt) {
        els.urlPrompt.value = '';
      }
      if (els.urlReturned) {
        els.urlReturned.value = '';
      }
      if (els.urlDelete) {
        els.urlDelete.classList.add('d-none');
      }
      if (els.urlRun) {
        els.urlRun.classList.add('d-none');
      }
    }

    function populateUrlForm(url) {
      state.urlEditingId = url.id;
      if (els.urlId) {
        els.urlId.value = url.id;
      }
      if (els.urlInput) {
        els.urlInput.value = url.url || '';
      }
      if (els.urlSchedule) {
        els.urlSchedule.value = url.schedule || '';
      }
      if (els.urlDescription) {
        els.urlDescription.value = url.description || '';
      }
      if (els.urlPrompt) {
        els.urlPrompt.value = url.prompt || '';
      }
      if (els.urlReturned) {
        els.urlReturned.value = url.returned_data || '';
      }
      if (els.urlDelete) {
        els.urlDelete.classList.remove('d-none');
      }
      if (els.urlRun) {
        els.urlRun.classList.remove('d-none');
      }
    }

    function renderClientUrls() {
      if (!els.urlsBody) {
        return;
      }
      const client = getSelectedClient();
      if (!client) {
        els.urlsBody.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-3">Select a client to view URLs.</td></tr>';
        toggleUrlForm(true);
        resetUrlForm();
        return;
      }
      const urls = Array.isArray(client.urls) ? client.urls : [];
      if (!urls.length) {
        els.urlsBody.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-3">No URLs yet. Use the form below to add one.</td></tr>';
      } else {
        const rows = urls
          .map((url) => {
            const times = formatModified(url.modified_gmt);
            const relative = times.relative ? escapeHtml(times.relative) : '-';
            const absolute = times.absolute ? `<div class="text-muted small">${escapeHtml(times.absolute)}</div>` : '';
            const schedule = (url.schedule || '').trim() || '-';
            return `
              <tr data-url-id="${url.id}">
                <td class="text-break"><a href="${escapeHtml(url.url || '#')}" target="_blank" rel="noopener noreferrer">${escapeHtml(url.url || '(no URL)')}</a></td>
                <td>${escapeHtml(schedule)}</td>
                <td><div class="small fw-semibold">${relative}</div>${absolute}</td>
                <td class="text-end">
                  <div class="btn-group btn-group-sm" role="group">
                    <button type="button" class="btn btn-outline-success" data-action="run" title="Run now">${icon('refresh')}</button>
                    <button type="button" class="btn btn-outline-primary" data-action="edit" title="Edit">${icon('pencil')}</button>
                    <button type="button" class="btn btn-outline-danger" data-action="delete" title="Delete">${icon('trash')}</button>
                  </div>
                </td>
              </tr>
            `;
          })
          .join('');
        els.urlsBody.innerHTML = rows;
      }
      toggleUrlForm(false);
    }

    async function fetchClients() {
      setBusy(true);
      try {
        const response = await request('GET', `${baseClientsUrl}?with_urls=1`);
        state.clients = Array.isArray(response)
          ? response.map((client) => ({
              ...client,
              category_ids: Array.isArray(client.category_ids)
                ? client.category_ids.map((id) => Number(id))
                : []
            }))
          : [];
        if (state.clients.length) {
          const exists = state.selectedId && state.clients.some((client) => client && client.id === state.selectedId);
          if (!exists) {
            state.selectedId = state.clients[0].id;
          }
        } else {
          state.selectedId = null;
        }
        renderClientSelect();
        renderClientForm();
        renderClientUrls();
        setNotice('', 'info');
      } catch (error) {
        console.error(error);
        state.clients = [];
        state.selectedId = null;
        renderClientSelect();
        renderClientForm();
        renderClientUrls();
        setNotice(error.message || 'Failed to load clients.', 'danger');
      } finally {
        setBusy(false);
      }
    }

    async function fetchCategoriesForClients() {
      if (!config.categoriesRestUrl) {
        state.categories = [];
        renderClientCategories(getSelectedClient());
        return;
      }
      state.categoriesLoading = true;
      renderClientCategories(getSelectedClient());
      try {
        const base = config.categoriesRestUrl.replace(/\/$/, '');
        const response = await request('GET', `${base}?per_page=100`);
        state.categories = Array.isArray(response)
          ? response.map((category) => ({
              ...category,
              options: Array.isArray(category.options) ? category.options : []
            }))
          : [];
        renderClientCategories(getSelectedClient());
      } catch (error) {
        console.error(error);
        state.categories = [];
        renderClientCategories(getSelectedClient());
      } finally {
        state.categoriesLoading = false;
      }
    }

    async function handleClientSubmit(event) {
      event.preventDefault();
      const name = els.clientName ? els.clientName.value.trim() : '';
      if (!name) {
        setNotice('Please provide a client name.', 'warning');
        if (els.clientName) {
          els.clientName.focus();
        }
        return;
      }
      const payload = {
        name,
        notes: els.clientNotes ? els.clientNotes.value.trim() : '',
        categories: readSelectedCategories()
      };
      setBusy(true);
      try {
        const idValue = els.clientId ? parseInt(els.clientId.value, 10) : 0;
        if (idValue) {
          await request('PUT', `${baseClientsUrl}/${idValue}`, payload);
          state.selectedId = idValue;
          setNotice('Client updated.', 'success');
        } else {
          const created = await request('POST', baseClientsUrl, payload);
          if (created && created.id) {
            state.selectedId = created.id;
          }
          setNotice('Client created.', 'success');
        }
        await fetchClients();
      } catch (error) {
        console.error(error);
        setNotice(error.message || 'Failed to save client.', 'danger');
      } finally {
        setBusy(false);
      }
    }

    async function handleClientDelete() {
      const idValue = els.clientId ? parseInt(els.clientId.value, 10) : 0;
      if (!idValue) {
        return;
      }
      if (!window.confirm('Delete this client and all associated URLs? This cannot be undone.')) {
        return;
      }
      setBusy(true);
      try {
        await request('DELETE', `${baseClientsUrl}/${idValue}`);
        state.selectedId = null;
        resetClientForm();
        resetUrlForm();
        setNotice('Client deleted.', 'info');
        await fetchClients();
      } catch (error) {
        console.error(error);
        setNotice(error.message || 'Failed to delete client.', 'danger');
      } finally {
        setBusy(false);
      }
    }

    function handleNewClient() {
      state.selectedId = null;
      renderClientSelect();
      resetClientForm();
      renderClientUrls();
      resetUrlForm();
      toggleUrlForm(true);
    }

    async function handleUrlSubmit(event) {
      event.preventDefault();
      const client = getSelectedClient();
      if (!client) {
        setNotice('Select a client before saving URLs.', 'warning');
        return;
      }
      const urlValue = els.urlInput ? els.urlInput.value.trim() : '';
      if (!urlValue) {
        setNotice('Please provide a valid URL.', 'warning');
        if (els.urlInput) {
          els.urlInput.focus();
        }
        return;
      }
      const payload = {
        url: urlValue,
        client_id: client.id,
        schedule: els.urlSchedule ? els.urlSchedule.value.trim() : '',
        description: els.urlDescription ? els.urlDescription.value.trim() : '',
        prompt: els.urlPrompt ? els.urlPrompt.value.trim() : '',
        returned_data: els.urlReturned ? els.urlReturned.value : ''
      };
      setBusy(true);
      try {
        if (state.urlEditingId) {
          await request('PUT', `${baseUrlsUrl}/${state.urlEditingId}`, payload);
          setNotice('URL updated.', 'success');
        } else {
          await request('POST', baseUrlsUrl, payload);
          setNotice('URL created.', 'success');
        }
        resetUrlForm();
        await fetchClients();
      } catch (error) {
        console.error(error);
        setNotice(error.message || 'Failed to save URL.', 'danger');
      } finally {
        setBusy(false);
      }
    }

    async function handleUrlDelete() {
      if (!state.urlEditingId) {
        return;
      }
      if (!window.confirm('Delete this URL? This cannot be undone.')) {
        return;
      }
      setBusy(true);
      try {
        await request('DELETE', `${baseUrlsUrl}/${state.urlEditingId}`);
        resetUrlForm();
        setNotice('URL deleted.', 'info');
        await fetchClients();
      } catch (error) {
        console.error(error);
        setNotice(error.message || 'Failed to delete URL.', 'danger');
      } finally {
        setBusy(false);
      }
    }

    async function handleUrlRun(urlId) {
      if (!urlId) {
        return;
      }
      const endpointTemplate = typeof config.runUrlTemplate === 'string' ? config.runUrlTemplate : '';
      const endpoint = endpointTemplate.includes('%d') ? endpointTemplate.replace('%d', String(urlId)) : `${baseUrlsUrl}/${urlId}/run`;
      setBusy(true);
      try {
        await request('POST', endpoint);
        setNotice('Crawl completed for this URL.', 'success');
        await fetchClients();
      } catch (error) {
        console.error(error);
        setNotice(error.message || 'Failed to trigger run.', 'danger');
      } finally {
        setBusy(false);
      }
    }

    function handleSelectChange(event) {
      const value = parseInt(event.target.value, 10);
      state.selectedId = Number.isFinite(value) ? value : null;
      renderClientForm();
      renderClientUrls();
      resetUrlForm();
      if (!state.selectedId) {
        toggleUrlForm(true);
      }
    }

    function handleUrlTableClick(event) {
      const button = event.target.closest('button[data-action]');
      if (!button) {
        return;
      }
      const row = button.closest('tr[data-url-id]');
      if (!row) {
        return;
      }
      const urlId = parseInt(row.getAttribute('data-url-id'), 10);
      const client = getSelectedClient();
      if (!client) {
        return;
      }
      const url = client.urls ? client.urls.find((entry) => entry.id === urlId) : null;
      const action = button.getAttribute('data-action');
      if (action === 'edit' && url) {
        populateUrlForm(url);
        toggleUrlForm(false);
      } else if (action === 'delete') {
        state.urlEditingId = urlId;
        handleUrlDelete();
      } else if (action === 'run') {
        handleUrlRun(urlId);
      }
    }

    function attachEvents() {
      if (els.select) {
        els.select.addEventListener('change', handleSelectChange);
      }
      if (els.refresh) {
        els.refresh.addEventListener('click', () => {
          fetchCategoriesForClients();
          fetchClients();
        });
      }
      if (els.newClient) {
        els.newClient.addEventListener('click', handleNewClient);
      }
      if (els.clientForm) {
        els.clientForm.addEventListener('submit', handleClientSubmit);
      }
      if (els.clientReset) {
        els.clientReset.addEventListener('click', () => {
          renderClientForm();
        });
      }
      if (els.categoriesContainer) {
        els.categoriesContainer.addEventListener('change', () => {
          readSelectedCategories();
          renderClientCategories(getSelectedClient());
        });
      }
      if (els.clientDelete) {
        els.clientDelete.addEventListener('click', handleClientDelete);
      }
      if (els.urlForm) {
        els.urlForm.addEventListener('submit', handleUrlSubmit);
      }
      if (els.urlReset) {
        els.urlReset.addEventListener('click', resetUrlForm);
      }
      if (els.urlDelete) {
        els.urlDelete.addEventListener('click', handleUrlDelete);
      }
      if (els.urlRun) {
        els.urlRun.addEventListener('click', () => {
          if (state.urlEditingId) {
            handleUrlRun(state.urlEditingId);
          }
        });
      }
      const newUrlHandler = () => {
        const client = getSelectedClient();
        if (!client) {
          setNotice('Select a client before adding URLs.', 'warning');
          return;
        }
        resetUrlForm();
        toggleUrlForm(false);
        if (els.urlInput) {
          els.urlInput.focus({ preventScroll: true });
        }
      };
      if (els.urlNew) {
        els.urlNew.addEventListener('click', newUrlHandler);
      }
      layout.content.addEventListener('click', (event) => {
        const trigger = event.target.closest('[data-action="new-url"]');
        if (!trigger) {
          return;
        }
        newUrlHandler();
      });
      if (els.urlsBody) {
        els.urlsBody.addEventListener('click', handleUrlTableClick);
      }
    }

    resetClientForm();
    resetUrlForm();
    toggleUrlForm(true);
    attachEvents();
    fetchCategoriesForClients();
    fetchClients();
  }

  function initSettings() {
    const settingsEndpoint = typeof config.settingsRestUrl === 'string' ? config.settingsRestUrl.replace(/\/$/, '') : '';

    const layout = renderAdminLTEPage({
      viewKey: 'settings',
      title: 'Settings',
      subtitle: 'Adjust the admin interface and configure AI provider access.'
    });
    bindNavigation(layout.navLinks, loadView, layout.toggleButton, layout.sidebar);

    layout.content.innerHTML = `
      <div id="a4a-settings-notice" class="alert d-none" role="alert"></div>
      <div class="row g-4">
            <div class="col-12 col-xl-6">
              <div class="card shadow-sm h-100">
                <div class="card-header">
                  <h2 class="h6 mb-0">Interface</h2>
                </div>
                <div class="card-body">
                  <form id="a4a-interface-form" class="vstack gap-3">
                    <div>
                      <label class="form-label" for="a4a-setting-primary">Primary Color</label>
                      <input type="color" class="form-control form-control-color" id="a4a-setting-primary" aria-label="Pick primary color" />
                    </div>
                    <div>
                      <label class="form-label" for="a4a-setting-success">Schedule Success Color</label>
                      <input type="color" class="form-control form-control-color" id="a4a-setting-success" aria-label="Pick scheduled color" />
                    </div>
                    <div>
                      <label class="form-label" for="a4a-setting-danger">Schedule Pending Color</label>
                      <input type="color" class="form-control form-control-color" id="a4a-setting-danger" aria-label="Pick ad hoc color" />
                    </div>
                    <div>
                      <label class="form-label" for="a4a-setting-icon">Icon Size</label>
                      <input type="range" class="form-range" id="a4a-setting-icon" min="0.75" max="1.75" step="0.05" />
                      <div class="form-text">Adjust the multiplier applied to interface icons. Current: <span id="a4a-setting-icon-label">100%</span></div>
                    </div>
                    <div>
                      <div class="d-flex align-items-center justify-content-between mb-1">
                        <h3 class="h6 mb-0">Interface Icons</h3>
                      </div>
                      <p class="form-text mb-0">Pick from the SVGs in <code>/wp-content/uploads/fa_icons</code>. Click an icon below to customise each action.</p>
                      <div class="vstack gap-3 mt-3" id="a4a-icon-settings"></div>
                    </div>
                    <div class="d-flex justify-content-end">
                      <button type="button" class="btn btn-outline-secondary btn-sm" id="a4a-settings-reset">${icon('eraser', 'me-1')}Reset defaults</button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
            <div class="col-12 col-xl-6">
              <div class="card shadow-sm h-100">
                <div class="card-header">
                  <h2 class="h6 mb-0">AI Provider</h2>
                </div>
                <div class="card-body">
                  <form id="a4a-api-form" class="vstack gap-3">
                    <div>
                      <label class="form-label" for="a4a-api-provider">Provider Name</label>
                      <input type="text" class="form-control" id="a4a-api-provider" placeholder="e.g. OpenAI" autocomplete="organization" />
                    </div>
                    <div>
                      <label class="form-label" for="a4a-api-base">API Base URL</label>
                      <input type="url" class="form-control" id="a4a-api-base" placeholder="https://api.openai.com/v1" />
                      <div class="form-text">Leave blank to use the default provided by the SDK.</div>
                    </div>
                    <div>
                      <label class="form-label" for="a4a-api-model">Default Model</label>
                      <input type="text" class="form-control" id="a4a-api-model" placeholder="gpt-4o-mini" />
                    </div>
                    <div>
                      <label class="form-label" for="a4a-api-organization">Organization / Project</label>
                      <input type="text" class="form-control" id="a4a-api-organization" placeholder="Optional identifier" autocomplete="off" />
                    </div>
                    <div>
                      <label class="form-label" for="a4a-api-key">API Key</label>
                      <input type="password" class="form-control" id="a4a-api-key" placeholder="sk-..." autocomplete="new-password" />
                      <div class="form-text">Stored securely in WordPress options; required for automated runs.</div>
                    </div>
                    <div class="d-flex justify-content-end gap-2">
                      <button type="submit" class="btn btn-primary">${icon('save', 'me-1')}Save Credentials</button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="a4a-icon-picker-backdrop" id="a4a-icon-picker" hidden tabindex="-1">
        <div class="a4a-icon-picker" role="dialog" aria-modal="true" aria-labelledby="a4a-icon-picker-title">
          <div class="a4a-icon-picker-toolbar">
            <div>
              <h2 class="h5 mb-1" id="a4a-icon-picker-title">Choose an icon</h2>
              <p class="text-muted mb-0 small" id="a4a-icon-picker-subtitle">Browse uploaded icons to replace this action.</p>
            </div>
            <button type="button" class="btn btn-outline-secondary btn-sm" data-icon-picker-close="true" aria-label="Close icon picker">${icon('close', 'me-1')}Close</button>
          </div>
          <div>
            <label class="form-label" for="a4a-icon-picker-search">Search icons</label>
            <input type="search" class="form-control" id="a4a-icon-picker-search" placeholder="Search by icon name or filename" autocomplete="off" />
          </div>
          <div id="a4a-icon-picker-body" class="a4a-icon-picker-grid" role="listbox" aria-live="polite"></div>
        </div>
      </div>
    `;

    const app = layout.wrapper;

    const els = {
      notice: app.querySelector('#a4a-settings-notice'),
      interfaceForm: app.querySelector('#a4a-interface-form'),
      settingPrimary: app.querySelector('#a4a-setting-primary'),
      settingSuccess: app.querySelector('#a4a-setting-success'),
      settingDanger: app.querySelector('#a4a-setting-danger'),
      settingIcon: app.querySelector('#a4a-setting-icon'),
      settingIconLabel: app.querySelector('#a4a-setting-icon-label'),
      settingsReset: app.querySelector('#a4a-settings-reset'),
      iconSettings: app.querySelector('#a4a-icon-settings'),
      iconPicker: app.querySelector('#a4a-icon-picker'),
      iconPickerTitle: app.querySelector('#a4a-icon-picker-title'),
      iconPickerSubtitle: app.querySelector('#a4a-icon-picker-subtitle'),
      iconPickerSearch: app.querySelector('#a4a-icon-picker-search'),
      iconPickerBody: app.querySelector('#a4a-icon-picker-body'),
      apiForm: app.querySelector('#a4a-api-form'),
      apiProvider: app.querySelector('#a4a-api-provider'),
      apiBase: app.querySelector('#a4a-api-base'),
      apiModel: app.querySelector('#a4a-api-model'),
      apiOrganization: app.querySelector('#a4a-api-organization'),
      apiKey: app.querySelector('#a4a-api-key')
    };

    const state = {
      interface: { ...settingsState.value },
      api: {
        provider: '',
        api_base: '',
        api_model: '',
        api_organization: '',
        api_key: ''
      },
      apiBusy: false,
      iconPicker: {
        icons: [],
        loading: false,
        search: '',
        activeKey: '',
        error: ''
      }
    };

    function setNotice(message, type = 'info') {
      if (!els.notice) {
        return;
      }
      if (!message) {
        els.notice.className = 'alert d-none';
        els.notice.textContent = '';
        return;
      }
      const typeClass = type ? `alert-${type}` : 'alert-info';
      els.notice.className = `alert ${typeClass}`;
      els.notice.textContent = message;
      els.notice.classList.remove('d-none');
    }

    function renderInterfaceForm() {
      if (els.settingPrimary) {
        els.settingPrimary.value = normalizeHex(state.interface.primaryColor) || DEFAULT_SETTINGS.primaryColor;
      }
      if (els.settingSuccess) {
        els.settingSuccess.value = normalizeHex(state.interface.successColor) || DEFAULT_SETTINGS.successColor;
      }
      if (els.settingDanger) {
        els.settingDanger.value = normalizeHex(state.interface.dangerColor) || DEFAULT_SETTINGS.dangerColor;
      }
      if (els.settingIcon) {
        els.settingIcon.value = clampIconScale(state.interface.iconScale);
      }
      if (els.settingIconLabel) {
        els.settingIconLabel.textContent = `${Math.round(clampIconScale(state.interface.iconScale) * 100)}%`;
      }
      renderIconSettings();
      if (els.iconPicker && !els.iconPicker.hasAttribute('hidden')) {
      renderIconPicker();
    }
  }

    function formatIconLabel(key) {
      if (typeof key !== 'string' || !key) {
        return 'Icon';
      }
      const meta = ICON_METADATA[key];
      if (meta && meta.label) {
        return meta.label;
      }
      const cleaned = key.replace(/[_-]+/g, ' ').trim();
      if (!cleaned) {
        return 'Icon';
      }
      return cleaned.replace(/\b\w/g, (char) => char.toUpperCase());
    }

    function renderIconSettings() {
      if (!els.iconSettings) {
        return;
      }
      const overrides = state.interface.iconOverrides || {};
      const cards = ICON_KEYS.map((key) => {
        const label = formatIconLabel(key);
        const meta = ICON_METADATA[key] || {};
        const overrideUrl = sanitizeIconUrl(overrides[key]);
        const filename = overrideUrl ? overrideUrl.split('/').pop() || overrideUrl : '';
        const usage = meta.usage ? `<p class="mb-0 small text-muted">${escapeHtml(meta.usage)}</p>` : '';
        const resetClass = `btn btn-link btn-sm text-decoration-none${overrideUrl ? '' : ' disabled text-muted'}`;
        const resetAttrs = overrideUrl ? '' : ' disabled aria-disabled="true"';
        const filenameText = overrideUrl ? escapeHtml(filename) : 'Default icon';
        return `
          <div class="a4a-icon-setting-card" data-icon-key="${key}">
            <div class="a4a-icon-setting-header">
              <div>
                <div class="fw-semibold">${escapeHtml(label)}</div>
                ${usage}
              </div>
              <div class="a4a-icon-setting-actions">
                <span class="a4a-icon-preview">${icon(key)}</span>
                <button type="button" class="btn btn-outline-primary btn-sm" data-icon-action="choose">Choose icon</button>
                <button type="button" class="${resetClass}" data-icon-action="clear"${resetAttrs}>Reset</button>
              </div>
            </div>
            <div class="a4a-icon-filename">${filenameText}</div>
          </div>`;
      }).join('');
      els.iconSettings.innerHTML = cards;
    }

    function handleIconSettingsClick(event) {
      const actionEl = event.target.closest('[data-icon-action]');
      if (!actionEl) {
        return;
      }
      const wrapper = actionEl.closest('[data-icon-key]');
      if (!wrapper) {
        return;
      }
      const key = wrapper.getAttribute('data-icon-key');
      if (!key) {
        return;
      }
      const action = actionEl.getAttribute('data-icon-action');
      if (action === 'choose') {
        openIconPicker(key);
      } else if (action === 'clear') {
        const overrides = { ...(state.interface.iconOverrides || {}) };
        if (overrides[key]) {
          delete overrides[key];
          handleInterfaceChange({ iconOverrides: overrides });
        }
      }
    }

    async function openIconPicker(key) {
      if (!els.iconPicker) {
        return;
      }
      state.iconPicker.activeKey = key;
      state.iconPicker.search = '';
      state.iconPicker.error = '';
      if (els.iconPickerSearch) {
        els.iconPickerSearch.value = '';
      }
      renderIconPicker();
      els.iconPicker.classList.add('is-active');
      els.iconPicker.removeAttribute('hidden');
      setTimeout(() => {
        if (els.iconPickerSearch) {
          els.iconPickerSearch.focus({ preventScroll: true });
        } else {
          els.iconPicker.focus({ preventScroll: true });
        }
      }, 0);
      await ensureIconLibraryLoaded();
      renderIconPicker();
    }

    function closeIconPicker() {
      if (!els.iconPicker) {
        return;
      }
      els.iconPicker.classList.remove('is-active');
      els.iconPicker.setAttribute('hidden', 'hidden');
      state.iconPicker.activeKey = '';
      state.iconPicker.search = '';
      if (els.iconPickerSearch) {
        els.iconPickerSearch.value = '';
      }
    }

    function renderIconPicker() {
      if (!els.iconPicker || !state.iconPicker.activeKey) {
        return;
      }
      const key = state.iconPicker.activeKey;
      const label = formatIconLabel(key);
      const meta = ICON_METADATA[key] || {};
      if (els.iconPickerTitle) {
        els.iconPickerTitle.textContent = `Icon for ${label}`;
      }
      if (els.iconPickerSubtitle) {
        const text = meta.usage ? meta.usage : 'Browse uploaded icons to replace this action.';
        els.iconPickerSubtitle.textContent = text;
      }
      renderIconPickerGrid();
    }

    function renderIconPickerGrid() {
      if (!els.iconPickerBody) {
        return;
      }
      if (!state.iconPicker.activeKey) {
        els.iconPickerBody.innerHTML = '<div class="a4a-icon-picker-empty">Select an icon slot to begin.</div>';
        return;
      }
      if (!config.iconsRestUrl) {
        els.iconPickerBody.innerHTML = '<div class="a4a-icon-picker-empty">Icon endpoint is not available. Upload SVGs to <code>/wp-content/uploads/fa_icons</code>.</div>';
        return;
      }
      if (state.iconPicker.loading) {
        els.iconPickerBody.innerHTML = '<div class="a4a-icon-picker-empty">Loading icons...</div>';
        return;
      }
      if (state.iconPicker.error) {
        els.iconPickerBody.innerHTML = `<div class="a4a-icon-picker-empty">${escapeHtml(state.iconPicker.error)}<div class="mt-2"><button type="button" class="btn btn-outline-primary btn-sm" data-icon-picker-retry="true">Try again</button></div></div>`;
        return;
      }
      const icons = state.iconPicker.icons;
      if (!icons.length) {
        els.iconPickerBody.innerHTML = '<div class="a4a-icon-picker-empty">Upload SVG icons to <code>/wp-content/uploads/fa_icons</code> to make them available here.</div>';
        return;
      }
      const query = (state.iconPicker.search || '').trim().toLowerCase();
      const filtered = query ? icons.filter((iconItem) => iconItem.search.includes(query)) : icons;
      if (!filtered.length) {
        els.iconPickerBody.innerHTML = '<div class="a4a-icon-picker-empty">No icons match this search. Try another name.</div>';
        return;
      }
      const currentOverride = sanitizeIconUrl((state.interface.iconOverrides || {})[state.iconPicker.activeKey]);
      const items = filtered
        .map((iconItem) => {
          const isSelected = currentOverride === iconItem.url;
          const buttonClass = `a4a-icon-picker-button${isSelected ? ' is-selected' : ''}`;
          return `
            <button type="button" class="${buttonClass}" data-icon-url="${escapeHtml(iconItem.url)}" data-icon-filename="${escapeHtml(iconItem.filename)}" role="option" aria-selected="${isSelected ? 'true' : 'false'}">
              <span class="a4a-icon-preview"><img src="${escapeHtml(iconItem.url)}" alt="" loading="lazy" decoding="async" /></span>
              <span class="a4a-icon-picker-label">${escapeHtml(iconItem.name || iconItem.filename)}</span>
            </button>`;
        })
        .join('');
      els.iconPickerBody.innerHTML = items;
    }

    async function ensureIconLibraryLoaded() {
      if (state.iconPicker.loading || state.iconPicker.icons.length) {
        return;
      }
      if (!config.iconsRestUrl) {
        state.iconPicker.error = 'Icon endpoint is not available.';
        renderIconPickerGrid();
        return;
      }
      state.iconPicker.loading = true;
      renderIconPickerGrid();
      try {
        const response = await request('GET', config.iconsRestUrl);
        const icons = Array.isArray(response) ? response : [];
        state.iconPicker.icons = icons
          .map((item) => {
            const url = item && sanitizeIconUrl(item.url);
            if (!url) {
              return null;
            }
            const filename = typeof item.filename === 'string' && item.filename ? item.filename : url.split('/').pop() || url;
            const name = typeof item.name === 'string' && item.name ? item.name : filename;
            const id = typeof item.id === 'string' && item.id ? item.id : sanitizeTitleFallback(name);
            const search = `${name} ${filename}`.toLowerCase();
            return { id, name, filename, url, search };
          })
          .filter(Boolean);
        state.iconPicker.error = '';
      } catch (error) {
        console.error(error);
        state.iconPicker.error = error && error.message ? error.message : 'Failed to load icons.';
      } finally {
        state.iconPicker.loading = false;
      }
      renderIconPickerGrid();
    }

    function sanitizeTitleFallback(value) {
      const cleaned = typeof value === 'string' ? value.toLowerCase().replace(/[^a-z0-9]+/g, '-') : '';
      return cleaned || 'icon';
    }

    function sanitizeApiSettings(data) {
      return {
        provider: typeof data.provider === 'string' ? data.provider.trim() : '',
        api_base: typeof data.api_base === 'string' ? data.api_base.trim() : '',
        api_model: typeof data.api_model === 'string' ? data.api_model.trim() : '',
        api_organization: typeof data.api_organization === 'string' ? data.api_organization.trim() : '',
        api_key: typeof data.api_key === 'string' ? data.api_key.trim() : ''
      };
    }

    function renderApiForm() {
      if (!els.apiForm) {
        return;
      }
      if (els.apiProvider) {
        els.apiProvider.value = state.api.provider;
      }
      if (els.apiBase) {
        els.apiBase.value = state.api.api_base;
      }
      if (els.apiModel) {
        els.apiModel.value = state.api.api_model;
      }
      if (els.apiOrganization) {
        els.apiOrganization.value = state.api.api_organization;
      }
      if (els.apiKey) {
        els.apiKey.value = state.api.api_key;
      }
    }

    function setApiBusy(flag) {
      state.apiBusy = Boolean(flag);
      if (!els.apiForm) {
        return;
      }
      const controls = els.apiForm.querySelectorAll('input, button');
      controls.forEach((control) => {
        control.disabled = state.apiBusy;
      });
    }

    function handleInterfaceChange(partial) {
      state.interface = updateSettingsState(partial);
      renderInterfaceForm();
    }

    async function fetchApiSettings() {
      if (!settingsEndpoint || !els.apiForm) {
        return;
      }
      setApiBusy(true);
      try {
        const response = await request('GET', settingsEndpoint);
        state.api = sanitizeApiSettings(response || {});
        renderApiForm();
      } catch (error) {
        console.error(error);
        setNotice(error.message || 'Failed to load API credentials.', 'danger');
      } finally {
        setApiBusy(false);
      }
    }

    async function handleApiSubmit(event) {
      event.preventDefault();
      if (!settingsEndpoint) {
        setNotice('Settings endpoint is not available. Please reload the page.', 'danger');
        return;
      }
      setApiBusy(true);
      const payload = {
        provider: els.apiProvider ? els.apiProvider.value.trim() : '',
        api_base: els.apiBase ? els.apiBase.value.trim() : '',
        api_model: els.apiModel ? els.apiModel.value.trim() : '',
        api_organization: els.apiOrganization ? els.apiOrganization.value.trim() : '',
        api_key: els.apiKey ? els.apiKey.value.trim() : ''
      };
      try {
        const saved = await request('PUT', settingsEndpoint, payload);
        state.api = sanitizeApiSettings(saved || payload);
        renderApiForm();
        setNotice('AI provider settings saved.', 'success');
      } catch (error) {
        console.error(error);
        setNotice(error.message || 'Failed to save AI provider settings.', 'danger');
      } finally {
        setApiBusy(false);
      }
    }

    renderInterfaceForm();
    renderApiForm();

    if (els.iconSettings) {
      els.iconSettings.addEventListener('click', handleIconSettingsClick);
    }
    if (els.iconPicker) {
      els.iconPicker.addEventListener('click', (event) => {
        if (event.target === els.iconPicker || event.target.closest('[data-icon-picker-close]')) {
          event.preventDefault();
          closeIconPicker();
        }
      });
      els.iconPicker.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          closeIconPicker();
        }
      });
    }
    if (els.iconPickerSearch) {
      els.iconPickerSearch.addEventListener('input', (event) => {
        state.iconPicker.search = event.target.value || '';
        renderIconPickerGrid();
      });
    }
    if (els.iconPickerBody) {
      els.iconPickerBody.addEventListener('click', (event) => {
        const retry = event.target.closest('[data-icon-picker-retry]');
        if (retry) {
          ensureIconLibraryLoaded();
          return;
        }
        const button = event.target.closest('button[data-icon-url]');
        if (!button || !state.iconPicker.activeKey) {
          return;
        }
        const url = button.getAttribute('data-icon-url');
        const sanitizedUrl = sanitizeIconUrl(url);
        if (!sanitizedUrl) {
          return;
        }
        const overrides = { ...(state.interface.iconOverrides || {}) };
        overrides[state.iconPicker.activeKey] = sanitizedUrl;
        handleInterfaceChange({ iconOverrides: overrides });
        closeIconPicker();
      });
    }

    if (els.notice) {
      els.notice.addEventListener('click', (event) => {
        if (event.target.closest('.btn-close')) {
          setNotice('');
        }
      });
    }

    if (els.settingPrimary) {
      els.settingPrimary.addEventListener('input', (event) => {
        const value = normalizeHex(event.target.value) || state.interface.primaryColor;
        handleInterfaceChange({ primaryColor: value });
      });
    }
    if (els.settingSuccess) {
      els.settingSuccess.addEventListener('input', (event) => {
        const value = normalizeHex(event.target.value) || state.interface.successColor;
        handleInterfaceChange({ successColor: value });
      });
    }
    if (els.settingDanger) {
      els.settingDanger.addEventListener('input', (event) => {
        const value = normalizeHex(event.target.value) || state.interface.dangerColor;
        handleInterfaceChange({ dangerColor: value });
      });
    }
    if (els.settingIcon) {
      els.settingIcon.addEventListener('input', (event) => {
        const value = clampIconScale(event.target.value);
        handleInterfaceChange({ iconScale: value });
      });
    }
    if (els.settingsReset) {
      els.settingsReset.addEventListener('click', () => {
        state.interface = resetSettingsState();
        renderInterfaceForm();
        setNotice('Interface settings reset to defaults.', 'info');
      });
    }
    if (els.apiForm) {
      els.apiForm.addEventListener('submit', handleApiSubmit);
    }

    if (!settingsEndpoint && els.apiForm) {
      setNotice('Settings endpoint not available. Interface changes still work locally.', 'warning');
      const controls = els.apiForm.querySelectorAll('input, button');
      controls.forEach((control) => {
        control.disabled = true;
      });
    } else {
      fetchApiSettings();
    }
  }

  function initCategories() {
    const baseCategoriesUrl = config.categoriesRestUrl ? config.categoriesRestUrl.replace(/\/$/, '') : '';

    const layout = renderAdminLTEPage({
      viewKey: 'categories',
      title: 'Categories',
      subtitle: 'Define and organise reusable metadata buckets for crawl results.'
    });
    bindNavigation(layout.navLinks, loadView);

    if (!baseCategoriesUrl) {
      layout.content.innerHTML = `
        <div class="row">
          <div class="col-12">
            <div class="alert alert-danger" role="alert">Categories endpoint not available.</div>
          </div>
        </div>
      `;
      return;
    }

    layout.content.innerHTML = `
      <div class="a4a-section">
        <div id="a4a-categories-notice" class="alert d-none" role="alert"></div>
        <div class="a4a-categories-grid">
          <div class="a4a-categories-grid__library">
            <div class="card shadow-sm h-100">
              <div class="card-header d-flex justify-content-between align-items-center">
                <h2 class="h6 mb-0">Category Library</h2>
                <button class="btn btn-outline-primary btn-sm" type="button" data-action="new">${icon('plus', 'me-1')}New Category</button>
              </div>
              <div class="card-body p-0">
                <div class="table-responsive">
                  <table class="table table-hover align-middle mb-0">
                    <thead class="table-light">
                      <tr>
                        <th>Name</th>
                        <th style="width: 120px;">Options</th>
                        <th class="text-end" style="width: 110px;">Actions</th>
                      </tr>
                    </thead>
                    <tbody id="a4a-category-table">
                      <tr><td colspan="3" class="text-center text-muted py-3">Loading categories...</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
          <div class="a4a-categories-grid__form">
            <div class="card shadow-sm h-100">
              <div class="card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
                <div>
                  <h2 class="h6 mb-0" id="a4a-category-form-title">New Category</h2>
                  <p class="text-muted small mb-0">Options can be reordered later.</p>
                </div>
                <span class="badge text-bg-primary" id="a4a-category-mode">New</span>
              </div>
              <div class="card-body">
                <form id="a4a-category-form" class="vstack gap-3">
                  <input type="hidden" id="a4a-category-id" />
                  <div>
                    <label class="form-label" for="a4a-category-name">Name <span class="text-danger">*</span></label>
                    <input type="text" class="form-control" id="a4a-category-name" placeholder="Category name" required />
                  </div>
                  <div>
                    <div class="d-flex justify-content-between align-items-center mb-2">
                      <label class="form-label mb-0" for="a4a-category-options">Options</label>
                      <button class="btn btn-outline-primary btn-sm" type="button" id="a4a-category-option-add">${icon('plus', 'me-1')}Add option</button>
                    </div>
                    <div id="a4a-category-options" class="vstack gap-2"></div>
                  </div>
                  <div class="d-flex flex-wrap gap-2">
                    <button type="submit" class="btn btn-primary" id="a4a-category-save">${icon('save', 'me-1')}Save Category</button>
                    <button type="button" class="btn btn-outline-secondary" id="a4a-category-reset">${icon('eraser', 'me-1')}Reset</button>
                    <button type="button" class="btn btn-outline-danger ms-auto d-none" id="a4a-category-delete">${icon('trash', 'me-1')}Delete</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    const app = layout.wrapper;

    const els = {
      notice: app.querySelector('#a4a-categories-notice'),
      list: app.querySelector('#a4a-category-table'),
      newButton: app.querySelector('[data-action="new"]'),
      form: app.querySelector('#a4a-category-form'),
      formTitle: app.querySelector('#a4a-category-form-title'),
      formMode: app.querySelector('#a4a-category-mode'),
      categoryId: app.querySelector('#a4a-category-id'),
      categoryName: app.querySelector('#a4a-category-name'),
      optionAdd: app.querySelector('#a4a-category-option-add'),
      optionsContainer: app.querySelector('#a4a-category-options'),
      saveButton: app.querySelector('#a4a-category-save'),
      resetButton: app.querySelector('#a4a-category-reset'),
      deleteButton: app.querySelector('#a4a-category-delete')
    };

    const state = {
      categories: [],
      selectedId: null,
      saving: false
    };

    function setNotice(message, type = 'info') {
      if (!els.notice) {
        return;
      }
      if (!message) {
        els.notice.classList.add('d-none');
        els.notice.textContent = '';
        return;
      }
      const typeClass = type ? `alert-${type}` : 'alert-info';
      els.notice.className = `alert ${typeClass}`;
      els.notice.textContent = message;
      els.notice.classList.remove('d-none');
    }

    function setBusy(isBusy) {
      const target = app.querySelector('.content-wrapper');
      if (!target) {
        return;
      }
      target.classList.toggle('a4a-busy', Boolean(isBusy));
    }

    function renderOptions(values) {
      if (!els.optionsContainer) {
        return;
      }
      const sanitized = Array.isArray(values) && values.length ? values : [''];
      els.optionsContainer.innerHTML = sanitized
        .map((value, index) => {
          const escaped = escapeHtml(value || '');
          const disabled = sanitized.length === 1 ? ' disabled' : '';
          return `
            <div class="input-group" data-option-index="${index}">
              <input type="text" class="form-control" data-option-input="true" value="${escaped}" placeholder="Option value" />
              <button type="button" class="btn btn-outline-danger"${disabled} data-action="remove-option">${icon('trash')}</button>
            </div>
          `;
        })
        .join('');
    }

    function readOptions() {
      if (!els.optionsContainer) {
        return [];
      }
      const inputs = Array.from(els.optionsContainer.querySelectorAll('input[data-option-input="true"]'));
      const values = inputs.map((input) => (input.value || '').trim()).filter(Boolean);
      return Array.from(new Set(values));
    }

    function resetCategoryForm() {
      state.selectedId = null;
      if (els.formTitle) {
        els.formTitle.textContent = 'New Category';
      }
      if (els.formMode) {
        els.formMode.textContent = 'New';
        els.formMode.className = 'badge text-bg-primary';
      }
      if (els.categoryId) {
        els.categoryId.value = '';
      }
      if (els.categoryName) {
        els.categoryName.value = '';
      }
      if (els.deleteButton) {
        els.deleteButton.classList.add('d-none');
      }
      renderOptions(['']);
    }

    function populateCategoryForm(category) {
      if (!category) {
        resetCategoryForm();
        return;
      }
      state.selectedId = category.id;
      if (els.formTitle) {
        els.formTitle.textContent = 'Edit Category';
      }
      if (els.formMode) {
        els.formMode.textContent = 'Editing';
        els.formMode.className = 'badge text-bg-warning';
      }
      if (els.categoryId) {
        els.categoryId.value = category.id;
      }
      if (els.categoryName) {
        els.categoryName.value = category.name || '';
      }
      if (els.deleteButton) {
        els.deleteButton.classList.remove('d-none');
      }
      renderOptions(Array.isArray(category.options) ? category.options : []);
    }

    function renderCategoryList() {
      if (!els.list) {
        return;
      }
      if (!state.categories.length) {
        els.list.innerHTML = '<tr><td colspan="3" class="text-center text-muted py-3">No categories yet.</td></tr>';
        return;
      }
      const rows = state.categories
        .map((category) => {
          if (!category) {
            return '';
          }
          const count = Array.isArray(category.options) ? category.options.length : 0;
          const label = escapeHtml(category.name || `Category #${category.id}`);
          return `
            <tr data-category-id="${category.id}">
              <td>${label}</td>
              <td>${count}</td>
              <td class="text-end">
                <div class="btn-group btn-group-sm" role="group">
                  <button type="button" class="btn btn-outline-primary" data-action="edit">${icon('pencil')}</button>
                  <button type="button" class="btn btn-outline-danger" data-action="delete">${icon('trash')}</button>
                </div>
              </td>
            </tr>
          `;
        })
        .join('');
      els.list.innerHTML = rows;
    }

    async function fetchCategories() {
      setBusy(true);
      try {
        const response = await request('GET', baseCategoriesUrl);
        state.categories = Array.isArray(response) ? response : [];
        renderCategoryList();
        if (state.selectedId) {
          const match = state.categories.find((category) => category && category.id === state.selectedId);
          if (match) {
            populateCategoryForm(match);
          } else {
            resetCategoryForm();
          }
        }
        setNotice('', 'info');
      } catch (error) {
        console.error(error);
        state.categories = [];
        renderCategoryList();
        resetCategoryForm();
        setNotice(error.message || 'Failed to load categories.', 'danger');
      } finally {
        setBusy(false);
      }
    }

    async function handleCategorySubmit(event) {
      event.preventDefault();
      const name = els.categoryName ? els.categoryName.value.trim() : '';
      if (!name) {
        setNotice('Please provide a category name.', 'warning');
        if (els.categoryName) {
          els.categoryName.focus();
        }
        return;
      }
      const payload = { name, options: readOptions() };
      setBusy(true);
      try {
        const idValue = els.categoryId ? parseInt(els.categoryId.value, 10) : 0;
        if (idValue) {
          await request('PUT', `${baseCategoriesUrl}/${idValue}`, payload);
          state.selectedId = idValue;
          setNotice('Category updated.', 'success');
        } else {
          const created = await request('POST', baseCategoriesUrl, payload);
          if (created && created.id) {
            state.selectedId = created.id;
          }
          setNotice('Category created.', 'success');
        }
        await fetchCategories();
      } catch (error) {
        console.error(error);
        setNotice(error.message || 'Failed to save category.', 'danger');
      } finally {
        setBusy(false);
      }
    }

    async function handleCategoryDelete() {
      const idValue = els.categoryId ? parseInt(els.categoryId.value, 10) : 0;
      if (!idValue) {
        return;
      }
      if (!window.confirm('Delete this category? This cannot be undone.')) {
        return;
      }
      setBusy(true);
      try {
        await request('DELETE', `${baseCategoriesUrl}/${idValue}`);
        state.selectedId = null;
        resetCategoryForm();
        setNotice('Category deleted.', 'info');
        await fetchCategories();
      } catch (error) {
        console.error(error);
        setNotice(error.message || 'Failed to delete category.', 'danger');
      } finally {
        setBusy(false);
      }
    }

    function handleTableClick(event) {
      const button = event.target.closest('button[data-action]');
      if (!button) {
        return;
      }
      const row = button.closest('tr[data-category-id]');
      if (!row) {
        return;
      }
      const id = parseInt(row.getAttribute('data-category-id'), 10);
      const category = state.categories.find((entry) => entry && entry.id === id);
      const action = button.getAttribute('data-action');
      if (action === 'edit' && category) {
        populateCategoryForm(category);
      } else if (action === 'delete' && category) {
        populateCategoryForm(category);
        handleCategoryDelete();
      }
    }

    function attachEvents() {
      if (els.list) {
        els.list.addEventListener('click', handleTableClick);
      }
      if (els.newButton) {
        els.newButton.addEventListener('click', () => {
          resetCategoryForm();
          setNotice('', 'info');
        });
      }
      if (els.form) {
        els.form.addEventListener('submit', handleCategorySubmit);
      }
      if (els.resetButton) {
        els.resetButton.addEventListener('click', () => {
          if (state.selectedId) {
            const match = state.categories.find((category) => category && category.id === state.selectedId);
            if (match) {
              populateCategoryForm(match);
              return;
            }
          }
          resetCategoryForm();
        });
      }
      if (els.deleteButton) {
        els.deleteButton.addEventListener('click', handleCategoryDelete);
      }
      if (els.optionAdd && els.optionsContainer) {
        els.optionAdd.addEventListener('click', () => {
          const current = readOptions();
          current.push('');
          renderOptions(current);
        });
        els.optionsContainer.addEventListener('click', (event) => {
          const button = event.target.closest('button[data-action="remove-option"]');
          if (!button || button.disabled) {
            return;
          }
          const wrapper = button.closest('[data-option-index]');
          if (!wrapper) {
            return;
          }
          const index = parseInt(wrapper.getAttribute('data-option-index'), 10);
          const current = readOptions();
          if (Number.isFinite(index)) {
            current.splice(index, 1);
          }
          renderOptions(current);
        });
      }
    }

    resetCategoryForm();
    attachEvents();
    fetchCategories();
  }

  function initUrls() {
    const layout = renderAdminLTEPage({
      viewKey: 'urls',
      title: 'URL Intelligence Hub',
      subtitle: 'Curate crawl targets, coordinate schedules, and capture XML payloads ready for the AI pipeline.'
    });
    bindNavigation(layout.navLinks, loadView);

    const markup = `
      <div class="row g-4">
          <div class="col-12">
            <div id="a4a-notice" class="alert d-none" role="alert"></div>
          </div>

          <div class="col-12 d-flex flex-wrap align-items-center justify-content-between gap-3">
            <div class="d-flex align-items-center gap-2 text-muted small">
              <span class="badge text-bg-secondary">Live</span>
              <span>Local time <span id="a4a-clock">--:--</span></span>
            </div>
            <button class="btn btn-primary btn-sm" data-action="new-url">
              ${icon('plus', 'me-1')}New Target
            </button>
          </div>

          <div class="col-12 col-sm-6 col-xl-3">
            <div class="card a4a-stat-card">
              <div class="card-body d-flex align-items-center gap-3">
                <div class="icon-circle bg-primary-subtle text-primary fs-5">${icon('list')}</div>
                <div>
                  <div class="text-muted text-uppercase small">Total URLs</div>
                  <div class="display-6 mb-0" id="a4a-metric-total">0</div>
                </div>
              </div>
            </div>
          </div>

          <div class="col-12 col-sm-6 col-xl-3">
            <div class="card a4a-stat-card">
              <div class="card-body d-flex align-items-center gap-3">
                <div class="icon-circle bg-success-subtle text-success fs-5">${icon('clock')}</div>
                <div>
                  <div class="text-muted text-uppercase small">Scheduled</div>
                  <div class="display-6 mb-0" id="a4a-metric-scheduled">0</div>
                </div>
              </div>
            </div>
          </div>

          <div class="col-12 col-sm-6 col-xl-3">
            <div class="card a4a-stat-card">
              <div class="card-body d-flex align-items-center gap-3">
                <div class="icon-circle bg-warning-subtle text-warning fs-5">${icon('refresh')}</div>
                <div>
                  <div class="text-muted text-uppercase small">Last Update</div>
                  <div class="display-6 mb-0" id="a4a-metric-updated">--</div>
                </div>
              </div>
            </div>
          </div>

          <div class="col-12 col-sm-6 col-xl-3">
            <div class="card a4a-stat-card">
              <div class="card-body d-flex align-items-center gap-3">
                <div class="icon-circle bg-info-subtle text-info fs-5">${icon('robot')}</div>
                <div>
                  <div class="text-muted text-uppercase small">AI Ready</div>
                  <div class="display-6 mb-0" id="a4a-metric-ai-ready">0</div>
                </div>
              </div>
            </div>
          </div>

          <div class="col-12 col-xl-8">
            <div class="card shadow-sm" id="a4a-table-card">
              <div class="card-header d-flex flex-wrap align-items-center justify-content-between gap-3">
                <div>
                  <h2 class="h5 mb-1">Crawl Targets</h2>
                  <p class="text-muted mb-0">Monitor cadence, freshness, and recent edits.</p>
                </div>
                <button class="btn btn-outline-primary" data-action="new-url">
                  ${icon('plus', 'me-1')}Add URL
                </button>
              </div>
              <div class="card-body p-0">
                <div class="table-responsive">
                  <table class="table table-hover align-middle mb-0">
                    <thead class="table-light">
                      <tr>
                        <th>URL &amp; context</th>
                        <th style="width: 160px;">Client</th>
                        <th style="width: 140px;">Cadence</th>
                        <th style="width: 160px;">Updated</th>
                        <th class="text-end" style="width: 180px;">Actions</th>
                      </tr>
                    </thead>
                    <tbody id="a4a-table-body">
                      <tr><td colspan="5" class="text-center py-4 text-muted">Loading...</td></tr>
                    </tbody>
                  </table>
                </div>
                <div class="a4a-empty d-none" id="a4a-empty-state">
                  <div class="icon-circle bg-primary-subtle text-primary">${icon('sparkles')}</div>
                  <h3 class="h5">No targets yet</h3>
                  <p class="text-muted">Add a URL to start orchestrating the AI crawl pipeline.</p>
                  <button class="btn btn-primary" data-action="new-url">${icon('plus', 'me-1')}Create URL</button>
                </div>
              </div>
            </div>
          </div>

          <div class="col-12 col-xl-4 d-flex flex-column gap-4">
            <div class="card shadow-sm flex-fill" id="a4a-detail-card">
              <div class="card-header">
                <h2 class="h6 mb-0">Selected Target</h2>
              </div>
              <div class="card-body" id="a4a-detail-body">
                <div class="text-center text-muted py-5">
                  <p class="fw-semibold mb-1">Pick a target to inspect</p>
                  <p class="mb-0">Select a row to preview metadata and captured XML.</p>
                </div>
              </div>
              <div class="card-footer d-flex flex-wrap gap-2">
                <button class="btn btn-outline-success w-100" id="a4a-detail-run" disabled>${icon('refresh', 'me-1')}Run now</button>
                <button class="btn btn-outline-primary w-100" id="a4a-detail-edit" disabled>${icon('pencil', 'me-1')}Edit</button>
                <button class="btn btn-outline-secondary flex-grow-1" id="a4a-detail-copy" disabled>${icon('clipboard')}</button>
              </div>
            </div>

            <div class="card shadow-sm" id="a4a-timeline-card">
              <div class="card-header">
                <h2 class="h6 mb-0">Schedule Timeline</h2>
              </div>
              <div class="card-body p-0">
                <ul class="list-group list-group-flush" id="a4a-timeline-list"></ul>
                <div class="text-center text-muted py-4" id="a4a-timeline-empty">
                  <p class="fw-semibold mb-1">No cadences scheduled</p>
                  <p class="mb-0">When you add schedules they will appear here.</p>
                </div>
              </div>
            </div>
          </div>

          <div class="col-12">
            <div class="card shadow-sm" id="a4a-form-card">
              <div class="card-header d-flex flex-wrap align-items-center justify-content-between gap-3">
                <div>
                  <h2 class="h5 mb-1" id="a4a-form-title">Create Crawl Target</h2>
                  <p class="text-muted mb-0">Define the essentials and leave the crawling to automation.</p>
                </div>
                <span class="badge text-bg-primary" id="a4a-mode-indicator">New</span>
              </div>
              <div class="card-body">
                <form id="a4a-form" class="row g-4" autocomplete="off">
                  <input type="hidden" id="a4a-id" />
                  <div class="col-md-6">
                    <label class="form-label" for="a4a-url">Target URL <span class="text-danger">*</span></label>
                    <div class="input-group">
                      <span class="input-group-text">${icon('link')}</span>
                      <input type="url" class="form-control" id="a4a-url" required placeholder="https://example.com/page" />
                    </div>
                    <div class="form-text">Exact address the AI crawler should request.</div>
                </div>
                <div class="col-md-6">
                  <label class="form-label" for="a4a-schedule">Schedule</label>
                  <div class="input-group">
                    <span class="input-group-text">${icon('calendar')}</span>
                    <input type="text" class="form-control" id="a4a-schedule" placeholder="e.g. Daily at 09:00 CET" />
                  </div>
                  <div class="d-flex align-items-center justify-content-between">
                    <div class="form-text">Human-friendly note for now.</div>
                    <span class="a4a-schedule-badge a4a-schedule-badge--adhoc" id="a4a-schedule-hint"></span>
                  </div>
                </div>
                <div class="col-md-6">
                  <label class="form-label" for="a4a-client">Client</label>
                  <select class="form-select" id="a4a-client">
                    <option value="">- Unassigned -</option>
                  </select>
                  <div class="form-text">Organise targets under a client profile.</div>
                </div>
                <div class="col-12">
                  <label class="form-label" for="a4a-description">Description</label>
                  <textarea class="form-control" id="a4a-description" rows="3" placeholder="Optional context for teammates or AI prompts"></textarea>
                </div>
                <div class="col-12">
                  <label class="form-label" for="a4a-prompt">AI Prompt</label>
                  <textarea class="form-control" id="a4a-prompt" rows="3" placeholder="Optional instructions for downstream AI processing"></textarea>
                </div>
                <div class="col-12">
                  <label class="form-label" for="a4a-returned">Returned Data (XML)</label>
                  <textarea class="form-control" id="a4a-returned" rows="6" placeholder="<results>...</results>"></textarea>
                  <div class="form-text">Store the latest payload snapshot for comparisons.</div>
                </div>
                  <div class="col-12 d-flex flex-wrap gap-2">
                    <button type="submit" class="btn btn-primary" id="a4a-submit">${icon('save', 'me-1')}Save Target</button>
                    <button type="button" class="btn btn-outline-secondary" id="a4a-reset">${icon('eraser', 'me-1')}Reset</button>
                    <button type="button" class="btn btn-outline-dark" id="a4a-preview-toggle">${icon('code', 'me-1')}Preview XML</button>
                  </div>
                </form>
              </div>
              <div class="card-footer text-muted small">
                Roadmap: map schedules to WP-Cron and stream outputs to the AI ingestion workers.
              </div>
            </div>
          </div>

          <div class="col-12" id="a4a-preview-card" hidden>
            <div class="card border-secondary-subtle shadow-sm">
              <div class="card-header d-flex justify-content-between align-items-center">
                <h2 class="h6 mb-0">XML Preview</h2>
                <button class="btn btn-sm btn-outline-secondary" id="a4a-preview-close">${icon('close')}</button>
              </div>
              <div class="card-body">
                <div class="a4a-xml-preview"><code id="a4a-preview-content"><!-- nothing to show yet --></code></div>
              </div>
            </div>
          </div>

        </div>
      </div>
  `;

    layout.content.innerHTML = markup;
    const app = layout.wrapper;

  const state = {
    items: [],
    activeId: null,
    selectedId: null,
    loading: false,
    clients: [],
    clientsLoading: false
  };

  const els = {
    clock: app.querySelector('#a4a-clock'),
    notice: app.querySelector('#a4a-notice'),
    metrics: {
      total: app.querySelector('#a4a-metric-total'),
      scheduled: app.querySelector('#a4a-metric-scheduled'),
      updated: app.querySelector('#a4a-metric-updated'),
      aiReady: app.querySelector('#a4a-metric-ai-ready')
    },
    brand: app.querySelector('.navbar-brand'),
    tableBody: app.querySelector('#a4a-table-body'),
    tableCard: app.querySelector('#a4a-table-card'),
    emptyState: app.querySelector('#a4a-empty-state'),
    detailCard: app.querySelector('#a4a-detail-card'),
    detailBody: app.querySelector('#a4a-detail-body'),
    detailRun: app.querySelector('#a4a-detail-run'),
    detailEdit: app.querySelector('#a4a-detail-edit'),
    detailCopy: app.querySelector('#a4a-detail-copy'),
    timelineList: app.querySelector('#a4a-timeline-list'),
    timelineEmpty: app.querySelector('#a4a-timeline-empty'),
    form: app.querySelector('#a4a-form'),
    formCard: app.querySelector('#a4a-form-card'),
    idField: app.querySelector('#a4a-id'),
    urlField: app.querySelector('#a4a-url'),
    clientField: app.querySelector('#a4a-client'),
    scheduleField: app.querySelector('#a4a-schedule'),
    descriptionField: app.querySelector('#a4a-description'),
    promptField: app.querySelector('#a4a-prompt'),
    returnedField: app.querySelector('#a4a-returned'),
    submitButton: app.querySelector('#a4a-submit'),
    resetButton: app.querySelector('#a4a-reset'),
    formTitle: app.querySelector('#a4a-form-title'),
    modeIndicator: app.querySelector('#a4a-mode-indicator'),
    scheduleHint: app.querySelector('#a4a-schedule-hint'),
    previewToggle: app.querySelector('#a4a-preview-toggle'),
    previewClose: app.querySelector('#a4a-preview-close'),
    previewCard: app.querySelector('#a4a-preview-card'),
    previewContent: app.querySelector('#a4a-preview-content'),
    actionNewButtons: app.querySelectorAll('[data-action="new-url"]')
  };

  if (els.brand) {
    const versionLabel = typeof config.version === 'string' ? config.version.trim() : '';
    els.brand.textContent = versionLabel ? `axs4all Intelligence - v.${versionLabel}` : 'axs4all Intelligence';
  }

  function updateClock() {
    if (!els.clock) {
      return;
    }
    const now = new Date();
    els.clock.textContent = now.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  }
  updateClock();
  setInterval(updateClock, 60000);

  function getScheduleDisplayMeta(schedule) {
    const trimmed = typeof schedule === 'string' ? schedule.trim() : '';
    if (trimmed) {
      return {
        text: trimmed,
        icon: 'clock',
        badgeClass: 'a4a-schedule-badge a4a-schedule-badge--scheduled',
        textClass: 'a4a-schedule-text--scheduled',
        type: 'scheduled'
      };
    }
    return {
      text: 'Not scheduled',
      icon: 'sparkles',
      badgeClass: 'a4a-schedule-badge a4a-schedule-badge--adhoc',
      textClass: 'a4a-schedule-text--adhoc',
      type: 'adhoc'
    };
  }

  function renderScheduleBadge(schedule) {
    const meta = getScheduleDisplayMeta(schedule);
    const pillClass =
      meta.type === 'scheduled'
        ? 'a4a-pill a4a-pill--success'
        : 'a4a-pill a4a-pill--warning';
    return `<span class="${pillClass}">${icon(meta.icon)}<span>${escapeHtml(meta.text)}</span></span>`;
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
      els.notice.className = 'alert d-none';
      els.notice.innerHTML = '';
      return;
    }
    els.notice.className = `alert alert-${type}`;
    els.notice.innerHTML = `
      <div class="d-flex justify-content-between align-items-center gap-3">
        <span>${escapeHtml(message)}</span>
        <button type="button" class="btn-close" data-action="dismiss-notice"></button>
      </div>
    `;
  }

  els.notice.addEventListener('click', (event) => {
    if (event.target.closest('[data-action="dismiss-notice"]')) {
      setNotice('');
    }
  });

  function setLoading(flag) {
    state.loading = flag;
    const method = flag ? 'add' : 'remove';
    [els.tableCard, els.formCard, els.detailCard].forEach((card) => {
      if (card) {
        card.classList[method]('a4a-busy');
      }
    });
    if (els.submitButton) {
      els.submitButton.disabled = flag;
    }
    if (els.resetButton) {
      els.resetButton.disabled = flag;
    }
    els.actionNewButtons.forEach((btn) => {
      btn.disabled = flag;
    });
  }

  function updateScheduleHint() {
    if (!els.scheduleHint) {
      return;
    }
    const value = typeof els.scheduleField.value === 'string' ? els.scheduleField.value : '';
    const meta = getScheduleDisplayMeta(value);
    els.scheduleHint.className = meta.badgeClass;
    els.scheduleHint.innerHTML = `${icon(meta.icon)}<span>${escapeHtml(meta.text)}</span>`;
  }

  function updateMetrics() {
    const total = state.items.length;
    const scheduled = state.items.filter((item) => (item.schedule || '').trim()).length;
    const aiReady = state.items.filter((item) => (item.returned_data || '').trim()).length;
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
    els.metrics.updated.textContent = latest ? timeAgo(latest) : '--';
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
      els.tableBody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-muted">No URLs yet. Use the button above to create one.</td></tr>';
      els.emptyState.classList.remove('d-none');
      return;
    }

    els.emptyState.classList.add('d-none');
    const rows = state.items
      .map((item) => {
        const times = formatModified(item.modified_gmt);
        const description = summarize(item.description, 90);
        const badge = renderScheduleBadge(item.schedule);
        const selectedClass = state.selectedId === item.id ? 'table-active' : '';
        const clientName = getClientName(item.client_id);
        const clientCell = clientName
          ? `<span class="badge text-bg-light text-dark">${escapeHtml(clientName)}</span>`
          : '<span class="text-muted">-</span>';
        return `
          <tr class="${selectedClass}" data-row-id="${item.id}">
            <td>
              <div class="fw-semibold mb-1 text-break">${escapeHtml(item.url)}</div>
              <div class="text-muted small">
                ${description ? escapeHtml(description) : 'Add some context for this target.'}
              </div>
            </td>
            <td>${clientCell}</td>
            <td>${badge}</td>
            <td>
              <div class="small fw-semibold">${escapeHtml(times.relative)}</div>
              <div class="text-muted small">${escapeHtml(times.absolute)}</div>
            </td>
            <td class="text-end">
              <div class="btn-group btn-group-sm" role="group">
                <button class="btn btn-outline-success" data-action="run" data-id="${item.id}" title="Run now">${icon('refresh')}</button>
                <button class="btn btn-outline-primary" data-action="edit" data-id="${item.id}" title="Edit">${icon('pencil')}</button>
                <button class="btn btn-outline-secondary" data-action="copy" data-id="${item.id}" title="Copy URL">${icon('copy')}</button>
                <button class="btn btn-outline-danger" data-action="delete" data-id="${item.id}" title="Delete">${icon('trash')}</button>
              </div>
            </td>
          </tr>
        `;
      })
      .join('');

    els.tableBody.innerHTML = rows;
  }

  function getClientName(clientId) {
    if (!clientId) {
      return '';
    }
    const match = state.clients.find((client) => client && client.id === clientId);
    return match ? match.name || '' : '';
  }

  function renderClientOptions(preserveCurrent = true) {
    if (!els.clientField) {
      return;
    }
    const previousValue = preserveCurrent ? els.clientField.value : '';
    const options = ['<option value="">- Unassigned -</option>'];
    const sortedClients = [...state.clients].sort((a, b) => {
      const nameA = (a && a.name ? a.name : '').toLowerCase();
      const nameB = (b && b.name ? b.name : '').toLowerCase();
      if (nameA && nameB) {
        return nameA.localeCompare(nameB);
      }
      if (nameA) {
        return -1;
      }
      if (nameB) {
        return 1;
      }
      return 0;
    });
    sortedClients.forEach((client) => {
      if (!client) {
        return;
      }
      const id = String(client.id);
      const label = client.name ? client.name : `Client #${client.id}`;
      options.push(`<option value="${id}">${escapeHtml(label)}</option>`);
    });
    els.clientField.innerHTML = options.join('');
    if (previousValue && Array.from(els.clientField.options).some((option) => option.value === previousValue)) {
      els.clientField.value = previousValue;
    } else {
      els.clientField.value = '';
    }
  }

  async function fetchClientsForSelect() {
    if (!config.clientsRestUrl) {
      return;
    }
    state.clientsLoading = true;
    try {
      const base = config.clientsRestUrl.replace(/\/$/, '');
      const response = await request('GET', `${base}?per_page=100&_fields=id,name`);
      state.clients = Array.isArray(response) ? response : [];
      renderClientOptions();
      refreshUI();
    } catch (error) {
      console.error(error);
    } finally {
      state.clientsLoading = false;
    }
  }

  function getSelectedItem() {
    if (!state.selectedId) {
      return null;
    }
    return state.items.find((item) => item.id === state.selectedId) || null;
  }

  function renderDetail() {
    const item = getSelectedItem();
    if (!item) {
      els.detailBody.innerHTML =
        '<div class="text-center text-muted py-5"><p class="fw-semibold mb-1">Pick a target to inspect</p><p class="mb-0">Select a row to preview metadata and captured XML.</p></div>';
      els.detailEdit.disabled = true;
      els.detailCopy.disabled = true;
      if (els.detailRun) {
        els.detailRun.disabled = true;
      }
      return;
    }

    const scheduleBadge = renderScheduleBadge(item.schedule);
    const times = formatModified(item.modified_gmt);
    const xmlContent = (item.returned_data || '').trim()
      ? escapeHtml(item.returned_data)
      : '&lt;!-- no XML captured yet --&gt;';
    const clientName = getClientName(item.client_id);
    const promptText = (item.prompt || '').trim();
    const runMeta = item.run_requested_gmt ? formatModified(item.run_requested_gmt) : null;

    els.detailBody.innerHTML = `
      <div class="a4a-detail-list">
        <div>
          <span class="a4a-detail-label">Target URL</span>
          <a href="${escapeHtml(item.url)}" class="a4a-detail-value text-decoration-none text-break" target="_blank" rel="noopener noreferrer">${escapeHtml(item.url)}</a>
        </div>
        <div>
          <span class="a4a-detail-label">Client</span>
          ${
            clientName
              ? `<span class="a4a-pill a4a-pill--muted">${escapeHtml(clientName)}</span>`
              : '<span class="a4a-detail-note">Unassigned</span>'
          }
        </div>
        <div>
          <span class="a4a-detail-label">Cadence</span>
          ${scheduleBadge}
        </div>
        <div>
          <span class="a4a-detail-label">Last update</span>
          <div class="a4a-detail-value">${escapeHtml(times.relative)}</div>
          <div class="a4a-detail-note">${escapeHtml(times.absolute)}</div>
        </div>
        <div>
          <span class="a4a-detail-label">Last run request</span>
          ${
            runMeta
              ? `<div class="a4a-detail-value">${escapeHtml(runMeta.relative)}</div><div class="a4a-detail-note">${escapeHtml(runMeta.absolute)}</div>`
              : '<div class="a4a-detail-note">No ad-hoc run requested.</div>'
          }
        </div>
        <div>
          <span class="a4a-detail-label">Description</span>
          <p class="a4a-detail-note mb-0">${escapeHtml(item.description || 'Add notes to help collaborators understand this target.')}</p>
        </div>
        <div>
          <span class="a4a-detail-label">AI Prompt</span>
          ${
            promptText
              ? `<pre class="a4a-code-block mb-0">${escapeHtml(promptText)}</pre>`
              : '<div class="a4a-detail-note">This target does not have a prompt yet.</div>'
          }
        </div>
        <div>
          <span class="a4a-detail-label">Returned XML</span>
          <div class="a4a-xml-preview"><code>${xmlContent}</code></div>
        </div>
      </div>
    `;

    els.previewContent.innerHTML = xmlContent;
    els.detailEdit.disabled = false;
    els.detailCopy.disabled = false;
    if (els.detailRun) {
      els.detailRun.disabled = false;
    }
  }

  function renderTimeline() {
    const scheduled = state.items.filter((item) => (item.schedule || '').trim());
    if (!scheduled.length) {
      els.timelineList.innerHTML = '';
      els.timelineEmpty.classList.remove('d-none');
      return;
    }

    els.timelineEmpty.classList.add('d-none');
    const itemsHtml = scheduled
      .slice(0, 6)
      .map((item) => {
        const times = formatModified(item.modified_gmt);
        const meta = getScheduleDisplayMeta(item.schedule);
        return `
          <li class="a4a-timeline-item">
            <div class="a4a-timeline-info">
              <span class="a4a-detail-label">${escapeHtml(meta.text)}</span>
              <a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer" class="fw-semibold text-decoration-none text-break">${escapeHtml(item.url)}</a>
            </div>
            <div class="a4a-timeline-meta text-end">
              <div class="a4a-detail-value">${escapeHtml(times.relative)}</div>
              <div class="a4a-detail-note">${escapeHtml(times.absolute)}</div>
            </div>
          </li>
        `;
      })
      .join('');
    els.timelineList.innerHTML = itemsHtml;
  }

  function refreshUI() {
    updateMetrics();
    renderTable();
    renderDetail();
    renderTimeline();
  }

  function resetForm() {
    state.activeId = null;
    els.idField.value = '';
    els.urlField.value = '';
    if (els.clientField) {
      els.clientField.value = '';
    }
    els.scheduleField.value = '';
    els.descriptionField.value = '';
    if (els.promptField) {
      els.promptField.value = '';
    }
    els.returnedField.value = '';
    els.formTitle.textContent = 'Create Crawl Target';
    els.modeIndicator.textContent = 'New';
    els.modeIndicator.className = 'badge text-bg-primary';
    updateScheduleHint();
    els.urlField.focus({ preventScroll: true });
  }

  function populateForm(item) {
    state.activeId = item.id;
    els.idField.value = item.id;
    els.urlField.value = item.url || '';
    if (els.clientField) {
      els.clientField.value = item.client_id ? String(item.client_id) : '';
    }
    els.scheduleField.value = item.schedule || '';
    els.descriptionField.value = item.description || '';
    if (els.promptField) {
      els.promptField.value = item.prompt || '';
    }
    els.returnedField.value = item.returned_data || '';
    els.formTitle.textContent = 'Update Crawl Target';
    els.modeIndicator.textContent = 'Editing';
    els.modeIndicator.className = 'badge text-bg-warning';
    updateScheduleHint();
    els.urlField.focus({ preventScroll: true });
  }

  function selectItem(id) {
    state.selectedId = id || null;
    refreshUI();
  }

  async function fetchItems() {
    setLoading(true);
    try {
      const items = await request('GET', config.restUrl.replace(/\/$/, ''));
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
      await request('DELETE', `${config.restUrl.replace(/\/$/, '')}/${id}`);
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

  async function runUrlNow(id) {
    if (!id) {
      return;
    }
    setLoading(true);
    try {
      const endpointTemplate = typeof config.runUrlTemplate === 'string' ? config.runUrlTemplate : '';
      const endpoint = endpointTemplate.includes('%d')
        ? endpointTemplate.replace('%d', String(id))
        : `${config.restUrl.replace(/\/$/, '')}/${id}/run`;
      const updated = await request('POST', endpoint);
      if (updated && typeof updated === 'object') {
        const index = state.items.findIndex((item) => item.id === updated.id);
        if (index !== -1) {
          state.items[index] = updated;
        } else {
          state.items.push(updated);
        }
        state.selectedId = updated.id;
        resortItems();
        refreshUI();
        setNotice('Crawl complete. Review the updated XML below.', 'success');
      }
    } catch (error) {
      console.error(error);
      setNotice(error.message || 'Failed to trigger the run.', 'danger');
    } finally {
      setLoading(false);
    }
  }

  function updatePreviewContent() {
    const value = (els.returnedField.value || '').trim();
    els.previewContent.innerHTML = value ? escapeHtml(value) : '&lt;!-- nothing to show yet --&gt;';
  }

  function togglePreview(force) {
    const show = force !== undefined ? force : els.previewCard.hidden;
    els.previewCard.hidden = !show;
    if (show) {
      updatePreviewContent();
      els.previewCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
      } else if (action === 'run') {
        runUrlNow(id);
      } else if (action === 'delete') {
        if (window.confirm('Delete this URL? This cannot be undone.')) {
          deleteItem(id);
        }
      } else if (action === 'copy') {
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
    const clientValue = els.clientField ? parseInt(els.clientField.value, 10) : 0;
    const payload = {
      url: els.urlField.value.trim(),
      client_id: Number.isFinite(clientValue) && clientValue > 0 ? clientValue : 0,
      schedule: els.scheduleField.value.trim(),
      description: els.descriptionField.value.trim(),
      prompt: els.promptField ? els.promptField.value.trim() : '',
      returned_data: els.returnedField.value
    };
    if (!payload.url) {
      setNotice('Please provide a valid URL before saving.', 'warning');
      return;
    }

    setLoading(true);
    try {
      if (state.activeId) {
        const updated = await request('PUT', `${config.restUrl.replace(/\/$/, '')}/${state.activeId}`, payload);
        state.items = state.items.map((item) => (item.id === updated.id ? updated : item));
        state.selectedId = updated.id;
        setNotice('URL updated.', 'success');
      } else {
        const created = await request('POST', config.restUrl.replace(/\/$/, ''), payload);
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

  function wireEvents() {
    els.scheduleField.addEventListener('input', updateScheduleHint);
    els.form.addEventListener('submit', handleSubmit);
    els.resetButton.addEventListener('click', () => {
      resetForm();
      setNotice('');
    });
    els.tableBody.addEventListener('click', handleTableClick);
    els.actionNewButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        resetForm();
        setNotice('');
      });
    });
    els.detailEdit.addEventListener('click', () => {
      const item = getSelectedItem();
      if (item) {
        populateForm(item);
        selectItem(item.id);
        host.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
    els.detailCopy.addEventListener('click', () => {
      const item = getSelectedItem();
      if (item) {
        copyToClipboard(item.url);
      }
    });
    if (els.detailRun) {
      els.detailRun.addEventListener('click', () => {
        const item = getSelectedItem();
        if (item) {
          runUrlNow(item.id);
        }
      });
    }
    if (els.clientField) {
      els.clientField.addEventListener('focus', () => {
        if (!state.clients.length && !state.clientsLoading) {
          fetchClientsForSelect();
        }
      });
    }
    els.previewToggle.addEventListener('click', () => togglePreview(true));
    els.previewClose.addEventListener('click', () => togglePreview(false));
    els.returnedField.addEventListener('input', () => {
      if (!els.previewCard.hidden) {
        updatePreviewContent();
      }
    });
  }

    resetForm();
    wireEvents();
    fetchClientsForSelect();
    fetchItems();
  }

  function loadView(view) {
    const candidate = typeof view === 'string' ? view.toLowerCase() : 'urls';
    const validViews = ['urls', 'clients', 'categories', 'settings', 'debug'];
    const nextView = validViews.includes(candidate) ? candidate : 'urls';
    if (currentView === nextView && root.children.length) {
      return;
    }
    currentView = nextView;
    root.innerHTML = '';
    switch (currentView) {
      case 'clients':
        initClients();
        break;
      case 'categories':
        initCategories();
        break;
      case 'settings':
        initSettings();
        break;
      case 'debug':
        initDebug();
        break;
      default:
        initUrls();
        break;
    }
  }

  loadView(currentView);

})();





