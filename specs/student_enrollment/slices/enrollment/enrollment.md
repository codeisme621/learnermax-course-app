# Enrollment into course

## Background:
At this point the user has signed up for our service.  However, they have not yet enrolled into the course.  They can login and get to their dashboard, but as of now, there is no feature to enroll in any courses.  At the end of this story, we should allow the students to enroll in courses from the dashboard page

## User Story
As a user who just signed up and is logged into the dashboard, I want a clear way to see the availble courses, so that I can choose what I want to learn and enroll.  I would expect to see two list in this dashboard: 1) My currently enrolled courses.  If I have not enrolled then this section should not be displayed.  2) Availble courses.  There should be a primary course that is indicated by using fancier UI.  Along with any other secondary courses.  Also, I would expect only to see these list in my dashboard.  This means: Progress, Certificates, Session Info (Development Only), and seciton showing userId, email, and signout should all be removed.  We should have a left side-bar that contains Progress and Certificates as secondary items that can be traveled too. For now, we can keep these cert and progress pages minimal.  There should be no top nav bar.  You can greet the user in the dashboard by there FULL NAME.  not the username as what seems to be there now.

### New Student - No enrollments
When I click on the main course, I should be take to its detail page /learn/'course name' .  There I should see the clear benfits and a button that should say Enroll.  When I click on enroll, it should call the students API put call to update the enrolled courses.  /learn/'course name' is not a protected route.  It should be public and requires SEO thinking.

### Existing Student - Has enrollments
When I click on an enrolled course I have, I should be taken diretly to the /course/'course id' page. This is a protected route.  No SEO considerations needed.  I should be able to access this page and see a placeholder video for now.

## Tech Details
Use Shadcn for all the UI related work
Doing multiple PUT's should not cause duplicates.  Just overwrite if you receive the same ID for an existing course.


## Deliverables
An updated dashboard page
A /learn/'course name' page that is public and explains the value of the course ultimately trying to get them to enroll
A proteted /course/'course id' page that will host the course and should only be availble to enrolled students.