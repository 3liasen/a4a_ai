(function () {
  const host = document.getElementById('a4a-ai-root');
  if (!host) {
    return;
  }

  const config = typeof a4aAI === 'object' ? a4aAI : null;
  if (!config || !config.restUrl || !config.nonce) {
    console.error('axs4all - AI: Missing localized REST configuration.');
    host.textContent = 'Configuration error: missing REST settings.';
    return;
  }

  let shadow;
  try {
    shadow = host.attachShadow({ mode: 'open' });
  } catch (error) {
    console.error('axs4all - AI: failed to attach Shadow DOM', error);
    host.textContent = 'Unable to initialise admin interface.';
    return;
  }

  function injectStylesheet(href, integrity) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    if (integrity) {
      link.integrity = integrity;
      link.crossOrigin = 'anonymous';
      link.referrerPolicy = 'no-referrer';
    }
    shadow.appendChild(link);
    return link;
  }

  injectStylesheet('https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css');

  const baseStyle = document.createElement('style');
  baseStyle.textContent = `
    :host {
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
    .a4a-busy { position: relative; }
    .a4a-busy::after { content: ''; position: absolute; inset: 0; background: rgba(255,255,255,0.65); border-radius: 0.75rem; z-index: 10; }
    .a4a-busy::before { content: ''; position: absolute; top: 50%; left: 50%; width: 2.5rem; height: 2.5rem; margin: -1.25rem 0 0 -1.25rem; border-radius: 50%; border: 0.35rem solid rgba(13,110,253,0.25); border-top-color: rgba(13,110,253,0.8); animation: a4a-spin 0.7s linear infinite; z-index: 11; }
    @keyframes a4a-spin { to { transform: rotate(360deg); } }
    .a4a-stat-card { border: none; border-radius: 1rem; box-shadow: 0 0.35rem 1rem rgba(33,37,41,0.08); }
    .a4a-stat-card .icon-circle { width: 2.5rem; height: 2.5rem; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; }
    .a4a-empty { padding: 3rem 1rem; text-align: center; }
    .a4a-empty .icon-circle { width: 3.5rem; height: 3.5rem; border-radius: 50%; margin: 0 auto 1rem; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; }
    .a4a-icon { display: inline-flex; align-items: center; justify-content: center; line-height: 0; }
    .a4a-icon svg { width: calc(var(--a4a-icon-scale) * 1em); height: calc(var(--a4a-icon-scale) * 1em); stroke: currentColor; stroke-width: 1.8; fill: none; stroke-linecap: round; stroke-linejoin: round; }
    .a4a-schedule-badge { display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.25rem 0.75rem; border-radius: 999px; font-size: 0.85rem; font-weight: 600; border: 1px solid transparent; background: rgba(0,0,0,0.05); }
    .a4a-schedule-badge .a4a-icon { font-size: 0.95em; }
    .a4a-schedule-badge--scheduled { background-color: var(--a4a-color-success-bg); color: var(--a4a-color-success); border-color: var(--a4a-color-success-border); }
    .a4a-schedule-badge--adhoc { background-color: var(--a4a-color-danger-bg); color: var(--a4a-color-danger); border-color: var(--a4a-color-danger-border); }
    .a4a-schedule-text--scheduled { color: var(--a4a-color-success); }
    .a4a-schedule-text--adhoc { color: var(--a4a-color-danger); }
    .a4a-xml-preview { max-height: 220px; overflow: auto; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; background: #f8f9fa; border-radius: 0.5rem; padding: 1rem; }
  `;
  shadow.appendChild(baseStyle);

  const themeStyle = document.createElement('style');
  shadow.appendChild(themeStyle);

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
    circle: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/></svg>`
  });

  function icon(name, extraClass = '') {
    const svg = ICONS[name] || ICONS.circle;
    const extra = extraClass ? ' ' + extraClass : '';
    return `<span class="a4a-icon${extra}" aria-hidden="true">${svg}</span>`;
  }

  const STORAGE_KEY = 'a4a-ai-settings';
  const DEFAULT_SETTINGS = Object.freeze({
    primaryColor: '#0d6efd',
    successColor: '#198754',
    dangerColor: '#dc3545',
    iconScale: 1
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

  function loadSettings() {
    const settings = { ...DEFAULT_SETTINGS };
    try {
      if (typeof window.localStorage === 'undefined') {
        return settings;
      }
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        return settings;
      }
      const parsed = JSON.parse(stored);
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
      }
    } catch (error) {
      console.warn('axs4all - AI: unable to parse saved settings, using defaults.', error);
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

    const primaryHover = shadeColor(primary, -0.1);
    const primaryActive = shadeColor(primary, -0.2);
    const outlinePrimaryBg = hexToRgba(primary, 0.12);
    const outlineDangerBg = hexToRgba(danger, 0.12);

    themeStyle.textContent = `
      :host {
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
      iconScale
    };
  }

  const initialSettings = loadSettings();
  const sanitizedSettings = applySettingsToTheme(initialSettings);
  if (JSON.stringify(initialSettings) !== JSON.stringify(sanitizedSettings)) {
    saveSettings(sanitizedSettings);
  }
  const initialIconPercent = Math.round(sanitizedSettings.iconScale * 100);

  const markup = `
    <div class="bg-light min-vh-100">
      <nav class="navbar navbar-expand-lg navbar-light bg-white border-bottom shadow-sm">
        <div class="container-fluid">
          <a class="navbar-brand fw-semibold" href="#">axs4all Intelligence</a>
          <div class="ms-auto d-flex align-items-center gap-3">
            <span class="text-muted small" id="a4a-clock">--:--</span>
            <button class="btn btn-primary btn-sm" data-action="new-url">
              ${icon('plus', 'me-1')}New Target
            </button>
          </div>
        </div>
      </nav>

      <main class="container-fluid py-4">
        <div class="row g-4">
          <div class="col-12">
            <div id="a4a-notice" class="alert d-none" role="alert"></div>
          </div>

          <div class="col-12">
            <div class="border-bottom pb-3 mb-3">
              <h1 class="h3 mb-1">URL Intelligence Hub</h1>
              <p class="text-muted mb-0">Curate crawl targets, coordinate schedules, and capture XML payloads ready for the AI pipeline.</p>
            </div>
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
                        <th style="width: 140px;">Cadence</th>
                        <th style="width: 160px;">Updated</th>
                        <th class="text-end" style="width: 130px;">Actions</th>
                      </tr>
                    </thead>
                    <tbody id="a4a-table-body">
                      <tr><td colspan="4" class="text-center py-4 text-muted">Loading...</td></tr>
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
              <div class="card-footer d-flex gap-2">
                <button class="btn btn-outline-primary w-100" id="a4a-detail-edit" disabled>${icon('pencil', 'me-1')}Edit</button>
                <button class="btn btn-outline-secondary" id="a4a-detail-copy" disabled>${icon('clipboard')}</button>
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

            <div class="card shadow-sm" id="a4a-settings-card">
              <div class="card-header">
                <h2 class="h6 mb-0">Interface Settings</h2>
              </div>
              <div class="card-body">
                <form id="a4a-settings-form" class="vstack gap-3">
                  <div>
                    <label class="form-label" for="a4a-setting-primary">Primary Color</label>
                    <input type="color" class="form-control form-control-color" id="a4a-setting-primary" value="${sanitizedSettings.primaryColor}" aria-label="Pick primary color" />
                  </div>
                  <div>
                    <label class="form-label" for="a4a-setting-success">Schedule Success Color</label>
                    <input type="color" class="form-control form-control-color" id="a4a-setting-success" value="${sanitizedSettings.successColor}" aria-label="Pick scheduled color" />
                  </div>
                  <div>
                    <label class="form-label" for="a4a-setting-danger">Schedule Pending Color</label>
                    <input type="color" class="form-control form-control-color" id="a4a-setting-danger" value="${sanitizedSettings.dangerColor}" aria-label="Pick ad hoc color" />
                  </div>
                  <div>
                    <label class="form-label" for="a4a-setting-icon">Icon Size</label>
                    <input type="range" class="form-range" id="a4a-setting-icon" min="0.75" max="1.75" step="0.05" value="${sanitizedSettings.iconScale}" />
                    <div class="form-text">Adjust the multiplier applied to interface icons. Current: <span id="a4a-setting-icon-label">${initialIconPercent}%</span></div>
                  </div>
                  <div class="d-flex justify-content-end">
                    <button type="button" class="btn btn-outline-secondary btn-sm" id="a4a-settings-reset">Reset defaults</button>
                  </div>
                </form>
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
                    <div class="form-text">Exacttttt address the AI crawler should request.</div>
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
                  <div class="col-12">
                    <label class="form-label" for="a4a-description">Description</label>
                    <textarea class="form-control" id="a4a-description" rows="3" placeholder="Optional context for teammates or AI prompts"></textarea>
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
      </main>
    </div>
  `;

  const app = document.createElement('div');
  app.innerHTML = markup;
  shadow.appendChild(app);

  const state = {
    items: [],
    activeId: null,
    selectedId: null,
    loading: false,
    settings: { ...sanitizedSettings }
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
    detailEdit: app.querySelector('#a4a-detail-edit'),
    detailCopy: app.querySelector('#a4a-detail-copy'),
    timelineList: app.querySelector('#a4a-timeline-list'),
    timelineEmpty: app.querySelector('#a4a-timeline-empty'),
    form: app.querySelector('#a4a-form'),
    formCard: app.querySelector('#a4a-form-card'),
    idField: app.querySelector('#a4a-id'),
    urlField: app.querySelector('#a4a-url'),
    scheduleField: app.querySelector('#a4a-schedule'),
    descriptionField: app.querySelector('#a4a-description'),
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
    settingsCard: app.querySelector('#a4a-settings-card'),
    settingsForm: app.querySelector('#a4a-settings-form'),
    settingPrimary: app.querySelector('#a4a-setting-primary'),
    settingSuccess: app.querySelector('#a4a-setting-success'),
    settingDanger: app.querySelector('#a4a-setting-danger'),
    settingIcon: app.querySelector('#a4a-setting-icon'),
    settingIconLabel: app.querySelector('#a4a-setting-icon-label'),
    settingsReset: app.querySelector('#a4a-settings-reset'),
    actionNewButtons: app.querySelectorAll('[data-action="new-url"]')
  };

  updateSettingsForm();

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
    return `<span class="${meta.badgeClass}">${icon(meta.icon)}<span>${escapeHtml(meta.text)}</span></span>`;
  }

  function updateSettingsForm() {
    if (!els || !els.settingsForm) {
      return;
    }
    const { primaryColor, successColor, dangerColor, iconScale } = state.settings;
    if (els.settingPrimary) {
      els.settingPrimary.value = normalizeHex(primaryColor) || DEFAULT_SETTINGS.primaryColor;
    }
    if (els.settingSuccess) {
      els.settingSuccess.value = normalizeHex(successColor) || DEFAULT_SETTINGS.successColor;
    }
    if (els.settingDanger) {
      els.settingDanger.value = normalizeHex(dangerColor) || DEFAULT_SETTINGS.dangerColor;
    }
    if (els.settingIcon) {
      els.settingIcon.value = clampIconScale(iconScale);
    }
    if (els.settingIconLabel) {
      els.settingIconLabel.textContent = `${Math.round(clampIconScale(iconScale) * 100)}%`;
    }
  }

  function commitSettings(partial) {
    const merged = { ...state.settings, ...partial };
    const sanitized = applySettingsToTheme(merged);
    state.settings = sanitized;
    updateSettingsForm();
    saveSettings(state.settings);
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
      els.tableBody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-muted">No URLs yet. Use the button above to create one.</td></tr>';
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
        return `
          <tr class="${selectedClass}" data-row-id="${item.id}">
            <td>
              <div class="fw-semibold mb-1 text-break">${escapeHtml(item.url)}</div>
              <div class="text-muted small">
                ${description ? escapeHtml(description) : 'Add some context for this target.'}
              </div>
            </td>
            <td>${badge}</td>
            <td>
              <div class="small fw-semibold">${escapeHtml(times.relative)}</div>
              <div class="text-muted small">${escapeHtml(times.absolute)}</div>
            </td>
            <td class="text-end">
              <div class="btn-group btn-group-sm" role="group">
                <button class="btn btn-outline-primary" data-action="edit" data-id="${item.id}">${icon('pencil')}</button>
                <button class="btn btn-outline-secondary" data-action="copy" data-id="${item.id}">${icon('copy')}</button>
                <button class="btn btn-outline-danger" data-action="delete" data-id="${item.id}">${icon('trash')}</button>
              </div>
            </td>
          </tr>
        `;
      })
      .join('');

    els.tableBody.innerHTML = rows;
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
      return;
    }

    const scheduleBadge = renderScheduleBadge(item.schedule);
    const times = formatModified(item.modified_gmt);
    const xmlContent = (item.returned_data || '').trim()
      ? escapeHtml(item.returned_data)
      : '&lt;!-- no XML captured yet --&gt;';

    els.detailBody.innerHTML = `
      <div class="mb-3">
        <div class="text-muted text-uppercase small fw-semibold mb-1">Target URL</div>
        <a href="${escapeHtml(item.url)}" class="text-decoration-none" target="_blank" rel="noopener noreferrer">${escapeHtml(item.url)}</a>
      </div>
      <div class="mb-3">
        <div class="text-muted text-uppercase small fw-semibold mb-1">Cadence</div>
        ${scheduleBadge}
      </div>
      <div class="mb-3">
        <div class="text-muted text-uppercase small fw-semibold mb-1">Last update</div>
        <div class="small fw-semibold">${escapeHtml(times.relative)}</div>
        <div class="text-muted small">${escapeHtml(times.absolute)}</div>
      </div>
      <div class="mb-3">
        <div class="text-muted text-uppercase small fw-semibold mb-1">Description</div>
        <p class="mb-0">${escapeHtml(item.description || 'No description yet. Add notes for collaborators.')}</p>
      </div>
      <div>
        <div class="text-muted text-uppercase small fw-semibold mb-1">Returned XML</div>
        <div class="a4a-xml-preview"><code>${xmlContent}</code></div>
      </div>
    `;

    els.previewContent.innerHTML = xmlContent;
    els.detailEdit.disabled = false;
    els.detailCopy.disabled = false;
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
        <li class="list-group-item">
          <div class="d-flex justify-content-between align-items-start">
            <div>
              <div class="fw-semibold ${meta.textClass} text-break">${escapeHtml(meta.text)}</div>
              <div class="text-muted small">${escapeHtml(item.url)}</div>
            </div>
            <span class="badge bg-light text-muted">${escapeHtml(times.relative)}</span>
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
    els.scheduleField.value = '';
    els.descriptionField.value = '';
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
    els.scheduleField.value = item.schedule || '';
    els.descriptionField.value = item.description || '';
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
      const error = await response.json().catch(() => ({}));
      const message = (error && error.message) || `Request failed with status ${response.status}`;
      throw new Error(message);
    }
    return response.status === 204 ? null : response.json();
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
    const payload = {
      url: els.urlField.value.trim(),
      schedule: els.scheduleField.value.trim(),
      description: els.descriptionField.value.trim(),
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
    els.previewToggle.addEventListener('click', () => togglePreview(true));
    els.previewClose.addEventListener('click', () => togglePreview(false));
    els.returnedField.addEventListener('input', () => {
      if (!els.previewCard.hidden) {
        updatePreviewContent();
      }
    });
    if (els.settingPrimary) {
      els.settingPrimary.addEventListener('input', (event) => {
        const value = normalizeHex(event.target.value) || state.settings.primaryColor;
        commitSettings({ primaryColor: value });
      });
    }
    if (els.settingSuccess) {
      els.settingSuccess.addEventListener('input', (event) => {
        const value = normalizeHex(event.target.value) || state.settings.successColor;
        commitSettings({ successColor: value });
      });
    }
    if (els.settingDanger) {
      els.settingDanger.addEventListener('input', (event) => {
        const value = normalizeHex(event.target.value) || state.settings.dangerColor;
        commitSettings({ dangerColor: value });
      });
    }
    if (els.settingIcon) {
      els.settingIcon.addEventListener('input', (event) => {
        commitSettings({ iconScale: clampIconScale(event.target.value) });
      });
    }
    if (els.settingsReset) {
      els.settingsReset.addEventListener('click', () => {
        commitSettings({ ...DEFAULT_SETTINGS });
      });
    }
  }

  resetForm();
  wireEvents();
  fetchItems();

})();
