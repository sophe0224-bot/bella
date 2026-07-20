import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Labubu Chatbox — A Tiny, Toothy Welcome",
  description: "A delightfully loud welcome from five adorable animated Labubus.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
