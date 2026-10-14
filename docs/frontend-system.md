# Gaming Café ERP Frontend System

## 1. Product workflow analysis
P0 workflows are staff speed workflows: identify station state, start walk-in, pause/resume, end session, collect payment, and review arriving reservations. The dashboard is the operational home; drawers are used for station context so staff do not lose floor awareness.

## 2. Information architecture and routes
- `/admin` and `/admin/stations`: live floor command center
- `/admin/sessions`: active session operations
- `/admin/payments`: payment collection and revenue
- Planned modules: reservations, customers, memberships, wallets, POS, inventory, maintenance, staff, analytics, gaming, settings

## 3. Roles and permission model
Current roles: `customer`, `staff`, `admin`. The shell is ready for permission metadata per navigation item. Backend remains authoritative through `requireStaff()` / `requireAdmin()` server checks; frontend permissions must not be treated as security.

## 4. Design system
Tokens now emphasize a restrained premium gaming ERP: `--erp-bg`, `--erp-bg-secondary`, `--erp-surface`, `--erp-surface-interactive`, `--erp-border`, `--erp-primary`, semantic success/warning/danger/maintenance/offline. Status styling is centralized in `src/features/operations/status.ts`.

## 5. App shell
Admin routes use a dedicated fixed operations shell with collapsible sidebar, branch selector, breadcrumb/header, search trigger, quick actions, notifications affordance, role/profile display, and mobile navigation.

## 6. Station and session UX
The dashboard uses domain components: `StationGrid`, `StationCard`, `StationDrawer`, `StationStatusBadge`, `SessionTimer`, and `MetricCard`. Station actions remain in context. Ending a session uses explicit confirmation copy and shows a settlement notice instead of a generic alert.

## 7. Data, realtime, and state architecture
Current data loads are server-side and passed into client islands. Server actions handle mutations. Client state is normalized enough for station/session updates by ID. Timer updates use one shared `ClockProvider`; cards do not create independent intervals. Supabase Realtime should be added as a single feature-level manager feeding the same normalized station/session state.

## 8. Loading/error/empty states
Dashboard panels include actionable empty states. Errors are inline and persistent enough to read. Placeholder module pages document expected loading, empty, error, offline, and unauthorized states until those features are implemented.

## 9. Accessibility and performance
Admin controls use semantic buttons/links, visible focus rings, labels, `aria-current`, dialog roles, `Esc` handling, and text labels in addition to color. Client components are isolated to interaction-heavy surfaces; server pages remain server components.

## 10. Production audit focus
Before production: add centralized realtime subscriptions, complete permission-aware components, replace placeholder modules with real workflows, add tests for P0 financial/session flows, inspect route JS bundles, and profile station-grid rerenders with 50–100 stations.
