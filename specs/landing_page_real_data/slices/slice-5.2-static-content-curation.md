# Slice 5.2: Static Content Curation

**Parent Mainspec:** `specs/landing_page_real_data/mainspec.md`
**Status:** Not Started
**Depends On:** Slice 5.1 (Data Transformation Layer)

## Objective
Define and organize static content that complements the course data fetched from the backend. This includes instructor biography, curated testimonials, course stats, placeholder images for development, and other marketing copy that doesn't belong in the database but is essential for the landing page.

## What We're Doing

### 1. Create Static Content Module

**Create:** `frontend/lib/static-content.ts`

Centralize all static landing page content:

```typescript
/**
 * Static content for landing page
 * This content is curated and doesn't come from the database
 */

export interface InstructorProfile {
  name: string;
  title: string;
  background: string;
  imageUrl: string;
}

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  content: string;
  imageUrl: string;
  rating: number;
}

export interface CourseStats {
  students: string;
  rating: string;
  certificates: string;
}

/**
 * Instructor profile for Rico Romero
 */
export function getInstructorProfile(): InstructorProfile {
  return {
    name: 'Rico Romero',
    title: 'Software Engineer & Educator',
    background: 'Experienced software engineer with a passion for teaching developers how to work effectively with AI coding tools. Rico specializes in spec-driven development and context engineering, helping teams build better software through clear specifications and strategic AI collaboration. With years of hands-on experience in modern web development, he brings practical insights and real-world examples to every lesson.',
    imageUrl: '/images/instructor-rico.jpg'
  };
}

/**
 * Curated testimonials for the spec-driven development course
 * Note: These are placeholder testimonials for MVP launch
 * Future: Replace with real student testimonials from database
 */
export function getStaticTestimonials(): Testimonial[] {
  return [
    {
      id: 'testimonial-1',
      name: 'Michael Chen',
      role: 'Software Developer',
      content: 'This course completely changed how I work with AI coding tools. The spec-driven approach makes everything so much clearer and more efficient. I can now build features faster and with fewer bugs.',
      imageUrl: '/images/testimonials/michael-chen.jpg',
      rating: 5
    },
    {
      id: 'testimonial-2',
      name: 'Sarah Martinez',
      role: 'Full-Stack Engineer',
      content: 'Rico\'s teaching style is exceptional. The examples are practical and immediately applicable to my daily work. Context engineering has become an essential part of my workflow.',
      imageUrl: '/images/testimonials/sarah-martinez.jpg',
      rating: 5
    },
    {
      id: 'testimonial-3',
      name: 'David Kim',
      role: 'Frontend Developer',
      content: 'Best investment in my professional development this year. The course is concise, focused, and packed with actionable insights. I\'ve already recommended it to my team.',
      imageUrl: '/images/testimonials/david-kim.jpg',
      rating: 5
    },
    {
      id: 'testimonial-4',
      name: 'Emily Rodriguez',
      role: 'Product Engineer',
      content: 'As someone transitioning to AI-assisted development, this course gave me the foundation I needed. Now I feel confident writing specs that get great results from AI tools.',
      imageUrl: '/images/testimonials/emily-rodriguez.jpg',
      rating: 5
    }
  ];
}

/**
 * Course statistics for landing page
 * Note: These are static values for MVP
 * Future: Calculate from actual enrollment/completion data
 */
export function getCourseStats(): CourseStats {
  return {
    students: '100+',
    rating: '4.9/5',
    certificates: '80+'
  };
}

/**
 * Additional helper to get instructor bio paragraph only
 * Used by transformation function in Slice 5.1
 */
export function getInstructorBio(): string {
  return getInstructorProfile().background;
}
```

### 2. Update Transformation Function

**Update:** `frontend/lib/api/courses.ts`

Import static content from the new module:

```typescript
import type { Course } from '@/types/course';
import type { CourseData } from '@/lib/mock-data/course';
import {
  getInstructorProfile,
  getStaticTestimonials,
  getCourseStats
} from '@/lib/static-content';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export async function fetchCourse(courseId: string): Promise<Course> {
  // ... existing implementation
}

export async function getCourseForLanding(courseId: string): Promise<CourseData> {
  const course = await fetchCourse(courseId);

  // Calculate duration from curriculum
  const totalLessons = course.curriculum.reduce(
    (sum, module) => sum + module.videos.length,
    0
  );
  const totalMinutes = course.curriculum.reduce(
    (sum, module) => sum + module.videos.reduce(
      (modSum, video) => modSum + video.lengthInMins,
      0
    ),
    0
  );
  const duration = `${totalLessons} lesson${totalLessons > 1 ? 's' : ''} (~${totalMinutes} minutes)`;

  // Extract lesson titles from curriculum
  const topics = course.curriculum.flatMap(module =>
    module.videos.map(video => video.title)
  );

  // Get static content
  const instructorProfile = getInstructorProfile();
  const testimonials = getStaticTestimonials();
  const stats = getCourseStats();

  // Transform to landing page format
  return {
    id: course.courseId,
    title: course.name,
    subtitle: extractSubtitle(course.description),
    description: course.description,
    duration,
    level: 'Beginner',
    category: 'Software Development',
    instructor: {
      name: course.instructor,
      title: instructorProfile.title,
      background: instructorProfile.background,
      imageUrl: instructorProfile.imageUrl
    },
    outcomes: course.learningObjectives,
    curriculum: [
      {
        module: 'Course Content',
        topics
      }
    ],
    testimonials,
    stats
  };
}

function extractSubtitle(description: string): string {
  const firstSentence = description.split('.')[0];
  if (firstSentence.length > 100) {
    return firstSentence.substring(0, 100) + '...';
  }
  return firstSentence;
}
```

### 3. Create Placeholder Image Generator

**Create:** `frontend/scripts/generate-placeholder-images.sh`

Script to generate placeholder images for development using ImageMagick:

```bash
#!/bin/bash

# Script to generate placeholder images for development
# Requires ImageMagick: brew install imagemagick (macOS) or apt-get install imagemagick (Linux)

set -e  # Exit on error

IMAGES_DIR="public/images"
TESTIMONIALS_DIR="$IMAGES_DIR/testimonials"

echo "🖼️  Generating placeholder images for development..."

# Create directories
mkdir -p "$TESTIMONIALS_DIR"

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo "❌ Error: ImageMagick is not installed"
    echo "📦 Install with:"
    echo "   macOS: brew install imagemagick"
    echo "   Ubuntu/Debian: sudo apt-get install imagemagick"
    echo "   Windows: Download from https://imagemagick.org/script/download.php"
    exit 1
fi

# Generate instructor placeholder (400x400)
echo "Creating instructor placeholder..."
convert -size 400x400 \
  -background "#3B82F6" \
  -fill white \
  -gravity center \
  -font Arial \
  -pointsize 32 \
  label:"Rico Romero" \
  -pointsize 18 \
  -annotate +0+60 "Instructor" \
  "$IMAGES_DIR/instructor-rico.jpg"

echo "✓ Created $IMAGES_DIR/instructor-rico.jpg"

# Generate testimonial placeholders (200x200)
declare -a names=("Michael Chen" "Sarah Martinez" "David Kim" "Emily Rodriguez")
declare -a files=("michael-chen" "sarah-martinez" "david-kim" "emily-rodriguez")
declare -a colors=("#EF4444" "#10B981" "#F59E0B" "#EC4899")

for i in "${!names[@]}"; do
  echo "Creating testimonial placeholder for ${names[$i]}..."

  # Extract initials
  initials=$(echo "${names[$i]}" | awk '{print substr($1,1,1) substr($2,1,1)}')

  convert -size 200x200 \
    -background "${colors[$i]}" \
    -fill white \
    -gravity center \
    -font Arial \
    -pointsize 48 \
    label:"$initials" \
    "$TESTIMONIALS_DIR/${files[$i]}.jpg"

  echo "✓ Created $TESTIMONIALS_DIR/${files[$i]}.jpg"
done

echo ""
echo "✅ All placeholder images generated successfully!"
echo "📁 Images location: $IMAGES_DIR"
echo ""
echo "Note: These are placeholders for development only."
echo "Replace with actual photos before production deployment."
```

Make script executable:
```bash
chmod +x frontend/scripts/generate-placeholder-images.sh
```

**Add to .gitignore** (images are generated, not committed):

**Update:** `frontend/.gitignore`

```gitignore
# ... existing entries

# Generated placeholder images (run scripts/generate-placeholder-images.sh)
/public/images/instructor-rico.jpg
/public/images/testimonials/*.jpg
```

### 4. Create Images Directory Structure

**Create:** `frontend/public/images/.gitkeep`

Ensure the images directory exists in git:

```
frontend/public/images/
├── .gitkeep              (empty file to track directory)
└── testimonials/
    └── .gitkeep          (empty file to track directory)
```

Commands:
```bash
mkdir -p frontend/public/images/testimonials
touch frontend/public/images/.gitkeep
touch frontend/public/images/testimonials/.gitkeep
```

### 5. Add README for Image Management

**Create:** `frontend/public/images/README.md`

```markdown
# Landing Page Images

This directory contains images for the landing page.

## For Development

Generate placeholder images using:

\`\`\`bash
cd frontend
./scripts/generate-placeholder-images.sh
\`\`\`

This requires ImageMagick to be installed:
- **macOS**: `brew install imagemagick`
- **Ubuntu/Debian**: `sudo apt-get install imagemagick`
- **Windows**: Download from https://imagemagick.org/script/download.php

## Image Specifications

### Instructor Photo
- **File**: `instructor-rico.jpg`
- **Size**: 400x400px
- **Format**: JPEG
- **Optimization**: < 100KB

### Testimonial Photos
- **Files**: `testimonials/*.jpg`
- **Size**: 200x200px
- **Format**: JPEG
- **Optimization**: < 50KB each

## For Production

Before deploying to production:

1. **Replace placeholder images** with actual photos
2. **Optimize images** using:
   ```bash
   # Install ImageOptim (macOS) or use online tools
   # Or use imagemagick:
   convert instructor-rico.jpg -quality 85 -resize 400x400 instructor-rico-optimized.jpg
   ```
3. **Verify all paths** in `lib/static-content.ts` match actual files
4. **Test loading** on slow connections

## Image Attribution

- Instructor photo: [Add source/attribution]
- Testimonial photos: [Add source/attribution or note if AI-generated]
- Placeholder images: Auto-generated using ImageMagick (development only)
```

### 6. Add Package.json Script

**Update:** `frontend/package.json`

Add convenience script to generate placeholders:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "jest",
    "generate:placeholders": "./scripts/generate-placeholder-images.sh"
  }
}
```

Now developers can run:
```bash
pnpm run generate:placeholders
```

## What We're NOT Doing
- No database storage for testimonials (static for MVP)
- No testimonial submission form
- No testimonial moderation workflow
- No A/B testing of testimonials
- No real-time stat calculations
- No instructor profile management UI
- No image upload/management system via UI
- No testimonial rotation logic
- No actual photo shoots (placeholders for development)

## Acceptance Criteria

### Static Content Module
- [ ] `frontend/lib/static-content.ts` created
- [ ] `getInstructorProfile()` returns complete profile
- [ ] `getStaticTestimonials()` returns 4 testimonials
- [ ] `getCourseStats()` returns stats object
- [ ] All functions have proper TypeScript types
- [ ] No hardcoded values in transformation function

### Instructor Profile
- [ ] Name: "Rico Romero"
- [ ] Title: "Software Engineer & Educator"
- [ ] Background paragraph: 2-3 sentences about experience
- [ ] ImageUrl points to `/images/instructor-rico.jpg`
- [ ] Biography is compelling and relevant to course

### Testimonials
- [ ] 4 testimonials defined
- [ ] Each has unique ID (testimonial-1 through testimonial-4)
- [ ] Each has name, role, content
- [ ] All ratings are 5 stars (for MVP)
- [ ] Content is specific to spec-driven development
- [ ] Content sounds authentic and varied

### Stats
- [ ] Students: "100+" (aspirational but realistic)
- [ ] Rating: "4.9/5"
- [ ] Certificates: "80+"
- [ ] Format matches existing mock data

### Placeholder Generator Script
- [ ] `scripts/generate-placeholder-images.sh` created
- [ ] Script is executable (`chmod +x`)
- [ ] Script checks for ImageMagick installation
- [ ] Script generates instructor image (400x400)
- [ ] Script generates 4 testimonial images (200x200)
- [ ] Images use appropriate colors and styling
- [ ] Script includes clear success/error messages

### Directory Structure
- [ ] `public/images/` directory exists
- [ ] `public/images/testimonials/` directory exists
- [ ] `.gitkeep` files added to track empty directories
- [ ] Generated images added to `.gitignore`
- [ ] `public/images/README.md` created

### Integration
- [ ] Transformation function imports from static-content module
- [ ] No placeholder TODOs remain in courses.ts
- [ ] All static content properly integrated
- [ ] `package.json` has `generate:placeholders` script
- [ ] Build succeeds with no TypeScript errors

## Testing Strategy

### Manual Testing

**Test 1: Generate placeholder images**

```bash
cd frontend

# Run the generator script
./scripts/generate-placeholder-images.sh

# Or via package.json
pnpm run generate:placeholders

# Verify images were created
ls -la public/images/instructor-rico.jpg
ls -la public/images/testimonials/*.jpg

# Check image sizes
file public/images/instructor-rico.jpg
file public/images/testimonials/*.jpg
```

Expected output:
```
🖼️  Generating placeholder images for development...
Creating instructor placeholder...
✓ Created public/images/instructor-rico.jpg
Creating testimonial placeholder for Michael Chen...
✓ Created public/images/testimonials/michael-chen.jpg
...
✅ All placeholder images generated successfully!
```

**Test 2: Verify static content returns correct data**

```typescript
// frontend/scripts/test-static-content.ts
import {
  getInstructorProfile,
  getStaticTestimonials,
  getCourseStats
} from '../lib/static-content';

console.log('Instructor Profile:');
console.log(JSON.stringify(getInstructorProfile(), null, 2));

console.log('\nTestimonials:');
console.log(JSON.stringify(getStaticTestimonials(), null, 2));

console.log('\nStats:');
console.log(JSON.stringify(getCourseStats(), null, 2));
```

Run:
```bash
cd frontend
npx tsx scripts/test-static-content.ts
```

**Test 3: Verify images load in browser**

```bash
cd frontend
pnpm run dev
```

Navigate to `http://localhost:3000` and:
- Open browser DevTools → Network tab
- Check for 404 errors on image requests
- Verify all images load correctly

**Test 4: Verify transformation includes static content**

```bash
cd frontend
npx tsx scripts/test-transformation.ts
```

Check that output includes:
- Instructor background (full paragraph)
- 4 testimonials with complete data
- Stats object with all fields
- All image URLs point to valid paths

### Content Quality Checklist

**Instructor bio should:**
- [ ] Be 2-3 sentences (not too long)
- [ ] Highlight relevant experience
- [ ] Mention spec-driven development and AI tools
- [ ] Sound professional but approachable
- [ ] Include credentials/experience markers

**Testimonials should:**
- [ ] Sound authentic and varied (different writing styles)
- [ ] Mention specific course benefits
- [ ] Include diverse roles (developer, engineer, etc.)
- [ ] Be concise (2-3 sentences each)
- [ ] Avoid generic praise ("great course", "highly recommend")
- [ ] Reference specific concepts (specs, AI tools, context engineering)

**Stats should:**
- [ ] Be realistic for a new course
- [ ] Use "+" suffix to indicate ongoing growth
- [ ] Match tone of existing mock data

**Placeholder images should:**
- [ ] Be correct dimensions (400x400 for instructor, 200x200 for testimonials)
- [ ] Use readable colors and text
- [ ] Display initials or names clearly
- [ ] Look professional enough for development

## Forward-Looking Requirements

### For User-Generated Testimonials

**When testimonials come from database:**

```typescript
// backend/src/features/testimonials/testimonial.service.ts
export async function getTopTestimonials(
  courseId: string,
  options: { limit: number; minRating: number }
): Promise<Testimonial[]> {
  // Query DynamoDB for approved testimonials
  // Filter by rating >= minRating
  // Sort by date or usefulness
  // Return top N
}

// frontend/lib/api/courses.ts
export async function getCourseForLanding(courseId: string): Promise<CourseData> {
  // ...
  const testimonials = await fetch(
    `${API_BASE_URL}/api/courses/${courseId}/testimonials?limit=4&minRating=4`
  ).then(r => r.json());
  // ...
}
```

### For Dynamic Stats Calculation

**When stats need to be real:**

```typescript
// backend/src/features/courses/course.service.ts
export async function getCourseStats(courseId: string) {
  const enrollmentCount = await getEnrollmentCount(courseId);
  const completionCount = await getCompletionCount(courseId);
  const avgRating = await getAverageRating(courseId);

  return {
    students: `${enrollmentCount}+`,
    rating: `${avgRating.toFixed(1)}/5`,
    certificates: `${completionCount}+`
  };
}
```

### For Actual Photos

**When ready to use real photos:**

1. Take or source actual photos
2. Optimize images:
   ```bash
   convert instructor-photo.jpg -quality 85 -resize 400x400 public/images/instructor-rico.jpg
   ```
3. Update paths in `static-content.ts` if needed
4. Remove from `.gitignore` to commit actual photos
5. Test loading on production

## Deviations from Plan
_(To be filled during implementation)_

Potential considerations:
- May use different placeholder colors for better visual distinction
- May shorten or lengthen instructor bio based on design feedback
- May add more or fewer testimonials based on component layout
- May adjust stats based on marketing feedback
- May use external image service instead of local files for production
- May add additional metadata to testimonials (date, company logo)
