import React, { useState, useEffect } from "react";
import { AlertTriangle, Check, X, ShieldAlert } from "lucide-react";

interface ComplianceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onProceed: () => void;
}

export default function ComplianceModal({
    isOpen,
    onClose,
    onProceed,
}: ComplianceModalProps) {
    const [checks, setChecks] = useState({
        noGlasses: false,
        neutralExpression: false,
        faceVisible: false,
        recentPhoto: false,
    });

    // Reset checks when modal opens
    useEffect(() => {
        if (isOpen) {
            setChecks({
                noGlasses: false,
                neutralExpression: false,
                faceVisible: false,
                recentPhoto: false,
            });
        }
    }, [isOpen]);

    const allChecked =
        checks.noGlasses &&
        checks.neutralExpression &&
        checks.faceVisible &&
        checks.recentPhoto;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden transform transition-all scale-100 flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="bg-amber-50 border-b border-amber-100 p-6 flex flex-col items-center text-center shrink-0">
                    <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mb-3">
                        <AlertTriangle className="w-6 h-6 text-amber-600" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900">
                        Final Quality Check
                    </h2>
                    <p className="text-sm text-slate-600 mt-2 max-w-xs mx-auto">
                        The US State Department is strict. Please confirm the following to
                        avoid rejection:
                    </p>
                </div>

                {/* Checklist */}
                <div className="p-6 space-y-3 overflow-y-auto">
                    <CheckItem
                        label="I am NOT wearing glasses or sunglasses."
                        checked={checks.noGlasses}
                        setChecked={() =>
                            setChecks((prev) => ({ ...prev, noGlasses: !prev.noGlasses }))
                        }
                        icon="👓"
                        crucial
                    />
                    <CheckItem
                        label="My expression is NEUTRAL (No smiling)."
                        checked={checks.neutralExpression}
                        setChecked={() =>
                            setChecks((prev) => ({
                                ...prev,
                                neutralExpression: !prev.neutralExpression,
                            }))
                        }
                        icon="😐"
                    />
                    <CheckItem
                        label="My entire face and ears are visible."
                        checked={checks.faceVisible}
                        setChecked={() =>
                            setChecks((prev) => ({ ...prev, faceVisible: !prev.faceVisible }))
                        }
                        icon="👂"
                    />
                    <CheckItem
                        label="The photo is recent (taken < 6 months ago)."
                        checked={checks.recentPhoto}
                        setChecked={() =>
                            setChecks((prev) => ({ ...prev, recentPhoto: !prev.recentPhoto }))
                        }
                        icon="📅"
                    />
                </div>

                {/* Footer */}
                <div className="p-6 pt-4 bg-slate-50 border-t border-slate-100 flex flex-col gap-3 shrink-0">
                    <button
                        onClick={onProceed}
                        disabled={!allChecked}
                        className={`w-full py-3.5 px-6 rounded-xl font-bold text-white transition-all transform flex items-center justify-center gap-2
              ${allChecked
                                ? "bg-slate-900 hover:bg-slate-800 shadow-lg hover:-translate-y-0.5 active:scale-95"
                                : "bg-slate-300 cursor-not-allowed opacity-70"
                            }`}
                    >
                        {allChecked ? (
                            <>
                                <ShieldAlert className="w-4 h-4" />
                                Proceed to Payment
                            </>
                        ) : "Complete Checklist to Proceed"}
                    </button>

                    <button
                        onClick={onClose}
                        className="w-full py-2 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
                    >
                        Cancel & Review Photo
                    </button>
                </div>
            </div>
        </div>
    );
}

function CheckItem({
    label,
    checked,
    setChecked,
    icon,
    crucial,
}: {
    label: string;
    checked: boolean;
    setChecked: () => void;
    icon: string;
    crucial?: boolean;
}) {
    return (
        <div
            onClick={setChecked}
            className={`group flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all select-none relative overflow-hidden
        ${checked
                    ? "bg-green-50 border-green-500 shadow-sm"
                    : "bg-white border-slate-100 hover:border-blue-200 hover:bg-slate-50"
                }`}
        >
            <div className="text-2xl">{icon}</div>

            <div className="flex-1">
                {crucial && (
                    <div className="absolute top-0 right-0 bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-bl-lg tracking-wider uppercase">
                        Crucial
                    </div>
                )}
                <p className={`text-sm font-medium ${checked ? "text-green-800" : "text-slate-700"}`}>
                    {label}
                </p>
            </div>

            <div
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors shrink-0
          ${checked
                        ? "bg-green-500 border-green-500"
                        : "bg-white border-slate-300 group-hover:border-blue-400"
                    }`}
            >
                {checked && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
            </div>
        </div>
    );
}
