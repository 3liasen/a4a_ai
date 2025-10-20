(function () {
  const host = document.getElementById('a4a-ai-root');
  if (!host) {
    return;
  }

  const config = typeof window.a4aAI === 'object' ? window.a4aAI : null;
  if (!config || !config.endpoints || !config.nonce) {
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

  function injectStylesheet(href) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    shadow.appendChild(link);
    return link;
  }

  injectStylesheet('https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css');

  const baseStyle = document.createElement('style');
  baseStyle.textContent = `
    :host {
      display: block;
      font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
      color: #1f2933;
    }
    .a4a-app {
      min-height: 100%;
      background: transparent;
    }
    .a4a-nav button {
      border: none;
      background: transparent;
      padding: 0.75rem 1.25rem;
      border-radius: 999px;
      font-weight: 600;
      color: #374151;
    }
    .a4a-nav button.active {
      background: #0d6efd;
      color: #fff;
      box-shadow: 0 0.25rem 0.75rem rgba(13, 110, 253, 0.25);
    }
    .a4a-card {
      background: #fff;
      border-radius: 1rem;
      box-shadow: 0 0.35rem 1.25rem rgba(15, 23, 42, 0.08);
      border: 1px solid rgba(15, 23, 42, 0.08);
      padding: 1.5rem;
    }
    .a4a-card + .a4a-card {
      margin-top: 1.5rem;
    }
    .a4a-card-title {
      font-size: 1.05rem;
      font-weight: 600;
      margin-bottom: 1rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
    }
    .a4a-notice {
      margin-bottom: 1.5rem;
    }
    .a4a-muted {
      color: #6b7280;
      font-size: 0.9rem;
    }
    .a4a-empty {
      padding: 1.25rem;
      text-align: center;
      color: #6b7280;
      font-size: 0.95rem;
    }
    .a4a-list-group {
      max-height: 480px;
      overflow-y: auto;
    }
    .a4a-list-group .list-group-item {
      border: none;
      border-radius: 0.75rem;
      margin-bottom: 0.5rem;
      background: #f9fafb;
      cursor: pointer;
    }
    .a4a-list-group .list-group-item.active {
      background: #0d6efd;
      color: #fff;
      box-shadow: 0 0.4rem 0.9rem rgba(13,110,253,0.25);
    }
    .a4a-table-wrapper {
      border-radius: 1rem;
      overflow: hidden;
      border: 1px solid rgba(15, 23, 42, 0.08);
    }
    table.a4a-table {
      margin: 0;
    }
    table.a4a-table thead {
      background: #f3f4f6;
      font-size: 0.85rem;
      text-transform: uppercase;
      letter-spacing: 0.02em;
    }
    .a4a-table tbody tr {
      vertical-align: middle;
    }
    .a4a-field-highlight input,
    .a4a-field-highlight textarea {
      background: #ffffff;
      border: 1px solid rgba(107, 114, 128, 0.35);
      box-shadow: inset 0 0.05rem 0.25rem rgba(15, 23, 42, 0.05);
    }
    .a4a-pill {
      display: inline-flex;
      align-items: center;
      padding: 0.2rem 0.65rem;
      border-radius: 999px;
      font-size: 0.75rem;
      background: rgba(13, 110, 253, 0.12);
      color: #0d6efd;
      font-weight: 600;
    }
    .a4a-form-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
    }
    .a4a-sticky-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      border-top: 1px solid rgba(15, 23, 42, 0.08);
      padding-top: 1rem;
      margin-top: 1rem;
    }
    .a4a-options-group .input-group {
      border: 1px solid rgba(15, 23, 42, 0.08);
      border-radius: 0.75rem;
      overflow: hidden;
    }
    .a4a-options-group .input-group + .input-group {
      margin-top: 0.75rem;
    }
    .a4a-options-group button[data-action="remove-option"] {
      min-width: 90px;
    }
  `;
  shadow.appendChild(baseStyle);

  const app = document.createElement('div');
  app.className = 'a4a-app container-fluid py-4';
  shadow.appendChild(app);

  const initialView = (host.getAttribute('data-default-view') || config.defaultView || 'clients').toString().toLowerCase();

  const state = {
    view: initialView === 'categories' ? 'categories' : 'clients',
    clients: [],
    clientDetail: null,
    clientUrls: [],
    categories: [],
    selectedClientId: null,
    selectedUrlId: null,
    selectedCategoryId: null,
    loading: {
      clients: false,
      clientDetail: false,
      clientSave: false,
      urlSave: false,
      categories: false,
      categorySave: false
    },
    notice: {
      type: '',
      message: ''
    }
  };

  const loaded = {
    clients: false,
    categories: false
  };

  const els = {};

  function buildLayout() {
    const nav = document.createElement('div');
    nav.className = 'a4a-nav d-flex align-items-center gap-2 mb-4';

    const clientsTab = document.createElement('button');
    clientsTab.type = 'button';
    clientsTab.dataset.view = 'clients';
    clientsTab.textContent = 'Clients';

    const categoriesTab = document.createElement('button');
    categoriesTab.type = 'button';
    categoriesTab.dataset.view = 'categories';
    categoriesTab.textContent = 'Categories';

    nav.appendChild(clientsTab);
    nav.appendChild(categoriesTab);
    app.appendChild(nav);

    els.navClients = clientsTab;
    els.navCategories = categoriesTab;

    const notice = document.createElement('div');
    notice.className = 'a4a-notice';
    app.appendChild(notice);
    els.notice = notice;

    const clientsSection = document.createElement('section');
    clientsSection.dataset.section = 'clients';
    clientsSection.className = 'a4a-section-clients';

    const clientRow = document.createElement('div');
    clientRow.className = 'row g-4';

    const clientListCol = document.createElement('div');
    clientListCol.className = 'col-lg-4';

    const clientListCard = document.createElement('div');
    clientListCard.className = 'a4a-card h-100';

    const clientListHeader = document.createElement('div');
    clientListHeader.className = 'a4a-card-title';
    clientListHeader.textContent = 'Clients';

    const newClientButton = document.createElement('button');
    newClientButton.type = 'button';
    newClientButton.className = 'btn btn-sm btn-outline-primary';
    newClientButton.textContent = 'New Client';
    newClientButton.dataset.action = 'new-client';
    clientListHeader.appendChild(newClientButton);

    const clientSearch = document.createElement('input');
    clientSearch.type = 'search';
    clientSearch.className = 'form-control form-control-sm mb-3';
    clientSearch.placeholder = 'Search clients...';
    clientSearch.dataset.element = 'client-search';

    const clientList = document.createElement('div');
    clientList.className = 'a4a-list-group list-group';
    clientList.dataset.element = 'client-list';

    clientListCard.appendChild(clientListHeader);
    clientListCard.appendChild(clientSearch);
    clientListCard.appendChild(clientList);
    clientListCol.appendChild(clientListCard);

    const clientDetailCol = document.createElement('div');
    clientDetailCol.className = 'col-lg-8';

    const clientFormCard = document.createElement('div');
    clientFormCard.className = 'a4a-card';

    const clientFormTitle = document.createElement('div');
    clientFormTitle.className = 'a4a-card-title';
    clientFormTitle.textContent = 'Client details';

    const clientForm = document.createElement('form');
    clientForm.dataset.element = 'client-form';

    const clientNameGroup = document.createElement('div');
    clientNameGroup.className = 'mb-3';
    const clientNameLabel = document.createElement('label');
    clientNameLabel.className = 'form-label';
    clientNameLabel.textContent = 'Name';
    const clientNameInput = document.createElement('input');
    clientNameInput.type = 'text';
    clientNameInput.required = true;
    clientNameInput.className = 'form-control';
    clientNameInput.dataset.element = 'client-name';
    clientNameGroup.appendChild(clientNameLabel);
    clientNameGroup.appendChild(clientNameInput);

    const clientNotesGroup = document.createElement('div');
    clientNotesGroup.className = 'mb-3';
    const clientNotesLabel = document.createElement('label');
    clientNotesLabel.className = 'form-label';
    clientNotesLabel.textContent = 'Notes';
    const clientNotesTextarea = document.createElement('textarea');
    clientNotesTextarea.rows = 4;
    clientNotesTextarea.className = 'form-control';
    clientNotesTextarea.dataset.element = 'client-notes';
    clientNotesGroup.appendChild(clientNotesLabel);
    clientNotesGroup.appendChild(clientNotesTextarea);

    const clientActions = document.createElement('div');
    clientActions.className = 'a4a-form-actions';
    const clientSaveButton = document.createElement('button');
    clientSaveButton.type = 'submit';
    clientSaveButton.className = 'btn btn-primary';
    clientSaveButton.textContent = 'Save client';
    const clientResetButton = document.createElement('button');
    clientResetButton.type = 'button';
    clientResetButton.className = 'btn btn-outline-secondary';
    clientResetButton.dataset.action = 'reset-client';
    clientResetButton.textContent = 'Reset';
    const clientDeleteButton = document.createElement('button');
    clientDeleteButton.type = 'button';
    clientDeleteButton.className = 'btn btn-outline-danger ms-auto';
    clientDeleteButton.dataset.action = 'delete-client';
    clientDeleteButton.textContent = 'Delete client';
    clientActions.appendChild(clientSaveButton);
    clientActions.appendChild(clientResetButton);
    clientActions.appendChild(clientDeleteButton);

    clientForm.appendChild(clientNameGroup);
    clientForm.appendChild(clientNotesGroup);
    clientForm.appendChild(clientActions);

    clientFormCard.appendChild(clientFormTitle);
    clientFormCard.appendChild(clientForm);

    const urlCard = document.createElement('div');
    urlCard.className = 'a4a-card';

    const urlHeader = document.createElement('div');
    urlHeader.className = 'a4a-card-title';
    urlHeader.textContent = 'Client URLs';

    const urlTableWrapper = document.createElement('div');
    urlTableWrapper.className = 'a4a-table-wrapper mb-3';
    const urlTable = document.createElement('table');
    urlTable.className = 'table table-sm table-hover mb-0 a4a-table';
    const urlThead = document.createElement('thead');
    urlThead.innerHTML = '<tr><th scope="col">URL</th><th scope="col">Schedule</th><th scope="col">AI Prompt</th><th scope="col">Run Request</th><th scope="col" class="text-end">Actions</th></tr>';
    const urlTbody = document.createElement('tbody');
    urlTbody.dataset.element = 'url-table-body';
    urlTable.appendChild(urlThead);
    urlTable.appendChild(urlTbody);
    urlTableWrapper.appendChild(urlTable);

    const urlForm = document.createElement('form');
    urlForm.dataset.element = 'url-form';

    const urlRow = document.createElement('div');
    urlRow.className = 'row g-3';

    const urlCol = document.createElement('div');
    urlCol.className = 'col-md-6';
    urlCol.innerHTML = '<label class="form-label">URL</label>';
    const urlInput = document.createElement('input');
    urlInput.type = 'url';
    urlInput.required = true;
    urlInput.className = 'form-control a4a-field-highlight';
    urlInput.placeholder = 'https://example.com/path';
    urlInput.dataset.element = 'url-field';
    urlCol.appendChild(urlInput);

    const scheduleCol = document.createElement('div');
    scheduleCol.className = 'col-md-6';
    scheduleCol.innerHTML = '<label class="form-label">Schedule</label>';
    const scheduleInput = document.createElement('input');
    scheduleInput.type = 'text';
    scheduleInput.className = 'form-control';
    scheduleInput.placeholder = 'e.g. daily at 02:00';
    scheduleInput.dataset.element = 'schedule-field';
    scheduleCol.appendChild(scheduleInput);

    const descriptionCol = document.createElement('div');
    descriptionCol.className = 'col-12';
    descriptionCol.innerHTML = '<label class="form-label">Description</label>';
    const descriptionTextarea = document.createElement('textarea');
    descriptionTextarea.rows = 3;
    descriptionTextarea.className = 'form-control a4a-field-highlight';
    descriptionTextarea.dataset.element = 'description-field';
    descriptionCol.appendChild(descriptionTextarea);

    const promptCol = document.createElement('div');
    promptCol.className = 'col-12';
    promptCol.innerHTML = '<label class="form-label">AI Prompt</label>';
    const promptTextarea = document.createElement('textarea');
    promptTextarea.rows = 3;
    promptTextarea.className = 'form-control';
    promptTextarea.dataset.element = 'prompt-field';
    promptCol.appendChild(promptTextarea);

    const returnedCol = document.createElement('div');
    returnedCol.className = 'col-12';
    returnedCol.innerHTML = '<label class="form-label">Returned Data</label>';
    const returnedTextarea = document.createElement('textarea');
    returnedTextarea.rows = 4;
    returnedTextarea.className = 'form-control a4a-field-highlight';
    returnedTextarea.dataset.element = 'returned-field';
    returnedCol.appendChild(returnedTextarea);

    urlRow.appendChild(urlCol);
    urlRow.appendChild(scheduleCol);
    urlRow.appendChild(descriptionCol);
    urlRow.appendChild(promptCol);
    urlRow.appendChild(returnedCol);

    const urlActions = document.createElement('div');
    urlActions.className = 'a4a-sticky-actions';
    const urlSaveButton = document.createElement('button');
    urlSaveButton.type = 'submit';
    urlSaveButton.className = 'btn btn-success';
    urlSaveButton.textContent = 'Save URL';
    const urlResetButton = document.createElement('button');
    urlResetButton.type = 'button';
    urlResetButton.className = 'btn btn-outline-secondary';
    urlResetButton.dataset.action = 'reset-url';
    urlResetButton.textContent = 'Reset';
    const urlDeleteButton = document.createElement('button');
    urlDeleteButton.type = 'button';
    urlDeleteButton.className = 'btn btn-outline-danger';
    urlDeleteButton.dataset.action = 'delete-url';
    urlDeleteButton.textContent = 'Delete URL';
    urlActions.appendChild(urlResetButton);
    urlActions.appendChild(urlDeleteButton);
    urlActions.appendChild(urlSaveButton);

    urlForm.appendChild(urlRow);
    urlForm.appendChild(urlActions);

    urlCard.appendChild(urlHeader);
    urlCard.appendChild(urlTableWrapper);
    urlCard.appendChild(urlForm);

    clientDetailCol.appendChild(clientFormCard);
    clientDetailCol.appendChild(urlCard);

    clientRow.appendChild(clientListCol);
    clientRow.appendChild(clientDetailCol);
    clientsSection.appendChild(clientRow);
    app.appendChild(clientsSection);

    els.clientsSection = clientsSection;
    els.clientSearch = clientSearch;
    els.clientList = clientList;
    els.newClientButton = newClientButton;
    els.clientForm = clientForm;
    els.clientName = clientNameInput;
    els.clientNotes = clientNotesTextarea;
    els.clientSave = clientSaveButton;
    els.clientReset = clientResetButton;
    els.clientDelete = clientDeleteButton;
    els.clientFormTitle = clientFormTitle;
    els.urlCard = urlCard;
    els.urlTableBody = urlTbody;
    els.urlForm = urlForm;
    els.urlField = urlInput;
    els.scheduleField = scheduleInput;
    els.descriptionField = descriptionTextarea;
    els.promptField = promptTextarea;
    els.returnedField = returnedTextarea;
    els.urlSave = urlSaveButton;
    els.urlReset = urlResetButton;
    els.urlDelete = urlDeleteButton;

    const categoriesSection = document.createElement('section');
    categoriesSection.dataset.section = 'categories';
    categoriesSection.className = 'a4a-section-categories';

    const categoryRow = document.createElement('div');
    categoryRow.className = 'row g-4';

    const categoryListCol = document.createElement('div');
    categoryListCol.className = 'col-lg-6';
    const categoryListCard = document.createElement('div');
    categoryListCard.className = 'a4a-card h-100';
    const categoryListTitle = document.createElement('div');
    categoryListTitle.className = 'a4a-card-title';
    categoryListTitle.textContent = 'Categories';

    const categoryNewButton = document.createElement('button');
    categoryNewButton.type = 'button';
    categoryNewButton.className = 'btn btn-sm btn-outline-primary';
    categoryNewButton.dataset.action = 'new-category';
    categoryNewButton.textContent = 'New Category';
    categoryListTitle.appendChild(categoryNewButton);

    const categoryTableWrapper = document.createElement('div');
    categoryTableWrapper.className = 'a4a-table-wrapper';
    const categoryTable = document.createElement('table');
    categoryTable.className = 'table table-sm table-hover mb-0 a4a-table';
    const categoryHead = document.createElement('thead');
    categoryHead.innerHTML = '<tr><th scope="col">Name</th><th scope="col">Options</th><th scope="col" class="text-end">Actions</th></tr>';
    const categoryBody = document.createElement('tbody');
    categoryBody.dataset.element = 'category-table-body';
    categoryTable.appendChild(categoryHead);
    categoryTable.appendChild(categoryBody);
    categoryTableWrapper.appendChild(categoryTable);

    categoryListCard.appendChild(categoryListTitle);
    categoryListCard.appendChild(categoryTableWrapper);
    categoryListCol.appendChild(categoryListCard);

    const categoryFormCol = document.createElement('div');
    categoryFormCol.className = 'col-lg-6';
    const categoryFormCard = document.createElement('div');
    categoryFormCard.className = 'a4a-card';

    const categoryFormTitle = document.createElement('div');
    categoryFormTitle.className = 'a4a-card-title';
    categoryFormTitle.textContent = 'Category details';

    const categoryForm = document.createElement('form');
    categoryForm.dataset.element = 'category-form';

    const categoryNameGroup = document.createElement('div');
    categoryNameGroup.className = 'mb-3';
    const categoryNameLabel = document.createElement('label');
    categoryNameLabel.className = 'form-label';
    categoryNameLabel.textContent = 'Name';
    const categoryNameInput = document.createElement('input');
    categoryNameInput.type = 'text';
    categoryNameInput.required = true;
    categoryNameInput.className = 'form-control';
    categoryNameInput.dataset.element = 'category-name';
    categoryNameGroup.appendChild(categoryNameLabel);
    categoryNameGroup.appendChild(categoryNameInput);

    const optionsLabelRow = document.createElement('div');
    optionsLabelRow.className = 'd-flex align-items-center justify-content-between mb-2';
    const optionsLabel = document.createElement('label');
    optionsLabel.className = 'form-label mb-0';
    optionsLabel.textContent = 'Options';
    const addOptionButton = document.createElement('button');
    addOptionButton.type = 'button';
    addOptionButton.className = 'btn btn-sm btn-outline-secondary';
    addOptionButton.dataset.action = 'add-option';
    addOptionButton.textContent = 'Add option';
    optionsLabelRow.appendChild(optionsLabel);
    optionsLabelRow.appendChild(addOptionButton);

    const optionsContainer = document.createElement('div');
    optionsContainer.className = 'a4a-options-group';
    optionsContainer.dataset.element = 'options-container';

    const categoryActions = document.createElement('div');
    categoryActions.className = 'a4a-form-actions mt-3';
    const categorySaveButton = document.createElement('button');
    categorySaveButton.type = 'submit';
    categorySaveButton.className = 'btn btn-primary';
    categorySaveButton.textContent = 'Save category';
    const categoryResetButton = document.createElement('button');
    categoryResetButton.type = 'button';
    categoryResetButton.className = 'btn btn-outline-secondary';
    categoryResetButton.dataset.action = 'reset-category';
    categoryResetButton.textContent = 'Reset';
    const categoryDeleteButton = document.createElement('button');
    categoryDeleteButton.type = 'button';
    categoryDeleteButton.className = 'btn btn-outline-danger ms-auto';
    categoryDeleteButton.dataset.action = 'delete-category';
    categoryDeleteButton.textContent = 'Delete category';
    categoryActions.appendChild(categorySaveButton);
    categoryActions.appendChild(categoryResetButton);
    categoryActions.appendChild(categoryDeleteButton);

    categoryForm.appendChild(categoryNameGroup);
    categoryForm.appendChild(optionsLabelRow);
    categoryForm.appendChild(optionsContainer);
    categoryForm.appendChild(categoryActions);

    categoryFormCard.appendChild(categoryFormTitle);
    categoryFormCard.appendChild(categoryForm);
    categoryFormCol.appendChild(categoryFormCard);

    categoryRow.appendChild(categoryListCol);
    categoryRow.appendChild(categoryFormCol);
    categoriesSection.appendChild(categoryRow);
    app.appendChild(categoriesSection);

    els.categoriesSection = categoriesSection;
    els.categoryTableBody = categoryBody;
    els.newCategoryButton = categoryNewButton;
    els.categoryForm = categoryForm;
    els.categoryName = categoryNameInput;
    els.optionsContainer = optionsContainer;
    els.addOption = addOptionButton;
    els.categorySave = categorySaveButton;
    els.categoryReset = categoryResetButton;
    els.categoryDelete = categoryDeleteButton;
    els.categoryFormTitle = categoryFormTitle;
  }

  buildLayout();

  function setNotice(message, type = '') {
    state.notice.message = message || '';
    state.notice.type = type || '';
    renderNotice();
  }

  function renderNotice() {
    const { notice } = state;
    els.notice.innerHTML = '';
    if (!notice.message) {
      return;
    }
    const alert = document.createElement('div');
    const typeClass = notice.type ? `alert-${notice.type}` : 'alert-info';
    alert.className = `alert ${typeClass}`;
    alert.role = 'status';
    alert.textContent = notice.message;
    els.notice.appendChild(alert);
  }

  function renderView() {
    const view = state.view;
    els.navClients.classList.toggle('active', view === 'clients');
    els.navCategories.classList.toggle('active', view === 'categories');
    els.clientsSection.classList.toggle('d-none', view !== 'clients');
    els.categoriesSection.classList.toggle('d-none', view !== 'categories');
  }

  function buildQuery(url, params) {
    if (!params || typeof params !== 'object') {
      return url;
    }
    const query = Object.entries(params)
      .filter(([, value]) => value !== undefined && value !== null && value !== '')
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&');
    if (!query) {
      return url;
    }
    return `${url}${url.includes('?') ? '&' : '?'}${query}`;
  }

  async function api(url, options = {}) {
    const opts = {
      method: options.method || 'GET',
      headers: Object.assign(
        {
          'X-WP-Nonce': config.nonce
        },
        options.headers || {}
      ),
      credentials: 'same-origin'
    };

    if (options.body !== undefined) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(options.body);
    }

    const response = await fetch(url, opts);
    if (!response.ok) {
      let message = `Request failed (${response.status})`;
      try {
        const data = await response.json();
        if (data && data.message) {
          message = data.message;
        }
      } catch (error) {
        // ignore parsing errors
      }
      throw new Error(message);
    }

    if (response.status === 204) {
      return null;
    }

    return response.json();
  }

  function getFilteredClients() {
    const searchTerm = els.clientSearch.value.trim().toLowerCase();
    if (!searchTerm) {
      return state.clients.slice();
    }
    return state.clients.filter((client) => client.name.toLowerCase().includes(searchTerm));
  }

  function renderClients() {
    renderClientList();
    renderClientForm();
    renderUrlTable();
    renderUrlForm();
  }

  function renderClientList() {
    const container = els.clientList;
    container.innerHTML = '';

    if (state.loading.clients) {
      const loading = document.createElement('div');
      loading.className = 'a4a-empty';
      loading.textContent = 'Loading clients...';
      container.appendChild(loading);
      return;
    }

    const clients = getFilteredClients();
    if (!clients.length) {
      const empty = document.createElement('div');
      empty.className = 'a4a-empty';
      empty.textContent = 'No clients found.';
      container.appendChild(empty);
      return;
    }

    clients.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

    clients.forEach((client) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'list-group-item list-group-item-action d-flex justify-content-between align-items-center';
      item.dataset.clientId = String(client.id);
      item.textContent = client.name || `Client #${client.id}`;

      const badge = document.createElement('span');
      badge.className = 'a4a-pill';
      badge.textContent = `${client.url_count || 0} URLs`;
      item.appendChild(badge);

      if (state.selectedClientId === client.id) {
        item.classList.add('active');
      }

      container.appendChild(item);
    });
  }

  function renderClientForm() {
    const editing = Number.isFinite(state.selectedClientId);
    const detail = state.clientDetail;

    els.clientFormTitle.textContent = editing ? 'Edit client' : 'New client';
    els.clientDelete.classList.toggle('d-none', !editing);

    if (state.loading.clientDetail && editing) {
      els.clientForm.classList.add('position-relative');
      els.clientForm.style.opacity = '0.6';
    } else {
      els.clientForm.classList.remove('position-relative');
      els.clientForm.style.opacity = '';
    }

    els.clientName.disabled = state.loading.clientSave;
    els.clientNotes.disabled = state.loading.clientSave;
    els.clientSave.disabled = state.loading.clientSave;
    els.clientReset.disabled = state.loading.clientSave;
    els.clientDelete.disabled = state.loading.clientSave;

    if (editing && detail) {
      els.clientName.value = detail.name || '';
      els.clientNotes.value = detail.notes || '';
    } else if (!state.loading.clientSave) {
      els.clientName.value = '';
      els.clientNotes.value = '';
    }
  }

  function renderUrlTable() {
    const tbody = els.urlTableBody;
    tbody.innerHTML = '';

    if (!state.selectedClientId) {
      const row = document.createElement('tr');
      const cell = document.createElement('td');
      cell.colSpan = 5;
      cell.className = 'a4a-empty';
      cell.textContent = 'Select a client to view its URLs.';
      row.appendChild(cell);
      tbody.appendChild(row);
      return;
    }

    if (state.loading.clientDetail) {
      const row = document.createElement('tr');
      const cell = document.createElement('td');
      cell.colSpan = 5;
      cell.className = 'a4a-empty';
      cell.textContent = 'Loading URLs...';
      row.appendChild(cell);
      tbody.appendChild(row);
      return;
    }

    if (!state.clientUrls.length) {
      const row = document.createElement('tr');
      const cell = document.createElement('td');
      cell.colSpan = 5;
      cell.className = 'a4a-empty';
      cell.textContent = 'No URLs registered for this client yet.';
      row.appendChild(cell);
      tbody.appendChild(row);
      return;
    }

    state.clientUrls.forEach((item) => {
      const row = document.createElement('tr');
      row.dataset.urlId = String(item.id);

      const cellUrl = document.createElement('td');
      const urlLink = document.createElement('a');
      urlLink.href = item.url || '#';
      urlLink.textContent = item.url || '(empty)';
      urlLink.target = '_blank';
      urlLink.rel = 'noopener noreferrer';
      cellUrl.appendChild(urlLink);

      const cellSchedule = document.createElement('td');
      cellSchedule.textContent = item.schedule || '—';

      const cellPrompt = document.createElement('td');
      cellPrompt.textContent = item.prompt ? `${item.prompt.slice(0, 60)}${item.prompt.length > 60 ? '…' : ''}` : '—';

      const cellRun = document.createElement('td');
      cellRun.textContent = item.run_requested_gmt ? item.run_requested_gmt : '—';

      const cellActions = document.createElement('td');
      cellActions.className = 'text-end';

      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'btn btn-sm btn-link text-primary px-1';
      editBtn.dataset.action = 'edit-url';
      editBtn.dataset.urlId = String(item.id);
      editBtn.textContent = 'Edit';

      const runBtn = document.createElement('button');
      runBtn.type = 'button';
      runBtn.className = 'btn btn-sm btn-link text-success px-1';
      runBtn.dataset.action = 'run-url';
      runBtn.dataset.urlId = String(item.id);
      runBtn.textContent = 'Run now';

      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'btn btn-sm btn-link text-danger px-1';
      deleteBtn.dataset.action = 'delete-url-row';
      deleteBtn.dataset.urlId = String(item.id);
      deleteBtn.textContent = 'Delete';

      cellActions.appendChild(editBtn);
      cellActions.appendChild(runBtn);
      cellActions.appendChild(deleteBtn);

      row.appendChild(cellUrl);
      row.appendChild(cellSchedule);
      row.appendChild(cellPrompt);
      row.appendChild(cellRun);
      row.appendChild(cellActions);

      if (state.selectedUrlId === item.id) {
        row.classList.add('table-primary');
      }

      tbody.appendChild(row);
    });
  }

  function renderUrlForm() {
    const editing = Number.isFinite(state.selectedUrlId);
    const disabled = !state.selectedClientId || state.loading.urlSave;

    els.urlField.disabled = disabled;
    els.scheduleField.disabled = disabled;
    els.descriptionField.disabled = disabled;
    els.promptField.disabled = disabled;
    els.returnedField.disabled = disabled;
    els.urlSave.disabled = disabled;
    els.urlReset.disabled = disabled;
    els.urlDelete.disabled = disabled || !editing;

    if (!state.selectedClientId) {
      els.urlCard.classList.add('opacity-50');
    } else {
      els.urlCard.classList.remove('opacity-50');
    }

    els.urlDelete.classList.toggle('d-none', !editing);

    if (editing) {
      const match = state.clientUrls.find((item) => item.id === state.selectedUrlId);
      if (match) {
        els.urlField.value = match.url || '';
        els.scheduleField.value = match.schedule || '';
        els.descriptionField.value = match.description || '';
        els.promptField.value = match.prompt || '';
        els.returnedField.value = match.returned_data || '';
        return;
      }
    }

    if (!disabled) {
      els.urlField.value = '';
      els.scheduleField.value = '';
      els.descriptionField.value = '';
      els.promptField.value = '';
      els.returnedField.value = '';
    }
  }

  function renderCategories() {
    renderCategoryTable();
    renderCategoryForm();
  }

  function renderCategoryTable() {
    const tbody = els.categoryTableBody;
    tbody.innerHTML = '';

    if (state.loading.categories) {
      const row = document.createElement('tr');
      const cell = document.createElement('td');
      cell.colSpan = 3;
      cell.className = 'a4a-empty';
      cell.textContent = 'Loading categories...';
      row.appendChild(cell);
      tbody.appendChild(row);
      return;
    }

    if (!state.categories.length) {
      const row = document.createElement('tr');
      const cell = document.createElement('td');
      cell.colSpan = 3;
      cell.className = 'a4a-empty';
      cell.textContent = 'No categories yet.';
      row.appendChild(cell);
      tbody.appendChild(row);
      return;
    }

    state.categories.forEach((category) => {
      const row = document.createElement('tr');
      row.dataset.categoryId = String(category.id);

      const nameCell = document.createElement('td');
      nameCell.textContent = category.name || `Category #${category.id}`;

      const optionsCell = document.createElement('td');
      optionsCell.textContent = `${category.options ? category.options.length : 0} option(s)`;

      const actionsCell = document.createElement('td');
      actionsCell.className = 'text-end';
      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'btn btn-sm btn-link text-primary px-1';
      editBtn.dataset.action = 'edit-category';
      editBtn.dataset.categoryId = String(category.id);
      editBtn.textContent = 'Edit';
      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'btn btn-sm btn-link text-danger px-1';
      deleteBtn.dataset.action = 'delete-category-row';
      deleteBtn.dataset.categoryId = String(category.id);
      deleteBtn.textContent = 'Delete';
      actionsCell.appendChild(editBtn);
      actionsCell.appendChild(deleteBtn);

      if (state.selectedCategoryId === category.id) {
        row.classList.add('table-primary');
      }

      row.appendChild(nameCell);
      row.appendChild(optionsCell);
      row.appendChild(actionsCell);
      tbody.appendChild(row);
    });
  }

  function renderCategoryForm() {
    const editing = Number.isFinite(state.selectedCategoryId);
    const category = editing ? state.categories.find((item) => item.id === state.selectedCategoryId) : null;

    els.categoryFormTitle.textContent = editing ? 'Edit category' : 'New category';
    els.categoryDelete.classList.toggle('d-none', !editing);

    els.categoryName.disabled = state.loading.categorySave;
    els.categorySave.disabled = state.loading.categorySave;
    els.categoryReset.disabled = state.loading.categorySave;
    els.categoryDelete.disabled = state.loading.categorySave;
    els.addOption.disabled = state.loading.categorySave;

    if (editing && category) {
      els.categoryName.value = category.name || '';
      renderCategoryOptions(Array.isArray(category.options) ? category.options : []);
    } else if (!state.loading.categorySave) {
      els.categoryName.value = '';
      renderCategoryOptions([]);
    }
  }

  function renderCategoryOptions(options) {
    const container = els.optionsContainer;
    container.innerHTML = '';
    const values = Array.isArray(options) && options.length ? options.slice() : [''];

    values.forEach((value, index) => {
      const group = document.createElement('div');
      group.className = 'input-group';
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'form-control';
      input.value = value || '';
      input.dataset.optionInput = String(index);
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'btn btn-outline-secondary';
      remove.dataset.action = 'remove-option';
      remove.dataset.optionIndex = String(index);
      remove.textContent = 'Remove';
      group.appendChild(input);
      group.appendChild(remove);
      container.appendChild(group);
    });

    if (!container.children.length) {
      const placeholder = document.createElement('div');
      placeholder.className = 'a4a-empty';
      placeholder.textContent = 'Add options to describe this category.';
      container.appendChild(placeholder);
    }
  }

  function readCategoryOptionInputs() {
    const inputs = els.optionsContainer.querySelectorAll('input[data-option-input]');
    const values = [];
    inputs.forEach((input) => {
      values.push(input.value.trim());
    });
    return values;
  }

  async function loadClients(autoSelect = false) {
    state.loading.clients = true;
    renderClientList();
    try {
      const data = await api(config.endpoints.clients);
      state.clients = Array.isArray(data) ? data : [];
      loaded.clients = true;
      if (autoSelect && state.clients.length) {
        const firstId = state.clients[0].id;
        if (!state.selectedClientId) {
          selectClient(firstId);
        } else {
          renderClients();
        }
      } else {
        renderClients();
      }
    } catch (error) {
      console.error(error);
      setNotice(error.message || 'Failed to load clients.', 'danger');
    } finally {
      state.loading.clients = false;
      renderClientList();
    }
  }

  async function loadClientDetail(clientId) {
    if (!clientId) {
      state.clientDetail = null;
      state.clientUrls = [];
      renderClients();
      return;
    }

    state.loading.clientDetail = true;
    renderUrlTable();
    try {
      const detail = await api(buildQuery(`${config.endpoints.clients}/${clientId}`, { with_urls: 1 }));
      state.clientDetail = detail || null;
      state.clientUrls = Array.isArray(detail && detail.urls) ? detail.urls : [];
      renderClients();
    } catch (error) {
      console.error(error);
      setNotice(error.message || 'Failed to load client.', 'danger');
    } finally {
      state.loading.clientDetail = false;
      renderClients();
    }
  }

  async function loadCategories() {
    state.loading.categories = true;
    renderCategoryTable();
    try {
      const data = await api(config.endpoints.categories);
      state.categories = Array.isArray(data) ? data : [];
      loaded.categories = true;
      if (state.selectedCategoryId) {
        const match = state.categories.find((item) => item.id === state.selectedCategoryId);
        if (!match) {
          state.selectedCategoryId = null;
        }
      }
      renderCategories();
    } catch (error) {
      console.error(error);
      setNotice(error.message || 'Failed to load categories.', 'danger');
    } finally {
      state.loading.categories = false;
      renderCategoryTable();
    }
  }

  function selectClient(clientId) {
    const id = clientId ? Number(clientId) : null;
    state.selectedClientId = id;
    state.selectedUrlId = null;
    if (id) {
      loadClientDetail(id);
    } else {
      state.clientDetail = null;
      state.clientUrls = [];
      renderClients();
    }
  }

  function resetClientForm() {
    state.selectedClientId = null;
    state.clientDetail = null;
    state.clientUrls = [];
    state.selectedUrlId = null;
    renderClients();
  }

  function selectUrl(urlId) {
    const id = urlId ? Number(urlId) : null;
    state.selectedUrlId = id;
    renderUrlForm();
    renderUrlTable();
  }

  function resetUrlForm() {
    state.selectedUrlId = null;
    renderUrlForm();
    renderUrlTable();
  }

  function selectCategory(categoryId) {
    const id = categoryId ? Number(categoryId) : null;
    state.selectedCategoryId = id;
    renderCategories();
  }

  function resetCategoryForm() {
    state.selectedCategoryId = null;
    renderCategories();
  }

  async function handleClientSubmit(event) {
    event.preventDefault();
    if (state.loading.clientSave) {
      return;
    }

    const payload = {
      name: els.clientName.value.trim(),
      notes: els.clientNotes.value.trim()
    };

    if (!payload.name) {
      setNotice('Please provide a client name before saving.', 'warning');
      els.clientName.focus();
      return;
    }

    state.loading.clientSave = true;
    renderClientForm();

    try {
      if (state.selectedClientId) {
        const updated = await api(`${config.endpoints.clients}/${state.selectedClientId}`, {
          method: 'PUT',
          body: payload
        });
        state.clientDetail = updated;
        state.clients = state.clients.map((item) => (item.id === updated.id ? updated : item));
        setNotice('Client updated.', 'success');
        renderClients();
      } else {
        const created = await api(config.endpoints.clients, {
          method: 'POST',
          body: payload
        });
        setNotice('Client created.', 'success');
        await loadClients();
        selectClient(created.id);
      }
    } catch (error) {
      console.error(error);
      setNotice(error.message || 'Failed to save client.', 'danger');
    } finally {
      state.loading.clientSave = false;
      renderClientForm();
    }
  }

  async function handleClientDelete() {
    if (!state.selectedClientId || state.loading.clientSave) {
      return;
    }
    if (!window.confirm('Delete this client and all of its URLs? This action cannot be undone.')) {
      return;
    }
    state.loading.clientSave = true;
    renderClientForm();
    try {
      await api(`${config.endpoints.clients}/${state.selectedClientId}`, { method: 'DELETE' });
      setNotice('Client deleted.', 'success');
      state.selectedClientId = null;
      state.clientDetail = null;
      state.clientUrls = [];
      state.selectedUrlId = null;
      await loadClients();
      renderClients();
    } catch (error) {
      console.error(error);
      setNotice(error.message || 'Failed to delete client.', 'danger');
    } finally {
      state.loading.clientSave = false;
      renderClientForm();
    }
  }

  async function handleUrlSubmit(event) {
    event.preventDefault();
    if (!state.selectedClientId) {
      setNotice('Select a client before adding URLs.', 'warning');
      return;
    }
    if (state.loading.urlSave) {
      return;
    }

    const payload = {
      client_id: state.selectedClientId,
      url: els.urlField.value.trim(),
      schedule: els.scheduleField.value.trim(),
      description: els.descriptionField.value.trim(),
      prompt: els.promptField.value.trim(),
      returned_data: els.returnedField.value
    };

    if (!payload.url) {
      setNotice('Please provide a valid URL.', 'warning');
      els.urlField.focus();
      return;
    }

    state.loading.urlSave = true;
    renderUrlForm();

    try {
      if (state.selectedUrlId) {
        const updated = await api(`${config.endpoints.urls}/${state.selectedUrlId}`, {
          method: 'PUT',
          body: payload
        });
        state.clientUrls = state.clientUrls.map((item) => (item.id === updated.id ? updated : item));
        setNotice('URL updated.', 'success');
        selectUrl(updated.id);
      } else {
        const endpoint = buildQuery(`${config.endpoints.clients}/${state.selectedClientId}/urls`, {});
        const created = await api(endpoint, {
          method: 'POST',
          body: payload
        });
        state.clientUrls.unshift(created);
        setNotice('URL added.', 'success');
        selectUrl(created.id);
      }
      renderClients();
    } catch (error) {
      console.error(error);
      setNotice(error.message || 'Failed to save URL.', 'danger');
    } finally {
      state.loading.urlSave = false;
      renderUrlForm();
    }
  }

  async function handleUrlDelete() {
    if (!state.selectedUrlId || state.loading.urlSave) {
      return;
    }
    if (!window.confirm('Delete this URL? This cannot be undone.')) {
      return;
    }
    state.loading.urlSave = true;
    renderUrlForm();
    try {
      await api(`${config.endpoints.urls}/${state.selectedUrlId}`, { method: 'DELETE' });
      state.clientUrls = state.clientUrls.filter((item) => item.id !== state.selectedUrlId);
      state.selectedUrlId = null;
      setNotice('URL deleted.', 'success');
      renderClients();
    } catch (error) {
      console.error(error);
      setNotice(error.message || 'Failed to delete URL.', 'danger');
    } finally {
      state.loading.urlSave = false;
      renderUrlForm();
    }
  }

  async function handleRunNow(urlId) {
    const id = Number(urlId);
    if (!Number.isFinite(id)) {
      return;
    }
    try {
      const endpointTemplate = config.endpoints.runUrl || '';
      const target = endpointTemplate.includes('%d') ? endpointTemplate.replace('%d', String(id)) : `${config.endpoints.urls}/${id}/run`;
      const updated = await api(target, { method: 'POST' });
      if (updated) {
        state.clientUrls = state.clientUrls.map((item) => (item.id === id ? updated : item));
        setNotice('Run request queued for this URL.', 'success');
        renderUrlTable();
      }
    } catch (error) {
      console.error(error);
      setNotice(error.message || 'Failed to run URL immediately.', 'danger');
    }
  }

  async function handleCategorySubmit(event) {
    event.preventDefault();
    if (state.loading.categorySave) {
      return;
    }

    const name = els.categoryName.value.trim();
    const options = readCategoryOptionInputs().filter(Boolean);

    if (!name) {
      setNotice('Please provide a category name before saving.', 'warning');
      els.categoryName.focus();
      return;
    }

    state.loading.categorySave = true;
    renderCategoryForm();

    try {
      if (state.selectedCategoryId) {
        const updated = await api(`${config.endpoints.categories}/${state.selectedCategoryId}`, {
          method: 'PUT',
          body: { name, options }
        });
        state.categories = state.categories.map((item) => (item.id === updated.id ? updated : item));
        setNotice('Category updated.', 'success');
        selectCategory(updated.id);
      } else {
        const created = await api(config.endpoints.categories, {
          method: 'POST',
          body: { name, options }
        });
        state.categories.unshift(created);
        setNotice('Category created.', 'success');
        selectCategory(created.id);
      }
      renderCategories();
    } catch (error) {
      console.error(error);
      setNotice(error.message || 'Failed to save category.', 'danger');
    } finally {
      state.loading.categorySave = false;
      renderCategoryForm();
    }
  }

  async function handleCategoryDelete(sourceId) {
    const id = sourceId ? Number(sourceId) : state.selectedCategoryId;
    if (!Number.isFinite(id) || state.loading.categorySave) {
      return;
    }
    if (!window.confirm('Delete this category? This cannot be undone.')) {
      return;
    }
    state.loading.categorySave = true;
    renderCategoryForm();
    try {
      await api(`${config.endpoints.categories}/${id}`, { method: 'DELETE' });
      state.categories = state.categories.filter((item) => item.id !== id);
      if (state.selectedCategoryId === id) {
        state.selectedCategoryId = null;
      }
      setNotice('Category deleted.', 'success');
      renderCategories();
    } catch (error) {
      console.error(error);
      setNotice(error.message || 'Failed to delete category.', 'danger');
    } finally {
      state.loading.categorySave = false;
      renderCategoryForm();
    }
  }

  function addCategoryOption() {
    const values = readCategoryOptionInputs();
    values.push('');
    renderCategoryOptions(values);
  }

  function removeCategoryOption(index) {
    const values = readCategoryOptionInputs();
    if (values.length <= 1) {
      renderCategoryOptions(['']);
      return;
    }
    values.splice(index, 1);
    renderCategoryOptions(values);
  }

  els.navClients.addEventListener('click', () => {
    state.view = 'clients';
    renderView();
    if (!loaded.clients && !state.loading.clients) {
      loadClients();
    }
  });

  els.navCategories.addEventListener('click', () => {
    state.view = 'categories';
    renderView();
    if (!loaded.categories && !state.loading.categories) {
      loadCategories();
    } else {
      renderCategories();
    }
  });

  els.clientSearch.addEventListener('input', () => {
    renderClientList();
  });

  els.clientList.addEventListener('click', (event) => {
    const target = event.target.closest('button[data-client-id]');
    if (!target) {
      return;
    }
    selectClient(Number(target.dataset.clientId));
  });

  els.newClientButton.addEventListener('click', () => {
    resetClientForm();
  });

  els.clientForm.addEventListener('submit', handleClientSubmit);
  els.clientReset.addEventListener('click', (event) => {
    event.preventDefault();
    resetClientForm();
  });
  els.clientDelete.addEventListener('click', handleClientDelete);

  els.urlForm.addEventListener('submit', handleUrlSubmit);
  els.urlReset.addEventListener('click', (event) => {
    event.preventDefault();
    resetUrlForm();
  });
  els.urlDelete.addEventListener('click', handleUrlDelete);

  els.urlTableBody.addEventListener('click', (event) => {
    const action = event.target.dataset.action;
    const urlId = event.target.dataset.urlId;
    if (!action || !urlId) {
      return;
    }
    if (action === 'edit-url') {
      selectUrl(Number(urlId));
    } else if (action === 'run-url') {
      handleRunNow(Number(urlId));
    } else if (action === 'delete-url-row') {
      state.selectedUrlId = Number(urlId);
      handleUrlDelete();
    }
  });

  els.categoryTableBody.addEventListener('click', (event) => {
    const action = event.target.dataset.action;
    const categoryId = event.target.dataset.categoryId;
    if (!action || !categoryId) {
      return;
    }
    if (action === 'edit-category') {
      selectCategory(Number(categoryId));
    } else if (action === 'delete-category-row') {
      handleCategoryDelete(Number(categoryId));
    }
  });

  els.categoryForm.addEventListener('submit', handleCategorySubmit);
  els.categoryReset.addEventListener('click', (event) => {
    event.preventDefault();
    resetCategoryForm();
  });
  els.categoryDelete.addEventListener('click', () => {
    handleCategoryDelete();
  });

  els.addOption.addEventListener('click', addCategoryOption);
  els.optionsContainer.addEventListener('click', (event) => {
    if (event.target.dataset.action === 'remove-option') {
      const index = Number(event.target.dataset.optionIndex);
      if (Number.isFinite(index)) {
        removeCategoryOption(index);
      }
    }
  });

  setNotice('', '');
  renderView();
  renderClients();
  renderCategories();

  loadClients(true);
  if (state.view === 'categories') {
    loadCategories();
  }
})();
*** End Patch
