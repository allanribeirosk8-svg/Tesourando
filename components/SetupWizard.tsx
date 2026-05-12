import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Store, User, Phone, PhoneCall, MapPin, Instagram, Scissors, Trash2, Clock, CheckCircle } from 'lucide-react';
import { useStore } from '../context/Store';
import { ServiceItem } from '../types';

interface SetupWizardProps {
  onComplete: () => void;
}

export function SetupWizard({ onComplete }: SetupWizardProps) {
  const { updateBarberProfile, addService, updateDayConfig, services, removeService } = useStore();
  const [step, setStep] = useState(1);
  const [isFinishing, setIsFinishing] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  const [profileData, setProfileData] = useState({
    name: '',
    shopName: '',
    personalPhone: '',
    businessPhone: '',
    address: '',
    instagram: '',
    description: '',
  });

  const [localServices, setLocalServices] = useState<ServiceItem[]>([
    { id: 'setup-1', name: 'Corte de Cabelo', price: 35, duration: 30 },
    { id: 'setup-2', name: 'Barba', price: 25, duration: 30 },
    { id: 'setup-3', name: 'Corte + Barba', price: 50, duration: 60 },
  ]);

  const [localSchedule, setLocalSchedule] = useState({
    openDays: [1, 2, 3, 4, 5, 6], // 0=Dom ... 6=Sáb
    startTime: '09:00',
    endTime: '19:00',
  });

  const [errors, setErrors] = useState<string[]>([]);

  const isStep1Valid = profileData.shopName.trim() !== '' && profileData.name.trim() !== '' && profileData.personalPhone.trim() !== '';

  const handleNext = () => {
    if (step === 1) {
      if (!isStep1Valid) {
        const newErrors = [];
        if (profileData.shopName.trim() === '') newErrors.push('shopName');
        if (profileData.name.trim() === '') newErrors.push('name');
        if (profileData.personalPhone.trim() === '') newErrors.push('personalPhone');
        setErrors(newErrors);
        return;
      }
      setErrors([]);
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    } else if (step === 3) {
      handleComplete();
    }
  };

  const handleComplete = async () => {
    setIsFinishing(true);

    try {
      // 1. Salvar perfil
      await updateBarberProfile({
        ...profileData,
        logo: '',
        photo: '',
        website: '',
      });

      // 2. Substituir serviços
      for (const s of services) {
        await removeService(s.id);
      }
      for (const s of localServices) {
        await addService(s);
      }

      // 3. Salvar horários
      const allDays = [0, 1, 2, 3, 4, 5, 6];
      for (const day of allDays) {
        await updateDayConfig(day, {
          isOpen: localSchedule.openDays.includes(day),
          start: localSchedule.startTime,
          end: localSchedule.endTime,
          breaks: [],
        });
      }

      setIsFinishing(false);
      setIsFinished(true);
      
      setTimeout(() => {
        onComplete();
      }, 2500);

    } catch (err) {
      console.error(err);
      setIsFinishing(false);
    }
  };

  const addLocalService = () => {
    setLocalServices([
      ...localServices,
      { id: Date.now().toString(), name: 'Novo Serviço', price: 0, duration: 30 }
    ]);
  };

  const removeLocalService = (id: string) => {
    setLocalServices(localServices.filter(s => s.id !== id));
  };

  const updateLocalService = (id: string, field: keyof ServiceItem, value: string | number) => {
    setLocalServices(localServices.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const toggleDay = (day: number) => {
    setLocalSchedule(prev => ({
      ...prev,
      openDays: prev.openDays.includes(day) 
        ? prev.openDays.filter(d => d !== day)
        : [...prev.openDays, day].sort()
    }));
  };

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col" style={{ background: 'linear-gradient(to bottom, #F5A623 38%, #FFFFFF 38%)' }}>
      <div className="flex-1 w-full flex items-center justify-center p-4">
        
        <div className="bg-white rounded-[24px] p-7 max-w-[420px] w-[92%] shadow-[0_10px_40px_rgba(0,0,0,0.1)] relative overflow-hidden flex flex-col max-h-[90vh]">
          
          <AnimatePresence mode="wait">
            {isFinished ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-10"
              >
                <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center text-green-500 mb-6 relative">
                   <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: [1.1, 1] }}
                      transition={{ duration: 0.5 }}
                   >
                     <CheckCircle size={64} />
                   </motion.div>
                </div>
                <h2 className="text-[24px] font-bold text-[#1E1B4B] mb-2 text-center">Tudo pronto! 🎉</h2>
                <p className="text-[14px] text-[#6B7280] text-center px-4">
                  Sua barbearia está configurada. Bem-vindo ao Tesourando!
                </p>
              </motion.div>
            ) : (
              <motion.div
                key={`step-${step}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col h-full"
              >
                {/* Progress Bar & Header */}
                <div className="text-center mb-6">
                  <p className="text-[12px] text-[#9CA3AF] mb-1">Etapa {step} de 3</p>
                  <div className="flex gap-[6px] mb-6">
                    {[1, 2, 3].map(i => (
                      <div 
                        key={i}
                        className={`h-[6px] rounded-[4px] flex-1 ${i === step ? 'bg-[#F5A623]' : i < step ? 'bg-[#F5A623] opacity-60' : 'bg-[#E5E7EB]'}`}
                      />
                    ))}
                  </div>

                  <div className="w-[72px] h-[72px] rounded-full bg-[#FFF3E0] text-[#F5A623] flex items-center justify-center mx-auto mb-4">
                    {step === 1 && <Scissors size={32} />}
                    {step === 2 && <Scissors size={32} />}
                    {step === 3 && <Clock size={32} />}
                  </div>

                  <h2 className="text-[22px] font-bold text-[#1E1B4B] text-center mb-2">
                    {step === 1 && "Vamos começar! Como se chama sua barbearia?"}
                    {step === 2 && "Quais serviços você oferece?"}
                    {step === 3 && "Quando você atende?"}
                  </h2>
                  <p className="text-[14px] text-[#6B7280] text-center mb-6">
                    {step === 1 && "Essas informações aparecem para seus clientes na hora de agendar."}
                    {step === 2 && "Você pode editar isso depois. Já deixamos alguns prontos para você!"}
                    {step === 3 && "Configure os dias e horários. Você pode ajustar isso nas Configurações a qualquer momento."}
                  </p>
                </div>

                {/* Content Area - Scrollable */}
                <div className="flex-1 overflow-y-auto mb-6 px-1 custom-scrollbar">
                  {step === 1 && (
                    <div className="flex flex-col gap-4">
                      {/* Shop Name */}
                      <div>
                        <label className="block text-[13px] font-medium text-gray-700 mb-1 ml-1">
                          Nome da barbearia <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <Store className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                          <input
                            type="text"
                            placeholder="Ex: Barbearia do João"
                            value={profileData.shopName}
                            onChange={(e) => setProfileData({ ...profileData, shopName: e.target.value })}
                            className={`w-full bg-[#F9FAFB] border-[1.5px] rounded-[12px] py-[12px] pr-[16px] pl-[44px] text-[15px] text-[#1E1B4B] focus:outline-none focus:border-[#F5A623] focus:ring-[3px] focus:ring-[#F5A623]/15 transition-all ${errors.includes('shopName') ? 'border-red-500' : 'border-[#E5E7EB]'}`}
                          />
                        </div>
                      </div>
                      
                      {/* Name */}
                      <div>
                        <label className="block text-[13px] font-medium text-gray-700 mb-1 ml-1">
                          Seu nome <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                          <input
                            type="text"
                            placeholder="Ex: João Silva"
                            value={profileData.name}
                            onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                            className={`w-full bg-[#F9FAFB] border-[1.5px] rounded-[12px] py-[12px] pr-[16px] pl-[44px] text-[15px] text-[#1E1B4B] focus:outline-none focus:border-[#F5A623] focus:ring-[3px] focus:ring-[#F5A623]/15 transition-all ${errors.includes('name') ? 'border-red-500' : 'border-[#E5E7EB]'}`}
                          />
                        </div>
                      </div>

                      {/* Personal Phone */}
                      <div>
                        <label className="block text-[13px] font-medium text-gray-700 mb-1 ml-1">
                          WhatsApp pessoal <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                          <input
                            type="tel"
                            placeholder="(11) 99999-9999"
                            value={profileData.personalPhone}
                            onChange={(e) => setProfileData({ ...profileData, personalPhone: e.target.value })}
                            className={`w-full bg-[#F9FAFB] border-[1.5px] rounded-[12px] py-[12px] pr-[16px] pl-[44px] text-[15px] text-[#1E1B4B] focus:outline-none focus:border-[#F5A623] focus:ring-[3px] focus:ring-[#F5A623]/15 transition-all ${errors.includes('personalPhone') ? 'border-red-500' : 'border-[#E5E7EB]'}`}
                          />
                        </div>
                      </div>

                      {/* Business Phone */}
                      <div>
                        <label className="block text-[13px] font-medium text-gray-700 mb-1 ml-1">
                          WhatsApp comercial
                        </label>
                        <div className="relative">
                          <PhoneCall className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                          <input
                            type="tel"
                            placeholder="(11) 99999-9999"
                            value={profileData.businessPhone}
                            onChange={(e) => setProfileData({ ...profileData, businessPhone: e.target.value })}
                            className="w-full bg-[#F9FAFB] border-[1.5px] border-[#E5E7EB] rounded-[12px] py-[12px] pr-[16px] pl-[44px] text-[15px] text-[#1E1B4B] focus:outline-none focus:border-[#F5A623] focus:ring-[3px] focus:ring-[#F5A623]/15 transition-all"
                          />
                        </div>
                      </div>

                      {/* Address */}
                      <div>
                        <label className="block text-[13px] font-medium text-gray-700 mb-1 ml-1">
                          Endereço
                        </label>
                        <div className="relative">
                          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                          <input
                            type="text"
                            placeholder="Rua, número, bairro"
                            value={profileData.address}
                            onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
                            className="w-full bg-[#F9FAFB] border-[1.5px] border-[#E5E7EB] rounded-[12px] py-[12px] pr-[16px] pl-[44px] text-[15px] text-[#1E1B4B] focus:outline-none focus:border-[#F5A623] focus:ring-[3px] focus:ring-[#F5A623]/15 transition-all"
                          />
                        </div>
                      </div>

                      {/* Instagram */}
                      <div>
                        <label className="block text-[13px] font-medium text-gray-700 mb-1 ml-1">
                          Instagram
                        </label>
                        <div className="relative">
                          <Instagram className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                          <input
                            type="text"
                            placeholder="@suabarbearia"
                            value={profileData.instagram}
                            onChange={(e) => setProfileData({ ...profileData, instagram: e.target.value })}
                            className="w-full bg-[#F9FAFB] border-[1.5px] border-[#E5E7EB] rounded-[12px] py-[12px] pr-[16px] pl-[44px] text-[15px] text-[#1E1B4B] focus:outline-none focus:border-[#F5A623] focus:ring-[3px] focus:ring-[#F5A623]/15 transition-all"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {step === 2 && (
                    <div className="flex flex-col gap-3">
                      {localServices.map((service, index) => (
                        <div key={service.id} className="bg-[#FAFAFA] rounded-[12px] border border-[#F3F4F6] p-3 flex flex-row items-center gap-2">
                          <span className="text-[#D1D5DB] cursor-grab">⠿</span>
                          <input
                            type="text"
                            value={service.name}
                            onChange={(e) => updateLocalService(service.id, 'name', e.target.value)}
                            className="flex-1 bg-transparent border-none text-[14px] text-[#1E1B4B] font-medium focus:outline-none min-w-0"
                            placeholder="Nome"
                          />
                          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-md px-2 py-1">
                            <span className="text-gray-400 text-xs text-nowrap">R$</span>
                            <input
                              type="number"
                              value={service.price || ''}
                              onChange={(e) => updateLocalService(service.id, 'price', Number(e.target.value))}
                              className="w-10 bg-transparent border-none text-right text-[13px] focus:outline-none"
                            />
                          </div>
                          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-md px-2 py-1">
                            <input
                              type="number"
                              value={service.duration || ''}
                              onChange={(e) => updateLocalService(service.id, 'duration', Number(e.target.value))}
                              className="w-8 bg-transparent border-none text-right text-[13px] focus:outline-none"
                            />
                            <span className="text-gray-400 text-xs">min</span>
                          </div>
                          {localServices.length > 1 && (
                            <button onClick={() => removeLocalService(service.id)} className="text-[#EF4444] p-1 ml-1 hover:bg-red-50 rounded">
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      ))}

                      <button
                        onClick={addLocalService}
                        className="w-full mt-2 border-2 border-dashed border-[#F5A623]/50 text-[#F5A623] hover:bg-[#F5A623]/5 rounded-[12px] p-2.5 font-medium text-[14px] flex justify-center items-center gap-2"
                      >
                        + Adicionar serviço
                      </button>

                      <p className="text-[12px] text-[#9CA3AF] mt-4 text-center">
                        💡 Os preços e duração podem ser ajustados depois nas Configurações.
                      </p>
                    </div>
                  )}

                  {step === 3 && (
                    <div className="flex flex-col gap-6">
                      <div>
                        <label className="block text-[13px] font-medium text-gray-700 mb-2 ml-1 text-center">
                          Dias de atendimento
                        </label>
                        <div className="flex flex-wrap justify-center gap-2">
                          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((dayName, idx) => (
                            <button
                              key={idx}
                              onClick={() => toggleDay(idx)}
                              className={`rounded-[10px] py-[8px] px-[12px] text-[13px] transition-colors ${
                                localSchedule.openDays.includes(idx)
                                  ? 'bg-[#F5A623] text-white font-bold'
                                  : 'bg-[#F3F4F6] text-[#6B7280]'
                              }`}
                            >
                              {dayName}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-[13px] font-medium text-gray-700 mb-2 ml-1 text-center">
                          Horário de atendimento
                        </label>
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1">
                            <label className="block text-[12px] text-gray-500 mb-1">Abertura</label>
                            <input
                              type="time"
                              value={localSchedule.startTime}
                              onChange={(e) => setLocalSchedule({ ...localSchedule, startTime: e.target.value })}
                              className="w-full bg-[#F9FAFB] border-[1.5px] border-[#E5E7EB] rounded-[12px] py-[10px] px-[12px] text-[15px] text-[#1E1B4B] focus:outline-none focus:border-[#F5A623] focus:ring-[3px] focus:ring-[#F5A623]/15 transition-all text-center"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="block text-[12px] text-gray-500 mb-1">Fechamento</label>
                            <input
                              type="time"
                              value={localSchedule.endTime}
                              onChange={(e) => setLocalSchedule({ ...localSchedule, endTime: e.target.value })}
                              className="w-full bg-[#F9FAFB] border-[1.5px] border-[#E5E7EB] rounded-[12px] py-[10px] px-[12px] text-[15px] text-[#1E1B4B] focus:outline-none focus:border-[#F5A623] focus:ring-[3px] focus:ring-[#F5A623]/15 transition-all text-center"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 mt-auto">
                  <button
                    onClick={handleNext}
                    disabled={step === 1 && !isStep1Valid}
                    className={`w-full bg-[#F5A623] text-white h-[50px] rounded-[14px] font-bold text-[16px] transition-all flex items-center justify-center gap-2 ${(step === 1 && !isStep1Valid) || isFinishing ? 'opacity-40' : 'hover:bg-[#E0901A]'}`}
                  >
                    {isFinishing ? (
                      <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    ) : (
                      step === 3 ? "Concluir Configuração 🎉" : "Próximo"
                    )}
                  </button>
                  
                  {step > 1 && (
                    <button
                      onClick={() => setStep(step - 1)}
                      disabled={isFinishing}
                      className="w-full h-[40px] text-[#9CA3AF] font-medium text-[14px] flex justify-center items-center mt-1"
                    >
                      Voltar
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
