import type { Metadata } from "next";
import { Geist, Geist_Mono, Grenze_Gotisch, IM_Fell_English, IM_Fell_English_SC } from "next/font/google";
import { bootScript } from "./_front-page/boot-script";
import { newYorkDate, weekStart } from "@/lib/owl-post/dates";
import "./globals.css";

// Three voices: blackletter is the school (the wordmark), Fell is people (prompts,
// captions, letters, labels), Geist is the interface (points, counters, hints).
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const grenze = Grenze_Gotisch({
  variable: "--font-grenze",
  weight: "800",
  subsets: ["latin"],
});

const fell = IM_Fell_English({
  variable: "--font-fell",
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
});

const fellSmallCaps = IM_Fell_English_SC({
  variable: "--font-fell-sc",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Hog Wumbia",
  description: "Columbia humour, delivered by owl. One prompt a week, captioned by a wizarding-world cast. Vote for your house.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // The front page's boot script sets the scene scale and intro flag on <html> before hydration.
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${grenze.variable} ${fell.variable} ${fellSmallCaps.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* Must run before the front page paints; it does nothing on other pages. */}
        <script dangerouslySetInnerHTML={{ __html: bootScript(weekStart(newYorkDate(new Date()))) }} />
        {children}
      </body>
    </html>
  );
}
