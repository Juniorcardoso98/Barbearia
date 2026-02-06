import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../api';
import toast from 'react-hot-toast';
import { Calendar, Clock, User, XCircle, CheckCircle, AlertCircle, Plus, Star, MessageCircle, Phone } from 'lucide-react';

const STATUS_MAP = {
  confirmed: { label: 'Confirmado', color: 'text-green-400 bg-green-400/10', icon: CheckCircle },
  cancelled: { label: 'Cancelado', color: 'text-red-400 bg-red-400/10', icon: XCircle },
  completed: { label: 'Concluído', color: 'text-blue-400 bg-blue-400/10', icon: CheckCircle },
  reviewed: { label: 'Avaliado', color: 'text-purple-400 bg-purple-400/10', icon: Star },
  no_show: { label: 'Não compareceu', color: 'text-yellow-400 bg-yellow-400/10', icon: AlertCircle },
};

export default function MyAppointments() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [reviewModal, setReviewModal] = useState(null);
  const [reviewForm, setReviewForm] = useState({ rating: 0, comment: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadAppointments();
  }, []);

  const loadAppointments = async () => {
    try {
      const data = await api.getAppointments();
      setAppointments(data);
    } catch (error) {
      toast.error('Erro ao carregar agendamentos');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id) => {
    if (!confirm('Tem certeza que deseja cancelar este agendamento?')) return;

    try {
      await api.cancelAppointment(id);
      toast.success('Agendamento cancelado');
      loadAppointments();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await api.updateAppointmentStatus(id, status);
      toast.success('Status atualizado');
      loadAppointments();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const openReviewModal = (apt) => {
    setReviewModal(apt);
    setReviewForm({ rating: 0, comment: '' });
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (reviewForm.rating === 0) {
      return toast.error('Selecione uma avaliação de 1 a 5 estrelas');
    }

    setSubmitting(true);
    try {
      await api.addReview(reviewModal.id, reviewForm.rating, reviewForm.comment);
      toast.success('Avaliação enviada com sucesso!');
      setReviewModal(null);
      loadAppointments();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const canCancel = (apt) => {
    if (apt.status !== 'confirmed') return false;
    if (['admin', 'barber'].includes(user?.role)) return true;
    const aptDate = new Date(`${apt.appointment_date}T${apt.start_time}:00`);
    const hoursUntil = (aptDate - new Date()) / (1000 * 60 * 60);
    return hoursUntil >= 2;
  };

  const filtered = filter === 'all'
    ? appointments
    : appointments.filter(a => a.status === filter);

  const upcomingCount = appointments.filter(a => {
    if (a.status !== 'confirmed') return false;
    const aptDate = new Date(`${a.appointment_date}T${a.start_time}:00`);
    return aptDate > new Date();
  }).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary-500"></div>
      </div>
    );
  }

  const isBarber = user?.role === 'barber';

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-fadeIn">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-white">
            {isBarber ? 'Agendamentos Clientes' : 'Meus Agendamentos'}
          </h1>
          <p className="text-dark-400 mt-1">
            {isBarber 
              ? `${upcomingCount > 0 ? `${upcomingCount} agendamento(s) confirmado(s)` : 'Nenhum agendamento pendente'}`
              : `${upcomingCount > 0 ? `${upcomingCount} agendamento(s) próximo(s)` : 'Nenhum agendamento próximo'}`
            }
          </p>
        </div>
        <Link to="/agendar" className="btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" /> Novo Agendamento
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {[
          { key: 'all', label: 'Todos' },
          { key: 'confirmed', label: 'Confirmados' },
          { key: 'completed', label: 'Concluídos' },
          { key: 'cancelled', label: 'Cancelados' },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              filter === f.key 
                ? 'bg-primary-500 text-white' 
                : 'bg-dark-800 text-dark-400 hover:text-white'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Appointments List */}
      {filtered.length === 0 ? (
        <div className="card text-center py-16">
          <Calendar className="w-16 h-16 text-dark-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-dark-400 mb-2">
            {isBarber ? 'Nenhum agendamento de cliente' : 'Nenhum agendamento encontrado'}
          </h3>
          {!isBarber && (
            <>
              <p className="text-dark-500 mb-6">Que tal agendar um novo serviço?</p>
              <Link to="/agendar" className="btn-primary inline-flex items-center gap-2">
                <Plus className="w-5 h-5" /> Agendar Agora
              </Link>
            </>
          )}
          {isBarber && (
            <p className="text-dark-500">Quando clientes agendarem com você, os agendamentos aparecerão aqui.</p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(apt => {
            const isPast = new Date(`${apt.appointment_date}T${apt.start_time}:00`) < new Date();

            // Determine display status: if completed + reviewed, show as 'reviewed'
            const displayStatus = (apt.status === 'completed' && apt.has_review) ? 'reviewed' : apt.status;
            const statusInfo = STATUS_MAP[displayStatus] || STATUS_MAP[apt.status];
            const DisplayStatusIcon = statusInfo.icon;

            return (
              <div key={apt.id} className={`card ${isPast && apt.status === 'confirmed' ? 'opacity-60' : ''}`}>
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  {/* Service Icon */}
                  <div className="text-3xl">{apt.service_icon}</div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-white">{apt.service_name}</h3>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>
                        <DisplayStatusIcon className="w-3 h-3" />
                        {statusInfo.label}
                      </span>
                      {apt.has_review && apt.review_rating && (
                        <span className="inline-flex items-center gap-0.5 text-xs text-yellow-400">
                          <Star className="w-3 h-3 fill-yellow-400" /> {apt.review_rating}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-dark-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {apt.appointment_date.split('-').reverse().join('/')}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {apt.start_time} - {apt.end_time}
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        {user.role === 'client' ? apt.barber_name : apt.client_name}
                      </span>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="text-right">
                    <span className="text-primary-400 font-bold">R$ {apt.service_price?.toFixed(2)}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 flex-wrap">
                    {/* Cancel - Client (2h+ antes) */}
                    {user?.role === 'client' && apt.status === 'confirmed' && (
                      <button
                        onClick={() => handleCancel(apt.id)}
                        disabled={!canCancel(apt)}
                        title={!canCancel(apt) ? 'Cancelamento permitido apenas com 2h+ de antecedência' : 'Cancelar agendamento'}
                        className={`text-xs font-medium py-2 px-3 rounded-lg transition-all flex items-center gap-1 ${
                          canCancel(apt)
                            ? 'bg-red-600 hover:bg-red-700 text-white'
                            : 'bg-dark-800 text-dark-500 cursor-not-allowed'
                        }`}
                      >
                        <XCircle className="w-4 h-4" /> Cancelar
                      </button>
                    )}

                    {/* Cancel - Admin/Barber */}
                    {['admin', 'barber'].includes(user?.role) && apt.status === 'confirmed' && (
                      <>
                        <button
                          onClick={() => handleCancel(apt.id)}
                          className="bg-red-600 hover:bg-red-700 text-white text-xs font-medium py-2 px-3 rounded-lg transition-all flex items-center gap-1"
                        >
                          <XCircle className="w-4 h-4" /> Cancelar
                        </button>
                        <button
                          onClick={() => handleStatusChange(apt.id, 'completed')}
                          className="bg-green-600 hover:bg-green-700 text-white text-xs font-medium py-2 px-3 rounded-lg transition-all flex items-center gap-1"
                        >
                          <CheckCircle className="w-4 h-4" /> Concluir
                        </button>
                      </>
                    )}

                    {/* WhatsApp - Admin/Barber can contact client */}
                    {['admin', 'barber'].includes(user?.role) && apt.client_phone && (
                      <a
                        href={`https://wa.me/55${apt.client_phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                          `Olá ${apt.client_name}! Sobre seu agendamento de ${apt.service_name} no dia ${apt.appointment_date.split('-').reverse().join('/')} às ${apt.start_time}.`
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                        className="bg-green-600 hover:bg-green-700 text-white text-xs font-medium py-2 px-3 rounded-lg transition-all flex items-center gap-1"
                        title="Contatar via WhatsApp"
                      >
                        <MessageCircle className="w-4 h-4" /> WhatsApp
                      </a>
                    )}

                    {/* Review Button - For completed appointments without review */}
                    {user?.role === 'client' && apt.status === 'completed' && !apt.has_review && (
                      <button
                        onClick={() => openReviewModal(apt)}
                        className="bg-primary-500 hover:bg-primary-600 text-white text-xs font-medium py-2 px-3 rounded-lg transition-all flex items-center gap-1"
                      >
                        <Star className="w-4 h-4" /> Avaliar
                      </button>
                    )}
                  </div>
                </div>

                {apt.notes && (
                  <div className="mt-3 pt-3 border-t border-dark-700">
                    <p className="text-xs text-dark-500">
                      <span className="font-medium">Obs:</span> {apt.notes}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Review Modal */}
      {reviewModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-dark-900 rounded-2xl max-w-md w-full p-6 border border-dark-700 animate-slideUp">
            <h3 className="text-xl font-semibold text-white mb-4">Avaliar Atendimento</h3>
            
            <div className="mb-4">
              <p className="text-sm text-dark-400 mb-1">Serviço: <span className="text-white">{reviewModal.service_name}</span></p>
              <p className="text-sm text-dark-400">Barbeiro: <span className="text-white">{reviewModal.barber_name}</span></p>
            </div>

            <form onSubmit={handleSubmitReview} className="space-y-4">
              {/* Star Rating */}
              <div>
                <label className="block text-sm text-dark-400 mb-2">Como foi sua experiência?</label>
                <div className="flex gap-2 justify-center py-3">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewForm({ ...reviewForm, rating: star })}
                      className="transition-transform hover:scale-110"
                    >
                      <Star
                        className={`w-10 h-10 ${
                          star <= reviewForm.rating
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-dark-600 hover:text-yellow-400'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                {reviewForm.rating > 0 && (
                  <p className="text-center text-sm text-dark-400 mt-1">
                    {reviewForm.rating === 1 && 'Muito insatisfeito'}
                    {reviewForm.rating === 2 && 'Insatisfeito'}
                    {reviewForm.rating === 3 && 'Neutro'}
                    {reviewForm.rating === 4 && 'Satisfeito'}
                    {reviewForm.rating === 5 && 'Muito satisfeito'}
                  </p>
                )}
              </div>

              {/* Comment */}
              <div>
                <label className="block text-sm text-dark-400 mb-1">Comentário (opcional)</label>
                <textarea
                  value={reviewForm.comment}
                  onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                  className="input-field min-h-[100px] resize-none"
                  placeholder="Conte como foi sua experiência..."
                  maxLength={500}
                />
                <p className="text-xs text-dark-500 mt-1 text-right">{reviewForm.comment.length}/500</p>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setReviewModal(null)}
                  className="btn-secondary flex-1"
                  disabled={submitting}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary flex-1 disabled:opacity-50"
                  disabled={submitting || reviewForm.rating === 0}
                >
                  {submitting ? 'Enviando...' : 'Enviar Avaliação'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
