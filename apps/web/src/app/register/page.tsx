"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

export default function RegisterPage() {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "");
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const supabase = createClient();
      const {
        data: { user, session },
        error,
      } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
        },
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      if (user && !session) {
        setPendingEmail(email);
        return;
      }

      if (user && session) {
        await supabase.from("users").upsert({
          id: user.id,
          email,
          name,
        });
      }

      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to create your account. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (pendingEmail) {
    return (
      <main className="min-h-screen bg-[var(--background)] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-3xl bg-white border border-gray-200 shadow-xl p-8 text-center">
          <Link href="/" className="text-2xl font-bold text-[var(--dark)]">
            SoloWander
          </Link>
          <div className="mt-8 mx-auto w-16 h-16 rounded-full bg-green-50 flex items-center justify-center text-green-600 text-2xl font-bold">
            ✓
          </div>
          <h1 className="mt-6 text-2xl font-bold text-[var(--dark)]">Verify your email</h1>
          <p className="mt-3 text-sm text-gray-600 leading-relaxed">
            We sent a verification link to <strong className="text-[var(--dark)]">{pendingEmail}</strong>.
            Please click the link in your email to activate your account, then log in.
          </p>
          <div className="mt-8">
            <Link
              href="/login"
              className="inline-block w-full py-3.5 rounded-xl bg-[var(--primary)] text-white font-semibold hover:bg-[#c94508] transition-colors"
            >
              Continue to Log In
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-3xl bg-white border border-gray-200 shadow-xl p-8">
        <div className="mb-8 text-center">
          <Link href="/" className="text-2xl font-bold text-[var(--dark)]">
            SoloWander
          </Link>
          <h1 className="mt-6 text-3xl font-bold text-[var(--dark)]">Create your account</h1>
          <p className="mt-2 text-gray-500">Start planning your next adventure.</p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          {errorMessage ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
          ) : null}

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Full name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              required
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-orange-100"
              placeholder="Your name"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-orange-100"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-orange-100"
              placeholder="At least 8 characters"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-[var(--primary)] py-3 font-semibold text-white transition-colors hover:bg-[#c94508] disabled:opacity-60"
          >
            {isSubmitting ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-[var(--primary)] hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
