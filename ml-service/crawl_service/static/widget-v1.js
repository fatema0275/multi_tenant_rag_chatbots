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
  };

  var isOpen = false;
  var isSending = false;
  var shadowRoot = null;
  var containerEl = null;
  var visualPointingSessionDisabled = false;

  // Fetch public widget config from backend
  function fetchConfig() {
    if (!embedToken) {
      initWidget();
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
        }
        initWidget();
      })
      .catch(function (err) {
        console.warn('[SiteMind Widget] Using fallback config due to:', err.message);
        initWidget();
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

  function renderWidget() {
    var theme = config.theme_color;
    var bg = config.background_color;
    var text = config.text_color;

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
        bottom: 20px !important;
        right: 20px !important;
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
        bottom: 90px !important;
        right: 20px !important;
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
        max-width: 82% !important;
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

        <div class="sm-messages" id="sm-messages">
          <div class="sm-msg sm-msg-bot">
            Hello! How can I help you today?
          </div>
        </div>

        <div class="sm-input-row">
          <input type="text" class="sm-input" id="sm-input" placeholder="Type a message..." />
          <button class="sm-send-btn" id="sm-send-btn" aria-label="Send message">
            <svg viewBox="0 0 24 24">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
          </button>
        </div>
      </div>
    `;

    shadowRoot.innerHTML = html;

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

  function attachEventListeners() {
    var launcher = shadowRoot.getElementById('sm-launcher');
    var closeBtn = shadowRoot.getElementById('sm-close-btn');
    var sendBtn = shadowRoot.getElementById('sm-send-btn');
    var inputEl = shadowRoot.getElementById('sm-input');
    var iconChat = shadowRoot.getElementById('sm-icon-chat');
    var iconClose = shadowRoot.getElementById('sm-icon-close');
    var panel = shadowRoot.getElementById('sm-panel');

    function toggleOpen() {
      isOpen = !isOpen;
      if (isOpen) {
        panel.classList.add('sm-open');
        iconChat.style.display = 'none';
        iconClose.style.display = 'block';
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

    // Append user message
    var userMsgEl = document.createElement('div');
    userMsgEl.className = 'sm-msg sm-msg-user';
    userMsgEl.textContent = text;
    messagesEl.appendChild(userMsgEl);

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

    fetch(queryUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: embedToken, message: text }),
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
        messagesEl.removeChild(typingEl);

        var botMsgEl = document.createElement('div');
        botMsgEl.className = 'sm-msg sm-msg-bot';
        botMsgEl.textContent = (data && data.response) || 'No response generated.';

        // Render sources section if sources exist (Step 4 & Step 5)
        if (data && data.sources && Array.isArray(data.sources) && data.sources.length > 0) {
          var sourcesContainer = document.createElement('div');
          sourcesContainer.className = 'sm-sources';

          var sourcesLabel = document.createElement('div');
          sourcesLabel.className = 'sm-sources-label';
          sourcesLabel.textContent = 'Sources';
          sourcesContainer.appendChild(sourcesLabel);

          data.sources.forEach(function (src) {
            if (!src || !src.page_url) return;

            var samePage = isSamePage(src.page_url);
            var itemEl = document.createElement('div');
            itemEl.className = 'sm-source-item' + (samePage ? ' sm-source-same-page' : '');

            var linkEl = document.createElement('a');
            linkEl.className = 'sm-source-link';
            linkEl.href = src.page_url;
            var displayTitle = src.page_title || src.page_url;
            linkEl.title = displayTitle;
            linkEl.textContent = displayTitle;
            linkEl.target = '_blank';
            linkEl.rel = 'noopener noreferrer';

            itemEl.appendChild(linkEl);

            // If it's on the same page, include the visual pointer highlight button!
            // If it's on a different page, ONLY the link is required.
            if (samePage) {
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
                attemptVisualPointing(src, true);
              });

              itemEl.appendChild(btnEl);
            }

            sourcesContainer.appendChild(itemEl);
          });

          botMsgEl.appendChild(sourcesContainer);
        }

        messagesEl.appendChild(botMsgEl);
        messagesEl.scrollTop = messagesEl.scrollHeight;

        // Auto-attempt visual pointing only on the first source that is on the SAME page
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
        var errorMsgEl = document.createElement('div');
        errorMsgEl.className = 'sm-msg sm-msg-bot';
        errorMsgEl.style.color = '#ef4444';
        errorMsgEl.textContent = err.message || 'Something went wrong. Please try again.';
        messagesEl.appendChild(errorMsgEl);
        messagesEl.scrollTop = messagesEl.scrollHeight;
      })
      .finally(function () {
        isSending = false;
        sendBtn.disabled = false;
      });
  }

  // ========================================================================= //
  // Module 7 Visual Pointing & Live Page Highlighting Helpers                  //
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
    } catch (_) {}
  }

  function isDomainAllowed() {
    var currentHost = (window.location.hostname || '').toLowerCase().replace(/^www\./, '');
    if (currentHost === 'localhost' || currentHost === '127.0.0.1') return true;
    var registered = (config.domain || '').toLowerCase().replace(/^www\./, '').split('/')[0];
    if (!registered || !currentHost) return false;
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

  function isSamePage(sourceUrl) {
    if (!sourceUrl) return false;
    var sUrl = String(sourceUrl).trim();
    if (sUrl.toLowerCase().endsWith('.pdf') || sUrl.toLowerCase().includes('.pdf?')) {
      return false; // PDF files are separate documents, not current HTML page
    }

    var currentHost = (window.location.hostname || '').toLowerCase().replace(/^www\./, '');
    var registeredHost = (config.domain || '').toLowerCase().replace(/^www\./, '').split('/')[0];
    var srcHost = getHost(sUrl);

    var hostMatches = (
      currentHost === 'localhost' ||
      currentHost === '127.0.0.1' ||
      srcHost === currentHost ||
      (registeredHost && (srcHost === registeredHost || srcHost.endsWith('.' + registeredHost)))
    );

    if (!hostMatches) return false;

    var curPath = getPath(window.location.href);
    var srcPath = getPath(sUrl);
    return curPath === srcPath;
  }

  function attemptVisualPointing(source, isManual) {
    // Entire visual pointing logic wrapped in try-catch — silently aborts on any error
    try {
      // 1. Domain allowed check
      if (!isDomainAllowed()) {
        return;
      }

      if (!source || !source.page_url) {
        return;
      }

      // 2. SPA and same-page check
      if (!isSamePage(source.page_url)) {
        if (isManual) {
          // If manually clicked on different page link, navigate in same tab
          window.location.href = source.page_url;
        }
        return;
      }

      // 3. Extract snippet from dom_selector JSON or fallback to text_snippet
      var snippet = null;
      if (source.dom_selector) {
        try {
          var parsed = typeof source.dom_selector === 'string'
            ? JSON.parse(source.dom_selector)
            : source.dom_selector;
          if (parsed && parsed.snippet) {
            snippet = parsed.snippet;
          }
        } catch (jsonErr) {}
      }

      if (!snippet && source.text_snippet) {
        var cleanSnippet = source.text_snippet.replace(/\n+/g, ' ').trim();
        snippet = cleanSnippet.slice(0, 80);
      }

      if (!snippet) {
        logDevOnly('visual-point-failed: no snippet');
        return;
      }

      var snippetLower = snippet.trim().toLowerCase().replace(/[.,:;!?]+$/, '').trim();
      if (!snippetLower) {
        logDevOnly('visual-point-failed: empty snippet');
        return;
      }

      // 4. Search outside shadow root, prioritizing innermost / most specific element
      var candidates = document.querySelectorAll('p, li, h1, h2, h3, h4, h5, h6, span, td, th, blockquote, div');
      var matchedEl = null;
      var shortestLen = Infinity;

      for (var i = 0; i < candidates.length; i++) {
        var el = candidates[i];
        if (containerEl && containerEl.contains(el)) continue;
        var text = (el.innerText || el.textContent || '').toLowerCase();
        if (text.includes(snippetLower)) {
          if (text.length < shortestLen) {
            matchedEl = el;
            shortestLen = text.length;
          }
        }
      }

      // Sub-sentence fallback (first 35 chars) if full sentence was split across nested tags
      if (!matchedEl && snippetLower.length > 35) {
        var shorter = snippetLower.slice(0, 35).replace(/[.,:;!?]+$/, '').trim();
        for (var j = 0; j < candidates.length; j++) {
          var cel = candidates[j];
          if (containerEl && containerEl.contains(cel)) continue;
          var cText = (cel.innerText || cel.textContent || '').toLowerCase();
          if (cText.includes(shorter)) {
            if (cText.length < shortestLen) {
              matchedEl = cel;
              shortestLen = cText.length;
            }
          }
        }
      }

      // 5. If no element matched, log in dev mode only
      if (!matchedEl) {
        logDevOnly('visual-point-failed: element not found on page');
        return;
      }

      // 6. Highlight injection with direct styles and animated glow
      var origOutline = matchedEl.style.outline;
      var origOutlineOffset = matchedEl.style.outlineOffset;
      var origBg = matchedEl.style.backgroundColor;
      var origBoxShadow = matchedEl.style.boxShadow;
      var origTransition = matchedEl.style.transition;
      var origBorderRadius = matchedEl.style.borderRadius;

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

      // Set visible initial highlight inline styles directly so no CSS rule can override it
      matchedEl.style.transition = 'all 0.3s ease';
      matchedEl.style.borderRadius = '6px';
      matchedEl.style.outline = '3px solid #2563eb';
      matchedEl.style.outlineOffset = '4px';
      matchedEl.style.backgroundColor = 'rgba(254, 240, 138, 0.85)';
      matchedEl.style.boxShadow = '0 0 0 4px rgba(37, 99, 235, 0.4), 0 0 20px rgba(245, 158, 11, 0.8)';
      matchedEl.classList.add('sitemind-highlight-active');

      // Scroll smoothly into center view
      matchedEl.scrollIntoView({ behavior: 'smooth', block: 'center' });

      // After 4500ms, cleanly restore original element styles
      setTimeout(function () {
        try {
          matchedEl.classList.remove('sitemind-highlight-active');
          matchedEl.style.outline = origOutline;
          matchedEl.style.outlineOffset = origOutlineOffset;
          matchedEl.style.backgroundColor = origBg;
          matchedEl.style.boxShadow = origBoxShadow;
          matchedEl.style.borderRadius = origBorderRadius;
          setTimeout(function () {
            try {
              matchedEl.style.transition = origTransition;
            } catch (_) {}
          }, 350);
        } catch (_) {}
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
