import {
  Globe2, Shield, Users, FileText, BarChart3,
  ArrowRight, CheckCircle2, Building2, Zap, Lock, TrendingUp, Star
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { api } from '@/api/client';

export default function About() {
  return (
    <div className="overflow-hidden">

      {/* ── Hero ── */}
      <section className="relative bg-gradient-to-br from-blue-900 via-blue-800 to-slate-900 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)",
          backgroundSize: "40px 40px"
        }} />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-20 sm:py-28 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-2 mb-6 text-sm font-medium">
            <Globe2 className="w-4 h-4" /> Civic accountability for the digital age
          </div>
          <h1 className="text-4xl sm:text-6xl font-extrabold leading-tight mb-6">
            The world needs a platform<br />
            <span className="bg-gradient-to-r from-cyan-300 to-blue-300 bg-clip-text text-transparent">
              that holds power to account.
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-blue-100 max-w-2xl mx-auto mb-8 leading-relaxed">
            Voice to Action is the secure global platform for petitions, polls, and community governance.
            Verified identities. Real results. No noise.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" className="bg-white text-blue-900 hover:bg-blue-50 font-bold h-12 px-8"
              onClick={() => api.auth.redirectToLogin(createPageUrl("Home"))}>
              Join for Free <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Link to={createPageUrl("Petitions")}>
              <Button size="lg" variant="outline" className="border-white/30 bg-white/10 hover:bg-white/20 text-white h-12 px-8 w-full sm:w-auto font-semibold">
                Browse Petitions
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── The Problem ── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-4">
            Public opinion exists. But no one acts on it.
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Governments ignore petitions. Corporations dismiss complaints. Politicians break promises with no record and no consequence. Voice to Action changes that.
          </p>
        </div>
        <div className="grid sm:grid-cols-3 gap-6">
          {[
            { icon: TrendingUp, color: "blue", title: "Verified Signatures", desc: "Every signature is linked to a real, verified identity — making petitions governments actually have to acknowledge." },
            { icon: Shield, color: "emerald", title: "Immutable Records", desc: "Once published, content can't be quietly deleted. Promises, decisions, and votes are recorded permanently." },
            { icon: Users, color: "purple", title: "Community Power", desc: "Organised communities with governance tools, private forums, and collective voting that can't be ignored." },
          ].map(({ icon: Icon, color, title, desc }) => (
            <div key={title} className={`rounded-2xl border-2 p-6 bg-${color}-50 border-${color}-100`}>
              <div className={`w-12 h-12 bg-${color}-600 rounded-2xl flex items-center justify-center mb-4`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-bold text-slate-900 text-lg mb-2">{title}</h3>
              <p className="text-slate-600 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Three Core Features ── */}
      <section className="bg-slate-900 text-white py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">Three tools. One mission.</h2>
            <p className="text-slate-300 text-lg">Everything you need to organise, amplify, and deliver change.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: FileText, label: "Petitions", color: "emerald",
                desc: "Create formal petitions with verified signatures that can be digitally delivered to any government body, corporation, or institution. Track delivery, responses, and escalation.",
                features: ["Verified signature collection", "Official delivery tracking", "PDF export for submission", "30-day response escalation"],
              },
              {
                icon: BarChart3, label: "Polls", color: "blue",
                desc: "Run secure, transparent polls with real-time global results. Filter by country, demographic, or verification status. Share results that actually mean something.",
                features: ["Global or country-specific", "Ranked & multiple choice", "Real-time live results", "Credibility scoring"],
              },
              {
                icon: Users, label: "Communities", color: "purple",
                desc: "Build an organised group around your cause. Manage members, run internal polls, create discussion forums, and govern your community with real structure.",
                features: ["Governance models", "Private access codes", "Community petitions", "Verified community badge"],
              },
            ].map(({ icon: Icon, label, color, desc, features }) => (
              <div key={label} className={`bg-white/5 border border-white/10 rounded-2xl p-6`}>
                <div className={`w-10 h-10 bg-${color}-500/20 rounded-xl flex items-center justify-center mb-4`}>
                  <Icon className={`w-5 h-5 text-${color}-400`} />
                </div>
                <h3 className="text-xl font-bold mb-2">{label}</h3>
                <p className="text-slate-300 text-sm mb-4 leading-relaxed">{desc}</p>
                <ul className="space-y-1">
                  {features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-slate-400">
                      <CheckCircle2 className={`w-3.5 h-3.5 text-${color}-400 flex-shrink-0`} />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why Verification Matters ── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-16">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-4 py-1.5 text-sm font-semibold mb-4">
              <Lock className="w-4 h-4" /> Why Verification Matters
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-4">
              Fake signatures don't change the world.
            </h2>
            <p className="text-slate-600 leading-relaxed mb-6">
              Any petition platform can collect anonymous clicks. But governments and courts require verified identities before they act. Our Stripe KYC verification means every signature is tied to a real human being — making your petition legally credible, not just numerically large.
            </p>
            <ul className="space-y-3 mb-6">
              {[
                "Blue ✓ checkmark for verified identity ($12.99 AUD, once-off)",
                "Verified signatures weighted more heavily in delivery",
                "Verified accounts unlock profile photos and higher credibility scores",
                "Organisations can get gold ★ public figure status",
              ].map(t => (
                <li key={t} className="flex items-start gap-2.5 text-slate-700 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  {t}
                </li>
              ))}
            </ul>
            <Link to={createPageUrl("GetVerified")}>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Shield className="w-4 h-4 mr-2" /> Get Verified
              </Button>
            </Link>
          </div>
          <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-3xl p-8 text-white text-center">
            <div className="text-6xl mb-4">🔐</div>
            <h3 className="text-2xl font-bold mb-2">Stripe KYC Verification</h3>
            <p className="text-blue-100 text-sm leading-relaxed mb-6">
              Identity verified via Stripe's secure Know Your Customer (KYC) process. No data is stored on our servers. Your identity is confirmed, not collected.
            </p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                ["One-time fee", "$12.99 AUD"],
                ["Lifetime badge", "No renewal"],
                ["Private & secure", "Stripe KYC"],
                ["Globally trusted", "160+ countries"],
              ].map(([label, val]) => (
                <div key={label} className="bg-white/10 rounded-xl p-3">
                  <div className="font-bold">{val}</div>
                  <div className="text-blue-200 text-xs">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Company ── */}
      <section className="bg-slate-50 border-t border-slate-200 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-slate-900 rounded-2xl mb-5">
            <Building2 className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-4">Every Voice Proprietary Limited</h2>
          <p className="text-slate-600 leading-relaxed max-w-2xl mx-auto mb-6 text-base">
            Voice to Action is a product of <strong>Every Voice Proprietary Limited</strong>, an Australian company dedicated to building civic technology that strengthens democratic participation. We are not affiliated with any government, political party, or corporation.
          </p>
          <p className="text-slate-500 text-sm max-w-xl mx-auto">
            Voice to Action does not endorse any petition, poll, or community on its platform. All content is created by and represents the views of individual users. We provide the infrastructure — the voice belongs to you.
          </p>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="bg-gradient-to-br from-blue-700 to-blue-900 text-white py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <Zap className="w-10 h-10 text-cyan-300 mx-auto mb-4" />
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">Ready to take action?</h2>
          <p className="text-blue-100 text-lg mb-8">
            Join citizens, communities, and organisations already using Voice to Action to demand change.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" className="bg-white text-blue-900 hover:bg-blue-50 font-bold h-12 px-8"
              onClick={() => api.auth.redirectToLogin(createPageUrl("Home"))}>
              <Star className="w-4 h-4 mr-2" /> Create a Free Account
            </Button>
            <Link to={createPageUrl("HowItWorks")}>
              <Button size="lg" variant="outline" className="border-white/30 bg-white/10 hover:bg-white/20 text-white h-12 px-8 font-semibold w-full sm:w-auto">
                How It Works
              </Button>
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}