import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface SlideTheme {
  bg: string;
  titleColor: string;
  descColor: string;
  buttonBg: string;
  buttonText: string;
  dotActive: string;
  dotInactive: string;
  skipColor: string;
  skipBorder: string;
}

interface Slide {
  image: string;
  title: string;
  description: string;
  theme: SlideTheme;
}

const slides: Slide[] = [
  {
    image: '/slide-1.png',
    title: 'Chega de agenda no papel.',
    description: 'Organize seus atendimentos, clientes e financeiro num só lugar — feito para barbeiro.',
    theme: {
      bg: '#F99417',
      titleColor: '#1E1B4B',
      descColor: '#1E1B4B',
      buttonBg: '#1E1B4B',
      buttonText: '#FFFFFF',
      dotActive: '#1E1B4B',
      dotInactive: 'rgba(30,27,75,0.25)',
      skipColor: 'rgba(30,27,75,0.6)',
      skipBorder: 'rgba(30,27,75,0.2)',
    },
  },
  {
    image: '/slide-2.png',
    title: 'Nunca mais perca um cliente.',
    description: 'Histórico completo, fotos dos cortes e o contato sempre à mão. Seu cliente se sente lembrado.',
    theme: {
      bg: '#F3F2FA',
      titleColor: '#1E1B4B',
      descColor: '#1E1B4B',
      buttonBg: '#F99417',
      buttonText: '#FFFFFF',
      dotActive: '#F99417',
      dotInactive: 'rgba(249,148,23,0.25)',
      skipColor: 'rgba(30,27,75,0.6)',
      skipBorder: 'rgba(30,27,75,0.2)',
    },
  },
  {
    image: '/slide-3.png',
    title: 'Saiba exatamente quanto você faturou.',
    description: 'Veja o resumo do dia e da semana sem precisar anotar nada. O dinheiro no controle.',
    theme: {
      bg: '#1E1B4B',
      titleColor: '#FFFFFF',
      descColor: 'rgba(255,255,255,0.75)',
      buttonBg: '#F99417',
      buttonText: '#FFFFFF',
      dotActive: '#F99417',
      dotInactive: 'rgba(249,148,23,0.3)',
      skipColor: 'rgba(255,255,255,0.55)',
      skipBorder: 'rgba(255,255,255,0.2)',
    },
  },
  {
    image: '/slide-4.png',
    title: 'Pronto para organizar sua barbearia?',
    description: 'Crie sua conta grátis e comece agora.',
    theme: {
      bg: '#F99417',
      titleColor: '#1E1B4B',
      descColor: '#1E1B4B',
      buttonBg: '#1E1B4B',
      buttonText: '#FFFFFF',
      dotActive: '#1E1B4B',
      dotInactive: 'rgba(30,27,75,0.25)',
      skipColor: 'rgba(30,27,75,0.6)',
      skipBorder: 'rgba(30,27,75,0.2)',
    },
  },
];

interface OnboardingProps {
  onComplete: () => void;
}

const slideVariants = {
  enter: (dir: number) => ({ x: dir * 60, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir * -60, opacity: 0 }),
};

const textVariants = {
  enter: { y: 16, opacity: 0 },
  center: { y: 0, opacity: 1 },
  exit: { y: -10, opacity: 0 },
};

export function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [touchStartX, setTouchStartX] = useState(0);

  const isLast = step === slides.length - 1;
  const { theme } = slides[step];

  const goTo = (next: number) => {
    if (next < 0 || next >= slides.length) return;
    setDirection(next > step ? 1 : -1);
    setStep(next);
  };

  return (
    <motion.div
      className="fixed inset-0 z-[999] flex flex-col overflow-hidden w-full h-[100dvh]"
      animate={{ backgroundColor: theme.bg }}
      transition={{ duration: 0.45, ease: 'easeInOut' }}
      onTouchStart={(e) => setTouchStartX(e.touches[0].clientX)}
      onTouchEnd={(e) => {
        const diff = touchStartX - e.changedTouches[0].clientX;
        if (Math.abs(diff) > 50) {
          diff > 0 ? goTo(step + 1) : goTo(step - 1);
        }
      }}
    >
      {/* Botão Pular */}
      {!isLast && (
        <div className="absolute top-8 right-6 z-10 transition-colors duration-500">
          <button
            onClick={onComplete}
            className="px-4 py-1.5 rounded-full border text-[11px] font-bold uppercase tracking-widest transition-colors duration-500"
            style={{ color: theme.skipColor, borderColor: theme.skipBorder }}
          >
            Pular
          </button>
        </div>
      )}

      {/* Área da imagem — 58% da tela */}
      <div className="flex-[58] relative overflow-hidden flex items-end justify-center w-full">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.img
            key={step + '-img'}
            src={slides[step].image}
            alt={slides[step].title}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="absolute inset-0 w-full h-full object-contain object-bottom"
          />
        </AnimatePresence>
      </div>

      {/* Área de texto + controles — 42% da tela */}
      <div className="flex-[42] flex flex-col items-center justify-between px-6 pb-12 pt-8 z-10 w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={step + '-text'}
            variants={textVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="text-center"
          >
            <h2
              className="text-3xl font-black mb-4 leading-tight tracking-tight transition-colors duration-500"
              style={{ color: theme.titleColor }}
            >
              {slides[step].title}
            </h2>
            <p
              className="text-base leading-relaxed transition-colors duration-500"
              style={{ color: theme.descColor }}
            >
              {slides[step].description}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Dots */}
        <div className="flex items-center gap-2 my-2">
          {slides.map((_, i) => (
            <motion.div
              key={i}
              animate={{
                width: i === step ? 32 : 8,
                backgroundColor: i === step ? theme.dotActive : theme.dotInactive,
              }}
              transition={{ duration: 0.3 }}
              className="h-2 rounded-full cursor-pointer"
              onClick={() => goTo(i)}
            />
          ))}
        </div>

        {/* Botão(ões) */}
        {!isLast ? (
          <button
            onClick={() => goTo(step + 1)}
            className="w-full py-4 rounded-full text-[13px] font-black uppercase tracking-widest active:scale-95 transition-all duration-300"
            style={{ backgroundColor: theme.buttonBg, color: theme.buttonText }}
          >
            Continuar
          </button>
        ) : (
          <div className="w-full flex flex-col gap-3">
            <button
              onClick={onComplete}
              className="w-full py-4 rounded-full text-[13px] font-black uppercase tracking-widest active:scale-95 transition-all duration-300 text-center"
              style={{ backgroundColor: theme.buttonBg, color: theme.buttonText }}
            >
              Criar conta grátis
            </button>
            <button
              onClick={onComplete}
              className="w-full py-3.5 flex items-center justify-center rounded-full text-[13px] font-black uppercase tracking-widest border-2 active:scale-95 transition-all duration-300 bg-transparent text-center"
              style={{
                color: theme.buttonBg,
                borderColor: theme.buttonBg,
              }}
            >
              Já tenho conta
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
