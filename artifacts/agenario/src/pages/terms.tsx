import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { useIsLight } from "@/hooks/use-is-light";

export default function TermsPage() {
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
          <span className={`font-bold font-['Syne'] text-sm ${isLight ? "text-gray-900" : "text-white"}`}>Terms of Service</span>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold font-['Syne'] mb-2">Terms of Service</h1>
        <p className={`text-sm mb-8 ${isLight ? "text-gray-500" : "text-white/40"}`}>Last updated: June 30, 2026</p>

        <div className={`prose prose-sm max-w-none ${isLight ? "prose-gray" : "prose-invert"} space-y-6`}>
          <Section title="1. Acceptance of Terms">
            By accessing or using Agenario ("the Service"), operated by M Pranav Raj, you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.
          </Section>

          <Section title="2. Description of Service">
            Agenario provides automated source code analysis, security scanning, compliance checking, and remediation suggestions. The Service analyzes code repositories you upload or connect and generates reports on potential vulnerabilities, performance issues, and architectural concerns.
          </Section>

          <Section title="3. User Accounts">
            You must create an account to use paid features. You are responsible for maintaining the confidentiality of your account credentials and for all activity under your account. You must provide accurate, current information during registration.
          </Section>

          <Section title="4. Subscriptions & Billing">
            Paid plans are billed monthly or annually as selected at checkout. All fees are non-refundable except as stated in our Refund Policy. We may change prices with 30 days notice. Subscription auto-renews unless cancelled before the renewal date.
          </Section>

          <Section title="5. Acceptable Use">
            You agree not to:
            <Bullet>Scan codebases you do not have authorization to access</Bullet>
            <Bullet>Use the Service for competitive analysis of other security tools</Bullet>
            <Bullet>Attempt to circumvent rate limits, access controls, or billing mechanisms</Bullet>
            <Bullet>Upload malicious code with intent to damage the Service or other users</Bullet>
            <Bullet>Use automated scripts to scrape or abuse the API beyond documented limits</Bullet>
          </Section>

          <Section title="6. Code Handling & Privacy">
            Source code uploaded for scanning is processed temporarily and stored only as long as necessary to generate reports. We do not train AI models on your code. See our Privacy Policy for full details. Code is transmitted over TLS 1.3 and stored encrypted at rest.
          </Section>

          <Section title="7. Intellectual Property">
            You retain full ownership of your source code and all intellectual property rights. Agenario's analysis reports, scores, and recommendations are our intellectual property. You may share reports externally but may not repackage or resell the Service.
          </Section>

          <Section title="8. Third-Party Services">
            The Service may integrate with third-party platforms (GitHub, GitLab, etc.). Your use of those services is governed by their respective terms. We are not responsible for third-party service availability or data handling.
          </Section>

          <Section title="9. Disclaimer of Warranties">
            THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND. AGENARIO DOES NOT GUARANTEE THAT ALL VULNERABILITIES WILL BE DETECTED. SECURITY ANALYSIS RESULTS ARE ADVISORY AND SHOULD BE VERIFIED INDEPENDENTLY. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED OR ERROR-FREE.
          </Section>

          <Section title="10. Limitation of Liability">
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, AGENARIO SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES ARISING FROM USE OF THE SERVICE, INCLUDING BUT NOT LIMITED TO SECURITY BREACHES, DATA LOSS, OR REVENUE LOSS. OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID IN THE 12 MONTHS PRECEDING THE CLAIM.
          </Section>

          <Section title="11. Indemnification">
            You agree to indemnify and hold harmless M Pranav Raj and Agenario from any claims arising from your use of the Service in violation of these Terms or applicable law.
          </Section>

          <Section title="12. Termination">
            We may suspend or terminate your access for violation of these Terms, with or without notice. Upon termination, you lose access to your account and reports. We may retain copies of data as required by law. You may cancel your account at any time via the dashboard.
          </Section>

          <Section title="13. Changes to Terms">
            We may update these Terms at any time. Material changes will be notified via email or in-app notice. Continued use after changes constitutes acceptance. If you disagree with changes, you must stop using the Service and cancel your subscription.
          </Section>

          <Section title="14. Governing Law">
            These Terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts of Visakhapatnam, Andhra Pradesh.
          </Section>

          <Section title="15. Contact">
            For questions about these Terms, contact:<br />
            <strong>M Pranav Raj</strong><br />
            Madhuranagar, Visakhapatnam 530016<br />
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

function Bullet({ children }: { children: React.ReactNode }) {
  const isLight = useIsLight();
  return <li className={`text-sm leading-relaxed ${isLight ? "text-gray-600" : "text-white/60"} ml-4 list-disc mb-1`}>{children}</li>;
}
