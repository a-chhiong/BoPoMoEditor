/* ==========================================================================
   Unicode IVS (Ideographic Variation Sequence) Typography Service Engine
   Decoupled core logic for BoPoMo IVS Typeface Explorer
   ========================================================================== */

import { MoeDictionary } from './dict.js';
import { BpmfEngine } from './bpmf.js';
import { RubyDatabase } from './ruby.js';

export class IvsEngine {

    // Variation selector base for ButTaiwan Bopomofo custom fonts (BpmfHuninn, BpmfIansui, BpmfZihiKaiStd)
    static VS_BASE = 0xE01E0;

    /**
     * Robust Unicode IVS Tokenizer
     * Parses raw input text stream into token blocks containing base character + optional variation selectors + optional PUA codes.
     * @param {string} rawText 
     * @returns {Array<string>}
     */
    static parseIVSText(rawText) {
        if (!rawText) return [];
        const chars = [...rawText];
        const tokens = [];
        
        for (let i = 0; i < chars.length; i++) {
            let char = chars[i];
            let token = char;
            
            // Check if followed by IVS Selector (U+E0100 - U+E01EF)
            if (i + 1 < chars.length) {
                let nextCode = chars[i + 1].codePointAt(0);
                if (nextCode >= 0xE0100 && nextCode <= 0xE01EF) {
                    token += chars[i + 1];
                    i++;
                    
                    // Check if U+E01E0 is followed by a PUA custom ruby character (U+F000 - U+F8FF)
                    if (nextCode === IvsEngine.VS_BASE && i + 1 < chars.length) {
                        let nextNextCode = chars[i + 1].codePointAt(0);
                        if (nextNextCode >= 0xF000 && nextNextCode <= 0xF8FF) {
                            token += chars[i + 1];
                            i++;
                        }
                    }
                }
            }
            tokens.push(token);
        }
        return tokens;
    }

    /**
     * Context-Aware Automatic IVS Pronunciation Alignment
     * Strips variation selectors, runs BpmfEngine tokenizer to find correct contextual pronunciations,
     * and automatically pre-selects and appends the matching variation selector for polyphonic characters.
     * Preserves any pre-existing variation selections.
     * @param {string} rawText 
     * @returns {Array<string>}
     */
    static alignIVSText(rawText) {
        const rawTokens = IvsEngine.parseIVSText(rawText);
        
        // 1. Reconstruct plain text by stripping variation selectors
        let plainText = '';
        rawTokens.forEach(t => {
            const parts = [...t];
            plainText += parts[0];
        });
        
        // 2. Tokenize contextually using the BMM MoE-dictionary engine
        const contextTokens = BpmfEngine.tokenize(plainText);
        
        // 3. Align tokens and automatically assign variation selectors
        const alignedTokens = rawTokens.map((rawToken, idx) => {
            const parts = [...rawToken];
            const baseChar = parts[0];
            const isChinese = /[\u4e00-\u9fff]|[\u3400-\u4dbf]/u.test(baseChar);
            
            if (!isChinese) {
                return rawToken;
            }
            
            const contextToken = contextTokens[idx];
            
            // If the raw token already has a custom variation selector (parts.length > 1), preserve it!
            if (parts.length > 1) {
                return rawToken;
            }
            
            // If it is polyphonic in MoeDictionary, check if contextual zhuyin matches a candidate
            const candidates = MoeDictionary.singleChars[baseChar] || [];
            if (candidates.length > 1 && contextToken && contextToken.zhuyin) {
                const matchIdx = candidates.findIndex(c => c.zhuyin === contextToken.zhuyin);
                if (matchIdx !== -1) {
                    // Auto-append the matching variation selector
                    const vsChar = String.fromCodePoint(IvsEngine.VS_BASE + matchIdx);
                    return baseChar + vsChar;
                }
            }
            
            return rawToken;
        });
        
        return alignedTokens;
    }

    /**
     * Resolves metadata and typographic state for a single Unicode IVS token.
     * @param {string} token 
     * @returns {Object}
     */
    static getTokenInfo(token) {
        const parts = [...token];
        const baseChar = parts[0];
        const isChinese = /[\u4e00-\u9fff]|[\u3400-\u4dbf]/u.test(baseChar);
        
        let type = 'normal';
        let vsIndex = null;
        let puaChar = null;
        let bopomofoText = '';

        // Check polyphonic candidates in our dynamic MOE database
        const candidates = MoeDictionary.singleChars[baseChar] || [];
        const hasPolyphonic = candidates.length > 1;

        if (parts.length === 1) {
            if (hasPolyphonic) {
                type = 'polyphonic';
            }
        } else if (parts.length > 1) {
            const vsCode = parts[1].codePointAt(0);
            if (vsCode === IvsEngine.VS_BASE) {
                if (parts.length > 2) {
                    const puaCode = parts[2].codePointAt(0);
                    if (puaCode === 0xF000) {
                        type = 'brackets'; // Empty brackets fill-in
                    } else {
                        type = 'custom'; // Custom bopomofo PUA
                        puaChar = parts[2];
                        // Search back in PUA database
                        for (let syllable in RubyDatabase.MAPPING) {
                            if (RubyDatabase.MAPPING[syllable] === puaCode) {
                                bopomofoText = syllable;
                                break;
                            }
                        }
                    }
                } else {
                    type = 'blank'; // No bopomofo
                }
            } else if (vsCode > IvsEngine.VS_BASE) {
                vsIndex = vsCode - IvsEngine.VS_BASE;
                type = 'modified'; // Specific pronunciation variation chosen
            }
        }

        return {
            baseChar,
            isChinese,
            type,
            hasPolyphonic,
            candidates,
            vsIndex,
            puaChar,
            bopomofoText
        };
    }

    /**
     * Searches the dynamic dictionary compound database for up to `limit` example phrases
     * matching the specified base character and target pronunciation.
     * @param {string} char 
     * @param {string} zhuyin 
     * @param {number} limit 
     * @returns {string}
     */
    static getExamplePhrases(char, zhuyin, limit = 3) {
        const examples = [];
        if (!MoeDictionary.phrases) return '';
        
        for (const [phrase, zys] of Object.entries(MoeDictionary.phrases)) {
            if (phrase.includes(char)) {
                for (let i = 0; i < phrase.length; i++) {
                    if (phrase[i] === char && zys[i] === zhuyin) {
                        examples.push(phrase);
                        if (examples.length >= limit) {
                            return examples.join('、');
                        }
                    }
                }
            }
        }
        return examples.join('、');
    }
}
