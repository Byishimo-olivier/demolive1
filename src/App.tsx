import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
// import { RoleGuard } from './components/RoleGuard';
import { AuthProvider } from './contexts/AuthContext';
import { ProjectProvider } from './contexts/ProjectContext';
import { Contracts } from './pages/Contracts';
import { Dashboard } from './pages/Dashboard';
import { Features } from './pages/Features';
import { Finance } from './pages/Finance';
import { ForgotPassword } from './pages/ForgotPassword';
import { Landing } from './pages/Landing';
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
import { Toaster } from 'react-hot-toast';
import RegisterCompany from './pages/RegisterCompany';
import VerifyEmail from './pages/VerifyEmail';
import CompanyInvitationAccept from './pages/CompanyInvitationAccept';
import AcceptProjectInvite from './pages/AcceptProjectInvite';
import { AdminDashboard } from './pages/AdminDashboard';

import { PrivacyPolicy } from './pages/PrivacyPolicy';
import { TermsOfService } from './pages/TermsOfService';
import { Contact } from './pages/Contact';

function App() {
  return (
    <Router future={{
      v7_startTransition: true,
      v7_relativeSplatPath: true,
    }}>
      <ProjectProvider>
      <AuthProvider>
        <Toaster position="top-right" />
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/features" element={<Features />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/verify-email/:token" element={<VerifyEmail />} />
          <Route path="/company-invitation/:token" element={<CompanyInvitationAccept />} />
          <Route path="/projects/invitation/accept/:token" element={<AcceptProjectInvite />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-of-service" element={<TermsOfService />} />
          <Route path="/contact" element={<Contact />} />

          {/* Protected Routes */}
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/register-company" element={<RegisterCompany />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/projects/:projectId" element={<ProjectDetails />} />
            <Route
              path="/members"
              element={
                // <RoleGuard permissions={[]}>
                  <Members />
                // </RoleGuard>
              }
            />
            <Route
              path="/settings"
              element={
                // <RoleGuard permissions={[]}>
                  <Settings />
                // </RoleGuard>
              }
            />
            <Route
              path="/admin"
              element={
                // <RoleGuard permissions={['admin']}>
                  <AdminDashboard />
                // </RoleGuard>
              }
            />
            <Route
              path="/procurement"
              element={
                // <RoleGuard permissions={[]}>
                  <Procurement />
                // </RoleGuard>
              }
            />
            <Route
              path="/finance"
              element={
                // <RoleGuard permissions={[]}>
                  <Finance />
                // </RoleGuard>
              }
            />
            <Route
              path="/contracts"
              element={
                // <RoleGuard permissions={[]}>
                  <Contracts />
                // </RoleGuard>
              }
            />
            <Route
              path="/reports"
              element={
                // <RoleGuard permissions={[]}>
                  <Reports />
                // </RoleGuard>
              }
            />
            <Route
              path="/timeline"
              element={
                // <RoleGuard permissions={[]}>
                  <Timeline />
                // </RoleGuard>
              }
            />
            <Route path="/inventory"
              element={
                // <RoleGuard permissions={[]}>
                  <Inventory />
                // </RoleGuard>
              }
            />
            <Route path="/billing" element={<Billing />} />
            <Route path="/payment/result" element={<PaymentResult />} />

            {/* Bidding Routes */}
            <Route path="/bidding">
              <Route
                index
                element={
                  // <RoleGuard permissions={[]}>
                    <TenderList />
                  // </RoleGuard>
                }
              />
              <Route
                path="tenders"
                element={
                  // <RoleGuard permissions={[]}>
                    <TenderList />
                  // </RoleGuard>
                }
              />
              <Route
                path="tenders/create"
                element={
                  // <RoleGuard permissions={[]}>
                    <TenderForm />
                  // </RoleGuard>
                }
              />
              <Route
                path="tenders/:tenderId"
                element={
                  // <RoleGuard permissions={[]}>
                    <TenderDetails />
                  // </RoleGuard>
                }
              />
              <Route
                path="tenders/:tenderId/edit"
                element={
                  // <RoleGuard permissions={[]}>
                    <TenderForm />
                  // </RoleGuard>
                }
              />
              <Route
                path="tenders/:tenderId/submit-bid"
                element={
                  // <RoleGuard permissions={[]}>
                    <BidSubmission />
                  // </RoleGuard>
                }
              />
              <Route
                path="tenders/:tenderId/evaluate"
                element={
                  // <RoleGuard permissions={[]}>
                    <BidEvaluation />
                  // </RoleGuard>
                }
              />
              <Route
                path="register-bidder"
                element={
                  // <RoleGuard permissions={[]}>
                    <BidderRegistration />
                  // </RoleGuard>
                }
              />
              <Route
                path="bids/:bidId"
                element={
                  // <RoleGuard permissions={[]}>
                    <BidDetails />
                  // </RoleGuard>
                }
              />
            </Route>
          </Route>

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
      </ProjectProvider>
    </Router>
  );
}

export default App;
