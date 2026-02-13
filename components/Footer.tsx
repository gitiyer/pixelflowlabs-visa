import Link from "next/link";

export default function Footer() {
    return (
        <footer className="bg-white border-t border-slate-200 mt-auto">
            <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="text-slate-500 text-sm">
                    &copy; {new Date().getFullYear()} PixelFlow Labs. All rights reserved.
                </div>
                <ul className="flex space-x-6 text-sm font-medium text-slate-600">
                    <li>
                        <Link href="/privacy-policy" className="hover:text-blue-600 transition-colors">
                            Privacy Policy
                        </Link>
                    </li>
                </ul>
            </div>
        </footer>
    );
}
