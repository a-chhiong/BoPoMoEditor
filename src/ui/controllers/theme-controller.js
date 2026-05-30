export class ThemeController {
  constructor(host) {
    this.host = host;
    this.currentTheme = localStorage.getItem('bopomo-theme') || 'light';
    host.addController(this);
  }

  hostConnected() {
    this.applyTheme(this.currentTheme);
  }

  applyTheme(theme) {
    this.currentTheme = theme;
    document.body.classList.toggle('dark-theme', theme === 'dark');
    document.body.classList.toggle('light-theme', theme === 'light');
    localStorage.setItem('bopomo-theme', theme);
  }

  toggle() {
    const nextTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
    this.applyTheme(nextTheme);
    return nextTheme;
  }
}
