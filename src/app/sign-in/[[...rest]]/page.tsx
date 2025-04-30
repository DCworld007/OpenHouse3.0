import { SignIn } from '@clerk/nextjs';

export function generateStaticParams() {
  return [
    { rest: [] },
    { rest: ['sso-callback'] },
  ];
}

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <SignIn redirectUrl="/plans" />
    </div>
  );
}