import { Waitlist } from "@clerk/clerk-react";

export default function WaitlistPage() {
  return (
    <div className="flex justify-center items-center h-screen">
      <Waitlist
            signInUrl={"/sign-in"}
            afterJoinWaitlistUrl={"https://voxed.ai/"}
      />
    </div>
  );
}
