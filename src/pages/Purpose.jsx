import React from "react";
import { Target, FileText, BarChart3, Users, Eye } from "lucide-react";

export default function Purpose() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16">

      {/* Hero */}
      <div className="text-center mb-16">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl mb-6 shadow-lg shadow-emerald-200">
          <Target className="w-10 h-10 text-white" />
        </div>
        <p className="text-sm font-semibold uppercase tracking-widest text-emerald-600 mb-3">Our Purpose</p>
        <h1 className="text-5xl font-extrabold text-slate-900 leading-tight mb-5">
          What We're Here For
        </h1>
        <div className="w-16 h-1 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full mx-auto" />
      </div>

      {/* Body text */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 sm:p-12 mb-10 space-y-6 text-slate-700 leading-relaxed text-[1.05rem]">
        <p>
          Voice to Action was created to provide a permanent and accessible space where public opinion can be shared, recorded, and viewed openly.
        </p>
        <p>
          The platform allows users to create and participate in polls, petitions, discussions, and community forums so that people can express their views on matters that affect their lives and surroundings.
        </p>
        <p>
          The goal of Voice to Action is to encourage transparency and constructive dialogue by allowing individuals, organisations, and public institutions to see how people respond to ideas, announcements, and decisions.
        </p>
        <p>
          The platform can be used by community groups, media organisations, public figures, and institutions who wish to better understand public sentiment or invite public feedback.
        </p>
        <p>
          Voice to Action also provides tools for verified users to support petitions and initiatives in a way that helps demonstrate genuine public interest.
        </p>
      </div>

      {/* Feature cards */}
      <div className="grid sm:grid-cols-2 gap-5 mb-10">
        {[
          {
            icon: BarChart3,
            color: "bg-blue-50 border-blue-100",
            iconColor: "text-blue-600",
            iconBg: "bg-blue-100",
            title: "Polls & Surveys",
            desc: "Gather structured public opinion on any topic.",
          },
          {
            icon: FileText,
            color: "bg-emerald-50 border-emerald-100",
            iconColor: "text-emerald-600",
            iconBg: "bg-emerald-100",
            title: "Petitions",
            desc: "Organise support for causes and call for action.",
          },
          {
            icon: Users,
            color: "bg-violet-50 border-violet-100",
            iconColor: "text-violet-600",
            iconBg: "bg-violet-100",
            title: "Community Forums",
            desc: "Create spaces for ongoing group discussion.",
          },
          {
            icon: Eye,
            color: "bg-amber-50 border-amber-100",
            iconColor: "text-amber-600",
            iconBg: "bg-amber-100",
            title: "Transparency Tools",
            desc: "Help institutions understand and respond to public views.",
          },
        ].map(({ icon: Icon, color, iconColor, iconBg, title, desc }) => (
          <div key={title} className={`border rounded-2xl p-6 flex gap-4 ${color}`}>
            <div className={`w-11 h-11 ${iconBg} rounded-xl flex items-center justify-center flex-shrink-0`}>
              <Icon className={`w-5 h-5 ${iconColor}`} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 mb-1 text-base">{title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Communities section */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 sm:p-12 mb-10">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 bg-teal-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Users className="w-5 h-5 text-teal-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Communities</h2>
        </div>
        <div className="space-y-4 text-slate-700 leading-relaxed text-[1.05rem]">
          <p>
            Voice to Action communities allow businesses, organisations, councils, groups, and individuals to create dedicated spaces for discussion, feedback, and public participation.
          </p>
          <p>
            Communities may be public or private and may be used for customer feedback, internal discussions, community projects, or public accountability.
          </p>
          <p>
            Paid communities provide additional tools including analytics, moderation controls, private access, and verified status.
          </p>
          <p>
            The community system is designed to allow structured conversation, problem solving, and transparent communication between organisations and the public.
          </p>
        </div>
      </div>

      {/* Verification section */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 sm:p-12 mb-10">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Eye className="w-5 h-5 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Verification & Trust</h2>
        </div>
        <div className="space-y-4 text-slate-700 leading-relaxed text-[1.05rem]">
          <p>Voice to Action allows organisations, businesses, and public authorities to create verified community pages.</p>
          <p>Verification indicates that the organisation has confirmed ownership of the page and allows access to additional tools including analytics, moderation controls, and official responses.</p>
          <p>Verification does not represent endorsement by the platform.</p>
          <p>Voice to Action uses reputation and trust scores to provide transparency and help users understand the reliability of content, communities, and organisations. Scores are calculated automatically based on participation, feedback, and moderation history.</p>
        </div>
      </div>

      {/* Closing statement */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 sm:p-10 text-center">
        <p className="text-white text-lg leading-relaxed font-light">
          All activity on the platform is intended to support{" "}
          <span className="font-semibold text-emerald-300">open conversation</span>,{" "}
          <span className="font-semibold text-blue-300">responsible participation</span>, and{" "}
          <span className="font-semibold text-violet-300">respectful exchange of views</span>.
        </p>
      </div>

    </div>
  );
}