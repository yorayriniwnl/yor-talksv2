import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Sparkles, Flame, Rocket, Star } from 'lucide-react';
import { sounds } from '@/lib/sound';

interface FloatingEmoji {
  id: string;
  emoji: string;
  xOffset: number;
  rotation: number;
}

const EMOJIS = ['❤️', '🔥', '✨', '🎉', '💎', '🚀', '⭐', '👏'];

export function triggerFloatingReaction(emoji?: string) {
  const selectedEmoji = emoji || EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
  const event = new CustomEvent('trigger-floating-reaction', { detail: { emoji: selectedEmoji } });
  window.dispatchEvent(event);
}

export function FloatingReactionStream() {
  const [items, setItems] = useState<FloatingEmoji[]>([]);

  useEffect(() => {
    const handleEvent = (e: Event) => {
      const customEvt = e as CustomEvent<{ emoji: string }>;
      const newItem: FloatingEmoji = {
        id: Math.random().toString(36).substring(2, 9),
        emoji: customEvt.detail?.emoji || '❤️',
        xOffset: (Math.random() - 0.5) * 80, // sway horizontally
        rotation: (Math.random() - 0.5) * 40,
      };

      setItems((prev) => [...prev.slice(-25), newItem]); // cap at 25 concurrent
    };

    window.addEventListener('trigger-floating-reaction', handleEvent);
    return () => window.removeEventListener('trigger-floating-reaction', handleEvent);
  }, []);

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  return (
    <div className="fixed bottom-12 right-6 z-[90] pointer-events-none flex flex-col items-center">
      <AnimatePresence>
        {items.map((item) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 0, scale: 0.4, x: item.xOffset, rotate: item.rotation }}
            animate={{
              opacity: [0, 1, 1, 0],
              y: -360,
              scale: [0.4, 1.3, 1, 0.8],
              x: item.xOffset + Math.sin(item.rotation) * 40,
              rotate: item.rotation * 1.5,
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2.2, ease: 'easeOut' }}
            onAnimationComplete={() => removeItem(item.id)}
            className="absolute bottom-0 text-3xl drop-shadow-[0_0_12px_rgba(244,63,94,0.6)] select-none"
          >
            {item.emoji}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
