import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppStore } from '@/lib/store';
import { motion } from 'framer-motion';
import { fadeInUp, springGentle } from '@/lib/motion';
import { Palette, Shield, Bell, User, LogOut, Trash2, Sliders } from 'lucide-react';

export default function Settings() {
  const { theme, setTheme } = useTheme();
  
  const logout = useAppStore((s) => s.logout);
  const privacySettings = useAppStore((s) => (s as any).privacySettings || s.privacy || {});
  const updatePrivacySettings = useAppStore((s) => (s as any).updatePrivacySettings || s.updatePrivacy);

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
