// import Image from "next/image";
import VisaEditor from "@/components/VisaEditor";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 flex flex-col">
      <header className="px-6 py-8 bg-transparent">
        <div className="max-w-6xl mx-auto flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-transparent.png"
            alt="PixelFlow Logo"
            className="h-24 w-auto object-contain"
          />
        </div>
      </header>

      <div className="flex-1">
        <VisaEditor />
      </div>
    </main>
  );
}
