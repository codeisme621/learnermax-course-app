import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';

let snsClient: SNSClient;

export const getSnsClient = () => {
  if (!snsClient) {
    snsClient = new SNSClient({ region: process.env.AWS_REGION || 'us-east-1' });
  }
  return snsClient;
};

export { PublishCommand };
