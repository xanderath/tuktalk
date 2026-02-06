# KamJai Design Kit v1 — Guidance

Generated: 2026-02-05

This folder contains **reference assets from this chat** plus a **practical naming + export convention** to build a polished Web / iOS / Android app in both:
- **Retro Light (64-bit)**
- **Retro Dark (Neon Bangkok Nights)**

> Note: The included images are *reference comps*. For production, recreate key assets as **vector (SVG/AI/Figma)** and export platform sizes.

---

## 1) Folder map (what goes where)

- `01_brand/`
  - `01_logo/` Primary logo comps.
  - `02_app_icon/` Icon exploration comps.

- `02_ui/`
  - `01_modern_light/` Earlier “clean” UI direction (kept for comparison).
  - `02_retro_light_64bit/` The fun throwback direction (light).
  - `03_retro_dark_neon_64bit/` Dark mode neon direction.

- `03_tokens/`
  - `design_tokens.json` Color + type + radius + spacing suggestions.

- `04_specs/`
  - Export rules & checklists.

- `00_guidance/`
  - This document + naming rules.

---

## 2) File naming convention

Use this pattern:

`kamjai_<category>_<variant>_<platform>_<size>_<state>.<ext>`

Examples:
- `kamjai_logo_primary_light_rgb.svg`
- `kamjai_icon_retro_dark_ios_1024.png`
- `kamjai_ui_home_retroDark_ios_390x844.png`
- `kamjai_illustration_cityline_neon_web_1920x1080.png`

### Canonical variants
- `retroLight`
- `retroDarkNeon`

(Keep `modernLight` only if you intentionally support that design direction.)

---

## 3) Brand rules (retro + Thai swagger)

### Core vibe
- **Playful consumer game energy**, not language school.
- **Bangkok night life neon** for dark mode (Soi Cowboy / Nana / rooftop bars vibe).
- **Pixel / 64-bit UI chrome**, but keep readability high for Thai text.

### Icon + logo rules
- The **book + A + ก** remains your recognisable mark.
- Prefer the **heart as negative-space** (or micro-accent only).
- Keep details bold enough to survive 48px and 24px.

---

## 4) Typography recommendations

### Best practical setup (shipping-friendly)
- UI body: `Inter` (Latin) + `Noto Sans Thai` (Thai)
- Retro headings / badges: use a pixel display font for **Latin only**, and render Thai headings in Thai sans.

### If you want true Thai pixel type
- Create a small custom bitmap glyph set for Thai (subset you need), or commission a Thai-capable pixel font.
- Avoid auto “pixelation filters” on Thai text (often becomes illegible).

---

## 5) Color system

See `03_tokens/design_tokens.json`.

### Retro Light
- Backgrounds: warm off-whites
- Indigo for structure + saffron for energy
- Gold accent used sparingly (heart / spark / reward)

### Retro Dark Neon
- Background: near-black purple
- Neon accents: pink / cyan / lime / purple
- Indigo still anchors structure, saffron still means “go / primary action”
- Use **glow** as the “shadow” language (not drop shadows)

---

## 6) Component guidelines

### Buttons
- Retro light: chunky, slightly raised, crisp edges (2px stroke is OK)
- Dark neon: glow outline + saturated fill, but keep text readable (AA contrast)

### Cards
- Soft rounded rectangles (radius 14–20)
- In dark neon: subtle starfield + neon edge glows

### Navigation
- Bottom tabs with pixel icons (24px) and short labels (1 word)

---

## 7) Platform implementation notes

### iOS
- Prefer SF Symbols-like simplicity for icons (but pixel-styled).
- Ensure Dynamic Type still works (retro headings can be fixed-size; body should scale).

### Android
- Adaptive icon: build foreground and background layers.
- Material 3 can still be used under the hood — just skin tokens + shapes.

### Web
- Ship as PWA with icon exports in `manifest.json`.
- Use CSS variables derived from `design_tokens.json`.

---

## 8) What you should recreate as vector (priority order)

1. **App icon** (retroLight + retroDarkNeon)
2. **Primary logo lockups** (horizontal + stacked)
3. UI primitives:
   - buttons, chips, cards, tabs
4. Pixel icon set (SVG + “pixel aligned” grid)

---

## 9) QA checklist

- [ ] App icon legible at 24px and 48px
- [ ] Thai text remains readable on glow backgrounds
- [ ] Contrast passes for primary CTA text
- [ ] Color usage obeys: saffron = primary action; gold = heart/reward
- [ ] No “tourist motif” clichés; keep it Bangkok-modern

---

If you want, I can also generate a **starter Figma token file** format (or Style Dictionary format) from `design_tokens.json` for your dev pipeline.
