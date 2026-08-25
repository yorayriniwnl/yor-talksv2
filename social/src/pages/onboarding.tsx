import { useState } from 'react';
import { useLocation } from 'wouter';
import { Network, ArrowRight, UserPlus, Sparkles, CheckCircle2 } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { FloatingParticles } from '@/components/ui/FloatingParticles';

const INTERESTS = [
  "Artificial Intelligence", "Web3", "Startups", "Venture Capital",
  "Design", "Engineering", "Gaming", "Productivity",
  "Investing", "Crypto", "SaaS", "Creator Economy"
];

const SUGGESTED_CREATORS = [
  { id: '1', name: 'Alex Xu', role: 'System Design', avatar: 'https://ui-avatars.com/api/?name=Alex+Xu' },
  { id: '2', name: 'Lex Fridman', role: 'AI Podcast', avatar: 'https://ui-avatars.com/api/?name=Lex+Fridman' },
  { id: '3', name: 'Vitalik', role: 'Ethereum', avatar: 'https://ui-avatars.com/api/?name=Vitalik' },
];

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(1);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [followedIds, setFollowedIds] = useState<string[]>([]);

  const toggleInterest = (interest: string) => {
    setSelectedInterests(prev => 
      prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest]
    );
  };

  const toggleFollow = (id: string) => {
    setFollowedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleFinish = async () => {
    try {
      await api.request('/onboarding/complete', {
        method: 'POST',
        body: JSON.stringify({ interests: selectedInterests, followedCreatorIds: followedIds })
      });
      toast.success("Welcome to Yor Talks!");
      setLocation('/');
    } catch (e) {
      toast.error("Failed to complete setup");
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4 relative overflow-hidden">
      <FloatingParticles />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-background to-background pointer-events-none" />
      
      <div className="w-full max-w-xl surface-1 border border-border/40 rounded-3xl p-8 relative z-10 shadow-2xl">
        
        <div className="flex items-center justify-center mb-8">
          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center glow-neon-primary">
            <Network className="w-6 h-6 text-primary" />
          </div>
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div 
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6 text-center"
            >
              <div className="space-y-2">
                <h1 className="text-2xl font-black font-display uppercase tracking-wider">What builds your DNA?</h1>
                <p className="text-muted-foreground text-sm">Select 3 or more topics to tune your knowledge graph.</p>
              </div>

              <div className="flex flex-wrap gap-2 justify-center py-4">
                {INTERESTS.map(interest => {
                  const isSelected = selectedInterests.includes(interest);
                  return (
                    <button
                      key={interest}
                      onClick={() => toggleInterest(interest)}
                      className={`px-4 py-2 rounded-full text-xs font-bold transition-all border ${isSelected ? 'bg-primary border-primary text-black scale-105' : 'bg-zinc-900 border-border/40 hover:border-primary/50 text-foreground'}`}
                    >
                      {interest}
                    </button>
                  );
                })}
              </div>

              <Button 
                onClick={() => setStep(2)} 
                disabled={selectedInterests.length < 3}
                className="w-full rounded-xl bg-primary text-black font-bold h-12"
              >
                Continue <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div 
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6 text-center"
            >
              <div className="space-y-2">
                <h1 className="text-2xl font-black font-display uppercase tracking-wider">Build Your Network</h1>
                <p className="text-muted-foreground text-sm">Follow creators matching your DNA.</p>
              </div>

              <div className="space-y-3 text-left py-4">
                {SUGGESTED_CREATORS.map(creator => {
                  const isFollowed = followedIds.includes(creator.id);
                  return (
                    <div key={creator.id} className="flex items-center justify-between p-3 rounded-2xl border border-border/40 bg-zinc-900/50">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10"><AvatarImage src={creator.avatar} /></Avatar>
                        <div>
                          <div className="font-bold text-sm">{creator.name}</div>
                          <div className="text-[10px] text-muted-foreground">{creator.role}</div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => toggleFollow(creator.id)}
                        variant={isFollowed ? "outline" : "default"}
                        className={`rounded-full ${isFollowed ? 'border-primary/50 text-primary' : 'bg-white text-black'}`}
                      >
                        {isFollowed ? <CheckCircle2 className="w-4 h-4 mr-1" /> : <UserPlus className="w-4 h-4 mr-1" />}
                        {isFollowed ? 'Following' : 'Follow'}
                      </Button>
                    </div>
                  );
                })}
              </div>

              <Button 
                onClick={handleFinish} 
                className="w-full rounded-xl bg-primary text-black font-bold h-12 glow-neon-primary"
              >
                <Sparkles className="w-4 h-4 mr-2" /> Enter Yor Talks
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
