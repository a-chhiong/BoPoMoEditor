export class LayoutResizerController {
  constructor(host) {
    this.host = host;
    this.isDragging = false;
    this.boundDoDrag = this.doDrag.bind(this);
    this.boundStopDrag = this.stopDrag.bind(this);
    host.addController(this);
  }

  hostConnected() {
    // Event listeners for drag start are registered declaratively in app-root template
  }

  hostDisconnected() {
    this.stopDrag();
  }

  startDrag(event) {
    event.preventDefault();
    this.isDragging = true;
    this.resizer = this.host.querySelector('#layout-resizer');
    this.mainGrid = this.host.querySelector('.app-main-grid');
    
    const isMobile = window.innerWidth <= 768;
    
    if (this.resizer) {
      this.resizer.classList.add('active');
    }
    document.body.style.cursor = isMobile ? 'row-resize' : 'col-resize';
    document.body.style.userSelect = 'none';

    document.addEventListener('mousemove', this.boundDoDrag);
    document.addEventListener('touchmove', this.boundDoDrag, { passive: false });
    document.addEventListener('mouseup', this.boundStopDrag);
    document.addEventListener('touchend', this.boundStopDrag);
  }

  doDrag(event) {
    if (!this.isDragging || !this.mainGrid) return;

    const isMobile = window.innerWidth <= 768;

    if (isMobile) {
      let clientY = event.clientY;
      if (event.touches && event.touches.length > 0) {
        clientY = event.touches[0].clientY;
      }

      const gridRect = this.mainGrid.getBoundingClientRect();
      let percentage = ((clientY - gridRect.top) / gridRect.height) * 100;
      percentage = Math.min(80, Math.max(20, percentage));
      this.mainGrid.style.setProperty('--preview-panel-height', `${percentage}%`);
    } else {
      let clientX = event.clientX;
      if (event.touches && event.touches.length > 0) {
        clientX = event.touches[0].clientX;
      }

      const gridRect = this.mainGrid.getBoundingClientRect();
      let percentage = ((clientX - gridRect.left) / gridRect.width) * 100;
      percentage = Math.min(80, Math.max(20, percentage));
      this.mainGrid.style.setProperty('--left-panel-width', `${percentage}%`);
    }
  }

  stopDrag() {
    if (!this.isDragging) return;
    this.isDragging = false;
    if (this.resizer) {
      this.resizer.classList.remove('active');
    }
    document.body.style.cursor = '';
    document.body.style.userSelect = '';

    document.removeEventListener('mousemove', this.boundDoDrag);
    document.removeEventListener('touchmove', this.boundDoDrag);
    document.removeEventListener('mouseup', this.boundStopDrag);
    document.removeEventListener('touchend', this.boundStopDrag);
  }
}

