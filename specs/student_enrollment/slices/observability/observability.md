# Feature Observability And Minor bug fix


## Background:

### Minor bug needs to be fixed.
We have a minor bug.  Our landing page signin button takes the user to the enroll webpage.  It should take them the the signin webpage.  Please fix this linking issue.


### Need better observability for our backend
I would like to leverage AWS cloudwatch, AWS Lambda OTEL (ADOT) for my nodejs backend (every lambda should have this layer), AWS XRay, AWS Lambda Powertools and use structure logging.  Also, would like metrics tech and business.  For business, would love to see how many users have registered (i.e. postConfirmation lambda has succesfully inserted them in dynamodb).  For Tech, would like to know about any failures or latency issues.  I 100% need to know if anything ends up in my dead letter queue.

## What we are not doing
We are not instrumenting the frontend.
Not updating look or feel on the frontend, just the linking. 

## Deliverables
SignIn button link should go to Sign in page.

Every Lambda is fully instrumented using the observability mechnaisms highlighted above.

All infrastructure changes should be done in the SAM template

Output a URL to the cloudwatch dashboard



