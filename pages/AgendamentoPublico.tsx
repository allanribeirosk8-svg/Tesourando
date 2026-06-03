import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  Scissors, 
  ChevronLeft, 
  Check, 
  User, 
  Instagram,
  Loader2,
  CalendarDays,
  Clock,
  AlertTriangle,
  Smartphone,
  MessageSquare,
  MapPin,
  ArrowRight,
  X
} from 'lucide-react';
import { formatCurrency, generateTimeSlots } from '../utils/helpers';

interface BarberProfile {
  id: string;
  name: string;
  shop_name: string | null;
  description: string | null;
  photo: string | null;
  logo: string | null;
  instagram: string | null;
  slug: string;
}

interface Service {
  id: string;
  name: string;
  price: number;
  duration: number;
  order_index: number;
  user_id: string;
}

interface WeeklySchedule {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_open: boolean;
  user_id: string;
}

interface WeeklyBreak {
  id: string;
  day_of_week: number;
  time: string;
  user_id: string;
}

interface BlockedSlot {
  date: string;
  time: string;
  user_id: string;
}

interface ExistingAppointment {
  date: string;
  time: string;
  duration: number;
  status: string;
}

export default function AgendamentoPublico() {
  const { slug } = useParams();
  const [step, setStep] = useState(0); // 0=Loading, 1=Services, 2=Date, 3=Time, 4=Form, 5=Success, 6=Error
  const [profile, setProfile] = useState<BarberProfile | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [schedule, setSchedule] = useState<WeeklySchedule[]>([]);
  
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(''); // YYYY-MM-DD
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [selectedTime, setSelectedTime] = useState<string>(''); // HH:MM
  
  const [weekOffset, setWeekOffset] = useState(0);
  const [activeShift, setActiveShift] = useState('manha');
  const [showAllTimes, setShowAllTimes] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [modalYearMonth, setModalYearMonth] = useState({ year: new Date().getFullYear(), month: new Date().getMonth() });
  const MAX_WEEK_OFFSET = 4;
  
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [observation, setObservation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [dateLoading, setDateLoading] = useState(false);

  // Masks
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);
    if (value.length > 2) value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
    if (value.length > 10) value = `${value.slice(0, 10)}-${value.slice(10)}`;
    setClientPhone(value);
  };

  useEffect(() => {
    async function loadData() {
      if (!slug) {
        setStep(6);
        return;
      }
      try {
        const { data: prof, error: profErr } = await supabase
          .from('profiles')
          .select('id, name, shop_name, description, photo, logo, instagram, slug')
          .eq('slug', slug)
          .single();
          
        if (profErr || !prof) throw new Error('Barbeiro não encontrado');
        setProfile(prof);

        const { data: serv, error: servErr } = await supabase
          .from('services')
          .select('*')
          .eq('user_id', prof.id)
          .order('order_index');
        
        if (!servErr && serv) {
          setServices(serv);
          if (serv.length === 1) {
            setSelectedService(serv[0]);
          }
        }

        const { data: sched, error: schedErr } = await supabase
          .from('weekly_schedule')
          .select('*')
          .eq('user_id', prof.id);
        
        if (!schedErr && sched) setSchedule(sched);

        setStep(1);
      } catch (err) {
        console.error(err);
        setStep(6);
      }
    }
    loadData();
  }, [slug]);

  // Load available times for a selected date
  useEffect(() => {
    if (!selectedDate || !profile || !selectedService) return;
    
    async function loadSlots() {
      setDateLoading(true);
      try {
        const dateObj = new Date(selectedDate + 'T00:00:00'); // Force local time visually
        const dayOfWeek = dateObj.getDay();
        
        const dayConfig = schedule.find(s => s.day_of_week === dayOfWeek);
        if (!dayConfig || !dayConfig.is_open) {
          setAvailableSlots([]);
          setDateLoading(false);
          return;
        }

        const [breaksRes, blockedRes, existingRes] = await Promise.all([
          supabase.from('weekly_breaks').select('time').eq('user_id', profile.id).eq('day_of_week', dayOfWeek),
          supabase.from('blocked_slots').select('time').eq('user_id', profile.id).eq('date', selectedDate),
          supabase.from('appointments').select('time, duration, status').eq('user_id', profile.id).eq('date', selectedDate).not('status', 'in', '("cancelled","no-show")')
        ]);

        const breaks = breaksRes.data?.map(b => b.time.substring(0, 5)) || [];
        const blocked = blockedRes.data?.map(b => b.time.substring(0, 5)) || [];
        const existingInfo = existingRes.data || [];

        // Generate base slots based on service duration or standard 30 min (fallback)
        const allSlots = generateTimeSlots(dayConfig.start_time, dayConfig.end_time);
        
        // Helper to convert HH:MM to minutes
        const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
        const endDayMin = toMin(dayConfig.end_time.substring(0, 5));

        const invalidSlots = new Set<string>();
        
        allSlots.forEach(slot => {
          const slotMin = toMin(slot);
          const slotEndMin = slotMin + selectedService.duration;
          
          if (slotEndMin > endDayMin) {
             invalidSlots.add(slot);
          }
          
          if (breaks.includes(slot) || blocked.includes(slot)) {
            invalidSlots.add(slot);
          }
          
          existingInfo.forEach(apt => {
            const aptMin = toMin(apt.time.substring(0, 5));
            const aptEndMin = aptMin + (apt.duration || 30);
            
            // Check overlap
            if (slotMin < aptEndMin && slotEndMin > aptMin) {
              invalidSlots.add(slot);
            }
          });
        });

        const now = new Date();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const currentMin = now.getHours() * 60 + now.getMinutes();

        const available = allSlots.filter(s => {
          if (invalidSlots.has(s)) return false;
          // Block past times if today
          if (selectedDate === todayStr) {
             if (toMin(s) <= currentMin) return false;
          }
          return true;
        });

        setAvailableSlots(available);
        
        // Compute best starting shift
        if (available.length > 0) {
          const TURNOS_LOCAL: Record<string, {inicio: number, fim: number}> = {
            manha: { inicio: 6, fim: 12 },
            tarde: { inicio: 12, fim: 18 },
            noite: { inicio: 18, fim: 24 }
          };
          const counts: Record<string, number> = { manha: 0, tarde: 0, noite: 0 };
          available.forEach(t => {
            const h = parseInt(t.split(':')[0], 10);
            if (h >= TURNOS_LOCAL.manha.inicio && h < TURNOS_LOCAL.manha.fim) counts.manha++;
            if (h >= TURNOS_LOCAL.tarde.inicio && h < TURNOS_LOCAL.tarde.fim) counts.tarde++;
            if (h >= TURNOS_LOCAL.noite.inicio && h < TURNOS_LOCAL.noite.fim) counts.noite++;
          });
          
          let bestShift = 'manha';
          let maxCount = -1;
          Object.entries(counts).forEach(([shift, count]) => {
             if (count > maxCount) {
                 maxCount = count;
                 bestShift = shift;
             }
          });
          
          if (selectedDate === todayStr && now.getHours() >= 12 && counts.tarde > 0) setActiveShift('tarde');
          else if (selectedDate === todayStr && now.getHours() >= 18 && counts.noite > 0) setActiveShift('noite');
          else if (maxCount > 0) setActiveShift(bestShift);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setDateLoading(false);
      }
    }
    
    loadSlots();
  }, [selectedDate, schedule, profile, selectedService]);


  const submitAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    const phoneObj = clientPhone.replace(/\D/g, '');
    const cleanName = clientName.trim();
    
    if (cleanName.split(' ').length < 2) {
       setErrorMessage('Por favor, insira nome e sobrenome.');
       return;
    }
    if (phoneObj.length < 10) {
       setErrorMessage('Por favor, insira um WhatsApp válido.');
       return;
    }
    
    setIsSubmitting(true);
    setErrorMessage('');
    
    try {
      const { error } = await supabase.from('appointments').insert({
        user_id: profile!.id,
        client_name: cleanName,
        phone: phoneObj,
        service: selectedService!.name,
        price: selectedService!.price,
        duration: selectedService!.duration,
        date: selectedDate,
        time: selectedTime + ':00',
        status: 'pending',
        observation: observation.trim() || null,
        is_exceptional: false,
      });

      if (error) {
        if (error.code === '23505' || error.message.includes('unique') || error.message.includes('overlapping')) {
          setErrorMessage('Este horário acabou de ser ocupado. Escolha outro.');
          setStep(1);
        } else {
          setErrorMessage('Erro ao agendar, tente novamente.');
        }
      } else {
        supabase
          .from('notifications')
          .insert({
            user_id: profile!.id,
            type: 'new_appointment',
            title: '📅 Novo agendamento!',
            body: `${cleanName} agendou ${selectedService!.name} às ${selectedTime}`,
            data: {
              client_name: cleanName,
              service: selectedService!.name,
              date: selectedDate,
              time: selectedTime,
            },
            read: false,
          })
          .then(() => {})
          .catch(console.error);
        
        setStep(5);
      }
    } catch (err) {
      console.error(err);
      setErrorMessage('Erro ao agendar, tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };


  // Helpers mapping
  if (step === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-secondary" />
      </div>
    );
  }

  if (step === 6 || !profile) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-surface rounded-full flex items-center justify-center mb-4 border border-white/8">
          <AlertTriangle className="w-8 h-8 text-title" />
        </div>
        <h1 className="text-xl font-black text-white mb-2">Link inválido</h1>
        <p className="text-title">Este barbeiro não foi encontrado ou o link expirou.</p>
      </div>
    );
  }

  const renderHeader = (showBackButton = false, compact = false, onBack?: () => void) => (
    <div className={`flex items-center gap-4 ${compact ? 'pb-3 mb-3' : 'pb-6 mb-6'} border-b border-white/[0.08]`}>
      {showBackButton && (
        <button onClick={onBack || (() => setStep(step - 1))} className="w-10 h-10 rounded-full bg-surface shrink-0 flex items-center justify-center hover:bg-white/5 transition-colors shadow-[0_2px_8px_rgba(0,0,0,0.3)] border border-white/8">
          <ChevronLeft className="text-white" />
        </button>
      )}
      <div className="flex items-center gap-3 w-full">
        <div className={`${compact ? 'w-11 h-11' : 'w-[52px] h-[52px]'} rounded-full bg-surface shrink-0 flex items-center justify-center text-secondary border-[1.5px] border-secondary overflow-hidden p-[2px]`}>
          <div className="w-full h-full rounded-full overflow-hidden">
            {profile.logo || profile.photo ? (
              <img src={profile.logo || profile.photo!} alt={profile.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-surface"><User size={24} /></div>
            )}
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <h1 className={`${compact ? 'text-lg' : 'text-xl'} font-black text-white truncate`}>{profile.shop_name || profile.name}</h1>
          <p className="text-sm text-secondary font-bold truncate">{profile.description || profile.name}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`bg-background w-full ${step === 1 || step === 4 ? 'h-[100dvh] flex flex-col overflow-hidden' : 'min-h-screen'}`}>
      <div className={`max-w-[480px] mx-auto w-full ${step === 1 || step === 4 ? 'flex-1 flex flex-col h-full overflow-hidden' : 'px-4 py-6 pb-20'}`}>
        
        {step === 1 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 flex flex-col h-full">
            <div className="pt-3 px-4 shrink-0">
              {renderHeader(false)}
            </div>
            
            <div className="flex-1 overflow-y-auto pb-4 scrollbar-hide">
              {profile.instagram && (
                <a href={`https://instagram.com/${profile.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-secondary font-bold mb-6 hover:underline px-4">
                  <Instagram size={16} /> {profile.instagram}
                </a>
              )}

              <h2 className="text-sm uppercase tracking-widest font-bold text-title mb-4 flex items-center gap-2 px-4">
                <Scissors size={16} /> Escolha um serviço
              </h2>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide px-4 mb-2">
                {services.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedService(s)}
                    className={`min-w-[120px] h-16 rounded-2xl flex flex-col items-start justify-center px-3 border transition-all shrink-0
                      ${selectedService?.id === s.id ? 'bg-secondary/10 border-2 border-secondary' : 'bg-surface border-white/10'}`}
                  >
                     <span className={`font-semibold text-sm truncate w-full text-left ${selectedService?.id === s.id ? 'text-secondary' : 'text-white'}`}>
                       {s.name}
                     </span>
                     <span className={`text-xs truncate w-full text-left ${selectedService?.id === s.id ? 'text-secondary/70' : 'text-white/50'}`}>
                       {s.duration} min · {formatCurrency(s.price)}
                     </span>
                  </button>
                ))}
              </div>
              {services.length === 1 && (
                <p className="text-center text-title/40 text-[13px] font-medium pt-2 pb-4 px-4">
                  Mais serviços em breve
                </p>
              )}
              {services.length === 0 && (
                <div className="px-4 mb-2">
                  <div className="text-center p-4 bg-surface rounded-2xl border border-white/8">
                    <p className="text-title text-sm">Nenhum serviço cadastrado.</p>
                  </div>
                </div>
              )}

              <div className={`transition-all duration-300 ease-in-out origin-top ${selectedService ? 'opacity-100 scale-y-100 h-auto mt-4' : 'opacity-0 scale-y-0 h-0 overflow-hidden'}`}>
                <div className="flex items-center justify-between mb-2 px-4">
                  <button 
                    onClick={() => setWeekOffset(prev => Math.max(0, prev - 1))}
                    disabled={weekOffset === 0}
                    className={`w-10 h-10 flex items-center justify-center rounded-full transition-all ${weekOffset === 0 ? 'opacity-30 pointer-events-none' : 'text-white/60 hover:bg-white/10 active:scale-95'}`}
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <div className="flex flex-col items-center justify-center">
                    {(() => {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      
                      const start = new Date(today);
                      start.setDate(today.getDate() + weekOffset * 7);
                      
                      const centralDay = new Date(start);
                      centralDay.setDate(start.getDate() + 3); // Middle of the 7-day period
                      
                      const monthStr = centralDay.toLocaleDateString('pt-BR', { month: 'long' });
                      return (
                        <button 
                          onClick={() => setShowCalendarModal(true)}
                          className="flex items-center gap-1 text-white/70 hover:text-white transition-colors active:scale-95"
                        >
                          <span className="font-semibold text-sm capitalize">{monthStr} de {centralDay.getFullYear()}</span>
                          <ChevronLeft className="-rotate-90 opacity-50" size={14} />
                        </button>
                      );
                    })()}
                  </div>
                  <button 
                    onClick={() => setWeekOffset(prev => Math.min(MAX_WEEK_OFFSET, prev + 1))}
                    disabled={weekOffset >= MAX_WEEK_OFFSET}
                    className={`w-10 h-10 flex items-center justify-center rounded-full transition-all ${weekOffset >= MAX_WEEK_OFFSET ? 'opacity-30 pointer-events-none' : 'text-white/60 hover:bg-white/10 active:scale-95'}`}
                  >
                    <ChevronLeft className="rotate-180" size={20} />
                  </button>
                </div>

                <div className="overflow-hidden px-4 mb-2">
                  <div key={weekOffset} className="flex gap-1.5 animate-in slide-in-from-right-4 duration-200 ease-in-out">
                    {(() => {
                      const dates = [];
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      
                      const start = new Date(today);
                      start.setDate(today.getDate() + weekOffset * 7);

                      for (let i = 0; i < 7; i++) {
                        const d = new Date(start);
                        d.setDate(start.getDate() + i);
                        
                        const isToday = d.getTime() === today.getTime();
                        
                        const tomorrow = new Date(today);
                        tomorrow.setDate(today.getDate() + 1);
                        const isTomorrow = d.getTime() === tomorrow.getTime();
                        
                        const isPast = d.getTime() < today.getTime();
                        const dow = d.getDay();
                        const isOpen = schedule.find(sch => sch.day_of_week === dow)?.is_open;
                        
                        dates.push({ d, isToday, isTomorrow, isPast, isOpen, dow, i });
                      }

                      return dates.map(({ d, isToday, isTomorrow, isPast, isOpen, dow, i }) => {
                        const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
                        
                        let w = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"][dow];
                        if (isToday) w = "HOJE";
                        else if (isTomorrow) w = "AMANHÃ";
                        
                        const isDisabled = isPast || !isOpen;
                        
                        // Check if month changes in this specific week, or just always show except for today/tomorrow
                        const monthStr = (!isToday && !isTomorrow) 
                          ? d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '').toUpperCase() 
                          : null;

                        return (
                          <button
                            key={i}
                            disabled={isDisabled}
                            onClick={() => { setSelectedDate(dateStr); setSelectedTime(''); }}
                            className={`flex-1 h-[68px] rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all shrink-0 relative
                              ${isDisabled ? 'opacity-25 pointer-events-none bg-transparent' : 
                                selectedDate === dateStr ? 'bg-secondary shadow-[0_0_12px_rgba(249,148,23,0.4)]' : 
                                'bg-transparent border border-white/10 active:scale-95'}`}
                          >
                            <span className={`${w === 'AMANHÃ' ? 'text-[8px]' : 'text-[9px]'} uppercase font-medium ${selectedDate === dateStr && !isDisabled ? 'text-white' : 'text-white/50'}`}>
                              {w}
                            </span>
                            <span className={`text-lg font-bold ${selectedDate === dateStr && !isDisabled ? 'text-white' : 'text-white'}`}>
                              {d.getDate()}
                            </span>
                            {monthStr && (
                              <span className={`text-[8px] uppercase font-medium ${selectedDate === dateStr && !isDisabled ? 'text-white' : 'text-white/40'}`}>
                                {monthStr}
                              </span>
                            )}
                            {isToday && selectedDate !== dateStr && (
                              <span className="w-1 h-1 rounded-full bg-secondary absolute bottom-1.5" />
                            )}
                          </button>
                        );
                      });
                    })()}
                  </div>
                </div>
              </div>

              <div className={`transition-all duration-300 ease-in-out origin-top ${selectedService && selectedDate ? 'opacity-100 scale-y-100 h-auto mt-4' : 'opacity-0 scale-y-0 h-0 overflow-hidden'}`}>
                <h2 className="text-sm uppercase tracking-widest font-bold text-title mb-4 flex items-center gap-2 px-4">
                  <Clock size={16} /> Horários disponíveis
                </h2>
                
                {dateLoading ? (
                  <div className="flex justify-center p-8"><Loader2 className="animate-spin text-secondary" /></div>
                ) : availableSlots.length === 0 ? (
                  <div className="px-4">
                    <div className="text-center p-8 bg-surface rounded-2xl border border-white/8 shadow-[0_4px_16px_rgba(0,0,0,0.3)]">
                      <p className="text-white font-bold mb-2">Nenhum horário disponível neste dia</p>
                    </div>
                  </div>
                ) : (
                  <div className="px-4 pb-4">
                    {(() => {
                      const TURNOS_LOCAL: Record<string, {label: string, inicio: number, fim: number}> = {
                        manha: { label: 'Manhã', inicio: 6, fim: 12 },
                        tarde: { label: 'Tarde', inicio: 12, fim: 18 },
                        noite: { label: 'Noite', inicio: 18, fim: 24 }
                      };
                      
                      const shiftCounts: Record<string, number> = { manha: 0, tarde: 0, noite: 0 };
                      availableSlots.forEach(t => {
                        const h = parseInt(t.split(':')[0], 10);
                        if (h >= TURNOS_LOCAL.manha.inicio && h < TURNOS_LOCAL.manha.fim) shiftCounts.manha++;
                        else if (h >= TURNOS_LOCAL.tarde.inicio && h < TURNOS_LOCAL.tarde.fim) shiftCounts.tarde++;
                        else if (h >= TURNOS_LOCAL.noite.inicio && h < TURNOS_LOCAL.noite.fim) shiftCounts.noite++;
                      });
                      
                      const activeShiftLimits = TURNOS_LOCAL[activeShift];
                      const currentShiftSlots = availableSlots.filter(t => {
                        const h = parseInt(t.split(':')[0], 10);
                        return h >= activeShiftLimits.inicio && h < activeShiftLimits.fim;
                      });
                      
                      const availableShiftsCount = Object.values(shiftCounts).filter(c => c > 0).length;

                      return (
                        <>
                          {availableShiftsCount > 1 && (
                            <div className="flex gap-2 justify-center mb-3">
                              {Object.entries(TURNOS_LOCAL).map(([key, info]) => {
                                const q = shiftCounts[key];
                                if (q === 0) return null;
                                const isActive = activeShift === key;
                                return (
                                  <button
                                    key={key}
                                    onClick={() => setActiveShift(key)}
                                    className={`rounded-full px-4 py-1 transition-all flex items-center gap-1.5 ${isActive ? 'border-secondary border text-secondary font-semibold bg-secondary/10' : 'border border-white/15 text-white/50'}`}
                                  >
                                    <span className="text-xs">{info.label}</span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                          <div className="grid grid-cols-5 gap-1.5">
                            {currentShiftSlots.length === 0 ? (
                               <div className="col-span-5 text-center py-4 text-white/50 text-sm">Nenhum horário neste turno</div>
                            ) : currentShiftSlots.map(time => {
                              const now = new Date();
                              const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                              const isToday = selectedDate === todayStr;
                              const currentMin = now.getHours() * 60 + now.getMinutes();
                              const timeMin = time.split(':').map(Number).reduce((h, m) => h * 60 + m);
                              const isSoon = isToday && (timeMin - currentMin <= 120) && (timeMin > currentMin);

                              return (
                                <button
                                  key={time}
                                  onClick={() => setSelectedTime(time)}
                                  className={`
                                    relative py-2 rounded-xl text-xs font-semibold transition-all flex flex-col justify-center items-center
                                    ${selectedTime === time ? 'bg-secondary text-white border-none shadow-[0_0_10px_rgba(249,148,23,0.35)]' : 'bg-surface text-white border border-white/10 active:scale-95 hover:bg-white/5'}
                                  `}
                                >
                                  {isSoon && (
                                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-[#FBBF24] text-black text-[9px] font-black uppercase px-2 py-0.5 rounded-full z-10 whitespace-nowrap hidden sm:block">
                                      Em breve
                                    </span>
                                  )}
                                  <span>{time}</span>
                                </button>
                              );
                            })}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}
                {errorMessage && <p className="text-red-500 font-bold text-sm mt-4 text-center">{errorMessage}</p>}
              </div>
            </div>

            <div className="p-4 bg-background border-t border-white/10 shrink-0">
              <button
                disabled={!selectedService || !selectedDate || !selectedTime}
                onClick={() => setStep(4)}
                className={`w-full h-14 rounded-2xl font-black flex items-center justify-center gap-2 transition-all 
                  ${selectedService && selectedDate && selectedTime ? 'bg-secondary text-white shadow-[0_4px_16px_rgba(249,148,23,0.4)] active:scale-95' : 'bg-white/10 text-white/30 cursor-not-allowed'}`}
              >
                {(!selectedService) ? 'Escolha um serviço' : (!selectedDate) ? 'Escolha uma data' : (!selectedTime) ? 'Escolha um horário' : 'Próximo →'}
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300 flex flex-col h-full">
            <div className="pt-3 px-4">
              {renderHeader(true, true, () => setStep(1))}
            </div>
            
            <div className="flex-1 flex flex-col justify-between px-4 pb-4 overflow-y-auto">
              <div>
                <div className="bg-surface/80 p-3 rounded-2xl border border-secondary/20 mb-3 shadow-[0_4px_16px_rgba(0,0,0,0.3)]">
                  <div className="flex justify-between items-center mb-2 pb-2 border-b border-white/10">
                    <span className="text-title text-xs font-bold flex items-center gap-1.5"><Scissors size={14} /> Serviço</span>
                    <span className="text-white font-black text-right max-w-[60%] truncate">{selectedService?.name}</span>
                  </div>
                  <div className="flex justify-between items-center mb-2 pb-2 border-b border-white/10">
                    <span className="text-title text-xs font-bold flex items-center gap-1.5"><CalendarDays size={14} /> Data</span>
                    <span className="text-white font-black text-right">{selectedDate.split('-').reverse().join('/')} às {selectedTime}</span>
                  </div>
                  <div className="flex justify-between items-center mb-2 pb-2 border-b border-white/10">
                    <span className="text-title text-xs font-bold flex items-center gap-1.5"><Clock size={14} /> Duração</span>
                    <span className="text-white font-black text-right">{selectedService?.duration} min</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-title text-xs font-bold flex items-center gap-1.5">💰 Valor</span>
                    <span className="text-secondary font-black text-lg text-right">{formatCurrency(selectedService?.price || 0)}</span>
                  </div>
                </div>

                <form id="booking-form" onSubmit={submitAppointment} className="space-y-2">
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-title">
                      <User size={18} />
                    </div>
                    <input
                      type="text"
                      placeholder="Nome completo (Ex: João Silva)*"
                      value={clientName}
                      onChange={e => setClientName(e.target.value)}
                      className="w-full bg-surface border-b-2 border-transparent border-b-white/20 rounded-t-xl rounded-b-none h-12 pl-12 pr-4 text-white placeholder:text-title font-medium focus:border-b-secondary outline-none block hover:bg-white/5 transition-colors"
                      required
                    />
                  </div>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-title">
                      <Smartphone size={18} />
                    </div>
                    <input
                      type="tel"
                      placeholder="WhatsApp* (Ex: 11 99999-9999)"
                      value={clientPhone}
                      onChange={handlePhoneChange}
                      className="w-full bg-surface border-b-2 border-transparent border-b-white/20 rounded-t-xl rounded-b-none h-12 pl-12 pr-4 text-white placeholder:text-title font-medium focus:border-b-secondary outline-none block hover:bg-white/5 transition-colors"
                      required
                    />
                  </div>
                  <div className="relative">
                    <div className="absolute left-4 top-3 text-title">
                      <MessageSquare size={18} />
                    </div>
                    <textarea
                      placeholder="Alguma observação? (Ex: Cabelo na tesoura)"
                      value={observation}
                      onChange={e => setObservation(e.target.value)}
                      maxLength={200}
                      rows={2}
                      className="w-full bg-surface border-b-2 border-transparent border-b-white/20 rounded-t-xl rounded-b-none p-3 pl-12 text-white placeholder:text-title font-medium focus:border-b-secondary outline-none resize-none h-20 block hover:bg-white/5 transition-colors"
                    />
                  </div>
                </form>
              </div>

              <div className="mt-2 pt-2">
                {errorMessage && <p className="text-red-500 font-bold text-sm text-center mb-2">{errorMessage}</p>}

                <button
                  type="submit"
                  form="booking-form"
                  disabled={isSubmitting}
                  className="w-full bg-secondary text-white font-black rounded-2xl h-14 active:scale-95 transition-all shadow-lg shadow-secondary/20 flex justify-center items-center gap-2 hover:bg-secondary/90"
                >
                  {isSubmitting ? (
                    <><Loader2 className="animate-spin" size={20} /> Confirmando...</>
                  ) : (
                    <>Confirmar Agendamento <Check size={20} /></>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="animate-in zoom-in-95 duration-500 min-h-[60vh] flex flex-col justify-center items-center text-center">
            
            <div className="w-[104px] h-[104px] bg-[#34D399]/20 rounded-full flex items-center justify-center mb-6 animate-[pulse_2s_ease-in-out_infinite]">
              <div className="w-[72px] h-[72px] bg-[#34D399] rounded-full flex items-center justify-center text-background shadow-[0_0_24px_rgba(52,211,153,0.4)]">
                <Check size={40} />
              </div>
            </div>

            <h1 className="text-2xl font-black text-white mb-2">Agendamento confirmado!</h1>
            <p className="text-white/80 font-medium text-lg">
              {selectedDate.split('-').reverse().join('/')} às {selectedTime}
            </p>
            <p className="text-title text-sm mt-1 mb-8">
              Você receberá uma confirmação por WhatsApp
            </p>

            <div className="w-full max-w-sm bg-surface p-5 rounded-2xl border border-white/8 mb-8 shadow-[0_4px_16px_rgba(0,0,0,0.3)]">
               <p className="text-white font-bold text-lg mb-1">{selectedService?.name}</p>
               <p className="text-title text-sm mb-4">{selectedService?.duration} min · {formatCurrency(selectedService?.price || 0)}</p>
               
               <div className="flex items-center justify-center gap-2 text-title text-sm bg-background/50 p-2 rounded-xl">
                 <MapPin size={16} /> <span>{profile?.shop_name || profile?.name}</span>
               </div>
            </div>
            
            <div className="space-y-4 w-full">
              {(() => {
                const pad = (n: number) => String(n).padStart(2, '0');
                const [startH, startM] = selectedTime.split(':').map(Number);
                const [yyyy, mm, dd] = selectedDate.split('-').map(Number);
                
                const start = new Date(yyyy, mm - 1, dd, startH, startM);
                const end = new Date(start.getTime() + (selectedService?.duration || 0) * 60000);
                
                const fmt = (d: Date) =>
                  `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}` +
                  `T${pad(d.getHours())}${pad(d.getMinutes())}00`;

                const startStr = fmt(start);
                const endStr = fmt(end);

                return (
                  <a 
                    href={`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`${selectedService?.name} com ${profile?.shop_name || profile?.name}`)}&dates=${startStr}/${endStr}&ctz=America/Sao_Paulo&details=Agendado+via+Tesourando`}
                    target="_blank" rel="noopener noreferrer"
                    className="w-full flex items-center justify-center h-14 bg-surface border border-white/8 rounded-2xl text-white font-bold shadow-[0_4px_16px_rgba(0,0,0,0.3)] active:scale-95 transition-translate gap-2 hover:bg-white/5"
                  >
                    📅 Adicionar ao Google Agenda
                  </a>
                );
              })()}
              
              <button 
                onClick={() => {
                  setStep(1);
                  setSelectedService(null);
                  setSelectedDate('');
                  setAvailableSlots([]);
                  setSelectedTime('');
                  setClientName('');
                  setClientPhone('');
                  setObservation('');
                }}
                className="w-full flex items-center justify-center h-14 bg-transparent border border-white/30 rounded-2xl text-white font-bold active:scale-95 transition-translate hover:bg-white/5"
              >
                Fazer outro agendamento
              </button>
            </div>
            
          </div>
        )}

      </div>

      {showCalendarModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setShowCalendarModal(false)}>
          <div className="bg-[#2D2B55] w-full max-w-md sm:rounded-2xl rounded-t-2xl p-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <button 
                onClick={() => setModalYearMonth(prev => {
                  let m = prev.month - 1;
                  let y = prev.year;
                  if (m < 0) { m = 11; y--; }
                  return { month: m, year: y };
                })}
                className="w-10 h-10 flex items-center justify-center text-white/50 hover:bg-white/10 rounded-full active:scale-95 transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              
              <span className="font-bold text-white text-base capitalize">
                {new Date(modalYearMonth.year, modalYearMonth.month, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              </span>

              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setModalYearMonth(prev => {
                    let m = prev.month + 1;
                    let y = prev.year;
                    if (m > 11) { m = 0; y++; }
                    return { month: m, year: y };
                  })}
                  className="w-10 h-10 flex items-center justify-center text-white/50 hover:bg-white/10 rounded-full active:scale-95 transition-colors"
                >
                  <ChevronLeft className="rotate-180" size={20} />
                </button>
                <button 
                  onClick={() => setShowCalendarModal(false)}
                  className="w-10 h-10 flex items-center justify-center text-white/50 hover:bg-white/10 hover:text-white rounded-full active:scale-95 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 mb-2">
              {['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'].map(d => (
                <div key={d} className="text-center text-[10px] text-white/40 font-semibold">{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-y-2">
              {(() => {
                const daysInMonth = new Date(modalYearMonth.year, modalYearMonth.month + 1, 0).getDate();
                const firstDay = new Date(modalYearMonth.year, modalYearMonth.month, 1).getDay();
                
                const cells = [];
                for (let i = 0; i < firstDay; i++) {
                  cells.push(<div key={`empty-${i}`} />);
                }

                for (let i = 1; i <= daysInMonth; i++) {
                  const d = new Date(modalYearMonth.year, modalYearMonth.month, i);
                  const isPast = d.getTime() < new Date().setHours(0,0,0,0);
                  const isToday = d.getTime() === new Date().setHours(0,0,0,0);
                  const dow = d.getDay();
                  const isOpen = schedule.find(sch => sch.day_of_week === dow)?.is_open;
                  const isDisabled = isPast || !isOpen;
                  
                  const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
                  const isSelected = selectedDate === dateStr;

                  cells.push(
                    <div key={i} className="flex justify-center">
                      <button
                        disabled={isDisabled}
                        onClick={() => {
                          setSelectedDate(dateStr);
                          setSelectedTime('');
                          setShowCalendarModal(false);
                          
                          // Calculate week offset
                          const today = new Date();
                          today.setHours(0,0,0,0);
                          const diffTime = d.getTime() - today.getTime();
                          const diffDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
                          const offset = Math.floor(diffDays / 7);
                          setWeekOffset(Math.min(offset, MAX_WEEK_OFFSET));
                        }}
                        className={`
                          w-10 h-10 rounded-full flex flex-col items-center justify-center relative transition-all
                          ${isDisabled ? 'text-white/20 pointer-events-none' : 
                            isSelected ? 'bg-secondary text-white font-bold' : 
                            'text-white hover:bg-white/10 active:scale-95'}
                        `}
                      >
                        <span className="text-sm">{i}</span>
                        {isToday && !isSelected && <span className="absolute bottom-1 w-1 h-1 rounded-full bg-secondary" />}
                      </button>
                    </div>
                  );
                }
                return cells;
              })()}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
