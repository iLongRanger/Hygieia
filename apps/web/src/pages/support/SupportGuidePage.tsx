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
  Contact,
  DatabaseBackup,
  FileBarChart,
  FileSignature,
  FileText,
  Handshake,
  HelpCircle,
  Home,
  LayoutTemplate,
  Receipt,
  Settings,
  Tags,
  Timer,
  UserCog,
  Users,
  Wallet,
  Warehouse,
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
  'Set up scheduled database backups, R2 storage retention, and restore drills before production use.',
];

const modules: GuideModule[] = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    description: 'Daily command center for owners, admins, and managers.',
    icon: BarChart3,
    route: '/app',
    primaryUse:
      'Use Dashboard to see high-level activity, alerts, and work that needs attention.',
    functions: [
      'Review operational status',
      'Monitor account and sales activity',
      'Jump into overdue or active work',
    ],
    steps: [
      'Open Dashboard after login.',
      'Review visible alerts and summary cards.',
      'Use linked records to continue the required next step.',
    ],
  },
  {
    id: 'leads',
    title: 'Leads',
    description: 'New opportunities before they become accounts or proposals.',
    icon: Users,
    route: '/leads',
    primaryUse:
      'Use Leads to capture incoming opportunities and move qualified work into the sales workflow.',
    functions: [
      'Create and review leads',
      'Track opportunity source and status',
      'Convert qualified leads into accounts or proposals',
    ],
    steps: [
      'Open Leads from CRM.',
      'Create or open a lead.',
      'Record contact details, requested service, and notes.',
      'Move qualified work into account, appointment, or proposal steps.',
    ],
  },
  {
    id: 'accounts',
    title: 'Accounts',
    description: 'Commercial and residential customer records.',
    icon: Building2,
    route: '/accounts',
    primaryUse:
      'Use Accounts as the customer record that connects contacts, service locations, appointments, proposals, contracts, and invoices.',
    functions: [
      'Create commercial or residential accounts',
      'Review account history',
      'Manage related contacts and service locations',
      'Open linked sales and operations records',
    ],
    steps: [
      'Open Accounts from CRM.',
      'Create or open an account.',
      'Add contacts for decision makers or billing contacts.',
      'Add one or more service locations.',
      'Use account history to review notes, appointments, and sales activity.',
    ],
  },
  {
    id: 'contacts',
    title: 'Contacts',
    description: 'People tied to accounts, billing, and service decisions.',
    icon: Contact,
    route: '/contacts',
    primaryUse:
      'Use Contacts to manage decision makers, billing contacts, site contacts, and communication details.',
    functions: [
      'Create contacts',
      'Attach contacts to accounts',
      'Store email and phone details',
      'Open related account records',
    ],
    steps: [
      'Open Contacts from CRM.',
      'Create or open a contact.',
      'Confirm role, email, phone, and related account.',
      'Use the linked account to continue sales or service work.',
    ],
  },
  {
    id: 'service-locations',
    title: 'Service Locations',
    description: 'Every place where cleaning service is delivered.',
    icon: Warehouse,
    route: '/service-locations',
    primaryUse:
      'Use Service Locations to define physical sites, areas, tasks, and readiness details used by proposals and contracts.',
    functions: [
      'Create service locations under accounts',
      'Manage service areas and tasks',
      'Book walkthroughs',
      'Prepare locations for proposal pricing',
    ],
    steps: [
      'Open Service Locations from CRM or from an account.',
      'Create or open a service location.',
      'Book a walkthrough before managing areas and tasks.',
      'Add areas and tasks once the service scope is known.',
      'Use the service location when creating proposals and contracts.',
    ],
  },
  {
    id: 'proposals',
    title: 'Proposals',
    description:
      'One proposal engine for commercial, residential, and specialized work.',
    icon: FileText,
    route: '/proposals',
    primaryUse:
      'Use Proposals to prepare pricing, services, terms, and client-facing PDF/public links.',
    functions: [
      'Create commercial proposals',
      'Create residential proposals',
      'Create specialized job proposals',
      'Populate areas and tasks from service locations',
      'Send or resend proposal emails',
    ],
    steps: [
      'Open Proposals from Sales.',
      'Create a proposal and choose Commercial, Residential, or Specialized.',
      'Select an account and eligible service location when required.',
      'For specialized work, select the requested specialized job.',
      'Calculate and populate pricing.',
      'Review services, areas, tasks, financial summary, and pricing breakdown.',
      'Send the proposal link to the client.',
    ],
    notes: [
      'Specialized proposals do not require service-location review before proposal. Residential and commercial should use service-location areas and tasks.',
    ],
  },
  {
    id: 'contracts',
    title: 'Contracts',
    description: 'Accepted work converted into active service agreements.',
    icon: FileSignature,
    route: '/contracts',
    primaryUse:
      'Use Contracts to lock terms, services, service location, pricing, and assignment requirements.',
    functions: [
      'Create contracts from accepted work',
      'Send contract public links',
      'Activate contracts',
      'Manage service terms and assignment status',
    ],
    steps: [
      'Open Contracts from Sales.',
      'Create or open a contract.',
      'Review overview, services, assignment, and activity tabs.',
      'Send the contract to the client.',
      'Activate the contract after acceptance.',
      'Complete required service-location assignment after activation.',
    ],
  },
  {
    id: 'invoices',
    title: 'Invoices',
    description: 'Client billing for completed or billable work.',
    icon: Receipt,
    route: '/invoices',
    primaryUse:
      'Use Invoices to bill clients, send payment links, and track collection status.',
    functions: [
      'Create invoices',
      'Send invoice links',
      'Track payment status',
      'Open invoice detail records',
    ],
    steps: [
      'Open Invoices from Sales.',
      'Create an invoice from contract or job activity.',
      'Review line items, tax, total, and client details.',
      'Send the invoice link.',
      'Record payment when collected.',
    ],
  },
  {
    id: 'jobs',
    title: 'Jobs',
    description:
      'Scheduled work generated from active contracts or one-time jobs.',
    icon: Briefcase,
    route: '/jobs',
    primaryUse: 'Use Jobs to schedule, assign, and track cleaning work.',
    functions: [
      'Review scheduled jobs',
      'Assign workers or subcontractors',
      'Track job status',
      'Open job detail and notes',
    ],
    steps: [
      'Open Jobs from Operations.',
      'Review today, upcoming, missed, or active jobs.',
      'Create or open a job.',
      'Assign the right team.',
      'Track completion and add notes as work progresses.',
    ],
  },
  {
    id: 'inspections',
    title: 'Inspections',
    description:
      'Quality checks tied to jobs, appointments, or service issues.',
    icon: ClipboardCheck,
    route: '/inspections',
    primaryUse:
      'Use Inspections to document quality, deficiencies, and reinspection needs.',
    functions: [
      'Create inspections',
      'Use inspection templates',
      'Record pass/fail results',
      'Track follow-up issues',
    ],
    steps: [
      'Open Inspections from Operations.',
      'Create or open an inspection.',
      'Choose the related job, appointment, or service location.',
      'Complete checklist items and notes.',
      'Create follow-up work when quality issues need action.',
    ],
  },
  {
    id: 'time-tracking',
    title: 'Time Tracking',
    description: 'Clock-in, clock-out, and work-time records.',
    icon: Timer,
    route: '/time-tracking',
    primaryUse:
      'Use Time Tracking to record hourly work and support payroll accuracy.',
    functions: [
      'Clock workers in and out',
      'Review active time entries',
      'Track job work time',
      'Support payroll calculations',
    ],
    steps: [
      'Open Time Tracking from Operations.',
      'Start or review a time entry for the assigned worker.',
      'Connect time to the correct job when required.',
      'Close entries when work is complete.',
      'Review timesheets before payroll.',
    ],
  },
  {
    id: 'appointments',
    title: 'Appointments',
    description:
      'Walkthroughs, visits, inspections, and scheduled customer meetings.',
    icon: Calendar,
    route: '/appointments',
    primaryUse:
      'Use Appointments to schedule required site visits and document what happened.',
    functions: [
      'Book walkthroughs',
      'Prevent duplicate appointment types',
      'Route from notifications',
      'Add appointment notes to account history',
    ],
    steps: [
      'Open Appointments from Operations.',
      'Select account, service location, appointment type, date, and time.',
      'Open the appointment record after booking.',
      'Add notes after the walkthrough, visit, or inspection.',
    ],
  },
  {
    id: 'finance-overview',
    title: 'Finance Overview',
    description:
      'Financial dashboard for revenue, expenses, payroll, and reporting signals.',
    icon: BarChart3,
    route: '/finance',
    primaryUse:
      'Use Finance Overview to understand current financial health before drilling into details.',
    functions: [
      'Review financial summaries',
      'Monitor revenue and costs',
      'Navigate to expenses, payroll, and reports',
    ],
    steps: [
      'Open Overview from Finance.',
      'Review summary cards and trends.',
      'Open Expenses, Payroll, Reports, or Invoices for detailed work.',
    ],
  },
  {
    id: 'expenses',
    title: 'Expenses',
    description: 'Operating costs and reimbursable spending.',
    icon: Receipt,
    route: '/finance/expenses',
    primaryUse:
      'Use Expenses to record company costs and worker-submitted spending.',
    functions: [
      'Create expense records',
      'Review submitted expenses',
      'Classify costs',
      'Support reporting',
    ],
    steps: [
      'Open Expenses from Finance.',
      'Create or review an expense.',
      'Confirm category, amount, date, receipt, and related job if applicable.',
      'Approve or resolve submitted expenses as needed.',
    ],
  },
  {
    id: 'payroll',
    title: 'Payroll',
    description:
      'Worker pay calculations from compensation setup, time, and jobs.',
    icon: Wallet,
    route: '/finance/payroll',
    primaryUse:
      'Use Payroll to calculate what internal workers and subcontractors should be paid.',
    functions: [
      'Generate payroll',
      'Review worker compensation',
      'Use time entries and job completions',
      'Track pay status',
    ],
    steps: [
      'Open Payroll from Finance.',
      'Choose the payroll period.',
      'Review hourly and percentage-based calculations.',
      'Resolve missing time, job, or compensation data.',
      'Finalize payroll when amounts are correct.',
    ],
  },
  {
    id: 'reports',
    title: 'Reports',
    description: 'Financial and operational reporting.',
    icon: FileBarChart,
    route: '/finance/reports',
    primaryUse:
      'Use Reports to review performance, revenue, costs, and operational patterns.',
    functions: [
      'Review financial reports',
      'Compare revenue and expenses',
      'Track payroll and job performance',
      'Export or reference reporting data',
    ],
    steps: [
      'Open Reports from Finance.',
      'Choose the report or date range.',
      'Review totals and trends.',
      'Use the results to adjust pricing, staffing, or operations.',
    ],
  },
  {
    id: 'commercial-pricing',
    title: 'Commercial Pricing',
    description: 'Recurring commercial pricing controls.',
    icon: Calculator,
    route: '/commercial/pricing',
    primaryUse:
      'Use Commercial Pricing before quoting recurring commercial work.',
    functions: [
      'Maintain commercial rates',
      'Configure assumptions',
      'Support proposal calculations',
    ],
    steps: [
      'Open Commercial from Pricing.',
      'Review current commercial pricing.',
      'Update rates and assumptions.',
      'Confirm tax and templates before live proposal use.',
    ],
  },
  {
    id: 'residential-pricing',
    title: 'Residential Pricing',
    description: 'Residential plans, frequency rules, and add-ons.',
    icon: Home,
    route: '/residential/pricing',
    primaryUse:
      'Use Residential Pricing before creating residential proposals.',
    functions: [
      'Maintain residential plans',
      'Configure frequency pricing',
      'Manage add-ons and assumptions',
    ],
    steps: [
      'Open Residential from Pricing.',
      'Review available plans and frequencies.',
      'Update pricing, add-ons, and assumptions.',
      'Confirm values before creating residential proposals.',
    ],
  },
  {
    id: 'specialized-catalog',
    title: 'Specialized Job',
    description: 'Catalog pricing for one-time or specialized work.',
    icon: Tags,
    route: '/specialized/catalog',
    primaryUse:
      'Use Specialized Job to maintain one-time services that can be quoted without full service-location review.',
    functions: [
      'Maintain specialized job catalog',
      'Set prices and descriptions',
      'Support specialized proposals',
    ],
    steps: [
      'Open Specialized Job from Pricing.',
      'Create or update catalog items.',
      'Confirm pricing and service descriptions.',
      'Use the catalog item when creating a specialized proposal.',
    ],
  },
  {
    id: 'area-templates',
    title: 'Area',
    description: 'Reusable service-location area templates.',
    icon: LayoutTemplate,
    route: '/area-templates',
    primaryUse:
      'Use Area templates to standardize the spaces that can be added to service locations.',
    functions: [
      'Create area templates',
      'Organize by account or service type',
      'Support proposal and task setup',
    ],
    steps: [
      'Open Area from Manage.',
      'Create or update an area template.',
      'Set name, type, and defaults.',
      'Use the template when building service-location scope.',
    ],
  },
  {
    id: 'task-templates',
    title: 'Task',
    description: 'Reusable cleaning task templates.',
    icon: ClipboardList,
    route: '/tasks',
    primaryUse:
      'Use Task templates to standardize recurring cleaning work by area type.',
    functions: [
      'Create task templates',
      'Set frequency and instructions',
      'Attach tasks to areas and proposals',
    ],
    steps: [
      'Open Task from Manage.',
      'Create or update a task template.',
      'Set task name, instructions, frequency, and defaults.',
      'Apply templates when building service-location areas and proposal services.',
    ],
  },
  {
    id: 'people',
    title: 'People',
    description:
      'Users, internal employees, managers, admins, and subcontractor access.',
    icon: UserCog,
    route: '/users',
    primaryUse:
      'Use People to control access, worker identity, address details, and compensation setup.',
    functions: [
      'Manage user access',
      'Identify internal employees and subcontractors',
      'Set hourly or percentage compensation',
      'Invite subcontractors',
    ],
    steps: [
      'Open People from Manage.',
      'Create or update people records.',
      'Set role and permissions.',
      'Set worker type and compensation information.',
      'Use Subcontractor Access Management to invite subcontractor companies.',
    ],
  },
  {
    id: 'subcontractor-access',
    title: 'Subcontractor Access',
    description: 'External company and subcontractor team access.',
    icon: Handshake,
    route: '/teams',
    primaryUse:
      'Use Subcontractor Access to manage subcontractor companies, invites, and team visibility.',
    functions: [
      'Manage subcontractor teams',
      'Invite subcontractor users',
      'Control access to assigned work',
    ],
    steps: [
      'Open Subcontractor Access from Manage.',
      'Create or open a subcontractor team.',
      'Invite the correct users.',
      'Confirm assigned contracts, jobs, and permissions are visible.',
    ],
  },
  {
    id: 'global-settings',
    title: 'Global Settings',
    description: 'Company-wide configuration and automation controls.',
    icon: Settings,
    route: '/settings/global',
    primaryUse:
      'Use Global Settings to maintain company profile, tax, branding, email, and background services.',
    functions: [
      'Maintain company settings',
      'Configure tax and branding',
      'Control email settings',
      'Review background services',
    ],
    steps: [
      'Open Global Settings from Manage.',
      'Update company profile, branding, timezone, tax rate, and email settings.',
      'Review background service settings and logs.',
      'Save changes before creating live proposals or invoices.',
    ],
  },
  {
    id: 'backup-restore',
    title: 'Backup and Restore',
    description:
      'Operational recovery process for database backups, R2 uploads, photo recovery audits, and restore drills.',
    icon: DatabaseBackup,
    route: '/settings/global',
    primaryUse:
      'Use Backup and Restore guidance to protect company data and recover the system after server, database, or deployment failure.',
    functions: [
      'Check backup readiness',
      'Create and upload PostgreSQL backups to R2',
      'List, download, verify, and restore backups',
      'Export system configuration and photo manifests',
      'Run restore drills before production changes',
    ],
    steps: [
      'Open Global Settings to export system configuration or photo manifests when needed.',
      'On the server, run pnpm run db:backup:check before enabling scheduled backups.',
      'Use pnpm run db:backup:scheduled for the normal scheduled backup workflow.',
      'Use pnpm run db:backup:list-r2 to find available R2 backups.',
      'Use pnpm run db:restore:r2 with the selected backup key during recovery.',
      'Run the restore drill checklist after setup and after major backup changes.',
    ],
    notes: [
      'Database restore is a server/admin operation, not a normal browser action.',
      'Backups include manifest metadata with checksum, app version, and git commit so operators can verify integrity and decide whether migrations are needed.',
      'Uploaded photos live in R2 while photo metadata lives in PostgreSQL, so both the database backup and R2 bucket must be protected.',
    ],
  },
  {
    id: 'support',
    title: 'Support Guide',
    description: 'In-app guide for how the system is used.',
    icon: HelpCircle,
    route: '/support',
    primaryUse:
      'Use Support Guide to understand the workflow and module responsibilities.',
    functions: [
      'Review setup checklist',
      'Review workflow order',
      'Open module guidance',
      'Check common rules',
    ],
    steps: [
      'Open Support Guide from Support.',
      'Select a module from the guide list.',
      'Read what the module is for, its functions, and how to use it.',
      'Use Open module to jump to the related page.',
    ],
  },
];

const fullFlow = [
  {
    label: 'Lead',
    detail:
      'Create lead or opportunity and identify commercial, residential, or specialized work.',
  },
  {
    label: 'Account',
    detail: 'Create account, contacts, and service location.',
  },
  {
    label: 'Walkthrough',
    detail: 'Book appointment, visit the service location, and record notes.',
  },
  {
    label: 'Service Setup',
    detail:
      'Add areas and tasks to the service location based on account type.',
  },
  {
    label: 'Proposal',
    detail:
      'Calculate pricing, populate services, review breakdown, and send to client.',
  },
  {
    label: 'Contract',
    detail: 'Convert accepted work into a contract and activate it.',
  },
  {
    label: 'Operations',
    detail: 'Assign team, generate jobs, track work, and inspect quality.',
  },
  {
    label: 'Finance',
    detail: 'Invoice client, record payment, expenses, and payroll.',
  },
];

export default function SupportGuidePage() {
  const [activeModuleId, setActiveModuleId] = useState(modules[0].id);
  const activeModule =
    modules.find((module) => module.id === activeModuleId) ?? modules[0];
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
            <h1 className="text-3xl font-bold text-surface-100">
              How to use Hygieia
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-surface-400">
              Follow this guide to understand what each module does, where it
              fits in the cleaning company workflow, and what steps users should
              take from first lead through payroll.
            </p>
          </div>
          <div className="rounded-xl border border-surface-700 bg-surface-950/70 p-4 text-sm text-surface-300 lg:w-80">
            <p className="font-semibold text-surface-100">
              Best starting point
            </p>
            <p className="mt-1 text-surface-400">
              Configure pricing, tasks, people, and global settings before
              entering live customer work.
            </p>
          </div>
        </div>
      </div>

      <section className="rounded-2xl border border-surface-700 bg-surface-900 p-6 shadow-soft">
        <h2 className="text-xl font-semibold text-surface-100">
          Initial setup checklist
        </h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {setupSteps.map((step, index) => (
            <div
              key={step}
              className="flex gap-3 rounded-xl border border-surface-700 bg-surface-950/60 p-4"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-500/15 text-sm font-semibold text-primary-300">
                {index + 1}
              </span>
              <p className="text-sm leading-6 text-surface-300">{step}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-surface-700 bg-surface-900 p-6 shadow-soft">
        <h2 className="text-xl font-semibold text-surface-100">
          Full workflow
        </h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {fullFlow.map((item, index) => (
            <div
              key={item.label}
              className="rounded-xl border border-surface-700 bg-surface-950/60 p-4"
            >
              <div className="text-xs font-semibold uppercase tracking-wide text-primary-300">
                Step {index + 1}
              </div>
              <h3 className="mt-2 font-semibold text-surface-100">
                {item.label}
              </h3>
              <p className="mt-2 text-sm leading-6 text-surface-400">
                {item.detail}
              </p>
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
              <h2 className="text-2xl font-semibold text-surface-100">
                {activeModule.title}
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-surface-400">
                {activeModule.description}
              </p>
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
              <p className="mt-2 text-sm leading-6 text-surface-400">
                {activeModule.primaryUse}
              </p>
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
        <h2 className="text-xl font-semibold text-surface-100">
          Common rules to remember
        </h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[
            {
              icon: Calendar,
              text: 'Book walkthroughs before opening service-location area and task management.',
            },
            {
              icon: FileText,
              text: 'Use Proposals for commercial, residential, and specialized work.',
            },
            {
              icon: FileSignature,
              text: 'Assign teams after contracts are activated, not before.',
            },
            {
              icon: Timer,
              text: 'Hourly workers use time tracking; percentage workers track job clock-in and completion.',
            },
            {
              icon: ClipboardCheck,
              text: 'Use inspections to document quality before closing operational issues.',
            },
            {
              icon: Receipt,
              text: 'Invoices and payroll depend on clean contract, job, and compensation data.',
            },
            {
              icon: Settings,
              text: 'Pricing, tax, templates, and background services should be maintained before live use.',
            },
            {
              icon: DatabaseBackup,
              text: 'Backups, R2 retention, and restore drills should be configured before production use.',
            },
            {
              icon: HelpCircle,
              text: 'If a page looks empty, check account type, service location eligibility, active proposal, and permissions.',
            },
          ].map((rule) => {
            const RuleIcon = rule.icon;
            return (
              <div
                key={rule.text}
                className="rounded-xl border border-surface-700 bg-surface-950/60 p-4"
              >
                <RuleIcon className="h-5 w-5 text-primary-300" />
                <p className="mt-3 text-sm leading-6 text-surface-300">
                  {rule.text}
                </p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
