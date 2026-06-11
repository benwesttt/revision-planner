import { SignUp } from '@clerk/clerk-react';

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <SignUp routing="path" path="/sign-up" afterSignUpUrl="/" />
    </div>
  );
}
