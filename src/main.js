import { BpmfEngine } from './services/bpmf.js';
import { IvsEngine } from './services/ivs.js';
import { TtsEngine } from './services/tts.js';
import { PATHS, IVS_FONT_MAP } from './configs/path.js';
import { BpmfFeature, PRESETS } from './features/bpmf.js';
import { IvsFeature } from './features/ivs.js';

// --- Shared Application State ---
window.manualOverrides = {}; // Globally accessible by feature controllers
let currentMode = 'bpmf';     // 'bpmf' or 'ivs'
let currentZoomIdx = 2;       // Default index for 100%

const ZOOM_LEVELS = [
    { text: '50%', size: '12px' },
    { text: '75%', size: '18px' },
    { text: '100%', size: '24px' }, // default
    { text: '125%', size: '30px' },
    { text: '150%', size: '36px' }
];

// --- Bootstrapping on DOM Load ---
window.addEventListener('DOMContentLoaded', () => {
    // 1. Setup Theme from storage
    const savedTheme = localStorage.getItem('bopomo-theme') || 'light';
    document.body.classList.toggle('dark-theme', savedTheme === 'dark');
    document.body.classList.toggle('light-theme', savedTheme === 'light');

    // 2. Setup loading overlay text
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        document.getElementById('loader-title').innerText = '載入教育部國語字典中...';
        document.getElementById('loader-subtitle').innerText = '正在即時解析教育部國語辭典簡編本...';
    }

    // Set initial preset text into the editor
    document.getElementById('main-editor').value = PRESETS['preset-poyin'];

    // 3. Initialize Dictionary Engine and Preload Fonts
    BpmfEngine.init()
        .then(() => {
            if (overlay) {
                document.getElementById('loader-title').innerText = '載入排版字型中...';
                document.getElementById('loader-subtitle').innerText = '正在預載專用注音字型，這可能需要一點時間...';
            }

            // Load authoritative IVS character map in background
            const ivsMapPromise = IvsEngine.loadIVSMap().catch(() => {});

            // Preload BopomofoRuby font + Huninn font (default font for IVS)
            const fontPromises = [];
            
            if (!document.fonts.check("1em 'BopomofoRuby'")) {
                const rubyFont = new FontFace('BopomofoRuby', `url(${PATHS.FONTS.RUBY})`);
                document.fonts.add(rubyFont);
                fontPromises.push(rubyFont.load().catch(e => console.warn('Ruby font preload failed:', e)));
            }

            // Register and preload IVS font faces on the fly
            Object.values(IVS_FONT_MAP)
                .filter(f => f.family !== 'System')
                .forEach(f => {
                    if (!document.fonts.check(`1em ${f.family}`)) {
                        const fontFace = new FontFace(f.family, `url(${f.path})`);
                        document.fonts.add(fontFace);
                        fontPromises.push(fontFace.load().catch(e => console.warn(`${f.family} preload failed:`, e)));
                    }
                });

            return Promise.all([...fontPromises, ivsMapPromise]);
        })
        .then(() => {
            if (overlay) overlay.classList.add('fade-out');
            
            // Set body app mode state class
            document.body.className = `${savedTheme === 'dark' ? 'dark-theme' : 'light-theme'} app-mode-${currentMode}`;

            // Initialize active mode controller
            handleEditorInput();
        })
        .catch(err => {
            console.error('Failed to load or parse Excel dictionary:', err);
            if (overlay) overlay.classList.add('fade-out');
            handleEditorInput();
        });

    // 4. Hook up Textarea events
    const textarea = document.getElementById('main-editor');
    textarea.addEventListener('input', handleEditorInput);

    // 5. Global click listener to close dropdowns and deselect highlights
    document.addEventListener('click', (e) => {
        // Safe guard if element detached
        if (!e.target.isConnected) return;

        // Close presets dropdown
        const presetMenu = document.getElementById('preset-dropdown-menu');
        const presetTrigger = document.getElementById('preset-dropdown-trigger');
        if (presetMenu && presetMenu.classList.contains('show') && !e.target.closest('#preset-dropdown-container')) {
            presetMenu.classList.remove('show');
            presetTrigger.classList.remove('open');
        }

        // Close presentation format dropdown
        const presMenu = document.getElementById('presentation-dropdown-menu');
        const presTrigger = document.getElementById('presentation-dropdown-trigger');
        if (presMenu && presMenu.classList.contains('show') && !e.target.closest('#presentation-dropdown-container')) {
            presMenu.classList.remove('show');
            presTrigger.classList.remove('open');
        }

        // Close IVS fonts selector dropdown
        const fontMenu = document.getElementById('font-dropdown-menu');
        const fontTrigger = document.getElementById('font-dropdown-trigger');
        if (fontMenu && fontMenu.classList.contains('show') && !e.target.closest('#font-dropdown-container')) {
            fontMenu.classList.remove('show');
            fontTrigger.classList.remove('open');
        }

        // Deselect word when clicking outside active elements
        const clickedToken = e.target.closest('bpmf') || e.target.closest('.render-token');
        const clickedCandidateBar = e.target.closest('#candidate-bar');
        const clickedCustomAssembler = e.target.closest('.custom-assembler-section');
        const clickedDropdownMenus = e.target.closest('.custom-dropdown-menu') || e.target.closest('.editor-preset-trigger');

        if (!clickedToken && !clickedCandidateBar && !clickedCustomAssembler && !clickedDropdownMenus) {
            deselectWord();
        }
    });

    // 6. Initialize layout draggable splitter
    initLayoutResizer();

    // 7. Initialize Speech synthesis (TTS)
    TtsEngine.init({
        onStateChange: updateTtsUIState,
        onHighlight: highlightActiveTtsToken,
        onClearHighlight: clearTtsTokenHighlights
    });
});

// --- Routing & Mode Swapper ---
window.switchAppMode = (mode) => {
    if (currentMode === mode) return;
    
    stopTts();
    deselectWord();

    const textarea = document.getElementById('main-editor');
    const currentVal = textarea.value;

    if (mode === 'ivs') {
        // Transition BPMF (Ruby HTML) -> IVS (Unicode Variation Selectors)
        // Convert plain text + active overrides into raw Unicode with Variation Selectors
        const alignedList = IvsEngine.alignIVSText(currentVal, window.manualOverrides);
        const ivsText = alignedList.join('');
        textarea.value = ivsText;

        // Toggle visibility wrappers
        document.getElementById('tools-bpmf').style.display = 'none';
        document.getElementById('tools-ivs').style.display = 'flex';
        
        currentMode = 'ivs';
        document.body.classList.remove('app-mode-bpmf');
        document.body.classList.add('app-mode-ivs');

        // Activate controller
        IvsFeature.onActivate(ivsText);
        window.showToast('已切換至變體字形模式 (IVS) 🔠');
    } else {
        // Transition IVS (Unicode) -> BPMF (Ruby HTML)
        // Decode IVS selector sequences back into plain text + overrides
        const tokens = IvsEngine.parseIVSText(currentVal);
        
        let plainText = '';
        const occurrenceCounts = {};
        const newOverrides = {};

        tokens.forEach(t => {
            const info = IvsEngine.getTokenInfo(t);
            const char = info.baseChar;
            plainText += char;

            if (info.isChinese) {
                const occur = occurrenceCounts[char] || 0;
                occurrenceCounts[char] = occur + 1;
                const key = `${char}_${occur}`;

                if (info.type === 'modified' && info.vsIndex !== null) {
                    const match = info.candidates.find(c => c.ivsIndex === info.vsIndex);
                    if (match) {
                        newOverrides[key] = {
                            zhuyin: match.zhuyin,
                            pinyin: BpmfEngine.zhuyinToPinyin(match.zhuyin),
                            special: null
                        };
                    }
                } else if (info.type === 'custom') {
                    newOverrides[key] = {
                        zhuyin: info.bopomofoText,
                        pinyin: BpmfEngine.zhuyinToPinyin(info.bopomofoText),
                        special: null
                    };
                } else if (info.type === 'blank') {
                    newOverrides[key] = {
                        zhuyin: '',
                        pinyin: '',
                        special: 'blank'
                    };
                } else if (info.type === 'brackets') {
                    newOverrides[key] = {
                        zhuyin: ' ',
                        pinyin: ' ',
                        special: 'brackets'
                    };
                }
            }
        });

        textarea.value = plainText;
        window.manualOverrides = newOverrides;

        // Toggle visibility wrappers
        document.getElementById('tools-bpmf').style.display = 'flex';
        document.getElementById('tools-ivs').style.display = 'none';

        currentMode = 'bpmf';
        document.body.classList.remove('app-mode-ivs');
        document.body.classList.add('app-mode-bpmf');

        // Activate controller
        BpmfFeature.onActivate(plainText, window.manualOverrides);
        window.showToast('已切換至旁註編輯器模式 (HTML) ㄅ');
    }

    // Toggle segment buttons in switcher pill
    document.querySelectorAll('.header-mode-switcher .segment-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.getElementById(`btn-mode-${mode}`).classList.add('active');
};

// --- Main Textarea Input Hook ---
function handleEditorInput() {
    const rawVal = document.getElementById('main-editor').value;

    if (currentMode === 'bpmf') {
        BpmfFeature.handleInput(rawVal, window.manualOverrides);
    } else {
        IvsFeature.handleInput(rawVal);
    }
}

// --- Theme Toggle ---
window.toggleTheme = () => {
    const body = document.body;
    const isLight = body.classList.contains('light-theme');
    
    body.classList.toggle('light-theme', !isLight);
    body.classList.toggle('dark-theme', isLight);
    
    localStorage.setItem('bopomo-theme', isLight ? 'dark' : 'light');
    window.showToast(isLight ? '已切換至深色主題 🌙' : '已切換至淺色主題 ☀️');

    // Force preview re-render if IVS active to update card font-family declarations
    if (currentMode === 'ivs') {
        IvsFeature.render();
    }
};

// --- Presets Loader triggers ---
window.togglePresetDropdown = (event) => {
    event.stopPropagation();
    
    // Close other dropdowns
    document.getElementById('presentation-dropdown-menu')?.classList.remove('show');
    document.getElementById('font-dropdown-menu')?.classList.remove('show');

    const menu = document.getElementById('preset-dropdown-menu');
    const trigger = document.getElementById('preset-dropdown-trigger');
    if (menu) {
        const isShown = menu.classList.contains('show');
        menu.classList.toggle('show', !isShown);
        trigger.classList.toggle('open', !isShown);
    }
};

window.selectPreset = (key) => {
    stopTts();
    deselectWord();

    const textarea = document.getElementById('main-editor');
    
    if (currentMode === 'bpmf') {
        window.manualOverrides = {};
        textarea.value = PRESETS[key];
        BpmfFeature.handleInput(PRESETS[key], window.manualOverrides);
    } else {
        // If in IVS mode, the presets are loaded and variation selectors are aligned contextually
        textarea.value = PRESETS[key];
        IvsFeature.handleInput(PRESETS[key]);
    }

    // Close preset menu
    document.getElementById('preset-dropdown-menu').classList.remove('show');
    document.getElementById('preset-dropdown-trigger').classList.remove('open');
    window.showToast('已成功載入教材範例！');
};

window.clearEditor = () => {
    stopTts();
    deselectWord();
    
    document.getElementById('main-editor').value = '';
    window.manualOverrides = {};

    if (currentMode === 'bpmf') {
        BpmfFeature.handleInput('', window.manualOverrides);
    } else {
        IvsFeature.handleInput('');
    }
    window.showToast('編輯器已清空 🧹');
};

// --- Zoom Controls ---
window.adjustZoom = (delta) => {
    currentZoomIdx = Math.max(0, Math.min(ZOOM_LEVELS.length - 1, currentZoomIdx + delta));
    const activeZoom = ZOOM_LEVELS[currentZoomIdx];

    document.getElementById('live-renderer').style.fontSize = activeZoom.size;
    document.getElementById('zoom-value').innerText = activeZoom.text;
};

// --- Candidate drawer dispatcher actions ---
window.switchCandidateTab = (tab) => {
    const body = document.body;
    body.classList.remove('cand-tab-suggest', 'cand-tab-custom');
    body.classList.add(`cand-tab-${tab}`);

    document.querySelectorAll('.cand-tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-tab') === tab) btn.classList.add('active');
    });
};

window.deselectWord = () => {
    if (currentMode === 'bpmf') BpmfFeature.deselectWord();
    else IvsFeature.deselectWord();
};

window.applySpecialAction = (mode) => {
    if (currentMode === 'bpmf') BpmfFeature.applySpecialAction(mode);
    else IvsFeature.applySpecialAction(mode);
};

window.applyCustomPhonetic = () => {
    if (currentMode === 'bpmf') BpmfFeature.applyCustomPhonetic();
};

window.validateCustomInput = () => {
    if (currentMode === 'bpmf') BpmfFeature.validateCustomInput();
};

// --- BPMF specific router forwards ---
window.setPresentationMode = (mode) => BpmfFeature.setPresentationMode(mode);
window.togglePresentationDropdown = (event) => BpmfFeature.togglePresentationDropdown(event);
window.selectPresentationMode = (mode) => BpmfFeature.selectPresentationMode(mode);
window.openExportModal = () => BpmfFeature.openExportModal();
window.closeExportModal = () => BpmfFeature.closeExportModal();
window.switchModalTab = (tabId) => BpmfFeature.switchModalTab(tabId);
window.copyModalCode = () => BpmfFeature.copyModalCode();

// --- IVS specific router forwards ---
window.switchFontFromSelect = (fontKey) => {
    const f = IVS_FONT_MAP[fontKey];
    IvsFeature.switchFont(f.family, f.path, f.label, f.size);
};
window.toggleFontDropdown = (event) => {
    event.stopPropagation();
    
    // Close other dropdowns
    document.getElementById('preset-dropdown-menu')?.classList.remove('show');
    document.getElementById('presentation-dropdown-menu')?.classList.remove('show');

    const menu = document.getElementById('font-dropdown-menu');
    const trigger = document.getElementById('font-dropdown-trigger');
    if (menu) {
        const isShown = menu.classList.contains('show');
        menu.classList.toggle('show', !isShown);
        trigger.classList.toggle('open', !isShown);
    }
};
window.selectFontMode = (fontKey) => {
    window.switchFontFromSelect(fontKey);
    document.getElementById('font-dropdown-menu').classList.remove('show');
    document.getElementById('font-dropdown-trigger').classList.remove('open');
};
window.openInspectorModal = () => IvsFeature.openInspectorModal();
window.closeInspectorModal = () => IvsFeature.closeInspectorModal();
window.copyIVSText = () => IvsFeature.copyIVSText();

// --- Toast System ---
window.showToast = (message) => {
    const toast = document.getElementById('sys-toast');
    document.getElementById('sys-toast-text').innerText = message;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 2200);
};

// --- Speech Synthesis (TTS) Integrations ---
function buildTtsTarget() {
    if (currentMode === 'bpmf') return BpmfFeature.buildTtsData();
    else return IvsFeature.buildTtsData();
}

window.toggleTts = () => {
    const success = TtsEngine.toggle(buildTtsTarget);
    if (success === false) {
        window.showToast('您的瀏覽器不支援語音合成功能');
    } else {
        if (TtsEngine.state === 'playing') window.showToast('開始語音朗讀 🔊');
        else if (TtsEngine.state === 'paused') window.showToast('語音播放已暫停 ⏸️');
    }
};

window.stopTts = () => {
    TtsEngine.stop();
    window.showToast('語音朗讀已停止 ⏹️');
};

function updateTtsUIState(state) {
    const playBtn = document.getElementById('btn-tts-play');
    const stopBtn = document.getElementById('btn-tts-stop');
    const icon = document.getElementById('tts-play-icon');
    const renderer = document.getElementById('live-renderer');
    
    if (state === 'playing') {
        renderer.classList.remove('tts-paused');
        icon.innerHTML = `
            <line x1="17" y1="4" x2="17" y2="20"></line>
            <line x1="7" y1="4" x2="7" y2="20"></line>
        `;
        playBtn.title = '暫停朗讀';
        stopBtn.disabled = false;
    } else if (state === 'paused') {
        renderer.classList.add('tts-paused');
        icon.innerHTML = `
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
        `;
        playBtn.title = '繼續播放';
        stopBtn.disabled = false;
    } else { // stopped
        renderer.classList.remove('tts-paused');
        clearTtsTokenHighlights();
        icon.innerHTML = `
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
        `;
        playBtn.title = '播放朗讀';
        stopBtn.disabled = true;
    }
}

function highlightActiveTtsToken(tokenIdx) {
    clearTtsTokenHighlights();
    
    if (currentMode === 'bpmf') {
        const targetElement = document.querySelector(`bpmf[data-idx="${tokenIdx}"]`);
        if (targetElement) {
            targetElement.classList.add('tts-pronouncing');
            targetElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    } else {
        const targetElement = document.querySelector(`.render-token[data-index="${tokenIdx}"]`);
        if (targetElement) {
            targetElement.classList.add('tts-pronouncing');
            targetElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }
}

function clearTtsTokenHighlights() {
    document.querySelectorAll('bpmf, .render-token').forEach((b) => {
        b.classList.remove('tts-pronouncing');
    });
}

// --- Layout Splitter Resizer (Drag Support) ---
function initLayoutResizer() {
    const resizer = document.getElementById('layout-resizer');
    const mainGrid = document.querySelector('.app-main-grid');
    
    if (!resizer || !mainGrid) return;
    
    let isDragging = false;
    
    const startDrag = (e) => {
        e.preventDefault();
        isDragging = true;
        resizer.classList.add('active');
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    };

    const doDrag = (e) => {
        if (!isDragging) return;
        
        let clientX = e.clientX;
        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
        }

        const gridRect = mainGrid.getBoundingClientRect();
        const leftWidthPx = clientX - gridRect.left;
        let percentage = (leftWidthPx / gridRect.width) * 100;
        
        if (percentage < 20) percentage = 20;
        if (percentage > 80) percentage = 80;
        
        mainGrid.style.setProperty('--left-panel-width', `${percentage}%`);
    };
    
    const stopDrag = () => {
        if (isDragging) {
            isDragging = false;
            resizer.classList.remove('active');
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        }
    };
    
    resizer.addEventListener('mousedown', startDrag);
    resizer.addEventListener('touchstart', startDrag, { passive: true });
    
    document.addEventListener('mousemove', doDrag);
    document.addEventListener('touchmove', doDrag, { passive: false });
    
    document.addEventListener('mouseup', stopDrag);
    document.addEventListener('touchend', stopDrag);
}
