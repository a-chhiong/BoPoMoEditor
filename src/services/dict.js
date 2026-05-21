/* ==========================================================================
   MOE Dictionary Loader & Parser Engine (concised_2014_20260325)
   Wrapped as a reusable ES6 Export Class
   ========================================================================== */

import { ASSETS } from '../configs/path.js';

export class MoeDictionary {

    static DICT_FILE = ASSETS.DICT_FILE;

    // Mathematically verified closed set of all 24 grammatical clitics in the MOE Concise Dictionary
    static CLITIC_CHARS = new Set([
        '吧', '罷', '嗎', '嘛', '麼', '地', '底', '的', '得', '哪', '呢',
        '啦', '咯', '了', '哩', '著', '啊', '嗯', '呀', '吔', '哇', '頭', '子', '們'
    ]);

    static phrases = {};
    static singleChars = {};
    static isLoaded = false;

    /**
     * Loads the MOE dictionary Excel file on the fly and parses its contents.
     * @param {string} xlsxPath - The relative or absolute path to the XLSX dictionary file.
     * @returns {Promise<{phrases: Object, singleChars: Object}>}
     */
    static async load(xlsxPath = MoeDictionary.DICT_FILE) {
        if (MoeDictionary.isLoaded) {
            return { phrases: MoeDictionary.phrases, singleChars: MoeDictionary.singleChars };
        }

        // Wait until window.XLSX is loaded from CDN
        await MoeDictionary._waitForXLSX();

        try {
            const res = await fetch(xlsxPath);
            const buffer = await res.arrayBuffer();

            // Parse binary Excel data on the fly
            const workbook = window.XLSX.read(buffer, { type: 'array' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const data = window.XLSX.utils.sheet_to_json(sheet, { header: 1 });

            const phrases = MoeDictionary.phrases = {};
            const singleChars = MoeDictionary.singleChars = {};
            let count = 0;
            let singleCharCount = 0;

            for (let i = 1; i < data.length; i++) {
                let word = data[i][0]; // Column 0: 字詞名
                let zhuyinStr = data[i][6]; // Column 6: 注音一式

                if (typeof word === 'string' && typeof zhuyinStr === 'string') {
                    word = word.replace(/【.*?】/g, '').replace(/\[.*?\]/g, '').trim();
                    if (!/^[\u4e00-\u9fff\u3400-\u4dbf]+$/u.test(word)) continue;

                    zhuyinStr = zhuyinStr.replace(/\（.*?\）/g, '').replace(/\(.*?\)/g, '').trim();
                    let zTokens = zhuyinStr.split(/[\s　]+/).filter(z => z);

                    // 1. Parse and record single-character MOE candidates
                    if (word.length === 1 && zTokens.length === 1) {
                        const char = word;
                        const zy = zTokens[0];

                        if (!singleChars[char]) {
                            singleChars[char] = [];
                        }
                        if (!singleChars[char].some(c => c.zhuyin === zy)) {
                            const col5 = data[i][5];
                            const col5Num = typeof col5 === 'number' ? col5 : parseInt(col5, 10);
                            const rank = (col5Num === 0 || isNaN(col5Num)) ? 1 : col5Num;

                            singleChars[char].push({
                                zhuyin: zy,
                                rank: rank
                            });
                            singleCharCount++;
                        }
                    }

                    // 2. Parse and record compound phrases
                    if (word.length < 2) continue;

                    if (word.length === zTokens.length) {
                        const col5 = data[i][5];
                        const col5Num = typeof col5 === 'number' ? col5 : parseInt(col5, 10);

                        // Rank: 0 (non-polyphonic) or NaN is treated as rank 1 (highest preference).
                        // Polyphonic ranks are 1 (first), 2 (second), 3 (third)... 
                        // A smaller rank number represents a higher preference.
                        const rank = (col5Num === 0 || isNaN(col5Num)) ? 1 : col5Num;

                        if (!phrases[word] || rank < (phrases[word]._rank || Infinity)) {
                            phrases[word] = zTokens;
                            phrases[word]._rank = rank; // Store temporary rank on array during parsing
                            count++;
                        }
                    }
                }
            }

            // 2. Dynamic Subphrase Extraction from phrases of length >= 3
            const subPhrases = {};
            for (const [phrase, zys] of Object.entries(phrases)) {
                if (phrase.length >= 3) {
                    for (let len = 2; len <= Math.min(3, phrase.length - 1); len++) {
                        for (let start = 0; start <= phrase.length - len; start++) {
                            const subWord = phrase.substring(start, start + len);
                            // Only add if not already in phrases and not already added to subPhrases
                            if (!phrases[subWord] && !subPhrases[subWord]) {
                                subPhrases[subWord] = zys.slice(start, start + len);
                            }
                        }
                    }
                }
            }
            Object.assign(phrases, subPhrases);

            // Clean up temporary rank properties to keep TAIWAN_PHRASES clean
            for (const key in phrases) {
                delete phrases[key]._rank;
            }

            // 3. Frequency-Based Character Pronunciation Counting in Phrases
            for (const [phrase, zys] of Object.entries(phrases)) {
                for (let j = 0; j < phrase.length; j++) {
                    const char = phrase[j];
                    const zy = zys[j];
                    if (singleChars[char]) {
                        const candidate = singleChars[char].find(c => c.zhuyin === zy);
                        if (candidate) {
                            candidate.freq = (candidate.freq || 0) + 1;
                        }
                    }
                }
            }

            // 4. Sort single-character candidates: Neutral Tone First (if verified clitic), then Phrase Frequency, then Dictionary Rank
            for (const char in singleChars) {
                singleChars[char].sort((a, b) => {
                    const aIsClitic = a.zhuyin.startsWith('˙') && MoeDictionary.CLITIC_CHARS.has(char);
                    const bIsClitic = b.zhuyin.startsWith('˙') && MoeDictionary.CLITIC_CHARS.has(char);
                    if (aIsClitic !== bIsClitic) {
                        return aIsClitic ? -1 : 1; // 1. Neutral Tone First clitic priority
                    }

                    const aFreq = a.freq || 0;
                    const bFreq = b.freq || 0;
                    if (bFreq !== aFreq) {
                        return bFreq - aFreq; // 2. Phrase Frequency
                    }
                    return a.rank - b.rank; // 3. Dictionary Rank
                });

                // Clean up temporary properties to keep single-character database clean and lightweight
                singleChars[char].forEach(c => {
                    delete c.rank;
                    delete c.freq;
                });
            }

            console.log(`Parsed ${count} MOE phrases and ${singleCharCount} unique MOE single-character candidate mappings!`);


            MoeDictionary.isLoaded = true;

            // Bind to window for backwards compatibility with legacy global scope accesses
            window.TAIWAN_PHRASES = phrases;
            window.TAIWAN_SINGLE_CHARS = singleChars;

            return { phrases, singleChars };
        } catch (err) {
            console.error('Failed to load or parse Excel dictionary:', err);
            throw err;
        }
    }

    /**
     * Polls to wait for XLSX to load from CDN.
     * @private
     * @returns {Promise<void>}
     */
    static _waitForXLSX() {
        return new Promise((resolve) => {
            if (window.XLSX) {
                resolve();
                return;
            }
            const interval = setInterval(() => {
                if (window.XLSX) {
                    clearInterval(interval);
                    resolve();
                }
            }, 50);
        });
    }
}
