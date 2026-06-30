import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { useIsLight } from "@/hooks/use-is-light";

export default function PrivacyPage() {
  const isLight = useIsLight();

  return (
    <div className={`min-h-screen ${isLight ? "bg-white text-gray-900" : "bg-[#050505] text-white"}`}>
      <nav className={`border-b ${isLight ? "bg-white/90 border-gray-200" : "bg-[#050505]/90 border-white/[0.07]"} backdrop-blur-2xl sticky top-0 z-10`}>
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-3">
          <Link href="/">
            <button className={`${isLight ? "text-gray-400 hover:text-gray-900" : "text-white/30 hover:text-white"} transition-colors`}>
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
          <span className={`font-bold font-['Syne'] text-sm ${isLight ? "text-gray-900" : "text-white"}`}>Privacy Policy</span>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold font-['Syne'] mb-2">Privacy Policy</h1>
        <p className={`text-sm mb-8 ${isLight ? "text-gray-500" : "text-white/40"}`}>Last updated: June 30, 2026</p>

        <div className="space-y-6">
          <Section title="1. Information We Collect">
            <SubSection title="Account Information">
              When you register, we collect your name, email address, and encrypted password. If you use Google OAuth, we receive your name and email from Google.
            </SubSection>
            <SubSection title="Source Code">
              When you upload or connect a repository for scanning, we receive a copy of your source code. This is stored temporarily and processed by our analysis engines.
            </SubSection>
            <SubSection title="Payment Information">
              Payments are processed by Razorpay (India) and/or Paddle (global). We do not store credit card numbers. Payment providers receive your billing details to process transactions.
            </SubSection>
            <SubSection title="Usage Data">
              We collect scan metadata (file counts, language breakdowns, issue counts) for analytics and service improvement. This does not include your actual source code content.
            </SubSection>
            <SubSection title="Cookies">
              We use essential cookies for session management and authentication. We do not use third-party tracking cookies. See our Cookie section below.
            </SubSection>
          </Section>

          <Section title="2. How We Use Your Information">
            <Bullet>To provide and maintain the scanning service</Bullet>
            <Bullet>To generate analysis reports and remediation suggestions</Bullet>
            <Bullet>To communicate service updates, billing notices, and support responses</Bullet>
            <Bullet>To improve our analysis engines and detection capabilities</Bullet>
            <Bullet>To enforce our Terms of Service and prevent abuse</Bullet>
          </Section>

          <Section title="3. Code Storage & Retention">
            Source code uploaded for scanning is retained only as long as needed:
            <Bullet>During active scan: code is stored in memory and temporary storage</Bullet>
            <Bullet>After scan completion: code artifacts are deleted within 30 days</Bullet>
            <Bullet>Scan reports (issues found, scores, metadata) are retained for your account duration</Bullet>
            <Bullet>You may delete your account and all associated data at any time via dashboard settings</Bullet>
            <p className={`mt-2 text-sm ${isLight ? "text-gray-600" : "text-white/60"}`}>
              <strong>Important:</strong> We do not train AI models or machine learning systems on your source code. Your code is used solely to generate your scan results.
            </p>
          </Section>

          <Section title="4. Data Sharing">
            We do not sell your personal data or source code. We may share data with:
            <Bullet>Payment processors (Razorpay, Paddle) — necessary to process transactions</Bullet>
            <Bullet>Cloud infrastructure providers (hosting, storage) — necessary to operate the service</Bullet>
            <Bullet>Legal authorities — if required by law or to protect our rights</Bullet>
          </Section>

          <Section title="5. Data Security">
            We implement industry-standard security measures:
            <Bullet>TLS 1.3 encryption for all data in transit</Bullet>
            <Bullet>AES-256 encryption for data at rest</Bullet>
            <Bullet>Regular security audits of our infrastructure</Bullet>
            <Bullet>Access controls and authentication for all internal systems</Bullet>
            <Bullet>No storage of raw credit card information</Bullet>
            <p className={`mt-2 text-sm ${isLight ? "text-gray-600" : "text-white/60"}`}>
              Despite these measures, no online service is 100% secure. We encourage you to use strong passwords and enable any additional security features available.
            </p>
          </Section>

          <Section title="6. Your Rights">
            Depending on your jurisdiction, you may have rights to:
            <Bullet>Access personal data we hold about you</Bullet>
            <Bullet>Request correction of inaccurate data</Bullet>
            <Bullet>Request deletion of your data ("right to be forgotten")</Bullet>
            <Bullet>Export your data in a portable format</Bullet>
            <Bullet>Withdraw consent where processing is based on consent</Bullet>
            <p className={`mt-2 text-sm ${isLight ? "text-gray-600" : "text-white/60"}`}>
              To exercise these rights, contact us at support@agenario.tech. We respond to all requests within 30 days.
            </p>
          </Section>

          <Section title="7. Cookies">
            We use only essential cookies:
            <Bullet>Session cookie — to maintain your logged-in state</Bullet>
            <Bullet>CSRF token — to prevent cross-site request forgery</Bullet>
            <Bullet>Theme preference — to remember your dark/light mode choice</Bullet>
            <p className={`mt-2 text-sm ${isLight ? "text-gray-600" : "text-white/60"}`}>
              We do not use advertising cookies, tracking pixels, or third-party analytics cookies. You can disable cookies in your browser settings, but some features may not function properly.
            </p>
          </Section>

          <Section title="8. Third-Party Links">
            The Service may link to third-party websites (GitHub, Stripe, etc.). We are not responsible for their privacy practices. Review their policies before providing data.
          </Section>

          <Section title="9. Children's Privacy">
            The Service is not intended for users under 18. We do not knowingly collect data from minors. If you believe a minor has provided personal data, contact us for deletion.
          </Section>

          <Section title="10. International Data Transfers">
            Your data may be processed on servers located in India and/or the United States. By using the Service, you consent to this transfer. We ensure appropriate safeguards are in place for cross-border data transfers.
          </Section>

          <Section title="11. Changes to This Policy">
            We may update this Privacy Policy. Material changes will be notified via email or in-app notice. Continued use after changes constitutes acceptance.
          </Section>

          <Section title="12. Contact & Grievance Officer">
            For privacy-related inquiries or grievances:<br /><br />
            <strong>M Pranav Raj</strong><br />
            Madhuranagar, Visakhapatnam 530016<br />
            Andhra Pradesh, India<br />
            Email: support@agenario.tech
          </Section>
        </div>
      </main>

      <footer className={`border-t ${isLight ? "border-gray-200" : "border-white/[0.06]"} py-6`}>
        <div className={`max-w-4xl mx-auto px-6 flex items-center justify-between text-xs ${isLight ? "text-gray-400" : "text-white/30"}`}>
          <span>&copy; {new Date().getFullYear()} M Pranav Raj. All rights reserved.</span>
          <div className="flex gap-4">
            <Link href="/terms"><span className="hover:underline">Terms</span></Link>
            <Link href="/privacy"><span className="hover:underline">Privacy</span></Link>
            <Link href="/refunds"><span className="hover:underline">Refunds</span></Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const isLight = useIsLight();
  return (
    <section>
      <h2 className={`text-lg font-bold font-['Syne'] mb-3 ${isLight ? "text-gray-900" : "text-white"}`}>{title}</h2>
      <div className={`text-sm leading-relaxed space-y-2 ${isLight ? "text-gray-600" : "text-white/60"}`}>{children}</div>
    </section>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  const isLight = useIsLight();
  return (
    <div className="mb-3">
      <h3 className={`font-semibold text-sm mb-1 ${isLight ? "text-gray-800" : "text-white/80"}`}>{title}</h3>
      <p className={`text-sm leading-relaxed ${isLight ? "text-gray-600" : "text-white/60"}`}>{children}</p>
    </div>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  const isLight = useIsLight();
  return <li className={`text-sm leading-relaxed ${isLight ? "text-gray-600" : "text-white/60"} ml-4 list-disc mb-1`}>{children}</li>;
}
