import { useEffect, useRef, useState, type FormEvent, type MouseEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowDown, ArrowRight, ArrowUpRight, Bookmark, Camera, Check, CheckCheck,
  ChevronLeft, ChevronRight, Compass, Heart, House, Maximize2, MessageCircle,
  Palette, Play, Plus, Send, ShieldCheck, SlidersHorizontal, Sparkles, Users, X,
} from 'lucide-react';

type Preview = 'feed' | 'messages' | 'communities' | 'studio';
type Look = 'original' | 'golden' | 'mono';

const SAMPLE_IMAGE = `${import.meta.env.BASE_URL}images/yor-discovery-still-life-v1.jpg`;
const VIEWS = [
  { id: 'feed', label: 'Your feed', icon: House, title: 'A feed with your point of view.', copy: 'Discover a moment, save an idea, or leave a little love. Your everyday has a home here.', action: 'Save a moment, or open Reply and add a thought.' },
  { id: 'messages', label: 'Messages', icon: MessageCircle, title: 'A hello can become a whole plan.', copy: 'Take the conversation somewhere. From a quick message to a group with your favourite people.', action: 'Write a message in the sample conversation.' },
  { id: 'communities', label: 'Communities', icon: Users, title: 'Find your kind of people.', copy: 'Photography, music, design. Follow a curiosity and find a place to share it.', action: 'Choose a community and try joining it.' },
  { id: 'studio', label: 'Studio', icon: Palette, title: 'From a little inspiration to your next post.', copy: 'Give a moment your own look. Create something, then bring it straight into the conversation.', action: 'Choose a look and add your creation to the demo feed.' },
] as const;

const CIRCLES = [
  { name: 'The photo walk', topic: 'PHOTOGRAPHY', initials: 'pw', tone: 'blue', tagline: 'A different way to see the everyday.', note: 'Good light. A slower walk. A new way to see the familiar.', prompt: 'This week’s prompt: find something extraordinary on your usual route.' },
  { name: 'On repeat', topic: 'MUSIC & CULTURE', initials: 'or', tone: 'peach', tagline: 'For the song you have to share.', note: 'For the track you cannot stop playing, and the people who understand why.', prompt: 'The listening room: what is the one track you wish everyone knew?' },
  { name: 'Made of ideas', topic: 'DESIGN & MAKING', initials: 'mi', tone: 'sage', tagline: 'Good things start with a what if.', note: 'A thoughtful corner for work in progress and a little encouragement.', prompt: 'Work in progress welcome. Share one thing you are making this week.' },
] as const;

const LOOKS: { id: Look; name: string; filter: string }[] = [
  { id: 'original', name: 'Original', filter: 'none' },
  { id: 'golden', name: 'Golden hour', filter: 'sepia(.35) saturate(1.25) brightness(1.08)' },
  { id: 'mono', name: 'Monochrome', filter: 'grayscale(1) contrast(1.12)' },
];

function Avatar({ children, tone = 'peach', className = '' }: { children: ReactNode; tone?: string; className?: string }) {
  return <span className={`yd-avatar yd-avatar--${tone} ${className}`}>{children}</span>;
}

export default function YorSocialPreview() {
  const [view, setView] = useState<Preview>('feed');
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [replies, setReplies] = useState(false);
  const [replyDraft, setReplyDraft] = useState('');
  const [visitorReplies, setVisitorReplies] = useState<string[]>([]);
  const [circle, setCircle] = useState(0);
  const [joined, setJoined] = useState<number[]>([]);
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<string[]>([]);
  const [look, setLook] = useState<Look>('original');
  const [caption, setCaption] = useState('A little colour. A different perspective.');
  const [creation, setCreation] = useState<{ caption: string; look: Look } | null>(null);
  const [feedMode, setFeedMode] = useState<'discover' | 'saved'>('discover');
  const [tour, setTour] = useState(false);
  const [tourComplete, setTourComplete] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  const expandButton = useRef<HTMLButtonElement>(null);
  const messageEnd = useRef<HTMLDivElement>(null);
  const demoPanel = useRef<HTMLDivElement>(null);
  const messageInput = useRef<HTMLInputElement>(null);
  const tourStartButton = useRef<HTMLButtonElement>(null);
  const tourCompleteHeading = useRef<HTMLHeadingElement>(null);
  const tourCompletePanel = useRef<HTMLDivElement>(null);
  const replyInput = useRef<HTMLInputElement>(null);
  const restoreFocus = useRef(false);
  const activeIndex = VIEWS.findIndex(item => item.id === view);
  const activeView = VIEWS[activeIndex];
  const currentCircle = CIRCLES[circle];
  const hasJoined = joined.includes(circle);

  useEffect(() => {
    if (expanded) {
      dialog.current?.showModal();
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      restoreFocus.current = true;
      return () => { document.body.style.overflow = previousOverflow; };
    }
    if (restoreFocus.current) {
      expandButton.current?.focus();
      restoreFocus.current = false;
    }
  }, [expanded]);

  useEffect(() => {
    const panel = messageEnd.current?.parentElement;
    if (panel) panel.scrollTop = panel.scrollHeight;
  }, [messages, view, expanded]);

  function changeView(next: Preview, focusPanel = false) {
    setView(next);
    if (focusPanel) requestAnimationFrame(() => demoPanel.current?.focus({ preventScroll: true }));
  }

  function sendMessage(event: FormEvent) {
    event.preventDefault();
    const content = draft.trim();
    if (!content) return;
    setMessages(previous => [...previous, content]);
    setDraft('');
    setAnnouncement('Message added to this demo conversation.');
    messageInput.current?.focus({ preventScroll: true });
  }

  function sendReply(event: FormEvent) {
    event.preventDefault();
    const content = replyDraft.trim();
    if (!content) return;
    setVisitorReplies(previous => [...previous, content]);
    setReplyDraft('');
    setAnnouncement('Your reply was added to this demo post.');
    replyInput.current?.focus({ preventScroll: true });
  }

  function toggleReplies() {
    setReplies(!replies);
    if (!replies) requestAnimationFrame(() => replyInput.current?.focus({ preventScroll: true }));
  }

  function publishCreation() {
    setCreation({ caption: caption.trim() || 'A moment, made yours.', look });
    setFeedMode('discover');
    setLiked(false);
    setSaved(false);
    setReplies(false);
    setVisitorReplies([]);
    setReplyDraft('');
    changeView('feed', !tour);
    if (tour) {
      completeTour('Your creation is in the demo feed. Tour complete. Nothing has been posted publicly.');
    } else {
      setAnnouncement('Your creation is in the demo feed. Nothing has been posted publicly.');
    }
  }

  function startTour() {
    setTour(true);
    setTourComplete(false);
    setFeedMode('discover');
    changeView('feed', true);
  }

  function completeTour(message = 'Tour complete. Keep exploring, or join the launch list to make it yours.') {
    setTour(false);
    setTourComplete(true);
    setAnnouncement(message);
    requestAnimationFrame(() => {
      tourCompletePanel.current?.scrollIntoView({ block: 'nearest' });
      tourCompleteHeading.current?.focus({ preventScroll: true });
    });
  }

  function nextTourStep() {
    if (activeIndex === VIEWS.length - 1) {
      completeTour();
    } else changeView(VIEWS[activeIndex + 1].id, true);
  }

  function endTour() {
    setTour(false);
    requestAnimationFrame(() => tourStartButton.current?.focus({ preventScroll: true }));
  }

  function goToSignup(event: MouseEvent<HTMLAnchorElement>) {
    if (!expanded) return;
    event.preventDefault();
    restoreFocus.current = false;
    setExpanded(false);
    requestAnimationFrame(() => {
      const signup = document.getElementById('pr-signup');
      signup?.focus({ preventScroll: true });
      signup?.scrollIntoView({ block: 'start' });
    });
  }

  const appWindow = (
    <div className="yd-window">
      <div className="yd-window-bar">
        <span className="yd-window-dots" aria-hidden="true"><i /><i /><i /></span>
        <span className="yd-window-address"><ShieldCheck size={13} aria-hidden="true" /> A little look inside your next favourite place</span>
        <div className="yd-window-tools">
          <span className="yd-demo-badge"><i /> INTERACTIVE DEMO</span>
          {!tour && <button className="yd-top-tour" type="button" onClick={startTour}><Play size={12} aria-hidden="true" />{tourComplete ? 'Replay tour' : 'Take the tour'}</button>}
          {tour && <span className="yd-top-progress" aria-label={`Tour step ${activeIndex + 1} of ${VIEWS.length}`}><span aria-hidden="true">{VIEWS.map((item, index) => <i key={item.id} className={index <= activeIndex ? 'is-reached' : ''} />)}</span> {activeIndex + 1} / {VIEWS.length}</span>}
          <button ref={expanded ? undefined : expandButton} type="button" onClick={() => setExpanded(!expanded)} aria-label={expanded ? 'Close expanded demo' : 'Expand demo'}>
            {expanded ? <X size={17} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>
      <div className="yd-app">
        <aside className="yd-sidebar">
          <div className="yd-brand">yor talks<span aria-hidden="true">✳</span></div>
          <span className="yd-sidebar-label">YOUR LITTLE UNIVERSE</span>
          <div className="yd-navigation" role="group" aria-label="Preview Yor Talks features">
            {VIEWS.map(({ id, label, icon: Icon }) => (
              <button key={id} type="button" aria-pressed={view === id} aria-controls="yd-demo-panel" onClick={() => changeView(id)}>
                <Icon size={19} strokeWidth={1.6} aria-hidden="true" /><span>{label}</span>
                {view === id && <span className="yd-nav-dot" aria-hidden="true" />}
              </button>
            ))}
          </div>
          <button className="yd-create-button" type="button" onClick={() => changeView('studio', true)}><Plus size={17} /> Create something</button>
          <div className="yd-sidebar-bottom">
            <div className="yd-sidebar-note"><Sparkles size={18} aria-hidden="true" /><p>A little less ordinary.<br /><strong>A little more you.</strong></p></div>
            <div className="yd-demo-profile"><Avatar tone="sage">y.</Avatar><div><strong>Your next chapter</strong><span>Make yourself at home</span></div></div>
          </div>
        </aside>

        <div className="yd-content" id="yd-demo-panel" ref={demoPanel} tabIndex={-1} role="region" aria-label={`${activeView.label} demo`}>
          {view === 'feed' && <>
            <div className="yd-view-heading"><div><span className="yd-eyebrow">YOUR WORLD, IN GOOD COMPANY</span><h2>Stay a little curious.</h2></div><Compass size={25} strokeWidth={1.3} aria-hidden="true" /></div>
            <div className="yd-feed-tabs" role="group" aria-label="Demo feed filter">
              <button type="button" aria-pressed={feedMode === 'discover'} onClick={() => setFeedMode('discover')}>Discover</button>
              <button type="button" aria-pressed={feedMode === 'saved'} onClick={() => setFeedMode('saved')}>Saved <Bookmark size={12} aria-hidden="true" /></button>
              <span>YOUR DAILY DOSE OF POSSIBILITY</span>
            </div>
            {feedMode === 'saved' && !saved ? <div className="yd-empty">
              <Bookmark size={30} strokeWidth={1.2} aria-hidden="true" /><h3>Keep a little inspiration.</h3><p>Save the sample post and it will be waiting right here.</p>
              <button type="button" onClick={() => setFeedMode('discover')}>Explore the feed <ArrowRight size={16} /></button>
            </div> : <article className="yd-post">
              <div className="yd-post-heading"><Avatar tone={creation ? 'sage' : 'peach'}>{creation ? 'y.' : 'm.'}</Avatar><div><strong>{creation ? 'You' : 'Mira Kapoor'} <span className="yd-post-verified"><Check size={10} aria-label="Sample creator" /></span></strong><span>{creation ? 'Your Studio creation · Just now' : 'Finding beauty in the everyday · Sample post'}</span></div><span className="yd-post-category"><Camera size={13} aria-hidden="true" /> Photography</span></div>
              <div className="yd-post-image">
                <img src={SAMPLE_IMAGE} alt="Afternoon light over cobalt glass, a film camera, flowers and a handwritten notebook" width={1024} height={1536} fetchPriority="high" style={{ filter: LOOKS.find(item => item.id === (creation?.look ?? 'original'))?.filter }} />
                {!creation && <div className="yd-photo-caption"><span>THE ART OF NOTICING</span><strong>Ordinary day.<br />Extraordinary light.</strong><span>JAIPUR, INDIA <ArrowUpRight size={14} /></span></div>}
                <span className="yd-image-tag">{creation ? 'MADE IN STUDIO' : 'A MOMENT WORTH KEEPING'}</span>
              </div>
              <div className="yd-post-actions">
                <button type="button" aria-label="Like sample post" aria-pressed={liked} onClick={() => setLiked(!liked)}><Heart size={20} fill={liked ? 'currentColor' : 'none'} /><span>{liked ? 'Liked' : 'Like'}</span></button>
                <button type="button" aria-label="Show sample replies" aria-expanded={replies} aria-controls="ys-sample-replies" onClick={toggleReplies}><MessageCircle size={19} /><span>Reply{visitorReplies.length > 0 ? ` · ${visitorReplies.length}` : ''}</span></button>
                <button type="button" aria-label="Save sample post" aria-pressed={saved} onClick={() => { setSaved(!saved); setAnnouncement(saved ? 'Removed from your demo saves.' : 'Saved. Find this post in the Saved tab.'); }}><Bookmark size={18} fill={saved ? 'currentColor' : 'none'} /><span>{saved ? 'Saved' : 'Save'}</span></button>
              </div>
              <p className="yd-post-caption"><strong>{creation ? 'You' : 'Mira'}</strong> {creation ? creation.caption : 'A camera, a little afternoon light, and nowhere else to be.'}</p>
              {replies && <div id="ys-sample-replies" className="yd-replies">
                {(!creation || visitorReplies.length > 0) && <ul aria-label="Replies to the demo post">
                  {!creation && <li><Avatar tone="blue">n.</Avatar><p><strong>Nila</strong> A little more of this, please.</p><button type="button" onClick={() => changeView('messages', true)} aria-label="Continue in demo messages"><ArrowUpRight size={16} /></button></li>}
                  {visitorReplies.map((reply, index) => <li key={index}><Avatar tone="sage">y.</Avatar><p><strong>You</strong> {reply}</p></li>)}
                </ul>}
                <form className="yd-reply-compose" onSubmit={sendReply}>
                  <label className="yd-sr-only" htmlFor="yd-reply">Reply to the demo post</label>
                  <input ref={replyInput} id="yd-reply" value={replyDraft} onChange={event => setReplyDraft(event.target.value)} placeholder="Add your thought…" maxLength={280} autoComplete="off" />
                  <button type="submit" disabled={!replyDraft.trim()} aria-label="Send demo reply"><Send size={16} /></button>
                </form>
                <span className="yd-reply-note">Your replies stay in this preview.</span>
              </div>}
            </article>}
            <div className="yd-feed-bottom"><span><span className="yd-small-star">✳</span> Your people. Your interests. Your pace.</span><button type="button" onClick={() => changeView('communities', true)}>Find your circle <ArrowRight size={14} /></button></div>
          </>}

          {view === 'messages' && <div className="yd-messages">
            <div className="yd-view-heading"><div><span className="yd-eyebrow">GOOD COMPANY, ONE HELLO AWAY</span><h2>Keep the conversation going.</h2></div><MessageCircle size={24} strokeWidth={1.3} aria-hidden="true" /></div>
            <div className="yd-conversation-heading"><Avatar tone="blue"><Users size={20} /></Avatar><div><strong>The usuals</strong><span>A sample group conversation</span></div><span className="yd-conversation-avatars" aria-hidden="true"><Avatar>m.</Avatar><Avatar tone="sage">a.</Avatar><Avatar tone="blue">y.</Avatar></span></div>
            <div className="yd-chat-log" role="log" aria-label="Sample conversation" aria-live="polite" aria-relevant="additions" tabIndex={0}>
              <span className="yd-chat-day">A SATURDAY WITH YOUR PEOPLE</span>
              <div className="yd-message"><span>Mira</span><p>A slow morning. Coffee. No big plans?</p></div>
              <div className="yd-message yd-message--mine"><span>You</span><p>That sounds like a very good plan.</p><CheckCheck size={14} aria-label="Sample message delivered" /></div>
              <div className="yd-message"><span>Arjun</span><p>I know just the place. Bringing my camera, too.</p></div>
              <div className="yd-chat-plan"><Camera size={19} aria-hidden="true" /><div><strong>Coffee & a photo walk</strong><span>A small plan. A whole morning to remember.</span></div><span aria-hidden="true">☀</span></div>
              {messages.map((message, index) => <div className="yd-message yd-message--mine" key={index}><span>You</span><p>{message}</p><CheckCheck size={14} aria-label="Added to demo" /></div>)}
              <div ref={messageEnd} />
            </div>
            <form className="yd-message-compose" onSubmit={sendMessage}>
              <label className="yd-sr-only" htmlFor="yd-message">Message the sample group</label>
              <input ref={messageInput} id="yd-message" value={draft} onChange={event => setDraft(event.target.value)} placeholder="Say a little hello…" maxLength={280} autoComplete="off" />
              <button type="submit" disabled={!draft.trim()} aria-label="Send demo message"><Send size={17} /></button>
            </form>
            <div className="yd-chat-footnote"><span>Only you can see messages in this preview.</span><a href="#pr-signup" onClick={goToSignup} aria-label="Join Yor Talks to start a conversation">Make it real at launch <ArrowUpRight size={13} /></a></div>
          </div>}

          {view === 'communities' && <div className="yd-communities">
            <div className="yd-view-heading"><div><span className="yd-eyebrow">THERE’S A PLACE FOR YOUR CURIOSITY</span><h2>Common ground. Good people.</h2></div><Users size={25} strokeWidth={1.3} aria-hidden="true" /></div>
            <div className="yd-community-options" role="group" aria-label="Sample communities">
              {CIRCLES.map((item, index) => <button type="button" key={item.name} aria-label={item.name} aria-pressed={circle === index} onClick={() => setCircle(index)}><Avatar tone={item.tone}>{item.initials}</Avatar><span>{item.name}</span></button>)}
            </div>
            <div className={`yd-community-cover yd-community-cover--${currentCircle.tone}`}>
              <span>{currentCircle.topic}</span><strong>{currentCircle.tagline}</strong><span className="yd-community-art" aria-hidden="true">{circle === 0 ? <Camera /> : circle === 1 ? '♫' : '✳'}</span><span>FIND YOUR PEOPLE. BRING YOUR POINT OF VIEW.</span>
            </div>
            <div className="yd-community-heading"><div><span className="yd-eyebrow">SAMPLE COMMUNITY</span><h3>{currentCircle.name}</h3></div><button type="button" aria-pressed={hasJoined} onClick={() => { setJoined(previous => hasJoined ? previous.filter(index => index !== circle) : [...previous, circle]); setAnnouncement(hasJoined ? `Left ${currentCircle.name} in this demo.` : `You joined ${currentCircle.name} in this demo.`); }}>{hasJoined ? <Check size={16} /> : <Plus size={16} />}{hasJoined ? 'Joined' : 'Join community'}</button></div>
            <p className="ys-community-note">{currentCircle.note}</p>
            <div className="yd-community-prompt"><span><Sparkles size={15} /> THE CONVERSATION STARTER</span><p>{currentCircle.prompt}</p><span>{hasJoined ? 'You’re in. A shared interest is a good place to start.' : 'Bring a thought. There’s room for your perspective.'}</span></div>
          </div>}

          {view === 'studio' && <div className="yd-studio">
            <div className="yd-view-heading"><div><span className="yd-eyebrow">A LITTLE INSPIRATION. YOUR OWN EXPRESSION.</span><h2>Make the moment yours.</h2></div><Palette size={25} strokeWidth={1.3} aria-hidden="true" /></div>
            <div className="yd-studio-image"><img src={SAMPLE_IMAGE} alt="Your sample photo with the selected Studio look" width={1024} height={1536} style={{ filter: LOOKS.find(item => item.id === look)?.filter }} /><span><SlidersHorizontal size={13} /> {LOOKS.find(item => item.id === look)?.name}</span></div>
            <div className="yd-studio-looks" role="group" aria-label="Demo Studio looks">{LOOKS.map(item => <button type="button" key={item.id} aria-pressed={look === item.id} onClick={() => setLook(item.id)}><span className={`yd-look-swatch yd-look-swatch--${item.id}`} aria-hidden="true" />{item.name}{look === item.id && <Check size={13} aria-hidden="true" />}</button>)}</div>
            <label className="yd-caption-label" htmlFor="yd-caption">Give it a thought</label>
            <input className="yd-caption-input" id="yd-caption" value={caption} onChange={event => setCaption(event.target.value)} maxLength={160} />
            <div className="yd-studio-publish"><span>Your idea → your creation → your feed.</span><button type="button" onClick={publishCreation}>Add to demo feed <ArrowUpRight size={16} /></button></div>
          </div>}
        </div>

        <aside className="yd-guide" aria-label="How Yor Talks works">
          <div className="yd-guide-top"><span className="yd-eyebrow">{tour ? 'YOUR GUIDED TOUR' : 'GO ON. MAKE YOURSELF AT HOME.'}</span><span className="yd-guide-step">0{activeIndex + 1}<span> / 04</span></span></div>
          <div className="yd-guide-copy" key={view}><span className="yd-guide-icon"><activeView.icon size={25} strokeWidth={1.3} /></span><h3>{activeView.title}</h3><p>{activeView.copy}</p><div className="yd-guide-hint"><span>TRY IT YOURSELF</span><p>{activeView.action}</p></div></div>
          <div className="yd-guide-bottom"><span className="yd-guide-line" /><p>Social. Creative. Connected.<br /><strong>All in your world.</strong></p><a href="#pr-signup" onClick={goToSignup}>I want to be here <ArrowUpRight size={17} /></a></div>
        </aside>
      </div>
      {tourComplete ? <div className="yd-tour-complete" ref={tourCompletePanel}>
        <span className="yd-tour-complete-mark" aria-hidden="true"><CheckCheck size={25} /></span>
        <div><span className="yd-eyebrow">YOUR FIRST LOOK IS COMPLETE</span><h3 ref={tourCompleteHeading} tabIndex={-1}>Your world comes next.</h3><p>Keep exploring, or join us for the beginning on 1 December.</p></div>
        <div className="yd-tour-complete-actions"><a href="#pr-signup" onClick={goToSignup}>Join the launch list <ArrowUpRight size={16} /></a><button ref={tourStartButton} type="button" onClick={() => { setTourComplete(false); changeView('feed', true); }}>Keep exploring <ArrowRight size={15} /></button></div>
      </div> : <div className="yd-tour-bar">
        <div><span className="yd-tour-marker"><Play size={12} fill="currentColor" aria-hidden="true" /></span><p><strong>{tour ? `0${activeIndex + 1} — ${activeView.label}` : 'This is a window. Go ahead and open it.'}</strong><span>{tour ? activeView.action : 'Click around, send a message, make a post. No account needed.'}</span></p></div>
        {tour ? <div className="yd-tour-controls"><button type="button" className="yd-tour-exit" onClick={endTour}>End tour</button><button type="button" disabled={activeIndex === 0} onClick={() => changeView(VIEWS[activeIndex - 1].id, true)} aria-label="Previous tour step"><ChevronLeft size={17} /></button><button type="button" onClick={nextTourStep}>{activeIndex === VIEWS.length - 1 ? 'Finish tour' : 'Next'}<ChevronRight size={17} /></button></div> : <button ref={tourStartButton} className="yd-tour-start" type="button" onClick={startTour}>Show me around <ArrowRight size={16} /></button>}
      </div>}
      <div className="yd-sr-only" role="status">{announcement}</div>
    </div>
  );

  return <div className="yd-preview" id="pr-demo" role="region" aria-label="Yor Talks social preview">
    <div className="yd-preview-heading"><span><i /> LESS EXPLAINING. MORE EXPLORING.</span><span>THE YOR TALKS EXPERIENCE <ArrowDown size={12} /></span></div>
    {expanded ? <div className="yd-expanded-placeholder"><Maximize2 size={28} /><p>Your demo is open in an expanded window.</p><button type="button" onClick={() => setExpanded(false)}>Bring it back here</button></div> : appWindow}
    {expanded && createPortal(<dialog ref={dialog} className="yd-dialog" aria-label="Expanded Yor Talks demo" onCancel={event => { event.preventDefault(); setExpanded(false); }} onClick={event => { if (event.target === event.currentTarget) setExpanded(false); }}>{appWindow}</dialog>, document.body)}
    <div className="yd-preview-caption"><span>Interactive product preview. Sample profiles and content. Changes stay in this page.</span><span>Made for your world. <span aria-hidden="true">✳</span></span></div>
    <div className="yd-launch-invitation">
      <div><span className="yd-launch-mark" aria-hidden="true">✳</span><div><h2>Make the next chapter yours.</h2><p>Choose your preferred handle and get launch updates. Free to join.</p></div></div>
      <a href="#pr-signup" className="yd-join-link" aria-label="Join the Yor Talks launch list">Get early access <ArrowUpRight size={18} /></a>
    </div>
  </div>;
}
