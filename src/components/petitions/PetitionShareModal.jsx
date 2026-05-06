import { useState } from "react";
import { X, Copy, Check } from "lucide-react";

export default function PetitionShareModal({ petition, onClose }) {
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}/PetitionDetail?id=${petition.id}`;
  const text = `I just signed: "${petition.title}" — ${(petition.signature_count_total || 0).toLocaleString()} signatures so far. Add yours!`;
  const encodedText = encodeURIComponent(text);
  const encodedUrl = encodeURIComponent(url);

  const handleCopy = () => {
    navigator.clipboard.writeText(`${text} ${url}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shares = [
    {
      label: "Twitter / X",
      color: "bg-black hover:bg-slate-800",
      href: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
    },
    {
      label: "Facebook",
      color: "bg-[#1877f2] hover:bg-[#1565d8]",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`,
    },
    {
      label: "WhatsApp",
      color: "bg-[#25d366] hover:bg-[#1fb058]",
      href: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm px-4 pb-4 sm:pb-0" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700">
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-5">
          <div className="text-3xl mb-2">🎉</div>
          <h2 className="text-xl font-bold text-slate-900">Your signature counts!</h2>
          <p className="text-slate-500 text-sm mt-1">Now share it to get more signatures</p>
        </div>

        <div className="bg-slate-50 rounded-xl p-3 mb-5">
          <p className="text-sm text-slate-700 font-medium line-clamp-2">"{petition.title}"</p>
          <p className="text-xs text-slate-500 mt-1">{(petition.signature_count_total || 0).toLocaleString()} signatures and counting</p>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-3">
          {shares.map(s => (
            <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer"
              className={`${s.color} text-white text-xs font-semibold rounded-xl py-3 text-center transition-colors`}>
              {s.label}
            </a>
          ))}
        </div>

        <button onClick={handleCopy}
          className="w-full flex items-center justify-center gap-2 border-2 border-slate-200 hover:border-blue-400 rounded-xl py-3 text-sm font-semibold text-slate-700 transition-colors">
          {copied ? <><Check className="w-4 h-4 text-emerald-500" />Copied!</> : <><Copy className="w-4 h-4" />Copy link</>}
        </button>

        <button onClick={onClose} className="w-full mt-3 text-xs text-slate-400 hover:text-slate-600 py-1">
          No thanks
        </button>
      </div>
    </div>
  );
}