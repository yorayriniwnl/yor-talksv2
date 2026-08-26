import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  SendHorizontal, Image as ImageIcon, Film, Smile, 
  Mic, Zap, X, Trash2, Sparkles, Loader2 
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/lib/store';
import { GifPickerModal, GifItem } from './GifPickerModal';
import { VoiceNoteRecorder } from '@/components/messages/VoiceNoteRecorder';
import { UpiTipJarModal } from '@/components/monetization/UpiTipJarModal';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';

const QUICK_EMOJIS = ['🔥', '❤️', '😂', '🚀', '💎', '👏', '🙏', '✨'];

export interface RichCommentData {
  text: string;
  imageUrl?: string;
  gifUrl?: string;
  voiceNoteUrl?: string;
  voiceDuration?: number;
}

export function RichCommentComposer({
  postId,
  placeholder = "Write a rich comment...",
  onCommentSubmit,
  creatorUser,
}: {
  postId: string;
  placeholder?: string;
  onCommentSubmit: (data: RichCommentData) => void | Promise<void>;
  creatorUser?: { id: string; displayName: string; username: string; avatarUrl?: string };
}) {
  const currentUser = useAppStore((state) => state.currentUser);
  
  const [text, setText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [selectedGif, setSelectedGif] = useState<GifItem | null>(null);
  const [gifModalOpen, setGifModalOpen] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [voiceNote, setVoiceNote] = useState<{ url: string; duration: number } | null>(null);
  const [tipModalOpen, setTipModalOpen] = useState(false);
  const [sending, setSending] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectedImageRef = useRef<string | null>(null);

  const releaseSelectedImage = () => {
    const url = selectedImageRef.current;
    if (url?.startsWith('blob:')) URL.revokeObjectURL(url);
    selectedImageRef.current = null;
  };

  useEffect(() => () => releaseSelectedImage(), []);

  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 8 * 1024 * 1024) {
        toast.error('Image must be smaller than 8MB');
        return;
      }
      releaseSelectedImage();
      const url = URL.createObjectURL(file);
      selectedImageRef.current = url;
      setSelectedImage(url);
      setSelectedImageFile(file);
      setSelectedGif(null);
      sounds.playPop();
    }
  };

  const handleSend = async () => {
    if (!text.trim() && !selectedImage && !selectedGif && !voiceNote) return;

    sounds.playPop();
    if (selectedGif || selectedImage) {
      triggerConfetti();
    }

    setSending(true);
    try {
      let imageUrl = selectedImage || undefined;
      if (selectedImageFile) {
        imageUrl = (await api.uploadMedia(selectedImageFile)).url;
      }
      await onCommentSubmit({
        text: text.trim(),
        imageUrl,
        gifUrl: selectedGif?.url || undefined,
        voiceNoteUrl: voiceNote?.url || undefined,
        voiceDuration: voiceNote?.duration || undefined,
      });
      setText('');
      releaseSelectedImage();
      setSelectedImage(null);
      setSelectedImageFile(null);
      setSelectedGif(null);
      setVoiceNote(null);
      toast.success('Comment posted!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not post this comment');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="w-full space-y-2 p-3 rounded-2xl glass-heavy border border-border/40 font-sans">
      {/* Voice Recorder Overlay if open */}
      {showVoiceRecorder ? (
        <div className="py-1">
          <VoiceNoteRecorder
            onSendVoiceNote={(url, duration) => {
              setVoiceNote({ url, duration });
              setShowVoiceRecorder(false);
              toast.success('Voice memo attached to comment! 🎙️');
            }}
            onCancel={() => setShowVoiceRecorder(false)}
          />
        </div>
      ) : (
        <>
          <div className="flex items-start gap-2.5">
            <Avatar className="w-8 h-8 ring-1 ring-primary/20 shrink-0 mt-0.5">
              <AvatarImage src={currentUser?.avatarUrl} />
              <AvatarFallback className="font-display font-bold text-xs">
                {currentUser?.displayName?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void handleSend();
                  }
                }}
                placeholder={placeholder}
                rows={2}
                className="w-full bg-transparent resize-none outline-none text-xs leading-relaxed placeholder:text-muted-foreground/60 text-foreground"
              />

              {/* Attached Media Previews */}
              <AnimatePresence>
                {selectedImage && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="relative w-28 h-28 rounded-xl overflow-hidden border border-primary/40 mt-2 group"
                  >
                    <img src={selectedImage} alt="Attachment" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => { releaseSelectedImage(); setSelectedImage(null); setSelectedImageFile(null); }}
                      className="absolute top-1 right-1 p-1 rounded-full bg-black/70 text-white hover:bg-rose-600 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </motion.div>
                )}

                {selectedGif && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="relative w-40 h-28 rounded-xl overflow-hidden border border-amber-400/40 mt-2 group"
                  >
                    <img src={selectedGif.url} alt={selectedGif.title} className="w-full h-full object-cover" />
                    <div className="absolute top-1 left-1 px-1.5 py-0.2 rounded bg-black/70 text-[0.6rem] font-bold font-mono text-amber-400">
                      GIF
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedGif(null)}
                      className="absolute top-1 right-1 p-1 rounded-full bg-black/70 text-white hover:bg-rose-600 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </motion.div>
                )}

                {voiceNote && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 mt-2 p-2 rounded-xl surface-1 border border-primary/30 max-w-xs"
                  >
                    <Mic className="w-4 h-4 text-primary shrink-0" />
                    <audio controls src={voiceNote.url} className="h-6 max-w-[180px]" />
                    <button
                      type="button"
                      onClick={() => setVoiceNote(null)}
                      className="text-muted-foreground hover:text-rose-400 ml-auto"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </motion.div>
                )}

              </AnimatePresence>
            </div>
          </div>

          {/* Quick Emojis & Toolbar */}
          <div className="flex items-center justify-between pt-2 border-t border-border/30">
            {/* Quick Emojis */}
            <div className="flex items-center gap-1 overflow-x-auto hide-scrollbar">
              {QUICK_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    sounds.playPop();
                    setText((prev) => prev + emoji);
                  }}
                  className="hover:scale-125 transition-transform text-sm p-0.5 cursor-pointer"
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* Media Action Buttons */}
            <div className="flex items-center gap-1">
              {/* Photo Upload */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageFile}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-1.5 rounded-xl hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Attach Photo"
              >
                <ImageIcon className="w-4 h-4" />
              </button>

              {/* GIF Search */}
              <button
                type="button"
                onClick={() => setGifModalOpen(true)}
                className="p-1.5 rounded-xl hover:bg-amber-500/10 text-muted-foreground hover:text-amber-400 transition-colors cursor-pointer"
                title="Add GIF"
              >
                <Film className="w-4 h-4" />
              </button>

              {/* Voice Memo */}
              <button
                type="button"
                onClick={() => setShowVoiceRecorder(true)}
                className="p-1.5 rounded-xl hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                title="Record Voice Memo"
              >
                <Mic className="w-4 h-4" />
              </button>

              {/* Super Comment Tip */}
              {creatorUser && (
                <button
                  type="button"
                  onClick={() => {
                    setTipModalOpen(true);
                    sounds.playChime();
                  }}
                  className={cn(
                    "p-1.5 rounded-xl transition-colors cursor-pointer",
                    tipModalOpen ? "bg-amber-500/30 text-amber-300" : "hover:bg-amber-500/10 text-muted-foreground hover:text-amber-400"
                  )}
                  title="Golden Super Comment (UPI Tip)"
                >
                  <Zap className={cn("w-4 h-4", tipModalOpen && "fill-amber-400 text-amber-400")} />
                </button>
              )}

              {/* Send Button */}
              <Button
                size="sm"
                onClick={() => void handleSend()}
                disabled={sending || (!text.trim() && !selectedImage && !selectedGif && !voiceNote)}
                className={cn(
                  "rounded-xl h-8 px-3 text-xs font-bold ml-1 transition-all cursor-pointer",
                  text.trim() || selectedImage || selectedGif || voiceNote
                    ? "bg-primary text-primary-foreground glow-neon-primary"
                    : "bg-muted text-muted-foreground"
                )}
              >
                <SendHorizontal className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </>
      )}

      {/* GIF Picker Modal */}
      <GifPickerModal
        isOpen={gifModalOpen}
        onOpenChange={setGifModalOpen}
        onSelectGif={(gif) => {
          setSelectedGif(gif);
          setSelectedImage(null);
          setSelectedImageFile(null);
        }}
      />
      {creatorUser && (
        <UpiTipJarModal
          creator={creatorUser}
          isOpen={tipModalOpen}
          onOpenChange={setTipModalOpen}
        />
      )}
    </div>
  );
}
