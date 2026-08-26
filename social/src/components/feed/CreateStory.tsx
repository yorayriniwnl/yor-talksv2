import * as React from 'react';
import { useState, useRef, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { api } from '@/lib/api-client';
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Image as ImageIcon, Type, Mic, Upload, X } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { ContentCategorySelect } from '@/components/content/ContentCategorySelect';
import { type ContentCategory } from '@/lib/content-category';

const GRADIENTS = [
  'from-violet-500 to-fuchsia-500',
  'from-blue-500 to-cyan-400',
  'from-orange-500 to-rose-500',
  'from-emerald-500 to-teal-400',
  'from-pink-500 to-rose-400',
  'from-indigo-500 to-blue-500'
];

export function CreateStory({ children }: { children: React.ReactNode }) {
  const addStory = useAppStore((s) => s.addStory);
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('photo');
  
  // Text state
  const [text, setText] = useState('');
  const [gradient, setGradient] = useState(GRADIENTS[0]);
  const [contentCategory, setContentCategory] = useState<ContentCategory | ''>('');
  
  // Photo state
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [publishing, setPublishing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imagePreviewRef = useRef<string | null>(null);

  const releaseImagePreview = () => {
    const url = imagePreviewRef.current;
    if (url?.startsWith('blob:')) URL.revokeObjectURL(url);
    imagePreviewRef.current = null;
  };

  useEffect(() => () => releaseImagePreview(), []);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      releaseImagePreview();
      const url = URL.createObjectURL(file);
      imagePreviewRef.current = url;
      setImagePreview(url);
      setImageFile(file);
    }
  };

  const publish = async () => {
    if (!contentCategory) return;
    setPublishing(true);
    try {
      if (activeTab === 'text') {
        if (!text.trim()) return;
        await addStory({
        type: 'text', 
        mediaUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1200&auto=format&fit=crop',
        textContent: text.trim(), 
        backgroundGradient: gradient,
        contentCategory,
        });
      } else if (activeTab === 'photo') {
        if (!imageFile) return;
        const uploaded = await api.uploadMedia(imageFile);
        await addStory({
        type: 'image', 
        mediaUrl: uploaded.url,
        contentCategory,
        });
      } else {
        return;
      }
    
      setText('');
      releaseImagePreview();
      setImagePreview(null);
      setImageFile(null);
      setContentCategory('');
      setOpen(false);
    } catch {
      // The store/API surfaces the failure to the user.
    } finally {
      setPublishing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-background border-border/50">
        <DialogTitle className="sr-only">Create Story</DialogTitle>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-3 h-14 rounded-none bg-muted/30 border-b border-border/50">
            <TabsTrigger value="photo" className="gap-2">
              <ImageIcon className="w-4 h-4" /> Photo
            </TabsTrigger>
            <TabsTrigger value="text" className="gap-2">
              <Type className="w-4 h-4" /> Text
            </TabsTrigger>
            <TabsTrigger value="voice" className="gap-2">
              <Mic className="w-4 h-4" /> Voice
            </TabsTrigger>
          </TabsList>
          <div className="px-4 pt-4">
            <ContentCategorySelect id="legacy-story-content-category" value={contentCategory} onChange={setContentCategory} />
          </div>
          
          <div className="aspect-[9/16] sm:aspect-auto sm:h-[500px] relative">
            <TabsContent value="photo" className="m-0 h-full">
              <div className="w-full h-full flex flex-col p-4 gap-4">
                <div 
                  className="flex-1 bg-muted/30 border-2 border-dashed border-border/60 rounded-xl overflow-hidden flex flex-col items-center justify-center relative"
                  onClick={() => !imagePreview && !publishing && fileInputRef.current?.click()}
                >
                  {imagePreview ? (
                    <>
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                      <button 
                        onClick={(e) => { e.stopPropagation(); releaseImagePreview(); setImagePreview(null); setImageFile(null); }}
                        className="absolute top-2 right-2 bg-black/50 text-white p-2 rounded-full backdrop-blur-md"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-3 text-muted-foreground cursor-pointer hover:text-foreground transition-colors p-6 text-center">
                      <div className="w-12 h-12 rounded-full bg-background/50 flex items-center justify-center">
                        <Upload className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">Click to upload photo</p>
                        <p className="text-sm mt-1">Supports JPG, PNG</p>
                      </div>
                    </div>
                  )}
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*"
                    onChange={handleImageSelect} 
                  />
                </div>
                <Button 
                  className="w-full rounded-full" 
                  size="lg" 
                  onClick={() => void publish()}
                  disabled={publishing}
                >
                  Share moment
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="text" className="m-0 h-full flex flex-col">
              <div className={`flex-1 flex items-center justify-center p-8 bg-gradient-to-br ${gradient} transition-colors duration-500`}>
                <Textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Type something..."
                  maxLength={200}
                  className="w-full bg-transparent text-white text-center text-2xl font-display font-semibold placeholder:text-white/60 outline-none resize-none border-none focus-visible:ring-0"
                  rows={5}
                />
              </div>
              <div className="p-4 bg-background border-t border-border/50 flex flex-col gap-4">
                <div className="flex items-center justify-center gap-2">
                  {GRADIENTS.map((g) => (
                    <button
                      key={g}
                      onClick={() => setGradient(g)}
                      className={`w-8 h-8 rounded-full bg-gradient-to-br ${g} transition-transform ${gradient === g ? 'scale-110 ring-2 ring-primary ring-offset-2 ring-offset-background' : 'hover:scale-105'}`}
                      aria-label="Select background gradient"
                    />
                  ))}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">{text.length}/200</span>
                  <Button 
                    className="rounded-full px-8" 
                    onClick={() => void publish()}
                    disabled={!text.trim() || publishing}
                  >
                    Share moment
                  </Button>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="voice" className="m-0 h-full">
              <div className="w-full h-full bg-gradient-to-br from-neutral-800 to-neutral-900 flex flex-col items-center justify-center gap-4 text-white/80 p-6 text-center">
                <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center">
                  <Mic className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">Voice Stories</h3>
                  <p className="text-sm max-w-[200px] mx-auto">Voice stories are coming soon. Stay tuned!</p>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
