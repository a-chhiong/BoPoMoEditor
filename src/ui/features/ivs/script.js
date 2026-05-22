/* ==========================================================================
   BoPoMo IVS Typeface Explorer & Validator (Refactored Module Layer)
   ========================================================================== */

import { BpmfEngine } from '../../../services/bpmf.js';
import { MoeDictionary } from '../../../services/dict.js';
import { IvsEngine } from '../../../services/ivs.js';
import { TtsEngine } from '../../../services/tts.js';
import { IVS_FONT_MAP } from '../../../configs/path.js';

// Global State variables
let currentFontFamily = 'BpmfHuninn';
let parsedTokens = [];
let selectedTokenIndex = null;

// Preset Dropdown State
let isPresetDropdownOpen = false;

// Zoom State
const ZOOM_LEVELS = [
    { size: '12px', label: '50%' },
    { size: '18px', label: '75%' },
    { size: '24px', label: '100%' },
    { size: '30px', label: '125%' },
    { size: '36px', label: '150%' }
];
let currentZoomIndex = 2; // Default 24px (100%)

// Variation selector base
const VS_BASE = IvsEngine.VS_BASE;

// Presets data
const PRESETS = {
    'preset-poyin': '我們在溫暖的陽光下散步，感覺非常暖和。小明和同學正在和牌，大家玩得十分和諧。這項技術能把攪和、暖和與和牌完美融合在和諧之中，銀行行員也非常在行！我們重溫音樂時感到了無比快樂，著手著陸時卻很著急。',
    'preset-poem': '《靜夜思》 李白\n床前明月光，疑是地上霜。\n舉頭望明月，低頭思故鄉。',
    'preset-baidi': '《早發白帝城》 李白\n朝辭白帝彩雲間，千里江陵一日還。\n兩岸猿聲啼不住，輕舟已過萬重山。',
    'preset-tw': '火金姑，來食茶。\n茶燒燒，配香蕉。\n香蕉冷冷，配龍眼。\n龍眼糖糖，配麻糬。'
};

// Initialize application once document is ready
window.addEventListener('DOMContentLoaded', () => {
    initLayoutResizer();
    
    // Initialize theme from localStorage, defaulting to light-theme
    const savedTheme = localStorage.getItem('ivs1-theme') || 'light';
    const body = document.body;
    body.classList.toggle('dark-theme', savedTheme === 'dark');
    body.classList.toggle('light-theme', savedTheme === 'light');

    // Show loading overlay during dictionary loading
    const overlay = document.getElementById('font-loading-overlay');
    const overlayTitle = document.getElementById('overlay-title');
    const overlaySubtitle = document.getElementById('overlay-subtitle');
    
    if (overlay) {
        overlayTitle.innerText = '載入教育部國語字典中...';
        overlaySubtitle.innerText = '正在即時解析教育部國語辭典簡編本...';
        overlay.classList.remove('fade-out');
    }
    
    const textInput = document.getElementById('text-input');
    if (textInput) {
        textInput.addEventListener('blur', () => {
            syncTextarea();
        });
    }
    
    // Start fetching and parsing the dictionary asynchronously via BpmfEngine
    BpmfEngine.init()
        .then(() => {
            // Set initial preset
            if (textInput) {
                textInput.value = PRESETS['preset-poyin'];
            }
            
            // Load authoritative IVS character map from bpmfvs
            const ivsMapPromise = IvsEngine.loadIVSMap().catch(() => {});

            // Update loading overlay text for font preloading
            if (overlay) {
                overlayTitle.innerText = '載入應用程式字型中...';
                overlaySubtitle.innerText = '正在預載所有 IVS 專用注音字型，這可能需要一點時間...';
            }

            // Register and load all font faces on the fly immediately
            const fontPromises = Object.values(IVS_FONT_MAP)
                .filter(f => f.family !== 'System')
                .map(async f => {
                    try {
                        if (!document.fonts.check(`1em ${f.family}`)) {
                            const fontFace = new FontFace(f.family, `url(${f.path})`);
                            document.fonts.add(fontFace);
                            await fontFace.load();
                        }
                    } catch (e) {
                        console.warn(`Failed to preload ${f.family}:`, e);
                    }
                });

            Promise.all([...fontPromises, ivsMapPromise]).then(() => {
                const hf = IVS_FONT_MAP.huninn;
                // Switch to default font (will be instant since preloaded)
                switchFont(hf.family, hf.path, hf.label, hf.size).then(() => {
                    handleLoadText();
                });
            });
        })
        .catch(err => {
            console.error('Failed to load or parse Excel dictionary:', err);
            showToast('字典載入失敗，已啟用備用降級引擎');
            if (overlay) overlay.classList.add('fade-out');
            handleLoadText();
        });

    // Initialize TTS Engine
    TtsEngine.init({
        onStateChange: updateTtsUI,
        onHighlight: (tokenIndex) => {
            document.querySelectorAll('.render-token.tts-pronouncing').forEach(el => {
                el.classList.remove('tts-pronouncing');
            });
            const span = document.querySelector(`.render-token[data-index="${tokenIndex}"]`);
            if (span) {
                span.classList.add('tts-pronouncing');
                span.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        },
        onClearHighlight: () => {
            document.querySelectorAll('.render-token.tts-pronouncing').forEach(el => {
                el.classList.remove('tts-pronouncing');
            });
        }
    });
});

// Initialize Layout Resizer
function initLayoutResizer() {
    const resizer = document.getElementById('layout-resizer');
    let isDragging = false;

    if (!resizer) return;

    const startDrag = (e) => {
        isDragging = true;
        document.body.style.cursor = 'col-resize';
        // Prevent text selection while dragging
        document.body.style.userSelect = 'none';
    };

    const doDrag = (e) => {
        if (!isDragging) return;
        
        let clientX = e.clientX;
        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
        }

        const containerWidth = document.body.clientWidth;
        let newWidthPercent = (clientX / containerWidth) * 100;

        // Clamp between 20% and 80%
        if (newWidthPercent < 20) newWidthPercent = 20;
        if (newWidthPercent > 80) newWidthPercent = 80;

        document.documentElement.style.setProperty('--left-panel-width', `${newWidthPercent}%`);
    };

    const stopDrag = () => {
        if (!isDragging) return;
        isDragging = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
    };

    resizer.addEventListener('mousedown', startDrag);
    resizer.addEventListener('touchstart', startDrag, { passive: true });

    document.addEventListener('mousemove', doDrag);
    document.addEventListener('touchmove', doDrag, { passive: false });

    document.addEventListener('mouseup', stopDrag);
    document.addEventListener('touchend', stopDrag);
}

// Clear Editor
function clearEditor() {
    document.getElementById('text-input').value = '';
    handleEditorInput();
    showToast('編輯器已清空');
}

// Toggle Preset Dropdown
function togglePresetDropdown(event) {
    if (event) {
        event.stopPropagation();
    }
    const menu = document.getElementById('preset-dropdown-menu');
    const trigger = document.getElementById('preset-dropdown-trigger');
    isPresetDropdownOpen = !isPresetDropdownOpen;
    
    if (isPresetDropdownOpen) {
        menu.classList.add('show');
        trigger.classList.add('active');
    } else {
        menu.classList.remove('show');
        trigger.classList.remove('active');
    }
}

// Select Preset
function selectPreset(key) {
    loadPreset(key);
    togglePresetDropdown();
}

// Close dropdown on outside click
document.addEventListener('click', (event) => {
    const container = document.getElementById('preset-dropdown-container');
    if (isPresetDropdownOpen && container && !container.contains(event.target)) {
        togglePresetDropdown();
    }

    const fontContainer = document.getElementById('font-dropdown-container');
    const fontMenu = document.getElementById('font-dropdown-menu');
    const fontTrigger = document.getElementById('font-dropdown-trigger');
    if (fontMenu && fontMenu.classList.contains('show') && fontContainer && !fontContainer.contains(event.target)) {
        fontMenu.classList.remove('show');
        fontTrigger.classList.remove('open');
    }
});

// Zoom logic
function adjustZoom(direction) {
    currentZoomIndex += direction;
    
    // Clamp
    if (currentZoomIndex < 0) currentZoomIndex = 0;
    if (currentZoomIndex >= ZOOM_LEVELS.length) currentZoomIndex = ZOOM_LEVELS.length - 1;
    
    const zoomConf = ZOOM_LEVELS[currentZoomIndex];
    document.getElementById('live-renderer').style.fontSize = zoomConf.size;
    document.getElementById('zoom-value').innerText = zoomConf.label;
}

// TTS Engine
function buildTtsData() {
    let plainText = '';
    const charMap = [];
    
    for (let i = 0; i < parsedTokens.length; i++) {
        const token = parsedTokens[i];
        if (token === '\n') {
            plainText += '，'; // Pause for newline
            charMap.push(i);
            continue;
        }
        
        const info = IvsEngine.getTokenInfo(token);
        if (info.isChinese) {
            plainText += info.baseChar;
            charMap.push(i);
        } else {
            // Keep all characters including punctuation and whitespace, only strip IVS variation selectors
            const cleanToken = token.replace(/[\uFE00-\uFE0F\u{E0100}-\u{E01EF}]/gu, '');
            if (cleanToken.length > 0) {
                plainText += cleanToken;
                for (let j = 0; j < cleanToken.length; j++) {
                    charMap.push(i);
                }
            }
        }
    }
    
    if (!plainText.trim()) {
        showToast('沒有可朗讀的文字');
        return { textToRead: null, charMap: null };
    }
    return { textToRead: plainText, charMap: charMap };
}

function updateTtsUI(state) {
    const playIcon = document.getElementById('tts-play-icon');
    const btnStop = document.getElementById('btn-tts-stop');
    const btnPlay = document.getElementById('btn-tts-play');
    const renderer = document.getElementById('live-renderer');

    if (state === 'playing') {
        if (renderer) renderer.classList.remove('tts-paused');
        playIcon.innerHTML = `
            <line x1="17" y1="4" x2="17" y2="20"></line>
            <line x1="7" y1="4" x2="7" y2="20"></line>
        `;
        btnPlay.title = '暫停朗讀';
        btnStop.disabled = false;
    } else if (state === 'paused') {
        if (renderer) renderer.classList.add('tts-paused');
        playIcon.innerHTML = '<polygon points="5 3 19 12 5 21 5 3"></polygon>';
        btnPlay.title = '繼續播放';
        btnStop.disabled = false;
    } else {
        if (renderer) renderer.classList.remove('tts-paused');
        playIcon.innerHTML = '<polygon points="5 3 19 12 5 21 5 3"></polygon>';
        btnPlay.title = '播放朗讀';
        btnStop.disabled = true;
    }
}

function toggleTts() {
    const success = TtsEngine.toggle(buildTtsData);
    if (success === false) {
        showToast('您的瀏覽器不支援語音合成功能');
    } else {
        if (TtsEngine.state === 'playing') showToast('開始語音朗讀 🔊');
        else if (TtsEngine.state === 'paused') showToast('語音播放已暫停 ⏸️');
        else if (TtsEngine.state === 'playing') showToast('語音繼續播放 🔊');
    }
}

function stopTts() {
    TtsEngine.stop();
    showToast('語音朗讀已停止 ⏹️');
}

// Function to show a toast message
function showToast(message) {
    const toast = document.getElementById('alert-toast');
    document.getElementById('toast-message').innerText = message;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// On-demand Font Loader using FontFace API
async function switchFont(fontName, fontUrl, displayName, size) {
    // Remove active classes
    document.querySelectorAll('.font-btn').forEach(btn => btn.classList.remove('active'));
    
    // Highlight active button
    if (fontName === 'BpmfHuninn') document.getElementById('btn-huninn').classList.add('active');
    else if (fontName === 'BpmfIansui') document.getElementById('btn-iansui').classList.add('active');
    else if (fontName === 'BpmfZihiKaiStd') document.getElementById('btn-zihikai').classList.add('active');
    else if (fontName === 'System') document.getElementById('btn-system').classList.add('active');

    // Sync mobile custom dropdown label
    const mobileLabel = document.getElementById('font-mobile-trigger-label');
    if (mobileLabel) {
        mobileLabel.innerText = displayName;
    }

    if (fontName === 'System') {
        document.getElementById('live-renderer').style.fontFamily = "'Noto Sans TC', sans-serif";
        document.getElementById('active-glyph').style.fontFamily = "'Noto Sans TC', sans-serif";
        currentFontFamily = 'System';
        showToast('已切換至系統預設字型');
        return;
    }

    // Show Loading screen
    const overlay = document.getElementById('font-loading-overlay');
    const overlayTitle = document.getElementById('overlay-title');
    const overlaySubtitle = document.getElementById('overlay-subtitle');
    
    overlayTitle.innerText = `載入 ${displayName} 中...`;
    overlaySubtitle.innerText = `正在載入字型檔案 (${size}) 並重新渲染，此操作將在本地執行...`;
    overlay.classList.remove('fade-out');

    const startTime = performance.now();

    try {
        // Register font dynamically if not loaded
        if (!document.fonts.check(`1em ${fontName}`)) {
            const fontFace = new FontFace(fontName, `url(${fontUrl})`);
            await fontFace.load();
            document.fonts.add(fontFace);
        }
        
        // Update font family of containers
        document.getElementById('live-renderer').style.fontFamily = `${fontName}, 'Noto Sans TC', sans-serif`;
        document.getElementById('active-glyph').style.fontFamily = `${fontName}, 'Noto Sans TC', sans-serif`;
        currentFontFamily = fontName;

        const duration = Math.round(performance.now() - startTime);
        overlay.classList.add('fade-out');
        showToast(`字型載入成功！耗時 ${duration} ms`);
    } catch (err) {
        console.warn("Font loading programmatically failed, falling back to browser native CSS loader: ", err);
        
        // Still apply the font family so the browser can resolve it via static @font-face rules in style.css!
        document.getElementById('live-renderer').style.fontFamily = `${fontName}, 'Noto Sans TC', sans-serif`;
        document.getElementById('active-glyph').style.fontFamily = `${fontName}, 'Noto Sans TC', sans-serif`;
        currentFontFamily = fontName;
        
        // Hide loading spinner after a short delay to let the browser download it natively
        setTimeout(() => {
            overlay.classList.add('fade-out');
            showToast(`已切換字型！正在背景載入渲染中...`);
        }, 800);
    }
}

// Load presets
function loadPreset(key) {
    if (PRESETS[key]) {
        document.getElementById('text-input').value = PRESETS[key];
        handleLoadText();
        deselectWord();
        showToast('已載入範例文字');
    }
}

// Load and parse text from textarea into editor tokens
function handleLoadText() {
    const rawText = document.getElementById('text-input').value;
    
    // Dynamically align variation selectors contextually using BpmfEngine & MoeDictionary
    parsedTokens = IvsEngine.alignIVSText(rawText);
    
    renderInteractiveTokens();
    renderInspector();
    deselectWord();
    
    // Sync the resolved variation selectors back to textarea value so user can see/copy them
    syncTextarea();
    
    // Update character counter
    updateCharacterCounter();
}

// Handle real-time user typing in the textarea without disrupting IME composition
function handleEditorInput() {
    const rawText = document.getElementById('text-input').value;
    
    // Dynamically align variation selectors contextually using BpmfEngine & MoeDictionary
    parsedTokens = IvsEngine.alignIVSText(rawText);
    
    renderInteractiveTokens();
    renderInspector();
    deselectWord();
    
    // Update character counter
    updateCharacterCounter();
}

// Update character counter in editor footer
function updateCharacterCounter() {
    const chineseChars = parsedTokens.filter(t => {
        if (t === '\n') return false;
        const info = IvsEngine.getTokenInfo(t);
        return info.isChinese;
    }).length;
    const charCounter = document.getElementById('char-counter');
    if (charCounter) {
        charCounter.innerText = `共 ${chineseChars} 字`;
    }
}

// De-select active word
function deselectWord() {
    selectedTokenIndex = null;
    document.querySelectorAll('.render-token').forEach(t => t.classList.remove('selected'));
    document.getElementById('sidebar-empty-state').style.display = 'flex';
    document.getElementById('sidebar-active-state').style.display = 'none';
    document.querySelectorAll('.inspector-card').forEach(c => c.classList.remove('active'));
    // Close bottom sheet on mobile
    const sheet = document.getElementById('candidate-bar');
    const backdrop = document.getElementById('bottom-sheet-backdrop');
    if (sheet) sheet.classList.remove('sheet-open');
    if (backdrop) backdrop.classList.remove('active');
}

// Re-construct raw text string from tokens list and sync textarea
function syncTextarea() {
    const rawText = parsedTokens.join('');
    document.getElementById('text-input').value = rawText;
    renderInspector();
}

// Render visual spans in interactive workspace
function renderInteractiveTokens() {
    const renderer = document.getElementById('live-renderer');
    renderer.innerHTML = '';

    if (parsedTokens.length === 0) {
        renderer.innerHTML = `
            <div class="empty-preview-placeholder">
                <svg viewBox="0 0 24 24" class="placeholder-svg">
                    <path fill="none" stroke="currentColor" stroke-width="1.5" d="M12 20h9M3 20h4M5 4h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z"/>
                    <path stroke="currentColor" stroke-width="1.5" d="M12 8v4m0 4h.01"/>
                </svg>
                <p>請在左側輸入框輸入中文字。</p>
            </div>
        `;
        return;
    }

    parsedTokens.forEach((token, index) => {
        const info = IvsEngine.getTokenInfo(token);
        
        if (token === '\n') {
            renderer.appendChild(document.createElement('br'));
            return;
        }

        const span = document.createElement('span');
        span.innerText = token;
        span.className = 'render-token';
        span.setAttribute('data-index', index);
        
        // Add IVS styling classes
        if (info.isChinese) {
            span.classList.add(info.type);
        }

        // Click event to select word
        span.addEventListener('click', (e) => {
            e.stopPropagation();
            selectWord(index);
        });

        renderer.appendChild(span);
    });
}

// Handle word selection and update the controller sidebar
function selectWord(index) {
    selectedTokenIndex = index;
    
    // Highlight selected token in editor
    document.querySelectorAll('.render-token').forEach(t => t.classList.remove('selected'));
    const selectedSpan = document.querySelector(`.render-token[data-index="${index}"]`);
    if (selectedSpan) selectedSpan.classList.add('selected');

    // Highlight inspector card
    document.querySelectorAll('.inspector-card').forEach(c => c.classList.remove('active'));
    const insCard = document.getElementById(`ins-card-${index}`);
    if (insCard) {
        insCard.classList.add('active');
        insCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    const token = parsedTokens[index];
    const info = IvsEngine.getTokenInfo(token);

    // Update UI sidebar
    document.getElementById('sidebar-empty-state').style.display = 'none';
    const sidebarActive = document.getElementById('sidebar-active-state');
    sidebarActive.style.display = 'grid';
    // Open bottom sheet on mobile
    const sheet = document.getElementById('candidate-bar');
    const backdrop = document.getElementById('bottom-sheet-backdrop');
    if (sheet) sheet.classList.add('sheet-open');
    if (backdrop) backdrop.classList.add('active');

    // Active glyph displays
    const activeGlyph = document.getElementById('active-glyph');
    activeGlyph.innerText = token;
    
    document.getElementById('active-char-name').innerText = `漢字 "${info.baseChar}"`;
    document.getElementById('active-unicode-badge').innerText = `U+${info.baseChar.codePointAt(0).toString(16).toUpperCase()}`;

    // State badge display
    const badge = document.getElementById('active-state-badge');
    badge.innerText = info.type.toUpperCase();
    if (info.type === 'polyphonic') {
        badge.style.background = 'var(--color-polyphonic)';
        badge.style.color = 'var(--color-poly-border)';
    } else if (info.type === 'modified') {
        badge.style.background = 'var(--color-modified)';
        badge.style.color = 'var(--color-mod-border)';
    } else if (info.type === 'blank') {
        badge.style.background = 'var(--color-blank)';
        badge.style.color = 'var(--color-blank-border)';
    } else if (info.type === 'brackets') {
        badge.style.background = 'var(--color-brackets)';
        badge.style.color = 'var(--color-brackets-border)';
    } else if (info.type === 'custom') {
        badge.style.background = 'var(--color-custom)';
        badge.style.color = 'var(--color-cust-border)';
        badge.innerText = `自訂: ${info.bopomofoText}`;
    } else {
        badge.style.background = 'rgba(255,255,255,0.05)';
        badge.style.color = 'var(--text-muted)';
        badge.innerText = '普通字元';
    }

    // Populate Polyphonic Readings
    const standardSection = document.getElementById('section-standard-readings');
    const genericSection = document.getElementById('section-generic-probe');
    const optionsContainer = document.getElementById('poyin-options-container');

    optionsContainer.innerHTML = '';
    
    if (info.hasPolyphonic && info.candidates) {
        standardSection.style.display = 'block';
        genericSection.style.display = 'none';

        // Display options
        info.candidates.forEach((candidate) => {
            // Use authoritative ivsIndex from IVS map (phonic_table_Z.txt order)
            // ivsIndex: 0 = no VS (base glyph), >= 1 = VS_BASE + ivsIndex
            const ivsIdx = candidate.ivsIndex ?? 0;
            const vsChar = ivsIdx > 0 ? String.fromCodePoint(VS_BASE + ivsIdx) : '';
            const optionToken = info.baseChar + vsChar;

            const card = document.createElement('div');
            const isActive = (info.vsIndex === ivsIdx) || (ivsIdx === 0 && info.vsIndex === null && info.type === 'polyphonic');
            card.className = `poyin-option-card ${isActive ? 'active' : ''}`;
            card.style.flex = '0 0 auto';
            card.style.width = 'max-content';
            
            const zy = candidate.zhuyin;
            const py = BpmfEngine.zhuyinToPinyin(zy);
            
            const baseHex = info.baseChar.codePointAt(0).toString(16).toUpperCase();
            const vsHex = (VS_BASE + ivsIdx).toString(16).toUpperCase();

            card.innerHTML = `
                <div class="poyin-text">
                    <span class="poyin-index">VS${17 + ivsIdx}</span>
                    <span class="poyin-annotated" style="font-family: ${currentFontFamily}, sans-serif">${optionToken}</span>
                </div>
                <div style="display: flex; flex-direction: column; gap: 4px;">
                    <span style="font-size: 0.9rem; font-weight: 500;">${zy} <span style="color: var(--text-muted); font-size: 0.8rem; font-weight: 400;">(${py})</span></span>
                    <div style="display: flex; gap: 4px; flex-wrap: wrap; margin-top: 2px;">
                        <span class="unicode-pill">U+${baseHex}</span>
                        ${ivsIdx > 0 ? `<span class="unicode-pill" style="color: var(--accent-blue); border-color: rgba(0, 210, 255, 0.3);">U+${vsHex}</span>` : ''}
                    </div>
                </div>
            `;

            card.addEventListener('click', () => {
                applyPronunciation(ivsIdx);
            });

            optionsContainer.appendChild(card);
        });
    } else {
        // If character is not in MoE polyphonic database, show IVS generic probes
        standardSection.style.display = 'none';
        genericSection.style.display = 'block';

        const probeContainer = document.getElementById('probe-buttons-container');
        probeContainer.innerHTML = '';

        // Probing VS17 to VS26 (0 to 9 offset)
        for (let i = 0; i < 10; i++) {
            const vsChar = String.fromCodePoint(VS_BASE + i);
            const probeToken = info.baseChar + vsChar;

            const btn = document.createElement('button');
            btn.className = `btn-secondary ${info.vsIndex === i ? 'active' : ''}`;
            btn.style.padding = '6px';
            btn.style.fontSize = '1.1rem';
            btn.style.fontFamily = `${currentFontFamily}, sans-serif`;
            btn.innerText = probeToken;

            btn.addEventListener('click', () => {
                applyPronunciation(i);
            });

            probeContainer.appendChild(btn);
        }
    }
}

// Apply a specific standard pronunciation index to current selected token
function applyPronunciation(vsIdx) {
    if (selectedTokenIndex === null) return;
    
    const token = parsedTokens[selectedTokenIndex];
    const info = IvsEngine.getTokenInfo(token);
    
    const vsChar = vsIdx > 0 ? String.fromCodePoint(VS_BASE + vsIdx) : '';
    parsedTokens[selectedTokenIndex] = info.baseChar + vsChar;

    syncTextarea();
    renderInteractiveTokens();
    selectWord(selectedTokenIndex);
    showToast(`已套用 VS${17 + vsIdx} 變體字形`);
}

// Apply special mode (blank or brackets)
function applySpecialMode(mode) {
    if (selectedTokenIndex === null) return;

    const token = parsedTokens[selectedTokenIndex];
    const info = IvsEngine.getTokenInfo(token);

    if (mode === 'blank') {
        parsedTokens[selectedTokenIndex] = info.baseChar + String.fromCodePoint(VS_BASE);
        showToast('已套用注音留白 (E01E0)');
    } else if (mode === 'brackets') {
        parsedTokens[selectedTokenIndex] = info.baseChar + String.fromCodePoint(VS_BASE) + String.fromCodePoint(0xF000);
        showToast('已套用注音填空');
    }

    syncTextarea();
    renderInteractiveTokens();
    selectWord(selectedTokenIndex);
}



// Render Inspector list at the bottom
function renderInspector() {
    const container = document.getElementById('inspector-container');
    container.innerHTML = '';

    parsedTokens.forEach((token, index) => {
        if (token === '\n') return;

        const info = IvsEngine.getTokenInfo(token);
        const card = document.createElement('div');
        card.className = `inspector-card ${selectedTokenIndex === index ? 'active' : ''}`;
        card.id = `ins-card-${index}`;

        // Label color mapping
        let badgeBg = 'rgba(255,255,255,0.05)';
        let badgeText = 'var(--text-muted)';
        
        if (info.type === 'polyphonic') {
            badgeBg = 'rgba(0, 210, 255, 0.1)';
            badgeText = 'var(--accent-blue)';
        } else if (info.type === 'modified') {
            badgeBg = 'rgba(0, 245, 212, 0.1)';
            badgeText = 'var(--accent-cyan)';
        } else if (info.type === 'blank') {
            badgeBg = 'rgba(148, 163, 184, 0.08)';
            badgeText = '#64748b';
        } else if (info.type === 'brackets') {
            badgeBg = 'rgba(157, 78, 221, 0.1)';
            badgeText = 'var(--accent-purple)';
        } else if (info.type === 'custom') {
            badgeBg = 'rgba(255, 0, 127, 0.1)';
            badgeText = 'var(--accent-pink)';
        }

        card.innerHTML = `
            <div class="inspector-glyph-row">
                <span class="inspector-char" style="font-family: ${currentFontFamily}, sans-serif">${token}</span>
                <span class="inspector-badge" style="background:${badgeBg}; color:${badgeText}">${info.type.toUpperCase()}</span>
            </div>
            <div class="inspector-hex-list">
                <!-- Populated below -->
            </div>
        `;

        const hexList = card.querySelector('.inspector-hex-list');
        const parts = [...token];
        
        // 1. Base character hex
        const baseUni = parts[0].codePointAt(0).toString(16).toUpperCase();
        hexList.innerHTML += `
            <div class="inspector-hex-item">
                <span class="hex-desc">字元:</span>
                <span class="hex-value">U+${baseUni}</span>
            </div>
        `;

        // 2. VS hex
        if (parts.length > 1) {
            const vsUni = parts[1].codePointAt(0).toString(16).toUpperCase();
            hexList.innerHTML += `
                <div class="inspector-hex-item">
                    <span class="hex-desc">IVS:</span>
                    <span class="hex-value" style="color: var(--accent-blue)">U+${vsUni}</span>
                </div>
            `;
        }

        // 3. PUA hex
        if (parts.length > 2) {
            const puaUni = parts[2].codePointAt(0).toString(16).toUpperCase();
            hexList.innerHTML += `
                <div class="inspector-hex-item">
                    <span class="hex-desc">PUA:</span>
                    <span class="hex-value" style="color: var(--accent-pink)">U+${puaUni}</span>
                </div>
            `;
        }

        card.addEventListener('click', () => {
            selectWord(index);
            // Scroll to word in editor
            const editorSpan = document.querySelector(`.render-token[data-index="${index}"]`);
            if (editorSpan) {
                editorSpan.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        });

        container.appendChild(card);
    });
}

// Copy reconstructed IVS text stream directly to the clipboard
function copyIVSText() {
    const rawText = parsedTokens.join('');
    if (!rawText) {
        showToast('無任何文字可供複製！');
        return;
    }
    
    navigator.clipboard.writeText(rawText).then(() => {
        showToast('已複製 IVS 格式文字！可直接貼上至 Word 或 Illustrator 套用字型！');
    }).catch(err => {
        console.warn('Modern clipboard API failed, using fallback copy method: ', err);
        // Fallback for older browsers or sandboxed contexts
        const textarea = document.createElement('textarea');
        textarea.value = rawText;
        textarea.style.position = 'fixed';
        textarea.style.top = '0';
        textarea.style.left = '0';
        textarea.style.width = '2em';
        textarea.style.height = '2em';
        textarea.style.padding = '0';
        textarea.style.border = 'none';
        textarea.style.outline = 'none';
        textarea.style.boxShadow = 'none';
        textarea.style.background = 'transparent';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        try {
            document.execCommand('copy');
            showToast('已複製 IVS 格式文字！可直接貼上至 Word 或 Illustrator 套用字型！');
        } catch (copyErr) {
            console.error('Fallback copy failed: ', copyErr);
            showToast('複製失敗，請手動複製左側編輯器之文本。');
        }
        document.body.removeChild(textarea);
    });
}

// Inspector Modal Toggle Functions
function openInspectorModal() {
    const modal = document.getElementById('inspector-modal');
    if (modal) modal.style.display = 'flex';
}

function closeInspectorModal() {
    const modal = document.getElementById('inspector-modal');
    if (modal) modal.style.display = 'none';
}

// Theme Toggle Management
function toggleTheme() {
    const body = document.body;
    if (body.classList.contains('light-theme')) {
        body.classList.remove('light-theme');
        body.classList.add('dark-theme');
        localStorage.setItem('ivs1-theme', 'dark');
        showToast('已切換至深色主題 🌙');
    } else {
        body.classList.remove('dark-theme');
        body.classList.add('light-theme');
        localStorage.setItem('ivs1-theme', 'light');
        showToast('已切換至淺色主題 ☀️');
    }
}

// --- Map Event Handlers to Global window namespace ---
// This enables modern ES Module scoping while maintaining flawless compatibility
// with traditional HTML inline event attributes (e.g. onclick="switchFont(...)")
// exactly like the architectural pattern established in demo/bpmf1/script.js.
window.switchFont = switchFont;
window.loadPreset = loadPreset;
window.handleLoadText = handleLoadText;
window.handleEditorInput = handleEditorInput;
window.toggleTheme = toggleTheme;
window.copyIVSText = copyIVSText;
window.applySpecialMode = applySpecialMode;
window.openInspectorModal = openInspectorModal;
window.closeInspectorModal = closeInspectorModal;
window.clearEditor = clearEditor;
window.togglePresetDropdown = togglePresetDropdown;
window.selectPreset = selectPreset;
window.adjustZoom = adjustZoom;
window.toggleTts = toggleTts;
window.stopTts = stopTts;
window.deselectWord = deselectWord;
window.applyPronunciation = applyPronunciation;

// Mobile font dropdown helper
window.switchFontFromSelect = function(val) {
    const MAP = {
        huninn:  [IVS_FONT_MAP.huninn.family,  IVS_FONT_MAP.huninn.path,   IVS_FONT_MAP.huninn.label,   IVS_FONT_MAP.huninn.size],
        iansui:  [IVS_FONT_MAP.iansui.family,  IVS_FONT_MAP.iansui.path,   IVS_FONT_MAP.iansui.label,   IVS_FONT_MAP.iansui.size],
        zihikai: [IVS_FONT_MAP.zihikai.family, IVS_FONT_MAP.zihikai.path,  IVS_FONT_MAP.zihikai.label,  IVS_FONT_MAP.zihikai.size],
        system:  [IVS_FONT_MAP.system.family,  IVS_FONT_MAP.system.path,   IVS_FONT_MAP.system.label,   IVS_FONT_MAP.system.size],
    };
    const args = MAP[val];
    if (args) switchFont(...args);
};

function toggleFontDropdown(event) {
    if (event) {
        event.stopPropagation();
    }
    const menu = document.getElementById('font-dropdown-menu');
    const trigger = document.getElementById('font-dropdown-trigger');
    
    // Close other dropdowns if open
    if (isPresetDropdownOpen) {
        togglePresetDropdown();
    }

    if (menu) {
        const isShown = menu.classList.contains('show');
        if (isShown) {
            menu.classList.remove('show');
            trigger.classList.remove('open');
        } else {
            menu.classList.add('show');
            trigger.classList.add('open');
        }
    }
}

function selectFontMode(val) {
    switchFontFromSelect(val);
    const menu = document.getElementById('font-dropdown-menu');
    const trigger = document.getElementById('font-dropdown-trigger');
    if (menu) {
        menu.classList.remove('show');
        trigger.classList.remove('open');
    }
}

window.toggleFontDropdown = toggleFontDropdown;
window.selectFontMode = selectFontMode;
