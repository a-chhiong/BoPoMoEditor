import { LitElement, html } from 'lit';

export class EditorPanel extends LitElement {
  static properties = {
    currentText: { type: String },
    charCount: { type: Number }
  };

  constructor() {
    super();
    this.currentText = '';
    this.charCount = 0;
  }

  createRenderRoot() {
    return this;
  }

  onEditorInput(event) {
    this.dispatchEvent(new CustomEvent('editor-input', {
      detail: event.target.value,
      bubbles: true,
      composed: true
    }));
  }

  clearEditor() {
    this.dispatchEvent(new CustomEvent('clear-editor', { bubbles: true, composed: true }));
  }

  togglePresetDropdown(event) {
    event.stopPropagation();
    this.dispatchEvent(new CustomEvent('toggle-preset-dropdown', { bubbles: true, composed: true }));
  }

  selectPreset(key) {
    this.dispatchEvent(new CustomEvent('select-preset', {
      detail: key,
      bubbles: true,
      composed: true
    }));
  }

  updated(changedProperties) {
    if (changedProperties.has('currentText')) {
      const textarea = this.querySelector('#main-editor');
      if (textarea && textarea.value !== this.currentText) {
        textarea.value = this.currentText || '';
      }
    }
  }

  render() {
    return html`
      <div class="panel-header">
        <div class="panel-header-title">
          <svg viewBox="0 0 24 24" class="panel-icon" style="color: var(--primary-color);" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 20h9"></path>
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
          </svg>
          <h2>編輯區</h2>
        </div>
        <div class="editor-quick-controls">
          <button class="btn-text-action" @click=${this.clearEditor} title="清空文本">清空</button>
          <div class="custom-dropdown" id="preset-dropdown-container">
            <button class="editor-preset-trigger" id="preset-dropdown-trigger" @click=${this.togglePresetDropdown} title="載入預設教材範例">
              <span>載入範例</span>
              <svg viewBox="0 0 24 24" class="dropdown-chevron" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>
            <div class="custom-dropdown-menu" id="preset-dropdown-menu">
              <div class="dropdown-item" @click=${() => this.selectPreset('preset-poyin')}>破音字精選</div>
              <div class="dropdown-item" @click=${() => this.selectPreset('preset-poem')}>靜夜思 (唐詩)</div>
              <div class="dropdown-item" @click=${() => this.selectPreset('preset-baidi')}>早發白帝城 (唐詩)</div>
              <div class="dropdown-item" @click=${() => this.selectPreset('preset-tw')}>童謠教材</div>
            </div>
          </div>
        </div>
      </div>

      <div class="editor-body">
        <textarea class="main-textarea" id="main-editor" .value=${this.currentText} @input=${this.onEditorInput}
          placeholder="在此輸入中文字，系統將自動解析，並支援點擊右側預覽進行微調破音..."></textarea>
      </div>

      <div class="editor-footer">
        <span class="character-counter" id="char-counter">共 ${this.charCount} 字</span>
        <span class="editor-status-text"><span class="success-dot"></span> 99% 多音字已智慧校正</span>
      </div>
    `;
  }
}

customElements.define('editor-panel', EditorPanel);
