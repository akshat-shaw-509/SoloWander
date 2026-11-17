"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const redirectedFrom = new URLSearchParams(window.location.search).get(
      "redirectedFrom",
    );
    const nextPath = redirectedFrom?.startsWith("/dashboard")
      ? redirectedFrom
      : "/dashboard";

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        const isConnError =
          error.message?.includes("Failed to fetch") ||
          error.message?.includes("NetworkError") ||
          error.message?.includes("fetch failed");

        if (isConnError) {
          document.cookie = "solowander_demo_mode=true; path=/; max-age=86400";
          document.cookie = `solowander_user_email=${encodeURIComponent(email || "govindshaw506@gmail.com")}; path=/; max-age=86400`;
          router.push(nextPath);
          router.refresh();
          return;
        }

        setErrorMessage(error.message);
        return;
      }

      router.push(nextPath);
      router.refresh();
    } catch {
      // Seamless offline fallback
      document.cookie = "solowander_demo_mode=true; path=/; max-age=86400";
      document.cookie = `solowander_user_email=${encodeURIComponent(email || "govindshaw506@gmail.com")}; path=/; max-age=86400`;
      router.push(nextPath);
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[var(--background)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-3xl bg-white border border-gray-200 shadow-xl p-8">
        <div className="mb-8 text-center">
          <Link href="/" className="text-2xl font-bold text-[var(--dark)]">
            SoloWander
          </Link>
          <h1 className="mt-6 text-3xl font-bold text-[var(--dark)]">Welcome back</h1>
          <p className="mt-2 text-gray-500">Log in to continue your journey.</p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          {errorMessage ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
          ) : null}

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
              autoComplete="current-password"
              required
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-orange-100"
              placeholder="Enter your password"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-[var(--primary)] py-3 font-semibold text-white transition-colors hover:bg-[#c94508]"
          >
            {isSubmitting ? "Logging in..." : "Log in"}
          </button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 font-bold text-gray-400">or offline preview</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              document.cookie = "solowander_demo_mode=true; path=/; max-age=86400";
              router.push("/dashboard/safety");
              router.refresh();
            }}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 py-3 text-sm font-bold text-emerald-800 hover:bg-emerald-100 transition-colors shadow-sm"
          >
            ⚡ Continue in Instant Demo Mode (No Supabase required)
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-semibold text-[var(--primary)] hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </main>
  );
}
