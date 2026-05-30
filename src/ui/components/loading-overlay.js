import { LitElement, html } from 'lit';

export class LoadingOverlay extends LitElement {
  static properties = {
    visible: { type: Boolean },
    title: { type: String },
    subtitle: { type: String }
  };

  constructor() {
    super();
    this.visible = false;
    this.title = '';
    this.subtitle = '';
  }

  createRenderRoot() {
    return this;
  }

  render() {
    return html`
      <div id="loading-overlay" class="${this.visible ? '' : 'fade-out'}">
        <div class="loader-container">
          <div class="loader-spinner"></div>
          <div class="loader-title" id="loader-title">${this.title}</div>
          <div class="loader-subtitle" id="loader-subtitle">${this.subtitle}</div>
        </div>
      </div>
    `;
  }
}

customElements.define('loading-overlay', LoadingOverlay);
