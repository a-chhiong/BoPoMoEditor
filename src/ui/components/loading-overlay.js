import { LitElement, html } from 'lit';

export class LoadingOverlay extends LitElement {
  static properties = {
    visible: { type: Boolean },
    title: { type: String },
    subtitle: { type: String },
    progress: { type: Number }
  };

  constructor() {
    super();
    this.visible = false;
    this.title = '';
    this.subtitle = '';
    this.progress = 0;
  }

  createRenderRoot() {
    return this;
  }

  render() {
    const hasProgress = typeof this.progress === 'number' && this.progress >= 0 && this.progress <= 100;
    return html`
      <div id="loading-overlay" class="${this.visible ? '' : 'fade-out'}">
        <div class="loader-container">
          <div class="loader-spinner"></div>
          <div class="loader-title" id="loader-title">${this.title}</div>
          <div class="loader-subtitle" id="loader-subtitle">${this.subtitle}</div>
          ${hasProgress ? html`
            <div class="loader-progress-bar-container">
              <div class="loader-progress-bar" style="width: ${this.progress}%"></div>
            </div>
            <div class="loader-progress-text">${this.progress}%</div>
          ` : ''}
        </div>
      </div>
    `;
  }
}

customElements.define('loading-overlay', LoadingOverlay);
