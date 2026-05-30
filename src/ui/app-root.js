import { LitElement, html } from 'lit';
import { ThemeController } from './controllers/theme-controller.js';
import { DropdownController } from './controllers/dropdown-controller.js';
import { LayoutResizerController } from './controllers/layout-resizer-controller.js';
import { ToastController } from './controllers/toast-controller.js';
import { FeatureController } from './controllers/feature-controller.js';
import { ShellDelegate } from '../util/shell-delegate.js';
import { PRESETS } from '../configs/static.js';

import './components/app-header.js';
import './components/editor-panel.js';
import './components/preview-panel.js';
import './components/preview-renderer.js';
import './components/candidate-bar.js';
import './components/export-modal.js';
import './components/inspector-modal.js';
import './components/loading-overlay.js';
import './components/toast-message.js';

const ZOOM_LEVELS = [
  { text: '50%', size: '12px' },
  { text: '75%', size: '18px' },
  { text: '100%', size: '24px' },
  { text: '125%', size: '30px' },
  { text: '150%', size: '36px' }
];

export class BopomoEditorApp extends LitElement {
  static properties = {
    currentMode: { type: String },
    currentZoomIdx: { type: Number },
    overlayVisible: { type: Boolean },
    overlayTitle: { type: String },
    overlaySubtitle: { type: String },
    currentText: { type: String },
    charCount: { type: Number },
    ttsState: { type: String },

    // MVVM state
    parsedTokens: { type: Array },
    selectedTokenIndex: { type: Number },
    presentationMode: { type: String },
    currentFontFamily: { type: String },
    
    // Candidates state
    activeChar: { type: String },
    activeUnicode: { type: String },
    activeType: { type: String },
    activeTypeClass: { type: String },
    candidates: { type: Array },
    activeZhuyin: { type: String },
    activePinyin: { type: String },
    customZhuyin: { type: String },
    customPinyin: { type: String },
    applyCustomDisabled: { type: Boolean },
    candidateBarActive: { type: Boolean },
    candidateBarTab: { type: String }, // 'suggest' | 'custom'
    activeIvsIndex: { type: Number },
    activeIvsType: { type: String },

    // Export Modal state
    exportModalOpen: { type: Boolean },
    exportModalTab: { type: String },
    exportHtmlCode: { type: String },
    exportCssCode: { type: String },
    copySuccess: { type: Boolean },

    // Inspector Modal state
    inspectorModalOpen: { type: Boolean },

    // Toast state
    toastMessage: { type: String },
    toastShow: { type: Boolean },

    // TTS state
    ttsActiveTokenIndex: { type: Number }
  };

  constructor() {
    super();
    this.currentMode = 'bpmf';
    this.currentZoomIdx = 2;
    this.overlayVisible = true;
    this.overlayTitle = '載入教育部國語字典中...';
    this.overlaySubtitle = '正在即時解析教育部國語辭典簡編本...';
    this.currentText = PRESETS['preset-poyin'];
    this.charCount = this.computeCharacterCount(this.currentText);
    this.ttsState = 'stopped';

    // MVVM state defaults
    this.parsedTokens = [];
    this.selectedTokenIndex = null;
    this.presentationMode = 'mode-zhu';
    this.currentFontFamily = 'BpmfHuninn';
    
    this.activeChar = '';
    this.activeUnicode = '';
    this.activeType = '';
    this.activeTypeClass = '';
    this.candidates = [];
    this.activeZhuyin = '';
    this.activePinyin = '';
    this.customZhuyin = '';
    this.customPinyin = '';
    this.applyCustomDisabled = true;
    this.candidateBarActive = false;
    this.candidateBarTab = 'suggest';
    this.activeIvsIndex = null;
    this.activeIvsType = '';

    this.exportModalOpen = false;
    this.exportModalTab = 'html';
    this.exportHtmlCode = '';
    this.exportCssCode = '';
    this.copySuccess = false;

    this.inspectorModalOpen = false;

    this.toastMessage = '';
    this.toastShow = false;

    this.ttsActiveTokenIndex = null;

    ShellDelegate.register({
      showToast: this.showToast.bind(this),
      switchCandidateTab: this.switchCandidateTab.bind(this)
    });

    this.themeController = new ThemeController(this);
    this.dropdownController = new DropdownController(this);
    this.layoutResizerController = new LayoutResizerController(this);
    this.toastController = new ToastController(this);
    this.featureController = new FeatureController(this);

    this.handleGlobalClick = this.handleGlobalClick.bind(this);
    this.clearTtsTokenHighlights = this.clearTtsTokenHighlights.bind(this);
  }

  createRenderRoot() {
    return this;
  }

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener('click', this.handleGlobalClick);
  }

  disconnectedCallback() {
    window.removeEventListener('click', this.handleGlobalClick);
    super.disconnectedCallback();
  }

  firstUpdated() {
    this.featureController.initializeApp();
  }

  async initializeApp() {
    await this.featureController.initializeApp();
  }

  handleEditorInput(event) {
    const rawText = event?.detail ?? event?.target?.value ?? '';
    this.featureController.handleEditorInput(rawText);
  }

  switchAppMode(mode) {
    this.featureController.switchAppMode(mode);
  }

  toggleTheme() {
    const nextTheme = this.themeController.toggle();
    this.showToast(nextTheme === 'dark' ? '已切換至深色主題 🌙' : '已切換至淺色主題 ☀️');
  }

  togglePresetDropdown(event) {
    event.stopPropagation();
    this.dropdownController.toggle('preset-dropdown-menu', 'preset-dropdown-trigger');
  }

  selectPreset(key) {
    this.featureController.selectPreset(key);
  }

  clearEditor() {
    this.featureController.clearEditor();
  }

  adjustZoom(delta) {
    this.currentZoomIdx = Math.max(0, Math.min(ZOOM_LEVELS.length - 1, this.currentZoomIdx + delta));
  }

  switchCandidateTab(tab) {
    this.candidateBarTab = tab;
  }

  computeCharacterCount(text) {
    return [...(text || '')].filter((char) => /\p{Script=Han}/u.test(char)).length;
  }

  deselectWord() {
    this.featureController.deselectWord();
  }

  selectWord(index) {
    this.featureController.selectWord(index);
  }

  applyCandidate(detail) {
    this.featureController.applyPhoneticSelection(detail.zhuyin, detail.pinyin);
  }

  applyIvsCandidate(detail) {
    this.featureController.applyPronunciation(detail.ivsIdx);
  }

  applySpecialAction(mode) {
    this.featureController.applySpecialAction(mode);
  }

  validateCustomInput(zhuyin, pinyin) {
    this.featureController.validateCustomInput(zhuyin, pinyin);
  }

  applyCustomPhonetic() {
    this.featureController.applyCustomPhonetic();
  }

  setPresentationMode(mode) {
    this.featureController.setPresentationMode(mode);
  }

  togglePresentationDropdown(event) {
    event.stopPropagation();
    this.dropdownController.toggle('presentation-dropdown-menu', 'presentation-dropdown-trigger');
  }

  selectPresentationMode(mode) {
    this.featureController.setPresentationMode(mode);
    this.dropdownController.closeAll();
  }

  openExportModal() {
    this.featureController.openExportModal();
  }

  closeExportModal() {
    this.featureController.closeExportModal();
  }

  switchModalTab(tabId) {
    this.featureController.switchModalTab(tabId);
  }

  copyModalCode() {
    this.featureController.copyModalCode();
  }

  switchFontFromSelect(fontKey) {
    this.featureController.switchFontFromSelect(fontKey);
  }

  toggleFontDropdown(event) {
    event.stopPropagation();
    this.dropdownController.toggle('font-dropdown-menu', 'font-dropdown-trigger');
  }

  selectFontMode(fontKey) {
    this.switchFontFromSelect(fontKey);
    this.dropdownController.closeAll();
  }

  openInspectorModal() {
    this.featureController.openInspectorModal();
  }

  closeInspectorModal() {
    this.featureController.closeInspectorModal();
  }

  copyIVSText() {
    this.featureController.copyIVSText();
  }

  toggleTts() {
    this.featureController.toggleTts();
  }

  stopTts() {
    this.featureController.stopTts();
  }

  clearTtsTokenHighlights() {
    this.ttsActiveTokenIndex = null;
  }

  handleGlobalClick(event) {
    if (!event.target.isConnected) return;

    const insideDropdown = event.target.closest('#preset-dropdown-container') ||
      event.target.closest('#presentation-dropdown-container') ||
      event.target.closest('#font-dropdown-container');

    if (!insideDropdown) {
      this.dropdownController.closeAll();
    }

    const clickedToken = event.target.closest('bpmf') || event.target.closest('.render-token');
    const clickedCandidateBar = event.target.closest('#candidate-bar');
    const clickedCustomAssembler = event.target.closest('.custom-assembler-section');
    const clickedDropdownMenus = event.target.closest('.custom-dropdown-menu') || event.target.closest('.editor-preset-trigger');

    if (!clickedToken && !clickedCandidateBar && !clickedCustomAssembler && !clickedDropdownMenus) {
      this.deselectWord();
    }
  }

  showToast(message) {
    this.toastController.show(message);
  }

  render() {
    return html`
      <loading-overlay
        .visible=${this.overlayVisible}
        .title=${this.overlayTitle}
        .subtitle=${this.overlaySubtitle}
      ></loading-overlay>

      <div class="app-wrapper">
        <app-header
          .currentMode=${this.currentMode}
          @switch-app-mode=${(e) => this.switchAppMode(e.detail)}
          @toggle-theme=${this.toggleTheme}
        ></app-header>

        <main class="app-main-grid">
          <editor-panel
            class="grid-panel editor-panel"
            .currentText=${this.currentText}
            .charCount=${this.charCount}
            @editor-input=${this.handleEditorInput}
            @clear-editor=${this.clearEditor}
            @toggle-preset-dropdown=${this.togglePresetDropdown}
            @select-preset=${(e) => this.selectPreset(e.detail)}
          ></editor-panel>

          <div class="resizer-line" id="layout-resizer"
            @mousedown=${(e) => this.layoutResizerController.startDrag(e)}
            @touchstart=${(e) => this.layoutResizerController.startDrag(e)}>
          </div>

          <preview-panel
            class="grid-panel preview-panel"
            .currentMode=${this.currentMode}
            .ttsState=${this.ttsState}
            .currentZoomIdx=${this.currentZoomIdx}
            .presentationMode=${this.presentationMode}
            .currentFontFamily=${this.currentFontFamily}
            .parsedTokens=${this.parsedTokens}
            .selectedTokenIndex=${this.selectedTokenIndex}
            .ttsActiveTokenIndex=${this.ttsActiveTokenIndex}
            @toggle-presentation-dropdown=${this.togglePresentationDropdown}
            @select-presentation-mode=${(e) => this.selectPresentationMode(e.detail)}
            @open-export-modal=${this.openExportModal}
            @toggle-font-dropdown=${this.toggleFontDropdown}
            @select-font-mode=${(e) => this.selectFontMode(e.detail)}
            @open-inspector-modal=${this.openInspectorModal}
            @copy-ivs-text=${this.copyIVSText}
            @toggle-tts=${this.toggleTts}
            @stop-tts=${this.stopTts}
            @adjust-zoom=${(e) => this.adjustZoom(e.detail)}
            @select-word=${(e) => this.selectWord(e.detail.index)}
          ></preview-panel>
        </main>

        <div class="bottom-sheet-backdrop ${this.candidateBarActive ? 'active' : ''}" id="bottom-sheet-backdrop" @click=${this.deselectWord}></div>

        <candidate-bar
          .active=${this.candidateBarActive}
          .activeChar=${this.activeChar}
          .activeUnicode=${this.activeUnicode}
          .activeType=${this.activeType}
          .activeTypeClass=${this.activeTypeClass}
          .activeTab=${this.candidateBarTab}
          .mode=${this.currentMode}
          .candidates=${this.candidates}
          .activeZhuyin=${this.activeZhuyin}
          .activePinyin=${this.activePinyin}
          .customZhuyin=${this.customZhuyin}
          .customPinyin=${this.customPinyin}
          .applyCustomDisabled=${this.applyCustomDisabled}
          .currentFontFamily=${this.currentFontFamily}
          .activeIvsIndex=${this.activeIvsIndex}
          .activeIvsType=${this.activeIvsType}
          @switch-candidate-tab=${(e) => this.switchCandidateTab(e.detail)}
          @apply-candidate=${(e) => this.applyCandidate(e.detail)}
          @apply-ivs-candidate=${(e) => this.applyIvsCandidate(e.detail)}
          @apply-special-action=${(e) => this.applySpecialAction(e.detail)}
          @validate-custom-input=${(e) => this.validateCustomInput(e.detail.zhuyin, e.detail.pinyin)}
          @apply-custom-phonetic=${this.applyCustomPhonetic}
          @deselect-word=${this.deselectWord}
        ></candidate-bar>

        <export-modal
          .visible=${this.exportModalOpen}
          .activeTab=${this.exportModalTab}
          .htmlCode=${this.exportHtmlCode}
          .cssCode=${this.exportCssCode}
          .copySuccess=${this.copySuccess}
          @close-export-modal=${this.closeExportModal}
          @switch-modal-tab=${(e) => this.switchModalTab(e.detail)}
          @copy-modal-code=${this.copyModalCode}
        ></export-modal>

        <inspector-modal
          .visible=${this.inspectorModalOpen}
          .tokens=${this.parsedTokens}
          .selectedTokenIndex=${this.selectedTokenIndex}
          .currentFontFamily=${this.currentFontFamily}
          @close-inspector-modal=${this.closeInspectorModal}
          @select-word=${(e) => this.selectWord(e.detail.index)}
        ></inspector-modal>
      </div>

      <toast-message
        .message=${this.toastMessage}
        .show=${this.toastShow}
      ></toast-message>
    `;
  }
}

customElements.define('bopomo-editor-app', BopomoEditorApp);

