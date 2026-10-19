import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Memory Exchange · NIGHTSHIFT", description: "Experience becomes an asset. An independent memory marketplace for agents, companies and the IMD ecosystem.", icons: { icon: "/favicon.svg" } };
export default function RootLayout({children}: Readonly<{children: React.ReactNode}>) { return <html lang="en"><body>{children}</body></html>; }
