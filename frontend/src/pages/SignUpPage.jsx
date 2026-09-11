import { SignUp } from '@clerk/clerk-react';

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <SignUp
        routing="path"
        path="/sign-up"
        afterSignUpUrl="/"
        appearance={{
          variables: {
            colorPrimary: '#D4A017',
            colorBackground: '#2A4232',
            colorInputBackground: '#1F3427',
            colorText: '#F5F3EC',
            colorTextSecondary: 'rgba(245, 243, 236, 0.65)',
            colorInputText: '#F5F3EC',
            borderRadius: '0.75rem',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }
        }}
      />
    </div>
  );
}
