import { Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Register from './pages/Register'
import PatientDashboard from './pages/PatientDashboard'
import MedicalRecords from './pages/MedicalRecords'
import Appointments from './pages/Appointments'
import Profile from './pages/Profile'
import PrivacySettings from './pages/PrivacySettings'
import DoctorDashboard from './pages/DoctorDashboard'
import PatientDetail from './pages/PatientDetail'

function App() {
  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <Navbar />
      <Routes>
        {/* Public */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Patient */}
        <Route path="/patient/dashboard" element={
          <ProtectedRoute requiredRole="patient"><PatientDashboard /></ProtectedRoute>
        } />
        <Route path="/patient/records" element={
          <ProtectedRoute requiredRole="patient"><MedicalRecords /></ProtectedRoute>
        } />
        <Route path="/patient/appointments" element={
          <ProtectedRoute requiredRole="patient"><Appointments /></ProtectedRoute>
        } />
        <Route path="/patient/profile" element={
          <ProtectedRoute requiredRole="patient"><Profile /></ProtectedRoute>
        } />
        <Route path="/patient/privacy" element={
          <ProtectedRoute requiredRole="patient"><PrivacySettings /></ProtectedRoute>
        } />

        {/* Doctor */}
        <Route path="/doctor/dashboard" element={
          <ProtectedRoute requiredRole="doctor"><DoctorDashboard /></ProtectedRoute>
        } />
        <Route path="/doctor/patients/:id" element={
          <ProtectedRoute requiredRole="doctor"><PatientDetail /></ProtectedRoute>
        } />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </div>
  )
}

export default App
