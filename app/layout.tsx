import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LABUBU Seeding Chatbox",
  description: "A bilingual Labubu media-seeding chatbox that lets users type messages and receive simulated research-based replies.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
