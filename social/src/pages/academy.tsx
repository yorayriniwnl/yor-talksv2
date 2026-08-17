import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  GraduationCap, BookOpen, Trophy, Play, CheckCircle2, 
  Sparkles, Award, Star, Clock, ShieldCheck, Flame 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface Masterclass {
  id: string;
  title: string;
  instructor: string;
  instructorRole: string;
  instructorAvatar: string;
  game: string;
  duration: string;
  modulesCount: number;
  completed: boolean;
  cover: string;
  badge: string;
}

const MASTERCLASSES: Masterclass[] = [
  {
    id: 'mc-1',
    title: 'Valorant IGL & Macro Tactical Execution',
    instructor: 'Hellranger Pro',
    instructorRole: 'Head Coach · Global Esports',
    instructorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop',
    game: 'Valorant',
    duration: '4h 30m',
    modulesCount: 12,
    completed: true,
    cover: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=800&auto=format&fit=crop',
    badge: '🎓 CERTIFIED TACTICAL IGL'
  },
  {
    id: 'mc-2',
    title: 'BGMI Late Zone Rotations & Zone Hard-Shift Reads',
    instructor: 'Mortal Soul',
    instructorRole: 'World Championship MVP · Team Soul',
    instructorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop',
    game: 'BGMI',
    duration: '6h 15m',
    modulesCount: 16,
    completed: false,
    cover: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=800&auto=format&fit=crop',
    badge: '👑 APEX CIRCLE MASTER'
  },
  {
    id: 'mc-3',
    title: 'Cyberpunk Game Development & WebGL Shaders',
    instructor: 'Yor Engineering Guild',
    instructorRole: 'Core Architects · Yor Talks',
    instructorAvatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=200&auto=format&fit=crop',
    game: 'Engineering',
    duration: '8h 00m',
    modulesCount: 20,
    completed: false,
    cover: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=800&auto=format&fit=crop',
    badge: '⚡ SHADER ARCHITECT'
  }
];

export default function EsportsAcademy() {
  const [classes, setClasses] = useState<Masterclass[]>(MASTERCLASSES);

  const handleClaimCertificate = (title: string) => {
    sounds.playChime();
    triggerConfetti();
    toast.success(`📜 Official Pro Gamer Masterclass Certificate generated for "${title}"! Added to your Profile Showcase.`);
  };

  const handleEnroll = (title: string) => {
    sounds.playPop();
    triggerConfetti();
    toast.success(`🚀 Enrolled in "${title}"! Lesson 1 is now ready to play.`);
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-400 to-cyan-500 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Bharat Esports Academy & Masterclasses</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Learn Pro Tactics from India's Top Esports Coaches & Players</p>
          </div>
        </div>

        <div className="level-badge shadow-sm">
          <Award className="w-3.5 h-3.5 fill-amber-400" /> Free with Yor Pass
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {classes.map((course) => (
            <div
              key={course.id}
              className="surface-1 rounded-3xl p-5 border border-border/40 flex flex-col justify-between shadow-xl space-y-4 hover:border-primary/50 transition-all"
            >
              <div className="space-y-4">
                <div className="aspect-video rounded-2xl overflow-hidden relative group">
                  <img src={course.cover} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-3">
                    <span className="px-2.5 py-0.5 rounded-full bg-primary text-primary-foreground font-mono font-bold text-[0.65rem]">
                      {course.game}
                    </span>
                  </div>
                </div>

                <div>
                  <h3 className="font-display font-bold text-base text-foreground leading-snug">{course.title}</h3>
                  <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground mt-2">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{course.duration} &middot; {course.modulesCount} Modules</span>
                  </div>
                </div>

                {/* Instructor */}
                <div className="flex items-center gap-3 pt-3 border-t border-border/30">
                  <Avatar className="w-9 h-9 border border-border">
                    <AvatarImage src={course.instructorAvatar} />
                    <AvatarFallback>{course.instructor[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <strong className="text-xs font-display text-foreground block">{course.instructor}</strong>
                    <span className="text-[0.65rem] font-mono text-muted-foreground">{course.instructorRole}</span>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                {course.completed ? (
                  <Button
                    onClick={() => handleClaimCertificate(course.title)}
                    className="w-full rounded-2xl font-bold text-xs h-11 bg-emerald-500 hover:bg-emerald-600 text-black shadow-lg"
                  >
                    <Award className="w-4 h-4 mr-1.5" /> Claim Pro Certificate
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleEnroll(course.title)}
                    className="w-full rounded-2xl font-bold text-xs h-11 bg-primary text-primary-foreground glow-neon-primary shadow-lg"
                  >
                    <Play className="w-4 h-4 mr-1.5 fill-white" /> Enroll & Start Lesson 1
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
