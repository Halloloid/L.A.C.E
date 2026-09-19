import { Routes, Route, Navigate } from 'react-router-dom';

import AppShell from './components/layout/AppShell';
import RequireAuth from './components/auth/RequireAuth';

import Landing from './pages/landing/Landing';
import Login from './pages/login/Login';
import Register from './pages/register/Register';
import DashboardRouter from './pages/dashboard/DashboardRouter';
import ScanProduct from './pages/scan/ScanProduct';
import Processing from './pages/processing/Processing';
import Verdict from './pages/verdict/Verdict';
import Inspection from './pages/inspection/Inspection';
import Report from './pages/report/Report';
import Products from './pages/products/Products';
import History from './pages/history/History';
import Reports from './pages/reports/Reports';
import Violations from './pages/violations/Violations';
import ReportIssue from './pages/report-issue/ReportIssue';
import Analytics from './pages/analytics/Analytics';
import Settings from './pages/settings/Settings';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* everything below needs a login first — shared by both portals */}
      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<DashboardRouter />} />
          <Route path="/scan" element={<ScanProduct />} />
          <Route path="/processing" element={<Processing />} />
          <Route path="/verdict/:id" element={<Verdict />} />
          <Route path="/report/:id" element={<Report />} />
          <Route path="/history" element={<History />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/report-issue" element={<ReportIssue />} />

          {/* Inspection Officer portal only — a consumer session is bounced
              back to their own dashboard if it ever lands here. */}
          <Route element={<RequireAuth role="inspector" />}>
            <Route path="/inspection/:id" element={<Inspection />} />
            <Route path="/products" element={<Products />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/violations" element={<Violations />} />
            <Route path="/analytics" element={<Analytics />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
