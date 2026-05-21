/* ==========================================================================
   Bopomofo & Pinyin Smart Typography Editor - Main Application Logic
   High-Accuracy Contextual Conversion, Serialization, & RWD Interactivity
   ========================================================================== */

import { BpmfEngine } from '../../../services/bpmf.js';
import { TtsEngine } from '../../../services/tts.js';

// --- Global Application State ---
let parsedTokens = [];
let manualOverrides = {}; // Map of "char_occurrence" -> { zhuyin, pinyin, special }
let selectedTokenIndex = null;

// --- Global App Settings ---

let activeFont = 'BopomofoRuby';
let presentationMode = 'mode-zhu';
let correctionMode = true;

const PRESETS = {
    'preset-poyin': '我們在溫暖的陽光下散步，感覺非常暖和。小明和同學正在和牌，大家玩得十分和諧。這項技術能把攪和、暖和與和牌完美融合在和諧之中，銀行行員也非常在行！我們重溫音樂時感到了無比快樂，著手著陸時卻很著急。',
    'preset-poem': '《靜夜思》 李白\n床前明月光，疑是地上霜。\n舉頭望明月，低頭思故鄉。',
    'preset-baidi': '《早發白帝城》 李白\n朝辭白帝彩雲間，千里江陵一日還。\n兩岸猿聲啼不住，輕舟已過萬重山。',
    'preset-tw': '火金姑，來食茶。\n茶燒燒，配香蕉。\n香蕉冷冷，配龍眼。\n龍眼糖糖，配麻糬。'
};

// Core phonetic mapping constants (TONE_MAP, ACCENTS, INITIALS_MAP, FINALS_MAP, ZHUYIN_INITIALS_MAP, ZHUYIN_FINALS_MAP) have been extracted to bpmf.js

// --- Initialization ---
window.addEventListener('DOMContentLoaded', () => {
    // Initialize theme from localStorage, defaulting to light-theme
    const savedTheme = localStorage.getItem('bpmf1-theme') || 'light';
    const body = document.body;
    body.classList.toggle('dark-theme', savedTheme === 'dark');
    body.classList.toggle('light-theme', savedTheme === 'light');

    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        document.getElementById('loader-title').innerText = '載入官方字典中...';
        document.getElementById('loader-subtitle').innerText = '正在即時解析教育部國語辭典簡編本';
    }

    // Load default preset into input
    document.getElementById('main-editor').value = PRESETS['preset-poyin'];

    // Start fetching and parsing the dictionary asynchronously via BpmfEngine
    BpmfEngine.init()
        .then(() => {
            if (overlay) overlay.classList.add('fade-out');
            handleEditorInput(); // Run first layout render with fully loaded memory dictionary
        })
        .catch(err => {
            console.error('Failed to load or parse Excel dictionary:', err);
            if (overlay) overlay.classList.add('fade-out');
            handleEditorInput(); // Fallback to plain parsing
        });

    // Global click listener for deselecting active characters & closing custom dropdowns
    document.addEventListener('click', (e) => {
        // Close preset dropdown if clicked outside
        const presetMenu = document.getElementById('preset-dropdown-menu');
        const presetTrigger = document.getElementById('preset-dropdown-trigger');
        if (presetMenu && presetMenu.classList.contains('show') && !e.target.closest('#preset-dropdown-container')) {
            presetMenu.classList.remove('show');
            presetTrigger.classList.remove('open');
        }

        // Close presentation dropdown if clicked outside
        const presMenu = document.getElementById('presentation-dropdown-menu');
        const presTrigger = document.getElementById('presentation-dropdown-trigger');
        if (presMenu && presMenu.classList.contains('show') && !e.target.closest('#presentation-dropdown-container')) {
            presMenu.classList.remove('show');
            presTrigger.classList.remove('open');
        }

        // Deselect word focus in correction mode when clicking empty space
        if (correctionMode && selectedTokenIndex !== null) {
            // Safe guard: if the clicked element has been detached from the DOM during execution, do not deselect
            if (!e.target.isConnected) return;

            const clickedBpmf = e.target.closest('bpmf');
            const clickedCandidateBar = e.target.closest('#candidate-bar');
            const clickedCustomAssembler = e.target.closest('.custom-assembler-section');
            
            if (!clickedBpmf && !clickedCandidateBar && !clickedCustomAssembler) {
                deselectWord();
            }
        }
    });

    // Initialize split layout draggable resizer
    initLayoutResizer();
});

// --- Theme Management ---
function toggleTheme() {
    const body = document.body;
    if (body.classList.contains('light-theme')) {
        body.classList.remove('light-theme');
        body.classList.add('dark-theme');
        localStorage.setItem('bpmf1-theme', 'dark');
        showToast('已切換至深色主題 🌙');
    } else {
        body.classList.remove('dark-theme');
        body.classList.add('light-theme');
        localStorage.setItem('bpmf1-theme', 'light');
        showToast('已切換至淺色主題 ☀️');
    }
}


// --- Text Utility & Preset Loader ---
function loadPreset(key) {
    if (PRESETS[key]) {
        stopTts();
        manualOverrides = {}; // Reset overrides cache
        document.getElementById('main-editor').value = PRESETS[key];
        handleEditorInput();
        deselectWord();
        showToast('已載入預設教材範例');
    }
}

function togglePresetDropdown(event) {
    event.stopPropagation();
    const menu = document.getElementById('preset-dropdown-menu');
    const trigger = document.getElementById('preset-dropdown-trigger');
    if (menu) {
        const isShown = menu.classList.contains('show');
        // Close all other dropdowns if any
        menu.classList.toggle('show', !isShown);
        trigger.classList.toggle('open', !isShown);
    }
}

function selectPreset(key) {
    loadPreset(key);
    const menu = document.getElementById('preset-dropdown-menu');
    const trigger = document.getElementById('preset-dropdown-trigger');
    if (menu) {
        menu.classList.remove('show');
        trigger.classList.remove('open');
    }
}

// Clear input
function clearEditor() {
    stopTts();
    manualOverrides = {}; // Reset overrides cache
    document.getElementById('main-editor').value = '';
    handleEditorInput();
    deselectWord();
    showToast('編輯器已清空');
}

// Toast System
function showToast(message) {
    const toast = document.getElementById('sys-toast');
    document.getElementById('sys-toast-text').innerText = message;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 2500);
}

// Core phonetic converter functions (pinyinSyllableToZhuyin, pinyinToZhuyin, addToneMark, zhuyinToPinyin) have been extracted to bpmf.js

// --- Manual Overrides Occurrence Helper ---
function getOccurrenceKey(tokensList, targetIndex) {
    const char = tokensList[targetIndex].char;
    let occurrence = 0;
    for (let i = 0; i < targetIndex; i++) {
        if (tokensList[i].char === char) {
            occurrence++;
        }
    }
    return `${char}_${occurrence}`;
}

// --- Text Parsing & State Reconstruction ---
function handleEditorInput() {
    const rawText = document.getElementById('main-editor').value;

    // Stop TTS if user is actively editing text to prevent index mismatching
    if (typeof ttsState !== 'undefined' && ttsState !== 'stopped') {
        stopTts();
    }

    // Call the centralized engine tokenizer
    parsedTokens = BpmfEngine.tokenize(rawText, manualOverrides);

    // Sync state: save any newly imported custom tag annotations back to manualOverrides
    parsedTokens.forEach((token, idx) => {
        if (token.type === 'chinese' && token.isCustom) {
            const key = getOccurrenceKey(parsedTokens, idx);
            manualOverrides[key] = {
                zhuyin: token.zhuyin,
                pinyin: token.pinyin,
                special: token.special
            };
        }
    });

    // Update character counters
    const totalChars = parsedTokens.filter(t => t.type === 'chinese').length;
    document.getElementById('char-counter').innerText = `共 ${totalChars} 字`;

    renderPreview();
}

// --- Preview Presentation Renderer ---
function renderPreview() {
    const previewContainer = document.getElementById('rendered-preview');
    previewContainer.innerHTML = '';

    previewContainer.className = `rendered-preview-container ${presentationMode} ${correctionMode ? 'correction-enabled' : ''}`;

    if (parsedTokens.length === 0) {
        previewContainer.innerHTML = `
            <div class="empty-preview-placeholder">
                <svg viewBox="0 0 24 24" class="placeholder-svg">
                    <path fill="none" stroke="currentColor" stroke-width="1.5" d="M12 20h9M3 20h4M5 4h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z"/>
                    <path stroke="currentColor" stroke-width="1.5" d="M12 8v4m0 4h.01"/>
                </svg>
                <p>請在左側輸入框輸入中文字，此處將以極致美感的〇〇日報排版樣式呈現。</p>
            </div>
        `;
        return;
    }

    parsedTokens.forEach((tokenObj, idx) => {
        if (tokenObj.type === 'other') {
            if (tokenObj.char === '\n') {
                previewContainer.appendChild(document.createElement('br'));
            } else {
                const textSpan = document.createElement('span');
                textSpan.innerText = tokenObj.char;
                textSpan.className = 'plain-text-token';
                previewContainer.appendChild(textSpan);
            }
            return;
        }

        // Generate <bpmf> custom typographic tag
        const bpmfSpan = document.createElement('bpmf');
        bpmfSpan.innerText = tokenObj.char;
        bpmfSpan.setAttribute('zhuyin', tokenObj.zhuyin || '');
        bpmfSpan.setAttribute('pinyin', tokenObj.pinyin || '');
        bpmfSpan.setAttribute('data-idx', idx); // 100% robust misalignment fix

        if (tokenObj.special) bpmfSpan.classList.add(tokenObj.special);
        else if (tokenObj.isCustom) bpmfSpan.classList.add('custom-modified');

        if (selectedTokenIndex === idx) bpmfSpan.classList.add('selected');

        // Click to edit
        bpmfSpan.addEventListener('click', (e) => {
            e.stopPropagation();
            if (correctionMode) {
                selectWord(idx);
            }
        });

        previewContainer.appendChild(bpmfSpan);
    });
}

function setPresentationMode(mode) {
    presentationMode = mode;

    document.querySelectorAll('.segment-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-mode') === mode) {
            btn.classList.add('active');
        }
    });

    const mobileLabel = document.getElementById('presentation-mobile-trigger-label');
    if (mobileLabel) {
        const MAP = {
            'mode-zhu': '中 + 注音',
            'mode-pin': '中 + 拼音',
            'mode-zhu-only': '僅注音',
            'mode-pin-only': '僅拼音',
            'mode-han-only': '僅中文'
        };
        mobileLabel.innerText = MAP[mode] || mode;
    }

    renderPreview();
    const activeBtn = document.querySelector(`.segment-btn[data-mode="${mode}"]`);
    const modeLabel = activeBtn ? activeBtn.innerText.trim() : mode;
    showToast(`切換顯示格式：${modeLabel}`);
}

function togglePresentationDropdown(event) {
    if (event) {
        event.stopPropagation();
    }
    const menu = document.getElementById('presentation-dropdown-menu');
    const trigger = document.getElementById('presentation-dropdown-trigger');
    
    // Close other dropdowns
    const presetMenu = document.getElementById('preset-dropdown-menu');
    const presetTrigger = document.getElementById('preset-dropdown-trigger');
    if (presetMenu) {
        presetMenu.classList.remove('show');
        presetTrigger.classList.remove('open');
    }

    if (menu) {
        const isShown = menu.classList.contains('show');
        menu.classList.toggle('show', !isShown);
        trigger.classList.toggle('open', !isShown);
    }
}

function selectPresentationMode(mode) {
    setPresentationMode(mode);
    const menu = document.getElementById('presentation-dropdown-menu');
    const trigger = document.getElementById('presentation-dropdown-trigger');
    if (menu) {
        menu.classList.remove('show');
        trigger.classList.remove('open');
    }
}

function toggleCorrectionMode() {
    correctionMode = true;
    renderPreview();
}

function selectWord(idx) {
    selectedTokenIndex = idx;

    // Highlight elements using robust data-idx matching
    document.querySelectorAll('bpmf').forEach((b) => {
        const tokenIdx = parseInt(b.getAttribute('data-idx'));
        if (tokenIdx === idx) b.classList.add('selected');
        else b.classList.remove('selected');
    });

    const tokenObj = parsedTokens[idx];

    // Display active drawer
    document.getElementById('candidate-empty-state').style.display = 'none';
    document.getElementById('candidate-active-state').style.display = 'grid';
    document.getElementById('candidate-bar').classList.add('show-bottom-sheet');

    // Character profiles
    document.getElementById('selected-char').innerText = tokenObj.char;
    document.getElementById('selected-unicode').innerText = `U+${tokenObj.char.codePointAt(0).toString(16).toUpperCase()}`;

    const isPoly = getWordCandidates(tokenObj.char).length > 1;
    const typeBadge = document.getElementById('selected-type-badge');
    typeBadge.innerText = isPoly ? '多音字' : '常用字';
    typeBadge.className = isPoly ? 'profile-type-badge polyphonic' : 'profile-type-badge';

    populatePhoneticCandidates(tokenObj.char, tokenObj.zhuyin);

    document.getElementById('custom-zhuyin-input').value = tokenObj.zhuyin || '';
    document.getElementById('custom-pinyin-input').value = tokenObj.pinyin || '';

    validateCustomInput();
    
    // Always default to recommendations tab on mobile
    if (window.innerWidth <= 768) {
        switchCandidateTab('suggest');
    }
}

function deselectWord() {
    selectedTokenIndex = null;
    document.querySelectorAll('bpmf').forEach(b => b.classList.remove('selected'));

    document.getElementById('candidate-empty-state').style.display = 'flex';
    document.getElementById('candidate-active-state').style.display = 'none';
    document.getElementById('candidate-bar').classList.remove('show-bottom-sheet');
}

function getWordCandidates(char) {
    return BpmfEngine.getCandidates(char);
}

function populatePhoneticCandidates(char, activeZhuyin) {
    const container = document.getElementById('candidates-options-container');
    container.innerHTML = '';

    const candidates = getWordCandidates(char);

    candidates.forEach((cand) => {
        const btn = document.createElement('button');
        btn.className = 'candidate-option-btn';

        if (cand.zhuyin === activeZhuyin) {
            btn.classList.add('active');
        }

        btn.innerHTML = `
            <span class="cand-zhuyin">${cand.zhuyin}</span>
            <span class="cand-pinyin">${cand.pinyin}</span>
        `;

        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            applyPhoneticSelection(cand.zhuyin, cand.pinyin);
        });

        container.appendChild(btn);
    });
}

function applyPhoneticSelection(zhuyin, pinyin) {
    if (selectedTokenIndex === null) return;

    const tokenObj = parsedTokens[selectedTokenIndex];
    tokenObj.zhuyin = zhuyin;
    tokenObj.pinyin = pinyin;
    tokenObj.special = null;
    tokenObj.isCustom = true;

    // Save to global manualOverrides cache!
    const key = getOccurrenceKey(parsedTokens, selectedTokenIndex);
    manualOverrides[key] = {
        zhuyin: zhuyin,
        pinyin: pinyin,
        special: null
    };

    serializeStateToTextarea();
    renderPreview();
    selectWord(selectedTokenIndex);
    showToast(`成功更換讀音為 ${zhuyin} (${pinyin})`);
}

function applySpecialPresentation(mode) {
    if (selectedTokenIndex === null) return;

    const tokenObj = parsedTokens[selectedTokenIndex];

    if (mode === 'blank') {
        tokenObj.special = 'blank';
        tokenObj.zhuyin = '';
        tokenObj.pinyin = '';
    } else if (mode === 'brackets') {
        tokenObj.special = 'brackets';
        tokenObj.zhuyin = ' ';
        tokenObj.pinyin = ' ';
    }

    tokenObj.isCustom = true;

    // Save to global manualOverrides cache!
    const key = getOccurrenceKey(parsedTokens, selectedTokenIndex);
    manualOverrides[key] = {
        zhuyin: tokenObj.zhuyin,
        pinyin: tokenObj.pinyin,
        special: tokenObj.special
    };

    serializeStateToTextarea();
    renderPreview();
    selectWord(selectedTokenIndex);
    showToast(mode === 'blank' ? '已套用注音留白' : '已套用注音填空');
}

// --- Custom Manual Phonetic Assembly ---
function validateCustomInput() {
    const zVal = document.getElementById('custom-zhuyin-input').value.trim();
    const pVal = document.getElementById('custom-pinyin-input').value.trim();
    const btn = document.getElementById('btn-apply-custom');

    if (zVal.length > 0 && pVal.length > 0) {
        btn.disabled = false;
    } else {
        btn.disabled = true;
    }
}

function applyCustomPhonetic() {
    if (selectedTokenIndex === null) return;

    const zVal = document.getElementById('custom-zhuyin-input').value.trim();
    const pVal = document.getElementById('custom-pinyin-input').value.trim();

    const tokenObj = parsedTokens[selectedTokenIndex];
    tokenObj.zhuyin = zVal;
    tokenObj.pinyin = pVal;
    tokenObj.special = null;
    tokenObj.isCustom = true;

    // Save to global manualOverrides cache!
    const key = getOccurrenceKey(parsedTokens, selectedTokenIndex);
    manualOverrides[key] = {
        zhuyin: zVal,
        pinyin: pVal,
        special: null
    };

    serializeStateToTextarea();
    renderPreview();
    selectWord(selectedTokenIndex);
    showToast(`成功套用自訂音標：${zVal} (${pVal})`);
}


// --- Bidirectional Serialization (State to Textarea HTML Tags) ---
function serializeStateToTextarea() {
    const rawParts = [];

    parsedTokens.forEach((tokenObj) => {
        rawParts.push(tokenObj.char);
    });

    const editor = document.getElementById('main-editor');
    const start = editor.selectionStart;
    const end = editor.selectionEnd;

    editor.value = rawParts.join('');

    editor.setSelectionRange(start, end);
}

// --- Export Codes Modal System ---
function openExportModal() {
    const modal = document.getElementById('export-modal');
    modal.style.display = 'flex';

    // 1. Generate HTML Code
    let htmlCode = `<div class="mode-zhu">\n`;
    parsedTokens.forEach((t) => {
        if (t.type === 'other') {
            if (t.char === '\n') htmlCode += `<br>\n`;
            else htmlCode += t.char;
        } else {
            htmlCode += `  <bpmf zhuyin="${t.zhuyin || ''}" pinyin="${t.pinyin || ''}">${t.char}</bpmf>\n`;
        }
    });
    htmlCode += `</div>`;
    document.getElementById('export-html-code').value = htmlCode;

    // 2. Fetch and Generate CSS Code on demand
    document.getElementById('export-css-code').value = '載入中...';
    fetch('./bpmf.css')
        .then(res => {
            if (!res.ok) throw new Error('HTTP error ' + res.status);
            return res.text();
        })
        .then(text => {
            document.getElementById('export-css-code').value = text.trim();
        })
        .catch(err => {
            console.error('Failed to load bpmf.css for export:', err);
            document.getElementById('export-css-code').value = '/* 無法從 bpmf.css 載入樣式規則 */';
        });

    switchModalTab('tab-html');
}

function closeExportModal() {
    document.getElementById('export-modal').style.display = 'none';
}

function switchModalTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.outerHTML.includes(tabId)) btn.classList.add('active');
    });

    document.querySelectorAll('.tab-content').forEach(c => {
        c.style.display = 'none';
    });
    document.getElementById(tabId).style.display = 'block';
}

function copyModalCode() {
    let textToCopy = '';

    if (document.getElementById('tab-html').style.display !== 'none') {
        textToCopy = document.getElementById('export-html-code').value;
    } else {
        textToCopy = document.getElementById('export-css-code').value;
    }

    navigator.clipboard.writeText(textToCopy).then(() => {
        const ind = document.getElementById('copy-success-indicator');
        ind.classList.add('show');
        setTimeout(() => {
            ind.classList.remove('show');
        }, 1500);
    }).catch(err => {
        console.error('Copy failed: ', err);
        showToast('複製失敗，請手動全選複製。');
    });
}

// --- Text Speech Engine (TTS) ---
TtsEngine.init({
    onStateChange: setTtsState,
    onHighlight: highlightPronouncingToken,
    onClearHighlight: clearTtsHighlight
});

function setTtsState(state) {
    const playBtn = document.getElementById('btn-tts-play');
    const stopBtn = document.getElementById('btn-tts-stop');
    const icon = document.getElementById('tts-play-icon');
    const previewContainer = document.getElementById('rendered-preview');
    
    if (state === 'playing') {
        if (previewContainer) previewContainer.classList.remove('tts-paused');
        icon.innerHTML = `
            <line x1="17" y1="4" x2="17" y2="20"></line>
            <line x1="7" y1="4" x2="7" y2="20"></line>
        `;
        playBtn.title = '暫停朗讀';
        stopBtn.disabled = false;
    } else if (state === 'paused') {
        if (previewContainer) previewContainer.classList.add('tts-paused');
        icon.innerHTML = `
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
        `;
        playBtn.title = '繼續播放';
        stopBtn.disabled = false;
    } else { // stopped
        if (previewContainer) {
            previewContainer.classList.remove('tts-paused');
        }
        clearTtsHighlight();
        icon.innerHTML = `
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
        `;
        playBtn.title = '播放朗讀';
        stopBtn.disabled = true;
    }
}

function highlightPronouncingToken(tokenIdx) {
    // Clear previous TTS highlights
    document.querySelectorAll('bpmf').forEach((b) => {
        b.classList.remove('tts-pronouncing');
    });
    
    // Highlight the active token element
    const targetElement = document.querySelector(`bpmf[data-idx="${tokenIdx}"]`);
    if (targetElement) {
        targetElement.classList.add('tts-pronouncing');
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

function clearTtsHighlight() {
    document.querySelectorAll('bpmf').forEach((b) => {
        b.classList.remove('tts-pronouncing');
    });
}

function buildBpmfTtsData() {
    let plainText = '';
    const charMap = [];
    
    parsedTokens.forEach((t, tokenIdx) => {
        const charStr = t.char;
        for (let i = 0; i < charStr.length; i++) {
            charMap.push(tokenIdx);
        }
        plainText += charStr;
    });
    
    if (!plainText.trim()) {
        showToast('無任何文本可供朗讀！');
        return { textToRead: null, charMap: null };
    }
    return { textToRead: plainText, charMap };
}

function toggleTts() {
    const success = TtsEngine.toggle(buildBpmfTtsData);
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

// --- Layout Drag-Resize Logic ---
function initLayoutResizer() {
    const resizer = document.getElementById('layout-resizer');
    const mainGrid = document.querySelector('.app-main-grid');
    
    if (!resizer || !mainGrid) return;
    
    let isDragging = false;
    
    resizer.addEventListener('mousedown', (e) => {
        e.preventDefault();
        isDragging = true;
        resizer.classList.add('active');
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        
        const gridRect = mainGrid.getBoundingClientRect();
        const leftWidthPx = e.clientX - gridRect.left;
        let percentage = (leftWidthPx / gridRect.width) * 100;
        
        if (percentage < 20) percentage = 20;
        if (percentage > 80) percentage = 80;
        
        mainGrid.style.setProperty('--left-panel-width', `${percentage}%`);
    });
    
    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            resizer.classList.remove('active');
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        }
    });

    // Touch Support for Tablet Dragging!
    resizer.addEventListener('touchstart', (e) => {
        isDragging = true;
        resizer.classList.add('active');
        document.body.style.userSelect = 'none';
    });

    document.addEventListener('touchmove', (e) => {
        if (!isDragging || !e.touches[0]) return;
        const touch = e.touches[0];
        const gridRect = mainGrid.getBoundingClientRect();
        const leftWidthPx = touch.clientX - gridRect.left;
        let percentage = (leftWidthPx / gridRect.width) * 100;
        
        if (percentage < 20) percentage = 20;
        if (percentage > 80) percentage = 80;
        
        mainGrid.style.setProperty('--left-panel-width', `${percentage}%`);
    });

    document.addEventListener('touchend', () => {
        if (isDragging) {
            isDragging = false;
            resizer.classList.remove('active');
            document.body.style.userSelect = '';
        }
    });
}

// --- Preview Zoom Controller (Five Levels) ---
const ZOOM_LEVELS = [
    { text: '50%', size: '12px' },
    { text: '75%', size: '18px' },
    { text: '100%', size: '24px' }, // default
    { text: '125%', size: '30px' },
    { text: '150%', size: '36px' }
];
let currentZoomIdx = 2; // Default 100%

function adjustZoom(delta) {
    currentZoomIdx = Math.max(0, Math.min(ZOOM_LEVELS.length - 1, currentZoomIdx + delta));
    const activeZoom = ZOOM_LEVELS[currentZoomIdx];
    
    const previewContainer = document.getElementById('rendered-preview');
    if (previewContainer) {
        previewContainer.style.fontSize = activeZoom.size;
    }
    
    const indicator = document.getElementById('zoom-value');
    if (indicator) {
        indicator.innerText = activeZoom.text;
    }
}

if (typeof speechSynthesis !== 'undefined' && speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices();
}

function switchCandidateTab(tabId) {
    document.querySelectorAll('.cand-tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
    });

    const suggestTab = document.getElementById('cand-tab-suggest');
    const customTab = document.getElementById('cand-tab-custom');

    if (tabId === 'suggest') {
        suggestTab.style.display = 'block';
        customTab.style.display = 'none';
    } else {
        suggestTab.style.display = 'none';
        customTab.style.display = 'block';
    }
}

// --- Global Window Bindings for ES Module Compatibility ---
window.toggleTheme = toggleTheme;
window.handleEditorInput = handleEditorInput;
window.clearEditor = clearEditor;
window.togglePresetDropdown = togglePresetDropdown;
window.selectPreset = selectPreset;
window.setPresentationMode = setPresentationMode;
window.togglePresentationDropdown = togglePresentationDropdown;
window.selectPresentationMode = selectPresentationMode;
window.toggleCorrectionMode = toggleCorrectionMode;
window.switchCandidateTab = switchCandidateTab;
window.applySpecialPresentation = applySpecialPresentation;
window.validateCustomInput = validateCustomInput;
window.applyCustomPhonetic = applyCustomPhonetic;
window.openExportModal = openExportModal;
window.closeExportModal = closeExportModal;
window.switchModalTab = switchModalTab;
window.copyModalCode = copyModalCode;
window.toggleTts = toggleTts;
window.stopTts = stopTts;
window.adjustZoom = adjustZoom;
window.deselectWord = deselectWord;
