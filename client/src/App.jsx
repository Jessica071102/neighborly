import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import SearchPage from './pages/SearchPage';
import ItemDetailPage from './pages/ItemDetailPage';
import CreateListingPage from './pages/CreateListingPage';
import MyListingsPage from './pages/MyListingsPage';
import RequestsPage from './pages/RequestsPage';
import ChatPage from './pages/ChatPage';
import ProfilePage from './pages/ProfilePage';
import NotFoundPage from './pages/NotFoundPage';
import PrivacyPage from './pages/PrivacyPage';
import TermsPage from './pages/TermsPage';
import EditListingPage from './pages/EditListingPage';
import UserProfilePage from './pages/UserProfilePage';
import EditProfilePage from './pages/EditProfilePage';

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route path="/search" element={<ProtectedRoute><Layout><SearchPage /></Layout></ProtectedRoute>} />
      <Route path="/items/create" element={<ProtectedRoute><Layout><CreateListingPage /></Layout></ProtectedRoute>} />
      <Route path="/items/:id" element={<ProtectedRoute><Layout><ItemDetailPage /></Layout></ProtectedRoute>} />
      <Route path="/my-listings" element={<ProtectedRoute><Layout><MyListingsPage /></Layout></ProtectedRoute>} />
      <Route path="/requests" element={<ProtectedRoute><Layout><RequestsPage /></Layout></ProtectedRoute>} />
      <Route path="/chat/:requestId" element={<ProtectedRoute><Layout><ChatPage /></Layout></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Layout><ProfilePage /></Layout></ProtectedRoute>} />
      <Route path="/profile/setup" element={<ProtectedRoute><EditProfilePage isSetup={true} /></ProtectedRoute>} />
      <Route path="/profile/edit" element={<ProtectedRoute><Layout><EditProfilePage /></Layout></ProtectedRoute>} />
      <Route path="/items/:id/edit" element={<ProtectedRoute><Layout><EditListingPage /></Layout></ProtectedRoute>} />
      <Route path="/users/:id" element={<ProtectedRoute><Layout><UserProfilePage /></Layout></ProtectedRoute>} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/terms" element={<TermsPage />} />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
