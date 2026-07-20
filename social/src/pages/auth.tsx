import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function Auth() {
  const login = useAppStore((s) => s.login);
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      login(email);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-background">
      {/* Left side - Visual/Brand */}
      <div className="hidden lg:flex w-1/2 bg-zinc-950 p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent opacity-50 mix-blend-overlay"></div>
        
        {/* Abstract decorative shapes */}
        <div className="absolute top-20 right-20 w-64 h-64 bg-primary/30 rounded-full blur-3xl filter"></div>
        <div className="absolute bottom-20 left-20 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl filter"></div>

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-display font-bold text-2xl shadow-primary/30 shadow-lg">
              Y
            </div>
            <span className="font-display font-bold text-2xl text-white tracking-tight">Yor Talks</span>
          </div>
        </div>

        <div className="relative z-10 max-w-md">
          <h1 className="text-5xl font-display font-medium text-white leading-[1.1] tracking-tight mb-6">
            Where your world moves faster.
          </h1>
          <p className="text-zinc-400 text-lg">
            Join the most vibrant community of creators, thinkers, and makers. Share moments, spark discussions, and find your people.
          </p>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative">
        <div className="w-full max-w-sm space-y-8">
          <div className="lg:hidden flex items-center gap-3 justify-center mb-12">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-display font-bold text-2xl shadow-primary/30 shadow-lg">
              Y
            </div>
            <span className="font-display font-bold text-2xl tracking-tight">Yor Talks</span>
          </div>

          <div className="space-y-2 text-center lg:text-left">
            <h2 className="text-3xl font-display font-medium tracking-tight">
              {mode === 'login' ? 'Welcome back' : mode === 'signup' ? 'Create an account' : 'Reset password'}
            </h2>
            <p className="text-muted-foreground">
              {mode === 'login' ? 'Enter your details to sign in to your account' : mode === 'signup' ? 'Enter your details to get started' : 'We will send you a reset link'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="name@example.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required 
                className="h-12 bg-muted/50 border-transparent focus-visible:ring-primary/50 transition-all rounded-xl"
              />
            </div>
            
            {mode !== 'forgot' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  {mode === 'login' && (
                    <button type="button" onClick={() => setMode('forgot')} className="text-sm font-medium text-primary hover:underline">
                      Forgot password?
                    </button>
                  )}
                </div>
                <Input 
                  id="password" 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required 
                  className="h-12 bg-muted/50 border-transparent focus-visible:ring-primary/50 transition-all rounded-xl"
                />
              </div>
            )}

            <Button type="submit" className="w-full h-12 rounded-xl font-medium shadow-primary/20 shadow-lg text-md mt-6">
              {mode === 'login' ? 'Sign in' : mode === 'signup' ? 'Sign up' : 'Send reset link'}
            </Button>
          </form>

          <div className="text-center text-sm text-muted-foreground mt-6">
            {mode === 'login' ? (
              <p>
                Don't have an account?{' '}
                <button onClick={() => setMode('signup')} className="font-medium text-primary hover:underline">
                  Sign up
                </button>
              </p>
            ) : (
              <p>
                Already have an account?{' '}
                <button onClick={() => setMode('login')} className="font-medium text-primary hover:underline">
                  Sign in
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
