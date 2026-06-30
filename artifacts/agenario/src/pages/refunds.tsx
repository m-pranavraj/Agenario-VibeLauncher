import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { useIsLight } from "@/hooks/use-is-light";

export default function RefundsPage() {
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
          <span className={`font-bold font-['Syne'] text-sm ${isLight ? "text-gray-900" : "text-white"}`}>Refund Policy</span>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold font-['Syne'] mb-2">Refund Policy</h1>
        <p className={`text-sm mb-8 ${isLight ? "text-gray-500" : "text-white/40"}`}>Last updated: June 30, 2026</p>

        <div className="space-y-6">
          <Section title="30-Day Money-Back Guarantee">
            We offer a full refund within 30 days of your initial purchase if Agenario does not meet your needs. 
            This applies to the first subscription payment only (monthly or annual plans).
          </Section>

          <Section title="How to Request a Refund">
            Email us at <strong>support@agenario.tech</strong> with the email address used for your account and the reason for your refund request. We process refunds within 5-7 business days. Refunds are issued to the original payment method.
          </Section>

          <Section title="Refund Eligibility">
            <Bullet>First-time subscribers: Full refund within 30 days of initial payment</Bullet>
            <Bullet>Renewal payments: Partial refund at our discretion within 14 days of renewal</Bullet>
            <Bullet>Annual plans: Pro-rated refund for unused months after the first 30 days</Bullet>
            <Bullet>Upgrade charges: Refundable within 14 days if the upgraded features do not function as described</Bullet>
          </Section>

          <Section title="Non-Refundable Items">
            <Bullet>Scans already consumed beyond the first free scan</Bullet>
            <Bullet>Accounts terminated for Terms of Service violations</Bullet>
            <Bullet>Add-on or one-time purchases (if any)</Bullet>
            <Bullet>Payments older than 60 days</Bullet>
          </Section>

          <Section title="Subscription Cancellation">
            You can cancel your subscription at any time from the dashboard settings page. 
            After cancellation, you retain access to your account and reports until the end of the current billing period. 
            No further charges will be made. Refunds for the remaining period are subject to the eligibility above.
          </Section>

          <Section title="Processing Time">
            Refunds are processed within 5-7 business days after approval. 
            The time for the refund to appear in your account depends on your payment provider and bank:
            <Bullet>Cards: 3-10 business days</Bullet>
            <Bullet>PayPal: 1-3 business days</Bullet>
            <Bullet>UPI / NetBanking (India): 3-5 business days</Bullet>
          </Section>

          <Section title="Contact">
            For refund requests or questions:<br /><br />
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
