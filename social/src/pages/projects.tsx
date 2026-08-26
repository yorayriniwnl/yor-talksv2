import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Network, Plus, FolderGit2, Search, Briefcase, ChevronRight, UserPlus, FileText, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api-client';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';

export default function Projects() {
  const currentUser = useAppStore((state) => state.currentUser);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [looking, setLooking] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const result = await api.getProjects();
      setProjects(result);
    } catch (e) {
      toast.error("Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!title) { toast.error("Title is required"); return; }
    try {
      await api.createProject({ title, description, visibility: 'public', lookingForCollaborators: looking });
      toast.success("Project created successfully!");
      setShowCreate(false);
      setTitle('');
      setDescription('');
      setLooking(false);
      loadProjects();
    } catch (e) {
      toast.error("Failed to create project");
    }
  };

  return (
    <div className="flex-1 w-full max-w-[1400px] mx-auto p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Network className="w-5 h-5 text-primary" />
            <h1 className="text-3xl font-black font-display tracking-tight text-foreground uppercase">Yor Projects</h1>
          </div>
          <p className="text-sm text-muted-foreground font-mono">Build side projects, collaborate, and grow your Creator DNA</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="rounded-full shadow-lg shadow-primary/20 glow-neon-primary bg-primary text-black font-bold h-11 px-6">
          <Plus className="w-5 h-5 mr-2" /> Start Project
        </Button>
      </div>

      {/* DASHBOARD GRIDS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Col: Projects List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">My Active Projects</h2>
            <div className="relative w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search projects..." className="pl-9 h-9 text-xs rounded-full bg-zinc-900 border-zinc-800" />
            </div>
          </div>
          
          {loading ? (
            <div className="p-8 text-center text-muted-foreground font-mono text-sm">Loading projects...</div>
          ) : projects.length === 0 ? (
            <div className="surface-1 border border-border/40 p-8 rounded-3xl text-center space-y-4">
              <FolderGit2 className="w-12 h-12 text-muted-foreground mx-auto" />
              <div className="space-y-1">
                <h3 className="font-bold text-lg text-foreground">No Projects Yet</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">Create a workspace to plan your next series, invite collaborators, and build together.</p>
              </div>
              <Button onClick={() => setShowCreate(true)} variant="outline" className="rounded-full">Create your first project</Button>
            </div>
          ) : (
            <div className="grid gap-4">
              {projects.map(p => (
                <div key={p.id} className="group surface-1 border border-border/40 rounded-3xl p-5 hover:border-primary/50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-3 opacity-10">
                    <Network className="w-24 h-24" />
                  </div>
                  <div className="space-y-2 relative z-10">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shadow-[0_0_15px_rgba(var(--primary),0.3)]">
                        {p.title.charAt(0)}
                      </div>
                      <h3 className="font-bold text-lg text-foreground">{p.title}</h3>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-zinc-800 text-zinc-300 uppercase tracking-wider">{p.status}</span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-1">{p.description || "No description provided."}</p>
                  </div>
                  
                  <div className="flex items-center gap-4 relative z-10">
                    <div className="flex -space-x-2">
                      {/* Mock Avatars */}
                      <Avatar className="w-7 h-7 border-2 border-background"><AvatarImage src={currentUser?.avatarUrl} /></Avatar>
                    </div>
                    <Button variant="ghost" size="icon" className="group-hover:bg-primary/20 group-hover:text-primary rounded-full transition-colors">
                      <ChevronRight className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Col: Matches & DNA */}
        <div className="space-y-6">
          <div className="surface-1 border border-border/40 rounded-3xl p-6 relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-purple-500/10 blur-3xl rounded-full pointer-events-none" />
            <h2 className="text-sm font-bold font-display uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-purple-400" />
              Creator DNA Match
            </h2>
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Yor Talks AI analyzes your content graph to suggest the best collaborators for your projects.
              </p>
              
              <div className="space-y-3">
                {[
                  { name: "Sarah J.", role: "Video Editor", match: "98%" },
                  { name: "DevMaster", role: "Co-host", match: "92%" },
                ].map(match => (
                  <div key={match.name} className="flex items-center justify-between p-3 rounded-2xl bg-black/40 border border-white/5">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-8 h-8"><AvatarImage src={`https://ui-avatars.com/api/?name=${match.name}`} /></Avatar>
                      <div>
                        <div className="text-xs font-bold">{match.name}</div>
                        <div className="text-[10px] text-muted-foreground">{match.role}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-purple-400 font-bold">{match.match}</span>
                      <Button size="icon" className="w-6 h-6 rounded-full bg-zinc-800 hover:bg-primary hover:text-black"><UserPlus className="w-3 h-3" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CREATE DIALOG */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-[425px] rounded-3xl border-border/40 surface-1">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display text-xl">
              <FolderGit2 className="w-5 h-5 text-primary" /> New Project Workspace
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Project Title</label>
              <Input 
                value={title} 
                onChange={(e) => setTitle(e.target.value)} 
                placeholder="e.g., Summer Series 2026" 
                className="bg-zinc-950/50 border-border/40 focus-visible:ring-primary rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Description</label>
              <Input 
                value={description} 
                onChange={(e) => setDescription(e.target.value)} 
                placeholder="What are we building?" 
                className="bg-zinc-950/50 border-border/40 focus-visible:ring-primary rounded-xl"
              />
            </div>
            
            <button type="button" aria-pressed={looking} className="w-full text-left p-3 border border-border/40 rounded-xl bg-zinc-950/50 flex items-center justify-between cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setLooking(!looking)}>
              <div>
                <div className="text-sm font-bold text-foreground">Looking for Collaborators</div>
                <div className="text-[10px] text-muted-foreground">Allow others to apply to join via Creator DNA.</div>
              </div>
              <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${looking ? 'bg-primary border-primary text-black' : 'border-muted-foreground'}`}>
                {looking && <CheckCircle2 className="w-4 h-4" />}
              </div>
            </button>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreate(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={handleCreate} className="rounded-xl bg-primary hover:bg-primary/90 text-black font-bold">Initialize</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
