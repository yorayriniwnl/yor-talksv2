import { useState } from 'react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  User, Bell, Shield, Palette, Eye, HelpCircle,
  ChevronRight, LogOut, Lock, UserX, VolumeX, Smartphone
} from 'lucide-react';
import { useAppStore } from '@/lib/store';

function PrivacyCenter({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { privacy, updatePrivacy, users, toggleBlockUser, toggleMuteUser } = useAppStore();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogTitle className="flex items-center gap-2"><Shield className="w-5 h-5 text-primary" /> Privacy Center</DialogTitle>

        <div className="space-y-6 pt-2">
          <section>
            <h3 className="font-medium text-sm text-muted-foreground mb-3">Who can see your profile</h3>
            <div className="flex flex-col gap-2">
              {(['everyone', 'followers', 'private'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => updatePrivacy({ profileVisibility: v })}
                  className={`flex items-center justify-between p-3 rounded-xl border text-sm capitalize transition-colors ${privacy.profileVisibility === v ? 'border-primary bg-primary/5 text-primary font-medium' : 'border-border/50 hover:bg-muted/30'}`}
                >
                  {v === 'everyone' ? 'Everyone' : v === 'followers' ? 'Followers only' : 'Only me'}
                  {privacy.profileVisibility === v && <span className="w-2 h-2 rounded-full bg-primary" />}
                </button>
              ))}
            </div>
          </section>

          <section>
            <h3 className="font-medium text-sm text-muted-foreground mb-3">Who can message you</h3>
            <div className="flex flex-col gap-2">
              {(['everyone', 'followers', 'no-one'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => updatePrivacy({ whoCanMessage: v })}
                  className={`flex items-center justify-between p-3 rounded-xl border text-sm capitalize transition-colors ${privacy.whoCanMessage === v ? 'border-primary bg-primary/5 text-primary font-medium' : 'border-border/50 hover:bg-muted/30'}`}
                >
                  {v === 'everyone' ? 'Everyone' : v === 'followers' ? 'Followers only' : 'No one'}
                  {privacy.whoCanMessage === v && <span className="w-2 h-2 rounded-full bg-primary" />}
                </button>
              ))}
            </div>
          </section>

          <section className="flex items-center justify-between p-3 rounded-xl border border-border/50">
            <div className="flex items-center gap-3">
              <Smartphone className="w-4 h-4 text-primary" />
              <div>
                <p className="text-sm font-medium">Two-factor authentication</p>
                <p className="text-xs text-muted-foreground">Add an extra layer of security</p>
              </div>
            </div>
            <Switch checked={privacy.twoFactorEnabled} onCheckedChange={(c) => updatePrivacy({ twoFactorEnabled: c })} />
          </section>

          <section>
            <h3 className="font-medium text-sm text-muted-foreground mb-3 flex items-center gap-2"><UserX className="w-4 h-4" /> Blocked accounts</h3>
            {privacy.blockedUserIds.length === 0 ? (
              <p className="text-sm text-muted-foreground">No one is blocked.</p>
            ) : (
              <div className="space-y-2">
                {privacy.blockedUserIds.map((id) => {
                  const u = users[id];
                  if (!u) return null;
                  return (
                    <div key={id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/30">
                      <div className="flex items-center gap-2">
                        <Avatar className="w-7 h-7"><AvatarImage src={u.avatarUrl} /><AvatarFallback>{u.displayName.charAt(0)}</AvatarFallback></Avatar>
                        <span className="text-sm">{u.displayName}</span>
                      </div>
                      <button onClick={() => toggleBlockUser(id)} className="text-xs text-primary hover:underline">Unblock</button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section>
            <h3 className="font-medium text-sm text-muted-foreground mb-3 flex items-center gap-2"><VolumeX className="w-4 h-4" /> Muted accounts</h3>
            {privacy.mutedUserIds.length === 0 ? (
              <p className="text-sm text-muted-foreground">No one is muted.</p>
            ) : (
              <div className="space-y-2">
                {privacy.mutedUserIds.map((id) => {
                  const u = users[id];
                  if (!u) return null;
                  return (
                    <div key={id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/30">
                      <div className="flex items-center gap-2">
                        <Avatar className="w-7 h-7"><AvatarImage src={u.avatarUrl} /><AvatarFallback>{u.displayName.charAt(0)}</AvatarFallback></Avatar>
                        <span className="text-sm">{u.displayName}</span>
                      </div>
                      <button onClick={() => toggleMuteUser(id)} className="text-xs text-primary hover:underline">Unmute</button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const { logout } = useAppStore();
  const [privacyOpen, setPrivacyOpen] = useState(false);

  const sections = [
    { icon: User, title: 'Account', description: 'Manage your profile and account details' },
    { icon: Shield, title: 'Privacy & Security', description: 'Control who sees your content, blocked accounts, 2FA', action: () => setPrivacyOpen(true) },
    { icon: Bell, title: 'Notifications', description: 'Manage what you get notified about' },
    { icon: Palette, title: 'Appearance', description: 'Customize the look and feel of Yor Talks', isAppearance: true },
    { icon: Eye, title: 'Accessibility', description: 'Manage accessibility preferences' },
    { icon: HelpCircle, title: 'Help & Support', description: 'Get help or send feedback' },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="font-display font-bold text-3xl mb-8">Settings</h1>

      <div className="space-y-6">
        <div className="bg-card border border-border/50 rounded-2xl overflow-hidden divide-y divide-border/50 shadow-sm">
          {sections.map((section, i) => (
            <div key={i}>
              <div
                className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors cursor-pointer group"
                onClick={() => section.action?.()}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <section.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-medium text-base">{section.title}</h3>
                    <p className="text-sm text-muted-foreground">{section.description}</p>
                  </div>
                </div>
                {section.isAppearance ? (
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <Label htmlFor="dark-mode" className="text-sm text-muted-foreground">Dark Mode</Label>
                    <Switch 
                      id="dark-mode" 
                      checked={theme === 'dark'} 
                      onCheckedChange={(c) => setTheme(c ? 'dark' : 'light')} 
                    />
                  </div>
                ) : (
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                )}
              </div>
            </div>
          ))}
        </div>

        <Button 
          variant="destructive" 
          className="w-full rounded-2xl h-12 font-medium bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground shadow-none border-none"
          onClick={logout}
        >
          <LogOut className="w-4 h-4 mr-2" /> Log Out
        </Button>
      </div>

      <PrivacyCenter open={privacyOpen} onOpenChange={setPrivacyOpen} />
    </div>
  );
}
