"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { MailCheck } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button, Field, Input } from "@/components/ui";

function Heading({ title, body }: { title: string; body?: string }) {
  return (
    <div className="mb-7">
      <h1 className="text-[26px] font-semibold tracking-[-0.02em]">{title}</h1>
      {body && <p className="mt-1.5 text-[14.5px] text-muted">{body}</p>}
    </div>
  );
}

function FormError({ msg }: { msg: string | null }) {
  if (!msg) return null;
  return (
    <p role="alert" className="rounded-md border border-[#ecd2cb] bg-[#fbf1ee] px-3 py-2 text-[13.5px] text-[#8a3324]">
      {msg}
    </p>
  );
}

const friendly = (code?: string, fallback?: string) =>
  code === "EMAIL_NOT_VERIFIED"
    ? "Please verify your email first. We've sent you a new link."
    : code === "INVALID_EMAIL_OR_PASSWORD"
      ? "That email and password don't match."
      : code?.startsWith("USER_ALREADY_EXISTS")
        ? "An account with this email already exists. Try logging in."
        : (fallback ?? "Something went wrong. Please try again.");

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setLoading(true);
    setError(null);
    const { error } = await authClient.signIn.email({
      email: String(f.get("email")),
      password: String(f.get("password")),
      callbackURL: "/app/overview",
    });
    setLoading(false);
    if (error) return setError(friendly(error.code, error.message));
    const next = params.get("next");
    router.push(next?.startsWith("/app") ? next : "/app/overview");
    router.refresh();
  }
  return (
    <>
      <Heading title="Log in" body="Welcome back. Your inbox is waiting." />
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Work email" htmlFor="email">
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </Field>
        <Field label="Password" htmlFor="password">
          <Input id="password" name="password" type="password" autoComplete="current-password" required />
        </Field>
        <div className="flex justify-end">
          <Link href="/forgot-password" className="text-[13.5px] text-muted hover:text-ink">
            Forgot password?
          </Link>
        </div>
        <FormError msg={error} />
        <Button type="submit" variant="primary" size="lg" className="w-full" loading={loading}>
          Log in
        </Button>
      </form>
      <p className="mt-6 text-center text-[14px] text-muted">
        New to Reception?{" "}
        <Link href="/register" className="font-medium text-ink underline-offset-4 hover:underline">
          Create an account
        </Link>
      </p>
    </>
  );
}

export function RegisterForm() {
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const name = String(f.get("name")).trim();
    const email = String(f.get("email")).trim();
    const password = String(f.get("password"));
    const errs: Record<string, string> = {};
    if (name.length < 2) errs.name = "Enter your name.";
    if (!/^\S+@\S+\.\S+$/.test(email)) errs.email = "Enter a valid email.";
    if (password.length < 10) errs.password = "Use at least 10 characters.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setLoading(true);
    setError(null);
    const { error } = await authClient.signUp.email({ name, email, password, callbackURL: "/onboarding" });
    setLoading(false);
    if (error) return setError(friendly(error.code, error.message));
    setSentTo(email);
  }
  if (sentTo)
    return (
      <div className="text-center">
        <span className="mx-auto mb-4 grid size-12 place-items-center rounded-full bg-accent-soft text-accent-strong">
          <MailCheck size={22} />
        </span>
        <Heading title="Check your email" body={`We sent a verification link to ${sentTo}. Open it to set up your business.`} />
        <p className="text-[13px] text-muted">Running locally without an email provider? The link is printed in the server console.</p>
      </div>
    );
  return (
    <>
      <Heading title="Create your account" body="Set up AI reception for your business in a few minutes." />
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Field label="Your name" htmlFor="name" error={errors.name}>
          <Input id="name" name="name" autoComplete="name" aria-invalid={!!errors.name} />
        </Field>
        <Field label="Work email" htmlFor="email" error={errors.email}>
          <Input id="email" name="email" type="email" autoComplete="email" aria-invalid={!!errors.email} />
        </Field>
        <Field label="Password" htmlFor="password" hint="At least 10 characters." error={errors.password}>
          <Input id="password" name="password" type="password" autoComplete="new-password" aria-invalid={!!errors.password} />
        </Field>
        <FormError msg={error} />
        <Button type="submit" variant="primary" size="lg" className="w-full" loading={loading}>
          Create account
        </Button>
        <p className="text-[12.5px] leading-relaxed text-muted">
          By creating an account you agree to our{" "}
          <Link href="/privacy" className="underline underline-offset-2">
            privacy notice
          </Link>
          .
        </p>
      </form>
      <p className="mt-6 text-center text-[14px] text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-ink underline-offset-4 hover:underline">
          Log in
        </Link>
      </p>
    </>
  );
}

export function ForgotForm() {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    await authClient.requestPasswordReset({ email: String(new FormData(e.currentTarget).get("email")), redirectTo: "/reset-password" });
    setLoading(false);
    setDone(true); // same message whether or not the account exists
  }
  if (done) return <Heading title="Check your email" body="If an account exists for that address, we've sent a link to reset your password." />;
  return (
    <>
      <Heading title="Reset your password" body="Enter your email and we'll send you a reset link." />
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Work email" htmlFor="email">
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </Field>
        <Button type="submit" variant="primary" size="lg" className="w-full" loading={loading}>
          Send reset link
        </Button>
      </form>
      <p className="mt-6 text-center text-[14px] text-muted">
        <Link href="/login" className="hover:text-ink">
          Back to log in
        </Link>
      </p>
    </>
  );
}

export function ResetForm() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token");
  const [error, setError] = useState<string | null>(params.get("error") ? "This reset link has expired. Request a new one." : null);
  const [loading, setLoading] = useState(false);
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const pw = String(new FormData(e.currentTarget).get("password"));
    if (pw.length < 10) return setError("Use at least 10 characters.");
    setLoading(true);
    const { error } = await authClient.resetPassword({ newPassword: pw, token: token ?? "" });
    setLoading(false);
    if (error) return setError(friendly(error.code, "This reset link is invalid or expired."));
    router.push("/login");
  }
  return (
    <>
      <Heading title="Choose a new password" />
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="New password" htmlFor="password" hint="At least 10 characters.">
          <Input id="password" name="password" type="password" autoComplete="new-password" required />
        </Field>
        <FormError msg={error} />
        <Button type="submit" variant="primary" size="lg" className="w-full" loading={loading} disabled={!token}>
          Save password
        </Button>
      </form>
    </>
  );
}
