// AutoTranscripter - Background Service Worker v2
// Multi-provider: Claude, OpenAI, Gemini, Google Translate, Ollama, Custom

// ─── Provider metadata ────────────────────────────────────────────────────────

const PROVIDER_NAMES = {
  claude:            'Claude (Anthropic)',
  openai:            'OpenAI',
  gemini:            'Google Gemini',
  'google-translate':'Google Translate',
  ollama:            'Ollama (Local)',
  custom:            'Custom API'
};

const PROVIDER_DEFAULTS = {
  claude:            { model: 'claude-haiku-4-5-20251001' },
  openai:            { model: 'gpt-4o-mini' },
  gemini:            { model: 'gemini-2.0-flash' },
  'google-translate':{ },
  ollama:            { endpoint: 'http://localhost:11434', model: 'llama3.2' },
  custom:            { endpoint: '', apiKey: '', model: '' }
};

// ─── Storage helpers ──────────────────────────────────────────────────────────

async function getFullConfig() {
  const storageKeys = ['activeProvider', ...Object.keys(PROVIDER_DEFAULTS).map(p => `cfg_${p}`)];
  const data = await chrome.storage.sync.get(storageKeys);

  const providerConfigs = {};
  for (const provider of Object.keys(PROVIDER_DEFAULTS)) {
    providerConfigs[provider] = {
      ...PROVIDER_DEFAULTS[provider],
      ...(data[`cfg_${provider}`] || {})
    };
  }

  return {
    activeProvider: data.activeProvider || 'claude',
    providerConfigs
  };
}

// ─── Shared prompt builder ────────────────────────────────────────────────────

function getSystemPrompt(language) {
  return language === 'ta-IN'
    ? 'Translate the following Tamil speech transcript to English. Return only the translation, nothing else.'
    : 'Add proper punctuation and capitalization to the following speech transcript. Return only the corrected text, nothing else.';
}

// ─── Provider: Claude (Anthropic) ────────────────────────────────────────────

async function callClaude(text, language, config) {
  const { apiKey, model } = config;
  if (!apiKey) throw new Error('Claude API key is not configured. Open the extension popup to add it.');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: model || 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: getSystemPrompt(language),
      messages: [{ role: 'user', content: text }]
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Claude ${res.status}: ${err.error?.message || res.statusText}`);
  }

  const data = await res.json();
  return data.content?.[0]?.text || text;
}

// ─── Provider: OpenAI-compatible (OpenAI / Ollama / Custom) ──────────────────
// Shared adapter — all three providers use the same /v1/chat/completions schema.

async function callOpenAICompatible(baseUrl, apiKey, model, systemPrompt, text) {
  const base = baseUrl.replace(/\/+$/, '');
  const endpoint = `${base}/v1/chat/completions`;

  const headers = { 'Content-Type': 'application/json' };
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: text }
      ],
      max_tokens: 1024,
      temperature: 0.1
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`API ${res.status}: ${err.error?.message || res.statusText}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || text;
}

async function callOpenAI(text, language, config) {
  const { apiKey, model } = config;
  if (!apiKey) throw new Error('OpenAI API key is not configured. Open the extension popup to add it.');
  return callOpenAICompatible('https://api.openai.com', apiKey, model || 'gpt-4o-mini', getSystemPrompt(language), text);
}

async function callOllama(text, language, config) {
  const endpoint = config.endpoint || 'http://localhost:11434';
  const model = config.model || 'llama3.2';
  return callOpenAICompatible(endpoint, '', model, getSystemPrompt(language), text);
}

async function callCustom(text, language, config) {
  const { endpoint, apiKey, model } = config;
  if (!endpoint) throw new Error('Custom endpoint URL is not configured. Open the extension popup to add it.');
  if (!model)    throw new Error('Model name is required for custom endpoint.');
  return callOpenAICompatible(endpoint, apiKey || '', model, getSystemPrompt(language), text);
}

// ─── Provider: Google Gemini ──────────────────────────────────────────────────

async function callGemini(text, language, config) {
  const { apiKey, model } = config;
  if (!apiKey) throw new Error('Gemini API key is not configured. Open the extension popup to add it.');

  const modelName = model || 'gemini-2.0-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: getSystemPrompt(language) }] },
      contents: [{ parts: [{ text }] }],
      generationConfig: { maxOutputTokens: 1024, temperature: 0.1 }
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Gemini ${res.status}: ${err.error?.message || res.statusText}`);
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || text;
}

// ─── Provider: Google Translate ───────────────────────────────────────────────
// Note: Google Translate is a pure translation API (not a generative AI).
// For Tamil input: translates ta→en.
// For English input: returns raw text unchanged (GT cannot add punctuation).

async function callGoogleTranslate(text, language, config) {
  const { apiKey } = config;
  if (!apiKey) throw new Error('Google Translate API key is not configured. Open the extension popup to add it.');

  // English source — translation not needed; return as-is
  if (language !== 'ta-IN') return text;

  const url = `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: text, source: 'ta', target: 'en', format: 'text' })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Google Translate ${res.status}: ${err.error?.message || res.statusText}`);
  }

  const data = await res.json();
  return data.data?.translations?.[0]?.translatedText || text;
}

// ─── Router ───────────────────────────────────────────────────────────────────

async function routeToProvider(text, language) {
  const { activeProvider, providerConfigs } = await getFullConfig();
  const config = providerConfigs[activeProvider] || {};

  switch (activeProvider) {
    case 'claude':            return callClaude(text, language, config);
    case 'openai':            return callOpenAI(text, language, config);
    case 'gemini':            return callGemini(text, language, config);
    case 'google-translate':  return callGoogleTranslate(text, language, config);
    case 'ollama':            return callOllama(text, language, config);
    case 'custom':            return callCustom(text, language, config);
    default:
      throw new Error(`Unknown provider "${activeProvider}". Please select a provider in the popup.`);
  }
}

// ─── Message handler ──────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

  // Translate or clean a transcript segment
  if (message.type === 'TRANSLATE_OR_CLEAN') {
    routeToProvider(message.text, message.language)
      .then(text  => sendResponse({ success: true, text }))
      .catch(err  => { console.error('[AutoTranscripter]', err); sendResponse({ success: false, error: err.message }); });
    return true;
  }

  // Return full config (all providers, no API keys sent to content scripts)
  if (message.type === 'GET_CONFIG') {
    getFullConfig()
      .then(cfg   => sendResponse({ success: true, ...cfg }))
      .catch(err  => sendResponse({ success: false, error: err.message }));
    return true;
  }

  // Save config for one provider and set it as active
  if (message.type === 'SAVE_CONFIG') {
    const { activeProvider, providerConfig } = message;
    const saveData = { activeProvider };
    if (providerConfig) saveData[`cfg_${activeProvider}`] = providerConfig;
    chrome.storage.sync.set(saveData)
      .then(() => sendResponse({ success: true }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  // Return only the display name of the active provider (safe for content scripts)
  if (message.type === 'GET_PROVIDER_NAME') {
    chrome.storage.sync.get('activeProvider').then(data => {
      const name = PROVIDER_NAMES[data.activeProvider] || 'No provider set';
      sendResponse({ success: true, name });
    }).catch(() => sendResponse({ success: true, name: 'Unknown' }));
    return true;
  }

  // ── Legacy compat (v1 keys) ────────────────────────────────────────────────
  if (message.type === 'GET_API_KEY') {
    chrome.storage.sync.get('cfg_claude')
      .then(d  => sendResponse({ success: true, apiKey: d.cfg_claude?.apiKey || '' }))
      .catch(e => sendResponse({ success: false, error: e.message }));
    return true;
  }

  if (message.type === 'SAVE_API_KEY') {
    chrome.storage.sync.get('cfg_claude').then(d => {
      const existing = d.cfg_claude || {};
      return chrome.storage.sync.set({ cfg_claude: { ...existing, apiKey: message.apiKey } });
    })
      .then(() => sendResponse({ success: true }))
      .catch(e  => sendResponse({ success: false, error: e.message }));
    return true;
  }
});
