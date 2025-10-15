# Background
We would like to implement the frontend of single course free enrollment.  Currently, we have coded for the backend exposing enrollment API's.  In this story, we will work on the frontend to leverage the API previously built

## User story
As a user, when I visit the landing page (this is a single course freen enrollment thus just one course and it is marketed on the landing page) and like the course and want to enroll, I should be able to click the enroll button, sign up (either email or google), and be taken to the dashboard where I should see my enrolled course card I can click and lead me to the course.

## Tech details
When you enroll you do a Auth.js / Cognito signup if your not a current student of ours.  Since you must sign up first (email has a enroll page -> verification page - sign page whereas google has just enroll page straight to dashboard) you will have a few hops.  Only when the user has confirmed sign up, then we should enroll him into the course he wanted.  So, the tech challenge is to keep track of the courseId from the landing page he first clicked all the way to the dashboard where you then can call the enrollment API.  Similar, if you have a student account with us even they should probally follow the same pattern (i.e. wait until login takes them to dashboard before calling enroll api), just so we can stay consistent im thinking.  I'm thinking right when the user clicks on enroll button we store the courseId in session storage and we check this key on the dashboard each time and if there call the enroll api.
Hard code the courseId for now in the landing page.  When I click enroll, the courseId TEST-COURSE-001 should be the "value"
I do not like the way we put the courseId in the url.  Lets remove this logic

## What we are not doing
We are not building a full on course page.  Just a minium place holder course page with shells of where the video, etc might be.  

