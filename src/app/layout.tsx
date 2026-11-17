import "./globals.css";
import Link from "next/link";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "ReEat — Good food, wasted never.",
  description: "Same-day surplus food at a discount, pickup only, in Muscat, Oman.",
  manifest: "/manifest.webmanifest",
};
export const viewport: Viewport = { themeColor: "#0d9488" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="top">
          <Link className="brand" href="/">ReEat<span> — Good food, wasted never.</span></Link>
          <Link href="/">Rescue board</Link>
          <Link href="/pickups">My Pickups</Link>
          <Link href="/favourites">Favourites</Link>
          <Link href="/partner">Partner</Link>
          <Link href="/admin">Admin</Link>
          <Link href="/help">Help</Link>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
