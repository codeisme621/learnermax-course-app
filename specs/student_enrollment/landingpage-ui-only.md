# Feature - Landing Page UI Only

## Background:
This is a focused specification for implementing just the landing page and enroll page UI as part of the larger course application project. This course application will be "hackable", so it can be customized to any user needs.

## User Story:
As a student looking to enroll in the course, I want a clear explanation of what the course will cover, what outcomes I should expect, what other students have said about the course, meta data like course duration, teachers background and why they are qualified for teaching the course. This landing page should not only explain these key pieces of information, but also look and feel modern. I should instantly know its a professional course website that I can trust. After reading thru the info and I get convinced that this is the course for me, then I want to be able to enroll with minimal friction.  Clicking 'enroll now' should take me to the '/enroll?courseid=<courseid>' page (for now hardcode the id).  In the enroll page, it shouldnt do anything yet, but the form itself should look modern and use social login from google.

## System:
For now, static landing page and static enroll page, but beautiful design

**Note that in this feature we are not creating:**
- Actual authentication flows (sign up, sign in, reset password)
- Email system
- Course backend web page
- Database integration
- AWS infrastructure

**This feature focuses only on:**
- Landing page and enroll page UI design and layout
- Course information display
- Modern, professional look and feel
- Enroll webpage that has a beautiful form (isnt functional but should have social provider icon i.e. google and allows email sign up.)

## Tech Details
Implement this using **NextJs** hosted in **Vercel**. The UI components should be created with **shadcn** and **tailwind**. 

For now we can expect only one course, but should use static data to display course details on the landing page for now.

## Architecture:
Landing page -> Static Data (course info display)
Landing page -> Enroll Button -> Enrollment page with form (not functional)

## URL Structure
- `/` - root the landing page
- `/enroll?courseid=<courseId>`

## Deliverables
- A fully functional beautiful landing page with clear benefits of why to sign up
- Course information display (using a mock api that returns json)
- Professional, modern design that builds trust
- Responsive design that works on desktop and mobile
- Enrollment page (placeholder for future authentication integration)
- Course metadata display: duration, teacher background, qualifications
- Student testimonials section
- Clear course outcomes and curriculum overview

## UI / UX
You can take inspiration from @landingpage.png for the landing page.
Header and footer should not have any links except for social and homepage
Use framer motion for awesome effects
Dont change the global.css .  Our theme is already setup
Use beautiful icons when you can