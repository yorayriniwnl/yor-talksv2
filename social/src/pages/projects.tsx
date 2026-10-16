import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Briefcase, ChevronRight, FolderGit2, Network, Plus, Search, UserPlus } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { api, type BackendProject, type BackendProjectInvitation, type BackendUser } from '@/lib/api-client';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';

export default function Projects() {
  const currentUser = useAppStore((state) => state.currentUser);
  const [projects, setProjects] = useState<BackendProject[]>([]);
  const [invitations, setInvitations] = useState<BackendProjectInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [invitationsLoading, setInvitationsLoading] = useState(true);
  const [invitationsFailed, setInvitationsFailed] = useState(false);
  const [query, setQuery] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedProject, setSelectedProject] = useState<BackendProject | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [saving, setSaving] = useState(false);
  const [inviteQuery, setInviteQuery] = useState('');
  const [inviteResults, setInviteResults] = useState<BackendUser[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [searchFailed, setSearchFailed] = useState(false);
  const [searchRevision, setSearchRevision] = useState(0);
  const [pendingActions, setPendingActions] = useState<Set<string>>(new Set());
  const pendingRequests = useRef(new Map<string, symbol>());
  const createPending = useRef<symbol | null>(null);
  const projectRead = useRef(0);
  const invitationRead = useRef(0);
  const mounted = useRef(true);
  const sessionOwner = useRef({ id: currentUser?.id });
  if (sessionOwner.current.id !== currentUser?.id) sessionOwner.current = { id: currentUser?.id };
  const owner = sessionOwner.current;
  const selectedProjectId = useRef(selectedProject?.id);
  selectedProjectId.current = selectedProject?.id;

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; projectRead.current++; invitationRead.current++; };
  }, []);

  const filteredProjects = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    if (!normalized) return projects;
    return projects.filter((project) => `${project.title} ${project.description ?? ''}`.toLocaleLowerCase().includes(normalized));
  }, [projects, query]);

  const loadProjects = useCallback(async () => {
    const request = ++projectRead.current;
    setLoading(true);
    setLoadFailed(false);
    const isCurrent = () => mounted.current && sessionOwner.current === owner && projectRead.current === request;
    try {
      const result = await api.getProjects();
      if (isCurrent()) setProjects(result);
    } catch {
      if (isCurrent()) setLoadFailed(true);
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, [owner]);

  const loadInvitations = useCallback(async () => {
    const request = ++invitationRead.current;
    setInvitationsLoading(true);
    setInvitationsFailed(false);
    const isCurrent = () => mounted.current && sessionOwner.current === owner && invitationRead.current === request;
    try {
      const result = await api.getProjectInvitations();
      if (isCurrent()) setInvitations(result);
    } catch {
      if (isCurrent()) setInvitationsFailed(true);
    } finally {
      if (isCurrent()) setInvitationsLoading(false);
    }
  }, [owner]);

  useEffect(() => {
    setProjects([]);
    setInvitations([]);
    setSelectedProject(null);
    setShowCreate(false);
    setSaving(false);
    createPending.current = null;
    pendingRequests.current.clear();
    setPendingActions(new Set());
    void loadProjects();
    void loadInvitations();
  }, [loadProjects, loadInvitations]);

  useEffect(() => {
    let active = true;
    const normalized = inviteQuery.trim();
    setInviteResults([]);
    setSearchFailed(false);
    if (!selectedProject || selectedProject.ownerId !== currentUser?.id || normalized.length < 2) {
      setInviteResults([]);
      setSearchingUsers(false);
      return () => { active = false; };
    }
    setSearchingUsers(true);
    const timer = window.setTimeout(() => {
      void api.searchUsers(normalized).then((users) => {
        if (active) setInviteResults(users.filter((user) => user.id !== currentUser?.id));
      }).catch(() => {
        if (active) setSearchFailed(true);
      }).finally(() => {
        if (active) setSearchingUsers(false);
      });
    }, 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [inviteQuery, selectedProject, currentUser?.id, searchRevision]);

  const startAction = (key: string) => {
    if (pendingRequests.current.has(key)) return null;
    const request = Symbol(key);
    pendingRequests.current.set(key, request);
    setPendingActions(new Set(pendingRequests.current.keys()));
    return request;
  };
  const finishAction = (key: string, request: symbol) => {
    if (pendingRequests.current.get(key) !== request) return;
    pendingRequests.current.delete(key);
    if (mounted.current) setPendingActions(new Set(pendingRequests.current.keys()));
  };

  const createProject = async () => {
    if (createPending.current) return;
    const normalizedTitle = title.trim();
    if (!normalizedTitle) {
      toast.error('Add a project title');
      return;
    }
    const request = Symbol('create-project');
    createPending.current = request;
    setSaving(true);
    try {
      const created = await api.createProject({ title: normalizedTitle, description: description.trim(), visibility });
      if (!mounted.current || sessionOwner.current !== owner) return;
      projectRead.current++;
      setLoading(false);
      setProjects((existing) => [created, ...existing.filter((project) => project.id !== created.id)]);
      setShowCreate(false);
      setTitle('');
      setDescription('');
      setVisibility('public');
      toast.success('Project created');
    } catch {
      if (mounted.current && sessionOwner.current === owner) toast.error('Project could not be created');
    } finally {
      if (createPending.current === request) {
        createPending.current = null;
        if (mounted.current && sessionOwner.current === owner) setSaving(false);
      }
    }
  };

  const inviteCollaborator = async (user: BackendUser) => {
    if (!selectedProject) return;
    const projectId = selectedProject.id;
    const actionKey = `invite:${projectId}:${user.id}`;
    const request = startAction(actionKey);
    if (!request) return;
    try {
      await api.inviteProjectCollaborator(projectId, user.id);
      if (!mounted.current || sessionOwner.current !== owner) return;
      if (selectedProjectId.current === projectId) setInviteResults((existing) => existing.filter((candidate) => candidate.id !== user.id));
      toast.success(`Invitation sent to ${user.fullName || user.username}`);
    } catch {
      if (mounted.current && sessionOwner.current === owner) toast.error('Could not send that project invitation');
    } finally {
      finishAction(actionKey, request);
    }
  };

  const respondToInvitation = async (invitation: BackendProjectInvitation, decision: 'accepted' | 'rejected') => {
    const actionKey = `respond:${invitation.project.id}`;
    const request = startAction(actionKey);
    if (!request) return;
    try {
      await api.respondToProjectInvitation(invitation.project.id, decision);
      if (!mounted.current || sessionOwner.current !== owner) return;
      invitationRead.current++;
      setInvitationsLoading(false);
      setInvitations((existing) => existing.filter((item) => item.project.id !== invitation.project.id));
      if (decision === 'accepted') {
        projectRead.current++;
        setLoading(false);
        setProjects((existing) => [invitation.project, ...existing.filter((item) => item.id !== invitation.project.id)]);
      }
      toast.success(decision === 'accepted' ? 'Project invitation accepted' : 'Project invitation declined');
    } catch {
      if (mounted.current && sessionOwner.current === owner) toast.error('Could not update that project invitation');
    } finally {
      finishAction(actionKey, request);
    }
  };

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 space-y-7 p-4 md:p-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2 text-primary"><Network aria-hidden="true" className="h-5 w-5" /><span className="text-xs font-semibold uppercase tracking-wider">Workspace</span></div>
          <h1 className="text-3xl font-black tracking-tight">Projects</h1>
          <p className="mt-1 text-sm text-muted-foreground">Plan work together and manage project invitations.</p>
        </div>
        <Button type="button" onClick={() => setShowCreate(true)}><Plus className="mr-2 h-4 w-4" />New project</Button>
      </header>

      {invitationsLoading && <p role="status" className="text-sm text-muted-foreground">Loading project invitations…</p>}
      {invitationsFailed && <section role="alert" className="space-y-3 rounded-2xl border border-border/40 p-4"><p className="text-sm">Project invitations could not be loaded.</p><Button type="button" size="sm" variant="outline" onClick={() => void loadInvitations()}>Retry project invitations</Button></section>}
      {invitations.length > 0 && <section aria-labelledby="project-invitations-heading" className="space-y-3">
        <h2 id="project-invitations-heading" className="text-lg font-bold">Invitations for you</h2>
        {invitations.map((invitation) => <article key={invitation.project.id} className="surface-1 flex flex-col gap-3 rounded-2xl border border-border/40 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h3 className="truncate font-semibold">{invitation.project.title}</h3>
            <p className="text-xs text-muted-foreground">Invited as {invitation.role} · from {invitation.project.ownerId === currentUser?.id ? 'you' : 'project owner'}</p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button type="button" size="sm" variant="outline" disabled={invitationsLoading || pendingActions.has(`respond:${invitation.project.id}`)} onClick={() => void respondToInvitation(invitation, 'rejected')}>Decline</Button>
            <Button type="button" size="sm" disabled={invitationsLoading || pendingActions.has(`respond:${invitation.project.id}`)} onClick={() => void respondToInvitation(invitation, 'accepted')}>Accept</Button>
          </div>
        </article>)}
      </section>}

      <section aria-labelledby="your-projects-heading" className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 id="your-projects-heading" className="text-lg font-bold">Your projects</h2>
          <label className="relative block w-full sm:w-72">
            <Search aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input aria-label="Search your projects" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by title or description" className="pl-9" />
          </label>
        </div>

        {loading && <p role="status" className="rounded-2xl border border-border/40 p-8 text-center text-sm text-muted-foreground">Loading projects…</p>}
        {loadFailed && <section role="alert" className="rounded-2xl border border-border/40 p-8 text-center">
          <p className="text-sm text-muted-foreground">Projects could not be loaded.</p>
          <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => void loadProjects()}>Try again</Button>
        </section>}
        {!loading && !loadFailed && filteredProjects.length === 0 && <section className="surface-1 space-y-4 rounded-3xl border border-border/40 p-8 text-center">
          <FolderGit2 aria-hidden="true" className="mx-auto h-10 w-10 text-muted-foreground" />
          <div><h3 className="font-bold">{query ? 'No matching projects' : 'No projects yet'}</h3><p className="mt-1 text-sm text-muted-foreground">{query ? 'Try another title or description.' : 'Create a project to start planning together.'}</p></div>
          {!query && <Button type="button" variant="outline" onClick={() => setShowCreate(true)}>Create your first project</Button>}
        </section>}
        {!loading && filteredProjects.length > 0 && <div className="grid gap-3">
          {filteredProjects.map((project) => <button key={project.id} type="button" onClick={() => { setSelectedProject(project); setInviteQuery(''); }}
            className="surface-1 flex w-full items-center justify-between gap-4 rounded-2xl border border-border/40 p-5 text-left transition-colors hover:border-primary/50">
            <span className="flex min-w-0 items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Briefcase aria-hidden="true" className="h-5 w-5" /></span>
              <span className="min-w-0">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="truncate font-semibold">{project.title}</span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">{project.status}</span>
                  {project.visibility === 'private' && <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">Private</span>}
                </span>
                <span className="mt-1 block line-clamp-2 text-sm text-muted-foreground">{project.description || 'No description'}</span>
              </span>
            </span>
            <ChevronRight aria-hidden="true" className="h-5 w-5 shrink-0 text-muted-foreground" />
          </button>)}
        </div>}
      </section>

      <section className="surface-1 flex items-start gap-3 rounded-2xl border border-border/40 p-5">
        <Briefcase aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
        <div><h2 className="font-semibold">Collaborate with invitations</h2><p className="mt-1 text-sm text-muted-foreground">Project owners can invite people from Yor Talks. You can accept or decline invitations above.</p></div>
      </section>

      <Dialog open={showCreate} onOpenChange={(open) => { if (!createPending.current) setShowCreate(open); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>New project</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><label htmlFor="project-title" className="text-sm font-medium">Title</label><Input id="project-title" maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Project title" /></div>
            <div className="space-y-2"><label htmlFor="project-description" className="text-sm font-medium">Description</label><textarea id="project-description" maxLength={2000} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What are you planning?" className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" /></div>
            <div className="space-y-2"><label htmlFor="project-visibility" className="text-sm font-medium">Visibility</label><select id="project-visibility" value={visibility} onChange={(event) => setVisibility(event.target.value as 'public' | 'private')} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="public">Public</option><option value="private">Private</option></select></div>
          </div>
          <DialogFooter><Button type="button" variant="outline" disabled={saving} onClick={() => setShowCreate(false)}>Cancel</Button><Button type="button" disabled={saving} onClick={() => void createProject()}>{saving ? 'Creating…' : 'Create project'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(selectedProject)} onOpenChange={(open) => { if (!open) setSelectedProject(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{selectedProject?.title}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">{selectedProject?.description || 'No description provided.'}</p>
            {selectedProject && <p className="text-xs text-muted-foreground">{selectedProject.status} · {selectedProject.visibility} · {selectedProject.ownerId === currentUser?.id ? 'Project owner' : 'Project member'}</p>}
            {selectedProject?.ownerId === currentUser?.id && <div className="space-y-3 border-t border-border/40 pt-4">
              <div><h3 className="font-semibold">Invite a collaborator</h3><p className="text-xs text-muted-foreground">Search for an existing Yor Talks account.</p></div>
              <label className="relative block"><Search aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input aria-label="Search people to invite" value={inviteQuery} onChange={(event) => setInviteQuery(event.target.value)} placeholder="Enter a name or username" className="pl-9" /></label>
              {searchingUsers && <p role="status" className="text-xs text-muted-foreground">Searching…</p>}
              {searchFailed && <div role="alert" className="space-y-2"><p className="text-xs text-muted-foreground">People could not be searched.</p><Button type="button" size="sm" variant="outline" onClick={() => setSearchRevision((value) => value + 1)}>Retry people search</Button></div>}
              {!searchingUsers && !searchFailed && inviteQuery.trim().length >= 2 && inviteResults.length === 0 && <p className="text-xs text-muted-foreground">No matching accounts found.</p>}
              <ul className="max-h-52 space-y-2 overflow-y-auto">
                {inviteResults.map((user) => <li key={user.id} className="flex items-center justify-between gap-3 rounded-xl border border-border/40 p-2">
                  <span className="flex min-w-0 items-center gap-2"><Avatar className="h-8 w-8"><AvatarImage src={user.avatarUrl ?? undefined} alt="" /><AvatarFallback>{user.fullName?.slice(0, 1) || 'Y'}</AvatarFallback></Avatar><span className="min-w-0"><span className="block truncate text-sm font-medium">{user.fullName || user.username}</span><span className="block truncate text-xs text-muted-foreground">@{user.username}</span></span></span>
                  <Button type="button" size="sm" variant="outline" disabled={pendingActions.has(`invite:${selectedProject?.id}:${user.id}`)} onClick={() => void inviteCollaborator(user)}><UserPlus aria-hidden="true" className="mr-1 h-4 w-4" />Invite</Button>
                </li>)}
              </ul>
            </div>}
          </div>
          <DialogFooter><Button type="button" variant="outline" onClick={() => setSelectedProject(null)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
