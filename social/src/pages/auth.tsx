import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Users, Shield, User, Lock, Mail, Loader2, AtSign, Eye, EyeOff } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { fadeInUp, staggerContainer, staggerItem, tapScale } from '@/lib/motion';
import { toast } from 'sonner';

export default function Auth() {
  const login = useAppStore((state) => state.login);
  const register = useAppStore((state) => state.register);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMsg('');
    setFieldErrors({});

    const errors: Record<string, string> = {};
    if (mode === 'register') {
      if (fullName.length < 2) errors.fullName = 'Full name must be at least 2 characters';
      if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) errors.username = 'Username must be 3-20 characters, alphanumeric and underscores only';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Invalid email address';
      if (password.length < 8) errors.password = 'Password must be at least 8 characters';
    } else {
      if (!email) errors.email = 'Email/Username is required';
      if (!password) errors.password = 'Password is required';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

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
    setFieldErrors({});
  };

  return (
    <main className="min-h-screen bg-background flex font-sans relative overflow-hidden">
      {/* Background ambient glowing spheres */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-primary/20 blur-[120px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-accent/20 blur-[120px] pointer-events-none animate-pulse" />

      {/* Left Panel (Desktop Only) */}
      <section className="hidden lg:flex flex-1 relative overflow-hidden bg-card/30 backdrop-blur-xl border-r border-border/40 flex-col justify-center px-12 xl:px-24">
        <div className="absolute inset-0 aurora-bg opacity-20 mix-blend-screen pointer-events-none" />
        <div className="absolute inset-0 noise-overlay pointer-events-none" />
        
        <div className="relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary via-purple-500 to-accent grid place-items-center text-white text-3xl font-extrabold mb-8 shadow-2xl glow-neon-primary font-display">
            Y
          </div>
          <h1 className="font-display text-5xl xl:text-6xl font-extrabold tracking-tight text-foreground leading-[1.1]">
            Step into the <br /><span className="text-shimmer">Multiverse</span>.
          </h1>
          <p className="text-lg text-muted-foreground mt-6 font-serif leading-relaxed max-w-md">
            A calmer, deeply expressive social space where your identity, achievements, and circles shine with resonance.
          </p>

          <div className="mt-10 space-y-3.5 font-mono text-xs">
            <div className="flex items-center gap-3 p-3.5 rounded-2xl glass-heavy border border-border/40 max-w-sm hover:border-primary/40 transition-colors">
              <Sparkles className="w-5 h-5 text-primary shrink-0" />
              <span className="font-medium text-foreground">Real interactions, no algorithms</span>
            </div>
            <div className="flex items-center gap-3 p-3.5 rounded-2xl glass-heavy border border-border/40 max-w-sm hover:border-accent/40 transition-colors">
              <Users className="w-5 h-5 text-accent shrink-0" />
              <span className="font-medium text-foreground">Gamified profiles & Steam-style walls</span>
            </div>
            <div className="flex items-center gap-3 p-3.5 rounded-2xl glass-heavy border border-border/40 max-w-sm hover:border-emerald-500/40 transition-colors">
              <Shield className="w-5 h-5 text-emerald-400 shrink-0" />
              <span className="font-medium text-foreground">Complete privacy & circle control</span>
            </div>
          </div>
        </div>
      </section>

      {/* Right Panel - Auth Form */}
      <section className="flex-1 flex flex-col justify-center items-center p-6 lg:p-12 relative overflow-y-auto z-10">
        {/* Mobile Logo */}
        <div className="lg:hidden absolute top-8 left-1/2 -translate-x-1/2">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent grid place-items-center text-white text-xl font-bold shadow-md glow-neon-primary font-display">
            Y
          </div>
        </div>

        <div className="w-full max-w-md mx-auto mt-12 lg:mt-0 glass-heavy p-8 rounded-3xl border border-border/50 shadow-2xl">
          {/* Mode Switcher Tabs */}
          <div className="flex p-1 bg-muted/60 rounded-2xl mb-8">
            <button
              type="button"
              onClick={() => switchMode('login')}
              className={`flex-1 py-2 text-xs font-bold font-display rounded-xl transition-all ${
                mode === 'login'
                  ? 'bg-background text-foreground shadow-md'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => switchMode('register')}
              className={`flex-1 py-2 text-xs font-bold font-display rounded-xl transition-all ${
                mode === 'register'
                  ? 'bg-background text-foreground shadow-md'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Create Account
            </button>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              variants={fadeInUp}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className="w-full"
            >
              <div className="mb-6 text-center lg:text-left">
                <h2 className="font-display text-2xl lg:text-3xl font-extrabold tracking-tight">
                  {mode === 'login' ? 'Welcome back' : 'Create your account'}
                </h2>
                <p className="text-xs lg:text-sm text-muted-foreground mt-1.5 font-serif">
                  {mode === 'login' ? 'Enter your details to enter the universe.' : 'Join the next generation of social interaction.'}
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
                        {fieldErrors.fullName && <p className="text-xs text-destructive mt-1">{fieldErrors.fullName}</p>}
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
                        {fieldErrors.username && <p className="text-xs text-destructive mt-1">{fieldErrors.username}</p>}
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
                        {fieldErrors.email && <p className="text-xs text-destructive mt-1">{fieldErrors.email}</p>}
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
                      {fieldErrors.email && <p className="text-xs text-destructive mt-1">{fieldErrors.email}</p>}
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
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 pr-10 h-11 rounded-xl surface-1 border-border/50 focus-visible:ring-1 focus-visible:ring-primary/40 text-sm"
                        required
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-muted-foreground hover:text-foreground transition-colors">
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {fieldErrors.password && <p className="text-xs text-destructive mt-1">{fieldErrors.password}</p>}
                    {mode === 'login' && (
                      <div className="text-right">
                        <button type="button" className="text-xs text-primary hover:underline font-medium" onClick={() => toast.info('Password reset link sent! Check your email.')}>
                          Forgot password?
                        </button>
                      </div>
                    )}
                    {mode === 'register' && password.length > 0 && (
                      <div className="mt-2">
                        <div className="flex gap-1 h-1.5 mb-1">
                          <div className={`flex-1 rounded-full ${password.length < 8 ? 'bg-destructive' : 'bg-primary/20'}`} />
                          <div className={`flex-1 rounded-full ${password.length >= 8 ? (password.length >= 12 && /[A-Z]/.test(password) && /[0-9]/.test(password) ? 'bg-emerald-500' : 'bg-amber-500') : 'bg-muted'}`} />
                          <div className={`flex-1 rounded-full ${password.length >= 12 && /[A-Z]/.test(password) && /[0-9]/.test(password) ? 'bg-emerald-500' : 'bg-muted'}`} />
                        </div>
                        <p className="text-[10px] font-mono text-muted-foreground text-right">
                          {password.length < 8 ? <span className="text-destructive">Weak</span> : password.length >= 12 && /[A-Z]/.test(password) && /[0-9]/.test(password) ? <span className="text-emerald-500">Strong</span> : <span className="text-amber-500">Medium</span>}
                        </p>
                      </div>
                    )}
                  </motion.div>
                </motion.div>

                <motion.div whileTap={tapScale} className="pt-2">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-11 rounded-xl font-bold text-sm bg-primary text-primary-foreground glow-neon-primary border-0 transition-all hover:scale-[1.02] active:scale-[0.98]"
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

                {/* Instant Demo Login Button */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    login('yorayriniwnl', 'password').catch(() => {});
                  }}
                  className="w-full h-10 rounded-xl font-bold text-xs border-primary/30 text-primary hover:bg-primary/10 transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1.5 text-primary" /> Enter Demo Account Immediately
                </Button>
              </form>
            </motion.div>
          </AnimatePresence>
        </div>
      </section>
    </main>
  );
}
