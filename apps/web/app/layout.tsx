import type { Metadata } from "next";
import "./globals.css";

const defaultUrl = "https://speedpay-pikl.vercel.app";
const appUrl =
  process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : defaultUrl);

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "SPEED PAY - Smart Investment & Task Platform",
    template: "%s | SPEED PAY",
  },
  description:
    "Discover high-yield plans, complete daily tasks, earn rewards, and enjoy fast, secure withdrawals with SPEED PAY.",
  applicationName: "SPEED PAY",
  keywords: [
    "SPEED PAY",
    "speedpay",
    "investment platform",
    "daily earnings",
    "earn money online",
    "tasks",
  ],
  authors: [{ name: "SPEED PAY Corp" }],
  creator: "SPEED PAY Corp",
  publisher: "SPEED PAY Corp",
  icons: {
    icon: [
      { url: "/logo.jpeg", sizes: "any", type: "image/jpeg" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    shortcut: "/logo.jpeg",
    apple: "/logo.jpeg",
  },
  openGraph: {
    title: "SPEED PAY - Smart Investment & Task Platform",
    description:
      "Discover high-yield plans, complete daily tasks, earn rewards, and enjoy fast, secure withdrawals with SPEED PAY.",
    url: appUrl,
    siteName: "SPEED PAY",
    images: [
      {
        url: "/logo.jpeg",
        width: 1080,
        height: 1080,
        alt: "SPEED PAY Logo",
        type: "image/jpeg",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SPEED PAY - Smart Investment & Task Platform",
    description:
      "Discover high-yield plans, complete daily tasks, earn rewards, and enjoy fast, secure withdrawals with SPEED PAY.",
    images: ["/logo.jpeg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta property="og:title" content="SPEED PAY - Smart Investment & Task Platform" />
        <meta
          property="og:description"
          content="Discover high-yield plans, complete daily tasks, earn rewards, and enjoy fast, secure withdrawals with SPEED PAY."
        />
        <meta property="og:image" content={`${appUrl}/logo.jpeg`} />
        <meta property="og:image:secure_url" content={`${appUrl}/logo.jpeg`} />
        <meta property="og:image:type" content="image/jpeg" />
        <meta property="og:image:width" content="1080" />
        <meta property="og:image:height" content="1080" />
        <meta property="og:image:alt" content="SPEED PAY Logo" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="SPEED PAY" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="SPEED PAY - Smart Investment & Task Platform" />
        <meta
          name="twitter:description"
          content="Discover high-yield plans, complete daily tasks, earn rewards, and enjoy fast, secure withdrawals with SPEED PAY."
        />
        <meta name="twitter:image" content={`${appUrl}/logo.jpeg`} />

        <link rel="icon" type="image/jpeg" href="/logo.jpeg" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/logo.jpeg" />
      </head>
      <body>{children}</body>
    </html>
  );
}
