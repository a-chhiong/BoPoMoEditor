/* ==========================================================================
   Universal Path Configuration — BoPoMo Editor
   Single source of truth for all src/assets and src/fonts paths.

   USAGE (JS modules):
       import { PATHS } from '../../configs/path.js';
       fetch(PATHS.DICT_FILE);
       new FontFace('BpmfHuninn', `url(${PATHS.FONTS.HUNINN})`);

   NOTE FOR CSS @font-face:
       CSS cannot import JS modules. When any font path changes, update both
       this file AND the matching @font-face src: url(...) in:
         - src/services/bpmf.css
         - src/ui/features/bpmf/style.css
         - src/ui/features/ivs/style.css
   ========================================================================== */

// --- Base URL origins (resolved from the web server document root) ---

/** Absolute base path to the fonts directory (served from root) */
const FONTS_BASE = '/src/fonts';

/** Absolute base path to the assets directory (served from root) */
const ASSETS_BASE = '/src/assets';

// --- Font file paths ---

export const FONTS = {
    /** 注音粉圓 by ButTaiwan (~4.8 MB) */
    HUNINN:   `${FONTS_BASE}/BpmfHuninn-Regular.ttf`,

    /** 注音芫荽 by ButTaiwan (~7.7 MB) */
    IANSUI:   `${FONTS_BASE}/BpmfIansui-Regular.ttf`,

    /** 字嗨注音標楷 by ButTaiwan (~17.5 MB) */
    ZIHIKAI:  `${FONTS_BASE}/BpmfZihiKaiStd-Regular.ttf`,

    /** BopomofoRuby annotation font — used by bpmf ruby rendering */
    RUBY:     `${FONTS_BASE}/BopomofoRuby1909-v1-Regular.ttf`,
};

// --- Asset file paths ---

export const ASSETS = {
    /** MOE Concise Dictionary Excel database (教育部國語辭典簡編本) */
    DICT_FILE: `${ASSETS_BASE}/dict_concised_2014_20260325.xlsx`,
};

// --- IVS font switcher map ---
// Used by src/ui/features/ivs/script.js switchFont() and switchFontFromSelect()

export const IVS_FONT_MAP = {
    huninn:  { family: 'BpmfHuninn',      path: FONTS.HUNINN,  label: '注音粉圓', size: '4.8 MB' },
    iansui:  { family: 'BpmfIansui',      path: FONTS.IANSUI,  label: '注音芫荽', size: '7.7 MB' },
    zihikai: { family: 'BpmfZihiKaiStd',  path: FONTS.ZIHIKAI, label: '字嗨標楷', size: '17.5 MB' },
    system:  { family: 'System',          path: '',            label: '系統預設', size: '0 KB' },
};

// --- Convenience re-export of all paths as a single object ---

export const PATHS = {
    FONTS,
    ASSETS,
    IVS_FONT_MAP,
};

export default PATHS;
