import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppStore } from '@/lib/store';
import { api, type ContactShield } from '@/lib/api-client';
import { motion } from 'framer-motion';
import { fadeInUp, springGentle } from '@/lib/motion';
import { toast } from 'sonner';
import { Palette, Shield, Bell, User, LogOut, Trash2, Sliders, ContactRound, Fingerprint, Loader2, Plus, X } from 'lucide-react';

type DeviceContact = { name?: string[]; email?: string[] };
type ContactPickerNavigator = Navigator & {
  contacts?: {
    select: (properties: string[], options?: { multiple?: boolean }) => Promise<DeviceContact[]>;
  };
};

function ContactShieldPanel() {
  const [shields, setShields] = useState<ContactShield[]>([]);
  const [emailInput, setEmailInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [pickerAvailable, setPickerAvailable] = useState(false);

  useEffect(() => {
    setPickerAvailable(typeof navigator !== 'undefined' && Boolean((navigator as ContactPickerNavigator).contacts?.select));
    let cancelled = false;
    api.getContactShields()
      .then((items) => { if (!cancelled) setShields(items); })
      .catch(() => { if (!cancelled) toast.error('Could not load your IRL Shield list'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const addEmails = async (emails: string[]) => {
    const uniqueEmails = [...new Set(emails.map((email) => email.trim().toLowerCase()).filter((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)))];
    if (uniqueEmails.length === 0) {
      toast.error('Add a valid email address to shield');
      return;
    }
    setAdding(true);
    try {
      const updated = await api.addContactShields(uniqueEmails.map((value) => ({ type: 'email' as const, value })));
      setShields(updated);
      setEmailInput('');
      toast.success(`${uniqueEmails.length} contact${uniqueEmails.length === 1 ? '' : 's'} shielded`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update your shield');
    } finally {
      setAdding(false);
    }
  };

  const handleManualAdd = () => void addEmails(emailInput.split(/[\n,]+/));

  const handlePickContacts = async () => {
    const picker = (navigator as ContactPickerNavigator).contacts;
    if (!picker) {
      toast.error('Your browser does not expose contacts. Add an email manually instead.');
      return;
    }
    try {
      const contacts = await picker.select(['name', 'email'], { multiple: true });
      await addEmails(contacts.flatMap((contact) => contact.email ?? []));
    } catch {
      // Closing the system picker is a normal, non-error action.
    }
  };

  const removeShield = async (shield: ContactShield) => {
    try {
      await api.removeContactShield(shield.id);
      setShields((current) => current.filter((item) => item.id !== shield.id));
      toast.success('Contact shield removed');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not remove contact shield');
    }
  };

  return (
    <section className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/[0.12] via-card to-accent/[0.08] p-6 shadow-[0_20px_80px_-40px_hsl(var(--primary)/0.55)]">
      <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-primary/15 blur-3xl" />
      <div className="relative space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-background/70 text-primary shadow-inner ring-1 ring-primary/20">
              <Fingerprint className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-base font-bold">IRL Shield</h3>
                <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[0.58rem] font-bold uppercase tracking-[0.16em] text-primary">Private beta</span>
              </div>
              <p className="mt-1 max-w-md text-xs leading-relaxed text-muted-foreground">Keep selected people from finding your profile, posts or recommendations. They will never be told.</p>
            </div>
          </div>
          <div className="hidden shrink-0 text-right sm:block">
            <p className="font-display text-2xl font-bold text-primary">{loading ? '—' : shields.length}</p>
            <p className="text-[0.58rem] font-bold uppercase tracking-[0.15em] text-muted-foreground">shielded</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <div className="flex gap-2">
            <Input
              value={emailInput}
              onChange={(event) => setEmailInput(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter') handleManualAdd(); }}
              placeholder="Paste a KIIT email or email from contacts"
              aria-label="Email to shield"
              className="h-11 rounded-2xl border-primary/15 bg-background/60"
            />
            <Button type="button" onClick={handleManualAdd} disabled={adding} className="h-11 shrink-0 rounded-2xl px-3 sm:px-4">
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              <span className="hidden sm:inline">Shield</span>
            </Button>
          </div>
          {pickerAvailable && (
            <Button type="button" variant="outline" onClick={handlePickContacts} disabled={adding} className="h-11 rounded-2xl border-primary/20 bg-background/40 font-bold">
              <ContactRound className="h-4 w-4" /> Pick contacts
            </Button>
          )}
        </div>

        <div className="flex items-start gap-2 rounded-2xl border border-border/40 bg-background/35 px-3 py-2.5 text-[0.68rem] leading-relaxed text-muted-foreground">
          <Shield className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
          <span>We retain protected match codes only. Contact names and your full address book stay on your device. Phone-number matching will activate after verified phone identity is added to the beta.</span>
        </div>

        {shields.length > 0 && (
          <div className="space-y-2 border-t border-border/40 pt-4">
            <p className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-muted-foreground">Your shield list</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {shields.map((shield, index) => (
                <div key={shield.id} className="flex items-center justify-between rounded-2xl border border-border/40 bg-background/45 px-3 py-2.5">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><ContactRound className="h-3.5 w-3.5" /></div>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold">Protected contact {index + 1}</p>
                      <p className="text-[0.62rem] text-muted-foreground">{shield.type === 'email' ? 'Email match' : 'Phone match'}</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => void removeShield(shield)} aria-label={`Remove protected contact ${index + 1}`} className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default function Settings() {
  const { theme, setTheme } = useTheme();
  
  const logout = useAppStore((s: any) => s.logout);
  const privacySettings = useAppStore((s: any) => s.privacySettings || s.privacy || {});
  const updatePrivacySettings = useAppStore((s: any) => s.updatePrivacySettings || s.updatePrivacy);

  const handlePrivacyChange = (key: string, value: any) => {
    updatePrivacySettings({ ...privacySettings, [key]: value });
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold font-display text-foreground">Settings</h1>
          <p className="text-[0.68rem] text-muted-foreground font-mono">Personalize your Multiverse</p>
        </div>
        <div className="level-badge">
          <Sliders className="w-3.5 h-3.5" /> Controls
        </div>
      </div>

      <motion.div 
        variants={fadeInUp}
        initial="initial"
        animate="animate"
        className="max-w-2xl mx-auto px-4 sm:px-6 pt-6 space-y-8"
      >
        {/* Appearance */}
        <section className="surface-1 rounded-2xl p-6 border border-border/40 space-y-4">
          <div className="showcase-section-title mb-2">
            <Palette className="w-4 h-4 text-primary" />
            <h3>Appearance</h3>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Theme Preference</p>
              <p className="text-xs text-muted-foreground">Select your preferred color environment</p>
            </div>
            <Select value={theme} onValueChange={setTheme}>
              <SelectTrigger className="w-36 rounded-xl font-medium">
                <SelectValue placeholder="Theme" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="system">System</SelectItem>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </section>

        {/* Privacy & Safety */}
        <section className="surface-1 rounded-2xl p-6 border border-border/40 space-y-6">
          <div className="showcase-section-title mb-2">
            <Shield className="w-4 h-4 text-accent" />
            <h3>Privacy & Safety</h3>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Profile Visibility</p>
              <p className="text-xs text-muted-foreground">Who can see your profile and posts</p>
            </div>
            <Select 
              value={privacySettings.profileVisibility || 'public'} 
              onValueChange={(val) => handlePrivacyChange('profileVisibility', val)}
            >
              <SelectTrigger className="w-40 rounded-xl font-medium">
                <SelectValue placeholder="Visibility" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="public">Public</SelectItem>
                <SelectItem value="followers">Followers Only</SelectItem>
                <SelectItem value="private">Private</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Direct Messages from strangers</p>
              <p className="text-xs text-muted-foreground">Let non-followers initiate chat requests</p>
            </div>
            <Switch 
              checked={privacySettings.allowDmFromStrangers ?? true} 
              onCheckedChange={(val) => handlePrivacyChange('allowDmFromStrangers', val)} 
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Message filtering</p>
              <p className="text-xs text-muted-foreground">Automatically filter spam messages</p>
            </div>
            <Switch 
              checked={privacySettings.messageRequestsEnabled ?? true} 
              onCheckedChange={(val) => handlePrivacyChange('messageRequestsEnabled', val)} 
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Two-factor authentication</p>
              <p className="text-xs text-muted-foreground">Extra security for your identity</p>
            </div>
            <Switch 
              checked={privacySettings.twoFactorEnabled ?? false} 
              onCheckedChange={(val) => handlePrivacyChange('twoFactorEnabled', val)} 
            />
          </div>
        </section>

        <ContactShieldPanel />

        {/* Notifications */}
        <section className="surface-1 rounded-2xl p-6 border border-border/40 space-y-6">
          <div className="showcase-section-title mb-2">
            <Bell className="w-4 h-4 text-primary" />
            <h3>Notification Preferences</h3>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Push notifications</p>
              <p className="text-xs text-muted-foreground">Receive instant alerts on this device</p>
            </div>
            <Switch 
              checked={privacySettings.pushNotifications ?? true} 
              onCheckedChange={(val) => handlePrivacyChange('pushNotifications', val)} 
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Weekly digest</p>
              <p className="text-xs text-muted-foreground">Curated highlights from your network</p>
            </div>
            <Switch 
              checked={privacySettings.emailDigest ?? true} 
              onCheckedChange={(val) => handlePrivacyChange('emailDigest', val)} 
            />
          </div>
        </section>

        {/* Account Management */}
        <section className="surface-1 rounded-2xl p-6 border border-border/40 space-y-6">
          <div className="showcase-section-title mb-2">
            <User className="w-4 h-4 text-destructive" />
            <h3>Account Controls</h3>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Log Out</p>
              <p className="text-xs text-muted-foreground">End session on this browser</p>
            </div>
            <Button variant="outline" className="text-destructive border-destructive/40 hover:bg-destructive/10 rounded-xl font-bold text-xs" onClick={logout}>
              <LogOut className="w-3.5 h-3.5 mr-1.5" /> Log out
            </Button>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border/30">
            <div>
              <p className="text-sm font-semibold text-destructive">Delete Account</p>
              <p className="text-xs text-muted-foreground">Permanently wipe your profile & data</p>
            </div>
            <Button variant="destructive" className="rounded-xl font-bold text-xs">
              <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete
            </Button>
          </div>
        </section>
      </motion.div>
    </div>
  );
}
