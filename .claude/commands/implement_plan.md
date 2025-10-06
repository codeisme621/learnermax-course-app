# Implement Plan

You are tasked with implementing an approved technical plan from `specs/<feature-name>/plan.md` or `specs/<feature-name>/slices/<slice-name>/plan.md`. These plans contain phases with specific changes and success criteria.

## Getting Started

When given a plan path:
- Read the plan completely and check for any existing checkmarks (- [x])
- Read any referenced research documents from the same directory (e.g., `specs/<feature-name>/research.md` or `specs/<feature-name>/slices/<slice-name>/research.md`)
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

## Validation Workflow: Continuous Signal-Driven Development

**Philosophy**: Get continuous signal during implementation to know you're on the right track.

### Step 1: Local Development Setup (Before Implementation)

1. **Navigate to backend directory**:
   ```bash
   cd backend
   ```

2. **Start backend dev server in background**:
   ```bash
   pnpm run dev:bg
   ```
   This starts the server on port 8080 and logs to `.local-dev.log`

3. **Verify server is running**:
   ```bash
   curl http://localhost:8080/health
   ```

4. **Create todo list**:
   - Use TodoWrite to track all phases and tasks from the plan

### Step 2: Iterative Implementation with Continuous Signal

For each code change:

1. **Make the change** (edit/write files)

2. **Get immediate signal**:
   ```bash
   pnpm run dev:logs  # Check for compilation/runtime errors
   ```

3. **Run relevant tests** after each significant change:
   ```bash
   pnpm test [specific-test-file]  # Quick feedback
   ```

4. **Test with curl** (for API changes):
   ```bash
   curl -X POST http://localhost:8080/api/endpoint -H "Content-Type: application/json" -d '{"test":"data"}'
   ```

5. **Monitor continuously**:
   - Watch dev server logs for errors
   - Check TypeScript compilation errors
   - Verify API responses

6. **Fix issues immediately** before moving to next change
   - Don't accumulate errors
   - Each change should leave codebase in working state

### Step 3: Phase Completion Validation

After completing a phase:

1. **Run full test suite**:
   ```bash
   pnpm test
   ```

2. **Type checking**:
   ```bash
   pnpm run typecheck
   ```

3. **Linting**:
   ```bash
   pnpm run lint
   ```

4. **Test coverage** (verify 90% threshold):
   ```bash
   pnpm run test:coverage
   ```

5. **Build verification**:
   ```bash
   pnpm run build
   ```

6. **Update plan checkboxes** for completed phase using Edit tool

7. **Document in implementation.md** if any deviations occurred

### Step 4: Local Development Cleanup

Before preview deployment:

```bash
pnpm run dev:stop
```

Verify process stopped (no "port already in use" errors on next run).

### Step 5: Preview Deployment & E2E Validation

1. **Deploy backend to preview**:
   ```bash
   cd /home/rico/projects/learnermax-course-app
   ./scripts/deploy-preview-backend.sh
   ```

2. **Deploy frontend to preview** (needed for full stack E2E):
   ```bash
   ./scripts/deploy-preview-frontend.sh
   ```

3. **Start log monitoring**:
   ```bash
   ./scripts/start-sam-logs.sh
   ./scripts/start-vercel-logs.sh
   ```
   Logs written to: `scripts/.sam-logs.log`, `scripts/.vercel-logs.log`

4. **Write E2E tests while monitoring logs**:
   - Create tests in `e2e/tests/[feature-name].spec.ts`
   - **Monitor log files in real-time** as you write and run tests
   - Get signal from preview environment:
     - API errors in `scripts/.sam-logs.log`
     - Frontend errors in `scripts/.vercel-logs.log`
     - Request/response patterns
     - Performance issues

5. **Run E2E tests**:
   ```bash
   cd e2e && pnpm test
   ```
   Continue monitoring logs during test runs. Fix issues revealed by logs or test failures.

6. **Review logs for errors**:
   ```bash
   cat scripts/.sam-logs.log | grep -i error
   cat scripts/.vercel-logs.log | grep -i error
   ```

7. **Stop log monitoring**:
   ```bash
   ./scripts/stop-sam-logs.sh
   ./scripts/stop-vercel-logs.sh
   ```

8. **Update implementation.md** with preview validation results

### Step 6: Final Verification

Check all success criteria from the plan are met:
- [ ] All local tests pass
- [ ] All builds successful
- [ ] Test coverage meets 90% threshold
- [ ] Preview deployments successful
- [ ] E2E tests pass
- [ ] No errors in preview logs
- [ ] All plan checkboxes marked complete
- [ ] implementation.md documents entire process

**Key Principle**: Get signal continuously, fix issues immediately when they appear. Don't batch validation - that defeats the purpose of signal-driven development.

## Creating Implementation Documentation

As you implement:
- Create `specs/<feature-name>/implementation.md` (or `specs/<feature-name>/slices/<slice-name>/implementation.md` for slices) to document:
  - What was actually implemented vs planned
  - Any deviations from the plan and why
  - Key decisions made during implementation
  - Lessons learned for future similar work

Structure the implementation document as:

```markdown
# [Feature/Task Name] Implementation

**Date**: [Current date]
**Plan**: `specs/<feature-name>/plan.md` (or `specs/<feature-name>/slices/<slice-name>/plan.md`)
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