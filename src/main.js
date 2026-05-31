// Bootstrap - Import and register all components
import { BopomoEditorApp } from './ui/app-root.js';
import { AppHeader } from './ui/components/app-header.js';
import { EditorPanel } from './ui/components/editor-panel.js';
import { PreviewPanel } from './ui/components/preview-panel.js';
import { PreviewRenderer } from './ui/components/preview-renderer.js';
import { CandidateBar } from './ui/components/candidate-bar.js';
import { ExportModal } from './ui/components/export-modal.js';
import { InspectorModal } from './ui/components/inspector-modal.js';
import { LoadingOverlay } from './ui/components/loading-overlay.js';
import { ToastMessage } from './ui/components/toast-message.js';

// Register custom elements
customElements.define('bopomo-editor-app', BopomoEditorApp);
customElements.define('app-header', AppHeader);
customElements.define('editor-panel', EditorPanel);
customElements.define('preview-panel', PreviewPanel);
customElements.define('preview-renderer', PreviewRenderer);
customElements.define('candidate-bar', CandidateBar);
customElements.define('export-modal', ExportModal);
customElements.define('inspector-modal', InspectorModal);
customElements.define('loading-overlay', LoadingOverlay);
customElements.define('toast-message', ToastMessage);

console.log('BoPoMo Editor initialized with Lit components');