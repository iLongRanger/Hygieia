import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import LeadsList from './pages/leads/LeadsList';
import AccountsList from './pages/accounts/AccountsList';
import ContactsList from './pages/contacts/ContactsList';
import UsersList from './pages/users/UsersList';
import FacilitiesList from './pages/facilities/FacilitiesList';
import FacilityDetail from './pages/facilities/FacilityDetail';
import TaskTemplatesList from './pages/tasks/TaskTemplatesList';
import AdminLayout from './components/layout/AdminLayout';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route element={<AdminLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/leads" element={<LeadsList />} />
          <Route path="/accounts" element={<AccountsList />} />
          <Route path="/contacts" element={<ContactsList />} />
          <Route path="/facilities" element={<FacilitiesList />} />
          <Route path="/facilities/:id" element={<FacilityDetail />} />
          <Route path="/tasks" element={<TaskTemplatesList />} />
          <Route path="/users" element={<UsersList />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
