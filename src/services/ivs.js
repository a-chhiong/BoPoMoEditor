/* ==========================================================================
   Unicode IVS (Ideographic Variation Sequence) Typography Service Engine
   Decoupled core logic for BoPoMo IVS Typeface Explorer
   ========================================================================== */

import { MoeDictionary } from './dict.js';
import { BpmfEngine } from './bpmf.js';
import { RubyDatabase } from './ruby.js';
import { ASSETS } from '../configs/path.js';

export class IvsEngine {

    // Variation selector base for ButTaiwan Bopomofo custom fonts (BpmfHuninn, BpmfIansui, BpmfZihiKaiStd)
    static VS_BASE = 0xE01E0;

    // Authoritative IVS character map loaded from ButTaiwan bpmfvs phonic_table_Z.txt
    // Maps: char -> string[] where index 0 = no VS (base), index 1 = VS18, index 2 = VS19, ...
    static ivsCharMap = new Map();
    static ivsMapLoaded = false;

    // URL for the authoritative bpmfvs phonetic table
    static IVS_TABLE_URL = ASSETS.PHONIC_TABLE_Z;

    /**
     * Loads the authoritative IVS character pronunciation map from ButTaiwan bpmfvs phonic_table_Z.txt.
     * This defines the exact VS index ordering (VS17/no-VS=0, VS18=1, VS19=2, ...) for every
     * polyphonic character. Must be called before alignIVSText / getTokenInfo for correct results.
     * @returns {Promise<void>}
     */
    static async loadIVSMap() {
        if (IvsEngine.ivsMapLoaded) return;
        try {
            const res = await fetch(IvsEngine.IVS_TABLE_URL);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const text = await res.text();
            const map = new Map();
            for (const line of text.split('\n')) {
                const parts = line.split('\t');
                // Format: char \t hex \t category \t reading0 \t reading1 ...
                if (parts.length < 5) continue; // Only load polyphonic chars (2+ readings)
                const char = parts[0];
                const readings = parts.slice(3); // readings start at index 3
                if (char && readings.length >= 2) {
                    map.set(char, readings);
                }
            }
            IvsEngine.ivsCharMap = map;
            IvsEngine.ivsMapLoaded = true;
            console.log(`IVS map loaded: ${map.size} polyphonic characters from bpmfvs phonic_table_Z.txt`);
        } catch (err) {
            console.warn('Failed to load IVS map from bpmfvs, falling back to dictionary order:', err);
            // Non-fatal: alignIVSText will fall back to dictionary candidate order
            IvsEngine.ivsMapLoaded = true;
        }
    }

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
                const targetZhuyin = contextToken.zhuyin;

                // Prefer the authoritative IVS map (phonic_table_Z.txt font VS order)
                const ivsReadings = IvsEngine.ivsCharMap.get(baseChar);
                if (ivsReadings) {
                    const ivsIdx = ivsReadings.indexOf(targetZhuyin);
                    if (ivsIdx !== -1) {
                        // index 0 = no VS (base rendering), index >= 1 = VS_BASE + ivsIdx
                        const vsChar = ivsIdx > 0 ? String.fromCodePoint(IvsEngine.VS_BASE + ivsIdx) : '';
                        return baseChar + vsChar;
                    }
                }

                // Fallback: use dictionary candidate order if char not in IVS map
                const matchIdx = candidates.findIndex(c => c.zhuyin === targetZhuyin);
                if (matchIdx !== -1) {
                    const vsChar = matchIdx > 0 ? String.fromCodePoint(IvsEngine.VS_BASE + matchIdx) : '';
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
        const dictCandidates = MoeDictionary.singleChars[baseChar] || [];
        const hasPolyphonic = dictCandidates.length > 1;

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

        // Build the candidates list ordered by font IVS map (phonic_table_Z.txt) when available,
        // falling back to dictionary order. Each candidate carries its authoritative ivsIndex.
        let candidates;
        const ivsReadings = IvsEngine.ivsCharMap.get(baseChar);
        if (ivsReadings && hasPolyphonic) {
            // Merge: IVS map defines order; only include readings that exist in dict candidates
            const dictZhuyinSet = new Set(dictCandidates.map(c => c.zhuyin));
            candidates = ivsReadings
                .map((zhuyin, ivsIdx) => ({ zhuyin, ivsIndex: ivsIdx }))
                .filter(c => dictZhuyinSet.has(c.zhuyin));
            // Append any dict candidates not in IVS map (edge case)
            for (const dc of dictCandidates) {
                if (!ivsReadings.includes(dc.zhuyin)) {
                    candidates.push({ zhuyin: dc.zhuyin, ivsIndex: null });
                }
            }
        } else {
            // Fallback: use dictionary candidates, ivsIndex = position in dictionary array
            candidates = dictCandidates.map((c, i) => ({ zhuyin: c.zhuyin, ivsIndex: i }));
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
