# Implement Plan UI

You are tasked with implementing an approved UI/frontend technical plan from `specs/<feature-name>/plan.md` or `specs/<feature-name>/slices/<slice-name>/plan.md`. These plans contain phases with specific UI changes, component requirements, and visual success criteria.

## Getting Started

When given a plan path:
- Read the plan completely and check for any existing checkmarks (- [x])
- Read any referenced research documents from the same directory (e.g., `specs/<feature-name>/research.md` or `specs/<feature-name>/slices/<slice-name>/research.md`)
- Read all files mentioned in the plan
- **Read files fully** - never use limit/offset parameters, you need complete context
- Check the project's component library and existing UI patterns
- Create a todo list to track your progress
- Start implementing if you understand what needs to be done

If no plan path provided, ask for one.

## UI Implementation Philosophy

UI plans require special consideration for:
- Component reuse and consistency
- Visual design accuracy
- Responsive behavior across devices
- User experience and accessibility
- Performance and loading states

Your job is to:
- Follow the plan's intent while adapting to existing UI patterns
- Prioritize component reuse over custom solutions
- Validate visual output continuously during development
- Ensure responsive and accessible implementation
- Update checkboxes in the plan as you complete sections

## UI-Specific Implementation Workflow

### Step 1: Component Discovery and Planning

Before starting implementation:

1. **Check Local Component Library**:
   - Use Glob and Read tools to explore existing components in `/components`, `/ui`, or similar directories
   - Identify reusable components that match your needs
   - Document existing patterns and conventions

2. **Explore shadcn Component Registries**:
   ```
   Use mcp__shadcn__get_project_registries to see available registries
   Use mcp__shadcn__search_items_in_registries to find components you need
   Use mcp__shadcn__view_items_in_registries for detailed component information
   Use mcp__shadcn__get_item_examples_from_registries for usage examples
   ```

3. **Component Decision Matrix**:
   - Document which components to reuse locally
   - Which components to install from shadcn
   - Which components need custom implementation
   - Update your todo list with component acquisition tasks

### Step 2: Development Environment Setup

1. **Navigate to frontend directory**:
   ```bash
   cd frontend
   ```

2. **Start frontend dev server in background**:
   ```bash
   pnpm run dev:bg
   ```
   This starts Next.js on port 3000 and logs to `.local-dev.log`

3. **Verify server is running**:
   - Navigate to http://localhost:3000 using Playwright MCP
   - Or check logs: `pnpm run dev:logs`

4. **Setup Live Feedback Loop**:
   - Use playwright MCP server for continuous visual validation
   - Plan to take screenshots at key implementation milestones
   - Monitor console messages for errors and warnings

### Step 3: Iterative Implementation with Visual Validation

For each component or UI section:

1. **Implement Changes**:
   - Add/modify components following the plan
   - Install shadcn components if needed using `mcp__shadcn__get_add_command_for_items`
   - Follow existing code patterns and conventions

2. **Get Immediate Signal**:
   ```bash
   pnpm run dev:logs  # Check for compilation/build errors
   ```

3. **Visual Validation Cycle** (after each significant change):
   - Navigate to page: `mcp__playwright__browser_navigate` to http://localhost:3000
   - Take screenshots: `mcp__playwright__browser_take_screenshot`
   - Check console: `mcp__playwright__browser_console_messages`
   - Test responsive: Resize browser with `mcp__playwright__browser_resize`
   - Compare against design specifications

4. **Run Relevant Tests**:
   ```bash
   pnpm test [component-test-file]  # Quick feedback
   ```

5. **Monitor Continuously**:
   - Watch dev server logs for errors
   - Check browser console for React warnings
   - Verify TypeScript compilation
   - Check for accessibility warnings

6. **Fix Issues Immediately**:
   - Address visual discrepancies before moving on
   - Fix console errors and warnings
   - Ensure responsive behavior works correctly
   - Don't accumulate errors

### Step 4: Component Integration Best Practices

1. **When Installing shadcn Components**:
   ```bash
   # Get the correct add command from MCP
   # Example: npx shadcn@latest add button card
   ```

2. **When Using Existing Components**:
   - Read the component's implementation fully
   - Check for required props and TypeScript interfaces
   - Follow established patterns for styling and behavior

3. **When Creating Custom Components**:
   - Follow the project's component structure
   - Use existing design tokens and CSS variables
   - Implement proper TypeScript types
   - Consider accessibility from the start

## Visual Validation Process

### Taking Meaningful Screenshots

1. **Component-Level Screenshots**:
   - Individual component in isolation
   - Different states (hover, active, disabled)
   - Various prop combinations

2. **Page-Level Screenshots**:
   - Full page layout
   - Different screen sizes (mobile, tablet, desktop)
   - Light/dark mode if applicable

3. **Interactive States**:
   - Forms with validation states
   - Loading states and animations
   - Error states and edge cases

### Console Monitoring

Continuously monitor for:
- React warnings and errors
- TypeScript type errors
- CSS warnings
- Network request failures
- Performance warnings

### Responsive Testing

For each major UI change:
1. Test desktop view (1920x1080)
2. Test tablet view (768x1024)
3. Test mobile view (375x667)
4. Test edge cases (very wide, very narrow)

## Phase Completion Validation

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

6. **Final visual validation**:
   - Take screenshots of all breakpoints (mobile, tablet, desktop)
   - Verify no console errors: `mcp__playwright__browser_console_messages`
   - Test all interactive states
   - Verify accessibility with keyboard navigation

7. **Update plan checkboxes** for completed phase using Edit tool

8. **Document in implementation.md** if any deviations occurred

## Local Development Cleanup

Before preview deployment:

```bash
pnpm run dev:stop
```

Verify process stopped (no "port already in use" errors on next run).

## Preview Deployment & E2E Validation

1. **Deploy frontend to preview**:
   ```bash
   cd /home/rico/projects/learnermax-course-app
   ./scripts/deploy-preview-frontend.sh
   ```

2. **Deploy backend to preview** (needed for full stack E2E):
   ```bash
   ./scripts/deploy-preview-backend.sh
   ```

3. **Start log monitoring**:
   ```bash
   ./scripts/start-vercel-logs.sh
   ./scripts/start-sam-logs.sh
   ```
   Logs written to: `scripts/.vercel-logs.log`, `scripts/.sam-logs.log`

4. **Write E2E tests while monitoring logs**:
   - Create tests in `e2e/tests/[feature-name].spec.ts`
   - **Monitor log files in real-time** as you write and run tests
   - Get signal from preview environment:
     - Frontend errors in `scripts/.vercel-logs.log`
     - API errors in `scripts/.sam-logs.log`
     - UI rendering issues
     - Performance problems

5. **Run E2E tests**:
   ```bash
   cd e2e && pnpm test
   ```
   Continue monitoring logs during test runs. Fix issues revealed by logs or test failures.

6. **Review logs for errors**:
   ```bash
   cat scripts/.vercel-logs.log | grep -i error
   cat scripts/.sam-logs.log | grep -i error
   ```

7. **Stop log monitoring**:
   ```bash
   ./scripts/stop-vercel-logs.sh
   ./scripts/stop-sam-logs.sh
   ```

8. **Update implementation.md** with preview validation results

## Final Success Criteria Verification

Check all success criteria from the plan are met:

### Automated Verification
- [ ] All unit tests pass: `pnpm test`
- [ ] Type checking passes: `pnpm run typecheck`
- [ ] Linting passes: `pnpm run lint`
- [ ] Build succeeds: `pnpm run build`
- [ ] Test coverage meets 90% threshold: `pnpm run test:coverage`
- [ ] No console errors in development

### Visual Verification
- [ ] Components match design specifications
- [ ] Responsive behavior works across breakpoints
- [ ] Interactive states function correctly
- [ ] Loading states display appropriately
- [ ] Error states are handled gracefully

### Accessibility Verification
- [ ] Proper semantic HTML structure
- [ ] ARIA labels where needed
- [ ] Keyboard navigation works
- [ ] Color contrast meets standards
- [ ] Screen reader compatibility

### Preview Environment Verification
- [ ] Frontend deployed successfully
- [ ] Backend deployed successfully
- [ ] E2E tests pass
- [ ] No errors in preview logs
- [ ] All plan checkboxes marked complete
- [ ] implementation.md documents entire process

**Key Principle**: Get visual signal continuously through Playwright, fix UI issues immediately. Don't batch validation - that defeats the purpose of signal-driven UI development.

## Creating Implementation Documentation

Create `specs/<feature-name>/implementation.md` (or `specs/<feature-name>/slices/<slice-name>/implementation.md` for slices) with UI-specific sections:

```markdown
# [Feature/Task Name] UI Implementation

**Date**: [Current date]
**Plan**: `specs/<feature-name>/plan.md` (or `specs/<feature-name>/slices/<slice-name>/plan.md`)
**Status**: [In Progress | Completed | Blocked]

## Summary
[Brief overview of UI implementation]

## Component Decisions
- **Reused Local Components**: [List with file paths]
- **Added shadcn Components**: [List with installation commands]
- **Custom Components**: [List with rationale]

## Visual Validation Results
- **Screenshots Taken**: [List key screenshots with descriptions]
- **Responsive Testing**: [Results across breakpoints]
- **Browser Testing**: [Browsers/devices tested]

## Implementation Progress

### Phase 1: [Name] - [Status]
- [Components implemented]
- [Visual validation results]
- [Any issues encountered]

### Phase 2: [Name] - [Status]
...

## Key UI Changes Made
- `components/ui/button.tsx` - Added custom variant for CTAs
- `app/landing/page.tsx:45-67` - Implemented hero section layout
- `styles/globals.css:120` - Added responsive grid utilities

## Design Deviations
[Any places where implementation differed from design and why]

## Performance Considerations
- [Bundle size impact]
- [Loading performance]
- [Animation performance]

## Accessibility Notes
- [ARIA implementations]
- [Keyboard navigation patterns]
- [Screen reader considerations]
```

## Troubleshooting UI Issues

### Common shadcn Issues
1. **Component not found**: Check registry configuration
2. **Style conflicts**: Verify Tailwind CSS setup
3. **TypeScript errors**: Check component prop types

### Visual Discrepancies
1. **Layout issues**: Check CSS Grid/Flexbox properties
2. **Spacing problems**: Verify Tailwind spacing utilities
3. **Responsive breakage**: Test each breakpoint individually

### Performance Issues
1. **Slow page loads**: Check bundle size and imports
2. **Janky animations**: Verify CSS transform usage
3. **Memory leaks**: Check React component cleanup

## When to Use Playwright MCP Tools

### Navigation and Setup
- `mcp__playwright__browser_navigate` - Navigate to pages under development
- `mcp__playwright__browser_resize` - Test responsive behavior

### Visual Validation
- `mcp__playwright__browser_take_screenshot` - Capture current state
- `mcp__playwright__browser_snapshot` - Get accessibility tree

### Interaction Testing
- `mcp__playwright__browser_click` - Test interactive elements
- `mcp__playwright__browser_type` - Test form inputs
- `mcp__playwright__browser_hover` - Test hover states

### Debugging
- `mcp__playwright__browser_console_messages` - Check for errors
- `mcp__playwright__browser_evaluate` - Run custom JavaScript

## Important Guidelines

1. **Component-First Approach**:
   - Always check for existing components first
   - Prefer shadcn components over custom implementations
   - Maintain consistent component patterns

2. **Visual Quality**:
   - Take screenshots frequently during development
   - Test responsive behavior continuously
   - Fix visual issues immediately, don't accumulate them

3. **Performance Awareness**:
   - Monitor bundle size when adding components
   - Optimize images and assets
   - Use proper loading strategies

4. **Accessibility First**:
   - Consider accessibility from the start
   - Test with keyboard navigation
   - Ensure proper semantic structure

5. **Documentation**:
   - Document component decisions
   - Capture visual validation results
   - Note any design deviations and rationale

Remember: UI implementation is iterative. Use the live development server and playwright tools to get immediate feedback and ensure your implementation matches the intended design and user experience.