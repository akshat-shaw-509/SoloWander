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
  if (!hasSupabaseConfig()) {
    redirect("/login");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("name, preferred_currency")
    .eq("id", user.id)
    .maybeSingle();

  const displayName = profile?.name || user.email || "Solo Wanderer";

  return (
    <div className="min-h-screen bg-[#F5F5F3] text-[var(--dark)]">
      <div className="flex min-h-screen">
        <Sidebar preferredCurrency={profile?.preferred_currency || "INR"} />

        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar
            displayName={displayName}
            email={user.email}
            profileName={profile?.name}
            signOutAction={signOut}
          />

          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
