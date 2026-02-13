// import Image from "next/image";
import VisaEditor from "@/components/VisaEditor";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 flex flex-col">
      <header className="px-6 py-4 border-b border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-transparent.png"
              alt="PixelFlow Logo"
              className="h-16 w-auto object-contain"
            />
            {/* <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
               PixelFlow Visa
            </span> */}
          </div>
        </div>
      </header>

      <div className="flex-1">
        <VisaEditor />
      </div>
    </main>
  );
}
