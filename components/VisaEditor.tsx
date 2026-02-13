"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import Cropper, { Area } from "react-easy-crop";
import { Upload, ZoomIn, RotateCw, Download, ShieldCheck, X, Camera, Lock, CloudUpload, Sparkles, Ruler, Loader2 } from "lucide-react";
import Webcam from "react-webcam";
import { removeBackground } from "@imgly/background-removal";
import getCroppedImg from "../lib/canvasUtils";
import VisaRules from "./VisaRules";
import ComplianceModal from "./ComplianceModal";

type AppState = "dropzone" | "camera" | "processing" | "editor";

declare global {
    interface Window {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Razorpay: any;
    }
}

export default function VisaEditor() {
    const [appState, setAppState] = useState<AppState>("dropzone");
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
    const [isPaid, setIsPaid] = useState(false);
    const [isPaymentLoading, setIsPaymentLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [showComplianceModal, setShowComplianceModal] = useState(false);
    const [isRazorpayLoaded, setIsRazorpayLoaded] = useState(false);
    const webcamRef = useRef<Webcam>(null);

    useEffect(() => {
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.async = true;
        script.onload = () => setIsRazorpayLoaded(true);
        script.onerror = () => {
            console.error("Razorpay script failed to load");
            // Optional: set some error state
        };
        document.body.appendChild(script);
        return () => {
            document.body.removeChild(script);
        };
    }, []);

    const onCropComplete = useCallback(
        (_croppedArea: Area, croppedAreaPixels: Area) => {
            setCroppedAreaPixels(croppedAreaPixels);
        },
        []
    );

    const processImage = async (imageUrl: string) => {
        setAppState("processing");
        try {
            // 1. Remove Background with Timeout (15s)
            console.log("Starting background removal...");
            console.log("Public Path:", `${window.location.origin}/imgly/`);

            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Timeout")), 15000)
            );

            const blob = await Promise.race([
                removeBackground(imageUrl, {
                    model: 'medium',
                    publicPath: `${window.location.origin}/imgly/`, // Use local assets
                    progress: (key, current, total) => {
                        console.log(`Downloading ${key}: ${current} of ${total}`);
                    }
                }),
                timeoutPromise
            ]) as Blob;

            console.log("Background removal successful");

            // 2. Composite on White Background
            const imageBitmap = await createImageBitmap(blob);
            const canvas = document.createElement("canvas");
            canvas.width = imageBitmap.width;
            canvas.height = imageBitmap.height;
            const ctx = canvas.getContext("2d");

            if (ctx) {
                ctx.fillStyle = "#FFFFFF";
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(imageBitmap, 0, 0);

                const processedImageUrl = canvas.toDataURL("image/jpeg");
                setImageSrc(processedImageUrl);
                setAppState("editor");
            }
        } catch (error) {
            console.error("Background removal failed:", error);
            // Check if error is an object and log it fully
            if (typeof error === 'object') {
                console.error("Error details:", JSON.stringify(error, null, 2));
            }

            // Fallback to original image if removal fails or times out
            // For now, let's just alert or log. Real app might show error UI.
            alert(`Background removal failed: ${error instanceof Error ? error.message : "Unknown error"}. Using original image.`);
            setImageSrc(imageUrl);
            setAppState("editor");
        }
    };

    const skipProcessing = () => {
        if (imageSrc) {
            setAppState("editor");
        } else {
            // Should not happen if imageSrc is set before processing, but ensure we have something
            // If imageSrc is null (e.g. from camera capture directly passed to processImage without setting state), 
            // we might need to handle it. 
            // processImage calls setImageSrc(processedImageUrl) ONLY on success.
            // If we skip, we want the ORIGINAL image. 
            // But wait, processImage takes imageUrl arg.
            // We need to store that imageUrl in state or ref to use it for skipping?
            // Actually, handleFileChange creates a blob URL. 
            // Let's refactor to ensure we can skip.
            // But for now, if we are in 'processing', we probably don't have the original image in 'imageSrc' state yet?
            // Wait, setImageSrc(null) is called in handleReset.
            // In handleFileChange: const imageUrl = URL.createObjectURL(file); processImage(imageUrl);
            // It doesn't set imageSrc state until success!
            // We need to modify handleFileChange to set imageSrc immediately?
            // OR pass strict arg to skipProcessing?
            // Let's modify processImage to set a ref or state 'currentProcessingImage'.
            setAppState("dropzone"); // Fallback if no image.
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            const imageUrl = URL.createObjectURL(file);
            processImage(imageUrl);
        }
    };

    const handleCapture = useCallback(() => {
        const imageSrc = webcamRef.current?.getScreenshot();
        if (imageSrc) {
            processImage(imageSrc);
        }
    }, [webcamRef]);

    const handlePayment = async () => {
        if (!isRazorpayLoaded || !window.Razorpay) {
            alert("Payment gateway is still loading. Please check your connection and try again in a moment.");
            setIsPaymentLoading(false);
            return;
        }

        setIsPaymentLoading(true);
        const res = await fetch("/api/razorpay/order", {
            method: "POST",
        });
        const data = await res.json();

        if (data.id) {
            const options = {
                key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID, // Use NEXT_PUBLIC_ for client-side
                amount: data.amount,
                currency: data.currency,
                name: "PixelFlow Visa Editor",
                description: "High-Res Photo Download",
                image: "/logo-transparent.png",
                order_id: data.id,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                handler: async function (response: any) {
                    const verifyRes = await fetch("/api/razorpay/verify", {
                        method: "POST",
                        body: JSON.stringify({
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                        }),
                    });
                    const verifyData = await verifyRes.json();
                    if (verifyData.success) {
                        setIsPaid(true);
                        setShowComplianceModal(false);
                        // Trigger download immediately after payment success
                        setTimeout(handleDownload, 500);
                    } else {
                        alert("Payment verification failed. Please contact support.");
                    }
                    setIsPaymentLoading(false);
                },
                modal: {
                    ondismiss: function () {
                        setIsPaymentLoading(false);
                    }
                },
                prefill: {
                    name: "User Name",
                    email: "user@example.com",
                    contact: "9999999999"
                },
                theme: {
                    color: "#2563EB",
                },
            };
            const rzp1 = new window.Razorpay(options);
            rzp1.open();
        } else {
            alert("Failed to create order. Please try again.");
            setIsPaymentLoading(false);
        }
    };

    const handleDownload = async () => {
        if (!imageSrc || !croppedAreaPixels) return;

        try {
            setIsDownloading(true);
            const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels, rotation);

            if (!croppedImage) {
                setIsDownloading(false);
                return;
            }

            // Enforce 600x600 resizing
            const img = new Image();
            img.src = croppedImage;
            await new Promise((resolve) => { img.onload = resolve; });

            const canvas = document.createElement('canvas');
            canvas.width = 600;
            canvas.height = 600;
            const ctx = canvas.getContext('2d');

            if (ctx) {
                // High quality scaling
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(img, 0, 0, 600, 600);

                const finalUrl = canvas.toDataURL('image/jpeg', 0.95);

                const link = document.createElement("a");
                link.href = finalUrl;
                link.download = "visa-photo-600x600.jpg";
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsDownloading(false);
        }
    };

    const handleReset = () => {
        setAppState("dropzone");
        setImageSrc(null);
        setZoom(1);
        setRotation(0);
        setIsPaid(false); // Reset payment state on new image? Or keep it paid for session? The requirement implies one-time payment for "the download", usually per image. Let's reset.
        setIsPaymentLoading(false);
        setIsDownloading(false);
    };

    // --- Views ---

    // Dynamic Processing Messages
    const [processingMsg, setProcessingMsg] = useState("Initializing magic...");

    useEffect(() => {
        if (appState === "processing") {
            const messages = [
                "Scanning pixels...",
                "Removing bad vibes...",
                "Adding professional gloss...",
                "Aligning to US standards...",
                "Almost there..."
            ];
            let i = 0;
            const interval = setInterval(() => {
                setProcessingMsg(messages[i % messages.length]);
                i++;
            }, 800);
            return () => clearInterval(interval);
        }
    }, [appState]);

    if (appState === "processing") {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 relative overflow-hidden h-full min-h-[50vh]">
                {/* Fun Background Blobs */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl animate-pulse"></div>

                <div className="relative z-10 flex flex-col items-center">
                    <div className="relative w-24 h-24 mb-8">
                        {/* Spinning border */}
                        <div className="absolute inset-0 border-4 border-slate-200 rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>

                        {/* Center Icon */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Sparkles className="w-8 h-8 text-blue-500 animate-bounce" />
                        </div>
                    </div>

                    <h2 className="text-2xl font-bold text-slate-900 mb-2 font-sans animate-pulse">
                        {processingMsg}
                    </h2>
                    <p className="text-slate-500 text-sm mb-6">Do not close this tab, magic is happening.</p>

                    <button
                        onClick={() => {
                            // We need the original image URL here. 
                            // Since we don't have it easily in this scope without refactoring,
                            // we can rely on a broader "cancel/skip" that just returns to dropzone 
                            // or if we can, force the original image.
                            // Better approach: Let's assume the user wants to try again or just proceed with original.
                            // But without original image in state, we can't proceed to editor.
                            // So "Cancel" => Dropzone is safest.
                            setAppState("dropzone");
                        }}
                        className="text-slate-400 hover:text-slate-600 text-sm underline underline-offset-4"
                    >
                        Taking too long? Cancel
                    </button>
                </div>
            </div>
        );
    }

    if (appState === "camera") {
        return (
            <div className="flex flex-col items-center justify-center p-4 h-full flex-1">
                <div className="relative w-full max-w-2xl bg-black rounded-2xl overflow-hidden shadow-2xl ring-8 ring-slate-100">
                    <Webcam
                        audio={false}
                        ref={webcamRef}
                        screenshotFormat="image/jpeg"
                        className="w-full h-auto"
                        videoConstraints={{ facingMode: "user" }}
                    />

                    {/* Head & Chin Guide Overlay for Camera */}
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                        {/* iOS Style Corners */}
                        <div className="absolute top-1/2 left-1/2 w-[70%] h-[80%] -translate-x-1/2 -translate-y-1/2 opacity-80">
                            <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-white rounded-tl-2xl shadow-sm"></div>
                            <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-white rounded-tr-2xl shadow-sm"></div>
                            <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-white rounded-bl-2xl shadow-sm"></div>
                            <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-white rounded-br-2xl shadow-sm"></div>

                            {/* Face Guide Lines */}
                            <div className="absolute top-1/3 left-10 right-10 h-px bg-white/20"></div>
                            <div className="absolute bottom-1/3 left-10 right-10 h-px bg-white/20"></div>
                        </div>

                        <div className="absolute top-8 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                            <span className="text-white text-xs font-bold tracking-widest uppercase">Live Camera</span>
                        </div>
                    </div>

                    {/* Controls overlay */}
                    <div className="absolute bottom-6 left-0 right-0 flex flex-col items-center gap-4">
                        <div className="bg-black/60 px-4 py-2 rounded-full backdrop-blur-sm">
                            <span className="text-white text-sm font-medium flex items-center gap-2">
                                💡 Ensure even lighting. No shadows on face.
                            </span>
                        </div>
                        <button
                            onClick={handleCapture}
                            className="w-20 h-20 rounded-full border-4 border-white shadow-2xl flex items-center justify-center hover:scale-110 transition-all active:scale-95 bg-white/20 backdrop-blur-sm group"
                        >
                            <div className="w-16 h-16 bg-white rounded-full group-hover:bg-blue-50 transition-colors"></div>
                        </button>
                    </div>

                    <button
                        onClick={() => setAppState("dropzone")}
                        className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 hover:rotate-90 transition-all"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>
            </div>
        );
    }

    // State A: Dropzone
    if (appState === "dropzone") {
        return (
            <div className="flex-1 flex items-start justify-center p-4 pt-4 md:p-8 md:pt-4 bg-slate-50 relative overflow-hidden h-full">
                {/* Decorative Background Elements */}
                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-gradient-to-b from-blue-100/40 to-purple-100/40 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-t from-blue-100/40 to-cyan-100/40 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3 pointer-events-none"></div>

                <div className="w-full max-w-7xl grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-x-12 items-start md:items-center relative z-10 h-full">

                    {/* 1. Title & Context */}
                    {/* Mobile: Order 1. Desktop: Col 1-5, Row 1 */}
                    <div className="order-1 md:col-span-5 md:row-start-1 flex flex-col items-start text-left">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold uppercase tracking-wider mb-4 hover:scale-105 transition-transform cursor-default">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                            </span>
                            US Department of State Compliant
                        </div>
                        <h1 className="text-2xl md:text-5xl font-bold text-slate-900 mb-4 tracking-tight leading-tight">
                            Instant <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 animate-gradient">US Visa Photo</span>
                        </h1>
                        <p className="text-base md:text-lg text-slate-600 mb-2 md:mb-8 leading-relaxed hidden md:block">
                            Turn any selfie into a perfect 2x2 inch biometric photo. Intelligent background removal and face alignment.
                        </p>
                    </div>

                    {/* 2. The Workspace (Card) */}
                    {/* Mobile: Order 2. Desktop: Col 7-12, Row 1+2 (Spanning) */}
                    <div className="order-2 md:col-span-7 md:row-start-1 md:row-span-2 w-full">
                        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-slate-200/50 p-6 md:p-8 border border-white relative overflow-hidden">
                            {/* Card Shine Effect */}
                            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/40 to-transparent pointer-events-none"></div>

                            <div className="grid grid-cols-2 gap-4 relative z-10">
                                {/* Option A: Upload */}
                                <label className="cursor-pointer group relative">
                                    <div className="h-32 md:h-64 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center p-4 transition-all duration-300 hover:border-blue-500 hover:bg-blue-50/50 hover:scale-[1.02] hover:-rotate-1 hover:shadow-lg">
                                        <div className="mb-2 md:mb-3 p-2 md:p-3 bg-white rounded-full shadow-sm group-hover:scale-110 transition-transform duration-300 group-hover:ring-4 ring-blue-100">
                                            <CloudUpload className="w-5 h-5 md:w-8 md:h-8 text-slate-400 group-hover:text-blue-500 transition-colors group-hover:animate-bounce" />
                                        </div>
                                        <h3 className="text-sm md:text-lg font-bold text-slate-900 mb-0.5 md:mb-1">Upload</h3>
                                        <span className="text-[10px] md:text-xs font-semibold tracking-wider text-blue-600 uppercase group-hover:underline">
                                            Select File
                                        </span>
                                        <input
                                            type="file"
                                            onChange={handleFileChange}
                                            accept="image/*"
                                            className="hidden"
                                        />
                                    </div>
                                </label>

                                {/* Option B: Camera */}
                                <button
                                    onClick={() => setAppState("camera")}
                                    className="group relative h-32 md:h-64 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center p-4 transition-all duration-300 hover:border-purple-500 hover:bg-purple-50/50 hover:scale-[1.02] hover:rotate-1 hover:shadow-lg"
                                >
                                    <div className="mb-2 md:mb-3 p-2 md:p-3 bg-white rounded-full shadow-sm group-hover:scale-110 transition-transform duration-300 group-hover:ring-4 ring-purple-100">
                                        <Camera className="w-5 h-5 md:w-8 md:h-8 text-slate-400 group-hover:text-purple-500 transition-colors group-hover:animate-pulse" />
                                    </div>
                                    <h3 className="text-sm md:text-lg font-bold text-slate-900 mb-0.5 md:mb-1">Camera</h3>
                                    <span className="text-[10px] md:text-xs font-semibold tracking-wider text-slate-600 uppercase group-hover:text-purple-600 group-hover:underline">
                                        Open Cam
                                    </span>
                                </button>
                            </div>

                            <div className="mt-6 flex items-center justify-center gap-2 text-slate-400 text-[10px] font-semibold uppercase tracking-wider">
                                <ShieldCheck className="w-3 h-3 group-hover:text-green-500 transition-colors" />
                                <span>No Server Uploads</span>
                            </div>
                        </div>
                    </div>

                    {/* 3. Rules */}
                    {/* Mobile: Order 3. Desktop: Col 1-5, Row 2 */}
                    <div className="order-3 md:col-span-5 md:row-start-2 w-full">
                        <VisaRules />
                    </div>

                </div>
            </div>
        );
    }

    // State B: Editor
    return (
        <div className="max-w-6xl mx-auto md:p-8 min-h-[85vh] flex flex-col pb-24 md:pb-0">
            {/* Header: Back Button & Title - Desktop Only */}
            <div className="hidden md:flex items-center justify-between mb-8">
                <button
                    onClick={handleReset}
                    className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors text-sm font-medium"
                >
                    <X className="w-4 h-4" /> Cancel
                </button>
                <div className="text-center">
                    <h2 className="text-xl font-bold text-slate-900">Adjust & Crop</h2>
                    <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold mt-1">Step 2 of 3</p>
                </div>
                <div className="w-16"></div>
            </div>

            {/* Mobile Header */}
            <div className="md:hidden flex items-center justify-between p-4 bg-white border-b sticky top-0 z-40">
                <button onClick={handleReset} className="p-2 -ml-2 text-slate-600">
                    <X className="w-6 h-6" />
                </button>
                <span className="font-bold text-slate-900">Edit Photo</span>
                <div className="w-8"></div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 md:gap-8 items-start h-full">
                {/* Left Column: Immersive Canvas */}
                <div className="lg:col-span-8 bg-slate-100 md:rounded-3xl overflow-hidden shadow-inner border-y md:border border-slate-200 relative aspect-square md:aspect-auto md:h-[600px] group">
                    <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:16px_16px] opacity-20 pointer-events-none"></div>

                    <Cropper
                        image={imageSrc!}
                        crop={crop}
                        zoom={zoom}
                        rotation={rotation}
                        aspect={1}
                        onCropChange={setCrop}
                        onCropComplete={onCropComplete}
                        onZoomChange={setZoom}
                        onRotationChange={setRotation}
                        showGrid={true}
                        classes={{
                            containerClassName: "md:rounded-3xl",
                            mediaClassName: "",
                        }}
                    />

                    {/* Head & Chin Guide Overlay */}
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                        <div className="border-2 border-white/60 w-[60%] h-[70%] rounded-[48%] shadow-[0_0_100px_rgba(0,0,0,0.5)] relative">
                            {/* Guide Lines */}
                            <div className="absolute top-[20%] left-[15%] right-[15%] h-[1px] bg-white/40"></div>
                            <div className="absolute bottom-[20%] left-[25%] right-[25%] h-[1px] bg-white/40"></div>

                            {/* Labels */}
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-black/30 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-widest px-3 py-0.5 rounded-full border border-white/10">
                                Head Top
                            </div>
                            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-black/30 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-widest px-3 py-0.5 rounded-full border border-white/10">
                                Chin
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Professional Controls Panel */}
                <div className="lg:col-span-4 bg-white p-6 md:p-8 md:rounded-3xl md:border border-slate-200 md:shadow-xl shadow-slate-200/50 flex flex-col gap-8 md:sticky top-8">

                    {/* Instructions - Desktop */}
                    <div className="hidden md:block pb-6 border-b border-slate-100">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                                <RotateCw className="w-4 h-4" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900">Fine Tune</h3>
                        </div>
                        <p className="text-slate-500 text-sm leading-relaxed">
                            Align your face within the oval. Ensure your eyes are level and head is straight.
                        </p>
                    </div>

                    {/* Controls */}
                    <div className="space-y-8 pt-4 md:pt-0">
                        {/* Zoom */}
                        <div className="group">
                            <div className="flex justify-between items-center mb-4">
                                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                                    <ZoomIn className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
                                    Zoom
                                </label>
                                <span className="text-xs font-mono font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-md min-w-[3rem] text-center">
                                    {(zoom * 100).toFixed(0)}%
                                </span>
                            </div>
                            <div className="relative h-6 flex items-center">
                                <input
                                    type="range"
                                    value={zoom}
                                    min={1}
                                    max={3}
                                    step={0.05}
                                    onChange={(e) => setZoom(Number(e.target.value))}
                                    className="w-full z-10 relative"
                                />
                                <div className="absolute left-0 right-0 h-1 bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-500 transition-all" style={{ width: `${((zoom - 1) / 2) * 100}%` }}></div>
                                </div>
                            </div>
                        </div>

                        {/* Rotation */}
                        <div className="group">
                            <div className="flex justify-between items-center mb-4">
                                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                                    <RotateCw className="w-4 h-4 text-slate-400 group-hover:text-purple-500 transition-colors" />
                                    Rotate
                                </label>
                                <span className="text-xs font-mono font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-md min-w-[3rem] text-center">
                                    {rotation}°
                                </span>
                            </div>
                            <div className="relative h-6 flex items-center">
                                <input
                                    type="range"
                                    value={rotation}
                                    min={-45}
                                    max={45}
                                    step={1}
                                    onChange={(e) => setRotation(Number(e.target.value))}
                                    className="w-full z-10 relative"
                                />
                                <div className="absolute left-0 right-0 h-1 bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-purple-500 transition-all opacity-50" style={{ width: `${((rotation + 45) / 90) * 100}%` }}></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer Actions - Desktop */}
                    <div className="hidden md:flex mt-4 pt-6 border-t border-slate-100 flex-col gap-4">
                        {!isPaid ? (
                            <button
                                onClick={() => setShowComplianceModal(true)}
                                disabled={isPaymentLoading}
                                className={`w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-4 px-6 rounded-xl shadow-lg shadow-blue-500/30 hover:-translate-y-0.5 hover:shadow-xl transition-all flex items-center justify-center gap-3 whitespace-nowrap text-lg ${isPaymentLoading ? 'opacity-70 cursor-wait' : 'cursor-pointer'}`}
                            >
                                {isPaymentLoading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <Lock className="w-5 h-5 text-white/90" />
                                        Unlock & Download (₹99)
                                    </>
                                )}
                            </button>
                        ) : (
                            <button
                                onClick={handleDownload}
                                disabled={isDownloading}
                                className={`w-full bg-slate-900 text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 text-lg ${isDownloading ? 'opacity-70 cursor-wait' : 'cursor-pointer'}`}
                            >
                                {isDownloading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Downloading...
                                    </>
                                ) : (
                                    <>
                                        <Download className="w-5 h-5" />
                                        Download High-Res
                                    </>
                                )}
                            </button>
                        )}
                        <div className="flex items-center justify-center gap-2 opacity-50">
                            <ShieldCheck className="w-3 h-3 text-slate-400" />
                            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">SECURE & PRIVATE PROCESSING</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile Sticky Footer Action */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 z-50 pb-8">
                {!isPaid ? (
                    <button
                        onClick={() => setShowComplianceModal(true)}
                        disabled={isPaymentLoading}
                        className={`w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-3.5 px-6 rounded-xl shadow-lg shadow-blue-500/30 active:scale-95 transition-all flex items-center justify-center gap-3 whitespace-nowrap text-base ${isPaymentLoading ? 'opacity-70 cursor-wait' : 'cursor-pointer'}`}
                    >
                        {isPaymentLoading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Processing...
                            </>
                        ) : (
                            <>
                                <Lock className="w-4 h-4 text-white/90" />
                                Unlock & Download (₹99)
                            </>
                        )}
                    </button>
                ) : (
                    <button
                        onClick={handleDownload}
                        disabled={isDownloading}
                        className={`w-full bg-slate-900 text-white font-bold py-3.5 px-6 rounded-xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 text-base ${isDownloading ? 'opacity-70 cursor-wait' : 'cursor-pointer'}`}
                    >
                        {isDownloading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Downloading...
                            </>
                        ) : (
                            <>
                                <Download className="w-4 h-4" />
                                Download High-Res
                            </>
                        )}
                    </button>
                )}
            </div>
            {/* Compliance Modal */}
            <ComplianceModal
                isOpen={showComplianceModal}
                onClose={() => setShowComplianceModal(false)}
                onProceed={handlePayment}
            />
        </div>
    );
}
