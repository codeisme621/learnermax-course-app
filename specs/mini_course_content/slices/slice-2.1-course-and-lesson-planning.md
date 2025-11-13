# Slice 2.1: Course & Lesson Planning

**Parent Mainspec:** `specs/mini_course_content/mainspec.md`
**Status:** In Progress - Content Definition
**Depends On:** None (first slice)

## Objective
Define the complete content structure for the mini course: course metadata, 3 lesson titles, descriptions, learning objectives, and content outlines. This slice captures all the planning decisions before creating database records.

## Course Metadata

### Basic Information
```typescript
{
  courseId: "spec-driven-dev-mini",
  name: "Spec-Driven Development with Context Engineering",
  instructor: "Rico Romero",
  pricingModel: "free",
  totalLessons: 3,
  estimatedDuration: "30-40 minutes"
}
```

### Course Description
**Short description** (for dashboard card):
```
Learn how to build better software with AI collaboration by mastering spec writing and context engineering techniques.
```

### Full Course Description (for course page)
```
Master the art of spec-driven development and unlock the full potential of AI coding agents. This free mini course teaches you practical techniques for writing clear, actionable specifications that AI understands and context engineering principles that dramatically improve AI-generated code quality.

Perfect for developers who want to work more effectively with tools like Claude Code, GitHub Copilot, and other AI coding assistants.
```

### Learning Objectives
What students will be able to do after completing this course:

1. Understand the difference between vibe coding and spec-driven development and why specs produce better results
2. Explain the evolution from prompt engineering to context engineering and why it matters for long-running agents
3. Apply context engineering principles when writing specifications
4. Recognize how to build a flywheel effect that allows AI to write 99% of code while maintaining quality
5. Identify the frameworks and methodologies for implementing spec-driven development

## Lesson Structure (3 Lessons)

### Lesson 1: Vibe Coding vs. Spec-Driven Development ✓
**Duration:** 15 minutes

**Objective:** Understand the fundamental difference between vibe coding and spec-driven development, why spec-driven development produces better results, and how it connects to context engineering.

**Description:** Discover the difference between vibe coding and spec-driven development, and why serious developers are adopting specs to build better software with AI collaboration.

---

### Lesson 2: Prompt Engineering vs. Context Engineering ✓
**Duration:** 15 minutes

**Objective:** Understand the evolution from prompt engineering to context engineering, what context engineering is, and why it matters in the era of long-running agentic coding.

**Description:** Learn the critical difference between prompt engineering and context engineering, and why context engineering is essential for working with modern AI coding agents.

---

### Lesson 3: Spec-Driven Development with Context Engineering ✓
**Duration:** 15 minutes

**Objective:** Learn how to write specs with context engineering principles, understand how AI can write 99% of your code, and discover how to build a flywheel effect that delivers products faster with better quality.

**Description:** Master the practical application of spec-driven development with context engineering to achieve the ultimate goal: having AI write 99% of your code while maintaining high quality.

**Premium course teaser:** "You now understand the fundamentals of spec-driven development with context engineering. Ready to dive deeper? Our premium course covers advanced techniques, real-world case studies, and hands-on projects to master this methodology. Join the early access list to be notified when it launches."

---

## Course Thumbnail Image

**Image URL:** _To be provided or created_

**Specifications:**
- Aspect ratio: 16:9
- Recommended size: 1280x720px
- Format: JPEG or PNG
- Content: Should include course title and visual related to spec writing or AI collaboration

## Content Guidelines

### Lesson Descriptions
Each lesson description should:
- Be 1-2 sentences
- Explain what the student will learn (learning outcome)
- Build on previous lessons
- Use active, engaging language

### Video Content Requirements
Since videos are already recorded:
- Extract actual duration from video files (will be populated in Slice 2.4)
- Ensure lesson titles match video content
- Verify video quality (1080p or 720p, clear audio)

## Forward-Looking Requirements

### For Slice 2.2 (Course Data Creation)
Once lessons are defined, we'll need:
- Final `learningObjectives` array based on lesson content
- Course `description` (finalized)
- Course `imageUrl` (uploaded to S3 or CDN)

### For Slice 2.3 (Lesson Data Creation)
Once lessons are defined, we'll need:
- 3 lesson titles
- 3 lesson descriptions (1-2 sentences each)
- Lesson order (1, 2, 3)
- Video file names matching order

### For Slice 2.4 (Video Upload)
- Video files named: `lesson-1.mp4`, `lesson-2.mp4`, `lesson-3.mp4`
- Actual video durations (extracted from files)
- S3 upload path: `courses/spec-driven-dev-mini/lesson-{order}.mp4`

## Iterative Content Definition

**Process:**
1. Define Lesson 1 title, objective, outline
2. Define Lesson 2 title, objective, outline
3. Define Lesson 3 title, objective, outline
4. Finalize course learning objectives based on lessons
5. Write lesson descriptions
6. Verify content flow and progression

**Current Status:** ✓ Content definition complete - All 3 lessons defined

---

## Lesson 1: Vibe Coding vs. Spec-Driven Development ✓

**Title:** Vibe Coding vs. Spec-Driven Development

**Duration:** 15 minutes

**Objective:**
Understand the fundamental difference between vibe coding and spec-driven development, why spec-driven development produces better results, and how it connects to context engineering.

**Content outline:**
- History of vibe coding and what problems were not addressed
- Vibe coding vs. spec-driven development comparison
- Why spec-driven development is for serious programmers
- Different frameworks for spec-driven development
- Connection between spec-driven development and context engineering

**Description (for UI):**
Discover the difference between vibe coding and spec-driven development, and why serious developers are adopting specs to build better software with AI collaboration.

**Key takeaways:**
- Vibe coding's limitations when working with AI agents
- Core principles of spec-driven development
- The role of context engineering in effective spec writing

---

## Lesson 2: Prompt Engineering vs. Context Engineering ✓

**Title:** Prompt Engineering vs. Context Engineering

**Duration:** 15 minutes

**Objective:**
Understand the evolution from prompt engineering to context engineering, what context engineering is, and why it matters in the era of long-running agentic coding.

**Content outline:**
- What is context engineering
- History of context engineering
- Prompt engineering vs. context engineering comparison
- Why context engineering matters in the world of long-running agents
- What problem space context engineering solves that prompt engineering did not address

**Description (for UI):**
Learn the critical difference between prompt engineering and context engineering, and why context engineering is essential for working with modern AI coding agents.

**Key takeaways:**
- The evolution from prompt engineering to context engineering
- Why long-running agents require a different approach
- Problem spaces that context engineering uniquely addresses

**Connection to Lesson 1:**
Builds on the spec-driven development foundation by explaining how context engineering enables effective spec writing for AI agents.

---

## Lesson 3: Spec-Driven Development with Context Engineering ✓

**Title:** Spec-Driven Development with Context Engineering

**Duration:** 15 minutes

**Objective:**
Learn how to write specs with context engineering principles, understand how AI can write 99% of your code, and discover how to build a flywheel effect that delivers products faster with better quality.

**Content outline:**
- What writing specs with context engineering in mind means
- Why 99% of your code truly can be written by AI
- The flywheel effect in spec-driven development and context engineering
- Results you should expect to achieve with this methodology

**Description (for UI):**
Master the practical application of spec-driven development with context engineering to achieve the ultimate goal: having AI write 99% of your code while maintaining high quality.

**Key takeaways:**
- Practical techniques for writing context-engineered specs
- How to shift from writing code to writing specifications
- Building a flywheel effect that compounds productivity gains over time

**Connection to Previous Lessons:**
Completes the learning arc by showing practical application of concepts from Lessons 1 and 2. Students now understand the "why" (Lesson 1), the "what" (Lesson 2), and the "how" (Lesson 3).

**Premium Course Teaser:**
This lesson ends with: "You now understand the fundamentals of spec-driven development with context engineering. Ready to dive deeper? Our premium course covers advanced techniques, real-world case studies, and hands-on projects to master this methodology. Join the early access list to be notified when it launches."

---

## Deliverables

By the end of this slice:

- [x] All 3 lesson titles finalized
- [x] All 3 lesson objectives defined
- [x] All 3 lesson content outlines complete
- [x] Course learning objectives finalized
- [x] Lesson descriptions written
- [x] Course description finalized
- [x] Content flow verified (lessons build on each other)
- [x] Premium course teaser content for Lesson 3

## Deviations from Plan
_(To be filled as we define content)_

This slice is intentionally flexible to capture our iterative content planning discussions.
