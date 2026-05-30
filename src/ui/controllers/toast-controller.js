export class ToastController {
  constructor(host) {
    this.host = host;
    this.toastTimer = null;
    host.addController(this);
  }

  show(message) {
    this.host.toastMessage = message;
    this.host.toastShow = true;
    clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => {
      this.host.toastShow = false;
    }, 2200);
  }
}
