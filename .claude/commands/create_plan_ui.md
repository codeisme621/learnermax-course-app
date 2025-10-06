# Create Plan UI

You are tasked with creating detailed UI/frontend implementation plans through an interactive, iterative process. You should be skeptical, thorough, and work collaboratively with the user to produce high-quality technical specifications for UI development.

## Initial Response

When this command is invoked:

1. **Check if parameters were provided**:
   - If a file path or task reference was provided as a parameter, skip the default message
   - Immediately read any provided files FULLY
   - Begin the research process

2. **If no parameters provided**, respond with:
```
I'll help you create a detailed UI implementation plan. Let me start by understanding what we're building.

Please provide:
1. The UI task description or design requirements
2. Any design files, mockups, or visual references
3. Target devices/breakpoints and accessibility requirements
4. Links to related research or existing UI patterns

I'll analyze this information and work with you to create a comprehensive UI plan.

Tip: You can also invoke this command with a task description directly: `/create_plan_ui "Build responsive hero section with CTAs"`
```

Then wait for the user's input.

## Process Steps

### Step 1: UI Context Gathering & Initial Analysis

1. **Read all mentioned files immediately and FULLY**:
   - Design specifications (e.g., `specs/hero_section/design.md`)
   - UI research documents (e.g., `specs/hero_section/ui_research.md`)
   - Any design files or screenshots mentioned
   - **IMPORTANT**: Use the Read tool WITHOUT limit/offset parameters to read entire files
   - **CRITICAL**: DO NOT spawn sub-tasks before reading these files yourself in the main context
   - **NEVER** read files partially - if a file is mentioned, read it completely

2. **Explore Existing UI Foundation**:
   ```
   Before spawning any sub-tasks, explore the current UI landscape:
   - Use Glob to find existing component directories
   - Read key UI files like globals.css, tailwind.config.js
   - Check package.json for UI dependencies
   - Look for existing design system or component library
   ```

3. **Discover Available Components**:
   ```
   Use shadcn MCP tools to understand available components:
   - mcp__shadcn__get_project_registries - See what registries are configured
   - mcp__shadcn__list_items_in_registries - Browse available components
   - mcp__shadcn__search_items_in_registries - Find components matching your needs
   ```

4. **Spawn initial UI research tasks in parallel**:
   Before asking the user any questions, use specialized agents to research:

   - Use the **codebase-locator** agent to find all UI-related files and components
   - Use the **codebase-analyzer** agent to understand the current UI architecture and patterns
   - Use the **codebase-pattern-finder** agent to find similar UI implementations to model after

   These agents will:
   - Find existing components, styles, and UI utilities
   - Identify design system patterns and conventions
   - Locate responsive breakpoints and CSS frameworks
   - Return detailed explanations with file:line references

5. **Read all files identified by research tasks**:
   - After research tasks complete, read ALL UI files they identified as relevant
   - Read them FULLY into the main context
   - This ensures you have complete understanding of the UI foundation

6. **Analyze and verify UI understanding**:
   - Cross-reference design requirements with existing UI patterns
   - Identify component reuse opportunities
   - Note responsive design patterns and breakpoints
   - Determine styling approach (Tailwind, CSS modules, etc.)
   - Assess accessibility patterns in existing code

7. **Present informed understanding and focused questions**:
   ```
   Based on my research of the UI codebase, I understand we need to [accurate summary].

   Current UI Foundation:
   - Design system: [Tailwind/styled-components/etc with file references]
   - Available components: [List key reusable components]
   - Responsive approach: [Breakpoints and patterns found]
   - Accessibility patterns: [ARIA usage, semantic HTML patterns]

   Available shadcn components that could be useful:
   - [Component name] - [Brief description and use case]
   - [Component name] - [Brief description and use case]

   Questions that my research couldn't answer:
   - [Specific design decision that requires human judgment]
   - [Visual behavior clarification]
   - [User interaction pattern preference]
   ```

   Only ask questions that you genuinely cannot answer through code investigation and component exploration.

### Step 2: UI Research & Discovery

After getting initial clarifications:

1. **If the user corrects any misunderstanding**:
   - DO NOT just accept the correction
   - Spawn new research tasks to verify the correct information
   - Read the specific files/directories they mention
   - Re-explore shadcn components if needed
   - Only proceed once you've verified the facts yourself

2. **Create a UI research todo list** using TodoWrite to track exploration tasks

3. **Spawn parallel sub-tasks for comprehensive UI research**:
   Create multiple Task agents to research different UI aspects concurrently:

   **For component architecture:**
   - **codebase-locator** - Find specific UI patterns (e.g., "find all button variants and form components")
   - **codebase-analyzer** - Understand styling architecture (e.g., "analyze how responsive design is implemented")
   - **codebase-pattern-finder** - Find similar UI features to model after

   **For design system exploration:**
   - Explore color schemes, typography scales, and spacing systems
   - Identify animation/transition patterns
   - Document component composition patterns

4. **Enhanced Component Discovery**:
   ```
   Use shadcn MCP tools for deeper component research:
   - mcp__shadcn__search_items_in_registries - Search for specific UI needs
   - mcp__shadcn__get_item_examples_from_registries - Get usage examples
   - mcp__shadcn__view_items_in_registries - See detailed component information
   ```

5. **Wait for ALL sub-tasks to complete** before proceeding

6. **Present UI findings and design options**:
   ```
   Based on my UI research, here's what I found:

   **Current UI State:**
   - Component library: [Available components with file references]
   - Styling approach: [Tailwind classes, CSS variables, etc.]
   - Responsive patterns: [How breakpoints are handled]
   - Accessibility level: [Current ARIA usage and semantic patterns]

   **Component Strategy Options:**
   1. **Reuse Existing** - [List applicable existing components]
   2. **Add from shadcn** - [Recommend specific shadcn components]
   3. **Custom Implementation** - [Areas requiring custom components]

   **Design Approach Options:**
   1. [Approach A] - [pros/cons for responsive, accessibility, performance]
   2. [Approach B] - [pros/cons for responsive, accessibility, performance]

   **Open UI Questions:**
   - [Visual behavior uncertainty]
   - [Responsive breakpoint decision]
   - [Animation/interaction preference]

   Which UI approach aligns best with your vision?
   ```

### Step 3: UI Plan Structure Development

Once aligned on approach:

1. **Create initial UI plan outline**:
   ```
   Here's my proposed UI plan structure:

   ## Overview
   [1-2 sentence summary of UI implementation]

   ## Component Strategy
   - **Reuse**: [Existing components to leverage]
   - **Install**: [shadcn components to add]
   - **Create**: [Custom components needed]

   ## Implementation Phases:
   1. [Phase name] - [component setup and basic layout]
   2. [Phase name] - [styling and responsive behavior]
   3. [Phase name] - [interactions and polish]

   Does this phasing make sense for the UI work? Should I adjust the component strategy or implementation order?
   ```

2. **Get feedback on structure** before writing details

### Step 4: Detailed UI Plan Writing

After structure approval:

1. **Write the plan** to `specs/<description>/plan.md` where:
   - `<description>` is a brief, descriptive name using underscores
   - Examples: `hero_section`, `navigation_menu`, `product_carousel`

2. **Use this UI-specific template structure**:

````markdown
# [UI Feature/Component Name] Implementation Plan

## Overview

[Brief description of the UI component/feature being implemented and its purpose]

## Current UI State Analysis

[What UI components exist now, what's missing, key design system constraints discovered]

## Desired End State

[A specification of the desired UI after this plan is complete, including visual behavior and responsive characteristics]

### Key UI Discoveries:
- [Existing component pattern with file:line reference]
- [Design system token to follow]
- [Responsive pattern to implement]
- [Accessibility requirement to meet]

## What We're NOT Doing

[Explicitly list out-of-scope UI items to prevent scope creep]
- Not implementing dark mode toggle (separate task)
- Not adding animations beyond basic transitions
- Not optimizing for IE11 compatibility

## Component Strategy

### Reusing Existing Components:
- `components/ui/Button.tsx` - For CTAs and actions
- `components/layout/Container.tsx` - For consistent spacing

### Adding from shadcn:
- `@shadcn/card` - For content sections
- `@shadcn/badge` - For status indicators

### Creating Custom Components:
- `HeroSection.tsx` - Unique layout requirements
- `FeatureGrid.tsx` - Custom responsive grid

## UI Implementation Approach

[High-level strategy for responsive design, accessibility, and performance]

## Phase 1: [Component Foundation]

### Overview
[What this phase accomplishes - usually component setup and basic structure]

### Changes Required:

#### 1. Install Required shadcn Components
**Command**: `npx shadcn@latest add card badge button`
**Purpose**: [Why these components are needed]

#### 2. Create Base Component Structure
**File**: `components/hero/HeroSection.tsx`
**Changes**: [Summary of component structure]

```tsx
// Component foundation with proper TypeScript interfaces
interface HeroSectionProps {
  title: string;
  subtitle: string;
  ctaText: string;
  onCtaClick: () => void;
}

export function HeroSection({ title, subtitle, ctaText, onCtaClick }: HeroSectionProps) {
  return (
    <section className="relative overflow-hidden">
      {/* Component implementation */}
    </section>
  );
}
```

#### 3. Implement Base Styling
**File**: `components/hero/HeroSection.tsx`
**Changes**: Add responsive classes and design system tokens

```tsx
// Responsive layout with Tailwind classes
<div className="container mx-auto px-4 py-16 md:py-24 lg:py-32">
  <div className="grid lg:grid-cols-2 gap-8 items-center">
    {/* Hero content */}
  </div>
</div>
```

### Success Criteria:

#### Continuous Validation (During Implementation):
- [ ] Run `pnpm test [file]` after each component change - all pass
- [ ] Monitor dev server logs via `pnpm run dev:logs` - no build errors
- [ ] Check browser console via Playwright MCP - no React warnings
- [ ] Take screenshots after changes - matches design
- [ ] Test responsive behavior with browser resize - works correctly

#### Phase Completion Validation:
- [ ] All component tests pass: `cd frontend && pnpm test`
- [ ] Type checking passes: `pnpm run typecheck`
- [ ] Linting passes: `pnpm run lint`
- [ ] Test coverage meets 90% threshold: `pnpm run test:coverage`
- [ ] Build succeeds: `pnpm run build`
- [ ] Component renders without errors on local dev

#### Visual Verification (via Playwright MCP):
- [ ] Component displays correctly on desktop (1920x1080)
- [ ] Basic responsive behavior works on tablet (768x1024)
- [ ] Mobile layout is functional (375x667)
- [ ] No console errors when component mounts
- [ ] Design system tokens are properly applied
- [ ] Screenshots taken for all breakpoints

---

## Phase 2: [Responsive Design & Polish]

### Overview
[What this phase accomplishes - usually responsive refinement and visual polish]

### Changes Required:

#### 1. Implement Responsive Breakpoints
**File**: `components/hero/HeroSection.tsx`
**Changes**: Add responsive typography and spacing

```tsx
// Responsive typography scale
<h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
  {title}
</h1>
<p className="text-lg md:text-xl text-gray-600 mt-4 md:mt-6">
  {subtitle}
</p>
```

#### 2. Add Interactive States
**File**: `components/hero/HeroSection.tsx`
**Changes**: Implement hover states and focus management

```tsx
// Interactive button with proper focus states
<Button
  onClick={onCtaClick}
  className="mt-8 px-8 py-4 text-lg font-semibold transition-all duration-200 hover:scale-105 focus:ring-2 focus:ring-offset-2"
>
  {ctaText}
</Button>
```

### Success Criteria:

#### Continuous Validation (During Implementation):
- [ ] Run tests after each interactive state added - all pass
- [ ] Monitor dev logs - no compilation errors
- [ ] Test with Playwright MCP - all states render correctly
- [ ] Verify keyboard navigation - focus states visible

#### Phase Completion Validation:
- [ ] All tests pass: `cd frontend && pnpm test`
- [ ] Type checking passes: `pnpm run typecheck`
- [ ] Linting passes: `pnpm run lint`
- [ ] Test coverage maintained: `pnpm run test:coverage`
- [ ] Build succeeds: `pnpm run build`

#### Visual Verification (via Playwright MCP):
- [ ] Smooth responsive behavior across all breakpoints
- [ ] Interactive states (hover, focus, active) work correctly
- [ ] Typography scales appropriately across devices
- [ ] Spacing is consistent with design system
- [ ] Loading states display properly
- [ ] Screenshots captured for all interactive states

#### Accessibility Verification:
- [ ] Proper heading hierarchy (h1, h2, etc.)
- [ ] Focus management works with keyboard navigation
- [ ] Screen reader compatibility verified
- [ ] Color contrast meets WCAG standards
- [ ] ARIA labels added where necessary

---

## Phase 3: [Integration & Performance]

### Overview
[What this phase accomplishes - usually integration with app and performance optimization]

### Changes Required:

#### 1. Integrate with Page Layout
**File**: `app/page.tsx` or relevant page file
**Changes**: Add component to page with proper data flow

```tsx
// Integration with Next.js page
import { HeroSection } from '@/components/hero/HeroSection';

export default function HomePage() {
  const handleCtaClick = () => {
    // CTA logic
  };

  return (
    <main>
      <HeroSection
        title="Welcome to Our Platform"
        subtitle="Build amazing things with our tools"
        ctaText="Get Started"
        onCtaClick={handleCtaClick}
      />
    </main>
  );
}
```

#### 2. Performance Optimization
**File**: Various component files
**Changes**: Implement lazy loading and bundle optimization

### Success Criteria:

#### Continuous Validation (During Implementation):
- [ ] Monitor dev logs during integration - no errors
- [ ] Test page with Playwright MCP - component renders in context
- [ ] Verify data flow with browser console - props passed correctly
- [ ] Check for layout shift - smooth rendering

#### Phase Completion Validation:
- [ ] All tests pass: `cd frontend && pnpm test`
- [ ] Type checking passes: `pnpm run typecheck`
- [ ] Linting passes: `pnpm run lint`
- [ ] Test coverage meets 90%: `pnpm run test:coverage`
- [ ] Build succeeds: `pnpm run build`
- [ ] Bundle size impact acceptable (check build output)

#### Integration Verification (Local):
- [ ] Component works correctly within page layout
- [ ] Data flow functions as expected
- [ ] No layout shift during loading via Playwright screenshots
- [ ] Performance meets expectations on local dev
- [ ] No console warnings or errors

#### Preview Deployment Validation:
- [ ] Frontend deployed successfully: `./scripts/deploy-preview-frontend.sh`
- [ ] Backend deployed successfully: `./scripts/deploy-preview-backend.sh`
- [ ] E2E tests created in `e2e/tests/[feature-name].spec.ts`
- [ ] E2E tests pass: `cd e2e && pnpm test`
- [ ] No errors in frontend logs: `scripts/.vercel-logs.log`
- [ ] No errors in backend logs: `scripts/.sam-logs.log`
- [ ] UI works correctly in preview environment
- [ ] Core Web Vitals metrics are good in preview

---

## Testing Strategy

### Unit Tests:
- Component renders with required props
- Event handlers are called correctly
- Responsive classes are applied
- Accessibility attributes are present

### Visual Regression Tests (via Playwright MCP during local dev):
- Desktop layout screenshot comparison
- Mobile layout screenshot comparison
- Interactive state screenshots
- Dark mode compatibility (if applicable)

### E2E Tests (Created During Preview Validation):
- [Complete user flow testing UI and backend integration]
- [Form submission and data persistence]
- [Navigation and routing]
- [Error handling and edge cases]

**Note**: E2E tests are written and run against the preview environment after local implementation is complete. Monitor frontend and backend logs in real-time while writing and running E2E tests to get immediate signal about issues.

### Manual Testing Steps (Local Dev):
1. Load page and verify component displays correctly
2. Test responsive behavior by resizing browser window
3. Navigate using keyboard only to verify accessibility
4. Test with screen reader to verify semantic structure
5. Verify performance on slow network connections

### Manual Testing Steps (Preview Environment):
1. Verify UI renders correctly in preview URL
2. Test complete user flows end-to-end
3. Check browser console for errors
4. Review preview logs for backend errors
5. Validate Core Web Vitals metrics

## Performance Considerations

- **Bundle Impact**: [Expected bundle size increase]
- **Loading Strategy**: [Lazy loading approach if needed]
- **Image Optimization**: [Image handling strategy]
- **Animation Performance**: [CSS vs JS animation choices]

## Accessibility Implementation

- **Semantic HTML**: Use proper heading hierarchy and landmarks
- **ARIA Labels**: Add labels for interactive elements
- **Keyboard Navigation**: Ensure all functionality is keyboard accessible
- **Screen Readers**: Test with VoiceOver/NVDA
- **Color Contrast**: Verify all text meets WCAG AA standards

## Responsive Design Strategy

### Breakpoints:
- **Mobile**: 320px - 767px (single column, stacked layout)
- **Tablet**: 768px - 1023px (flexible grid, adjusted typography)
- **Desktop**: 1024px+ (full layout, optimal spacing)

### Typography Scale:
- **Mobile**: Base 16px, headings scale 1.25
- **Tablet**: Base 16px, headings scale 1.333
- **Desktop**: Base 18px, headings scale 1.414

## Browser Support

- **Modern Browsers**: Chrome 88+, Firefox 85+, Safari 14+, Edge 88+
- **Mobile Browsers**: iOS Safari 14+, Chrome Mobile 88+
- **Accessibility**: JAWS, NVDA, VoiceOver compatibility

## References

- Design system: `styles/design-system.css`
- Component patterns: `components/ui/`
- shadcn documentation: [Registry components used]
- Accessibility guidelines: WCAG 2.1 AA
````

### Step 5: UI Plan Review

1. **Present the draft plan location**:
   ```
   I've created the initial UI implementation plan at:
   `specs/<description>/plan.md`

   Please review it and let me know:
   - Are the component choices appropriate?
   - Is the responsive strategy correct for your needs?
   - Are the accessibility requirements sufficient?
   - Should I adjust the visual verification criteria?
   - Any design system constraints I missed?
   ```

2. **Iterate based on feedback** - be ready to:
   - Adjust component strategy (reuse vs custom vs shadcn)
   - Modify responsive breakpoint approach
   - Update accessibility requirements
   - Refine visual success criteria
   - Add/remove UI scope items

3. **Continue refining** until the user is satisfied with the UI plan

## Important UI Planning Guidelines

1. **Be Component-Conscious**:
   - Always check existing components first
   - Research shadcn options thoroughly
   - Prefer composition over custom implementation
   - Document component decisions clearly

2. **Be Responsive-First**:
   - Plan mobile experience first
   - Consider touch interactions
   - Test across real breakpoints
   - Plan for content reflow

3. **Be Accessible**:
   - Include accessibility from the start
   - Plan keyboard navigation patterns
   - Consider screen reader experience
   - Verify color contrast early

4. **Be Performance-Aware**:
   - Consider bundle size impact
   - Plan image optimization strategy
   - Design efficient loading states
   - Minimize layout shift

5. **Be Visually Precise**:
   - Define exact responsive behavior
   - Specify interaction states clearly
   - Plan visual testing approach
   - Include browser testing strategy

6. **Track UI Planning Progress**:
   - Use TodoWrite for component research tasks
   - Update todos as you explore options
   - Mark planning tasks complete when done

## UI Success Criteria Guidelines

**Always separate UI success criteria into three categories:**

1. **Automated Verification** (can be run by execution agents):
   - TypeScript compilation and type checking
   - Unit test suites
   - Linting and code quality checks
   - Build process success

2. **Visual Verification** (requires browser testing):
   - Screenshot comparisons across breakpoints
   - Interactive state behavior
   - Responsive layout validation
   - Performance metrics

3. **Accessibility Verification** (requires manual testing):
   - Screen reader compatibility
   - Keyboard navigation testing
   - Color contrast validation
   - Semantic HTML structure

## Specialized UI Research Tasks

When spawning sub-tasks for UI research:

1. **Component Discovery Tasks**:
   - "Find all existing button variants and their usage patterns"
   - "Analyze current form component architecture"
   - "Identify responsive navigation patterns in use"

2. **Design System Tasks**:
   - "Document current color system and CSS variables"
   - "Find typography scale and font loading strategy"
   - "Identify spacing system and layout utilities"

3. **Pattern Analysis Tasks**:
   - "Find similar hero sections or landing page patterns"
   - "Analyze current modal/dialog implementations"
   - "Document animation and transition patterns"

Each task should specify:
- Which directories to focus on (`/components`, `/styles`, `/app`)
- What file types to examine (`.tsx`, `.css`, `.ts`)
- Expected output format (component list, pattern documentation)
- Specific design system aspects to extract

## Common UI Planning Patterns

### For Landing Page Components:
- Start with layout and spacing
- Add typography and color
- Implement responsive behavior
- Polish interactions and accessibility

### For Complex Interactive Components:
- Research existing interaction patterns
- Plan state management approach
- Design keyboard navigation flow
- Implement progressive enhancement

### For Design System Extensions:
- Document current design tokens
- Plan token extensions needed
- Design component API consistency
- Plan backward compatibility

Remember: UI planning requires both technical and visual thinking. Use the shadcn and playwright MCP tools to make informed decisions about components and validate your visual assumptions early in the planning process.