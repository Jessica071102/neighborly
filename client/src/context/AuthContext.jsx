import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token] = useState(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const data = await api.get('/auth/me');
    setUser(data.user);
  }, []);

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    api.get('/auth/me')
      .then((data) => setUser(data.user))
      .catch(() => localStorage.removeItem('token'))
      .finally(() => setLoading(false));
  }, [token]);

  function login(newToken, userData, redirectTo = '/') {
    localStorage.setItem('token', newToken);
    setUser(userData);
    window.location.href = redirectTo;
  }

  function logout() {
    localStorage.removeItem('token');
    setUser(null);
    // ProtectedRoute will handle the <Navigate to="/login"> client-side;
    // avoids a full-page reload which can 404 on Vercel without a rewrite rule.
  }

  return (
    <AuthContext.Provider value={{ user, token: localStorage.getItem('token'), loading, login, logout, refreshUser }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
