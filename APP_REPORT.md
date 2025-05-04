# UnifyPlan Web App: Detailed Report

## Overview

**UnifyPlan** is a collaborative planning platform designed for real-time teamwork on projects like house hunting, vacation planning, event organization, and more. The app is built with Next.js 15+, is fully compatible with Cloudflare Pages (Edge runtime), and uses a custom Google OAuth + JWT authentication system. The UI is modern, responsive, and mobile-friendly, with a focus on usability and security.

### Key Features
- Real-time collaboration on plans and routes
- Drag-and-drop reordering of items (using `@dnd-kit`)
- Google OAuth authentication with secure JWT cookies
- Edge runtime compatibility for fast, global deployments
- OpenStreetMap/Leaflet for mapping and routing (no Mapbox dependency)
- Activity feed, group chat, and polls for team engagement
- Modern, responsive UI with Tailwind CSS and Headless UI
- API endpoints for authentication, user info, and card management

---

## Table of Contents
- [Landing Page (`/`)](#landing-page-)
- [Plans Page (`/plans`)](#plans-page-)
- [Plan Details (`/plan/[groupId]`)](#plan-details-)
- [Planning Room (`/planning-room/[groupId]`)](#planning-room-)
- [Auth Pages (`/auth/login`, `/auth/signup`)](#auth-pages-)
- [Profile Page (`/profile`)](#profile-page-)
- [Sign-in/Sign-up Catch-All](#sign-in-sign-up-catch-all)
- [API Endpoints](#api-endpoints)
- [Other Notable Features](#other-notable-features)

---

## Landing Page (`/`)
- **Purpose:** Welcome users, explain the app, and drive signups.
- **Sections:**
  - Hero: Large headline, subheading, and call-to-action buttons ("Get Started", "Learn More").
  - Features: Highlights real-time collaboration, organization, mobile-friendliness, and security.
  - CTA: Encourages users to sign up and start planning.
- **Design:** Modern, gradient backgrounds, large imagery, and animated text (using `framer-motion`).
- **Navigation:** Links to `/plans` and feature anchor.

---

## Plans Page (`/plans`)
- **Purpose:** Main dashboard for users to view, create, and manage planning groups.
- **Features:**
  - List of all planning groups the user is part of.
  - Ability to create new groups.
  - Each group links to its own planning route and room.
  - Drag-and-drop reordering of groups (using `@dnd-kit`).
  - Group management options (edit, delete, etc.).
- **Protection:** Requires authentication (checked via Edge middleware).
- **UI:** Sidebar navigation, responsive layout, and group cards.

---

## Plan Details (`/plan/[groupId]`)
- **Purpose:** Visualize and manage a specific plan's route and stops.
- **Features:**
  - Sidebar: List of route stops (locations), with drag-and-drop reordering.
  - Map: Interactive map (Leaflet + OpenStreetMap + OSRM) showing the route and stops.
  - Drag-and-drop: Reorder stops, which updates the map route in real time.
  - Add/Edit/Remove Stops: Users can add new locations, edit notes, or remove stops.
  - Current Location: Option to add the user's current location as a stop.
- **Protection:** Requires authentication.
- **UI:** Responsive flex layout, map fills available space, sidebar for stops.

---

## Planning Room (`/planning-room/[groupId]`)
- **Purpose:** Collaborative space for group chat, activity feed, and card-based planning.
- **Features:**
  - Group Chat: Real-time messaging for group members.
  - Polls: Create and vote on polls within the chat.
  - Cards: Add "What" and "Where" cards for planning activities and locations.
  - Drag-and-drop: Reorder cards within the group.
  - Reactions: Like/dislike cards and messages.
  - Activity Feed: Shows recent actions (card added, poll created, etc.).
- **Protection:** Requires authentication.
- **UI:** Three-column layout (cards, chat, activity), modals for new cards/polls.

---

## Auth Pages (`/auth/login`, `/auth/signup`)
- **Login (`/auth/login`):**
  - Uses Google Identity Services for OAuth.
  - On success, exchanges Google ID token for a JWT via `/api/auth/login`.
  - JWT is set as an HttpOnly cookie.
  - Handles error states and redirects.
- **Signup (`/auth/signup`):**
  - (If implemented) Would allow new users to register, but currently Google OAuth is the main flow.
- **Security:** All sensitive tokens are HttpOnly and never exposed to client JS.

---

## Profile Page (`/profile`)
- **Purpose:** Display the logged-in user's profile information.
- **Features:** Shows user info fetched from `/api/me` (decoded from JWT).
- **Protection:** Requires authentication.

---

## Sign-in/Sign-up Catch-All
- **Routes:** `/sign-in/[[...rest]]`, `/sign-up`
- **Purpose:** Handle edge cases or legacy redirects for sign-in/sign-up.
- **Implementation:** Minimal, likely just redirects or placeholder content.

---

## API Endpoints
- **`/api/auth/login`**: Verifies Google ID token, issues JWT, sets cookie.
- **`/api/auth/logout`**: Clears JWT cookie.
- **`/api/me`**: Returns user info from JWT.
- **`/api/cards`**: CRUD for planning cards (activities/locations).
- **`/api/test-edge`**: Test endpoint for Edge runtime compatibility.

---

## Other Notable Features
- **Edge Middleware:** All protected routes are enforced at the edge for performance and security.
- **Environment Variables:** Uses Cloudflare Pages secrets for all sensitive config (Google OAuth, JWT secret, etc.).
- **No Mapbox:** All mapping is done with OpenStreetMap and OSRM, no Mapbox dependencies.
- **No Client-Side Cookie Checks:** All auth is handled server-side for security.
- **Modern Tooling:** Uses Tailwind CSS, Headless UI, Framer Motion, and DnD Kit for a modern UX.

---

## Per-Page Summary Table

| Route                                 | Purpose/Features                                                                                  | Auth Required |
|----------------------------------------|---------------------------------------------------------------------------------------------------|---------------|
| `/`                                   | Landing page, features, CTA                                                                       | No            |
| `/plans`                              | Dashboard, group management, DnD                                                                  | Yes           |
| `/plan/[groupId]`                     | Route planning, map, stops, DnD                                                                   | Yes           |
| `/planning-room/[groupId]`            | Group chat, cards, polls, activity feed, DnD                                                      | Yes           |
| `/auth/login`                         | Google OAuth login                                                                                | No            |
| `/auth/signup`                        | (If present) Signup                                                                              | No            |
| `/profile`                            | User profile info                                                                                 | Yes           |
| `/sign-in/[[...rest]]`, `/sign-up`    | Catch-all/legacy sign-in/up                                                                       | No            |
| `/api/auth/login`                     | Google token exchange, JWT issue                                                                  | -             |
| `/api/auth/logout`                    | JWT cookie clear                                                                                  | -             |
| `/api/me`                             | User info from JWT                                                                                | Yes (cookie)  |
| `/api/cards`                          | Card CRUD                                                                                         | Yes (cookie)  |
| `/api/test-edge`                      | Edge runtime test                                                                                 | -             |

---

## How to Use This Report
- Copy this content into a file named `APP_REPORT.md` or similar.
- Use it for onboarding, documentation, or audits.
- Update as you add new features or pages.

---

If you want even more detail (e.g., prop types, API request/response shapes, or code-level docs for each component), let me know! 