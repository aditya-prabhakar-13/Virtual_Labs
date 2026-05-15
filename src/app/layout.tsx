import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VIRTUAL-LAB | 2D Physics Sandbox",
  description:
    "A collaborative 2D physics sandbox for university-level learning. Build machines, test structures, and observe real-time forces in a shared workspace.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
