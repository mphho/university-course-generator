# Integration Plan

## Backend
- Folder: `services/course-api`
- Run from workspace root: `python3 -m uvicorn app.main:app --app-dir services/course-api --reload --port 8000` (the root working directory loads the workspace `.env`)
- Port: `8000`
- Build/syntax check from `services/course-api`: `python3 -m compileall -q app`
- Tests/lint from `services/course-api`: `python3 -m pytest -q`; `python3 -m ruff check app tests`
- Health: `GET /api/health`
- Generation uses the server-side `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_MODEL`, `OPENAI_REASONING_EFFORT`, and `OPENAI_TIMEOUT_SECONDS` settings.

## Frontend
- Folder: `services/course-web`
- Build: `npm --prefix services/course-web run build`
- Dev server: `npm --prefix services/course-web run dev -- --host 0.0.0.0`
- API seam: `services/course-web/src/api/index.ts`; keep `ApiClient` method-for-method in `src/api/types.ts` and swap the implementation there.
- Remove the mock client `services/course-web/src/api/mockClient.ts` and state switcher `services/course-web/src/api/previewState.ts` plus `services/course-web/src/components/MockStateSwitcher.tsx` after live wiring.
- Mock dataset: `services/course-web/src/mocks/courseData.ts`. Replace the starter course with live API data. It also contains suggested briefs: extract these to a frontend-owned reference catalog, preserve `listSuggestedBriefs()` on the `ApiClient` seam, and serve it locally because there is no approved suggested-brief API route. Do not add an unplanned backend endpoint.
- Local frontend contract types: `services/course-web/src/types/course.ts`. No shared package or import alias is planned; keep these as the typed API contract unless types are generated from the backend OpenAPI document, and remove mock-only shapes only after their consumers are migrated.

## API Routes
- `GET /api/health`
- `GET /api/courses`
- `GET /api/courses/{course_id}`
- `POST /api/courses/generate`
- `POST /api/courses/{course_id}/assignments/generate`
- `POST /api/courses/{course_id}/midterms/generate`
- `POST /api/courses/{course_id}/finals/generate`

Errors use `{ error: { code, message, details } }`. Request and response fields are camelCase on the wire. Suggested briefs are frontend-only and are not part of this route inventory.

## Data and Migrations
- Database: none; course and assessment records are held in `CourseStore` memory and reset on API restart.
- Migration tool/directory: none. No database connection environment variables.
- **NO database migrations and NO seed data are to be created.** Keep the existing Calculus 101 in-memory starter fixture as application content; it is not persistent database seed data.

## Shared Types
- Shared package/import alias: none planned.
- Frontend API contracts currently live in `services/course-web/src/types/course.ts`; backend Pydantic contracts live under `services/course-api/app/models/`.

## Services
- Azure-hosted services: none.
- Essential for live generation: local FastAPI API and the user-configured HKU Responses API (`OPENAI_*` settings); the Responses API credential remains backend-only.
- Enhancement services: none.

## Integration Results
- Database and migrations: not applicable. The plan uses an in-memory `CourseStore` and has no database connection or migration tool; the Calculus 101 starter course remains application content. No migration or seed data was created.
- Backend smoke test: all routes responded. `GET /api/health`, `GET /api/courses`, and `GET /api/courses/calculus-101` returned 200; an unknown course returned the structured 404 envelope. Course and assessment generation routes returned the expected structured 503 `PROVIDER_NOT_CONFIGURED` response because `OPENAI_API_KEY` is not configured in this environment.
- Frontend integration: `src/api/index.ts` now selects the typed fetch client in `src/api/client.ts`; Vite proxies `/api` to `http://127.0.0.1:8000`. Suggested briefs remain in the frontend-owned `src/data/suggestedBriefs.ts` catalog. The mock client, mock dataset, preview-state module, and state switcher were removed.
- End-to-end evidence: while FastAPI and Vite ran together, the browser loaded the course library and workspace through the Vite `/api` proxy. Backend logs recorded `GET /api/courses` and `GET /api/courses/calculus-101` with status 200; the browser rendered Calculus 101 and the live lecture “Limits and Continuity”.
- Validation: `npm --prefix services/course-web run build` passed; `python3 -m pytest -q services/course-api/tests` passed (12 tests); `npm --prefix services/course-web test` passed (5 tests). The source scan found no remaining mock or preview-state references in `services/course-web/src`.
