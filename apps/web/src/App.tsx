import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useParams,
} from 'react-router-dom';
import { lazy, Suspense, type ReactNode } from 'react';
import { Toaster } from 'react-hot-toast';
import AdminLayout from './components/layout/AdminLayout';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { getRequiredPermissions } from './lib/routeAccess';

const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const LeadsList = lazy(() => import('./pages/leads/LeadsList'));
const LeadDetail = lazy(() => import('./pages/leads/LeadDetail'));
const AppointmentsPage = lazy(
  () => import('./pages/appointments/AppointmentsPage')
);
const AppointmentDetail = lazy(
  () => import('./pages/appointments/AppointmentDetail')
);
const AccountsList = lazy(() => import('./pages/accounts/AccountsList'));
const AccountDetail = lazy(() => import('./pages/accounts/AccountDetail'));
const ContactsList = lazy(() => import('./pages/contacts/ContactsList'));
const ContactDetail = lazy(() => import('./pages/contacts/ContactDetail'));
const UsersList = lazy(() => import('./pages/users/UsersList'));
const UserDetail = lazy(() => import('./pages/users/UserDetail'));
const FacilitiesList = lazy(() => import('./pages/facilities/FacilitiesList'));
const FacilityDetail = lazy(() => import('./pages/facilities/FacilityDetail'));
const PropertyDetail = lazy(() => import('./pages/properties/PropertyDetail'));
const TaskTemplatesList = lazy(() => import('./pages/tasks/TaskTemplatesList'));
const TaskTemplateDetail = lazy(
  () => import('./pages/tasks/TaskTemplateDetail')
);
const AreaTemplatesPage = lazy(() => import('./pages/areas/AreaTemplatesPage'));
const PricingSettingsPage = lazy(
  () => import('./pages/pricing/PricingSettingsPage')
);
const ResidentialPricingPlansPage = lazy(
  () => import('./pages/residential/ResidentialPricingPlansPage')
);
const ProposalsList = lazy(() => import('./pages/proposals/ProposalsList'));
const ProposalDetail = lazy(() => import('./pages/proposals/ProposalDetail'));
const ProposalForm = lazy(() => import('./pages/proposals/ProposalForm'));
const ContractsList = lazy(() => import('./pages/contracts/ContractsList'));
const ContractDetail = lazy(() => import('./pages/contracts/ContractDetail'));
const ContractForm = lazy(() => import('./pages/contracts/ContractForm'));
const ProposalTemplatesPage = lazy(
  () => import('./pages/settings/ProposalTemplatesPage')
);
const GlobalSettingsPage = lazy(
  () => import('./pages/settings/GlobalSettingsPage')
);
const TeamsList = lazy(() => import('./pages/teams/TeamsList'));
const JobsList = lazy(() => import('./pages/jobs/JobsList'));
const JobDetail = lazy(() => import('./pages/jobs/JobDetail'));
const JobForm = lazy(() => import('./pages/jobs/JobForm'));
const InspectionsList = lazy(
  () => import('./pages/inspections/InspectionsList')
);
const InspectionDetail = lazy(
  () => import('./pages/inspections/InspectionDetail')
);
const InspectionForm = lazy(() => import('./pages/inspections/InspectionForm'));
const InspectionTemplatesPage = lazy(
  () => import('./pages/inspections/InspectionTemplatesPage')
);
const TimeTrackingPage = lazy(
  () => import('./pages/timeTracking/TimeTrackingPage')
);
const TimesheetsPage = lazy(
  () => import('./pages/timeTracking/TimesheetsPage')
);
const InvoicesList = lazy(() => import('./pages/invoices/InvoicesList'));
const InvoiceDetail = lazy(() => import('./pages/invoices/InvoiceDetail'));
const InvoiceForm = lazy(() => import('./pages/invoices/InvoiceForm'));
const NotificationsPage = lazy(
  () => import('./pages/notifications/NotificationsPage')
);
const QuotationDetail = lazy(
  () => import('./pages/quotations/QuotationDetail')
);
const OneTimeServiceCatalogPage = lazy(
  () => import('./pages/quotations/OneTimeServiceCatalogPage')
);
const ExpensesPage = lazy(() => import('./pages/finance/ExpensesPage'));
const PayrollPage = lazy(() => import('./pages/finance/PayrollPage'));
const FinanceOverviewPage = lazy(
  () => import('./pages/finance/FinanceOverviewPage')
);
const FinanceReportsPage = lazy(
  () => import('./pages/finance/FinanceReportsPage')
);
const PublicProposalView = lazy(
  () => import('./pages/public/PublicProposalView')
);
const PublicContractView = lazy(
  () => import('./pages/public/PublicContractView')
);
const PublicContractAmendmentView = lazy(
  () => import('./pages/public/PublicContractAmendmentView')
);
const PublicQuotationView = lazy(
  () => import('./pages/public/PublicQuotationView')
);
const PublicResidentialQuoteView = lazy(
  () => import('./pages/public/PublicResidentialQuoteView')
);
const PublicInvoiceView = lazy(
  () => import('./pages/public/PublicInvoiceView')
);
const LandingPage = lazy(() => import('./pages/public/LandingPage'));
const SetPassword = lazy(() => import('./pages/auth/SetPassword'));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword'));
const Unauthorized = lazy(() => import('./pages/Unauthorized'));
const ProfilePage = lazy(() => import('./pages/profile/ProfilePage'));
const SupportGuidePage = lazy(() => import('./pages/support/SupportGuidePage'));

function withRouteGuard(path: string, element: ReactNode) {
  const requiredPermissions = getRequiredPermissions(path);
  if (!requiredPermissions) {
    return element;
  }

  return (
    <ProtectedRoute requiredPermissions={requiredPermissions}>
      {element}
    </ProtectedRoute>
  );
}

function LegacyFacilityDetailRedirect() {
  const { id } = useParams<{ id: string }>();
  return (
    <Navigate
      to={id ? `/service-locations/${id}` : '/service-locations'}
      replace
    />
  );
}

function RouteLoadingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm font-medium text-slate-600">
      Loading...
    </div>
  );
}

function App() {
  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            duration: 5000,
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Suspense fallback={<RouteLoadingFallback />}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/auth/forgot-password" element={<ForgotPassword />} />
            <Route path="/auth/set-password" element={<SetPassword />} />
            <Route path="/auth/reset-password" element={<ResetPassword />} />
            <Route path="/p/:token" element={<PublicProposalView />} />
            <Route path="/c/:token" element={<PublicContractView />} />
            <Route
              path="/ca/:token"
              element={<PublicContractAmendmentView />}
            />
            <Route path="/q/:token" element={<PublicQuotationView />} />
            <Route path="/rq/:token" element={<PublicResidentialQuoteView />} />
            <Route path="/i/:token" element={<PublicInvoiceView />} />
            <Route path="/unauthorized" element={<Unauthorized />} />

            <Route
              element={
                <ProtectedRoute>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/app" element={<Dashboard />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/support" element={<SupportGuidePage />} />
              <Route
                path="/leads"
                element={withRouteGuard('/leads', <LeadsList />)}
              />
              <Route
                path="/leads/new"
                element={withRouteGuard('/leads', <LeadsList />)}
              />
              <Route
                path="/leads/:id"
                element={withRouteGuard('/leads', <LeadDetail />)}
              />
              <Route
                path="/appointments"
                element={withRouteGuard('/appointments', <AppointmentsPage />)}
              />
              <Route
                path="/appointments/:id"
                element={withRouteGuard(
                  '/appointments/:id',
                  <AppointmentDetail />
                )}
              />
              <Route
                path="/accounts"
                element={withRouteGuard('/accounts', <AccountsList />)}
              />
              <Route
                path="/accounts/:id"
                element={withRouteGuard('/accounts', <AccountDetail />)}
              />
              <Route
                path="/residential/accounts/:id"
                element={withRouteGuard(
                  '/residential/accounts/:id',
                  <AccountDetail />
                )}
              />
              <Route
                path="/contacts"
                element={withRouteGuard('/contacts', <ContactsList />)}
              />
              <Route
                path="/contacts/:id"
                element={withRouteGuard('/contacts', <ContactDetail />)}
              />
              <Route
                path="/service-locations"
                element={withRouteGuard(
                  '/service-locations',
                  <FacilitiesList />
                )}
              />
              <Route
                path="/service-locations/:id"
                element={withRouteGuard(
                  '/service-locations/:id',
                  <FacilityDetail />
                )}
              />
              <Route
                path="/facilities"
                element={<Navigate to="/service-locations" replace />}
              />
              <Route
                path="/facilities/:id"
                element={<LegacyFacilityDetailRedirect />}
              />
              <Route
                path="/properties/:id"
                element={withRouteGuard('/properties/:id', <PropertyDetail />)}
              />
              <Route
                path="/tasks"
                element={withRouteGuard('/tasks', <TaskTemplatesList />)}
              />
              <Route
                path="/tasks/:id"
                element={withRouteGuard('/tasks', <TaskTemplateDetail />)}
              />
              <Route
                path="/area-templates"
                element={withRouteGuard(
                  '/area-templates',
                  <AreaTemplatesPage />
                )}
              />
              <Route
                path="/commercial/pricing"
                element={withRouteGuard(
                  '/commercial/pricing',
                  <PricingSettingsPage />
                )}
              />
              <Route
                path="/pricing"
                element={<Navigate to="/commercial/pricing" replace />}
              />
              <Route
                path="/pricing/settings"
                element={<Navigate to="/commercial/pricing" replace />}
              />
              <Route
                path="/residential/pricing"
                element={withRouteGuard(
                  '/residential/pricing',
                  <ResidentialPricingPlansPage />
                )}
              />
              <Route
                path="/proposals"
                element={withRouteGuard('/proposals', <ProposalsList />)}
              />
              <Route
                path="/proposals/new"
                element={withRouteGuard('/proposals', <ProposalForm />)}
              />
              <Route
                path="/proposals/:id"
                element={withRouteGuard('/proposals', <ProposalDetail />)}
              />
              <Route
                path="/proposals/:id/edit"
                element={withRouteGuard('/proposals', <ProposalForm />)}
              />
              <Route
                path="/quotations"
                element={<Navigate to="/proposals" replace />}
              />
              <Route
                path="/quotations/new"
                element={
                  <Navigate to="/proposals/new?type=specialized" replace />
                }
              />
              <Route
                path="/quotations/:id"
                element={withRouteGuard('/quotations', <QuotationDetail />)}
              />
              <Route
                path="/quotations/:id/edit"
                element={
                  <Navigate to="/proposals/new?type=specialized" replace />
                }
              />
              <Route
                path="/quotations/catalog"
                element={<Navigate to="/specialized/catalog" replace />}
              />
              <Route
                path="/specialized/catalog"
                element={withRouteGuard(
                  '/specialized/catalog',
                  <OneTimeServiceCatalogPage />
                )}
              />
              <Route
                path="/contracts"
                element={withRouteGuard('/contracts', <ContractsList />)}
              />
              <Route
                path="/contracts/new"
                element={withRouteGuard('/contracts', <ContractForm />)}
              />
              <Route
                path="/contracts/:id"
                element={withRouteGuard('/contracts', <ContractDetail />)}
              />
              <Route
                path="/contracts/:id/edit"
                element={withRouteGuard('/contracts', <ContractForm />)}
              />
              <Route
                path="/jobs"
                element={withRouteGuard('/jobs', <JobsList />)}
              />
              <Route
                path="/jobs/new"
                element={withRouteGuard('/jobs', <JobForm />)}
              />
              <Route
                path="/jobs/:id/edit"
                element={withRouteGuard('/jobs', <JobForm />)}
              />
              <Route
                path="/jobs/:id"
                element={withRouteGuard('/jobs', <JobDetail />)}
              />
              <Route
                path="/inspections"
                element={withRouteGuard('/inspections', <InspectionsList />)}
              />
              <Route
                path="/inspections/new"
                element={withRouteGuard('/inspections/new', <InspectionForm />)}
              />
              <Route
                path="/inspections/:id/edit"
                element={withRouteGuard(
                  '/inspections/:id/edit',
                  <InspectionForm />
                )}
              />
              <Route
                path="/inspections/:id"
                element={withRouteGuard('/inspections', <InspectionDetail />)}
              />
              <Route
                path="/inspection-templates"
                element={withRouteGuard(
                  '/inspection-templates',
                  <InspectionTemplatesPage />
                )}
              />
              <Route
                path="/time-tracking"
                element={withRouteGuard('/time-tracking', <TimeTrackingPage />)}
              />
              <Route
                path="/timesheets"
                element={withRouteGuard('/timesheets', <TimesheetsPage />)}
              />
              <Route
                path="/invoices"
                element={withRouteGuard('/invoices', <InvoicesList />)}
              />
              <Route
                path="/invoices/new"
                element={withRouteGuard('/invoices', <InvoiceForm />)}
              />
              <Route
                path="/invoices/:id"
                element={withRouteGuard('/invoices', <InvoiceDetail />)}
              />
              <Route
                path="/finance"
                element={withRouteGuard('/finance', <FinanceOverviewPage />)}
              />
              <Route
                path="/finance/expenses"
                element={withRouteGuard('/finance/expenses', <ExpensesPage />)}
              />
              <Route
                path="/finance/payroll"
                element={withRouteGuard('/finance/payroll', <PayrollPage />)}
              />
              <Route
                path="/finance/reports"
                element={withRouteGuard(
                  '/finance/reports',
                  <FinanceReportsPage />
                )}
              />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route
                path="/teams"
                element={withRouteGuard('/teams', <TeamsList />)}
              />
              <Route
                path="/settings/global"
                element={withRouteGuard(
                  '/settings/global',
                  <GlobalSettingsPage />
                )}
              />
              <Route
                path="/settings/proposal-templates"
                element={withRouteGuard(
                  '/settings/proposal-templates',
                  <ProposalTemplatesPage />
                )}
              />
              <Route
                path="/users"
                element={withRouteGuard('/users', <UsersList />)}
              />
              <Route
                path="/users/:id"
                element={withRouteGuard('/users/:id', <UserDetail />)}
              />
              <Route path="*" element={<Navigate to="/app" replace />} />
            </Route>
          </Routes>
        </Suspense>
      </Router>
    </>
  );
}

export default App;
