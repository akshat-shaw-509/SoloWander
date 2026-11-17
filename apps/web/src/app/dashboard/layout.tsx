import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { signOut } from "@/app/dashboard/actions";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const isDemo = cookieStore.get("solowander_demo_mode")?.value === "true";
  const cookieName = cookieStore.get("solowander_user_name")?.value;
  const cookieEmail = cookieStore.get("solowander_user_email")?.value;

  let user = null;
  let profile = null;

  if (hasSupabaseConfig()) {
    try {
      const supabase = await createClient();
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      user = authUser;

      if (user) {
        const { data: userProfile } = await supabase
          .from("users")
          .select("name, preferred_currency")
          .eq("id", user.id)
          .maybeSingle();
        profile = userProfile;
      }
    } catch {
      // Supabase connection fallback
    }
  }

  if (!user && !isDemo) {
    redirect("/login");
  }

  const registeredName = cookieName ? decodeURIComponent(cookieName) : null;
  const registeredEmail = cookieEmail ? decodeURIComponent(cookieEmail) : null;

  const displayName = profile?.name || registeredName || user?.email || "Govind Prasad Shaw";
  const userEmail = registeredEmail || user?.email || "govindshaw506@gmail.com";

  return (
    <div className="min-h-screen bg-[#F5F5F3] text-[var(--dark)]">
      <div className="flex min-h-screen">
        <Sidebar preferredCurrency={profile?.preferred_currency || "INR"} />

        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar
            displayName={displayName}
            email={userEmail}
            profileName={profile?.name || displayName}
            signOutAction={signOut}
          />

          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
