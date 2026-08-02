import { motion } from 'framer-motion';
import { User } from '@/lib/store';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sparkles, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HoloAvatarCardProps {
  user: User;
  level?: number;
}

export function HoloAvatarCard({ user, level = 5 }: HoloAvatarCardProps) {
  return (
    <motion.div
      whileHover={{ rotateY: 12, rotateX: -8, scale: 1.03 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      style={{ transformStyle: 'preserve-3d' }}
      className="relative p-6 rounded-3xl surface-1 border border-primary/30 shadow-2xl overflow-hidden group cursor-pointer font-sans"
    >
      {/* Holographic Particle Aura Background */}
      <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 via-purple-600/20 to-accent/20 opacity-50 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="absolute -inset-full bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center text-center">
        <div className="steam-frame-neon p-1 rounded-full mb-3 shadow-xl">
          <Avatar className="w-20 h-20 border-2 border-background">
            <AvatarImage src={user.avatarUrl} />
            <AvatarFallback className="font-display font-bold text-2xl">{user.displayName.charAt(0)}</AvatarFallback>
          </Avatar>
        </div>

        <h4 className="font-display font-extrabold text-base leading-tight truncate">{user.displayName}</h4>
        <p className="text-xs text-muted-foreground font-mono">@{user.username}</p>

        <div className="level-badge mt-3 text-xs">
          <Shield className="w-3.5 h-3.5 text-amber-400" /> Level {level} Holo Card
        </div>
      </div>
    </motion.div>
  );
}
