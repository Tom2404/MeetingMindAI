# Design System Inspired by Notion

## 1. Visual Theme & Atmosphere

Notion's design system embodies a clean, collaborative, and professional aesthetic centered around clarity and productivity. The interface prioritizes content over decoration, using a sophisticated neutral foundation paired with selective accent colors to guide user attention. The visual language feels premium yet approachable, balancing minimalist white space with carefully considered typographic hierarchy. Soft, muted earth tones and pale blues create a calming backdrop for work, while a vibrant primary blue serves as the action accelerator. The overall mood is one of intelligent simplicity—designed for teams and AI agents working together seamlessly across a unified workspace.

**Key Characteristics**
- Clean, content-first layout with generous whitespace
- Sophisticated neutral palette anchored by near-black and off-white
- Selective use of muted accent colors for emphasis and state indication
- Minimal depth and shadow treatment for flat, modern appearance
- Accessible typography with clear hierarchy and readability
- Soft, understated interaction states avoiding harsh contrast
- Professional yet human-centered tone throughout

## 2. Color Palette & Roles

### Primary
- **Brand Black** (`#37352F`): Core dark neutral used extensively across UI elements, text, and structural components; foundational tone for serious, professional context
- **Primary Blue** (`#2383E2`): Main call-to-action color for buttons, links, and interactive elements; represents primary user intent and navigation
- **Primary Blue Alt** (`#2783DE`): Variant of primary blue for hover and active states; ensures interactive feedback clarity

### Accent Colors
- **Pale Blue** (`#B6D4F3`): Soft background tint for secondary features and non-critical information containers
- **Cream** (`#FBF3DB`): Warm, light accent for complementary information panels and subtle highlights
- **Warm Beige** (`#EACCB2`): Tertiary accent for tertiary actions and supporting UI elements
- **Sage** (`#BED9C9`): Cool accent for positive states and collaborative features
- **Light Taupe** (`#E0CDC0`): Muted accent for inactive or secondary containers

### Interactive
- **Link Teal** (`#7D7A75`): Secondary link and subtle text color for contextual information; reduced contrast for de-emphasized content
- **Hover Text** (`#8E8B86`): Tertiary text for disabled or tertiary interactive states
- **Focus Ring** (`#A19E99`): Subtle focus indicator color for keyboard navigation and accessibility

### Neutral Scale
- **Pure Black** (`#000000`): Deepest neutral for maximum contrast text; highest emphasis content
- **Off-Black** (`#040404`): Near-black for primary body text and UI components; dominant color in the system
- **Dark Gray** (`#2C2C2B`): Secondary text and secondary UI elements; slightly reduced emphasis
- **Medium Gray** (`#D4D3CF`): Tertiary text, dividers, and subtle borders

### Surface & Borders
- **Pure White** (`#FFFFFF`): Primary background surface for cards, modals, and content areas; clean, neutral backdrop

### Semantic / Status
- **Error Red** (`#CD3C3A`): Error states, warnings, and destructive actions; signals user attention required for correction

## 3. Typography Rules

### Font Family
- **Primary Font**: `inter`, fallback stack: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- **Display Font**: `ui-sans-serif`, fallback stack: `-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif`

### Hierarchy

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
|------|------|------|--------|-------------|-----------------|-------|
| Display | ui-sans-serif | 32px | 600 | 40px | -0.5px | Hero titles and page headers |
| Heading 1 | inter | 28px | 600 | 34px | -0.3px | Major section headings |
| Heading 2 | inter | 24px | 600 | 30px | 0px | Subsection headings |
| Heading 3 | inter | 20px | 600 | 26px | 0px | Small headings and card titles |
| Body Large | inter | 16px | 400 | 24px | 0px | Primary body text and descriptions |
| Body | inter | 14px | 400 | 20px | 0px | Default body text and form labels |
| Body Small | inter | 12px | 400 | 16px | 0px | Secondary text and captions |
| Button | inter | 16px | 500 | 24px | 0px | Button and CTA labels |
| Label | inter | 12px | 500 | 16px | 0px | Form labels and small emphasis |
| Input | inter | 15px | 400 | 26px | 0px | Form input text |
| Caption | inter | 12px | 400 | 16px | 0px | Helper text and footnotes |
| Link | ui-sans-serif | 16px | 400 | 24px | 0px | Text links and secondary actions |
| Code | `Menlo`, monospace | 13px | 400 | 18px | 0px | Code snippets and preformatted text |

### Principles
- Hierarchy is established through size, weight, and color rather than multiple font families
- Line heights maintain 1.5x ratio for optimal readability on screens
- Letter spacing remains tight (0px) for modern, clean appearance except display text
- Inter font provides excellent clarity at small sizes for UI labels and form text
- Weight progression: 400 for regular content, 500 for emphasis, 600 for headings ensures clear distinction
- Accessibility maintained through sufficient contrast and readable sizes (minimum 14px for body text)

## 4. Component Stylings

### Buttons

**Primary Button**
- Background: `#2383E2`
- Text Color: `#FFFFFF`
- Font Size: `16px`
- Font Weight: `500`
- Font Family: `inter`
- Padding: `12px 24px`
- Border Radius: `8px`
- Border: `none`
- Height: `48px`
- Line Height: `24px`
- Box Shadow: `none`
- Hover State: Background `#2178D0`, cursor pointer
- Active State: Background `#1B62B8`
- Disabled State: Background `#D4D3CF`, color `#8E8B86`, cursor not-allowed

**Secondary Button**
- Background: `#F5F5F4`
- Text Color: `#37352F`
- Font Size: `16px`
- Font Weight: `500`
- Font Family: `inter`
- Padding: `12px 24px`
- Border Radius: `8px`
- Border: `1px solid #D4D3CF`
- Height: `48px`
- Line Height: `24px`
- Box Shadow: `none`
- Hover State: Background `#ECECEB`, border `#A19E99`
- Active State: Background `#E8E8E7`, border `#8E8B86`
- Disabled State: Background `#F5F5F4`, color `#A19E99`, border `#D4D3CF`, cursor not-allowed

**Ghost Button**
- Background: `transparent`
- Text Color: `#7D7A75`
- Font Size: `16px`
- Font Weight: `400`
- Font Family: `inter`
- Padding: `0px 8px`
- Border Radius: `4px`
- Border: `none`
- Height: `auto`
- Line Height: `24px`
- Box Shadow: `none`
- Hover State: Background `rgba(0,0,0,0.04)`, color `#37352F`
- Active State: Background `rgba(0,0,0,0.08)`, color `#2C2C2B`

### Cards & Containers

**Primary Card**
- Background: `#FFFFFF`
- Text Color: `#040404`
- Padding: `24px`
- Border Radius: `12px`
- Border: `1px solid #D4D3CF`
- Box Shadow: `0px 1px 2px rgba(0,0,0,0.04)`
- Hover State: Border `#A19E99`, box-shadow `0px 2px 4px rgba(0,0,0,0.06)`

**Secondary Card**
- Background: `#F5F5F4`
- Text Color: `#2C2C2B`
- Padding: `20px`
- Border Radius: `8px`
- Border: `none`
- Box Shadow: `none`
- Hover State: Background `#ECECEB`

**Elevated Container**
- Background: `#FFFFFF`
- Padding: `32px 40px`
- Border Radius: `16px`
- Border: `none`
- Box Shadow: `0px 4px 12px rgba(0,0,0,0.08)`

### Inputs & Forms

**Text Input Default**
- Background: `rgba(0,0,0,0)`
- Text Color: `#040404`
- Font Size: `15px`
- Font Weight: `400`
- Font Family: `inter`
- Padding: `0px`
- Border Radius: `0px`
- Border: `0px none`
- Height: `26px`
- Line Height: `26px`
- Box Shadow: `none`
- Placeholder Color: `#A19E99`

**Text Input Active**
- Border Bottom: `2px solid #2383E2`
- Padding: `8px 12px`
- Border Radius: `4px`
- Background: `#FFFFFF`
- Box Shadow: `0px 0px 0px 3px rgba(35,131,226,0.1)`

**Text Input Error**
- Border: `1px solid #CD3C3A`
- Box Shadow: `0px 0px 0px 3px rgba(205,60,58,0.1)`
- Background: `#FFFFFF`

**Label**
- Font Size: `12px`
- Font Weight: `500`
- Font Family: `inter`
- Color: `#37352F`
- Line Height: `16px`
- Margin Bottom: `8px`

**Helper Text**
- Font Size: `12px`
- Font Weight: `400`
- Font Family: `inter`
- Color: `#7D7A75`
- Line Height: `16px`
- Margin Top: `4px`

### Navigation

**Primary Navigation Link**
- Background: `#2783DE`
- Text Color: `#FFFFFF`
- Font Size: `16px`
- Font Weight: `400`
- Font Family: `ui-sans-serif`
- Padding: `12px 12px`
- Border Radius: `16px`
- Height: `48px`
- Line Height: `24px`
- Box Shadow: `none`
- Hover State: Background `#2278D0`
- Active State: Background `#1B62B8`, text-decoration underline

**Secondary Navigation Link**
- Background: `transparent`
- Text Color: `#7D7A75`
- Font Size: `14px`
- Font Weight: `400`
- Font Family: `inter`
- Padding: `0px`
- Border Radius: `0px`
- Line Height: `20px`
- Box Shadow: `none`
- Hover State: Color `#37352F`, text-decoration underline
- Active State: Color `#040404`, font-weight `500`

**Breadcrumb Navigation**
- Font Size: `14px`
- Font Weight: `400`
- Font Family: `inter`
- Color: `#7D7A75`
- Separator: `/` with color `#D4D3CF`
- Active Item Color: `#040404`, font-weight `500`
- Link Hover: Color `#37352F`

### Social Authentication Buttons

**OAuth Button (Google, Apple, Microsoft, Passkey, SSO)**
- Background: `#FFFFFF`
- Text Color: `#2C2C2B`
- Font Size: `14px`
- Font Weight: `500`
- Font Family: `inter`
- Padding: `12px 20px`
- Border Radius: `8px`
- Border: `1px solid #D4D3CF`
- Height: `48px`
- Display: flex, align-items center, justify-content center
- Icon Size: `20px`, margin-right `8px`
- Hover State: Background `#F5F5F4`, border `#A19E99`
- Active State: Background `#ECECEB`, border `#8E8B86`

## 5. Layout Principles

### Spacing System
The spacing system is built on a `4px` base unit with a consistent scale for predictable rhythm and alignment. Spacing is applied contextually: tighter spacing (`4px`, `8px`) for form inputs and dense UI; moderate spacing (`12px`, `16px`) for component padding; generous spacing (`24px`, `32px`, `40px`) for container margins and section separation; and extra-large spacing (`96px`, `112px`) for hero sections and major layout breaks.

- **Micro**: `4px` (form element gaps, tight grouping)
- **Compact**: `8px` (input field gaps, button groups)
- **Comfortable**: `12px` (label-input spacing, button padding)
- **Balanced**: `16px` (card padding, component spacing)
- **Spacious**: `20px`, `24px` (section margins, container padding)
- **Generous**: `32px`, `36px` (major section breaks, grid gaps)
- **Extra Large**: `40px`, `44px` (modal padding, container spacing)
- **Hero**: `96px`, `112px` (full-page section margins, banner spacing)

### Grid & Container
- **Max Width**: `1280px` for main content container; `960px` for form cards and modals
- **Column Strategy**: 12-column responsive grid with `16px` gutters on desktop, `12px` on tablet, `8px` on mobile
- **Section Patterns**: Hero sections span full width with `112px` vertical margin; content sections use centered containers with `40px` horizontal padding on desktop
- **Form Containers**: Centered modal width of `600px` maximum on desktop, full width minus `24px` padding on mobile
- **Card Grid**: 2–4 columns on desktop depending on content, single column on mobile, with `20px` gap between cards

### Whitespace Philosophy
Whitespace is treated as a first-class design element, not leftover space. Ample whitespace around content creates visual clarity and reduces cognitive load. Margins and padding use the spacing scale consistently to establish visual hierarchy through distance. Content is never crammed; breathing room is provided between major sections, allowing users to scan and comprehend information naturally.

### Border Radius Scale
- **Sharp**: `0px` (form inputs, utility components)
- **Subtle**: `4px` (buttons, small interactive elements)
- **Rounded**: `8px` (cards, secondary containers)
- **Soft**: `12px` (elevated cards, primary containers)
- **Full**: `16px` (CTA buttons, feature callouts, badges)
- **Pill**: `24px` (rounded tabs, pill buttons)
- **Full Circle**: `50%` (avatars, status indicators)

## 6. Depth & Elevation

| Level | Treatment | Use |
|-------|-----------|-----|
| Base (L0) | No shadow, `border: 1px solid #D4D3CF` | Flat surfaces, borders only |
| Raised (L1) | `box-shadow: 0px 1px 2px rgba(0,0,0,0.04)` | Cards, containers on base |
| Lifted (L2) | `box-shadow: 0px 2px 4px rgba(0,0,0,0.06)` | Hovered cards, secondary containers |
| Elevated (L3) | `box-shadow: 0px 4px 12px rgba(0,0,0,0.08)` | Modals, popovers, primary containers |
| Floating (L4) | `box-shadow: 0px 8px 24px rgba(0,0,0,0.12)` | Dropdowns, tooltips, overlays |
| Modal (L5) | `box-shadow: 0px 12px 32px rgba(0,0,0,0.16)` | Full-screen modals, stacked modals |

**Shadow Philosophy**: Shadows are subtle and minimal, used sparingly to indicate layering and interactive state rather than create dramatic depth. Most surfaces use borders instead of shadows for primary definition. Shadows increase only on interaction (hover, focus) or for components that float above content (modals, dropdowns). The system prioritizes flatness and clarity over skeuomorphic depth.

## 7. Do's and Don'ts

### Do
- Use the primary blue (`#2383E2`) for all primary calls-to-action and main interaction points
- Apply generous whitespace between major sections; use `24px` to `40px` margins as default
- Stack elements vertically on small screens; ensure touch targets are minimum `44px` in height
- Maintain at least 4.5:1 contrast ratio for all text (dark text on light, or vice versa)
- Use `inter` font for all UI text; use `ui-sans-serif` for navigation and links
- Group related inputs with `8px` spacing; use `12px` label-to-input spacing
- Reserve red (`#CD3C3A`) exclusively for errors and destructive actions
- Use border-radius `8px` to `12px` for most components; `16px` for prominent actions
- Apply subtle hover states with background or border color changes; keep animations under 200ms
- Test keyboard navigation; ensure focus states are visible with `box-shadow: 0px 0px 0px 3px rgba(35,131,226,0.1)`

### Don't
- Don't use multiple font families; stick to `inter` for consistency
- Don't apply shadows to components without interactive purpose; use borders instead
- Don't use text smaller than `12px` without strong justification
- Don't combine dark text with dark backgrounds; maintain minimum `#A19E99` for secondary text on white
- Don't add unnecessary rounded corners; keep base radius minimal (`4px–8px`)
- Don't use harsh color transitions; blend accent colors subtly with neutrals
- Don't apply bold weight to body text; reserve `600px` weight for headings only
- Don't use color alone to convey status; include iconography or text labels for errors and warnings
- Don't create hover states that change layout or cause content shifts; animations should be stable
- Don't use the full black (`#000000`) for large text blocks; use `#040404` or `#2C2C2B` instead

## 8. Responsive Behavior

### Breakpoints

| Name | Width | Key Changes |
|------|-------|-------------|
| Mobile | `320px–639px` | Single column, full-width containers with `12px` padding, stacked form inputs, `12px` font size for body |
| Tablet | `640px–1023px` | Two columns, `16px` gutters, `16px` padding, increased form spacing, `14px` font size for body |
| Desktop | `1024px–1280px` | Three to four columns, `16px` gutters, `24px` padding, full form layouts, `16px` font size for body |
| Wide | `1280px+` | Full width with max-width container, `40px` padding, optimized multi-column layouts |

### Touch Targets
- **Minimum Height**: `44px` for all interactive elements (buttons, links, form controls)
- **Minimum Width**: `44px` for icon buttons; `120px` for text buttons
- **Spacing Between Targets**: Minimum `8px` on mobile, `12px` on tablet and desktop to prevent accidental taps
- **Form Inputs**: `44px` height on mobile for comfortable interaction; `40px` on desktop
- **Navigation Items**: `48px` height for primary navigation, `44px` for secondary
- **Touchable Affordance**: Add visual feedback (background change, border highlight) on touch/hover for all interactive components

### Collapsing Strategy
- **Hero Sections**: Reduce vertical margin from `112px` to `48px` on tablet, `24px` on mobile
- **Container Padding**: `40px` on desktop → `24px` on tablet → `12px` on mobile
- **Grid Columns**: 4 columns (desktop) → 2 columns (tablet) → 1 column (mobile)
- **Form Width**: `600px` max (desktop) → `95vw` with `12px` padding (tablet/mobile)
- **Card Padding**: `24px` (desktop) → `16px` (tablet) → `12px` (mobile)
- **Font Sizes**: Body text remains `14px–16px` on all breakpoints; display text scales: `32px` (desktop) → `24px` (tablet) → `20px` (mobile)
- **Navigation**: Horizontal nav items collapse to hamburger menu below `640px` width
- **Modal Dialogs**: Full-screen on mobile with `12px` margin; `600px` max-width on tablet/desktop

## 9. Agent Prompt Guide

### Quick Color Reference
- **Primary CTA**: Primary Blue (`#2383E2`)
- **Primary CTA Hover**: Primary Blue Alt (`#2783DE`)
- **Button Text**: Off-Black (`#040404`)
- **Body Text**: Off-Black (`#040404`)
- **Secondary Text**: Dark Gray (`#2C2C2B`)
- **Tertiary Text**: Link Teal (`#7D7A75`)
- **Background**: Pure White (`#FFFFFF`)
- **Secondary Background**: Soft Neutral (`#F5F5F4`)
- **Borders**: Medium Gray (`#D4D3CF`)
- **Error State**: Error Red (`#CD3C3A`)
- **Focus Ring**: Focus Ring Color (`#A19E99`)
- **Headings**: Brand Black (`#37352F`)
- **Accents**: Pale Blue (`#B6D4F3`), Cream (`#FBF3DB`), Sage (`#BED9C9`)

### Iteration Guide
1. **Start with Off-Black** (`#040404`): Use this as the default text color for all body content and primary UI elements; it provides maximum readability while feeling less harsh than pure black.
2. **Primary Actions = Primary Blue** (`#2383E2`): All primary CTAs, main buttons, and first action paths use this blue; ensure `16px` font weight `500` and `12px 24px` padding for standard buttons (`48px` height).
3. **Spacing Default = 16px**: Use `16px` as the default padding for most components and spacing between elements; adjust up to `24px` for generous separation, down to `8px` for tight grouping.
4. **Border Radius = 8px–12px**: Most components use `8px` (cards) or `12px` (elevated containers); reserve `16px` only for prominent feature buttons or pills.
5. **Typography = Inter Only**: All UI text uses `inter` font; body text `14px` weight `400` line-height `20px`; labels `12px` weight `500` line-height `16px`; buttons `16px` weight `500` line-height `24px`.
6. **Shadows = Minimal & Contextual**: Base cards get subtle `0px 1px 2px rgba(0,0,0,0.04)` shadow; elevated modals get `0px 4px 12px rgba(0,0,0,0.08)`; use borders (`#D4D3CF`) as primary surface definition.
7. **Input States = Border + Shadow**: Default inputs have no visible border until focus; on focus add `2px solid #2383E2` bottom border with `box-shadow: 0px 0px 0px 3px rgba(35,131,226,0.1)`; errors use `1px solid #CD3C3A` with red focus shadow.
8. **Mobile-First Scaling**: Start at `320px` width with `12px` padding and single-column layout; scale up container padding to `24px` on tablet (`640px`), `40px` on desktop (`1024px`); form widths max at `600px`.
9. **Contrast & Accessibility**: Maintain `4.5:1` contrast minimum for all text; use `#A19E99` minimum for secondary/tertiary text on white; reserve pure black (`#000000`) only for emphasis or icons.
10. **Interactive Feedback = Immediate & Subtle**: Buttons and links show background/border color shift on hover (no layout shift); focus states add visible blue ring `rgba(35,131,226,0.1)`; transitions use `200ms` max for all property changes.