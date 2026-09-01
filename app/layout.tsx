import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BrickBuddy Family Co-Design",
  description: "Design a voice assistant for brick building together through large visuals, clear text, and simple choices.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
