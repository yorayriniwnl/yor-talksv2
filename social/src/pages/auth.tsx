import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Users, Shield, User, Lock, Mail, Loader2, AtSign } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { fadeInUp, staggerContainer, staggerItem, tapScale } from '@/lib/motion';

export default function Auth() {
  const login = useAppStore((state) => state.login);
  const register = useAppStore((state) => state.register);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMsg('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(username, email, password, fullName);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Something went wrong');
    }
    setLoading(false);
  };

  const switchMode = (newMode: 'login' | 'register') => {
    setMode(newMode);
    setErrorMsg('');
  };

  return (
    <main className="min-h-screen bg-background flex font-sans">
      {/* Left Panel (Desktop Only) */}
      <section className="hidden lg:flex flex-1 relative overflow-hidden bg-background border-r border-border/40 flex-col justify-center px-12 xl:px-24">
        <div className="absolute inset-0 aurora-bg opacity-30 mix-blend-screen pointer-events-none" />
        <div className="absolute inset-0 noise-overlay pointer-events-none" />
        
        <div className="relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary via-purple-500 to-accent grid place-items-center text-white text-3xl font-extrabold mb-8 shadow-xl glow-neon-primary font-display">
            Y
          </div>
          <h1 className="font-display text-5xl font-extrabold tracking-tight text-foreground leading-tight">
            Step into the <br /><span className="text-shimmer">Multiverse</span>.
          </h1>
          <p className="text-lg text-muted-foreground mt-4 font-serif leading-relaxed max-w-md">
            A calmer, deeply expressive social space where your identity, achievements, and circles shine.
          </p>

          <div className="mt-10 space-y-4 font-mono text-xs">
            <div className="flex items-center gap-3 p-3 rounded-2xl surface-1 border border-border/30 max-w-sm">
              <Sparkles className="w-5 h-5 text-primary shrink-0" />
              <span className="font-medium text-foreground">Real interactions, no algorithms</span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-2xl surface-1 border border-border/30 max-w-sm">
              <Users className="w-5 h-5 text-accent shrink-0" />
              <span className="font-medium text-foreground">Gamified profiles & Steam-style walls</span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-2xl surface-1 border border-border/30 max-w-sm">
              <Shield className="w-5 h-5 text-emerald-500 shrink-0" />
              <span className="font-medium text-foreground">Complete privacy & circle control</span>
            </div>
          </div>
        </div>
      </section>

      {/* Right Panel - Auth Form */}
      <section className="flex-1 flex flex-col justify-center items-center p-6 lg:p-12 relative overflow-y-auto">
        {/* Mobile Logo */}
        <div className="lg:hidden absolute top-8 left-1/2 -translate-x-1/2">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent grid place-items-center text-white text-xl font-bold shadow-md glow-neon-primary font-display">
            Y
          </div>
        </div>

        <div className="w-full max-w-sm mx-auto mt-12 lg:mt-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              variants={fadeInUp}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className="w-full"
            >
              <div className="mb-8 text-center lg:text-left">
                <h2 className="font-display text-3xl font-extrabold tracking-tight">
                  {mode === 'login' ? 'Welcome back' : 'Create your account'}
                </h2>
                <p className="text-sm text-muted-foreground mt-1.5 font-serif">
                  {mode === 'login' ? 'Enter your details to enter the void.' : 'Join the next generation of social interaction.'}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {errorMsg && (
                  <div className="p-3.5 text-xs font-mono text-destructive bg-destructive/10 rounded-xl border border-destructive/30">
                    {errorMsg}
                  </div>
                )}

                <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-4">
                  {mode === 'register' && (
                    <>
                      <motion.div variants={staggerItem} className="space-y-1">
                        <Label htmlFor="fullName" className="sr-only">Full name</Label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                            <User className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <Input
                            id="fullName"
                            type="text"
                            placeholder="Full name"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="pl-10 h-11 rounded-xl surface-1 border-border/50 focus-visible:ring-1 focus-visible:ring-primary/40 text-sm"
                            required
                          />
                        </div>
                      </motion.div>
                      
                      <motion.div variants={staggerItem} className="space-y-1">
                        <Label htmlFor="username" className="sr-only">Username</Label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                            <AtSign className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <Input
                            id="username"
                            type="text"
                            placeholder="Username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="pl-10 h-11 rounded-xl surface-1 border-border/50 focus-visible:ring-1 focus-visible:ring-primary/40 text-sm font-mono"
                            required
                          />
                        </div>
                      </motion.div>
                      
                      <motion.div variants={staggerItem} className="space-y-1">
                        <Label htmlFor="email" className="sr-only">Email</Label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <Input
                            id="email"
                            type="email"
                            placeholder="Email address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="pl-10 h-11 rounded-xl surface-1 border-border/50 focus-visible:ring-1 focus-visible:ring-primary/40 text-sm"
                            required
                          />
                        </div>
                      </motion.div>
                    </>
                  )}

                  {mode === 'login' && (
                    <motion.div variants={staggerItem} className="space-y-1">
                      <Label htmlFor="loginUsername" className="sr-only">Username or Email</Label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                          <User className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <Input
                          id="loginUsername"
                          type="text"
                          placeholder="Username or email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="pl-10 h-11 rounded-xl surface-1 border-border/50 focus-visible:ring-1 focus-visible:ring-primary/40 text-sm"
                          required
                        />
                      </div>
                    </motion.div>
                  )}

                  <motion.div variants={staggerItem} className="space-y-1">
                    <Label htmlFor="password" className="sr-only">Password</Label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <Lock className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <Input
                        id="password"
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 h-11 rounded-xl surface-1 border-border/50 focus-visible:ring-1 focus-visible:ring-primary/40 text-sm"
                        required
                      />
                    </div>
                  </motion.div>
                </motion.div>

                <motion.div whileTap={tapScale} className="pt-2">
                  <Button
                    type="submit"
                    disabled={loading || !password || !email || (mode === 'register' && (!username || !fullName))}
                    className="w-full h-11 rounded-xl font-bold text-sm bg-primary text-primary-foreground glow-neon-primary border-0 transition-all"
                  >
                    {loading ? (
                      <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                    ) : mode === 'login' ? (
                      'Sign In'
                    ) : (
                      'Create Account'
                    )}
                  </Button>
                </motion.div>
              </form>

              <div className="mt-8 text-center text-xs font-mono text-muted-foreground">
                {mode === 'login' ? (
                  <>
                    Don't have an account?{' '}
                    <button
                      type="button"
                      onClick={() => switchMode('register')}
                      className="text-primary font-bold hover:underline outline-none"
                    >
                      Create one
                    </button>
                  </>
                ) : (
                  <>
                    Already registered?{' '}
                    <button
                      type="button"
                      onClick={() => switchMode('login')}
                      className="text-primary font-bold hover:underline outline-none"
                    >
                      Sign in
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </section>
    </main>
  );
}
