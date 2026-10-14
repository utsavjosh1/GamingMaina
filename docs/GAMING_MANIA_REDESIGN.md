# Gaming Mania — UI/UX Research, Design System & Redesign Specification

**Role:** Senior Product Designer + Senior Frontend Engineer + Design Engineer  
**Project:** Gaming Mania Delhi (https://gamingmaniadelhi.com)  
**Location:** B-95, Kalkaji, New Delhi  
**Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Drizzle ORM, Supabase / Postgres, Better-Auth  

---

## 1. Executive Summary & Existing Website Audit

### 1.1 What Gaming Mania Is
Gaming Mania is a premier physical gaming lounge and esports destination located in Kalkaji, South Delhi (operating since 2018). It features high-performance PC rigs (RTX & GTX tiers), PlayStation 5 & 4 setups, immersive Racing Simulators with force-feedback steering wheels, Virtual Reality experiences, billiards, air hockey, and casual arcade shooting.

### 1.2 Existing Application Audit

| Dimension | Current State | Issues / Gaps Identified | Redesign Solution |
| :--- | :--- | :--- | :--- |
| **Visual Identity** | Basic dark theme with violet accents | Generic template feel, flat cards, lacked cinematic punch | High-end dark tactical system (Obsidian/Charcoal with electric violet, tactical cyan, and subtle neon telemetry) |
| **Hero Section** | Standard 2-column layout with static images | Lacks energy, doesn't immediately immerse the visitor in the high-spec arena feel | Cinematic Hero with HUD telemetry badges, glowing callouts, dynamic live status, and layered visual collage |
| **Station Showcase** | Uniform grid of cards | Cards feel repetitive; hardware specs are not highlighted like gamer loadouts | "Hardware Loadout" cards with interactive spotlight, spec bars (GPU, 240Hz, Peripherals), and live availability chips |
| **Game Library** | Basic marquee and 2 category cards | Limited interactability; hard to search or filter games | Filterable interactive game grid with search, genre tags, and continuous ambient marquee |
| **Bento / Why Us** | Simple text columns | Missed opportunity for editorial rhythm and visual storytelling | Multi-tier interactive Bento Grid with live stats, venue facts, and feature highlights |
| **Booking UX** | Functional 4-step wizard | Good backend logic but UI looks dated and plain | Elevated cyberpunk-tactical booking terminal with clear step indicators, interactive slot matrix, and price breakdown |
| **Performance & A11y**| Fast static compilation | Motion wasn't standardized; reduced-motion needed full support | Hardware-accelerated CSS + Canvas, strict `@media (prefers-reduced-motion)`, semantic HTML, full keyboard navigation |

---

## 2. User Personas & Journey Mapping

### Persona 1: The Competitive Rank Pusher (PC Esports)
- **Cares about:** GPU tier (RTX 40-series), monitor refresh rate (240Hz), mechanical peripherals, low latency, team seating.
- **Key Journey:** Lands on hero → Scans PC-RTX specs → Checks hourly pricing & packages → Clicks "Book Your Setup" → Reserves 5-hour slot.

### Persona 2: The Weekend Squad (Console & Co-op)
- **Cares about:** PS5 availability, latest titles (Spider-Man 2, Tekken, EA FC, Mortal Kombat), comfortable lounge seating.
- **Key Journey:** Lands on hero → Explores game catalogue → Verifies PS5 rates & walk-in policy → Gets Google Maps directions or books online.

### Persona 3: The Experiential Gamer (VR & Racing Sim)
- **Cares about:** Force feedback steering wheels, immersive VR titles (Beat Saber), unique simulator equipment.
- **Key Journey:** Explores "Experiences" → Views Racing Rig & VR Holodeck specs → Books simulator session.

---

## 3. Component Research & Evaluation Matrix

We evaluated modern components from **Aceternity UI, React Bits, Magic UI, Cult UI, 21st.dev, Fancy Components, and 8bitcn/ui** against strict criteria:
1. Product Relevance (Does it fit a premium gaming venue?)
2. Performance & Bundle Size (Does it avoid multi-megabyte dependencies?)
3. Mobile Compatibility (Does it degrade gracefully on touch devices?)
4. Accessibility (Does it respect reduced-motion and screen readers?)

| Section / Component | Candidates Considered | Library Reference | Performance | Decision | Rationale & Adaptation |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Hero Background** | Hyperspeed (Three.js)<br>Canvas Grid Scan<br>CSS Ambient Glow | React Bits<br>React Bits<br>Custom | Low (Hyperspeed)<br>High (Grid Scan)<br>Ultra-High (CSS) | **Adopted: Bespoke Canvas Grid Scan + Ambient Beams** | Three.js Hyperspeed adds >500KB JS and heavy GPU load. A bespoke, lightweight 2KB Canvas Grid Scan with hardware-accelerated ambient glows achieves 60fps with zero bundle weight and auto-pauses when offscreen. |
| **Station Cards** | Glare Card (Aceternity)<br>Spotlight Card (React Bits)<br>Cutout Card (Cult UI) | Aceternity<br>React Bits<br>Cult UI | High<br>High<br>High | **Adopted: Bespoke Gaming Spotlight Card with Loadout HUD** | Pointer-following spotlight draws focus to hardware specs without layout jitter. Includes mobile fallback and reduced-motion detection. |
| **Live Stats / Numbers** | Number Ticker<br>Count Up | Magic UI<br>React Bits | High | **Adopted: Bespoke Number Ticker** | Animates venue stats (24+ stations, 2018 established, 240Hz) with smooth requestAnimationFrame easing and tabular monospace figures. |
| **Border Effects** | Border Beam<br>Glowing Neon Outline | Magic UI<br>Generic CSS | High | **Adopted: Subtle Border Beam for Hero CTA & Featured Cards** | A single travelling light beam highlights the primary "Book Now" action and special package cards without overpowering content. |
| **Game Showcase** | 3D Carousel<br>Dual-Track Marquee + Interactive Filter Grid | Fancy Components<br>Magic UI / Aceternity | Medium (3D)<br>Ultra-High (Marquee) | **Adopted: Dual-Track Infinite Marquee + Filterable Grid** | GPU-accelerated CSS marquee with hover-pause, paired with instant genre filtering (FPS, Story, Sports, Fighting, VR). |
| **Typography Effects** | Decrypted Text<br>Shiny Shimmer Text<br>Glitch Text | React Bits<br>React Bits<br>8bitcn | High | **Adopted: Decrypted Text for HUD Eyebrows + Shiny Text for Headings** | Scrambles tech badges ("MATCH READY", "PLAYER 01") into place on load; uses subtle CSS shimmer on key gradient titles. |
| **Status Indicators** | Pixel Badges<br>Pulsing Live Dot | 8bitcn<br>Magic UI | Ultra-High | **Adopted: Hybrid Tactical HUD Badges** | Monospace uppercase badges with pulsing status dots ("ONLINE Kalkaji", "AVAILABLE: 5/5"). |

---

## 4. Design System & Tokens (`GamingMania Token System`)

```text
Colors:
├── Base / Background:
│   ├── --gm-bg: #05060a (Deep Obsidian)
│   ├── --gm-bg-soft: #0a0d16 (Charcoal Surface)
│   ├── --gm-surface: rgba(14, 18, 28, 0.75) (Frosted Glass Panel)
│   └── --gm-surface-strong: #121724 (Elevated Card)
├── Text:
│   ├── --gm-text: #f8fafc (Near White)
│   ├── --gm-muted: #94a3b8 (Muted Slate)
│   └── --gm-subtle: #64748b (Subtle Gray)
├── Brand Accents:
│   ├── --gm-primary: #8b5cf6 (Electric Violet)
│   ├── --gm-primary-glow: rgba(139, 92, 246, 0.45)
│   ├── --gm-cyan: #06b6d4 (Tactical Cyan)
│   ├── --gm-cyan-glow: rgba(6, 182, 212, 0.35)
│   ├── --gm-emerald: #10b981 (Live / Available)
│   └── --gm-crimson: #f43f5e (Alert / Booked)
├── Borders:
│   ├── --gm-border: rgba(255, 255, 255, 0.08)
│   └── --gm-border-strong: rgba(255, 255, 255, 0.16)
└── Typography:
    ├── Display / Headings: Outfit (Geometric, Punchy, Black/Bold)
    ├── Body / Navigation: Inter / Geist (Clean, Highly Legible)
    └── Telemetry / HUD: SF Mono / JetBrains Mono (Tech Specs, Badges)
```

---

## 5. Information Architecture & Page Flow

```text
01. Global Floating Dock Navbar (Brand, Quick Nav, Live Status, Sign In / Profile, Book Now CTA)
02. Cinematic Hero Section (HUD Eyebrows, Headline, High-Impact CTAs, Spec Highlights, Layered Showcase)
03. Live Arena Telemetry Marquee (Live Games, Low Latency, 240Hz, PS5 4K, Wheel Sim, Kalkaji Hub)
04. Experience Zones (PC Arena, PS5 Lounge, Racing Sim, VR Holodeck, Arcade & Billiards)
05. Hardware Loadouts & Stations (Detailed Station Specs, Real-time Availability, Hourly Pricing)
06. Editorial Bento Grid ("The Gaming Mania Standard" — 24+ Rigs, 2018 Legacy, Local Hub, Zero Friction)
07. Interactive Game Library (Live Genre Filter, Search, Artwork Grid, Infinite Poster Wall)
08. Transparent Pricing & Packages (Hourly Rates, 5-Hour Pass, Happy Hour Rules, Member Discounts)
09. Venue Gallery & Atmosphere (Lounge Photography, Setup Mood, Equipment Showcase)
10. Authentic Player Proof (Gamer Profile-style Reviews & Verified Venue Strengths)
11. Location, Timings & Directions Hub (Interactive Map Info, Delhi Operating Hours, Kalkaji Directions)
12. FAQ & Ready-to-Play CTA Terminal
13. Global Footer (Sitemap, Hours, Copyright, Live Match Ready Status)
```

---

## 6. Functional Preservation Checklist

- [x] **Database & ORM:** Drizzle queries (`getStationTypeAvailability`, `getAvailableSlots`, `createBooking`, `cancelBooking`, `getUserBookings`) remain 100% untouched and functional.
- [x] **Authentication:** Better-Auth + Supabase Auth provider (`AuthProvider.tsx`) with Google OAuth and dev bypass fully preserved.
- [x] **Booking Engine:** `/book-online` wizard preserved with all 4 steps, real-time availability calculation, pricing rule logic, and conflict prevention.
- [x] **Dashboard:** `/dashboard` user booking management and cancellation flows preserved.
- [x] **Admin Operations:** `/admin` operations dashboard and shells preserved.
- [x] **SEO & Metadata:** LocalBusiness Schema JSON-LD, sitemap, robots, OpenGraph cards preserved and enriched.
