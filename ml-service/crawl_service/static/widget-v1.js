(function () {
  'use strict';

  // Prevent multiple initializations on the same page
  if (window.__SiteMindWidgetLoaded__) return;
  window.__SiteMindWidgetLoaded__ = true;

  // Extract data-token from currently executing script tag
  var currentScript =
    document.currentScript ||
    (function () {
      var scripts = document.getElementsByTagName('script');
      for (var i = scripts.length - 1; i >= 0; i--) {
        if (scripts[i].getAttribute('data-token')) return scripts[i];
      }
      return scripts[scripts.length - 1];
    })();

  var embedToken = currentScript ? currentScript.getAttribute('data-token') : null;

  // Determine API base URL from script tag src host
  var apiBaseUrl = '';
  if (currentScript && currentScript.src) {
    try {
      var parsed = new URL(currentScript.src);
      apiBaseUrl = parsed.origin;
    } catch (e) {
      apiBaseUrl = '';
    }
  }

  // Fallback default config
  var config = {
    theme_color: '#22C55E',
    background_color: '#ffffff',
    text_color: '#111111',
    logo_url: null,
    website_name: 'AI Support',
    domain: '',
    position: 'bottom-right',
    welcome_message: 'Hello! How can I help you today?',
    placeholder_text: 'Type a message...',
  };

  var isOpen = false;
  var isSending = false;
  var shadowRoot = null;
  var containerEl = null;

  // Module-level messages array for persistent history
  var messages = [];
  var lastSentUserQuery = '';

  // Session Token helper
  function getSessionToken() {
    if (!embedToken) return null;
    var key = 'sitemind_session_' + embedToken;
    var tok = null;
    try {
      tok = sessionStorage.getItem(key);
      if (!tok) {
        tok = 'sm_' + Math.random().toString(36).substring(2, 15) + '_' + Date.now();
        sessionStorage.setItem(key, tok);
      }
    } catch (_) {}
    return tok;
  }

  // Load chat history from sessionStorage
  function loadHistory() {
    if (!embedToken) {
      messages = [
        {
          sender: 'bot',
          text: config.welcome_message || 'Hello! How can I help you today?',
          sources: [],
          nav_links: [],
        },
      ];
      return;
    }
    try {
      var saved = sessionStorage.getItem('sitemind_history_' + embedToken);
      if (saved) {
        var parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          messages = parsed;
          return;
        }
      }
    } catch (_) {}

    messages = [
      {
        sender: 'bot',
        text: config.welcome_message || 'Hello! How can I help you today?',
        sources: [],
        nav_links: [],
      },
    ];
  }

  // Save chat history to sessionStorage
  function saveHistory() {
    if (!embedToken) return;
    try {
      sessionStorage.setItem('sitemind_history_' + embedToken, JSON.stringify(messages));
    } catch (_) {}
  }

  // Fetch public widget config from backend
  function fetchConfig() {
    if (!embedToken) {
      loadHistory();
      initWidget();
      checkUrlHighlightHash();
      return;
    }

    var configUrl = (apiBaseUrl || '') + '/api/widget/config?token=' + encodeURIComponent(embedToken);

    fetch(configUrl)
      .then(function (res) {
        if (!res.ok) throw new Error('Config fetch failed with status ' + res.status);
        return res.json();
      })
      .then(function (data) {
        if (data && typeof data === 'object') {
          config.theme_color = data.theme_color || config.theme_color;
          config.background_color = data.background_color || config.background_color;
          config.text_color = data.text_color || config.text_color;
          config.logo_url = data.logo_url || null;
          config.website_name = data.website_name || config.website_name;
          config.domain = data.domain || config.domain;

          // Unpack widget_settings overrides
          var ws = data.widget_settings || {};
          if (typeof ws === 'string') {
            try { ws = JSON.parse(ws); } catch (_) { ws = {}; }
          }
          if (ws && typeof ws === 'object') {
            if (ws.chatbot_name) config.website_name = ws.chatbot_name;
            if (ws.welcome_message) config.welcome_message = ws.welcome_message;
            if (ws.placeholder_text) config.placeholder_text = ws.placeholder_text;
            if (ws.position) config.position = ws.position;
          }
        }
        loadHistory();
        initWidget();
        checkUrlHighlightHash();
      })
      .catch(function (err) {
        console.warn('[SiteMind Widget] Using fallback config due to:', err.message);
        loadHistory();
        initWidget();
        checkUrlHighlightHash();
      });
  }

  // Initialize closed Shadow DOM container
  function initWidget() {
    containerEl = document.createElement('div');
    containerEl.id = 'sitemind-widget-root';
    document.body.appendChild(containerEl);

    // Closed Shadow DOM mode
    shadowRoot = containerEl.attachShadow({ mode: 'closed' });

    renderWidget();
    attachEventListeners();
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function renderWidget() {
    var theme = config.theme_color;
    var bg = config.background_color;
    var text = config.text_color;
    var isLeft = config.position === 'bottom-left';

    var launcherPosCss = isLeft
      ? 'bottom: 20px !important; left: 20px !important; right: auto !important;'
      : 'bottom: 20px !important; right: 20px !important; left: auto !important;';

    var panelPosCss = isLeft
      ? 'bottom: 90px !important; left: 20px !important; right: auto !important; transform-origin: bottom left !important;'
      : 'bottom: 90px !important; right: 20px !important; left: auto !important; transform-origin: bottom right !important;';

    // Explicit CSS reset inside shadow root
    var css = `
      * {
        box-sizing: border-box !important;
        margin: 0 !important;
        padding: 0 !important;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
        -webkit-font-smoothing: antialiased !important;
        line-height: 1.4 !important;
      }

      .sm-launcher {
        position: fixed !important;
        ${launcherPosCss}
        width: 60px !important;
        height: 60px !important;
        border-radius: 50% !important;
        background-color: ${theme} !important;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25) !important;
        cursor: pointer !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        z-index: 999999 !important;
        transition: transform 0.2s ease, box-shadow 0.2s ease !important;
        border: none !important;
        outline: none !important;
      }

      .sm-launcher:hover {
        transform: scale(1.06) !important;
        box-shadow: 0 6px 24px rgba(0, 0, 0, 0.35) !important;
      }

      .sm-launcher svg {
        width: 28px !important;
        height: 28px !important;
        fill: #ffffff !important;
        transition: transform 0.25s ease !important;
      }

      .sm-panel {
        position: fixed !important;
        ${panelPosCss}
        width: var(--sm-panel-w, 380px) !important;
        min-width: 300px !important;
        max-width: calc(100vw - 30px) !important;
        height: var(--sm-panel-h, 580px) !important;
        min-height: 360px !important;
        max-height: calc(100vh - 90px) !important;
        border-radius: 18px !important;
        background-color: ${bg} !important;
        box-shadow: 0 12px 48px rgba(0, 0, 0, 0.22) !important;
        display: flex !important;
        flex-direction: column !important;
        overflow: hidden !important;
        z-index: 999999 !important;
        opacity: 0 !important;
        transform: translateY(16px) scale(0.96) !important;
        pointer-events: none !important;
        transition: opacity 0.25s ease, transform 0.25s ease !important;
        border: 1px solid rgba(0, 0, 0, 0.08) !important;
      }

      .sm-panel.sm-open {
        opacity: 1 !important;
        transform: translateY(0) scale(1) !important;
        pointer-events: auto !important;
      }

      .sm-panel.sm-resizing {
        transition: none !important;
        user-select: none !important;
        -webkit-user-select: none !important;
      }

      /* Resizable window hitboxes (completely invisible, cursor feedback only) */
      .sm-resize-top {
        position: absolute !important;
        top: 0 !important;
        left: 0 !important;
        right: 48px !important;
        height: 12px !important;
        cursor: ns-resize !important;
        z-index: 99990 !important;
        background: transparent !important;
        touch-action: none !important;
      }

      .sm-resize-side {
        position: absolute !important;
        top: 0 !important;
        bottom: 0 !important;
        ${isLeft ? 'right: 0 !important;' : 'left: 0 !important;'}
        width: 12px !important;
        cursor: ew-resize !important;
        z-index: 99990 !important;
        background: transparent !important;
        touch-action: none !important;
      }

      .sm-resize-corner {
        position: absolute !important;
        top: 0 !important;
        ${isLeft ? 'right: 0 !important;' : 'left: 0 !important;'}
        width: 24px !important;
        height: 24px !important;
        cursor: ${isLeft ? 'nesw-resize' : 'nwse-resize'} !important;
        z-index: 99999 !important;
        background: transparent !important;
        border: none !important;
        outline: none !important;
        touch-action: none !important;
      }

      .sm-header {
        background-color: ${theme} !important;
        color: #ffffff !important;
        padding: 16px 20px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
      }

      .sm-header-brand {
        display: flex !important;
        align-items: center !important;
        gap: 12px !important;
      }

      .sm-logo {
        width: 32px !important;
        height: 32px !important;
        border-radius: 50% !important;
        object-fit: cover !important;
        background: rgba(255, 255, 255, 0.2) !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        font-weight: bold !important;
        font-size: 14px !important;
        color: #ffffff !important;
      }

      .sm-title-group {
        display: flex !important;
        flex-direction: column !important;
      }

      .sm-title {
        font-size: 15px !important;
        font-weight: 700 !important;
        color: #ffffff !important;
        line-height: 1.2 !important;
      }

      .sm-subtitle {
        font-size: 11px !important;
        color: rgba(255, 255, 255, 0.85) !important;
        margin-top: 2px !important;
      }

      .sm-close-btn {
        position: relative !important;
        z-index: 100000 !important;
        background: transparent !important;
        border: none !important;
        color: #ffffff !important;
        font-size: 20px !important;
        cursor: pointer !important;
        width: 32px !important;
        height: 32px !important;
        border-radius: 50% !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        opacity: 0.85 !important;
        transition: opacity 0.2s ease, background 0.2s ease !important;
      }

      .sm-close-btn:hover {
        opacity: 1 !important;
        background: rgba(255, 255, 255, 0.15) !important;
      }

      .sm-messages {
        flex: 1 !important;
        padding: 20px !important;
        overflow-y: auto !important;
        display: flex !important;
        flex-direction: column !important;
        gap: 12px !important;
        background-color: ${bg} !important;
      }

      .sm-msg {
        max-width: 84% !important;
        padding: 12px 16px !important;
        border-radius: 14px !important;
        font-size: 13.5px !important;
        word-wrap: break-word !important;
        line-height: 1.45 !important;
      }

      .sm-msg-bot {
        align-self: flex-start !important;
        background-color: rgba(0, 0, 0, 0.05) !important;
        color: ${text} !important;
        border-bottom-left-radius: 4px !important;
      }

      .sm-msg-bot p.sm-msg-para {
        margin: 0 0 8px 0 !important;
        line-height: 1.55 !important;
      }

      .sm-msg-bot p.sm-msg-para:last-child {
        margin-bottom: 0 !important;
      }

      .sm-msg-bot ul.sm-msg-list {
        margin: 6px 0 8px 18px !important;
        padding: 0 !important;
        list-style-type: disc !important;
      }

      .sm-msg-bot ul.sm-msg-list li {
        margin-bottom: 4px !important;
        line-height: 1.45 !important;
      }

      .sm-msg-bot strong {
        font-weight: 600 !important;
        color: inherit !important;
      }

      .sm-msg-bot em {
        font-style: italic !important;
      }

      .sm-msg-user {
        align-self: flex-end !important;
        background-color: ${theme} !important;
        color: #ffffff !important;
        border-bottom-right-radius: 4px !important;
      }

      .sm-typing {
        align-self: flex-start !important;
        background-color: rgba(0, 0, 0, 0.05) !important;
        padding: 10px 14px !important;
        border-radius: 14px !important;
        border-bottom-left-radius: 4px !important;
        display: flex !important;
        align-items: center !important;
        gap: 4px !important;
      }

      .sm-dot {
        width: 6px !important;
        height: 6px !important;
        border-radius: 50% !important;
        background-color: #888888 !important;
        animation: sm-blink 1.4s infinite ease-in-out both !important;
      }

      .sm-dot:nth-child(1) { animation-delay: 0s !important; }
      .sm-dot:nth-child(2) { animation-delay: 0.2s !important; }
      .sm-dot:nth-child(3) { animation-delay: 0.4s !important; }

      @keyframes sm-blink {
        0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
        40% { opacity: 1; transform: scale(1.1); }
      }

      .sm-input-row {
        padding: 14px 16px !important;
        border-top: 1px solid rgba(0, 0, 0, 0.08) !important;
        display: flex !important;
        align-items: center !important;
        gap: 10px !important;
        background-color: ${bg} !important;
      }

      .sm-input-wrap {
        position: relative !important;
        flex: 1 !important;
        display: flex !important;
        align-items: center !important;
      }

      .sm-input {
        width: 100% !important;
        border: 1px solid rgba(0, 0, 0, 0.15) !important;
        border-radius: 20px !important;
        padding: 10px 38px 10px 16px !important;
        font-size: 13.5px !important;
        outline: none !important;
        color: ${text} !important;
        background-color: #ffffff !important;
        transition: border-color 0.2s ease !important;
      }

      .sm-input:focus {
        border-color: ${theme} !important;
      }

      .sm-mic-btn {
        position: absolute !important;
        right: 8px !important;
        background: transparent !important;
        border: none !important;
        cursor: pointer !important;
        padding: 6px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        color: #888888 !important;
        border-radius: 50% !important;
        transition: color 0.2s ease, transform 0.2s ease !important;
      }

      .sm-mic-btn:hover {
        color: ${theme} !important;
        transform: scale(1.1) !important;
      }

      .sm-mic-btn svg {
        width: 17px !important;
        height: 17px !important;
      }

      .sm-mic-recording {
        color: #ef4444 !important;
        background-color: rgba(239, 68, 68, 0.15) !important;
        animation: sm-mic-pulse 1.2s infinite ease-in-out !important;
      }

      .sm-mic-transcribing {
        color: #888888 !important;
        opacity: 0.6 !important;
        cursor: wait !important;
        animation: sm-mic-spin 1s infinite linear !important;
      }

      .sm-input-recording {
        border-color: rgba(239, 68, 68, 0.8) !important;
        box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.2) !important;
      }

      @keyframes sm-mic-pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.15); box-shadow: 0 0 10px rgba(239, 68, 68, 0.4); }
      }

      @keyframes sm-mic-spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }

      .sm-send-btn {
        width: 36px !important;
        height: 36px !important;
        border-radius: 50% !important;
        background-color: ${theme} !important;
        border: none !important;
        color: #ffffff !important;
        cursor: pointer !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        transition: transform 0.2s ease, opacity 0.2s ease !important;
      }

      .sm-send-btn:hover {
        transform: scale(1.05) !important;
      }

      .sm-send-btn:disabled {
        opacity: 0.5 !important;
        cursor: not-allowed !important;
      }

      .sm-send-btn svg {
        width: 16px !important;
        height: 16px !important;
        fill: #ffffff !important;
      }

      /* Navigation Links Section */
      .sm-nav-section {
        margin-top: 10px !important;
        padding-top: 8px !important;
        border-top: 1px solid rgba(0, 0, 0, 0.08) !important;
        display: flex !important;
        flex-direction: column !important;
        gap: 6px !important;
      }

      .sm-nav-title {
        font-size: 11px !important;
        font-weight: 700 !important;
        text-transform: uppercase !important;
        letter-spacing: 0.5px !important;
        color: ${text} !important;
        opacity: 0.7 !important;
      }

      .sm-nav-list {
        display: flex !important;
        flex-wrap: wrap !important;
        gap: 6px !important;
      }

      .sm-nav-btn {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        gap: 8px !important;
        padding: 6px 12px !important;
        background-color: ${theme} !important;
        color: #ffffff !important;
        border: none !important;
        border-radius: 8px !important;
        font-size: 12px !important;
        font-weight: 600 !important;
        cursor: pointer !important;
        text-decoration: none !important;
        transition: transform 0.15s ease, opacity 0.15s ease, box-shadow 0.15s ease !important;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12) !important;
      }

      .sm-nav-btn:hover {
        transform: translateY(-1px) !important;
        opacity: 0.92 !important;
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.18) !important;
      }

      .sm-nav-btn-icon {
        width: 14px !important;
        height: 14px !important;
        stroke: currentColor !important;
        stroke-width: 2.2 !important;
      }

      /* Sources Section */
      .sm-sources {
        margin-top: 8px !important;
        padding-top: 8px !important;
        border-top: 1px solid rgba(0, 0, 0, 0.08) !important;
        display: flex !important;
        flex-direction: column !important;
        gap: 6px !important;
      }

      .sm-sources-label {
        font-size: 11px !important;
        font-weight: 600 !important;
        text-transform: uppercase !important;
        letter-spacing: 0.5px !important;
        opacity: 0.65 !important;
        margin-bottom: 2px !important;
      }

      .sm-source-item {
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        gap: 6px !important;
        background-color: rgba(255, 255, 255, 0.6) !important;
        border: 1px solid rgba(0, 0, 0, 0.08) !important;
        border-radius: 6px !important;
        padding: 5px 8px !important;
        font-size: 12px !important;
      }

      .sm-source-link {
        color: ${theme} !important;
        text-decoration: underline !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
        white-space: nowrap !important;
        flex: 1 !important;
        cursor: pointer !important;
      }

      .sm-source-btn {
        display: inline-flex !important;
        align-items: center !important;
        gap: 4px !important;
        padding: 3px 7px !important;
        background-color: rgba(0, 0, 0, 0.05) !important;
        border: 1px solid rgba(0, 0, 0, 0.12) !important;
        border-radius: 4px !important;
        font-size: 11px !important;
        font-weight: 500 !important;
        color: ${text} !important;
        cursor: pointer !important;
        white-space: nowrap !important;
        transition: background-color 0.15s ease, transform 0.1s ease !important;
      }

      .sm-source-btn:hover {
        background-color: rgba(0, 0, 0, 0.1) !important;
      }

      .sm-source-btn svg {
        width: 12px !important;
        height: 12px !important;
        fill: none !important;
        stroke: currentColor !important;
      }

      /* Feedback Buttons (Module 9) */
      .sm-feedback-row {
        margin-top: 8px !important;
        padding-top: 6px !important;
        border-top: 1px solid rgba(0, 0, 0, 0.07) !important;
        display: flex !important;
        align-items: center !important;
        gap: 6px !important;
      }

      .sm-feedback-btn {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 24px !important;
        height: 24px !important;
        padding: 0 !important;
        background-color: transparent !important;
        border: 1px solid rgba(0, 0, 0, 0.12) !important;
        border-radius: 6px !important;
        color: rgba(0, 0, 0, 0.45) !important;
        cursor: pointer !important;
        transition: all 0.15s ease !important;
      }

      .sm-feedback-btn svg {
        width: 13px !important;
        height: 13px !important;
        fill: none !important;
        stroke: currentColor !important;
        stroke-width: 2 !important;
      }

      .sm-feedback-btn:hover:not(:disabled) {
        transform: scale(1.08) !important;
      }

      .sm-feedback-up:hover:not(:disabled) {
        color: #16a34a !important;
        border-color: #16a34a !important;
        background-color: rgba(22, 163, 74, 0.08) !important;
      }

      .sm-feedback-down:hover:not(:disabled) {
        color: #dc2626 !important;
        border-color: #dc2626 !important;
        background-color: rgba(220, 38, 38, 0.08) !important;
      }

      .sm-feedback-up.sm-feedback-selected {
        color: #ffffff !important;
        background-color: #16a34a !important;
        border-color: #16a34a !important;
      }

      .sm-feedback-up.sm-feedback-selected svg {
        fill: #ffffff !important;
      }

      .sm-feedback-down.sm-feedback-selected {
        color: #ffffff !important;
        background-color: #dc2626 !important;
        border-color: #dc2626 !important;
      }

      .sm-feedback-down.sm-feedback-selected svg {
        fill: #ffffff !important;
      }

      .sm-feedback-btn:disabled {
        cursor: default !important;
        opacity: 0.6 !important;
      }

      .sm-feedback-btn.sm-feedback-selected:disabled {
        opacity: 1 !important;
      }

      .sm-feedback-thanks {
        font-size: 11px !important;
        color: rgba(0, 0, 0, 0.55) !important;
        font-style: italic !important;
        display: none;
        margin-left: 2px !important;
      }
    `;

    var logoHtml = config.logo_url
      ? `<img src="${config.logo_url}" class="sm-logo" id="sm-logo-img" alt="Logo" />`
      : `<div class="sm-logo">${(config.website_name || 'A')[0].toUpperCase()}</div>`;

    var html = `
      <style>${css}</style>
      <button class="sm-launcher" id="sm-launcher" aria-label="Open chat">
        <svg id="sm-icon-chat" viewBox="0 0 24 24">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
        </svg>
        <svg id="sm-icon-close" viewBox="0 0 24 24" style="display:none;">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
        </svg>
      </button>

      <div class="sm-panel" id="sm-panel">
        <div class="sm-resize-top" id="sm-resize-top" title="Drag to resize height"></div>
        <div class="sm-resize-side" id="sm-resize-side" title="Drag to resize width"></div>
        <div class="sm-resize-corner" id="sm-resize-corner" title="Drag corner to resize"></div>

        <div class="sm-header">
          <div class="sm-header-brand">
            ${logoHtml}
            <div class="sm-title-group">
              <div class="sm-title">${config.website_name || 'SiteMind AI'}</div>
              <div class="sm-subtitle">Online • Ask us anything</div>
            </div>
          </div>
          <button class="sm-close-btn" id="sm-close-btn" aria-label="Close chat">&times;</button>
        </div>

        <div class="sm-messages" id="sm-messages"></div>

        <div class="sm-input-row">
          <div class="sm-input-wrap">
            <input type="text" class="sm-input" id="sm-input" placeholder="${escapeHtml(config.placeholder_text || 'Type a message...')}" />
            <button class="sm-mic-btn" id="sm-mic-btn" type="button" aria-label="Voice input" title="Voice input (Sarvam AI coming soon)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" x2="12" y1="19" y2="22"/>
              </svg>
            </button>
          </div>
          <button class="sm-send-btn" id="sm-send-btn" aria-label="Send message">
            <svg viewBox="0 0 24 24">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
          </button>
        </div>
      </div>
    `;

    shadowRoot.innerHTML = html;

    // Render persistent history messages
    var messagesEl = shadowRoot.getElementById('sm-messages');
    messages.forEach(function (msg) {
      renderSingleMessage(messagesEl, msg);
    });
    messagesEl.scrollTop = messagesEl.scrollHeight;

    // Logo image error fallback to initial text
    var logoImg = shadowRoot.getElementById('sm-logo-img');
    if (logoImg) {
      logoImg.onerror = function () {
        var parent = logoImg.parentNode;
        if (parent) {
          var initial = (config.website_name || 'A')[0].toUpperCase();
          var fallbackDiv = document.createElement('div');
          fallbackDiv.className = 'sm-logo';
          fallbackDiv.textContent = initial;
          parent.replaceChild(fallbackDiv, logoImg);
        }
      };
    }
  }

  function renderSingleMessage(container, msg) {
    var isUser = msg.sender === 'user';
    var el = document.createElement('div');
    el.className = 'sm-msg ' + (isUser ? 'sm-msg-user' : 'sm-msg-bot');

    if (isUser) {
      el.textContent = msg.text || '';
    } else {
      el.innerHTML = formatMarkdown(msg.text || '');

      // Render Navigation Links (BUG 3)
      if (msg.nav_links && Array.isArray(msg.nav_links) && msg.nav_links.length > 0) {
        var navSection = document.createElement('div');
        navSection.className = 'sm-nav-section';

        var navTitle = document.createElement('div');
        navTitle.className = 'sm-nav-title';
        navTitle.textContent = 'Go to page';
        navSection.appendChild(navTitle);

        var navList = document.createElement('div');
        navList.className = 'sm-nav-list';

        msg.nav_links.forEach(function (link) {
          if (!link || !link.url) return;
          var btn = document.createElement('button');
          btn.className = 'sm-nav-btn';
          btn.innerHTML = `
            <span>${escapeHtml(link.label || 'Visit Page')}</span>
            <svg class="sm-nav-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          `;

          btn.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            handleSourceHighlightClick({
              page_url: link.url,
              dom_selector: link.dom_selector,
              text_snippet: link.text_snippet,
              page_title: link.label
            });
          });

          navList.appendChild(btn);
        });

        navSection.appendChild(navList);
        el.appendChild(navSection);
      }

      // Render Sources Section (BUG 1)
      var validSources = (msg.sources && Array.isArray(msg.sources))
        ? msg.sources.filter(function (s) { return s && s.page_url && String(s.page_url).trim().length > 0; })
        : [];

      if (validSources.length > 0) {
        var sourcesContainer = document.createElement('div');
        sourcesContainer.className = 'sm-sources';

        var sourcesLabel = document.createElement('div');
        sourcesLabel.className = 'sm-sources-label';
        sourcesLabel.textContent = 'Sources';
        sourcesContainer.appendChild(sourcesLabel);

        validSources.forEach(function (src) {
          var itemEl = document.createElement('div');
          itemEl.className = 'sm-source-item';

          var linkEl = document.createElement('a');
          linkEl.className = 'sm-source-link';
          linkEl.href = src.page_url;
          var rawTitle = src.page_title || src.page_url || 'Source';
          var displayTitle = String(rawTitle)
            .replace(/^\[Drive\]\s*/i, '')
            .replace(/\.pdf$/i, '')
            .replace(/[-_]+/g, ' ')
            .trim() || rawTitle;
          linkEl.title = displayTitle;
          linkEl.textContent = displayTitle;
          linkEl.target = '_blank';
          linkEl.rel = 'noopener noreferrer';

          itemEl.appendChild(linkEl);

          // Render Highlight button for any HTML source on the site
          var isDriveOrPdf = (src.page_url && (src.page_url.indexOf('drive.google.com') !== -1 || src.page_url.toLowerCase().indexOf('.pdf') !== -1));
          if ((src.dom_selector || src.text_snippet || src.page_title || src.page_url) && !isDriveOrPdf) {
            var btnEl = document.createElement('button');
            btnEl.className = 'sm-source-btn';
            btnEl.title = 'Highlight on page';
            btnEl.setAttribute('aria-label', 'Highlight on page');
            btnEl.innerHTML = `
              <svg viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="8" stroke-width="2"/>
                <circle cx="12" cy="12" r="3" stroke-width="2"/>
                <path d="M12 2v3 M12 19v3 M2 12h3 M19 12h3" stroke-width="2"/>
              </svg>
              Highlight
            `;

            btnEl.addEventListener('click', function (e) {
              e.preventDefault();
              e.stopPropagation();
              handleSourceHighlightClick(src);
            });

            itemEl.appendChild(btnEl);
          }
          sourcesContainer.appendChild(itemEl);
        });

        el.appendChild(sourcesContainer);
      }

      // Render Feedback Row (Module 9)
      var effectiveMsgId = msg.message_id || msg.id || ('msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6));
      msg.message_id = effectiveMsgId;
      msg.id = effectiveMsgId;

      var feedbackRow = document.createElement('div');
      feedbackRow.className = 'sm-feedback-row';

      var upBtn = document.createElement('button');
      upBtn.className = 'sm-feedback-btn sm-feedback-up';
      upBtn.title = 'Helpful answer';
      upBtn.setAttribute('aria-label', 'Thumbs up');
      upBtn.innerHTML = `
        <svg viewBox="0 0 24 24">
          <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
        </svg>
      `;

      var downBtn = document.createElement('button');
      downBtn.className = 'sm-feedback-btn sm-feedback-down';
      downBtn.title = 'Unhelpful answer';
      downBtn.setAttribute('aria-label', 'Thumbs down');
      downBtn.innerHTML = `
        <svg viewBox="0 0 24 24">
          <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3"/>
        </svg>
      `;

      var thanksLabel = document.createElement('span');
      thanksLabel.className = 'sm-feedback-thanks';
      thanksLabel.textContent = 'Thanks for your feedback';

      // Check if already rated in persistent history
      if (msg.feedbackRating === 'up') {
        upBtn.classList.add('sm-feedback-selected');
        upBtn.disabled = true;
        downBtn.disabled = true;
        thanksLabel.style.display = 'inline';
      } else if (msg.feedbackRating === 'down') {
        downBtn.classList.add('sm-feedback-selected');
        upBtn.disabled = true;
        downBtn.disabled = true;
        thanksLabel.style.display = 'inline';
      }

      upBtn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        submitFeedbackClick('up', upBtn, downBtn, thanksLabel, msg);
      });

      downBtn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        submitFeedbackClick('down', upBtn, downBtn, thanksLabel, msg);
      });

      feedbackRow.appendChild(upBtn);
      feedbackRow.appendChild(downBtn);
      feedbackRow.appendChild(thanksLabel);
      el.appendChild(feedbackRow);
    }

    container.appendChild(el);
  }

  function submitFeedbackClick(rating, upBtn, downBtn, thanksLabel, msg) {
    if (msg.feedbackRating) return; // Already rated

    // Immediately mark visual selection and persist in history
    if (rating === 'up') {
      upBtn.classList.add('sm-feedback-selected');
      downBtn.classList.remove('sm-feedback-selected');
    } else {
      downBtn.classList.add('sm-feedback-selected');
      upBtn.classList.remove('sm-feedback-selected');
    }
    upBtn.disabled = true;
    downBtn.disabled = true;
    thanksLabel.style.display = 'inline';

    msg.feedbackRating = rating;
    saveHistory();

    var feedbackUrl = (apiBaseUrl || '') + '/api/widget/feedback';
    var sessionToken = getSessionToken();

    fetch(feedbackUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: embedToken,
        message_id: msg.message_id || msg.id,
        rating: rating,
        session_token: sessionToken,
      }),
    })
      .then(function (res) {
        if (!res.ok) throw new Error('Feedback request failed with status ' + res.status);
        return res.json();
      })
      .then(function () {
        // Feedback recorded successfully
      })
      .catch(function (err) {
        // Log notice without reverting user's chosen UI selection
        console.warn('[SiteMind Widget] Feedback notice:', err.message);
      });
  }

  function attachEventListeners() {
    var launcher = shadowRoot.getElementById('sm-launcher');
    var closeBtn = shadowRoot.getElementById('sm-close-btn');
    var sendBtn = shadowRoot.getElementById('sm-send-btn');
    var inputEl = shadowRoot.getElementById('sm-input');
    var iconChat = shadowRoot.getElementById('sm-icon-chat');
    var iconClose = shadowRoot.getElementById('sm-icon-close');
    var panel = shadowRoot.getElementById('sm-panel');
    var messagesEl = shadowRoot.getElementById('sm-messages');

    function toggleOpen() {
      isOpen = !isOpen;
      if (isOpen) {
        panel.classList.add('sm-open');
        iconChat.style.display = 'none';
        iconClose.style.display = 'block';
        messagesEl.scrollTop = messagesEl.scrollHeight;
        setTimeout(function () { inputEl.focus(); }, 150);
      } else {
        panel.classList.remove('sm-open');
        iconChat.style.display = 'block';
        iconClose.style.display = 'none';
      }
    }

    launcher.addEventListener('click', toggleOpen);
    closeBtn.addEventListener('click', toggleOpen);

    // Escape key listener
    window.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen) {
        toggleOpen();
      }
    });

    sendBtn.addEventListener('click', sendMessage);
    inputEl.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        sendMessage();
      }
    });

    var micBtn = shadowRoot.getElementById('sm-mic-btn');
    if (micBtn) {
      setupVoiceInput(micBtn, inputEl);
    }

    // Initialize resizable window functionality
    setupPanelResize(panel);
  }

  function setupVoiceInput(micBtn, inputEl) {
    if (!micBtn || !inputEl) return;

    var mediaRecorder = null;
    var audioChunks = [];
    var mediaStream = null;
    var isRecording = false;
    var isTranscribing = false;
    var originalPlaceholder = inputEl.getAttribute('placeholder') || 'Type a message...';

    function setRecordingUI(recording) {
      isRecording = recording;
      if (recording) {
        micBtn.classList.add('sm-mic-recording');
        micBtn.setAttribute('title', 'Click to finish recording (listening...)');
        inputEl.setAttribute('placeholder', 'Listening... speak now');
        inputEl.classList.add('sm-input-recording');
      } else {
        micBtn.classList.remove('sm-mic-recording');
        micBtn.setAttribute('title', 'Voice input (Sarvam AI)');
        inputEl.setAttribute('placeholder', originalPlaceholder);
        inputEl.classList.remove('sm-input-recording');
      }
    }

    function setTranscribingUI(transcribing) {
      isTranscribing = transcribing;
      if (transcribing) {
        micBtn.classList.add('sm-mic-transcribing');
        micBtn.setAttribute('title', 'Transcribing with Sarvam AI...');
        inputEl.setAttribute('placeholder', 'Transcribing voice...');
      } else {
        micBtn.classList.remove('sm-mic-transcribing');
        inputEl.setAttribute('placeholder', originalPlaceholder);
      }
    }

    micBtn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();

      if (isTranscribing) return;

      if (isRecording) {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
          mediaRecorder.stop();
        }
        setRecordingUI(false);
        return;
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Voice input is not supported in this browser.');
        return;
      }

      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(function (stream) {
          mediaStream = stream;
          audioChunks = [];

          var mimeType = 'audio/webm';
          if (window.MediaRecorder && MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
            mimeType = 'audio/webm;codecs=opus';
          } else if (window.MediaRecorder && MediaRecorder.isTypeSupported('audio/mp4')) {
            mimeType = 'audio/mp4';
          }

          mediaRecorder = new MediaRecorder(stream, { mimeType: mimeType });

          mediaRecorder.ondataavailable = function (evt) {
            if (evt.data && evt.data.size > 0) {
              audioChunks.push(evt.data);
            }
          };

          mediaRecorder.onstop = function () {
            if (mediaStream) {
              mediaStream.getTracks().forEach(function (t) { t.stop(); });
              mediaStream = null;
            }

            var audioBlob = new Blob(audioChunks, { type: mimeType });
            if (audioBlob.size === 0) return;

            setTranscribingUI(true);

            var reader = new FileReader();
            reader.readAsDataURL(audioBlob);
            reader.onloadend = function () {
              var base64Audio = reader.result;
              var sttUrl = (apiBaseUrl || '') + '/api/widget/stt';

              fetch(sttUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  audio: base64Audio,
                  mime_type: mimeType,
                  language_code: 'unknown'
                })
              })
                .then(function (res) {
                  return res.json().then(function (data) {
                    if (!res.ok) throw new Error(data.error || 'Transcription failed');
                    return data;
                  });
                })
                .then(function (data) {
                  if (data && data.transcript) {
                    var cur = inputEl.value.trim();
                    inputEl.value = cur ? cur + ' ' + data.transcript : data.transcript;
                    inputEl.focus();
                  }
                })
                .catch(function (err) {
                  console.warn('[SiteMind Widget Voice STT]:', err.message);
                })
                .finally(function () {
                  setTranscribingUI(false);
                });
            };
          };

          mediaRecorder.start(250);
          setRecordingUI(true);
        })
        .catch(function (err) {
          console.warn('[SiteMind Widget Mic Access Error]:', err.message);
          setRecordingUI(false);
        });
    });
  }

  function setupPanelResize(panel) {
    var resizeCorner = shadowRoot.getElementById('sm-resize-corner');
    var resizeTop = shadowRoot.getElementById('sm-resize-top');
    var resizeSide = shadowRoot.getElementById('sm-resize-side');
    if (!panel) return;

    var isLeft = config.position === 'bottom-left';
    var storageKeyW = 'sm_panel_w_' + (config.website_name || 'default');
    var storageKeyH = 'sm_panel_h_' + (config.website_name || 'default');

    // Restore saved custom dimensions on desktop
    try {
      var savedW = localStorage.getItem(storageKeyW);
      var savedH = localStorage.getItem(storageKeyH);
      if (savedW && savedH && window.innerWidth > 600) {
        var parsedW = parseInt(savedW, 10);
        var parsedH = parseInt(savedH, 10);
        if (parsedW >= 300 && parsedW <= (window.innerWidth - 30)) {
          panel.style.setProperty('--sm-panel-w', parsedW + 'px');
          panel.style.setProperty('width', parsedW + 'px', 'important');
        }
        if (parsedH >= 360 && parsedH <= (window.innerHeight - 90)) {
          panel.style.setProperty('--sm-panel-h', parsedH + 'px');
          panel.style.setProperty('height', parsedH + 'px', 'important');
        }
      }
    } catch (_) {}

    // Double-click on corner handle resets to default dimensions
    if (resizeCorner) {
      resizeCorner.addEventListener('dblclick', function (e) {
        e.preventDefault();
        e.stopPropagation();
        panel.style.removeProperty('--sm-panel-w');
        panel.style.removeProperty('--sm-panel-h');
        panel.style.removeProperty('width');
        panel.style.removeProperty('height');
        try {
          localStorage.removeItem(storageKeyW);
          localStorage.removeItem(storageKeyH);
        } catch (_) {}
      });
    }

    function initDrag(handleEl, handleType) {
      if (!handleEl) return;

      var isPointerActive = false;
      var activePointerId = null;
      var startX = 0;
      var startY = 0;
      var startW = 0;
      var startH = 0;

      function onPointerMove(e) {
        if (!isPointerActive) return;
        e.preventDefault();

        // Moving cursor UP (smaller screen Y) increases window height
        var deltaY = startY - e.clientY;
        // Moving cursor away from dock corner increases window width
        var deltaX = isLeft ? (e.clientX - startX) : (startX - e.clientX);

        var minW = 300;
        var maxW = Math.min(900, window.innerWidth - 30);
        var minH = 360;
        var maxH = Math.min(920, window.innerHeight - 90);

        if (handleType === 'corner' || handleType === 'side') {
          var newW = Math.max(minW, Math.min(maxW, Math.round(startW + deltaX)));
          panel.style.setProperty('--sm-panel-w', newW + 'px');
          panel.style.setProperty('width', newW + 'px', 'important');
        }

        if (handleType === 'corner' || handleType === 'top') {
          var newH = Math.max(minH, Math.min(maxH, Math.round(startH + deltaY)));
          panel.style.setProperty('--sm-panel-h', newH + 'px');
          panel.style.setProperty('height', newH + 'px', 'important');
        }
      }

      function onPointerEnd(e) {
        if (!isPointerActive) return;
        isPointerActive = false;

        panel.classList.remove('sm-resizing');
        document.body.style.removeProperty('user-select');
        document.body.style.removeProperty('-webkit-user-select');

        if (activePointerId !== null && handleEl.releasePointerCapture) {
          try {
            handleEl.releasePointerCapture(activePointerId);
          } catch (_) {}
          activePointerId = null;
        }

        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerEnd);
        window.removeEventListener('pointercancel', onPointerEnd);

        try {
          localStorage.setItem(storageKeyW, String(panel.offsetWidth));
          localStorage.setItem(storageKeyH, String(panel.offsetHeight));
        } catch (_) {}
      }

      handleEl.addEventListener('pointerdown', function (e) {
        if (e.button !== 0 && e.pointerType === 'mouse') return;
        e.preventDefault();
        e.stopPropagation();

        isPointerActive = true;
        activePointerId = e.pointerId;
        startX = e.clientX;
        startY = e.clientY;
        startW = panel.offsetWidth;
        startH = panel.offsetHeight;

        panel.classList.add('sm-resizing');
        document.body.style.userSelect = 'none';
        document.body.style.webkitUserSelect = 'none';

        if (handleEl.setPointerCapture) {
          try {
            handleEl.setPointerCapture(e.pointerId);
          } catch (_) {}
        }

        window.addEventListener('pointermove', onPointerMove, { passive: false });
        window.addEventListener('pointerup', onPointerEnd);
        window.addEventListener('pointercancel', onPointerEnd);
      });
    }

    initDrag(resizeCorner, 'corner');
    initDrag(resizeTop, 'top');
    initDrag(resizeSide, 'side');
  }

  function sendMessage() {
    var inputEl = shadowRoot.getElementById('sm-input');
    var messagesEl = shadowRoot.getElementById('sm-messages');
    var sendBtn = shadowRoot.getElementById('sm-send-btn');

    var text = inputEl.value ? inputEl.value.trim() : '';
    if (!text || isSending) return;
    lastSentUserQuery = text;

    // Append user message & update persistent history
    var userMsg = { sender: 'user', text: text };
    messages.push(userMsg);
    saveHistory();
    renderSingleMessage(messagesEl, userMsg);

    inputEl.value = '';
    messagesEl.scrollTop = messagesEl.scrollHeight;

    // Show typing indicator
    var typingEl = document.createElement('div');
    typingEl.className = 'sm-typing';
    typingEl.innerHTML = '<div class="sm-dot"></div><div class="sm-dot"></div><div class="sm-dot"></div>';
    messagesEl.appendChild(typingEl);
    messagesEl.scrollTop = messagesEl.scrollHeight;

    isSending = true;
    sendBtn.disabled = true;

    var queryUrl = (apiBaseUrl || '') + '/api/widget/query';
    var sessionToken = getSessionToken();

    fetch(queryUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: embedToken,
        message: text,
        session_token: sessionToken,
        current_page: window.location.href,
      }),
    })
      .then(function (res) {
        if (res.status === 429) {
          throw new Error('Too many requests, please wait.');
        }
        if (!res.ok) {
          return res.text().then(function (rawText) {
            var errMsg = 'Failed to get answer (HTTP ' + res.status + ')';
            try {
              var parsed = JSON.parse(rawText);
              if (parsed && parsed.error) errMsg = parsed.error;
            } catch (_) {
              if (rawText && rawText.length < 200) errMsg = rawText;
            }
            throw new Error(errMsg);
          });
        }
        return res.json();
      })
      .then(function (data) {
        if (messagesEl.contains(typingEl)) {
          messagesEl.removeChild(typingEl);
        }

        if (data && data.session_token && embedToken) {
          try {
            sessionStorage.setItem('sitemind_session_' + embedToken, data.session_token);
          } catch (_) {}
        }

        var msgId = (data && (data.message_id || data.messageId)) || ('msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 8));
        var botMsg = {
          sender: 'bot',
          id: msgId,
          message_id: msgId,
          text: (data && data.response) || 'No response generated.',
          verified: (data && data.verified) || false,
          sources: (data && data.sources) || [],
          nav_links: (data && data.nav_links) || [],
          feedbackRating: null,
        };

        messages.push(botMsg);
        saveHistory();
        renderSingleMessage(messagesEl, botMsg);
        messagesEl.scrollTop = messagesEl.scrollHeight;

        // Auto-attempt visual pointing on the current page for any question or content present on the page
        setTimeout(function () {
          performAutoVisualPointing(text, (data && data.response) || '', (data && data.sources) || []);
        }, 500);
      })
      .catch(function (err) {
        if (messagesEl.contains(typingEl)) {
          messagesEl.removeChild(typingEl);
        }
        var errorMsg = {
          sender: 'bot',
          text: err.message || 'Something went wrong. Please try again.',
          sources: [],
          nav_links: [],
        };
        messages.push(errorMsg);
        saveHistory();
        renderSingleMessage(messagesEl, errorMsg);
        messagesEl.scrollTop = messagesEl.scrollHeight;
      })
      .finally(function () {
        isSending = false;
        sendBtn.disabled = false;
      });
  }

  function formatMarkdown(rawText) {
    if (!rawText) return '';

    // Normalize inline hyphen bullets to separate lines
    var cleaned = String(rawText)
      .replace(/:\s*-\s+/g, ':\n- ')
      .replace(/([^\n])\s+-\s+([A-Z0-9])/g, '$1\n- $2');

    // 1. Escape HTML special characters
    var escaped = escapeHtml(cleaned);

    // 2. Bold: **text** or __text__
    escaped = escaped.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    escaped = escaped.replace(/__(.+?)__/g, '<strong>$1</strong>');

    // 3. Italic: *text* or _text_
    escaped = escaped.replace(/\*([^\*\n]+?)\*/g, '<em>$1</em>');
    escaped = escaped.replace(/_([^_\n]+?)_/g, '<em>$1</em>');

    // 4. Inline code: `code`
    escaped = escaped.replace(/`([^`\n]+?)`/g, '<code style="background:rgba(0,0,0,0.06);padding:2px 4px;border-radius:3px;font-size:12px;font-family:monospace;">$1</code>');

    // 5. Line-by-line parsing for lists and paragraphs
    var lines = escaped.split('\n');
    var inList = false;
    var out = [];

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (!line) {
        if (inList) {
          out.push('</ul>');
          inList = false;
        }
        continue;
      }

      var bulletMatch = line.match(/^[-*•]\s+(.*)$/);
      if (bulletMatch) {
        if (!inList) {
          out.push('<ul class="sm-msg-list">');
          inList = true;
        }
        out.push('<li>' + bulletMatch[1] + '</li>');
      } else {
        if (inList) {
          out.push('</ul>');
          inList = false;
        }
        out.push('<p class="sm-msg-para">' + line + '</p>');
      }
    }
    if (inList) {
      out.push('</ul>');
    }

    return out.length > 0 ? out.join('') : '<p class="sm-msg-para">' + escaped + '</p>';
  }

  // ========================================================================= //
  // Visual Pointing, Navigation & Highlighting Helpers                         //
  // ========================================================================= //

  function logDevOnly(msg) {
    try {
      var isDev = (
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        window.__DEV__ === true
      );
      if (isDev) {
        console.log(msg);
      }
    } catch (_) { }
  }

  function isDomainAllowed() {
    var currentHost = (window.location.hostname || '').toLowerCase().replace(/^www\./, '');
    if (currentHost === 'localhost' || currentHost === '127.0.0.1') return true;
    var registered = (config.domain || '').toLowerCase().replace(/^www\./, '').split('/')[0];
    if (!registered || !currentHost) return true;
    return currentHost === registered || currentHost.endsWith('.' + registered);
  }

  function getPath(urlStr) {
    try {
      var u = new URL(urlStr, window.location.origin);
      return u.pathname.replace(/\/+$/, '').toLowerCase() || '/';
    } catch (e) {
      return (urlStr || '').split('?')[0].split('#')[0].replace(/\/+$/, '').toLowerCase() || '/';
    }
  }

  function getHost(urlStr) {
    try {
      var u = new URL(urlStr, window.location.origin);
      return u.hostname.toLowerCase().replace(/^www\./, '');
    } catch (e) {
      return '';
    }
  }

  function cleanText(str) {
    if (!str) return '';
    return String(str)
      .toLowerCase()
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u2013\u2014]/g, '-')
      .replace(/[\u00a0\u202f]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function normalizeUrlPath(urlStr) {
    if (!urlStr) return '/';
    try {
      var u = new URL(urlStr, window.location.origin);
      var p = u.pathname.replace(/\/+$/, '').toLowerCase();
      if (!p || p === '/index.html' || p === '/index.htm') return '/';
      return p;
    } catch (e) {
      var clean = (urlStr || '').split('?')[0].split('#')[0].replace(/\/+$/, '').toLowerCase();
      if (!clean || clean === '/index.html' || clean === '/index.htm') return '/';
      return clean;
    }
  }

  function isSameDomain(pageUrl, currentHostname) {
    try {
      var curHost = (currentHostname || (typeof window !== 'undefined' && window.location ? window.location.hostname : '')).replace(/^www\./, '');
      var parsed = new URL(pageUrl, typeof window !== 'undefined' && window.location ? window.location.origin : undefined);
      var pageHost = parsed.hostname.replace(/^www\./, '');
      return pageHost === curHost || pageHost.endsWith('.' + curHost);
    } catch (e) {
      return false;
    }
  }

  function isSamePage(sourceUrl) {
    if (!sourceUrl) return false;
    var sUrl = String(sourceUrl).trim();
    if (sUrl.toLowerCase().endsWith('.pdf') || sUrl.toLowerCase().includes('.pdf?')) {
      return false;
    }

    if (!isSameDomain(sUrl, window.location.hostname)) return false;

    var curPath = normalizeUrlPath(window.location.href);
    var srcPath = normalizeUrlPath(sUrl);
    return curPath === srcPath;
  }

  function extractCandidatePhrases(source) {
    var phrases = [];
    if (!source) return phrases;

    // 0. Query context from caller or last sent user query
    var queryContext = source.userQuery || source.query || lastSentUserQuery || '';
    if (queryContext) {
      var cq = cleanText(queryContext).replace(/[?.,:;!]+$/, '').trim();
      if (cq.length >= 8) phrases.push(cq);
      var queryClauses = cq.split(/\s+(?:and|or|\?|,|&)\s+/);
      for (var qc = 0; qc < queryClauses.length; qc++) {
        var cl = queryClauses[qc].trim();
        if (cl.length >= 10 && !phrases.includes(cl)) phrases.push(cl);
      }
    }

    // 1. Check dom_selector JSON snippet
    if (source.dom_selector) {
      try {
        var parsed = typeof source.dom_selector === 'string'
          ? JSON.parse(source.dom_selector)
          : source.dom_selector;
        if (parsed && parsed.snippet) {
          var s = cleanText(parsed.snippet);
          if (s.length >= 3) phrases.push(s);
        }
      } catch (_) {}
    }

    // 2. Check complete chunk_text and text_snippet
    var textSources = [source.chunk_text, source.text_snippet].filter(Boolean);
    for (var ts = 0; ts < textSources.length; ts++) {
      var rawSentences = String(textSources[ts]).split(/[.?!;\n]+/);
      for (var i = 0; i < rawSentences.length; i++) {
        var sentence = cleanText(rawSentences[i]);
        if (sentence.length >= 10 && sentence.length <= 150) {
          phrases.push(sentence);
        }
      }
    }

    var fullSnippet = source.text_snippet ? cleanText(source.text_snippet) : '';
    if (fullSnippet) {
      if (fullSnippet.length <= 120) {
        phrases.push(fullSnippet);
      } else {
        phrases.push(fullSnippet.slice(0, 100).replace(/[.,:;!?]+$/, '').trim());
      }

      var words = fullSnippet.split(' ');
      if (words.length >= 4) {
        for (var w = 0; w < Math.min(words.length - 3, 5); w += 2) {
          var chunk = words.slice(w, w + 5).join(' ').replace(/[.,:;!?]+$/, '').trim();
          if (chunk.length >= 10) phrases.push(chunk);
        }
      }
    }

    // 3. Source label fallback (e.g. from nav_links: "About", "Services")
    if (source.label || source.page_title) {
      var rawLabel = source.label || source.page_title;
      var cleanLabel = cleanText(rawLabel.split(' - ')[0].split(' | ')[0].split('⚡')[0]);
      var brandName = cleanText((config && config.website_name) || 'NovaTech Solutions');
      if (cleanLabel.length >= 3 && cleanLabel !== brandName && cleanLabel !== 'novatech' && cleanLabel !== 'novatech solutions' && cleanLabel !== 'solutions') {
        phrases.push(cleanLabel);
        if (cleanLabel === 'about') phrases.push('about us');
        if (cleanLabel === 'services') phrases.push('our services');
      }
    }

    // 4. Page URL slug fallback
    if (source.page_url) {
      try {
        var pPath = new URL(source.page_url, window.location.origin).pathname;
        var pSlug = pPath.replace(/[/_-]/g, ' ').trim();
        if (pSlug.length >= 3) {
          phrases.push(cleanText(pSlug));
          if (pSlug === 'about') phrases.push('about us');
          if (pSlug === 'services') phrases.push('our services');
        }
      } catch (_) {}
    }

    // Deduplicate and rank candidate phrases (phrases matching user query keywords rank highest)
    var qTokens = queryContext ? cleanText(queryContext).split(/\s+/).filter(function (w) {
      return w.length >= 3 && !['what', 'where', 'when', 'which', 'how', 'who', 'the', 'and', 'are', 'can'].includes(w);
    }) : [];

    var seen = {};
    var scoredPhrases = [];
    for (var p = 0; p < phrases.length; p++) {
      var item = phrases[p].replace(/[.,:;!?]+$/, '').trim();
      if (item && !seen[item] && item.length >= 3) {
        seen[item] = true;
        var pScore = item.length;
        if (qTokens.length > 0) {
          var itemWords = item.split(/\s+/);
          for (var iw = 0; iw < itemWords.length; iw++) {
            if (qTokens.includes(itemWords[iw])) pScore += 60;
          }
        }
        scoredPhrases.push({ phrase: item, score: pScore });
      }
    }

    scoredPhrases.sort(function (a, b) { return b.score - a.score; });
    return scoredPhrases.map(function (sp) { return sp.phrase; });
  }

  function extractSnippet(source) {
    var phrases = extractCandidatePhrases(source);
    return phrases.length > 0 ? phrases[0] : null;
  }

  /**
   * longestCommonSubstring — returns the length of the longest common substring
   * between strings a and b. Used for fuzzy text matching when exact inclusion fails.
   */
  function longestCommonSubstring(a, b) {
    var max = 0;
    for (var i = 0; i < a.length; i++) {
      for (var j = 0; j < b.length; j++) {
        var len = 0;
        while (i + len < a.length && j + len < b.length && a[i + len] === b[j + len]) len++;
        if (len > max) max = len;
      }
    }
    return max;
  }

  /**
   * findMatchingElement — robust fuzzy element finder.
   * Normalises whitespace before comparison, handles minor live-page text
   * differences vs stored snippet (spacing, smart quotes, etc.).
   */
  function findMatchingElement(snippet) {
    if (!snippet || snippet.length < 8) return null;
    var normSnippet = cleanText(snippet);
    if (!normSnippet || normSnippet.length < 5) return null;

    var candidates = document.querySelectorAll(
      'p, li, h1, h2, h3, h4, h5, h6, dt, dd, td, th, blockquote, div, span, section, summary, button'
    );
    var bestMatch = null;
    var shortestLen = Infinity;
    var bestScore = 0;

    for (var fi = 0; fi < candidates.length; fi++) {
      var fel = candidates[fi];
      if (containerEl && containerEl.contains(fel)) continue;

      if (fel.id === 'root' || fel.tagName === 'BODY' || fel.tagName === 'MAIN') continue;
      if (fel.closest && fel.closest('header, nav, footer, #sitemind-widget-container')) continue;

      var fText = cleanText(fel.innerText || fel.textContent || '');
      if (fText.length < 5) continue;

      // Exact substring inclusion in either direction
      if (fText.includes(normSnippet) || (fText.length >= 10 && normSnippet.includes(fText))) {
        if (fText.length < shortestLen) {
          shortestLen = fText.length;
          bestMatch = fel;
        }
      } else if (!bestMatch) {
        var overlapLength = longestCommonSubstring(normSnippet, fText);
        var score = overlapLength / Math.min(normSnippet.length, fText.length);
        if (score > 0.65 && score > bestScore) {
          bestScore = score;
          bestMatch = fel;
          shortestLen = fText.length;
        }
      }
    }
    return bestMatch;
  }

  function findHeadingMatchingQuery(query) {
    if (!query || query.length < 5) return null;
    var normQ = cleanText(query).replace(/[?.,:;!]+$/, '').trim();
    if (!normQ || normQ.length < 5) return null;

    var elements = document.querySelectorAll(
      'h1, h2, h3, h4, h5, h6, summary, dt, [role="heading"], button, p, strong, div'
    );

    var clauses = [normQ];
    var subClauses = normQ.split(/\s+(?:and|or|\?|,|&)\s+/);
    for (var c = 0; c < subClauses.length; c++) {
      var sc = subClauses[c].trim();
      if (sc.length >= 12 && !clauses.includes(sc)) {
        clauses.push(sc);
      }
    }

    var bestEl = null;
    var shortestLen = Infinity;

    for (var i = 0; i < elements.length; i++) {
      var el = elements[i];
      if (containerEl && containerEl.contains(el)) continue;
      if (el.closest && el.closest('header, nav, footer, #sitemind-widget-container')) continue;
      if (el.id === 'root' || el.tagName === 'BODY' || el.tagName === 'MAIN') continue;

      var elText = cleanText(el.innerText || el.textContent || '').replace(/[?.,:;!]+$/, '').trim();
      if (elText.length < 5 || elText.length > 350) continue;

      for (var ci = 0; ci < clauses.length; ci++) {
        var clause = clauses[ci];
        if (elText === clause || elText.includes(clause) || clause.includes(elText)) {
          if (elText.length < shortestLen) {
            shortestLen = elText.length;
            bestEl = el;
          }
        }
      }
    }

    return bestEl;
  }

  function handleSourceHighlightClick(source) {
    if (!source || !source.page_url) return;
    var pageUrl = String(source.page_url).trim();
    var snippet = extractSnippet(source) || source.page_title || '';
    var domainResult = isSameDomain(pageUrl, window.location.hostname);

    // 1. First, check if the content is already present on the CURRENT page!
    // In SPAs and single-page designs (like NovaTech), content for services, about, etc.
    // often lives directly on the homepage. Highlighting on the current page avoids unnecessary 404 navigations.
    var currentEl = attemptVisualPointing(source, true);
    if (currentEl) {
      if (window.SITEMIND_DEBUG === true) {
        console.log('[SiteMind VP Debug] Content found and highlighted directly on current page:', currentEl);
      }
      return;
    }

    var samePageResult = isSamePage(pageUrl);
    if (samePageResult) {
      // Already on page and attemptVisualPointing was tried above
      return;
    }

    // 2. Same domain, not on current page: navigate and pass pending highlight via sessionStorage & hash
    if (domainResult) {
      if (window.SITEMIND_DEBUG === true) {
        console.log('[SiteMind VP Debug] Show on page (navigating same domain):', {
          source: source,
          snippet: snippet,
          domainComparison: domainResult,
          elementFound: null,
          highlightStatus: 'navigating-same-domain'
        });
      }
      try {
        sessionStorage.setItem('sitemind_pending_highlight', JSON.stringify(source));
      } catch (_) {}
      var targetUrl = pageUrl;
      if (snippet) {
        var sep = targetUrl.indexOf('#') > -1 ? '&' : '#';
        targetUrl = targetUrl + sep + 'sitemind-highlight=' + encodeURIComponent(snippet);
      }
      window.location.href = targetUrl;
      return;
    }

    // 3. Different domain: open in new tab
    if (window.SITEMIND_DEBUG === true) {
      console.log('[SiteMind VP Debug] Show on page (external domain):', {
        source: source,
        snippet: snippet,
        domainComparison: domainResult,
        elementFound: null,
        highlightStatus: 'opened-external-new-tab'
      });
    }
    window.open(pageUrl, '_blank', 'noopener,noreferrer');
  }

  function checkUrlHighlightHash() {
    try {
      var sourceToHighlight = null;
      var stored = null;
      try {
        stored = sessionStorage.getItem('sitemind_pending_highlight');
      } catch (_) {}

      if (stored) {
        try {
          sourceToHighlight = JSON.parse(stored);
        } catch (_) {}
      }

      var hash = window.location.hash || '';
      var match = hash.match(/[#&]sitemind-highlight=([^&]+)/);
      if (match && match[1]) {
        var rawSnippet = decodeURIComponent(match[1]);
        if (!sourceToHighlight) {
          sourceToHighlight = { text_snippet: rawSnippet };
        }
        var cleanUrl = window.location.pathname + window.location.search;
        if (window.history && window.history.replaceState) {
          window.history.replaceState(null, '', cleanUrl);
        }
      }

      if (sourceToHighlight) {
        var attempts = 0;
        var maxAttempts = 10;
        // 1500ms first attempt — allows new page DOM to fully render after navigation.
        // Subsequent retries at 500ms intervals.
        var firstDelay = 1500;
        var retryDelay = 500;
        var _doAttempt = function () {
          attempts++;
          var ok = attemptVisualPointing(sourceToHighlight, true);
          if (ok || attempts >= maxAttempts) {
            try { sessionStorage.removeItem('sitemind_pending_highlight'); } catch (_) {}
            return;
          }
          setTimeout(_doAttempt, retryDelay);
        };
        setTimeout(_doAttempt, firstDelay);
      }
    } catch (_) {}
  }

  function executeVisualHighlight(targetEl) {
    if (!targetEl) return false;

    // Elevate small inline tags to readable block parent if appropriate
    if (targetEl.tagName === 'SPAN' || targetEl.tagName === 'B' || targetEl.tagName === 'STRONG' || targetEl.tagName === 'EM') {
      var parentBlock = targetEl.closest('p, li, h1, h2, h3, h4, h5, h6, a, div, summary, dt');
      if (parentBlock && parentBlock.innerText && cleanText(parentBlock.innerText).length < 350) {
        targetEl = parentBlock;
      }
    }

    var styleId = 'sitemind-highlight-style';
    var styleInjectionOk = false;
    var existingStyle = document.getElementById(styleId);
    if (!existingStyle) {
      try {
        var styleEl = document.createElement('style');
        styleEl.id = styleId;
        styleEl.textContent = [
          '@keyframes sitemindGlow {',
          '  0% { box-shadow: 0 0 0 4px rgba(37,99,235,0.4), 0 0 20px rgba(245,158,11,0.7); }',
          '  50% { box-shadow: 0 0 0 2px rgba(245,158,11,0.3), 0 0 10px rgba(245,158,11,0.4); }',
          '  100% { box-shadow: 0 0 0 4px rgba(37,99,235,0.4), 0 0 20px rgba(245,158,11,0.7); }',
          '}',
          '.sitemind-highlight-active {',
          '  outline: 4px solid #2563eb !important;',
          '  outline-offset: 4px !important;',
          '  background-color: rgba(254,240,138,0.75) !important;',
          '  border-radius: 6px !important;',
          '  transition: all 0.3s ease !important;',
          '  animation: sitemindGlow 1.4s infinite ease-in-out !important;',
          '}'
        ].join('\n');
        document.head.appendChild(styleEl);
        styleInjectionOk = true;
      } catch (cspErr) {
        logDevOnly('visual-point: stylesheet injection blocked by CSP (' + cspErr.message + '), using inline style fallback');
        styleInjectionOk = false;
      }
    } else {
      styleInjectionOk = true;
    }

    // Clear any previous active highlights across document so only 1 element is ever highlighted
    var prevActive = document.querySelectorAll('.sitemind-highlight-active');
    for (var pi = 0; pi < prevActive.length; pi++) {
      try {
        prevActive[pi].classList.remove('sitemind-highlight-active');
        prevActive[pi].style.backgroundColor = '';
        prevActive[pi].style.outline = '';
        prevActive[pi].style.outlineOffset = '';
        prevActive[pi].style.borderRadius = '';
        prevActive[pi].style.transition = '';
      } catch (_) {}
    }

    // Clean up any old floating beacon badge if present
    var oldBeacon = document.getElementById('sitemind-pointer-beacon');
    if (oldBeacon && oldBeacon.parentNode) {
      oldBeacon.parentNode.removeChild(oldBeacon);
    }
    var strayBadges = document.querySelectorAll('[id*="beacon"], [class*="beacon"], [class*="pointer-badge"]');
    for (var bi = 0; bi < strayBadges.length; bi++) {
      if (strayBadges[bi].parentNode) strayBadges[bi].parentNode.removeChild(strayBadges[bi]);
    }

    // Apply highlight and scroll smoothly to target element
    try {
      if (styleInjectionOk) {
        targetEl.classList.add('sitemind-highlight-active');
      } else {
        targetEl.style.backgroundColor = 'rgba(254, 240, 138, 0.75)';
        targetEl.style.transition = 'all 0.3s ease';
        targetEl.style.outline = '4px solid #2563eb';
        targetEl.style.outlineOffset = '4px';
        targetEl.style.borderRadius = '6px';
      }
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (scrollErr) {
      logDevOnly('visual-point: scrollIntoView failed: ' + scrollErr.message);
    }

    if (window.SITEMIND_DEBUG === true) {
      console.log('[SiteMind VP Debug] Highlight applied to element:', targetEl, '| styleInjectionOk:', styleInjectionOk);
    }

    // Clean up highlights after 4000ms
    setTimeout(function () {
      try {
        if (styleInjectionOk) {
          targetEl.classList.remove('sitemind-highlight-active');
        } else {
          targetEl.style.backgroundColor = '';
          targetEl.style.transition = '';
          targetEl.style.outline = '';
          targetEl.style.outlineOffset = '';
          targetEl.style.borderRadius = '';
        }
      } catch (_) {}
    }, 4000);

    return { success: true, element: targetEl, fellBack: !styleInjectionOk };
  }

  function attemptVisualPointing(source, isManual) {
    try {
      if (!source) return false;

      if (source.nodeType === 1) {
        return executeVisualHighlight(source);
      }
      if (source.element && source.element.nodeType === 1) {
        return executeVisualHighlight(source.element);
      }

      var candidatePhrases = extractCandidatePhrases(source);
      var matchedEl = null;

      // Tier 1 (Primary Content Match): Use robust findMatchingElement on candidate phrases
      for (var cpi = 0; cpi < candidatePhrases.length; cpi++) {
        var cp = candidatePhrases[cpi];
        if (cp && cp.length >= 8) {
          matchedEl = findMatchingElement(cp);
          if (matchedEl) break;
        }
      }

      // Tier 2: Search semantic leaf content elements for contiguous phrase matches
      if (!matchedEl) {
        var semanticLeaves = document.querySelectorAll(
          'h1, h2, h3, h4, h5, h6, p, li, a, button, blockquote, dt, dd, td, th, summary'
        );

        for (var p = 0; p < candidatePhrases.length; p++) {
          var phrase = candidatePhrases[p];
          if (phrase.length < 5) continue;

          var shortestLen = Infinity;
          for (var i = 0; i < semanticLeaves.length; i++) {
            var el = semanticLeaves[i];
            if (containerEl && containerEl.contains(el)) continue;
            if (el.closest && el.closest('header, nav, footer, #sitemind-widget-container')) continue;
            var elText = cleanText(el.innerText || el.textContent || '');
            if (!elText) continue;

            if (elText.includes(phrase) || phrase.includes(elText)) {
              if (elText.length < shortestLen) {
                matchedEl = el;
                shortestLen = elText.length;
              }
            }
          }

          if (matchedEl) break;
        }
      }

      // Tier 3: Search general elements if semantic leaves yielded nothing
      if (!matchedEl) {
        var generalElements = document.querySelectorAll('span, b, strong, em, div, section, article');
        for (var gp = 0; gp < candidatePhrases.length; gp++) {
          var gPhrase = candidatePhrases[gp];
          if (gPhrase.length < 5) continue;

          for (var gi = 0; gi < generalElements.length; gi++) {
            var gel = generalElements[gi];
            if (containerEl && containerEl.contains(gel)) continue;
            if (gel.tagName === 'SCRIPT' || gel.tagName === 'STYLE' || gel.tagName === 'SVG') continue;
            if (gel.closest && gel.closest('header, nav, footer, #sitemind-widget-container')) continue;
            var gText = cleanText(gel.innerText || gel.textContent || '');
            if (!gText || gText.length > 500) continue;

            if (gText.includes(gPhrase)) {
              matchedEl = gel;
              break;
            }
          }
          if (matchedEl) break;
        }
      }

      // Tier 4: Multi-keyword density fallback
      if (!matchedEl && candidatePhrases.length > 0) {
        var stopWords = { the: 1, and: 1, with: 1, that: 1, this: 1, from: 1, for: 1, our: 1, you: 1, page: 1, site: 1, more: 1, your: 1, what: 1, where: 1, how: 1 };
        var allWords = [];
        for (var cpIdx = 0; cpIdx < candidatePhrases.length; cpIdx++) {
          var wArr = candidatePhrases[cpIdx].split(' ').filter(function (w) { return w.length >= 3 && !stopWords[w]; });
          for (var wa = 0; wa < wArr.length; wa++) {
            if (!allWords.includes(wArr[wa])) allWords.push(wArr[wa]);
          }
        }

        if (allWords.length >= 1) {
          var allCandidates = document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, li, a, button, span, div, summary, dt');
          var bestScore = -999;
          for (var j = 0; j < allCandidates.length; j++) {
            var cel = allCandidates[j];
            if (containerEl && containerEl.contains(cel)) continue;
            if (cel.tagName === 'SCRIPT' || cel.tagName === 'STYLE' || cel.tagName === 'SVG') continue;
            if (cel.closest && cel.closest('header, nav, footer, #sitemind-widget-container')) continue;

            var cText = cleanText(cel.innerText || cel.textContent || '');
            if (!cText || cText.length > 400) continue;

            var score = 0;
            for (var b = 0; b < allWords.length; b++) {
              if (cText.includes(allWords[b])) score += 10;
            }
            score -= Math.floor(cText.length / 30);

            if (score > bestScore && score >= 10) {
              bestScore = score;
              matchedEl = cel;
            }
          }
        }
      }

      if (!matchedEl) {
        logDevOnly('visual-point-failed: element not found on page');
        return false;
      }

      return executeVisualHighlight(matchedEl);
    } catch (err) {
      logDevOnly('visual-point-failed: ' + err.message);
      return false;
    }
  }

  function performAutoVisualPointing(userQuery, botResponse, sources) {
    try {
      if (!isDomainAllowed()) return;

      // 1. Direct Heading / Question match for the question asked
      if (userQuery && userQuery.length >= 5) {
        var headingEl = findHeadingMatchingQuery(userQuery);
        if (headingEl) {
          executeVisualHighlight(headingEl);
          return;
        }
      }

      // 2. Try matching grounded sources on the page
      if (sources && Array.isArray(sources) && sources.length > 0) {
        var samePageSources = [];
        var otherSources = [];
        for (var i = 0; i < sources.length; i++) {
          if (sources[i] && isSamePage(sources[i].page_url)) {
            samePageSources.push(sources[i]);
          } else if (sources[i]) {
            otherSources.push(sources[i]);
          }
        }
        var candidateSources = samePageSources.concat(otherSources);
        for (var s = 0; s < candidateSources.length; s++) {
          var srcObj = Object.assign({}, candidateSources[s], { userQuery: userQuery });
          var pointed = attemptVisualPointing(srcObj, false);
          if (pointed) return;
        }
      }

      // 3. Fallback: Check key sentences from the bot answer against host page content
      if (botResponse && botResponse.length >= 15) {
        var cleanedAnswer = botResponse
          .replace(/```[\s\S]*?```/g, ' ')
          .replace(/\[.*?\]\(.*?\)/g, ' ')
          .replace(/[*_#`>-]/g, ' ');
        var answerSentences = cleanedAnswer.split(/[.?!;\n]+/);
        for (var a = 0; a < answerSentences.length; a++) {
          var sent = cleanText(answerSentences[a]);
          if (sent.length >= 20 && sent.length <= 150) {
            var matched = findMatchingElement(sent);
            if (matched) {
              executeVisualHighlight(matched);
              return;
            }
          }
        }
      }
    } catch (e) {
      logDevOnly('auto-visual-pointing failed: ' + e.message);
    }
  }

  // Kick off config fetch and hash highlight listener on load
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    fetchConfig();
    checkUrlHighlightHash();
  } else {
    window.addEventListener('DOMContentLoaded', function () {
      fetchConfig();
      checkUrlHighlightHash();
    });
  }
  window.addEventListener('hashchange', checkUrlHighlightHash);
  window.addEventListener('popstate', checkUrlHighlightHash);
})();
