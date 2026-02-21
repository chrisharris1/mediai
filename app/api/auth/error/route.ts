import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const error = searchParams.get('error');
  
  // Redirect to login page with error message in URL
  const loginUrl = new URL('/login', req.url);
  loginUrl.searchParams.set('error', error || 'default');
  loginUrl.searchParams.set('message', getErrorMessage(error));
  
  return NextResponse.redirect(loginUrl);
}

function getErrorMessage(error: string | null): string {
  switch (error) {
    case 'CredentialsSignin':
      return 'Invalid email or password';
    case 'OAuthSignin':
      return 'Error occurred during OAuth sign in';
    case 'OAuthCallback':
      return 'Error occurred during OAuth callback';
    case 'OAuthCreateAccount':
      return 'Could not create OAuth account';
    case 'EmailCreateAccount':
      return 'Could not create email account';
    case 'Callback':
      return 'Error in callback';
    case 'OAuthAccountNotLinked':
      return 'Email already registered with different provider';
    case 'EmailSignin':
      return 'Check your email for the sign in link';
    case 'CredentialsSignup':
      return 'Registration failed';
    case 'SessionRequired':
      return 'Please sign in to access this page';
    default:
      return 'An error occurred during authentication';
  }
}
