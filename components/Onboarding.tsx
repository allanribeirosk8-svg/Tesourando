import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface OnboardingProps {
  onComplete: () => void;
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const slides = [
    {
      image: "/slide-1.png",
      title: "Chega de agenda no papel.",
      description: "Organize seus atendimentos, clientes e financeiro num só lugar — feito para barbeiro."
    },
    {
      image: "/slide-2.png",
      title: "Nunca mais perca um cliente.",
      description: "Histórico completo, fotos dos cortes e o contato sempre à mão. Seu cliente se sente lembrado."
    },
    {
      image: "/slide-3.png",
      title: "Saiba exatamente quanto você faturou.",
      description: "Veja o resumo do dia e da semana sem precisar anotar nada. O dinheiro no controle."
    },
    {
      image: "/slide-4.svg",
      title: "Pronto para organizar sua barbearia?",
      description: "Crie sua conta grátis e comece agora."
    }
  ];

  const minSwipeDistance = 50;

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (touchStart === null || touchEnd === null) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && step < slides.length - 1) {
      setStep(prev => prev + 1);
    }
    if (isRightSwipe && step > 0) {
      setStep(prev => prev - 1);
    }
  };

  const isLastStep = step === slides.length - 1;

  return (
    <div 
      className="fixed inset-0 z-[999] bg-[#1E1B4B] flex flex-col items-center justify-center p-6 text-white text-center"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {!isLastStep && (
        <button 
          onClick={onComplete}
          className="absolute top-12 right-6 text-white/50 font-bold uppercase tracking-widest text-[11px] px-3 py-1.5 rounded-full border border-white/10 hover:bg-white/5 active:scale-95 transition-all"
        >
          Pular
        </button>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col items-center max-w-sm w-full -mt-20"
        >
          <div className="w-64 h-64 mb-8 flex items-center justify-center relative">
            <img 
              src={slides[step].image} 
              alt={slides[step].title} 
              className="w-full h-full object-contain drop-shadow-xl" 
            />
          </div>
          <h1 className="text-3xl font-black mb-4 tracking-tight leading-tight">{slides[step].title}</h1>
          <p className="text-white/70 text-base leading-relaxed mb-6 px-4">
            {slides[step].description}
          </p>
        </motion.div>
      </AnimatePresence>

      <div className="absolute bottom-12 left-0 right-0 px-6 max-w-sm mx-auto w-full flex flex-col gap-8">
        <div className="flex justify-center gap-2">
          {slides.map((_, i) => (
            <button 
              key={i} 
              onClick={() => setStep(i)}
              className={`h-2 rounded-full transition-all duration-300 ${i === step ? 'w-8 bg-[#F99417]' : 'w-2 bg-white/20'}`} 
            />
          ))}
        </div>
        
        {isLastStep ? (
          <div className="flex flex-col gap-3">
            <button
              onClick={onComplete}
              className="w-full bg-[#F99417] text-white h-14 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center active:scale-95 transition-all text-[13px] shadow-lg shadow-[#F99417]/20"
            >
              Criar conta grátis
            </button>
            <button
              onClick={onComplete}
              className="w-full bg-transparent border-2 border-white/20 text-white h-14 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center active:scale-95 transition-all text-[13px] hover:bg-white/5"
            >
              Já tenho conta
            </button>
          </div>
        ) : (
          <button
            onClick={() => setStep(prev => prev + 1)}
            className="w-full bg-[#F99417] text-white h-14 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center active:scale-95 transition-all text-[13px] shadow-lg shadow-[#F99417]/20"
          >
            Continuar
          </button>
        )}
      </div>
    </div>
  );
}
