import { Link } from 'wouter';
import { motion } from 'framer-motion';
import { Home, Compass, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 py-20 text-center bg-background">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col items-center"
      >
        {/* Animated 404 */}
        <div className="relative mb-8">
          <span className="font-display font-black text-[8rem] leading-none tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-primary via-purple-500 to-accent opacity-20 select-none">
            404
          </span>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
              <Compass className="w-10 h-10 text-primary" />
            </div>
          </div>
        </div>

        <h1 className="font-display font-extrabold text-2xl mb-3 text-foreground">
          Lost in the Multiverse
        </h1>
        <p className="text-sm text-muted-foreground max-w-md mb-8 font-serif leading-relaxed">
          The page you're looking for doesn't exist or has been moved to another dimension.
        </p>

        <div className="flex items-center gap-3">
          <Link href="/">
            <Button className="rounded-2xl font-bold text-xs glow-neon-primary">
              <Home className="w-4 h-4 mr-2" /> Go Home
            </Button>
          </Link>
          <Link href="/explore">
            <Button variant="outline" className="rounded-2xl font-bold text-xs">
              <Compass className="w-4 h-4 mr-2" /> Explore
            </Button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
