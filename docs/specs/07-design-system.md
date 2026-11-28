# 07 — Design System & UI Architecture (v2.0 Academic Navy)

ProjectCompass uses a **WCAG 2.1 AA Academic Navy** light-theme design system adapted from the official Google Stitch project (`ProjectCompass FYP Platform`), implemented in Tailwind CSS v4 (`src/app/globals.css`).

---

## 1. Color Tokens

| Token | Hex | Usage |
| :--- | :--- | :--- |
| `--brand-primary` / `primary-container` | `#112D4E` | Primary CTA buttons, active sidebar pill, institutional headers |
| `--brand-primary-hover` / `primary` | `#001833` | Button hover states, high-contrast display headings |
| `--color-secondary` | `#2A609C` / `#3F72AF` | Secondary interactive accents, focus rings, eyebrow labels |
| `--status-success` / `tertiary` | `#004F53` / `#71C9CE` | Verified status dots, Aqua badges (`#E3FDFD` tint) |
| `--bg-canvas` / `surface` | `#F9F7F7` | Main workspace background |
| `--bg-surface` / `surface-container-lowest` | `#FFFFFF` | Cards, modals, form inputs |
| `--bg-subtle` / `surface-container-low` | `#F5F3F3` | Sidebar background, secondary surfaces |
| `--border-default` | `#DBE2EF` | Crisp structural hairline borders |
| `--status-warning` | `#B45309` (`#FEF3C7` tint) | Moderate duplicate risk, pending attention states |
| `--status-error` | `#BA1A1A` (`#FFDAD6` tint) | High duplicate risk, validation alerts, destructive actions |

---

## 2. Typography (Zero Slashed-Zero Monospace)

- **Headings (`h1`–`h6`):** `Plus Jakarta Sans`, `DM Sans`, system sans-serif. Headings inherit color from their container (`var(--text-primary)` on light surfaces; `text-white` inside dark Academic Navy banners).
- **Body, Labels & Numeric Metrics:** `Inter`, system sans-serif.
- **Tabular Numeric Alignment (`.font-mono-tabular`):** Uses `Inter` with `font-variant-numeric: tabular-nums; font-feature-settings: "tnum" 1, "cv05" 1;` so KPIs, years, scores, and clock digits align cleanly **without** harsh coding-terminal slashed zeros.

---

## 3. Brand Mark & Zero-Network Inline SVG Icons

- **Official SVG Logo Mark:** `<ProjectCompassLogo />` (`src/components/ui/project-compass-logo.tsx`), `public/projectcompass-logo.svg`, and site favicon `src/app/icon.svg` (Astrolabe Compass in Academic Navy & Aqua, namespaced via React `useId()`).
- **Icon System (`<AppIcon />`):** All UI icons render via `src/components/ui/app-icon.tsx` backed 100% by **`lucide-react`** inline SVGs (`aria-hidden="true"`). External icon fonts (`material-symbols-outlined`) are strictly forbidden to prevent raw ligature leakage.

---

## 4. AppShell & Single Collapsible Sidebar (`Ctrl+B`)

- **Desktop (`>= 1024px`):** Fixed `248px` left sidebar with a single `PanelLeftClose` collapse button in the sidebar header. When hidden, main content expands cleanly (`lg:pl-[248px]` → `lg:pl-0`) and a single `PanelLeft` expand button + mini logo appears in the top bar. State persists in `localStorage` and supports `Ctrl+B` / `Cmd+B`.
- **Mobile & Tablet (`< 1024px`):** Sticky `56px` top bar with `PanelLeft` drawer toggle (`aria-label="Toggle workspace navigation"`), verified zero horizontal overflow at `375px` and `768px`.
- **Live Islamabad Clock (`<PakistanClock />`) & Portal Utilities (`<NotificationBell />`, `<ChangePinButton />`):** Live ticking `Asia/Karachi` (PKT / UTC+5) clock & role-scoped Notification Bell integrated in `AppShell` header, paired with self-service Change PIN modal in the sidebar footer.
