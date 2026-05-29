import { BpmfEngine } from '../services/bpmf.js';
import { PATHS } from '../configs/path.js';

let parsedTokens = [];
let selectedTokenIndex = null;
let presentationMode = 'mode-zhu';

// Preset values exported for main.js
export const PRESETS = {
    'preset-poyin': '我們在溫暖的陽光下散步，感覺非常暖和。小明和同學正在和牌，大家玩得十分和諧。這項技術能把攪和、暖和與和牌完美融合在和諧之中，銀行行員也非常在行！我們重溫音樂時感到了無比快樂，著手著陸時卻很著急。',
    'preset-poem': '《靜夜思》 李白\n床前明月光，疑是地上霜。\n舉頭望明月，低頭思故鄉。',
    'preset-baidi': '《早發白帝城》 李白\n朝辭白帝彩雲間，千里江陵一日還。\n兩岸猿聲啼不住，輕舟已過萬重山。',
    'preset-tw': '火金姑，來食茶。\n茶燒燒，配香蕉。\n香蕉冷冷，配龍眼。\n龍眼糖糖，配麻糬。'
};

export const BpmfFeature = {
    getParsedTokens() {
        return parsedTokens;
    },

    onActivate(plainText, overrides) {
        window.activeFont = 'BopomofoRuby';
        
        // Clear inline font-family style (set by IVS mode) so CSS takes over
        const previewContainer = document.getElementById('live-renderer');
        if (previewContainer) {
            previewContainer.style.fontFamily = '';
        }
        
        // Reset selected index
        selectedTokenIndex = null;
        this.render(plainText, overrides);
    },

    handleInput(plainText, overrides) {
        this.render(plainText, overrides);
    },

    render(plainText, overrides) {
        const rawText = plainText || '';
        
        // Tokenize plain text contextually
        parsedTokens = BpmfEngine.tokenize(rawText, overrides);

        // Sync back custom tags found in text into main overrides
        parsedTokens.forEach((token, idx) => {
            if (token.type === 'chinese' && token.isCustom) {
                const key = this.getOccurrenceKey(parsedTokens, idx);
                overrides[key] = {
                    zhuyin: token.zhuyin,
                    pinyin: token.pinyin,
                    special: token.special
                };
            }
        });

        // Update character counter in main.js scope
        const totalChars = parsedTokens.filter(t => t.type === 'chinese').length;
        document.getElementById('char-counter').innerText = `共 ${totalChars} 字`;

        this.renderPreview();
    },

    renderPreview() {
        const previewContainer = document.getElementById('live-renderer');
        previewContainer.style.fontFamily = ''; // Clear inline font-family to let CSS take over
        previewContainer.innerHTML = '';
        previewContainer.className = `rendered-preview-container ${presentationMode} correction-enabled`;

        if (parsedTokens.length === 0) {
            previewContainer.innerHTML = `
                <div class="empty-preview-placeholder">
                    <svg viewBox="0 0 100 100" class="placeholder-svg watermark-svg">
                        <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="3,3" />
                        <text x="50" y="58" dominant-baseline="middle" text-anchor="middle" font-family="'Noto Sans TC', sans-serif" font-weight="900" font-size="44" fill="currentColor">ㄅ</text>
                    </svg>
                    <p class="placeholder-desc">請在左側輸入框輸入中文字。</p>
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

            const bpmfSpan = document.createElement('bpmf');
            bpmfSpan.innerText = tokenObj.char;
            bpmfSpan.setAttribute('zhuyin', tokenObj.zhuyin || '');
            bpmfSpan.setAttribute('pinyin', tokenObj.pinyin || '');
            bpmfSpan.setAttribute('data-idx', idx);

            const candidates = BpmfEngine.getCandidates(tokenObj.char);
            const isPoly = candidates.length > 1;

            if (tokenObj.special) {
                bpmfSpan.classList.add(tokenObj.special);
            } else {
                if (tokenObj.isCustom) bpmfSpan.classList.add('custom-modified');
                else if (isPoly) bpmfSpan.classList.add('polyphonic');
            }

            if (selectedTokenIndex === idx) bpmfSpan.classList.add('selected');

            bpmfSpan.addEventListener('click', (e) => {
                e.stopPropagation();
                this.selectWord(idx);
            });

            previewContainer.appendChild(bpmfSpan);
        });
    },

    selectWord(idx) {
        selectedTokenIndex = idx;

        // Highlight selected
        document.querySelectorAll('bpmf').forEach((b) => {
            const tokenIdx = parseInt(b.getAttribute('data-idx'));
            if (tokenIdx === idx) b.classList.add('selected');
            else b.classList.remove('selected');
        });

        const tokenObj = parsedTokens[idx];

        // Toggle candidate drawers
        document.getElementById('candidate-empty-state').style.display = 'none';
        document.getElementById('candidate-active-state').style.display = 'grid';
        document.getElementById('candidate-bar').classList.add('show-bottom-sheet');
        document.getElementById('bottom-sheet-backdrop').classList.add('active');

        // Render selected details
        document.getElementById('selected-char').innerText = tokenObj.char;
        document.getElementById('selected-unicode').innerText = `U+${tokenObj.char.codePointAt(0).toString(16).toUpperCase()}`;

        // Set type badge
        const candidates = BpmfEngine.getCandidates(tokenObj.char);
        const isPoly = candidates.length > 1;
        const typeBadge = document.getElementById('selected-type-badge');
        typeBadge.innerText = isPoly ? '多音字' : '常用字';
        typeBadge.className = isPoly ? 'profile-type-badge polyphonic' : 'profile-type-badge';

        // Load standard candidates
        this.populatePhoneticCandidates(tokenObj.char, tokenObj.zhuyin);

        // Load custom assembly inputs
        document.getElementById('custom-zhuyin-input').value = tokenObj.zhuyin || '';
        document.getElementById('custom-pinyin-input').value = tokenObj.pinyin || '';
        this.validateCustomInput();

        // Mobile drawer sheet support
        if (window.innerWidth <= 768) {
            window.switchCandidateTab('suggest');
        }
    },

    deselectWord() {
        selectedTokenIndex = null;
        document.querySelectorAll('bpmf').forEach(b => b.classList.remove('selected'));

        document.getElementById('candidate-empty-state').style.display = 'flex';
        document.getElementById('candidate-active-state').style.display = 'none';
        document.getElementById('candidate-bar').classList.remove('show-bottom-sheet');
        document.getElementById('bottom-sheet-backdrop').classList.remove('active');
    },

    populatePhoneticCandidates(char, activeZhuyin) {
        const container = document.getElementById('candidates-options-container');
        container.innerHTML = '';

        const candidates = BpmfEngine.getCandidates(char);
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
                this.applyPhoneticSelection(cand.zhuyin, cand.pinyin);
            });

            container.appendChild(btn);
        });
    },

    applyPhoneticSelection(zhuyin, pinyin) {
        if (selectedTokenIndex === null) return;

        const tokenObj = parsedTokens[selectedTokenIndex];
        tokenObj.zhuyin = zhuyin;
        tokenObj.pinyin = pinyin;
        tokenObj.special = null;
        tokenObj.isCustom = true;

        const key = this.getOccurrenceKey(parsedTokens, selectedTokenIndex);
        window.manualOverrides[key] = {
            zhuyin: zhuyin,
            pinyin: pinyin,
            special: null
        };

        this.renderPreview();
        this.selectWord(selectedTokenIndex);
        window.showToast(`成功更換讀音為 ${zhuyin} (${pinyin})`);
    },

    applySpecialAction(mode) {
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

        const key = this.getOccurrenceKey(parsedTokens, selectedTokenIndex);
        window.manualOverrides[key] = {
            zhuyin: tokenObj.zhuyin,
            pinyin: tokenObj.pinyin,
            special: tokenObj.special
        };

        this.renderPreview();
        this.selectWord(selectedTokenIndex);
        window.showToast(mode === 'blank' ? '已套用注音留白' : '已套用注音填空');
    },

    validateCustomInput() {
        const zVal = document.getElementById('custom-zhuyin-input').value.trim();
        const pVal = document.getElementById('custom-pinyin-input').value.trim();
        const btn = document.getElementById('btn-apply-custom');

        if (zVal.length > 0 && pVal.length > 0) {
            btn.disabled = false;
        } else {
            btn.disabled = true;
        }
    },

    applyCustomPhonetic() {
        if (selectedTokenIndex === null) return;

        const zVal = document.getElementById('custom-zhuyin-input').value.trim();
        const pVal = document.getElementById('custom-pinyin-input').value.trim();

        const tokenObj = parsedTokens[selectedTokenIndex];
        tokenObj.zhuyin = zVal;
        tokenObj.pinyin = pVal;
        tokenObj.special = null;
        tokenObj.isCustom = true;

        const key = this.getOccurrenceKey(parsedTokens, selectedTokenIndex);
        window.manualOverrides[key] = {
            zhuyin: zVal,
            pinyin: pVal,
            special: null
        };

        this.renderPreview();
        this.selectWord(selectedTokenIndex);
        window.showToast(`成功套用自訂音標：${zVal} (${pVal})`);
    },

    setPresentationMode(mode) {
        presentationMode = mode;

        document.querySelectorAll('#presentation-dropdown-menu .dropdown-item').forEach(item => {
            if (item.getAttribute('data-mode') === mode) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        const MAP = {
            'mode-zhu': '中 + 注音',
            'mode-pin': '中 + 拼音',
            'mode-zhu-only': '僅注音',
            'mode-pin-only': '僅拼音',
            'mode-han-only': '僅中文'
        };

        const mobileLabel = document.getElementById('presentation-mobile-trigger-label');
        if (mobileLabel) {
            mobileLabel.innerText = MAP[mode] || mode;
        }

        this.renderPreview();
        const modeLabel = MAP[mode] || mode;
        window.showToast(`切換顯示格式：${modeLabel}`);
    },

    togglePresentationDropdown(event) {
        event.stopPropagation();
        const menu = document.getElementById('presentation-dropdown-menu');
        const trigger = document.getElementById('presentation-dropdown-trigger');
        if (menu) {
            const isShown = menu.classList.contains('show');
            menu.classList.toggle('show', !isShown);
            trigger.classList.toggle('open', !isShown);
        }
    },

    selectPresentationMode(mode) {
        this.setPresentationMode(mode);
        const menu = document.getElementById('presentation-dropdown-menu');
        const trigger = document.getElementById('presentation-dropdown-trigger');
        if (menu) {
            menu.classList.remove('show');
            trigger.classList.remove('open');
        }
    },

    openExportModal() {
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

        // 2. Fetch CSS
        document.getElementById('export-css-code').value = '載入中...';
        fetch(PATHS.ASSETS.BPMF_CSS_EXPORT)
            .then(res => {
                if (!res.ok) throw new Error('HTTP ' + res.status);
                return res.text();
            })
            .then(text => {
                document.getElementById('export-css-code').value = text.trim();
            })
            .catch(err => {
                console.error(err);
                document.getElementById('export-css-code').value = '/* 無法載入樣式表 */';
            });

        this.switchModalTab('tab-html');
    },

    closeExportModal() {
        document.getElementById('export-modal').style.display = 'none';
    },

    switchModalTab(tabId) {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.getElementById(`tab-btn-${tabId.split('-')[1]}`).classList.add('active');

        document.querySelectorAll('.tab-content').forEach(c => {
            c.style.display = 'none';
        });
        document.getElementById(tabId).style.display = 'block';
    },

    copyModalCode() {
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
            console.error(err);
            window.showToast('複製失敗，請手動複製');
        });
    },

    buildTtsData() {
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
            return { textToRead: null, charMap: null };
        }
        return { textToRead: plainText, charMap };
    },

    getOccurrenceKey(tokensList, targetIndex) {
        const char = tokensList[targetIndex].char;
        let occurrence = 0;
        for (let i = 0; i < targetIndex; i++) {
            if (tokensList[i].char === char) {
                occurrence++;
            }
        }
        return `${char}_${occurrence}`;
    }
};
