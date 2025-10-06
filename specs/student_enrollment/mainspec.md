# Feature - Customer Sign up

## Background:
I'm starting an open source project that makes a course application.  This course application will be “hackable”, so it can be customized to any user needs. This online course application will be fully functional allowing students to sign up for the course, watch the online course videos, and much more.  Will start simple for now, but expand use cases as we go. 

## User Story:
As a student looking to sign up for the course, I want a clear explanation of what the course will cover, what outcomes I should expect, what other students have said about the course, meta data like course duration, teachers background and why they are qualified for teaching the course.  This landing page should not only explain these key pieces of information, but also look and feel modern.  I should instantly know its a professional course website that I can trust.  After reading thru the info and I get convinced that this is the course for me, then I want to be able to sign up with minimal friction.  What I expect is email only required or preferably use a social provider like google.  After I sign up I should be taken instantly to the course where I see the full curriculum and corresponding videos.  Since this is my first time entering the course, I should be taken to the first video where it reiterates what the course is about and the value it brings.  
Furthermore, I expect an email to be sent to me congratulating me on signing up for the course and giving me next steps i.e. the link to login to the course, etc.

## System:
The system at the end of this story should be able to authenticate the student.  I.e. sign up, sign in, reset password, etc.  all of the authentication flows 
The system should capture student details, course details, and meta data like timestamps etc.

**Note that in this user story we are not creating:**
- The full course backend web page.  After logging into the course for now should show place holder videos
- A course management ui.  For now, the course api writes should be handled locally

## Tech Details
Implement this using **NextJs** hosted in **Vercel**.  The UI components should be created with **shadcn** and **tailwind**.  Authentication is via **Cognito**.  NextJs app will use **NextAuth**, but NextAuth using Cognito as its Oauth provider.  Always use cognito even with Google signup.  Cognito will delegate to google (please look up documentation).  Save both student and course details in **dynamodb**.  The API should be done in **AWS API gateway**.  Protected by Cognito.  For the emails, use **AWS SES**, https://github.com/resend/react-email **react-email** for the template
Use **AWS SAM** and **AWS Cloudformation** for any infrastructure related tasks.  
For now we can expect only one course, but should use the course API from the landing page to fetch course details.

## Archecture:
Student -> Landing Page -> SignUp Button -> Cognito -> Cognitos Lambda Post Confirmation Handler -> SNS -> Fans out in pub sub manner to Email (Welcoming email), a Lambda (saves student data to dynamodb)

Landing page -> API gateway -> Lambda (course api) -> Dynamodb (Read only)

Local (curl commands) -> API gateway -> Lambda (course api) -> Dynamodb (write) 

## Url Structure
- `/` - root the landing page
- `/course/<course name>` 
- `/enroll?courseid=<courseId>`
## Deliverables
- A fully functional beautiful landing page with clear benefits of why to sign up
- An email system that is transactional, i.e when user signs up they get a welcome email
- A plain course backend webpage that is protected by cognito. Only place holder videos for now and some layout that resembles what a course backend webpage should look like.  This will not be a polished backend course webpage; later stories will impl this.
- Decoupled architecture that saves user Data to Dynamodb (cognito events)



