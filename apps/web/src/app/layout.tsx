import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SoloWander | Travel solo. Spend smart. Stay safe.",
  description: "The only app built for solo travellers — budget tracker, hostel finder, AI trip planner, and local transport guide in one place.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
