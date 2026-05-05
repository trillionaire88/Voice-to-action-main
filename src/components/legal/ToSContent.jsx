import React from "react";
import { SUPPORT_EMAIL } from "@/constants/siteUrl";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, AlertTriangle, Globe2, Scale } from "lucide-react";

export const CURRENT_TOS_VERSION = "1.1";

export default function ToSContent() {
  return (
    <div className="prose prose-slate max-w-none">
      {/* Legal entity identity banner */}
      <div className="bg-gradient-to-r from-blue-50 to-slate-50 border border-blue-200 rounded-xl p-5 mb-8 not-prose">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-slate-900">Every Voice Proprietary Limited</p>
            <p className="text-sm text-slate-600 mt-0.5">Registered in Australia · Trading as <strong>Voice to Action</strong></p>
            <p className="text-sm text-slate-600 mt-1">
              Voice to Action is a product and trademark of <strong>Every Voice Proprietary Limited</strong>.
              All platform rights, intellectual property, and operations are exclusively owned by Every Voice Proprietary Limited.
            </p>
            <p className="text-xs text-slate-500 mt-1.5">Contact: {SUPPORT_EMAIL}</p>
          </div>
        </div>
      </div>

      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-slate-900 mb-2">Terms of Service</h1>
        <p className="text-slate-600">Voice to Action</p>
        <p className="text-sm text-slate-500">Version {CURRENT_TOS_VERSION} • Effective January 1, 2025</p>
      </div>

      <Separator className="my-8" />

      {/* 1. Introduction */}
      <section id="introduction" className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Globe2 className="w-6 h-6 text-blue-600" />
          1. Introduction & Binding Agreement
        </h2>
        <p className="text-slate-700 leading-relaxed mb-3">
          Welcome to <strong>Voice to Action</strong>, a secure global opinion platform. 
          These Terms of Service ("Terms", "ToS", "Agreement") constitute a legally binding agreement between you ("User", "you", "your") 
          and Every Voice Proprietary Limited (trading as Voice to Action) — "we", "us", "our", "Platform", "Service", "the Company".
        </p>
        <p className="text-slate-700 leading-relaxed mb-3">
          <strong>By accessing or using Voice to Action, you agree to be bound by these Terms.</strong> If you do not agree, 
          you must immediately cease using the Platform.
        </p>
        
        <Alert className="border-blue-200 bg-blue-50 my-4">
          <AlertDescription className="text-sm text-blue-800">
            <strong>Age Requirements:</strong> You must be at least 13 years old to use Voice to Action (16+ in the EU under GDPR). 
            Certain features (donations, institutional accounts) require users to be 18+.
          </AlertDescription>
        </Alert>

        <h3 className="text-lg font-semibold text-slate-900 mt-4 mb-2">Definitions</h3>
        <ul className="list-disc ml-6 space-y-1 text-slate-700">
          <li><strong>"User"</strong> - Any individual or entity using Voice to Action</li>
          <li><strong>"Content"</strong> - Polls, petitions, comments, votes, media, and all user-generated data</li>
          <li><strong>"Service"</strong> - All features, tools, and systems provided by Voice to Action</li>
          <li><strong>"Institution"</strong> - Government bodies, corporations, NGOs tracked on the platform</li>
          <li><strong>"Verified User"</strong> - Users who completed identity verification (KYC)</li>
        </ul>
      </section>

      <Separator className="my-8" />

      {/* 2. Intellectual Property */}
      <section id="intellectual-property" className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Shield className="w-6 h-6 text-red-600" />
          2. Intellectual Property Protection (CRITICAL)
        </h2>
        
        <Alert className="border-red-500 bg-red-50 my-4">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          <AlertDescription className="text-sm text-red-900">
            <strong>STRICT PROHIBITION:</strong> Any violation of this section will result in immediate legal action.
          </AlertDescription>
        </Alert>

        <h3 className="text-lg font-semibold text-slate-900 mt-4 mb-2">2.1 Platform Ownership</h3>
        <p className="text-slate-700 leading-relaxed mb-3">
          The Voice to Action platform, including but not limited to its name, brand, logo, design, user interface, user experience, 
          architecture, features, concepts, systems, algorithms, data structures, backend logic, frontend code, civic frameworks, 
          voting mechanisms, trust systems, reputation engines, map visualizations, AI models, simulation tools, Public Impact Records, 
          polling structures, petition workflows, decision layers, constitution builders, mandate ledgers, and all proprietary 
          intellectual inventions are the <strong>exclusive property of Every Voice Proprietary Limited</strong> (trading as Voice to Action). Voice to Action is a registered product and trademark of Every Voice Proprietary Limited.
        </p>

        <h3 className="text-lg font-semibold text-slate-900 mt-4 mb-2">2.2 Prohibited Actions</h3>
        <p className="text-slate-700 leading-relaxed mb-2">
          Users and institutions are <strong>strictly prohibited</strong> from:
        </p>
        <ul className="list-disc ml-6 space-y-2 text-slate-700">
          <li>Copying, reproducing, duplicating, or cloning any part of the Voice to Action platform</li>
          <li>Reverse-engineering, decompiling, or extracting source code or algorithms</li>
          <li>Creating derivative works, competing platforms, or similar services based on Voice to Action</li>
          <li>Redistributing, re-selling, licensing, or sub-licensing Voice to Action content, features, or systems</li>
          <li>Scraping data, harvesting content, or automated extraction of platform information</li>
          <li>Replicating UI/UX patterns, visual designs, or interaction flows</li>
          <li>Using Voice to Action concepts, names, or branding in other products</li>
          <li>Launching competitive platforms using Voice to Action methodologies or innovations</li>
          <li>Downloading bulk data for republication or competitive analysis</li>
          <li>Creating "white-label" versions or unauthorized integrations</li>
        </ul>

        <h3 className="text-lg font-semibold text-slate-900 mt-4 mb-2">2.3 Consequences of IP Violation</h3>
        <p className="text-slate-700 leading-relaxed mb-2">
          Violations of intellectual property rights will result in:
        </p>
        <ul className="list-disc ml-6 space-y-1 text-slate-700">
          <li><strong>Immediate account termination</strong> without notice or refund</li>
          <li><strong>Legal action</strong> including civil lawsuits and criminal prosecution where applicable</li>
          <li><strong>Damages claims</strong> for loss of revenue, reputation, and competitive advantage</li>
          <li><strong>Injunctive relief</strong> to cease and desist all infringing activities</li>
          <li><strong>Public disclosure</strong> of violators to protect the community</li>
        </ul>

        <h3 className="text-lg font-semibold text-slate-900 mt-4 mb-2">2.4 Global IP Rights</h3>
        <p className="text-slate-700 leading-relaxed">
          All intellectual property rights, patents, trademarks, copyrights, trade secrets, and proprietary technologies 
          embodied in Voice to Action are reserved globally. This includes protection under Australian law, EU regulations, 
          US copyright law, and international IP treaties.
        </p>
      </section>

      <Separator className="my-8" />

      {/* 3. Acceptable Use */}
      <section id="acceptable-use" className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">3. Acceptable Use Policy</h2>
        <p className="text-slate-700 leading-relaxed mb-3">
          You agree to use Voice to Action responsibly and ethically. The following activities are <strong>strictly prohibited</strong>:
        </p>
        <ul className="list-disc ml-6 space-y-2 text-slate-700">
          <li>Harassment, hate speech, threats, or incitement to violence</li>
          <li>Coordinated misinformation campaigns or deliberate spread of false information</li>
          <li>Election interference, voter suppression, or electoral manipulation</li>
          <li>Spamming, botting, automation, or creating multiple accounts</li>
          <li>Data scraping, unauthorized API usage, or system abuse</li>
          <li>Impersonation of individuals, institutions, or officials</li>
          <li>Bypassing identity verification or providing false credentials</li>
          <li>Creating misleading polls designed to manipulate public opinion</li>
          <li>Uploading malicious content, viruses, or harmful code</li>
          <li>Exploiting vulnerabilities or security flaws</li>
        </ul>
      </section>

      <Separator className="my-8" />

      {/* 4. Verified Identity */}
      <section id="identity-policy" className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">4. Verified Identity Policy</h2>
        <p className="text-slate-700 leading-relaxed mb-3">
          <strong>One Human = One Account.</strong> Voice to Action enforces strict identity verification to maintain trust and prevent manipulation.
        </p>
        <ul className="list-disc ml-6 space-y-2 text-slate-700">
          <li>You must provide accurate identity information when requested</li>
          <li>KYC (Know Your Customer) verification may be required for certain features</li>
          <li>You may not use fake IDs, fraudulent documents, or false information</li>
          <li>Anonymous posting is permitted only through designated platform features</li>
          <li>Creating multiple accounts is prohibited and will result in all accounts being banned</li>
          <li>We reserve the right to verify identity at any time</li>
        </ul>
      </section>

      <Separator className="my-8" />

      {/* 5. User-Generated Content */}
      <section id="user-content" className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">5. User-Generated Content Rules</h2>
        
        <h3 className="text-lg font-semibold text-slate-900 mt-4 mb-2">5.1 User Responsibilities</h3>
        <p className="text-slate-700 leading-relaxed mb-2">You are solely responsible for:</p>
        <ul className="list-disc ml-6 space-y-1 text-slate-700">
          <li>The legality of your content in your jurisdiction</li>
          <li>Accuracy of factual claims (evidence required for impact records)</li>
          <li>Ensuring uploaded media does not violate copyright</li>
          <li>Transparent intentions (political advertisements must be disclosed)</li>
        </ul>

        <h3 className="text-lg font-semibold text-slate-900 mt-4 mb-2">5.2 Platform Rights</h3>
        <p className="text-slate-700 leading-relaxed mb-2">Voice to Action reserves the right to:</p>
        <ul className="list-disc ml-6 space-y-1 text-slate-700">
          <li>Moderate, edit, remove, or restrict any content at our discretion</li>
          <li>Mark content as disputed, unverifiable, or misleading</li>
          <li>Add fact-check notices or bias warnings</li>
          <li>Remove content that violates these Terms or community guidelines</li>
        </ul>
      </section>

      <Separator className="my-8" />

      {/* 6. AI Systems */}
      <section id="ai-systems" className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">6. AI Systems Disclosure</h2>
        <p className="text-slate-700 leading-relaxed mb-3">
          Voice to Action uses artificial intelligence and machine learning systems to enhance platform functionality:
        </p>
        <ul className="list-disc ml-6 space-y-2 text-slate-700">
          <li><strong>Content Moderation:</strong> AI assists in detecting policy violations, hate speech, and harmful content</li>
          <li><strong>Topic Classification:</strong> AI automatically categorizes polls and extracts relevant tags</li>
          <li><strong>Sentiment Analysis:</strong> AI analyzes public opinion trends and patterns</li>
          <li><strong>Fact-Checking:</strong> AI flags unverified claims requiring human review</li>
          <li><strong>Bias Detection:</strong> AI identifies potentially biased language or framing</li>
          <li><strong>Impact Projections:</strong> AI estimates potential consequences of decisions</li>
        </ul>

        <Alert className="border-amber-500 bg-amber-50 my-4">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-sm text-amber-800">
            <strong>AI Limitations:</strong> AI predictions and classifications are not guaranteed to be accurate. 
            All critical decisions undergo human review. AI is a tool, not an authority.
          </AlertDescription>
        </Alert>
      </section>

      <Separator className="my-8" />

      {/* 7. Data & Privacy */}
      <section id="data-privacy" className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">7. Data Usage & Privacy Summary</h2>
        
        <h3 className="text-lg font-semibold text-slate-900 mt-4 mb-2">7.1 Data We Collect</h3>
        <ul className="list-disc ml-6 space-y-1 text-slate-700">
          <li>Identity data: name, email, country, age bracket (if provided)</li>
          <li>Profile data: display name, bio, preferences</li>
          <li>Usage data: votes, polls created, comments, interactions</li>
          <li>Technical data: IP address, device type, browser information</li>
          <li>Verification data: KYC documents (encrypted and secure)</li>
        </ul>

        <h3 className="text-lg font-semibold text-slate-900 mt-4 mb-2">7.2 How We Use Your Data</h3>
        <ul className="list-disc ml-6 space-y-1 text-slate-700">
          <li>To provide and improve the Service</li>
          <li>To verify identity and prevent fraud</li>
          <li>To calculate aggregate civic statistics (anonymized)</li>
          <li>To detect abuse and enforce policies</li>
          <li>To comply with legal obligations</li>
        </ul>

        <h3 className="text-lg font-semibold text-slate-900 mt-4 mb-2">7.3 Data Sharing</h3>
        <p className="text-slate-700 leading-relaxed">
          We share only <strong>aggregate, anonymized data</strong> publicly. Individual votes and personal information 
          are never sold or shared with third parties except as required by law or with your explicit consent.
        </p>

        <h3 className="text-lg font-semibold text-slate-900 mt-4 mb-2">7.4 Your Rights</h3>
        <ul className="list-disc ml-6 space-y-1 text-slate-700">
          <li>Request a copy of your data</li>
          <li>Delete your account and data (subject to legal retention requirements)</li>
          <li>Opt out of non-essential communications</li>
          <li>Update or correct your information</li>
        </ul>
      </section>

      <Separator className="my-8" />

      {/* 8. Safety & Moderation */}
      <section id="safety-moderation" className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">8. Safety & Moderation</h2>
        <p className="text-slate-700 leading-relaxed mb-3">
          Voice to Action employs a <strong>hybrid AI + human moderation system</strong> to maintain community safety:
        </p>
        <ul className="list-disc ml-6 space-y-2 text-slate-700">
          <li>Automated scanning for prohibited content</li>
          <li>User reporting tools available on all content</li>
          <li>Trained moderators review flagged content within 24-48 hours</li>
          <li>Crisis protocols for immediate threats or emergencies</li>
          <li>Transparent moderation logs (anonymized)</li>
        </ul>
      </section>

      <Separator className="my-8" />

      {/* 9. Institution Responsibilities */}
      <section id="institution-rules" className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Scale className="w-6 h-6 text-purple-600" />
          9. Institution Responsibilities
        </h2>
        <p className="text-slate-700 leading-relaxed mb-3">
          Institutions tracked or participating on Voice to Action must:
        </p>
        <ul className="list-disc ml-6 space-y-2 text-slate-700">
          <li>Provide truthful information about their decisions and policies</li>
          <li>Not upload fraudulent or misleading official statements</li>
          <li>Respect public opinion analytics and sentiment data</li>
          <li>Engage transparently with the community</li>
          <li>Honour commitments where feasible and publicly explain when they cannot</li>
        </ul>
        <p className="text-slate-700 leading-relaxed mt-3">
          <strong>Violations result in:</strong> Reduced trust scores, profile restrictions, public warnings, 
          and potential ban from the platform.
        </p>
      </section>

      <Separator className="my-8" />

      {/* 10. Disclaimers */}
      <section id="disclaimers" className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">10. Disclaimers & Limitations</h2>
        <ul className="list-disc ml-6 space-y-2 text-slate-700">
          <li>Voice to Action is <strong>not a government</strong> and does not have legal authority</li>
          <li>Voice to Action does not enforce laws or governmental decisions</li>
          <li>Poll results are not legally binding on any institution or government</li>
          <li>Voice to Action is not liable for decisions made by institutions based on platform data</li>
          <li>User-generated content may be inaccurate or misleading</li>
          <li>The platform is provided <strong>"as-is"</strong> without warranties of any kind</li>
          <li>We do not guarantee uptime, availability, or error-free operation</li>
        </ul>
      </section>

      <Separator className="my-8" />

      {/* 11. Termination */}
      <section id="termination" className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">11. Account Termination & Removal</h2>
        <p className="text-slate-700 leading-relaxed mb-3">
          Voice to Action may suspend or terminate your account for:
        </p>
        <ul className="list-disc ml-6 space-y-1 text-slate-700">
          <li>Violation of these Terms of Service</li>
          <li>Legal requirements or court orders</li>
          <li>Malicious behavior or abuse of the platform</li>
          <li>Copying, cloning, or replicating platform elements</li>
          <li>Coordination or manipulation attempts</li>
          <li>Repeated policy violations</li>
        </ul>
        <p className="text-slate-700 leading-relaxed mt-3">
          Users may delete their account at any time from Settings. Some data may be retained as required by law.
        </p>
      </section>

      <Separator className="my-8" />

      {/* 12. Governing Law */}
      <section id="governing-law" className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">12. Governing Law & Jurisdiction</h2>
        <p className="text-slate-700 leading-relaxed">
          These Terms are governed by the <strong>laws of Australia</strong>, unless overridden by mandatory local 
          jurisdictional requirements in your country of residence. Disputes will be resolved in Australian courts 
          or through binding arbitration as required by local law.
        </p>
      </section>

      <Separator className="my-8" />

      {/* 13. Updates */}
      <section id="updates" className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">13. Updates to Terms</h2>
        <p className="text-slate-700 leading-relaxed mb-3">
          Voice to Action may update these Terms at any time. We will notify users of material changes via email or 
          platform notification. Continued use after notification constitutes acceptance of the new Terms.
        </p>
        <p className="text-slate-700 leading-relaxed">
          For significant changes, we may require explicit re-acceptance before you can continue using the platform.
        </p>
      </section>

      <Separator className="my-8" />

      {/* Contact */}
      <section id="contact" className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">14. Contact Information</h2>
        <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 not-prose">
          <h3 className="font-bold text-slate-900 mb-3">Contact Every Voice Proprietary Limited</h3>
          <p className="text-slate-700 text-sm"><strong>Legal Entity:</strong> Every Voice Proprietary Limited</p>
          <p className="text-slate-700 text-sm"><strong>Trading As:</strong> Voice to Action</p>
          <p className="text-slate-700 text-sm"><strong>Country:</strong> Australia</p>
          <p className="text-slate-700 text-sm"><strong>Email:</strong> {SUPPORT_EMAIL}</p>
          <p className="text-xs text-slate-500 mt-2">
            For legal notices, IP complaints, data requests or compliance queries,
            email {SUPPORT_EMAIL} with subject line "Legal Notice".
          </p>
        </div>
      </section>

      <Separator className="my-8" />

      {/* 15. Intermediary Service */}
      <section id="intermediary-status" className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">15. Platform Status — Intermediary Service</h2>
        <p className="text-slate-700 leading-relaxed mb-3">
          Voice to Action operates as an online intermediary platform that hosts user-generated content.
        </p>
        <ul className="list-disc ml-6 space-y-2 text-slate-700">
          <li>Voice to Action does not pre-approve, endorse, verify, or guarantee the accuracy of content posted by users.</li>
          <li>All polls, comments, petitions, messages, media, and opinions are created by users and remain the sole responsibility of the user who posted them.</li>
          <li>Voice to Action acts only as a service provider that enables communication between users.</li>
          <li>To the maximum extent permitted by law, Voice to Action shall not be considered the publisher, author, or speaker of user-generated content.</li>
          <li>Voice to Action will remove or restrict content when required by law, court order, government authority, or platform policy.</li>
        </ul>
      </section>

      <Separator className="my-8" />

      {/* 16. No Free Speech Guarantee */}
      <section id="no-free-speech-guarantee" className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">16. No Guarantee of Free Speech</h2>
        <p className="text-slate-700 leading-relaxed mb-3">
          Voice to Action does not guarantee unrestricted speech. Content may be removed, restricted, flagged, or blocked at any time for any of the following reasons:
        </p>
        <ul className="list-disc ml-6 space-y-1 text-slate-700">
          <li>Violation of law</li>
          <li>Violation of these Terms</li>
          <li>Safety concerns</li>
          <li>Risk of harm</li>
          <li>Defamation risk</li>
          <li>Misinformation risk</li>
          <li>Government or regulatory request</li>
          <li>Moderation decision</li>
          <li>Platform integrity protection</li>
        </ul>
        <p className="text-slate-700 leading-relaxed mt-3">
          Users acknowledge that access to the platform is conditional and may be limited at the discretion of Voice to Action.
        </p>
      </section>

      <Separator className="my-8" />

      {/* 17. Australian Law Compliance */}
      <section id="australian-law" className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">17. Compliance with Australian Law</h2>
        <p className="text-slate-700 leading-relaxed mb-3">
          Voice to Action operates in accordance with applicable laws of Australia, including but not limited to:
        </p>
        <ul className="list-disc ml-6 space-y-1 text-slate-700">
          <li>Corporations Act 2001</li>
          <li>Online Safety Act 2021</li>
          <li>Privacy Act 1988</li>
          <li>Criminal Code Act 1995</li>
          <li>Australian Consumer Law</li>
          <li>Defamation law of Australian states and territories</li>
          <li>eSafety Commissioner regulations</li>
          <li>Any lawful court order or government directive</li>
        </ul>
        <p className="text-slate-700 leading-relaxed mt-3">
          Where required by law, Voice to Action may remove content, restrict accounts, provide information to authorities, or suspend services.
          Users agree that compliance with law overrides any expectation of content availability.
        </p>
      </section>

      <Separator className="my-8" />

      {/* 18. Director & Company Liability Separation */}
      <section id="director-liability" className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">18. Director and Company Liability Separation</h2>
        <p className="text-slate-700 leading-relaxed mb-3">
          The Voice to Action service is operated by <strong>Every Voice Pty Ltd</strong>, a proprietary limited company registered in Australia.
          All obligations, liabilities, and responsibilities relating to the platform are undertaken by the company.
        </p>
        <p className="text-slate-700 leading-relaxed mb-2">To the maximum extent permitted by law:</p>
        <ul className="list-disc ml-6 space-y-1 text-slate-700">
          <li>Directors are not personally liable for user content</li>
          <li>Officers are not personally liable for user actions</li>
          <li>Employees are not personally liable for platform activity</li>
        </ul>
        <p className="text-slate-700 leading-relaxed mt-3">
          Nothing in these Terms excludes liability where personal liability is required by law.
          Users agree that claims relating to the Service must be made against the company and not against individual directors, officers, employees, or contractors.
        </p>
      </section>

      <Separator className="my-8" />

      {/* 19. User Responsibility for Content */}
      <section id="user-responsibility" className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">19. User Responsibility for Content</h2>
        <p className="text-slate-700 leading-relaxed mb-3">
          Users are solely responsible for all content they create, upload, publish, transmit, or display on Voice to Action.
          Users must ensure their content complies with all laws in their jurisdiction.
        </p>
        <p className="text-slate-700 leading-relaxed mb-2">Users must not post content that is:</p>
        <ul className="list-disc ml-6 space-y-1 text-slate-700">
          <li>Illegal</li>
          <li>Defamatory</li>
          <li>Threatening or harassing</li>
          <li>Fraudulent or misleading</li>
          <li>Abusive or extremist</li>
          <li>Copyrighted without permission</li>
          <li>Invasive of privacy</li>
          <li>Harmful to individuals or institutions</li>
        </ul>
        <p className="text-slate-700 leading-relaxed mt-3">
          Voice to Action does not guarantee the accuracy, legality, or truthfulness of user content.
        </p>
      </section>

      <Separator className="my-8" />

      {/* 20. Defamation & Statement Disclaimer */}
      <section id="defamation-disclaimer" className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">20. Defamation & Statement Disclaimer</h2>
        <p className="text-slate-700 leading-relaxed mb-3">
          Voice to Action provides a platform for public opinion and discussion. Statements made by users do not represent the views of Voice to Action.
          Voice to Action is not responsible for statements made by users.
        </p>
        <ul className="list-disc ml-6 space-y-1 text-slate-700">
          <li>Users agree not to post defamatory material.</li>
          <li>If notified of alleged defamation, Voice to Action may remove or restrict content without notice.</li>
        </ul>
      </section>

      <Separator className="my-8" />

      {/* 21. Notice & Takedown */}
      <section id="notice-takedown" className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">21. Notice and Takedown Procedure</h2>
        <p className="text-slate-700 leading-relaxed mb-3">
          If you believe content violates law or these Terms, you may submit a report. Reports must include:
        </p>
        <ul className="list-disc ml-6 space-y-1 text-slate-700 mb-3">
          <li>Description of the content</li>
          <li>Location of the content on the platform</li>
          <li>Reason for the report</li>
          <li>Contact details (optional but recommended)</li>
        </ul>
        <p className="text-slate-700 leading-relaxed mb-2">Voice to Action may review and take action including:</p>
        <ul className="list-disc ml-6 space-y-1 text-slate-700">
          <li>Removal or restriction of content</li>
          <li>Warning, suspension, or account termination</li>
          <li>Compliance with lawful requests from courts, regulators, or authorities</li>
          <li>Immediate removal of emergency threats without notice</li>
        </ul>
      </section>

      <Separator className="my-8" />

      {/* 22. Moderation Rights */}
      <section id="moderation-rights" className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">22. Moderation Rights</h2>
        <p className="text-slate-700 leading-relaxed mb-3">
          Voice to Action reserves the right to moderate content at its sole discretion. Moderation may be performed by:
        </p>
        <ul className="list-disc ml-6 space-y-1 text-slate-700">
          <li>Automated systems</li>
          <li>Human moderators</li>
          <li>External reviewers</li>
          <li>Legal advisors</li>
        </ul>
        <p className="text-slate-700 leading-relaxed mt-3">
          Moderation decisions are final unless required otherwise by law.
        </p>
      </section>

      <Separator className="my-8" />

      {/* 23. Government & Regulatory Requests */}
      <section id="government-requests" className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">23. Government and Regulatory Requests</h2>
        <p className="text-slate-700 leading-relaxed mb-3">
          Voice to Action may comply with requests from:
        </p>
        <ul className="list-disc ml-6 space-y-1 text-slate-700 mb-3">
          <li>Courts and law enforcement</li>
          <li>Regulators and government agencies</li>
          <li>eSafety Commissioner</li>
          <li>Data protection authorities</li>
        </ul>
        <p className="text-slate-700 leading-relaxed mb-2">This may include:</p>
        <ul className="list-disc ml-6 space-y-1 text-slate-700">
          <li>Content removal or account suspension</li>
          <li>Information disclosure where required by law</li>
        </ul>
        <p className="text-slate-700 leading-relaxed mt-3">
          Users agree that such actions do not create liability for Voice to Action.
        </p>
      </section>

      <Separator className="my-8" />

      {/* 24. Limitation of Liability */}
      <section id="limitation-liability" className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">24. Limitation of Liability</h2>
        <p className="text-slate-700 leading-relaxed mb-3">
          To the maximum extent permitted by law, Voice to Action is not liable for:
        </p>
        <ul className="list-disc ml-6 space-y-1 text-slate-700">
          <li>User content or user decisions</li>
          <li>Institutional actions</li>
          <li>Third-party behaviour</li>
          <li>Data interpretation</li>
          <li>Poll results or public opinion outcomes</li>
        </ul>
        <p className="text-slate-700 leading-relaxed mt-3">
          The platform is provided <strong>"as is"</strong>. Use of the platform is at your own risk.
        </p>
      </section>

      <Separator className="my-8" />

      {/* 25. Severability */}
      <section id="severability" className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">25. Severability</h2>
        <p className="text-slate-700 leading-relaxed">
          If any part of these Terms is found invalid or unenforceable by a court of competent jurisdiction, 
          the remaining provisions remain in full force and effect.
        </p>
      </section>

      <Separator className="my-8" />

      {/* 27. Government Requests */}
      <section id="government-requests-formal" className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Scale className="w-6 h-6 text-blue-600" />
          27. Government Requests and Formal Legal Process
        </h2>
        <p className="text-slate-700 leading-relaxed mb-3">
          Voice to Action will respond only to lawful and properly issued requests from government authorities, regulators, or courts.
          Informal requests, verbal requests, or requests without legal authority will not require action by the Platform.
        </p>
        <p className="text-slate-700 leading-relaxed mb-2">
          Requests for content removal, user information, or account restriction must be supported by one of the following where required by law:
        </p>
        <ul className="list-disc ml-6 space-y-1 text-slate-700 mb-3">
          <li>Court order</li>
          <li>Statutory notice</li>
          <li>Lawful warrant</li>
          <li>Regulatory direction issued under applicable legislation</li>
          <li>Written request from a legally authorised government body</li>
        </ul>
        <p className="text-slate-700 leading-relaxed">
          Voice to Action reserves the right to verify the authenticity and legality of any request before taking action.
        </p>
      </section>

      <Separator className="my-8" />

      {/* 28. Administrative Costs */}
      <section id="administrative-costs" className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">28. Administrative Costs for Non-Mandatory Requests</h2>
        <p className="text-slate-700 leading-relaxed mb-3">
          Where a request from a government body or institution is voluntary and not legally required, Voice to Action may charge
          reasonable administrative and legal processing fees before providing assistance.
        </p>
        <p className="text-slate-700 leading-relaxed mb-2">Such fees may include:</p>
        <ul className="list-disc ml-6 space-y-1 text-slate-700 mb-3">
          <li>Legal review costs</li>
          <li>Administrative handling costs</li>
          <li>Technical processing costs</li>
          <li>Data retrieval costs</li>
        </ul>
        <p className="text-slate-700 leading-relaxed">
          Fees will not apply where compliance is required by law.
        </p>
      </section>

      <Separator className="my-8" />

      {/* 29. No Direct Access */}
      <section id="no-direct-access" className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">29. No Direct Access to Platform Operators</h2>
        <p className="text-slate-700 leading-relaxed mb-3">
          Government agencies, institutions, or third parties do not have automatic direct access to the platform operator,
          director, or staff.
        </p>
        <ul className="list-disc ml-6 space-y-1 text-slate-700">
          <li>All communication must occur through official contact channels listed in these Terms.</li>
          <li>Direct personal contact with directors, owners, or employees is not permitted unless required by law.</li>
        </ul>
      </section>

      <Separator className="my-8" />

      {/* 30. Compliance with Lawful Orders */}
      <section id="lawful-orders" className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">30. Compliance with Lawful Orders</h2>
        <p className="text-slate-700 leading-relaxed mb-3">
          Nothing in these Terms limits the obligation of Voice to Action to comply with valid legal orders issued under Australian law.
        </p>
        <p className="text-slate-700 leading-relaxed">
          Where a lawful order is received, Voice to Action may remove content, restrict access, or provide information as required.
        </p>
      </section>

      <Separator className="my-8" />

      {/* 31. Protection Against Informal Censorship */}
      <section id="informal-censorship" className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Shield className="w-6 h-6 text-emerald-600" />
          31. Protection Against Informal Censorship
        </h2>
        <p className="text-slate-700 leading-relaxed mb-3">
          Voice to Action will not remove content solely based on political disagreement, public pressure, or informal requests
          that do not have legal authority.
        </p>
        <p className="text-slate-700 leading-relaxed mb-2">Content removal decisions will be based on:</p>
        <ul className="list-disc ml-6 space-y-1 text-slate-700">
          <li>Violation of law</li>
          <li>Violation of Terms</li>
          <li>Safety risk</li>
          <li>Court order</li>
          <li>Regulatory requirement</li>
        </ul>
      </section>

      <Separator className="my-8" />

      {/* 32. Petition Delivery Discretion */}
      <section id="petition-delivery-discretion" className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">32. Petition Delivery — Every Voice Pty Ltd Discretion and Creator Self-Delivery</h2>
        <p className="text-slate-700 leading-relaxed mb-3">
        Voice to Action offers an optional paid petition delivery service whereby Every Voice Pty Ltd may personally deliver or formally
        submit a petition to the relevant authority, institution, or individual on behalf of the petition creator.
        </p>
        <p className="text-slate-700 leading-relaxed mb-3">
        Every Voice Pty Ltd reserves the sole and absolute right to decline to personally deliver or formally submit any petition
        if, in their reasonable opinion, the subject matter, cause, or target of the petition does not warrant personal attention
        or direct engagement by Every Voice Pty Ltd. This includes, but is not limited to, petitions that:
        </p>
        <ul className="list-disc ml-6 space-y-1 text-slate-700 mb-4">
        <li>Are directed at trivial, frivolous, or non-substantive matters in Every Voice Pty Ltd's reasonable judgement</li>
        <li>Do not align with the civic engagement or democratic participation purposes of the platform</li>
        <li>Target individuals or institutions in a manner Every Voice Pty Ltd does not consider appropriate for personal representation</li>
        <li>Relate to purely private disputes rather than matters of genuine public interest</li>
        </ul>
        <p className="text-slate-700 leading-relaxed mb-3">
        Where Every Voice Pty Ltd declines to personally deliver a petition, the petition creator retains the right to use the
        <strong> Self-Delivery option ($25.00 AUD)</strong> to obtain an official printed and certified copy of the petition —
        including all verified signatures and supporting documentation — which the creator may then personally deliver to the
        relevant authority themselves.
        </p>
        <p className="text-slate-700 leading-relaxed mb-3">
        The $25.00 AUD self-delivery fee covers the cost of preparation, printing, certification, and packaging of the petition
        materials. It does not include any representation, endorsement, or involvement by Every Voice Pty Ltd in
        the delivery itself.
        </p>
        <p className="text-slate-700 leading-relaxed">
        Every Voice Pty Ltd's decision to decline personal delivery is final and is not subject to appeal. No refund of any prior fees
        is owed solely on the basis of Every Voice Pty Ltd exercising this discretion.
        </p>
      </section>

      <Separator className="my-8" />

      {/* 33. Platform Ownership and Legal Entity Disclosure */}
      <section id="platform-ownership" className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Scale className="w-6 h-6 text-blue-600" />
          33. Platform Ownership and Legal Entity Disclosure
        </h2>

        <h3 className="text-lg font-semibold text-slate-800 mb-2">Platform Name and Operating Entity</h3>
        <p className="text-slate-700 leading-relaxed mb-3">
          The platforms known as <strong>Voice to Action</strong>, <strong>Voice to Action</strong>, <strong>Voice to Action Platform</strong>,
          <strong> Voice to Action App</strong>, <strong>Voice to Action Website</strong>, and <strong>Voice to Action</strong> are
          products, services, and trading names operated by the legal entity:
        </p>
        <div className="ml-4 mb-4 bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-1">
          <p className="text-slate-800 font-semibold">Every Voice Pty Ltd</p>
          <p className="text-slate-700 text-sm">ABN: 86 768 265 615</p>
          <p className="text-slate-700 text-sm">Entity Type: Proprietary Limited Company</p>
          <p className="text-slate-700 text-sm">Country of Registration: Australia</p>
        </div>
        <p className="text-slate-700 leading-relaxed mb-4">
          All services, systems, software, applications, websites, databases, and features provided under the names listed above
          are owned, controlled, governed, and operated by Every Voice Pty Ltd.
        </p>

        <h3 className="text-lg font-semibold text-slate-800 mb-2">No Personal Operation by Individual</h3>
        <p className="text-slate-700 leading-relaxed mb-3">
          The Platform is not operated by any individual in a personal capacity. All platform activities are conducted by the
          company Every Voice Pty Ltd. To the maximum extent permitted by law:
        </p>
        <ul className="list-disc ml-6 space-y-1 text-slate-700 mb-4">
          <li>The director is not personally responsible for user content</li>
          <li>Every Voice Pty Ltd is not personally responsible for platform activity</li>
          <li>The secretary is not personally responsible for user actions</li>
          <li>Employees and contractors are not personally liable for platform use</li>
        </ul>
        <p className="text-slate-700 leading-relaxed mb-4">
          All obligations relating to the platform are obligations of the company.
        </p>

        <h3 className="text-lg font-semibold text-slate-800 mb-2">Trading Name Clarification</h3>
        <p className="text-slate-700 leading-relaxed mb-4">
          <strong>Voice to Action</strong> and <strong>Voice to Action</strong> are trading names, brand names, or product names used by
          Every Voice Pty Ltd. Use of these names does not create a separate legal entity. All legal responsibility remains with
          Every Voice Pty Ltd.
        </p>

        <h3 className="text-lg font-semibold text-slate-800 mb-2">Limitation of Personal Liability</h3>
        <p className="text-slate-700 leading-relaxed mb-4">
          Users agree that any claim, dispute, or legal action relating to the platform must be made against the company
          Every Voice Pty Ltd and not against any individual director, officer, employee, or contractor, except where personal
          liability is required by law.
        </p>

        <h3 className="text-lg font-semibold text-slate-800 mb-2">No Partnership or Public Authority</h3>
        <p className="text-slate-700 leading-relaxed mb-2">Nothing on the platform creates:</p>
        <ul className="list-disc ml-6 space-y-1 text-slate-700 mb-3">
          <li>A government body</li>
          <li>A public authority</li>
          <li>A partnership</li>
          <li>A joint venture</li>
          <li>A legal mandate</li>
          <li>An official institution</li>
        </ul>
        <p className="text-slate-700 leading-relaxed">
          The platform is a private service operated by Every Voice Pty Ltd.
        </p>
      </section>

      <Separator className="my-8" />

      {/* 34. Platform Purpose and No Legal Authority Disclaimer */}
      <section id="platform-purpose-disclaimer" className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Shield className="w-6 h-6 text-emerald-600" />
          34. Platform Purpose and No Legal Authority Disclaimer
        </h2>

        <h3 className="text-lg font-semibold text-slate-800 mb-2">Platform Purpose</h3>
        <p className="text-slate-700 leading-relaxed mb-4">
          Voice to Action / Voice to Action is a private online platform designed to allow users to express opinions, create polls,
          publish petitions, discuss topics, and view aggregated public sentiment. The platform is intended for discussion,
          feedback, and informational purposes only. The platform does not provide legal, political, governmental, or official
          decision-making authority.
        </p>

        <h3 className="text-lg font-semibold text-slate-800 mb-2">No Government Status</h3>
        <p className="text-slate-700 leading-relaxed mb-4">
          Voice to Action / Voice to Action is not a government body and is not affiliated with any government, parliament, court,
          regulator, or public authority unless explicitly stated in writing. Use of governmental names, institutions, or public
          figures on the platform does not imply endorsement, approval, or official involvement.
        </p>

        <h3 className="text-lg font-semibold text-slate-800 mb-2">No Legal Force of Votes or Polls</h3>
        <p className="text-slate-700 leading-relaxed mb-2">
          Polls, votes, petitions, ratings, or public opinion results displayed on the platform:
        </p>
        <ul className="list-disc ml-6 space-y-1 text-slate-700 mb-3">
          <li>Are not legally binding</li>
          <li>Do not create legal obligations</li>
          <li>Do not require action by any institution</li>
          <li>Do not represent official decisions</li>
          <li>Do not create contracts or mandates</li>
        </ul>
        <p className="text-slate-700 leading-relaxed mb-4">
          All results are informational only. Users and institutions are responsible for how they interpret or use platform data.
        </p>

        <h3 className="text-lg font-semibold text-slate-800 mb-2">No Responsibility for User Decisions</h3>
        <p className="text-slate-700 leading-relaxed mb-2">Every Voice Pty Ltd is not responsible for:</p>
        <ul className="list-disc ml-6 space-y-1 text-slate-700 mb-4">
          <li>Actions taken based on poll results</li>
          <li>Decisions influenced by platform content</li>
          <li>Political choices made by users</li>
          <li>Institutional responses to public opinion</li>
          <li>Financial, legal, or personal decisions made using platform information</li>
        </ul>
        <p className="text-slate-700 leading-relaxed mb-4">Use of the platform is at the user's own risk.</p>

        <h3 className="text-lg font-semibold text-slate-800 mb-2">User Opinions Do Not Represent the Platform</h3>
        <p className="text-slate-700 leading-relaxed mb-2">
          Content posted by users represents the views of the user only and does not represent the views of Voice to Action,
          Voice to Action, Every Voice Pty Ltd, the director, moderators, employees, or contractors. The platform does
          not endorse user opinions.
        </p>

        <h3 className="text-lg font-semibold text-slate-800 mb-2 mt-4">Civic and Political Content Disclaimer</h3>
        <p className="text-slate-700 leading-relaxed mb-4">
          The platform may contain political, civic, social, or public policy discussions. Such content is provided by users.
          Every Voice Pty Ltd does not guarantee the accuracy, truthfulness, or legality of user statements. Users are responsible
          for complying with the laws of their jurisdiction.
        </p>

        <h3 className="text-lg font-semibold text-slate-800 mb-2">No Duty to Enforce Public Opinion</h3>
        <p className="text-slate-700 leading-relaxed mb-4">
          Every Voice Pty Ltd has no duty to enforce poll results, petitions, or public sentiment. Institutions listed on the
          platform are not required to follow platform outcomes. The platform is a communication tool only.
        </p>

        <h3 className="text-lg font-semibold text-slate-800 mb-2">Limitation of Platform Role</h3>
        <p className="text-slate-700 leading-relaxed mb-2">The role of the platform is limited to:</p>
        <ul className="list-disc ml-6 space-y-1 text-slate-700">
          <li>Hosting content</li>
          <li>Displaying information</li>
          <li>Providing tools for discussion</li>
          <li>Providing tools for voting</li>
          <li>Providing analytics and summaries</li>
        </ul>
        <p className="text-slate-700 leading-relaxed mt-3">The platform does not control real-world events.</p>
      </section>

      <Separator className="my-8" />

      {/* 35. User Safety and Platform Protection Policy */}
      <section id="user-safety-platform-protection" className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Shield className="w-6 h-6 text-blue-600" />
          35. User Safety and Platform Protection Policy
        </h2>

        <h3 className="text-lg font-semibold text-slate-800 mb-2">Platform Safety Intent</h3>
        <p className="text-slate-700 leading-relaxed mb-4">
          Voice to Action / Voice to Action is designed to provide a safe environment for discussion, voting, and public expression.
          Every Voice Pty Ltd makes reasonable efforts to maintain platform integrity, reduce abuse, and protect users from harmful behavior.
          These efforts may include moderation, automated detection systems, reporting tools, account restrictions, and content removal.
        </p>

        <h3 className="text-lg font-semibold text-slate-800 mb-2">No Guarantee of User Safety</h3>
        <p className="text-slate-700 leading-relaxed mb-2">
          While the platform aims to promote a respectful and lawful environment, Every Voice Pty Ltd does not guarantee that the Service will be free from:
        </p>
        <ul className="list-disc ml-6 space-y-1 text-slate-700 mb-4">
          <li>Offensive content</li>
          <li>Misleading information</li>
          <li>Harmful opinions</li>
          <li>User misconduct</li>
          <li>Illegal activity</li>
          <li>Technical errors</li>
          <li>Unauthorized access</li>
        </ul>
        <p className="text-slate-700 leading-relaxed mb-4">Use of the platform is at the user's own risk.</p>

        <h3 className="text-lg font-semibold text-slate-800 mb-2">User Responsibility for Interactions</h3>
        <p className="text-slate-700 leading-relaxed mb-2">
          Users are responsible for their own actions and interactions on the platform. Every Voice Pty Ltd is not responsible for:
        </p>
        <ul className="list-disc ml-6 space-y-1 text-slate-700 mb-4">
          <li>Statements made by users</li>
          <li>Disputes between users</li>
          <li>Decisions made based on content</li>
          <li>Actions taken in response to polls or comments</li>
          <li>Reliance on information posted by others</li>
        </ul>
        <p className="text-slate-700 leading-relaxed mb-4">Users must use their own judgment when interacting with content.</p>

        <h3 className="text-lg font-semibold text-slate-800 mb-2">No Duty to Monitor All Content</h3>
        <p className="text-slate-700 leading-relaxed mb-3">
          Every Voice Pty Ltd does not have a legal duty to monitor all content posted on the platform. Content may be reviewed using
          automated systems, human moderation, or user reports, but not all content can be reviewed at all times.
          Failure to remove or detect content does not create liability.
        </p>

        <h3 className="text-lg font-semibold text-slate-800 mb-2">Good Faith Moderation</h3>
        <p className="text-slate-700 leading-relaxed mb-2">
          Every Voice Pty Ltd may take action in good faith to maintain safety and compliance, including:
        </p>
        <ul className="list-disc ml-6 space-y-1 text-slate-700 mb-4">
          <li>Removing content</li>
          <li>Restricting accounts</li>
          <li>Limiting features</li>
          <li>Reporting illegal activity where required by law</li>
        </ul>
        <p className="text-slate-700 leading-relaxed mb-4">
          Such actions are taken to protect users and the platform and do not create legal responsibility for all user behavior.
        </p>

        <h3 className="text-lg font-semibold text-slate-800 mb-2">No Liability for User Content</h3>
        <p className="text-slate-700 leading-relaxed mb-4">
          To the maximum extent permitted by law, Every Voice Pty Ltd is not liable for damages caused by user-generated content,
          user conduct, or third-party actions on the platform. All content is provided by users, not by the company.
        </p>

        <h3 className="text-lg font-semibold text-slate-800 mb-2">Balance of User Protection and Platform Limitation</h3>
        <p className="text-slate-700 leading-relaxed">
          These Terms are intended to protect users while also limiting the legal exposure of the platform.
          Nothing in this section creates a legal duty beyond what is required by applicable law.
        </p>
      </section>

      <Separator className="my-8" />

      {/* 36. Mission Statement and Civic Purpose */}
      <section id="mission-statement" className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Globe2 className="w-6 h-6 text-blue-600" />
          36. Mission Statement and Civic Purpose
        </h2>

        <h3 className="text-lg font-semibold text-slate-800 mb-2">Platform Mission</h3>
        <p className="text-slate-700 leading-relaxed mb-4">
          Voice to Action / Voice to Action is a civic technology platform developed with the express purpose of fostering
          public transparency, democratic accountability, and the constructive engagement of citizens in matters of
          genuine public interest. The platform exists to bring recognition and accountability into the public eye,
          and to illuminate matters that warrant the attention of communities, institutions, and individuals.
        </p>

        <h3 className="text-lg font-semibold text-slate-800 mb-2">Commitment to Lawful Operation</h3>
        <p className="text-slate-700 leading-relaxed mb-4">
          Every Voice Pty Ltd is firmly committed to operating this platform in full compliance with all applicable
          laws and regulations. The platform will not knowingly endorse, facilitate, or promote any activity,
          content, or conduct that is contrary to law. Every Voice Pty Ltd will take all reasonable and practicable
          steps to ensure that the platform remains a lawful, safe, and constructive environment for civic participation.
        </p>
        <p className="text-slate-700 leading-relaxed mb-4">
          Where content or user behaviour is found to violate applicable law, the platform reserves the right to
          remove such content, restrict or terminate accounts, and cooperate with law enforcement authorities as required.
        </p>

        <h3 className="text-lg font-semibold text-slate-800 mb-2">Commitment to Truth and Accuracy</h3>
        <p className="text-slate-700 leading-relaxed mb-4">
          In alignment with the platform's transparency mission, users are strongly encouraged to submit only
          truthful, accurate, and verifiable information. The platform is intended to be a reliable source of
          civic insight and public accountability — and the integrity of that mission depends on the honesty and
          responsibility of its users.
        </p>

        <h3 className="text-lg font-semibold text-slate-800 mb-2">Non-Partisan Stance</h3>
        <p className="text-slate-700 leading-relaxed mb-4">
          Every Voice Pty Ltd does not endorse any political party, candidate, ideology, or campaign. The platform
          is designed to provide an equal and fair forum for diverse perspectives, and to represent the breadth
          of public opinion rather than advance any particular viewpoint.
        </p>

        <h3 className="text-lg font-semibold text-slate-800 mb-2">Limitation of Disclaimer</h3>
        <p className="text-slate-700 leading-relaxed">
          While Every Voice Pty Ltd is committed to lawful and responsible operation, the platform cannot guarantee
          that all user-generated content complies with the law. Users remain individually responsible for the
          content they submit and the conduct they engage in on the platform.
        </p>
      </section>

      <Separator className="my-8" />

      {/* 37. Payments & Refund Policy */}
      <section id="payments-refund" className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Shield className="w-6 h-6 text-blue-600" />
          37. Payments and Refund Policy
        </h2>
        <Alert className="border-amber-200 bg-amber-50 mb-4">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-sm text-amber-800">
            <strong>All payments made on Voice to Action are non-refundable unless a paid service is not provided.</strong>
          </AlertDescription>
        </Alert>
        <p className="text-slate-700 leading-relaxed mb-3">
          By making any payment on Voice to Action, you acknowledge and agree that:
        </p>
        <ul className="list-disc ml-6 space-y-2 text-slate-700">
          <li>All payments are <strong>final and non-refundable</strong> once processed, unless the purchased service is not delivered.</li>
          <li>Petition withdrawal/download fees ($1.99 AUD) are non-refundable once the CSV has been made available for download.</li>
          <li>Identity verification fees are non-refundable once the verification process has been initiated.</li>
          <li>Subscription fees are non-refundable for the current billing period.</li>
          <li>Donation payments are non-refundable and are processed directly to the nominated charity.</li>
          <li>If a paid service is genuinely not delivered due to a platform error, you may contact us at voicetoaction@outlook.com to request a review.</li>
        </ul>
        <p className="text-slate-700 leading-relaxed mt-3">
          Refund requests must be submitted within 7 days of payment and include proof of non-delivery. 
          Voice to Action reserves the right to determine whether a service has been delivered.
        </p>
      </section>

      <div className="mt-12 pt-8 border-t border-slate-300 text-center">
        <p className="text-sm text-slate-600">
          © 2026 Voice to Action (Every Voice Pty Ltd). All rights reserved worldwide.
        </p>
        <p className="text-xs text-slate-500 mt-1">
          Last updated: March 11, 2026 • Version {CURRENT_TOS_VERSION}
        </p>
      </div>
    </div>
  );
}