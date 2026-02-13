import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import Footer from "@/components/Footer";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "US Visa Photo Tool - Instant & Privacy-First",
    template: "%s | PixelFlow Labs",
  },
  description: "Generate 100% compliant US Visa & Passport photos online. Automatic background removal, crop, and validation. Secure local processing—no uploads.",
  keywords: ["US visa photo", "passport photo maker", "visa photo cropper", "2x2 photo generator", "biometric photo tool"],
  openGraph: {
    images: "/logo-full.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${montserrat.variable} antialiased flex flex-col min-h-screen`}
      >
        {children}
        <Footer />
      </body>
    </html>
  );
}
