# Search Page UI Fixes - Design Spec

## Overview

Fix three visual issues on the skills search page (`/search`) to align with the app's monochrome design system and improve consistency with existing components like `SkillRow.vue`.

## Issues Addressed

1. **Scrollbar visible in search results** — The `NScrollbar` component still shows scroll UI despite global scrollbar hiding in `tokens.css`.
2. **Install button position inconsistent and overly vibrant** — Button uses bright coral (`#ff5530`) fill and sits at the bottom of cards with `align-self: flex-start`, causing misalignment across cards with varying content height.
3. **Hover left border is jarring** — A 3px solid coral left border appears on hover, clashing with the app's grayscale theme.

## Design Decisions

### 1. Remove Custom Scrollbar Component

**File**: `src/renderer/src/views/SkillsSearch.vue`

Remove the `NScrollbar` wrapper and let `.search-page` handle scrolling natively.

**Rationale**: `tokens.css` already hides all scrollbars globally (`scrollbar-width: none` and `::-webkit-scrollbar { display: none }`). The custom scrollbar component adds unnecessary complexity and its rail may still be visible in some states.

**Implementation**:

- Remove `<NScrollbar class="search-scroll">` wrapper
- Remove `.search-scroll` and `.search-scroll :deep(.n-scrollbar-rail)` CSS rules
- Add `overflow-y: auto` to `.search-page`
- Keep `height: 100%` and `flex: 1` layout structure intact

### 2. Relocate and Restyle Install Button

**File**: `src/renderer/src/components/skills/SearchResultCard.vue`

Move the install button from the card body to the header title row, and change from filled coral to secondary (white background + dark border/text) style.

**Rationale**:

- **Position**: Placing the button in the title row (`flex` with `justify-content: space-between` or `gap`) ensures it stays at a fixed position regardless of card content height.
- **Style**: The coral fill (`#ff5530`) is the most saturated color in the app and draws excessive attention. `SkillRow.vue` already uses subtle `quaternary` action buttons. A `secondary`-styled button (outlined, dark text) fits the monochrome theme while remaining actionable.

**Implementation**:

- Move `<NButton>` inside `.result-card-title-row`, positioned after the title text
- Change button style from filled coral to secondary:
  - Remove custom `.install-btn` CSS override for background/border/color
  - Use naive-ui `secondary` prop or rely on default button styling with `type="default"`
  - Keep `size="small"` and `round`
- Remove `.result-card` from being `flex-direction: column` if no longer needed, or adjust layout so header contains the button properly

### 3. Replace Hover Left Border with Subtle Border+Shadow

**File**: `src/renderer/src/components/skills/SearchResultCard.vue`

Remove the left border accent and use a uniform border color change + shadow on hover.

**Rationale**: The 3px coral left border is visually aggressive and inconsistent with other cards in the app (`SkillRow.vue` uses `border-color: var(--color-muted)` + `box-shadow: var(--shadow-2)` on hover; `card-base` uses `border-color: var(--color-muted)` + `box-shadow: var(--shadow-3)`).

**Implementation**:

- Remove `border-left: 3px solid transparent` from `.result-card`
- Remove `border-left-color: var(--color-brand-coral)` from `.result-card:hover`
- Add to `.result-card:hover`:
  - `border-color: var(--color-muted)`
  - `box-shadow: var(--shadow-3)`

## Visual Reference

**Before**:

- Scrollbar: `NScrollbar` with custom rail hiding
- Button: Bottom-left, coral fill `#ff5530`
- Hover: 3px left coral border

**After**:

- Scrollbar: Native scrolling, fully hidden via global CSS
- Button: Top-right in title row, white with dark border/text
- Hover: Uniform border darken to `#9ca3af` + `shadow-3`

## Files Changed

1. `src/renderer/src/views/SkillsSearch.vue`
2. `src/renderer/src/components/skills/SearchResultCard.vue`

## Acceptance Criteria

- [ ] Search results page scrolls without any visible scrollbar UI
- [ ] Install button appears at a consistent position across all search result cards
- [ ] Install button uses a subtle style (not bright coral) that matches the app's monochrome theme
- [ ] Hover on search result cards shows a subtle border darken + shadow, no left border accent
