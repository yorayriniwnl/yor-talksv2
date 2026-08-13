import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronLeft, ChevronRight, ImageOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface CinematicMediaLightboxProps {
  media: string[];
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  authorName: string;
  caption?: string;
}

export function CinematicMediaLightbox({
  media,
  activeIndex,
  onActiveIndexChange,
  open,
  onOpenChange,
  authorName,
  caption,
}: CinematicMediaLightboxProps) {
  const reduceMotion = useReducedMotion();
  const touchStartX = useRef<number | null>(null);
  const [direction, setDirection] = useState(1);
  const [failedImages, setFailedImages] = useState<Set<number>>(new Set());

  const currentIndex = Math.min(Math.max(activeIndex, 0), Math.max(media.length - 1, 0));
  const currentMedia = media[currentIndex];
  const canNavigate = media.length > 1;

  const moveTo = (nextIndex: number) => {
    if (!canNavigate) return;

    const normalizedIndex = (nextIndex + media.length) % media.length;
    setDirection(normalizedIndex === 0 && currentIndex === media.length - 1 ? 1 : normalizedIndex < currentIndex ? -1 : 1);
    onActiveIndexChange(normalizedIndex);
  };

  useEffect(() => {
    if (!open || !canNavigate) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        moveTo(currentIndex + 1);
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        moveTo(currentIndex - 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canNavigate, currentIndex, open]);

  useEffect(() => {
    if (!open || !canNavigate) return;

    [currentIndex - 1, currentIndex + 1].forEach((index) => {
      const nearbyImage = media[(index + media.length) % media.length];
      if (!nearbyImage) return;
      const preload = new Image();
      preload.src = nearbyImage;
    });
  }, [canNavigate, currentIndex, media, open]);

  if (!currentMedia) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="z-[70] h-[min(92dvh,860px)] max-h-[92dvh] max-w-[min(96vw,1100px)] overflow-hidden border-white/10 bg-black/95 p-0 text-white shadow-2xl">
        <DialogTitle className="sr-only">{authorName}'s image</DialogTitle>
        <DialogDescription className="sr-only">
          Image {currentIndex + 1} of {media.length}. Use the arrow keys to browse the gallery.
        </DialogDescription>

        <div className="relative flex h-full min-h-0 flex-col overflow-hidden">
          <div className="absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-4 bg-gradient-to-b from-black/75 to-transparent px-5 pb-12 pt-5 pr-14">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{authorName}</p>
              {caption && <p className="mt-1 line-clamp-1 text-xs text-white/60">{caption}</p>}
            </div>
            {canNavigate && (
              <span className="shrink-0 rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-[0.7rem] font-medium tabular-nums text-white/80">
                {currentIndex + 1} / {media.length}
              </span>
            )}
          </div>

          <div
            className="relative flex min-h-0 flex-1 items-center justify-center bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.09),_transparent_58%)]"
            onTouchStart={(event) => {
              touchStartX.current = event.touches[0]?.clientX ?? null;
            }}
            onTouchEnd={(event) => {
              const startX = touchStartX.current;
              const endX = event.changedTouches[0]?.clientX;
              touchStartX.current = null;
              if (startX === null || endX === undefined || Math.abs(endX - startX) < 48) return;
              moveTo(endX < startX ? currentIndex + 1 : currentIndex - 1);
            }}
          >
            <AnimatePresence initial={false} mode="wait">
              {failedImages.has(currentIndex) ? (
                <motion.div
                  key={`failed-${currentMedia}`}
                  initial={reduceMotion ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={reduceMotion ? undefined : { opacity: 0 }}
                  className="flex flex-col items-center gap-3 text-center text-white/60"
                >
                  <ImageOff className="h-9 w-9" />
                  <p className="text-sm">This image could not be loaded.</p>
                </motion.div>
              ) : (
                <motion.img
                  key={currentMedia}
                  src={currentMedia}
                  alt={`${authorName}'s post, image ${currentIndex + 1} of ${media.length}`}
                  initial={reduceMotion ? false : { opacity: 0, x: direction * 18, scale: 0.985 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={reduceMotion ? undefined : { opacity: 0, x: direction * -12, scale: 1.01 }}
                  transition={{ duration: reduceMotion ? 0 : 0.28, ease: [0.16, 1, 0.3, 1] }}
                  className="h-full w-full select-none object-contain px-3 py-12 sm:px-14 sm:py-16"
                  draggable={false}
                  onError={() => setFailedImages((images) => new Set(images).add(currentIndex))}
                />
              )}
            </AnimatePresence>

            {canNavigate && (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute left-3 hidden h-11 w-11 rounded-full border border-white/10 bg-black/35 text-white hover:bg-white/15 hover:text-white sm:flex"
                  onClick={() => moveTo(currentIndex - 1)}
                  aria-label="Previous image"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-3 hidden h-11 w-11 rounded-full border border-white/10 bg-black/35 text-white hover:bg-white/15 hover:text-white sm:flex"
                  onClick={() => moveTo(currentIndex + 1)}
                  aria-label="Next image"
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </>
            )}
          </div>

          {canNavigate && (
            <div className="absolute inset-x-0 bottom-0 z-10 flex justify-center gap-2 overflow-x-auto bg-gradient-to-t from-black/80 to-transparent px-5 pb-5 pt-12">
              {media.map((url, index) => (
                <button
                  key={`${url}-${index}`}
                  type="button"
                  onClick={() => moveTo(index)}
                  className={cn(
                    'h-11 w-11 shrink-0 overflow-hidden rounded-lg border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white',
                    index === currentIndex ? 'scale-105 border-white/90 opacity-100' : 'border-white/10 opacity-55 hover:opacity-90'
                  )}
                  aria-label={`View image ${index + 1}`}
                  aria-current={index === currentIndex ? 'true' : undefined}
                >
                  <img src={url} alt="" className="h-full w-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
