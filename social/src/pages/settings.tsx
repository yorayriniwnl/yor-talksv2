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
import { Palette, Shield, Bell, User, LogOut, Trash2, Sliders, ContactRound, Fingerprint, Loader2, Plus, X, Download, KeyRound, Copy, Smartphone } from 'lucide-react';
import { DEFAULT_CONTENT_RATING, type ContentRating } from '@/lib/content-rating';
import QRCode from 'qrcode';

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
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={emailInput}
              onChange={(event) => setEmailInput(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter') handleManualAdd(); }}
              placeholder="Paste a KIIT email or email from contacts"
              aria-label="Email to shield"
              className="h-11 rounded-2xl border-primary/15 bg-background/60"
            />
            <Button type="button" onClick={handleManualAdd} disabled={adding} className="h-11 w-full shrink-0 rounded-2xl px-3 sm:w-auto sm:px-4">
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              <span className="hidden sm:inline">Shield</span>
            </Button>
          </div>
          {pickerAvailable && (
            <Button type="button" variant="outline" onClick={handlePickContacts} disabled={adding} className="h-11 w-full rounded-2xl border-primary/20 bg-background/40 font-bold sm:w-auto">
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
  const currentUser = useAppStore((s: any) => s.currentUser);
  const updateContentFilter = useAppStore((s: any) => s.updateContentFilter);
  const updateTwoFactorEnabled = useAppStore((s: any) => s.setTwoFactorEnabled);
  const privacySettings = useAppStore((s: any) => s.privacySettings || s.privacy || {});
  const updatePrivacySettings = useAppStore((s: any) => s.updatePrivacySettings || s.updatePrivacy);
  const [notificationsEnabled, setNotificationsEnabled] = useState(currentUser?.notificationsEnabled ?? true);
  const [contentFilter, setContentFilter] = useState<ContentRating>(currentUser?.contentFilter ?? DEFAULT_CONTENT_RATING);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(Boolean(currentUser?.twoFactorEnabled));
  const [twoFactorSetup, setTwoFactorSetup] = useState<{ secret: string; otpauthUrl: string } | null>(null);
  const [twoFactorQr, setTwoFactorQr] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorDisableMode, setTwoFactorDisableMode] = useState(false);
  const [twoFactorBusy, setTwoFactorBusy] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let active = true;
    setTwoFactorQr('');
    if (twoFactorSetup?.otpauthUrl) {
      void QRCode.toDataURL(twoFactorSetup.otpauthUrl, { width: 180, margin: 2, errorCorrectionLevel: 'M' })
        .then((dataUrl) => { if (active) setTwoFactorQr(dataUrl); })
        .catch(() => { if (active) setTwoFactorQr(''); });
    }
    return () => { active = false; };
  }, [twoFactorSetup?.otpauthUrl]);

  const handlePrivacyChange = (key: string, value: any) => {
    updatePrivacySettings({ ...privacySettings, [key]: value });
  };

  const handleNotificationChange = async (value: boolean) => {
    setNotificationsEnabled(value);
    try {
      await api.updateSettings({ notificationsEnabled: value });
    } catch (error) {
      setNotificationsEnabled(!value);
      toast.error(error instanceof Error ? error.message : 'Could not update notification preferences');
    }
  };

  const handleContentFilterChange = async (value: ContentRating) => {
    const previous = contentFilter;
    setContentFilter(value);
    try {
      await updateContentFilter(value);
      toast.success('Content filter updated');
    } catch (error) {
      setContentFilter(previous);
      toast.error(error instanceof Error ? error.message : 'Could not update content filter');
    }
  };

  const beginTwoFactorSetup = async () => {
    setTwoFactorBusy(true);
    try {
      setTwoFactorSetup(await api.setupTwoFactor());
      setTwoFactorCode('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not start two-factor setup');
    } finally {
      setTwoFactorBusy(false);
    }
  };

  const confirmTwoFactorSetup = async () => {
    if (!/^\d{6}$/.test(twoFactorCode)) {
      toast.error('Enter the six-digit code from your authenticator app');
      return;
    }
    setTwoFactorBusy(true);
    try {
      await api.confirmTwoFactor(twoFactorCode);
      setTwoFactorEnabled(true);
      updateTwoFactorEnabled(true);
      setTwoFactorSetup(null);
      setTwoFactorCode('');
      toast.success('Two-factor authentication enabled');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Invalid authenticator code');
    } finally {
      setTwoFactorBusy(false);
    }
  };

  const disableTwoFactor = async () => {
    if (!/^\d{6}$/.test(twoFactorCode)) {
      toast.error('Enter your current six-digit authenticator code');
      return;
    }
    setTwoFactorBusy(true);
    try {
      await api.disableTwoFactor(twoFactorCode);
      setTwoFactorEnabled(false);
      updateTwoFactorEnabled(false);
      setTwoFactorCode('');
      setTwoFactorDisableMode(false);
      toast.success('Two-factor authentication disabled');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Invalid authenticator code');
    } finally {
      setTwoFactorBusy(false);
    }
  };

  const copyTwoFactorUri = async () => {
    if (!twoFactorSetup?.otpauthUrl || !navigator.clipboard) return;
    await navigator.clipboard.writeText(twoFactorSetup.otpauthUrl);
    toast.success('Authenticator setup URI copied');
  };

  const exportAccount = async () => {
    setExporting(true);
    try {
      const data = await api.exportMyData();
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'yor-talks-account-export.json';
      link.click();
      URL.revokeObjectURL(url);
      toast.success('Your account export is ready');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not export your data');
    } finally {
      setExporting(false);
    }
  };

  const deleteAccount = async () => {
    if (deleteConfirmation !== 'DELETE') {
      toast.error('Type DELETE to confirm account removal');
      return;
    }
    if (deletePassword.length < 8) {
      toast.error('Enter your password to confirm account removal');
      return;
    }
    setDeleting(true);
    try {
      await api.deleteAccount(deletePassword);
      await logout();
      toast.success('Your Yor account and associated data have been deleted');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not delete your account');
    } finally {
      setDeleting(false);
    }
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
              <p className="text-sm font-semibold">Message requests</p>
              <p className="text-xs text-muted-foreground">Allow non-followers to send message requests</p>
            </div>
            <Switch 
              checked={privacySettings.messageRequests ?? true} 
              onCheckedChange={(val) => handlePrivacyChange('messageRequests', val)} 
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold">Content filter</p>
              <p className="text-xs text-muted-foreground">Choose the highest audience layer shown to you</p>
            </div>
            <Select value={contentFilter} onValueChange={(value) => void handleContentFilterChange(value as ContentRating)}>
              <SelectTrigger className="w-40 rounded-xl font-medium"><SelectValue placeholder="Content level" /></SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="child_safe">Child-safe only</SelectItem>
                <SelectItem value="regular">Child-safe + Regular</SelectItem>
                <SelectItem value="mature">All content</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3 border-t border-border/30 pt-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold">Two-factor authentication</p>
                <p className="text-xs text-muted-foreground">Protect sign-ins with an authenticator app</p>
              </div>
              {!twoFactorEnabled && !twoFactorSetup && <Button type="button" variant="outline" onClick={() => void beginTwoFactorSetup()} disabled={twoFactorBusy} className="rounded-xl text-xs font-bold">Set up</Button>}
              {twoFactorEnabled && !twoFactorSetup && <span className="text-xs font-semibold text-emerald-600">Enabled</span>}
            </div>
            {twoFactorSetup && (
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-3">
                <div className="flex items-start gap-3"><Smartphone className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><p className="text-xs leading-relaxed text-muted-foreground">Add Yor to an authenticator app on your phone. Scan the QR code if your app supports it, or copy the setup URI/secret manually. Then enter the current six-digit code.</p></div>
                {twoFactorQr && <div className="flex justify-center rounded-2xl bg-white p-4"><img src={twoFactorQr} alt="Scan this QR code with your authenticator app" className="h-44 w-44" /></div>}
                <code className="block break-all rounded-xl bg-background/70 p-3 text-xs tracking-wider">{twoFactorSetup.secret}</code>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input readOnly value={twoFactorSetup.otpauthUrl} aria-label="Authenticator setup URI" className="rounded-xl font-mono text-[0.68rem]" />
                  <Button type="button" variant="outline" onClick={() => void copyTwoFactorUri()} className="w-full rounded-xl sm:w-auto"><Copy className="mr-2 h-4 w-4" />Copy URI</Button>
                </div>
                <a href={twoFactorSetup.otpauthUrl} className="inline-flex text-xs font-semibold text-primary hover:underline">Open setup URI on this phone</a>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input value={twoFactorCode} onChange={(event) => setTwoFactorCode(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="6-digit code" inputMode="numeric" className="rounded-xl" />
                  <Button type="button" onClick={() => void confirmTwoFactorSetup()} disabled={twoFactorBusy} className="w-full rounded-xl sm:w-auto">Confirm</Button>
                </div>
              </div>
            )}
            {twoFactorEnabled && !twoFactorSetup && !twoFactorDisableMode && (
              <Button type="button" variant="ghost" onClick={() => setTwoFactorDisableMode(true)} className="h-auto justify-start p-0 text-xs text-destructive hover:text-destructive">Disable two-factor authentication</Button>
            )}
            {twoFactorEnabled && twoFactorDisableMode && (
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input value={twoFactorCode} onChange={(event) => setTwoFactorCode(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="Current 6-digit code" inputMode="numeric" className="rounded-xl" />
                <Button type="button" variant="destructive" onClick={() => void disableTwoFactor()} disabled={twoFactorBusy} className="w-full rounded-xl sm:w-auto">Disable</Button>
              </div>
            )}
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
              checked={notificationsEnabled} 
              onCheckedChange={(val) => void handleNotificationChange(val)} 
            />
          </div>

          <p className="text-xs leading-5 text-muted-foreground">Browser push permission is managed by your device. Email digests are not enabled in the college beta.</p>
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
            <Button variant="destructive" className="rounded-xl font-bold text-xs" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete
            </Button>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border/30">
            <div>
              <p className="text-sm font-semibold">Download your data</p>
              <p className="text-xs text-muted-foreground">Export your profile, posts, relationships and reports</p>
            </div>
            <Button variant="outline" className="rounded-xl font-bold text-xs" onClick={() => void exportAccount()} disabled={exporting}>
              {exporting ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Download className="w-3.5 h-3.5 mr-1.5" />} Export
            </Button>
          </div>
        </section>

        {deleteOpen && (
          <section className="surface-1 rounded-2xl border border-destructive/40 bg-destructive/5 p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-destructive/10 text-destructive"><KeyRound className="h-4 w-4" /></div>
              <div><h3 className="font-bold text-destructive">Permanently delete this account?</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">This removes your profile, posts, comments, relationships and contact shields. Financial audit records are retained without your identity.</p></div>
            </div>
            <Input value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} placeholder="Type DELETE" className="rounded-xl" />
            <Input value={deletePassword} onChange={(event) => setDeletePassword(event.target.value)} placeholder="Your password" type="password" className="rounded-xl" />
            <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setDeleteOpen(false)} className="rounded-xl">Cancel</Button><Button type="button" variant="destructive" onClick={() => void deleteAccount()} disabled={deleting} className="rounded-xl">{deleting ? 'Deleting…' : 'Delete permanently'}</Button></div>
          </section>
        )}
      </motion.div>
    </div>
  );
}
