import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Layout } from './components/Layout';
import { AuthProvider } from './contexts/AuthContext';
import { SessionManager } from './components/session/SessionManager';
import { ProjectProvider } from './contexts/ProjectContext';
import { Contracts } from './pages/Contracts';
import { Dashboard } from './pages/Dashboard';
import { Features } from './pages/Features';
import { Finance } from './pages/Finance';
import { ForgotPassword } from './pages/ForgotPassword';
import { Login } from './pages/Login';
import { Members } from './pages/Members';
import { Pricing } from './pages/Pricing';
import { Procurement } from './pages/Procurement';
import { Projects } from './pages/Projects';
import { ProjectDetails } from './pages/ProjectDetails';
import { Register } from './pages/Register';
import { Reports } from './pages/Reports';
import { ResetPassword } from './pages/ResetPassword';
import { Settings } from './pages/Settings';
import { Timeline } from './pages/Timeline';
import { Inventory } from './pages/Inventory';
import { TenderList } from './pages/TenderList';
import { TenderDetails } from './pages/TenderDetails';
import { TenderForm } from './pages/TenderForm';
import { BidSubmission } from './pages/BidSubmission';
import { BidEvaluation } from './pages/BidEvaluation';
import { BidderRegistration } from './pages/BidderRegistration';
import { BidDetails } from './pages/BidDetails';
import { PaymentResult } from './pages/PaymentResult';
import { Billing } from './pages/Billing';
import RegisterCompany from './pages/RegisterCompany';
import VerifyEmail from './pages/VerifyEmail';
import CompanyInvitationAccept from './pages/CompanyInvitationAccept';
import AcceptProjectInvite from './pages/AcceptProjectInvite';
import { AdminDashboard } from './pages/AdminDashboard';
import { PrivacyPolicy } from './pages/PrivacyPolicy';
import { TermsOfService } from './pages/TermsOfService';
import { Contact } from './pages/Contact';
import { DemoStart } from './pages/DemoStart';

/**
 * Demo app: every route is public. Nobody signs in — the app opens a demo workspace
 * with sample data by itself (see src/demo), so every page works straight away.
 */
function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ProjectProvider>
        <AuthProvider>
          <Toaster position="top-right" />
          <SessionManager />
          <Routes>
            {/* Standalone pages */}
            <Route path="/features" element={<Features />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/invite/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/verify-email/:token" element={<VerifyEmail />} />
            <Route path="/company-invitation/:token" element={<CompanyInvitationAccept />} />
            <Route path="/projects/invitation/accept/:token" element={<AcceptProjectInvite />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms-of-service" element={<TermsOfService />} />
            <Route path="/contact" element={<Contact />} />
            {/* Starts over with fresh sample data */}
            <Route path="/demo" element={<DemoStart />} />

            {/* App pages, shown with the sidebar and navbar */}
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/overall" element={<Navigate to="/dashboard" replace />} />
              <Route path="/register-company" element={<RegisterCompany />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/projects/:projectId" element={<ProjectDetails />} />
              <Route path="/members" element={<Members />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/procurement" element={<Procurement />} />
              <Route path="/finance" element={<Finance />} />
              <Route path="/contracts" element={<Contracts />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/timeline" element={<Timeline />} />
              <Route path="/inventory" element={<Inventory />} />
              <Route path="/billing" element={<Billing />} />
              <Route path="/payment/result" element={<PaymentResult />} />

              {/* Bidding */}
              <Route path="/bidding" element={<TenderList />} />
              <Route path="/bidding/tenders" element={<TenderList />} />
              <Route path="/bidding/tenders/create" element={<TenderForm />} />
              <Route path="/bidding/tenders/:tenderId" element={<TenderDetails />} />
              <Route path="/bidding/tenders/:tenderId/edit" element={<TenderForm />} />
              <Route path="/bidding/tenders/:tenderId/submit-bid" element={<BidSubmission />} />
              <Route path="/bidding/tenders/:tenderId/evaluate" element={<BidEvaluation />} />
              <Route path="/bidding/register-bidder" element={<BidderRegistration />} />
              <Route path="/bidding/bids/:bidId" element={<BidDetails />} />
            </Route>

            {/* Anything else: the dashboard */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </AuthProvider>
      </ProjectProvider>
    </Router>
  );
}

export default App;
