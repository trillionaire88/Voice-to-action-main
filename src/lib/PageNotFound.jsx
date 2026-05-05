import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Globe2, Home, ArrowLeft, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PageNotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 flex flex-col items-center justify-center px-4 text-center">
      {/* Logo */}
      <div className="flex items-center gap-3 mb-10">
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-3 rounded-2xl shadow-lg">
          <Globe2 className="w-7 h-7 text-white" />
        </div>
        <span className="text-2xl font-extrabold text-blue-900">Voice to Action</span>
      </div>

      {/* 404 */}
      <div className="relative mb-6">
        <div className="text-[120px] sm:text-[160px] font-black text-slate-100 leading-none select-none">404</div>
        <div className="absolute inset-0 flex items-center justify-center">
          <Search className="w-16 h-16 text-blue-300" />
        </div>
      </div>

      <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3">Page Not Found</h1>
      <p className="text-slate-500 text-base max-w-md mb-8 leading-relaxed">
        We couldn't find what you were looking for. The page may have been moved, deleted, or the link might be incorrect.
      </p>

      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs sm:max-w-sm">
        <Link to={createPageUrl("Home")} className="flex-1">
          <Button className="w-full bg-blue-600 hover:bg-blue-700 h-11">
            <Home className="w-4 h-4 mr-2" />Go Home
          </Button>
        </Link>
        <Button variant="outline" onClick={() => window.history.back()} className="flex-1 h-11">
          <ArrowLeft className="w-4 h-4 mr-2" />Go Back
        </Button>
      </div>

      <p className="text-xs text-slate-400 mt-10">
        © 2025 Voice to Action · Built with security, transparency, and trust.
      </p>
    </div>
  );
}