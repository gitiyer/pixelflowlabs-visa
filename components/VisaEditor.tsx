"use client";

import React, { useState, useCallback, useRef } from "react";
import Cropper, { Area } from "react-easy-crop";
import { Upload, ZoomIn, RotateCw, Download, ShieldCheck, X, Camera, RefreshCw } from "lucide-react";
import Webcam from "react-webcam";
import { removeBackground } from "@imgly/background-removal";
import getCroppedImg from "../lib/canvasUtils";
import VisaRules from "./VisaRules";

type AppState = "dropzone" | "camera" | "processing" | "editor";

export default function VisaEditor() {
    const [appState, setAppState] = useState<AppState>("dropzone");
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
    const webcamRef = useRef<Webcam>(null);

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

    const handleDownload = async () => {
        if (!imageSrc || !croppedAreaPixels) return;
        try {
            const croppedImage = await getCroppedImg(
                imageSrc,
                croppedAreaPixels,
                rotation
            );
            if (croppedImage) {
                const link = document.createElement("a");
                link.href = croppedImage;
                link.download = "visa-photo.jpg";
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
    };

    // --- Views ---

    if (appState === "processing") {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center p-4">
                <div className="animate-spin mb-4">
                    <RefreshCw className="w-12 h-12 text-blue-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-800">Processing Image...</h2>
                <p className="text-slate-500">Removing background & optimizing.</p>
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
                        <div className="border-2 border-green-400/50 w-[50%] h-[65%] rounded-full opacity-70 relative">
                            <div className="absolute top-1/2 left-1/2 w-4 h-4 -translate-x-1/2 -translate-y-1/2 border-white/50 border-t border-l"></div>
                            <div className="absolute bottom-[15%] left-10 right-10 border-b border-green-500/70 border-dashed"></div>
                            <div className="absolute top-[15%] left-10 right-10 border-t border-green-500/70 border-dashed"></div>
                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-green-400 text-sm font-bold uppercase tracking-wide bg-black/50 px-2 rounded">
                                Head Top
                            </div>
                            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-green-400 text-sm font-bold uppercase tracking-wide bg-black/50 px-2 rounded">
                                Chin
                            </div>
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
                            className="w-16 h-16 rounded-full bg-white border-4 border-slate-200 shadow-lg flex items-center justify-center hover:scale-105 transition-transform active:scale-95"
                        >
                            <div className="w-12 h-12 bg-red-600 rounded-full"></div>
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
            <div className="max-w-4xl mx-auto p-4 min-h-[80vh] flex flex-col">
                <VisaRules />

                <div className="flex-1 flex items-center justify-center">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                        {/* Option A: Upload */}
                        <label className="cursor-pointer group">
                            <div className="h-64 bg-white border-2 border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center p-6 transition-all hover:border-blue-500 hover:bg-blue-50/50 shadow-sm hover:shadow-md">
                                <div className="bg-blue-100 p-4 rounded-full mb-4 group-hover:scale-110 transition-transform">
                                    <Upload className="w-8 h-8 text-blue-600" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900">Upload Photo</h3>
                                <p className="text-slate-500 text-center mt-2 text-sm">Drag & drop or click to browse</p>
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
                            className="h-64 bg-white border border-slate-200 rounded-2xl flex flex-col items-center justify-center p-6 transition-all hover:border-blue-500 hover:bg-blue-50/50 shadow-sm hover:shadow-md group text-left"
                        >
                            <div className="bg-purple-100 p-4 rounded-full mb-4 group-hover:scale-110 transition-transform">
                                <Camera className="w-8 h-8 text-purple-600" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900">Take Photo</h3>
                            <p className="text-slate-500 text-center mt-2 text-sm">Use your webcam to capture</p>
                        </button>
                    </div>
                </div>
                <div className="mt-8 flex items-center justify-center gap-2 text-slate-500 text-sm pb-8">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Local Processing. No server uploads.</span>
                </div>
            </div>
        );
    }

    // State B: Editor (imageSrc is strictly present here)
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl w-full mx-auto p-4">
            {/* Left Column: Canvas */}
            <div className="lg:col-span-2 bg-white border border-slate-200 shadow-sm rounded-2xl p-4 flex items-center justify-center min-nh-[600px]">
                <div className="relative w-full h-[500px] lg:h-[600px] bg-slate-100 rounded-xl overflow-hidden">
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
                    />
                    {/* Head & Chin Guide Overlay */}
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                        <div className="border-2 border-green-400/50 w-[60%] h-[70%] rounded-full opacity-50 relative">
                            <div className="absolute top-1/2 left-1/2 w-4 h-4 -translate-x-1/2 -translate-y-1/2 border-white/50 border-t border-l"></div>
                            <div className="absolute bottom-[15%] left-10 right-10 border-b border-green-500/70 border-dashed"></div>
                            <div className="absolute top-[15%] left-10 right-10 border-t border-green-500/70 border-dashed"></div>
                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-green-400 text-xs font-bold uppercase tracking-wide">
                                Head Top
                            </div>
                            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-green-400 text-xs font-bold uppercase tracking-wide">
                                Chin
                            </div>
                        </div>
                    </div>
                </div>

                {/* Close/Reset Button */}
                <button onClick={handleReset} className="absolute top-6 right-6 p-2 bg-white/90 rounded-full shadow-sm hover:bg-slate-100 z-10">
                    <X className="w-5 h-5 text-slate-600" />
                </button>
            </div>

            {/* Right Column: Controls */}
            <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 flex flex-col gap-6 h-fit">
                <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-1">Adjust Image</h3>
                    <p className="text-slate-500 text-sm">Align face within the green guides. Background has been removed.</p>
                </div>

                {/* Zoom Control */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                            <ZoomIn className="w-4 h-4" /> Zoom
                        </label>
                        <span className="text-xs text-slate-500">{zoom}x</span>
                    </div>
                    <input
                        type="range"
                        value={zoom}
                        min={1}
                        max={3}
                        step={0.1}
                        aria-labelledby="Zoom"
                        onChange={(e) => setZoom(Number(e.target.value))}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                </div>

                {/* Rotation Control */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                            <RotateCw className="w-4 h-4" /> Rotation
                        </label>
                        <span className="text-xs text-slate-500">{rotation}°</span>
                    </div>
                    <input
                        type="range"
                        value={rotation}
                        min={-180}
                        max={180}
                        step={1}
                        aria-labelledby="Rotation"
                        onChange={(e) => setRotation(Number(e.target.value))}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                </div>

                <div className="pt-4 border-t border-slate-100">
                    <button
                        onClick={handleDownload}
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-3 px-4 rounded-xl shadow-md hover:shadow-lg hover:from-blue-700 hover:to-purple-700 transition-all flex items-center justify-center gap-2"
                    >
                        <Download className="w-5 h-5" />
                        Crop & Download
                    </button>
                </div>
            </div>
        </div>
    );
}
