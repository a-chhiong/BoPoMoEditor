import { LitElement, html } from 'lit';
import './preview-renderer.js';

export class PreviewPanel extends LitElement {
  static properties = {
    currentMode: { type: String },
    ttsState: { type: String },
    currentZoomIdx: { type: Number },
    presentationMode: { type: String },
    currentFontFamily: { type: String },
    parsedTokens: { type: Array },
    selectedTokenIndex: { type: Number },
    ttsActiveTokenIndex: { type: Number }
  };

  constructor() {
    super();
    this.currentMode = 'bpmf';
    this.ttsState = 'stopped';
    this.currentZoomIdx = 2;
    this.presentationMode = 'mode-zhu';
    this.currentFontFamily = 'BpmfHuninn';
    this.parsedTokens = [];
    this.selectedTokenIndex = null;
    this.ttsActiveTokenIndex = null;
  }

  createRenderRoot() {
    return this;
  }

  switchMode(mode) {
    this.dispatchEvent(new CustomEvent('switch-app-mode', { detail: mode, bubbles: true, composed: true }));
  }

  togglePresentationDropdown(event) {
    event.stopPropagation();
    this.dispatchEvent(new CustomEvent('toggle-presentation-dropdown', { bubbles: true, composed: true }));
  }

  selectPresentationMode(mode) {
    this.dispatchEvent(new CustomEvent('select-presentation-mode', { detail: mode, bubbles: true, composed: true }));
  }

  openExportModal() {
    this.dispatchEvent(new CustomEvent('open-export-modal', { bubbles: true, composed: true }));
  }

  toggleFontDropdown(event) {
    event.stopPropagation();
    this.dispatchEvent(new CustomEvent('toggle-font-dropdown', { bubbles: true, composed: true }));
  }

  selectFontMode(fontKey) {
    this.dispatchEvent(new CustomEvent('select-font-mode', { detail: fontKey, bubbles: true, composed: true }));
  }

  openInspectorModal() {
    this.dispatchEvent(new CustomEvent('open-inspector-modal', { bubbles: true, composed: true }));
  }

  copyIvsText() {
    this.dispatchEvent(new CustomEvent('copy-ivs-text', { bubbles: true, composed: true }));
  }

  toggleTts() {
    this.dispatchEvent(new CustomEvent('toggle-tts', { bubbles: true, composed: true }));
  }

  stopTts() {
    this.dispatchEvent(new CustomEvent('stop-tts', { bubbles: true, composed: true }));
  }

  adjustZoom(delta) {
    this.dispatchEvent(new CustomEvent('adjust-zoom', { detail: delta, bubbles: true, composed: true }));
  }

  render() {
    const activeZoom = ['50%', '75%', '100%', '125%', '150%'][this.currentZoomIdx] || '100%';
    
    const presentationModeMap = {
      'mode-zhu': '中 + 注音',
      'mode-pin': '中 + 拼音',
      'mode-zhu-only': '僅注音',
      'mode-pin-only': '僅拼音',
      'mode-han-only': '僅中文'
    };
    const activePresentationLabel = presentationModeMap[this.presentationMode] || '中 + 注音';

    const fontMap = {
      'BpmfHuninn': '注音粉圓',
      'BpmfIansui': '注音芫荽',
      'BpmfZihiKaiStd': '字嗨標楷',
      'System': '系統預設'
    };
    const activeFontLabel = fontMap[this.currentFontFamily] || '注音粉圓';

    return html`
      <div class="panel-header">
        <div class="panel-header-title">
          <svg viewBox="0 0 24 24" class="panel-icon" style="color: var(--primary-color);" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="3" y1="9" x2="21" y2="9"></line>
            <line x1="9" y1="21" x2="9" y2="9"></line>
          </svg>
          <h2>預覽區</h2>
        </div>

        <div class="preview-controls-wrapper">
          <div class="mode-tools-container" id="tools-bpmf" style="display: ${this.currentMode === 'bpmf' ? 'flex' : 'none'};">
            <div class="custom-dropdown" id="presentation-dropdown-container">
              <button class="editor-preset-trigger" id="presentation-dropdown-trigger" @click=${this.togglePresentationDropdown} title="選擇旁註顯示樣式">
                <span id="presentation-mobile-trigger-label">${activePresentationLabel}</span>
                <svg viewBox="0 0 24 24" class="dropdown-chevron" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
              <div class="custom-dropdown-menu" id="presentation-dropdown-menu">
                <div class="dropdown-item ${this.presentationMode === 'mode-zhu' ? 'active' : ''}" @click=${() => this.selectPresentationMode('mode-zhu')}>中 + 注音</div>
                <div class="dropdown-item ${this.presentationMode === 'mode-pin' ? 'active' : ''}" @click=${() => this.selectPresentationMode('mode-pin')}>中 + 拼音</div>
                <div class="dropdown-item ${this.presentationMode === 'mode-zhu-only' ? 'active' : ''}" @click=${() => this.selectPresentationMode('mode-zhu-only')}>僅注音</div>
                <div class="dropdown-item ${this.presentationMode === 'mode-pin-only' ? 'active' : ''}" @click=${() => this.selectPresentationMode('mode-pin-only')}>僅拼音</div>
                <div class="dropdown-item ${this.presentationMode === 'mode-han-only' ? 'active' : ''}" @click=${() => this.selectPresentationMode('mode-han-only')}>僅中文</div>
              </div>
            </div>
            <button class="btn-copy-ivs btn-export-highlight" @click=${this.openExportModal} title="匯出 HTML 旁註代碼 / CSS">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="width: 14px; height: 14px;">
                <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4-4 4" />
              </svg>
              <span class="desktop-text">匯出</span>
            </button>
          </div>

          <div class="mode-tools-container" id="tools-ivs" style="display: ${this.currentMode === 'ivs' ? 'flex' : 'none'};">
            <div class="custom-dropdown" id="font-dropdown-container">
              <button class="editor-preset-trigger" id="font-dropdown-trigger" @click=${this.toggleFontDropdown} title="切換注音字型">
                <span id="font-mobile-trigger-label">${activeFontLabel}</span>
                <svg viewBox="0 0 24 24" class="dropdown-chevron" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
              <div class="custom-dropdown-menu" id="font-dropdown-menu">
                <div class="dropdown-item ${this.currentFontFamily === 'BpmfHuninn' ? 'active' : ''}" @click=${() => this.selectFontMode('huninn')}>注音粉圓</div>
                <div class="dropdown-item ${this.currentFontFamily === 'BpmfIansui' ? 'active' : ''}" @click=${() => this.selectFontMode('iansui')}>注音芫荽</div>
                <div class="dropdown-item ${this.currentFontFamily === 'BpmfZihiKaiStd' ? 'active' : ''}" @click=${() => this.selectFontMode('zihikai')}>字嗨標楷</div>
                <div class="dropdown-item ${this.currentFontFamily === 'System' ? 'active' : ''}" @click=${() => this.selectFontMode('system')}>系統預設</div>
              </div>
            </div>
            <button class="btn-copy-ivs" @click=${this.openInspectorModal} title="檢視 Unicode 字元編碼">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="width:14px;height:14px;">
                <path stroke-linecap="round" stroke-linejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              <span class="desktop-text">檢視</span>
            </button>
            <button class="btn-copy-ivs" @click=${this.copyIvsText} title="複製包含 IVS 選擇子的 Unicode 文本">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="width:14px;height:14px;">
                <path stroke-linecap="round" stroke-linejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
              <span class="desktop-text">複製</span>
            </button>
          </div>
        </div>
      </div>

      <div class="preview-body">
        <preview-renderer
          .currentMode=${this.currentMode}
          .parsedTokens=${this.parsedTokens}
          .selectedTokenIndex=${this.selectedTokenIndex}
          .presentationMode=${this.presentationMode}
          .currentFontFamily=${this.currentFontFamily}
          .zoomSize=${['12px', '18px', '24px', '30px', '36px'][this.currentZoomIdx] || '24px'}
          .ttsActiveTokenIndex=${this.ttsActiveTokenIndex}
          .ttsState=${this.ttsState}
        ></preview-renderer>
      </div>

      <div class="preview-presentation-toolbar">
        <div class="preview-zoom-wrapper">
          <div class="zoom-controls-btn-group">
            <button class="zoom-btn" @click=${() => this.adjustZoom(-1)} title="縮小字型">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width: 12px; height: 12px;">
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>
            <span id="zoom-value">${activeZoom}</span>
            <button class="zoom-btn" @click=${() => this.adjustZoom(1)} title="放大字型">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width: 12px; height: 12px;">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>
          </div>
        </div>

        <div class="presentation-actions">
          ${(() => {
            let ttsPlayTitle = '播放朗讀';
            if (this.ttsState === 'playing') {
              ttsPlayTitle = '暫停朗讀';
            } else if (this.ttsState === 'paused') {
              ttsPlayTitle = '繼續播放';
            }
            return html`
              <button class="action-icon-btn btn-audio" id="btn-tts-play" @click=${this.toggleTts} title="${ttsPlayTitle}">
                ${this.ttsState === 'playing'
                  ? html`
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" id="tts-play-icon">
                      <line x1="17" y1="4" x2="17" y2="20"></line>
                      <line x1="7" y1="4" x2="7" y2="20"></line>
                    </svg>`
                  : html`
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" id="tts-play-icon">
                      <polygon points="5 3 19 12 5 21 5 3"></polygon>
                    </svg>`}
              </button>
            `;
          })()}
          <button class="action-icon-btn btn-audio" id="btn-tts-stop" @click=${this.stopTts} title="停止播放" ?disabled=${this.ttsState === 'stopped'}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect>
            </svg>
          </button>
        </div>
      </div>
    `;
  }
}

customElements.define('preview-panel', PreviewPanel);
