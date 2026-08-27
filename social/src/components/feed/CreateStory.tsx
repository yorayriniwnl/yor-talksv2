import * as React from 'react';
import { useState } from 'react';
import { StoryBuilderModal } from './StoryBuilderModal';

/**
 * Backwards-compatible Story trigger for older surfaces.
 * The production composer is centralized in StoryBuilderModal so photo, text,
 * voice, audience, safety, poll, and highlight behavior cannot drift between
 * entry points.
 */
export function CreateStory({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <span
        role="button"
        tabIndex={0}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        {children}
      </span>
      <StoryBuilderModal isOpen={open} onOpenChange={setOpen} />
    </>
  );
}
