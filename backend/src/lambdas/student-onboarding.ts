import { SNSEvent, SNSHandler } from 'aws-lambda';

interface StudentOnboardingMessage {
  userId: string;
  email: string;
  name: string;
  signUpMethod: 'email' | 'google';
  timestamp: string;
}

export const handler: SNSHandler = async (event: SNSEvent) => {
  console.log('Student Onboarding Lambda triggered:', JSON.stringify(event, null, 2));

  const API_ENDPOINT = process.env.API_ENDPOINT!;

  for (const record of event.Records) {
    try {
      const message: StudentOnboardingMessage = JSON.parse(record.Sns.Message);
      console.log('Processing student onboarding:', message);

      // Call Student API to create student record
      const response = await fetch(`${API_ENDPOINT}/api/students`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: message.userId,
          email: message.email,
          name: message.name,
          signUpMethod: message.signUpMethod,
          enrolledCourses: [],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Student API returned ${response.status}: ${errorText}`
        );
      }

      const student = await response.json();
      console.log('Successfully created student record:', student);
    } catch (error) {
      console.error('Error processing student onboarding:', error);
      // Throw error to trigger SNS retry and eventually send to DLQ
      throw error;
    }
  }
};
