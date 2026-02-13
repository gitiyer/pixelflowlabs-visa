"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import Cropper, { Area } from "react-easy-crop";
import { Upload, ZoomIn, RotateCw, Download, ShieldCheck, X, Camera, Lock, CloudUpload, Sparkles, Ruler } from "lucide-react";
import Webcam from "react-webcam";
import { removeBackground } from "@imgly/background-removal";
import getCroppedImg from "../lib/canvasUtils";
import VisaRules from "./VisaRules";

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
    const webcamRef = useRef<Webcam>(null);

    useEffect(() => {
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.async = true;
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
            // 1. Remove Background
            const blob = await removeBackground(imageUrl, {
                model: 'isnet',
                progress: (key, current, total) => {
                    console.log(`Downloading ${key}: ${current} of ${total}`);
                }
            });

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
            // Fallback to original image if removal fails? 
            // For now, let's just alert or log. Real app might show error UI.
            alert("Background removal failed. Using original image.");
            setImageSrc(imageUrl);
            setAppState("editor");
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
                        // Trigger download immediately after payment success
                        setTimeout(handleDownload, 500);
                    } else {
                        alert("Payment verification failed. Please contact support.");
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
        }
    };

    const handleDownload = async () => {
        if (!imageSrc || !croppedAreaPixels) return;

        try {
            const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels, rotation);

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
        }
    };

    const handleReset = () => {
        setAppState("dropzone");
        setImageSrc(null);
        setZoom(1);
        setRotation(0);
        setIsPaid(false); // Reset payment state on new image? Or keep it paid for session? The requirement implies one-time payment for "the download", usually per image. Let's reset.
    };

    // --- Views ---

    if (appState === "processing") {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 bg-slate-50">
                <div className="relative w-20 h-20 mb-8">
                    <div className="absolute inset-0 border-4 border-slate-200 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-2 font-sans">Processing Image</h2>
                <p className="text-slate-500 text-sm">Removing background & optimizing...</p>
            </div>
        );
    }

    if (appState === "camera") {
        return (
            <div className="flex flex-col items-center justify-center p-4 min-h-[80vh]">
                <div className="relative w-full max-w-2xl bg-black rounded-2xl overflow-hidden shadow-xl">
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

                        <div className="absolute top-8 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full">
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
                            className="w-20 h-20 rounded-full border-4 border-white shadow-2xl flex items-center justify-center hover:scale-105 transition-transform active:scale-95 bg-white/20 backdrop-blur-sm"
                        >
                            <div className="w-16 h-16 bg-white rounded-full"></div>
                        </button>
                    </div>

                    <button
                        onClick={() => setAppState("dropzone")}
                        className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full hover:bg-black/70"
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
            <div className="max-w-5xl mx-auto p-6 min-h-[80vh] flex flex-col">
                {/* 1. Hero Section */}
                <div className="text-center mb-16 pt-8">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold uppercase tracking-wider mb-6">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                        </span>
                        US Department of State Compliant
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 tracking-tight">
                        Instant <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">US Visa Photo</span> Generator
                    </h1>
                    <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
                        Turn any selfie into a perfect 2x2 inch (600x600px) biometric photo. Intelligent background removal and face alignment—processed 100% in your browser.
                    </p>
                </div>

                {/* 2. Requirements Box */}
                <div className="mb-12">
                    <VisaRules />
                </div>

                {/* 3. The App (Upload Cards) */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 md:p-12 flex flex-col items-center justify-center mb-16">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
                        {/* Option A: Upload */}
                        <label className="cursor-pointer group relative">
                            <div className="h-80 bg-slate-50/50 border-2 border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center p-8 transition-all duration-300 hover:border-blue-500 hover:bg-blue-50/50">
                                <div className="mb-6 p-4 bg-white rounded-full shadow-sm group-hover:scale-110 transition-transform duration-300">
                                    <CloudUpload className="w-10 h-10 text-slate-400 group-hover:text-blue-500 transition-colors" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 mb-2">Upload Photo</h3>
                                <p className="text-slate-500 text-center text-sm leading-relaxed max-w-[200px]">
                                    Select a high-quality photo from your device.
                                </p>
                                <span className="mt-8 text-xs font-semibold tracking-wider text-blue-600 uppercase border border-blue-200 bg-blue-50 px-4 py-2 rounded-full group-hover:bg-blue-600 group-hover:text-white transition-all">
                                    Choose File
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
                            className="group relative h-80 bg-slate-50/50 border border-slate-200 rounded-2xl flex flex-col items-center justify-center p-8 transition-all duration-300 hover:border-blue-500 hover:bg-blue-50/50 hover:shadow-md"
                        >
                            <div className="mb-6 p-4 bg-white rounded-full shadow-sm group-hover:scale-110 transition-transform duration-300">
                                <Camera className="w-10 h-10 text-slate-400 group-hover:text-blue-500 transition-colors" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mb-2">Take Photo</h3>
                            <p className="text-slate-500 text-center text-sm leading-relaxed max-w-[200px]">
                                Use your webcam to capture a shot instantly.
                            </p>
                            <span className="mt-8 text-xs font-semibold tracking-wider text-slate-600 uppercase border border-slate-200 bg-white px-4 py-2 rounded-full group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-all">
                                Open Camera
                            </span>
                        </button>
                    </div>

                    <div className="mt-12 flex items-center justify-center gap-2 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                        <ShieldCheck className="w-4 h-4" />
                        <span>Secure Local Processing • No Server Uploads</span>
                    </div>
                </div>

                {/* 4. Why Us Section */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
                    {/* Feature 1 */}
                    <div className="bg-slate-50 rounded-xl p-6 border border-slate-100">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-4 text-blue-600">
                            <ShieldCheck className="w-6 h-6" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-2">Privacy First</h3>
                        <p className="text-slate-600 text-sm leading-relaxed">
                            Your photo never touches a server. All processing happens locally on your device for maximum security.
                        </p>
                    </div>

                    {/* Feature 2 */}
                    <div className="bg-slate-50 rounded-xl p-6 border border-slate-100">
                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mb-4 text-purple-600">
                            <Sparkles className="w-6 h-6" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-2">AI Background Removal</h3>
                        <p className="text-slate-600 text-sm leading-relaxed">
                            Don&apos;t have a white wall? No problem. We automatically replace messy backgrounds with pure white.
                        </p>
                    </div>

                    {/* Feature 3 */}
                    <div className="bg-slate-50 rounded-xl p-6 border border-slate-100">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-4 text-green-600">
                            <Ruler className="w-6 h-6" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-2">Guaranteed Specs</h3>
                        <p className="text-slate-600 text-sm leading-relaxed">
                            We crop to the exact head-size and eye-level requirements mandated by US Immigration.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // State B: Editor
    return (
        <div className="max-w-6xl mx-auto p-4 md:p-8 min-h-[85vh] flex flex-col">
            {/* Header: Back Button & Title */}
            <div className="flex items-center justify-between mb-8">
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
                <div className="w-16"></div> {/* Spacer for centering */}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start h-full">
                {/* Left Column: Immersive Canvas */}
                <div className="lg:col-span-8 bg-slate-100 rounded-3xl overflow-hidden shadow-inner border border-slate-200 relative aspect-[4/3] lg:aspect-auto lg:h-[600px] group">
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
                            containerClassName: "rounded-3xl",
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

                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-sm border border-slate-200 px-4 py-2 rounded-full shadow-sm text-xs font-medium text-slate-600 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                        Drag to reposition image
                    </div>
                </div>

                {/* Right Column: Professional Controls Panel */}
                <div className="lg:col-span-4 bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-xl shadow-slate-200/50 flex flex-col gap-8 sticky top-8">

                    {/* Instructions */}
                    <div className="pb-6 border-b border-slate-100">
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
                    <div className="space-y-8">
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
                                    {/* Center based progress for rotation */}
                                    {/* Simplified for standard left-to-right visual for now */}
                                    <div className="h-full bg-purple-500 transition-all opacity-50" style={{ width: `${((rotation + 45) / 90) * 100}%` }}></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="mt-4 pt-6 border-t border-slate-100 flex flex-col gap-4">
                        {!isPaid ? (
                            <button
                                onClick={handlePayment}
                                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-4 px-6 rounded-xl shadow-lg shadow-blue-500/30 hover:-translate-y-0.5 hover:shadow-xl transition-all flex items-center justify-center gap-3 whitespace-nowrap text-lg"
                            >
                                <Lock className="w-5 h-5 text-white/90" />
                                Unlock & Download (₹99)
                            </button>
                        ) : (
                            <button
                                onClick={handleDownload}
                                className="w-full bg-slate-900 text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 text-lg"
                            >
                                <Download className="w-5 h-5" />
                                Download High-Res
                            </button>
                        )}

                        <div className="flex items-center justify-center gap-2 opacity-50">
                            <ShieldCheck className="w-3 h-3 text-slate-400" />
                            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">SECURE & PRIVATE PROCESSING</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
