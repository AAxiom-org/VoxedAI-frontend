import { SignIn } from "@clerk/clerk-react";

export default function SignInPage() {
  return (
    <div className="flex justify-center items-center h-screen">
      <SignIn 
        fallbackRedirectUrl={"/sign-in"}
        forceRedirectUrl={"/spaces"}
        signUpUrl={"/sign-up"}
        waitlistUrl={"/waitlist"}
      />
    </div>
  );
}
