import * as React from 'react';
import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useAppStore, type Message as DirectMessage } from '@/lib/store';
import { api, type BackendUser } from '@/lib/api-client';
import { useParams, useLocation } from 'wouter';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, Plus, MoreVertical, SendHorizontal, MessageCircle, ArrowLeft, Sparkles, Reply, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getSocket } from '@/lib/socket-client';
import { format, formatDistanceToNow, isSameDay } from 'date-fns';
import { motion } from 'framer-motion';
import { fadeInUp, staggerContainer, staggerItem } from '@/lib/motion';
import { SteamTradeModal } from '@/components/steam/SteamTradeModal';

const MAX_MESSAGE_LENGTH = 4_000;
const REPLY_PREFIX = /^\[Reply to ([^\]\n]+)\] ([^\n]+)\n([\s\S]+)$/;

type ReplyTarget = {
  messageId: string;
  senderName: string;
  excerpt: string;
};

type ParsedReply = {
  senderName: string;
  excerpt: string;
  body: string;
};

function parseReply(content: string): ParsedReply | null {
  const match = content.match(REPLY_PREFIX);
  if (!match) return null;

  return { senderName: match[1], excerpt: match[2], body: match[3] };
}

type ReplyPreview = Pick<ParsedReply, 'senderName' | 'excerpt'>;

function MessageContent({ content, isMine, reply: structuredReply }: { content: string; isMine: boolean; reply?: ReplyPreview | null }) {
  const legacyReply = parseReply(content);
  const reply = structuredReply ?? legacyReply;
  const body = legacyReply?.body ?? content;

  if (!reply) return <span className="whitespace-pre-wrap">{body}</span>;

  return (
    <>
      <div className={cn(
        'mb-2 flex gap-2 rounded-xl border px-2.5 py-2 text-xs',
        isMine ? 'border-white/15 bg-black/10 text-white/80' : 'border-border/40 bg-background/35 text-muted-foreground'
      )}>
        <Reply className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <div className="min-w-0">
          <p className="font-semibold">Replying to {reply.senderName}</p>
          <p className="mt-0.5 truncate opacity-80">{reply.excerpt}</p>
        </div>
      </div>
      <span className="whitespace-pre-wrap">{body}</span>
    </>
  );
}

/* ─── Typing indicator dots ────────────────────────────────────────────── */
function TypingIndicator({ name }: { name: string }) {
  return (
    <div className="mr-auto flex items-center gap-2 px-4 py-3" role="status" aria-live="polite">
      <div className="surface-1 rounded-[20px] rounded-bl-md px-4 py-3 flex items-center gap-1">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="w-[7px] h-[7px] rounded-full bg-muted-foreground/50"
            animate={{ y: [0, -5, 0], opacity: [0.4, 1, 0.4] }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              delay: i * 0.15,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>
      <span className="text-xs text-muted-foreground">{name} is typing</span>
    </div>
  );
}

function NewMessageDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [, setLocation] = useLocation();
  const currentUser = useAppStore((s) => s.currentUser);
  const sendDirectMessage = useAppStore((s) => s.sendDirectMessage);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<BackendUser[]>([]);
  const [selected, setSelected] = useState<BackendUser | null>(null);
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return; }
    const handle = setTimeout(async () => {
      try {
        const users = await api.searchUsers(query.trim());
        setResults(users.filter((u) => u.id !== currentUser?.id));
      } catch { /* ignore transient search errors */ }
    }, 250);
    return () => clearTimeout(handle);
  }, [query, currentUser?.id]);

  const handleSend = async () => {
    if (!selected || !content.trim()) return;
    setSending(true);
    try {
      await sendDirectMessage(selected.id, content.trim());
      onOpenChange(false);
      setSelected(null);
      setContent('');
      setQuery('');
      const conv = useAppStore.getState().conversations.find((c) => c.participantIds.includes(selected.id));
      if (conv) setLocation(`/messages/${conv.id}`);
    } catch (err) {
      console.error('Failed to send message', err);
    }
    setSending(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="surface-2 rounded-2xl border-none shadow-xl">
        <DialogHeader><DialogTitle className="font-display">Start a chat</DialogTitle></DialogHeader>
        {!selected ? (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search people" value={query} onChange={(e) => setQuery(e.target.value)} autoFocus className="pl-9 surface-1 border-none rounded-xl" />
            </div>
            <div className="max-h-64 overflow-y-auto space-y-1 thin-scrollbar">
              {results.map((u) => (
                <button key={u.id} onClick={() => setSelected(u)} className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-muted/50 text-left transition-colors">
                  <Avatar className="w-9 h-9"><AvatarImage src={u.avatarUrl ?? undefined} /><AvatarFallback>{(u.fullName || u.username).charAt(0)}</AvatarFallback></Avatar>
                  <div><p className="text-sm font-medium">{u.fullName || u.username}</p><p className="text-xs text-muted-foreground">@{u.username}</p></div>
                </button>
              ))}
              {query.length >= 2 && results.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-4">No users found.</p>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-xl surface-1">
              <Avatar className="w-10 h-10"><AvatarImage src={selected.avatarUrl ?? undefined} /><AvatarFallback>{(selected.fullName || selected.username).charAt(0)}</AvatarFallback></Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{selected.fullName || selected.username}</p>
                <p className="text-xs text-muted-foreground truncate">@{selected.username}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-xs text-primary font-medium hover:underline px-2">Change</button>
            </div>
            <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Write a message…" className="w-full min-h-[100px] rounded-xl border border-transparent surface-1 p-3 text-[15px] outline-none focus:border-primary/30 focus:ring-1 focus:ring-primary/30 transition-all resize-none" autoFocus />
            <Button onClick={handleSend} disabled={!content.trim() || sending} className="w-full rounded-xl py-6">{sending ? 'Sending…' : 'Send message'}</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function Messages() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const users = useAppStore((s) => s.users);
  const currentUser = useAppStore((s) => s.currentUser);
  const conversations = useAppStore((s) => s.conversations);
  const messagesByConversation = useAppStore((s) => s.messagesByConversation);
  const loadConversations = useAppStore((s) => s.loadConversations);
  const loadConversationMessages = useAppStore((s) => s.loadConversationMessages);
  const loadUserProfile = useAppStore((s) => s.loadUserProfile);
  const sendDirectMessage = useAppStore((s) => s.sendDirectMessage);
  
  const [message, setMessage] = useState('');
  const [newMessageOpen, setNewMessageOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [pulseSend, setPulseSend] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [replyTarget, setReplyTarget] = useState<ReplyTarget | null>(null);
  const [typingConversationIds, setTypingConversationIds] = useState<Record<string, true>>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingStopTimeoutRef = useRef<number | null>(null);
  const typingConversationIdRef = useRef<string | null>(null);
  const peerTypingTimeoutsRef = useRef<Record<string, number>>({});

  const stopTyping = useCallback(() => {
    if (typingStopTimeoutRef.current !== null) {
      window.clearTimeout(typingStopTimeoutRef.current);
      typingStopTimeoutRef.current = null;
    }

    const conversationId = typingConversationIdRef.current;
    if (conversationId) {
      getSocket()?.emit('typing:end', { conversationId });
      typingConversationIdRef.current = null;
    }
  }, []);

  const signalTyping = useCallback((conversationId: string | undefined) => {
    if (!conversationId) return;

    const socket = getSocket();
    if (!socket) return;

    const previousConversationId = typingConversationIdRef.current;
    if (previousConversationId && previousConversationId !== conversationId) {
      socket.emit('typing:end', { conversationId: previousConversationId });
    }

    if (previousConversationId !== conversationId) {
      socket.emit('typing:start', { conversationId });
      typingConversationIdRef.current = conversationId;
    }

    if (typingStopTimeoutRef.current !== null) {
      window.clearTimeout(typingStopTimeoutRef.current);
    }
    typingStopTimeoutRef.current = window.setTimeout(stopTyping, 1200);
  }, [stopTyping]);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !currentUser?.id) return;

    const clearPeerTyping = (conversationId: string) => {
      const timeout = peerTypingTimeoutsRef.current[conversationId];
      if (timeout) window.clearTimeout(timeout);
      delete peerTypingTimeoutsRef.current[conversationId];
      setTypingConversationIds((current) => {
        if (!current[conversationId]) return current;
        const { [conversationId]: _, ...remaining } = current;
        return remaining;
      });
    };

    const handleTypingStart = (payload: { userId?: unknown; conversationId?: unknown }) => {
      if (payload.userId === currentUser.id || typeof payload.conversationId !== 'string') return;

      const conversationId = payload.conversationId;
      const existingTimeout = peerTypingTimeoutsRef.current[conversationId];
      if (existingTimeout) window.clearTimeout(existingTimeout);

      setTypingConversationIds((current) => current[conversationId] ? current : { ...current, [conversationId]: true });
      peerTypingTimeoutsRef.current[conversationId] = window.setTimeout(() => clearPeerTyping(conversationId), 2200);
    };

    const handleTypingEnd = (payload: { userId?: unknown; conversationId?: unknown }) => {
      if (payload.userId === currentUser.id || typeof payload.conversationId !== 'string') return;
      clearPeerTyping(payload.conversationId);
    };

    socket.on('typing:start', handleTypingStart);
    socket.on('typing:end', handleTypingEnd);

    return () => {
      socket.off('typing:start', handleTypingStart);
      socket.off('typing:end', handleTypingEnd);
      Object.values(peerTypingTimeoutsRef.current).forEach((timeout) => window.clearTimeout(timeout));
      peerTypingTimeoutsRef.current = {};
      setTypingConversationIds({});
    };
  }, [currentUser?.id]);

  useEffect(() => {
    stopTyping();
    setReplyTarget(null);
  }, [id, stopTyping]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') stopTyping();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      stopTyping();
    };
  }, [stopTyping]);

  useEffect(() => {
    for (const conv of conversations) {
      const otherId = conv.participantIds.find((pid) => pid !== currentUser?.id);
      if (otherId && !users[otherId]) loadUserProfile(otherId);
    }
  }, [conversations, users, currentUser?.id, loadUserProfile]);

  useEffect(() => {
    if (id) {
      loadConversationMessages(id);
      // Optional: focus input when switching conversations on desktop
      if (window.innerWidth >= 1024) {
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    }
  }, [id, loadConversationMessages]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [id, messagesByConversation[id ?? '']?.length]);

  const conversationList = useMemo(() => {
    const list = conversations
      .map((conv) => {
        const otherId = conv.participantIds.find((pid) => pid !== currentUser?.id);
        const user = otherId ? users[otherId] : undefined;
        return { conv, user };
      })
      .filter((c): c is { conv: typeof conversations[number]; user: NonNullable<typeof c.user> } => !!c.user);
      
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(c => 
      c.user.displayName.toLowerCase().includes(q) || 
      c.user.username.toLowerCase().includes(q)
    );
  }, [conversations, users, currentUser?.id, searchQuery]);

  const activeConv = useMemo(() => conversationList.find((c) => c.conv.id === id), [conversationList, id]);
  const activeMessages = id ? (messagesByConversation[id] ?? []) : [];
  const isPeerTyping = Boolean(id && typingConversationIds[id]);

  const messageLimit = MAX_MESSAGE_LENGTH;
  const isMessageTooLong = message.trim().length > MAX_MESSAGE_LENGTH;

  const handleSelect = useCallback((convId: string) => {
    setLocation(`/messages/${convId}`);
  }, [setLocation]);

  const handleSend = async () => {
    if (!message.trim() || !activeConv || sending) return;

    const outgoingMessage = message.trim();
    if (outgoingMessage.length > MAX_MESSAGE_LENGTH) return;

    stopTyping();
    setSending(true);
    setPulseSend(true);
    setTimeout(() => setPulseSend(false), 300);
    try {
      await sendDirectMessage(activeConv.user.id, outgoingMessage, replyTarget?.messageId);
      setMessage('');
      setReplyTarget(null);
      if (inputRef.current) {
        inputRef.current.style.height = 'auto'; // reset height
      }
    } catch (err) {
      console.error('Failed to send message', err);
    }
    setSending(false);
  };

  const adjustTextareaHeight = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const nextMessage = e.target.value;
    setMessage(nextMessage);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;

    if (nextMessage.trim() && activeConv) {
      signalTyping(id);
    } else {
      stopTyping();
    }
  };

  type ConvEntry = typeof conversationList[number];

  const ConversationItem = React.memo(function ConversationItem({ entry, active, isTyping, onSelect }: { entry: ConvEntry; active: boolean; isTyping: boolean; onSelect: (id: string) => void }) {
    const { conv, user } = entry;
    const unread = conv.lastMessage && conv.lastMessage.senderId !== currentUser?.id && !conv.lastMessage.read;
    const lastMsgTime = conv.lastMessage ? new Date(conv.lastMessage.createdAt) : null;
    
    let timeStr = '';
    if (lastMsgTime) {
      if (isSameDay(lastMsgTime, new Date())) {
        timeStr = format(lastMsgTime, 'h:mm a');
      } else {
        timeStr = format(lastMsgTime, 'MMM d');
      }
    }

    return (
      <motion.div
        variants={staggerItem}
        onClick={() => onSelect(conv.id)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(conv.id); }}
        className={cn(
          "mx-2 px-3 py-3 flex gap-3 cursor-pointer transition-all duration-200 relative rounded-xl group hover-lift card-shine",
          active
            ? "bg-primary/5 border-l-2 border-l-primary shadow-sm"
            : "hover:bg-muted/40"
        )}
      >
        {/* Active indicator — vertical gradient bar */}
        {active && (
          <div className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-gradient-to-b from-primary via-primary/80 to-primary/40" />
        )}

        {/* Avatar and unread state */}
        <div className="relative shrink-0">
          <Avatar className="w-[44px] h-[44px] ring-2 ring-transparent group-hover:ring-primary/10 transition-all">
            <AvatarImage src={user.avatarUrl} />
            <AvatarFallback className="font-display font-semibold text-sm">{user.displayName.charAt(0)}</AvatarFallback>
          </Avatar>
          {unread && (
            <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-primary border-2 border-background glow-neon-primary" />
          )}
        </div>

        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <div className="flex items-center justify-between">
            <span className={cn(
              "text-sm truncate",
              unread ? "font-bold text-foreground" : "font-semibold text-foreground/90"
            )}>
              {user.displayName}
            </span>
            {timeStr && (
              <span className={cn(
                "text-[11px] font-mono whitespace-nowrap ml-2 tabular-nums",
                unread ? "text-primary font-semibold" : "text-muted-foreground"
              )}>
                {timeStr}
              </span>
            )}
          </div>
          <div className="flex items-center mt-0.5">
            {isTyping ? (
              <p className="max-w-[90%] truncate text-xs font-medium text-primary" aria-live="polite">Typing…</p>
            ) : (
              <p className={cn(
                "text-xs truncate max-w-[90%]",
                unread ? "text-foreground font-medium" : "text-muted-foreground"
              )}>
                {conv.lastMessage?.content ?? 'New conversation'}
              </p>
            )}
          </div>
        </div>
      </motion.div>
    );
  });

  return (
    <div className="h-[100dvh] lg:h-[calc(100dvh-6rem)] w-full max-w-6xl mx-auto lg:p-4">
      <div className="flex w-full h-full lg:surface-1 lg:rounded-2xl lg:shadow-sm overflow-hidden border-none lg:border lg:border-border/50">
        
        {/* ══════════════════════════════════════════════════════════════
            SIDEBAR
            ══════════════════════════════════════════════════════════════ */}
        <div className={cn(
          "w-full lg:w-[320px] flex-col border-r border-border/50 bg-background lg:bg-transparent",
          id ? "hidden lg:flex" : "flex"
        )}>
          {/* Sidebar header */}
          <div className="p-4 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-extrabold text-2xl tracking-tight">Chats</h2>
              <Button 
                size="icon" 
                className="rounded-full w-9 h-9 glow-neon-primary bg-primary text-primary-foreground hover:bg-primary/90 shadow-md" 
                onClick={() => setNewMessageOpen(true)}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {/* Search with neon focus */}
            <div className="relative group/search rounded-xl transition-all focus-within:ring-2 focus-within:ring-primary/40 focus-within:glow-neon-primary">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within/search:text-primary transition-colors" />
              <Input 
                placeholder="Search conversations" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 surface-2 border-none rounded-xl h-10 text-sm focus-visible:ring-0 focus-visible:ring-offset-0" 
              />
            </div>
          </div>
          
          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto hide-scrollbar">
            {conversationList.length === 0 && (
              <div className="p-8 flex flex-col items-center justify-center text-center h-full text-muted-foreground opacity-80">
                <MessageCircle className="w-8 h-8 mb-3 opacity-50" />
                <p className="text-sm font-medium">No chats found.</p>
                <p className="text-xs mt-1 text-muted-foreground/60">Start a conversation to get going</p>
              </div>
            )}
            <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="pb-4 space-y-0.5 stagger-in">
              {conversationList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-6 text-center text-muted-foreground">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                    <MessageCircle className="w-6 h-6 text-primary" />
                  </div>
                  <p className="text-sm font-medium">No messages yet</p>
                  <p className="text-xs mt-1">Start a conversation from the explore page.</p>
                </div>
              ) : (
                conversationList.map((entry) => (
                  <ConversationItem key={entry.conv.id} entry={entry} active={activeConv?.conv.id === entry.conv.id} isTyping={Boolean(typingConversationIds[entry.conv.id])} onSelect={handleSelect} />
                ))
              )}
            </motion.div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            CHAT AREA
            ══════════════════════════════════════════════════════════════ */}
        <div className={cn("flex-1 flex-col bg-background lg:bg-transparent", id ? "flex" : "hidden lg:flex")}>
          {activeConv ? (
            <>
              {/* Chat Header — glass-heavy */}
              <div className="h-16 px-4 border-b border-border/30 flex items-center justify-between glass-heavy sticky top-0 z-10">
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="icon" className="lg:hidden -ml-2 w-9 h-9 text-muted-foreground hover:text-foreground" onClick={() => setLocation('/messages')}>
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                  <div className="relative">
                    <Avatar className="w-10 h-10 ring-2 ring-primary/10">
                      <AvatarImage src={activeConv.user.avatarUrl} />
                      <AvatarFallback className="font-display font-semibold">{activeConv.user.displayName.charAt(0)}</AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="flex flex-col">
                    <h3 className="font-display font-semibold text-sm leading-tight">{activeConv.user.displayName}</h3>
                    <span className={cn('text-xs font-mono leading-tight', isPeerTyping ? 'text-primary' : 'text-muted-foreground')}>
                      {isPeerTyping ? 'Typing…' : `@${activeConv.user.username}`}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <SteamTradeModal
                    partnerName={activeConv.user.displayName}
                    partnerAvatar={activeConv.user.avatarUrl}
                  />
                  <Button variant="ghost" size="icon" className="rounded-full w-9 h-9 text-muted-foreground hover:text-foreground hover:bg-muted/50">
                    <MoreVertical className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-4 lg:p-6 flex flex-col hide-scrollbar">
                {activeMessages.length === 0 && (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="relative overflow-hidden rounded-2xl">
                      <div className="aurora-bg absolute inset-0 opacity-30 rounded-2xl" />
                      <div className="noise-overlay absolute inset-0 rounded-2xl" />
                      <div className="relative text-center px-8 py-6">
                        <Sparkles className="w-6 h-6 text-primary mx-auto mb-2 opacity-70" />
                        <p className="text-sm font-display font-semibold text-foreground/80">Start the chat with a wave 👋</p>
                        <p className="text-xs text-muted-foreground mt-1">Messages are end-to-end private</p>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="flex flex-col mt-auto justify-end stagger-in">
                  {activeMessages.map((msg, i) => {
                    const isMine = msg.senderId === currentUser?.id;
                    const prevMsg = i > 0 ? activeMessages[i - 1] : null;
                    const sameSenderAsPrev = prevMsg?.senderId === msg.senderId;
                    const msgDate = new Date(msg.createdAt);
                    const prevMsgDate = prevMsg ? new Date(prevMsg.createdAt) : null;
                    
                    // Show date header if > 1 hour gap or different day
                    const showDate = !prevMsgDate || 
                      (msgDate.getTime() - prevMsgDate.getTime() > 60 * 60 * 1000) ||
                      !isSameDay(msgDate, prevMsgDate);

                    const gapClass = sameSenderAsPrev && !showDate ? "mt-1" : "mt-4";

                    return (
                      <React.Fragment key={msg.id}>
                        {showDate && (
                          <div className="flex justify-center my-6">
                            <span className="text-[11px] font-mono font-medium text-muted-foreground/80 tracking-wider uppercase px-3 py-1 rounded-full surface-2">
                              {(() => {
                                const now = new Date();
                                const diff = now.getTime() - msgDate.getTime();
                                const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                                if (days === 0) return 'Today';
                                if (days === 1) return 'Yesterday';
                                return msgDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
                              })()}
                            </span>
                          </div>
                        )}
                        <motion.div
                          variants={fadeInUp}
                          initial="hidden"
                          animate="visible"
                          className={cn(
                            "group/message flex flex-col max-w-[75%]",
                            isMine ? "ml-auto items-end" : "mr-auto items-start",
                            gapClass
                          )}
                        >
                          <div 
                            className={cn(
                              "px-4 py-2.5 text-[15px] leading-relaxed",
                              isMine
                                ? "bg-gradient-to-r from-primary to-purple-600 text-white rounded-[20px] rounded-br-md shadow-md shadow-primary/20"
                                : "glass-heavy text-foreground rounded-[20px] rounded-bl-md shadow-sm"
                            )}
                          >
                            <MessageContent content={msg.content} isMine={isMine} />
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const replyBody = (parseReply(msg.content)?.body ?? msg.content).replace(/\s+/g, ' ').trim().slice(0, 120);
                              const senderName = (isMine ? currentUser?.displayName ?? 'You' : activeConv.user.displayName).replace(/[\]\n]/g, ' ').trim();
                              setReplyTarget({ messageId: msg.id, senderName, excerpt: replyBody || 'Message' });
                              inputRef.current?.focus();
                            }}
                            className="mt-1 flex items-center gap-1 rounded-md px-1 py-0.5 text-[0.68rem] font-medium text-muted-foreground opacity-100 transition-opacity hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary md:opacity-0 md:group-hover/message:opacity-100"
                            aria-label={`Reply to ${isMine ? 'your message' : activeConv.user.displayName}`}
                          >
                            <Reply className="h-3 w-3" /> Reply
                          </button>
                        </motion.div>
                      </React.Fragment>
                    );
                  })}

                  {/* Typing indicator — shows subtly */}
                  {isPeerTyping && <TypingIndicator name={activeConv.user.displayName} />}

                  <div ref={scrollRef} className="h-1" />
                </div>
              </div>

              {/* Input Area — glass-heavy with glow */}
              <div className="p-3 lg:p-4 border-t border-border/30">
                {replyTarget && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-2 flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2"
                  >
                    <Reply className="h-4 w-4 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-foreground">Replying to {replyTarget.senderName}</p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">{replyTarget.excerpt}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setReplyTarget(null)}
                      className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      aria-label="Cancel reply"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </motion.div>
                )}
                <div className={cn(
                  "glass-heavy rounded-2xl p-1.5 flex items-end gap-2 transition-all duration-300 focus-glow",
                  "focus-within:ring-2 focus-within:ring-primary/30 focus-within:shadow-[0_0_20px_rgba(var(--primary),0.08)]"
                )}>
                  <textarea
                    ref={inputRef}
                    value={message}
                    onChange={adjustTextareaHeight}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                    placeholder="Write something..."
                    maxLength={messageLimit}
                    aria-label={replyTarget ? `Reply to ${replyTarget.senderName}` : 'Write a message'}
                    className="flex-1 bg-transparent resize-none outline-none py-2.5 px-3 min-h-[44px] text-[15px] thin-scrollbar placeholder:text-muted-foreground/50"
                    rows={1}
                  />
                  <div className="flex shrink-0 pb-0.5 pr-0.5">
                    {sending && <span className="self-center pr-2 text-[0.68rem] font-medium text-muted-foreground" role="status">Sending…</span>}
                    <Button
                      size="icon"
                      className={cn(
                        "w-9 h-9 rounded-xl transition-all duration-300",
                        message.trim() 
                          ? "bg-primary text-primary-foreground shadow-md hover:bg-primary/90 glow-neon-primary" 
                          : "bg-muted text-muted-foreground hover:bg-muted/80",
                        pulseSend && "animate-pulse shadow-[0_0_15px_rgba(var(--primary),0.6)] scale-95"
                      )}
                      disabled={!message.trim() || sending || isMessageTooLong}
                      onClick={handleSend}
                    >
                      <SendHorizontal className={cn("w-4 h-4 transition-transform", message.trim() && "ml-0.5 scale-110")} />
                    </Button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* ════════════════════════════════════════════════════════════
               EMPTY STATE — no chat selected
               ════════════════════════════════════════════════════════════ */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center h-full relative overflow-hidden">
              {/* Aurora background */}
              <div className="absolute inset-0 aurora-bg opacity-20" />
              <div className="absolute inset-0 noise-overlay" />

              <div className="relative z-10 flex flex-col items-center">
                {/* Icon container with inner aurora glow */}
                <div className="relative w-20 h-20 mb-6">
                  <div className="absolute inset-0 rounded-full aurora-bg opacity-40 blur-sm" />
                  <div className="relative w-full h-full surface-2 rounded-full flex items-center justify-center shadow-lg ring-1 ring-border/30">
                    <MessageCircle className="w-9 h-9 text-primary/70" />
                  </div>
                </div>

                <h2 className="text-2xl font-display font-extrabold mb-2 text-shimmer">
                  Select a chat or start a new one
                </h2>
                <p className="text-sm text-muted-foreground max-w-[280px] leading-relaxed">
                  Choose from your recent chats, or start a new one to connect with someone.
                </p>
                <Button
                  className="mt-6 rounded-full font-display font-semibold px-8 py-5 glow-neon-primary shadow-lg hover:shadow-xl transition-all duration-300"
                  onClick={() => setNewMessageOpen(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New chat
                </Button>
              </div>
            </div>
          )}
        </div>

        <NewMessageDialog open={newMessageOpen} onOpenChange={setNewMessageOpen} />
      </div>
    </div>
  );
}
