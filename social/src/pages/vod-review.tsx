import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Tv, PenTool, Play, Pause, Download, Plus, 
  Trash2, Sparkles, CheckCircle2, Clock, Swords, Shield 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface VODNote {
  id: string;
  timestamp: string;
  author: string;
  tag: string;
  note: string;
}

const INITIAL_NOTES: VODNote[] = [
  {
    id: 'n-1',
    timestamp: '03:42',
    author: 'Coach Hellranger',
    tag: 'B-SITE HOLD',
    note: 'Smoke deployment was 2 seconds late on B-Main. Viper wall gap exposed Heaven angle.'
  },
  {
    id: 'n-2',
    timestamp: '08:15',
    author: 'IGL Shiva',
    tag: 'RETRO ROTATION',
    note: 'Excellent 3-man bait and rotate through Mid link. Enemy squad committed all utility early.'
  }
];

export default function VODReviewStudio() {
  const [notes, setNotes] = useState<VODNote[]>(INITIAL_NOTES);
  const [newTimestamp, setNewTimestamp] = useState('11:30');
  const [newTag, setNewTag] = useState('ENTRY FRAG');
  const [newNote, setNewNote] = useState('');
  const [activeTool, setActiveTool] = useState<'laser' | 'arrow' | 'circle'>('laser');

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    sounds.playPop();
    const item: VODNote = {
      id: Date.now().toString(),
      timestamp: newTimestamp,
      author: 'Tactical Coach (You)',
      tag: newTag.toUpperCase(),
      note: newNote.trim()
    };
    setNotes([item, ...notes]);
    setNewNote('');
    toast.success('🎯 Tactical Timestamp Note logged to Clan War Room!');
  };

  const handleExportPDF = () => {
    sounds.playChime();
    triggerConfetti();
    toast.success('📑 Official Esports VOD Coaching Report generated in PDF format!');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Tv className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Clan Scrims VOD Review & Playbook Annotator</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Frame-by-Frame Tactical Video Analysis & Coach Telemetry</p>
          </div>
        </div>

        <Button
          onClick={handleExportPDF}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Download className="w-3.5 h-3.5 mr-1" /> Export Coach Report
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Main Video & Drawing Canvas Column */}
          <div className="lg:col-span-7 space-y-4">
            <div className="surface-1 rounded-3xl p-4 border border-border/40 shadow-2xl overflow-hidden relative">
              <div className="aspect-video rounded-2xl overflow-hidden bg-black relative flex flex-col justify-between p-4">
                <img
                  src="https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=800&auto=format&fit=crop"
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover opacity-75"
                />

                {/* Overlays */}
                <div className="relative z-10 flex justify-between items-center">
                  <span className="px-3 py-1 rounded-full bg-red-600 text-white text-[0.65rem] font-mono font-bold">
                    SCRIM VOD · ASCENT B-SITE
                  </span>
                  <span className="text-[0.65rem] font-mono text-white/90 bg-black/70 px-2.5 py-0.5 rounded-full">
                    PLAYBACK SPEED: 1.0x
                  </span>
                </div>

                {/* Drawing Annotations Mock */}
                <div className="relative z-10 text-center space-y-1 mb-2">
                  <span className="px-3 py-1 rounded-full bg-amber-400/90 text-black text-xs font-mono font-bold">
                    ⚠️ FLANK EXPOSURE VECTOR IDENTIFIED
                  </span>
                </div>
              </div>
            </div>

            {/* Tactical Drawing Toolbar */}
            <div className="surface-1 p-4 rounded-2xl border border-border/40 flex items-center justify-between font-mono text-xs">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground mr-1">Drawing Tool:</span>
                {[
                  { id: 'laser', name: 'Laser Pen ✏️' },
                  { id: 'arrow', name: 'Squad Vector 🏹' },
                  { id: 'circle', name: 'Smoke Radius ⭕' }
                ].map((tool) => (
                  <Button
                    key={tool.id}
                    size="sm"
                    variant={activeTool === tool.id ? 'default' : 'outline'}
                    onClick={() => {
                      sounds.playPop();
                      setActiveTool(tool.id as any);
                    }}
                    className={cn("rounded-xl text-xs h-8", activeTool === tool.id && "bg-primary text-primary-foreground")}
                  >
                    {tool.name}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Timestamped Tactical Notes Column */}
          <div className="lg:col-span-5 space-y-4">
            {/* Add Note Card */}
            <div className="surface-1 p-5 rounded-3xl border border-border/40 space-y-3 shadow-sm font-sans">
              <div className="showcase-section-title">
                <Plus className="w-4 h-4 text-primary" />
                <h3>Log Timestamped Note</h3>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={newTimestamp}
                  onChange={(e) => setNewTimestamp(e.target.value)}
                  placeholder="MM:SS"
                  className="rounded-xl text-xs font-mono"
                />
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="TAG (e.g. ROTATION)"
                  className="rounded-xl text-xs font-mono uppercase"
                />
              </div>

              <Input
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Tactical coaching observation..."
                className="rounded-xl text-xs"
              />

              <Button
                onClick={handleAddNote}
                className="w-full rounded-2xl font-bold text-xs h-10 bg-primary text-primary-foreground glow-neon-primary"
              >
                Log Note to Playbook
              </Button>
            </div>

            {/* Notes List */}
            <div className="space-y-3">
              {notes.map((n) => (
                <div key={n.id} className="surface-1 p-4 rounded-2xl border border-border/40 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30 font-mono font-bold text-[0.65rem]">
                      {n.timestamp} &middot; {n.tag}
                    </span>
                    <span className="text-[0.65rem] font-mono text-muted-foreground">{n.author}</span>
                  </div>
                  <p className="text-foreground/90 leading-relaxed font-sans">{n.note}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
