import Link from "next/link";
import { ShieldCheck, Lock, EyeOff } from "lucide-react";

export default function PrivacyPolicy() {
    return (
        <main className="min-h-screen bg-slate-50 font-sans">
            <div className="max-w-4xl mx-auto px-6 py-12">
                <Link href="/" className="text-blue-600 font-medium hover:underline mb-8 block">
                    &larr; Back to Editor
                </Link>

                <h1 className="text-3xl font-bold text-slate-900 mb-2">Privacy Policy</h1>
                <p className="text-slate-500 mb-8">Last Updated: {new Date().toLocaleDateString()}</p>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mb-8">
                    <div className="flex items-start gap-4 mb-8">
                        <div className="p-3 bg-green-100 text-green-700 rounded-full">
                            <ShieldCheck className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 mb-2">1. Local Processing (No Server Uploads)</h2>
                            <p className="text-slate-600 leading-relaxed">
                                Pixelflow Labs prioritizes your privacy above all else. Unlike other services, <strong>we do not upload your photos to our servers for processing.</strong> All background removal and image cropping happen entirely within your browser (Client-Side) using advanced WebAssembly technology. Your personal photos never leave your device.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-start gap-4 mb-8">
                        <div className="p-3 bg-blue-100 text-blue-700 rounded-full">
                            <Lock className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 mb-2">2. Secure Payments</h2>
                            <p className="text-slate-600 leading-relaxed">
                                Payments are processed securely via <strong>Razorpay</strong>, a trusted industry leader. We do not store or have access to your credit card information, bank details, or UPI credentials. All transactions are encrypted and processed directly by Razorpay&apos;s secure infrastructure.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-purple-100 text-purple-700 rounded-full">
                            <EyeOff className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 mb-2">3. Data Collection</h2>
                            <p className="text-slate-600 leading-relaxed">
                                We collect minimal data necessary for operation:
                            </p>
                            <ul className="list-disc list-inside mt-2 text-slate-600 space-y-1 ml-2">
                                <li>Payment confirmation status (to unlock downloads).</li>
                                <li>Anonymous usage analytics to improve site performance.</li>
                            </ul>
                            <p className="mt-2 text-slate-600">
                                We do not sell, trade, or rent your personal identification information to others.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
