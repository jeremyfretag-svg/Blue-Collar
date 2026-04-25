# feat: worker map view, notification center & portfolio gallery

## Summary

This PR implements three frontend features across issues #281, #273, and #272.

---

## Changes

### #281 — Worker Map View

- `WorkerMap.tsx` — Leaflet map with OpenStreetMap tiles, plots workers as markers using `latitude`/`longitude` fields. Dynamically imports `leaflet.markercluster` for dense-area clustering. Custom popup on marker click shows avatar, name, category, location and a "View Profile" link.
- `WorkersViewToggle.tsx` — Client component wrapping the workers list/map toggle. Renders a List/Map button pair; map is loaded via `next/dynamic` (SSR disabled). Replaces the static grid in the workers page.
- `workers/page.tsx` — Swapped static grid + EmptyState for `WorkersViewToggle`. Pagination remains server-rendered below.
- `package.json` — Added `leaflet.markercluster` + `@types/leaflet.markercluster`.
- `types/index.ts` — Added `latitude`, `longitude` fields to `Worker`.

### #273 — Notification Center

- `NotificationContext.tsx` — React context providing `notifications`, `unreadCount`, `markRead`, `markAllRead`, `addNotification`, `clearAll`. Persists to `localStorage`.
- `NotificationDropdown.tsx` — Bell icon with unread badge in the Navbar. Dropdown lists notifications with type badges (tip/review/contact/system), relative timestamps, mark-as-read per item, mark-all-read, and clear-all. Links to `/notifications/preferences`.
- `notifications/preferences/page.tsx` — Toggle switches for each notification type, persisted to `localStorage`.
- `[locale]/layout.tsx` — Wrapped providers with `NotificationProvider`.
- `Navbar.tsx` — Added `NotificationDropdown` to desktop action bar.

### #272 — Worker Portfolio Gallery

- `PortfolioGallery.tsx` — Grid gallery component with:
  - Lightbox via existing `ImageLightbox` for full-size viewing
  - Multi-file upload input
  - Drag-and-drop reordering
  - Inline caption editing (click caption area, blur/Enter to save)
  - Per-image remove button
  - Read-only mode for public profile view
- `workers/[id]/page.tsx` — Renders `PortfolioGallery` (read-only) when `portfolioImages` are present.
- `dashboard/workers/[id]/edit/page.tsx` — Adds editable `PortfolioGallery` section below the worker form with add/remove/reorder/caption handlers.
- `types/index.ts` — Added `PortfolioImage` type and `portfolioImages` field to `Worker`.

---

Closes #281
Closes #273
Closes #272
