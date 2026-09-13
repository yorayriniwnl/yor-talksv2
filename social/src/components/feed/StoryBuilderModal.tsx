import { useEffect, useRef, useState } from 'react';
import { AudioLines, BarChart2, Check, Image as ImageIcon, Mic, Sparkles, Square, Type, Send, X, Upload } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/lib/store';
import { api, type BackendUser } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';
import { ContentRatingSelect } from '@/components/content/ContentRatingSelect';
import { DEFAULT_CONTENT_RATING, type ContentRating } from '@/lib/content-rating';
import { ContentCategorySelect } from '@/components/content/ContentCategorySelect';
import { type ContentCategory } from '@/lib/content-category';

interface StoryBuilderModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  isHighlight?: boolean;
}

const STORY_GRADIENTS = [
  { id: 'sunset', name: 'Sunset Rose', css: 'from-rose-500 via-purple-600 to-amber-500' },
  { id: 'cyan', name: 'Cyber Neon', css: 'from-cyan-400 via-blue-600 to-indigo-700' },
  { id: 'gold', name: 'Solar Gold', css: 'from-amber-300 via-orange-500 to-red-600' },
  { id: 'emerald', name: 'Aurora Green', css: 'from-emerald-400 via-teal-600 to-blue-700' },
  { id: 'cosmic', name: 'Deep Cosmic', css: 'from-fuchsia-600 via-purple-900 to-black' },
];

type StoryAudience = 'followers' | 'close_friends' | 'public' | 'selected_people' | 'everyone_except' | 'custom';

export function StoryBuilderModal({ isOpen, onOpenChange, isHighlight = false }: StoryBuilderModalProps) {
  const addStory = useAppStore((s) => s.addStory);
  const currentUser = useAppStore((s) => s.currentUser);
  const closeFriends = useAppStore((s) => s.closeFriends);

  const [textContent, setTextContent] = useState('');
  const [selectedGradient, setSelectedGradient] = useState(STORY_GRADIENTS[0]);
  const [imageUrl, setImageUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState('');
  const [storyType, setStoryType] = useState<'text' | 'image' | 'voice'>('text');
  const [voiceFile, setVoiceFile] = useState<File | null>(null);
  const [voicePreviewUrl, setVoicePreviewUrl] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [highlightTitle, setHighlightTitle] = useState('');
  const [contentCategory, setContentCategory] = useState<ContentCategory | ''>('');
  const [contentRating, setContentRating] = useState<ContentRating>(DEFAULT_CONTENT_RATING);
  const [audience, setAudience] = useState<StoryAudience>('followers');
  const [audienceMembers, setAudienceMembers] = useState<BackendUser[]>([]);
  const [audienceExclusions, setAudienceExclusions] = useState<BackendUser[]>([]);
  const [audienceSearch, setAudienceSearch] = useState('');
  const [audienceResults, setAudienceResults] = useState<BackendUser[]>([]);
  const [customListMode, setCustomListMode] = useState<'include' | 'exclude'>('include');
  const [premiumFeatures, setPremiumFeatures] = useState<Record<string, boolean> | null>(null);
  const [highlightDestination, setHighlightDestination] = useState<'none' | 'existing' | 'new'>(isHighlight ? 'new' : 'none');
  const [highlightId, setHighlightId] = useState('');
  const [highlights, setHighlights] = useState<Awaited<ReturnType<typeof api.getHighlights>>>([]);
  const [publishMode, setPublishMode] = useState<'active' | 'highlight_only'>('active');
  const [durationHours, setDurationHours] = useState(24);
  const [priority, setPriority] = useState(false);
  const [pollOpen, setPollOpen] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [publishing, setPublishing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);
  const recordingStartedAtRef = useRef(0);

  useEffect(() => {
    if (!isOpen || !currentUser) return;
    let active = true;
    void Promise.allSettled([api.getHighlights(), api.getPremiumProfileOptions()]).then(([highlightResult, profileResult]) => {
      if (!active) return;
      if (highlightResult.status === 'fulfilled') setHighlights(highlightResult.value);
      else setHighlights([]);
      if (profileResult.status === 'fulfilled') setPremiumFeatures(profileResult.value.enabledFeatures);
    });
    return () => { active = false; };
  }, [currentUser, isOpen]);

  useEffect(() => {
    if (!isOpen || !currentUser || audienceSearch.trim().length < 2) {
      setAudienceResults([]);
      return;
    }
    let active = true;
    const timer = window.setTimeout(() => {
      void api.searchUsers(audienceSearch.trim()).then((users) => {
        if (active) setAudienceResults(users.filter((user) => user.id !== currentUser.id));
      }).catch(() => {
        if (active) setAudienceResults([]);
      });
    }, 250);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [audienceSearch, currentUser, isOpen]);

  useEffect(() => {
    if (premiumFeatures && premiumFeatures.CUSTOM_STORY_AUDIENCE === false && ['selected_people', 'everyone_except', 'custom'].includes(audience)) {
      setAudience('followers');
    }
  }, [audience, premiumFeatures]);

  useEffect(() => {
    if (isHighlight) {
      setHighlightDestination('new');
      setPublishMode('active');
    }
  }, [isHighlight]);

  useEffect(() => () => {
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    if (voicePreviewUrl) URL.revokeObjectURL(voicePreviewUrl);
    if (recordingTimerRef.current !== null) window.clearInterval(recordingTimerRef.current);
    recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
  }, [imagePreviewUrl, voicePreviewUrl]);

  const stopVoiceRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (recordingTimerRef.current !== null) {
      window.clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (recorder && recorder.state !== 'inactive') recorder.stop();
    recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
    recordingStreamRef.current = null;
    setIsRecording(false);
  };

  const startVoiceRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      toast.error('Voice recording is not supported in this browser');
      return;
    }

    try {
      if (voicePreviewUrl) URL.revokeObjectURL(voicePreviewUrl);
      setVoiceFile(null);
      setVoicePreviewUrl('');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const supportedMimeType = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg',
      ].find((mimeType) => MediaRecorder.isTypeSupported(mimeType));
      const recorder = supportedMimeType ? new MediaRecorder(stream, { mimeType: supportedMimeType }) : new MediaRecorder(stream);
      recordingStreamRef.current = stream;
      recordingChunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) recordingChunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const mimeType = recorder.mimeType || 'audio/webm';
        const extension = mimeType.includes('mp4') ? 'm4a' : mimeType.includes('ogg') ? 'ogg' : 'webm';
        const file = new File(recordingChunksRef.current, `story-voice-${Date.now()}.${extension}`, { type: mimeType });
        recordingChunksRef.current = [];
        mediaRecorderRef.current = null;
        if (file.size > 0) {
          setVoiceFile(file);
          setVoicePreviewUrl(URL.createObjectURL(file));
        }
      };
      recorder.start(250);
      mediaRecorderRef.current = recorder;
      recordingStartedAtRef.current = Date.now();
      setRecordingSeconds(0);
      setIsRecording(true);
      recordingTimerRef.current = window.setInterval(() => {
        const elapsed = Math.floor((Date.now() - recordingStartedAtRef.current) / 1000);
        setRecordingSeconds(elapsed);
        if (elapsed >= 60) stopVoiceRecording();
      }, 250);
    } catch (error) {
      recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
      recordingStreamRef.current = null;
      toast.error(error instanceof Error ? error.message : 'Microphone permission is required to record a Story');
    }
  };

  const handleVoiceFile = (file: File | undefined) => {
    if (!file) return;
    if (file.type && !file.type.startsWith('audio/')) {
      toast.error('Choose an audio file for a voice Story');
      return;
    }
    if (isRecording) stopVoiceRecording();
    if (voicePreviewUrl) URL.revokeObjectURL(voicePreviewUrl);
    setVoiceFile(file);
    setVoicePreviewUrl(URL.createObjectURL(file));
  };

  const handleImageFile = (file: File | undefined) => {
    if (!file) return;
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setImageFile(file);
    setImageUrl('');
    setImagePreviewUrl(URL.createObjectURL(file));
  };

  const handlePublishStory = async () => {
    if (storyType === 'text' && !textContent.trim()) return;
    if (storyType === 'image' && !imageUrl.trim() && !imageFile) return;
    if (storyType === 'voice' && !voiceFile) return;
    if (isRecording) return;
    if (!contentCategory) return;
    const normalizedPollOptions = pollOptions.map((option) => option.trim()).filter(Boolean);
    if (pollOpen && (!pollQuestion.trim() || normalizedPollOptions.length < 2)) return;
    if (highlightDestination === 'existing' && !highlightId) {
      toast.error('Choose an existing Highlight before publishing');
      return;
    }
    if (publishMode === 'highlight_only' && highlightDestination === 'none') {
      toast.error('Choose a Highlight before publishing Highlight-only content');
      return;
    }
    if (audience === 'selected_people' && audienceMembers.length === 0) {
      toast.error('Choose at least one person for this audience');
      return;
    }
    if (audience === 'everyone_except' && audienceExclusions.length === 0) {
      toast.error('Choose at least one person to exclude');
      return;
    }
    if (audience === 'custom' && audienceMembers.length === 0 && audienceExclusions.length === 0) {
      toast.error('Add at least one included or excluded person');
      return;
    }

    setPublishing(true);
    try {
      let mediaUrl = imageUrl.trim();
      if (storyType === 'image' && imageFile) {
        const uploaded = await api.uploadMedia(imageFile);
        mediaUrl = uploaded.url;
      }
      if (storyType === 'voice' && voiceFile) {
        const uploaded = await api.uploadMedia(voiceFile);
        mediaUrl = uploaded.url;
      }
      let targetHighlightId = highlightDestination === 'existing' ? highlightId : undefined;
      let targetHighlightTitle = highlightTitle.trim();
      if (highlightDestination === 'new') {
        const createdHighlight = await api.createHighlight({ title: targetHighlightTitle || 'Highlights' });
        targetHighlightId = createdHighlight.id;
        targetHighlightTitle = createdHighlight.title;
        setHighlights((items) => [createdHighlight, ...items]);
      }
      await addStory({
        type: storyType,
        textContent: storyType === 'text' || storyType === 'voice' ? textContent.trim() || undefined : undefined,
        mediaUrl: storyType === 'image' || storyType === 'voice' ? mediaUrl : 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop',
        backgroundGradient: selectedGradient.css,
        contentCategory,
        contentRating,
        audience,
        ...(audienceMembers.length > 0 ? { audienceMemberIds: audienceMembers.map((person) => person.id) } : {}),
        ...(audienceExclusions.length > 0 ? { audienceExclusionIds: audienceExclusions.map((person) => person.id) } : {}),
        isHighlight: isHighlight || Boolean(targetHighlightId),
        ...(targetHighlightTitle ? { highlightTitle: targetHighlightTitle } : {}),
        ...(targetHighlightId ? { highlightId: targetHighlightId } : {}),
        publishMode,
        ...(durationHours > 24 ? { durationHours } : {}),
        ...(priority ? { priority } : {}),
        ...(pollOpen ? { poll: { question: pollQuestion.trim(), options: normalizedPollOptions.map((text) => ({ text })) } } : {}),
      });
      sounds.playChime();
      triggerConfetti();
      toast.success(isHighlight ? 'Story added to your highlights! ✨' : 'Story published for 24 hours! ✨');
      setTextContent('');
      setImageUrl('');
      setImageFile(null);
      setImagePreviewUrl('');
      setVoiceFile(null);
      setVoicePreviewUrl('');
      setRecordingSeconds(0);
      setStoryType('text');
      setHighlightTitle('');
      setContentCategory('');
      setContentRating(DEFAULT_CONTENT_RATING);
      setAudience('followers');
      setAudienceMembers([]);
      setAudienceExclusions([]);
      setAudienceSearch('');
      setAudienceResults([]);
      setCustomListMode('include');
      setHighlightDestination(isHighlight ? 'new' : 'none');
      setHighlightId('');
      setPublishMode('active');
      setDurationHours(24);
      setPriority(false);
      setPollOpen(false);
      setPollQuestion('');
      setPollOptions(['', '']);
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not publish this Story');
    } finally {
      setPublishing(false);
    }
  };

  const handleDialogChange = (open: boolean) => {
    if (!open && isRecording) stopVoiceRecording();
    onOpenChange(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogChange}>
      <DialogContent className="sm:max-w-[480px] rounded-3xl font-sans overflow-hidden p-0 border-border/50">
        {/* Story Canvas Live Preview */}
        <div className={cn("relative w-full h-80 bg-gradient-to-br flex flex-col justify-between p-6 transition-all duration-500", selectedGradient.css)}>
          {/* Header Bar */}
          <div className="flex items-center justify-between text-white relative z-10">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs font-display backdrop-blur-md px-3 py-1 rounded-full bg-white/20">
                {(currentUser?.displayName || currentUser?.username || 'User')}'s Story
              </span>
            </div>
            <button onClick={() => handleDialogChange(false)} className="w-8 h-8 rounded-full bg-black/30 flex items-center justify-center text-white backdrop-blur-md">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Canvas Center Preview */}
          <div className="flex-1 flex items-center justify-center text-center px-4 relative z-10">
            {storyType === 'text' ? (
              <p className="text-white text-2xl md:text-3xl font-display font-extrabold drop-shadow-md leading-tight">
                {textContent || "Type your story caption..."}
              </p>
            ) : storyType === 'voice' ? (
              <div className="flex w-full flex-col items-center justify-center gap-3 rounded-2xl border border-white/20 bg-black/25 p-5 text-white backdrop-blur-sm">
                <AudioLines className="h-10 w-10" />
                {voicePreviewUrl ? <audio controls src={voicePreviewUrl} className="story-controls w-full max-w-[280px]" /> : <p className="text-sm text-white/70">Record or upload a voice Story</p>}
                {textContent && <p className="text-sm font-semibold leading-snug">{textContent}</p>}
              </div>
            ) : (imagePreviewUrl || imageUrl.trim()) ? (
              <img src={imagePreviewUrl || imageUrl} alt="Story preview" className="w-full h-full object-cover rounded-2xl shadow-xl border border-white/20" />
            ) : (
              <p className="text-white/70 text-sm font-mono">Enter image URL below...</p>
            )}
          </div>

          <div className="text-[0.68rem] text-white/80 font-mono text-center relative z-10">
                Visible to {audience === 'public' ? 'everyone' : audience === 'close_friends' ? 'Close Friends' : audience === 'selected_people' ? `${audienceMembers.length} selected people` : audience === 'everyone_except' ? `everyone except ${audienceExclusions.length}` : audience === 'custom' ? 'custom audience' : 'followers'} for {durationHours} hours{publishMode === 'highlight_only' ? ' · Highlight only' : ''}
          </div>
        </div>

        {/* Controls Drawer */}
        <div className="p-5 space-y-4 surface-1">
          {/* Type Toggle */}
          <div className="flex rounded-2xl surface-2 p-1 border border-border/40">
            <button
              onClick={() => setStoryType('text')}
              className={cn("flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5", storyType === 'text' ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground")}
            >
              <Type className="w-3.5 h-3.5" /> Text Story
            </button>
            <button
              onClick={() => setStoryType('image')}
              className={cn("flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5", storyType === 'image' ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground")}
            >
              <ImageIcon className="w-3.5 h-3.5" /> Photo Story
            </button>
            <button
              onClick={() => setStoryType('voice')}
              className={cn("flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5", storyType === 'voice' ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground")}
            >
              <Mic className="w-3.5 h-3.5" /> Voice Story
            </button>
          </div>

          {storyType === 'text' ? (
            <textarea
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              placeholder="What's happening right now?"
              className="w-full h-24 rounded-2xl surface-2 border border-border/40 p-3 text-sm outline-none resize-none placeholder:text-muted-foreground font-serif"
            />
          ) : storyType === 'image' ? (
            <div className="space-y-2">
              <label htmlFor="story-image-file" className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-primary/30 bg-primary/5 px-3 py-3 text-xs font-semibold text-primary transition-colors hover:bg-primary/10">
                <Upload className="h-4 w-4" /> {imageFile ? imageFile.name : 'Upload a photo'}
              </label>
              <input id="story-image-file" type="file" accept="image/*" onChange={(event) => handleImageFile(event.target.files?.[0])} className="sr-only" />
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => { setImageUrl(e.target.value); setImageFile(null); setImagePreviewUrl(''); }}
                placeholder="Or paste an image URL…"
                className="w-full h-10 rounded-xl surface-2 border border-border/40 px-3 text-xs outline-none focus:border-primary/50 font-mono"
              />
            </div>
          ) : (
            <div className="space-y-3 rounded-2xl border border-border/40 bg-background/30 p-3">
              <div className="flex items-center gap-2">
                <Button type="button" variant={isRecording ? 'destructive' : 'default'} onClick={() => void (isRecording ? stopVoiceRecording() : startVoiceRecording())} disabled={publishing} className="flex-1 rounded-xl text-xs font-bold">
                  {isRecording ? <><Square className="mr-1.5 h-3.5 w-3.5 fill-current" /> Stop recording</> : <><Mic className="mr-1.5 h-3.5 w-3.5" /> Record voice</>}
                </Button>
                <span className="min-w-[46px] text-right font-mono text-xs text-muted-foreground">{String(Math.floor(recordingSeconds / 60)).padStart(2, '0')}:{String(recordingSeconds % 60).padStart(2, '0')}</span>
              </div>
              <label htmlFor="story-voice-file" className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-primary/30 bg-primary/5 px-3 py-3 text-xs font-semibold text-primary transition-colors hover:bg-primary/10">
                <Upload className="h-4 w-4" /> {voiceFile && !isRecording ? voiceFile.name : 'Upload an audio file'}
              </label>
              <input id="story-voice-file" type="file" accept="audio/*" onChange={(event) => handleVoiceFile(event.target.files?.[0])} className="sr-only" />
              {voicePreviewUrl && <audio controls src={voicePreviewUrl} className="w-full" />}
              <textarea value={textContent} onChange={(event) => setTextContent(event.target.value)} placeholder="Add an optional caption…" maxLength={500} className="h-16 w-full resize-none rounded-xl border border-border/40 bg-background/60 p-3 text-xs outline-none placeholder:text-muted-foreground focus:border-primary/50" />
              <p className="text-[0.68rem] text-muted-foreground">Voice Stories can be up to 60 seconds and are uploaded securely with the same content controls.</p>
            </div>
          )}

          {/* Gradient Palette Picker */}
          <ContentCategorySelect id="story-content-category" value={contentCategory} onChange={setContentCategory} />
          <ContentRatingSelect id="story-content-rating" value={contentRating} onChange={setContentRating} />

          <label className="space-y-1.5 text-xs font-semibold">
            <span>Audience</span>
            <select value={audience} onChange={(event) => setAudience(event.target.value as StoryAudience)} className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm">
              <option value="followers">Followers</option>
              <option value="close_friends" disabled={closeFriends.length === 0}>Close Friends ({closeFriends.length})</option>
              <option value="public">Public</option>
              <option value="selected_people" disabled={premiumFeatures?.CUSTOM_STORY_AUDIENCE === false}>Selected people · Advanced</option>
              <option value="everyone_except" disabled={premiumFeatures?.CUSTOM_STORY_AUDIENCE === false}>Everyone except · Advanced</option>
              <option value="custom" disabled={premiumFeatures?.CUSTOM_STORY_AUDIENCE === false}>Custom include/exclude · Advanced</option>
            </select>
            {audience === 'close_friends' && closeFriends.length === 0 && <span className="block text-[0.68rem] font-normal text-muted-foreground">Add people in Settings → Close Friends first.</span>}
          </label>

          {['selected_people', 'everyone_except', 'custom'].includes(audience) && (
            <div className="space-y-3 rounded-2xl border border-amber-500/25 bg-amber-500/5 p-3">
              <div className="flex items-start gap-2">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                <div>
                  <p className="text-xs font-bold">Private audience controls</p>
                  <p className="mt-1 text-[0.68rem] font-normal leading-relaxed text-muted-foreground">Search by username or name. The server re-checks your entitlement and verifies every selected account before publishing.</p>
                </div>
              </div>
              {audience === 'custom' && <label className="block space-y-1.5 text-xs font-semibold"><span>Editing list</span><select value={customListMode} onChange={(event) => setCustomListMode(event.target.value as typeof customListMode)} className="h-9 w-full rounded-xl border border-border bg-background px-3 text-sm"><option value="include">Include these people</option><option value="exclude">Exclude these people</option></select></label>}
              <input value={audienceSearch} onChange={(event) => setAudienceSearch(event.target.value)} placeholder="Search people to add…" aria-label="Search people for story audience" className="h-10 w-full rounded-xl border border-border/40 bg-background/60 px-3 text-xs outline-none focus:border-primary/50" />
              {audienceSearch.trim().length > 0 && audienceSearch.trim().length < 2 && <p className="text-[0.68rem] text-muted-foreground">Type at least two characters to search.</p>}
              {audienceResults.length > 0 && <div className="max-h-36 space-y-1 overflow-y-auto rounded-xl border border-border/40 bg-background/40 p-1">{audienceResults.map((person) => {
                const targetList = audience === 'everyone_except' || (audience === 'custom' && customListMode === 'exclude') ? audienceExclusions : audienceMembers;
                const selected = targetList.some((item) => item.id === person.id);
                return <button key={person.id} type="button" onClick={() => {
                  const useExclusions = audience === 'everyone_except' || (audience === 'custom' && customListMode === 'exclude');
                  const setter = useExclusions ? setAudienceExclusions : setAudienceMembers;
                  setter((items) => selected ? items.filter((item) => item.id !== person.id) : [...items, person]);
                }} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs hover:bg-primary/10"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">{(person.fullName || person.username || 'U').charAt(0).toUpperCase()}</span><span className="min-w-0 flex-1"><span className="block truncate font-semibold">{person.fullName || person.username}</span><span className="block truncate text-[0.65rem] text-muted-foreground">@{person.username}</span></span><span className={cn('text-[0.65rem] font-bold', selected ? 'text-primary' : 'text-muted-foreground')}>{selected ? 'Added' : 'Add'}</span></button>;
              })}</div>}
              {(audienceMembers.length > 0 || audienceExclusions.length > 0) && <div className="flex flex-wrap gap-1.5">{audienceMembers.map((person) => <button key={`include-${person.id}`} type="button" onClick={() => setAudienceMembers((items) => items.filter((item) => item.id !== person.id))} className="rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[0.65rem] font-semibold text-primary">+ @{person.username} ×</button>)}{audienceExclusions.map((person) => <button key={`exclude-${person.id}`} type="button" onClick={() => setAudienceExclusions((items) => items.filter((item) => item.id !== person.id))} className="rounded-full border border-destructive/25 bg-destructive/10 px-2.5 py-1 text-[0.65rem] font-semibold text-destructive">− @{person.username} ×</button>)}</div>}
            </div>
          )}

          <div className="space-y-3 rounded-2xl border border-primary/20 bg-primary/5 p-3">
            <div className="flex items-start gap-2"><Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><div><p className="text-xs font-bold">Advanced delivery</p><p className="mt-1 text-[0.68rem] font-normal leading-relaxed text-muted-foreground">Keep a story in the active tray, save it to a Highlight, or publish directly to an archive.</p></div></div>
            <label className="block space-y-1.5 text-xs font-semibold"><span>Highlight destination</span><select value={highlightDestination} onChange={(event) => setHighlightDestination(event.target.value as typeof highlightDestination)} className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"><option value="none">No Highlight</option>{highlights.length > 0 && <option value="existing">Existing Highlight</option>}<option value="new">Create a new Highlight</option></select></label>
            {highlightDestination === 'existing' && <label className="block space-y-1.5 text-xs font-semibold"><span>Choose a Highlight</span><select value={highlightId} onChange={(event) => setHighlightId(event.target.value)} className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"><option value="">Select a collection…</option>{highlights.map((highlight) => <option key={highlight.id} value={highlight.id}>{highlight.title} · {highlight.storyIds.length} items</option>)}</select></label>}
            {highlightDestination === 'new' && <input value={highlightTitle} onChange={(event) => setHighlightTitle(event.target.value)} placeholder="Highlight name (for example, Field notes)" maxLength={60} className="h-10 w-full rounded-xl border border-border/40 bg-background/60 px-3 text-xs outline-none focus:border-primary/50" aria-label="New Highlight name" />}
            <label className="block space-y-1.5 text-xs font-semibold"><span>Publish mode</span><select value={publishMode} onChange={(event) => setPublishMode(event.target.value as typeof publishMode)} className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"><option value="active">Active Story + Highlight</option><option value="highlight_only" disabled={highlightDestination === 'none'}>Highlight only · Premium</option></select></label>
            <div className="grid gap-2 sm:grid-cols-2"><label className="block space-y-1.5 text-xs font-semibold"><span>Duration</span><select value={durationHours} onChange={(event) => setDurationHours(Number(event.target.value))} className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"><option value={24}>24 hours</option><option value={48}>48 hours · Advanced</option><option value={72}>72 hours · Advanced</option></select></label><label className="flex min-h-10 items-center gap-2 rounded-xl border border-border/50 bg-background/40 px-3 text-xs font-semibold"><input type="checkbox" checked={priority} onChange={(event) => setPriority(event.target.checked)} className="h-4 w-4 accent-primary" /><span><span className="block">Priority story</span><span className="block text-[0.65rem] font-normal text-muted-foreground">Capped ranking signal</span></span>{priority && <Check className="ml-auto h-4 w-4 text-primary" />}</label></div>
          </div>

          <div className="rounded-2xl border border-border/40 bg-background/30 p-3">
            <button type="button" onClick={() => setPollOpen((open) => !open)} className="flex w-full items-center gap-2 text-left text-xs font-bold">
              <BarChart2 className="h-3.5 w-3.5 text-primary" /> Add a poll
              <span className="ml-auto text-[0.65rem] font-mono text-muted-foreground">{pollOpen ? 'On' : 'Off'}</span>
            </button>
            {pollOpen && (
              <div className="mt-3 space-y-2">
                <input value={pollQuestion} onChange={(event) => setPollQuestion(event.target.value)} placeholder="Ask your audience a question" maxLength={240} className="h-9 w-full rounded-xl border border-border/40 bg-background/60 px-3 text-xs outline-none focus:border-primary/50" />
                {pollOptions.map((option, index) => (
                  <input key={index} value={option} onChange={(event) => setPollOptions((current) => current.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} placeholder={`Option ${index + 1}`} maxLength={80} className="h-9 w-full rounded-xl border border-border/40 bg-background/60 px-3 text-xs outline-none focus:border-primary/50" />
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="text-[0.68rem] font-mono font-bold uppercase text-muted-foreground mb-2 block">
              Canvas Background Style
            </label>
            <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-1">
              {STORY_GRADIENTS.map((g) => (
                <button
                  key={g.id}
                  onClick={() => {
                    sounds.playPop();
                    setSelectedGradient(g);
                  }}
                  className={cn(
                    "w-9 h-9 rounded-full bg-gradient-to-br shrink-0 transition-transform border-2",
                    g.css,
                    selectedGradient.id === g.id ? "scale-110 border-white ring-2 ring-primary shadow-md" : "border-transparent opacity-80"
                  )}
                  title={g.name}
                />
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={handlePublishStory}
              disabled={(storyType === 'text' && !textContent.trim()) || (storyType === 'image' && !imageUrl.trim() && !imageFile) || (storyType === 'voice' && !voiceFile) || isRecording || !contentCategory || publishing || (pollOpen && (!pollQuestion.trim() || pollOptions.filter((option) => option.trim()).length < 2))}
              className="w-full rounded-xl font-bold text-xs h-11 glow-neon-primary bg-primary text-primary-foreground"
            >
              <Send className="w-3.5 h-3.5 mr-1.5" /> {publishing ? 'Publishing…' : 'Share Story Live'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
