// ✅ CREATE THIS FILE: /app/privacy/page.tsx
'use client'

import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="text-xs text-white/60">Legal</div>
            <h1 className="text-3xl font-semibold tracking-tight mt-1">Privacy Policy</h1>
          </div>
          <Link href="/" className="text-sm text-white/70 hover:text-white transition">
            ← Back
          </Link>
        </div>

        <div className="glass rounded-3xl border border-white/10 p-8 space-y-6">
          <p className="text-sm text-white/70 leading-relaxed">
            This Privacy Policy explains how Flow (YourFlowCRM) handles information when you use the service.
          </p>

          <Section title="1. Information We Process">
            Flow processes account data (such as email and name), and operational data submitted by users (such as deal
            submissions and performance metrics) to provide service functionality.
          </Section>

          <Section title="2. How We Use Information">
            We use information to operate the platform, provide reporting, support authentication, prevent abuse, and
            improve reliability.
          </Section>

          <Section title="3. Sharing">
            We may use third-party providers for infrastructure (e.g., email delivery) to operate the service. We do not
            sell personal information.
          </Section>

          <Section title="4. Security">
            We implement reasonable safeguards; however, no system is 100% secure. You are responsible for internal access
            controls within your organization.
          </Section>

          <Section title="5. Contact">
            Questions? Contact <span className="text-white/80">support@mail.yourflowcrm.com</span>.
          </Section>

          <div className="text-[11px] text-white/50 pt-2">
            This policy may be updated over time. Continued use indicates acceptance of the latest version.
          </div>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-sm font-semibold">{title}</div>
      <div className="text-sm text-white/70 mt-2 leading-relaxed">{children}</div>
    </div>
  )
}
