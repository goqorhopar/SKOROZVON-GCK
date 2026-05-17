import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/auth.store';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import CallsPage from './pages/CallsPage';
import ClientsPage from './pages/ClientsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import UsersPage from './pages/UsersPage';

function App() {
  const { isAuthenticated, user } = useAuthStore();

  return (
    <Routes>
      <Route path="/login" element={!isAuthenticated ? <LoginPage /> : <Navigate to="/" />} />
      
      <Route path="/" element={isAuthenticated ? <Layout /> : <Navigate to="/login" />}>
        <Route index element={<DashboardPage />} />
        <Route path="calls" element={<CallsPage />} />
        <Route path="clients" element={<ClientsPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route 
          path="users" 
          element={user?.role === 'admin' ? <UsersPage /> : <Navigate to="/" />} 
        />
      </Route>
    </Routes>
  );
}

export default App;
