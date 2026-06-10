import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';

interface SplashScreenProps {
  onComplete: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [phase, setPhase] = useState<1 | 2>(1);

  const pathVariants = {
    hidden: { pathLength: 0, opacity: 0 },
    visible: {
      pathLength: 1,
      opacity: 1,
      transition: { duration: 1.4, ease: "easeInOut" }
    }
  };

  const scissorsPath = "M6 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm0 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm14-17L8.12 15.88M14.47 14.48 20 20M8.12 8.12 12 12";
  const flamePath = "M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z";

  return (
    <motion.div
      className="fixed inset-0 bg-[#F97316] flex items-center justify-center z-50 origin-center"
      initial={{ scale: 1, opacity: 1 }}
      animate={
        phase === 2
          ? { scale: 5, opacity: 0 }
          : { scale: 1, opacity: 1 }
      }
      transition={{ duration: 0.5, ease: "easeIn", delay: 0.3 }}
      onAnimationComplete={(definition) => {
        if (definition && typeof definition === 'object' && definition.opacity === 0) {
          onComplete();
        }
      }}
    >
      <div className="relative w-32 h-32 flex items-center justify-center">
        <svg
          viewBox="0 0 24 24"
          className="w-full h-full"
          stroke="white"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill={phase === 2 ? "white" : "transparent"}
          style={{ transition: "fill 0.3s ease" }}
        >
          {/* Flame element */}
          <motion.path
            d={flamePath}
            variants={pathVariants}
            initial="hidden"
            animate="visible"
            onAnimationComplete={() => setPhase(2)}
          />
          {/* Scissors element overlay */}
          <motion.path
            d={scissorsPath}
            variants={pathVariants}
            initial="hidden"
            animate="visible"
          />
        </svg>
      </div>
    </motion.div>
  );
}
