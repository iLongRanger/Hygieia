import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
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
import TaskTemplatesList from './pages/tasks/TaskTemplatesList';
import TaskTemplateDetail from './pages/tasks/TaskTemplateDetail';
import AreaTemplatesPage from './pages/areas/AreaTemplatesPage';
import PricingSettingsPage from './pages/pricing/PricingSettingsPage';
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
import PublicProposalView from './pages/public/PublicProposalView';
import PublicContractView from './pages/public/PublicContractView';
import PublicQuotationView from './pages/public/PublicQuotationView';
import SetPassword from './pages/auth/SetPassword';
import Unauthorized from './pages/Unauthorized';
import AdminLayout from './components/layout/AdminLayout';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { getRequiredPermissions } from './lib/routeAccess';

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
          <Route path="/login" element={<Login />} />
          <Route path="/auth/set-password" element={<SetPassword />} />
          <Route path="/p/:token" element={<PublicProposalView />} />
          <Route path="/c/:token" element={<PublicContractView />} />
          <Route path="/q/:token" element={<PublicQuotationView />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          <Route element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/leads" element={withRouteGuard('/leads', <LeadsList />)} />
            <Route path="/leads/new" element={withRouteGuard('/leads', <LeadsList />)} />
            <Route path="/leads/:id" element={withRouteGuard('/leads', <LeadDetail />)} />
            <Route path="/appointments" element={<AppointmentsPage />} />
            <Route path="/appointments/:id" element={<AppointmentDetail />} />
            <Route path="/accounts" element={withRouteGuard('/accounts', <AccountsList />)} />
            <Route path="/accounts/:id" element={withRouteGuard('/accounts', <AccountDetail />)} />
            <Route path="/contacts" element={withRouteGuard('/contacts', <ContactsList />)} />
            <Route path="/contacts/:id" element={withRouteGuard('/contacts', <ContactDetail />)} />
            <Route path="/facilities" element={<FacilitiesList />} />
            <Route path="/facilities/:id" element={<FacilityDetail />} />
            <Route path="/tasks" element={withRouteGuard('/tasks', <TaskTemplatesList />)} />
            <Route path="/tasks/:id" element={withRouteGuard('/tasks', <TaskTemplateDetail />)} />
            <Route
              path="/area-templates"
              element={withRouteGuard('/area-templates', <AreaTemplatesPage />)}
            />
            <Route path="/pricing" element={withRouteGuard('/pricing', <PricingSettingsPage />)} />
            <Route path="/pricing/settings" element={withRouteGuard('/pricing', <PricingSettingsPage />)} />
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
            <Route path="/inspections/new" element={withRouteGuard('/inspections', <InspectionForm />)} />
            <Route path="/inspections/:id/edit" element={withRouteGuard('/inspections', <InspectionForm />)} />
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
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Router>
    </>
  );
}

export default App;
