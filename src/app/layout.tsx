import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "CAS Portal",
    template: "%s · CAS Portal",
  },
  description:
    "Creativity, Activity, Service — plan experiences, write reflections and track your progress.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
