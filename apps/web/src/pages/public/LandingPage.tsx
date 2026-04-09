import { Link } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CalendarDays,
  Check,
  ClipboardCheck,
  Home,
  LineChart,
  Receipt,
  Shield,
  Sparkles,
  Users,
  Waypoints,
  Zap,
  Star,
  ChevronRight,
  Play,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const modules = [
  {
    icon: Sparkles,
    title: 'CRM & Pipeline',
    desc: 'Track leads, opportunities, and walkthroughs. Convert prospects with context, not guesswork.',
  },
  {
    icon: CalendarDays,
    title: 'Scheduling',
    desc: 'Assign jobs, manage teams, handle overrides. One calendar for the entire operation.',
  },
  {
    icon: BadgeCheck,
    title: 'Contracts',
    desc: 'Generate, send, and e-sign contracts. Auto-create jobs from signed agreements.',
  },
  {
    icon: Waypoints,
    title: 'Field Operations',
    desc: 'GPS check-ins, timesheets, task lists. Your field teams work from the same source of truth.',
  },
  {
    icon: ClipboardCheck,
    title: 'Inspections',
    desc: 'Schedule QA walkthroughs, score areas, attach photos. Close the accountability loop.',
  },
  {
    icon: Receipt,
    title: 'Finance',
    desc: 'Invoicing, payroll, expenses, and reporting in one place. See your real margins.',
  },
];

const workflows = [
  {
    icon: Building2,
    title: 'Commercial',
    eyebrow: 'Facility-based recurring service',
    color: 'from-emerald-600 to-teal-700',
    steps: [
      'Lead capture & qualification',
      'Facility walkthrough & scoping',
      'Proposal with area-level pricing',
      'Contract execution & e-signature',
      'Automated job & schedule creation',
      'Inspections & quality scoring',
    ],
  },
  {
    icon: Home,
    title: 'Residential',
    eyebrow: 'Property-based home service',
    color: 'from-amber-500 to-orange-600',
    steps: [
      'Lead intake & property details',
      'Instant or custom quoting',
      'Client approval & booking',
      'Team assignment & dispatch',
      'Service delivery & check-in',
      'Invoice & payment collection',
    ],
  },
];

const stats = [
  { value: '100%', label: 'Workflow coverage', sub: 'Lead to invoice, one system' },
  { value: '2', label: 'Business motions', sub: 'Commercial & residential' },
  { value: '0', label: 'Gaps between teams', sub: 'Office, field, and finance aligned' },
];

const testimonials = [
  {
    quote: 'We stopped losing track of walkthroughs and proposals. Everything flows from the lead to the signed contract automatically.',
    name: 'Operations Manager',
    company: 'Commercial Cleaning Co.',
    stars: 5,
  },
  {
    quote: 'Finally, one system for both our commercial contracts and residential bookings. No more juggling three different tools.',
    name: 'Business Owner',
    company: 'Multi-Service Janitorial',
    stars: 5,
  },
  {
    quote: 'The inspection system alone saved us two client accounts. We catch issues before clients even notice them.',
    name: 'Quality Manager',
    company: 'Facility Services Group',
    stars: 5,
  },
];

const faqs = [
  {
    q: 'Is Hygieia only for commercial cleaning?',
    a: 'No. Hygieia handles both commercial and residential workflows in a single platform, with dedicated pipelines for each.',
  },
  {
    q: 'Can my field teams use it on mobile?',
    a: 'Yes. The web app is fully responsive. Field staff can clock in, view tasks, submit timesheets, and complete checklists from any device.',
  },
  {
    q: 'How does pricing work?',
    a: 'Hygieia supports multiple pricing strategies including per-square-foot, per-hour, and custom area-level pricing for proposals and contracts.',
  },
  {
    q: 'Can clients sign contracts and view invoices online?',
    a: 'Yes. Proposals, contracts, contract amendments, quotes, and invoices all have secure public links for client-facing actions.',
  },
];

/* ------------------------------------------------------------------ */
/*  Scroll-triggered fade-in                                           */
/* ------------------------------------------------------------------ */

function useFadeIn() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold: 0.15 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return { ref, className: `transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}` };
}

function Section({ children, className = '', id }: { children: React.ReactNode; className?: string; id?: string }) {
  const fade = useFadeIn();
  return <section id={id} ref={fade.ref} className={`${fade.className} ${className}`}>{children}</section>;
}

/* ------------------------------------------------------------------ */
/*  FAQ Accordion                                                      */
/* ------------------------------------------------------------------ */

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-[#10231d]/10">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-4 py-5 text-left text-lg font-medium text-[#10231d] transition-colors hover:text-[#1f5c52]"
      >
        {q}
        <ChevronRight className={`h-5 w-5 shrink-0 text-[#43564f] transition-transform duration-200 ${open ? 'rotate-90' : ''}`} />
      </button>
      <div className={`grid transition-all duration-300 ${open ? 'grid-rows-[1fr] pb-5' : 'grid-rows-[0fr]'}`}>
        <div className="overflow-hidden">
          <p className="text-base leading-7 text-[#4b5f58]">{a}</p>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#faf7f2] text-[#10231d]">
      {/* ---- Subtle grid texture ---- */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            'linear-gradient(90deg, rgba(16,35,29,0.04) 1px, transparent 1px), linear-gradient(rgba(16,35,29,0.04) 1px, transparent 1px)',
          backgroundSize: '80px 80px',
        }}
      />

      {/* ============================================================ */}
      {/*  HEADER                                                       */}
      {/* ============================================================ */}
      <header className="sticky top-0 z-50 border-b border-[#10231d]/8 bg-[#faf7f2]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3.5 sm:px-8">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#10231d]">
              <Sparkles className="h-4 w-4 text-[#f1b16f]" />
            </div>
            <span className="text-lg font-bold tracking-tight" style={{ fontFamily: "'Manrope', sans-serif" }}>
              Hygieia
            </span>
          </Link>

          <nav className="hidden items-center gap-8 text-[13px] font-medium text-[#43564f] lg:flex">
            <a href="#features" className="transition-colors hover:text-[#10231d]">Features</a>
            <a href="#workflows" className="transition-colors hover:text-[#10231d]">Workflows</a>
            <a href="#testimonials" className="transition-colors hover:text-[#10231d]">Testimonials</a>
            <a href="#faq" className="transition-colors hover:text-[#10231d]">FAQ</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="hidden rounded-lg px-4 py-2 text-sm font-semibold text-[#10231d] transition hover:bg-[#10231d]/5 sm:inline-flex"
            >
              Sign in
            </Link>
            <Link
              to="/app"
              className="inline-flex items-center gap-2 rounded-lg bg-[#10231d] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#10231d]/20 transition hover:bg-[#091410]"
            >
              Get Started
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      <main className="relative">
        {/* ============================================================ */}
        {/*  HERO                                                        */}
        {/* ============================================================ */}
        <section className="relative overflow-hidden">
          {/* Gradient orbs */}
          <div className="pointer-events-none absolute -left-40 -top-20 h-[500px] w-[500px] rounded-full bg-[#1f5c52]/10 blur-[100px]" />
          <div className="pointer-events-none absolute -right-20 top-20 h-[400px] w-[400px] rounded-full bg-[#c56f38]/8 blur-[100px]" />

          <div className="mx-auto max-w-7xl px-5 pb-16 pt-16 sm:px-8 sm:pt-20 lg:pb-24 lg:pt-28">
            <div className="mx-auto max-w-4xl text-center">
              {/* Badge */}
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#1f5c52]/15 bg-[#1f5c52]/5 px-4 py-1.5 text-xs font-semibold text-[#1f5c52]">
                <Zap className="h-3.5 w-3.5" />
                Built for cleaning companies that want real control
              </div>

              {/* Headline */}
              <h1
                className="text-4xl leading-[1.08] tracking-tight text-[#10231d] sm:text-5xl md:text-6xl lg:text-7xl"
                style={{ fontFamily: "'DM Serif Display', Georgia, serif", letterSpacing: '-0.035em' }}
              >
                Run your cleaning business
                <br className="hidden sm:block" />
                <span className="relative">
                  from one system
                  <svg className="absolute -bottom-1 left-0 w-full" viewBox="0 0 300 12" fill="none" preserveAspectRatio="none">
                    <path d="M2 8 Q75 2 150 7 Q225 12 298 4" stroke="#c56f38" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.5" />
                  </svg>
                </span>
              </h1>

              {/* Sub */}
              <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[#4b5f58] sm:text-xl">
                Hygieia connects your CRM, scheduling, contracts, field ops, inspections, and finance
                into one platform. Stop juggling disconnected tools.
              </p>

              {/* CTAs */}
              <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                <Link
                  to="/app"
                  className="inline-flex items-center gap-2.5 rounded-xl bg-[#c56f38] px-8 py-4 text-[15px] font-semibold text-white shadow-xl shadow-[#c56f38]/25 transition-all hover:bg-[#ae5d2d] hover:shadow-2xl hover:shadow-[#c56f38]/30"
                >
                  Start Free Trial
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href="#features"
                  className="inline-flex items-center gap-2.5 rounded-xl border border-[#10231d]/12 bg-white/60 px-8 py-4 text-[15px] font-semibold text-[#10231d] transition hover:bg-white"
                >
                  <Play className="h-4 w-4 text-[#c56f38]" />
                  See how it works
                </a>
              </div>
            </div>

            {/* Stats bar */}
            <div className="mx-auto mt-16 max-w-3xl">
              <div className="grid grid-cols-1 divide-y divide-[#10231d]/8 rounded-2xl border border-[#10231d]/8 bg-white/70 backdrop-blur-sm sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                {stats.map((s) => (
                  <div key={s.label} className="px-6 py-5 text-center">
                    <p
                      className="text-3xl text-[#10231d] sm:text-4xl"
                      style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
                    >
                      {s.value}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[#10231d]">{s.label}</p>
                    <p className="mt-0.5 text-xs text-[#6b7f78]">{s.sub}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Hero visual — app preview mock */}
            <div className="mx-auto mt-16 max-w-5xl">
              <div className="relative rounded-2xl border border-[#10231d]/10 bg-[#10231d] p-1.5 shadow-2xl shadow-[#10231d]/20">
                {/* Window chrome */}
                <div className="flex items-center gap-2 px-4 py-3">
                  <div className="h-3 w-3 rounded-full bg-white/15" />
                  <div className="h-3 w-3 rounded-full bg-white/15" />
                  <div className="h-3 w-3 rounded-full bg-white/15" />
                  <div className="mx-auto rounded-md bg-white/10 px-16 py-1.5 text-[11px] text-white/40">
                    app.hygieia.com
                  </div>
                </div>
                {/* Dashboard mockup */}
                <div className="rounded-xl bg-[#f8fafc] p-6">
                  <div className="grid gap-4 sm:grid-cols-4">
                    {/* Sidebar mock */}
                    <div className="hidden rounded-lg bg-[#10231d] p-4 sm:block">
                      <div className="mb-4 h-6 w-20 rounded bg-white/15" />
                      {['', '', '', '', '', ''].map((_, i) => (
                        <div key={i} className={`mb-2 flex items-center gap-2 rounded-md px-3 py-2 ${i === 0 ? 'bg-white/10' : ''}`}>
                          <div className="h-4 w-4 rounded bg-white/20" />
                          <div className={`h-3 rounded bg-white/${i === 0 ? '25' : '10'}`} style={{ width: `${60 + (i * 7) % 30}%` }} />
                        </div>
                      ))}
                    </div>
                    {/* Main content mock */}
                    <div className="space-y-4 sm:col-span-3">
                      <div className="flex items-center justify-between">
                        <div className="h-6 w-32 rounded bg-slate-200" />
                        <div className="h-8 w-24 rounded-md bg-[#c56f38]/15" />
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { label: 'Active Jobs', val: '24', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
                          { label: 'Pending', val: '8', color: 'bg-amber-50 text-amber-700 border-amber-200' },
                          { label: 'Revenue', val: '$47.2k', color: 'bg-blue-50 text-blue-700 border-blue-200' },
                        ].map((card) => (
                          <div key={card.label} className={`rounded-lg border p-3 ${card.color}`}>
                            <p className="text-[11px] font-medium opacity-70">{card.label}</p>
                            <p className="mt-1 text-lg font-bold">{card.val}</p>
                          </div>
                        ))}
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-white">
                        <div className="border-b border-slate-100 px-4 py-3">
                          <div className="h-4 w-24 rounded bg-slate-200" />
                        </div>
                        {[0, 1, 2, 3].map((i) => (
                          <div key={i} className="flex items-center gap-3 border-b border-slate-50 px-4 py-3 last:border-0">
                            <div className="h-8 w-8 rounded-full bg-slate-100" />
                            <div className="flex-1">
                              <div className="h-3 w-2/3 rounded bg-slate-150" style={{ backgroundColor: '#e8ecf1' }} />
                              <div className="mt-1.5 h-2.5 w-1/3 rounded bg-slate-100" />
                            </div>
                            <div className={`h-5 w-16 rounded-full ${i % 2 === 0 ? 'bg-emerald-100' : 'bg-amber-100'}`} />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/*  TRUSTED BY (social proof strip)                              */}
        {/* ============================================================ */}
        <Section className="border-y border-[#10231d]/6 bg-white/50 py-8">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-[#6b7f78]">
              Trusted by cleaning companies across North America
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-12 gap-y-4">
              {['GleamPro Services', 'CleanForce Inc.', 'ProShine Group', 'SparkleWorks', 'FreshStart Commercial'].map((name) => (
                <span
                  key={name}
                  className="text-lg font-bold tracking-tight text-[#10231d]/20"
                  style={{ fontFamily: "'Manrope', sans-serif" }}
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        </Section>

        {/* ============================================================ */}
        {/*  FEATURES GRID                                                */}
        {/* ============================================================ */}
        <Section id="features" className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-28">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#c56f38]">Everything you need</p>
            <h2
              className="mt-3 text-3xl tracking-tight text-[#10231d] sm:text-4xl lg:text-5xl"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif", letterSpacing: '-0.03em' }}
            >
              One platform. Every part of your operation.
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-[#4b5f58]">
              No more switching between apps. Hygieia covers your entire workflow from first contact to final invoice.
            </p>
          </div>

          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {modules.map((mod, i) => (
              <div
                key={mod.title}
                className={`group relative rounded-2xl border p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
                  i === 0
                    ? 'border-[#1f5c52]/20 bg-[#10231d] text-white shadow-xl shadow-[#10231d]/15'
                    : 'border-[#10231d]/8 bg-white/80 hover:border-[#10231d]/15 hover:bg-white'
                }`}
              >
                <div
                  className={`inline-flex rounded-xl p-3 ${
                    i === 0 ? 'bg-white/10 text-[#f1b16f]' : 'bg-[#10231d]/5 text-[#1f5c52]'
                  }`}
                >
                  <mod.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">{mod.title}</h3>
                <p className={`mt-2 text-[15px] leading-relaxed ${i === 0 ? 'text-white/75' : 'text-[#4b5f58]'}`}>
                  {mod.desc}
                </p>
              </div>
            ))}
          </div>
        </Section>

        {/* ============================================================ */}
        {/*  WORKFLOW COMPARISON                                          */}
        {/* ============================================================ */}
        <Section id="workflows" className="bg-[#10231d] py-20 text-white lg:py-28">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#f1b16f]">Two workflows, one platform</p>
              <h2
                className="mt-3 text-3xl tracking-tight sm:text-4xl lg:text-5xl"
                style={{ fontFamily: "'DM Serif Display', Georgia, serif", letterSpacing: '-0.03em' }}
              >
                Commercial and residential, handled properly.
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-white/65">
                Different sales motions. Different service patterns. Hygieia respects the differences instead of forcing one pipeline on both.
              </p>
            </div>

            <div className="mt-14 grid gap-6 lg:grid-cols-2">
              {workflows.map((flow) => (
                <div
                  key={flow.title}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-sm sm:p-8"
                >
                  <div className="flex items-center gap-4">
                    <div className={`rounded-xl bg-gradient-to-br ${flow.color} p-3`}>
                      <flow.icon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/45">{flow.eyebrow}</p>
                      <h3 className="mt-0.5 text-2xl font-semibold">{flow.title}</h3>
                    </div>
                  </div>

                  <div className="mt-6 space-y-0">
                    {flow.steps.map((step, i) => (
                      <div key={step} className="flex items-start gap-3 py-2.5">
                        <div className="relative flex flex-col items-center">
                          <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                            i === flow.steps.length - 1
                              ? 'bg-[#f1b16f] text-[#10231d]'
                              : 'bg-white/10 text-white/60'
                          }`}>
                            {i === flow.steps.length - 1 ? <Check className="h-3.5 w-3.5" /> : i + 1}
                          </div>
                          {i < flow.steps.length - 1 && (
                            <div className="absolute top-6 h-full w-px bg-white/10" />
                          )}
                        </div>
                        <span className="text-[15px] leading-relaxed text-white/80">{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* ============================================================ */}
        {/*  WHY HYGIEIA (value props)                                    */}
        {/* ============================================================ */}
        <Section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-28">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#c56f38]">Why Hygieia</p>
              <h2
                className="mt-3 text-3xl tracking-tight text-[#10231d] sm:text-4xl lg:text-5xl"
                style={{ fontFamily: "'DM Serif Display', Georgia, serif", letterSpacing: '-0.03em' }}
              >
                Your whole business, finally connected.
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-[#4b5f58]">
                Most cleaning companies run on spreadsheets, WhatsApp, and three different apps that don't talk to each other.
                Hygieia replaces the chaos with one connected workflow.
              </p>

              <div className="mt-8 space-y-4">
                {[
                  { icon: LineChart, text: 'See real margins per contract, not just revenue' },
                  { icon: Users, text: 'Office, field teams, and subcontractors on one platform' },
                  { icon: Shield, text: 'Client-facing documents with e-signatures built in' },
                  { icon: Zap, text: 'Signed contract auto-creates jobs, schedules, and invoices' },
                ].map((item) => (
                  <div key={item.text} className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#1f5c52]/10">
                      <item.icon className="h-3.5 w-3.5 text-[#1f5c52]" />
                    </div>
                    <span className="text-[15px] leading-relaxed text-[#3a4f48]">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Visual: connected pipeline */}
            <div className="relative">
              <div className="rounded-2xl border border-[#10231d]/10 bg-white p-6 shadow-xl shadow-[#10231d]/5 sm:p-8">
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#6b7f78]">How it connects</p>
                <div className="mt-5 space-y-3">
                  {[
                    { label: 'Lead captured', module: 'CRM', color: 'border-emerald-200 bg-emerald-50' },
                    { label: 'Proposal sent', module: 'Sales', color: 'border-blue-200 bg-blue-50' },
                    { label: 'Contract signed', module: 'Contracts', color: 'border-violet-200 bg-violet-50' },
                    { label: 'Jobs created', module: 'Scheduling', color: 'border-amber-200 bg-amber-50' },
                    { label: 'Service delivered', module: 'Field Ops', color: 'border-teal-200 bg-teal-50' },
                    { label: 'Invoice sent', module: 'Finance', color: 'border-orange-200 bg-orange-50' },
                  ].map((item, i, arr) => (
                    <div key={item.label}>
                      <div className={`flex items-center justify-between rounded-xl border px-4 py-3 ${item.color}`}>
                        <div className="flex items-center gap-3">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-xs font-bold text-[#10231d]/70">
                            {i + 1}
                          </div>
                          <span className="text-sm font-medium text-[#10231d]">{item.label}</span>
                        </div>
                        <span className="rounded-md bg-white/80 px-2 py-0.5 text-[11px] font-semibold text-[#4b5f58]">{item.module}</span>
                      </div>
                      {i < arr.length - 1 && (
                        <div className="ml-[22px] h-3 w-px bg-[#10231d]/10" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* ============================================================ */}
        {/*  TESTIMONIALS                                                 */}
        {/* ============================================================ */}
        <Section id="testimonials" className="border-y border-[#10231d]/6 bg-[#f5f0e8] py-20 lg:py-28">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#c56f38]">Testimonials</p>
              <h2
                className="mt-3 text-3xl tracking-tight text-[#10231d] sm:text-4xl lg:text-5xl"
                style={{ fontFamily: "'DM Serif Display', Georgia, serif", letterSpacing: '-0.03em' }}
              >
                Cleaning companies that switched.
              </h2>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {testimonials.map((t) => (
                <div key={t.name} className="rounded-2xl border border-[#10231d]/8 bg-white p-6">
                  <div className="flex gap-0.5">
                    {Array.from({ length: t.stars }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-[#f1b16f] text-[#f1b16f]" />
                    ))}
                  </div>
                  <p className="mt-4 text-[15px] leading-relaxed text-[#3a4f48]">"{t.quote}"</p>
                  <div className="mt-5 border-t border-[#10231d]/6 pt-4">
                    <p className="text-sm font-semibold text-[#10231d]">{t.name}</p>
                    <p className="text-xs text-[#6b7f78]">{t.company}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* ============================================================ */}
        {/*  FAQ                                                          */}
        {/* ============================================================ */}
        <Section id="faq" className="mx-auto max-w-3xl px-5 py-20 sm:px-8 lg:py-28">
          <div className="text-center">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#c56f38]">FAQ</p>
            <h2
              className="mt-3 text-3xl tracking-tight text-[#10231d] sm:text-4xl"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif", letterSpacing: '-0.03em' }}
            >
              Common questions
            </h2>
          </div>
          <div className="mt-10">
            {faqs.map((f) => (
              <FaqItem key={f.q} q={f.q} a={f.a} />
            ))}
          </div>
        </Section>

        {/* ============================================================ */}
        {/*  FINAL CTA                                                    */}
        {/* ============================================================ */}
        <Section className="px-5 pb-20 sm:px-8 lg:pb-28">
          <div className="mx-auto max-w-7xl overflow-hidden rounded-3xl bg-[#10231d] px-6 py-16 text-center text-white sm:px-12 sm:py-20">
            {/* Decorative orb */}
            <div className="pointer-events-none absolute left-1/2 top-0 h-[300px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#1f5c52]/30 blur-[100px]" />

            <h2
              className="relative mx-auto max-w-3xl text-3xl tracking-tight sm:text-4xl lg:text-5xl"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif", letterSpacing: '-0.03em' }}
            >
              Ready to run your cleaning business from one system?
            </h2>
            <p className="relative mx-auto mt-4 max-w-xl text-lg leading-relaxed text-white/65">
              Join cleaning companies that replaced spreadsheets and disconnected tools with Hygieia.
            </p>

            <div className="relative mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link
                to="/app"
                className="inline-flex items-center gap-2.5 rounded-xl bg-[#c56f38] px-8 py-4 text-[15px] font-semibold text-white shadow-xl shadow-[#c56f38]/25 transition-all hover:bg-[#ae5d2d]"
              >
                Start Free Trial
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-8 py-4 text-[15px] font-semibold text-white transition hover:bg-white/5"
              >
                Sign in to your account
              </Link>
            </div>
          </div>
        </Section>

        {/* ============================================================ */}
        {/*  FOOTER                                                       */}
        {/* ============================================================ */}
        <footer className="border-t border-[#10231d]/8 py-10">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-5 sm:flex-row sm:px-8">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#10231d]">
                <Sparkles className="h-3 w-3 text-[#f1b16f]" />
              </div>
              <span className="text-sm font-bold tracking-tight" style={{ fontFamily: "'Manrope', sans-serif" }}>
                Hygieia
              </span>
            </div>
            <p className="text-sm text-[#6b7f78]">&copy; {new Date().getFullYear()} Hygieia. All rights reserved.</p>
          </div>
        </footer>
      </main>
    </div>
  );
}
