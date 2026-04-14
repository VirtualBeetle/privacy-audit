import { Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Register from './pages/Register'
import Feed from './pages/Feed'
import PostDetail from './pages/PostDetail'
import Profile from './pages/Profile'
import Checkins from './pages/Checkins'
import SearchResults from './pages/SearchResults'
import AdminDashboard from './pages/AdminDashboard'
import PrivacySettings from './pages/PrivacySettings'

export default function App() {
  return (
    <>
      <Navbar />
      <Routes>
        {/* Public */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* User */}
        <Route path="/feed" element={<ProtectedRoute requiredRole="user"><Feed /></ProtectedRoute>} />
        <Route path="/posts/:id" element={<ProtectedRoute requiredRole="user"><PostDetail /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute requiredRole="user"><Profile /></ProtectedRoute>} />
        <Route path="/checkins" element={<ProtectedRoute requiredRole="user"><Checkins /></ProtectedRoute>} />
        <Route path="/search" element={<ProtectedRoute requiredRole="user"><SearchResults /></ProtectedRoute>} />
        <Route path="/privacy" element={<ProtectedRoute requiredRole="user"><PrivacySettings /></ProtectedRoute>} />

        {/* Admin */}
        <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </>
  )
}
