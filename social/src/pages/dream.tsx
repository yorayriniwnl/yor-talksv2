import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'wouter';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  CircleDashed,
  Eye,
  EyeOff,
  Lightbulb,
  Loader2,
  Plus,
  Rocket,
  Sparkles,
  Users,
  WandSparkles,
} from 'lucide-react';
import { api, type BackendProject } from '@/lib/api-client';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type DreamBlueprint = {
  title: string;
  brief: string;
  roles: string[];
  milestones: string[];
};

const DREAM_STARTERS = [
  'Shoot a strange five-minute film with people I meet here',
  'Build a tiny product that fixes one annoying everyday problem',
  'Create a night where musicians and visual artists improvise together',
  'Start a research circle around an idea nobody is discussing yet',
];

function cleanTitle(input: string) {
  const firstThought = input.split(/[.!?\n]/)[0].trim();
  const withoutPrefix = firstThought.replace(/^(i\s+(want|would like|need|plan)\s+to|let'?s|help me)\s+/i, '');
  const words = withoutPrefix.split(/\s+/).filter(Boolean).slice(0, 9);
  const title = words.join(' ') || 'Untitled dream';
  return title.charAt(0).toUpperCase() + title.slice(1);
}

function buildBlueprint(input: string): DreamBlueprint {
  const text = input.toLowerCase();
  let roles = ['Maker', 'Visual thinker', 'Community connector'];
  let milestones = ['Name the smallest version worth making', 'Find two people who make the idea stronger', 'Put the first proof into the world'];

  if (/(film|video|documentary|cinema|shoot)/.test(text)) {
    roles = ['Director / storyteller', 'Camera + light', 'Editor + sound'];
    milestones = ['Write a one-page treatment', 'Assemble a tiny cast and crew', 'Shoot and screen a first cut'];
  } else if (/(app|product|code|software|website|platform|startup)/.test(text)) {
    roles = ['Product designer', 'Builder / engineer', 'Research + storytelling'];
    milestones = ['Interview five real users', 'Build the smallest working prototype', 'Put it in ten hands and learn'];
  } else if (/(event|night|meetup|festival|concert|workshop)/.test(text)) {
    roles = ['Experience producer', 'Community host', 'Visual + sound lead'];
    milestones = ['Define the feeling and format', 'Lock a place, date, and first collaborators', 'Invite the first twenty people personally'];
  } else if (/(research|study|paper|science|experiment)/.test(text)) {
    roles = ['Research lead', 'Data / field investigator', 'Writer + visualizer'];
    milestones = ['Turn curiosity into one sharp question', 'Collect the first useful evidence', 'Publish an open field note'];
  } else if (/(music|album|song|band|audio|podcast)/.test(text)) {
    roles = ['Artist / host', 'Producer + sound', 'Visual storyteller'];
    milestones = ['Capture the creative premise', 'Record a rough first session', 'Release one honest piece and gather listeners'];
  }

  return {
    title: cleanTitle(input),
    brief: input.trim(),
    roles,
    milestones,
  };
}

export default function Dream() {
  const addPost = useAppStore((state) => state.addPost);
  const [idea, setIdea] = useState('');
  const [blueprint, setBlueprint] = useState<DreamBlueprint | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [openToPeople, setOpenToPeople] = useState(true);
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [announce, setAnnounce] = useState(true);
  const [activating, setActivating] = useState(false);
  const [createdProject, setCreatedProject] = useState<BackendProject | null>(null);
  const [projects, setProjects] = useState<BackendProject[]>([]);
  const titleFieldRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    api.getProjects().then(setProjects).catch(() => setProjects([]));
  }, []);

  useEffect(() => {
    const titleField = titleFieldRef.current;
    if (!titleField || !blueprint) return;
    titleField.style.height = 'auto';
    titleField.style.height = `${titleField.scrollHeight}px`;
  }, [blueprint]);

  const activeProjects = useMemo(
    () => projects.filter((project) => project.status !== 'completed' && project.status !== 'cancelled').slice(0, 4),
    [projects],
  );

  const shapeDream = () => {
    if (idea.trim().length < 16) {
      toast.error('Give the dream a little more detail so Yor can shape a useful starting point.');
      return;
    }
    const next = buildBlueprint(idea);
    setBlueprint(next);
    setSelectedRoles(next.roles);
    setCreatedProject(null);
  };

  const activateDream = async () => {
    if (!blueprint) return;
    setActivating(true);
    try {
      const roleLine = selectedRoles.length ? `\n\nPeople who would make this stronger: ${selectedRoles.join(', ')}.` : '';
      const milestoneLine = `\n\nFirst moves:\n${blueprint.milestones.map((item, index) => `${index + 1}. ${item}`).join('\n')}`;
      const created = await api.createProject({
        title: blueprint.title,
        description: `${blueprint.brief}${roleLine}${milestoneLine}`,
        visibility,
        lookingForCollaborators: openToPeople,
      });
      setProjects((current) => [created, ...current.filter((project) => project.id !== created.id)]);
      setCreatedProject(created);

      if (announce && visibility === 'public') {
        const invitation = openToPeople && selectedRoles.length
          ? ` I’m looking for ${selectedRoles.join(', ')}.`
          : '';
        await addPost(`🌱 I just activated a dream: ${blueprint.title}. ${blueprint.brief}${invitation}`);
      }
      toast.success('Your dream is now a real project.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not activate this dream.');
    } finally {
      setActivating(false);
    }
  };

  const reset = () => {
    setIdea('');
    setBlueprint(null);
    setSelectedRoles([]);
    setCreatedProject(null);
    setOpenToPeople(true);
    setVisibility('public');
    setAnnounce(true);
  };

  return (
    <div className="yor-product-page dream-page">
      <div className="yor-product-wrap dream-wrap">
        <header className="dream-heading">
          <span className="yor-eyebrow"><WandSparkles className="h-3.5 w-3.5" /> Dream engine</span>
          <h1>Say what should exist.<br /><span>Yor helps it begin.</span></h1>
          <p>A thought becomes a brief, the brief finds people, and the people make something real.</p>
        </header>

        <section className="dream-engine">
          <div className="dream-engine__rail" aria-label="Dream progress">
            {[
              ['01', 'Intent', Boolean(idea)],
              ['02', 'Shape', Boolean(blueprint)],
              ['03', 'People', selectedRoles.length > 0],
              ['04', 'Activate', Boolean(createdProject)],
            ].map(([number, label, complete], index) => (
              <div key={String(number)} className={cn('dream-step', complete && 'is-complete', !blueprint && index > 0 && 'is-dormant')}>
                <span>{complete ? <Check className="h-3.5 w-3.5" /> : number}</span>
                <strong>{label}</strong>
              </div>
            ))}
          </div>

          <div className="dream-engine__workspace">
            {!blueprint ? (
              <div className="dream-intent">
                <div className="dream-intent__prompt">
                  <Lightbulb className="h-5 w-5" />
                  <div><span>Start unfinished</span><strong>What do you wish someone would make?</strong></div>
                </div>
                <Textarea
                  value={idea}
                  onChange={(event) => setIdea(event.target.value)}
                  placeholder="I want to..."
                  rows={6}
                  maxLength={1_200}
                  autoFocus
                  className="dream-intent__textarea"
                />
                <div className="dream-intent__footer">
                  <span>{idea.length}/1200 · messy is welcome</span>
                  <Button onClick={shapeDream} className="yor-primary-action">
                    Shape this dream <Sparkles className="h-4 w-4" />
                  </Button>
                </div>
                <div className="dream-starters">
                  <span>Or borrow a spark</span>
                  <div>
                    {DREAM_STARTERS.map((starter) => (
                      <button key={starter} onClick={() => setIdea(starter)}>{starter}<ArrowRight className="h-3.5 w-3.5" /></button>
                    ))}
                  </div>
                </div>
              </div>
            ) : createdProject ? (
              <div className="dream-activated">
                <div className="dream-activated__mark"><Rocket className="h-7 w-7" /></div>
                <span>Dream activated</span>
                <h2>{createdProject.title}</h2>
                <p>This is no longer an idea in a text box. It is a persisted project with a place to gather people and keep moving.</p>
                <div className="dream-activated__actions">
                  <Link href="/projects" className="yor-primary-action">Open project space <ArrowRight className="h-4 w-4" /></Link>
                  <button onClick={reset} className="yor-secondary-action"><Plus className="h-4 w-4" /> Start another dream</button>
                </div>
              </div>
            ) : (
              <div className="dream-blueprint">
                <div className="dream-blueprint__topline">
                  <span><Sparkles className="h-3.5 w-3.5" /> Living brief</span>
                  <button onClick={() => setBlueprint(null)}>Edit intent</button>
                </div>

                <label className="yor-field dream-title-field">
                  <span>Give it a name</span>
                  <Textarea
                    ref={titleFieldRef}
                    value={blueprint.title}
                    onChange={(event) => setBlueprint({ ...blueprint, title: event.target.value })}
                    maxLength={120}
                    rows={1}
                  />
                </label>

                <div className="dream-blueprint__grid">
                  <div className="dream-panel">
                    <span className="dream-panel__label">The first three moves</span>
                    <ol>
                      {blueprint.milestones.map((milestone, index) => (
                        <li key={milestone}><span>0{index + 1}</span><p>{milestone}</p></li>
                      ))}
                    </ol>
                  </div>

                  <div className="dream-panel">
                    <span className="dream-panel__label">People who change the outcome</span>
                    <div className="dream-role-list">
                      {blueprint.roles.map((role) => {
                        const selected = selectedRoles.includes(role);
                        return (
                          <button
                            key={role}
                            onClick={() => setSelectedRoles((current) => selected ? current.filter((item) => item !== role) : [...current, role])}
                            className={cn(selected && 'is-selected')}
                          >
                            <span>{selected ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}</span>
                            {role}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="dream-controls">
                  <label>
                    <span className="dream-control-icon"><Users className="h-4 w-4" /></span>
                    <div><strong>Open to collaborators</strong><small>Let people signal that they can help.</small></div>
                    <Switch checked={openToPeople} onCheckedChange={setOpenToPeople} />
                  </label>
                  <button onClick={() => setVisibility((current) => current === 'public' ? 'private' : 'public')}>
                    <span className="dream-control-icon">{visibility === 'public' ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}</span>
                    <div><strong>{visibility === 'public' ? 'Visible to the world' : 'Private workspace'}</strong><small>Click to change who can find it.</small></div>
                    <span className="dream-control-value">{visibility}</span>
                  </button>
                  <label className={cn(visibility === 'private' && 'is-disabled')}>
                    <span className="dream-control-icon"><Sparkles className="h-4 w-4" /></span>
                    <div><strong>Plant an announcement seed</strong><small>Invite your orbit when this becomes real.</small></div>
                    <Switch checked={announce && visibility === 'public'} onCheckedChange={setAnnounce} disabled={visibility === 'private'} />
                  </label>
                </div>

                <Button onClick={activateDream} disabled={activating || !blueprint.title.trim()} className="dream-activate">
                  {activating ? <><Loader2 className="h-4 w-4 animate-spin" /> Activating…</> : <><Rocket className="h-4 w-4" /> Activate this dream</>}
                </Button>
              </div>
            )}
          </div>
        </section>

        <section className="dream-existing">
          <div className="pulse-section-title">
            <div><span>Your momentum</span><h2>Dreams already in motion</h2></div>
            <Link href="/projects">See workspace <ArrowRight className="h-4 w-4" /></Link>
          </div>
          {activeProjects.length > 0 ? (
            <div className="dream-project-list">
              {activeProjects.map((project) => (
                <Link href="/projects" key={project.id}>
                  <span className="dream-project-list__mark">{project.status === 'active' ? <CheckCircle2 className="h-4 w-4" /> : <CircleDashed className="h-4 w-4" />}</span>
                  <div><strong>{project.title}</strong><small>{project.status} · {project.lookingForCollaborators ? 'open to people' : 'private team'}</small></div>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              ))}
            </div>
          ) : (
            <p className="dream-existing__empty">The space is empty on purpose. Your first activated dream will live here.</p>
          )}
        </section>
      </div>
    </div>
  );
}
