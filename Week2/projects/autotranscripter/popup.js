// AutoTranscripter - Popup Script v2
// Manages multi-provider configuration

// ─── Provider metadata ────────────────────────────────────────────────────────

const PROVIDER_META = {
  claude: {
    fields:           { endpoint: false, apiKey: true, model: true },
    apiKeyLabel:      'API Key',
    apiKeyPlaceholder:'sk-ant-...',
    modelPlaceholder: 'claude-haiku-4-5-20251001',
    models:           ['claude-haiku-4-5-20251001', 'claude-sonnet-4-6', 'claude-opus-4-6'],
    note:             null
  },
  openai: {
    fields:           { endpoint: false, apiKey: true, model: true },
    apiKeyLabel:      'API Key',
    apiKeyPlaceholder:'sk-...',
    modelPlaceholder: 'gpt-4o-mini',
    models:           ['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo', 'gpt-4-turbo'],
    note:             null
  },
  gemini: {
    fields:           { endpoint: false, apiKey: true, model: true },
    apiKeyLabel:      'API Key',
    apiKeyPlaceholder:'AIza...',
    modelPlaceholder: 'gemini-2.0-flash',
    models:           ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash-lite'],
    note:             null
  },
  'google-translate': {
    fields:           { endpoint: false, apiKey: true, model: false },
    apiKeyLabel:      'API Key',
    apiKeyPlaceholder:'AIza...',
    modelPlaceholder: '',
    models:           [],
    note:             'Translates Tamil → English only. English transcripts are returned as-is (Google Translate cannot add punctuation).'
  },
  ollama: {
    fields:           { endpoint: true, apiKey: false, model: true },
    apiKeyLabel:      '',
    apiKeyPlaceholder:'',
    endpointPlaceholder: 'http://localhost:11434',
    modelPlaceholder: 'llama3.2',
    models:           ['llama3.2', 'llama3.1', 'mistral', 'gemma2', 'phi3', 'qwen2.5', 'deepseek-r1', 'mixtral'],
    note:             'Ollama must be running on your machine. No API key needed. Default endpoint: http://localhost:11434'
  },
  custom: {
    fields:           { endpoint: true, apiKey: true, model: true },
    apiKeyLabel:      'API Key (optional)',
    apiKeyPlaceholder:'Bearer token or leave blank',
    endpointPlaceholder: 'https://api.example.com',
    modelPlaceholder: 'model-name',
    models:           [],
    note:             'Any OpenAI-compatible API. Enter the base URL — /v1/chat/completions is appended automatically.'
  }
};

const SUPPORTED_HOSTS = ['meet.google.com', 'teams.microsoft.com', 'zoom.us', 'app.zoom.us'];

// ─── DOM refs ─────────────────────────────────────────────────────────────────

const elProviderSelect   = document.getElementById('provider-select');
const elActiveBadge      = document.getElementById('active-badge');
const elFieldEndpoint    = document.getElementById('field-endpoint');
const elFieldApiKey      = document.getElementById('field-api-key');
const elApiKeyLabel      = document.getElementById('api-key-label');
const elFieldModel       = document.getElementById('field-model');
const elConfigEndpoint   = document.getElementById('config-endpoint');
const elConfigApiKey     = document.getElementById('config-api-key');
const elConfigModel      = document.getElementById('config-model');
const elModelSuggestions = document.getElementById('model-suggestions');
const elProviderNote     = document.getElementById('provider-note');
const elToggleVisibility = document.getElementById('toggle-visibility');
const elSaveBtn          = document.getElementById('save-btn');
const elToast            = document.getElementById('toast');
const elStatusCard       = document.getElementById('status-card');
const elStatusTitle      = document.getElementById('status-title');
const elStatusDetail     = document.getElementById('status-detail');

// ─── State ────────────────────────────────────────────────────────────────────

let activeProvider = 'claude';
let allConfigs = {};   // { claude: {apiKey, model}, openai: {apiKey, model}, ... }

// ─── Field visibility ─────────────────────────────────────────────────────────

function updateFields(provider) {
  const meta = PROVIDER_META[provider];
  if (!meta) return;

  // Endpoint field
  elFieldEndpoint.classList.toggle('hidden', !meta.fields.endpoint);
  if (meta.fields.endpoint) {
    elConfigEndpoint.placeholder = meta.endpointPlaceholder || 'http://localhost:11434';
  }

  // API Key field
  elFieldApiKey.classList.toggle('hidden', !meta.fields.apiKey);
  if (meta.fields.apiKey) {
    elApiKeyLabel.textContent  = meta.apiKeyLabel || 'API Key';
    elConfigApiKey.placeholder = meta.apiKeyPlaceholder || '';
  }

  // Model field
  elFieldModel.classList.toggle('hidden', !meta.fields.model);
  if (meta.fields.model) {
    elConfigModel.placeholder = meta.modelPlaceholder || '';
  }

  // Model datalist suggestions
  elModelSuggestions.innerHTML = '';
  for (const m of (meta.models || [])) {
    const opt = document.createElement('option');
    opt.value = m;
    elModelSuggestions.appendChild(opt);
  }

  // Provider note
  if (meta.note) {
    elProviderNote.textContent = meta.note;
    elProviderNote.classList.remove('hidden');
  } else {
    elProviderNote.classList.add('hidden');
  }

  // Active badge
  elActiveBadge.classList.toggle('visible', provider === activeProvider);
}

// ─── Populate form from saved config ─────────────────────────────────────────

function populateFields(provider) {
  const cfg = allConfigs[provider] || {};
  const meta = PROVIDER_META[provider];
  if (!meta) return;

  if (meta.fields.endpoint) {
    elConfigEndpoint.value = cfg.endpoint || '';
  }
  if (meta.fields.apiKey) {
    elConfigApiKey.value = cfg.apiKey || '';
  }
  if (meta.fields.model) {
    elConfigModel.value = cfg.model || '';
  }
}

// ─── On provider dropdown change ──────────────────────────────────────────────

function onProviderChange() {
  const provider = elProviderSelect.value;
  updateFields(provider);
  populateFields(provider);
}

elProviderSelect.addEventListener('change', onProviderChange);

// ─── Load all configs from background ────────────────────────────────────────

function loadConfig() {
  chrome.runtime.sendMessage({ type: 'GET_CONFIG' }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('[AutoTranscripter Popup]', chrome.runtime.lastError);
      return;
    }
    if (!response || !response.success) return;

    activeProvider = response.activeProvider || 'claude';
    allConfigs     = response.providerConfigs || {};

    // Set dropdown
    elProviderSelect.value = activeProvider;

    // Update UI
    updateFields(activeProvider);
    populateFields(activeProvider);
  });
}

// ─── Save config ─────────────────────────────────────────────────────────────

async function requestPermissionForEndpoint(endpoint) {
  try {
    const origin = new URL(endpoint).origin;
    // localhost is already in static host_permissions — skip request
    if (origin === 'http://localhost' || origin === 'http://127.0.0.1') return true;

    const already = await chrome.permissions.contains({ origins: [`${origin}/*`] });
    if (already) return true;

    return await chrome.permissions.request({ origins: [`${origin}/*`] });
  } catch (e) {
    console.warn('[AutoTranscripter] Permission request error:', e);
    return false;
  }
}

elSaveBtn.addEventListener('click', async () => {
  const provider = elProviderSelect.value;
  const meta     = PROVIDER_META[provider];

  // Build config object from form
  const cfg = {};
  if (meta.fields.endpoint) cfg.endpoint = elConfigEndpoint.value.trim();
  if (meta.fields.apiKey)   cfg.apiKey   = elConfigApiKey.value.trim();
  if (meta.fields.model)    cfg.model    = elConfigModel.value.trim();

  // Validation
  if (meta.fields.apiKey && !cfg.apiKey) {
    showToast('API key is required for this provider', 'error');
    return;
  }
  if (meta.fields.endpoint && !cfg.endpoint) {
    showToast('Endpoint URL is required', 'error');
    return;
  }
  if (meta.fields.model && !cfg.model) {
    showToast('Model name is required', 'error');
    return;
  }

  // Request optional host permission for custom / non-localhost ollama endpoints
  if (cfg.endpoint) {
    elSaveBtn.disabled = true;
    elSaveBtn.textContent = 'Requesting permission...';
    const granted = await requestPermissionForEndpoint(cfg.endpoint);
    elSaveBtn.disabled = false;
    elSaveBtn.textContent = 'Save & Activate';
    if (!granted) {
      showToast('Permission denied for this endpoint host', 'error');
      return;
    }
  }

  // Save to background
  elSaveBtn.disabled = true;
  elSaveBtn.textContent = 'Saving...';

  chrome.runtime.sendMessage(
    { type: 'SAVE_CONFIG', activeProvider: provider, providerConfig: cfg },
    (response) => {
      elSaveBtn.disabled = false;
      elSaveBtn.textContent = 'Save & Activate';

      if (chrome.runtime.lastError) {
        showToast('Error: ' + chrome.runtime.lastError.message, 'error');
        return;
      }
      if (response && response.success) {
        activeProvider = provider;
        allConfigs[provider] = cfg;
        elActiveBadge.classList.add('visible');
        showToast('Saved! ' + getProviderDisplayName(provider) + ' is now active', 'success');
      } else {
        showToast('Failed to save: ' + (response?.error || 'unknown error'), 'error');
      }
    }
  );
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getProviderDisplayName(provider) {
  const names = {
    claude: 'Claude', openai: 'OpenAI', gemini: 'Gemini',
    'google-translate': 'Google Translate', ollama: 'Ollama', custom: 'Custom API'
  };
  return names[provider] || provider;
}

function showToast(msg, type) {
  elToast.textContent = msg;
  elToast.className   = 'toast ' + type;
  setTimeout(() => { elToast.textContent = ''; elToast.className = 'toast'; }, 3500);
}

// Show/hide API key
elToggleVisibility.addEventListener('click', () => {
  const isHidden = elConfigApiKey.type === 'password';
  elConfigApiKey.type         = isHidden ? 'text'     : 'password';
  elToggleVisibility.textContent = isHidden ? '🙈' : '👁';
});

// ─── Tab status detection ─────────────────────────────────────────────────────

function checkCurrentTab() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (!tab?.url) { setNotSupported('No active tab detected'); return; }

    try {
      const host = new URL(tab.url).hostname;
      const ok   = SUPPORTED_HOSTS.some(h => host === h || host.endsWith('.' + h));
      ok ? setSupported(host) : setNotSupported('Navigate to a supported meeting page');
    } catch {
      setNotSupported('Unable to detect current page');
    }
  });
}

function setSupported(host) {
  elStatusCard.className     = 'status-card supported';
  elStatusTitle.textContent  = 'Active on this page';
  elStatusDetail.textContent = host;
}

function setNotSupported(detail) {
  elStatusCard.className     = 'status-card not-supported';
  elStatusTitle.textContent  = 'Not a meeting page';
  elStatusDetail.textContent = detail;
}

// ─── Init ─────────────────────────────────────────────────────────────────────

checkCurrentTab();
loadConfig();
