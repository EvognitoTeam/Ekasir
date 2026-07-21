import { motion } from 'framer-motion';

export default function Confetti() {
  const particles = Array.from({ length: 50 });
  const colors = ['#7f5041', '#5a6052', '#36645d', '#d6c2bd', '#fcf9f4'];

  return (
    <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
      {particles.map((_, i) => {
        const size = Math.random() * 10 + 5;
        const color = colors[Math.floor(Math.random() * colors.length)];
        const xStart = Math.random() * 100;
        const xEnd = xStart + (Math.random() * 20 - 10);
        const duration = Math.random() * 2 + 2;
        const delay = Math.random() * 0.5;

        return (
          <motion.div
            key={i}
            initial={{ 
              opacity: 1, 
              y: -20, 
              x: `${xStart}vw`, 
              rotate: 0,
              scale: 0
            }}
            animate={{ 
              opacity: 0, 
              y: '110vh', 
              x: `${xEnd}vw`, 
              rotate: Math.random() * 360 * 2,
              scale: 1
            }}
            transition={{ 
              duration, 
              delay, 
              ease: [0.23, 0.81, 0.32, 1] 
            }}
            style={{
              position: 'absolute',
              width: size,
              height: size,
              backgroundColor: color,
              borderRadius: Math.random() > 0.5 ? '50%' : '2px',
            }}
          />
        );
      })}
    </div>
  );
}
