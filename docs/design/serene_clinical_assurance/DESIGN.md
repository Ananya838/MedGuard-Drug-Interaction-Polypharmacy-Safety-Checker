---
name: Serene Clinical Assurance
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#3e4947'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#6e7977'
  outline-variant: '#bdc9c6'
  surface-tint: '#006a63'
  primary: '#005c55'
  on-primary: '#ffffff'
  primary-container: '#0f766e'
  on-primary-container: '#a3faef'
  inverse-primary: '#80d5cb'
  secondary: '#216963'
  on-secondary: '#ffffff'
  secondary-container: '#a8ece5'
  on-secondary-container: '#266d68'
  tertiary: '#005f26'
  on-tertiary: '#ffffff'
  tertiary-container: '#007a33'
  on-tertiary-container: '#a1ffad'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#9cf2e8'
  primary-fixed-dim: '#80d5cb'
  on-primary-fixed: '#00201d'
  on-primary-fixed-variant: '#00504a'
  secondary-fixed: '#abefe8'
  secondary-fixed-dim: '#8fd3cc'
  on-secondary-fixed: '#00201e'
  on-secondary-fixed-variant: '#00504b'
  tertiary-fixed: '#7ffc97'
  tertiary-fixed-dim: '#62df7d'
  on-tertiary-fixed: '#002109'
  on-tertiary-fixed-variant: '#005320'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
typography:
  headline-lg:
    fontFamily: Noto Sans
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 38px
  headline-lg-mobile:
    fontFamily: Noto Sans
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 34px
  headline-md:
    fontFamily: Noto Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-sm:
    fontFamily: Noto Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-xl:
    fontFamily: Noto Sans
    fontSize: 20px
    fontWeight: '400'
    lineHeight: 30px
  body-lg:
    fontFamily: Noto Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Noto Sans
    fontSize: 18px
    fontWeight: '500'
    lineHeight: 26px
  label-lg:
    fontFamily: Noto Sans
    fontSize: 18px
    fontWeight: '700'
    lineHeight: 24px
  label-md:
    fontFamily: Noto Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 22px
  label-sm:
    fontFamily: Noto Sans
    fontSize: 15px
    fontWeight: '600'
    lineHeight: 20px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  margin: 1rem
  space-xs: 0.375rem
  space-sm: 0.75rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

This design system is tailored specifically for family caregivers aged 40–70 managing complex polypharmacy for elderly dependents on Android devices. Caring for aging parents under high-stress conditions requires a visual language that radiates clinical authority, calm reassurance, and zero cognitive friction.

### Philosophy & Character
- **Empathetic Precision**: Professional, medical-grade confidence paired with an unhurried, respectful tone. The interface avoids aggressive alarms, sterile hospital chill, or high-tech coldness.
- **Cognitive Clarity**: Low extraneous detail, linear workflows, unambiguous semantic hierarchy, and immediate spatial legibility to counter fatigue and visual strain.
- **Universal Accessibility (Elder-First)**: Every interaction accommodates presbyopia, reduced fine-motor accuracy, varied digital literacy, and multilinguality across Indian linguistic contexts. Color is never an isolated communicator; explicit shapes, icons, and text labels accompany every safety metric.

### Design Movement
**Accessible Modern Humanist**: Grounded in purposeful Material-influenced ergonomics, high-contrast flat surfaces, softly defined boundaries, tactile touch targets, and generous breathing room.

## Colors

The palette balances restorative botanical teals with crisp neutrals and an unequivocal four-tier clinical safety warning system. Light mode is the default and only primary operational mode, maximizing legibility in varied lighting conditions across indoor care settings and bright outdoor pharmacies.

### Palette Roles & Values

- **Primary Brand Tier**:
  - `primary`: `#0F766E` (Deep Teal – core actions, selected states, headers)
  - `primary-dark`: `#115E59` (Focused/Active state for interactive buttons)
  - `primary-container`: `#F0FDFA` (Surface highlights, active tab background)
  - `primary-subtle`: `#CCFBF1` (Border accents, badge containers)

- **Neutral Foundations**:
  - `canvas-background`: `#F8FAFC` (Calm off-white preventing screen glare)
  - `surface`: `#FFFFFF` (Pure white card containers)
  - `text-primary`: `#0F172A` (Deep charcoal – exceeding 12:1 contrast against pure white)
  - `text-secondary`: `#475569` (Slate gray – 5.8:1 contrast ratio against white)
  - `border-subtle`: `#E2E8F0` (Card and container boundaries)
  - `border-strong`: `#CBD5E1` (Input boundaries and inactive selectors)

- **Severity System (Triple-Encoded: Hue + Border/Fill + Glyph)**:
  - **Major Conflict**: Accent `#DC2626`, Container `#FEF2F2`, Border `#FECACA`. Always paired with a sharp Warning Triangle (`triangle-alert`).
  - **Moderate Conflict**: Accent `#EA580C`, Container `#FFF7ED`, Border `#FFEDD5`. Always paired with an Alert Octagon/Circle (`alert-circle`).
  - **Minor Precaution**: Accent `#D97706`, Container `#FFFBEB`, Border `#FEF3C7`. Always paired with an Information Diamond/Circle (`info`).
  - **Safe / Verified**: Accent `#16A34A`, Container `#F0FDF4`, Border `#BBF7D0`. Always paired with a Checkmark Shield/Circle (`check-circle`).

## Typography

Noto Sans is selected for its comprehensive, uniform unicode support across Indic scripts (Devanagari for Hindi, Kannada, Tamil) and Latin text, maintaining consistent optical heights across language switches.

### Accessibility Safeguards
- **Baseline Floor**: Minimum body font size is strictly 18px (`body-lg`) to serve presbyopic caregivers without eye strain. Sub-14px microcopy is entirely prohibited across all states.
- **Leading Ratio**: Generous line-height (1.45x–1.55x) prevents Indic conjunct ligatures and diacritics (matras) from overlapping or clipping.
- **Large Text Mode**: When toggled, typography metrics scale by an additional 1.2x factor (`body-lg` expands from 18px to 21.6px; headers adjust dynamically) while preserving vertical flex containers to eliminate truncation.

## Layout & Spacing

A mobile-centric fluid single-column layout architecture prioritized for one-handed and two-handed thumb operation on Android devices with screen widths spanning 360dp to 430dp.

### Layout Mechanics
- **Grid Structure**: Fluid 4-column system on mobile with `16px` (`1rem`) gutters and `16px` margins. Expands to an 8-column layout capped at `600px` max-width on larger foldable screens and tablets to prevent line lengths exceeding 65 characters.
- **Touch Target Envelopes**: All interactive elements (buttons, inputs, selectable tiles, navigation icons) have a mandatory minimum outer bounds dimension of `48px × 48px`, surrounded by at least `space-sm` (`12px`) separation between adjacent interactive zones to prevent accidental activations.
- **Vertical Flow**: Information follows stacked, chunked blocks separated by `space-lg` (`24px`). Critical medication analysis output is strictly vertical; avoid side-by-side split cards that pinch text columns.

## Elevation & Depth

This system avoids heavy, disorienting 3D skeuomorphism and floating glassmorphism, using structured surface stacking, crisp structural outlines, and soft ambient shadows.

### Surface Tiers
- **Tier 0 (Background Canvas)**: `#F8FAFC` flat surface.
- **Tier 1 (Resting Cards & Surfaces)**: `#FFFFFF` card layers framed by a high-legibility 1.5px border (`#E2E8F0`) paired with an ultra-subtle ambient drop shadow (`box-shadow: 0 2px 4px rgba(15, 23, 42, 0.04), 0 1px 2px rgba(15, 23, 42, 0.02)`).
- **Tier 2 (Sticky Headers & Elevated Controls)**: Pure white background with elevated separation (`box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08)`).
- **Tier 3 (Floating Actions & Modals/Bottom Sheets)**: `#FFFFFF` with scrim backdrop (`rgba(15, 23, 42, 0.6)`) and soft deep shadow (`box-shadow: 0 8px 24px rgba(15, 23, 42, 0.16)`).

The tactile hierarchy relies first on border definition, then subtle shadow, ensuring that budget Android LCD screens without deep dynamic range render each card boundary with sharp distinctness.

## Shapes

The interface embraces a reassuring, human, and gentle structural curvature (`roundedness: 2`). Forms avoid stark, razor-sharp medical corners, instead using approachable geometric radii that define tactile pressable zones.

### Radius Specifications
- **Standard (`0.5rem` / 8px)**: Segmented toggles, language select tabs, warning badges.
- **Large (`1rem` / 16px)**: Primary interactive buttons, text input fields, bottom sheet upper radiuses.
- **Extra-Large (`1.25rem` / 20px)**: Medication cards, interaction result containers, camera scanning overlays.
- **Full Pill (`9999px`)**: Severity indicator badges, interactive chip tags, floating status indicators.

## Components

### 1. Buttons
- **Primary Action**: Minimum height `52px` (strictly above the 48px baseline). Background `#0F766E`, text `#FFFFFF`, font `label-lg` (18px bold), border radius `16px`. Active press state shifts to `#115E59` with subtle inward scale (0.98).
- **Secondary Action**: Background `#F0FDFA`, text `#0F766E`, border 1.5px solid `#0F766E`. Height `52px`.
- **Destructive/Critical**: Background `#DC2626`, text `#FFFFFF`. Used strictly for irreversible actions (e.g., removing a vital medication entry).

### 2. Severity Badges & Alert Banners
- **Architecture**: Always structured as `[Icon (24px)] + [Bold Semantic Label] + [Plain Text Detail]`.
- **Badge Shape**: Full pill container (`padding: 8px 16px`), border width 1.5px matching warning level.
- **Card Alert Banner**: Spans full card width with 12px internal padding. Background and border strictly match the four-tier severity palette. Under no circumstance is an alert displayed without both an explicit icon and written level name.

### 3. Cards (Medicine & Interaction Modules)
- **Styling**: `#FFFFFF` background, 1.5px `#E2E8F0` border, `16px` border radius, padding `20px`.
- **Divider Treatment**: No hairline gray dividers inside clinical cards; utilize `16px` vertical white space or soft tint panels (`#F8FAFC`) to delineate dosage times, doctor instructions, and side-effects.

### 4. Chips (Conditions & Allergy Tags)
- **Styling**: `44px` height to allow facile selection and deletion. Surface `#F0FDFA`, border 1.5px `#CCFBF1`, text `#0F766E`, font `label-md` (16px).
- **Dismiss Control**: Includes a persistent, high-contrast tap zone (`24px × 24px`) with an explicit "X" icon with touch padding extending to 48px.

### 5. Input Fields & Search Bars
- **Styling**: Minimum height `56px`. Border 2px solid `#CBD5E1`, resting background `#FFFFFF`. Active focus border shifts to 2.5px solid `#0F766E`.
- **Text & Placeholder**: Input font `body-lg` (18px, `#0F172A`), placeholder `#475569`. Helper text remains minimum 15px (`label-sm`).
- **Icons**: Prepend a 24px medical search icon; include a one-tap clear button ("✕") sized at 48px target bounds.

### 6. Bottom Navigation Bar
- **Dimensions**: Total bar height `72px` with a persistent top border 1.5px `#E2E8F0` on white surface `#FFFFFF`.
- **Tabs**: 4 targets (Home, Scan, Schedule, Settings). Each item spans a minimum width of `75px` and `64px` height.
- **Active State**: Primary teal `#0F766E` active icon and label (15px bold). Inactive state in `#475569`. Active icon receives a subtle `#F0FDFA` pill highlight behind it.

### 7. Privacy Promise Banner
- **Format**: High-trust horizontal banner positioned at camera intake and upload sections.
- **Styling**: `#F0FDFA` container, 1.5px `#CCFBF1` border, 12px radius, padding `16px`.
- **Content Structure**: Prominent 24px Teal Lock icon (`#0F766E`), bold header ("Your photos stay on this phone"), and reassuring body copy explaining on-device scanning.

### 8. Language Switcher & Large Text Toggle
- **Global Header Control**: Always visible in the top app bar as a quick-switch bottom sheet launcher displaying language options in their native orthography: "English", "हिन्दी", "ಕನ್ನಡ", "தமிழ்".
- **Toggle Mechanism**: Segmented pill switch with clear dual-state indicator and haptic feedback confirmation.