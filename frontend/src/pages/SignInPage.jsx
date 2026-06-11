import { SignIn } from '@clerk/clerk-react';

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <SignIn routing="path" path="/sign-in" afterSignInUrl="/" />
    </div>
  );
}
