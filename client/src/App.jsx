import React from "react";
import { Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import EmailVerify from "./pages/EmailVerify";
import ResetPassword from "./pages/ResetPassword";
import Settings from "./pages/Settings";
import PatientDashboard from "./pages/dashboards/patient/PatientDashboard";
import PatientRecords from "./pages/dashboards/patient/PatientRecords";
import PatientAbout from "./pages/dashboards/patient/PatientAbout";
import PatientFAQ from "./pages/dashboards/patient/PatientFAQ";
import AdminDashboard from "./pages/dashboards/admin/AdminDashboard";
import AdminAbout from "./pages/dashboards/admin/AdminAbout";
import AdminFAQ from "./pages/dashboards/admin/AdminFAQ";
import AdminAccounts from "./pages/dashboards/admin/AdminAccounts";
import SocketStatus from "./components/SocketStatus";

const App = () => {
  return (
    <div>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/email-verify" element={<EmailVerify />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/admin-dashboard" element={<AdminDashboard />} />
        <Route path="/admin-accounts" element={<AdminAccounts />} />
        <Route path="/admin-about" element={<AdminAbout />} />
        <Route path="/admin-faq" element={<AdminFAQ />} />
        <Route path="/patient-dashboard" element={<PatientDashboard />} />
        <Route path="/patient-records" element={<PatientRecords />} />
        <Route path="/patient-about" element={<PatientAbout />} />
        <Route path="/patient-faq" element={<PatientFAQ />} />
      </Routes>
      <SocketStatus />
    </div>
  );
};

export default App;
