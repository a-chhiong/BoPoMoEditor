import { LitElement, html } from 'lit';
import { IvsEngine } from '../../services/ivs.js';

export class InspectorModal extends LitElement {
  static properties = {
    visible: { type: Boolean },
    tokens: { type: Array },
    selectedTokenIndex: { type: Number },
    currentFontFamily: { type: String }
  };

  constructor() {
    super();
    this.visible = false;
    this.tokens = [];
    this.selectedTokenIndex = null;
    this.currentFontFamily = 'System';
  }

  createRenderRoot() {
    return this;
  }

  close() {
    this.dispatchEvent(new CustomEvent('close-inspector-modal', { bubbles: true, composed: true }));
  }

  onCardClick(index) {
    this.dispatchEvent(new CustomEvent('select-word', { detail: { index }, bubbles: true, composed: true }));
    
    const editorSpan = document.querySelector(`.render-token[data-index="${index}"]`);
    if (editorSpan) {
      editorSpan.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  updated(changedProperties) {
    if (changedProperties.has('selectedTokenIndex') && this.selectedTokenIndex !== null && this.visible) {
      const activeCard = this.querySelector(`#ins-card-${this.selectedTokenIndex}`);
      if (activeCard) {
        activeCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }

  render() {
    if (!this.visible) {
      return html`
        <div class="modal-backdrop" id="inspector-modal" style="display: none;"></div>
      `;
    }

    return html`
      <div class="modal-backdrop show" id="inspector-modal" style="display: flex;">
        <div class="modal-card modal-large">
          <div class="modal-header">
            <h3 style="display: flex; align-items: center; gap: 8px;">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:22px;height:22px;color: var(--accent-teal);">
                <path stroke-linecap="round" stroke-linejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              Unicode 字元流檢視器
            </h3>
            <button class="modal-close" @click=${this.close}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:20px;height:20px;">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <div class="modal-body">
            <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:15px; line-height: 1.5;">
              呈現目前文本在記憶體中的 Unicode 字元流。IVS 技術的精髓在於<b>將「語意文字」與「注音字形」徹底分離</b>。
              中文字元後面附帶一個看不見的變體選擇子（如 <code>E01E2</code>）或私有區代碼（如 <code>F195</code>），由字型在渲染時動態組合出對應讀音，這使得內文搜尋與剪貼依然能夠完全正常運作！
            </p>
            <div class="inspector-grid" id="inspector-container" style="max-height: 380px; overflow-y: auto;">
              ${this.tokens.map((token, index) => {
                if (token === '\n') return null;
                if (typeof token !== 'string') return null;

                const info = IvsEngine.getTokenInfo(token);
                const isSelected = this.selectedTokenIndex === index;

                let badgeBg = 'rgba(255,255,255,0.05)';
                let badgeText = 'var(--text-muted)';
                if (info.type === 'polyphonic') {
                    badgeBg = 'rgba(0, 210, 255, 0.1)';
                    badgeText = 'var(--accent-blue)';
                } else if (info.type === 'modified') {
                    badgeBg = 'rgba(0, 245, 212, 0.1)';
                    badgeText = 'var(--accent-teal)';
                } else if (info.type === 'blank') {
                    badgeBg = 'rgba(148, 163, 184, 0.08)';
                    badgeText = '#64748b';
                } else if (info.type === 'brackets') {
                    badgeBg = 'rgba(157, 78, 221, 0.1)';
                    badgeText = 'var(--accent-purple)';
                } else if (info.type === 'custom') {
                    badgeBg = 'rgba(255, 0, 127, 0.1)';
                    badgeText = 'var(--accent-pink)';
                }

                const parts = [...token];
                const baseUni = parts[0].codePointAt(0).toString(16).toUpperCase();

                return html`
                  <div
                    class="inspector-card ${isSelected ? 'active' : ''}"
                    id="ins-card-${index}"
                    @click=${() => this.onCardClick(index)}
                  >
                    <div class="inspector-glyph-row">
                        <span class="inspector-char" style="font-family: ${this.currentFontFamily === 'System' ? "'Noto Sans TC'" : this.currentFontFamily}, sans-serif;">${token}</span>
                        <span class="inspector-badge" style="background:${badgeBg}; color:${badgeText}">${info.type.toUpperCase()}</span>
                    </div>
                    <div class="inspector-hex-list">
                        <div class="inspector-hex-item">
                            <span class="hex-desc">字元:</span>
                            <span class="hex-value">U+${baseUni}</span>
                        </div>
                        ${parts.length > 1 ? html`
                            <div class="inspector-hex-item">
                                <span class="hex-desc">IVS:</span>
                                <span class="hex-value" style="color: var(--accent-blue);">U+${parts[1].codePointAt(0).toString(16).toUpperCase()}</span>
                            </div>
                        ` : ''}
                        ${parts.length > 2 ? html`
                            <div class="inspector-hex-item">
                                <span class="hex-desc">PUA:</span>
                                <span class="hex-value" style="color: var(--accent-pink);">U+${parts[2].codePointAt(0).toString(16).toUpperCase()}</span>
                            </div>
                        ` : ''}
                    </div>
                  </div>
                `;
              })}
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn-secondary" @click=${this.close}>關閉</button>
          </div>
        </div>
      </div>
    `;
  }
}

customElements.define('inspector-modal', InspectorModal);
