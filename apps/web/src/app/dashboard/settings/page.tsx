import { LogOut, Save, UserRound } from "lucide-react";

import { signOut, updateProfile } from "@/app/dashboard/actions";
import { createClient } from "@/lib/supabase/server";

type SettingsPageProps = {
  searchParams: Promise<{ updated?: string }>;
};

type Profile = {
  name: string | null;
  home_country: string | null;
  preferred_currency: string | null;
  subscription_status: string | null;
};

export default async function SettingsPage({
  searchParams,
}: SettingsPageProps) {
  const { updated } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("users")
    .select("name, home_country, preferred_currency, subscription_status")
    .eq("id", user?.id)
    .maybeSingle();

  const profile = data as Profile | null;

  return (
    <div className="mx-auto max-w-4xl">
      <div>
        <h1 className="font-[family-name:var(--font-heading)] text-3xl font-bold">
          Settings
        </h1>
        <p className="mt-1 text-gray-500">
          Keep your traveller profile and account preferences current.
        </p>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_300px]">
        <section className="rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-200 p-5">
            <div className="flex items-center gap-2">
              <UserRound className="h-5 w-5 text-[var(--primary)]" />
              <h2 className="font-[family-name:var(--font-heading)] text-2xl font-bold">
                Profile
              </h2>
            </div>
          </div>

          <form action={updateProfile} className="space-y-5 p-5">
            {updated === "profile" ? (
              <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                Profile updated.
              </div>
            ) : null}

            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-semibold text-gray-700"
              >
                Email
              </label>
              <input
                id="email"
                value={user?.email || ""}
                disabled
                className="w-full rounded-lg border border-gray-200 bg-[#F5F5F3] px-3 py-2 text-gray-500"
              />
            </div>

            <div>
              <label
                htmlFor="name"
                className="mb-2 block text-sm font-semibold text-gray-700"
              >
                Name
              </label>
              <input
                id="name"
                name="name"
                defaultValue={profile?.name || ""}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-orange-100"
                placeholder="Akshat"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="home_country"
                  className="mb-2 block text-sm font-semibold text-gray-700"
                >
                  Home country
                </label>
                <input
                  id="home_country"
                  name="home_country"
                  defaultValue={profile?.home_country || "IN"}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-orange-100"
                  placeholder="IN"
                />
              </div>

              <div>
                <label
                  htmlFor="preferred_currency"
                  className="mb-2 block text-sm font-semibold text-gray-700"
                >
                  Preferred currency
                </label>
                <select
                  id="preferred_currency"
                  name="preferred_currency"
                  defaultValue={profile?.preferred_currency || "INR"}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-orange-100"
                >
                  <option value="INR">INR</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end border-t border-gray-100 pt-5">
              <button
                type="submit"
                className="flex items-center gap-2 rounded-lg bg-[var(--primary)] px-5 py-2.5 text-sm font-bold text-white"
              >
                <Save className="h-4 w-4" />
                Save profile
              </button>
            </div>
          </form>
        </section>

        <aside className="space-y-4">
          <div className="rounded-lg border border-gray-200 bg-white p-5">
            <div className="text-sm font-semibold text-gray-500">Plan</div>
            <div className="mt-2 text-2xl font-bold capitalize">
              {profile?.subscription_status || "free"}
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-5">
            <h2 className="font-bold">Account</h2>
            <p className="mt-2 text-sm text-gray-500">
              Sign out of this browser session.
            </p>
            <form action={signOut} className="mt-4">
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50"
              >
                <LogOut className="h-4 w-4" />
                Log out
              </button>
            </form>
          </div>
        </aside>
      </div>
    </div>
  );
}
