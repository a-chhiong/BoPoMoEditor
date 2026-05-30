import { BpmfEngine } from '../../services/bpmf.js';
import { IvsEngine } from '../../services/ivs.js';
import { TtsEngine } from '../../services/tts.js';
import { PATHS, IVS_FONT_MAP } from '../../configs/path.js';
import { ManualOverrides } from '../../util/manual-overrides.js';
import { PRESETS } from '../../configs/static.js';
import { cachedFetch } from '../../util/cache-handler.js';

export class FeatureController {
  constructor(host) {
    this.host = host;
    host.addController(this);
  }

  async initializeApp() {
    // Wait for the host and components to complete initial updating
    await this.host.updateComplete;

    const editorPanel = this.host.querySelector('editor-panel');
    const previewPanel = this.host.querySelector('preview-panel');
    const previewRenderer = this.host.querySelector('preview-renderer');

    if (editorPanel) await editorPanel.updateComplete;
    if (previewPanel) await previewPanel.updateComplete;
    if (previewRenderer) await previewRenderer.updateComplete;

    const fontWeights = {
      [PATHS.ASSETS.DICT_FILE]: 7040947,
      [PATHS.ASSETS.PHONIC_TABLE_Z]: 432636,
      [PATHS.FONTS.RUBY]: 3745000,
      [PATHS.FONTS.HUNINN]: 4800000,
      [PATHS.FONTS.IANSUI]: 7700000,
      [PATHS.FONTS.ZIHIKAI]: 17500000
    };

    this.downloads = {};
    this.host.overlayProgress = 0;

    // Register downloads we plan to perform
    this.downloads[PATHS.ASSETS.DICT_FILE] = { loaded: 0, total: fontWeights[PATHS.ASSETS.DICT_FILE] };
    this.downloads[PATHS.ASSETS.PHONIC_TABLE_Z] = { loaded: 0, total: fontWeights[PATHS.ASSETS.PHONIC_TABLE_Z] };

    if (!document.fonts.check("1em 'BopomofoRuby'")) {
      this.downloads[PATHS.FONTS.RUBY] = { loaded: 0, total: fontWeights[PATHS.FONTS.RUBY] };
    }
    Object.values(IVS_FONT_MAP)
      .filter((f) => f.family !== 'System')
      .forEach((f) => {
        if (!document.fonts.check(`1em ${f.family}`)) {
          this.downloads[f.path] = { loaded: 0, total: fontWeights[f.path] };
        }
      });

    try {
      this.host.overlayTitle = '載入教育部國語字典中...';
      this.host.overlaySubtitle = '正在即時解析教育部國語辭典簡編本...';
      this.host.overlayVisible = true;

      await BpmfEngine.init(undefined, {
        onProgress: (loaded, total) => this.updateDownloadProgress(PATHS.ASSETS.DICT_FILE, loaded, total)
      });

      this.host.overlayTitle = '載入排版字型中...';
      this.host.overlaySubtitle = '正在預載專用注音字型，這可能需要一點時間...';

      const ivsMapPromise = IvsEngine.loadIVSMap({
        onProgress: (loaded, total) => this.updateDownloadProgress(PATHS.ASSETS.PHONIC_TABLE_Z, loaded, total)
      }).catch(() => { });

      const fontPromises = [];

      const loadFont = async (family, path, label) => {
        try {
          const res = await cachedFetch(path, {
            onProgress: (loaded, total) => this.updateDownloadProgress(path, loaded, total)
          });
          const buf = await res.arrayBuffer();
          const fontFace = new FontFace(family, buf);
          document.fonts.add(fontFace);
          await fontFace.load();
        } catch (e) {
          console.warn(`${label || family} preload failed:`, e);
        }
      };

      if (!document.fonts.check("1em 'BopomofoRuby'")) {
        fontPromises.push(loadFont('BopomofoRuby', PATHS.FONTS.RUBY, 'Ruby font'));
      }

      Object.values(IVS_FONT_MAP)
        .filter((f) => f.family !== 'System')
        .forEach((f) => {
          if (!document.fonts.check(`1em ${f.family}`)) {
            fontPromises.push(loadFont(f.family, f.path, f.label));
          }
        });

      await Promise.all([...fontPromises, ivsMapPromise]);
    } catch (error) {
      console.error('Failed to initialize BoPoMo editor:', error);
    } finally {
      this.host.overlayVisible = false;
      document.body.classList.toggle('app-mode-bpmf', this.host.currentMode === 'bpmf');
      document.body.classList.toggle('app-mode-ivs', this.host.currentMode === 'ivs');

      this.handleEditorInput(this.host.currentText);
    }

    TtsEngine.init({
      onStateChange: (state) => {
        this.host.ttsState = state;
        if (state === 'stopped') {
          this.host.clearTtsTokenHighlights();
        }
      },
      onHighlight: (tokenIdx) => {
        this.host.ttsActiveTokenIndex = tokenIdx;
      },
      onClearHighlight: () => {
        this.host.clearTtsTokenHighlights();
      }
    });
  }

  handleEditorInput(rawText) {
    const text = rawText || '';
    this.host.currentText = text;

    if (this.host.currentMode === 'bpmf') {
      const overrides = ManualOverrides.get();
      const tokens = BpmfEngine.tokenize(text, overrides);

      // Sync back custom tags found in text into main overrides
      tokens.forEach((token, idx) => {
        if (token.type === 'chinese' && token.isCustom) {
          const key = this.getBpmfOccurrenceKey(tokens, idx);
          overrides[key] = {
            zhuyin: token.zhuyin,
            pinyin: token.pinyin,
            special: token.special
          };
        }
      });

      this.host.parsedTokens = tokens;
      this.host.charCount = tokens.filter(t => t.type === 'chinese').length;
    } else {
      const alignedList = IvsEngine.alignIVSText(text);
      const ivsText = alignedList.join('');
      this.host.parsedTokens = alignedList;
      this.host.currentText = ivsText;

      this.host.charCount = alignedList.filter(t => {
        if (t === '\n') return false;
        const info = IvsEngine.getTokenInfo(t);
        return info.isChinese;
      }).length;
    }
  }

  switchAppMode(mode) {
    if (this.host.currentMode === mode) {
      return;
    }

    this.stopTts();
    this.deselectWord();

    const currentVal = this.host.currentText;

    if (mode === 'ivs') {
      const alignedList = IvsEngine.alignIVSText(currentVal, ManualOverrides.get());
      const ivsText = alignedList.join('');
      this.host.currentText = ivsText;
      this.host.parsedTokens = alignedList;
      this.host.currentMode = 'ivs';

      document.body.classList.remove('app-mode-bpmf');
      document.body.classList.add('app-mode-ivs');

      this.host.charCount = alignedList.filter(t => {
        if (t === '\n') return false;
        const info = IvsEngine.getTokenInfo(t);
        return info.isChinese;
      }).length;

      // Apply currently selected IVS font
      const fontConf = IVS_FONT_MAP[this.host.currentFontFamily.toLowerCase().replace('bpmf', '')] || IVS_FONT_MAP.huninn;
      this.switchFont(fontConf.family, fontConf.path, fontConf.label, fontConf.size);

      this.host.showToast('已切換至字型模式');
    } else {
      const tokens = IvsEngine.parseIVSText(currentVal);
      let plainText = '';
      const occurrenceCounts = {};
      const newOverrides = {};

      tokens.forEach((t) => {
        const info = IvsEngine.getTokenInfo(t);
        const char = info.baseChar;
        plainText += char;

        if (info.isChinese) {
          const occur = occurrenceCounts[char] || 0;
          occurrenceCounts[char] = occur + 1;
          const key = `${char}_${occur}`;

          if (info.type === 'modified' && info.vsIndex !== null) {
            const match = info.candidates.find((c) => c.ivsIndex === info.vsIndex);
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

      this.host.currentText = plainText;
      ManualOverrides.set(newOverrides);
      this.host.currentMode = 'bpmf';

      document.body.classList.remove('app-mode-ivs');
      document.body.classList.add('app-mode-bpmf');

      const parsedBpmfTokens = BpmfEngine.tokenize(plainText, newOverrides);
      this.host.parsedTokens = parsedBpmfTokens;
      this.host.charCount = parsedBpmfTokens.filter(t => t.type === 'chinese').length;

      this.host.showToast('已切換至旁註模式');
    }
  }

  selectPreset(key) {
    this.stopTts();
    this.deselectWord();
    this.host.currentText = PRESETS[key];

    if (this.host.currentMode === 'bpmf') {
      ManualOverrides.clear();
      this.handleEditorInput(this.host.currentText);
    } else {
      this.handleEditorInput(this.host.currentText);
    }

    this.host.dropdownController.closeAll();
    this.host.showToast('已成功載入教材範例！');
  }

  clearEditor() {
    this.stopTts();
    this.deselectWord();
    this.host.currentText = '';
    ManualOverrides.clear();
    this.handleEditorInput('');
    this.host.showToast('編輯器已清空 🧹');
  }

  deselectWord() {
    this.host.selectedTokenIndex = null;
    this.host.candidateBarActive = false;
  }

  selectWord(index) {
    this.host.selectedTokenIndex = index;
    this.host.candidateBarActive = true;

    if (this.host.currentMode === 'bpmf') {
      const tokenObj = this.host.parsedTokens[index];
      this.host.activeChar = tokenObj.char;
      this.host.activeUnicode = `U+${tokenObj.char.codePointAt(0).toString(16).toUpperCase()}`;

      const candidates = BpmfEngine.getCandidates(tokenObj.char);
      const isPoly = candidates.length > 1;
      this.host.activeType = isPoly ? '多音字' : '常用字';
      this.host.activeTypeClass = isPoly ? 'polyphonic' : '';
      this.host.candidates = candidates;
      this.host.activeZhuyin = tokenObj.zhuyin || '';
      this.host.activePinyin = tokenObj.pinyin || '';

      this.host.customZhuyin = tokenObj.zhuyin || '';
      this.host.customPinyin = tokenObj.pinyin || '';
      this.host.applyCustomDisabled = !(this.host.customZhuyin.trim().length > 0 && this.host.customPinyin.trim().length > 0);
    } else {
      const token = this.host.parsedTokens[index];
      const info = IvsEngine.getTokenInfo(token);
      this.host.activeChar = info.baseChar;
      this.host.activeUnicode = `U+${info.baseChar.codePointAt(0).toString(16).toUpperCase()}`;
      this.host.activeType = info.type.toUpperCase();
      this.host.activeTypeClass = 'polyphonic';
      this.host.activeIvsIndex = info.vsIndex;

      this.host.candidates = info.candidates || [];
      this.host.activeIvsType = info.type;
    }
  }

  applyPhoneticSelection(zhuyin, pinyin) {
    if (this.host.selectedTokenIndex === null) return;

    const index = this.host.selectedTokenIndex;
    const tokens = [...this.host.parsedTokens];
    const tokenObj = { ...tokens[index] };

    tokenObj.zhuyin = zhuyin;
    tokenObj.pinyin = pinyin;
    tokenObj.special = null;
    tokenObj.isCustom = true;
    tokens[index] = tokenObj;
    this.host.parsedTokens = tokens;

    const key = this.getBpmfOccurrenceKey(tokens, index);
    ManualOverrides.update(key, {
      zhuyin: zhuyin,
      pinyin: pinyin,
      special: null
    });

    this.selectWord(index);
    this.host.showToast(`成功更換讀音為 ${zhuyin} (${pinyin})`);
  }

  applyPronunciation(vsIdx) {
    if (this.host.selectedTokenIndex === null) return;

    const index = this.host.selectedTokenIndex;
    const tokens = [...this.host.parsedTokens];
    const token = tokens[index];
    const info = IvsEngine.getTokenInfo(token);
    const vsChar = vsIdx > 0 ? String.fromCodePoint(IvsEngine.VS_BASE + vsIdx) : '';

    tokens[index] = info.baseChar + vsChar;
    this.host.parsedTokens = tokens;

    this.host.currentText = tokens.join('');
    this.selectWord(index);
    this.host.showToast(`已套用 VS${17 + vsIdx} 變體字形`);
  }

  applySpecialAction(mode) {
    if (this.host.selectedTokenIndex === null) return;

    const index = this.host.selectedTokenIndex;
    if (this.host.currentMode === 'bpmf') {
      const tokens = [...this.host.parsedTokens];
      const tokenObj = { ...tokens[index] };

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
      tokens[index] = tokenObj;
      this.host.parsedTokens = tokens;

      const key = this.getBpmfOccurrenceKey(tokens, index);
      ManualOverrides.update(key, {
        zhuyin: tokenObj.zhuyin,
        pinyin: tokenObj.pinyin,
        special: tokenObj.special
      });

      this.selectWord(index);
      this.host.showToast(mode === 'blank' ? '已套用注音留白' : '已套用注音填空');
    } else {
      const tokens = [...this.host.parsedTokens];
      const token = tokens[index];
      const info = IvsEngine.getTokenInfo(token);

      if (mode === 'blank') {
        tokens[index] = info.baseChar + String.fromCodePoint(IvsEngine.VS_BASE);
        this.host.showToast('已套用注音留白 (E01E0)');
      } else if (mode === 'brackets') {
        tokens[index] = info.baseChar + String.fromCodePoint(IvsEngine.VS_BASE) + String.fromCodePoint(0xF000);
        this.host.showToast('已套用注音填空');
      }

      this.host.parsedTokens = tokens;
      this.host.currentText = tokens.join('');
      this.selectWord(index);
    }
  }

  validateCustomInput(zhuyin, pinyin) {
    this.host.customZhuyin = zhuyin;
    this.host.customPinyin = pinyin;
    this.host.applyCustomDisabled = !(zhuyin.trim().length > 0 && pinyin.trim().length > 0);
  }

  applyCustomPhonetic() {
    if (this.host.selectedTokenIndex === null) return;

    const index = this.host.selectedTokenIndex;
    const tokens = [...this.host.parsedTokens];
    const tokenObj = { ...tokens[index] };

    const zVal = this.host.customZhuyin.trim();
    const pVal = this.host.customPinyin.trim();

    tokenObj.zhuyin = zVal;
    tokenObj.pinyin = pVal;
    tokenObj.special = null;
    tokenObj.isCustom = true;
    tokens[index] = tokenObj;
    this.host.parsedTokens = tokens;

    const key = this.getBpmfOccurrenceKey(tokens, index);
    ManualOverrides.update(key, {
      zhuyin: zVal,
      pinyin: pVal,
      special: null
    });

    this.selectWord(index);
    this.host.showToast(`成功套用自訂音標：${zVal} (${pVal})`);
  }

  setPresentationMode(mode) {
    this.host.presentationMode = mode;
    const MAP = {
      'mode-zhu': '中 + 注音',
      'mode-pin': '中 + 拼音',
      'mode-zhu-only': '僅注音',
      'mode-pin-only': '僅拼音',
      'mode-han-only': '僅中文'
    };
    this.host.showToast(`切換顯示格式：${MAP[mode] || mode}`);
  }

  openExportModal() {
    this.host.exportModalOpen = true;

    // 1. Generate HTML Code
    let htmlCode = `<div class="mode-zhu">\n`;
    this.host.parsedTokens.forEach((t) => {
      if (t.type === 'other') {
        if (t.char === '\n') htmlCode += `<br>\n`;
        else htmlCode += t.char;
      } else {
        htmlCode += `  <bpmf zhuyin="${t.zhuyin || ''}" pinyin="${t.pinyin || ''}">${t.char}</bpmf>\n`;
      }
    });
    htmlCode += `</div>`;
    this.host.exportHtmlCode = htmlCode;

    // 2. Fetch CSS
    this.host.exportCssCode = '載入中...';
    cachedFetch(PATHS.ASSETS.BPMF_CSS_EXPORT)
      .then(res => {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.text();
      })
      .then(text => {
        this.host.exportCssCode = text.trim();
      })
      .catch(err => {
        console.error(err);
        this.host.exportCssCode = '/* 無法載入樣式表 */';
      });

    this.host.exportModalTab = 'html';
  }

  closeExportModal() {
    this.host.exportModalOpen = false;
  }

  switchModalTab(tabId) {
    this.host.exportModalTab = tabId.split('-')[1];
  }

  copyModalCode() {
    const textToCopy = this.host.exportModalTab === 'html' ? this.host.exportHtmlCode : this.host.exportCssCode;

    navigator.clipboard.writeText(textToCopy).then(() => {
      this.host.copySuccess = true;
      setTimeout(() => {
        this.host.copySuccess = false;
      }, 1500);
    }).catch(err => {
      console.error(err);
      this.host.showToast('複製失敗，請手動複製');
    });
  }

  switchFontFromSelect(fontKey) {
    const fontConfig = IVS_FONT_MAP[fontKey];
    if (fontConfig) {
      this.switchFont(fontConfig.family, fontConfig.path, fontConfig.label, fontConfig.size);
    }
  }

  async switchFont(fontName, fontUrl, displayName, size) {
    this.host.currentFontFamily = fontName;

    if (fontName === 'System') {
      this.host.showToast('已切換至系統預設字型');
      return;
    }

    const fontWeights = {
      [PATHS.FONTS.RUBY]: 3745000,
      [PATHS.FONTS.HUNINN]: 4800000,
      [PATHS.FONTS.IANSUI]: 7700000,
      [PATHS.FONTS.ZIHIKAI]: 17500000
    };

    this.downloads = {};
    this.host.overlayProgress = 0;
    this.downloads[fontUrl] = { loaded: 0, total: fontWeights[fontUrl] || 1000000 };

    this.host.overlayTitle = `載入 ${displayName} 中...`;
    this.host.overlaySubtitle = `正在本機載入字型檔案 (${size}) 並重新渲染...`;
    this.host.overlayVisible = true;

    try {
      if (!document.fonts.check(`1em ${fontName}`)) {
        const res = await cachedFetch(fontUrl, {
          onProgress: (loaded, total) => this.updateDownloadProgress(fontUrl, loaded, total)
        });
        const buf = await res.arrayBuffer();
        const fontFace = new FontFace(fontName, buf);
        document.fonts.add(fontFace);
        await fontFace.load();
      }
      this.host.showToast(`字型載入成功！`);
    } catch (err) {
      console.error(err);
      this.host.showToast(`已套用 ${displayName} 字型`);
    } finally {
      this.host.overlayVisible = false;
    }
  }

  updateDownloadProgress(url, loaded, total) {
    if (!this.downloads) {
      this.downloads = {};
    }
    this.downloads[url] = { loaded, total: total || 1000000 };

    let totalBytes = 0;
    let loadedBytes = 0;
    for (const d of Object.values(this.downloads)) {
      totalBytes += d.total;
      loadedBytes += d.loaded;
    }

    const percentage = totalBytes > 0 ? Math.round((loadedBytes / totalBytes) * 100) : 0;
    this.host.overlayProgress = Math.min(100, Math.max(0, percentage));
  }

  openInspectorModal() {
    this.host.inspectorModalOpen = true;
  }

  closeInspectorModal() {
    this.host.inspectorModalOpen = false;
  }

  copyIVSText() {
    const rawText = this.host.parsedTokens.join('');
    if (!rawText) {
      this.host.showToast('無任何文字可供複製！');
      return;
    }

    navigator.clipboard.writeText(rawText).then(() => {
      this.host.showToast('已將 IVS 字元串流複製到剪貼簿！📋');
    }).catch(err => {
      console.error(err);
      this.host.showToast('複製失敗，請手動全選複製。');
    });
  }

  toggleTts() {
    const success = TtsEngine.toggle(this.buildTtsTarget.bind(this));
    if (success === false) {
      this.host.showToast('您的瀏覽器不支援語音合成功能');
    } else {
      if (TtsEngine.state === 'playing') {
        this.host.showToast('開始語音朗讀 🔊');
      } else if (TtsEngine.state === 'paused') {
        this.host.showToast('語音播放已暫停 ⏸️');
      }
    }
  }

  stopTts() {
    TtsEngine.stop();
    this.host.showToast('語音朗讀已停止 ⏹️');
  }

  buildTtsTarget() {
    if (this.host.currentMode === 'bpmf') {
      return this.buildBpmfTtsData();
    }
    return this.buildIvsTtsData();
  }

  buildBpmfTtsData() {
    let plainText = '';
    const charMap = [];

    this.host.parsedTokens.forEach((t, tokenIdx) => {
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
  }

  buildIvsTtsData() {
    let plainText = '';
    const charMap = [];

    for (let i = 0; i < this.host.parsedTokens.length; i++) {
      const token = this.host.parsedTokens[i];
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

  getBpmfOccurrenceKey(tokensList, targetIndex) {
    const char = tokensList[targetIndex].char;
    let occurrence = 0;
    for (let i = 0; i < targetIndex; i++) {
      if (tokensList[i].char === char) {
        occurrence++;
      }
    }
    return `${char}_${occurrence}`;
  }
}
