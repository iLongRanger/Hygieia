import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  Briefcase,
  Building2,
  CalendarRange,
  ClipboardCheck,
  FileSignature,
  Home,
  LineChart,
  Receipt,
  ShieldCheck,
  Sparkles,
  TimerReset,
  Users2,
} from 'lucide-react';

const featureGroups = [
  {
    title: 'Win Work Faster',
    copy:
      'Capture leads, split residential from commercial early, and move each opportunity through the right sales path without duct-taping five tools together.',
    icon: Sparkles,
    bullets: ['Lead intake and qualification', 'Commercial walkthrough pipeline', 'Residential quote workflow'],
  },
  {
    title: 'Run Operations Cleanly',
    copy:
      'Appointments, inspections, recurring jobs, subcontractor teams, and time tracking stay connected so the office and field crew work from the same source of truth.',
    icon: CalendarRange,
    bullets: ['Scheduling with assignment controls', 'Inspection and corrective action flow', 'Cleaner and subcontractor views'],
  },
  {
    title: 'Protect Margins',
    copy:
      'Contracts, invoices, payroll, expenses, and approvals are built into the same operating layer, which makes it easier to see what is actually profitable.',
    icon: LineChart,
    bullets: ['Contract activation and renewals', 'Invoice and public-link workflows', 'Payroll and approval visibility'],
  },
];

const modules = [
  { label: 'CRM', description: 'Leads, accounts, contacts, facilities, properties', icon: Users2 },
  { label: 'Sales', description: 'Proposals, quotations, residential quotes, contracts', icon: FileSignature },
  { label: 'Operations', description: 'Appointments, jobs, inspections, time tracking', icon: Briefcase },
  { label: 'Finance', description: 'Invoices, payroll, expenses, reporting', icon: Receipt },
];

const journeys = [
  {
    name: 'Commercial',
    icon: Building2,
    stages: ['Lead', 'Account', 'Facility', 'Walkthrough', 'Proposal', 'Contract', 'Service'],
  },
  {
    name: 'Residential',
    icon: Home,
    stages: ['Lead', 'Account', 'Property', 'Quote', 'Contract', 'Service', 'Renewal'],
  },
];

const proofPoints = [
  'Role-based access for office staff, cleaners, and subcontractors',
  'Public proposal, quote, contract, and invoice links with safer token handling',
  'Operational guardrails for scheduling conflicts, inspections, and timesheets',
  'Commercial and residential flows in one platform instead of split systems',
];

const LandingPage = () => {
  return (
    <div className="landing-shell min-h-screen bg-[#f6f0e8] text-[#18261f]">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-24 top-0 h-[28rem] w-[28rem] rounded-full bg-[#1f6f63]/12 blur-3xl" />
        <div className="absolute right-[-7rem] top-32 h-[24rem] w-[24rem] rounded-full bg-[#bf6b2f]/14 blur-3xl" />
        <div className="absolute bottom-[-10rem] left-1/2 h-[26rem] w-[36rem] -translate-x-1/2 rounded-full bg-[#264653]/10 blur-3xl" />
      </div>

      <header className="sticky top-0 z-20 border-b border-[#1b2b24]/10 bg-[#f6f0e8]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <Link to="/" className="landing-brand text-xl font-semibold tracking-[0.18em] text-[#17352d]">
            HYGIEIA
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-medium text-[#41554d] md:flex">
            <a href="#platform" className="transition-colors hover:text-[#17352d]">Platform</a>
            <a href="#journeys" className="transition-colors hover:text-[#17352d]">Journeys</a>
            <a href="#proof" className="transition-colors hover:text-[#17352d]">Why It Wins</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="rounded-full border border-[#17352d]/15 px-4 py-2 text-sm font-semibold text-[#17352d] transition hover:border-[#17352d]/30 hover:bg-white/60"
            >
              Sign In
            </Link>
            <Link
              to="/app"
              className="inline-flex items-center gap-2 rounded-full bg-[#17352d] px-4 py-2 text-sm font-semibold text-white shadow-[0_16px_40px_-18px_rgba(23,53,45,0.75)] transition hover:bg-[#0f241f]"
            >
              Open Platform
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      <main className="relative">
        <section className="mx-auto grid max-w-7xl gap-12 px-5 pb-20 pt-12 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:pb-28 lg:pt-20">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#17352d]/10 bg-white/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#355248]">
              <ShieldCheck className="h-4 w-4 text-[#1f6f63]" />
              Cleaning Operations, Finally in One System
            </div>
            <div className="space-y-5">
              <p className="landing-kicker text-sm font-semibold uppercase tracking-[0.24em] text-[#a35729]">
                Built for commercial teams, residential growth, and real operators
              </p>
              <h1 className="landing-display max-w-4xl text-5xl leading-[0.94] text-[#17352d] sm:text-6xl lg:text-7xl">
                Sell faster. Schedule tighter. Keep the whole cleaning business in sync.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-[#4b6057] sm:text-xl">
                Hygieia brings CRM, quoting, contracts, field operations, inspections, payroll, and finance into one operating system so your team can stop stitching together spreadsheets, chat threads, and disconnected apps.
              </p>
            </div>
            <div className="flex flex-col gap-4 sm:flex-row">
              <Link
                to="/app"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#bf6b2f] px-7 py-4 text-sm font-semibold uppercase tracking-[0.16em] text-white shadow-[0_18px_45px_-20px_rgba(191,107,47,0.85)] transition hover:bg-[#aa5d26]"
              >
                Explore the Product
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#journeys"
                className="inline-flex items-center justify-center rounded-full border border-[#17352d]/15 px-7 py-4 text-sm font-semibold uppercase tracking-[0.16em] text-[#17352d] transition hover:bg-white/60"
              >
                See the Workflow
              </a>
            </div>
            <div className="grid gap-4 border-t border-[#17352d]/10 pt-6 sm:grid-cols-3">
              <div>
                <p className="landing-metric text-3xl font-semibold text-[#17352d]">Commercial</p>
                <p className="mt-1 text-sm text-[#51655d]">Lead to walkthrough to proposal to contract</p>
              </div>
              <div>
                <p className="landing-metric text-3xl font-semibold text-[#17352d]">Residential</p>
                <p className="mt-1 text-sm text-[#51655d]">Lead to property to quote to recurring service</p>
              </div>
              <div>
                <p className="landing-metric text-3xl font-semibold text-[#17352d]">Operations</p>
                <p className="mt-1 text-sm text-[#51655d]">Jobs, inspections, time tracking, invoices, payroll</p>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -left-6 top-16 hidden h-28 w-28 rounded-[2rem] border border-[#17352d]/10 bg-white/55 backdrop-blur md:block" />
            <div className="relative overflow-hidden rounded-[2rem] border border-[#17352d]/10 bg-[#17352d] p-6 text-white shadow-[0_35px_90px_-28px_rgba(17,35,31,0.72)]">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-white/60">Operations Snapshot</p>
                  <p className="mt-2 text-2xl font-semibold">From new lead to paid invoice</p>
                </div>
                <BadgeCheck className="h-10 w-10 text-[#efb266]" />
              </div>

              <div className="mt-6 space-y-4">
                <div className="rounded-[1.5rem] bg-white/8 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-white/55">Sales Visibility</p>
                      <p className="mt-2 text-lg font-medium">See both commercial facilities and residential properties in pipeline view</p>
                    </div>
                    <LineChart className="h-8 w-8 text-[#efb266]" />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-[1.5rem] bg-[#20463d] p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-white/55">Scheduling</p>
                    <p className="mt-3 text-lg font-medium">Walkthroughs, inspections, recurring visits, assignment controls</p>
                  </div>
                  <div className="rounded-[1.5rem] bg-[#8d4d26] p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-white/55">Controls</p>
                    <p className="mt-3 text-lg font-medium">Built-in guardrails around conflicts, approvals, reminders, and activation</p>
                  </div>
                </div>
                <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center gap-3">
                    <TimerReset className="h-5 w-5 text-[#efb266]" />
                    <p className="text-sm font-medium text-white/90">
                      Designed for teams that need one command center instead of a stack of point tools.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="platform" className="border-y border-[#17352d]/10 bg-white/45 py-20 backdrop-blur-sm">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <div className="max-w-3xl">
              <p className="landing-kicker text-sm font-semibold uppercase tracking-[0.24em] text-[#a35729]">The platform</p>
              <h2 className="landing-display mt-4 text-4xl text-[#17352d] sm:text-5xl">
                One operating layer across sales, service, teams, and cash flow.
              </h2>
            </div>
            <div className="mt-10 grid gap-5 lg:grid-cols-3">
              {featureGroups.map((group) => (
                <article
                  key={group.title}
                  className="rounded-[1.75rem] border border-[#17352d]/10 bg-[#f8f4ee] p-6 shadow-[0_18px_45px_-28px_rgba(24,38,31,0.45)]"
                >
                  <group.icon className="h-9 w-9 text-[#1f6f63]" />
                  <h3 className="mt-5 text-2xl font-semibold text-[#17352d]">{group.title}</h3>
                  <p className="mt-3 text-base leading-7 text-[#50645c]">{group.copy}</p>
                  <ul className="mt-5 space-y-3 text-sm text-[#17352d]">
                    {group.bullets.map((bullet) => (
                      <li key={bullet} className="flex items-start gap-3">
                        <span className="mt-1.5 h-2 w-2 rounded-full bg-[#bf6b2f]" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>

            <div className="mt-16 grid gap-4 md:grid-cols-4">
              {modules.map((module) => (
                <div key={module.label} className="rounded-[1.5rem] border border-[#17352d]/10 bg-white/70 p-5">
                  <module.icon className="h-8 w-8 text-[#17352d]" />
                  <p className="mt-4 text-lg font-semibold text-[#17352d]">{module.label}</p>
                  <p className="mt-2 text-sm leading-6 text-[#546a61]">{module.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="journeys" className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="space-y-5">
              <p className="landing-kicker text-sm font-semibold uppercase tracking-[0.24em] text-[#a35729]">Sales journeys</p>
              <h2 className="landing-display text-4xl text-[#17352d] sm:text-5xl">
                Separate the commercial and residential motions without splitting your business in two.
              </h2>
              <p className="max-w-xl text-lg leading-8 text-[#4e635b]">
                Hygieia supports the real shape of a cleaning company: commercial accounts with facilities and walkthroughs, plus residential owners and property managers with multiple homes and property-level quotes.
              </p>
            </div>

            <div className="grid gap-6">
              {journeys.map((journey) => (
                <article
                  key={journey.name}
                  className="rounded-[1.9rem] border border-[#17352d]/10 bg-white/60 p-6 shadow-[0_18px_45px_-30px_rgba(24,38,31,0.42)]"
                >
                  <div className="flex items-center gap-4">
                    <div className="rounded-2xl bg-[#17352d] p-3 text-white">
                      <journey.icon className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-sm uppercase tracking-[0.2em] text-[#62776e]">Workflow</p>
                      <h3 className="text-2xl font-semibold text-[#17352d]">{journey.name}</h3>
                    </div>
                  </div>
                  <div className="mt-6 flex flex-wrap items-center gap-3">
                    {journey.stages.map((stage, index) => (
                      <div key={stage} className="flex items-center gap-3">
                        <span className="rounded-full border border-[#17352d]/10 bg-[#f6f0e8] px-4 py-2 text-sm font-medium text-[#17352d]">
                          {stage}
                        </span>
                        {index < journey.stages.length - 1 ? (
                          <ArrowRight className="h-4 w-4 text-[#a35729]" />
                        ) : null}
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="proof" className="bg-[#17352d] py-20 text-white">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr]">
              <div>
                <p className="landing-kicker text-sm font-semibold uppercase tracking-[0.24em] text-[#efb266]">Why teams buy it</p>
                <h2 className="landing-display mt-4 text-4xl sm:text-5xl">
                  The value is not another dashboard. The value is control.
                </h2>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {proofPoints.map((point) => (
                  <div key={point} className="rounded-[1.5rem] border border-white/10 bg-white/6 p-5">
                    <div className="flex items-start gap-3">
                      <ClipboardCheck className="mt-0.5 h-5 w-5 text-[#efb266]" />
                      <p className="text-sm leading-7 text-white/85">{point}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
          <div className="overflow-hidden rounded-[2rem] border border-[#17352d]/10 bg-[linear-gradient(135deg,#efe6d8_0%,#f7f3eb_52%,#d9e6e2_100%)] p-8 shadow-[0_25px_60px_-34px_rgba(24,38,31,0.45)] sm:p-10 lg:p-12">
            <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <p className="landing-kicker text-sm font-semibold uppercase tracking-[0.24em] text-[#a35729]">Ready to sell the system</p>
                <h2 className="landing-display mt-4 max-w-3xl text-4xl text-[#17352d] sm:text-5xl">
                  Show prospects a platform that understands both growth and operational discipline.
                </h2>
                <p className="mt-4 max-w-2xl text-lg leading-8 text-[#4f645b]">
                  Use this page as the front door, then bring prospects into the product with a clean sign-in path and a clear story about why Hygieia replaces fragmented tools.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
                <Link
                  to="/app"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#17352d] px-6 py-4 text-sm font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-[#0f241f]"
                >
                  Open Platform
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center rounded-full border border-[#17352d]/15 px-6 py-4 text-sm font-semibold uppercase tracking-[0.16em] text-[#17352d] transition hover:bg-white/60"
                >
                  Sign In
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default LandingPage;
