---
name: expert
description: LearnerMax project Expert — the codebase's long-term memory. Architecture (Next.js↔Express/Lambda/DynamoDB↔Cognito), how features are verified here, core files, DO/DON'T patterns, hard invariants, and the steps to add a feature. Consult before non-trivial work: adding a feature, choosing where code lives, debugging, or deciding how to verify a change. Triggers - expert, project expert, learnermax architecture, where does this code go, how is this verified, project invariants, how to add a feature (project)
---

# LearnerMax Expert

This project's **long-term memory**, pulled on demand. It reflects what is
committed to `main` (not what is planned — for intent, read the PRD/spec). Updated
only by `/learn` after a merge. Consult the relevant reference before non-trivial work.

## Quick reference

| You're about to… | Read | Mode |
|---|---|---|
| understand the system shape, layers, boundaries, auth + event flows | `references/architecture.md` | Expert |
| find the key files / where a concern lives | `references/core-files.md` | Expert |
| decide how to test/verify a change; run the app locally | `references/verification.md` | Expert |
| write code in a way that fits (soft DO/DON'T) | `references/patterns.md` | Expert |
| check a hard rule before you break it (lint-enforced) | `references/invariants.md` | Expert |
| add a new feature end-to-end (the steps) | `references/procedural.md` | Expert |
| see what `/learn` changed and why | `references/changelog.md` | Expert |

## The one-paragraph orientation

LearnerMax is an open-source course app. A **Next.js 15 App Router** frontend
(Vercel) talks over HTTP to an **Express API running in AWS Lambda** (via the Lambda
Web Adapter) backed by a **single-table DynamoDB** design. Auth is **AWS Cognito**:
the frontend uses NextAuth (JWT session) and sends the Cognito **ID token** as a
Bearer; API Gateway's Cognito authorizer validates it before the request reaches
Express. Sign-up fans out event-driven: Cognito **PostConfirmation → SNS → Student
Onboarding Lambda → DynamoDB**. Backend code is organized as **feature vertical
slices** (`routes → service → repository`); the frontend reaches the backend four
ways (server actions, server fetchers, BFF route handlers, client SWR) and **never
touches the database directly**. See `references/architecture.md` for the full shape.
