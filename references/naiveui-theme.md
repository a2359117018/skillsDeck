# NaiveUI Theme Overrides Reference

## Source of Truth

The actual `themeOverrides` object is defined in `src/renderer/src/theme/naiveui-overrides.ts`.
This document is a reference guide. When making changes, update the TypeScript file first,
then update this document to match.

This document maps every NaiveUI component override to the design token system in `src/renderer/src/assets/tokens.css`.

**Important:** NaiveUI's `themeOverrides` API requires JS string literals, not CSS `var()`. The values below are hardcoded hex strings that mirror the token system. When tokens change, both `tokens.css` and `naiveui-overrides.ts` must be updated together.

## Maintenance Rules

1. **Synchronize with tokens.css.** When a token value changes in `tokens.css`, update the corresponding `themeOverrides` entry in `naiveui-overrides.ts` and this document.
2. **Add new components here.** When introducing a new NaiveUI component, check if its default colors conflict with the design system. If so, add an override to `App.vue` and document it here.
3. **No `#000000` or `#ffffff`.** Use `--color-primary` (#0a0a0a) and `--color-canvas` (#ffffff) equivalents. The exceptions are `checkMarkColor` and `buttonColor` where NaiveUI requires pure white for contrast.
4. **All semantic colors must be explicit.** Do not rely on NaiveUI defaults for info/success/warning/error. Each must have a mapped override.

---

## Common

Base tokens used across all NaiveUI components.

| Key                   | Value                                                     | Token                  | Description                               |
| --------------------- | --------------------------------------------------------- | ---------------------- | ----------------------------------------- |
| `primaryColor`        | `#0a0a0a`                                                 | `--color-primary`      | Primary action color                      |
| `primaryColorHover`   | `#2a2a2a`                                                 | —                      | Primary hover (no token, derived)         |
| `primaryColorPressed` | `#0a0a0a`                                                 | `--color-primary`      | Primary pressed                           |
| `primaryColorSuppl`   | `#2a2a2a`                                                 | —                      | Primary supplementary (no token, derived) |
| `fontFamily`          | `'DM Sans', 'Inter', 'Helvetica Neue', Arial, sans-serif` | —                      | Global font stack                         |
| `borderRadius`        | `8px`                                                     | `--radius-md`          | Default border radius                     |
| `borderRadiusSmall`   | `8px`                                                     | `--radius-md`          | Small border radius (same as default)     |
| `infoColor`           | `#1456f0`                                                 | `--color-brand-blue`   | Info/blue semantic color                  |
| `infoColorHover`      | `#3b6ff5`                                                 | —                      | Info hover (no token, derived)            |
| `infoColorPressed`    | `#1456f0`                                                 | `--color-brand-blue`   | Info pressed                              |
| `infoColorSuppl`      | `#3b6ff5`                                                 | —                      | Info supplementary (no token, derived)    |
| `successColor`        | `#166534`                                                 | `--color-success-text` | Success semantic color                    |
| `successColorHover`   | `#1e8044`                                                 | —                      | Success hover (no token, derived)         |
| `successColorPressed` | `#166534`                                                 | `--color-success-text` | Success pressed                           |
| `successColorSuppl`   | `#1e8044`                                                 | —                      | Success supplementary (no token, derived) |
| `warningColor`        | `#f0a020`                                                 | `--color-warning`      | Warning semantic color                    |
| `warningColorHover`   | `#f5b040`                                                 | —                      | Warning hover (no token, derived)         |
| `warningColorPressed` | `#f0a020`                                                 | `--color-warning`      | Warning pressed                           |
| `warningColorSuppl`   | `#f5b040`                                                 | —                      | Warning supplementary (no token, derived) |
| `errorColor`          | `#d45656`                                                 | `--color-error`        | Error semantic color                      |
| `errorColorHover`     | `#e06666`                                                 | —                      | Error hover (no token, derived)           |
| `errorColorPressed`   | `#d45656`                                                 | `--color-error`        | Error pressed                             |
| `errorColorSuppl`     | `#e06666`                                                 | —                      | Error supplementary (no token, derived)   |

---

## Button

| Key                      | Value         | Token             | Description                                |
| ------------------------ | ------------- | ----------------- | ------------------------------------------ |
| `borderRadius`           | `9999px`      | `--radius-full`   | Pill shape for all buttons                 |
| `fontWeight`             | `500`         | `--weight-medium` | Medium weight                              |
| `colorQuaternaryHover`   | `transparent` | —                 | Ghost button hover: no background change   |
| `colorQuaternaryPressed` | `transparent` | —                 | Ghost button pressed: no background change |

---

## Tag

| Key                | Value                                | Token                     | Description                 |
| ------------------ | ------------------------------------ | ------------------------- | --------------------------- |
| `borderRadius`     | `9999px`                             | `--radius-full`           | Pill shape                  |
| `color`            | `#f7f8fa`                            | `--color-surface`         | Default background          |
| `textColor`        | `#6b7280`                            | `--color-stone`           | Default text                |
| `border`           | `1px solid #e5e7eb`                  | `--color-hairline`        | Default border              |
| `colorInfo`        | `#dbeafe`                            | `--color-brand-blue-200`  | Info type background        |
| `textColorInfo`    | `#1e40af`                            | `--color-brand-blue-deep` | Info type text              |
| `borderInfo`       | `1px solid #dbeafe`                  | `--color-brand-blue-200`  | Info type border            |
| `colorSuccess`     | `#dcfce7`                            | `--color-success-bg`      | Success type background     |
| `textColorSuccess` | `#166534`                            | `--color-success-text`    | Success type text           |
| `borderSuccess`    | `1px solid #dcfce7`                  | `--color-success-bg`      | Success type border         |
| `colorWarning`     | `#fffbeb`                            | `--color-warning-bg`      | Warning type background     |
| `textColorWarning` | `#92400e`                            | —                         | Warning type text (derived) |
| `borderWarning`    | `1px solid rgba(240, 160, 32, 0.35)` | `--color-warning-border`  | Warning type border         |
| `colorError`       | `#fef2f2`                            | `--color-error-bg`        | Error type background       |
| `textColorError`   | `#d45656`                            | `--color-error`           | Error type text             |
| `borderError`      | `1px solid #fef2f2`                  | `--color-error-bg`        | Error type border           |

---

## Input

| Key                | Value               | Token                    | Description                                              |
| ------------------ | ------------------- | ------------------------ | -------------------------------------------------------- |
| `borderRadius`     | `8px`               | `--radius-md`            | Default input radius                                     |
| `height`           | `40px`              | —                        | Fixed input height                                       |
| `border`           | `1px solid #e5e7eb` | `--color-hairline`       | Default border                                           |
| `borderHover`      | `1px solid #d1d5db` | `--color-hairline-hover` | Hover border                                             |
| `borderFocus`      | `1px solid #0a0a0a` | `--color-primary`        | Focus border                                             |
| `color`            | `#ffffff`           | `--color-canvas`         | Background                                               |
| `colorFocus`       | `#ffffff`           | `--color-canvas`         | Focus background                                         |
| `textColor`        | `#1a1a1a`           | `--color-ink`            | Text color                                               |
| `placeholderColor` | `#9ca3af`           | —                        | Placeholder text (legacy value, kept for NaiveUI compat) |
| `caretColor`       | `#0a0a0a`           | `--color-primary`        | Cursor color                                             |

**Note:** `placeholderColor` uses `#9ca3af` for NaiveUI compatibility. The design token `--color-muted` is `#757575` (WCAG AA compliant), but the lighter placeholder color is intentional for placeholder semantics.

---

## Card

| Key            | Value     | Token              | Description        |
| -------------- | --------- | ------------------ | ------------------ |
| `borderRadius` | `16px`    | `--radius-xl`      | Card corner radius |
| `boxShadow`    | `none`    | `--shadow-0`       | No shadow at rest  |
| `borderColor`  | `#e5e7eb` | `--color-hairline` | Card border        |
| `color`        | `#ffffff` | `--color-canvas`   | Card background    |

---

## Modal

| Key            | Value  | Token          | Description         |
| -------------- | ------ | -------------- | ------------------- |
| `borderRadius` | `20px` | `--radius-xxl` | Modal corner radius |

---

## Dialog

| Key            | Value  | Token         | Description          |
| -------------- | ------ | ------------- | -------------------- |
| `borderRadius` | `16px` | `--radius-xl` | Dialog corner radius |

---

## InternalSelectMenu

| Key            | Value | Token         | Description          |
| -------------- | ----- | ------------- | -------------------- |
| `borderRadius` | `8px` | `--radius-md` | Dropdown menu radius |

---

## Tabs

| Key                      | Value     | Token             | Description          |
| ------------------------ | --------- | ----------------- | -------------------- |
| `barColor`               | `#0a0a0a` | `--color-primary` | Active tab underline |
| `tabTextColorLine`       | `#6b7280` | `--color-stone`   | Inactive tab text    |
| `tabTextColorActiveLine` | `#0a0a0a` | `--color-primary` | Active tab text      |
| `tabTextColorHoverLine`  | `#1a1a1a` | `--color-ink`     | Hover tab text       |

---

## Checkbox

| Key              | Value     | Token             | Description                    |
| ---------------- | --------- | ----------------- | ------------------------------ |
| `colorChecked`   | `#0a0a0a` | `--color-primary` | Checked background             |
| `borderChecked`  | `#0a0a0a` | `--color-primary` | Checked border                 |
| `checkMarkColor` | `#ffffff` | `--color-canvas`  | Checkmark (white for contrast) |

---

## Switch

| Key               | Value     | Token             | Description         |
| ----------------- | --------- | ----------------- | ------------------- |
| `railColorActive` | `#0a0a0a` | `--color-primary` | Active rail         |
| `buttonColor`     | `#ffffff` | `--color-canvas`  | Switch knob (white) |

---

## Progress

| Key         | Value     | Token                | Description    |
| ----------- | --------- | -------------------- | -------------- |
| `fillColor` | `#1456f0` | `--color-brand-blue` | Progress fill  |
| `railColor` | `#e5e7eb` | `--color-hairline`   | Progress track |

---

## Alert

| Type    | Key                       | Value                                | Token                                    |
| ------- | ------------------------- | ------------------------------------ | ---------------------------------------- |
| Warning | `colorWarning`            | `#fffbeb`                            | `--color-warning-bg`                     |
| Warning | `borderWarning`           | `1px solid rgba(240, 160, 32, 0.35)` | `--color-warning-border`                 |
| Warning | `titleTextColorWarning`   | `#1a1a1a`                            | `--color-ink`                            |
| Warning | `contentTextColorWarning` | `#6b7280`                            | `--color-stone`                          |
| Warning | `iconColorWarning`        | `#f0a020`                            | `--color-warning`                        |
| Info    | `colorInfo`               | `#eff6ff`                            | — (derived from `--color-agent-blue-bg`) |
| Info    | `borderInfo`              | `1px solid #dbeafe`                  | `--color-brand-blue-200`                 |
| Info    | `titleTextColorInfo`      | `#1a1a1a`                            | `--color-ink`                            |
| Info    | `contentTextColorInfo`    | `#6b7280`                            | `--color-stone`                          |
| Info    | `iconColorInfo`           | `#1456f0`                            | `--color-brand-blue`                     |
| Success | `colorSuccess`            | `#dcfce7`                            | `--color-success-bg`                     |
| Success | `borderSuccess`           | `1px solid #dcfce7`                  | `--color-success-bg`                     |
| Success | `titleTextColorSuccess`   | `#1a1a1a`                            | `--color-ink`                            |
| Success | `contentTextColorSuccess` | `#6b7280`                            | `--color-stone`                          |
| Success | `iconColorSuccess`        | `#166534`                            | `--color-success-text`                   |
| Error   | `colorError`              | `#fef2f2`                            | `--color-error-bg`                       |
| Error   | `borderError`             | `1px solid #fef2f2`                  | `--color-error-bg`                       |
| Error   | `titleTextColorError`     | `#1a1a1a`                            | `--color-ink`                            |
| Error   | `contentTextColorError`   | `#6b7280`                            | `--color-stone`                          |
| Error   | `iconColorError`          | `#d45656`                            | `--color-error`                          |

---

## Steps

| Context | Key                           | Value     | Token                  |
| ------- | ----------------------------- | --------- | ---------------------- |
| Process | `indicatorColorProcess`       | `#0a0a0a` | `--color-primary`      |
| Process | `indicatorBorderColorProcess` | `#0a0a0a` | `--color-primary`      |
| Process | `indicatorTextColorProcess`   | `#ffffff` | `--color-canvas`       |
| Finish  | `indicatorColorFinish`        | `#166534` | `--color-success-text` |
| Finish  | `indicatorBorderColorFinish`  | `#166534` | `--color-success-text` |
| Finish  | `indicatorTextColorFinish`    | `#ffffff` | `--color-canvas`       |
| Wait    | `indicatorColorWait`          | `#ffffff` | `--color-canvas`       |
| Wait    | `indicatorBorderColorWait`    | `#e5e7eb` | `--color-hairline`     |
| Wait    | `indicatorTextColorWait`      | `#6b7280` | `--color-stone`        |
| Header  | `headerTextColorProcess`      | `#0a0a0a` | `--color-primary`      |
| Header  | `headerTextColorFinish`       | `#1a1a1a` | `--color-ink`          |
| Header  | `headerTextColorWait`         | `#6b7280` | `--color-stone`        |
| Splitor | `splitorColorWait`            | `#e5e7eb` | `--color-hairline`     |
| Splitor | `splitorColorFinish`          | `#166534` | `--color-success-text` |
| Splitor | `splitorColorProcess`         | `#e5e7eb` | `--color-hairline`     |

---

## Select

### InternalSelection (the trigger/input part)

| Key                | Value               | Token                    | Description                      |
| ------------------ | ------------------- | ------------------------ | -------------------------------- |
| `border`           | `1px solid #e5e7eb` | `--color-hairline`       | Default border                   |
| `borderHover`      | `1px solid #d1d5db` | `--color-hairline-hover` | Hover border                     |
| `borderActive`     | `1px solid #0a0a0a` | `--color-primary`        | Active border                    |
| `borderFocus`      | `1px solid #0a0a0a` | `--color-primary`        | Focus border                     |
| `color`            | `#ffffff`           | `--color-canvas`         | Background                       |
| `colorActive`      | `#ffffff`           | `--color-canvas`         | Active background                |
| `caretColor`       | `#0a0a0a`           | `--color-primary`        | Dropdown arrow                   |
| `textColor`        | `#1a1a1a`           | `--color-ink`            | Text color                       |
| `placeholderColor` | `#9ca3af`           | —                        | Placeholder (same note as Input) |

### InternalSelectMenu (the dropdown list)

| Key                        | Value     | Token             | Description        |
| -------------------------- | --------- | ----------------- | ------------------ |
| `optionColorActive`        | `#f7f8fa` | `--color-surface` | Active option bg   |
| `optionColorActivePending` | `#f7f8fa` | `--color-surface` | Active pending bg  |
| `optionTextColor`          | `#1a1a1a` | `--color-ink`     | Option text        |
| `optionTextColorActive`    | `#0a0a0a` | `--color-primary` | Active option text |
| `optionCheckColor`         | `#0a0a0a` | `--color-primary` | Checkmark color    |

---

## Typography

| Key                | Value     | Token                     | Description  |
| ------------------ | --------- | ------------------------- | ------------ |
| `textColorSuccess` | `#166534` | `--color-success-text`    | Success text |
| `textColorError`   | `#d45656` | `--color-error`           | Error text   |
| `textColorWarning` | `#f0a020` | `--color-warning`         | Warning text |
| `textColorInfo`    | `#1e40af` | `--color-brand-blue-deep` | Info text    |

---

## Dark Mode Notes

The `themeOverrides` object does not currently support dynamic dark mode. Dark mode is handled via `tokens.css` `[data-theme='dark']` overrides for component-scoped styles. NaiveUI components in dark mode rely on their built-in dark theme (`n-theme-dark`) plus the hardcoded `themeOverrides` values.

If full dark mode support for NaiveUI is needed in the future, consider:

1. Using `useThemeVars` or dynamic `themeOverrides` computed from the current theme
2. Or maintaining a separate dark `themeOverrides` object and switching at runtime
