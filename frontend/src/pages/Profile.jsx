import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../api';
import toast from 'react-hot-toast';
import { User, Mail, Phone, Lock, Save, Eye, EyeOff, Shield, Calendar } from 'lucide-react';

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [activeSection, setActiveSection] = useState('info');

  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });

  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await api.updateProfile(form);
      updateUser(updated);
      toast.success('Perfil atualizado com sucesso!');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (passwordForm.new_password.length < 6) {
      return toast.error('Nova senha deve ter pelo menos 6 caracteres');
    }

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      return toast.error('As senhas não coincidem');
    }

    setSaving(true);
    try {
      await api.changePassword(passwordForm.current_password, passwordForm.new_password);
      toast.success('Senha alterada com sucesso!');
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const roleName = {
    client: 'Cliente',
    barber: 'Barbeiro',
    admin: 'Administrador',
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 animate-fadeIn">
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-primary-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          {user?.avatar_url ? (
            <img src={user.avatar_url} alt="" className="w-20 h-20 rounded-full object-cover" />
          ) : (
            <User className="w-10 h-10 text-primary-400" />
          )}
        </div>
        <h1 className="text-3xl font-display font-bold text-white">{user?.name}</h1>
        <div className="flex items-center justify-center gap-2 mt-2">
          <Shield className="w-4 h-4 text-primary-400" />
          <span className="text-primary-400 text-sm font-medium">{roleName[user?.role] || user?.role}</span>
        </div>
      </div>

      {/* Section Toggle */}
      <div className="flex gap-2 mb-6 justify-center">
        <button
          onClick={() => setActiveSection('info')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            activeSection === 'info' ? 'bg-primary-500 text-white' : 'bg-dark-800 text-dark-400 hover:text-white'
          }`}
        >
          <User className="w-4 h-4 inline mr-1" /> Informações
        </button>
        <button
          onClick={() => setActiveSection('password')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            activeSection === 'password' ? 'bg-primary-500 text-white' : 'bg-dark-800 text-dark-400 hover:text-white'
          }`}
        >
          <Lock className="w-4 h-4 inline mr-1" /> Alterar Senha
        </button>
      </div>

      {/* Profile Info */}
      {activeSection === 'info' && (
        <form onSubmit={handleUpdateProfile} className="card animate-fadeIn">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-primary-400" /> Informações Pessoais
          </h2>

          <div className="space-y-4">
            <div>
              <label className="flex items-center gap-2 text-sm text-dark-400 mb-1">
                <User className="w-4 h-4" /> Nome
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="input-field"
                required
                placeholder="Seu nome"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm text-dark-400 mb-1">
                <Mail className="w-4 h-4" /> Email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="input-field"
                placeholder="seu@email.com"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm text-dark-400 mb-1">
                <Phone className="w-4 h-4" /> Telefone (WhatsApp)
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="input-field"
                placeholder="11999999999"
              />
              <p className="text-xs text-dark-500 mt-1">Usado para receber lembretes de agendamentos</p>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="btn-primary py-2.5 mt-6 flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> {saving ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </form>
      )}

      {/* Change Password */}
      {activeSection === 'password' && (
        <form onSubmit={handleChangePassword} className="card animate-fadeIn">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Lock className="w-5 h-5 text-primary-400" /> Alterar Senha
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-dark-400 mb-1">Senha Atual</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passwordForm.current_password}
                  onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                  className="input-field pr-10"
                  required
                  placeholder="Sua senha atual"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-500 hover:text-dark-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm text-dark-400 mb-1">Nova Senha</label>
              <input
                type="password"
                value={passwordForm.new_password}
                onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                className="input-field"
                required
                minLength={6}
                placeholder="Mínimo 6 caracteres"
              />
            </div>

            <div>
              <label className="block text-sm text-dark-400 mb-1">Confirmar Nova Senha</label>
              <input
                type="password"
                value={passwordForm.confirm_password}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                className="input-field"
                required
                minLength={6}
                placeholder="Confirme a nova senha"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="btn-primary py-2.5 mt-6 flex items-center gap-2 disabled:opacity-50"
          >
            <Lock className="w-4 h-4" /> {saving ? 'Alterando...' : 'Alterar Senha'}
          </button>
        </form>
      )}

      {/* Account Info */}
      <div className="card mt-6">
        <h3 className="text-sm font-semibold text-dark-400 mb-3">Informações da Conta</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-dark-500">Tipo de conta</span>
            <span className="text-white">{roleName[user?.role]}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-dark-500">Membro desde</span>
            <span className="text-white">
              {user?.created_at ? new Date(user.created_at).toLocaleDateString('pt-BR') : '-'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
