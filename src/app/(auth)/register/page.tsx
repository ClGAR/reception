import { Suspense } from "react";
import { RegisterForm } from "@/components/auth/auth-forms";

export const metadata = { title: "Create account · Reception" };

export default function Page() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
