import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  AuthFlowType,
} from '@aws-sdk/client-cognito-identity-provider';

const client = new CognitoIdentityProviderClient({
  region: process.env.NEXT_PUBLIC_COGNITO_REGION || 'us-east-1',
});

export interface CognitoSignInResponse {
  id: string;
  email: string;
  username: string;
  accessToken: string;
  idToken: string;
  refreshToken: string;
}

export async function signInWithCognito(
  email: string,
  password: string
): Promise<CognitoSignInResponse | null> {
  try {
    const command = new InitiateAuthCommand({
      AuthFlow: AuthFlowType.USER_PASSWORD_AUTH,
      ClientId: process.env.COGNITO_CLIENT_ID || '',
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password,
      },
    });

    const response = await client.send(command);

    if (!response.AuthenticationResult) {
      return null;
    }

    // Decode the ID token to get user info
    const idToken = response.AuthenticationResult.IdToken || '';
    const payload = JSON.parse(
      Buffer.from(idToken.split('.')[1], 'base64').toString()
    );

    return {
      id: payload['cognito:username'] || payload.sub,
      email: payload.email,
      username: payload['name'] || email,
      accessToken: response.AuthenticationResult.AccessToken || '',
      idToken: idToken,
      refreshToken: response.AuthenticationResult.RefreshToken || '',
    };
  } catch (error: unknown) {
    console.error('Cognito sign-in error:', error);
    return null;
  }
}
