# University Course Generator

A local-first proof of concept for drafting university-level courses with a React website and a Python API. The API calls the configured Responses API using a developer-supplied key; the browser never receives that credential.

## Course Design

Generated courses are designed backward from measurable learning outcomes, prerequisites, a coherent lecture sequence, and an assessment blueprint. Lectures layer intuitive explanations with formal development, worked examples, applications, misconception checks, optional extensions, and self-paced practice.

The quality contract, source and review boundaries, and fixed calculus pilot checks are documented in [Course Design Principles](docs/course-design-principles.md). Treat model output as a draft: valid structure does not establish mathematical correctness or teaching quality.

## Planned PoC

- Start with Calculus 101 and a twelve-lecture course map.
- Normal generation produces twelve lectures; test mode retains the course map but generates one lecture's full content.
- Generate structured course and assessment content through the local FastAPI service, then render it with application-owned React components.
- Keep generated work in process memory for this PoC and automatically write the latest full-course JSON snapshot to `generated-courses/` after each successful generation or import. Repeated changes update that course's snapshot, preserving its accumulated lectures and assessments across API restarts.

The current scope and UI plan are in [.azure/project-plan.md](.azure/project-plan.md). n8n is a possible later orchestrator for the same staged workflow, not a dependency of this planned stack.

## Run Locally

From the workspace root, start the API with `python3 -m uvicorn app.main:app --app-dir services/course-api --reload --port 8000`, then start the website with `npm --prefix services/course-web run dev`. Running from the root lets the API load the root `.env` file. The API is available at `http://localhost:8000` and its interactive OpenAPI docs at `http://localhost:8000/docs`.

Docker Compose is an optional local launcher: `docker compose up --build`. It serves the API on port 8000 and the Vite app on port 5173. The API writes snapshots to the repository's `generated-courses/` directory, also mounted into the container. For local API runs, `COURSE_ARCHIVE_DIRECTORY` can override that path. Copy `.env.example` to `.env` and set `OPENAI_API_KEY` only when testing live generation; without it, the starter course remains available and generation routes return a structured configuration error.

Run the backend checks from `services/course-api` with `python3 -m pytest` and `ruff check app tests`. Run frontend tests and the build with `npm --prefix services/course-web test` and `npm --prefix services/course-web run build`.
