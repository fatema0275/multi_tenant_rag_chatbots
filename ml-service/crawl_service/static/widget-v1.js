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
        width: 380px !important;
        max-width: calc(100vw - 40px) !important;
        height: 580px !important;
        max-height: calc(100vh - 110px) !important;
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

      .sm-input {
        flex: 1 !important;
        border: 1px solid rgba(0, 0, 0, 0.15) !important;
        border-radius: 20px !important;
        padding: 10px 16px !important;
        font-size: 13.5px !important;
        outline: none !important;
        color: ${text} !important;
        background-color: #ffffff !important;
        transition: border-color 0.2s ease !important;
      }

      .sm-input:focus {
        border-color: ${theme} !important;
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
          <input type="text" class="sm-input" id="sm-input" placeholder="${escapeHtml(config.placeholder_text || 'Type a message...')}" />
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
            if (isSameDomain(link.url)) {
              window.location.href = link.url;
            } else {
              window.open(link.url, '_blank', 'noopener,noreferrer');
            }
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
          var displayTitle = src.page_title || src.page_url;
          linkEl.title = displayTitle;
          linkEl.textContent = displayTitle;
          linkEl.target = '_blank';
          linkEl.rel = 'noopener noreferrer';

          itemEl.appendChild(linkEl);

          // Highlight button for ALL sources (navigates & highlights)
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
          sourcesContainer.appendChild(itemEl);
        });

        el.appendChild(sourcesContainer);
      }
    }

    container.appendChild(el);
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
  }

  function sendMessage() {
    var inputEl = shadowRoot.getElementById('sm-input');
    var messagesEl = shadowRoot.getElementById('sm-messages');
    var sendBtn = shadowRoot.getElementById('sm-send-btn');

    var text = inputEl.value ? inputEl.value.trim() : '';
    if (!text || isSending) return;

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

        var botMsg = {
          sender: 'bot',
          text: (data && data.response) || 'No response generated.',
          verified: (data && data.verified) || false,
          sources: (data && data.sources) || [],
          nav_links: (data && data.nav_links) || [],
        };

        messages.push(botMsg);
        saveHistory();
        renderSingleMessage(messagesEl, botMsg);
        messagesEl.scrollTop = messagesEl.scrollHeight;

        // Auto-attempt visual pointing on the first source on the same page
        if (data && data.sources && Array.isArray(data.sources)) {
          var firstSamePageSource = null;
          for (var k = 0; k < data.sources.length; k++) {
            if (data.sources[k] && isSamePage(data.sources[k].page_url)) {
              firstSamePageSource = data.sources[k];
              break;
            }
          }
          if (firstSamePageSource) {
            setTimeout(function () {
              attemptVisualPointing(firstSamePageSource, false);
            }, 300);
          }
        }
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

  function getHost(urlStr) {
    try {
      var u = new URL(urlStr, window.location.origin);
      return u.hostname.toLowerCase().replace(/^www\./, '');
    } catch (e) {
      return '';
    }
  }

  function isSameDomain(sourceUrl) {
    if (!sourceUrl) return false;
    var curHost = (window.location.hostname || '').toLowerCase().replace(/^www\./, '');
    var srcHost = getHost(sourceUrl);
    if (!srcHost) return true; // relative path
    if (curHost === 'localhost' || curHost === '127.0.0.1') return true;
    var regHost = (config.domain || '').toLowerCase().replace(/^www\./, '').split('/')[0];
    return srcHost === curHost || (regHost && (srcHost === regHost || srcHost.endsWith('.' + regHost)));
  }

  function isSamePage(sourceUrl) {
    if (!sourceUrl) return false;
    var sUrl = String(sourceUrl).trim();
    if (sUrl.toLowerCase().endsWith('.pdf') || sUrl.toLowerCase().includes('.pdf?')) {
      return false;
    }

    if (!isSameDomain(sUrl)) return false;

    var curPath = normalizeUrlPath(window.location.href);
    var srcPath = normalizeUrlPath(sUrl);
    return curPath === srcPath;
  }

  function extractCandidatePhrases(source) {
    var phrases = [];
    if (!source) return phrases;

    // 1. Check dom_selector JSON snippet
    if (source.dom_selector) {
      try {
        var parsed = typeof source.dom_selector === 'string'
          ? JSON.parse(source.dom_selector)
          : source.dom_selector;
        if (parsed && parsed.snippet) {
          var s = cleanText(parsed.snippet);
          if (s.length >= 8) phrases.push(s);
        }
      } catch (_) {}
    }

    // 2. Check full text_snippet
    var fullSnippet = source.text_snippet ? cleanText(source.text_snippet) : '';
    if (fullSnippet) {
      if (fullSnippet.length <= 120) {
        phrases.push(fullSnippet);
      } else {
        phrases.push(fullSnippet.slice(0, 100).replace(/[.,:;!?]+$/, '').trim());
      }

      // 3. Extract sentence-level candidates (split by punctuation)
      var rawSentences = String(source.text_snippet).split(/[.?!;\n]+/);
      for (var i = 0; i < rawSentences.length; i++) {
        var sentence = cleanText(rawSentences[i]);
        if (sentence.length >= 15 && sentence.length <= 120) {
          phrases.push(sentence);
        }
      }

      // 4. Extract 5-to-8 word n-gram chunks
      var words = fullSnippet.split(' ');
      if (words.length >= 5) {
        for (var w = 0; w < Math.min(words.length - 4, 4); w += 2) {
          var chunk = words.slice(w, w + 6).join(' ').replace(/[.,:;!?]+$/, '').trim();
          if (chunk.length >= 15) phrases.push(chunk);
        }
      }
    }

    // 5. Page title fallback
    if (source.page_title) {
      var t = cleanText(source.page_title.split(' - ')[0].split(' | ')[0]);
      if (t.length >= 8) phrases.push(t);
    }

    // Deduplicate and sort by length descending (longest / most specific first)
    var seen = {};
    var unique = [];
    for (var p = 0; p < phrases.length; p++) {
      var item = phrases[p].replace(/[.,:;!?]+$/, '').trim();
      if (item && !seen[item] && item.length >= 8) {
        seen[item] = true;
        unique.push(item);
      }
    }
    unique.sort(function (a, b) { return b.length - a.length; });
    return unique;
  }

  function extractSnippet(source) {
    var phrases = extractCandidatePhrases(source);
    return phrases.length > 0 ? phrases[0] : null;
  }

  // BUG 1: Must navigate AND highlight across same-page, same-domain, and external
  function handleSourceHighlightClick(source) {
    if (!source || !source.page_url) return;
    var pageUrl = String(source.page_url).trim();

    // 1. Same page: skip navigation and highlight directly
    if (isSamePage(pageUrl)) {
      attemptVisualPointing(source, true);
      return;
    }

    // 2. Same domain: navigate and append hash for cross-page highlighting
    if (isSameDomain(pageUrl)) {
      var snippet = extractSnippet(source);
      var targetUrl = pageUrl;
      if (snippet) {
        var sep = targetUrl.indexOf('#') > -1 ? '&' : '#';
        targetUrl = targetUrl + sep + 'sitemind-highlight=' + encodeURIComponent(snippet);
      }
      window.location.href = targetUrl;
      return;
    }

    // 3. Different domain: open in new tab
    window.open(pageUrl, '_blank', 'noopener,noreferrer');
  }

  // BUG 1: Check for #sitemind-highlight= on page load
  function checkUrlHighlightHash() {
    try {
      var hash = window.location.hash || '';
      var match = hash.match(/[#&]sitemind-highlight=([^&]+)/);
      if (match && match[1]) {
        var rawSnippet = decodeURIComponent(match[1]);
        // Clean hash from URL without reloading page
        var cleanUrl = window.location.pathname + window.location.search;
        if (window.history && window.history.replaceState) {
          window.history.replaceState(null, '', cleanUrl);
        }
        setTimeout(function () {
          attemptVisualPointing({ text_snippet: rawSnippet }, true);
        }, 1200);
      }
    } catch (_) {}
  }

  function attemptVisualPointing(source, isManual) {
    try {
      if (!source) return;

      var candidatePhrases = extractCandidatePhrases(source);
      if (candidatePhrases.length === 0) {
        logDevOnly('visual-point-failed: no search phrases found');
        return;
      }

      // Query all visible, text-containing elements on the page
      var candidates = document.querySelectorAll(
        'p, li, h1, h2, h3, h4, h5, h6, span, td, th, blockquote, div, a, article, section, header, footer, b, strong, em, label, dt, dd'
      );

      var matchedEl = null;
      var shortestLen = Infinity;

      // Strategy 1: Contiguous phrase matching (longest phrase to shortest)
      for (var p = 0; p < candidatePhrases.length; p++) {
        var phrase = candidatePhrases[p];
        if (phrase.length < 8) continue;

        for (var i = 0; i < candidates.length; i++) {
          var el = candidates[i];
          if (containerEl && containerEl.contains(el)) continue;
          if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE' || el.tagName === 'SVG') continue;

          var elText = cleanText(el.innerText || el.textContent || '');
          if (!elText) continue;

          if (elText.includes(phrase)) {
            // Prefer the most specific (innermost) element that contains the phrase
            if (elText.length < shortestLen) {
              matchedEl = el;
              shortestLen = elText.length;
            }
          }
        }

        // If we found a specific matched element for this phrase, proceed
        if (matchedEl && shortestLen < 600) {
          break;
        }
      }

      // Strategy 2: Distinctive keyword density fallback if DOM tags split the sentence
      if (!matchedEl && candidatePhrases.length > 0) {
        var baseWords = candidatePhrases[0].split(' ').filter(function (w) { return w.length >= 4; });
        if (baseWords.length >= 3) {
          var bestScore = 0;
          for (var j = 0; j < candidates.length; j++) {
            var cel = candidates[j];
            if (containerEl && containerEl.contains(cel)) continue;
            if (cel.tagName === 'SCRIPT' || cel.tagName === 'STYLE' || cel.tagName === 'SVG') continue;

            var cText = cleanText(cel.innerText || cel.textContent || '');
            if (!cText || cText.length > 800) continue;

            var score = 0;
            for (var b = 0; b < baseWords.length; b++) {
              if (cText.includes(baseWords[b])) score++;
            }

            if (score >= Math.min(3, baseWords.length) && score > bestScore) {
              bestScore = score;
              matchedEl = cel;
            }
          }
        }
      }

      if (!matchedEl) {
        logDevOnly('visual-point-failed: element not found on page for phrases: ' + candidatePhrases.slice(0, 3).join(' | '));
        return;
      }

      // If matched element is an inline wrapper, locate parent paragraph/item for better visibility
      var targetEl = matchedEl;
      if (targetEl.tagName === 'SPAN' || targetEl.tagName === 'B' || targetEl.tagName === 'STRONG' || targetEl.tagName === 'EM') {
        var parentBlock = targetEl.closest('p, li, h1, h2, h3, h4, h5, h6, div, article');
        if (parentBlock && parentBlock.innerText && cleanText(parentBlock.innerText).length < 500) {
          targetEl = parentBlock;
        }
      }

      var origOutline = targetEl.style.outline;
      var origOutlineOffset = targetEl.style.outlineOffset;
      var origBg = targetEl.style.backgroundColor;
      var origBoxShadow = targetEl.style.boxShadow;
      var origTransition = targetEl.style.transition;
      var origBorderRadius = targetEl.style.borderRadius;

      var styleId = 'sitemind-highlight-style';
      var existingStyle = document.getElementById(styleId);
      if (!existingStyle) {
        var styleEl = document.createElement('style');
        styleEl.id = styleId;
        styleEl.textContent = `
          @keyframes sitemindGlow {
            0% {
              outline-color: #2563eb;
              background-color: rgba(254, 240, 138, 0.85);
              box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.4), 0 0 20px rgba(245, 158, 11, 0.8);
            }
            50% {
              outline-color: #f59e0b;
              background-color: rgba(254, 240, 138, 0.55);
              box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.3), 0 0 12px rgba(245, 158, 11, 0.5);
            }
            100% {
              outline-color: #2563eb;
              background-color: rgba(254, 240, 138, 0.85);
              box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.4), 0 0 20px rgba(245, 158, 11, 0.8);
            }
          }
          .sitemind-highlight-active {
            animation: sitemindGlow 1.4s infinite ease-in-out !important;
          }
        `;
        document.head.appendChild(styleEl);
      }

      targetEl.style.transition = 'all 0.3s ease';
      targetEl.style.borderRadius = '6px';
      targetEl.style.outline = '3px solid #2563eb';
      targetEl.style.outlineOffset = '4px';
      targetEl.style.backgroundColor = 'rgba(254, 240, 138, 0.85)';
      targetEl.style.boxShadow = '0 0 0 4px rgba(37, 99, 235, 0.4), 0 0 20px rgba(245, 158, 11, 0.8)';
      targetEl.classList.add('sitemind-highlight-active');

      targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });

      setTimeout(function () {
        try {
          targetEl.classList.remove('sitemind-highlight-active');
          targetEl.style.outline = origOutline;
          targetEl.style.outlineOffset = origOutlineOffset;
          targetEl.style.backgroundColor = origBg;
          targetEl.style.boxShadow = origBoxShadow;
          targetEl.style.borderRadius = origBorderRadius;
          setTimeout(function () {
            try {
              targetEl.style.transition = origTransition;
            } catch (_) { }
          }, 350);
        } catch (_) { }
      }, 4500);

    } catch (err) {
      // Silently abort visual pointing on any error
    }
  }

  // Kick off config fetch on load
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    fetchConfig();
  } else {
    window.addEventListener('DOMContentLoaded', fetchConfig);
  }
})();
