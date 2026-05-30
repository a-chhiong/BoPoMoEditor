import { LitElement, html } from 'lit';

export class ExportModal extends LitElement {
  static properties = {
    visible: { type: Boolean },
    activeTab: { type: String },
    htmlCode: { type: String },
    cssCode: { type: String },
    copySuccess: { type: Boolean }
  };

  constructor() {
    super();
    this.visible = false;
    this.activeTab = 'html';
    this.htmlCode = '';
    this.cssCode = '';
    this.copySuccess = false;
  }

  createRenderRoot() {
    return this;
  }

  close() {
    this.dispatchEvent(new CustomEvent('close-export-modal', { bubbles: true, composed: true }));
  }

  switchTab(tabId) {
    this.dispatchEvent(new CustomEvent('switch-modal-tab', { detail: tabId, bubbles: true, composed: true }));
  }

  copyCode() {
    this.dispatchEvent(new CustomEvent('copy-modal-code', { bubbles: true, composed: true }));
  }

  render() {
    return html`
      <div class="modal-backdrop ${this.visible ? 'show' : ''}" id="export-modal" style="display: ${this.visible ? 'flex' : 'none'};">
        <div class="modal-card">
          <div class="modal-header">
            <h3>匯出排版原始碼</h3>
            <button class="modal-close" @click=${this.close}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:20px;height:20px;">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <div class="modal-tabs">
            <button class="tab-btn ${this.activeTab === 'html' ? 'active' : ''}" id="tab-btn-html" @click=${() => this.switchTab('tab-html')}>HTML 旁註標記</button>
            <button class="tab-btn ${this.activeTab === 'css' ? 'active' : ''}" id="tab-btn-css" @click=${() => this.switchTab('tab-css')}>CSS 樣式表</button>
          </div>

          <div class="modal-body">
            <div class="tab-content" id="tab-html" style="display: ${this.activeTab === 'html' ? 'block' : 'none'};">
              <p class="tab-desc">這是最通用的旁註網頁代碼，使用 <code>&lt;bpmf&gt;</code> 自訂屬性結構，結合 CSS 來呈現極致細膩的注音/拼音位置調整。</p>
              <div class="code-area-wrapper">
                <textarea class="code-textarea" id="export-html-code" readonly .value=${this.htmlCode}></textarea>
              </div>
            </div>
            <div class="tab-content" id="tab-css" style="display: ${this.activeTab === 'css' ? 'block' : 'none'};">
              <p class="tab-desc">請將下方 CSS 樣式表貼入您的網站 <code>&lt;style&gt;</code> 區塊或 <code>style.css</code> 中，</p>
              <div class="code-area-wrapper">
                <textarea class="code-textarea" id="export-css-code" readonly .value=${this.cssCode}></textarea>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <span class="toast-indicator ${this.copySuccess ? 'show' : ''}" id="copy-success-indicator">已複製到剪貼簿！</span>
            <button class="btn-secondary" @click=${this.close}>關閉</button>
            <button class="btn-primary" @click=${this.copyCode}>複製此代碼</button>
          </div>
        </div>
      </div>
    `;
  }
}

customElements.define('export-modal', ExportModal);
