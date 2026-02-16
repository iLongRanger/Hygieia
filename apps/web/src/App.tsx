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
import NotificationsPage from './pages/notifications/NotificationsPage';
import PublicProposalView from './pages/public/PublicProposalView';
import PublicContractView from './pages/public/PublicContractView';
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
          <Route path="/p/:token" element={<PublicProposalView />} />
          <Route path="/c/:token" element={<PublicContractView />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          <Route element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/leads" element={<LeadsList />} />
            <Route path="/leads/:id" element={<LeadDetail />} />
            <Route path="/appointments" element={<AppointmentsPage />} />
            <Route path="/accounts" element={<AccountsList />} />
            <Route path="/accounts/:id" element={<AccountDetail />} />
            <Route path="/contacts" element={<ContactsList />} />
            <Route path="/contacts/:id" element={<ContactDetail />} />
            <Route path="/facilities" element={<FacilitiesList />} />
            <Route path="/facilities/:id" element={<FacilityDetail />} />
            <Route path="/tasks" element={<TaskTemplatesList />} />
            <Route path="/tasks/:id" element={<TaskTemplateDetail />} />
            <Route
              path="/area-templates"
              element={withRouteGuard('/area-templates', <AreaTemplatesPage />)}
            />
            <Route path="/pricing" element={<PricingSettingsPage />} />
            <Route path="/pricing/settings" element={<PricingSettingsPage />} />
            <Route path="/proposals" element={<ProposalsList />} />
            <Route path="/proposals/new" element={<ProposalForm />} />
            <Route path="/proposals/:id" element={<ProposalDetail />} />
            <Route path="/proposals/:id/edit" element={<ProposalForm />} />
            <Route path="/contracts" element={<ContractsList />} />
            <Route path="/contracts/new" element={<ContractForm />} />
            <Route path="/contracts/:id" element={<ContractDetail />} />
            <Route path="/contracts/:id/edit" element={<ContractForm />} />
            <Route path="/jobs" element={<JobsList />} />
            <Route path="/jobs/new" element={<JobForm />} />
            <Route path="/jobs/:id/edit" element={<JobForm />} />
            <Route path="/jobs/:id" element={<JobDetail />} />
            <Route path="/inspections" element={<InspectionsList />} />
            <Route path="/inspections/new" element={<InspectionForm />} />
            <Route path="/inspections/:id/edit" element={<InspectionForm />} />
            <Route path="/inspections/:id" element={<InspectionDetail />} />
            <Route path="/inspection-templates" element={<InspectionTemplatesPage />} />
            <Route path="/time-tracking" element={<TimeTrackingPage />} />
            <Route path="/timesheets" element={<TimesheetsPage />} />
            <Route path="/invoices" element={<InvoicesList />} />
            <Route path="/invoices/:id" element={<InvoiceDetail />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/teams" element={<TeamsList />} />
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
