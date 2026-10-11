import * as React from 'react';
import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useAppStore, type Message as DirectMessage, type MessageDraft } from '@/lib/store';
import { api, type BackendUser, type UploadedMedia } from '@/lib/api-client';
import { useParams, useLocation } from 'wouter';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Search, Plus, UsersRound, MoreVertical, SendHorizontal, ArrowLeft, LoaderCircle,
  Reply, X, Video, Phone, Mic, Zap, EyeOff, Image as ImageIcon, Pencil, Trash2, Pin, Smile,
  ArrowLeftRight, LockKeyhole, Inbox, Eye
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getSocket } from '@/lib/socket-client';
import { hasUnreadConversation, isUnreadMessage } from '@/lib/message-state';
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
import { uploadApprovedMedia } from '@/lib/media-upload';
import { MediaImageField } from '@/components/media/MediaImageField';
import { publicBetaConfig } from '@/lib/public-beta-config';
import { MessageAttachment } from '@/components/messages/MessageAttachment';

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

function MessageContent({ content, isMine, textStyleId = 'default', reply: structuredReply, attachment }: { content: string; isMine: boolean; textStyleId?: DirectMessage['textStyleId']; reply?: ReplyPreview | null; attachment?: DirectMessage }) {
  const legacyReply = parseReply(content);
  const reply = structuredReply ?? legacyReply;
  const body = legacyReply?.body ?? content;
  const imageMatch = attachment?.mediaLegacy ? body.match(/(?:^|\n)📷\s+(https?:\/\/\S+)\s*$/) : null;
  const imageUrl = attachment?.mediaType === 'image' ? attachment.mediaUrl : imageMatch?.[1];
  const textBody = imageMatch ? body.slice(0, imageMatch.index).trim() : body;
  const textStyle = textStyleId === 'mono'
    ? { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' }
    : textStyleId === 'rounded'
      ? { fontFamily: 'ui-rounded, "Arial Rounded MT Bold", system-ui, sans-serif' }
      : undefined;

  const replyMarkup = reply ? (
    <div className="operator-message-reply" data-mine={isMine || undefined}>
      <Reply aria-hidden="true" />
      <div>
        <strong>Replying to {reply.senderName}</strong>
        <span>{reply.excerpt}</span>
      </div>
    </div>
  ) : null;

  if (attachment?.mediaId && attachment.mediaLegacy !== true && (attachment.mediaType === 'audio' || attachment.mediaType === 'image')) {
    return <>
      {replyMarkup}
      {textBody && <span className="operator-message-text" style={textStyle}>{textBody}</span>}
      <MessageAttachment message={attachment} />
    </>;
  }

  if (attachment?.mediaType === 'audio' || (attachment?.mediaLegacy && body.startsWith('[Voice Note]'))) {
    const audioUrlMatch = body.match(/\[Voice Note\]\s*(https?:\/\/[^\s]+|\S+)/);
    const audioUrl = attachment?.mediaType === 'audio' ? attachment.mediaUrl : audioUrlMatch?.[1];
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
      {textBody && <span className="operator-message-text" style={textStyle}>{textBody}</span>}
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
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [searchAttempt, setSearchAttempt] = useState(0);
  const [selected, setSelected] = useState<BackendUser | null>(null);
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);
  const [sendError, setSendError] = useState('');

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setResults([]);
      setSearchLoading(false);
      setSearchError('');
      return;
    }
    let active = true;
    setResults([]);
    setSearchLoading(true);
    setSearchError('');
    const handle = setTimeout(async () => {
      try {
        const users = await api.searchUsers(term);
        if (active) setResults(users.filter((u) => u.id !== currentUser?.id));
      } catch {
        if (active) setSearchError('People could not load. Check your connection and retry.');
      } finally {
        if (active) setSearchLoading(false);
      }
    }, 250);
    return () => { active = false; clearTimeout(handle); };
  }, [query, currentUser?.id, searchAttempt]);

  const handleSend = async () => {
    if (!selected || !content.trim() || sendingRef.current) return;
    sendingRef.current = true;
    setSending(true);
    setSendError('');
    try {
      await sendDirectMessage(selected.id, content.trim());
      onOpenChange(false);
      setSelected(null);
      setContent('');
      setQuery('');
      const conv = useAppStore.getState().conversations.find((c) => !c.isGroup && c.participantIds.length === 2 && c.participantIds.includes(selected.id));
      if (conv) setLocation(`/messages/${conv.id}`);
    } catch (err) {
      setSendError('Could not send this message. Your draft is still here.');
    }
    sendingRef.current = false;
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
                <button type="button" key={u.id} onClick={() => setSelected(u)} className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-muted/50 text-left transition-colors cursor-pointer">
                  <Avatar className="w-9 h-9"><AvatarImage src={u.avatarUrl ?? undefined} /><AvatarFallback>{(u.fullName || u.username).charAt(0)}</AvatarFallback></Avatar>
                  <div><p className="text-sm font-medium">{u.fullName || u.username}</p><p className="text-xs text-muted-foreground">@{u.username}</p></div>
                </button>
              ))}
              {searchLoading && <p role="status" className="text-center text-sm text-muted-foreground py-4">Searching people…</p>}
              {searchError && (
                <div role="alert" className="text-center text-sm text-muted-foreground py-4">
                  <p>{searchError}</p>
                  <button type="button" onClick={() => setSearchAttempt((attempt) => attempt + 1)}>Retry people search</button>
                </div>
              )}
              {query.trim().length >= 2 && !searchLoading && !searchError && results.length === 0 && (
                <p role="status" className="text-center text-sm text-muted-foreground py-4">No users found.</p>
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
              <button disabled={sending} onClick={() => setSelected(null)} className="text-xs text-primary font-medium hover:underline px-2 cursor-pointer">Change</button>
            </div>
            {sendError && <div className="operator-message-dialog__error" role="alert">{sendError}</div>}
            <textarea value={content} disabled={sending} maxLength={MAX_MESSAGE_LENGTH} onChange={(e) => { setContent(e.target.value); setSendError(''); }} placeholder="Write a message…" aria-label="Message" className="w-full min-h-[100px] rounded-xl border border-transparent surface-1 p-3 text-[15px] outline-none focus:border-primary/30 focus:ring-1 focus:ring-primary/30 transition-all resize-none" autoFocus />
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
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [searchAttempt, setSearchAttempt] = useState(0);
  const [selected, setSelected] = useState<BackendUser[]>([]);
  const [title, setTitle] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setResults([]);
      setSearchLoading(false);
      setSearchError('');
      return;
    }
    let active = true;
    setResults([]);
    setSearchLoading(true);
    setSearchError('');
    const handle = setTimeout(async () => {
      try {
        const users = await api.searchUsers(term);
        if (active) setResults(users.filter((user) => user.id !== currentUser?.id));
      } catch {
        if (active) setSearchError('Group members could not load. Check your connection and retry.');
      } finally {
        if (active) setSearchLoading(false);
      }
    }, 250);
    return () => { active = false; clearTimeout(handle); };
  }, [query, currentUser?.id, searchAttempt]);

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
            <Input placeholder="Add people" aria-label="Search people to add" value={query} onChange={(event) => setQuery(event.target.value)} className="pl-9 surface-1 border-none rounded-xl" />
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
            {searchLoading && <p role="status" className="text-center text-sm text-muted-foreground py-4">Searching people…</p>}
            {searchError && (
              <div role="alert" className="text-center text-sm text-muted-foreground py-4">
                <p>{searchError}</p>
                <button type="button" onClick={() => setSearchAttempt((attempt) => attempt + 1)}>Retry member search</button>
              </div>
            )}
            {query.trim().length >= 2 && !searchLoading && !searchError && results.length === 0 && <p role="status" className="text-center text-sm text-muted-foreground py-4">No people found.</p>}
          </div>
          <Button onClick={() => void handleCreate()} disabled={selected.length === 0 || !title.trim() || creating} className="w-full rounded-xl py-5">{creating ? 'Creating…' : `Create group · ${selected.length + 1} people`}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MessagePreviewDialog({
  message,
  senderName,
  open,
  onOpenChange,
}: {
  message: DirectMessage | null;
  senderName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="operator-message-dialog">
        <DialogHeader><DialogTitle>Preview from {senderName}</DialogTitle></DialogHeader>
        {message ? (
          <div className="space-y-3">
            <div className="operator-message-preview-card">
              <MessageContent attachment={message} content={message.content} isMine={false} textStyleId={message.textStyleId} />
              <time dateTime={message.createdAt}>{format(new Date(message.createdAt), 'MMM d, h:mm a')}</time>
            </div>
            <p className="flex items-center gap-2 text-xs leading-relaxed text-muted-foreground">
              <Eye aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-primary" />
              Preview only — opening this sheet does not send a read receipt.
            </p>
          </div>
        ) : <p role="status" className="text-sm text-muted-foreground">Loading preview…</p>}
      </DialogContent>
    </Dialog>
  );
}

function ConversationItem({
  entry,
  active,
  isTyping,
  onSelect,
  onPreview,
}: {
  entry: { conv: any; user: any; lastMsg?: DirectMessage; previewMessage?: DirectMessage; unreadCount: number };
  active: boolean;
  isTyping: boolean;
  onSelect: (id: string) => void;
  onPreview: (message: DirectMessage) => void;
}) {
  const { conv, user, lastMsg, previewMessage, unreadCount } = entry;
  const displayName = user.displayName || user.username || 'User';

  return (
    <div
      className="operator-conversation-item"
      data-active={active || undefined}
      data-unread={unreadCount > 0 || undefined}
    >
      <button type="button" onClick={() => onSelect(conv.id)} className="operator-conversation-item__select" aria-current={active ? 'page' : undefined}>
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
            {isTyping ? "Typing…" : lastMsg?.content || (lastMsg?.mediaType === 'audio' ? 'Voice note' : lastMsg?.mediaType === 'image' ? 'Image' : 'No messages yet')}
          </span>
        </span>
        {unreadCount > 0 && <span className="operator-conversation-item__unread" aria-label={`${unreadCount} unread messages`}>{unreadCount > 99 ? '99+' : unreadCount}</span>}
      </button>
      {previewMessage && (
        <button type="button" className="operator-conversation-item__preview-action" onClick={() => onPreview(previewMessage)} aria-label={`Preview unread message from ${displayName}`} title="Preview unread message without marking read">
          <Eye aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

export default function Messages() {
  const { id } = useParams<{ id?: string }>();
  const [, setLocation] = useLocation();
  const users = useAppStore((s) => s.users);
  const currentUser = useAppStore((s) => s.currentUser);
  const conversations = useAppStore((s) => s.conversations);
  const conversationsLoading = useAppStore((s) => s.conversationsLoading);
  const conversationsError = useAppStore((s) => s.conversationsError);
  const messagesByConversation = useAppStore((s) => s.messagesByConversation);
  const loadConversations = useAppStore((s) => s.loadConversations);
  const loadConversationMessages = useAppStore((s) => s.loadConversationMessages);
  const previewDirectMessage = useAppStore((s) => s.previewDirectMessage);
  const loadOlderConversationMessages = useAppStore((s) => s.loadOlderConversationMessages);
  const syncConversationMessages = useAppStore((s) => s.syncConversationMessages);
  const markDirectMessageSeen = useAppStore((s) => s.markDirectMessageSeen);
  const loadUserProfile = useAppStore((s) => s.loadUserProfile);
  const sendDirectMessage = useAppStore((s) => s.sendDirectMessage);
  const sendMessageToConversation = useAppStore((s) => s.sendMessageToConversation);
  
  const draft = useAppStore((state) => state.messageDrafts[id ?? '']);
  const updateMessageDraft = useAppStore((state) => state.updateMessageDraft);
  const message = draft?.message ?? '';
  const textStyleId = draft?.textStyleId ?? (currentUser?.messageFontId === 'mono' || currentUser?.messageFontId === 'rounded' ? currentUser.messageFontId : 'default');
  const imageFiles = draft?.imageFiles ?? [];
  const replyTarget = draft?.replyTarget ?? null;
  const updateDraft = useCallback((patch: Partial<MessageDraft>) => {
    if (!id || !currentUser || useAppStore.getState().currentUser?.id !== currentUser.id) return;
    updateMessageDraft(id, patch);
  }, [id, currentUser?.id, updateMessageDraft]);
  const setMessage = (value: string) => updateDraft({ message: value });
  const setTextStyleId = (value: DirectMessage['textStyleId']) => updateDraft({ textStyleId: value ?? 'default' });
  const setImageFiles = (files: File[]) => updateDraft({ imageFiles: files, imageAttachment: '' });
  const setReplyTarget = (value: ReplyTarget | null) => updateDraft({ replyTarget: value });
  const [showImageInput, setShowImageInput] = useState(false);
  const [newMessageOpen, setNewMessageOpen] = useState(false);
  const [newGroupOpen, setNewGroupOpen] = useState(false);
  const sending = Boolean(draft?.sending);
  const setSending = (value: boolean) => updateDraft({ sending: value });
  const sendingRef = useRef(false);
  const [sendError, setSendError] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messageLoadError, setMessageLoadError] = useState('');
  const [messageFontEnabled, setMessageFontEnabled] = useState(false);
  const [pulseSend, setPulseSend] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [realtimeConnected, setRealtimeConnected] = useState(() => Boolean(getSocket()?.connected));
  const [online, setOnline] = useState(() => navigator.onLine);
  const [typingConversationIds, setTypingConversationIds] = useState<Record<string, true>>({});
  const [previewMessage, setPreviewMessage] = useState<DirectMessage | null>(null);
  const [previewSenderName, setPreviewSenderName] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [peerOnline, setPeerOnline] = useState(false);
  const [hasOlderMessages, setHasOlderMessages] = useState<boolean | null>(null);
  
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
  const threadFlowRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingStopTimeoutRef = useRef<number | null>(null);
  const typingConversationIdRef = useRef<string | null>(null);
  const remoteTypingTimers = useRef(new Map<string, number>());
  const messageRequestSequence = useRef(0);
  const requestedProfiles = useRef(new Set<string>());

  useEffect(() => {
    let active = true;
    if (!currentUser) {
      setMessageFontEnabled(false);
      return () => { active = false; };
    }
    void api.getPremiumProfileOptions().then((result) => {
      if (active) setMessageFontEnabled(result.enabledFeatures.MESSAGE_FONT === true);
    }).catch(() => {
      if (active) setMessageFontEnabled(false);
    });
    return () => { active = false; };
  }, [currentUser?.id]);

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
    const socket = getSocket();
    const update = () => {
      setRealtimeConnected(Boolean(socket?.connected));
      setOnline(navigator.onLine);
      if (socket?.connected && id) {
        void syncConversationMessages(id).catch(() => {
          toast.error('Realtime restored. This conversation could not finish syncing yet.');
        });
      }
    };
    update();
    socket?.on('connect', update);
    socket?.on('disconnect', update);
    socket?.on('connect_error', update);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      socket?.off('connect', update);
      socket?.off('disconnect', update);
      socket?.off('connect_error', update);
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, [currentUser?.id, id, syncConversationMessages]);

  const requestConversationMessages = useCallback(async (conversationId: string) => {
    const sequence = ++messageRequestSequence.current;
    setLoadingMessages(true);
    setMessageLoadError('');
    try {
      await loadConversationMessages(conversationId);
    } catch {
      if (sequence === messageRequestSequence.current) setMessageLoadError('Could not load this conversation. Your existing messages are safe. Try again.');
    } finally {
      if (sequence === messageRequestSequence.current) setLoadingMessages(false);
    }
  }, [loadConversationMessages]);

  useEffect(() => {
    if (id) void requestConversationMessages(id);
    else {
      setLoadingMessages(false);
      setMessageLoadError('');
    }
    return () => { messageRequestSequence.current++; };
  }, [id, requestConversationMessages]);

  useEffect(() => {
    for (const userId of new Set(conversations.flatMap((conversation) => conversation.participantIds))) {
      if (userId !== currentUser?.id && !users[userId] && !requestedProfiles.current.has(userId)) {
        requestedProfiles.current.add(userId);
        void loadUserProfile(userId);
      }
    }
  }, [conversations, users, currentUser?.id, loadUserProfile]);

  const allConversations = useMemo(() => {
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
          const unreadCount = Math.max(msgs.filter((message) => isUnreadMessage(message, currentUser?.id)).length, Number(hasUnreadConversation(conv, currentUser?.id)));
          const previewMessage = [...msgs].reverse().find((message) => isUnreadMessage(message, currentUser?.id))
            || (isUnreadMessage(conv.lastMessage, currentUser?.id) ? conv.lastMessage : undefined);
          return { conv, user: groupUser, lastMsg: lastMsg || conv.lastMessage, previewMessage, unreadCount };
        }
        let otherUser = users[otherId];
        if (!otherUser && otherId) {
          otherUser = {
            id: otherId,
            username: 'User',
            displayName: 'User',
            avatarUrl: '',
            followers: 0,
            following: 0,
          };
        }
        const msgs = messagesByConversation[conv.id] || [];
        const lastMsg = msgs[msgs.length - 1];
        const unreadCount = Math.max(msgs.filter((message) => isUnreadMessage(message, currentUser?.id)).length, Number(hasUnreadConversation(conv, currentUser?.id)));
        const previewMessage = [...msgs].reverse().find((message) => isUnreadMessage(message, currentUser?.id))
          || (isUnreadMessage(conv.lastMessage, currentUser?.id) ? conv.lastMessage : undefined);
        return { conv, user: otherUser || { id: otherId, username: 'User', displayName: 'User', avatarUrl: '' }, lastMsg: lastMsg || conv.lastMessage, previewMessage, unreadCount };
      })
      .sort((a, b) => (b.lastMsg?.createdAt ?? b.conv.updatedAt).localeCompare(a.lastMsg?.createdAt ?? a.conv.updatedAt));
  }, [conversations, users, currentUser?.id, messagesByConversation]);

  const conversationList = useMemo(() => allConversations.filter((entry) =>
    entry.user.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entry.user.username.toLowerCase().includes(searchQuery.toLowerCase()),
  ), [allConversations, searchQuery]);

  const activeConv = useMemo(() => {
    if (!id) return null;
    return allConversations.find((c) => c.conv.id === id) || null;
  }, [id, allConversations]);

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

  useEffect(() => {
    setHasOlderMessages(null);
    setPeerOnline(false);
  }, [id]);

  useEffect(() => {
    if (!id || !activeConv) return;
    const socket = getSocket();
    if (!socket) return;

    const onTypingStart = (payload: { userId?: unknown; conversationId?: unknown }) => {
      if (payload.userId === currentUser?.id || payload.conversationId !== id) return;
      setTypingConversationIds((current) => ({ ...current, [id]: true }));
      const existing = remoteTypingTimers.current.get(id);
      if (existing !== undefined) window.clearTimeout(existing);
      remoteTypingTimers.current.set(id, window.setTimeout(() => {
        setTypingConversationIds((current) => {
          const next = { ...current };
          delete next[id];
          return next;
        });
        remoteTypingTimers.current.delete(id);
      }, 5000));
    };
    const onTypingEnd = (payload: { userId?: unknown; conversationId?: unknown }) => {
      if (payload.userId === currentUser?.id || payload.conversationId !== id) return;
      const existing = remoteTypingTimers.current.get(id);
      if (existing !== undefined) window.clearTimeout(existing);
      remoteTypingTimers.current.delete(id);
      setTypingConversationIds((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
    };
    const onPresence = (payload: { userId?: unknown; online?: unknown }) => {
      if (typeof payload.userId !== 'string' || payload.userId === currentUser?.id) return;
      if (!activeConv.conv.participantIds.includes(payload.userId)) return;
      if (!activeConv.conv.isGroup && payload.userId === activeConv.user.id) setPeerOnline(payload.online === true);
    };
    socket.on('typing:start', onTypingStart);
    socket.on('typing:end', onTypingEnd);
    socket.on('presence:update', onPresence);
    socket.emit('conversation:join', { conversationId: id });
    return () => {
      socket.off('typing:start', onTypingStart);
      socket.off('typing:end', onTypingEnd);
      socket.off('presence:update', onPresence);
      const existing = remoteTypingTimers.current.get(id);
      if (existing !== undefined) window.clearTimeout(existing);
      remoteTypingTimers.current.delete(id);
    };
  }, [id, activeConv?.user.id, activeConv?.conv.isGroup, activeConv?.conv.participantIds, currentUser?.id]);

  const handleSend = async () => {
    if ((!message.trim() && imageFiles.length === 0) || !activeConv || sending || sendingRef.current) return;
    
    const baseMessage = message.trim();

    if (baseMessage.length > MAX_MESSAGE_LENGTH) {
      setSendError('The message must be 4,000 characters or fewer.');
      return;
    }
    sendingRef.current = true;
    setSending(true);
    setSendError('');
    setPulseSend(true);
    sounds.playPop();

    try {
      const approved = imageFiles[0] ? await uploadApprovedMedia(imageFiles[0], 'message') : undefined;
      const attachment = approved ? { mediaId: approved.mediaId } : undefined;
      if (activeConv.conv.isGroup) await sendMessageToConversation(activeConv.conv.id, baseMessage, replyTarget?.messageId, textStyleId, attachment);
      else await sendDirectMessage(activeConv.user.id, baseMessage, replyTarget?.messageId, textStyleId, attachment);
      setMessage('');
      setImageFiles([]);
      setShowImageInput(false);
      setReplyTarget(null);
      stopTyping();
      if (inputRef.current) inputRef.current.style.height = 'auto';
    } catch {
      setSendError('Could not send this message. Your draft is still here.');
    } finally {
      sendingRef.current = false;
      setSending(false);
      setTimeout(() => setPulseSend(false), 300);
    }
  };

  const handleSendVoiceNote = async (media: UploadedMedia, _durationSeconds: number) => {
    if (!activeConv) throw new Error('Open a conversation to send this voice note.');
    if (activeConv.conv.isGroup) await sendMessageToConversation(activeConv.conv.id, '', undefined, textStyleId, { mediaId: media.mediaId });
    else await sendDirectMessage(activeConv.user.id, '', undefined, textStyleId, { mediaId: media.mediaId });
    setShowVoiceRecorder(false);
    toast.success('Voice note sent!');
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

  const handlePreviewMessage = async (message: DirectMessage, senderName: string) => {
    setPreviewLoading(true);
    try {
      const preview = await previewDirectMessage(message.id);
      setPreviewMessage(preview);
      setPreviewSenderName(senderName);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not preview this message');
    } finally {
      setPreviewLoading(false);
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
                <SignalLabel>Your conversations</SignalLabel>
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
            <div className="operator-inbox__summary"><span>{conversationList.length} conversations</span><StatusBadge status={!online ? 'offline' : realtimeConnected ? 'online' : 'away'}>{!online ? 'Offline' : realtimeConnected ? 'Live updates' : 'Periodic updates'}</StatusBadge></div>
          </header>
          
          <div className="operator-inbox__list">
            {conversationsError && <div className="operator-thread__error" role="alert"><p>{conversationsError}</p><Button variant="outline" onClick={() => void loadConversations()} disabled={conversationsLoading}>Retry inbox</Button></div>}
            {conversationsLoading && conversations.length === 0 ? <p role="status" className="p-6 text-sm text-muted-foreground">Loading your inbox…</p> : conversationList.length === 0 ? (!conversationsError && (
              <div className="operator-inbox__empty">
                <Inbox aria-hidden="true" />
                <h2>{searchQuery ? 'No matching conversations' : 'Your inbox is clear'}</h2>
                <p>{searchQuery ? 'Try a shorter name or username.' : 'Start a private conversation with someone in your network.'}</p>
                {!searchQuery && <button type="button" onClick={() => setNewMessageOpen(true)}>Start a conversation</button>}
              </div>
            )) : (
              conversationList.map((entry) => (
                <ConversationItem 
                  key={entry.conv.id} 
                  entry={entry} 
                  active={activeConv?.conv.id === entry.conv.id} 
                  isTyping={Boolean(typingConversationIds[entry.conv.id])} 
                  onSelect={(convId) => setLocation(`/messages/${convId}`)} 
                  onPreview={(message) => void handlePreviewMessage(message, entry.user.displayName || entry.user.username || 'User')}
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
                      {isPeerTyping ? 'Typing…' : activeConv.conv.isGroup ? activeConv.user.username : peerOnline ? `@${activeConv.user.username} · online` : `@${activeConv.user.username}`}
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
                        {publicBetaConfig.paymentsEnabled && <button type="button" onClick={() => setTipModalOpen(true)}><Zap aria-hidden="true" /><span><strong>Tip creator</strong><small>Open UPI tip jar</small></span></button>}
                        {!publicBetaConfig.publicBeta && <SteamTradeModal
                          partnerName={activeConv.user.displayName}
                          partnerAvatar={activeConv.user.avatarUrl}
                          trigger={<button type="button"><ArrowLeftRight aria-hidden="true" /><span><strong>Gear trade</strong><small>Prepare a trade draft</small></span></button>}
                        />}
                      </>}
                    </div>
                  </details>
                </div>
              </header>

              <div ref={threadFlowRef} className="operator-thread__flow" data-vanish={vanishMode || undefined}>
                {loadingMessages && activeMessages.length === 0 ? (
                  <div className="operator-thread__loading" role="status" aria-live="polite">
                    <span className="operator-thread__loading-mark"><LoaderCircle aria-hidden="true" /></span>
                    <p>Loading secure conversation…</p>
                  </div>
                ) : messageLoadError && activeMessages.length === 0 ? (
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
                      <p>Send the first message to {activeConv.user.displayName}.</p>
                    </div>
                  </div>
                )}

                {loadingMessages && activeMessages.length > 0 && (
                  <div className="operator-thread__syncing" role="status" aria-live="polite">
                    <LoaderCircle aria-hidden="true" />
                    <span>Refreshing this conversation…</span>
                  </div>
                )}
                {messageLoadError && activeMessages.length > 0 && (
                  <div className="operator-thread__stale-error" role="alert">
                    <span><strong>Showing saved messages</strong><small>We couldn’t refresh this conversation. Your messages are safe.</small></span>
                    <button type="button" onClick={() => void requestConversationMessages(activeConv.conv.id)} disabled={loadingMessages}>Try again</button>
                  </div>
                )}

                <div className="operator-thread__messages">
                  {(hasOlderMessages === true || (hasOlderMessages === null && activeMessages.length >= 200)) && (
                    <button
                      type="button"
                      className="operator-thread__load-older"
                      disabled={loadingMessages}
                      onClick={async () => {
                        const flow = threadFlowRef.current;
                        const previousHeight = flow?.scrollHeight ?? 0;
                        const previousTop = flow?.scrollTop ?? 0;
                        try {
                          const count = await loadOlderConversationMessages(activeConv.conv.id);
                          setHasOlderMessages(count === 100);
                          requestAnimationFrame(() => {
                            if (flow) flow.scrollTop = previousTop + (flow.scrollHeight - previousHeight);
                          });
                        } catch {
                          toast.error('Could not load earlier messages. Try again.');
                        }
                      }}
                    >
                      Load earlier messages
                    </button>
                  )}
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
                              <MessageContent attachment={msg} content={msg.content} isMine={isMine} textStyleId={msg.textStyleId} reply={replyPreview} />
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
                        <MediaImageField id="message-image" maxBytes={5 * 1024 * 1024} label="Message image" files={imageFiles} onChange={files => { setImageFiles(files); setSendError(''); }} disabled={sending} />
                        <Button size="sm" variant="ghost" onClick={() => { setShowImageInput(false); setImageFiles([]); }} aria-label="Close image attachment" disabled={sending}><X aria-hidden="true" /></Button>
                      </div>
                    )}
                    <div className="operator-composer__controls">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setShowVoiceRecorder(true)}
                        title="Record Voice Note"
                        aria-label="Record voice note"
                        disabled={sending}
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
                        disabled={sending}
                      >
                        <ImageIcon aria-hidden="true" />
                      </Button>

                      <textarea
                        ref={inputRef}
                        value={message}
                        disabled={sending}
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
                          if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                            e.preventDefault();
                            void handleSend();
                          }
                        }}
                        placeholder="Write a direct message…"
                        aria-label="Message"
                        aria-describedby={sendError ? 'operator-composer-error' : undefined}
                      />

                      <select value={textStyleId} onChange={(event) => setTextStyleId(event.target.value as DirectMessage['textStyleId'])} disabled={sending} aria-label="Message typography" title="Message typography" className="h-9 max-w-24 rounded-lg border border-border/50 bg-background/60 px-1.5 text-base sm:text-xs font-semibold text-muted-foreground outline-none focus:border-primary/50">
                        <option value="default">YOR</option>
                        <option value="mono" disabled={!messageFontEnabled}>Mono · Advanced</option>
                        <option value="rounded" disabled={!messageFontEnabled}>Round · Advanced</option>
                      </select>

                      <Button
                        size="icon"
                        disabled={(!message.trim() && imageFiles.length === 0) || sending}
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
              {publicBetaConfig.paymentsEnabled && <UpiTipJarModal
                creator={{
                  id: activeConv.user.id,
                  displayName: activeConv.user.displayName,
                  username: activeConv.user.username,
                  avatarUrl: activeConv.user.avatarUrl,
                }}
                isOpen={tipModalOpen}
                onOpenChange={setTipModalOpen}
              />}
            </>
          ) : (
            <div className="operator-thread-placeholder">
              <span><LockKeyhole aria-hidden="true" /></span>
              <SignalLabel tone="muted">A little more personal</SignalLabel>
              <h2>Select a conversation</h2>
              <p>Keep the conversation going with messages, voice notes, and photos.</p>
              <button type="button" onClick={() => setNewMessageOpen(true)}><Plus aria-hidden="true" />Start a conversation</button>
              <small>{realtimeConnected ? 'Live updates connected' : 'Conversations refresh periodically while this tab is open'}</small>
            </div>
          )}
        </section>

        <NewMessageDialog open={newMessageOpen} onOpenChange={setNewMessageOpen} />
        <NewGroupDialog open={newGroupOpen} onOpenChange={setNewGroupOpen} />
        <MessagePreviewDialog
          message={previewMessage}
          senderName={previewSenderName}
          open={Boolean(previewMessage) || previewLoading}
          onOpenChange={(open) => { if (!open) setPreviewMessage(null); }}
        />
      </div>
    </div>
  );
}
