import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  ConfirmSignUpCommand,
  ResendConfirmationCodeCommand,
} from '@aws-sdk/client-cognito-identity-provider';

const client = new CognitoIdentityProviderClient({
  region: process.env.NEXT_PUBLIC_COGNITO_REGION || 'us-east-1',
});

export interface SignUpParams {
  email: string;
  password: string;
  name: string;
}

export interface SignUpResponse {
  success: boolean;
  userSub?: string;
  userConfirmed?: boolean;
  codeDeliveryDetails?: {
    destination: string;
    deliveryMedium: string;
    attributeName: string;
  };
  error?: string;
}

export interface ConfirmSignUpParams {
  email: string;
  code: string;
}

export interface ConfirmSignUpResponse {
  success: boolean;
  error?: string;
}

export const signUp = async ({
  email,
  password,
  name,
}: SignUpParams): Promise<SignUpResponse> => {
  try {
    const command = new SignUpCommand({
      ClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || '',
      Username: email,
      Password: password,
      UserAttributes: [
        {
          Name: 'email',
          Value: email,
        },
        {
          Name: 'name',
          Value: name,
        },
      ],
    });

    const response = await client.send(command);

    return {
      success: true,
      userSub: response.UserSub,
      userConfirmed: response.UserConfirmed,
      codeDeliveryDetails: response.CodeDeliveryDetails
        ? {
            destination: response.CodeDeliveryDetails.Destination || '',
            deliveryMedium: response.CodeDeliveryDetails.DeliveryMedium || '',
            attributeName: response.CodeDeliveryDetails.AttributeName || '',
          }
        : undefined,
    };
  } catch (error: any) {
    console.error('Sign up error:', error);
    return {
      success: false,
      error: error.message || 'Failed to sign up',
    };
  }
};

export const confirmSignUp = async ({
  email,
  code,
}: ConfirmSignUpParams): Promise<ConfirmSignUpResponse> => {
  try {
    const command = new ConfirmSignUpCommand({
      ClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || '',
      Username: email,
      ConfirmationCode: code,
    });

    await client.send(command);

    return {
      success: true,
    };
  } catch (error: any) {
    console.error('Confirmation error:', error);
    return {
      success: false,
      error: error.message || 'Failed to confirm sign up',
    };
  }
};

export const resendConfirmationCode = async (
  email: string
): Promise<ConfirmSignUpResponse> => {
  try {
    const command = new ResendConfirmationCodeCommand({
      ClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || '',
      Username: email,
    });

    await client.send(command);

    return {
      success: true,
    };
  } catch (error: any) {
    console.error('Resend code error:', error);
    return {
      success: false,
      error: error.message || 'Failed to resend confirmation code',
    };
  }
};
