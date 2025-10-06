# Landing Page & Enrollment Page UI Implementation Plan

## Overview

Implement a modern, professional landing page and enrollment page for the course application. The landing page will showcase course information, benefits, testimonials, and instructor background to build trust and convince students to enroll. The enrollment page will feature a beautiful form with Google social login UI (non-functional for now).

## Current UI State Analysis

**Existing Foundation:**
- Next.js 15.5.4 with React 19 and TypeScript
- Tailwind CSS v4 with custom design tokens in `frontend/app/globals.css:6-165`
- Framer Motion installed as "motion" package for animations
- lucide-react for icons
- shadcn configured with @shadcn and @originui registries
- No existing components - clean slate
- Jest testing with 90% coverage requirement

**Design System Tokens:**
- Color scheme: Uses oklch color space with CSS variables
- Fonts: Open Sans (sans), Georgia (serif), Menlo (mono)
- Radius: `--radius: 0.625rem` (light), `1.3rem` (dark)
- Spacing: `--spacing: 0.25rem`
- Custom shadow system defined

## Desired End State

A fully responsive, professionally designed landing page with:
- Hero section with compelling headline, image, and CTA
- Trust indicators (company logos)
- Benefits/features section with icon cards
- Course metadata display (duration, teacher info)
- Student testimonials with carousel navigation
- Call-to-action section
- Header with minimal navigation
- Footer with social links

An enrollment page with:
- Beautiful, modern form UI
- Google social login button (UI only)
- Email signup option
- Minimal friction enrollment flow

Both pages should:
- Work seamlessly on mobile, tablet, and desktop
- Use framer motion for smooth animations
- Build trust through professional design
- Not modify `globals.css` (theme already configured)

### Key UI Discoveries:
- Design tokens already configured in `frontend/app/globals.css:6-165`
- Framer Motion available as "motion" package for animations
- lucide-react available for beautiful icons throughout
- No existing components to conflict with
- Jest configured with 90% coverage threshold in `frontend/package.json:70-76`

## What We're NOT Doing

- Not implementing actual authentication flows (sign up, sign in, OAuth)
- Not implementing backend API integration for enrollment
- Not creating email system or notifications
- Not building admin/instructor dashboards
- Not implementing course content pages
- Not setting up payment processing
- Not modifying `globals.css` or theme system
- Not implementing dark mode toggle (theme already supports it)
- Not building multi-course browsing (single course focus)

## Component Strategy

### Reusing from shadcn (@shadcn registry):
- `button` - For CTAs, navigation, and form actions
- `card` - For benefit cards, testimonials, and content sections
- `badge` - For course metadata tags (duration, level, category)
- `avatar` - For instructor photo and student testimonial avatars
- `input` - For form fields (email, name, etc.)
- `label` - For form field labels
- `form` - For form structure and validation UI
- `separator` - For visual section dividers

### Creating Custom Components:
- `Header` - Logo, minimal nav, and sign-in CTA
- `HeroSection` - Hero with headline, subheadline, image, stats, CTA
- `TrustIndicators` - Company logo section
- `BenefitsSection` - Grid of benefit/feature cards with icons
- `CourseMetadataSection` - Course details (duration, teacher, outcomes)
- `TestimonialsSection` - Student testimonials with navigation
- `CtaSection` - Final call-to-action before footer
- `Footer` - Social links and minimal info
- `EnrollmentForm` - Custom form with social login UI
- `GoogleSignInButton` - Styled Google OAuth button (UI only)

### Mock Data:
- `lib/mock-data/course.ts` - Static course data (details, testimonials, metadata)

## UI Implementation Approach

**Responsive Strategy:**
- Mobile-first design approach
- Breakpoints: 320px (mobile), 768px (tablet), 1024px (desktop)
- Use Tailwind responsive prefixes (sm:, md:, lg:)
- Stack sections vertically on mobile, grid layouts on desktop

**Animation Strategy:**
- Framer Motion for scroll-triggered animations
- Fade-in and slide-up effects for sections
- Smooth hover states and transitions
- Subtle micro-interactions on cards and buttons

**Accessibility:**
- Semantic HTML throughout (header, main, section, footer)
- Proper heading hierarchy (h1, h2, h3)
- ARIA labels for icons and interactive elements
- Focus management for keyboard navigation
- Color contrast meeting WCAG AA standards

**Performance:**
- Lazy load images with Next.js Image component
- Code-split by route (landing page vs enrollment page)
- Optimize animations for 60fps
- Minimize bundle size with tree-shaking

---

## Phase 1: Foundation & Layout Components

### Overview
Set up the component foundation, install shadcn components, create layout components (Header, Footer), and establish the basic page structure with routing.

### Changes Required:

#### 1. Install Required shadcn Components
**Command**: `cd frontend && npx shadcn@latest add button card badge avatar input label form separator`

**Purpose**: Install core UI components needed throughout the landing and enrollment pages

#### 2. Create Mock Course Data
**File**: `frontend/lib/mock-data/course.ts`

**Changes**: Create TypeScript interfaces and mock data for course information

```tsx
// Course data structure
export interface CourseData {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  duration: string;
  level: string;
  category: string;
  instructor: {
    name: string;
    title: string;
    background: string;
    imageUrl: string;
  };
  outcomes: string[];
  curriculum: {
    module: string;
    topics: string[];
  }[];
  testimonials: {
    id: string;
    name: string;
    role: string;
    content: string;
    imageUrl: string;
    rating: number;
  }[];
  stats: {
    students: string;
    rating: string;
    certificates: string;
  };
}

export const mockCourse: CourseData = {
  id: "course-001",
  title: "Master Modern Web Development",
  subtitle: "Build production-ready applications with the latest technologies",
  description: "Learn to create scalable, performant web applications...",
  // ... rest of mock data
};
```

#### 3. Create Header Component
**File**: `frontend/components/layout/Header.tsx`

**Changes**: Create responsive header with logo and minimal navigation

```tsx
'use client';

import { Button } from '@/components/ui/button';
import { motion } from 'motion/react';
import Link from 'next/link';

export function Header() {
  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border"
    >
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="text-2xl font-bold text-primary">LearnerMax</div>
        </Link>

        <nav className="flex items-center gap-4">
          <Button variant="ghost" asChild>
            <Link href="/enroll?courseid=course-001">Sign In</Link>
          </Button>
          <Button asChild>
            <Link href="/enroll?courseid=course-001">Enroll Now</Link>
          </Button>
        </nav>
      </div>
    </motion.header>
  );
}
```

#### 4. Create Footer Component
**File**: `frontend/components/layout/Footer.tsx`

**Changes**: Create footer with social links and minimal info

```tsx
import { Facebook, Twitter, Instagram, Linkedin } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';

export function Footer() {
  const socialLinks = [
    { icon: Facebook, href: '#', label: 'Facebook' },
    { icon: Twitter, href: '#', label: 'Twitter' },
    { icon: Instagram, href: '#', label: 'Instagram' },
    { icon: Linkedin, href: '#', label: 'LinkedIn' },
  ];

  return (
    <footer className="bg-muted/30 border-t border-border">
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <div className="text-2xl font-bold text-primary mb-4">LearnerMax</div>
          <div className="flex items-center justify-center gap-6">
            {socialLinks.map((social) => {
              const Icon = social.icon;
              return (
                <Link
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Icon className="w-5 h-5" />
                </Link>
              );
            })}
          </div>
        </div>

        <Separator className="mb-8" />

        <div className="text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} LearnerMax. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
```

#### 5. Update Root Page Layout
**File**: `frontend/app/page.tsx`

**Changes**: Replace placeholder with layout components

```tsx
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export default function HomePage() {
  return (
    <>
      <Header />
      <main className="min-h-screen pt-20">
        {/* Hero and other sections will be added in Phase 2 */}
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-4xl font-bold">Landing Page Coming Soon</h1>
        </div>
      </main>
      <Footer />
    </>
  );
}
```

#### 6. Create Enrollment Page Route
**File**: `frontend/app/enroll/page.tsx`

**Changes**: Create enrollment page with basic structure

```tsx
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export default function EnrollPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen pt-20">
        <div className="container mx-auto px-4 py-20">
          <h1 className="text-3xl font-bold text-center mb-8">Enroll in Course</h1>
          {/* Enrollment form will be added in Phase 4 */}
        </div>
      </main>
      <Footer />
    </>
  );
}
```

#### 7. Create Component Tests
**File**: `frontend/components/layout/__tests__/Header.test.tsx`

**Changes**: Add unit tests for Header component

```tsx
import { render, screen } from '@testing-library/react';
import { Header } from '../Header';

describe('Header', () => {
  it('renders logo', () => {
    render(<Header />);
    expect(screen.getByText('LearnerMax')).toBeInTheDocument();
  });

  it('renders navigation buttons', () => {
    render(<Header />);
    expect(screen.getByRole('link', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /enroll now/i })).toBeInTheDocument();
  });
});
```

**File**: `frontend/components/layout/__tests__/Footer.test.tsx`

**Changes**: Add unit tests for Footer component

```tsx
import { render, screen } from '@testing-library/react';
import { Footer } from '../Footer';

describe('Footer', () => {
  it('renders social links', () => {
    render(<Footer />);
    expect(screen.getByLabelText('Facebook')).toBeInTheDocument();
    expect(screen.getByLabelText('Twitter')).toBeInTheDocument();
    expect(screen.getByLabelText('Instagram')).toBeInTheDocument();
    expect(screen.getByLabelText('LinkedIn')).toBeInTheDocument();
  });

  it('renders copyright text', () => {
    render(<Footer />);
    expect(screen.getByText(/© 2025 LearnerMax/i)).toBeInTheDocument();
  });
});
```

### Success Criteria:

#### Continuous Validation (During Implementation):
- [ ] Run `pnpm test` after each component - all pass
- [ ] Monitor dev server - no build errors
- [ ] Check TypeScript compilation - no type errors
- [ ] Verify components render in browser

#### Phase Completion Validation:
- [ ] All component tests pass: `cd frontend && pnpm test`
- [ ] Type checking passes: `cd frontend && pnpm run typecheck`
- [ ] Linting passes: `cd frontend && pnpm run lint`
- [ ] Test coverage meets 90%: `cd frontend && pnpm run test:coverage`
- [ ] Build succeeds: `cd frontend && pnpm run build`
- [ ] Header displays on both pages
- [ ] Footer displays on both pages
- [ ] Navigation links work correctly
- [ ] Routes accessible (/ and /enroll)

#### Visual Verification (Manual Testing):
- [ ] Header is sticky and has backdrop blur
- [ ] Header animates on page load
- [ ] Logo and buttons are properly aligned
- [ ] Footer social links are centered
- [ ] Responsive layout works on mobile (375px width)
- [ ] No layout shift during component mount

---

## Phase 2: Hero Section & Trust Indicators

### Overview
Implement the hero section with animated headline, image, stats, and CTA. Add company trust indicators below the hero.

### Changes Required:

#### 1. Create Hero Section Component
**File**: `frontend/components/landing/HeroSection.tsx`

**Changes**: Create hero with image, headline, stats, and CTA with framer motion animations

```tsx
'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'motion/react';
import Link from 'next/link';
import { ArrowRight, Users, Award, BookOpen } from 'lucide-react';
import type { CourseData } from '@/lib/mock-data/course';

interface HeroSectionProps {
  course: CourseData;
}

export function HeroSection({ course }: HeroSectionProps) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-muted/50 to-background py-20 lg:py-32">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Content */}
          <motion.div
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="text-center lg:text-left"
          >
            <Badge variant="secondary" className="mb-4">
              {course.category}
            </Badge>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
              {course.title}
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground mb-8">
              {course.subtitle}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-12">
              <Button size="lg" asChild>
                <Link href={`/enroll?courseid=${course.id}`}>
                  Enroll Now <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline">
                Watch Video
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6">
              <StatItem
                icon={Users}
                value={course.stats.students}
                label="Students"
              />
              <StatItem
                icon={Award}
                value={course.stats.rating}
                label="Rating"
              />
              <StatItem
                icon={BookOpen}
                value={course.stats.certificates}
                label="Certificates"
              />
            </div>
          </motion.div>

          {/* Right Column - Image */}
          <motion.div
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            <div className="relative aspect-square lg:aspect-auto">
              {/* Placeholder for hero image */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl" />
              {/* In real implementation, use Next.js Image */}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function StatItem({ icon: Icon, value, label }: { icon: any; value: string; label: string }) {
  return (
    <div className="text-center lg:text-left">
      <Icon className="w-6 h-6 text-primary mb-2 mx-auto lg:mx-0" />
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
}
```

#### 2. Create Trust Indicators Component
**File**: `frontend/components/landing/TrustIndicators.tsx`

**Changes**: Create company logo section with animation

```tsx
'use client';

import { motion } from 'motion/react';

export function TrustIndicators() {
  const companies = [
    'Duolingo',
    'Khan Academy',
    'Udemy',
    'Google',
    'Facebook',
  ];

  return (
    <section className="py-12 bg-muted/30">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <p className="text-sm text-muted-foreground mb-8">
            Trusted By 3000+ Company
          </p>

          <div className="flex flex-wrap items-center justify-center gap-8 lg:gap-12">
            {companies.map((company, index) => (
              <motion.div
                key={company}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="text-xl font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                {company}
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
```

#### 3. Update Home Page with Hero and Trust Indicators
**File**: `frontend/app/page.tsx`

**Changes**: Import and render hero and trust indicator components

```tsx
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { HeroSection } from '@/components/landing/HeroSection';
import { TrustIndicators } from '@/components/landing/TrustIndicators';
import { mockCourse } from '@/lib/mock-data/course';

export default function HomePage() {
  return (
    <>
      <Header />
      <main className="min-h-screen pt-16">
        <HeroSection course={mockCourse} />
        <TrustIndicators />
        {/* More sections will be added in Phase 3 */}
      </main>
      <Footer />
    </>
  );
}
```

#### 4. Add Component Tests
**File**: `frontend/components/landing/__tests__/HeroSection.test.tsx`

**Changes**: Add tests for hero section

```tsx
import { render, screen } from '@testing-library/react';
import { HeroSection } from '../HeroSection';
import { mockCourse } from '@/lib/mock-data/course';

describe('HeroSection', () => {
  it('renders course title and subtitle', () => {
    render(<HeroSection course={mockCourse} />);
    expect(screen.getByText(mockCourse.title)).toBeInTheDocument();
    expect(screen.getByText(mockCourse.subtitle)).toBeInTheDocument();
  });

  it('renders enroll CTA button', () => {
    render(<HeroSection course={mockCourse} />);
    expect(screen.getByRole('link', { name: /enroll now/i })).toBeInTheDocument();
  });

  it('renders course stats', () => {
    render(<HeroSection course={mockCourse} />);
    expect(screen.getByText('Students')).toBeInTheDocument();
    expect(screen.getByText('Rating')).toBeInTheDocument();
    expect(screen.getByText('Certificates')).toBeInTheDocument();
  });
});
```

**File**: `frontend/components/landing/__tests__/TrustIndicators.test.tsx`

**Changes**: Add tests for trust indicators

```tsx
import { render, screen } from '@testing-library/react';
import { TrustIndicators } from '../TrustIndicators';

describe('TrustIndicators', () => {
  it('renders company names', () => {
    render(<TrustIndicators />);
    expect(screen.getByText('Duolingo')).toBeInTheDocument();
    expect(screen.getByText('Google')).toBeInTheDocument();
  });

  it('renders trust message', () => {
    render(<TrustIndicators />);
    expect(screen.getByText(/trusted by 3000\+ company/i)).toBeInTheDocument();
  });
});
```

### Success Criteria:

#### Continuous Validation (During Implementation):
- [ ] Run tests after each component change - all pass
- [ ] Monitor dev server logs - no build errors
- [ ] Check browser console - no React warnings
- [ ] Test responsive behavior with browser resize

#### Phase Completion Validation:
- [ ] All tests pass: `cd frontend && pnpm test`
- [ ] Type checking passes: `cd frontend && pnpm run typecheck`
- [ ] Linting passes: `cd frontend && pnpm run lint`
- [ ] Test coverage meets 90%: `cd frontend && pnpm run test:coverage`
- [ ] Build succeeds: `cd frontend && pnpm run build`

#### Visual Verification (Manual Testing):
- [ ] Hero section displays correctly on desktop (1920x1080)
- [ ] Hero content animates smoothly on page load
- [ ] Stats display in grid layout
- [ ] CTA buttons are prominent and clickable
- [ ] Hero is responsive on tablet (768x1024)
- [ ] Hero stacks vertically on mobile (375x667)
- [ ] Trust indicators animate on scroll
- [ ] Company logos are evenly spaced
- [ ] No layout shift during animations

---

## Phase 3: Benefits, Course Metadata & Testimonials

### Overview
Implement the benefits/features section with icon cards, course metadata section with instructor info and outcomes, and testimonials section with student reviews.

### Changes Required:

#### 1. Create Benefits Section Component
**File**: `frontend/components/landing/BenefitsSection.tsx`

**Changes**: Create benefit cards with icons and animations

```tsx
'use client';

import { Card } from '@/components/ui/card';
import { motion } from 'motion/react';
import {
  Clock,
  Award,
  GraduationCap,
  TrendingUp
} from 'lucide-react';

interface Benefit {
  icon: any;
  title: string;
  description: string;
}

const benefits: Benefit[] = [
  {
    icon: Clock,
    title: 'Lifetime Access',
    description: 'Once you enroll, you have lifetime access to all course materials and future updates.',
  },
  {
    icon: Award,
    title: 'Get Certificates',
    description: 'Earn a certificate upon completion to showcase your skills and boost your career.',
  },
  {
    icon: GraduationCap,
    title: 'Course Accessibility',
    description: 'Learn at your own pace with 24/7 access to lectures, projects, and resources.',
  },
  {
    icon: TrendingUp,
    title: 'Get Certificates',
    description: 'Track your progress and see measurable improvements in your skills over time.',
  },
];

export function BenefitsSection() {
  return (
    <section className="py-20 lg:py-32">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            Why Choose Us?
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Join thousands of students who have transformed their careers through our comprehensive courses.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {benefits.map((benefit, index) => (
            <BenefitCard key={index} benefit={benefit} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}

function BenefitCard({ benefit, index }: { benefit: Benefit; index: number }) {
  const Icon = benefit.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
    >
      <Card className="p-6 h-full hover:shadow-lg transition-shadow">
        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
          <Icon className="w-6 h-6 text-primary" />
        </div>
        <h3 className="text-xl font-semibold mb-2">{benefit.title}</h3>
        <p className="text-muted-foreground">{benefit.description}</p>
      </Card>
    </motion.div>
  );
}
```

#### 2. Create Course Metadata Section Component
**File**: `frontend/components/landing/CourseMetadataSection.tsx`

**Changes**: Create section displaying course details, instructor info, and learning outcomes

```tsx
'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { motion } from 'motion/react';
import { CheckCircle2, Clock, BarChart } from 'lucide-react';
import type { CourseData } from '@/lib/mock-data/course';

interface CourseMetadataSectionProps {
  course: CourseData;
}

export function CourseMetadataSection({ course }: CourseMetadataSectionProps) {
  return (
    <section className="py-20 lg:py-32 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Instructor & Course Details */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-8">
              Meet Your Instructor
            </h2>

            <Card className="p-6 mb-6">
              <div className="flex items-start gap-4">
                <Avatar className="w-16 h-16">
                  <AvatarFallback className="text-lg">
                    {course.instructor.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-1">
                    {course.instructor.name}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    {course.instructor.title}
                  </p>
                  <p className="text-sm">
                    {course.instructor.background}
                  </p>
                </div>
              </div>
            </Card>

            {/* Course Details */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Course Details</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-primary" />
                  <span className="text-sm">Duration: {course.duration}</span>
                </div>
                <div className="flex items-center gap-3">
                  <BarChart className="w-5 h-5 text-primary" />
                  <span className="text-sm">Level: {course.level}</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge>{course.category}</Badge>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Learning Outcomes */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-8">
              What You'll Learn
            </h2>

            <Card className="p-6">
              <ul className="space-y-4">
                {course.outcomes.map((outcome, index) => (
                  <motion.li
                    key={index}
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    className="flex items-start gap-3"
                  >
                    <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <span>{outcome}</span>
                  </motion.li>
                ))}
              </ul>
            </Card>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
```

#### 3. Create Testimonials Section Component
**File**: `frontend/components/landing/TestimonialsSection.tsx`

**Changes**: Create testimonials display with cards

```tsx
'use client';

import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { motion } from 'motion/react';
import { Star, ChevronLeft, ChevronRight } from 'lucide-react';
import type { CourseData } from '@/lib/mock-data/course';

interface TestimonialsSectionProps {
  course: CourseData;
}

export function TestimonialsSection({ course }: TestimonialsSectionProps) {
  return (
    <section className="py-20 lg:py-32">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            What Our Students Saying
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Don't just take our word for it - hear from students who have transformed their careers.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {course.testimonials.slice(0, 3).map((testimonial, index) => (
            <motion.div
              key={testimonial.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="p-6 h-full flex flex-col">
                <div className="flex items-center gap-1 mb-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i < testimonial.rating
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>

                <p className="text-sm mb-6 flex-1">"{testimonial.content}"</p>

                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>
                      {testimonial.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-semibold text-sm">{testimonial.name}</div>
                    <div className="text-xs text-muted-foreground">{testimonial.role}</div>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Navigation buttons (UI only for now) */}
        <div className="flex items-center justify-center gap-4 mt-12">
          <button
            className="w-10 h-10 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors"
            aria-label="Previous testimonial"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            className="w-10 h-10 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors"
            aria-label="Next testimonial"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </section>
  );
}
```

#### 4. Update Home Page with New Sections
**File**: `frontend/app/page.tsx`

**Changes**: Add new sections to landing page

```tsx
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { HeroSection } from '@/components/landing/HeroSection';
import { TrustIndicators } from '@/components/landing/TrustIndicators';
import { BenefitsSection } from '@/components/landing/BenefitsSection';
import { CourseMetadataSection } from '@/components/landing/CourseMetadataSection';
import { TestimonialsSection } from '@/components/landing/TestimonialsSection';
import { mockCourse } from '@/lib/mock-data/course';

export default function HomePage() {
  return (
    <>
      <Header />
      <main className="min-h-screen pt-16">
        <HeroSection course={mockCourse} />
        <TrustIndicators />
        <BenefitsSection />
        <CourseMetadataSection course={mockCourse} />
        <TestimonialsSection course={mockCourse} />
        {/* CTA section will be added in Phase 4 */}
      </main>
      <Footer />
    </>
  );
}
```

#### 5. Add Component Tests
**File**: `frontend/components/landing/__tests__/BenefitsSection.test.tsx`
**File**: `frontend/components/landing/__tests__/CourseMetadataSection.test.tsx`
**File**: `frontend/components/landing/__tests__/TestimonialsSection.test.tsx`

**Changes**: Add comprehensive tests for all three components

```tsx
// Example test structure for each
import { render, screen } from '@testing-library/react';
import { BenefitsSection } from '../BenefitsSection';

describe('BenefitsSection', () => {
  it('renders section heading', () => {
    render(<BenefitsSection />);
    expect(screen.getByText(/why choose us/i)).toBeInTheDocument();
  });

  it('renders all benefit cards', () => {
    render(<BenefitsSection />);
    expect(screen.getByText(/lifetime access/i)).toBeInTheDocument();
    expect(screen.getByText(/get certificates/i)).toBeInTheDocument();
  });
});
```

### Success Criteria:

#### Continuous Validation (During Implementation):
- [ ] Run tests after each component - all pass
- [ ] Monitor dev logs - no compilation errors
- [ ] Verify TypeScript types are correct
- [ ] Check animations work smoothly

#### Phase Completion Validation:
- [ ] All tests pass: `cd frontend && pnpm test`
- [ ] Type checking passes: `cd frontend && pnpm run typecheck`
- [ ] Linting passes: `cd frontend && pnpm run lint`
- [ ] Test coverage meets 90%: `cd frontend && pnpm run test:coverage`
- [ ] Build succeeds: `cd frontend && pnpm run build`

#### Visual Verification (Manual Testing):
- [ ] Benefits cards display in grid (4 columns on desktop)
- [ ] Icons render correctly with proper colors
- [ ] Instructor card shows avatar and info
- [ ] Course details display with icons
- [ ] Learning outcomes have checkmark icons
- [ ] Testimonials display in 3-column grid
- [ ] Star ratings render correctly
- [ ] All sections animate on scroll
- [ ] Responsive: sections stack on mobile
- [ ] Responsive: 2 columns on tablet for benefits

---

## Phase 4: CTA Section & Enrollment Form

### Overview
Create the final call-to-action section on the landing page and implement the enrollment page with a beautiful form including Google social login UI.

### Changes Required:

#### 1. Create CTA Section Component
**File**: `frontend/components/landing/CtaSection.tsx`

**Changes**: Create compelling final CTA before footer

```tsx
'use client';

import { Button } from '@/components/ui/button';
import { motion } from 'motion/react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export function CtaSection() {
  return (
    <section className="py-20 lg:py-32 bg-gradient-to-br from-primary/10 via-accent/10 to-secondary/10">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mx-auto text-center"
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
            Are You Ready To Start Our Course Now?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Join thousands of students who are already learning and growing their skills.
            Start your journey today with lifetime access to all course materials.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <Link href="/enroll?courseid=course-001">
                Get Started <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline">
              Contact Us
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
```

#### 2. Create Google Sign In Button Component
**File**: `frontend/components/enrollment/GoogleSignInButton.tsx`

**Changes**: Create styled Google OAuth button (UI only)

```tsx
'use client';

import { Button } from '@/components/ui/button';

export function GoogleSignInButton() {
  const handleGoogleSignIn = () => {
    // Placeholder - will be implemented with actual OAuth later
    console.log('Google sign in clicked');
  };

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      onClick={handleGoogleSignIn}
    >
      <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </svg>
      Continue with Google
    </Button>
  );
}
```

#### 3. Create Enrollment Form Component
**File**: `frontend/components/enrollment/EnrollmentForm.tsx`

**Changes**: Create beautiful enrollment form with email signup

```tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { GoogleSignInButton } from './GoogleSignInButton';
import { motion } from 'motion/react';
import { Mail, User, Lock } from 'lucide-react';

export function EnrollmentForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Placeholder - will be implemented later
    console.log('Form submitted:', formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="max-w-md mx-auto p-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold mb-2">Create Your Account</h2>
          <p className="text-sm text-muted-foreground">
            Start your learning journey today
          </p>
        </div>

        <GoogleSignInButton />

        <div className="relative my-6">
          <Separator />
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
            OR
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="John Doe"
                value={formData.name}
                onChange={handleChange}
                className="pl-10"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="john@example.com"
                value={formData.email}
                onChange={handleChange}
                className="pl-10"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                className="pl-10"
                required
              />
            </div>
          </div>

          <Button type="submit" className="w-full" size="lg">
            Create Account
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground mt-6">
          By signing up, you agree to our Terms of Service and Privacy Policy
        </p>
      </Card>
    </motion.div>
  );
}
```

#### 4. Update Landing Page with CTA Section
**File**: `frontend/app/page.tsx`

**Changes**: Add CTA section before footer

```tsx
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { HeroSection } from '@/components/landing/HeroSection';
import { TrustIndicators } from '@/components/landing/TrustIndicators';
import { BenefitsSection } from '@/components/landing/BenefitsSection';
import { CourseMetadataSection } from '@/components/landing/CourseMetadataSection';
import { TestimonialsSection } from '@/components/landing/TestimonialsSection';
import { CtaSection } from '@/components/landing/CtaSection';
import { mockCourse } from '@/lib/mock-data/course';

export default function HomePage() {
  return (
    <>
      <Header />
      <main className="min-h-screen pt-16">
        <HeroSection course={mockCourse} />
        <TrustIndicators />
        <BenefitsSection />
        <CourseMetadataSection course={mockCourse} />
        <TestimonialsSection course={mockCourse} />
        <CtaSection />
      </main>
      <Footer />
    </>
  );
}
```

#### 5. Update Enrollment Page with Form
**File**: `frontend/app/enroll/page.tsx`

**Changes**: Replace placeholder with enrollment form

```tsx
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { EnrollmentForm } from '@/components/enrollment/EnrollmentForm';

export default function EnrollPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen pt-20 py-12 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              Enroll in the Course
            </h1>
            <p className="text-lg text-muted-foreground">
              Start your learning journey today with lifetime access
            </p>
          </div>

          <EnrollmentForm />
        </div>
      </main>
      <Footer />
    </>
  );
}
```

#### 6. Add Component Tests
**File**: `frontend/components/landing/__tests__/CtaSection.test.tsx`
**File**: `frontend/components/enrollment/__tests__/EnrollmentForm.test.tsx`
**File**: `frontend/components/enrollment/__tests__/GoogleSignInButton.test.tsx`

**Changes**: Add tests for CTA and enrollment components

```tsx
// Example test
import { render, screen } from '@testing-library/react';
import { EnrollmentForm } from '../EnrollmentForm';

describe('EnrollmentForm', () => {
  it('renders form fields', () => {
    render(<EnrollmentForm />);
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('renders Google sign in button', () => {
    render(<EnrollmentForm />);
    expect(screen.getByText(/continue with google/i)).toBeInTheDocument();
  });
});
```

### Success Criteria:

#### Continuous Validation (During Implementation):
- [ ] Run tests after form changes - all pass
- [ ] Monitor dev logs - no errors
- [ ] Test form inputs work correctly
- [ ] Verify Google button renders

#### Phase Completion Validation:
- [ ] All tests pass: `cd frontend && pnpm test`
- [ ] Type checking passes: `cd frontend && pnpm run typecheck`
- [ ] Linting passes: `cd frontend && pnpm run lint`
- [ ] Test coverage meets 90%: `cd frontend && pnpm run test:coverage`
- [ ] Build succeeds: `cd frontend && pnpm run build`

#### Visual Verification (Manual Testing):
- [ ] CTA section has gradient background
- [ ] CTA buttons are prominent
- [ ] Enrollment form is centered and card-styled
- [ ] Google button displays with proper logo
- [ ] Form fields have icons on left side
- [ ] Separator with "OR" text displays correctly
- [ ] Form is responsive on mobile
- [ ] Input focus states work correctly
- [ ] Form submission logs to console (placeholder)

---

## Phase 5: Polish, Testing & Preview Deployment

### Overview
Final polish with animations, responsive refinements, comprehensive testing, and deployment to preview environment with E2E tests.

### Changes Required:

#### 1. Add Page Metadata
**File**: `frontend/app/page.tsx`

**Changes**: Add proper metadata for SEO

```tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Master Modern Web Development - LearnerMax',
  description: 'Build production-ready applications with the latest technologies. Join thousands of students learning at LearnerMax.',
};
```

**File**: `frontend/app/enroll/page.tsx`

**Changes**: Add enrollment page metadata

```tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Enroll in Course - LearnerMax',
  description: 'Start your learning journey today with lifetime access to all course materials.',
};
```

#### 2. Add Scroll-to-Top Animation
**File**: `frontend/components/ui/ScrollToTop.tsx`

**Changes**: Create scroll-to-top button with animation

```tsx
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      setIsVisible(window.scrollY > 500);
    };

    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-8 right-8 z-40"
        >
          <Button
            onClick={scrollToTop}
            size="icon"
            className="rounded-full shadow-lg"
            aria-label="Scroll to top"
          >
            <ArrowUp className="w-5 h-5" />
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

#### 3. Add ScrollToTop to Landing Page
**File**: `frontend/app/page.tsx`

**Changes**: Include ScrollToTop component

```tsx
import { ScrollToTop } from '@/components/ui/ScrollToTop';

export default function HomePage() {
  return (
    <>
      <Header />
      <main className="min-h-screen pt-16">
        {/* ... all sections ... */}
      </main>
      <Footer />
      <ScrollToTop />
    </>
  );
}
```

#### 4. Create E2E Tests
**File**: `e2e/tests/landing-page.spec.ts`

**Changes**: Create comprehensive E2E tests for landing page

```ts
import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('displays hero section with course title', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /master modern web development/i })).toBeVisible();
  });

  test('navigates to enrollment page when clicking enroll CTA', async ({ page }) => {
    await page.getByRole('link', { name: /enroll now/i }).first().click();
    await expect(page).toHaveURL(/\/enroll\?courseid=course-001/);
  });

  test('displays all major sections', async ({ page }) => {
    await expect(page.getByText(/why choose us/i)).toBeVisible();
    await expect(page.getByText(/meet your instructor/i)).toBeVisible();
    await expect(page.getByText(/what our students saying/i)).toBeVisible();
  });

  test('is responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.getByRole('heading', { name: /master modern web development/i })).toBeVisible();
  });

  test('displays trust indicators', async ({ page }) => {
    await expect(page.getByText(/duolingo/i)).toBeVisible();
    await expect(page.getByText(/google/i)).toBeVisible();
  });
});
```

**File**: `e2e/tests/enrollment-page.spec.ts`

**Changes**: Create E2E tests for enrollment page

```ts
import { test, expect } from '@playwright/test';

test.describe('Enrollment Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/enroll?courseid=course-001');
  });

  test('displays enrollment form', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /create your account/i })).toBeVisible();
  });

  test('shows Google sign in button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /continue with google/i })).toBeVisible();
  });

  test('displays email signup form fields', async ({ page }) => {
    await expect(page.getByLabelText(/full name/i)).toBeVisible();
    await expect(page.getByLabelText(/email address/i)).toBeVisible();
    await expect(page.getByLabelText(/password/i)).toBeVisible();
  });

  test('form fields accept input', async ({ page }) => {
    await page.getByLabelText(/full name/i).fill('John Doe');
    await page.getByLabelText(/email address/i).fill('john@example.com');
    await page.getByLabelText(/password/i).fill('password123');

    await expect(page.getByLabelText(/full name/i)).toHaveValue('John Doe');
    await expect(page.getByLabelText(/email address/i)).toHaveValue('john@example.com');
  });
});
```

#### 5. Add Integration Test Helper
**File**: `frontend/lib/__tests__/test-utils.tsx`

**Changes**: Create testing utilities for components

```tsx
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';

export function renderWithProviders(ui: ReactElement) {
  return render(ui);
}

export * from '@testing-library/react';
```

### Success Criteria:

#### Continuous Validation (During Implementation):
- [ ] Monitor dev logs while testing - no errors
- [ ] Test scroll-to-top button appears after scroll
- [ ] Verify metadata in browser tab
- [ ] Run E2E tests locally - all pass

#### Phase Completion Validation:
- [ ] All unit tests pass: `cd frontend && pnpm test`
- [ ] Type checking passes: `cd frontend && pnpm run typecheck`
- [ ] Linting passes: `cd frontend && pnpm run lint`
- [ ] Test coverage meets 90%: `cd frontend && pnpm run test:coverage`
- [ ] Build succeeds: `cd frontend && pnpm run build`
- [ ] Local E2E tests pass: `cd e2e && pnpm test`

#### Visual Verification (Local):
- [ ] Scroll-to-top button appears and works
- [ ] All animations are smooth (60fps)
- [ ] No layout shift during page load
- [ ] Images load properly
- [ ] Hover states work on all interactive elements
- [ ] Mobile navigation works correctly
- [ ] Form validation provides feedback

#### Preview Deployment Validation:
- [ ] Deploy frontend: `./scripts/deploy-preview-frontend.sh`
- [ ] Start frontend logs: `./scripts/start-vercel-logs.sh`
- [ ] Verify no errors in `scripts/.vercel-logs.log`
- [ ] Test preview URL in browser - all pages load
- [ ] Run E2E tests against preview: `cd e2e && pnpm test`
- [ ] Check Core Web Vitals in browser DevTools
- [ ] Test on real mobile device
- [ ] Verify responsive behavior on tablet
- [ ] Stop log monitoring: `./scripts/stop-vercel-logs.sh`

---

## Testing Strategy

### Unit Tests:
- All components have corresponding test files in `__tests__` directories
- Test component rendering with required props
- Test event handlers and user interactions
- Test responsive class application
- Test accessibility attributes
- 90% coverage requirement for all code

### Visual Testing (Manual - Local Development):
- Use browser DevTools to test responsive breakpoints
- Verify animations are smooth and performant
- Check color contrast with accessibility tools
- Test keyboard navigation flow
- Verify focus states on all interactive elements

### E2E Tests (Automated - Preview Environment):
- Complete user journey from landing to enrollment
- Form interactions and validation
- Navigation between pages
- Mobile responsive behavior
- Cross-browser compatibility

### Manual Testing Steps (Local Dev):
1. Start dev server: `cd frontend && pnpm run dev`
2. Open `http://localhost:3000` in browser
3. Test scroll behavior and animations
4. Resize browser to test responsive breakpoints (375px, 768px, 1024px, 1920px)
5. Navigate using keyboard only (Tab, Enter, Space)
6. Test with screen reader (VoiceOver/NVDA)
7. Check browser console for errors
8. Test enrollment form inputs and validation

### Manual Testing Steps (Preview Environment):
1. Deploy to preview: `./scripts/deploy-preview-frontend.sh`
2. Start log monitoring: `./scripts/start-vercel-logs.sh`
3. Open preview URL in multiple browsers
4. Test on real mobile devices (iOS Safari, Chrome Mobile)
5. Verify all links and navigation work
6. Test form submission behavior
7. Check logs: `cat scripts/.vercel-logs.log`
8. Run E2E tests: `cd e2e && pnpm test`
9. Stop logs: `./scripts/stop-vercel-logs.sh`

---

## Performance Considerations

- **Bundle Size**: Monitor with `pnpm run build` output - keep total JS under 200KB
- **Loading Strategy**:
  - Use Next.js Image component for optimized images
  - Lazy load below-the-fold content
  - Code-split by route automatically via Next.js
- **Animation Performance**:
  - Use CSS transforms and opacity for animations (GPU accelerated)
  - Framer Motion uses will-change automatically
  - Keep animations under 300ms for responsiveness
- **Core Web Vitals Targets**:
  - LCP (Largest Contentful Paint): < 2.5s
  - FID (First Input Delay): < 100ms
  - CLS (Cumulative Layout Shift): < 0.1

---

## Accessibility Implementation

- **Semantic HTML**:
  - Use `<header>`, `<main>`, `<section>`, `<footer>` landmarks
  - Proper heading hierarchy (single h1, then h2, h3)
  - Use `<nav>` for navigation
- **ARIA Labels**:
  - Add `aria-label` to icon-only buttons
  - Use `aria-labelledby` for form sections
  - Add `role="region"` with labels for major sections
- **Keyboard Navigation**:
  - All interactive elements reachable via Tab
  - Focus visible on all focusable elements
  - Enter/Space trigger button actions
- **Screen Readers**:
  - Alt text for all images
  - Form labels properly associated
  - Status messages announced
- **Color Contrast**:
  - All text meets WCAG AA (4.5:1 for normal text, 3:1 for large)
  - Verify with browser DevTools color contrast checker
  - Test in both light and dark modes

---

## Responsive Design Strategy

### Breakpoints:
- **Mobile**: 320px - 767px
  - Single column layout
  - Stacked sections
  - Full-width buttons
  - Collapsible navigation
- **Tablet**: 768px - 1023px
  - 2-column grids for benefits and testimonials
  - Adjusted typography scale
  - Side-by-side CTA buttons
- **Desktop**: 1024px+
  - Full multi-column layouts
  - Larger spacing and typography
  - Optimal line length for readability

### Typography Scale:
- **Mobile**:
  - Base: 16px
  - H1: 2rem (32px)
  - H2: 1.75rem (28px)
  - H3: 1.5rem (24px)
- **Tablet**:
  - Base: 16px
  - H1: 2.5rem (40px)
  - H2: 2rem (32px)
  - H3: 1.75rem (28px)
- **Desktop**:
  - Base: 18px
  - H1: 3.5rem (56px)
  - H2: 2.5rem (40px)
  - H3: 2rem (32px)

### Touch Targets:
- All interactive elements minimum 44x44px on mobile
- Increased spacing between clickable elements
- Larger form inputs for mobile (48px height)

---

## Browser Support

- **Modern Browsers**: Chrome 88+, Firefox 85+, Safari 14+, Edge 88+
- **Mobile Browsers**: iOS Safari 14+, Chrome Mobile 88+
- **Accessibility Tools**: JAWS, NVDA, VoiceOver compatibility
- **JavaScript**: ES2020+ features (supported by target browsers)
- **CSS**: Modern features (Grid, Flexbox, CSS Variables, oklch colors)

---

## References

- Design system: `frontend/app/globals.css:6-165`
- Mock data structure: `frontend/lib/mock-data/course.ts`
- shadcn components: `@shadcn` registry (button, card, badge, avatar, input, label, form, separator)
- Framer Motion docs: https://motion.dev
- Tailwind CSS v4: https://tailwindcss.com
- Next.js App Router: https://nextjs.org/docs
- Design inspiration: `specs/student_enrollment/landingpage.png`
