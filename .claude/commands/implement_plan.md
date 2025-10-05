# Implement Plan

You are tasked with implementing an approved technical plan from `specs/<description>/plan.md`. These plans contain phases with specific changes and success criteria.

## Getting Started

When given a plan path:
- Read the plan completely and check for any existing checkmarks (- [x])
- Read any referenced research documents from `specs/<description>/research.md`
- Read all files mentioned in the plan
- **Read files fully** - never use limit/offset parameters, you need complete context
- Think deeply about how the pieces fit together
- Create a todo list to track your progress
- Start implementing if you understand what needs to be done

If no plan path provided, ask for one.

## Implementation Philosophy

Plans are carefully designed, but reality can be messy. Your job is to:
- Follow the plan's intent while adapting to what you find
- Implement each phase fully before moving to the next
- Verify your work makes sense in the broader codebase context
- Update checkboxes in the plan as you complete sections

When things don't match the plan exactly, think about why and communicate clearly. The plan is your guide, but your judgment matters too.

If you encounter a mismatch:
- STOP and think deeply about why the plan can't be followed
- Present the issue clearly:
  ```
  Issue in Phase [N]:
  Expected: [what the plan says]
  Found: [actual situation]
  Why this matters: [explanation]

  How should I proceed?
  ```

## Verification Approach

After implementing a phase:
- Run the success criteria checks from the plan
- Common commands include:
  - `npm test` or `make test` for tests
  - `npm run typecheck` or `make check` for type checking
  - `npm run lint` or `make lint` for linting
  - `npm run build` or `make build` for builds
- Fix any issues before proceeding
- Update your progress in both the plan and your todos
- Check off completed items in the plan file itself using Edit

Don't let verification interrupt your flow - batch it at natural stopping points.

## Creating Implementation Documentation

As you implement:
- Create `specs/<description>/implementation.md` to document:
  - What was actually implemented vs planned
  - Any deviations from the plan and why
  - Key decisions made during implementation
  - Lessons learned for future similar work

Structure the implementation document as:

```markdown
# [Feature/Task Name] Implementation

**Date**: [Current date]
**Plan**: `specs/<description>/plan.md`
**Status**: [In Progress | Completed | Blocked]

## Summary
[Brief overview of what was implemented]

## Implementation Progress

### Phase 1: [Name] - [Status]
- [What was completed]
- [Any deviations from plan]
- [Key decisions made]

### Phase 2: [Name] - [Status]
...

## Key Changes Made
- `path/to/file.ext:line` - [Description of change]
- `another/file.js:45-67` - [Description of change]

## Deviations from Plan
[Any places where implementation differed from plan and why]

## Testing Results
[Results of automated and manual verification]

## Known Issues
[Any issues discovered during implementation]

## Next Steps
[If incomplete, what needs to be done next]
```

## If You Get Stuck

When something isn't working as expected:
- First, make sure you've read and understood all the relevant code
- Consider if the codebase has evolved since the plan was written
- Present the mismatch clearly and ask for guidance

Use sub-tasks sparingly - mainly for targeted debugging or exploring unfamiliar territory.

## Resuming Work

If the plan has existing checkmarks:
- Trust that completed work is done
- Pick up from the first unchecked item
- Verify previous work only if something seems off

## Important Guidelines

1. **Follow the plan structure**:
   - Implement phases in order
   - Don't skip ahead unless there's a blocking dependency
   - Check off items as you complete them

2. **Verify as you go**:
   - Run success criteria after each phase
   - Fix issues immediately
   - Don't accumulate technical debt

3. **Document deviations**:
   - Update the implementation document when you deviate from plan
   - Explain why the deviation was necessary
   - Update the plan if the deviation becomes the new approach

4. **Think holistically**:
   - Consider how your changes affect the broader system
   - Look for integration points and potential conflicts
   - Test edge cases mentioned in the plan

5. **Communicate blockers**:
   - If you can't proceed, explain what's blocking you
   - Suggest alternative approaches if possible
   - Ask for clarification when the plan is unclear

Remember: You're implementing a solution, not just checking boxes. Keep the end goal in mind and maintain forward momentum.