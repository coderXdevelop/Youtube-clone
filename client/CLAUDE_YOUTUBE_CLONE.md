# Claude Code Instructions — YouTube Clone Internship Project

Follow `AGENTS.md` as the primary repository-level coding instructions.

## Project Goal

Build and maintain a functional YouTube-style video-sharing application for an internship project. Favor simple, reliable, free-tier-friendly solutions over unnecessary infrastructure.

## Working Rules

- Inspect the repository before changing architecture.
- Preserve existing conventions unless there is a concrete reason to change them.
- Reuse existing components, APIs, utilities, models, and styles.
- Make focused changes instead of broad rewrites.
- Never expose or commit secrets.
- Never fabricate endpoints, credentials, database records, test results, or deployment results.

## Next.js

If this repository uses Next.js, the installed version may contain breaking changes. Before writing or modifying Next.js code, read the relevant documentation under:

`node_modules/next/dist/docs/`

Verify the installed Next.js version and follow the repository's current conventions rather than older patterns.

## YouTube Clone Priority

Prioritize the core flows:

1. Home/video feed
2. Search
3. Watch/playback page
4. Authentication
5. Channel pages
6. Subscribe/unsubscribe
7. Like/reaction
8. Comments
9. Video upload and metadata
10. Owner video management
11. Watch history/saved videos when required

Do not introduce live streaming, recommendation ML, transcoding infrastructure, DRM, payments, or other advanced systems unless explicitly requested.

## Implementation Expectations

### Frontend

- Responsive layouts.
- Reuse existing UI primitives.
- Add loading, empty, error, and unavailable states.
- Avoid unnecessary client state and API calls.
- Put shareable search/filter state in the URL when appropriate.
- Use accessible controls and meaningful image alt text.

### Backend

- Validate all client input.
- Enforce server-side authentication and authorization.
- Verify resource ownership before update/delete operations.
- Paginate potentially large collections.
- Avoid N+1 queries where practical.
- Return safe, consistent errors.

### Video/Uploads

- Use the configured media solution.
- Do not hard-code private credentials or private media URLs.
- Validate file type, size, and metadata where uploads are supported.
- Handle missing or failed media gracefully.

### Security

Pay particular attention to:

- Broken access control / IDOR
- XSS
- Injection
- Unsafe uploads
- Malicious URLs
- Session/token handling
- CORS
- Secret exposure

Do not weaken security just to bypass a development error.

## Verification

After changes, run the relevant available checks:

- Type checking
- Lint
- Tests
- Production build

Then manually verify the affected user flow when possible.

If a check cannot be run or fails because of a pre-existing issue, report that accurately instead of claiming success.

## Final Report

When completing a coding task, report:

- What changed
- Important files/components changed
- How the feature works
- Verification performed
- Remaining issues or required environment variables/setup

Keep the report factual and concise.
