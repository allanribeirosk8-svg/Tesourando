import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Scissors, Calendar, User, Settings, Check } from 'lucide-react';
import { Button } from './ui/Button';

interface OnboardingProps {
  onComplete: () => void;
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(0);

  const steps = [
    {
      icon: <Scissors size={64} className="text-[#F99417]" />,
      title: "Bem-vindo ao Tesourando!",
      description: "Seu assistente completo de barbearia. Vamos te mostrar o essencial em 3 passos rápidos."
    },
    {
      icon: <Calendar size={64} className="text-[#F99417]" />,
      title: "Agenda Inteligente",
      description: "Visualize e gerencie todos os seus agendamentos. Toque num horário para ver detalhes, confirmar ou marcar falta."
    },
    {
      icon: <User size={64} className="text-[#F99417]" />,
      title: "Clientes com Histórico",
      description: "Cada cliente tem seu perfil completo — histórico de cortes, fotos antes/depois e muito mais."
    },
    {
      icon: <Settings size={64} className="text-[#F99417]" />,
      title: "Configure do seu Jeito",
      description: "Ajuste horários de funcionamento, serviços e o perfil da sua barbearia nas Configurações."
    }
  ];

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      onComplete();
    }
  };

  return (
    <div className="fixed inset-0 z-[999] bg-[#1E1B4B] flex flex-col items-center justify-center p-6 text-white text-center">
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col items-center max-w-sm w-full"
        >
          <div className="mb-8 p-6 bg-white/5 rounded-full backdrop-blur-lg border border-white/10 shadow-[0_0_40px_rgba(249,148,23,0.15)]">
            {steps[step].icon}
          </div>
          <h1 className="text-3xl font-black mb-4">{steps[step].title}</h1>
          <p className="text-white/70 text-lg leading-relaxed mb-12">
            {steps[step].description}
          </p>
        </motion.div>
      </AnimatePresence>

      <div className="absolute bottom-12 left-0 right-0 px-6 max-w-sm mx-auto w-full flex flex-col gap-8">
        <div className="flex justify-center gap-3">
          {steps.map((_, i) => (
            <div 
              key={i} 
              className={`h-2 rounded-full transition-all duration-300 ${i === step ? 'w-8 bg-[#F99417]' : 'w-2 bg-white/20'}`} 
            />
          ))}
        </div>
        
        <button
          onClick={handleNext}
          className="w-full bg-[#F99417] text-white hover:bg-[#D87D10] h-14 rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all text-lg shadow-lg shadow-[#F99417]/20"
        >
          {step === steps.length - 1 ? (
            <>
              Começar a Usar
              <Check size={24} />
            </>
          ) : (
            'Continuar'
          )}
        </button>
      </div>
    </div>
  );
}
