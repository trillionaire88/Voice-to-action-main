import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MessageSquare, Shield, Globe2, Users, AlertTriangle, Scale, CheckCircle2, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";

const Section = ({ icon: Icon, title, color, children }) => (
  <Card className={`border-${color}-200 mb-6`}>
    <CardHeader className="pb-3">
      <CardTitle className={`flex items-center gap-2 text-${color}-900 text-lg`}>
        <Icon className={`w-5 h-5 text-${color}-600`} />
        {title}
      </CardTitle>
    </CardHeader>
    <CardContent className="text-slate-700 text-sm leading-relaxed space-y-3">
      {children}
    </CardContent>
  </Card>
);

export default function FreeExpressionPolicy() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-full px-4 py-2 mb-4">
          <MessageSquare className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-medium text-blue-800">Platform Policy</span>
        </div>
        <h1 className="text-4xl font-bold text-slate-900 mb-3">Free Expression Principles</h1>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          Voice to Action is built on the belief that open, honest public debate is essential to democracy and progress.
        </p>
        <Badge className="mt-3 bg-slate-100 text-slate-700 border-slate-300 text-xs">Effective: 2025 · Applies to all users</Badge>
      </div>

      {/* Platform Statement */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white rounded-2xl p-8 mb-8 text-center">
        <Globe2 className="w-8 h-8 mx-auto mb-3 text-blue-300" />
        <p className="text-lg font-semibold leading-relaxed max-w-2xl mx-auto">
          "This platform is designed to enable open expression and public debate. Users may express opinions across political, social, cultural, and ideological topics. The platform does not endorse user opinions."
        </p>
      </div>

      <Section icon={MessageSquare} title="1. We Prioritise Open Debate" color="blue">
        <p>
          Voice to Action exists to give everyone — regardless of political affiliation, nationality, religion, or ideology — the ability to express their views, cast votes, and advocate for change.
        </p>
        <p>
          We deliberately host a wide range of viewpoints, including those that may be controversial or challenge prevailing consensus. This is intentional.
        </p>
        <ul className="list-disc ml-5 space-y-1">
          <li><strong>Disagreement is expected</strong> — and is the foundation of genuine debate.</li>
          <li><strong>You will encounter opinions you strongly disagree with.</strong> This is a feature, not a flaw.</li>
          <li><strong>Participation is entirely voluntary.</strong> You are never required to engage with content you find objectionable.</li>
        </ul>
      </Section>

      <Section icon={Users} title="2. Diverse Viewpoints Are Welcome" color="purple">
        <p>
          We welcome expression across all political, cultural, social, religious, and ideological perspectives. The platform does not take sides in political or social debates.
        </p>
        <p>
          Poll creators, petition authors, and community members speak for themselves — not for this platform. All opinions expressed by users are their own.
        </p>
      </Section>

      <Section icon={Shield} title="3. User Responsibility" color="amber">
        <p>Every user of this platform is solely responsible for the content they publish. By participating, you acknowledge:</p>
        <ul className="list-disc ml-5 space-y-1">
          <li>This platform acts only as a hosting provider.</li>
          <li>The platform does not verify, endorse, or vouch for any user-submitted opinion, claim, or statement.</li>
          <li>You are solely responsible for ensuring your content complies with applicable laws in your jurisdiction.</li>
        </ul>
      </Section>

      <Section icon={AlertTriangle} title="4. What Is Not Permitted" color="red">
        <p>While we strongly support free expression, certain types of content are not permitted because they cause direct harm or violate the law:</p>
        <ul className="list-disc ml-5 space-y-1">
          <li><strong>Credible threats of violence</strong> against individuals or groups.</li>
          <li><strong>Unlawful harassment</strong> targeting specific individuals.</li>
          <li><strong>Content that facilitates or encourages unlawful activity.</strong></li>
          <li><strong>Spam and fraudulent content</strong> that deceives users.</li>
        </ul>
        <p className="text-xs text-slate-500 mt-2">
          Note: Controversial opinions, criticism of governments, corporations, public figures, or policies — even strong or harsh criticism — do not fall into these categories and are permitted on this platform.
        </p>
      </Section>

      <Section icon={Scale} title="5. Platform Moderation Rights" color="slate">
        <p>The platform owner retains the right to:</p>
        <ul className="list-disc ml-5 space-y-1">
          <li>Remove content that violates applicable laws.</li>
          <li>Remove spam or fraudulent activity.</li>
          <li>Suspend accounts that repeatedly abuse the platform.</li>
        </ul>
        <p>
          Moderation is focused on legal compliance and preventing direct harm — not on suppressing political or social opinions, regardless of how unpopular those opinions may be.
        </p>
      </Section>

      <Section icon={FileText} title="6. Legal Compliance" color="green">
        <p>
          Voice to Action operates within applicable laws. Where content is found to violate laws, it may be reviewed and removed. We cooperate with lawful requests from relevant authorities.
        </p>
        <p>
          Users are responsible for ensuring their own content complies with the laws of their jurisdiction. The platform does not provide legal advice.
        </p>
      </Section>

      <Section icon={CheckCircle2} title="7. Opinion Disclaimer" color="indigo">
        <p>All user-generated content on this platform — including polls, petitions, comments, and community posts — carries the following disclaimer:</p>
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 italic text-indigo-900 text-center">
          "The opinions expressed in this content belong solely to the user who posted it and do not represent the views of the platform or its owner."
        </div>
      </Section>

      <Separator className="my-8" />

      <div className="text-center text-sm text-slate-500 space-y-4">
        <p>
          If you encounter content that may violate laws or platform rules, you can report it using the report button on any poll, petition, or comment.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link to={createPageUrl("TermsOfService")}>
            <Button variant="outline" size="sm">Terms of Service</Button>
          </Link>
          <Link to={createPageUrl("LegalSettings")}>
            <Button variant="outline" size="sm">Legal & Policies</Button>
          </Link>
          <Link to={createPageUrl("Home")}>
            <Button variant="outline" size="sm">Browse Polls</Button>
          </Link>
        </div>
        <p className="text-xs text-slate-400">Voice to Action · Platform Owner: Jeremy Kyle Whisson · Australia</p>
      </div>
    </div>
  );
}