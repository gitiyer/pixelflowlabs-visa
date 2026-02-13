import { Check, AlertTriangle, User, Glasses, Camera } from "lucide-react";

export default function VisaRules() {
    const rules = [
        {
            icon: <User className="w-5 h-5 text-blue-600" />,
            text: "Neutral Expression (No smiling)",
            type: "requirement"
        },
        {
            icon: <Glasses className="w-5 h-5 text-red-500" />,
            text: "No Glasses allowed",
            type: "forbidden"
        },
        {
            icon: <Camera className="w-5 h-5 text-blue-600" />,
            text: "Face the camera directly",
            type: "requirement"
        },
        {
            icon: <AlertTriangle className="w-5 h-5 text-amber-500" />,
            text: "Photo < 6 months old",
            type: "warning"
        }
    ];

    return (
        <div className="space-y-4">
            <h3 className="text-slate-900 font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                Requirements
            </h3>
            <div className="space-y-3">
                {rules.map((rule, index) => (
                    <div key={index} className="flex items-start gap-3">
                        <div className="mt-0.5 shrink-0">
                            {rule.type === 'requirement' && <Check className="w-4 h-4 text-green-600" />}
                            {rule.type === 'forbidden' && <span className="flex items-center justify-center w-4 h-4 rounded-full bg-red-100 text-red-600 text-[10px] font-bold">✕</span>}
                            {rule.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-500" />}
                        </div>
                        <span className="text-slate-600 text-sm leading-snug">{rule.text}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
