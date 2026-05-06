import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  Clock,
  Sparkles,
  Shield,
  BarChart3,
  CheckCircle2,
  AlertCircle,
  Globe2,
} from "lucide-react";

export default function HowItWorks() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-2.5 rounded-xl">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">How Voice to Action Works</h1>
            <p className="text-slate-600">
              Understanding our algorithms, ranking, and content moderation
            </p>
          </div>
        </div>
      </div>

      {/* Ranking & Discovery */}
      <Card className="border-slate-200 mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Poll Ranking & Discovery
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Trending
            </h4>
            <p className="text-sm text-slate-700 leading-relaxed">
              Polls are ranked by <strong>engagement velocity</strong> — how many votes they receive relative
              to their age. Recent polls with high participation rates appear higher. The algorithm considers:
            </p>
            <ul className="text-sm text-slate-600 mt-2 space-y-1 ml-6 list-disc">
              <li>Vote count in the last 24 hours</li>
              <li>Time since poll creation (newer polls get a boost)</li>
              <li>Verified user participation rate</li>
              <li>Quality signals (non-spam, non-bot activity)</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-500" />
              New
            </h4>
            <p className="text-sm text-slate-700 leading-relaxed">
              Simple chronological sorting by creation date. The most recently created polls appear first,
              regardless of engagement. This ensures all polls get initial visibility.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-orange-500" />
              Ending Soon
            </h4>
            <p className="text-sm text-slate-700 leading-relaxed">
              Polls are sorted by how soon they close. This helps users find polls that need final votes
              before they expire. Time remaining is the primary sorting factor.
            </p>
          </div>

          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-2">
              <Shield className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-blue-800 leading-relaxed">
                <strong>Quality Filters:</strong> Polls flagged for spam, bot activity, or safety concerns
                may have reduced visibility in rankings. High-risk content requires explicit user action to view.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Verification & Trust */}
      <Card className="border-slate-200 mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            Verification & Trust Signals
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold text-slate-900 mb-2">What "Verified" Means</h4>
            <p className="text-sm text-slate-700 leading-relaxed">
              Verified users have confirmed their identity through email verification and optional additional
              methods (phone, KYC). Verified votes are displayed separately in results to help users assess
              result trustworthiness.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900 mb-2">Vote Integrity</h4>
            <p className="text-sm text-slate-700 leading-relaxed">
              Each user can vote once per poll. We track device fingerprints and IP patterns to detect
              suspicious behavior. Verified users' votes carry additional trust signals in the UI.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900 mb-2">Bot & Spam Detection</h4>
            <p className="text-sm text-slate-700 leading-relaxed">
              Automated systems and human moderators review voting patterns, account creation rates, and
              content for signs of manipulation. Suspicious activity may result in:
            </p>
            <ul className="text-sm text-slate-600 mt-2 space-y-1 ml-6 list-disc">
              <li>Vote exclusion from public counts</li>
              <li>Account suspension pending review</li>
              <li>Content visibility reduction</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Moderation */}
      <Card className="border-slate-200 mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Content Moderation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold text-slate-900 mb-2">What We Moderate</h4>
            <p className="text-sm text-slate-700 leading-relaxed">
              Content is reviewed for violations of our Community Guidelines, including:
            </p>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {[
                'Hate speech',
                'Harassment',
                'Violence/Threats',
                'Extremism',
                'Spam/Scams',
                'Misinformation',
                'Self-harm content',
                'Illegal content',
              ].map(item => (
                <Badge key={item} variant="outline" className="justify-start">
                  {item}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900 mb-2">How Moderation Works</h4>
            <ol className="text-sm text-slate-700 leading-relaxed space-y-2 ml-6 list-decimal">
              <li>Users report content via the report button</li>
              <li>Reports are reviewed by trained moderators</li>
              <li>Actions are taken based on Community Guidelines</li>
              <li>Users can appeal moderation decisions</li>
            </ol>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900 mb-2">Transparency</h4>
            <p className="text-sm text-slate-700 leading-relaxed">
              We publish regular transparency reports showing aggregated statistics about moderation actions,
              report volumes, and policy enforcement. Individual moderation decisions can be appealed.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Privacy & Data */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe2 className="w-5 h-5" />
            Privacy & Data Usage
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold text-slate-900 mb-2">What We Collect</h4>
            <p className="text-sm text-slate-700 leading-relaxed">
              We collect minimal data necessary for platform operation: email, country, age bracket (optional),
              and voting/participation history. IP addresses and device data are hashed for security purposes.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900 mb-2">Anonymity Options</h4>
            <p className="text-sm text-slate-700 leading-relaxed">
              You can choose to post polls and comments anonymously. Your vote history is private by default.
              Even when anonymous, we maintain backend records for integrity and abuse prevention.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900 mb-2">Data Sharing</h4>
            <p className="text-sm text-slate-700 leading-relaxed">
              We do not sell personal data. Aggregated, anonymized poll results may be made available for
              research purposes. Individual votes and user identities are never exposed publicly.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Questions */}
      <div className="mt-8 p-6 bg-slate-50 border border-slate-200 rounded-xl">
        <h3 className="font-semibold text-slate-900 mb-2">Have Questions?</h3>
        <p className="text-sm text-slate-700 leading-relaxed">
          For more details about our policies and practices, see our Community Guidelines, Privacy Policy,
          and Transparency Reports. You can also contact our support team with specific questions.
        </p>
      </div>
    </div>
  );
}