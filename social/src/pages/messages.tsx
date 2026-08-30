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
  Search, Plus, UsersRound, MoreVertical, SendHorizontal, ArrowLeft, LoaderCircle,
  Reply, X, Video, Phone, Mic, Zap, EyeOff, Image as ImageIcon, Pencil, Trash2, Pin, Smile,
  ArrowLeftRight, LockKeyhole, Inbox
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getSocket } from '@/lib/socket-client';
import { format, formatDistanceToNow, isSameDay } from 'date-fns';
import { motion } from 'framer-motion';
import { SteamTradeModal } from '@/components/steam/SteamTradeModal';
import { VoiceNoteRecorder } from '@/components/messages/VoiceNoteRecorder';
import { WebRtcCallModal } from '@/components/messages/WebRtcCallModal';
import { UpiTipJarModal } from '@/components/monetization/UpiTipJarModal';
import { sounds } from '@/lib/sound';
import { toast } from 'sonner';
import { SignalLabel, StatusBadge } from '@/components/system';
import '@/styles/operator-communications.css';
import { publicBetaConfig } from '@/lib/public-beta-config';

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
  const imageMatch = body.match(/(?:^|\n)📷\s+(https?:\/\/\S+)\s*$/);
  const imageUrl = imageMatch?.[1];
  const textBody = imageMatch ? body.slice(0, imageMatch.index).trim() : body;

  const replyMarkup = reply ? (
    <div className="operator-message-reply" data-mine={isMine || undefined}>
      <Reply aria-hidden="true" />
      <div>
        <strong>Replying to {reply.senderName}</strong>
        <span>{reply.excerpt}</span>
      </div>
    </div>
  ) : null;

  if (body.startsWith('[Voice Note]')) {
    const audioUrlMatch = body.match(/\[Voice Note\]\s*(https?:\/\/[^\s]+|\S+)/);
    const audioUrl = audioUrlMatch ? audioUrlMatch[1] : '';
    return (
      <>
        {replyMarkup}
        <div className="operator-message-audio">
          <span><Mic aria-hidden="true" /></span>
          <audio controls src={audioUrl} preload="metadata" />
        </div>
      </>
    );
  }

  return (
    <>
      {replyMarkup}
      {textBody && <span className="operator-message-text">{textBody}</span>}
      {imageUrl && <img className="operator-message-image" src={imageUrl} alt="Shared attachment" loading="lazy" />}
    </>
  );
}

/* ─── Typing indicator dots ────────────────────────────────────────────── */
function TypingIndicator({ name }: { name: string }) {
  return (
    <div className="operator-typing-indicator" role="status" aria-live="polite">
      <div className="operator-typing-indicator__dots">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
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
      <span>{name} is typing</span>
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
  const [sendError, setSendError] = useState('');

  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return; }
    let active = true;
    const handle = setTimeout(async () => {
      try {
        const users = await api.searchUsers(query.trim());
        if (active) setResults(users.filter((u) => u.id !== currentUser?.id));
      } catch { /* ignore transient search errors */ }
    }, 250);
    return () => { active = false; clearTimeout(handle); };
  }, [query, currentUser?.id]);

  const handleSend = async () => {
    if (!selected || !content.trim()) return;
    setSending(true);
    setSendError('');
    try {
      await sendDirectMessage(selected.id, content.trim());
      onOpenChange(false);
      setSelected(null);
      setContent('');
      setQuery('');
      const conv = useAppStore.getState().conversations.find((c) => c.participantIds.includes(selected.id));
      if (conv) setLocation(`/messages/${conv.id}`);
    } catch (err) {
      setSendError('Could not send this message. Your draft is still here.');
      toast.error('Message not sent. Your draft is still here.');
    }
    setSending(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="operator-message-dialog">
        <DialogHeader><DialogTitle>Start a conversation</DialogTitle></DialogHeader>
        {!selected ? (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search people" aria-label="Search people to message" value={query} onChange={(e) => setQuery(e.target.value)} autoFocus className="pl-9 surface-1 border-none rounded-xl" />
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
            {sendError && <div className="operator-message-dialog__error" role="alert">{sendError}</div>}
            <textarea value={content} onChange={(e) => { setContent(e.target.value); setSendError(''); }} placeholder="Write a message…" aria-label="Message" className="w-full min-h-[100px] rounded-xl border border-transparent surface-1 p-3 text-[15px] outline-none focus:border-primary/30 focus:ring-1 focus:ring-primary/30 transition-all resize-none" autoFocus />
            <Button onClick={handleSend} disabled={!content.trim() || sending} aria-busy={sending} className="w-full rounded-xl py-6 cursor-pointer">{sending ? 'Sending…' : 'Send message'}</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function NewGroupDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [, setLocation] = useLocation();
  const currentUser = useAppStore((s) => s.currentUser);
  const createGroupChat = useAppStore((s) => s.createGroupChat);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<BackendUser[]>([]);
  const [selected, setSelected] = useState<BackendUser[]>([]);
  const [title, setTitle] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return; }
    let active = true;
    const handle = setTimeout(async () => {
      try {
        const users = await api.searchUsers(query.trim());
        if (active) setResults(users.filter((user) => user.id !== currentUser?.id));
      } catch { /* ignore transient search errors */ }
    }, 250);
    return () => { active = false; clearTimeout(handle); };
  }, [query, currentUser?.id]);

  const toggleMember = (user: BackendUser) => {
    setSelected((members) => members.some((member) => member.id === user.id)
      ? members.filter((member) => member.id !== user.id)
      : members.length < 99 ? [...members, user] : members);
  };

  const handleCreate = async () => {
    if (selected.length === 0 || !title.trim() || creating) return;
    setCreating(true);
    try {
      const conversationId = await createGroupChat(selected.map((user) => user.id), title.trim());
      onOpenChange(false);
      setLocation(`/messages/${conversationId}`);
      setSelected([]);
      setTitle('');
      setQuery('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not create the group');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="operator-message-dialog">
        <DialogHeader><DialogTitle>Create a group conversation</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <Input value={title} onChange={(event) => setTitle(event.target.value.slice(0, 120))} placeholder="Group name" className="rounded-xl" autoFocus />
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Add people" value={query} onChange={(event) => setQuery(event.target.value)} className="pl-9 surface-1 border-none rounded-xl" />
          </div>
          {selected.length > 0 && (
            <div className="flex flex-wrap gap-2" aria-label="Selected group members">
              {selected.map((user) => (
                <button type="button" key={user.id} onClick={() => toggleMember(user)} className="flex items-center gap-1.5 rounded-full bg-primary/12 px-2.5 py-1 text-xs font-semibold text-primary">
                  <span>{user.fullName || user.username}</span><X className="h-3 w-3" />
                </button>
              ))}
            </div>
          )}
          <div className="max-h-56 overflow-y-auto space-y-1 thin-scrollbar">
            {results.map((user) => {
              const isSelected = selected.some((member) => member.id === user.id);
              return (
                <button type="button" key={user.id} onClick={() => toggleMember(user)} className={cn('w-full flex items-center gap-3 p-2 rounded-xl text-left transition-colors', isSelected ? 'bg-primary/12' : 'hover:bg-muted/50')}>
                  <Avatar className="w-9 h-9"><AvatarImage src={user.avatarUrl ?? undefined} /><AvatarFallback>{(user.fullName || user.username).charAt(0)}</AvatarFallback></Avatar>
                  <div className="min-w-0"><p className="text-sm font-medium truncate">{user.fullName || user.username}</p><p className="text-xs text-muted-foreground truncate">@{user.username}</p></div>
                  <span className={cn('ml-auto text-xs font-bold', isSelected ? 'text-primary' : 'text-muted-foreground')}>{isSelected ? 'Added' : 'Add'}</span>
                </button>
              );
            })}
            {query.length >= 2 && results.length === 0 && <p className="text-center text-sm text-muted-foreground py-4">No people found.</p>}
          </div>
          <Button onClick={() => void handleCreate()} disabled={selected.length === 0 || !title.trim() || creating} className="w-full rounded-xl py-5">{creating ? 'Creating…' : `Create group · ${selected.length + 1} people`}</Button>
        </div>
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
  entry: { conv: any; user: any; lastMsg?: DirectMessage; unreadCount: number };
  active: boolean;
  isTyping: boolean;
  onSelect: (id: string) => void;
}) {
  const { conv, user, lastMsg, unreadCount } = entry;
  const displayName = user.displayName || user.username || 'User';

  return (
    <button
      onClick={() => onSelect(conv.id)}
      className="operator-conversation-item"
      data-active={active || undefined}
      data-unread={unreadCount > 0 || undefined}
      aria-current={active ? 'page' : undefined}
    >
      <span className="operator-conversation-item__avatar">
      <Avatar>
        <AvatarImage src={user.avatarUrl} />
        <AvatarFallback>{displayName.charAt(0)}</AvatarFallback>
      </Avatar>
      </span>
      <span className="operator-conversation-item__body">
        <span className="operator-conversation-item__head">
          <strong>{displayName}</strong>
          {lastMsg && (
            <time dateTime={lastMsg.createdAt}>
              {formatDistanceToNow(new Date(lastMsg.createdAt))}
            </time>
          )}
        </span>
        <span className="operator-conversation-item__preview" data-typing={isTyping || undefined}>
          {isTyping ? "Typing…" : lastMsg?.content || "No messages yet"}
        </span>
      </span>
      {unreadCount > 0 && <span className="operator-conversation-item__unread" aria-label={`${unreadCount} unread messages`}>{unreadCount > 99 ? '99+' : unreadCount}</span>}
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
  const markDirectMessageSeen = useAppStore((s) => s.markDirectMessageSeen);
  const loadUserProfile = useAppStore((s) => s.loadUserProfile);
  const sendDirectMessage = useAppStore((s) => s.sendDirectMessage);
  const sendMessageToConversation = useAppStore((s) => s.sendMessageToConversation);
  
  const [message, setMessage] = useState('');
  const [imageAttachment, setImageAttachment] = useState('');
  const [showImageInput, setShowImageInput] = useState(false);
  const [newMessageOpen, setNewMessageOpen] = useState(false);
  const [newGroupOpen, setNewGroupOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messageLoadError, setMessageLoadError] = useState('');
  const [pulseSend, setPulseSend] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [replyTarget, setReplyTarget] = useState<ReplyTarget | null>(null);
  const [typingConversationIds, setTypingConversationIds] = useState<Record<string, true>>({});
  
  // Direct Messaging 2.0 Pro Features
  const [callModalOpen, setCallModalOpen] = useState(false);
  const [callType, setCallType] = useState<'video' | 'audio'>('video');
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [tipModalOpen, setTipModalOpen] = useState(false);
  const setConversationVanishMode = useAppStore((s) => s.setConversationVanishMode);
  const editDirectMessage = useAppStore((s) => s.editDirectMessage);
  const deleteDirectMessage = useAppStore((s) => s.deleteDirectMessage);
  const reactToDirectMessage = useAppStore((s) => s.reactToDirectMessage);
  const pinDirectMessage = useAppStore((s) => s.pinDirectMessage);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
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

  const requestConversationMessages = useCallback(async (conversationId: string) => {
    setLoadingMessages(true);
    setMessageLoadError('');
    try {
      await loadConversationMessages(conversationId);
    } catch {
      setMessageLoadError('Could not load this conversation. Your existing messages are safe. Try again.');
    } finally {
      setLoadingMessages(false);
    }
  }, [loadConversationMessages]);

  useEffect(() => {
    if (id) void requestConversationMessages(id);
    else {
      setLoadingMessages(false);
      setMessageLoadError('');
    }
  }, [id, requestConversationMessages]);

  const conversationList = useMemo(() => {
    return conversations
      .map((conv) => {
        const otherIds = conv.participantIds.filter((participantId) => participantId !== currentUser?.id);
        const otherId = otherIds[0] || '';
        if (conv.isGroup) {
          const firstMember = users[otherId];
          const memberCount = conv.participantIds.length || otherIds.length + 1;
          const groupUser = {
            id: conv.id,
            username: `${memberCount} members`,
            displayName: conv.title || `${memberCount} people`,
            avatarUrl: firstMember?.avatarUrl || '',
            followers: 0,
            following: 0,
          };
          const msgs = messagesByConversation[conv.id] || [];
          const lastMsg = msgs[msgs.length - 1];
          const unreadCount = msgs.filter((message) => message.senderId !== currentUser?.id && !message.read).length;
          return { conv, user: groupUser, lastMsg: lastMsg || conv.lastMessage, unreadCount };
        }
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
        const unreadCount = msgs.filter((message) => message.senderId !== currentUser?.id && !message.read).length;
        return { conv, user: otherUser || { id: otherId, username: 'User', displayName: 'User', avatarUrl: '' }, lastMsg: lastMsg || conv.lastMessage, unreadCount };
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

  useEffect(() => {
    if (loadingMessages || messageLoadError || activeMessages.length === 0) return;
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMessages, id, loadingMessages, messageLoadError]);

  const vanishMode = Boolean(activeConv?.conv.vanishMode);

  useEffect(() => {
    if (!id || !currentUser) return;
    activeMessages
      .filter((msg) => msg.senderId !== currentUser.id && !msg.read)
      .forEach((msg) => { void markDirectMessageSeen(msg.id); });
  }, [activeMessages, currentUser?.id, id, markDirectMessageSeen]);

  const isPeerTyping = Boolean(id && typingConversationIds[id]);

  const handleSend = async () => {
    if ((!message.trim() && !imageAttachment.trim()) || !activeConv || sending) return;
    
    const baseMessage = imageAttachment.trim() 
      ? `${message.trim()}\n📷 ${imageAttachment.trim()}`
      : message.trim();

    setSending(true);
    setSendError('');
    setPulseSend(true);
    sounds.playPop();

    try {
      if (activeConv.conv.isGroup) await sendMessageToConversation(activeConv.conv.id, baseMessage, replyTarget?.messageId);
      else await sendDirectMessage(activeConv.user.id, baseMessage, replyTarget?.messageId);
      setMessage('');
      setImageAttachment('');
      setShowImageInput(false);
      setReplyTarget(null);
      stopTyping();
      if (inputRef.current) inputRef.current.style.height = 'auto';
    } catch {
      setSendError('Could not send this message. Your draft is still here.');
      toast.error('Message not sent. Your draft is still here.');
    } finally {
      setSending(false);
      setTimeout(() => setPulseSend(false), 300);
    }
  };

  const handleSendVoiceNote = async (audioUrl: string, durationSeconds: number) => {
    if (!activeConv) return;
    try {
      const content = `[Voice Note] ${audioUrl} (${durationSeconds}s)`;
      if (activeConv.conv.isGroup) await sendMessageToConversation(activeConv.conv.id, content);
      else await sendDirectMessage(activeConv.user.id, content);
      setShowVoiceRecorder(false);
      toast.success('Voice note sent! 🎙️');
    } catch {
      toast.error('Failed to send voice note');
    }
  };

  const handleEditMessage = async () => {
    if (!editingMessageId || !editingText.trim()) return;
    try {
      await editDirectMessage(editingMessageId, editingText.trim());
      setEditingMessageId(null);
      setEditingText('');
      toast.success('Message edited');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not edit this message');
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await deleteDirectMessage(messageId);
      toast.success('Message deleted');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not delete this message');
    }
  };

  const handleReactMessage = async (messageId: string) => {
    try {
      await reactToDirectMessage(messageId, '❤️');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not react to this message');
    }
  };

  const handlePinMessage = async (messageId: string) => {
    try {
      await pinDirectMessage(messageId);
      toast.success('Message pinned');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not pin this message');
    }
  };

  return (
    <div className="messages-page operator-messages-page">
      <div className="operator-messages-shell">
        
        <aside className={cn(
          'operator-inbox',
          id ? 'operator-inbox--mobile-hidden' : 'operator-inbox--mobile-visible'
        )}>
          <header className="operator-inbox__header">
            <div className="operator-inbox__title-row">
              <div>
                <SignalLabel>Inbox // realtime</SignalLabel>
                <h1>Messages</h1>
              </div>
              <div className="operator-inbox__actions">
                <Button size="icon" variant="outline" onClick={() => setNewGroupOpen(true)} aria-label="Create a group chat" title="Create a group chat">
                  <UsersRound aria-hidden="true" />
                </Button>
                <Button size="icon" onClick={() => setNewMessageOpen(true)} aria-label="Start a new conversation" title="Start a new conversation">
                  <Plus aria-hidden="true" />
                </Button>
              </div>
            </div>

            <div className="operator-inbox-search">
              <Search aria-hidden="true" />
              <Input 
                placeholder="Search conversations" 
                aria-label="Search conversations"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="operator-inbox__summary"><span>{conversationList.length} conversations</span><StatusBadge status="online">Connected</StatusBadge></div>
          </header>
          
          <div className="operator-inbox__list">
            {conversationList.length === 0 ? (
              <div className="operator-inbox__empty">
                <Inbox aria-hidden="true" />
                <h2>{searchQuery ? 'No matching conversations' : 'Your inbox is clear'}</h2>
                <p>{searchQuery ? 'Try a shorter name or username.' : 'Start a private conversation with someone in your network.'}</p>
                {!searchQuery && <button type="button" onClick={() => setNewMessageOpen(true)}>Start a conversation</button>}
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
        </aside>

        <section className={cn('operator-thread', id ? 'operator-thread--mobile-visible' : 'operator-thread--mobile-hidden')}>
          {activeConv ? (
            <>
              <header className="operator-thread__header">
                <div className="operator-thread__identity">
                  <Button variant="ghost" size="icon" className="operator-thread__back" onClick={() => setLocation('/messages')} aria-label="Back to conversations">
                    <ArrowLeft aria-hidden="true" />
                  </Button>
                  <div className="operator-thread__avatar">
                    <Avatar>
                      <AvatarImage src={activeConv.user.avatarUrl} />
                      <AvatarFallback>{activeConv.user.displayName.charAt(0)}</AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="operator-thread__identity-copy">
                    <h2>{activeConv.user.displayName}</h2>
                    <span data-typing={isPeerTyping || undefined}>
                      {isPeerTyping ? 'Typing…' : activeConv.conv.isGroup ? activeConv.user.username : `@${activeConv.user.username}`}
                    </span>
                  </div>
                </div>

                <div className="operator-thread__actions">
                  {publicBetaConfig.rtcCallsEnabled && !activeConv.conv.isGroup && <>
                    <Button variant="ghost" size="icon" onClick={() => { setCallType('audio'); setCallModalOpen(true); }} title="Voice Call" aria-label="Start voice call">
                      <Phone aria-hidden="true" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => { setCallType('video'); setCallModalOpen(true); }} title="Start video call" aria-label="Start video call">
                      <Video aria-hidden="true" />
                    </Button>
                  </>}
                  <details className="operator-thread-menu">
                    <summary aria-label="More conversation options"><MoreVertical aria-hidden="true" /></summary>
                    <div className="operator-thread-menu__content">
                      <button type="button" data-active={vanishMode || undefined} onClick={() => {
                        const enabled = !Boolean(activeConv.conv.vanishMode);
                        void setConversationVanishMode(activeConv.conv.id, enabled).then(() => {
                          toast.info(enabled ? 'Vanish mode active — messages disappear when read' : 'Vanish mode turned off');
                        }).catch(() => undefined);
                      }}><EyeOff aria-hidden="true" /><span><strong>Vanish mode</strong><small>{vanishMode ? 'On' : 'Off'}</small></span></button>
                      {!activeConv.conv.isGroup && <>
                        <button type="button" onClick={() => setTipModalOpen(true)}><Zap aria-hidden="true" /><span><strong>Tip creator</strong><small>Open UPI tip jar</small></span></button>
                        <SteamTradeModal
                          partnerName={activeConv.user.displayName}
                          partnerAvatar={activeConv.user.avatarUrl}
                          trigger={<button type="button"><ArrowLeftRight aria-hidden="true" /><span><strong>Gear trade</strong><small>Prepare a trade draft</small></span></button>}
                        />
                      </>}
                    </div>
                  </details>
                </div>
              </header>

              <div className="operator-thread__flow" data-vanish={vanishMode || undefined}>
                {loadingMessages ? (
                  <div className="operator-thread__loading" role="status" aria-live="polite">
                    <span className="operator-thread__loading-mark"><LoaderCircle aria-hidden="true" /></span>
                    <p>Loading secure conversation…</p>
                  </div>
                ) : messageLoadError ? (
                  <div className="operator-thread__error" role="alert">
                    <LockKeyhole aria-hidden="true" />
                    <p>{messageLoadError}</p>
                    <button type="button" onClick={() => void requestConversationMessages(activeConv.conv.id)} disabled={loadingMessages}>Try again</button>
                  </div>
                ) : activeMessages.length === 0 && (
                  <div className="operator-thread__empty">
                    <div>
                      <LockKeyhole aria-hidden="true" />
                      <h3>Private channel ready</h3>
                      <p>Send the first message to {activeConv.user.displayName}. Your calls and message tools stay in this channel.</p>
                    </div>
                  </div>
                )}

                <div className="operator-thread__messages">
                  {activeMessages.map((msg, index) => {
                    const isMine = msg.senderId === currentUser?.id;
                    const senderName = isMine ? 'You' : users[msg.senderId]?.displayName || activeConv.user.displayName;
                    const reactionCount = Object.values(msg.reactions ?? {}).reduce((count, users) => count + users.length, 0);
                    const previousMessage = activeMessages[index - 1];
                    const showDate = !previousMessage || !isSameDay(new Date(previousMessage.createdAt), new Date(msg.createdAt));
                    const repliedMessage = msg.replyToId ? activeMessages.find((candidate) => candidate.id === msg.replyToId) : null;
                    const replyPreview = repliedMessage ? {
                      senderName: repliedMessage.senderId === currentUser?.id ? 'You' : users[repliedMessage.senderId]?.displayName || activeConv.user.displayName,
                      excerpt: (parseReply(repliedMessage.content)?.body || repliedMessage.content).replace(/\s+/g, ' ').slice(0, 96),
                    } : null;

                    return (
                      <React.Fragment key={msg.id}>
                        {showDate && (
                          <div className="operator-message-date" role="separator" aria-label={format(new Date(msg.createdAt), 'MMMM d, yyyy')}>
                            <span>{format(new Date(msg.createdAt), 'EEE, MMM d')}</span>
                          </div>
                        )}
                        <article className="operator-message" data-mine={isMine || undefined}>
                          <div className="operator-message__actions">
                            <button type="button" onClick={() => setReplyTarget({
                              messageId: msg.id,
                              senderName,
                              excerpt: (parseReply(msg.content)?.body || msg.content).replace(/\s+/g, ' ').slice(0, 96),
                            })} title="Reply" aria-label="Reply to message"><Reply aria-hidden="true" /></button>
                            <button type="button" onClick={() => void handleReactMessage(msg.id)} title="React with heart" aria-label="React to message"><Smile aria-hidden="true" /></button>
                            <button type="button" onClick={() => void handlePinMessage(msg.id)} data-active={msg.pinned || undefined} title={msg.pinned ? 'Pinned' : 'Pin message'} aria-label={msg.pinned ? 'Message pinned' : 'Pin message'}><Pin aria-hidden="true" /></button>
                            {isMine && <button type="button" onClick={() => { setEditingMessageId(msg.id); setEditingText(msg.content); }} title="Edit message" aria-label="Edit message"><Pencil aria-hidden="true" /></button>}
                            {isMine && <button type="button" onClick={() => void handleDeleteMessage(msg.id)} data-destructive="true" title="Delete message" aria-label="Delete message"><Trash2 aria-hidden="true" /></button>}
                          </div>
                          <div className="operator-message__bubble">
                            {editingMessageId === msg.id ? (
                              <div className="operator-message__edit">
                                <Input value={editingText} maxLength={MAX_MESSAGE_LENGTH} onChange={(event) => setEditingText(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void handleEditMessage(); if (event.key === 'Escape') setEditingMessageId(null); }} autoFocus aria-label="Edit message" />
                                <button type="button" onClick={() => void handleEditMessage()}>Save</button>
                              </div>
                            ) : (
                              <MessageContent content={msg.content} isMine={isMine} reply={replyPreview} />
                            )}
                            <time dateTime={msg.createdAt}>{format(new Date(msg.createdAt), 'h:mm a')}{msg.editedAt ? ' · edited' : ''}</time>
                          </div>
                          {(reactionCount > 0 || msg.pinned) && <div className="operator-message__meta"><span>{reactionCount > 0 ? `❤️ ${reactionCount}` : ''}</span>{msg.pinned && <span><Pin aria-hidden="true" /> Pinned</span>}</div>}
                        </article>
                      </React.Fragment>
                    );
                  })}
                  {isPeerTyping && <TypingIndicator name={activeConv.user.displayName} />}
                  <div ref={scrollRef} className="h-1" />
                </div>
              </div>

              <footer className="operator-composer" data-vanish={vanishMode || undefined}>
                {showVoiceRecorder ? (
                  <VoiceNoteRecorder
                    onSendVoiceNote={handleSendVoiceNote}
                    onCancel={() => setShowVoiceRecorder(false)}
                  />
                ) : (
                  <div className="operator-composer__stack">
                    {replyTarget && (
                      <div className="operator-composer-reply">
                        <Reply aria-hidden="true" />
                        <span><strong>Replying to {replyTarget.senderName}</strong><small>{replyTarget.excerpt}</small></span>
                        <button type="button" onClick={() => setReplyTarget(null)} aria-label="Cancel reply"><X aria-hidden="true" /></button>
                      </div>
                    )}
                    {showImageInput && (
                      <div className="operator-composer-attachment">
                        <div>
                          <Input
                            value={imageAttachment}
                            onChange={(e) => { setImageAttachment(e.target.value); setSendError(''); }}
                            placeholder="Paste a direct image URL"
                            aria-label="Image URL"
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => { setShowImageInput(false); setImageAttachment(''); }}
                            aria-label="Close image attachment"
                          >
                            <X aria-hidden="true" />
                          </Button>
                        </div>
                        {imageAttachment.trim() && (
                          <div className="operator-composer-attachment__preview">
                            <img src={imageAttachment} alt="Attachment preview" />
                          </div>
                        )}
                      </div>
                    )}
                    <div className="operator-composer__controls">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setShowVoiceRecorder(true)}
                        title="Record Voice Note"
                        aria-label="Record voice note"
                      >
                        <Mic aria-hidden="true" />
                      </Button>

                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setShowImageInput(prev => !prev)}
                        data-active={showImageInput || undefined}
                        title="Send Image"
                        aria-label="Add image attachment"
                      >
                        <ImageIcon aria-hidden="true" />
                      </Button>

                      <textarea
                        ref={inputRef}
                        value={message}
                        rows={1}
                        maxLength={MAX_MESSAGE_LENGTH}
                        onChange={(e) => {
                          setMessage(e.target.value);
                          setSendError('');
                          signalTyping(id);
                        }}
                        onInput={(event) => {
                          event.currentTarget.style.height = 'auto';
                          event.currentTarget.style.height = `${Math.min(event.currentTarget.scrollHeight, 120)}px`;
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            void handleSend();
                          }
                        }}
                        placeholder="Write a direct message…"
                        aria-label="Message"
                        aria-describedby={sendError ? 'operator-composer-error' : undefined}
                      />

                      <Button
                        size="icon"
                        disabled={(!message.trim() && !imageAttachment.trim()) || sending}
                        aria-busy={sending}
                        onClick={handleSend}
                        className="operator-composer__send"
                        data-pulse={pulseSend || undefined}
                        aria-label="Send message"
                      >
                        <SendHorizontal aria-hidden="true" />
                      </Button>
                    </div>
                    {sendError && (
                      <div id="operator-composer-error" className="operator-composer-error" role="alert">
                        <span>{sendError}</span>
                        <button type="button" onClick={() => void handleSend()} disabled={sending}>Retry</button>
                      </div>
                    )}
                    <div className="operator-composer__hint">
                      <span>{vanishMode ? 'Vanish mode is on' : 'Enter to send · Shift + Enter for a new line'}</span>
                      {message.length > MAX_MESSAGE_LENGTH * 0.8 && <span>{message.length}/{MAX_MESSAGE_LENGTH}</span>}
                    </div>
                  </div>
                )}
              </footer>

              {/* WebRTC Video Call Modal */}
              {publicBetaConfig.rtcCallsEnabled && <WebRtcCallModal
                isOpen={callModalOpen}
                onClose={() => setCallModalOpen(false)}
                peerUser={{
                  id: activeConv.user.id,
                  displayName: activeConv.user.displayName,
                  username: activeConv.user.username,
                  avatarUrl: activeConv.user.avatarUrl,
                }}
                callType={callType}
              />}

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
            <div className="operator-thread-placeholder">
              <span><LockKeyhole aria-hidden="true" /></span>
              <SignalLabel tone="muted">Private operator channel</SignalLabel>
              <h2>Select a conversation</h2>
              <p>Message your network, send voice notes, {publicBetaConfig.rtcCallsEnabled ? 'make direct calls, ' : ''}tip creators, and prepare trade drafts from one focused workspace.</p>
              <button type="button" onClick={() => setNewMessageOpen(true)}><Plus aria-hidden="true" />Start a conversation</button>
              <small>Private messaging // {publicBetaConfig.rtcCallsEnabled ? 'call ready' : 'calling paused'} // live presence</small>
            </div>
          )}
        </section>

        <NewMessageDialog open={newMessageOpen} onOpenChange={setNewMessageOpen} />
        <NewGroupDialog open={newGroupOpen} onOpenChange={setNewGroupOpen} />
      </div>
    </div>
  );
}
