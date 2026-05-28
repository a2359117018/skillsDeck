import type { GlobalThemeOverrides } from 'naive-ui'

// ============================================
// NaiveUI Theme Overrides
// ============================================
// This file maps design tokens (from tokens.css) to NaiveUI theme override values.
// NaiveUI requires JS string literals, not CSS var().
// When a token changes in tokens.css, update the corresponding constant below.
//
// Token → Hex mapping (auto-verified by scripts/verify-theme-sync.mjs)
// ============================================

/** Primary action color — maps to --color-primary */
const PRIMARY = '#0a0a0a'
/** Primary hover — derived from PRIMARY */
const PRIMARY_HOVER = '#2a2a2a'

/** Info/Blue semantic — maps to --color-brand-blue */
const INFO = '#1456f0'
/** Info hover — derived from INFO */
const INFO_HOVER = '#3b6ff5'

/** Success semantic — maps to --color-success-text */
const SUCCESS = '#166534'
/** Success hover — derived from SUCCESS */
const SUCCESS_HOVER = '#1e8044'

/** Warning semantic — maps to --color-warning */
const WARNING = '#f0a020'
/** Warning hover — derived from WARNING */
const WARNING_HOVER = '#f5b040'

/** Error semantic — maps to --color-error */
const ERROR = '#d45656'
/** Error hover — derived from ERROR */
const ERROR_HOVER = '#e06666'

/** Canvas/background — maps to --color-canvas */
const CANVAS = '#ffffff'
/** Surface/elevated background — maps to --color-surface */
const SURFACE = '#f7f8fa'
/** Ink/text primary — maps to --color-ink */
const INK = '#1a1a1a'
/** Stone/text secondary — maps to --color-stone */
const STONE = '#6b7280'
/** Hairline/border — maps to --color-hairline */
const HAIRLINE = '#e5e7eb'
/** Hairline hover — maps to --color-hairline-hover */
const HAIRLINE_HOVER = '#d1d5db'

/** Brand blue background — maps to --color-brand-blue-200 */
const BRAND_BLUE_200 = '#dbeafe'
/** Brand blue deep — maps to --color-brand-blue-deep */
const BRAND_BLUE_DEEP = '#1e40af'

/** Warning background — maps to --color-warning-bg */
const WARNING_BG = '#fffbeb'
/** Warning border — maps to --color-warning-border */
const WARNING_BORDER = '1px solid rgba(240, 160, 32, 0.35)'

/** Success background — maps to --color-success-bg */
const SUCCESS_BG = '#dcfce7'

/** Error background — maps to --color-error-bg */
const ERROR_BG = '#fef2f2'

/** Agent blue bg (derived) — used for Alert info */
const AGENT_BLUE_BG = '#eff6ff'

/** Warning text (derived) — used for Tag warning type */
const WARNING_TEXT = '#92400e'

/** Placeholder color — legacy value for NaiveUI compatibility */
const PLACEHOLDER = '#9ca3af'

/** Font family stack — matches --font-family (not a CSS var, but kept consistent) */
const FONT_FAMILY = "'DM Sans', 'Inter', 'Helvetica Neue', Arial, sans-serif"

// ============================================
// Border helpers
// ============================================

const borderHairline = `1px solid ${HAIRLINE}`
const borderHairlineHover = `1px solid ${HAIRLINE_HOVER}`
const borderPrimary = `1px solid ${PRIMARY}`
const borderBrandBlue200 = `1px solid ${BRAND_BLUE_200}`
const borderSuccessBg = `1px solid ${SUCCESS_BG}`
const borderErrorBg = `1px solid ${ERROR_BG}`

export const themeOverrides: GlobalThemeOverrides = {
  common: {
    primaryColor: PRIMARY,
    primaryColorHover: PRIMARY_HOVER,
    primaryColorPressed: PRIMARY,
    primaryColorSuppl: PRIMARY_HOVER,
    fontFamily: FONT_FAMILY,
    borderRadius: '8px',
    borderRadiusSmall: '8px',
    /* Semantic colors — align with tokens.css brand/semantic tokens */
    infoColor: INFO,
    infoColorHover: INFO_HOVER,
    infoColorPressed: INFO,
    infoColorSuppl: INFO_HOVER,
    successColor: SUCCESS,
    successColorHover: SUCCESS_HOVER,
    successColorPressed: SUCCESS,
    successColorSuppl: SUCCESS_HOVER,
    warningColor: WARNING,
    warningColorHover: WARNING_HOVER,
    warningColorPressed: WARNING,
    warningColorSuppl: WARNING_HOVER,
    errorColor: ERROR,
    errorColorHover: ERROR_HOVER,
    errorColorPressed: ERROR,
    errorColorSuppl: ERROR_HOVER
  },
  Button: {
    borderRadius: '9999px',
    fontWeight: '500',
    /* quaternary 按钮 hover 仅颜色变化，不添加背景 */
    colorQuaternaryHover: 'transparent',
    colorQuaternaryPressed: 'transparent'
  },
  Tag: {
    borderRadius: '9999px',
    /* Default chip style */
    color: SURFACE,
    textColor: STONE,
    border: borderHairline,
    /* Info type — Steel Blue tinted */
    colorInfo: BRAND_BLUE_200,
    textColorInfo: BRAND_BLUE_DEEP,
    borderInfo: borderBrandBlue200,
    /* Success type */
    colorSuccess: SUCCESS_BG,
    textColorSuccess: SUCCESS,
    borderSuccess: borderSuccessBg,
    /* Warning type */
    colorWarning: WARNING_BG,
    textColorWarning: WARNING_TEXT,
    borderWarning: WARNING_BORDER,
    /* Error type */
    colorError: ERROR_BG,
    textColorError: ERROR,
    borderError: borderErrorBg
  },
  Input: {
    borderRadius: '8px',
    height: '40px',
    border: borderHairline,
    borderHover: borderHairlineHover,
    borderFocus: borderPrimary,
    color: CANVAS,
    colorFocus: CANVAS,
    textColor: INK,
    placeholderColor: PLACEHOLDER,
    caretColor: PRIMARY
  },
  Card: {
    borderRadius: '16px',
    boxShadow: 'none',
    borderColor: HAIRLINE,
    color: CANVAS
  },
  Modal: {
    borderRadius: '20px'
  },
  Dialog: {
    borderRadius: '16px'
  },
  InternalSelectMenu: {
    borderRadius: '8px'
  },
  Tabs: {
    barColor: PRIMARY,
    tabTextColorLine: STONE,
    tabTextColorActiveLine: PRIMARY,
    tabTextColorHoverLine: INK
  },
  Checkbox: {
    colorChecked: PRIMARY,
    borderChecked: PRIMARY,
    checkMarkColor: CANVAS
  },
  Switch: {
    railColorActive: PRIMARY,
    buttonColor: CANVAS
  },
  Progress: {
    fillColor: INFO,
    railColor: HAIRLINE
  },
  Alert: {
    /* Warning type */
    colorWarning: WARNING_BG,
    borderWarning: WARNING_BORDER,
    titleTextColorWarning: INK,
    contentTextColorWarning: STONE,
    iconColorWarning: WARNING,
    /* Info type */
    colorInfo: AGENT_BLUE_BG,
    borderInfo: borderBrandBlue200,
    titleTextColorInfo: INK,
    contentTextColorInfo: STONE,
    iconColorInfo: INFO,
    /* Success type */
    colorSuccess: SUCCESS_BG,
    borderSuccess: borderSuccessBg,
    titleTextColorSuccess: INK,
    contentTextColorSuccess: STONE,
    iconColorSuccess: SUCCESS,
    /* Error type */
    colorError: ERROR_BG,
    borderError: borderErrorBg,
    titleTextColorError: INK,
    contentTextColorError: STONE,
    iconColorError: ERROR
  },
  Steps: {
    indicatorColorProcess: PRIMARY,
    indicatorBorderColorProcess: PRIMARY,
    indicatorTextColorProcess: CANVAS,
    indicatorColorFinish: SUCCESS,
    indicatorBorderColorFinish: SUCCESS,
    indicatorTextColorFinish: CANVAS,
    indicatorColorWait: CANVAS,
    indicatorBorderColorWait: HAIRLINE,
    indicatorTextColorWait: STONE,
    headerTextColorProcess: PRIMARY,
    headerTextColorFinish: INK,
    headerTextColorWait: STONE,
    splitorColorWait: HAIRLINE,
    splitorColorFinish: SUCCESS,
    splitorColorProcess: HAIRLINE
  },
  Select: {
    peers: {
      InternalSelection: {
        border: borderHairline,
        borderHover: borderHairlineHover,
        borderActive: borderPrimary,
        borderFocus: borderPrimary,
        color: CANVAS,
        colorActive: CANVAS,
        caretColor: PRIMARY,
        textColor: INK,
        placeholderColor: PLACEHOLDER
      },
      InternalSelectMenu: {
        optionColorActive: SURFACE,
        optionColorActivePending: SURFACE,
        optionTextColor: INK,
        optionTextColorActive: PRIMARY,
        optionCheckColor: PRIMARY
      }
    }
  },
  Typography: {
    textColorSuccess: SUCCESS,
    textColorError: ERROR,
    textColorWarning: WARNING,
    textColorInfo: BRAND_BLUE_DEEP
  }
}
