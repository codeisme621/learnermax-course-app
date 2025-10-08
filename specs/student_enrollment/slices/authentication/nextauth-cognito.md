NextAuth.js v4 + AWS Cognito (Google Social Login) Integration Guide
Overview

This guide shows how to use NextAuth.js v4 with AWS Cognito as the sole authentication provider, where Cognito federates to Google for social login. We will configure an AWS Cognito User Pool (with Google as an IdP) and NextAuth in a Next.js app (using JWT-based sessions). The result is that users authenticate via Cognito’s hosted OAuth flow (which delegates to Google), and NextAuth manages the session JWT containing the Cognito tokens and user info.

1. Configure AWS Cognito for Google Login

Prerequisites: An AWS Cognito User Pool, an App Client, and a User Pool Domain (the hosted UI domain). Also create Google OAuth credentials for your app.

Steps:

Set up Google OAuth Credentials: In the Google Cloud Console, create an OAuth 2.0 Client ID (Web application). Add your Cognito domain to Authorized JavaScript origins and add Cognito’s IdP redirect URL to Authorized redirect URIs. The redirect URI for Cognito is of the form:

https://<YOUR_COGNITO_DOMAIN>.auth.<region>.amazoncognito.com/oauth2/idpresponse


This special .../oauth2/idpresponse URL is where Google will redirect back to Cognito after a successful login
aws-cdk.com
. Be sure to include the Cognito domain (e.g., yourapp.auth.us-east-1.amazoncognito.com) as an authorized domain in the Google consent screen setup.

Add Google as an Identity Provider in Cognito: In the AWS Cognito console, go to User Pools > (Your Pool) > Social identity providers and choose Google. Enter the Client ID and Client Secret from the Google API Console, and set the Authorized scopes to include openid, email, and profile
docs.aws.amazon.com
docs.aws.amazon.com
. Save the IdP configuration.

Configure the App Client: Still in the Cognito console, under App integration > App client settings (or App clients > your client > Edit in newer UI), enable Cognito Hosted UI for your domain. For Allowed OAuth Flows, enable “Authorization code grant”. For Allowed OAuth Scopes, select at least openid, email, and profile. In Allowed Callback URLs, add your NextAuth callback URL (e.g. https://your-site.com/api/auth/callback/cognito for production, and for development http://localhost:3000/api/auth/callback/cognito). In Allowed Sign-out URLs, add your app URL (e.g., http://localhost:3000). Under Identity providers for the app client, check Google (and Cognito User Pool if you also want to allow username/password login). Then Save Changes
docs.aws.amazon.com
.

Note: If you only select Google as the identity provider for the app client (and not the Cognito User Pool itself), the hosted UI will exclusively allow Google sign-in. Cognito acts as a bridge to Google: after Google authentication, Cognito will issue its own JWT ID token, Access token, and (if enabled) Refresh token for the user
docs.aws.amazon.com
docs.aws.amazon.com
.

2. Install NextAuth and Setup Environment Variables

In your Next.js project, install NextAuth:

pnpm install next-auth


Define the following environment variables in your .env.local (adjust names as needed):

# Cognito App Client credentials
COGNITO_CLIENT_ID=your_cognito_app_client_id  
COGNITO_CLIENT_SECRET=your_cognito_app_client_secret  
# Cognito Issuer URL: Use your Cognito domain URL or the AWS IDP issuer URL
COGNITO_ISSUER_URL=https://<your-domain>.auth.<region>.amazoncognito.com  
# e.g., https://yourapp.auth.us-east-1.amazoncognito.com 
# (If you don't have a custom domain, use the default Cognito domain prefix URL)
  
# NextAuth configuration  
NEXTAUTH_URL=http://localhost:3000   # base URL of your Next.js app (adjust for production)  
NEXTAUTH_SECRET=some_complex_secret_value  


The COGNITO_ISSUER_URL is the base URL of your Cognito User Pool’s OIDC issuer. If using the AWS-provided domain (as set in step 1), use https://<domainPrefix>.auth.<region>.amazoncognito.com. (Alternatively, you can use the Cognito issuer in the format https://cognito-idp.<region>.amazonaws.com/<UserPoolID> which also serves the OIDC metadata.)

Ensure NEXTAUTH_URL is set to your app’s URL and NEXTAUTH_SECRET is a random secret (used to sign/encrypt the JWT session).

3. NextAuth Configuration (Cognito Provider with JWT Sessions)

Create the NextAuth API route (e.g. at pages/api/auth/[...nextauth].js for Next.js 12/13 Pages Router, or app/api/auth/[...nextauth]/route.js for Next.js 13 App Router). Configure NextAuth to use the Cognito provider and JWT sessions as follows:

// pages/api/auth/[...nextauth].js
import NextAuth from "next-auth";
import CognitoProvider from "next-auth/providers/cognito";

export default NextAuth({
  providers: [
    CognitoProvider({
      clientId: process.env.COGNITO_CLIENT_ID,
      clientSecret: process.env.COGNITO_CLIENT_SECRET,
      issuer: process.env.COGNITO_ISSUER_URL
      // The issuer is your Cognito User Pool domain URL.
      // NextAuth will use the OIDC discovery document from this issuer to get endpoints.
    })
  ],
  session: {
    strategy: "jwt"  // Use JSON Web Tokens for session instead of database
  },
  callbacks: {
    async jwt({ token, account }) {
      // On initial sign-in, merge Cognito tokens into our JWT
      if (account) {
        token.accessToken = account.access_token;
        token.idToken = account.id_token;
        token.refreshToken = account.refresh_token;
      }
      return token;
    },
    async session({ session, token }) {
      // Attach token fields to the session object
      session.user = session.user || {};  // ensure user object exists
      session.accessToken = token.accessToken;
      session.idToken = token.idToken;
      return session;
    }
  }
});


In this configuration:

We use the built-in CognitoProvider with our Cognito app client credentials and issuer. NextAuth will handle the OAuth 2.0 code exchange with Cognito’s endpoints automatically (using the issuer’s well-known configuration).

JWT sessions: We set session.strategy = "jwt" to store session data in an encrypted JWT cookie (no database needed).

Callbacks: In the jwt callback, we intercept the OAuth response from Cognito. When account is present (on initial login), we store the Cognito ID token, Access token, and Refresh token in the JWT
dev.to
. In the session callback, we copy those tokens from the JWT to the session object that will be returned to the client
dev.to
. This makes the tokens (especially the ID token) accessible in the client-side session.

Why store the Cognito tokens? The ID token (JWT) contains the user's identity claims (email, sub, etc.), and the Access token can be used to authorize requests to AWS resources (if Cognito user pool groups/roles are used). By storing them in the NextAuth JWT, we can retrieve them in our application. You may also store the refreshToken and implement logic to refresh expired tokens using Cognito’s token endpoint
dev.to
dev.to
 (this is optional but recommended for long-lived sessions).

Cognito Redirect URI: NextAuth will automatically handle the OAuth callback at the route /api/auth/callback/cognito. Ensure this exact URL is listed in your Cognito App Client’s allowed callback URLs. (The provider ID is "cognito" by default when using CognitoProvider, so NextAuth expects the callback at /callback/cognito.)

4. Initiating the Sign-in Flow (NextAuth + Cognito)

With the above setup, you can trigger the OAuth flow from your Next.js app. Typically, you would have a login button that calls NextAuth’s signIn function. For example:

// Example React component (e.g., LoginButton.jsx)
import { signIn } from "next-auth/react";

export default function LoginButton() {
  const handleLogin = () => {
    // This will redirect the user to Cognito's hosted UI for Google sign-in
    signIn("cognito");
    // Optionally: signIn("cognito", undefined, { identity_provider: "Google" });
  };

  return <button onClick={handleLogin}>Sign in with Google</button>;
}


Calling signIn("cognito") will redirect the user to the Cognito Authorize endpoint. Because we configured the app client with Google as the IdP, the hosted UI will immediately redirect to Google’s OAuth consent screen. If you want to explicitly ensure Cognito bypasses its default login page, you can pass the identity_provider parameter as shown (third argument to signIn). For example, signIn("cognito", undefined, { identity_provider: "Google" }) will append identity_provider=Google to the Cognito authorization URL
stackoverflow.com
. This forces Cognito to silently redirect directly to Google, skipping any Cognito login selection page
docs.aws.amazon.com
 (useful if Cognito had multiple IdPs or a userpool login option).

When the user completes Google authentication, Google will redirect back to Cognito (/oauth2/idpresponse), and then Cognito will redirect back to your NextAuth callback URL with an authorization code. NextAuth exchanges this code for Cognito tokens and triggers the callbacks we defined to create the session.

5. Accessing the User Session and ID Token

After a successful login, NextAuth provides the session data (including the Cognito ID token we stored) to your Next.js app. Here’s how to use it:

Client-side: Use the useSession hook from next-auth/react to get the current session. For example:

import { useSession, signOut } from "next-auth/react";

function Dashboard() {
  const { data: session, status } = useSession();

  if (status === "loading") return <p>Loading...</p>;
  if (!session) {
    return <p>You are not logged in.</p>;
  }

  return (
    <div>
      <h2>Welcome, {session.user.name}!</h2>
      <p>Your email: {session.user.email}</p>
      <p>Cognito ID Token: {session.idToken}</p>   {/* ID token from Cognito */}
      <button onClick={() => signOut()}>Sign out</button>
    </div>
  );
}


In the above example, session.user contains basic profile info (NextAuth will populate this from Cognito/Google profile claims by default). We also added session.idToken (and session.accessToken) in our NextAuth callbacks, so those are available for use. You can, for instance, send session.idToken in requests to your backend for verification or use session.accessToken to call AWS API Gateway or other services secured by Cognito.

Server-side: You can retrieve the session or JWT in API routes, Next.js Middleware, or server components. For example, in an API route you might use NextAuth’s getToken utility to read the token:

import { getToken } from "next-auth/jwt";

export default async function handler(req, res) {
  const token = await getToken({ req });  // Automatically uses NEXTAUTH_SECRET to decrypt
  if (!token) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  // token will include properties we added, e.g., token.idToken, token.accessToken
  console.log("Cognito ID Token:", token.idToken);
  // ... use the token for authorization logic ...
  res.json({ name: token.name, email: token.email });
}


The getToken function gives you the decoded JWT (the same data you saw in the jwt callback). You could also use getSession from next-auth/react (which returns the session object) in certain cases. In Next.js 13 Middleware, you would use getToken to protect routes by checking for a valid token.

6. Cognito & NextAuth – Additional Notes

Logout: Calling signOut() from next-auth/react will remove the NextAuth session (JWT cookie). If you also want to log the user out of the Cognito hosted session, you can redirect the user to the Cognito Logout endpoint: https://<your-domain>.auth.<region>.amazoncognito.com/logout?client_id=<CLIENTID>&logout_uri=<RETURN_URL>. This ensures the user is fully signed out.

Multiple Providers: In this guide we focused on Google via Cognito. You can enable other social providers (Facebook, Apple, etc.) in Cognito and treat them similarly. For example, if you wanted both Google and Facebook, you could either configure separate NextAuth providers with different idp_identifier params or prompt the user to choose provider before calling signIn("cognito", ..., { identity_provider: "..."} ). The advantage of using Cognito is that your NextAuth setup still only needs one provider – Cognito – to handle multiple social logins
dev.to
dev.to
.

Token Refresh: Cognito access and ID tokens are short-lived (by default ~1 hour). We stored refreshToken in the JWT; you can implement logic in the jwt callback to use it and refresh tokens when they expire
dev.to
dev.to
. This way, user sessions remain valid without forcing a re-login until the refresh token expires (usually 30 days). Be cautious to secure refresh tokens properly.

With this setup, your Next.js application uses NextAuth.js v4 to handle authentication via AWS Cognito, and Cognito in turn federates with Google. Users enjoy a seamless login (redirecting straight to Google’s consent screen via Cognito), and you maintain a single, JWT-based session in NextAuth containing the necessary tokens and user information for downstream use.