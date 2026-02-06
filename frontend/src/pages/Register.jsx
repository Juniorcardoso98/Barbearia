import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, Scissors } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '', email: '', phone: '', password: '', confirmPassword: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (form.password !== form.confirmPassword) {
      return toast.error('As senhas não coincidem');
    }

    if (form.password.length < 6) {
      return toast.error('Senha deve ter pelo menos 6 caracteres');
    }

    setLoading(true);
    try {
      await register({
        name: form.name,
        email: form.email || undefined,
        phone: form.phone || undefined,
        password: form.password,
      });
      toast.success('Conta criada com sucesso! Bem-vindo!');
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
          <h1 className="text-3xl font-display font-bold text-white mb-2">Criar Conta</h1>
          <p className="text-dark-400">Cadastre-se para agendar seus horários</p>
        </div>

        {/* Register Form */}
        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-dark-300 mb-1.5">Nome completo *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="input-field"
                placeholder="Seu nome"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-dark-300 mb-1.5">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="input-field"
                placeholder="seu@email.com"
              />
            </div>

            <div>
              <label className="block text-sm text-dark-300 mb-1.5">Telefone (WhatsApp)</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="input-field"
                placeholder="11999999999"
              />
              <p className="text-xs text-dark-500 mt-1">Necessário para receber lembretes</p>
            </div>

            <div>
              <label className="block text-sm text-dark-300 mb-1.5">Senha *</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="input-field pr-11"
                  placeholder="Mínimo 6 caracteres"
                  required
                  minLength={6}
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

            <div>
              <label className="block text-sm text-dark-300 mb-1.5">Confirmar Senha *</label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                className="input-field"
                placeholder="Repita a senha"
                required
              />
            </div>

            <p className="text-xs text-dark-500">* Campos obrigatórios. Informe email ou telefone.</p>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white"></div>
                  Criando conta...
                </span>
              ) : 'Criar Conta'}
            </button>
          </form>
        </div>

        {/* Login Link */}
        <p className="text-center mt-6 text-dark-400">
          Já tem conta?{' '}
          <Link to="/login" className="text-primary-400 hover:text-primary-300 font-medium">
            Faça login
          </Link>
        </p>
      </div>
    </div>
  );
}
