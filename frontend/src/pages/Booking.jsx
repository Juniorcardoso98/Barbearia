import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../api';
import toast from 'react-hot-toast';
import {
  Scissors, Clock, DollarSign, User, Calendar, ChevronLeft, ChevronRight,
  Check, Shuffle, MessageSquare, Star
} from 'lucide-react';

const DAYS_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS_PT = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

export default function Booking() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [services, setServices] = useState([]);
  const [barbers, setBarbers] = useState([]);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [selected, setSelected] = useState({
    service: null,
    barber: null,
    date: '',
    time: null,
    notes: ''
  });

  const [barberRatings, setBarberRatings] = useState({});

  // Calendar state
  const today = new Date();
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [calYear, setCalYear] = useState(today.getFullYear());

  useEffect(() => {
    Promise.all([api.getServices(), api.getBarbers()])
      .then(([s, b]) => {
        setServices(s);
        setBarbers(b);
        // Load ratings for all barbers
        b.forEach(barber => {
          api.getBarberReviews(barber.id)
            .then(data => {
              setBarberRatings(prev => ({
                ...prev,
                [barber.id]: { average: data.average, total: data.total }
              }));
            })
            .catch(() => {});
        });
      })
      .catch(() => toast.error('Erro ao carregar dados'));
  }, []);

  // Fetch slots when barber and date are selected
  useEffect(() => {
    if (selected.barber && selected.date && selected.service) {
      setLoadingSlots(true);
      const barberId = selected.barber === 'random' ? barbers[0]?.id : selected.barber.id;
      if (barberId) {
        api.getBarberSlots(barberId, selected.date, selected.service.duration_minutes)
          .then(data => setSlots(data.slots || []))
          .catch(() => setSlots([]))
          .finally(() => setLoadingSlots(false));
      }
    }
  }, [selected.barber, selected.date, selected.service]);

  const handleBooking = async () => {
    setLoading(true);
    try {
      const appointmentData = {
        service_id: selected.service.id,
        barber_id: selected.barber === 'random' ? 'random' : selected.barber.id,
        appointment_date: selected.date,
        start_time: selected.time.start_time,
        notes: selected.notes,
      };

      await api.createAppointment(appointmentData);
      toast.success('Agendamento realizado com sucesso! 🎉');
      navigate('/meus-agendamentos');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Calendar helpers
  const getDaysInMonth = (month, year) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (month, year) => new Date(year, month, 1).getDay();

  const isDateDisabled = (day) => {
    const date = new Date(calYear, calMonth, day);
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    if (date < todayStart) return true;
    // Check if barber works on this day
    if (selected.barber && selected.barber !== 'random') {
      const dayOfWeek = date.getDay();
      return !selected.barber.schedules?.some(s => s.day_of_week === dayOfWeek);
    }
    // If random, disable Sundays
    if (selected.barber === 'random') return date.getDay() === 0;
    return false;
  };

  const formatDateStr = (day) => {
    return `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(calMonth, calYear);
    const firstDay = getFirstDayOfMonth(calMonth, calYear);
    const cells = [];

    for (let i = 0; i < firstDay; i++) {
      cells.push(<div key={`empty-${i}`} />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = formatDateStr(day);
      const disabled = isDateDisabled(day);
      const isSelected = selected.date === dateStr;
      const isToday = day === today.getDate() && calMonth === today.getMonth() && calYear === today.getFullYear();

      cells.push(
        <button
          key={day}
          disabled={disabled}
          onClick={() => {
            setSelected(s => ({ ...s, date: dateStr, time: null }));
            setSlots([]);
          }}
          className={`
            aspect-square rounded-xl text-sm font-medium transition-all
            ${disabled ? 'text-dark-600 cursor-not-allowed' : 'hover:bg-primary-500/20 cursor-pointer'}
            ${isSelected ? 'bg-primary-500 text-white hover:bg-primary-600' : ''}
            ${isToday && !isSelected ? 'ring-1 ring-primary-500 text-primary-400' : ''}
          `}
        >
          {day}
        </button>
      );
    }

    return cells;
  };

  const stepTitles = ['Escolha o Serviço', 'Escolha o Barbeiro', 'Data e Horário', 'Confirmação'];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-fadeIn">
      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-10 max-w-lg mx-auto">
        {stepTitles.map((title, i) => (
          <div key={i} className="flex items-center">
            <div className={`
              w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all
              ${step > i + 1 ? 'bg-green-500 text-white' : step === i + 1 ? 'bg-primary-500 text-white animate-pulse-glow' : 'bg-dark-800 text-dark-500'}
            `}>
              {step > i + 1 ? <Check className="w-5 h-5" /> : i + 1}
            </div>
            {i < 3 && (
              <div className={`hidden sm:block w-12 md:w-20 h-0.5 ${step > i + 1 ? 'bg-green-500' : 'bg-dark-700'}`} />
            )}
          </div>
        ))}
      </div>

      <h2 className="text-2xl font-display font-bold text-white text-center mb-8">
        {stepTitles[step - 1]}
      </h2>

      {/* Step 1: Select Service */}
      {step === 1 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-slideUp">
          {services.map(service => (
            <button
              key={service.id}
              onClick={() => { setSelected(s => ({ ...s, service })); setStep(2); }}
              className={`card-hover text-left ${selected.service?.id === service.id ? 'border-primary-500 bg-primary-500/5' : ''}`}
            >
              <div className="flex items-start gap-4">
                <div className="text-3xl">{service.icon}</div>
                <div className="flex-1">
                  <h3 className="font-semibold text-white mb-1">{service.name}</h3>
                  <p className="text-sm text-dark-400 mb-3">{service.description}</p>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-primary-400 font-bold flex items-center gap-1">
                      <DollarSign className="w-4 h-4" /> R$ {service.price.toFixed(2)}
                    </span>
                    <span className="text-dark-500 flex items-center gap-1">
                      <Clock className="w-4 h-4" /> {service.duration_minutes}min
                    </span>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Step 2: Select Barber */}
      {step === 2 && (
        <div className="space-y-4 animate-slideUp">
          {/* Random option */}
          <button
            onClick={() => { setSelected(s => ({ ...s, barber: 'random' })); setStep(3); }}
            className="card-hover w-full text-left"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-primary-500/20 rounded-full flex items-center justify-center">
                <Shuffle className="w-6 h-6 text-primary-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Qualquer Barbeiro Disponível</h3>
                <p className="text-sm text-dark-400">O sistema escolherá automaticamente um barbeiro livre</p>
              </div>
            </div>
          </button>

          <div className="text-center text-dark-500 text-sm">ou escolha um profissional</div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {barbers.map(barber => {
              const rating = barberRatings[barber.id];
              return (
                <button
                  key={barber.id}
                  onClick={() => { setSelected(s => ({ ...s, barber })); setStep(3); }}
                  className="card-hover text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-dark-800 rounded-full flex items-center justify-center">
                      {barber.avatar_url ? (
                        <img src={barber.avatar_url} alt={barber.name} className="w-14 h-14 rounded-full object-cover" />
                      ) : (
                        <User className="w-6 h-6 text-dark-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-white">{barber.name}</h3>
                      {rating && rating.total > 0 && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm text-yellow-400 font-semibold">{Number(rating.average).toFixed(1)}</span>
                          <span className="text-xs text-dark-500">({rating.total} avaliações)</span>
                        </div>
                      )}
                      <p className="text-xs text-dark-500 mt-0.5">
                        {barber.schedules?.length > 0
                          ? `Trabalha ${barber.schedules.map(s => DAYS_PT[s.day_of_week]).join(', ')}`
                          : 'Sem horários definidos'}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <button onClick={() => setStep(1)} className="btn-secondary w-full sm:w-auto mt-4">
            <ChevronLeft className="w-4 h-4 inline mr-1" /> Voltar
          </button>
        </div>
      )}

      {/* Step 3: Date & Time */}
      {step === 3 && (
        <div className="animate-slideUp">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Calendar */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); } else setCalMonth(m => m - 1); }}
                  className="p-2 hover:bg-dark-800 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-dark-400" />
                </button>
                <h3 className="font-semibold text-white">
                  {MONTHS_PT[calMonth]} {calYear}
                </h3>
                <button
                  onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); } else setCalMonth(m => m + 1); }}
                  className="p-2 hover:bg-dark-800 rounded-lg transition-colors"
                >
                  <ChevronRight className="w-5 h-5 text-dark-400" />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1 mb-2">
                {DAYS_PT.map(day => (
                  <div key={day} className="text-center text-xs text-dark-500 font-medium py-2">{day}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {renderCalendar()}
              </div>
            </div>

            {/* Time Slots */}
            <div className="card">
              <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary-400" />
                Horários Disponíveis
              </h3>

              {!selected.date ? (
                <p className="text-dark-500 text-center py-8">Selecione uma data no calendário</p>
              ) : loadingSlots ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary-500"></div>
                </div>
              ) : slots.length === 0 ? (
                <p className="text-dark-500 text-center py-8">Nenhum horário disponível nesta data</p>
              ) : (
                <div className="grid grid-cols-3 gap-2 max-h-[300px] overflow-y-auto pr-2">
                  {slots.map(slot => (
                    <button
                      key={slot.start_time}
                      disabled={!slot.available}
                      onClick={() => setSelected(s => ({ ...s, time: slot }))}
                      className={`
                        py-2.5 px-3 rounded-xl text-sm font-medium transition-all
                        ${!slot.available ? 'bg-dark-800 text-dark-600 cursor-not-allowed line-through' : ''}
                        ${slot.available && selected.time?.start_time !== slot.start_time ? 'bg-dark-800 text-white hover:bg-primary-500/20 hover:text-primary-400' : ''}
                        ${selected.time?.start_time === slot.start_time ? 'bg-primary-500 text-white' : ''}
                      `}
                    >
                      {slot.start_time}
                    </button>
                  ))}
                </div>
              )}

              {/* Notes */}
              <div className="mt-4">
                <label className="block text-sm text-dark-400 mb-1">
                  <MessageSquare className="w-4 h-4 inline mr-1" /> Observações (opcional)
                </label>
                <textarea
                  value={selected.notes}
                  onChange={(e) => setSelected(s => ({ ...s, notes: e.target.value }))}
                  className="input-field text-sm h-20 resize-none"
                  placeholder="Ex: Quero o corte mais curto nas laterais..."
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button onClick={() => setStep(2)} className="btn-secondary">
              <ChevronLeft className="w-4 h-4 inline mr-1" /> Voltar
            </button>
            <button
              onClick={() => setStep(4)}
              disabled={!selected.date || !selected.time}
              className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continuar <ChevronRight className="w-4 h-4 inline ml-1" />
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Confirmation */}
      {step === 4 && (
        <div className="max-w-lg mx-auto animate-slideUp">
          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-6 text-center">Resumo do Agendamento</h3>

            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-dark-950 rounded-xl">
                <div className="text-2xl">{selected.service?.icon}</div>
                <div className="flex-1">
                  <p className="text-sm text-dark-400">Serviço</p>
                  <p className="font-semibold text-white">{selected.service?.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-primary-400 font-bold">R$ {selected.service?.price.toFixed(2)}</p>
                  <p className="text-xs text-dark-500">{selected.service?.duration_minutes}min</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 bg-dark-950 rounded-xl">
                <div className="w-10 h-10 bg-dark-800 rounded-full flex items-center justify-center">
                  {selected.barber === 'random' ? (
                    <Shuffle className="w-5 h-5 text-primary-400" />
                  ) : (
                    <User className="w-5 h-5 text-dark-400" />
                  )}
                </div>
                <div>
                  <p className="text-sm text-dark-400">Barbeiro</p>
                  <p className="font-semibold text-white">
                    {selected.barber === 'random' ? 'Qualquer disponível' : selected.barber?.name}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 bg-dark-950 rounded-xl">
                <div className="w-10 h-10 bg-dark-800 rounded-full flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-primary-400" />
                </div>
                <div>
                  <p className="text-sm text-dark-400">Data e Horário</p>
                  <p className="font-semibold text-white">
                    {selected.date?.split('-').reverse().join('/')} às {selected.time?.start_time}
                  </p>
                </div>
              </div>

              {selected.notes && (
                <div className="p-4 bg-dark-950 rounded-xl">
                  <p className="text-sm text-dark-400">Observações</p>
                  <p className="text-white">{selected.notes}</p>
                </div>
              )}
            </div>

            <div className="mt-6 p-3 bg-primary-500/10 rounded-xl border border-primary-500/20">
              <p className="text-xs text-primary-300 text-center">
                📱 Você receberá um lembrete via WhatsApp 2 horas antes do agendamento.
                Cancelamento permitido até 2h antes.
              </p>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button onClick={() => setStep(3)} className="btn-secondary">
              <ChevronLeft className="w-4 h-4 inline mr-1" /> Voltar
            </button>
            <button
              onClick={handleBooking}
              disabled={loading}
              className="btn-primary flex-1 disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white"></div>
                  Confirmando...
                </span>
              ) : (
                <>
                  <Check className="w-5 h-5 inline mr-1" /> Confirmar Agendamento
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
