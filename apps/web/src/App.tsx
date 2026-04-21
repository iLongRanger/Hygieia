import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useParams,
} from 'react-router-dom';
import type { ReactNode } from 'react';
import { Toaster } from 'react-hot-toast';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import LeadsList from './pages/leads/LeadsList';
import LeadDetail from './pages/leads/LeadDetail';
import AppointmentsPage from './pages/appointments/AppointmentsPage';
import AppointmentDetail from './pages/appointments/AppointmentDetail';
import AccountsList from './pages/accounts/AccountsList';
import AccountDetail from './pages/accounts/AccountDetail';
import ContactsList from './pages/contacts/ContactsList';
import ContactDetail from './pages/contacts/ContactDetail';
import UsersList from './pages/users/UsersList';
import UserDetail from './pages/users/UserDetail';
import FacilitiesList from './pages/facilities/FacilitiesList';
import FacilityDetail from './pages/facilities/FacilityDetail';
import PropertyDetail from './pages/properties/PropertyDetail';
import TaskTemplatesList from './pages/tasks/TaskTemplatesList';
import TaskTemplateDetail from './pages/tasks/TaskTemplateDetail';
import AreaTemplatesPage from './pages/areas/AreaTemplatesPage';
import PricingSettingsPage from './pages/pricing/PricingSettingsPage';
import ResidentialPricingPlansPage from './pages/residential/ResidentialPricingPlansPage';
import ResidentialQuotesPage from './pages/residential/ResidentialQuotesPage';
import ProposalsList from './pages/proposals/ProposalsList';
import ProposalDetail from './pages/proposals/ProposalDetail';
import ProposalForm from './pages/proposals/ProposalForm';
import ContractsList from './pages/contracts/ContractsList';
import ContractDetail from './pages/contracts/ContractDetail';
import ContractForm from './pages/contracts/ContractForm';
import ProposalTemplatesPage from './pages/settings/ProposalTemplatesPage';
import GlobalSettingsPage from './pages/settings/GlobalSettingsPage';
import TeamsList from './pages/teams/TeamsList';
import JobsList from './pages/jobs/JobsList';
import JobDetail from './pages/jobs/JobDetail';
import JobForm from './pages/jobs/JobForm';
import InspectionsList from './pages/inspections/InspectionsList';
import InspectionDetail from './pages/inspections/InspectionDetail';
import InspectionForm from './pages/inspections/InspectionForm';
import InspectionTemplatesPage from './pages/inspections/InspectionTemplatesPage';
import TimeTrackingPage from './pages/timeTracking/TimeTrackingPage';
import TimesheetsPage from './pages/timeTracking/TimesheetsPage';
import InvoicesList from './pages/invoices/InvoicesList';
import InvoiceDetail from './pages/invoices/InvoiceDetail';
import InvoiceForm from './pages/invoices/InvoiceForm';
import NotificationsPage from './pages/notifications/NotificationsPage';
import QuotationsList from './pages/quotations/QuotationsList';
import QuotationDetail from './pages/quotations/QuotationDetail';
import QuotationForm from './pages/quotations/QuotationForm';
import OneTimeServiceCatalogPage from './pages/quotations/OneTimeServiceCatalogPage';
import ExpensesPage from './pages/finance/ExpensesPage';
import PayrollPage from './pages/finance/PayrollPage';
import FinanceOverviewPage from './pages/finance/FinanceOverviewPage';
import FinanceReportsPage from './pages/finance/FinanceReportsPage';
import PublicProposalView from './pages/public/PublicProposalView';
import PublicContractView from './pages/public/PublicContractView';
import PublicContractAmendmentView from './pages/public/PublicContractAmendmentView';
import PublicQuotationView from './pages/public/PublicQuotationView';
import PublicResidentialQuoteView from './pages/public/PublicResidentialQuoteView';
import PublicInvoiceView from './pages/public/PublicInvoiceView';
import LandingPage from './pages/public/LandingPage';
import SetPassword from './pages/auth/SetPassword';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import Unauthorized from './pages/Unauthorized';
import AdminLayout from './components/layout/AdminLayout';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { getRequiredPermissions } from './lib/routeAccess';
import ProfilePage from './pages/profile/ProfilePage';

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
  return <Navigate to={id ? `/service-locations/${id}` : '/service-locations'} replace />;
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
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/auth/forgot-password" element={<ForgotPassword />} />
          <Route path="/auth/set-password" element={<SetPassword />} />
          <Route path="/auth/reset-password" element={<ResetPassword />} />
          <Route path="/p/:token" element={<PublicProposalView />} />
          <Route path="/c/:token" element={<PublicContractView />} />
          <Route path="/ca/:token" element={<PublicContractAmendmentView />} />
          <Route path="/q/:token" element={<PublicQuotationView />} />
          <Route path="/rq/:token" element={<PublicResidentialQuoteView />} />
          <Route path="/i/:token" element={<PublicInvoiceView />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          <Route element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
            <Route path="/app" element={<Dashboard />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/leads" element={withRouteGuard('/leads', <LeadsList />)} />
            <Route path="/leads/new" element={withRouteGuard('/leads', <LeadsList />)} />
            <Route path="/leads/:id" element={withRouteGuard('/leads', <LeadDetail />)} />
            <Route path="/appointments" element={withRouteGuard('/appointments', <AppointmentsPage />)} />
            <Route path="/appointments/:id" element={withRouteGuard('/appointments/:id', <AppointmentDetail />)} />
            <Route path="/accounts" element={withRouteGuard('/accounts', <AccountsList />)} />
            <Route path="/accounts/:id" element={withRouteGuard('/accounts', <AccountDetail />)} />
            <Route path="/residential/accounts/:id" element={withRouteGuard('/residential/accounts/:id', <AccountDetail />)} />
            <Route path="/contacts" element={withRouteGuard('/contacts', <ContactsList />)} />
            <Route path="/contacts/:id" element={withRouteGuard('/contacts', <ContactDetail />)} />
            <Route path="/service-locations" element={withRouteGuard('/service-locations', <FacilitiesList />)} />
            <Route path="/service-locations/:id" element={withRouteGuard('/service-locations/:id', <FacilityDetail />)} />
            <Route path="/facilities" element={<Navigate to="/service-locations" replace />} />
            <Route path="/facilities/:id" element={<LegacyFacilityDetailRedirect />} />
            <Route path="/properties/:id" element={withRouteGuard('/properties/:id', <PropertyDetail />)} />
            <Route path="/tasks" element={withRouteGuard('/tasks', <TaskTemplatesList />)} />
            <Route path="/tasks/:id" element={withRouteGuard('/tasks', <TaskTemplateDetail />)} />
            <Route
              path="/area-templates"
              element={withRouteGuard('/area-templates', <AreaTemplatesPage />)}
            />
            <Route path="/commercial/pricing" element={withRouteGuard('/commercial/pricing', <PricingSettingsPage />)} />
            <Route path="/pricing" element={<Navigate to="/commercial/pricing" replace />} />
            <Route path="/pricing/settings" element={<Navigate to="/commercial/pricing" replace />} />
            <Route path="/residential/pricing" element={withRouteGuard('/residential/pricing', <ResidentialPricingPlansPage />)} />
            <Route path="/residential/quotes" element={withRouteGuard('/residential/quotes', <ResidentialQuotesPage />)} />
            <Route path="/proposals" element={withRouteGuard('/proposals', <ProposalsList />)} />
            <Route path="/proposals/new" element={withRouteGuard('/proposals', <ProposalForm />)} />
            <Route path="/proposals/:id" element={withRouteGuard('/proposals', <ProposalDetail />)} />
            <Route path="/proposals/:id/edit" element={withRouteGuard('/proposals', <ProposalForm />)} />
            <Route path="/quotations" element={withRouteGuard('/quotations', <QuotationsList />)} />
            <Route path="/quotations/new" element={withRouteGuard('/quotations', <QuotationForm />)} />
            <Route path="/quotations/:id" element={withRouteGuard('/quotations', <QuotationDetail />)} />
            <Route path="/quotations/:id/edit" element={withRouteGuard('/quotations', <QuotationForm />)} />
            <Route path="/quotations/catalog" element={withRouteGuard('/quotations', <OneTimeServiceCatalogPage />)} />
            <Route path="/contracts" element={withRouteGuard('/contracts', <ContractsList />)} />
            <Route path="/contracts/new" element={withRouteGuard('/contracts', <ContractForm />)} />
            <Route path="/contracts/:id" element={withRouteGuard('/contracts', <ContractDetail />)} />
            <Route path="/contracts/:id/edit" element={withRouteGuard('/contracts', <ContractForm />)} />
            <Route path="/jobs" element={withRouteGuard('/jobs', <JobsList />)} />
            <Route path="/jobs/new" element={withRouteGuard('/jobs', <JobForm />)} />
            <Route path="/jobs/:id/edit" element={withRouteGuard('/jobs', <JobForm />)} />
            <Route path="/jobs/:id" element={withRouteGuard('/jobs', <JobDetail />)} />
            <Route path="/inspections" element={withRouteGuard('/inspections', <InspectionsList />)} />
            <Route path="/inspections/new" element={withRouteGuard('/inspections/new', <InspectionForm />)} />
            <Route path="/inspections/:id/edit" element={withRouteGuard('/inspections/:id/edit', <InspectionForm />)} />
            <Route path="/inspections/:id" element={withRouteGuard('/inspections', <InspectionDetail />)} />
            <Route
              path="/inspection-templates"
              element={withRouteGuard('/inspection-templates', <InspectionTemplatesPage />)}
            />
            <Route path="/time-tracking" element={withRouteGuard('/time-tracking', <TimeTrackingPage />)} />
            <Route path="/timesheets" element={withRouteGuard('/timesheets', <TimesheetsPage />)} />
            <Route path="/invoices" element={withRouteGuard('/invoices', <InvoicesList />)} />
            <Route path="/invoices/new" element={withRouteGuard('/invoices', <InvoiceForm />)} />
            <Route path="/invoices/:id" element={withRouteGuard('/invoices', <InvoiceDetail />)} />
            <Route path="/finance" element={withRouteGuard('/finance', <FinanceOverviewPage />)} />
            <Route path="/finance/expenses" element={withRouteGuard('/finance/expenses', <ExpensesPage />)} />
            <Route path="/finance/payroll" element={withRouteGuard('/finance/payroll', <PayrollPage />)} />
            <Route path="/finance/reports" element={withRouteGuard('/finance/reports', <FinanceReportsPage />)} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/teams" element={withRouteGuard('/teams', <TeamsList />)} />
            <Route
              path="/settings/global"
              element={withRouteGuard('/settings/global', <GlobalSettingsPage />)}
            />
            <Route
              path="/settings/proposal-templates"
              element={withRouteGuard('/settings/proposal-templates', <ProposalTemplatesPage />)}
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
      </Router>
    </>
  );
}

export default App;
