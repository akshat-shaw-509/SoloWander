import Link from "next/link";

type PageProps = {
  params: Promise<{ slug: string[] }>;
};

const pageTitles: Record<string, string> = {
  blog: "SoloWander Blog",
  destinations: "Destinations",
  features: "Features",
  pricing: "Pricing",
  partners: "Partner with us",
  about: "About SoloWander",
  privacy: "Privacy Policy",
  terms: "Terms of Service",
};

export default async function SitePage({ params }: PageProps) {
  const { slug } = await params;
  const route = slug.join("/");
  const title = pageTitles[route] ?? route.replace(/[-_]/g, " ");

  return (
    <main className="min-h-screen bg-[var(--background)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl rounded-3xl bg-white border border-gray-200 shadow-xl p-10 text-center">
        <Link href="/" className="text-2xl font-bold text-[var(--dark)]">
          SoloWander
        </Link>
        <h1 className="mt-8 text-4xl font-bold capitalize text-[var(--dark)]">{title}</h1>
        <p className="mt-4 text-gray-600">
          This page is ready for the {title.toLowerCase()} content.
        </p>
        <Link
          href="/"
          className="mt-8 inline-block rounded-xl bg-[var(--primary)] px-6 py-3 font-semibold text-white hover:bg-[#c94508]"
        >
          Back to home
        </Link>
      </div>
    </main>
  );
}
