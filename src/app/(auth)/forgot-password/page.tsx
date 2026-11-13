import { Suspense } from "react";
import { ForgotForm } from "@/components/auth/auth-forms";

export const metadata = { title: "Reset password · Reception" };

export default function Page() {
  return (
    <Suspense>
      <ForgotForm />
    </Suspense>
  );
}
