import * as React from 'react';
import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useAppStore, type Message as DirectMessage } from '@/lib/store';
import { api, type BackendUser } from '@/lib/api-client';
import { useParams, useLocation } from 'wouter';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Search, Plus, MoreVertical, SendHorizontal, MessageCircle, ArrowLeft, 
  Sparkles, Reply, X, Video, Phone, Mic, Zap, EyeOff, Shield, Image as ImageIcon 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getSocket } from '@/lib/socket-client';
import { format, formatDistanceToNow, isSameDay } from 'date-fns';
import { motion } from 'framer-motion';
import { fadeInUp, staggerContainer, staggerItem } from '@/lib/motion';
import { SteamTradeModal } from '@/components/steam/SteamTradeModal';
import { VoiceNoteRecorder } from '@/components/messages/VoiceNoteRecorder';
import { WebRtcCallModal } from '@/components/messages/WebRtcCallModal';
import { UpiTipJarModal } from '@/components/monetization/UpiTipJarModal';
import { sounds } from '@/lib/sound';
import { toast } from 'sonner';

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

  // Check if content is a voice note
  if (body.startsWith('[Voice Note]')) {
    const audioUrlMatch = body.match(/\[Voice Note\]\s*(https?:\/\/[^\s]+|\S+)/);
    const audioUrl = audioUrlMatch ? audioUrlMatch[1] : '';
    return (
      <div className="flex items-center gap-2 py-1">
        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary">
          <Mic className="w-4 h-4" />
        </div>
        <audio controls src={audioUrl} className="max-w-[200px] h-8" />
      </div>
    );
  }

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
                <button key={u.id} onClick={() => setSelected(u)} className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-muted/50 text-left transition-colors cursor-pointer">
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
              <button onClick={() => setSelected(null)} className="text-xs text-primary font-medium hover:underline px-2 cursor-pointer">Change</button>
            </div>
            <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Write a message…" className="w-full min-h-[100px] rounded-xl border border-transparent surface-1 p-3 text-[15px] outline-none focus:border-primary/30 focus:ring-1 focus:ring-primary/30 transition-all resize-none" autoFocus />
            <Button onClick={handleSend} disabled={!content.trim() || sending} className="w-full rounded-xl py-6 cursor-pointer">{sending ? 'Sending…' : 'Send message'}</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ConversationItem({
  entry,
  active,
  isTyping,
  onSelect,
}: {
  entry: { conv: any; user: any; lastMsg?: DirectMessage };
  active: boolean;
  isTyping: boolean;
  onSelect: (id: string) => void;
}) {
  const { conv, user, lastMsg } = entry;
  const displayName = user.displayName || user.username || 'User';

  return (
    <button
      onClick={() => onSelect(conv.id)}
      className={cn(
        "w-full flex items-center gap-3 p-3 rounded-2xl transition-all text-left cursor-pointer",
        active ? "bg-primary/15 border border-primary/30 glow-neon-primary" : "hover:bg-muted/40 border border-transparent"
      )}
    >
      <Avatar className="w-11 h-11 border border-border/50">
        <AvatarImage src={user.avatarUrl} />
        <AvatarFallback className="font-display font-bold">{displayName.charAt(0)}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="font-bold text-sm truncate text-foreground">{displayName}</span>
          {lastMsg && (
            <span className="text-[0.68rem] font-mono text-muted-foreground shrink-0">
              {formatDistanceToNow(new Date(lastMsg.createdAt))}
            </span>
          )}
        </div>
        <p className={cn("text-xs truncate mt-0.5", isTyping ? "text-primary font-bold" : "text-muted-foreground")}>
          {isTyping ? "Typing…" : lastMsg?.content || "No messages yet"}
        </p>
      </div>
    </button>
  );
}

export default function Messages() {
  const { id } = useParams<{ id?: string }>();
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
  const [imageAttachment, setImageAttachment] = useState('');
  const [showImageInput, setShowImageInput] = useState(false);
  const [newMessageOpen, setNewMessageOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [pulseSend, setPulseSend] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [replyTarget, setReplyTarget] = useState<ReplyTarget | null>(null);
  const [typingConversationIds, setTypingConversationIds] = useState<Record<string, true>>({});
  
  // Direct Messaging 2.0 Pro Features
  const [callModalOpen, setCallModalOpen] = useState(false);
  const [callType, setCallType] = useState<'video' | 'audio'>('video');
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [vanishMode, setVanishMode] = useState(false);
  const [tipModalOpen, setTipModalOpen] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingStopTimeoutRef = useRef<number | null>(null);
  const typingConversationIdRef = useRef<string | null>(null);

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

    const prevId = typingConversationIdRef.current;
    if (prevId && prevId !== conversationId) {
      socket.emit('typing:end', { conversationId: prevId });
    }

    if (prevId !== conversationId) {
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
    if (id) {
      loadConversationMessages(id);
    }
  }, [id, loadConversationMessages]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messagesByConversation, id]);

  const conversationList = useMemo(() => {
    return conversations
      .map((conv) => {
        const otherId = conv.participantIds.find((p) => p !== currentUser?.id) || '';
        let otherUser = users[otherId];
        if (!otherUser && otherId) {
          loadUserProfile(otherId);
          otherUser = {
            id: otherId,
            username: 'User',
            displayName: 'User',
            avatarUrl: `https://i.pravatar.cc/150?u=${otherId}`,
            followers: 0,
            following: 0,
          };
        }
        const msgs = messagesByConversation[conv.id] || [];
        const lastMsg = msgs[msgs.length - 1];
        return { conv, user: otherUser || { id: otherId, username: 'User', displayName: 'User', avatarUrl: '' }, lastMsg };
      })
      .filter((entry) =>
        entry.user.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.user.username.toLowerCase().includes(searchQuery.toLowerCase())
      );
  }, [conversations, users, currentUser?.id, messagesByConversation, searchQuery, loadUserProfile]);

  const activeConv = useMemo(() => {
    if (!id) return null;
    return conversationList.find((c) => c.conv.id === id) || null;
  }, [id, conversationList]);

  const activeMessages = useMemo(() => {
    if (!id) return [];
    return messagesByConversation[id] || [];
  }, [id, messagesByConversation]);

  const isPeerTyping = Boolean(id && typingConversationIds[id]);

  const handleSend = async () => {
    if ((!message.trim() && !imageAttachment.trim()) || !activeConv || sending) return;
    
    const baseMessage = imageAttachment.trim() 
      ? `${message.trim()}\n📷 ${imageAttachment.trim()}`
      : message.trim();

    const toSend = replyTarget
      ? `[Reply to ${replyTarget.senderName}] ${replyTarget.excerpt}\n${baseMessage}`
      : baseMessage;

    setSending(true);
    setPulseSend(true);
    sounds.playPop();

    try {
      await sendDirectMessage(activeConv.user.id, toSend);
      setMessage('');
      setImageAttachment('');
      setShowImageInput(false);
      setReplyTarget(null);
      stopTyping();
    } catch {
      toast.error('Failed to send message');
    } finally {
      setSending(false);
      setTimeout(() => setPulseSend(false), 300);
    }
  };

  const handleSendVoiceNote = async (audioUrl: string, durationSeconds: number) => {
    if (!activeConv) return;
    try {
      await sendDirectMessage(activeConv.user.id, `[Voice Note] ${audioUrl} (${durationSeconds}s)`);
      setShowVoiceRecorder(false);
      toast.success('Voice note sent! 🎙️');
    } catch {
      toast.error('Failed to send voice note');
    }
  };

  return (
    <div className="messages-page w-full max-w-6xl mx-auto lg:p-4 font-sans">
      <div className="flex min-h-0 w-full h-full lg:surface-1 lg:rounded-3xl lg:shadow-xl overflow-hidden border-none lg:border lg:border-border/50">
        
        {/* ── SIDEBAR (Chats List) ────────────────────────────────────────── */}
        <div className={cn(
          "min-h-0 w-full lg:w-[340px] flex-col border-r border-border/50 bg-background lg:bg-transparent",
          id ? "hidden lg:flex" : "flex"
        )}>
          <div className="p-4 flex flex-col gap-4 border-b border-border/30">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-black text-2xl tracking-tight text-foreground">Direct Chats</h2>
              <Button 
                size="icon" 
                className="rounded-full w-9 h-9 glow-neon-primary bg-primary text-primary-foreground hover:bg-primary/90 shadow-md cursor-pointer" 
                onClick={() => setNewMessageOpen(true)}
                aria-label="Start a new conversation"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            <div className="relative group/search rounded-xl transition-all focus-within:ring-2 focus-within:ring-primary/40 focus-within:glow-neon-primary">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within/search:text-primary transition-colors" />
              <Input 
                placeholder="Search conversations" 
                aria-label="Search conversations"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 surface-2 border-none rounded-xl h-10 text-xs focus-visible:ring-0" 
              />
            </div>
          </div>
          
          <div className="min-h-0 flex-1 overflow-y-auto hide-scrollbar p-2 space-y-1">
            {conversationList.length === 0 ? (
              <div className="p-8 flex flex-col items-center justify-center text-center h-full text-muted-foreground opacity-80">
                <MessageCircle className="w-8 h-8 mb-3 opacity-50 text-primary" />
                <p className="text-sm font-medium">No chats found.</p>
                <p className="text-xs mt-1 text-muted-foreground/60">Start a conversation from explore</p>
              </div>
            ) : (
              conversationList.map((entry) => (
                <ConversationItem 
                  key={entry.conv.id} 
                  entry={entry} 
                  active={activeConv?.conv.id === entry.conv.id} 
                  isTyping={Boolean(typingConversationIds[entry.conv.id])} 
                  onSelect={(convId) => setLocation(`/messages/${convId}`)} 
                />
              ))
            )}
          </div>
        </div>

        {/* ── CHAT THREAD AREA ───────────────────────────────────────────── */}
        <div className={cn("min-h-0 flex-1 flex-col bg-background lg:bg-transparent", id ? "flex" : "hidden lg:flex")}>
          {activeConv ? (
            <>
              {/* Chat Header */}
              <div className="h-16 px-4 border-b border-border/30 flex items-center justify-between glass-heavy sticky top-0 z-10">
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="icon" className="lg:hidden -ml-2 w-9 h-9 text-muted-foreground hover:text-foreground" onClick={() => setLocation('/messages')} aria-label="Back to conversations">
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                  <div className="relative">
                    <Avatar className="w-10 h-10 ring-2 ring-primary/20">
                      <AvatarImage src={activeConv.user.avatarUrl} />
                      <AvatarFallback className="font-display font-semibold">{activeConv.user.displayName.charAt(0)}</AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="flex flex-col">
                    <h3 className="font-display font-bold text-sm leading-tight text-foreground">{activeConv.user.displayName}</h3>
                    <span className={cn('text-xs font-mono leading-tight', isPeerTyping ? 'text-primary' : 'text-muted-foreground')}>
                      {isPeerTyping ? 'Typing…' : `@${activeConv.user.username}`}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {/* Vanish Mode */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setVanishMode(!vanishMode);
                      toast.info(vanishMode ? 'Vanish Mode turned off' : '⚡ Vanish Mode active — messages disappear when read');
                    }}
                    className={cn(
                      "rounded-full w-9 h-9 transition-colors cursor-pointer",
                      vanishMode ? "bg-purple-600/30 text-purple-400 border border-purple-500/50" : "text-muted-foreground hover:text-foreground"
                    )}
                    title="Toggle Vanish Mode"
                    aria-label="Toggle Vanish Mode"
                  >
                    <EyeOff className="w-4 h-4" />
                  </Button>

                  {/* Instant Tip UPI */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setTipModalOpen(true)}
                    className="rounded-full w-9 h-9 text-amber-400 hover:bg-amber-500/20 hover:text-amber-300 cursor-pointer"
                    title="Tip via UPI"
                    aria-label="Tip via UPI"
                  >
                    <Zap className="w-4 h-4 fill-amber-400" />
                  </Button>

                  {/* Audio Call */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setCallType('audio');
                      setCallModalOpen(true);
                    }}
                    className="rounded-full w-9 h-9 text-muted-foreground hover:text-foreground hover:bg-muted/50 cursor-pointer"
                    title="Voice Call"
                    aria-label="Start voice call"
                  >
                    <Phone className="w-4 h-4" />
                  </Button>

                  {/* Video Call */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setCallType('video');
                      setCallModalOpen(true);
                    }}
                    className="rounded-full w-9 h-9 text-primary hover:bg-primary/20 cursor-pointer"
                    title="4K Video Call"
                    aria-label="Start video call"
                  >
                    <Video className="w-4 h-4" />
                  </Button>

                  <SteamTradeModal
                    partnerName={activeConv.user.displayName}
                    partnerAvatar={activeConv.user.avatarUrl}
                  />
                  <Button variant="ghost" size="icon" className="rounded-full w-9 h-9 text-muted-foreground hover:text-foreground hover:bg-muted/50" aria-label="More conversation options">
                    <MoreVertical className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              {/* Messages Flow */}
              <div className={cn("min-h-0 flex-1 overflow-y-auto p-4 lg:p-6 flex flex-col hide-scrollbar", vanishMode && "bg-purple-950/20")}>
                {activeMessages.length === 0 && (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="relative overflow-hidden rounded-2xl p-6 text-center surface-1 border border-border/30">
                      <Sparkles className="w-6 h-6 text-primary mx-auto mb-2 opacity-70" />
                      <p className="text-sm font-display font-bold text-foreground">Start the chat with a wave 👋</p>
                      <p className="text-xs text-muted-foreground mt-1">End-to-end encrypted direct messaging</p>
                    </div>
                  </div>
                )}

                <div className="flex flex-col mt-auto justify-end space-y-2">
                  {activeMessages.map((msg) => {
                    const isMine = msg.senderId === currentUser?.id;
                    return (
                      <div
                        key={msg.id}
                        className={cn(
                          "max-w-[75%] rounded-2xl px-4 py-2.5 text-xs font-sans leading-relaxed shadow-sm",
                          isMine
                            ? "ml-auto bg-gradient-to-r from-primary to-purple-600 text-white rounded-br-none"
                            : "mr-auto surface-2 text-foreground rounded-bl-none border border-border/40"
                        )}
                      >
                        <MessageContent content={msg.content} isMine={isMine} />
                        <span className="text-[0.62rem] font-mono opacity-60 block mt-1 text-right">
                          {format(new Date(msg.createdAt), 'hh:mm a')}
                        </span>
                      </div>
                    );
                  })}
                  <div ref={scrollRef} className="h-1" />
                </div>
              </div>

              {/* Input Area */}
              <div className="p-3 lg:p-4 border-t border-border/30 surface-1">
                {showVoiceRecorder ? (
                  <VoiceNoteRecorder
                    onSendVoiceNote={handleSendVoiceNote}
                    onCancel={() => setShowVoiceRecorder(false)}
                  />
                ) : (
                  <div className="flex flex-col gap-2">
                    {showImageInput && (
                      <div className="mb-2 space-y-2">
                        <div className="flex items-center gap-2">
                          <Input
                            value={imageAttachment}
                            onChange={(e) => setImageAttachment(e.target.value)}
                            placeholder="Paste image URL..."
                            className="rounded-xl text-xs h-9 flex-1"
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => { setShowImageInput(false); setImageAttachment(''); }}
                            className="rounded-lg h-9 px-2 text-muted-foreground"
                            aria-label="Close image attachment"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                        {imageAttachment.trim() && (
                          <div className="h-32 rounded-xl overflow-hidden bg-muted border border-border/40">
                            <img src={imageAttachment} alt="Preview" className="w-full h-full object-cover" />
                          </div>
                        )}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setShowVoiceRecorder(true)}
                        className="rounded-full w-10 h-10 text-primary hover:bg-primary/20 shrink-0 cursor-pointer"
                        title="Record Voice Note"
                        aria-label="Record voice note"
                      >
                        <Mic className="w-5 h-5" />
                      </Button>

                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setShowImageInput(prev => !prev)}
                        className="rounded-full w-10 h-10 text-muted-foreground hover:text-primary hover:bg-primary/10 shrink-0 cursor-pointer"
                        title="Send Image"
                        aria-label="Add image attachment"
                      >
                        <ImageIcon className="w-5 h-5" />
                      </Button>

                      <Input
                        ref={inputRef}
                        value={message}
                        onChange={(e) => {
                          setMessage(e.target.value);
                          signalTyping(id);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSend();
                        }}
                        placeholder="Write a direct message…"
                        className="rounded-2xl surface-2 border-border/40 text-xs h-11"
                      />

                      <Button
                        size="icon"
                        disabled={(!message.trim() && !imageAttachment.trim()) || sending}
                        onClick={handleSend}
                        className="w-10 h-10 rounded-2xl bg-primary text-primary-foreground shrink-0 glow-neon-primary cursor-pointer"
                        aria-label="Send message"
                      >
                        <SendHorizontal className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* WebRTC Video Call Modal */}
              <WebRtcCallModal
                isOpen={callModalOpen}
                onClose={() => setCallModalOpen(false)}
                peerUser={{
                  id: activeConv.user.id,
                  displayName: activeConv.user.displayName,
                  username: activeConv.user.username,
                  avatarUrl: activeConv.user.avatarUrl,
                }}
                callType={callType}
              />

              {/* UPI Tip Jar Modal */}
              <UpiTipJarModal
                creator={{
                  id: activeConv.user.id,
                  displayName: activeConv.user.displayName,
                  username: activeConv.user.username,
                  avatarUrl: activeConv.user.avatarUrl,
                }}
                isOpen={tipModalOpen}
                onOpenChange={setTipModalOpen}
              />
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center h-full relative overflow-hidden">
              <div className="w-16 h-16 rounded-3xl bg-primary/10 text-primary flex items-center justify-center mb-4 shadow-xl ring-2 ring-primary/20">
                <MessageCircle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-display font-black text-foreground">Select a chat to begin</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                Encrypted chats, voice notes, 4K WebRTC video calls and zero-fee UPI payouts.
              </p>
              <Button
                onClick={() => setNewMessageOpen(true)}
                className="mt-5 rounded-2xl font-display font-bold text-xs h-11 px-6 bg-primary text-primary-foreground glow-neon-primary cursor-pointer"
              >
                <Plus className="w-4 h-4 mr-1.5" /> Start New Chat
              </Button>
            </div>
          )}
        </div>

        <NewMessageDialog open={newMessageOpen} onOpenChange={setNewMessageOpen} />
      </div>
    </div>
  );
}
