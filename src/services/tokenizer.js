/* ==========================================================================
   Text Stream Parsing & Tokenization Service
   Decoupled core logic for BoPoMo Editor
   ========================================================================== */

import { MoeDictionary } from './dict.js';

export class Tokenizer {
    /**
     * Context-aware, multi-pass greedy tokenizer.
     * Tokenizes raw text by identifying compound vocabulary phrases first,
     * then standalone single-character candidates, and applying manual overrides.
     * Only attaches 'zhuyin' (from MoeDictionary) to the tokens. Pinyin conversion is omitted.
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
                pinyin: pinyin, // Pre-annotated custom pinyin can be preserved
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
                // The override might have pinyin, keep it if present
                if (manualOverrides[key].pinyin !== undefined) {
                    resolvedToken.pinyin = manualOverrides[key].pinyin;
                }
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
                const candidates = MoeDictionary.singleChars[resolvedToken.char] || [];
                if (candidates.length > 0) {
                    defaultZhuyin = candidates[0].zhuyin;
                }

                resolvedToken = {
                    type: 'chinese',
                    char: resolvedToken.char,
                    token: resolvedToken.char,
                    zhuyin: defaultZhuyin,
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
