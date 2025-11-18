# Spec-Driven Development

## Overview

Spec-Driven Development (SDD) represents a fundamental shift in how we approach software development in the age of AI-powered coding agents. In this paradigm, **specifications are more important than code**. The spec becomes the code, and the actual code becomes the artifact—much like how compiled Java JARs are the output, not the source of truth.

### Core Philosophy

**Spec or specification is more important than code.**

This isn't hyperbole. Consider the impact:
- Bad code is bad code
- A bad implementation plan is 100 lines of bad code
- **A bad spec is thousands of lines of bad code**

When working with AI coding agents, your specification and implementation plan have exponential impact. Get the spec wrong, and you'll generate vast amounts of code headed in the wrong direction. Get it right, and you'll efficiently build exactly what you need.

**Specs should be checked into your repo and code reviewed.**

Your specifications deserve the same—if not more—scrutiny as your code. Review your specs. Iterate on them. Version control them. They are your most valuable artifact.

### The Paradigm Shift

In traditional development, developers write code directly. In Spec-Driven Development:

1. **Specifications drive everything** - They are precise, complete, and unambiguous enough to generate working systems
2. **Code is generated** - AI agents transform specs into implementation

This approach eliminates the gap between intent and implementation. Your specification becomes executable through AI agents, making the specification itself the primary development artifact.

### Spec-Driven vs. Vibe Coding

**Vibe coding** is the unstructured back-and-forth prompting with a coding agent:
- No clear phases or structure
- Context window becomes polluted with mixed concerns
- Doesn't scale beyond simple tasks
- Hard to reproduce or iterate
- Limited quality control

**Spec-Driven Development** is structured and scalable:
- Clear phases with specific objectives
- Context engineering keeps each phase focused
- Explicit validation and quality gates
- Reproducible through documented specs and plans
- Scales to complex, multi-phase projects

## Key Principles

### 1. Phase-Based Development

Break work into distinct phases, each with a clear purpose:
- **Research**: Understand the problem, codebase, and constraints
- **Planning**: Create detailed implementation plans
- **Implementation**: Execute the plan with validation

### 2. Context Engineering

The reason for phased development is **context engineering**:

- **Limit your context window** - Each phase has a focused objective
- **Write context to disk** - Capture findings in markdown files
- **Clean slate for next phase** - The next session picks up from the artifact, not polluted context
- **Just enough context** - Give the agent exactly what it needs for the current job

This prevents context pollution and ensures each phase has optimal signal-to-noise ratio.

### 3. Validation & Quality Gates

**You want to give your coding agent signal to know if it's on the right track.**

Build validation into each phase:
- **Unit tests** - Does the code work as specified?
- **Type checking** - Are types consistent?
- **Build process** - Does it compile/build successfully?
- **Integration tests** - Do components work together?

For UI tasks:
- **Playwright MCP server** - Take screenshots, listen to browser console logs
- **Visual regression** - Compare UI states
- **Interaction testing** - Verify user flows

These quality gates give the coding agent immediate feedback, allowing it to course-correct before proceeding.

## Specs vs. Research & Plans

It's critical to understand the distinction between **specs** and **research/implementation plans**. They serve different purposes.

### Specs (Intent)

- **Location**: `specs/<feature-name>/mainspec.md`
- **Purpose**: Define what you want built, with clarity and intent

Specs are your primary artifact. They represent your higher-level thinking about:
- What problem you're solving
- Why it matters
- What the solution should look like
- What constraints and patterns to follow

### Research & Implementation Plans (AI-Generated)

**Research and implementation plans**

- **Purpose**: Explore the codebase and create actionable implementation phases based on your spec

Implementation planning is how the AI organizes its understanding and approach.

### Both Are Important

- **Specs** define the feature you want built. 
- **Research** discovers the "how" based on your codebase
- **Plans** organize the "how" into actionable implementation phases
- **Implementation** executes the plan


## Spec Structure and Organization

### Folder Structure

Organize your specs by feature:

```
specs/
├── user-authentication/
│   ├── mainspec.md
│   └── slices/
│       ├── login-flow.md
│       └── password-reset.md
├── course-management/
│   ├── mainspec.md
│   └── slices/
│       ├── course-creation.md
│       └── course-enrollment.md
└── spec-driven-dev.md
```

**Key principles**:
- **One `mainspec.md` per feature** - This is your comprehensive specification for the entire feature. This is the end state of the feature. We work backwards from this.
- **Logical slices in `/slices` folder** - Break the mainspec into smaller, focused specs in `specs/<feature-name>/slices/` that are easier for both you and the coding agent to reason about

### Why Logical Slices?

**Start with the end in mind.** The mainspec.md is valuable because it defines your end state first, then you work backwards from there.

Once you have your mainspec, the logical slices become much easier to identify. You know where you're headed, and you can reverse-engineer the path to get there. This reverse engineering strategy—starting from the complete vision and decomposing it into manageable pieces—will become one of the key skills in a spec-driven world.

A large feature might be too complex to implement all at once. Logical slices let you:
- Work on one coherent piece at a time
- Give the coding agent focused context
- Make progress incrementally
- Reason about smaller, manageable chunks
- Track progress against the end state defined in mainspec.md

For example, "user authentication" might slice into:
- Login flow
- Registration flow
- Password reset
- Session management

Each slice gets its own spec file, but they all relate to the `mainspec.md`, which describes the complete end state you're working towards.

### Writing Good Specs

Your spec should be:
- **Clear and unambiguous** - The AI needs to understand your intent
- **Complete enough** - Cover the important details
- **Not overly prescriptive** - Don't pigeon-hole the AI or prevent it from finding good solutions

This is a balance that takes practice. Too vague, and the AI won't know what to build. Too specific, and you might confuse it or prevent better approaches.

### Recommended Spec Sections

There's no rigid template, but here are sections that work well:

- **Background** - Context about why this feature exists
- **User Story** - Who needs this and what they're trying to accomplish
- **Tech Details** - Technical requirements, constraints, or considerations
- **Narrative Spec** - Timeline view gives a strong temporal signal — clarifies ordering and ownership across layers
- **Architecture** - High-level architectural approach or components
- **UX/Design** - User experience expectations, flows, or design requirements
- **Special Callouts** - Important gotchas, edge cases, or considerations
- **Expected Patterns** - Code patterns, libraries, or approaches to use
- **Expected Deliverables** - What "done" looks like

Adapt these to your needs. The goal is clarity of intent, not adherence to a template.

### Example Spec Snippet

```markdown
# User Login Flow

## Background
Users need to authenticate before accessing course content. We're using JWT-based
authentication with refresh tokens.

## User Story
As a student, I want to log in with my email and password so I can access my courses.

## Tech Details
- Use bcrypt for password hashing
- JWT access tokens (15min expiry)
- Refresh tokens (7 day expiry)
- Store refresh tokens in httpOnly cookies

## Narrative Spec

**Student discovers course lessons:**
1. Student lands on `/course/spec-driven-dev-mini` (already enrolled)
2. Frontend calls `GET /api/courses/spec-driven-dev-mini/lessons`
3. Backend queries DynamoDB → Returns 5 lessons with `order`, `title`, `lengthInMins`

## Expected Patterns
- Follow existing auth patterns in `/backend/auth`
- Use the UserService for user lookups
- Validation with Zod schemas

## Expected Deliverables
- Login endpoint: POST /api/auth/login
- Refresh endpoint: POST /api/auth/refresh
- Unit tests for auth logic
- Integration tests for endpoints
```

This gives the AI clear direction while leaving room for good implementation decisions.

## Usage

This project implements Spec-Driven Development through a canonical workflow (Spec -> Research/Plan -> Implement)

### The Three-Phase Pattern

#### Phase 1: Spec

**The workflow starts with a mainspec** (located in `specs/<feature-name>/mainspec.md`). Once you've defined your end state, you identify logical slices and create them in `specs/<feature-name>/slices/`. We use this intent enriched with codebase context as input into our research/plan phase.

**What happens**:
- Reads your spec to understand what you want to build
- Creates a context rich (codebase context) spec that defines the intent of the feature

#### Phase 2: Research/Plan 

AI takes the spec as input and translate it into a phased based implementation plan.  While doing so, AI does research on the codbased to figure out the best implementation plan that fulfills the intent of the spec.  All while keeping the human in the loop.

**What happens**:
- Reads your spec to understand the goal
- AI Researches the codebase to come up with a phased based implementation plan
- AI is interactive ask questions and allows human to give feedback

#### Phase 3: Implementation

AI implements the implementation plan after the human approves it. This plan has no ambiguity and clear direction and focused context leads to great coding outcomes.

**What happens**:
- Nearly 100% of the code is generated by AI. 
- Human verifies the code output and does any manual testing that is required

## Best Practices

### 1. Start with the Spec

Before opening a coding agent session, **you write the spec**:
- What you're trying to achieve
- Why it's needed
- What success looks like
- What constraints exist

Start by creating `specs/<feature-name>/mainspec.md` to define your end state. Then reverse-engineer logical slices from it and place them in `specs/<feature-name>/slices/`. These human-written specs drive everything else.

### 2. Review Your Specs

**Your spec is the most important artifact.** Get it right and the implementation plan and implementation becomes easy.

### 3. Validate Continuously

Don't wait until the end. Run tests, type checking, and builds throughout implementation. Each piece of feedback helps the agent stay on track. This should be embedded in your slash commands (the 3 phases)

### 4. Document Learnings

When implementation reveals gaps in the plan or research, document them. These learnings improve future specs.

### 5. Version Control Everything

**Specs are mandatory to version control.** They're your primary artifact.

## Conclusion

Spec-Driven Development recognizes that in the age of AI coding agents, the bottleneck isn't writing code - it's knowing what to write. By elevating specifications to first-class artifacts and organizing work into focused, validated phases, we can build better software faster.

**This is your new abstraction level.** Not code - higher-level thinking. Writing clear, complete, unambiguous specs that guide AI agents to build what you envision.

The spec is the code. The code is the artifact. Everything flows from your specification.

Start with a good spec. The rest follows.
