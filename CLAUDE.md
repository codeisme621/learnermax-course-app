# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LearnerMax is a fully open source course application with a monorepo structure.

## Project Structure

```
learnermax-course-app/
├── backend/          # Express.js API (TypeScript, AWS Lambda + SAM)
├── frontend/         # Next.js application (React, Tailwind CSS)
├── e2e/              # Playwright end-to-end tests
└── specs/            # Feature specifications (human-written)
```

### Architecture Guidelines

- **Frontend**: Next.js application that calls backend APIs. Never write database code directly in frontend - always call backend endpoints.
- **Backend**: Express.js API that handles all database operations and business logic. Deployed on AWS Lambda using Lambda Web Adapter. Uses DynamoDB for data storage.
- **E2E**: Playwright tests for end-to-end testing of the complete application flow.
- **Specs**: Human-written specifications for features. See `specs/spec-driven-dev.md` for the Spec-Driven Development workflow.

## Package Manager & Code Style

- **Package Manager**: `pnpm` (v10.13.1)
- **Code Style**: ES6 modules - use `import/export`, not `require()`
- **Language**: TypeScript throughout

## Common Commands

### Backend
```bash
cd backend
pnpm install
pnpm run dev      # Run locally on port 8080
pnpm test
pnpm run build    # Build TypeScript
```

### Frontend
```bash
cd frontend
pnpm install
pnpm run dev      # Next.js dev server on port 3000
pnpm test
pnpm run build
```

### E2E
```bash
cd e2e
pnpm install
pnpm test
pnpm run test:ui  # Run with Playwright UI
```

### Backend Deployment (AWS SAM)
```bash
cd backend
pnpm run build && sam build && sam deploy
```

## Spec-Driven Development

This project follows Spec-Driven Development (see `specs/spec-driven-dev.md`):

1. **Write human specs** in `specs/<feature>/mainspec.md`
2. **Research**: Use `/research_codebase` command
3. **Plan**: Use `/create_plan` or `/create_plan_ui` command
4. **Implement**: Use `/implement_plan` or `/implement_plan_ui` command

Each workspace folder will have its own detailed CLAUDE.md with architecture-specific guidance.
