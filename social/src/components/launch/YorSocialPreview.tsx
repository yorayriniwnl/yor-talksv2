import { useState } from 'react';
import { ArrowUpRight, Bookmark, Camera, Heart, MessageCircle, Plus, Sparkles, Users } from 'lucide-react';

type Preview = 'feed' | 'messages' | 'communities';

const VIEWS: { id: Preview; label: string }[] = [
  { id: 'feed', label: 'Your feed' },
  { id: 'messages', label: 'Messages' },
  { id: 'communities', label: 'Communities' },
];

const CIRCLES = [
  { name: 'The photo walk', topic: 'Photography & a fresh perspective', initials: 'pw', className: 'blue', note: 'Good light. A slower walk. A new way to see the familiar.' },
  { name: 'On repeat', topic: 'Music worth passing on', initials: 'or', className: 'peach', note: 'For the track you cannot stop playing, and the people who understand why.' },
  { name: 'Made of ideas', topic: 'Design, making & starting somewhere', initials: 'mi', className: 'lime', note: 'A thoughtful corner for work in progress and a little encouragement.' },
];

export default function YorSocialPreview() {
  const [view, setView] = useState<Preview>('feed');
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [replies, setReplies] = useState(false);
  const [circle, setCircle] = useState(0);

  return (
    <div className="ys-preview" role="region" aria-label="Yor Talks social preview">
      <div className="ys-app">
        <div className="ys-app-brand"><span>yor talks<span aria-hidden="true">✳</span></span><span className="ys-preview-label">PRODUCT PREVIEW</span></div>
        <div className="ys-navigation" role="group" aria-label="Preview Yor Talks features">
          {VIEWS.map(item => <button key={item.id} type="button" aria-pressed={view === item.id} onClick={() => setView(item.id)}>{item.label}</button>)}
        </div>
        <div className="ys-app-content">
          {view === 'feed' && <div className="ys-feed">
            <div className="ys-feed-intro"><div><span>YOUR EVERYDAY, CONSIDERED.</span><h2>A little more you.</h2></div><span className="ys-feed-mark" aria-hidden="true">✳</span></div>
            <div className="ys-post-heading"><span className="ys-avatar ys-avatar--peach">m.</span><div><strong>Mira</strong><span>A moment to pause</span></div><span className="ys-audience"><Users size={12} aria-hidden="true" />Close circle</span></div>
            <div className="ys-post-art" role="img" aria-label="Illustrative editorial artwork in warm ivory and ochre, reading: Made for your world. Less noise. More meaning.">
              <span className="ys-art-edition" aria-hidden="true">THE EVERYDAY EDIT / 001</span>
              <span className="ys-art-sun" aria-hidden="true" />
              <span className="ys-art-arch" aria-hidden="true" />
              <span className="ys-art-title" aria-hidden="true">Made for<br />your world.</span>
              <span className="ys-art-caption" aria-hidden="true">Less noise. More meaning.</span>
              <span className="ys-art-signature" aria-hidden="true">yor.</span>
            </div>
            <div className="ys-post-actions">
              <button type="button" aria-label="Like sample post" aria-pressed={liked} onClick={() => setLiked(!liked)}><Heart size={18} fill={liked ? 'currentColor' : 'none'} /><span>{liked ? 'Liked' : 'Like'}</span></button>
              <button type="button" aria-label="Show sample replies" aria-expanded={replies} aria-controls="ys-sample-replies" onClick={() => setReplies(!replies)}><MessageCircle size={18} /><span>Reply</span></button>
              <button type="button" aria-label="Save sample post" aria-pressed={saved} onClick={() => setSaved(!saved)}><Bookmark size={17} fill={saved ? 'currentColor' : 'none'} /><span>{saved ? 'Saved' : 'Save'}</span></button>
            </div>
            <p className="ys-caption"><strong>Mira</strong> Making room for the things that matter.</p>
            {replies && <div id="ys-sample-replies" className="ys-sample-replies"><strong>Nila</strong> A little more of this, please.</div>}
          </div>}
          {view === 'messages' && <div className="ys-messages">
            <div className="ys-conversation-heading"><span className="ys-avatar ys-avatar--blue"><Users size={20} /></span><div><strong>The usuals</strong><span>A sample group conversation</span></div><span className="ys-conversation-count">4 PEOPLE</span></div>
            <div className="ys-day">SATURDAY PLANS · SAMPLE CONVERSATION</div>
            <div className="ys-message"><span>Mira</span><p>A slow morning. Coffee. No big plans?</p></div>
            <div className="ys-message ys-message--mine"><span>You</span><p>That sounds like a very good plan.</p></div>
            <div className="ys-message"><span>Arjun</span><p>I know just the place. Bringing my camera, too.</p></div>
            <div className="ys-message ys-message--mine"><p>See you there. ♡</p></div>
            <div className="ys-message-invitation"><span>A little time for your people.</span><a href="#pr-signup" aria-label="Join Yor Talks to start a conversation"><Plus size={19} /></a></div>
          </div>}
          {view === 'communities' && <div className="ys-communities">
            <p className="ys-mini-label">A PLACE FOR YOUR CURIOSITY</p>
            <h2>Shared interests.<br />New perspectives.</h2>
            <div className="ys-community-list" role="group" aria-label="Sample communities">
              {CIRCLES.map((item, index) => <button type="button" key={item.name} aria-pressed={circle === index} onClick={() => setCircle(index)}><span className={`ys-avatar ys-avatar--${item.className}`}>{item.initials}</span><span><strong>{item.name}</strong><small>{item.topic}</small></span><ArrowUpRight size={17} aria-hidden="true" /></button>)}
            </div>
            <div className="ys-community-note" aria-live="polite"><Sparkles size={17} aria-hidden="true" /><p>{CIRCLES[circle].note}</p></div>
            <a className="ys-community-invitation" href="#pr-signup">Find your people at launch <ArrowUpRight size={16} /></a>
          </div>}
        </div>
        <div className="ys-app-footnote"><span className="ys-tiny-dot" aria-hidden="true" /> Interactive preview · Sample profiles and content</div>
      </div>
      <div className="ys-preview-caption"><span>THOUGHTFULLY SOCIAL.</span><span>A first look at Yor Talks <ArrowUpRight size={12} aria-hidden="true" /></span></div>
    </div>
  );
}

export function YorSocialFeatures() {
  return (
    <section className="ys-features pr-container" id="pr-social" aria-labelledby="ys-features-title">
      <div className="pr-section-heading">
        <div><p className="pr-kicker"><span className="pr-section-index">02 /</span> THE SOCIAL EXPERIENCE</p><h2 id="ys-features-title">More connection.<br /><span>A little more considered.</span></h2></div>
        <p>A premium experience is in the details. A place to express yourself, make time for conversation, and follow what interests you.</p>
      </div>
      <div className="ys-feature-grid">
        <article id="pr-share"><span className="ys-feature-label"><Camera size={17} aria-hidden="true" /> POSTS & STORIES</span><h3>Your moments.<br />Your point of view.</h3><p>A passing thought or something you have been making. Give it a considered space, with the people you want to share it with.</p><div className="ys-note-preview" aria-label="Illustrative post"><span className="ys-avatar ys-avatar--peach">m.</span><div><span className="ys-note-audience">CLOSE CIRCLE</span><strong>A small thing, worth sharing.</strong><p>Finally made time for that idea.</p></div><Heart size={16} aria-hidden="true" /></div></article>
        <article id="pr-connect"><span className="ys-feature-label"><MessageCircle size={17} aria-hidden="true" /> MESSAGES & GROUP CHATS</span><h3>Good conversation.<br />Room to continue.</h3><p>Keep a thoughtful exchange going. From a quick hello to your next shared plan, make a little more time for your people.</p><div className="ys-chat-preview" aria-label="Illustrative messages"><span>Same place this weekend?</span><span>I was hoping you would ask. <Heart size={13} aria-hidden="true" /></span></div></article>
        <article id="pr-belong"><span className="ys-feature-label"><Users size={17} aria-hidden="true" /> COMMUNITIES</span><h3>Common ground.<br />Uncommon people.</h3><p>A fresh perspective on something you love. Find conversations around your interests, from photography and design to music and campus life.</p><div className="ys-interest-preview" aria-label="Example interests"><span>Photography <ArrowUpRight size={12} aria-hidden="true" /></span><span>Music</span><span>Design</span><span>Campus life <ArrowUpRight size={12} aria-hidden="true" /></span></div></article>
      </div>
    </section>
  );
}
