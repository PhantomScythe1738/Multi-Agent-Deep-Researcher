import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Multi-Agent AI Deep Researcher",
  description:
    "Multi-agent, evidence-backed research over live web search and your own PDFs, with traceable citations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-slate-50 text-slate-900">{children}</body>
    </html>
  );
}
