# Feature - Stripe Enrollment

## Background:
I want to extend an existing enrollment feature using a Stripe enrollment strategy.  This should allow students to enroll in paid courses. 
Stripe will be our first PaymentProvider.  We will only accept one time payments for now.

## User Story:
As a student, I would like to be able to enroll in paid courses, so that I can enjoy premium courses just like I enjoy the free courses.
When on Dashboard and I click on a CourseCard enroll now button that is pricingModel "paid", I expect a Stripe powered payment flow to begin.  Ill enter in my payment details, and if succesfully paid, then I expect to be returned to the dasbhoard where I see a green Enrolled icon on the Course I just paid for.


## Tech Details
We are using the existing APIs, but extending our enrollment to include paid enrollment via the Stripe Provider.
Creating a new concept called Payment Provider and in future Payment Providers should be easy to create. E.g. strucutre our code that if I want to add PayPal that this would only need minimum code and it shouldnt have to modify existing (closed for modfication open for extension concept)
I want to use stripes embeded form for the stripe integration
Currently, we use cognito authentication for all of our API endpoints.  However, stripe webooks will not have a cognito account and thus will need to handle the stripe webook differently.

I have created stripe secrets in secret manager:
 {
    "ARN": "arn:aws:secretsmanager:us-east-1:853219709625:secret:learnermax/stripe-3NHb9f",
    "Name": "learnermax/stripe",
    "VersionId": "85d6f0c7-e7e8-41db-b74b-27e7e30c3aff"
}
✓ Secret created successfully!

Secret ARN:
arn:aws:secretsmanager:us-east-1:853219709625:secret:learnermax/stripe-3NHb9f


  const secretValue = await secretsmanager.getSecretValue({ SecretId: 'learnermax/stripe' });
  const secrets = JSON.parse(secretValue.SecretString);

  const stripeSecretKey = secrets.STRIPE_SECRET_KEY;
  const stripePublishableKey = secrets.STRIPE_PUBLISHABLE_KEY;


Also, I have updated the coures that are paid with a stripe product id in dynamodb
  1. AWS Cloud Mastery ($149.99)
    - Product ID: prod_TF8hQvt5PazLWQ
    - Price ID: price_1SIeQEQ0A0bb7l8VrpD9MOwT
  2. Full-Stack Development Bootcamp ($99.99)
    - Product ID: prod_TF8hrJSyQlMQNC
    - Price ID: price_1SIeQGQ0A0bb7l8VOe6dfOoI
You may need to reflect in code the new stripeProductId and stripePriceId especially for when we fetch these courses and use them in our stripe embededed form:
    aws dynamodb update-item \
        --table-name "$DYNAMODB_TABLE" \
        --region "$AWS_REGION" \
        --key "{\"PK\": {\"S\": \"COURSE#$COURSE_ID\"}, \"SK\": {\"S\": \"METADATA\"}}" \
        --update-expression "SET stripeProductId = :pid, stripePriceId = :prid" \
        --expression-attribute-values "{\":pid\": {\"S\": \"$PRODUCT_ID\"}, \":prid\": {\"S\": \"$PRICE_ID\"}}" \
        --return-values ALL_NEW \
        > /dev/null

**What we are not doing**
We are not adding anything to the /course/SLUG webpage.  We are keeping this with place holder data for now.
We are not modifying the landing page, we are keeping this in place for now.
We are not handling refunds for stripe
We are not handing any subscriptions from stripe

## Deliverables
Enroll for paid courses works with the payment provider stripe.
Stripe UI that allows for one time payments of the course.
Webhooks implmented for Stripe to call so we can confirm on our side the success of the payment and capture the stripe info in our dynamoDb

