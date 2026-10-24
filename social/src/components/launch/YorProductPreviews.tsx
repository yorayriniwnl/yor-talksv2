import { useState } from 'react';
import { ArrowRight, Clapperboard, Lightbulb, Users } from 'lucide-react';
import './yor-product-previews.css';

const FILTERS = [
  { name: 'Original', css: 'none' },
  { name: 'Sunset', css: 'sepia(0.5) saturate(2) hue-rotate(-20deg)' },
  { name: 'Noir', css: 'grayscale(1) contrast(1.6)' },
];

const STARTERS = [
  { label: 'Make a short film', idea: 'Make a short film with a tiny crew and show it to our community.' },
  { label: 'Build a small app', idea: 'Build a small app that helps neighbours share things they already own.' },
  { label: 'Start a podcast', idea: 'Start a podcast about the creative people making our city interesting.' },
];

function shapeIdea(idea: string) {
  let roles = ['Maker', 'Visual thinker', 'Community connector'];
  let steps = ['Define the smallest version worth making', 'Find people who make the idea stronger', 'Put the first proof into the world'];
  if (/(film|video|cinema|shoot)/i.test(idea)) {
    roles = ['Storyteller', 'Camera + light', 'Editor + sound'];
    steps = ['Write a one-page treatment', 'Assemble a tiny cast and crew', 'Shoot and screen a first cut'];
  } else if (/(app|product|code|software|website)/i.test(idea)) {
    roles = ['Product designer', 'Builder', 'Research + storytelling'];
    steps = ['Talk to five potential users', 'Build the smallest working prototype', 'Put it in ten hands and learn'];
  } else if (/(music|podcast|album|audio)/i.test(idea)) {
    roles = ['Host / artist', 'Producer + sound', 'Visual storyteller'];
    steps = ['Capture the creative premise', 'Record a rough first session', 'Release one piece and gather listeners'];
  }
  return {
    title: idea.trim().split(/[.!?\n]/)[0].split(/\s+/).slice(0, 9).join(' '),
    roles,
    steps,
  };
}

export default function YorProductPreviews() {
  const [filter, setFilter] = useState(FILTERS[0]);
  const [idea, setIdea] = useState(STARTERS[0].idea);
  const [blueprint, setBlueprint] = useState(() => shapeIdea(STARTERS[0].idea));
  const [error, setError] = useState('');

  return (
    <div className="yp-previews">
      <article className="yp-feature" aria-labelledby="yp-studio-title">
        <div className="yp-copy">
          <span className="yp-product-label"><Clapperboard size={17} /> CREATOR STUDIO</span>
          <h3 id="yp-studio-title">Make something<br /><em>worth sharing.</em></h3>
          <p>Find the look. Set the mood. Give your stories a style that feels unmistakably like you.</p>
          <a href="#pr-signup">Make your next thing here <ArrowRight size={16} /></a>
        </div>

        <div className="yp-studio">
          <div className="yp-demo-bar"><span><i /> STUDIO / VISUAL PREVIEW</span><span>TRY A LOOK</span></div>
          <div className="yp-studio-image">
            <img src={`${import.meta.env.BASE_URL}images/yor-discovery-still-life-v1.jpg`} alt="Sample photo with blue glassware, a camera and flowers" loading="lazy" style={{ filter: filter.css }} />
            <span>{filter.name.toUpperCase()}</span>
            <div className="yp-crop-mark yp-crop-mark--tl" />
            <div className="yp-crop-mark yp-crop-mark--br" />
          </div>
          <div className="yp-filter-controls" role="group" aria-label="Try a Studio visual filter">
            {FILTERS.map(item => (
              <button type="button" key={item.name} aria-pressed={filter.name === item.name} onClick={() => setFilter(item)}>
                {item.name}<span className={`yp-filter-swatch yp-filter-swatch--${item.name.toLowerCase()}`} />
              </button>
            ))}
          </div>
          <p className="yp-demo-note">Sample media. Change the filter to see Studio’s visual controls in action.</p>
        </div>
      </article>

      <article className="yp-feature yp-feature--dream" aria-labelledby="yp-dream-title">
        <div className="yp-copy">
          <span className="yp-product-label"><Lightbulb size={17} /> DREAM / PROJECTS</span>
          <h3 id="yp-dream-title">That idea?<br /><em>Give it a beginning.</em></h3>
          <p>Turn a passing thought into a project. Find a starting point, map the next steps, and bring your people along.</p>
          <a href="#pr-signup">Bring an idea with you <ArrowRight size={16} /></a>
        </div>

        <div className="yp-dream">
          <div className="yp-demo-bar"><span><i /> DREAM / IDEA WORKSPACE</span><span>TRY IT HERE</span></div>
          <div className="yp-starters" role="group" aria-label="Choose an example idea">
            {STARTERS.map(item => (
              <button type="button" key={item.label} onClick={() => {
                setIdea(item.idea);
                setBlueprint(shapeIdea(item.idea));
                setError('');
              }}>{item.label}</button>
            ))}
          </div>
          <label htmlFor="yp-idea">What would you make with the right people?</label>
          <textarea id="yp-idea" value={idea} maxLength={400} rows={2} onChange={event => setIdea(event.target.value)} aria-describedby={error ? 'yp-idea-error' : undefined} />
          {error && <p className="yp-idea-error" id="yp-idea-error" role="alert">{error}</p>}
          <button className="yp-shape" type="button" onClick={() => {
            if (idea.trim().length < 16) {
              setError('Give your idea a little more detail.');
              return;
            }
            setError('');
            setBlueprint(shapeIdea(idea));
          }}>Shape this idea <ArrowRight size={15} /></button>

          <div className="yp-blueprint" aria-live="polite" aria-atomic="true">
            <span className="yp-blueprint-label">YOUR STARTING POINT</span>
            <h4>{blueprint.title}</h4>
            <div className="yp-roles"><Users size={14} aria-hidden="true" />{blueprint.roles.map(role => <span key={role}>{role}</span>)}</div>
            <ol>{blueprint.steps.map((step, index) => <li key={step}><span aria-hidden="true">0{index + 1}</span>{step}</li>)}</ol>
          </div>
          <p className="yp-demo-note">An interactive taste of Dream. Your account is where ideas become shared projects.</p>
        </div>
      </article>
    </div>
  );
}
