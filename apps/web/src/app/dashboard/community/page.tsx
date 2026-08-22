import Link from "next/link";
import { Filter, MapPin, MessageCircle, Send, ThumbsUp } from "lucide-react";

import { createCommunityPost } from "@/app/dashboard/actions";
import { createClient } from "@/lib/supabase/server";

type CommunityPageProps = {
  searchParams: Promise<{ city?: string; error?: string }>;
};

type CommunityPost = {
  id: string;
  city: string | null;
  post_type: string | null;
  title: string;
  body: string | null;
  upvotes: number | null;
  created_at: string | null;
};

function formatDate(value?: string | null) {
  if (!value) {
    return "Date pending";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export default async function CommunityPage({
  searchParams,
}: CommunityPageProps) {
  const { city, error } = await searchParams;
  const supabase = await createClient();

  let postsQuery = supabase
    .from("community_posts")
    .select("id, city, post_type, title, body, upvotes, created_at")
    .eq("is_flagged", false)
    .order("created_at", { ascending: false })
    .limit(50);

  if (city) {
    postsQuery = postsQuery.eq("city", city);
  }

  const [{ data: postsData }, { data: cityRows }] = await Promise.all([
    postsQuery,
    supabase
      .from("community_posts")
      .select("city")
      .eq("is_flagged", false)
      .order("city", { ascending: true }),
  ]);

  const posts = (postsData ?? []) as CommunityPost[];
  const cities = Array.from(
    new Set(
      ((cityRows ?? []) as { city: string | null }[])
        .map((row) => row.city)
        .filter((item): item is string => Boolean(item)),
    ),
  );

  return (
    <div className="mx-auto max-w-7xl">
      <div>
        <h1 className="font-[family-name:var(--font-heading)] text-3xl font-bold">
          Community
        </h1>
        <p className="mt-1 text-gray-500">
          Share city notes and read public tips from other solo travellers.
        </p>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
        <section className="space-y-5">
          <div className="rounded-lg border border-gray-200 bg-white p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-gray-600">
                <Filter className="h-4 w-4" />
                {city || "All cities"}
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/dashboard/community"
                  className={`rounded-lg border px-3 py-2 text-sm font-bold ${
                    !city
                      ? "border-[var(--primary)] bg-orange-50 text-[var(--primary)]"
                      : "border-gray-200 text-gray-600"
                  }`}
                >
                  All cities
                </Link>
                {cities.map((item) => (
                  <Link
                    key={item}
                    href={`/dashboard/community?city=${encodeURIComponent(item)}`}
                    className={`rounded-lg border px-3 py-2 text-sm font-bold ${
                      city === item
                        ? "border-[var(--primary)] bg-orange-50 text-[var(--primary)]"
                        : "border-gray-200 text-gray-600"
                    }`}
                  >
                    {item}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {posts.length > 0 ? (
            posts.map((post) => (
              <article
                key={post.id}
                className="rounded-lg border border-gray-200 bg-white p-5"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase text-gray-500">
                      <span>{post.post_type || "general"}</span>
                      <span>{formatDate(post.created_at)}</span>
                    </div>
                    <h2 className="mt-2 text-xl font-bold">{post.title}</h2>
                  </div>
                  <div className="flex items-center gap-1 rounded-lg bg-[#F5F5F3] px-3 py-2 text-sm font-bold">
                    <ThumbsUp className="h-4 w-4 text-[var(--secondary)]" />
                    {post.upvotes ?? 0}
                  </div>
                </div>

                {post.body ? (
                  <p className="mt-4 whitespace-pre-line text-gray-600">
                    {post.body}
                  </p>
                ) : null}

                <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-gray-500">
                  <MapPin className="h-4 w-4" />
                  {post.city || "City not specified"}
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-lg border border-dashed border-gray-300 bg-white p-10 text-center">
              <MessageCircle className="mx-auto h-12 w-12 text-gray-400" />
              <h2 className="mt-4 text-xl font-bold">No posts yet</h2>
              <p className="mt-2 text-gray-500">
                Start the first city note for this view.
              </p>
            </div>
          )}
        </section>

        <section className="h-fit rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="font-[family-name:var(--font-heading)] text-2xl font-bold">
            New post
          </h2>

          <form action={createCommunityPost} className="mt-5 space-y-4">
            {error === "title" ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                Title is required.
              </div>
            ) : null}

            <div>
              <label
                htmlFor="title"
                className="mb-2 block text-sm font-semibold text-gray-700"
              >
                Title
              </label>
              <input
                id="title"
                name="title"
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-orange-100"
                placeholder="Late-night food near Anjuna"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <div>
                <label
                  htmlFor="city"
                  className="mb-2 block text-sm font-semibold text-gray-700"
                >
                  City
                </label>
                <input
                  id="city"
                  name="city"
                  defaultValue={city}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-orange-100"
                  placeholder="Goa"
                />
              </div>

              <div>
                <label
                  htmlFor="post_type"
                  className="mb-2 block text-sm font-semibold text-gray-700"
                >
                  Type
                </label>
                <select
                  id="post_type"
                  name="post_type"
                  defaultValue="general"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-orange-100"
                >
                  <option value="general">General</option>
                  <option value="safety">Safety</option>
                  <option value="food">Food</option>
                  <option value="transport">Transport</option>
                  <option value="stay">Stay</option>
                </select>
              </div>
            </div>

            <div>
              <label
                htmlFor="body"
                className="mb-2 block text-sm font-semibold text-gray-700"
              >
                Body
              </label>
              <textarea
                id="body"
                name="body"
                rows={5}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-orange-100"
                placeholder="Share the exact detail another traveller would want to know."
              />
            </div>

            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-bold text-white"
            >
              <Send className="h-4 w-4" />
              Publish
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
