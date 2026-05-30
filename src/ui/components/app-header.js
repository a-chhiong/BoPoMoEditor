import { LitElement, html } from 'lit';

export class AppHeader extends LitElement {
  static properties = {
    currentMode: { type: String }
  };

  constructor() {
    super();
    this.currentMode = 'bpmf';
  }

  createRenderRoot() {
    return this;
  }

  switchMode(mode) {
    this.dispatchEvent(new CustomEvent('switch-app-mode', {
      detail: mode,
      bubbles: true,
      composed: true
    }));
  }

  toggleTheme() {
    this.dispatchEvent(new CustomEvent('toggle-theme', {
      bubbles: true,
      composed: true
    }));
  }

  render() {
    return html`
      <header class="app-header">
        <div class="header-logo">
          <div class="logo-icon-wrapper">
            <svg viewBox="0 0 24 24" class="logo-svg">
              <text x="12" y="15" dominant-baseline="middle" text-anchor="middle"
                font-family="'Noto Sans TC', sans-serif" font-weight="900" font-size="22" fill="currentColor">ㄅ</text>
            </svg>
          </div>
          <div class="logo-text">
            <h1>〇〇日報 <span class="hide-on-mobile">注音排版工具箱</span></h1>
            <p class="hide-on-mobile">BoPoMo Typography Workspace</p>
          </div>
        </div>

        <div class="header-right">
          <div class="header-mode-switcher">
            <div class="segmented-control">
              <button class="segment-btn ${this.currentMode === 'bpmf' ? 'active' : ''}" id="btn-mode-bpmf" @click=${() => this.switchMode('bpmf')} title="使用 HTML ruby 標籤及 CSS 排版渲染">HTML 旁註</button>
              <button class="segment-btn ${this.currentMode === 'ivs' ? 'active' : ''}" id="btn-mode-ivs" @click=${() => this.switchMode('ivs')} title="使用 Unicode IVS 變體選字及字型渲染">IVS 字型</button>
            </div>
          </div>

          <button class="theme-toggle-btn" id="theme-toggle" @click=${this.toggleTheme} title="切換深淺色主題">
            <svg viewBox="0 0 24 24" class="sun-icon" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="5"></circle>
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"></path>
            </svg>
            <svg viewBox="0 0 24 24" class="moon-icon" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
            </svg>
          </button>
        </div>
      </header>
    `;
  }
}

customElements.define('app-header', AppHeader);
