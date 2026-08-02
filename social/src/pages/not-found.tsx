import { motion } from 'framer-motion';
import { Link } from 'wouter';
import { fadeInScale } from '@/lib/motion';
import { Button } from '@/components/ui/button';
import { Compass, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-screen px-4 bg-background relative overflow-hidden">
      <div className="absolute inset-0 aurora-bg opacity-30 pointer-events-none" />
      <div className="absolute inset-0 noise-overlay pointer-events-none" />
      
      <motion.div
        variants={fadeInScale}
        initial="hidden"
        animate="visible"
        className="flex flex-col items-center text-center relative z-10 max-w-md p-8 rounded-3xl surface-1 border border-border/40 shadow-2xl"
      >
        <motion.h1
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          className="font-display text-7xl font-extrabold text-shimmer mb-2 tracking-tight"
        >
          404
        </motion.h1>
        <h2 className="font-display font-bold text-xl mb-2 text-foreground">Lost in the Multiverse</h2>
        <p className="text-xs text-muted-foreground font-serif leading-relaxed max-w-xs mb-8">
          The dimension or coordinate you are looking for has collapsed or does not exist.
        </p>
        <Link href="/">
          <Button className="rounded-xl font-bold text-xs px-6 h-11 glow-neon-primary bg-primary">
            <Home className="w-4 h-4 mr-1.5" /> Return to Home
          </Button>
        </Link>
      </motion.div>
    </div>
  );
}
