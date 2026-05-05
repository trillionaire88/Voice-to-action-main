
function Section({ title, children }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
      <div className="space-y-3 text-slate-700">{children}</div>
    </section>
  );
}

export default function PrivacyPolicy() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-10 sm:py-14">
      <article className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-10 space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900">Privacy Policy</h1>
          <p className="text-slate-700 font-medium">Voice to Action</p>
          <p className="text-sm text-slate-600">Operated by Every Voice Pty Ltd · ACN 696 098 218</p>
          <p className="text-sm text-slate-600">Contact: voicetoaction@outlook.com</p>
          <p className="text-sm text-slate-600">Last updated: April 2026</p>
        </header>

        <Section title="1. About This Policy">
          <p>
            Every Voice Pty Ltd (we, us, our) operates Voice to Action, a civic accountability platform
            where Australians can create and sign petitions, vote in polls, participate in public discussions,
            and hold public figures and corporations accountable.
          </p>
          <p>
            This Privacy Policy explains how we collect, use, store, and protect your personal information.
            We are committed to complying with the Australian Privacy Act 1988 (Cth) and the Australian
            Privacy Principles (APPs).
          </p>
          <p>By using Voice to Action you agree to the collection and use of your information as described in this policy.</p>
        </Section>

        <Section title="2. Who We Are">
          <p>Every Voice Pty Ltd</p>
          <p>ACN 696 098 218</p>
          <p>Email: voicetoaction@outlook.com</p>
        </Section>

        <Section title="3. What Information We Collect">
          <p className="font-medium">Account information</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Your name and display name</li>
            <li>Email address</li>
            <li>Phone number (optional, for verification)</li>
            <li>Password (stored encrypted, never readable by us)</li>
            <li>Profile photo (if you choose to upload one)</li>
          </ul>
          <p className="font-medium">Verification information</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Government-issued ID documents (processed by Stripe Identity — we never see or store these ourselves)</li>
            <li>Identity verification status</li>
            <li>Payment records for the one-time $12.99 AUD verification fee</li>
          </ul>
          <p className="font-medium">Activity information</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Petitions you have created or signed</li>
            <li>Polls you have voted in</li>
            <li>Comments and discussions you have participated in</li>
            <li>Communities you have joined</li>
            <li>Public figures and corporations you have rated</li>
          </ul>
          <p className="font-medium">Technical information</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>IP address</li>
            <li>Browser type and device information</li>
            <li>Login times and session data</li>
            <li>Security event logs</li>
          </ul>
        </Section>

        <Section title="4. How We Collect Your Information">
          <ul className="list-disc pl-6 space-y-1">
            <li>Directly from you when you register, complete your profile, or use the platform</li>
            <li>Automatically when you use the platform through cookies and session data</li>
            <li>From third party services including Stripe (payments and identity verification), Twilio (SMS verification), and Resend (email delivery)</li>
          </ul>
        </Section>

        <Section title="5. How We Use Your Information">
          <ul className="list-disc pl-6 space-y-1">
            <li>Create and manage your account</li>
            <li>Verify your identity and prevent fraud</li>
            <li>Process your $12.99 AUD blue checkmark verification payment</li>
            <li>Send you email and SMS verification codes</li>
            <li>Display your activity on the platform such as petitions signed and polls voted in</li>
            <li>Show your verified status and reputation score to other users</li>
            <li>Send you notifications about platform activity relevant to you</li>
            <li>Detect and prevent abuse, fraud, and security threats</li>
            <li>Comply with our legal obligations</li>
            <li>Improve the platform</li>
          </ul>
        </Section>

        <Section title="6. Identity Verification and Payments">
          <ul className="list-disc pl-6 space-y-1">
            <li>Payment is processed by Stripe — a PCI-DSS compliant payment processor</li>
            <li>Identity verification (selfie and government ID) is processed by Stripe Identity</li>
            <li>We never see, access, or store your government ID or selfie — these go directly to Stripe</li>
            <li>We only store the result of the verification (verified or not verified) and the payment reference</li>
            <li>All payments are non-refundable unless the service is not provided</li>
          </ul>
        </Section>

        <Section title="7. Who We Share Your Information With">
          <p>We do not sell your personal information to anyone.</p>
          <p className="font-medium">Service providers who help us operate the platform</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Stripe — payment processing and identity verification (United States, with adequate privacy protections)</li>
            <li>Twilio — SMS delivery (United States, with adequate privacy protections)</li>
            <li>Resend — email delivery (United States, with adequate privacy protections)</li>
            <li>Supabase — database and authentication, hosted in Sydney, Australia</li>
            <li>Cloudflare — website hosting and security</li>
          </ul>
          <p className="font-medium">Legal requirements</p>
          <p>We may disclose your information if required by Australian law, a court order, or to protect the safety of users or the public.</p>
          <p className="font-medium">Business transfers</p>
          <p>If Every Voice Pty Ltd is sold or merged, your information may be transferred to the new owner who will be bound by this policy.</p>
        </Section>

        <Section title="8. Where Your Data Is Stored">
          <p>
            Your data is primarily stored in Australia on Supabase servers located in Sydney. Some data may be
            processed by our third party providers in the United States, who maintain adequate privacy and security protections.
          </p>
        </Section>

        <Section title="9. How We Protect Your Information">
          <ul className="list-disc pl-6 space-y-1">
            <li>All data transmitted using HTTPS encryption</li>
            <li>Passwords stored using industry-standard encryption — never readable by anyone</li>
            <li>Strict access controls — only authorised staff can access personal data</li>
            <li>Automated security scanning every 6 hours</li>
            <li>Rate limiting to prevent brute force attacks</li>
            <li>IP blocklisting for detected threats</li>
            <li>Tamper-evident audit logs of all security events</li>
            <li>30-minute automatic session timeout for inactive users</li>
          </ul>
        </Section>

        <Section title="10. Cookies">
          <p>
            We use cookies and similar technologies to keep you logged in and to maintain your session.
            We do not use cookies for advertising. You can disable cookies in your browser settings but this may
            affect your ability to use the platform.
          </p>
        </Section>

        <Section title="11. Age Requirements">
          <p>
            Voice to Action is available to users aged 16 and over. If you are under 16 you must not use this
            platform. If we become aware that a user is under 16 we will delete their account and all associated data.
          </p>
        </Section>

        <Section title="12. Your Rights Under the Australian Privacy Act">
          <p>You have the right to access, correct, delete, and complain about how we handle your information.</p>
          <p>
            To exercise these rights, contact voicetoaction@outlook.com. We will respond within 30 days.
            If you are not satisfied, you can complain to the OAIC at <a className="text-blue-600 hover:underline" href="https://www.oaic.gov.au" target="_blank" rel="noreferrer">www.oaic.gov.au</a>.
          </p>
        </Section>

        <Section title="13. Data Retention">
          <p>
            We retain your personal information for as long as your account is active. If you delete your account
            we will delete your personal information within 30 days, except where we are required to retain it by law
            (for example, payment records which we retain for 7 years for tax purposes).
          </p>
        </Section>

        <Section title="14. Changes to This Policy">
          <p>
            We may update this policy from time to time. We will notify you of significant changes by email.
            Continued use of the platform after changes means you accept the updated policy.
          </p>
        </Section>

        <Section title="15. Contact Us">
          <p>Every Voice Pty Ltd</p>
          <p>Email: voicetoaction@outlook.com</p>
        </Section>
      </article>
    </div>
  );
}
