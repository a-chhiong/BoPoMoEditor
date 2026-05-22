/* ==========================================================================
   Bopomofo & Pinyin Core Phonetic Mapping & Conversion Engine
   Wrapped as a reusable ES6 Export Class
   ========================================================================== */

import { MoeDictionary } from './dict.js';
import { Tokenizer } from './tokenizer.js';

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
    /**
     * Context-aware, multi-pass greedy tokenizer wrapper.
     * Calls Tokenizer to parse the text stream and attach zhuyin,
     * then seamlessly maps over the results to compute and attach pinyin translations
     * for the Bopomofo UI editor.
     * @param {string} rawText 
     * @param {Object} manualOverrides 
     * @returns {Array<Object>}
     */
    static tokenize(rawText, manualOverrides = {}) {
        const parsedTokens = Tokenizer.tokenize(rawText, manualOverrides);
        
        // Post-process to inject Pinyin translation for the UI feature
        return parsedTokens.map(token => {
            if (token.type === 'chinese') {
                // If the token is a custom pre-annotated tag or manual override with explicit pinyin, preserve it
                if (token.pinyin !== undefined && token.pinyin !== null && token.isCustom) {
                    return token;
                }
                return {
                    ...token,
                    pinyin: BpmfEngine.zhuyinToPinyin(token.zhuyin)
                };
            }
            return token;
        });
    }
}
