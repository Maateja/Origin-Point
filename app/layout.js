import localFont from "next/font/local";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";
import "./glass-system.css";
import { AuthCacheBoundary } from "@/components/platform/auth-cache-boundary";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata = {
  title: {
    default: "Origin Point — Academia–Industry Collaboration Portal",
    template: "%s | Origin Point",
  },
  description:
    "Origin Point connects academia and industry through assessments, internship matching, digital portfolios, and placement analytics on one platform.",
  keywords: [
    "skill assessment",
    "internship matching",
    "academia industry collaboration",
    "digital portfolio",
    "placement analytics",
  ],
  icons: {
    icon: [{ url: "/logo.png", type: "image/png" }],
    apple: [{ url: "/logo.png", type: "image/png" }],
    shortcut: "/logo.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          disableTransitionOnChange
        >
          <AuthCacheBoundary>{children}</AuthCacheBoundary>
        </ThemeProvider>
      </body>
    </html>
  );
}
