import { useState } from 'react';
import type { ComponentType } from 'react';
import {
  BarChart3,
  Briefcase,
  Building2,
  Calculator,
  Calendar,
  ClipboardCheck,
  ClipboardList,
  DollarSign,
  FileSignature,
  FileText,
  HelpCircle,
  Receipt,
  Settings,
  Timer,
  Users,
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface GuideModule {
  id: string;
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  route: string;
  primaryUse: string;
  functions: string[];
  steps: string[];
  notes?: string[];
}

const setupSteps = [
  'Set company profile, branding, timezone, tax rate, and email settings in Global Settings.',
  'Build pricing first: commercial pricing, residential pricing, specialized job catalog, area types, and task templates.',
  'Add people: owners, admins, managers, internal employees, and subcontractor access.',
  'Create accounts, contacts, and service locations.',
  'Book walkthrough appointments before managing service-location areas and tasks for proposal readiness.',
  'Create proposals, send the public link, convert accepted work into contracts, then activate the contract.',
  'Assign teams after contract activation, generate jobs, track work, inspect when needed, invoice, collect payment, and run payroll.',
];

const modules: GuideModule[] = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    description: 'Daily command center for owners, admins, and managers.',
    icon: BarChart3,
    route: '/app',
    primaryUse: 'Use it to see high-level activity, alerts, and work that needs attention.',
    functions: ['Review operational status', 'Monitor account and sales activity', 'Jump into overdue or active work'],
    steps: ['Open Dashboard after login.', 'Review visible alerts and summary cards.', 'Use linked records to continue the required next step.'],
  },
  {
    id: 'crm',
    title: 'CRM',
    description: 'Lead, account, contact, and service-location management.',
    icon: Users,
    route: '/accounts',
    primaryUse: 'Use CRM to capture customers and organize every place where service is delivered.',
    functions: [
      'Create commercial or residential accounts',
      'Manage contacts',
      'Create service locations under each account',
      'Track account history and appointment notes',
    ],
    steps: [
      'Create or open an account.',
      'Add contacts for decision makers or property contacts.',
      'Add one or more service locations.',
      'Book a walkthrough before managing areas and tasks.',
      'Use account history to review notes, appointments, and sales activity.',
    ],
    notes: ['Residential and commercial accounts both use Service Locations. Avoid using Facility or Property as separate workflows.'],
  },
  {
    id: 'appointments',
    title: 'Appointments',
    description: 'Walkthroughs, visits, inspections, and scheduled customer meetings.',
    icon: Calendar,
    route: '/appointments',
    primaryUse: 'Use appointments to schedule required site visits and document what happened.',
    functions: ['Book walkthroughs', 'Prevent duplicate appointment types', 'Route from notifications', 'Add appointment notes to account history'],
    steps: [
      'Open Appointments or use Book an Appointment from a service location.',
      'Select account, service location, appointment type, date, and time.',
      'Open the appointment record after booking.',
      'Add notes after the walkthrough, visit, or inspection.',
    ],
  },
  {
    id: 'pricing',
    title: 'Pricing',
    description: 'Commercial, residential, and specialized job pricing controls.',
    icon: Calculator,
    route: '/commercial/pricing',
    primaryUse: 'Use pricing before sales work so proposals can calculate correctly.',
    functions: [
      'Maintain commercial pricing',
      'Maintain residential pricing',
      'Maintain specialized job catalog',
      'Control area and task templates used in proposal services',
    ],
    steps: [
      'Set commercial pricing for recurring commercial work.',
      'Set residential pricing, frequency, add-ons, and service assumptions.',
      'Set specialized job catalog items for one-time work.',
      'Confirm tax rate in Global Settings before sending proposals.',
    ],
  },
  {
    id: 'proposals',
    title: 'Proposals',
    description: 'One proposal engine for commercial, residential, and specialized work.',
    icon: FileText,
    route: '/proposals',
    primaryUse: 'Use proposals to prepare pricing, services, terms, and client-facing PDF/public links.',
    functions: [
      'Create commercial proposals',
      'Create residential proposals',
      'Create specialized job proposals',
      'Populate areas and tasks from service locations',
      'Send or resend proposal emails',
    ],
    steps: [
      'Create a proposal and choose Commercial, Residential, or Specialized.',
      'Select an account and eligible service location when required.',
      'For specialized work, select the requested specialized job.',
      'Calculate and populate pricing.',
      'Review services, areas, tasks, financial summary, and pricing breakdown.',
      'Send the proposal link to the client.',
    ],
    notes: ['Specialized proposals do not require service-location review before proposal. Residential and commercial should use service-location areas and tasks.'],
  },
  {
    id: 'contracts',
    title: 'Contracts',
    description: 'Accepted work converted into active service agreements.',
    icon: FileSignature,
    route: '/contracts',
    primaryUse: 'Use contracts to lock terms, services, service location, pricing, and assignment requirements.',
    functions: ['Create contracts from accepted work', 'Send contract public links', 'Activate contracts', 'Manage service terms and assignment status'],
    steps: [
      'Create or open a contract.',
      'Review overview, services, assignment, and activity tabs.',
      'Send the contract to the client.',
      'Activate the contract after acceptance.',
      'Complete required service-location assignment after activation.',
    ],
  },
  {
    id: 'operations',
    title: 'Operations',
    description: 'Jobs, inspections, time tracking, and appointment execution.',
    icon: Briefcase,
    route: '/jobs',
    primaryUse: 'Use operations to perform the work promised in active contracts.',
    functions: ['Manage jobs', 'Track missed and today jobs', 'Run inspections', 'Track hourly or percentage-based work completion'],
    steps: [
      'Use Jobs to review scheduled work.',
      'Assign internal employees or subcontractors.',
      'Use Time Tracking for hourly workers and job completion tracking for percentage workers.',
      'Use Inspections to verify quality and capture issues.',
      'Keep appointment and job notes updated for account history.',
    ],
  },
  {
    id: 'finance',
    title: 'Finance',
    description: 'Invoices, payments, expenses, payroll, and reports.',
    icon: DollarSign,
    route: '/finance',
    primaryUse: 'Use finance after work is contracted and jobs are completed or billable.',
    functions: ['Create invoices', 'Track payments', 'Record expenses', 'Generate payroll', 'Review financial reports'],
    steps: [
      'Create invoices from contract or job activity.',
      'Send invoice links and record payment.',
      'Record operating expenses.',
      'Generate payroll using each worker compensation setup.',
      'Use reports to review revenue, costs, and payroll.',
    ],
    notes: ['Tax rate from Global Settings should apply across proposals, contracts, invoices, and specialized jobs.'],
  },
  {
    id: 'people',
    title: 'People',
    description: 'Users, internal employees, managers, admins, and subcontractor access.',
    icon: Building2,
    route: '/users',
    primaryUse: 'Use People to control access, worker identity, address details, and compensation setup.',
    functions: ['Manage user access', 'Identify internal employees and subcontractors', 'Set hourly or percentage compensation', 'Invite subcontractors'],
    steps: [
      'Create or update people records.',
      'Set role and permissions.',
      'Set worker type and compensation information.',
      'Use Subcontractor Access Management to invite subcontractor companies.',
    ],
  },
  {
    id: 'manage',
    title: 'Manage',
    description: 'System configuration for reusable standards.',
    icon: Settings,
    route: '/settings/global',
    primaryUse: 'Use Manage to maintain standards that power the rest of the system.',
    functions: ['Global settings', 'Area templates', 'Task templates', 'Proposal templates', 'Background services'],
    steps: [
      'Maintain area templates by account/service type.',
      'Maintain task templates by area type.',
      'Configure global tax, branding, and background services.',
      'Review background service logs when scheduled automation behaves unexpectedly.',
    ],
  },
];

const fullFlow = [
  { label: 'Lead', detail: 'Create lead or opportunity and identify commercial, residential, or specialized work.' },
  { label: 'Account', detail: 'Create account, contacts, and service location.' },
  { label: 'Walkthrough', detail: 'Book appointment, visit the service location, and record notes.' },
  { label: 'Service Setup', detail: 'Add areas and tasks to the service location based on account type.' },
  { label: 'Proposal', detail: 'Calculate pricing, populate services, review breakdown, and send to client.' },
  { label: 'Contract', detail: 'Convert accepted work into a contract and activate it.' },
  { label: 'Operations', detail: 'Assign team, generate jobs, track work, and inspect quality.' },
  { label: 'Finance', detail: 'Invoice client, record payment, expenses, and payroll.' },
];

export default function SupportGuidePage() {
  const [activeModuleId, setActiveModuleId] = useState(modules[0].id);
  const activeModule = modules.find((module) => module.id === activeModuleId) ?? modules[0];
  const ActiveIcon = activeModule.icon;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-surface-700 bg-surface-900 p-6 shadow-soft">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary-500/30 bg-primary-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary-300">
              <HelpCircle className="h-3.5 w-3.5" />
              Support Guide
            </div>
            <h1 className="text-3xl font-bold text-surface-100">How to use Hygieia</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-surface-400">
              Follow this guide to understand what each module does, where it fits in the cleaning company workflow,
              and what steps users should take from first lead through payroll.
            </p>
          </div>
          <div className="rounded-xl border border-surface-700 bg-surface-950/70 p-4 text-sm text-surface-300 lg:w-80">
            <p className="font-semibold text-surface-100">Best starting point</p>
            <p className="mt-1 text-surface-400">
              Configure pricing, tasks, people, and global settings before entering live customer work.
            </p>
          </div>
        </div>
      </div>

      <section className="rounded-2xl border border-surface-700 bg-surface-900 p-6 shadow-soft">
        <h2 className="text-xl font-semibold text-surface-100">Initial setup checklist</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {setupSteps.map((step, index) => (
            <div key={step} className="flex gap-3 rounded-xl border border-surface-700 bg-surface-950/60 p-4">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-500/15 text-sm font-semibold text-primary-300">
                {index + 1}
              </span>
              <p className="text-sm leading-6 text-surface-300">{step}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-surface-700 bg-surface-900 p-6 shadow-soft">
        <h2 className="text-xl font-semibold text-surface-100">Full workflow</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {fullFlow.map((item, index) => (
            <div key={item.label} className="rounded-xl border border-surface-700 bg-surface-950/60 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-primary-300">
                Step {index + 1}
              </div>
              <h3 className="mt-2 font-semibold text-surface-100">{item.label}</h3>
              <p className="mt-2 text-sm leading-6 text-surface-400">{item.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <div className="rounded-2xl border border-surface-700 bg-surface-900 p-3 shadow-soft">
          <h2 className="px-3 py-2 text-sm font-semibold uppercase tracking-wide text-surface-500">
            Modules
          </h2>
          <div className="space-y-1">
            {modules.map((module) => {
              const ModuleIcon = module.icon;
              const isActive = activeModule.id === module.id;
              return (
                <button
                  key={module.id}
                  type="button"
                  onClick={() => setActiveModuleId(module.id)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition-colors',
                    isActive
                      ? 'bg-primary-500/15 text-primary-200'
                      : 'text-surface-400 hover:bg-surface-800 hover:text-surface-100'
                  )}
                >
                  <ModuleIcon className="h-4 w-4 shrink-0" />
                  <span className="font-medium">{module.title}</span>
                </button>
              );
            })}
          </div>
        </div>

        <article className="rounded-2xl border border-surface-700 bg-surface-900 p-6 shadow-soft">
          <div className="flex flex-col gap-4 border-b border-surface-700 pb-5 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500/15 text-primary-300">
                <ActiveIcon className="h-5 w-5" />
              </div>
              <h2 className="text-2xl font-semibold text-surface-100">{activeModule.title}</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-surface-400">{activeModule.description}</p>
            </div>
            <a
              href={activeModule.route}
              className="inline-flex items-center justify-center rounded-lg border border-surface-600 px-4 py-2 text-sm font-medium text-surface-200 transition-colors hover:bg-surface-800"
            >
              Open module
            </a>
          </div>

          <div className="mt-6 grid gap-5 xl:grid-cols-3">
            <div className="rounded-xl border border-surface-700 bg-surface-950/60 p-4 xl:col-span-1">
              <h3 className="font-semibold text-surface-100">What it is for</h3>
              <p className="mt-2 text-sm leading-6 text-surface-400">{activeModule.primaryUse}</p>
            </div>

            <div className="rounded-xl border border-surface-700 bg-surface-950/60 p-4 xl:col-span-1">
              <h3 className="font-semibold text-surface-100">Functions</h3>
              <ul className="mt-3 space-y-2 text-sm text-surface-300">
                {activeModule.functions.map((item) => (
                  <li key={item} className="flex gap-2">
                    <ClipboardList className="mt-0.5 h-4 w-4 shrink-0 text-primary-300" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-surface-700 bg-surface-950/60 p-4 xl:col-span-1">
              <h3 className="font-semibold text-surface-100">How to use it</h3>
              <ol className="mt-3 space-y-2 text-sm text-surface-300">
                {activeModule.steps.map((step, index) => (
                  <li key={step} className="flex gap-2">
                    <span className="text-primary-300">{index + 1}.</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          {activeModule.notes && (
            <div className="mt-5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
              <h3 className="font-semibold text-amber-200">Important notes</h3>
              <ul className="mt-2 space-y-2 text-sm leading-6 text-amber-100/90">
                {activeModule.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </div>
          )}
        </article>
      </section>

      <section className="rounded-2xl border border-surface-700 bg-surface-900 p-6 shadow-soft">
        <h2 className="text-xl font-semibold text-surface-100">Common rules to remember</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[
            { icon: Calendar, text: 'Book walkthroughs before opening service-location area and task management.' },
            { icon: FileText, text: 'Use Proposals for commercial, residential, and specialized work.' },
            { icon: FileSignature, text: 'Assign teams after contracts are activated, not before.' },
            { icon: Timer, text: 'Hourly workers use time tracking; percentage workers track job clock-in and completion.' },
            { icon: ClipboardCheck, text: 'Use inspections to document quality before closing operational issues.' },
            { icon: Receipt, text: 'Invoices and payroll depend on clean contract, job, and compensation data.' },
            { icon: Settings, text: 'Pricing, tax, templates, and background services should be maintained before live use.' },
            { icon: HelpCircle, text: 'If a page looks empty, check account type, service location eligibility, active proposal, and permissions.' },
          ].map((rule) => {
            const RuleIcon = rule.icon;
            return (
              <div key={rule.text} className="rounded-xl border border-surface-700 bg-surface-950/60 p-4">
                <RuleIcon className="h-5 w-5 text-primary-300" />
                <p className="mt-3 text-sm leading-6 text-surface-300">{rule.text}</p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
