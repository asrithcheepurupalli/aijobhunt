import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Foothold — land a founding role at a startup worth betting on",
  description:
    "Your personal, text-native startup-hiring agent. It learns your real work, sources high-fit early-stage roles, scores them, and drafts founder outreach you approve before anything is sent.",
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
