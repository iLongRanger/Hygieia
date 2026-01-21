import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import LeadsList from './pages/leads/LeadsList';
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
import PricingRulesList from './pages/pricing/PricingRulesList';
import PricingRuleDetail from './pages/pricing/PricingRuleDetail';
import ProposalsList from './pages/proposals/ProposalsList';
import ProposalDetail from './pages/proposals/ProposalDetail';
import ProposalForm from './pages/proposals/ProposalForm';
import ContractsList from './pages/contracts/ContractsList';
import ContractDetail from './pages/contracts/ContractDetail';
import ContractForm from './pages/contracts/ContractForm';
import AdminLayout from './components/layout/AdminLayout';

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
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={<AdminLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/leads" element={<LeadsList />} />
            <Route path="/accounts" element={<AccountsList />} />
            <Route path="/accounts/:id" element={<AccountDetail />} />
            <Route path="/contacts" element={<ContactsList />} />
            <Route path="/contacts/:id" element={<ContactDetail />} />
            <Route path="/facilities" element={<FacilitiesList />} />
            <Route path="/facilities/:id" element={<FacilityDetail />} />
            <Route path="/tasks" element={<TaskTemplatesList />} />
            <Route path="/tasks/:id" element={<TaskTemplateDetail />} />
            <Route path="/pricing" element={<PricingRulesList />} />
            <Route path="/pricing/:id" element={<PricingRuleDetail />} />
            <Route path="/proposals" element={<ProposalsList />} />
            <Route path="/proposals/new" element={<ProposalForm />} />
            <Route path="/proposals/:id" element={<ProposalDetail />} />
            <Route path="/proposals/:id/edit" element={<ProposalForm />} />
            <Route path="/contracts" element={<ContractsList />} />
            <Route path="/contracts/new" element={<ContractForm />} />
            <Route path="/contracts/:id" element={<ContractDetail />} />
            <Route path="/contracts/:id/edit" element={<ContractForm />} />
            <Route path="/users" element={<UsersList />} />
            <Route path="/users/:id" element={<UserDetail />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Router>
    </>
  );
}

export default App;
