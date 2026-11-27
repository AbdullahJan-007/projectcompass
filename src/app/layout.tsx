import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ProjectCompass — Department of Information Technology & Computing",
  description:
    "Auditable, constraint-aware Final-Year Project ideation, archive originality verification, availability-aware faculty supervisor matching, and calibrated execution roadmaps.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400..700;1,9..40,400..700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-bg-canvas font-sans text-text-primary antialiased selection:bg-tertiary-fixed selection:text-on-tertiary-fixed">
        {children}
      </body>
    </html>
  );
}
