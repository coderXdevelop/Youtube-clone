# YouTube Clone Internship Project — Agent Instructions

## Project Context

This repository is an internship project to build a functional YouTube-style video platform. Treat the existing codebase as the source of truth for architecture, naming, APIs, and UI patterns.

The goal is a working video platform, not a static mockup. Prefer simple, reliable, free-tier-friendly solutions.

## Before Changing Code

1. Inspect the project structure, package manager, framework, database, authentication, API layer, and media/video strategy.
2. Read existing configuration and implementation before introducing new patterns.
3. Reuse existing components, utilities, API clients, types, styles, and database models.
4. Do not rewrite working code merely to impose a preferred architecture.
5. If Next.js is used, read the relevant guide in `node_modules/next/dist/docs/` before writing Next.js code because the installed version may contain breaking changes.

## Core YouTube Clone Scope

Prioritize these flows when they are part of the project requirements:

- Home/video feed
- Video cards and thumbnails
- Video watch page and playback
- Search and search results
- Channel/creator pages
- Authentication and user profile
- Subscribe/unsubscribe
- Like/reaction
- Comments and replies
- Video upload
- Video metadata: title, description, thumbnail, category/tags, visibility
- View counts and basic engagement tracking
- Watch history
- Saved/liked videos when required
- Responsive navigation/sidebar

Do not add live streaming, recommendation ML, transcoding infrastructure, DRM, payments, or monetization unless explicitly requested.

## Video and Media

- Use the project's existing media provider when one exists.
- Prefer free-tier or local-development solutions for this internship project.
- Never hard-code private credentials or production secrets.
- Store service configuration in environment variables.
- Validate uploaded files and metadata.
- Handle failed, missing, or unavailable video/thumbnail resources gracefully.

## Backend and Data

- Validate request bodies, query parameters, route parameters, and uploads.
- Enforce authentication and authorization on the server.
- Verify resource ownership before editing/deleting videos or comments.
- Prevent duplicate subscriptions, likes, and similar inconsistent records.
- Paginate feeds, search results, comments, and history when appropriate.
- Avoid N+1 database queries where practical.
- Preserve the existing database and migration conventions.

## Frontend

- Reuse the existing design system and components.
- Keep the application responsive on mobile, tablet, and desktop.
- Provide loading, empty, error, and unavailable states.
- Avoid unnecessary client-side state and duplicate business logic.
- Use URL state for search/filter/sort state when it should be shareable.
- Use accessible buttons, inputs, links, dialogs, and media controls.
- Provide meaningful image alt text and keyboard/focus support.

## API and Error Handling

- Follow the repository's existing API conventions.
- Use consistent success/error responses.
- Never expose secrets, stack traces, database errors, or internal implementation details to users.
- Handle expired sessions/tokens cleanly.
- Handle failed external services gracefully.

## Authentication and Authorization

Protected operations must verify the authenticated user on the server, including where applicable:

- Uploading videos
- Editing/deleting owned videos
- Editing/deleting owned comments
- Subscribing/unsubscribing
- Liking/unliking
- Reading private user data
- Updating profile information

Never trust a client-supplied user ID when the authenticated identity is available from the session/token.

## Security

Consider:

- XSS
- CSRF where applicable
- Injection
- Broken access control / IDOR
- Unsafe file uploads
- Malicious URLs
- Exposed secrets
- Overly permissive CORS
- Weak authentication/session handling

Do not disable security controls merely to make development work.

## Performance

- Optimize image and thumbnail loading.
- Lazy-load content that is not immediately needed.
- Avoid unnecessary API requests.
- Debounce search requests where appropriate.
- Paginate large collections.
- Do not fetch an entire feed when only one page is needed.
- Keep the watch page responsive while related videos/comments load.

## Code Quality

- Prefer small, focused functions/components.
- Use meaningful names.
- Keep TypeScript types accurate if TypeScript is used.
- Avoid `any` unless there is a documented reason.
- Remove dead code and unused imports introduced by changes.
- Do not silently swallow errors.
- Match existing formatting, linting, and project conventions.

## Verification

After meaningful changes:

1. Run the type checker if available.
2. Run linting.
3. Run relevant tests.
4. Build the application when practical.
5. Manually verify the affected user flow.

For feature work, check the happy path, auth behavior, empty state, error state, responsive behavior, refresh/navigation behavior, and duplicate-action behavior where relevant.

Do not claim a feature works unless it has been verified.

## Environment and Deployment

- Keep secrets in environment variables.
- Update `.env.example` when adding a required variable.
- Never commit `.env`, credentials, generated secrets, or private keys.
- Avoid machine-specific absolute paths.
- Document required setup changes.

## Internship Project Discipline

For every requested feature:

1. Identify affected files/components before broad changes.
2. Make the smallest complete change.
3. Preserve existing functionality.
4. Avoid dependencies unless they solve a real requirement.
5. If architecture conflicts with the requested feature, explain the conflict and use the least disruptive solution.
6. Clearly identify free-tier/local versus potentially paid external services.
7. Never fabricate API responses, credentials, test results, or deployment status.

## Definition of Done

A feature is complete only when it is connected to the real application data flow, has appropriate validation and authorization, handles loading/empty/error states, follows the existing architecture, introduces no secrets, and passes the relevant checks—or its failures are explicitly reported.
