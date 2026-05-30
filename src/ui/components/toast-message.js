import { LitElement, html } from 'lit';

export class ToastMessage extends LitElement {
  static properties = {
    message: { type: String },
    show: { type: Boolean }
  };

  constructor() {
    super();
    this.message = '';
    this.show = false;
  }

  createRenderRoot() {
    return this;
  }

  render() {
    return html`
      <div class="toast-message-sys ${this.show ? 'show' : ''}" id="sys-toast">
        <span class="toast-text" id="sys-toast-text">${this.message}</span>
      </div>
    `;
  }
}

customElements.define('toast-message', ToastMessage);
