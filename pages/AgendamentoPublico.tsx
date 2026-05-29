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
  AlertTriangle
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
        
        if (!servErr && serv) setServices(serv);

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
          setStep(3);
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

  const renderHeader = (showBackButton = false) => (
    <div className="flex items-center gap-4 mb-6">
      {showBackButton && (
        <button onClick={() => setStep(step - 1)} className="w-10 h-10 rounded-full bg-surface shrink-0 flex items-center justify-center hover:bg-white/5 transition-colors shadow-[0_2px_8px_rgba(0,0,0,0.3)] border border-white/8">
          <ChevronLeft className="text-white" />
        </button>
      )}
      <div className="flex items-center gap-3 w-full">
        <div className="w-14 h-14 rounded-full bg-surface shrink-0 flex items-center justify-center text-secondary border border-white/8 overflow-hidden">
          {profile.logo || profile.photo ? (
            <img src={profile.logo || profile.photo!} alt={profile.name} className="w-full h-full object-cover" />
          ) : (
            <User size={24} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-black text-white truncate">{profile.shop_name || profile.name}</h1>
          <p className="text-sm text-title truncate">{profile.description || profile.name}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background w-full">
      <div className="max-w-[480px] mx-auto px-4 py-6 pb-20">
        
        {step === 1 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            {renderHeader(false)}
            
            {profile.instagram && (
              <a href={`https://instagram.com/${profile.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-secondary font-bold mb-6 hover:underline">
                <Instagram size={16} /> {profile.instagram}
              </a>
            )}

            <h2 className="text-sm uppercase tracking-widest font-bold text-title mb-4 bg-background pt-2">Escolha um serviço</h2>
            <div className="space-y-3">
              {services.map(s => (
                <button
                  key={s.id}
                  onClick={() => { setSelectedService(s); setStep(2); }}
                  className="w-full bg-surface p-4 rounded-2xl flex items-center justify-between border border-white/8 shadow-[0_4px_16px_rgba(0,0,0,0.3)] active:scale-95 transition-all text-left"
                >
                  <div>
                    <h3 className="font-bold text-white text-base">{s.name}</h3>
                    <p className="text-sm font-medium text-title">{s.duration} min · {formatCurrency(s.price)}</p>
                  </div>
                  <ChevronLeft className="rotate-180 text-title shrink-0" />
                </button>
              ))}
              {services.length === 0 && (
                <div className="text-center p-8 bg-surface rounded-2xl border border-white/8">
                  <p className="text-title text-sm">Nenhum serviço cadastrado.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            {renderHeader(true)}
            
            <h2 className="text-sm uppercase tracking-widest font-bold text-title mb-4 flex items-center gap-2 bg-background pt-2">
              <CalendarDays size={16} /> Escolha uma data
            </h2>

            <div className="grid grid-cols-4 gap-2">
              {Array.from({length: 30}).map((_, i) => {
                const d = new Date();
                d.setHours(0, 0, 0, 0);
                d.setDate(d.getDate() + i);
                
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const isPast = d < today;
                
                const dow = d.getDay();
                const isOpen = schedule.find(s => s.day_of_week === dow)?.is_open;
                
                const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
                
                const w = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"][dow];
                
                const isDisabled = isPast || !isOpen;

                return (
                  <button
                    key={i}
                    disabled={isDisabled}
                    onClick={() => { setSelectedDate(dateStr); setStep(3); }}
                    className={`
                      relative p-3 rounded-2xl text-center transition-all shadow-[0_4px_16px_rgba(0,0,0,0.3)]
                      ${isDisabled ? 'opacity-30 pointer-events-none bg-surface/50 border-transparent' : 'bg-surface border border-white/8 active:scale-95'}
                      ${selectedDate === dateStr && !isDisabled ? 'bg-secondary border-none' : ''}
                    `}
                  >
                    <span className={`block text-xs font-bold uppercase ${selectedDate === dateStr && !isDisabled ? 'text-white' : 'text-title'}`}>{w}</span>
                    <span className={`block text-lg font-black ${selectedDate === dateStr && !isDisabled ? 'text-white' : 'text-white'}`}>{d.getDate()}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            {renderHeader(true)}
            
            <h2 className="text-sm uppercase tracking-widest font-bold text-title mb-4 flex items-center gap-2 bg-background pt-2">
              <Clock size={16} /> Horários disponíveis
            </h2>

            {dateLoading ? (
              <div className="flex justify-center p-8"><Loader2 className="animate-spin text-secondary" /></div>
            ) : availableSlots.length === 0 ? (
              <div className="text-center p-8 bg-surface rounded-2xl border border-white/8 shadow-[0_4px_16px_rgba(0,0,0,0.3)]">
                <p className="text-white font-bold mb-2">Nenhum horário disponível neste dia</p>
                <button onClick={() => setStep(2)} className="text-sm text-secondary font-bold hover:underline">Voltar para calendário</button>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {availableSlots.map(time => (
                  <button
                    key={time}
                    onClick={() => { setSelectedTime(time); setStep(4); }}
                    className={`
                      py-3 rounded-2xl text-base font-black transition-all shadow-[0_4px_16px_rgba(0,0,0,0.3)]
                      ${selectedTime === time ? 'bg-secondary text-white' : 'bg-surface text-white border border-white/8 active:scale-95'}
                    `}
                  >
                    {time}
                  </button>
                ))}
              </div>
            )}
            {errorMessage && <p className="text-red-500 font-bold text-sm mt-4 text-center">{errorMessage}</p>}
          </div>
        )}

        {step === 4 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            {renderHeader(true)}
            
            <div className="bg-surface p-4 rounded-2xl border border-white/8 mb-6 shadow-[0_4px_16px_rgba(0,0,0,0.3)]">
              <div className="flex justify-between items-center mb-2 pb-2 border-b border-white/10">
                <span className="text-title text-sm font-bold">Serviço</span>
                <span className="text-white font-black">{selectedService?.name}</span>
              </div>
              <div className="flex justify-between items-center mb-2 pb-2 border-b border-white/10">
                <span className="text-title text-sm font-bold">Data & Horário</span>
                <span className="text-white font-black">{selectedDate.split('-').reverse().join('/')} às {selectedTime}</span>
              </div>
              <div className="flex justify-between items-center mb-2 pb-2 border-b border-white/10">
                <span className="text-title text-sm font-bold">Duração</span>
                <span className="text-white font-black">{selectedService?.duration} min</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-title text-sm font-bold">Valor</span>
                <span className="text-secondary font-black text-lg">{formatCurrency(selectedService?.price || 0)}</span>
              </div>
            </div>

            <form onSubmit={submitAppointment} className="space-y-4">
              <div>
                <input
                  type="text"
                  placeholder="Seu nome completo*"
                  value={clientName}
                  onChange={e => setClientName(e.target.value)}
                  className="w-full bg-surface border border-white/8 rounded-2xl h-14 px-4 text-white placeholder:text-title font-medium focus:ring-2 focus:ring-secondary/50 outline-none block"
                  required
                />
              </div>
              <div>
                <input
                  type="tel"
                  placeholder="WhatsApp* (11) 99999-9999"
                  value={clientPhone}
                  onChange={handlePhoneChange}
                  className="w-full bg-surface border border-white/8 rounded-2xl h-14 px-4 text-white placeholder:text-title font-medium focus:ring-2 focus:ring-secondary/50 outline-none block"
                  required
                />
              </div>
              <div>
                <textarea
                  placeholder="Alguma observação? (opcional)"
                  value={observation}
                  onChange={e => setObservation(e.target.value)}
                  maxLength={200}
                  className="w-full bg-surface border border-white/8 rounded-2xl p-4 text-white placeholder:text-title font-medium focus:ring-2 focus:ring-secondary/50 outline-none resize-none h-24 block"
                />
              </div>

              {errorMessage && <p className="text-red-500 font-bold text-sm text-center">{errorMessage}</p>}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-secondary text-white font-black rounded-2xl h-14 mt-4 active:scale-95 transition-all shadow-lg shadow-secondary/20 flex justify-center items-center gap-2"
              >
                {isSubmitting ? (
                  <><Loader2 className="animate-spin" size={20} /> Confirmando...</>
                ) : (
                  'Confirmar Agendamento'
                )}
              </button>
            </form>
          </div>
        )}

        {step === 5 && (
          <div className="animate-in zoom-in-95 duration-500 min-h-[60vh] flex flex-col justify-center items-center text-center">
            
            <div className="w-20 h-20 bg-[#34D399]/20 rounded-full flex items-center justify-center mb-6">
              <div className="w-14 h-14 bg-[#34D399] rounded-full flex items-center justify-center text-background">
                <Check size={32} />
              </div>
            </div>

            <h1 className="text-2xl font-black text-white mb-2">Agendamento confirmado!</h1>
            <p className="text-white/80 font-medium mb-8 text-lg">
              {selectedDate.split('-').reverse().join('/')} às {selectedTime}
            </p>

            <div className="w-full bg-surface p-4 rounded-2xl border border-white/8 mb-8 shadow-[0_4px_16px_rgba(0,0,0,0.3)]">
               <p className="text-white font-bold">{selectedService?.name}</p>
               <p className="text-title text-sm">{selectedService?.duration} min · {formatCurrency(selectedService?.price || 0)}</p>
            </div>
            
            <div className="space-y-4 w-full">
              {(() => {
                const startStr = `${selectedDate.replace(/-/g, '')}T${selectedTime.replace(':', '')}00Z`;
                const startMin = selectedTime.split(':').map(Number).reduce((h, m) => h * 60 + m);
                const endMin = startMin + (selectedService?.duration || 0);
                const endH = Math.floor(endMin / 60);
                const endM = endMin % 60;
                const endStr = `${selectedDate.replace(/-/g, '')}T${String(endH).padStart(2, '0')}${String(endM).padStart(2, '0')}00Z`;

                return (
                  <a 
                    href={`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`${selectedService?.name} com ${profile?.shop_name || profile?.name}`)}&dates=${startStr}/${endStr}&details=Agendado+via+Tesourando`}
                    target="_blank" rel="noopener noreferrer"
                    className="w-full flex items-center justify-center h-14 bg-surface border border-white/8 rounded-2xl text-white font-bold shadow-[0_4px_16px_rgba(0,0,0,0.3)] active:scale-95 transition-translate"
                  >
                    Adicionar ao Google Agenda
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
                className="w-full text-title font-bold underline py-2"
              >
                Fazer outro agendamento
              </button>
            </div>
            
          </div>
        )}

      </div>
    </div>
  );
}
