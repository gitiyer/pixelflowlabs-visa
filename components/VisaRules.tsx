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
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm mb-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Check className="w-6 h-6 text-green-500" />
                Visa Photo Rules
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {rules.map((rule, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                        <div className="bg-white p-2 rounded-full shadow-sm">
                            {rule.icon}
                        </div>
                        <span className="text-slate-700 font-medium text-sm">{rule.text}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
