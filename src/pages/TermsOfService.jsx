
function Section({ title, children }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
      <div className="space-y-3 text-slate-700">{children}</div>
    </section>
  );
}

export default function TermsOfService() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-10 sm:py-14">
      <article className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-10 space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900">Terms of Service</h1>
          <p className="text-slate-700 font-medium">Voice to Action</p>
          <p className="text-sm text-slate-600">Operated by Every Voice Pty Ltd · ACN 696 098 218</p>
          <p className="text-sm text-slate-600">Contact: voicetoaction@outlook.com</p>
          <p className="text-sm text-slate-600">Last updated: April 2026</p>
        </header>

        <Section title="1. About These Terms">
          <p>
            These Terms of Service govern your use of Voice to Action, a civic accountability platform operated by
            Every Voice Pty Ltd (ACN 696 098 218). By creating an account or using Voice to Action you agree to these terms in full.
          </p>
          <p>If you do not agree to these terms you must not use the platform.</p>
        </Section>

        <Section title="2. Who Can Use Voice to Action">
          <ul className="list-disc pl-6 space-y-1">
            <li>Aged 16 or over</li>
            <li>A human individual (not a bot, automated system, or fake account)</li>
            <li>Legally capable of entering into a binding agreement</li>
            <li>Not previously banned from the platform</li>
          </ul>
        </Section>

        <Section title="3. Your Account">
          <p className="font-medium">Registration</p>
          <p>You must provide accurate and truthful information when creating your account. You are responsible for keeping your account information up to date.</p>
          <p className="font-medium">Security</p>
          <p>You are responsible for keeping your password secure. Do not share your account with anyone. If you believe your account has been compromised, contact us immediately at voicetoaction@outlook.com.</p>
          <p className="font-medium">One account per person</p>
          <p>You may only create one account. Creating multiple accounts to manipulate votes, signatures, or ratings is strictly prohibited and will result in all accounts being permanently banned.</p>
        </Section>

        <Section title="4. Blue Checkmark Verification">
          <p className="font-medium">What it is</p>
          <p>The Blue Checkmark is a one-time paid identity verification ($12.99 AUD) that confirms you are a real, verified person.</p>
          <p className="font-medium">Payment</p>
          <p>Payment is processed securely by Stripe. The fee is $12.99 AUD and is charged once only. There are no subscriptions or recurring charges.</p>
          <p className="font-medium">Non-refundable</p>
          <p>All payments are non-refundable unless the service is not provided due to a technical failure on our part.</p>
          <p className="font-medium">Identity verification</p>
          <p>The identity verification process is conducted by Stripe Identity. We never see or store your documents.</p>
        </Section>

        <Section title="5. What You Can Do on Voice to Action">
          <ul className="list-disc pl-6 space-y-1">
            <li>Create and sign petitions</li>
            <li>Create and vote in polls</li>
            <li>Participate in public discussions and comment on policy</li>
            <li>Rate and review public figures and corporations based on their public conduct</li>
            <li>Create and join communities</li>
            <li>Share content related to civic issues and accountability</li>
          </ul>
        </Section>

        <Section title="6. What You Cannot Do">
          <p className="font-medium">Fake activity</p>
          <p>Create fake accounts, impersonate others, or manipulate signatures, votes, or ratings.</p>
          <p className="font-medium">Harmful content</p>
          <p>Do not post defamatory, threatening, hateful, explicit, or exploitative content.</p>
          <p className="font-medium">Illegal activity</p>
          <p>Do not use the platform for unlawful acts, fraud, scams, or attempts to damage the platform.</p>
          <p className="font-medium">Manipulation</p>
          <p>Do not coordinate inauthentic behaviour or scrape platform data without permission.</p>
        </Section>

        <Section title="7. Content You Post">
          <p>You are solely responsible for all content you post on Voice to Action.</p>
          <p>By posting content, you grant Every Voice Pty Ltd a non-exclusive, royalty-free licence to display, distribute, and promote that content on the platform. You retain ownership.</p>
          <p>We reserve the right to remove content that breaches these terms or harms users/platform integrity.</p>
        </Section>

        <Section title="8. Petitions">
          <p>When you create a petition you are responsible for ensuring the content is accurate, lawful, and genuine.</p>
          <p>By signing a petition, you confirm you genuinely support its purpose.</p>
          <p>Petition delivery is offered but not guaranteed.</p>
        </Section>

        <Section title="9. Public Figures and Corporations">
          <p>Ratings and comments must be based on genuine opinion, relate to public conduct, and not be defamatory under Australian law.</p>
          <p>If you believe content about you is unlawful, contact voicetoaction@outlook.com.</p>
        </Section>

        <Section title="10. Payments and Subscriptions">
          <ul className="list-disc pl-6 space-y-1">
            <li>Blue Checkmark: $12.99 AUD one-time payment — non-refundable</li>
            <li>Community subscriptions: $19.99 AUD per month — cancel any time</li>
            <li>Petition export: $25.00 AUD one-time — non-refundable</li>
            <li>Donations: voluntary — non-refundable</li>
          </ul>
        </Section>

        <Section title="11. Termination">
          <p>You may delete your account at any time through account settings.</p>
          <p>We may suspend or permanently ban accounts that breach these terms, including serious fraud or safety risks.</p>
        </Section>

        <Section title="12. Limitation of Liability">
          <p>To the maximum extent permitted by Australian law, Every Voice Pty Ltd is not liable for losses from use of the platform, user-generated content, or service outages.</p>
          <p>Our total liability is limited to the amount you paid us in the 12 months before a claim.</p>
        </Section>

        <Section title="13. Disputes">
          <p>If you have a dispute, contact voicetoaction@outlook.com first. These terms are governed by the laws of New South Wales, Australia.</p>
        </Section>

        <Section title="14. Changes to These Terms">
          <p>We may update these terms from time to time and will notify users of significant changes by email.</p>
        </Section>

        <Section title="15. Contact Us">
          <p>Every Voice Pty Ltd</p>
          <p>ACN 696 098 218</p>
          <p>Email: voicetoaction@outlook.com</p>
        </Section>
      </article>
    </div>
  );
}