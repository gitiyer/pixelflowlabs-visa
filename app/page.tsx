// import Image from "next/image";
import VisaEditor from "@/components/VisaEditor";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 flex flex-col">
      <nav className="flex items-center justify-center md:justify-start px-6 py-6 max-w-7xl mx-auto w-full shrink-0">
        <div className="flex items-center gap-3">
          <a href="https://www.thepixelflowlabs.com/" className="relative w-48 md:w-64 transition-transform hover:scale-105">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-transparent.png"
              alt="PixelFlow Labs Logo"
              className="object-contain w-full h-auto"
            />
          </a>
        </div>
      </nav>

      <div className="flex-1">
        <VisaEditor />

        {/* SEO Content: FAQ Section */}
        <section className="max-w-4xl mx-auto px-6 py-16">
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "SoftwareApplication",
                name: "PixelFlow Visa Tool",
                applicationCategory: "UtilityApplication",
                operatingSystem: "Browser",
                offers: {
                  "@type": "Offer",
                  price: "99",
                  priceCurrency: "INR",
                },
              }),
            }}
          />

          <h2 className="text-2xl font-bold text-slate-900 mb-8 text-center">Frequently Asked Questions</h2>

          <div className="space-y-8">
            <article>
              <h3 className="text-lg font-bold text-slate-800 mb-2">How do I take a US Visa photo at home?</h3>
              <p className="text-slate-600 leading-relaxed">
                Use good lighting, preferably natural daylight. Stand against a white wall or let our tool remove the background for you. Ensure you are not wearing glasses and have a neutral expression.
              </p>
            </article>

            <article>
              <h3 className="text-lg font-bold text-slate-800 mb-2">Is this tool compliant with State Department rules?</h3>
              <p className="text-slate-600 leading-relaxed">
                Yes. We automatically force the 600x600px 1:1 aspect ratio, verify head size, and apply a pure white background to meet strict US Department of State requirements.
              </p>
            </article>

            <article>
              <h3 className="text-lg font-bold text-slate-800 mb-2">Is my photo uploaded?</h3>
              <p className="text-slate-600 leading-relaxed">
                No. Everything happens in your browser for 100% privacy. Your personal biometric data never leaves your device.
              </p>
            </article>
          </div>
        </section>
      </div>
    </main>
  );
}
