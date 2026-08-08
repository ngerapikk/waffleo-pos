import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { LogIn, Loader2, AlertCircle } from 'lucide-react';

export const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/auth/login', { username, password });
      login(response.data.token, response.data.user);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal login. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-wfl-offwhite relative overflow-hidden">
      {/* Decorative Background for Landscape / Tablet */}
      <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-wfl-orange/10 blur-3xl" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-wfl-brown/5 blur-3xl" />

      {/* Login Card */}
      <div 
        className="wfl-card p-8 md:p-10 relative z-10 mx-4 flex flex-col"
        style={{ width: '100%', maxWidth: '440px' }}
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-wfl-orange rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-wfl-subtle transform -rotate-3 transition-transform hover:rotate-0">
            <span className="text-3xl text-white">🧇</span>
          </div>
          <h1 className="text-3xl font-display font-bold text-wfl-brown tracking-tight">
            WAFFLEO POS
          </h1>
          <p className="text-wfl-text-secondary mt-2 font-medium">Selamat datang! Silakan masuk.</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-wfl-red/10 border border-wfl-red/20 rounded-xl flex items-start gap-3 text-wfl-red">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 w-full">
          <div className="flex flex-col gap-1.5 w-full">
            <label className="text-sm font-semibold text-wfl-brown">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="wfl-input"
              placeholder="Masukkan username"
              required
              autoComplete="username"
            />
          </div>

          <div className="flex flex-col gap-1.5 w-full">
            <label className="text-sm font-semibold text-wfl-brown">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="wfl-input"
              placeholder="Masukkan password"
              required
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="wfl-btn-primary mt-4 w-full h-14 text-lg"
          >
            {loading ? (
              <Loader2 className="w-6 h-6 animate-spin text-white" />
            ) : (
              <>
                <LogIn className="w-5 h-5 mr-2" />
                Masuk Sekarang
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
