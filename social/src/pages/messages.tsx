import React, { useState, useMemo, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import { useParams, useLocation } from 'wouter';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Edit, MoreVertical, Image as ImageIcon, Smile, Paperclip, Send, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

export default function Messages() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const users = useAppStore((s) => s.users);
  const currentUser = useAppStore((s) => s.currentUser);
  const [message, setMessage] = useState('');

  // Mock conversations — memoized to avoid recomputation on every render
  const conversations = useMemo(() =>
    Object.values(users)
      .filter((u) => u.id !== currentUser?.id)
      .map((user, i) => ({
        id: `conv_${i}`,
        user,
        lastMessage: i % 2 === 0 ? 'Sounds good, talk later!' : 'Did you see that new design?',
        time: new Date(Date.now() - 1000 * 60 * 60 * i).toISOString(),
        unread: i === 0
      }))
  , [users, currentUser]);

  const activeConv = useMemo(() => (id ? conversations.find((c) => c.id === id) : null), [id, conversations]);

  const handleSelect = useCallback((convId: string) => {
    setLocation(`/messages/${convId}`);
  }, [setLocation]);

  type Conv = typeof conversations[number];

  const ConversationItem = React.memo(function ConversationItem({ conv, active, onSelect }: { conv: Conv; active: boolean; onSelect: (id: string) => void }) {
    return (
      <div
        onClick={() => onSelect(conv.id)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(conv.id); }}
        className={cn(
          "p-4 flex gap-3 cursor-pointer transition-colors border-l-2",
          active ? "bg-muted/50 border-primary" : "border-transparent hover:bg-muted/20"
        )}
      >
        <Avatar className="w-12 h-12">
          <AvatarImage src={conv.user.avatarUrl} />
          <AvatarFallback>{conv.user.displayName.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className={cn("font-medium truncate", conv.unread && "font-bold")}>{conv.user.displayName}</span>
            <span className="text-xs text-muted-foreground whitespace-nowrap">{format(new Date(conv.time), 'MMM d')}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <p className={cn("text-sm truncate", conv.unread ? "text-foreground font-medium" : "text-muted-foreground")}>
              {conv.lastMessage}
            </p>
            {conv.unread && <div className="w-2.5 h-2.5 rounded-full bg-primary shrink-0" />}
          </div>
        </div>
      </div>
    );
  });

  return (
    <div className="flex h-screen bg-background pt-0 md:pt-0 pb-20 md:pb-0">
      {/* Sidebar List */}
      <div className={cn("w-full md:w-[350px] flex flex-col border-r border-border/50", id ? "hidden md:flex" : "flex")}>
        <div className="p-4 flex items-center justify-between border-b border-border/50">
          <h2 className="font-display font-bold text-xl">Messages</h2>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" className="rounded-full"><Edit className="w-5 h-5" /></Button>
          </div>
        </div>
        <div className="p-4 border-b border-border/50">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search messages" className="pl-9 bg-muted/50 border-none rounded-full" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.map((conv) => (
            <ConversationItem key={conv.id} conv={conv} active={activeConv?.id === conv.id} onSelect={handleSelect} />
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className={cn("flex-1 flex-col", id ? "flex" : "hidden md:flex")}>
        {activeConv ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-border/50 flex items-center justify-between glass sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" className="md:hidden -ml-2" onClick={() => setLocation('/messages')}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                </Button>
                <Avatar className="w-10 h-10">
                  <AvatarImage src={activeConv.user.avatarUrl} />
                  <AvatarFallback>{activeConv.user.displayName.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-medium leading-none">{activeConv.user.displayName}</h3>
                  <span className="text-xs text-muted-foreground">@{activeConv.user.username}</span>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="rounded-full">
                <MoreVertical className="w-5 h-5" />
              </Button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              <div className="text-center text-xs text-muted-foreground my-6">
                Yesterday, 10:24 AM
              </div>
              
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3 max-w-[80%]">
                <Avatar className="w-8 h-8 shrink-0 mt-auto">
                  <AvatarImage src={activeConv.user.avatarUrl} />
                </Avatar>
                <div className="bg-muted p-3 rounded-2xl rounded-bl-sm">
                  <p className="text-[15px]">Hey! Are you going to the design meetup next week?</p>
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex gap-3 max-w-[80%] ml-auto justify-end">
                <div className="bg-primary text-primary-foreground p-3 rounded-2xl rounded-br-sm">
                  <p className="text-[15px]">Yes! I'm planning to go. Have you registered yet?</p>
                </div>
              </motion.div>
              
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="flex gap-3 max-w-[80%]">
                <Avatar className="w-8 h-8 shrink-0 mt-auto">
                  <AvatarImage src={activeConv.user.avatarUrl} />
                </Avatar>
                <div className="bg-muted p-3 rounded-2xl rounded-bl-sm">
                  <p className="text-[15px]">{activeConv.lastMessage}</p>
                </div>
              </motion.div>
            </div>

            {/* Input Area */}
            <div className="p-4 bg-background border-t border-border/50">
              <div className="bg-muted/50 rounded-2xl p-1 pr-2 flex items-end gap-2 border border-border focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/50 transition-all">
                <div className="flex gap-1 p-1 shrink-0">
                  <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full text-muted-foreground hover:text-foreground"><ImageIcon className="w-5 h-5" /></Button>
                  <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full text-muted-foreground hover:text-foreground"><Paperclip className="w-5 h-5" /></Button>
                </div>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Start a new message"
                  className="flex-1 bg-transparent resize-none outline-none py-3 min-h-[44px] max-h-32 text-[15px]"
                  rows={1}
                />
                <div className="flex gap-1 p-1 shrink-0">
                  <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full text-muted-foreground hover:text-foreground"><Smile className="w-5 h-5" /></Button>
                  <Button 
                    size="icon" 
                    className="w-8 h-8 rounded-full bg-primary text-primary-foreground shrink-0 shadow-sm"
                    disabled={!message.trim()}
                  >
                    <Send className="w-4 h-4 ml-0.5" />
                  </Button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-20 h-20 bg-muted/50 rounded-full flex items-center justify-center mb-6">
              <Mail className="w-10 h-10 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-display font-medium mb-2">Select a message</h2>
            <p className="text-muted-foreground max-w-sm">
              Choose from your existing conversations, start a new one, or just keep swimming.
            </p>
            <Button className="mt-6 rounded-full font-medium px-8 shadow-lg shadow-primary/20">New Message</Button>
          </div>
        )}
      </div>
    </div>
  );
}

