import { LitElement, html } from 'lit';
import { BpmfEngine } from '../../services/bpmf.js';

export class CandidateBar extends LitElement {
  static properties = {
    active: { type: Boolean },
    activeChar: { type: String },
    activeUnicode: { type: String },
    activeType: { type: String },
    activeTypeClass: { type: String },
    activeTab: { type: String },
    mode: { type: String },
    candidates: { type: Array },
    activeZhuyin: { type: String },
    activePinyin: { type: String },
    customZhuyin: { type: String },
    customPinyin: { type: String },
    applyCustomDisabled: { type: Boolean },
    currentFontFamily: { type: String },
    activeIvsIndex: { type: Number },
    activeIvsType: { type: String }
  };

  constructor() {
    super();
    this.active = false;
    this.activeChar = '';
    this.activeUnicode = '';
    this.activeType = '';
    this.activeTypeClass = '';
    this.activeTab = 'suggest';
    this.mode = 'bpmf';
    this.candidates = [];
    this.activeZhuyin = '';
    this.activePinyin = '';
    this.customZhuyin = '';
    this.customPinyin = '';
    this.applyCustomDisabled = true;
    this.currentFontFamily = 'System';
    this.activeIvsIndex = null;
    this.activeIvsType = '';
  }

  createRenderRoot() {
    return this;
  }

  switchCandidateTab(tab) {
    this.dispatchEvent(new CustomEvent('switch-candidate-tab', { detail: tab, bubbles: true, composed: true }));
  }

  onSelectCandidate(cand) {
    this.dispatchEvent(new CustomEvent('apply-candidate', { detail: cand, bubbles: true, composed: true }));
  }

  onSelectIvsCandidate(ivsIdx) {
    this.dispatchEvent(new CustomEvent('apply-ivs-candidate', { detail: { ivsIdx }, bubbles: true, composed: true }));
  }

  applySpecialAction(mode) {
    this.dispatchEvent(new CustomEvent('apply-special-action', { detail: mode, bubbles: true, composed: true }));
  }

  onCustomInput(event, field) {
    const value = event.target.value;
    const oppositeFieldVal = field === 'zhuyin' ? this.customPinyin : this.customZhuyin;
    const zhuyin = field === 'zhuyin' ? value : oppositeFieldVal;
    const pinyin = field === 'pinyin' ? value : oppositeFieldVal;
    
    this.dispatchEvent(new CustomEvent('validate-custom-input', {
      detail: { zhuyin, pinyin },
      bubbles: true,
      composed: true
    }));
  }

  applyCustomPhonetic() {
    this.dispatchEvent(new CustomEvent('apply-custom-phonetic', { bubbles: true, composed: true }));
  }

  deselectWord() {
    this.dispatchEvent(new CustomEvent('deselect-word', { bubbles: true, composed: true }));
  }

  render() {
    return html`
      <footer class="candidate-bar-wrapper ${this.active ? 'show-bottom-sheet' : ''}" id="candidate-bar">
        <div class="candidate-container">
          <!-- Empty State -->
          <div class="candidate-empty" id="candidate-empty-state" style="display: ${this.active ? 'none' : 'flex'};">
            <svg viewBox="0 0 24 24" class="candidate-empty-icon" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <div>
              <p style="font-weight:700; margin-bottom:4px; text-align:center;">尚未選擇字元</p>
              <p style="font-size:0.8rem; color: var(--text-muted); text-align:center; max-width:600px; margin: 0 auto;">選擇預覽區字元，即可在此動態切換讀音</p>
            </div>
          </div>

          <!-- Active State Grid -->
          <div class="candidate-active-grid" id="candidate-active-state" style="display: ${this.active ? 'grid' : 'none'};">
            <div class="candidate-col word-profile">
              <div class="profile-badge">
                <div class="profile-char" id="selected-char" style="font-family: ${this.mode === 'ivs' && this.currentFontFamily !== 'System' ? `${this.currentFontFamily}, 'Noto Sans TC'` : "'Noto Sans TC'"}, sans-serif;">
                  ${this.activeChar}
                </div>
                <div class="profile-details">
                  <span class="profile-unicode" id="selected-unicode">${this.activeUnicode}</span>
                  <span class="profile-type-badge ${this.activeTypeClass}" id="selected-type-badge">${this.activeType}</span>
                </div>
              </div>

              <div class="candidate-mobile-tabs">
                <div class="segmented-control">
                  <button class="segment-btn cand-tab-btn ${this.activeTab === 'suggest' ? 'active' : ''}" data-tab="suggest" @click=${() => this.switchCandidateTab('suggest')}><span>建議讀音</span></button>
                  <button class="segment-btn cand-tab-btn ${this.activeTab === 'custom' ? 'active' : ''}" data-tab="custom" id="mobile-tab-custom-btn" @click=${() => this.switchCandidateTab('custom')}><span>手動自訂</span></button>
                </div>
              </div>

              <button class="candidate-mobile-close" @click=${this.deselectWord} title="關閉控制台">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width: 16px; height: 16px;">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>

              <div class="profile-special-actions hide-on-mobile">
                <button class="btn-special" @click=${() => this.applySpecialAction('blank')} title="隱藏注音標記">注音留白</button>
                <button class="btn-special" @click=${() => this.applySpecialAction('brackets')} title="將注音替換成括弧引導填空">注音填空</button>
              </div>
            </div>

            <!-- Phonetic Candidates Flex -->
            <div class="candidate-col phonetic-list-section" id="cand-tab-suggest" style="display: ${this.activeTab === 'suggest' ? 'flex' : 'none'};">
              <h3 class="col-title" id="poyin-title-label">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;margin-right:4px;">
                  <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
                  <path d="M12 6v6l4 2" />
                </svg>
                <span>${this.mode === 'ivs' ? (this.activeIvsType === 'polyphonic' || this.candidates.length > 1 ? '讀音候選庫 (點擊即時更換)' : '通用 IVS 字形探針 (VS17 - VS26)') : '讀音候選庫 (點擊即時更換)'}</span>
              </h3>

              <div class="candidates-options-flex" id="candidates-options-container">
                ${this.active ? (this.mode === 'bpmf' ? this.renderBpmfCandidates() : this.renderIvsCandidates()) : ''}
              </div>
            </div>

            <!-- Custom Assembler (Only relevant for BPMF mode) -->
            <div class="candidate-col custom-assembler-section" id="cand-tab-custom" style="display: ${this.activeTab === 'custom' ? 'flex' : 'none'};">
              <h3 class="col-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;margin-right:4px;">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4z" />
                </svg>
                手動拼裝自訂音標
              </h3>
              
              ${this.mode === 'bpmf' ? html`
                <div class="custom-assembler-inputs">
                  <div class="input-field">
                    <label>自訂注音</label>
                    <input type="text" id="custom-zhuyin-input" placeholder="例如：ㄏㄜˊ" .value=${this.customZhuyin} @input=${(e) => this.onCustomInput(e, 'zhuyin')}>
                  </div>
                  <div class="input-field">
                    <label>自訂拼音</label>
                    <input type="text" id="custom-pinyin-input" placeholder="例如：hé" .value=${this.customPinyin} @input=${(e) => this.onCustomInput(e, 'pinyin')}>
                  </div>
                  <button class="btn-apply-custom" id="btn-apply-custom" ?disabled=${this.applyCustomDisabled} @click=${this.applyCustomPhonetic}>套用修改</button>
                </div>
              ` : html`
                <div style="padding: 12px; color: var(--text-muted); font-size: 0.85rem; line-height: 1.5;">
                  IVS 變體字形模式不支援手動拼裝自訂音標，請由左側「建議讀音」頁籤中選擇適用的 Unicode 變體字形。
                </div>
              `}

              <div class="mobile-special-actions show-on-mobile-flex">
                <button class="btn-special" @click=${() => this.applySpecialAction('blank')}>注音留白</button>
                <button class="btn-special" @click=${() => this.applySpecialAction('brackets')}>注音填空</button>
              </div>
            </div>
          </div>
        </div>
      </footer>
    `;
  }

  renderBpmfCandidates() {
    if (!this.activeChar) return '';
    return this.candidates.map((cand) => html`
      <button
        class="candidate-option-btn ${cand.zhuyin === this.activeZhuyin ? 'active' : ''}"
        @click=${() => this.onSelectCandidate(cand)}
      >
        <span class="cand-zhuyin">${cand.zhuyin}</span>
        <span class="cand-pinyin">${cand.pinyin}</span>
      </button>
    `);
  }

  renderIvsCandidates() {
    if (!this.activeChar) return '';
    const isPoly = this.activeIvsType === 'polyphonic' || this.candidates.length > 1;
    if (isPoly) {
      return this.candidates.map((candidate) => {
        const ivsIdx = candidate.ivsIndex ?? 0;
        const vsChar = ivsIdx > 0 ? String.fromCodePoint(0xE01E0 + ivsIdx) : '';
        const optionToken = this.activeChar + vsChar;
        const isActive = (this.activeIvsIndex === ivsIdx) || (ivsIdx === 0 && this.activeIvsIndex === null && this.activeIvsType === 'polyphonic');

        const zy = candidate.zhuyin;
        const py = BpmfEngine.zhuyinToPinyin(zy);
        const baseHex = this.activeChar.codePointAt(0).toString(16).toUpperCase();
        const vsHex = (0xE01E0 + ivsIdx).toString(16).toUpperCase();

        return html`
          <div class="poyin-option-card ${isActive ? 'active' : ''}" style="flex: 0 0 auto; width: max-content;" @click=${() => this.onSelectIvsCandidate(ivsIdx)}>
            <div class="poyin-text">
              <span class="poyin-index">VS${17 + ivsIdx}</span>
              <span class="poyin-annotated" style="font-family: ${this.currentFontFamily === 'System' ? "'Noto Sans TC'" : this.currentFontFamily}, sans-serif;">${optionToken}</span>
            </div>
            <div style="display: flex; flex-direction: column; gap: 4px;">
              <span style="font-size: 0.9rem; font-weight: 500;">${zy} <span style="color: var(--text-muted); font-size: 0.8rem; font-weight: 400;">(${py})</span></span>
              <div style="display: flex; gap: 4px; flex-wrap: wrap; margin-top: 2px;">
                <span class="unicode-pill">U+${baseHex}</span>
                ${ivsIdx > 0 ? html`<span class="unicode-pill" style="color: var(--accent-blue); border-color: rgba(0, 210, 255, 0.3);">U+${vsHex}</span>` : ''}
              </div>
            </div>
          </div>
        `;
      });
    } else {
      return Array.from({ length: 10 }).map((_, i) => {
        const vsChar = String.fromCodePoint(0xE01E0 + i);
        const probeToken = this.activeChar + vsChar;
        const isActive = (this.activeIvsIndex === i);
        const baseHex = this.activeChar.codePointAt(0).toString(16).toUpperCase();
        const vsHex = (0xE01E0 + i).toString(16).toUpperCase();

        return html`
          <div class="poyin-option-card ${isActive ? 'active' : ''}" style="flex: 0 0 auto; width: max-content;" @click=${() => this.onSelectIvsCandidate(i)}>
            <div class="poyin-text">
              <span class="poyin-index">VS${17 + i}</span>
              <span class="poyin-annotated" style="font-family: ${this.currentFontFamily === 'System' ? "'Noto Sans TC'" : this.currentFontFamily}, sans-serif;">${probeToken}</span>
            </div>
            <div style="display: flex; flex-direction: column; gap: 4px;">
              <span style="font-size: 0.9rem; font-weight: 500;">變體探針 VS${17 + i}</span>
              <div style="display: flex; gap: 4px; flex-wrap: wrap; margin-top: 2px;">
                <span class="unicode-pill">U+${baseHex}</span>
                <span class="unicode-pill" style="color: var(--accent-blue); border-color: rgba(0, 210, 255, 0.3);">U+${vsHex}</span>
              </div>
            </div>
          </div>
        `;
      });
    }
  }
}

customElements.define('candidate-bar', CandidateBar);
