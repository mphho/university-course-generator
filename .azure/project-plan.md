# Project Plan
**Status**: Integrated
**Created**: 2026-09-23
**Mode**: NEW

---

## 1. Project Overview

**Goal**: Build Course Studio, a local-first university course authoring workspace with a Python API and React website. It opens on a structured Calculus 101 starter course, generates course and assessment content through the specified Responses API, and keeps generated work in memory rather than requiring a datastore. The project is designed so that every module is independently testable.

**App Type**: SPA + API

**API Login**: No

**Mode**: NEW

**Deployment Plan**: No deployment plan found

---

## 2. Python Course Generator API — backend

| Component | Technology |
|-----------|-----------|
| **Language** | Python |
| **Runtime** | CPython |
| **Package Manager** | pip (virtual environment) |
| **Test Runner** | pytest |
| **Mocking Library** | unittest.mock |
| **Test Command** | python3 -m pytest |
| **Orchestration** | docker-compose |

Serve the React app through a local FastAPI boundary; keep all model requests and credentials in this service. Read `OPENAI_API_KEY` from a developer-owned `.env` file and send requests to `https://apidev.hku.hk/openai/v1/responses` with model `gpt-6-luna` and reasoning effort `xhigh`. The browser never calls the model endpoint. Validate normalized model output with Pydantic response models and return a consistent error envelope for validation and upstream failures.
Serve the React app through a local FastAPI boundary; keep all model requests and credentials in this service. Read `OPENAI_API_KEY` from a developer-owned `.env` file and send requests to `https://apidev.hku.hk/openai/v1/responses` with model `gpt-6-luna` and reasoning effort `xhigh`. The browser never calls the model endpoint. Validate normalized model output with Pydantic response models and return a consistent error envelope for validation and upstream failures.

Course authoring follows [the course design standard](../docs/course-design-principles.md): create measurable outcomes, prerequisites, a twelve-lecture sequence, concept dependencies, and an aligned assessment blueprint before writing lecture content. Test mode keeps that course map but generates the complete content for one lecture only. Treat curriculum planning, lecture writing, assessment design, and review as bounded stages in this API workflow; use schema and deterministic domain checks where possible, and flag unresolved issues for human review. Do not invent citations or present model agreement as verification. n8n may orchestrate these stages later but is not part of this PoC's service stack.


## 3. React Course Website — frontend

| Component | Technology |
|-----------|-----------|
| **Language** | TypeScript |
| **Framework** | React + Vite |
| **Package Manager** | npm |
| **Test Runner** | vitest |
| **Mocking Library** | vi.mock |
| **Test Command** | npm test |

The shared app header includes an accessible light/dark appearance switch on both routes. The initial appearance follows the operating-system preference until the user chooses a theme; an explicit choice is stored in browser local storage and restored on later visits. Apply theme tokens to navigation, forms, tables, cards, status states, and focus styles. Vitest coverage verifies system-preference initialization, accessible switching, and restoring the saved selection. The Course Library page includes a course brief form and a labeled **Test mode** switch, off by default. Its helper text makes the behavior explicit: off generates 12 lectures; on generates one lecture. The Calculus 101 Workspace consumes typed course and assessment responses from the local API and provides separate assignment, midterm, and final generation actions. No API key or direct model request is shipped to the browser.
The shared app header includes an accessible light/dark appearance switch on both routes. The initial appearance follows the operating-system preference until the user chooses a theme; an explicit choice is stored in browser local storage and restored on later visits. Apply theme tokens to navigation, forms, tables, cards, status states, and focus styles. Vitest coverage verifies system-preference initialization, accessible switching, and restoring the saved selection. The Course Library page includes a course brief form and a labeled **Test mode** switch, off by default. Its helper text makes the behavior explicit: off generates 12 lectures; on generates one lecture. The Calculus 101 Workspace renders structured course and assessment content with application-owned React components; model output is visibly a draft until reviewed. No API key or direct model request is shipped to the browser.

## 4. Services Required

| Azure Service | Role in App | Environment Variable | Default Value (Local) | Classification |
|---------------|------------|---------------------|----------------------|----------------|
| None (local-only) | No Azure-hosted service, managed datastore, or emulator is required. The local API makes outbound HTTPS requests to the user-specified HKU Responses API. | — | — | N/A |

## 5. Prerequisites

### Run

| Tool | Service(s) | Installed | Version |
|------|------------|-----------|---------|
| Python | course-api | ✅ | 3.14.4 (`python3`) |
| pip | course-api | ✅ | 26.0.1 (`pip3`) |
| npm | course-web | ✅ | 11.17.0 |
| Docker | course-api, course-web | ❓ | Not confirmed; optional Compose launcher |
| Docker Compose | course-api, course-web | ❓ | Not confirmed; optional Compose launcher |

### Debug

| Tool | Service(s) | Installed | Version |
|------|------------|-----------|---------|
| Chrome | course-web | ✅ | 153.0.8010.53 |

The local API and Vite app can be run directly with Python and npm; Docker and Docker Compose are only needed for the optional Compose launch. The current environment scan could not confirm them, so double-check before using that path. No Azure emulator or Azure Functions debug extension is required because the plan has no Azure services or Functions project.

## 6. Design System & UI

**Component Library**: Fluent UI v9
**Style Direction**: An editorial course workspace with coordinated light and dark appearances: cool paper or deep evergreen-charcoal surfaces, ink-forward type, teal actions balanced by persimmon assessment accents, precise dividers, compact navigation, and restrained elevation. Keep the course outline readable and task-oriented, with crisp 4–6px corners rather than a generic card dashboard.
**Typography**: Aptos for interface copy; Georgia for course and assessment titles

### Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `primary` | `#176B67` | Course actions, active navigation, and selected course controls |
| `accent` | `#CF6B42` | Exam markers, lecture highlights, and generation emphasis |
| `surface` | `#F3F7F5` | Cool paper page canvas |
| `text` | `#1D2A2A` | Course titles, lecture names, and body copy |
| `muted` | `#63716D` | Supporting notes, dates, and secondary metadata |
| `border` | `#D7E1DD` | Course rows, form controls, and section dividers |

Dark appearance maps the same tokens to `primary #68BBAF`, `accent #E89470`, `surface #15201E`, `text #E7EFEC`, `muted #A8B7B0`, and `border #3A4B45`; raised surfaces use `#202D2A`. Use dark foregrounds on bright primary/accent fills to maintain readable contrast.

### Pages

| Page | Route | Purpose | Layout |
|------|-------|---------|--------|
| Course Library | `/` | Start from the Calculus 101 course, enter a new course brief, and choose the one-lecture test mode or a full 12-lecture generation. | `header + nav + hero + form + card-list` |
| Calculus 101 Workspace | `/courses/calculus-101` | Review the 12-lecture outline and generate structured assignments, midterms, and a final exam. | `header + nav + tabs + table + card-list + empty + loading` |

### Sample Content

Course Library — course starter / generation brief:
| Course or brief | Code | Generation size | State |
|-----------------|------|-----------------|-------|
| Calculus 101 | MATH 101 | 12 lectures · 4 units | Starter course |
| Linear Algebra | MATH 221 | 12 lectures by default | Suggested brief |
| Discrete Mathematics | CS 210 | 12 lectures by default | Suggested brief |

Test mode — default: Off · Off: 12 lectures · On: 1 lecture for a quick generation test.
Appearance — first visit: follows system preference · Explicit light/dark choice: restored from browser local storage.

Calculus 101 Workspace — lecture:
| Lecture | Topic | Duration | Role |
|---------|-------|----------|------|
| 01 | Limits and Continuity | 50 min | Core |
| 02 | Derivative as a Function | 45 min | Core |
| 03 | Differentiation Rules | 55 min | Practice |
| 04 | Applications of Derivatives | 50 min | Assessment |

Calculus 101 Workspace — assessment:
| Assessment | Coverage | Format | State |
|------------|----------|--------|-------|
| Assignment 01 | Limits and Continuity | 5 problems · 20 points | Draft |
| Assignment 02 | Differentiation Rules | 6 problems · 24 points | Ready |
| Midterm I | Limits through Derivatives | 12 questions · 75 min | Draft |
| Final Exam | Cumulative | 18 questions · 120 min | Not generated |

## 7. Project Structure

```text
project-root/
├── .azure/
│   └── project-plan.md
├── docs/
│   └── course-design-principles.md
├── .env.example
├── .gitignore
├── compose.yaml
├── README.md
└── services/
    ├── course-api/
    │   ├── Dockerfile
    │   ├── pyproject.toml
    │   ├── app/
    │   │   ├── main.py
    │   │   ├── config.py
    │   │   ├── api/routes/
    │   │   │   ├── health.py
    │   │   │   ├── courses.py
    │   │   │   └── assessments.py
    │   │   ├── models/
    │   │   │   ├── course.py
    │   │   │   └── assessment.py
    │   │   ├── services/
    │   │   │   ├── responses_client.py
    │   │   │   └── generation_service.py
    │   │   └── data/calculus_101.py
    │   └── tests/
    │       ├── test_health.py
    │       ├── test_courses.py
    │       └── test_assessments.py
    └── course-web/
        ├── Dockerfile
        ├── package.json
        ├── vite.config.ts
        ├── tsconfig.json
        └── src/
            ├── main.tsx
            ├── api/client.ts
            ├── types/course.ts
            ├── components/
            │   ├── CourseBriefForm.tsx
            │   └── TestModeSwitch.tsx
            ├── pages/
            │   ├── CourseLibraryPage.tsx
            │   └── CourseWorkspacePage.tsx
            └── tests/
                ├── CourseBriefForm.test.tsx
                └── CourseWorkspacePage.test.tsx
```

## 8. Route Definitions

| # | Method | Path | Description | Request Body | Response Body | Status Codes |
|---|--------|------|-------------|-------------|--------------|-------------|
| 1 | GET | `/api/health` | Local API and generation-provider readiness | — | `{ status, services }` | 200, 503 |
| 2 | GET | `/api/courses` | List the starter course and current in-memory generated courses | — | `{ courses: Course[] }` | 200 |
| 3 | GET | `/api/courses/{course_id}` | Read a course outline and its assessments | — | `{ course: Course }` | 200, 404 |
| 4 | POST | `/api/courses/generate` | Generate a course; `test_mode: true` returns one lecture, otherwise 12 | `{ title, course_code, level, learning_outcomes, test_mode? }` | `{ course: Course }` | 201, 422, 502, 503 |
| 5 | POST | `/api/courses/{course_id}/assignments/generate` | Generate a structured assignment with prompts, points, and rubric | `{ topic, difficulty, problem_count }` | `{ assessment: Assignment }` | 201, 404, 422, 502, 503 |
| 6 | POST | `/api/courses/{course_id}/midterms/generate` | Generate a structured midterm with sections and scoring | `{ topics, duration_minutes, question_count }` | `{ assessment: Exam }` | 201, 404, 422, 502, 503 |
| 7 | POST | `/api/courses/{course_id}/finals/generate` | Generate a cumulative final exam with sections and scoring | `{ coverage, duration_minutes, question_count }` | `{ assessment: Exam }` | 201, 404, 422, 502, 503 |

All errors use `{ error: { code, message, details } }`. Generation endpoints validate model output before returning it; upstream failures return a stable API error while leaving the bundled starter course usable.

## 9. Next Steps

1. Run **azure-project-scaffold** to execute this approved plan.
2. Run **azure-project-integrate** to connect the React client to the local API and smoke-test each endpoint; no database migrations are needed.
3. Run **azure-debug-plan** → **azure-debug-generate** for local Compose and VS Code debugging support.
4. Revisit the architecture with the **azure-deploy** agent only if Azure hosting is later required; this plan currently provisions no Azure resources.
