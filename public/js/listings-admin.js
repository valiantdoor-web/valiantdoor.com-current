(function () {
  const tokenInput = document.getElementById('admin-token');
  const output = document.getElementById('output');
  const canonicalEl = document.getElementById('canonical');
  const providersEl = document.getElementById('providers');
  const credentialsEl = document.getElementById('credentials');
  const summaryEl = document.getElementById('summary');
  const tokenStatus = document.getElementById('token-status');
  const appModeStatus = document.getElementById('app-mode-status');
  const syncStatus = document.getElementById('sync-status');
  const installButton = document.getElementById('install-app');
  const installCopy = document.getElementById('install-copy');
  const toggleTokenButton = document.getElementById('toggle-token');
  let deferredInstallPrompt = null;
  const localStorageKey = 'valiantListingsAdminToken';
  const sessionStorageKey = 'valiantListingsAdminSessionToken';

  const savedToken = sessionStorage.getItem(sessionStorageKey) || localStorage.getItem(localStorageKey) || '';
  tokenInput.value = savedToken;
  updateTokenStatus();

  function token() { return tokenInput.value.trim(); }
  function headers() {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token()}`
    };
  }
  function write(value) { output.textContent = typeof value === 'string' ? value : JSON.stringify(value, null, 2); }
  function setSyncState(state, label) {
    if (!syncStatus) return;
    syncStatus.classList.remove('ready', 'error');
    if (state) syncStatus.classList.add(state);
    syncStatus.setAttribute('aria-label', label || 'App status');
    syncStatus.title = label || 'App status';
  }
  function setAppMode() {
    const standalone = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
    const iosStandalone = window.navigator.standalone === true;
    if (appModeStatus) appModeStatus.textContent = standalone || iosStandalone ? 'Installed app mode' : 'Private phone app';
    if (installCopy && /iphone|ipad|ipod/i.test(navigator.userAgent)) {
      installCopy.textContent = 'On iPhone, tap Share, then Add to Home Screen. Your admin token stays in this browser/app only.';
    }
  }
  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>'\"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '\"': '&quot;' }[char]));
  }
  function profileUrl(profile) { return typeof profile === 'string' ? profile : (profile && profile.url) || ''; }
  function statusClass(value) {
    const text = String(value || '').toLowerCase();
    if (text.includes('ready') && !text.includes('needs') && !text.includes('blocked')) return 'status-ready';
    if (text.includes('manual') || text.includes('dry') || text.includes('needs')) return 'status-warn';
    if (text.includes('block') || text.includes('error') || text.includes('unauthorized')) return 'status-blocked';
    return '';
  }
  function boolPill(label, ready) {
    return `<span class="status-pill ${ready ? 'status-ready' : 'status-blocked'}">${escapeHtml(label)}: ${ready ? 'yes' : 'no'}</span>`;
  }
  function updateTokenStatus() {
    const hasToken = Boolean(token());
    tokenStatus.textContent = hasToken
      ? `Token loaded ${sessionStorage.getItem(sessionStorageKey) ? 'for this session' : localStorage.getItem(localStorageKey) ? 'from this browser' : 'from the input'}.`
      : 'Token not loaded.';
    setSyncState(hasToken ? 'ready' : '', hasToken ? 'Token loaded' : 'Token not loaded');
  }

  async function request(path, options = {}) {
    if (!token()) { setSyncState('error', 'Token required'); throw new Error('Paste your LISTINGS_ADMIN_TOKEN first.'); }
    setSyncState('', 'Loading');
    const response = await fetch(path, { ...options, headers: { ...headers(), ...(options.headers || {}) } });
    const text = await response.text();
    let data;
    try { data = text ? JSON.parse(text) : null; } catch (_) { data = text; }
    if (!response.ok) { setSyncState('error', `Request failed ${response.status}`); throw new Error(typeof data === 'string' ? data : (data && data.error) || `Request failed ${response.status}`); }
    setSyncState('ready', 'Loaded');
    return data;
  }

  async function download(path, filename) {
    if (!token()) throw new Error('Paste your LISTINGS_ADMIN_TOKEN first.');
    const response = await fetch(path, { headers: { Authorization: `Bearer ${token()}` } });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `Download failed ${response.status}`);
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function renderSummary(data) {
    const summary = data.summary || {};
    const drift = data.drift && data.drift.summary ? data.drift.summary : {};
    summaryEl.innerHTML = [
      ['Providers', summary.providerCount || 0, 'Total listings tracked'],
      ['API Managed', summary.apiManagedCount || 0, 'Providers marked API-managed'],
      ['Manual', summary.manualTrackedCount || 0, 'Providers tracked manually'],
      ['API Ready', drift.apiReadyCount || 0, 'Providers with write readiness'],
      ['Needs Credentials', drift.apiManagedNeedsCredentials || 0, 'API providers missing credentials/config']
    ].map(([label, value, caption]) => `
      <article class="listings-card">
        <strong>${escapeHtml(label)}</strong>
        <p class="listings-kpi">${escapeHtml(value)}</p>
        <p class="muted small">${escapeHtml(caption)}</p>
      </article>
    `).join('');
  }

  function renderCanonical(data) {
    const business = data && data.canonical && data.canonical.business;
    if (!business) return;
    canonicalEl.innerHTML = [
      ['Name', business.name],
      ['Legal Name', business.legalName],
      ['Phone', business.displayPhone || business.phone],
      ['Email', business.email],
      ['Website', `<a href="${escapeHtml(business.website)}" target="_blank" rel="noopener">${escapeHtml(business.website)}</a>`],
      ['Address', `${escapeHtml(business.address.street)}, ${escapeHtml(business.address.city)}, ${escapeHtml(business.address.region)} ${escapeHtml(business.address.postalCode)}`],
      ['Coordinates', `${escapeHtml(business.geo.latitude)}, ${escapeHtml(business.geo.longitude)}`],
      ['Service Areas', escapeHtml((business.serviceAreas || []).join(', '))],
      ['Services', escapeHtml((business.services || []).join(', '))],
      ['Social Profiles', Object.entries(business.socialProfiles || {}).map(([network, profile]) => {
        const url = profileUrl(profile);
        const label = profile.handle || url || network;
        return url ? `${escapeHtml(network)}: <a href="${escapeHtml(url)}" target="_blank" rel="noopener">${escapeHtml(label)}</a>` : `${escapeHtml(network)}: ${escapeHtml(label)}`;
      }).join('<br>')]
    ].map(([label, value]) => `<article class="listings-card"><strong>${escapeHtml(label)}</strong><p>${value || ''}</p></article>`).join('');
  }

  function renderProviders(data) {
    providersEl.innerHTML = (data.providers || []).map((provider) => `
      <article class="listings-card">
        <h3>${escapeHtml(provider.name)}</h3>
        <p><span class="status-pill ${statusClass(provider.status)}">${escapeHtml(provider.status)}</span><span class="status-pill ${statusClass(provider.driftStatus)}">${escapeHtml(provider.driftStatus)}</span></p>
        <p class="muted">Managed by: ${escapeHtml(provider.managedBy)}</p>
        ${provider.profileUrl ? `<p class="muted"><a href="${escapeHtml(provider.profileUrl)}" target="_blank" rel="noopener">Open profile</a></p>` : ''}
        ${provider.entityIds ? `<p class="muted small">Entity IDs: ${escapeHtml(Object.entries(provider.entityIds).map(([key, value]) => `${key}: ${value}`).join(' | '))}</p>` : ''}
        <p class="muted small">Tracked fields: ${escapeHtml((provider.fieldsTracked || []).join(', '))}</p>
        ${provider.notes ? `<p class="muted small">${escapeHtml(provider.notes)}</p>` : ''}
        <div class="provider-actions">
          <button type="button" data-provider="${escapeHtml(provider.id)}" data-action="payload">Payload</button>
          <button type="button" data-provider="${escapeHtml(provider.id)}" data-action="dry-run">Dry Run</button>
        </div>
      </article>
    `).join('');
  }

  function renderCredentials(data) {
    const credentials = data.credentials || {};
    const syncClients = data.syncClients || {};
    credentialsEl.innerHTML = Object.entries(credentials).map(([providerId, credential]) => {
      const sync = syncClients[providerId] || {};
      const missing = [...new Set([...(credential.missingForRead || []), ...(credential.missingForWrite || [])])];
      return `
        <article class="listings-card">
          <h3>${escapeHtml(credential.label || providerId)}</h3>
          <p>${boolPill('auth', credential.authReady)} ${boolPill('read', credential.canRead)} ${boolPill('write', credential.canWrite)}</p>
          <p><span class="status-pill ${sync.dryRunOnly ? 'status-warn' : 'status-ready'}">${sync.dryRunOnly ? 'dry-run only' : 'write client ready'}</span></p>
          <p class="muted small">Mode: ${escapeHtml(credential.mode || sync.mode || 'tracked')}</p>
          ${missing.length ? `<p class="muted small">Missing: ${escapeHtml(missing.join(', '))}</p>` : '<p class="muted small">No required env keys missing for configured mode.</p>'}
        </article>
      `;
    }).join('');
  }

  function renderStatus(data) {
    renderSummary(data);
    renderCanonical(data);
    renderProviders(data);
    renderCredentials(data);
  }

  async function runAndRender(path) {
    const data = await request(path);
    if (data && data.canonical && data.providers) renderStatus(data);
    write(data);
  }

  document.getElementById('save-session-token').addEventListener('click', () => {
    sessionStorage.setItem(sessionStorageKey, token());
    updateTokenStatus();
    write('Token saved for this browser session only.');
  });

  document.getElementById('save-token').addEventListener('click', () => {
    localStorage.setItem(localStorageKey, token());
    updateTokenStatus();
    write('Token saved in this browser only.');
  });

  document.getElementById('clear-token').addEventListener('click', () => {
    localStorage.removeItem(localStorageKey);
    sessionStorage.removeItem(sessionStorageKey);
    tokenInput.value = '';
    updateTokenStatus();
    write('Token cleared.');
  });

  if (toggleTokenButton) {
    toggleTokenButton.addEventListener('click', () => {
      const showing = tokenInput.type === 'text';
      tokenInput.type = showing ? 'password' : 'text';
      toggleTokenButton.textContent = showing ? 'Show' : 'Hide';
    });
  }

  const tokenForm = document.getElementById('token-form');
  if (tokenForm) tokenForm.addEventListener('submit', (event) => event.preventDefault());

  tokenInput.addEventListener('input', updateTokenStatus);

  document.getElementById('load-status').addEventListener('click', async () => {
    try { await runAndRender('/api/listings/status'); }
    catch (error) { write(error.message); }
  });

  document.getElementById('load-audit').addEventListener('click', async () => {
    try { await runAndRender('/api/listings/audit'); }
    catch (error) { write(error.message); }
  });

  document.getElementById('load-credentials').addEventListener('click', async () => {
    try {
      const data = await request('/api/listings/credentials');
      renderCredentials(data);
      write(data);
    } catch (error) { write(error.message); }
  });

  document.getElementById('load-payloads').addEventListener('click', async () => {
    try { write(await request('/api/listings/payloads')); }
    catch (error) { write(error.message); }
  });

  document.getElementById('dry-run-all').addEventListener('click', async () => {
    try { write(await request('/api/listings/sync', { method: 'POST', body: JSON.stringify({ provider: 'all', commit: false }) })); }
    catch (error) { write(error.message); }
  });

  document.getElementById('export-json').addEventListener('click', async () => {
    try {
      await download('/api/listings/export?format=json', 'valiant-listings-control-center.json');
      write('JSON export downloaded.');
    } catch (error) { write(error.message); }
  });

  document.getElementById('export-csv').addEventListener('click', async () => {
    try {
      await download('/api/listings/export?format=csv', 'valiant-listings-providers.csv');
      write('CSV export downloaded.');
    } catch (error) { write(error.message); }
  });

  providersEl.addEventListener('click', async (event) => {
    const button = event.target.closest('button[data-provider][data-action]');
    if (!button) return;
    const provider = button.getAttribute('data-provider');
    const action = button.getAttribute('data-action');
    try {
      if (action === 'payload') {
        write(await request(`/api/listings/payloads?provider=${encodeURIComponent(provider)}`));
      }
      if (action === 'dry-run') {
        write(await request('/api/listings/sync', { method: 'POST', body: JSON.stringify({ provider, commit: false }) }));
      }
    } catch (error) { write(error.message); }
  });


  document.querySelectorAll('[data-click-target]').forEach((button) => {
    button.addEventListener('click', () => {
      const target = document.getElementById(button.getAttribute('data-click-target'));
      if (target) target.click();
    });
  });

  document.querySelectorAll('[data-scroll-target]').forEach((button) => {
    button.addEventListener('click', () => {
      const target = document.getElementById(button.getAttribute('data-scroll-target'));
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    if (installButton) installButton.hidden = false;
    if (installCopy) installCopy.textContent = 'Install this private listings app on your phone for faster access.';
  });

  if (installButton) {
    installButton.addEventListener('click', async () => {
      if (!deferredInstallPrompt) {
        write('On iPhone, tap Share, then Add to Home Screen. On Android, use the browser install option.');
        return;
      }
      deferredInstallPrompt.prompt();
      const choice = await deferredInstallPrompt.userChoice;
      write(`Install prompt result: ${choice.outcome}.`);
      deferredInstallPrompt = null;
      installButton.hidden = true;
    });
  }

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/listings-admin-sw.js', { scope: '/listings-admin' }).then(() => {
      setAppMode();
    }).catch((error) => {
      write(`Service worker registration failed: ${error.message}`);
    });
  }

  setAppMode();

  const launchAction = new URLSearchParams(window.location.search).get('action');
  if (launchAction && token()) {
    const actionMap = { status: 'load-status', audit: 'load-audit', credentials: 'load-credentials', payloads: 'load-payloads' };
    const target = document.getElementById(actionMap[launchAction]);
    if (target) setTimeout(() => target.click(), 100);
  }

  if (token()) {
    request('/api/listings/status').then((data) => {
      renderStatus(data);
      write(data);
    }).catch((error) => write(error.message));
  }
})();
