# Suggest Pattern (Spec Context)

Analyze design patterns in the codebase within the context of a specific specification, identify existing patterns, and suggest whether to use existing patterns or introduce new ones.

## Initial Setup

When invoked, respond with:
```
I'm ready to analyze design patterns for your spec. Please provide the spec file path (e.g., specs/user_authentication/mainspec.md) and I'll identify relevant patterns and make recommendations.
```

Then wait for the user to provide the spec path.

## Steps after receiving the spec path:

1. **Read the spec file fully** (no limit/offset) to understand requirements

2. **Create research plan** using TodoWrite to track:
   - Identifying relevant codebase areas for the spec
   - Finding existing design patterns (GoF, architectural)
   - Analyzing pattern usage and consistency
   - Generating recommendations

3. **Spawn parallel codebase-analyzer agents** to find patterns including (but not limited to):
   - **Behavioral patterns**: Strategy, Observer, Command, State, Chain of Responsibility
   - **Creational patterns**: Factory, Builder, Singleton, Prototype
   - **Structural patterns**: Adapter, Decorator, Facade, Proxy
   - **Architectural patterns**: Fan-out (SNS/SQS), Event-driven, Repository, CQRS, Layered
   - **Domain patterns**: Entity-Repository, Service Layer, Value Objects
   - **Any other interesting patterns**: Agents should identify and document any other noteworthy patterns found in the codebase

4. **Wait for all agents to complete**, then synthesize findings

5. **Generate pattern analysis document** at `specs/<feature-name>/slices/<slice-name>/patterns.md`:

```markdown
# Pattern Analysis: [Feature/Slice Name]

**Date**: [Current date]
**Spec**: [Path to spec]

## Existing Patterns Found

### [Pattern Category]
- **Pattern Name**: [e.g., Repository Pattern]
  - **Location**: `path/to/file.ts:123`
  - **Usage**: How it's currently used
  - **Consistency**: How consistently applied across codebase

## Pattern Analysis for Spec

### Requirements Mapping
- **Requirement**: [From spec]
  - **Existing Pattern Match**: [Pattern that fits] at `file.ts:line`
  - **Fit Assessment**: How well the existing pattern addresses this

## Recommendations

### Use Existing Patterns
- **Pattern**: [Name]
  - **Reason**: Why this existing pattern is appropriate
  - **Implementation**: Where and how to apply it
  - **Example**: `existing/file.ts:line` to follow

### Suggested New Patterns (if necessary)
- **Pattern**: [Name]
  - **Justification**: Why existing patterns are insufficient
  - **Trade-offs**: What this introduces vs. consistency cost
  - **Decision**: Recommend only if compelling reason exists

## Summary
[Concise guidance: use existing pattern X for requirement Y, maintain consistency with Z]
```

6. **Present findings** with document path and key recommendations

## Key Principles
- **Favor consistency**: Existing patterns are strongly preferred
- **High bar for new patterns**: Only suggest when existing patterns genuinely don't fit
- **Be specific**: Reference actual code locations and line numbers
- **Be practical**: Focus on patterns that matter for the spec requirements
