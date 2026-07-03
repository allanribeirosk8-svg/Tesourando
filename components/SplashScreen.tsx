import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';

interface SplashScreenProps {
  onComplete: () => void;
  isReady?: boolean;
}

export function SplashScreen({ onComplete, isReady = true }: SplashScreenProps) {
  // Fases do Splash Screen para garantir uma transição imperceptível:
  // 1. 'bridge': Exibe a logo idêntica ao Android Splash nativo (estático e preenchido).
  // 2. 'drawing': Desvanece o preenchimento sólido e inicia a animação clássica de desenho.
  // 3. 'filled': Desenho completo, re-preenche suavemente a logo em branco.
  // 4. 'exit': Dissolve a tela inteira (fade-out) revelando o app por baixo.
  const [phase, setPhase] = useState<'bridge' | 'drawing' | 'filled' | 'exit'>('bridge');

  const pathVariants = {
    hidden: { pathLength: 0, opacity: 0 },
    visible: {
      pathLength: 1,
      opacity: 1,
      transition: { duration: 1.4, ease: "easeInOut" }
    },
    bridge: {
      pathLength: 1,
      opacity: 1,
      transition: { duration: 0 }
    }
  };

  useEffect(() => {
    // Fase 1 (Ponte): Aguarda o app estar pronto (isReady === true) e transiciona para o desenho.
    if (phase === 'bridge' && isReady) {
      const timer = setTimeout(() => {
        setPhase('drawing');
      }, 300); // Pequeno atraso confortável para manter o logo estático e sincronizado
      return () => clearTimeout(timer);
    }
  }, [phase, isReady]);

  useEffect(() => {
    // Fase 3 (Preenchimento): Aguarda o preenchimento se consolidar por 500ms e inicia a saída
    if (phase === 'filled') {
      const exitTimer = setTimeout(() => {
        setPhase('exit');
      }, 500);
      return () => clearTimeout(exitTimer);
    }
  }, [phase]);

  const isBridge = phase === 'bridge';
  const animateState = isBridge ? 'bridge' : 'visible';
  const initialState = isBridge ? 'bridge' : 'hidden';

  return (
    <motion.div
      className="fixed inset-0 bg-[#F97316] flex items-center justify-center z-50 origin-center"
      initial={{ opacity: 1, scale: 1 }}
      animate={
        phase === 'exit'
          ? { opacity: 0, scale: 1.02 }
          : { opacity: 1, scale: 1 }
      }
      transition={{ duration: 0.5, ease: "easeInOut" }}
      onAnimationComplete={(definition) => {
        // Quando a animação de saída se completa, chama o callback final
        if (phase === 'exit') {
          onComplete();
        }
      }}
    >
      {/* 
        Para garantir 100% de coincidência visual com a logo de inicialização do Android PWA,
        usamos um contêiner quadrado de 192px x 192px. A tag SVG em si, com viewBox="0 0 500 580",
        irá se auto-ajustar (contain) preservando sua proporção sem nenhum achatamento ou distorção.
      */}
      <div className="relative w-[192px] h-[192px] flex items-center justify-center">
        <svg
          viewBox="0 0 500 580"
          className="w-full h-full"
          stroke="white"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="transparent"
        >
          <motion.path
            d="m 159.6162,405.51024 h -52.16592 c -21.059344,0 -38.013257,-14.11285 -38.013257,-31.64316 V 110.91606 c 0,-17.530302 16.953913,-31.643149 38.013257,-31.643149 v 0 h 285.09944 c 21.05934,0 38.01326,14.112847 38.01326,31.643149 v 262.95102 c 0,17.53031 -16.95392,31.64316 -38.01326,31.64316 h -44.938"
            variants={pathVariants} initial={initialState} animate={animateState} strokeWidth="18.75"
            fill="transparent"
          />
          <motion.rect
            x="130.17368" y="36.133911" width="41.139721" height="90.919548" rx="12.510134" ry="4.018713"
            variants={pathVariants} initial={initialState} animate={animateState} strokeWidth="4"
            fill={phase === 'bridge' || phase === 'filled' || phase === 'exit' ? "white" : "transparent"}
            style={{ transition: "fill 0.4s ease-in-out" }}
          />
          <motion.rect
            x="331.16425" y="35.94252" width="41.139721" height="90.919548" rx="12.510134" ry="4.018713"
            variants={pathVariants} initial={initialState} animate={animateState} strokeWidth="4"
            fill={phase === 'bridge' || phase === 'filled' || phase === 'exit' ? "white" : "transparent"}
            style={{ transition: "fill 0.4s ease-in-out" }}
          />
          <motion.path
             variants={pathVariants} initial={initialState} animate={animateState} strokeWidth="4"
             d="M 184.95601,165.26642 H 249.43 v 55.87746 h -64.47399 z"
             transform="matrix(0.90935314,0,0,0.9722236,148.00979,1.1581129)"
             fill={phase === 'bridge' || phase === 'filled' || phase === 'exit' ? "white" : "transparent"}
             style={{ transition: "fill 0.4s ease-in-out" }}
          />
          <motion.path
             variants={pathVariants} initial={initialState} animate={animateState} strokeWidth="4"
             d="M 184.95601,165.26642 H 249.43 v 55.87746 h -64.47399 z"
             transform="matrix(0.90935314,0,0,0.9722236,54.90651,0.81587728)"
             fill={phase === 'bridge' || phase === 'filled' || phase === 'exit' ? "white" : "transparent"}
             style={{ transition: "fill 0.4s ease-in-out" }}
          />
          <motion.path
             variants={pathVariants} initial={initialState} animate={animateState} strokeWidth="4"
             d="M 184.95601,165.26642 H 249.43 v 55.87746 h -64.47399 z"
             transform="matrix(0.90935314,0,0,0.9722236,54.973089,74.273945)"
             fill={phase === 'bridge' || phase === 'filled' || phase === 'exit' ? "white" : "transparent"}
             style={{ transition: "fill 0.4s ease-in-out" }}
          />
          <motion.path
             variants={pathVariants} initial={initialState} animate={animateState} strokeWidth="4"
             d="M 184.95601,165.26642 H 249.43 v 55.87746 h -64.47399 z"
             transform="matrix(0.90935314,0,0,0.9722236,-41.626584,0.97151711)"
             fill={phase === 'bridge' || phase === 'filled' || phase === 'exit' ? "white" : "transparent"}
             style={{ transition: "fill 0.4s ease-in-out" }}
          />
          <motion.path
             variants={pathVariants} initial={initialState} animate={animateState} strokeWidth="13.59"
             d="m 144.10468,241.86058 34.01953,31.11336 v -31.19883 z"
             fill={phase === 'bridge' || phase === 'filled' || phase === 'exit' ? "white" : "transparent"}
             style={{ transition: "fill 0.4s ease-in-out" }}
          />
          <g transform="matrix(1.0632609,-0.04930965,0.05068833,1.0734833,-29.464178,-36.058421)">
            <g transform="matrix(0.9971861,0.07358643,-0.07637113,0.9971861,30.87178,-16.735104)">
              {/* Adicionamos fillRule="evenodd" para recortar corretamente o furo da tesoura e evitar preenchimento sólido indesejado */}
              <motion.path
                 variants={pathVariants} initial={initialState} animate={animateState} strokeWidth="3.82"
                 d="m 384.79378,250.96845 c -0.46996,-0.004 -0.96202,0.051 -1.4703,0.17579 -4.00067,0.98168 -126.5987,121.99618 -153.08486,151.10734 -9.29525,10.21652 -23.29639,25.50039 -31.112,33.96545 -7.81555,8.46501 -15.42871,16.79844 -16.91842,18.51684 -2.70858,3.12439 -2.70925,3.12286 -6.2228,0.61912 -12.32072,-8.77974 -31.36271,-11.72681 -44.31672,-6.86106 -49.083175,18.43661 -40.725838,84.99164 11.52267,91.76203 33.4605,4.3358 62.53397,-30.04397 51.45246,-60.84527 -2.08196,-5.78676 33.46157,-43.91039 40.93863,-43.91039 7.02304,0 31.27559,-17.79454 41.45803,-30.41677 21.39786,-26.52492 107.79809,-141.22574 111.56689,-148.11135 1.63692,-2.99066 -0.52373,-5.97167 -3.81358,-6.00173 z M 248.81312,395.89049 a 13.228813,12.199217 0 0 1 13.2287,12.2007 13.228813,12.199217 0 0 1 -13.2287,12.19873 13.228813,12.199217 0 0 1 -13.22868,-12.19873 13.228813,12.199217 0 0 1 13.22868,-12.2007 z m -100.63954,65.60094 c 7.59241,0.008 15.40706,2.80436 22.15836,9.38829 17.42396,16.99207 7.73556,53.24397 -14.26349,53.37096 -1.31823,0.008 -1.59808,0.19618 -0.91895,0.61716 0.72964,0.45221 0.54326,0.71859 -0.73313,1.05269 -18.79297,4.91947 -41.36698,-13.16481 -40.78082,-32.66863 0.0317,-1.05752 0.0676,-1.65026 0.13784,-1.71478 l 0.002,-0.002 0.002,-0.002 h 0.002 l 0.002,-0.002 h 0.002 0.002 c 7.2e-4,7e-5 0.005,-1.6e-4 0.006,0 l 0.002,0.002 h 0.002 l 0.002,0.002 c 0.10576,0.0782 0.28137,1.12795 0.59929,3.3026 0.78907,5.39737 4.42339,14.35753 6.59438,16.25914 0.46192,0.40456 0.73714,0.60749 0.80906,0.57809 l 0.002,-0.002 0.002,-0.002 h 0.002 v -0.002 l 0.002,-0.002 0.002,-0.002 c 0.0551,-0.10711 -0.34653,-0.75399 -1.23656,-2.04288 -15.95254,-23.10086 4.82283,-48.15734 27.60004,-48.13093 z"
                 fill={phase === 'bridge' || phase === 'filled' || phase === 'exit' ? "white" : "transparent"}
                 fillRule="evenodd"
                 style={{ transition: "fill 0.4s ease-in-out" }}
              />
              <motion.ellipse
                 variants={pathVariants} initial={initialState} animate={animateState} strokeWidth="17.6"
                 cx="147.43405" cy="493.64871" rx="40.670612" ry="39.290817"
                 fill="transparent"
              />
            </g>
          </g>
          <g transform="matrix(1.0644244,0,0,1.074658,-9.6569906,-48.534073)">
            {/* Adicionamos fillRule="evenodd" para o braço e furo simétrico da tesoura */}
            <motion.path
               variants={pathVariants} initial={initialState} animate={animateState} strokeWidth="3.91"
               d="m 99.645855,254.9736 c -1.808281,0.0562 -4.589829,2.51013 -4.527794,3.9943 0.105449,2.52184 3.032857,6.24889 56.431599,71.82738 29.76013,36.54811 46.71578,57.16971 60.171,73.17941 5.35101,6.36694 5.30905,6.33477 6.60907,4.93244 6.18129,-6.66754 21.37571,-24.88586 21.35282,-25.60212 -0.057,-1.78263 -138.21029,-128.38812 -140.036695,-128.33141 z"
               fill={phase === 'bridge' || phase === 'filled' || phase === 'exit' ? "white" : "transparent"}
               fillRule="evenodd"
               style={{ transition: "fill 0.4s ease-in-out" }}
            />
            <motion.ellipse
               variants={pathVariants} initial={initialState} animate={animateState} strokeWidth="17.76"
               cx="344.13028" cy="491.4552" rx="41.058758" ry="39.650139"
               fill="transparent"
            />
            <motion.path
               variants={pathVariants} initial={initialState} animate={animateState} strokeWidth="2.78"
               onAnimationComplete={() => {
                 if (phase === 'drawing') {
                   setPhase('filled');
                 }
               }}
               d="m 273.34332,415.51804 41.32784,41.89298 -14.06716,19.64594 -45.05537,-42.8835 z"
               fill={phase === 'bridge' || phase === 'filled' || phase === 'exit' ? "white" : "transparent"}
               style={{ transition: "fill 0.4s ease-in-out" }}
            />
          </g>
        </svg>
      </div>
    </motion.div>
  );
}
