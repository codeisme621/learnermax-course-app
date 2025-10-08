# Quiz Generator

## Background
We would like to be able to auto generate quiz questios based off the videos in our online course.  The questions should directly come from the video and no other source (dont make stuff up). It should have a min of 3 questions per video.  The format should be multiple choice. 

## User story
As a student watching this online course, I would love to test my learnings against a quiz page.  When going to page /quiz/'course Id' (this is a protected page and should only be availble to enrolled storudents) I should see a random selected questions up to 10 min of 1.  There I will take the quiz and if i get it right i get a success message if i get it wrong it highlights red and tells me the right answer.
Acutally, '/quiz' itself is a protected page and should only be availble to signed up users (has a valid JWT token).  This page should display all the quizes availble to the student (his enrolled courses that have quizes).  

## How to generate the Quiz
I would like you to use langraph (python) to take in the "transcript" of a video and give a structured output of the quiz.  A quiz has a list of questions.  A question has a list of choices.  1 choice is correct the others are wrong.  This structured output should be the input to the Quiz dymamodb table.
We get the transcript from AWS transcribe.  We should have a python script that 1) uploads the video to an S3 bucket, 2) runs the AWS transcribe with this bucket and path to video as input 3) gets the transcripiton back in the bucket (script should wait until it sees that transcripiton complete before moving to next step) 4) Feeds this transript to the langraph workflow and ultimately that langraph workflow takes that sturctured output and gives it to deterministic code writing direcly to the dynamodb table quiz

## Tech details
The python script that generates quiz questions should be designed to only run on local. 

Create this python code under the backend folder called genai.  Structure this using normal python directories best practices.  Use pip and python3.  Use langraph python latest version.  Use python client to aws transcribe

Use pytest and setup tests
