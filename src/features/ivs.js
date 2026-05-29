import { BpmfEngine } from '../services/bpmf.js';
import { IvsEngine } from '../services/ivs.js';
import { IVS_FONT_MAP } from '../configs/path.js';

let currentFontFamily = 'BpmfHuninn';
let parsedTokens = [];
let selectedTokenIndex = null;
const VS_BASE = IvsEngine.VS_BASE;

export const IvsFeature = {
    getParsedTokens() {
        return parsedTokens;
    },

    getCurrentFont() {
        return currentFontFamily;
    },

    onActivate(ivsText) {
        // Apply currently selected IVS font
        const fontConf = IVS_FONT_MAP[currentFontFamily.toLowerCase().replace('bpmf', '')] || IVS_FONT_MAP.huninn;
        this.switchFont(fontConf.family, fontConf.path, fontConf.label, fontConf.size);

        selectedTokenIndex = null;
        parsedTokens = IvsEngine.parseIVSText(ivsText);
        this.render();
    },

    handleInput(ivsText) {
        // Contextually align variation selectors in typed text
        parsedTokens = IvsEngine.alignIVSText(ivsText);
        this.render();
        this.syncTextarea();
    },

    render() {
        this.renderInteractiveTokens();
        this.renderInspector();
        
        // Update character counter in main.js scope
        const chineseChars = parsedTokens.filter(t => {
            if (t === '\n') return false;
            const info = IvsEngine.getTokenInfo(t);
            return info.isChinese;
        }).length;
        document.getElementById('char-counter').innerText = `共 ${chineseChars} 字`;
    },

    syncTextarea() {
        const rawText = parsedTokens.join('');
        document.getElementById('main-editor').value = rawText;
        this.renderInspector();
    },

    renderInteractiveTokens() {
        const renderer = document.getElementById('live-renderer');
        renderer.innerHTML = '';
        renderer.className = 'rendered-preview-container';

        if (parsedTokens.length === 0) {
            renderer.innerHTML = `
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
            
            if (info.isChinese) {
                span.classList.add(info.type);
            }

            if (selectedTokenIndex === index) {
                span.classList.add('selected');
            }

            span.addEventListener('click', (e) => {
                e.stopPropagation();
                this.selectWord(index);
            });

            renderer.appendChild(span);
        });
    },

    selectWord(index) {
        selectedTokenIndex = index;
        
        // Highlight active token in previews
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

        // Show candidate drawers
        document.getElementById('candidate-empty-state').style.display = 'none';
        const sidebarActive = document.getElementById('candidate-active-state');
        sidebarActive.style.display = 'grid';
        
        document.getElementById('candidate-bar').classList.add('show-bottom-sheet');
        document.getElementById('bottom-sheet-backdrop').classList.add('active');

        // Render selected details
        const activeChar = document.getElementById('selected-char');
        activeChar.innerText = token;
        activeChar.style.fontFamily = currentFontFamily === 'System' ? "'Noto Sans TC', sans-serif" : `${currentFontFamily}, 'Noto Sans TC', sans-serif`;

        document.getElementById('selected-unicode').innerText = `U+${info.baseChar.codePointAt(0).toString(16).toUpperCase()}`;

        // Set state badge
        const badge = document.getElementById('selected-type-badge');
        badge.innerText = info.type.toUpperCase();
        badge.className = 'profile-type-badge polyphonic';

        // Load candidates list
        const standardSection = document.getElementById('cand-tab-suggest');
        const optionsContainer = document.getElementById('candidates-options-container');
        optionsContainer.innerHTML = '';
        
        const titleLabel = document.getElementById('poyin-title-label');

        if (info.hasPolyphonic && info.candidates) {
            titleLabel.querySelector('span').innerText = '讀音候選庫 (點擊即時更換)';
            
            info.candidates.forEach((candidate) => {
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
                        <span class="poyin-annotated" style="font-family: ${currentFontFamily === 'System' ? "'Noto Sans TC'" : currentFontFamily}, sans-serif">${optionToken}</span>
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
                    this.applyPronunciation(ivsIdx);
                });

                optionsContainer.appendChild(card);
            });
        } else {
            // Show standard IVS Probes
            titleLabel.querySelector('span').innerText = '通用 IVS 字形探針 (VS17 - VS26)';
            
            for (let i = 0; i < 10; i++) {
                const vsChar = String.fromCodePoint(VS_BASE + i);
                const probeToken = info.baseChar + vsChar;

                const card = document.createElement('div');
                const isActive = (info.vsIndex === i);
                card.className = `poyin-option-card ${isActive ? 'active' : ''}`;
                card.style.flex = '0 0 auto';
                card.style.width = 'max-content';

                const baseHex = info.baseChar.codePointAt(0).toString(16).toUpperCase();
                const vsHex = (VS_BASE + i).toString(16).toUpperCase();

                card.innerHTML = `
                    <div class="poyin-text">
                        <span class="poyin-index">VS${17 + i}</span>
                        <span class="poyin-annotated" style="font-family: ${currentFontFamily === 'System' ? "'Noto Sans TC'" : currentFontFamily}, sans-serif">${probeToken}</span>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 4px;">
                        <span style="font-size: 0.9rem; font-weight: 500;">變體探針 VS${17 + i}</span>
                        <div style="display: flex; gap: 4px; flex-wrap: wrap; margin-top: 2px;">
                            <span class="unicode-pill">U+${baseHex}</span>
                            <span class="unicode-pill" style="color: var(--accent-blue); border-color: rgba(0, 210, 255, 0.3);">U+${vsHex}</span>
                        </div>
                    </div>
                `;

                card.addEventListener('click', () => {
                    this.applyPronunciation(i);
                });

                optionsContainer.appendChild(card);
            }
        }

        // Mobile drawer sheet support
        if (window.innerWidth <= 768) {
            window.switchCandidateTab('suggest');
        }
    },

    deselectWord() {
        selectedTokenIndex = null;
        document.querySelectorAll('.render-token').forEach(t => t.classList.remove('selected'));
        document.querySelectorAll('.inspector-card').forEach(c => c.classList.remove('active'));
        
        document.getElementById('candidate-empty-state').style.display = 'flex';
        document.getElementById('candidate-active-state').style.display = 'none';
        document.getElementById('candidate-bar').classList.remove('show-bottom-sheet');
        document.getElementById('bottom-sheet-backdrop').classList.remove('active');
    },

    applyPronunciation(vsIdx) {
        if (selectedTokenIndex === null) return;
        
        const token = parsedTokens[selectedTokenIndex];
        const info = IvsEngine.getTokenInfo(token);
        const vsChar = vsIdx > 0 ? String.fromCodePoint(VS_BASE + vsIdx) : '';
        
        parsedTokens[selectedTokenIndex] = info.baseChar + vsChar;

        this.syncTextarea();
        this.renderInteractiveTokens();
        this.selectWord(selectedTokenIndex);
        window.showToast(`已套用 VS${17 + vsIdx} 變體字形`);
    },

    applySpecialAction(mode) {
        if (selectedTokenIndex === null) return;

        const token = parsedTokens[selectedTokenIndex];
        const info = IvsEngine.getTokenInfo(token);

        if (mode === 'blank') {
            parsedTokens[selectedTokenIndex] = info.baseChar + String.fromCodePoint(VS_BASE);
            window.showToast('已套用注音留白 (E01E0)');
        } else if (mode === 'brackets') {
            parsedTokens[selectedTokenIndex] = info.baseChar + String.fromCodePoint(VS_BASE) + String.fromCodePoint(0xF000);
            window.showToast('已套用注音填空');
        }

        this.syncTextarea();
        this.renderInteractiveTokens();
        this.selectWord(selectedTokenIndex);
    },

    async switchFont(fontName, fontUrl, displayName, size) {
        // Toggle active style on dropdown items
        const fontKey = fontName.toLowerCase().replace('bpmf', '');
        document.querySelectorAll('#font-dropdown-menu .dropdown-item').forEach(item => {
            if (item.getAttribute('data-font') === fontKey) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        // Sync dropdown label
        const mobileLabel = document.getElementById('font-mobile-trigger-label');
        if (mobileLabel) {
            mobileLabel.innerText = displayName;
        }

        if (fontName === 'System') {
            document.getElementById('live-renderer').style.fontFamily = "'Noto Sans TC', sans-serif";
            currentFontFamily = 'System';
            window.showToast('已切換至系統預設字型');
            this.render();
            return;
        }

        const overlay = document.getElementById('loading-overlay');
        overlay.classList.remove('fade-out');
        document.getElementById('loader-title').innerText = `載入 ${displayName} 中...`;
        document.getElementById('loader-subtitle').innerText = `正在本機載入字型檔案 (${size}) 並重新渲染...`;

        try {
            if (!document.fonts.check(`1em ${fontName}`)) {
                const fontFace = new FontFace(fontName, `url(${fontUrl})`);
                await fontFace.load();
                document.fonts.add(fontFace);
            }
            
            document.getElementById('live-renderer').style.fontFamily = `${fontName}, 'Noto Sans TC', sans-serif`;
            currentFontFamily = fontName;
            
            overlay.classList.add('fade-out');
            window.showToast(`字型載入成功！`);
            this.render();
        } catch (err) {
            console.error(err);
            document.getElementById('live-renderer').style.fontFamily = `${fontName}, 'Noto Sans TC', sans-serif`;
            currentFontFamily = fontName;
            
            setTimeout(() => {
                overlay.classList.add('fade-out');
                window.showToast(`已套用 ${displayName} 字型`);
                this.render();
            }, 800);
        }
    },

    renderInspector() {
        const container = document.getElementById('inspector-container');
        container.innerHTML = '';

        parsedTokens.forEach((token, index) => {
            if (token === '\n') return;

            const info = IvsEngine.getTokenInfo(token);
            const card = document.createElement('div');
            card.className = `inspector-card ${selectedTokenIndex === index ? 'active' : ''}`;
            card.id = `ins-card-${index}`;

            let badgeBg = 'rgba(255,255,255,0.05)';
            let badgeText = 'var(--text-muted)';
            if (info.type === 'polyphonic') {
                badgeBg = 'rgba(0, 210, 255, 0.1)';
                badgeText = 'var(--accent-blue)';
            } else if (info.type === 'modified') {
                badgeBg = 'rgba(0, 245, 212, 0.1)';
                badgeText = 'var(--accent-teal)';
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
                    <span class="inspector-char" style="font-family: ${currentFontFamily === 'System' ? "'Noto Sans TC'" : currentFontFamily}, sans-serif">${token}</span>
                    <span class="inspector-badge" style="background:${badgeBg}; color:${badgeText}">${info.type.toUpperCase()}</span>
                </div>
                <div class="inspector-hex-list">
                    <!-- Populated below -->
                </div>
            `;

            const hexList = card.querySelector('.inspector-hex-list');
            const parts = [...token];
            
            const baseUni = parts[0].codePointAt(0).toString(16).toUpperCase();
            hexList.innerHTML += `
                <div class="inspector-hex-item">
                    <span class="hex-desc">字元:</span>
                    <span class="hex-value">U+${baseUni}</span>
                </div>
            `;

            if (parts.length > 1) {
                const vsUni = parts[1].codePointAt(0).toString(16).toUpperCase();
                hexList.innerHTML += `
                    <div class="inspector-hex-item">
                        <span class="hex-desc">IVS:</span>
                        <span class="hex-value" style="color: var(--accent-blue)">U+${vsUni}</span>
                    </div>
                `;
            }

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
                this.selectWord(index);
                const editorSpan = document.querySelector(`.render-token[data-index="${index}"]`);
                if (editorSpan) {
                    editorSpan.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            });

            container.appendChild(card);
        });
    },

    copyIVSText() {
        const rawText = parsedTokens.join('');
        if (!rawText) {
            window.showToast('無任何文字可供複製！');
            return;
        }

        navigator.clipboard.writeText(rawText).then(() => {
            window.showToast('已將 IVS 字元串流複製到剪貼簿！📋');
        }).catch(err => {
            console.error(err);
            window.showToast('複製失敗，請手動全選複製。');
        });
    },

    openInspectorModal() {
        document.getElementById('inspector-modal').style.display = 'flex';
        this.renderInspector();
    },

    closeInspectorModal() {
        document.getElementById('inspector-modal').style.display = 'none';
    },

    buildTtsData() {
        let plainText = '';
        const charMap = [];
        
        for (let i = 0; i < parsedTokens.length; i++) {
            const token = parsedTokens[i];
            if (token === '\n') {
                plainText += '，'; // Pause
                charMap.push(i);
                continue;
            }
            
            const info = IvsEngine.getTokenInfo(token);
            if (info.isChinese) {
                plainText += info.baseChar;
                charMap.push(i);
            } else {
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
            return { textToRead: null, charMap: null };
        }
        return { textToRead: plainText, charMap: charMap };
    }
};
