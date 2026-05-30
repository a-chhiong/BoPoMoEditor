import { LitElement, html } from 'lit';
import { BpmfEngine } from '../../services/bpmf.js';
import { IvsEngine } from '../../services/ivs.js';

export class PreviewRenderer extends LitElement {
  static properties = {
    currentMode: { type: String },
    parsedTokens: { type: Array },
    selectedTokenIndex: { type: Number },
    presentationMode: { type: String },
    currentFontFamily: { type: String },
    zoomSize: { type: String },
    ttsActiveTokenIndex: { type: Number },
    ttsState: { type: String }
  };

  constructor() {
    super();
    this.currentMode = 'bpmf';
    this.parsedTokens = [];
    this.selectedTokenIndex = null;
    this.presentationMode = 'mode-zhu';
    this.currentFontFamily = 'System';
    this.zoomSize = '24px';
    this.ttsActiveTokenIndex = null;
    this.ttsState = 'stopped';
  }

  createRenderRoot() {
    return this;
  }

  onTokenClick(event, index) {
    event.stopPropagation();
    this.dispatchEvent(new CustomEvent('select-word', {
      detail: { index },
      bubbles: true,
      composed: true
    }));
  }

  updated(changedProperties) {
    if (changedProperties.has('ttsActiveTokenIndex') && this.ttsActiveTokenIndex !== null) {
      const activeEl = this.querySelector(`[data-idx="${this.ttsActiveTokenIndex}"], [data-index="${this.ttsActiveTokenIndex}"]`);
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }

  render() {
    const isFontFamilySpecified = this.currentFontFamily && this.currentFontFamily !== 'System';
    const fontFamilyStyle = isFontFamilySpecified
      ? `${this.currentFontFamily}, 'Noto Sans TC', sans-serif`
      : "'Noto Sans TC', sans-serif";

    if (this.currentMode === 'bpmf') {
      return html`
        <div id="live-renderer" class="rendered-preview-container ${this.presentationMode} correction-enabled ${this.ttsState === 'paused' ? 'tts-paused' : ''}" style="font-size: ${this.zoomSize};">
          ${this.parsedTokens.length === 0 ? this.renderEmptyState() : this.renderBpmfTokens()}
        </div>
      `;
    } else {
      return html`
        <div id="live-renderer" class="rendered-preview-container ${this.ttsState === 'paused' ? 'tts-paused' : ''}" style="font-size: ${this.zoomSize}; font-family: ${fontFamilyStyle};">
          ${this.parsedTokens.length === 0 ? this.renderEmptyState() : this.renderIvsTokens()}
        </div>
      `;
    }
  }

  renderEmptyState() {
    return html`
      <div class="empty-preview-placeholder">
        <svg viewBox="0 0 100 100" class="placeholder-svg watermark-svg">
          <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="3,3" />
          <text x="50" y="58" dominant-baseline="middle" text-anchor="middle" font-family="'Noto Sans TC', sans-serif" font-weight="900" font-size="44" fill="currentColor">ㄅ</text>
        </svg>
        <p class="placeholder-desc">請在左側輸入框輸入中文字。</p>
      </div>
    `;
  }

  renderBpmfTokens() {
    return this.parsedTokens.map((tokenObj, idx) => {
      if (tokenObj.type === 'other') {
        return tokenObj.char === '\n'
          ? html`<br>`
          : html`<span class="plain-text-token">${tokenObj.char}</span>`;
      }

      const candidates = BpmfEngine.getCandidates(tokenObj.char);
      const isPoly = candidates.length > 1;

      let specialClass = '';
      if (tokenObj.special) {
        specialClass = tokenObj.special;
      } else if (tokenObj.isCustom) {
        specialClass = 'custom-modified';
      } else if (isPoly) {
        specialClass = 'polyphonic';
      }

      const isSelected = this.selectedTokenIndex === idx;
      const isTtsActive = this.ttsActiveTokenIndex === idx;
      
      const classNames = [
        specialClass,
        isSelected ? 'selected' : '',
        isTtsActive ? 'tts-pronouncing' : ''
      ].filter(Boolean).join(' ');

      return html`
        <bpmf
          zhuyin="${tokenObj.zhuyin || ''}"
          pinyin="${tokenObj.pinyin || ''}"
          data-idx="${idx}"
          class="${classNames}"
          @click=${(e) => this.onTokenClick(e, idx)}
        ><span class="bpmf-char">${tokenObj.char}</span></bpmf>
      `;
    });
  }

  renderIvsTokens() {
    return this.parsedTokens.map((token, index) => {
      if (token === '\n') {
        return html`<br>`;
      }

      const info = IvsEngine.getTokenInfo(token);
      let tokenClass = '';
      if (info.isChinese) {
        tokenClass = info.type;
      }

      const isSelected = this.selectedTokenIndex === index;
      const isTtsActive = this.ttsActiveTokenIndex === index;

      const classNames = [
        'render-token',
        tokenClass,
        isSelected ? 'selected' : '',
        isTtsActive ? 'tts-pronouncing' : ''
      ].filter(Boolean).join(' ');

      return html`
        <span
          class="${classNames}"
          data-index="${index}"
          @click=${(e) => this.onTokenClick(e, index)}
        >${token}</span>
      `;
    });
  }
}

customElements.define('preview-renderer', PreviewRenderer);
