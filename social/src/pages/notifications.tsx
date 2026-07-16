import { useState } from 'react';
import { Bell, Heart, MessageCircle, UserPlus, Star, Users, ShoppingBag, Calendar, Info, Mail } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAppStore, Notification } from '@/lib/store';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const FILTERS: { id: 'all' | Notification['type']; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'like', label: 'Likes' },
  { id: 'comment', label: 'Comments' },
  { id: 'follow', label: 'Follows' },
  { id: 'community', label: 'Communities' },
  { id: 'marketplace', label: 'Marketplace' },
  { id: 'event', label: 'Events' },
];

export default function Notifications() {
  const users = useAppStore((s) => s.users);
  const notifications = useAppStore((s) => s.notifications);
  const markNotificationRead = useAppStore((s) => s.markNotificationRead);
  const markAllNotificationsRead = useAppStore((s) => s.markAllNotificationsRead);
  const [filter, setFilter] = useState<'all' | Notification['type']>('all');

  const getIcon = (type: string) => {
    switch (type) {
      case 'like': return <Heart className="w-5 h-5 text-red-500 fill-red-500" />;
      case 'follow': return <UserPlus className="w-5 h-5 text-primary" />;
      case 'comment': return <MessageCircle className="w-5 h-5 text-blue-500 fill-blue-500" />;
      case 'mention': return <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />;
      case 'community': return <Users className="w-5 h-5 text-violet-500" />;
      case 'marketplace': return <ShoppingBag className="w-5 h-5 text-emerald-500" />;
      case 'event': return <Calendar className="w-5 h-5 text-orange-500" />;
      case 'message': return <Mail className="w-5 h-5 text-primary" />;
      default: return <Info className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getMessage = (type: string, name: string) => {
    switch (type) {
      case 'like': return <span><span className="font-bold text-foreground">{name}</span> liked your post</span>;
      case 'follow': return <span><span className="font-bold text-foreground">{name}</span> started following you</span>;
      case 'comment': return <span><span className="font-bold text-foreground">{name}</span> commented on your post</span>;
      case 'mention': return <span><span className="font-bold text-foreground">{name}</span> mentioned you in a post</span>;
      case 'community': return <span><span className="font-bold text-foreground">{name}</span> posted in a community you follow</span>;
      case 'marketplace': return <span><span className="font-bold text-foreground">{name}</span> messaged you about a listing</span>;
      case 'event': return <span><span className="font-bold text-foreground">{name}</span> invited you to an event</span>;
      case 'message': return <span><span className="font-bold text-foreground">{name}</span> sent you a message</span>;
      default: return <span>New activity from {name}</span>;
    }
  };

  const filtered = notifications.filter(n => filter === 'all' || n.type === filter);

  return (
    <div className="max-w-2xl mx-auto min-h-screen border-x border-border/50 bg-background">
      <div className="sticky top-0 z-20 glass px-4 py-3 flex items-center justify-between border-b border-border/50">
        <h1 className="font-display font-bold text-xl">Notifications</h1>
        <button onClick={markAllNotificationsRead} className="text-sm text-primary hover:underline font-medium">Mark all as read</button>
      </div>

      <div className="flex gap-2 px-4 py-3 overflow-x-auto hide-scrollbar border-b border-border/50">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium shrink-0 transition-colors ${filter === f.id ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground hover:bg-muted'}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="divide-y divide-border/50">
        {filtered.map((notif, i) => {
          const actor = users[notif.actorId];
          if (!actor) return null;

          return (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              key={notif.id}
              onClick={() => markNotificationRead(notif.id)}
              className={cn("p-4 flex gap-4 hover:bg-muted/30 transition-colors cursor-pointer", !notif.read && "bg-primary/5")}
            >
              <div className="mt-1">{getIcon(notif.type)}</div>
              <div className="flex-1">
                <Avatar className="w-8 h-8 mb-2">
                  <AvatarImage src={actor.avatarUrl} />
                  <AvatarFallback>{actor.displayName.charAt(0)}</AvatarFallback>
                </Avatar>
                <p className="text-[15px] text-muted-foreground">
                  {getMessage(notif.type, actor.displayName)}
                </p>
                <span className="text-xs text-muted-foreground block mt-2">
                  {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                </span>
              </div>
              {!notif.read && <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />}
            </motion.div>
          );
        })}
        {filtered.length === 0 && (
          <div className="p-12 text-center text-muted-foreground flex flex-col items-center gap-3">
            <Bell className="w-10 h-10 opacity-40" />
            <p>Nothing here yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
