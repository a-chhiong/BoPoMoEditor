export class DropdownController {
  constructor(host) {
    this.host = host;
    this.activeMenu = null;
    this.activeTrigger = null;
    host.addController(this);
  }

  hostDisconnected() {
    this.closeAll();
  }

  toggle(menuId, triggerId) {
    const menu = this.host.querySelector(`#${menuId}`);
    const trigger = this.host.querySelector(`#${triggerId}`);
    if (!menu || !trigger) return;

    const willOpen = !menu.classList.contains('show');
    this.closeAll();
    if (willOpen) {
      menu.classList.add('show');
      trigger.classList.add('open');
      this.activeMenu = menu;
      this.activeTrigger = trigger;
    }
  }

  closeAll() {
    if (this.activeMenu) {
      this.activeMenu.classList.remove('show');
    }
    if (this.activeTrigger) {
      this.activeTrigger.classList.remove('open');
    }
    this.activeMenu = null;
    this.activeTrigger = null;
  }
}
