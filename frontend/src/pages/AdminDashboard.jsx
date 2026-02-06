import { useState, useEffect } from 'react';
import api from '../api';
import { useSite } from '../contexts/SiteContext';
import toast from 'react-hot-toast';
import { jsPDF } from 'jspdf';
import {
  LayoutDashboard, Users, Scissors, Calendar, DollarSign, TrendingUp,
  Plus, X, Save, Clock, UserPlus, Settings, ChevronDown, ChevronUp,
  CheckCircle, XCircle, AlertCircle, Trash2, Palette, Image, Link as LinkIcon,
  Type, MapPin, MessageCircle, Instagram, FileText, Edit, BarChart3, Download, Star
} from 'lucide-react';

const DAYS_PT = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'appointments', label: 'Agendamentos', icon: Calendar },
  { id: 'services', label: 'Serviços', icon: Scissors },
  { id: 'barbers', label: 'Barbeiros', icon: Users },
  { id: 'users', label: 'Usuários', icon: Users },
  { id: 'reports', label: 'Relatórios', icon: BarChart3 },
  { id: 'settings', label: 'Personalização', icon: Palette },
];

const STATUS_MAP = {
  confirmed: { label: 'Confirmado', color: 'text-green-400 bg-green-400/10' },
  cancelled: { label: 'Cancelado', color: 'text-red-400 bg-red-400/10' },
  completed: { label: 'Concluído', color: 'text-blue-400 bg-blue-400/10' },
  reviewed: { label: 'Avaliado', color: 'text-purple-400 bg-purple-400/10' },
  no_show: { label: 'Não compareceu', color: 'text-yellow-400 bg-yellow-400/10' },
};

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [services, setServices] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [barbers, setBarbers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { settings: siteSettings, updateSettings: updateSiteSettings, reloadSettings } = useSite();

  // Modals
  const [showNewBarber, setShowNewBarber] = useState(false);
  const [showNewService, setShowNewService] = useState(false);
  const [showSchedule, setShowSchedule] = useState(null);

  useEffect(() => { loadData(); }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'dashboard') {
        const s = await api.getStats();
        setStats(s);
      }
      if (activeTab === 'users') setUsers(await api.getUsers());
      if (activeTab === 'services') setServices(await api.getServices());
      if (activeTab === 'appointments') setAppointments(await api.getAdminAppointments());
      if (activeTab === 'barbers') setBarbers(await api.getBarbers());
    } catch (error) {
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 animate-fadeIn">
      <h1 className="text-3xl font-display font-bold text-white mb-2">Painel Administrativo</h1>
      <p className="text-dark-400 mb-8">Gerencie sua barbearia</p>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-primary-500 text-white'
                : 'bg-dark-800 text-dark-400 hover:text-white hover:bg-dark-700'
            }`}
          >
            <tab.icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary-500"></div>
        </div>
      ) : (
        <>
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && stats && <DashboardTab stats={stats} />}

          {/* Appointments Tab */}
          {activeTab === 'appointments' && (
            <AppointmentsTab appointments={appointments} onReload={loadData} />
          )}

          {/* Services Tab */}
          {activeTab === 'services' && (
            <ServicesTab
              services={services}
              showNew={showNewService}
              setShowNew={setShowNewService}
              onReload={loadData}
            />
          )}

          {/* Barbers Tab */}
          {activeTab === 'barbers' && (
            <BarbersTab
              barbers={barbers}
              showNew={showNewBarber}
              setShowNew={setShowNewBarber}
              showSchedule={showSchedule}
              setShowSchedule={setShowSchedule}
              onReload={loadData}
            />
          )}

          {/* Users Tab */}
          {activeTab === 'users' && <UsersTab users={users} onReload={loadData} />}

          {/* Reports Tab */}
          {activeTab === 'reports' && <ReportsTab settings={siteSettings} />}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <SettingsTab settings={siteSettings} updateSettings={updateSiteSettings} reloadSettings={reloadSettings} />
          )}
        </>
      )}
    </div>
  );
}

// ============ Dashboard Tab ============
function DashboardTab({ stats }) {
  const statCards = [
    { label: 'Agendamentos Hoje', value: stats.todayAppointments, icon: Calendar, color: 'text-blue-400' },
    { label: 'Total Agendamentos', value: stats.totalAppointments, icon: TrendingUp, color: 'text-green-400' },
    { label: 'Clientes', value: stats.totalClients, icon: Users, color: 'text-purple-400' },
    { label: 'Barbeiros', value: stats.totalBarbers, icon: Scissors, color: 'text-primary-400' },
    { label: 'Receita Hoje', value: `R$ ${stats.todayRevenue.toFixed(2)}`, icon: DollarSign, color: 'text-emerald-400' },
    { label: 'Receita do Mês', value: `R$ ${stats.monthRevenue.toFixed(2)}`, icon: DollarSign, color: 'text-yellow-400' },
  ];

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {statCards.map((card, i) => (
          <div key={i} className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-dark-400">{card.label}</p>
                <p className="text-2xl font-bold text-white mt-1">{card.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-xl bg-dark-800 flex items-center justify-center`}>
                <card.icon className={`w-6 h-6 ${card.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Schedule */}
        {stats.todaySchedule?.length > 0 && (
          <div className="card">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary-400" /> Agenda de Hoje
            </h3>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {stats.todaySchedule.map((apt, i) => {
                const status = STATUS_MAP[apt.status] || STATUS_MAP['confirmed'];
                return (
                  <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-dark-800/50">
                    <span className="text-lg">{apt.service_icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-medium truncate">{apt.client_name}</p>
                      <p className="text-xs text-dark-500">{apt.service_name} • {apt.barber_name}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm text-primary-400 font-semibold">{apt.start_time}</p>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${status.color}`}>{status.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Popular Services */}
        {stats.popularServices?.length > 0 && (
          <div className="card">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary-400" /> Serviços Mais Populares
            </h3>
            <div className="space-y-3">
              {stats.popularServices.map((s, i) => {
                const maxCount = stats.popularServices[0]?.count || 1;
                const pct = Math.round((s.count / maxCount) * 100);
                return (
                  <div key={i}>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-lg">{s.icon}</span>
                      <span className="flex-1 text-dark-300 text-sm">{s.name}</span>
                      <span className="text-primary-400 font-semibold text-sm">{s.count}</span>
                    </div>
                    <div className="h-1.5 bg-dark-800 rounded-full overflow-hidden ml-8">
                      <div className="h-full bg-primary-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Recent Activity */}
      {stats.recentAppointments?.length > 0 && (
        <div className="card mt-6">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary-400" /> Atividade Recente
          </h3>
          <div className="space-y-2">
            {stats.recentAppointments.map((apt, i) => {
              const status = STATUS_MAP[apt.status] || STATUS_MAP['confirmed'];
              return (
                <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-dark-800/50 transition-colors">
                  <span className="text-lg">{apt.service_icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium truncate">{apt.client_name}</p>
                    <p className="text-xs text-dark-500">
                      {apt.service_name} • {apt.appointment_date?.split('-').reverse().join('/')} às {apt.start_time}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${status.color}`}>{status.label}</span>
                  <span className="text-primary-400 font-bold text-sm">R$ {apt.service_price?.toFixed(2)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ============ Appointments Tab ============
function AppointmentsTab({ appointments, onReload }) {
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDate, setFilterDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const handleStatus = async (id, status) => {
    try {
      await api.updateAppointmentStatus(id, status);
      toast.success('Status atualizado');
      onReload();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const filtered = appointments.filter(apt => {
    if (filterStatus !== 'all' && apt.status !== filterStatus) return false;
    if (filterDate && apt.appointment_date !== filterDate) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        apt.client_name?.toLowerCase().includes(term) ||
        apt.barber_name?.toLowerCase().includes(term) ||
        apt.service_name?.toLowerCase().includes(term) ||
        apt.client_phone?.includes(term)
      );
    }
    return true;
  });

  const totalRevenue = filtered
    .filter(a => ['confirmed', 'completed'].includes(a.status))
    .reduce((sum, a) => sum + (a.service_price || 0), 0);

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
        <h2 className="text-xl font-semibold text-white">Todos os Agendamentos ({filtered.length})</h2>
        <div className="text-sm text-primary-400 font-semibold">Receita filtrada: R$ {totalRevenue.toFixed(2)}</div>
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-dark-500 mb-1">Buscar</label>
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="input-field text-sm py-2"
              placeholder="Nome, telefone, serviço..."
            />
          </div>
          <div>
            <label className="block text-xs text-dark-500 mb-1">Data</label>
            <input
              type="date"
              value={filterDate}
              onChange={e => setFilterDate(e.target.value)}
              className="input-field text-sm py-2"
            />
          </div>
          <div>
            <label className="block text-xs text-dark-500 mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="input-field text-sm py-2"
            >
              <option value="all">Todos</option>
              <option value="confirmed">Confirmados</option>
              <option value="completed">Concluídos</option>
              <option value="cancelled">Cancelados</option>
              <option value="no_show">Não compareceu</option>
            </select>
          </div>
        </div>
        {(searchTerm || filterDate || filterStatus !== 'all') && (
          <button
            onClick={() => { setSearchTerm(''); setFilterDate(''); setFilterStatus('all'); }}
            className="text-xs text-primary-400 hover:text-primary-300 mt-2 transition-colors"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="card text-center py-12">
          <Calendar className="w-12 h-12 text-dark-600 mx-auto mb-3" />
          <p className="text-dark-400">Nenhum agendamento encontrado</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(apt => {
            const displayStatus = (apt.status === 'completed' && apt.has_review) ? 'reviewed' : apt.status;
            const status = STATUS_MAP[displayStatus] || STATUS_MAP[apt.status];
            return (
              <div key={apt.id} className="card">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="text-2xl">{apt.service_icon}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-white">{apt.client_name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.color}`}>{status.label}</span>
                    </div>
                    <p className="text-sm text-dark-400 mt-1">
                      {apt.service_name} • {apt.appointment_date.split('-').reverse().join('/')} às {apt.start_time} • Com {apt.barber_name}
                    </p>
                    {apt.client_phone && (
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-dark-500">📱 {apt.client_phone}</p>
                        <a
                          href={`https://wa.me/55${apt.client_phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                            `Olá ${apt.client_name}! Sobre seu agendamento de ${apt.service_name} no dia ${apt.appointment_date.split('-').reverse().join('/')} às ${apt.start_time}.`
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-green-400 hover:text-green-300 transition-colors"
                          title="Contatar via WhatsApp"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-primary-400 font-bold">R$ {apt.service_price?.toFixed(2)}</span>
                  </div>
                  {apt.status === 'confirmed' && (
                    <div className="flex gap-2">
                      <button onClick={() => handleStatus(apt.id, 'completed')}
                        className="text-xs bg-green-600 hover:bg-green-700 text-white py-1.5 px-3 rounded-lg transition-all">
                        Concluir
                      </button>
                      <button onClick={() => handleStatus(apt.id, 'no_show')}
                        className="text-xs bg-yellow-600 hover:bg-yellow-700 text-white py-1.5 px-3 rounded-lg transition-all">
                        Faltou
                      </button>
                      <button onClick={() => handleStatus(apt.id, 'cancelled')}
                        className="text-xs bg-red-600 hover:bg-red-700 text-white py-1.5 px-3 rounded-lg transition-all">
                        Cancelar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============ Services Tab ============
function ServicesTab({ services, showNew, setShowNew, onReload }) {
  const [form, setForm] = useState({ name: '', description: '', duration_minutes: 30, price: 0, icon: '✂️' });
  const [editingId, setEditingId] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.updateService(editingId, form);
        toast.success('Serviço atualizado');
        setEditingId(null);
      } else {
        await api.createService(form);
        toast.success('Serviço criado');
      }
      setShowNew(false);
      setForm({ name: '', description: '', duration_minutes: 30, price: 0, icon: '✂️' });
      onReload();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleEdit = (service) => {
    setForm({
      name: service.name,
      description: service.description,
      duration_minutes: service.duration_minutes,
      price: service.price,
      icon: service.icon,
    });
    setEditingId(service.id);
    setShowNew(true);
  };

  const handleCancel = () => {
    setShowNew(false);
    setEditingId(null);
    setForm({ name: '', description: '', duration_minutes: 30, price: 0, icon: '✂️' });
  };

  const handleDelete = async (id) => {
    if (!confirm('Desativar este serviço?')) return;
    try {
      await api.deleteService(id);
      toast.success('Serviço desativado');
      onReload();
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-white">Serviços</h2>
        <button onClick={() => setShowNew(!showNew)} className="btn-primary text-sm py-2 flex items-center gap-1">
          <Plus className="w-4 h-4" /> Novo Serviço
        </button>
      </div>

      {showNew && (
        <form onSubmit={handleSubmit} className="card mb-6 animate-fadeIn">
          <h3 className="font-semibold text-white mb-4">{editingId ? 'Editar Serviço' : 'Novo Serviço'}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-dark-400 mb-1">Nome</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                className="input-field" required placeholder="Ex: Corte de Cabelo" />
            </div>
            <div>
              <label className="block text-sm text-dark-400 mb-1">Ícone (emoji)</label>
              <input value={form.icon} onChange={e => setForm({ ...form, icon: e.target.value })}
                className="input-field" placeholder="✂️" />
            </div>
            <div>
              <label className="block text-sm text-dark-400 mb-1">Duração (min)</label>
              <input type="number" value={form.duration_minutes} onChange={e => setForm({ ...form, duration_minutes: parseInt(e.target.value) })}
                className="input-field" required min={5} />
            </div>
            <div>
              <label className="block text-sm text-dark-400 mb-1">Preço (R$)</label>
              <input type="number" step="0.01" value={form.price} onChange={e => setForm({ ...form, price: parseFloat(e.target.value) })}
                className="input-field" required min={0} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm text-dark-400 mb-1">Descrição</label>
              <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                className="input-field" placeholder="Descrição do serviço" />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button type="submit" className="btn-primary text-sm py-2 flex items-center gap-1">
              <Save className="w-4 h-4" /> {editingId ? 'Atualizar' : 'Salvar'}
            </button>
            <button type="button" onClick={handleCancel} className="btn-secondary text-sm py-2">
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {services.map(service => (
          <div key={service.id} className="card">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3 flex-1">
                <span className="text-2xl">{service.icon}</span>
                <div className="flex-1">
                  <h3 className="font-semibold text-white">{service.name}</h3>
                  <p className="text-xs text-dark-400">{service.description}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleEdit(service)}
                  className="text-dark-500 hover:text-primary-400 transition-colors" title="Editar">
                  <Edit className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(service.id)}
                  className="text-dark-500 hover:text-red-400 transition-colors" title="Desativar">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex items-center gap-4 mt-3 text-sm">
              <span className="text-primary-400 font-bold">R$ {service.price.toFixed(2)}</span>
              <span className="text-dark-500"><Clock className="w-3 h-3 inline mr-1" />{service.duration_minutes}min</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ Barbers Tab ============
function BarbersTab({ barbers, showNew, setShowNew, showSchedule, setShowSchedule, onReload }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [editingBarber, setEditingBarber] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', phone: '' });
  const [scheduleForm, setScheduleForm] = useState([]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.createBarber(form);
      toast.success('Barbeiro criado');
      setShowNew(false);
      setForm({ name: '', email: '', phone: '', password: '' });
      onReload();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleStartEdit = (barber) => {
    setEditingBarber(barber.id);
    setEditForm({ name: barber.name, email: barber.email || '', phone: barber.phone || '' });
  };

  const handleSaveEdit = async (barberId) => {
    try {
      await api.updateBarber(barberId, editForm);
      toast.success('Barbeiro atualizado');
      setEditingBarber(null);
      onReload();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleToggleBarber = async (barberId) => {
    try {
      await api.toggleUser(barberId);
      toast.success('Status atualizado');
      onReload();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const openSchedule = (barber) => {
    setShowSchedule(barber.id);
    const existingSchedule = [];
    for (let d = 0; d <= 6; d++) {
      const existing = barber.schedules?.find(s => s.day_of_week === d);
      existingSchedule.push({
        day_of_week: d,
        active: !!existing,
        start_time: existing?.start_time || '09:00',
        end_time: existing?.end_time || '19:00',
      });
    }
    setScheduleForm(existingSchedule);
  };

  const saveSchedule = async (barberId) => {
    try {
      const schedules = scheduleForm
        .filter(s => s.active)
        .map(s => ({ day_of_week: s.day_of_week, start_time: s.start_time, end_time: s.end_time }));

      await api.setBarberSchedule(barberId, schedules);
      toast.success('Horários salvos');
      setShowSchedule(null);
      onReload();
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-white">Barbeiros</h2>
        <button onClick={() => setShowNew(!showNew)} className="btn-primary text-sm py-2 flex items-center gap-1">
          <UserPlus className="w-4 h-4" /> Novo Barbeiro
        </button>
      </div>

      {showNew && (
        <form onSubmit={handleCreate} className="card mb-6 animate-fadeIn">
          <h3 className="font-semibold text-white mb-4">Cadastrar Barbeiro</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-dark-400 mb-1">Nome</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                className="input-field" required />
            </div>
            <div>
              <label className="block text-sm text-dark-400 mb-1">Email</label>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                className="input-field" />
            </div>
            <div>
              <label className="block text-sm text-dark-400 mb-1">Telefone</label>
              <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                className="input-field" />
            </div>
            <div>
              <label className="block text-sm text-dark-400 mb-1">Senha</label>
              <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                className="input-field" required minLength={6} />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button type="submit" className="btn-primary text-sm py-2"><Save className="w-4 h-4 inline mr-1" />Salvar</button>
            <button type="button" onClick={() => setShowNew(false)} className="btn-secondary text-sm py-2">Cancelar</button>
          </div>
        </form>
      )}

      <div className="space-y-4">
        {barbers.map(barber => (
          <div key={barber.id} className="card">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="w-12 h-12 bg-primary-500/20 rounded-full flex items-center justify-center">
                <Users className="w-5 h-5 text-primary-400" />
              </div>
              <div className="flex-1">
                {editingBarber === barber.id ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})}
                      className="input-field text-sm py-1.5" placeholder="Nome" />
                    <input value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})}
                      className="input-field text-sm py-1.5" placeholder="Email" />
                    <input value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})}
                      className="input-field text-sm py-1.5" placeholder="Telefone" />
                  </div>
                ) : (
                  <>
                    <h3 className="font-semibold text-white">{barber.name}</h3>
                    <p className="text-sm text-dark-400">{barber.email} • {barber.phone}</p>
                    <p className="text-xs text-dark-500 mt-1">
                      Trabalha: {barber.schedules?.map(s => DAYS_PT[s.day_of_week]).join(', ') || 'Sem horários'}
                    </p>
                  </>
                )}
              </div>
              <div className="flex gap-2 flex-wrap">
                {editingBarber === barber.id ? (
                  <>
                    <button onClick={() => handleSaveEdit(barber.id)}
                      className="btn-primary text-sm py-2 flex items-center gap-1">
                      <Save className="w-4 h-4" /> Salvar
                    </button>
                    <button onClick={() => setEditingBarber(null)}
                      className="btn-secondary text-sm py-2">Cancelar</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => handleStartEdit(barber)}
                      className="text-dark-500 hover:text-primary-400 transition-colors" title="Editar">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleToggleBarber(barber.id)}
                      className="text-dark-500 hover:text-red-400 transition-colors" title="Desativar">
                      <XCircle className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
              <button onClick={() => openSchedule(barber)}
                className="btn-secondary text-sm py-2 flex items-center gap-1">
                <Settings className="w-4 h-4" /> Horários
              </button>
            </div>

            {/* Schedule Editor */}
            {showSchedule === barber.id && (
              <div className="mt-4 pt-4 border-t border-dark-700 animate-fadeIn">
                <h4 className="text-sm font-semibold text-white mb-3">Configurar Horários de Trabalho</h4>
                <div className="space-y-2">
                  {scheduleForm.map((s, i) => (
                    <div key={s.day_of_week} className="flex items-center gap-3">
                      <label className="flex items-center gap-2 w-28">
                        <input
                          type="checkbox"
                          checked={s.active}
                          onChange={(e) => {
                            const updated = [...scheduleForm];
                            updated[i].active = e.target.checked;
                            setScheduleForm(updated);
                          }}
                          className="accent-primary-500"
                        />
                        <span className="text-sm text-dark-300">{DAYS_PT[s.day_of_week]}</span>
                      </label>
                      {s.active && (
                        <div className="flex items-center gap-2">
                          <input type="time" value={s.start_time}
                            onChange={(e) => {
                              const updated = [...scheduleForm];
                              updated[i].start_time = e.target.value;
                              setScheduleForm(updated);
                            }}
                            className="input-field py-1 px-2 text-sm w-28" />
                          <span className="text-dark-500">até</span>
                          <input type="time" value={s.end_time}
                            onChange={(e) => {
                              const updated = [...scheduleForm];
                              updated[i].end_time = e.target.value;
                              setScheduleForm(updated);
                            }}
                            className="input-field py-1 px-2 text-sm w-28" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mt-4">
                  <button onClick={() => saveSchedule(barber.id)} className="btn-primary text-sm py-2">
                    <Save className="w-4 h-4 inline mr-1" /> Salvar Horários
                  </button>
                  <button onClick={() => setShowSchedule(null)} className="btn-secondary text-sm py-2">
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ Reports Tab ============
function ReportsTab({ settings }) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!startDate || !endDate) {
      return toast.error('Selecione o período');
    }

    if (new Date(startDate) > new Date(endDate)) {
      return toast.error('Data inicial deve ser menor que a final');
    }

    setLoading(true);
    try {
      const data = await api.getReports(startDate, endDate);
      setReport(data);
      toast.success('Relatório gerado!');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => `R$ ${Number(value || 0).toFixed(2)}`;
  const formatDate = (date) => new Date(date).toLocaleDateString('pt-BR');

  // Remove emojis e caracteres unicode que o jsPDF nao suporta
  const cleanText = (text) => {
    if (!text) return '';
    return String(text).replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{200D}\u{20E3}\u{E0020}-\u{E007F}]/gu, '').trim();
  };

  const generatePDF = () => {
    if (!report) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;
    const contentWidth = pageWidth - margin * 2;
    let yPos = 15;

    const checkNewPage = (needed = 30) => {
      if (yPos + needed > pageHeight - 20) {
        doc.addPage();
        yPos = 20;
      }
    };

    const drawLine = (y, color = [200, 200, 200]) => {
      doc.setDrawColor(...color);
      doc.setLineWidth(0.3);
      doc.line(margin, y, pageWidth - margin, y);
    };

    const drawSectionTitle = (title) => {
      checkNewPage(25);
      doc.setFillColor(245, 245, 245);
      doc.rect(margin, yPos - 5, contentWidth, 10, 'F');
      doc.setFontSize(11);
      doc.setTextColor(40, 40, 40);
      doc.setFont('helvetica', 'bold');
      doc.text(title, margin + 4, yPos + 1);
      doc.setFont('helvetica', 'normal');
      yPos += 12;
    };

    // === HEADER ===
    doc.setFillColor(30, 30, 30);
    doc.rect(0, 0, pageWidth, 40, 'F');

    doc.setFontSize(22);
    doc.setTextColor(255, 140, 0);
    doc.setFont('helvetica', 'bold');
    doc.text(cleanText(settings.site_name) || 'BarberShop', pageWidth / 2, 18, { align: 'center' });

    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'normal');
    doc.text('Relatorio de Agendamentos', pageWidth / 2, 28, { align: 'center' });

    doc.setFontSize(9);
    doc.setTextColor(180, 180, 180);
    doc.text(`Periodo: ${formatDate(report.period.start_date)} a ${formatDate(report.period.end_date)}`, pageWidth / 2, 36, { align: 'center' });

    yPos = 52;

    // === RESUMO GERAL ===
    drawSectionTitle('RESUMO GERAL');

    // Cards de resumo em grid
    const cardW = (contentWidth - 9) / 4;
    const cards = [
      { label: 'Total', value: String(report.overall.total_appointments), color: [60, 60, 60] },
      { label: 'Concluidos', value: String(report.overall.completed), color: [34, 139, 34] },
      { label: 'Confirmados', value: String(report.overall.confirmed), color: [30, 100, 200] },
      { label: 'Cancelados', value: String(report.overall.cancelled), color: [200, 50, 50] },
    ];

    cards.forEach((card, i) => {
      const x = margin + i * (cardW + 3);
      doc.setFillColor(248, 248, 248);
      doc.roundedRect(x, yPos, cardW, 22, 2, 2, 'F');
      doc.setDrawColor(220, 220, 220);
      doc.roundedRect(x, yPos, cardW, 22, 2, 2, 'S');
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text(card.label, x + cardW / 2, yPos + 8, { align: 'center' });
      doc.setFontSize(16);
      doc.setTextColor(...card.color);
      doc.setFont('helvetica', 'bold');
      doc.text(card.value, x + cardW / 2, yPos + 18, { align: 'center' });
      doc.setFont('helvetica', 'normal');
    });
    yPos += 30;

    // Faturamento destaque
    doc.setFillColor(255, 243, 230);
    doc.roundedRect(margin, yPos, contentWidth, 16, 2, 2, 'F');
    doc.setDrawColor(255, 140, 0);
    doc.roundedRect(margin, yPos, contentWidth, 16, 2, 2, 'S');
    doc.setFontSize(10);
    doc.setTextColor(120, 80, 0);
    doc.text('Faturamento Total:', margin + 6, yPos + 10);
    doc.setFontSize(14);
    doc.setTextColor(200, 100, 0);
    doc.setFont('helvetica', 'bold');
    doc.text(formatCurrency(report.overall.total_revenue), pageWidth - margin - 6, yPos + 10, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    yPos += 25;

    // === DESEMPENHO DOS BARBEIROS ===
    if (report.barbers.length > 0) {
      drawSectionTitle('DESEMPENHO DOS BARBEIROS');

      // Header da tabela
      const colWidths = [45, 25, 25, 25, 32, 30];
      const colX = [margin];
      for (let i = 1; i < colWidths.length; i++) colX.push(colX[i - 1] + colWidths[i - 1]);

      doc.setFillColor(50, 50, 50);
      doc.rect(margin, yPos, contentWidth, 8, 'F');
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.text('Barbeiro', colX[0] + 3, yPos + 5.5);
      doc.text('Agend.', colX[1] + 3, yPos + 5.5);
      doc.text('Concl.', colX[2] + 3, yPos + 5.5);
      doc.text('Cancel.', colX[3] + 3, yPos + 5.5);
      doc.text('Faturamento', colX[4] + 3, yPos + 5.5);
      doc.text('Avaliacao', colX[5] + 3, yPos + 5.5);
      doc.setFont('helvetica', 'normal');
      yPos += 8;

      report.barbers.forEach((barber, idx) => {
        checkNewPage(10);
        if (idx % 2 === 0) {
          doc.setFillColor(248, 248, 248);
          doc.rect(margin, yPos, contentWidth, 8, 'F');
        }
        doc.setFontSize(9);
        doc.setTextColor(40, 40, 40);
        doc.setFont('helvetica', 'bold');
        doc.text(cleanText(barber.barber_name), colX[0] + 3, yPos + 5.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(80, 80, 80);
        doc.text(String(barber.total_appointments), colX[1] + 3, yPos + 5.5);
        doc.text(String(barber.completed), colX[2] + 3, yPos + 5.5);
        doc.text(String(barber.cancelled), colX[3] + 3, yPos + 5.5);
        doc.setTextColor(200, 100, 0);
        doc.setFont('helvetica', 'bold');
        doc.text(formatCurrency(barber.total_revenue), colX[4] + 3, yPos + 5.5);
        doc.setFont('helvetica', 'normal');
        // Avaliacao media
        const avgRating = barber.avg_rating > 0 ? Number(barber.avg_rating).toFixed(1) + '/5' : '-';
        doc.setTextColor(180, 140, 0);
        doc.text(avgRating, colX[5] + 3, yPos + 5.5);
        doc.setTextColor(80, 80, 80);
        yPos += 8;
      });

      drawLine(yPos, [180, 180, 180]);
      yPos += 10;
    }

    // === SERVICOS MAIS PROCURADOS ===
    if (report.services.length > 0) {
      drawSectionTitle('SERVICOS MAIS PROCURADOS');

      // Header da tabela
      const sColWidths = [80, 42, 60];
      const sColX = [margin];
      for (let i = 1; i < sColWidths.length; i++) sColX.push(sColX[i - 1] + sColWidths[i - 1]);

      doc.setFillColor(50, 50, 50);
      doc.rect(margin, yPos, contentWidth, 8, 'F');
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.text('Servico', sColX[0] + 3, yPos + 5.5);
      doc.text('Agendamentos', sColX[1] + 3, yPos + 5.5);
      doc.text('Receita', sColX[2] + 3, yPos + 5.5);
      doc.setFont('helvetica', 'normal');
      yPos += 8;

      report.services.forEach((service, idx) => {
        checkNewPage(10);
        if (idx % 2 === 0) {
          doc.setFillColor(248, 248, 248);
          doc.rect(margin, yPos, contentWidth, 8, 'F');
        }
        doc.setFontSize(9);
        doc.setTextColor(40, 40, 40);
        doc.setFont('helvetica', 'bold');
        doc.text(cleanText(service.service_name), sColX[0] + 3, yPos + 5.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(80, 80, 80);
        doc.text(String(service.times_booked), sColX[1] + 3, yPos + 5.5);
        doc.setTextColor(200, 100, 0);
        doc.setFont('helvetica', 'bold');
        doc.text(formatCurrency(service.revenue), sColX[2] + 3, yPos + 5.5);
        doc.setFont('helvetica', 'normal');
        yPos += 8;
      });

      drawLine(yPos, [180, 180, 180]);
    }

    // === RODAPE em todas as paginas ===
    const totalPages = doc.internal.pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      drawLine(pageHeight - 15, [220, 220, 220]);
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')} | ${cleanText(settings.site_name) || 'BarberShop'}`, margin, pageHeight - 8);
      doc.text(`Pagina ${i} de ${totalPages}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
    }

    const fileName = `relatorio_${startDate}_${endDate}.pdf`;
    doc.save(fileName);
    toast.success('PDF gerado com sucesso!');
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="card">
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary-400" /> Relatório por Período
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-dark-400 mb-1">Data Inicial</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="input-field" max={endDate || undefined} />
          </div>
          <div>
            <label className="block text-sm text-dark-400 mb-1">Data Final</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              className="input-field" min={startDate || undefined} />
          </div>
          <div className="flex gap-2">
            <button onClick={handleGenerate} disabled={loading}
              className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50">
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white"></div>
                  Gerando...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" /> Gerar
                </>
              )}
            </button>
            {report && (
              <button onClick={generatePDF}
                className="btn-secondary flex items-center justify-center gap-2 px-4">
                <Download className="w-4 h-4" /> PDF
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Report Results */}
      {report && (
        <div className="space-y-6 animate-fadeIn">
          {/* Overall Stats */}
          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-4">
              Resumo Geral - {formatDate(report.period.start_date)} a {formatDate(report.period.end_date)}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-dark-800 rounded-xl p-4">
                <p className="text-xs text-dark-500 mb-1">Total Agendamentos</p>
                <p className="text-2xl font-bold text-white">{report.overall.total_appointments}</p>
              </div>
              <div className="bg-green-500/10 rounded-xl p-4">
                <p className="text-xs text-green-400 mb-1">Concluídos</p>
                <p className="text-2xl font-bold text-green-400">{report.overall.completed}</p>
              </div>
              <div className="bg-blue-500/10 rounded-xl p-4">
                <p className="text-xs text-blue-400 mb-1">Confirmados</p>
                <p className="text-2xl font-bold text-blue-400">{report.overall.confirmed}</p>
              </div>
              <div className="bg-red-500/10 rounded-xl p-4">
                <p className="text-xs text-red-400 mb-1">Cancelados</p>
                <p className="text-2xl font-bold text-red-400">{report.overall.cancelled}</p>
              </div>
            </div>
            <div className="mt-4 p-4 bg-primary-500/10 border border-primary-500/20 rounded-xl">
              <p className="text-sm text-primary-300 mb-1">Faturamento Total</p>
              <p className="text-3xl font-bold text-primary-400">{formatCurrency(report.overall.total_revenue)}</p>
            </div>
          </div>

          {/* Barbers Performance */}
          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-primary-400" /> Desempenho dos Barbeiros
            </h3>
            {report.barbers.length === 0 ? (
              <p className="text-dark-500 text-center py-8">Nenhum atendimento no período</p>
            ) : (
              <div className="space-y-3">
                {report.barbers.map(barber => (
                  <div key={barber.id} className="bg-dark-800 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-white">{barber.barber_name}</h4>
                      <span className="text-primary-400 font-bold text-lg">{formatCurrency(barber.total_revenue)}</span>
                    </div>
                    <div className="grid grid-cols-4 gap-3 text-sm">
                      <div>
                        <p className="text-dark-500">Total</p>
                        <p className="text-white font-semibold">{barber.total_appointments}</p>
                      </div>
                      <div>
                        <p className="text-green-400">Concluídos</p>
                        <p className="text-white font-semibold">{barber.completed_appointments}</p>
                      </div>
                      <div>
                        <p className="text-red-400">Cancelados</p>
                        <p className="text-white font-semibold">{barber.cancelled_appointments}</p>
                      </div>
                      <div>
                        <p className="text-yellow-400">Avaliação</p>
                        <p className="text-white font-semibold flex items-center gap-1">
                          {barber.avg_rating > 0 ? (
                            <><Star className="w-4 h-4 fill-yellow-400 text-yellow-400" /> {Number(barber.avg_rating).toFixed(1)}<span className="text-dark-500 text-xs">({barber.total_reviews})</span></>
                          ) : (
                            <span className="text-dark-500">-</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Services Performance */}
          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Scissors className="w-5 h-5 text-primary-400" /> Serviços Mais Procurados
            </h3>
            {report.services.length === 0 ? (
              <p className="text-dark-500 text-center py-8">Nenhum serviço agendado no período</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {report.services.map(service => (
                  <div key={service.id} className="bg-dark-800 rounded-xl p-4 flex items-center gap-3">
                    <span className="text-3xl">{service.icon}</span>
                    <div className="flex-1">
                      <h4 className="font-semibold text-white">{service.service_name}</h4>
                      <p className="text-xs text-dark-500">{service.times_booked} agendamentos</p>
                    </div>
                    <span className="text-primary-400 font-bold">{formatCurrency(service.revenue)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============ Settings Tab ============
function SettingsTab({ settings, updateSettings, reloadSettings }) {
  const [form, setForm] = useState({
    site_name: settings.site_name || '',
    site_logo: settings.site_logo || '',
    hero_title: settings.hero_title || '',
    hero_subtitle: settings.hero_subtitle || '',
    hero_cta: settings.hero_cta || '',
    footer_text: settings.footer_text || '',
    whatsapp_number: settings.whatsapp_number || '',
    instagram_url: settings.instagram_url || '',
    address: settings.address || '',
  });
  const [gallery, setGallery] = useState([]);
  const [newImage, setNewImage] = useState({ image_url: '', title: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    api.getGallery().then(setGallery).catch(() => {});
  }, []);

  // Inicializar form apenas uma vez quando settings estiver carregado
  useEffect(() => {
    if (!initialized && settings.site_name) {
      setForm({
        site_name: settings.site_name || '',
        site_logo: settings.site_logo || '',
        hero_title: settings.hero_title || '',
        hero_subtitle: settings.hero_subtitle || '',
        hero_cta: settings.hero_cta || '',
        footer_text: settings.footer_text || '',
        whatsapp_number: settings.whatsapp_number || '',
        instagram_url: settings.instagram_url || '',
        address: settings.address || '',
      });
      setInitialized(true);
    }
  }, [settings, initialized]);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateSettings(form);
      toast.success('Configurações salvas com sucesso!');
    } catch (error) {
      toast.error(error.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleAddImage = async (e) => {
    e.preventDefault();
    if (!newImage.image_url) return toast.error('URL da imagem é obrigatória');
    try {
      await api.addGalleryImage(newImage);
      toast.success('Imagem adicionada');
      setNewImage({ image_url: '', title: '', description: '' });
      setGallery(await api.getGallery());
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleDeleteImage = async (id) => {
    if (!confirm('Remover esta imagem?')) return;
    try {
      await api.deleteGalleryImage(id);
      toast.success('Imagem removida');
      setGallery(await api.getGallery());
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleFieldChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-8">
      {/* Site Settings */}
      <form onSubmit={handleSaveSettings}>
        <div className="card">
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary-400" /> Configurações do Site
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="flex items-center gap-2 text-sm text-dark-400 mb-1"><Type className="w-4 h-4" /> Nome do Site</label>
              <input type="text" value={form.site_name} onChange={e => handleFieldChange('site_name', e.target.value)}
                className="input-field" placeholder="BarberShop" />
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm text-dark-400 mb-1"><Image className="w-4 h-4" /> URL da Logo</label>
              <input type="text" value={form.site_logo} onChange={e => handleFieldChange('site_logo', e.target.value)}
                className="input-field" placeholder="https://..." />
              <p className="text-xs text-dark-500 mt-1">
                💡 Use uma URL de imagem válida (Imgur, Cloudinary, etc.) ou deixe vazio para usar o ícone padrão
              </p>
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm text-dark-400 mb-1"><Type className="w-4 h-4" /> Título Principal (Hero)</label>
              <input type="text" value={form.hero_title} onChange={e => handleFieldChange('hero_title', e.target.value)}
                className="input-field" placeholder="Seu Estilo, Nossa Arte" />
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm text-dark-400 mb-1"><Type className="w-4 h-4" /> Texto do Botão (CTA)</label>
              <input type="text" value={form.hero_cta} onChange={e => handleFieldChange('hero_cta', e.target.value)}
                className="input-field" placeholder="Agendar Agora" />
            </div>
            <div className="md:col-span-2">
              <label className="flex items-center gap-2 text-sm text-dark-400 mb-1"><Type className="w-4 h-4" /> Subtítulo (Hero)</label>
              <textarea value={form.hero_subtitle} onChange={e => handleFieldChange('hero_subtitle', e.target.value)}
                className="input-field min-h-[80px]" placeholder="Agende seu corte..." />
            </div>
            <div className="md:col-span-2">
              <label className="flex items-center gap-2 text-sm text-dark-400 mb-1"><Type className="w-4 h-4" /> Texto do Rodapé</label>
              <input type="text" value={form.footer_text} onChange={e => handleFieldChange('footer_text', e.target.value)}
                className="input-field" placeholder="© 2026 BarberShop..." />
            </div>
          </div>

          <hr className="border-dark-700 my-6" />
          <h3 className="text-md font-semibold text-white mb-4">Redes Sociais & Contato</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="flex items-center gap-2 text-sm text-dark-400 mb-1"><MessageCircle className="w-4 h-4" /> WhatsApp</label>
              <input type="text" value={form.whatsapp_number} onChange={e => handleFieldChange('whatsapp_number', e.target.value)}
                className="input-field" placeholder="5511999999999" />
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm text-dark-400 mb-1"><Instagram className="w-4 h-4" /> Instagram URL</label>
              <input type="text" value={form.instagram_url} onChange={e => handleFieldChange('instagram_url', e.target.value)}
                className="input-field" placeholder="https://instagram.com/..." />
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm text-dark-400 mb-1"><MapPin className="w-4 h-4" /> Endereço</label>
              <input type="text" value={form.address} onChange={e => handleFieldChange('address', e.target.value)}
                className="input-field" placeholder="Rua..." />
            </div>
          </div>

          {/* Preview */}
          {form.site_logo && (
            <div className="mt-6 p-4 bg-dark-800 rounded-xl">
              <p className="text-xs text-dark-500 mb-2">Preview da Logo:</p>
              <img src={form.site_logo} alt="Preview" className="w-16 h-16 rounded-xl object-cover"
                onError={(e) => { e.target.style.display = 'none'; }} />
            </div>
          )}

          <div className="mt-6">
            <button type="submit" disabled={saving}
              className="btn-primary py-2.5 flex items-center gap-2 disabled:opacity-50">
              <Save className="w-4 h-4" /> {saving ? 'Salvando...' : 'Salvar Configurações'}
            </button>
          </div>
        </div>
      </form>

      {/* Gallery Management */}
      <div className="card">
        <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
          <Image className="w-5 h-5 text-primary-400" /> Galeria de Imagens
        </h2>

        {/* Add Image */}
        <form onSubmit={handleAddImage} className="bg-dark-800 rounded-xl p-4 mb-6">
          <h3 className="text-sm font-semibold text-white mb-3">Adicionar Imagem</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input value={newImage.image_url} onChange={e => setNewImage({ ...newImage, image_url: e.target.value })}
              className="input-field" placeholder="URL da Imagem *" required />
            <input value={newImage.title} onChange={e => setNewImage({ ...newImage, title: e.target.value })}
              className="input-field" placeholder="Título (opcional)" />
            <input value={newImage.description} onChange={e => setNewImage({ ...newImage, description: e.target.value })}
              className="input-field" placeholder="Descrição (opcional)" />
          </div>
          <p className="text-xs text-dark-500 mt-2">
            💡 Dica: Faça upload das imagens em serviços como <a href="https://imgur.com" target="_blank" rel="noreferrer" className="text-primary-400 hover:underline">Imgur</a> ou <a href="https://cloudinary.com" target="_blank" rel="noreferrer" className="text-primary-400 hover:underline">Cloudinary</a> e cole a URL aqui
          </p>
          <button type="submit" className="btn-primary text-sm py-2 mt-3 flex items-center gap-1">
            <Plus className="w-4 h-4" /> Adicionar
          </button>
        </form>

        {/* Image Grid */}
        {gallery.length === 0 ? (
          <div className="text-center py-8">
            <Image className="w-12 h-12 text-dark-600 mx-auto mb-3" />
            <p className="text-dark-400">Nenhuma imagem na galeria</p>
            <p className="text-xs text-dark-500 mt-1">Adicione fotos de cortes, barba e outros trabalhos</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {gallery.map(img => (
              <div key={img.id} className="relative group rounded-xl overflow-hidden aspect-square bg-dark-800">
                <img src={img.image_url} alt={img.title || ''}
                  className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                  {img.title && <span className="text-white text-sm font-medium">{img.title}</span>}
                  <button onClick={() => handleDeleteImage(img.id)}
                    className="bg-red-600 hover:bg-red-700 text-white text-xs py-1.5 px-3 rounded-lg flex items-center gap-1">
                    <Trash2 className="w-3 h-3" /> Remover
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============ Users Tab ============
function UsersTab({ users, onReload }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');

  const handleRoleChange = async (id, role) => {
    try {
      await api.updateUserRole(id, role);
      toast.success('Papel atualizado');
      onReload();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleToggle = async (id) => {
    try {
      await api.toggleUser(id);
      toast.success('Status atualizado');
      onReload();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const roleBadge = {
    admin: 'bg-red-400/10 text-red-400',
    barber: 'bg-primary-400/10 text-primary-400',
    client: 'bg-blue-400/10 text-blue-400',
  };

  const filtered = users.filter(u => {
    if (filterRole !== 'all' && u.role !== filterRole) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        u.name?.toLowerCase().includes(term) ||
        u.email?.toLowerCase().includes(term) ||
        u.phone?.includes(term)
      );
    }
    return true;
  });

  const stats = {
    total: users.length,
    clients: users.filter(u => u.role === 'client').length,
    barbers: users.filter(u => u.role === 'barber').length,
    admins: users.filter(u => u.role === 'admin').length,
  };

  return (
    <div>
      <h2 className="text-xl font-semibold text-white mb-4">Usuários</h2>

      {/* Stats mini cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="bg-dark-800 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-white">{stats.total}</p>
          <p className="text-xs text-dark-500">Total</p>
        </div>
        <div className="bg-blue-500/10 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-blue-400">{stats.clients}</p>
          <p className="text-xs text-blue-400/60">Clientes</p>
        </div>
        <div className="bg-primary-500/10 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-primary-400">{stats.barbers}</p>
          <p className="text-xs text-primary-400/60">Barbeiros</p>
        </div>
        <div className="bg-red-500/10 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-red-400">{stats.admins}</p>
          <p className="text-xs text-red-400/60">Admins</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-dark-500 mb-1">Buscar</label>
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="input-field text-sm py-2"
              placeholder="Nome, email, telefone..."
            />
          </div>
          <div>
            <label className="block text-xs text-dark-500 mb-1">Papel</label>
            <select
              value={filterRole}
              onChange={e => setFilterRole(e.target.value)}
              className="input-field text-sm py-2"
            >
              <option value="all">Todos</option>
              <option value="client">Clientes</option>
              <option value="barber">Barbeiros</option>
              <option value="admin">Admins</option>
            </select>
          </div>
        </div>
      </div>

      <p className="text-sm text-dark-500 mb-3">{filtered.length} usuário(s) encontrado(s)</p>

      <div className="space-y-3">
        {filtered.map(u => (
          <div key={u.id} className={`card ${!u.active ? 'opacity-50' : ''}`}>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-dark-800 flex items-center justify-center flex-shrink-0">
                {u.avatar_url ? (
                  <img src={u.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <Users className="w-5 h-5 text-dark-500" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-white">{u.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleBadge[u.role]}`}>
                    {u.role}
                  </span>
                  {!u.active && <span className="text-xs text-red-400">(desativado)</span>}
                </div>
                <p className="text-sm text-dark-400 mt-1">
                  {u.email && `📧 ${u.email}`} {u.phone && `📱 ${u.phone}`}
                </p>
                <p className="text-xs text-dark-600 mt-0.5">Cadastrado em {new Date(u.created_at).toLocaleDateString('pt-BR')}</p>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={u.role}
                  onChange={(e) => handleRoleChange(u.id, e.target.value)}
                  className="input-field text-sm py-1.5 px-2 w-auto"
                >
                  <option value="client">Cliente</option>
                  <option value="barber">Barbeiro</option>
                  <option value="admin">Admin</option>
                </select>
                <button onClick={() => handleToggle(u.id)}
                  className={`text-xs py-1.5 px-3 rounded-lg font-medium transition-all ${
                    u.active ? 'bg-red-600/20 text-red-400 hover:bg-red-600/30' : 'bg-green-600/20 text-green-400 hover:bg-green-600/30'
                  }`}>
                  {u.active ? 'Desativar' : 'Ativar'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
