import type { Metadata } from "next";
import { Source_Serif_4 } from "next/font/google";
import "./globals.css";
import { SCHOOL_NAME } from "@/lib/constants";

// Self-hosted at build time, so the school network never fetches it at runtime.
const serif = Source_Serif_4({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-serif-loaded",
});

export const metadata: Metadata = {
  title: {
    default: `${SCHOOL_NAME} · CAS Portal`,
    template: `%s · ${SCHOOL_NAME} CAS`,
  },
  description:
    "Creativity, Activity, Service — plan experiences, write reflections and track your progress.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={serif.variable}>
      <body>{children}</body>
    </html>
  );
}
