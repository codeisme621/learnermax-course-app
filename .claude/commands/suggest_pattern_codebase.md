# Suggest Pattern (Codebase Context)

Analyze design patterns across the entire codebase, identify existing patterns, assess consistency, and suggest pattern usage guidelines for future development.

## Initial Setup

When invoked, respond with:
```
I'm ready to analyze design patterns across the codebase. Please specify the area to focus on (e.g., "backend API design", "frontend state management", "entire codebase") and I'll map out existing patterns and provide recommendations.
```

Then wait for the user to specify the scope.

## Steps after receiving the scope:

1. **Create research plan** using TodoWrite to track:
   - Scanning codebase for pattern usage
   - Categorizing patterns by type and location
   - Assessing consistency and coverage
   - Generating pattern guidelines

2. **Spawn parallel codebase-pattern-finder agents** to locate patterns including (but not limited to):
   - **Behavioral patterns**: Strategy, Observer, Command, State, Template Method
   - **Creational patterns**: Factory, Builder, Singleton, Dependency Injection
   - **Structural patterns**: Adapter, Decorator, Facade, Composite
   - **Architectural patterns**: Layered, Event-driven, Fan-out, Repository, Service Layer
   - **Integration patterns**: API Gateway, Circuit Breaker, Retry, Saga
   - **Any other interesting patterns**: Agents should identify and document any other noteworthy patterns found in the codebase

3. **Wait for all agents to complete**, then analyze findings

4. **Generate pattern guide** at `specs/patterns.md`:

```markdown
# Codebase Pattern Analysis

**Date**: [Current date]
**Scope**: [Specified scope]

## Pattern Inventory

### [Category] Patterns

#### [Pattern Name]
- **Locations**: `file1.ts:123`, `file2.ts:456`
- **Usage Frequency**: [High/Medium/Low]
- **Consistency**: [Consistent/Varies/Inconsistent]
- **Examples**: Code references showing canonical usage

## Pattern Distribution

- **Backend**: [Primary patterns used]
- **Frontend**: [Primary patterns used]
- **Cross-cutting**: [Patterns used across layers]

## Consistency Assessment

### Strong Patterns (Use These)
- **Pattern**: [Name]
  - **Why it works**: Current effective usage
  - **Canonical example**: `file.ts:line`
  - **When to use**: Clear guidelines

### Emerging Patterns (Consolidate)
- **Pattern**: [Name]
  - **Current state**: Inconsistent or partial adoption
  - **Recommendation**: Standardize on approach from `file.ts:line`

### Missing Patterns (Consider Carefully)
- **Gap**: [What's not covered]
  - **Current approach**: How it's handled now
  - **Pattern suggestion**: Only if gap is significant
  - **Trade-off**: Consistency cost vs. benefit

## Recommendations for New Development

### Default Patterns to Use
1. **[Pattern]** for [use case] - follow `example.ts:line`
2. **[Pattern]** for [use case] - follow `example.ts:line`

### When to Introduce New Patterns
- New pattern should solve a problem existing patterns genuinely cannot
- Document the decision and rationale clearly
- Create canonical example for future consistency

## Anti-Patterns to Avoid
- [Pattern/practice] found at `file.ts:line` - reason to avoid

## Summary
[Concise pattern strategy: leverage existing X, Y, Z; avoid introducing new patterns unless essential]
```

5. **Present findings** with document path and key pattern guidelines

## Key Principles
- **Document what exists**: Build comprehensive pattern inventory
- **Favor consistency**: Existing patterns create codebase coherence
- **High bar for additions**: New patterns must justify their existence
- **Actionable guidance**: Provide clear examples and use cases
- **Pragmatic**: Focus on patterns that genuinely improve code quality
