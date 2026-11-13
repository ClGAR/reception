import { Suspense } from "react";
import { ResetForm } from "@/components/auth/auth-forms";

export const metadata = { title: "New password · Reception" };

export default function Page() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  );
}
