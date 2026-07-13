import { useLocation } from 'wouter';
import { useAppStore } from '@/lib/store';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Mail, Bookmark, PlayCircle, BookOpen, Calendar, ShoppingBag,
  Sparkles, Bell, Users, PenSquare, ArrowRight, LayoutDashboard
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { currentUser, users, posts, events, products, communities, notifications, aiMessages } = useAppStore();

  const savedPosts = posts.filter(p => p.savedByMe);
  const upcomingEvents = [...events]
    .filter(e => e.rsvpStatus)
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
    .slice(0, 3);
  const savedProducts = products.filter(p => p.savedByMe);
  const myCommunities = communities.filter(c => c.isMember);
  const unread = notifications.filter(n => !n.read).slice(0, 4);

  const quickActions = [
    { icon: PenSquare, label: 'New Post', href: '/' },
    { icon: Calendar, label: 'Create Event', href: '/events' },
    { icon: ShoppingBag, label: 'Sell Item', href: '/marketplace' },
    { icon: Sparkles, label: 'Ask AI', href: '/ai' },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-8">
        <Avatar className="w-14 h-14">
          <AvatarImage src={currentUser?.avatarUrl} />
          <AvatarFallback>{currentUser?.displayName.charAt(0)}</AvatarFallback>
        </Avatar>
        <div>
          <h1 className="font-display font-bold text-2xl">Welcome back, {currentUser?.displayName.split(' ')[0]}</h1>
          <p className="text-muted-foreground">Here's what's happening across your world.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
        {quickActions.map((a) => (
          <button
            key={a.label}
            onClick={() => setLocation(a.href)}
            className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border border-border/50 bg-card hover:bg-muted/40 transition-colors"
          >
            <a.icon className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium">{a.label}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-border/50 bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold flex items-center gap-2"><Bell className="w-4 h-4 text-primary" /> Notifications</h3>
            <button onClick={() => setLocation('/notifications')} className="text-xs text-primary hover:underline flex items-center gap-1">View all <ArrowRight className="w-3 h-3" /></button>
          </div>
          {unread.length === 0 ? (
            <p className="text-sm text-muted-foreground">You're all caught up.</p>
          ) : (
            <div className="space-y-3">
              {unread.map((n) => {
                const actor = users[n.actorId];
                return (
                  <div key={n.id} className="flex items-center gap-3 text-sm">
                    <Avatar className="w-8 h-8"><AvatarImage src={actor?.avatarUrl} /><AvatarFallback>{actor?.displayName.charAt(0)}</AvatarFallback></Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="truncate"><span className="font-medium">{actor?.displayName}</span> · {n.type}</p>
                      <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border/50 bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold flex items-center gap-2"><Calendar className="w-4 h-4 text-primary" /> Upcoming Events</h3>
            <button onClick={() => setLocation('/events')} className="text-xs text-primary hover:underline flex items-center gap-1">View all <ArrowRight className="w-3 h-3" /></button>
          </div>
          {upcomingEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No events on your calendar yet.</p>
          ) : (
            <div className="space-y-3">
              {upcomingEvents.map((e) => (
                <div key={e.id} onClick={() => setLocation(`/events/${e.id}`)} className="flex items-center gap-3 text-sm cursor-pointer">
                  <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-muted"><img src={e.coverUrl} className="w-full h-full object-cover" alt="" /></div>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{e.title}</p>
                    <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(e.startsAt), { addSuffix: true })}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border/50 bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold flex items-center gap-2"><Bookmark className="w-4 h-4 text-primary" /> Saved Posts</h3>
          </div>
          {savedPosts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Posts you save will show up here.</p>
          ) : (
            <div className="space-y-3">
              {savedPosts.map((p) => (
                <p key={p.id} className="text-sm text-muted-foreground line-clamp-2">{p.content}</p>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border/50 bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold flex items-center gap-2"><ShoppingBag className="w-4 h-4 text-primary" /> Marketplace Activity</h3>
            <button onClick={() => setLocation('/marketplace')} className="text-xs text-primary hover:underline flex items-center gap-1">Browse <ArrowRight className="w-3 h-3" /></button>
          </div>
          {savedProducts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Save a listing to track it here.</p>
          ) : (
            <div className="space-y-3">
              {savedProducts.map((p) => (
                <div key={p.id} onClick={() => setLocation(`/marketplace/${p.id}`)} className="flex items-center gap-3 text-sm cursor-pointer">
                  <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-muted"><img src={p.images[0]} className="w-full h-full object-cover" alt="" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{p.title}</p>
                    <p className="text-xs text-muted-foreground">${p.price.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border/50 bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" /> AI Workspace</h3>
            <button onClick={() => setLocation('/ai')} className="text-xs text-primary hover:underline flex items-center gap-1">Open <ArrowRight className="w-3 h-3" /></button>
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {aiMessages[aiMessages.length - 1]?.content ?? 'Start a conversation with your assistant.'}
          </p>
        </div>

        <div className="rounded-2xl border border-border/50 bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold flex items-center gap-2"><Users className="w-4 h-4 text-primary" /> Your Communities</h3>
            <button onClick={() => setLocation('/communities')} className="text-xs text-primary hover:underline flex items-center gap-1">View all <ArrowRight className="w-3 h-3" /></button>
          </div>
          {myCommunities.length === 0 ? (
            <p className="text-sm text-muted-foreground">Join a community to see it here.</p>
          ) : (
            <div className="space-y-3">
              {myCommunities.map((c) => (
                <div key={c.id} onClick={() => setLocation(`/communities/${c.id}`)} className="flex items-center gap-3 text-sm cursor-pointer">
                  <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0 bg-muted"><img src={c.coverUrl} className="w-full h-full object-cover" alt="" /></div>
                  <p className="font-medium truncate">{c.name}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
