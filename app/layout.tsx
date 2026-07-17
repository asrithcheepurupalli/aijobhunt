import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "aijobhunt — your startup-hiring agent",
  description:
    "A personal, text-native agent that learns your background, sources high-fit early-stage roles, and drafts founder outreach you approve before anything is sent.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
