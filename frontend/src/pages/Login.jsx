import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Mail, Phone, Eye, EyeOff, Scissors } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loginType, setLoginType] = useState('email');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: '', phone: '', password: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const credentials = {
        password: form.password,
        ...(loginType === 'email' ? { email: form.email } : { phone: form.phone }),
      };
      await login(credentials);
      toast.success('Login realizado com sucesso!');
      navigate('/');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-72px)] flex items-center justify-center px-4 py-12 animate-fadeIn">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Scissors className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-display font-bold text-white mb-2">Bem-vindo de volta</h1>
          <p className="text-dark-400">Entre na sua conta para continuar</p>
        </div>

        {/* Login Form */}
        <div className="card">
          {/* Login Type Toggle */}
          <div className="flex rounded-xl overflow-hidden mb-6 bg-dark-950 p-1">
            <button
              type="button"
              onClick={() => setLoginType('email')}
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
                loginType === 'email' ? 'bg-primary-500 text-white' : 'text-dark-400 hover:text-white'
              }`}
            >
              <Mail className="w-4 h-4 inline mr-1" /> Email
            </button>
            <button
              type="button"
              onClick={() => setLoginType('phone')}
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
                loginType === 'phone' ? 'bg-primary-500 text-white' : 'text-dark-400 hover:text-white'
              }`}
            >
              <Phone className="w-4 h-4 inline mr-1" /> Telefone
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {loginType === 'email' ? (
              <div>
                <label className="block text-sm text-dark-300 mb-1.5">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="input-field"
                  placeholder="seu@email.com"
                  required
                />
              </div>
            ) : (
              <div>
                <label className="block text-sm text-dark-300 mb-1.5">Telefone</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="input-field"
                  placeholder="11999999999"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-sm text-dark-300 mb-1.5">Senha</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="input-field pr-11"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-500 hover:text-dark-300"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white"></div>
                  Entrando...
                </span>
              ) : 'Entrar'}
            </button>
          </form>

          {/* Demo Accounts */}
          <div className="mt-6 pt-6 border-t border-dark-700">
            <p className="text-xs text-dark-500 text-center mb-3">Contas de demonstração:</p>
            <div className="grid grid-cols-1 gap-2 text-xs">
              <button
                onClick={() => { setLoginType('email'); setForm({ email: 'admin@barbearia.com', phone: '', password: 'admin123' }); }}
                className="text-left px-3 py-2 rounded-lg bg-dark-950 hover:bg-dark-800 transition-colors text-dark-400"
              >
                <span className="text-primary-400">Admin:</span> admin@barbearia.com / admin123
              </button>
              <button
                onClick={() => { setLoginType('email'); setForm({ email: 'cliente@email.com', phone: '', password: 'cliente123' }); }}
                className="text-left px-3 py-2 rounded-lg bg-dark-950 hover:bg-dark-800 transition-colors text-dark-400"
              >
                <span className="text-primary-400">Cliente:</span> cliente@email.com / cliente123
              </button>
            </div>
          </div>
        </div>

        {/* Register Link */}
        <p className="text-center mt-6 text-dark-400">
          Não tem conta?{' '}
          <Link to="/register" className="text-primary-400 hover:text-primary-300 font-medium">
            Cadastre-se
          </Link>
        </p>
      </div>
    </div>
  );
}
