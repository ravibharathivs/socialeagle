// AutoTranscripter - Content Script
// Injected into Google Meet, Microsoft Teams, Zoom

(function () {
  'use strict';

  // Guard: prevent double injection in SPAs
  if (window.__autoTranscripterLoaded) return;
  window.__autoTranscripterLoaded = true;

  // ─── State ───────────────────────────────────────────────────────────────────
  const state = {
    isRecording: false,
    language: 'en-US',
    transcript: '',
    transcriptEntries: [],   // { original: string|null, translated: string }
    recognition: null,
    isDragging: false,
    dragOffsetX: 0,
    dragOffsetY: 0,
    isProcessing: false
  };

  // ─── Styles ──────────────────────────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    #autotranscripter-overlay {
      position: fixed;
      top: 16px;
      right: 16px;
      width: 340px;
      max-height: 480px;
      background: rgba(18, 18, 28, 0.95);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
      z-index: 2147483647;
      display: flex;
      flex-direction: column;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 13px;
      color: #e8e8e8;
      backdrop-filter: blur(12px);
      user-select: none;
      transition: box-shadow 0.2s;
    }

    #autotranscripter-overlay.at-dragging {
      box-shadow: 0 16px 48px rgba(0, 0, 0, 0.8);
      cursor: grabbing;
    }

    #at-header {
      display: flex;
      align-items: center;
      padding: 10px 12px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 12px 12px 0 0;
      cursor: grab;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      gap: 8px;
    }

    #at-header:active {
      cursor: grabbing;
    }

    #at-status-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #6b6b6b;
      flex-shrink: 0;
      transition: background 0.3s;
    }

    #at-status-dot.live {
      background: #ff3b30;
      animation: at-pulse 1.2s ease-in-out infinite;
    }

    #at-status-dot.processing {
      background: #ffb300;
      animation: at-pulse 0.6s ease-in-out infinite;
    }

    @keyframes at-pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(0.85); }
    }

    #at-title {
      flex: 1;
      font-weight: 600;
      font-size: 13px;
      color: #fff;
    }

    #at-lang-label {
      font-size: 11px;
      color: #888;
      font-weight: 500;
    }

    #at-controls {
      display: flex;
      gap: 6px;
      padding: 8px 10px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      flex-wrap: wrap;
    }

    .at-btn {
      padding: 5px 10px;
      border-radius: 6px;
      border: 1px solid rgba(255, 255, 255, 0.15);
      background: rgba(255, 255, 255, 0.07);
      color: #e8e8e8;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.15s, border-color 0.15s;
      white-space: nowrap;
    }

    .at-btn:hover {
      background: rgba(255, 255, 255, 0.14);
      border-color: rgba(255, 255, 255, 0.25);
    }

    .at-btn:active {
      background: rgba(255, 255, 255, 0.2);
    }

    #at-btn-start {
      background: rgba(52, 199, 89, 0.18);
      border-color: rgba(52, 199, 89, 0.4);
      color: #34c759;
    }

    #at-btn-start:hover {
      background: rgba(52, 199, 89, 0.28);
    }

    #at-btn-start.recording {
      background: rgba(255, 59, 48, 0.18);
      border-color: rgba(255, 59, 48, 0.4);
      color: #ff3b30;
    }

    #at-btn-start.recording:hover {
      background: rgba(255, 59, 48, 0.28);
    }

    #at-transcript-area {
      flex: 1;
      overflow-y: auto;
      padding: 10px 12px;
      line-height: 1.55;
      max-height: 300px;
      min-height: 80px;
    }

    #at-transcript-area::-webkit-scrollbar {
      width: 4px;
    }

    #at-transcript-area::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.2);
      border-radius: 2px;
    }

    #at-final-text {
      color: #e8e8e8;
      white-space: pre-wrap;
      word-break: break-word;
    }

    #at-interim-text {
      color: #666;
      font-style: italic;
      white-space: pre-wrap;
      word-break: break-word;
    }

    #at-placeholder {
      color: #444;
      font-style: italic;
      text-align: center;
      padding: 20px 0;
    }

    #at-info-bar {
      padding: 6px 12px;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
      font-size: 11px;
      color: #555;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-radius: 0 0 12px 12px;
    }

    .at-entry {
      margin-bottom: 8px;
      padding-bottom: 8px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
    }

    .at-entry:last-child {
      border-bottom: none;
    }

    .at-original {
      color: #777;
      font-size: 11.5px;
      font-style: italic;
      margin-bottom: 3px;
      line-height: 1.4;
      white-space: pre-wrap;
      word-break: break-word;
    }

    .at-lang-badge {
      display: inline-block;
      font-size: 9px;
      color: #fff;
      border-radius: 3px;
      padding: 0 4px;
      font-weight: 700;
      margin-right: 5px;
      font-style: normal;
      vertical-align: middle;
    }

    .at-lang-badge.ta {
      background: rgba(255, 159, 67, 0.7);
    }

    .at-lang-badge.en {
      background: rgba(85, 239, 196, 0.5);
    }

    .at-translated {
      color: #e8e8e8;
      line-height: 1.5;
      white-space: pre-wrap;
      word-break: break-word;
    }

    .at-plain-entry {
      color: #e8e8e8;
      white-space: pre-wrap;
      word-break: break-word;
      margin-bottom: 6px;
    }
  `;
  document.head.appendChild(style);

  // ─── DOM ─────────────────────────────────────────────────────────────────────
  const overlay = document.createElement('div');
  overlay.id = 'autotranscripter-overlay';
  overlay.innerHTML = `
    <div id="at-header">
      <div id="at-status-dot"></div>
      <span id="at-title">AutoTranscripter</span>
      <span id="at-lang-label">EN</span>
    </div>
    <div id="at-controls">
      <button class="at-btn" id="at-btn-start">▶ Start</button>
      <button class="at-btn" id="at-btn-lang">EN ↔ TA</button>
      <button class="at-btn" id="at-btn-copy">Copy</button>
      <button class="at-btn" id="at-btn-save">Save</button>
      <button class="at-btn" id="at-btn-clear">Clear</button>
    </div>
    <div id="at-transcript-area">
      <div id="at-final-text"></div>
      <div id="at-interim-text"></div>
      <div id="at-placeholder">Click Start to begin transcription...</div>
    </div>
    <div id="at-info-bar">
      <span id="at-status-text">Idle</span>
      <span id="at-provider-name">Loading...</span>
    </div>
  `;
  document.body.appendChild(overlay);

  // ─── Element refs ─────────────────────────────────────────────────────────
  const elStatusDot = overlay.querySelector('#at-status-dot');
  const elLangLabel = overlay.querySelector('#at-lang-label');
  const elFinalText = overlay.querySelector('#at-final-text');
  const elInterimText = overlay.querySelector('#at-interim-text');
  const elPlaceholder = overlay.querySelector('#at-placeholder');
  const elStatusText = overlay.querySelector('#at-status-text');
  const elBtnStart = overlay.querySelector('#at-btn-start');
  const elBtnLang = overlay.querySelector('#at-btn-lang');
  const elBtnCopy = overlay.querySelector('#at-btn-copy');
  const elBtnSave = overlay.querySelector('#at-btn-save');
  const elBtnClear = overlay.querySelector('#at-btn-clear');
  const elHeader = overlay.querySelector('#at-header');

  // ─── Status helpers ───────────────────────────────────────────────────────
  function setStatus(status) {
    elStatusDot.className = '';
    if (status === 'live') {
      elStatusDot.classList.add('live');
      elStatusText.textContent = 'Listening...';
    } else if (status === 'processing') {
      elStatusDot.classList.add('processing');
      elStatusText.textContent = 'Processing...';
    } else {
      elStatusText.textContent = 'Idle';
    }
  }

  function updateLangLabel() {
    const label = state.language === 'ta-IN' ? 'TA' : 'EN';
    elLangLabel.textContent = label;
  }

  // Append a transcription entry.
  // translatedText : the processed/translated English text (always present)
  // originalText   : the raw Tamil source text, or null for English-mode entries
  function appendFinalText(translatedText, originalText) {
    if (!translatedText.trim()) return;

    const translated = translatedText.trim();
    const original   = originalText ? originalText.trim() : null;

    // Keep plain-text transcript for copy/save (English only)
    state.transcript += (state.transcript ? '\n' : '') + translated;
    state.transcriptEntries.push({ original, translated });

    const entryEl = document.createElement('div');

    if (original) {
      // Dual-language display: Tamil original + English translation
      entryEl.className = 'at-entry';

      const origEl = document.createElement('div');
      origEl.className = 'at-original';
      origEl.innerHTML = `<span class="at-lang-badge ta">TA</span>${escapeHtml(original)}`;

      const transEl = document.createElement('div');
      transEl.className = 'at-translated';
      transEl.innerHTML = `<span class="at-lang-badge en">EN</span>${escapeHtml(translated)}`;

      entryEl.appendChild(origEl);
      entryEl.appendChild(transEl);
    } else {
      // Single-language (English) entry
      entryEl.className = 'at-plain-entry';
      entryEl.textContent = translated;
    }

    elFinalText.appendChild(entryEl);
    elPlaceholder.style.display = 'none';

    const area = overlay.querySelector('#at-transcript-area');
    area.scrollTop = area.scrollHeight;
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ─── Web Speech API ───────────────────────────────────────────────────────
  function startRecognition() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech recognition is not supported in this browser. Please use Chrome.');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    state.recognition = new SpeechRecognition();
    state.recognition.continuous = true;
    state.recognition.interimResults = true;
    state.recognition.lang = state.language;

    state.recognition.onstart = () => {
      setStatus('live');
    };

    state.recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      // Show interim
      elInterimText.textContent = interimTranscript;

      // Process final
      if (finalTranscript.trim()) {
        elInterimText.textContent = '';
        processTranscript(finalTranscript.trim());
      }
    };

    state.recognition.onerror = (event) => {
      console.error('[AutoTranscripter] Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        alert('Microphone access was denied. Please allow microphone permissions and try again.');
        stopRecording();
      }
    };

    state.recognition.onend = () => {
      // Auto-restart on timeout if still recording (handles 60s Chrome timeout)
      if (state.isRecording) {
        try {
          state.recognition.start();
        } catch (e) {
          console.warn('[AutoTranscripter] Recognition restart error:', e);
        }
      } else {
        setStatus('idle');
      }
    };

    state.recognition.start();
  }

  async function processTranscript(text) {
    state.isProcessing = true;
    setStatus('processing');

    const isTamil = state.language === 'ta-IN';

    try {
      const response = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
          { type: 'TRANSLATE_OR_CLEAN', text, language: state.language },
          (response) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve(response);
            }
          }
        );
      });

      if (response.success) {
        // Pass Tamil original so the overlay can show TA original + EN translation
        appendFinalText(response.text, isTamil ? text : null);
      } else {
        console.warn('[AutoTranscripter] Provider error:', response.error);
        appendFinalText(text, isTamil ? text : null);
      }
    } catch (error) {
      console.error('[AutoTranscripter] Message error:', error);
      appendFinalText(text, isTamil ? text : null);
    } finally {
      state.isProcessing = false;
      if (state.isRecording) {
        setStatus('live');
      }
    }
  }

  function stopRecording() {
    state.isRecording = false;
    if (state.recognition) {
      try {
        state.recognition.stop();
      } catch (e) {
        // Ignore stop errors
      }
      state.recognition = null;
    }
    setStatus('idle');
    elBtnStart.textContent = '▶ Start';
    elBtnStart.classList.remove('recording');
  }

  // ─── Button handlers ──────────────────────────────────────────────────────
  elBtnStart.addEventListener('click', () => {
    if (state.isRecording) {
      stopRecording();
    } else {
      state.isRecording = true;
      elBtnStart.textContent = '⏹ Stop';
      elBtnStart.classList.add('recording');
      startRecognition();
    }
  });

  elBtnLang.addEventListener('click', () => {
    if (state.isRecording) {
      stopRecording();
    }
    state.language = state.language === 'en-US' ? 'ta-IN' : 'en-US';
    updateLangLabel();
  });

  elBtnCopy.addEventListener('click', () => {
    if (!state.transcript) return;
    navigator.clipboard.writeText(state.transcript).then(() => {
      const orig = elBtnCopy.textContent;
      elBtnCopy.textContent = 'Copied!';
      setTimeout(() => { elBtnCopy.textContent = orig; }, 1500);
    }).catch((e) => {
      console.error('[AutoTranscripter] Copy failed:', e);
    });
  });

  elBtnSave.addEventListener('click', () => {
    if (!state.transcript) return;
    const blob = new Blob([state.transcript], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
    a.href = url;
    a.download = `transcript-${timestamp}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  });

  elBtnClear.addEventListener('click', () => {
    state.transcript = '';
    state.transcriptEntries = [];
    elFinalText.innerHTML = '';
    elInterimText.textContent = '';
    elPlaceholder.style.display = '';
  });

  // ─── Drag logic ───────────────────────────────────────────────────────────
  elHeader.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;

    state.isDragging = true;
    overlay.classList.add('at-dragging');

    // Switch from right anchor to left anchor on first drag
    const rect = overlay.getBoundingClientRect();
    overlay.style.right = 'auto';
    overlay.style.left = rect.left + 'px';
    overlay.style.top = rect.top + 'px';

    state.dragOffsetX = e.clientX - rect.left;
    state.dragOffsetY = e.clientY - rect.top;

    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!state.isDragging) return;
    const x = e.clientX - state.dragOffsetX;
    const y = e.clientY - state.dragOffsetY;
    overlay.style.left = Math.max(0, Math.min(x, window.innerWidth - overlay.offsetWidth)) + 'px';
    overlay.style.top = Math.max(0, Math.min(y, window.innerHeight - overlay.offsetHeight)) + 'px';
  });

  document.addEventListener('mouseup', () => {
    if (state.isDragging) {
      state.isDragging = false;
      overlay.classList.remove('at-dragging');
    }
  });

  // ─── Init ─────────────────────────────────────────────────────────────────
  updateLangLabel();
  setStatus('idle');

  // Fetch active provider name from background and show in info bar
  const elProviderName = overlay.querySelector('#at-provider-name');
  chrome.runtime.sendMessage({ type: 'GET_PROVIDER_NAME' }, (response) => {
    if (chrome.runtime.lastError || !response?.success) {
      elProviderName.textContent = 'No provider set';
      return;
    }
    elProviderName.textContent = response.name;
  });

  console.log('[AutoTranscripter] Overlay injected successfully.');
})();
