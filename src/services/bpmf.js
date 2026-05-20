/* ==========================================================================
   Bopomofo & Pinyin Core Phonetic Mapping & Conversion Engine
   Wrapped as a reusable ES6 Export Class
   ========================================================================== */

import { MoeDictionary } from './dict.js';

export class BpmfEngine {
    // Accented vowel mappings for tone extraction/placement
    static TONE_MAP = {
        'ā': { char: 'a', tone: 1 }, 'á': { char: 'a', tone: 2 }, 'ǎ': { char: 'a', tone: 3 }, 'à': { char: 'a', tone: 4 },
        'ē': { char: 'e', tone: 1 }, 'é': { char: 'e', tone: 2 }, 'ě': { char: 'e', tone: 3 }, 'è': { char: 'e', tone: 4 },
        'ī': { char: 'i', tone: 1 }, 'í': { char: 'i', tone: 2 }, 'ǐ': { char: 'i', tone: 3 }, 'ì': { char: 'i', tone: 4 },
        'ō': { char: 'o', tone: 1 }, 'ó': { char: 'o', tone: 2 }, 'ǒ': { char: 'o', tone: 3 }, 'ò': { char: 'o', tone: 4 },
        'ū': { char: 'u', tone: 1 }, 'ú': { char: 'u', tone: 2 }, 'ǔ': { char: 'u', tone: 3 }, 'ù': { char: 'u', tone: 4 },
        'ǖ': { char: 'ü', tone: 1 }, 'ǘ': { char: 'ü', tone: 2 }, 'ǚ': { char: 'ü', tone: 3 }, 'ǜ': { char: 'ü', tone: 4 },
        'Ā': { char: 'a', tone: 1 }, 'Á': { char: 'a', tone: 2 }, 'Ǎ': { char: 'a', tone: 3 }, 'À': { char: 'a', tone: 4 },
        'Ē': { char: 'e', tone: 1 }, 'É': { char: 'e', tone: 2 }, 'Ě': { char: 'e', tone: 3 }, 'È': { char: 'e', tone: 4 },
        'Ī': { char: 'i', tone: 1 }, 'Í': { char: 'i', tone: 2 }, 'Ǐ': { char: 'i', tone: 3 }, 'Ì': { char: 'i', tone: 4 },
        'Ō': { char: 'o', tone: 1 }, 'Ó': { char: 'o', tone: 2 }, 'Ǒ': { char: 'o', tone: 3 }, 'Ò': { char: 'o', tone: 4 },
        'Ū': { char: 'u', tone: 1 }, 'Ú': { char: 'u', tone: 2 }, 'Ǔ': { char: 'u', tone: 3 }, 'Ù': { char: 'u', tone: 4 },
        'Ǖ': { char: 'ü', tone: 1 }, 'Ǘ': { char: 'ü', tone: 2 }, 'Ǚ': { char: 'ü', tone: 3 }, 'Ǜ': { char: 'ü', tone: 4 }
    };

    static ACCENTS = {
        'a': ['ā', 'á', 'ǎ', 'à', 'a'],
        'e': ['ē', 'é', 'ě', 'è', 'e'],
        'o': ['ō', 'ó', 'ǒ', 'ò', 'o'],
        'i': ['ī', 'í', 'ǐ', 'ì', 'i'],
        'u': ['ū', 'ú', 'ǔ', 'ù', 'u'],
        'ü': ['ǖ', 'ǘ', 'ǚ', 'ǜ', 'ü']
    };

    // Initial mappings for Pinyin-to-Zhuyin converter
    static PINYIN_INITIALS = ['zh', 'ch', 'sh', 'b', 'p', 'm', 'f', 'd', 't', 'n', 'l', 'g', 'k', 'h', 'j', 'q', 'x', 'r', 'z', 'c', 's'];

    static INITIALS_MAP = {
        'b': 'ㄅ', 'p': 'ㄆ', 'm': 'ㄇ', 'f': 'ㄈ',
        'd': 'ㄉ', 't': 'ㄊ', 'n': 'ㄋ', 'l': 'ㄌ',
        'g': 'ㄍ', 'k': 'ㄎ', 'h': 'ㄏ',
        'j': 'ㄐ', 'q': 'ㄑ', 'x': 'ㄒ',
        'zh': 'ㄓ', 'ch': 'ㄔ', 'sh': 'ㄕ', 'r': 'ㄖ',
        'z': 'ㄗ', 'c': 'ㄘ', 's': 'ㄙ'
    };

    static FINALS_MAP = {
        'a': 'ㄚ', 'o': 'ㄛ', 'e': 'ㄜ', 'i': 'ㄧ', 'u': 'ㄨ', 'ü': 'ㄩ',
        'ai': 'ㄞ', 'ei': 'ㄟ', 'ao': 'ㄠ', 'ou': 'ㄡ',
        'an': 'ㄢ', 'en': 'ㄣ', 'ang': 'ㄤ', 'eng': 'ㄥ', 'er': 'ㄦ',
        'ia': 'ㄧㄚ', 'ian': 'ㄧㄢ', 'iang': 'ㄧㄤ', 'iao': 'ㄧㄠ',
        'ie': 'ㄧㄝ', 'in': 'ㄧㄣ', 'ing': 'ㄧㄥ', 'iong': 'ㄩㄥ',
        'iu': 'ㄧㄡ', 'ong': 'ㄨㄥ', 'ua': 'ㄨㄚ', 'uai': 'ㄨㄞ',
        'uan': 'ㄨㄢ', 'uang': 'ㄨㄤ', 'ui': 'ㄨㄟ', 'un': 'ㄨㄣ',
        'uo': 'ㄨㄛ', 'üan': 'ㄩㄢ', 'üe': 'ㄩㄝ', 'ün': 'ㄩㄣ'
    };

    // Inverted mappings for Zhuyin-to-Pinyin converter
    static ZHUYIN_INITIALS_MAP = {};
    static ZHUYIN_FINALS_MAP = {};

    static {
        for (let key in this.INITIALS_MAP) {
            this.ZHUYIN_INITIALS_MAP[this.INITIALS_MAP[key]] = key;
        }
        for (let key in this.FINALS_MAP) {
            this.ZHUYIN_FINALS_MAP[this.FINALS_MAP[key]] = key;
        }
        this.ZHUYIN_FINALS_MAP['ㄝ'] = 'ie';
    }

    // --- Phonetic Converter Engine (Pinyin <-> Zhuyin) ---
    static pinyinSyllableToZhuyin(cleanPinyin) {
        let p = cleanPinyin;

        // Standalone special syllables
        const special = {
            'yi': 'ㄧ', 'ya': 'ㄧㄚ', 'yao': 'ㄧㄠ', 'ye': 'ㄧㄝ', 'you': 'ㄧㄡ',
            'yan': 'ㄧㄢ', 'yin': 'ㄧㄣ', 'yang': 'ㄧㄤ', 'ying': 'ㄧㄥ', 'yong': 'ㄩㄥ',
            'yu': 'ㄩ', 'yuan': 'ㄩㄢ', 'yue': 'ㄩㄝ', 'yun': 'ㄩㄣ',
            'wu': 'ㄨ', 'wa': 'ㄨㄚ', 'wo': 'ㄨㄛ', 'wai': 'ㄨㄞ', 'wei': 'ㄨㄟ',
            'wan': 'ㄨㄢ', 'wen': 'ㄨㄣ', 'wang': 'ㄨㄤ', 'weng': 'ㄨㄥ',
            'er': 'ㄦ', 'a': 'ㄚ', 'o': 'ㄛ', 'e': 'ㄜ', 'ai': 'ㄞ', 'ei': 'ㄟ',
            'ao': 'ㄠ', 'ou': 'ㄡ', 'an': 'ㄢ', 'en': 'ㄣ', 'ang': 'ㄤ', 'eng': 'ㄥ'
        };

        if (special[p]) return special[p];

        let initial = '';
        for (let init of BpmfEngine.PINYIN_INITIALS) {
            if (p.startsWith(init)) {
                initial = init;
                p = p.slice(init.length);
                break;
            }
        }

        let zhuInit = BpmfEngine.INITIALS_MAP[initial] || '';

        // Clean rules for finals under palatals
        if (initial === 'j' || initial === 'q' || initial === 'x') {
            if (p === 'u') p = 'ü';
            if (p === 'uan') p = 'üan';
            if (p === 'ue') p = 'üe';
            if (p === 'un') p = 'ün';
        }

        let zhuFinal = BpmfEngine.FINALS_MAP[p] || '';

        // Silent 'i' rule
        if (['zh', 'ch', 'sh', 'r', 'z', 'c', 's'].includes(initial) && p === 'i') {
            zhuFinal = '';
        }

        return zhuInit + zhuFinal;
    }

    static pinyinToZhuyin(pinyin) {
        if (!pinyin) return '';

        let tone = 1;
        let clean = '';

        // Extract tone marks and clean character
        for (let char of pinyin) {
            if (BpmfEngine.TONE_MAP[char]) {
                clean += BpmfEngine.TONE_MAP[char].char;
                tone = BpmfEngine.TONE_MAP[char].tone;
            } else {
                clean += char;
            }
        }

        clean = clean.toLowerCase().replace('v', 'ü');

        const numMatch = clean.match(/([1-5])$/);
        if (numMatch) {
            tone = parseInt(numMatch[1]);
            clean = clean.slice(0, -1);
        }

        let bopomofo = BpmfEngine.pinyinSyllableToZhuyin(clean);

        const TONE_MARKS = {
            1: '',
            2: 'ˊ',
            3: 'ˇ',
            4: 'ˋ',
            5: '˙'
        };

        if (tone === 5) {
            return '˙' + bopomofo; // neutral prepended
        } else {
            return bopomofo + TONE_MARKS[tone];
        }
    }

    static addToneMark(pinyin, tone) {
        if (!pinyin || tone < 1 || tone > 5) return pinyin;
        if (tone === 5) return pinyin;

        let chars = [...pinyin];
        let targetIdx = -1;

        if (pinyin.includes('a')) {
            targetIdx = pinyin.indexOf('a');
        } else if (pinyin.includes('e')) {
            targetIdx = pinyin.indexOf('e');
        } else if (pinyin.includes('o')) {
            targetIdx = pinyin.indexOf('o');
        } else if (pinyin.includes('ui')) {
            targetIdx = pinyin.indexOf('i');
        } else if (pinyin.includes('iu')) {
            targetIdx = pinyin.indexOf('u');
        } else {
            for (let i = 0; i < chars.length; i++) {
                if ('iouü'.includes(chars[i])) {
                    targetIdx = i;
                    break;
                }
            }
        }

        if (targetIdx !== -1) {
            let v = chars[targetIdx];
            if (BpmfEngine.ACCENTS[v]) {
                chars[targetIdx] = BpmfEngine.ACCENTS[v][tone - 1];
            }
        }

        return chars.join('');
    }

    static zhuyinToPinyin(zhuyin) {
        if (!zhuyin) return '';

        let tone = 1;
        let clean = zhuyin;

        if (clean.startsWith('˙')) {
            tone = 5;
            clean = clean.slice(1);
        } else if (clean.endsWith('ˊ')) {
            tone = 2;
            clean = clean.slice(0, -1);
        } else if (clean.endsWith('ˇ')) {
            tone = 3;
            clean = clean.slice(0, -1);
        } else if (clean.endsWith('ˋ')) {
            tone = 4;
            clean = clean.slice(0, -1);
        } else if (clean.endsWith('˙')) {
            tone = 5;
            clean = clean.slice(0, -1);
        }

        let initial = '';
        if (BpmfEngine.ZHUYIN_INITIALS_MAP[clean[0]]) {
            initial = clean[0];
            clean = clean.slice(1);
        }

        let pinyinInit = BpmfEngine.ZHUYIN_INITIALS_MAP[initial] || '';
        let pinyinFinal = BpmfEngine.ZHUYIN_FINALS_MAP[clean] || '';

        if (initial === '') {
            if (clean === 'ㄧ') pinyinFinal = 'yi';
            else if (clean === 'ㄨ') pinyinFinal = 'wu';
            else if (clean === 'ㄩ') pinyinFinal = 'yu';
            else if (clean.startsWith('ㄧ')) {
                const mapped = BpmfEngine.ZHUYIN_FINALS_MAP[clean];
                pinyinFinal = mapped ? 'y' + mapped.slice(1) : '';
            }
            else if (clean.startsWith('ㄨ')) {
                if (clean === 'ㄨㄣ') pinyinFinal = 'wen';
                else if (clean === 'ㄨㄥ') pinyinFinal = 'weng';
                else {
                    const mapped = BpmfEngine.ZHUYIN_FINALS_MAP[clean];
                    pinyinFinal = mapped ? 'w' + mapped.slice(1) : '';
                }
            }
            else if (clean.startsWith('ㄩ')) {
                const mapped = BpmfEngine.ZHUYIN_FINALS_MAP[clean];
                pinyinFinal = mapped ? 'yu' + mapped.slice(1) : '';
            }
        } else {
            if (initial === 'ㄐ' || initial === 'ㄑ' || initial === 'ㄒ') {
                if (pinyinFinal === 'ü') pinyinFinal = 'u';
                else if (pinyinFinal === 'üe') pinyinFinal = 'ue';
                else if (pinyinFinal === 'üan') pinyinFinal = 'uan';
                else if (pinyinFinal === 'ün') pinyinFinal = 'un';
            }
            if (['ㄓ', 'ㄔ', 'ㄕ', 'ㄖ', 'ㄗ', 'ㄘ', 'ㄙ'].includes(initial) && clean === '') {
                pinyinFinal = 'i';
            }
        }

        let cleanPinyin = pinyinInit + pinyinFinal;
        return BpmfEngine.addToneMark(cleanPinyin, tone);
    }

    // --- Dictionary Loader & Tokenizer ---

    /**
     * Initializes the underlying dictionary by loading it.
     * @param {string} [xlsxPath] 
     * @returns {Promise<{phrases: Object, singleChars: Object}>}
     */
    static async init(xlsxPath) {
        return await MoeDictionary.load(xlsxPath);
    }

    /**
     * Returns candidate pronunciations for a given Chinese character, converting on-the-fly.
     * @param {string} char 
     * @returns {Array<{zhuyin: string, pinyin: string}>}
     */
    static getCandidates(char) {
        const rawList = MoeDictionary.singleChars[char] || [];
        return rawList.map(item => ({
            zhuyin: item.zhuyin,
            pinyin: BpmfEngine.zhuyinToPinyin(item.zhuyin)
        }));
    }

    /**
     * Context-aware, multi-pass greedy tokenizer.
     * Tokenizes raw text by identifying compound vocabulary phrases first,
     * then standalone single-character candidates, and applying manual overrides.
     * @param {string} rawText 
     * @param {Object} manualOverrides 
     * @returns {Array<Object>}
     */
    static tokenize(rawText, manualOverrides = {}) {
        const tokens = [];
        const isChineseChar = (char) => /[\u4e00-\u9fff]|[\u3400-\u4dbf]/u.test(char);

        // --- Pass 1: Parse custom tags & plain characters ---
        const regex = /<bpmf\s+([^>]*?)>([^<]*?)<\/bpmf>/g;
        let lastIndex = 0;
        let match;

        while ((match = regex.exec(rawText)) !== null) {
            const matchIndex = match.index;
            const matchText = match[0];
            const attrStr = match[1];
            const baseChar = match[2];

            const zhuyinMatch = attrStr.match(/zhuyin="([^"]*)"/);
            const pinyinMatch = attrStr.match(/pinyin="([^"]*)"/);
            
            const zhuyin = zhuyinMatch ? zhuyinMatch[1] : '';
            const pinyin = pinyinMatch ? pinyinMatch[1] : '';

            // Everything before this match is plain characters
            const beforeText = rawText.substring(lastIndex, matchIndex);
            if (beforeText) {
                for (const char of beforeText) {
                    tokens.push({
                        type: 'plain',
                        char: char,
                        token: char
                    });
                }
            }

            // Custom pre-annotated token
            let special = null;
            if (zhuyin === '' && pinyin === '') special = 'blank';
            else if (zhuyin === ' ' && pinyin === ' ') special = 'brackets';

            tokens.push({
                type: 'chinese',
                char: baseChar,
                token: matchText,
                zhuyin: zhuyin,
                pinyin: pinyin,
                special: special,
                isCustom: true
            });

            lastIndex = regex.lastIndex;
        }

        const remainingText = rawText.substring(lastIndex);
        if (remainingText) {
            for (const char of remainingText) {
                tokens.push({
                    type: 'plain',
                    char: char,
                    token: char
                });
            }
        }

        // --- Pass 2: Greedily Match contiguous runs of Chinese characters using Backward Maximum Matching (BMM) ---
        const maxPhraseLen = 10;
        const phrases = MoeDictionary.phrases || {};

        // Scan right-to-left (BMM)
        for (let i = tokens.length - 1; i >= 0; i--) {
            if (tokens[i].type !== 'plain' || !isChineseChar(tokens[i].char)) {
                continue;
            }

            let matchedLen = 0;
            let matchedZhuyins = null;

            // Greedily look for the longest phrase ending at index `i`
            for (let len = Math.min(maxPhraseLen, i + 1); len >= 2; len--) {
                const startIdx = i - len + 1;
                let phrase = '';
                let isContiguousPlainChinese = true;

                for (let j = 0; j < len; j++) {
                    const t = tokens[startIdx + j];
                    if (t.type !== 'plain' || !isChineseChar(t.char)) {
                        isContiguousPlainChinese = false;
                        break;
                    }
                    phrase += t.char;
                }

                if (isContiguousPlainChinese && phrases[phrase]) {
                    matchedLen = len;
                    matchedZhuyins = phrases[phrase];
                    break;
                }
            }

            if (matchedLen > 0) {
                const startIdx = i - matchedLen + 1;
                // Apply phrase pronunciations to all characters in the matched span
                for (let j = 0; j < matchedLen; j++) {
                    const idx = startIdx + j;
                    const char = tokens[idx].char;
                    const zy = matchedZhuyins[j];
                    tokens[idx] = {
                        type: 'chinese',
                        char: char,
                        token: char,
                        zhuyin: zy,
                        pinyin: BpmfEngine.zhuyinToPinyin(zy),
                        special: null,
                        isCustom: false,
                        inPhrase: true
                    };
                }
                // Advance pointer leftwards past the matched phrase
                i = startIdx;
            }
        }

        // --- Pass 3: Finalize single characters, other characters, and manual overrides ---
        const occurrenceCounts = {};
        const finalTokens = [];

        tokens.forEach((t) => {
            const isChinese = isChineseChar(t.char);

            if (!isChinese && t.type !== 'chinese') {
                finalTokens.push({
                    type: 'other',
                    char: t.char,
                    token: t.char
                });
                return;
            }

            // Track occurrences across all Chinese character tokens
            occurrenceCounts[t.char] = (occurrenceCounts[t.char] || 0) + 1;
            const key = `${t.char}_${occurrenceCounts[t.char] - 1}`;

            let resolvedToken = { ...t };

            // Re-apply saved manual overrides
            if (manualOverrides[key]) {
                resolvedToken.zhuyin = manualOverrides[key].zhuyin;
                resolvedToken.pinyin = manualOverrides[key].pinyin;
                resolvedToken.special = manualOverrides[key].special;
                resolvedToken.isCustom = true;
                resolvedToken.type = 'chinese';
            } 
            // If already resolved by Pass 1 (custom tag) or Pass 2 (phrase match), keep it
            else if (resolvedToken.type === 'chinese') {
                // Keep the annotation
            } 
            // Fallback: standalone single character lookup in MoeDictionary.singleChars
            else {
                let defaultZhuyin = '';
                let defaultPinyin = '';
                const candidates = MoeDictionary.singleChars[resolvedToken.char] || [];
                if (candidates.length > 0) {
                    defaultZhuyin = candidates[0].zhuyin;
                    defaultPinyin = BpmfEngine.zhuyinToPinyin(defaultZhuyin);
                }

                resolvedToken = {
                    type: 'chinese',
                    char: resolvedToken.char,
                    token: resolvedToken.char,
                    zhuyin: defaultZhuyin,
                    pinyin: defaultPinyin,
                    special: null,
                    isCustom: false
                };
            }

            delete resolvedToken.inPhrase;
            finalTokens.push(resolvedToken);
        });

        return finalTokens;
    }
}
