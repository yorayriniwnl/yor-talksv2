import { useRef, useState, type ReactNode, type RefObject } from 'react';
import { motion, useMotionValue } from 'framer-motion';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Trash2 } from 'lucide-react';

export function PreviewSticker({ label, bounds, onRemove, children }: {
  label: string;
  bounds: RefObject<HTMLDivElement | null>;
  onRemove: () => void;
  children: ReactNode;
}) {
  const element = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const [announcement, setAnnouncement] = useState('');
  const move = (dx: number, dy: number) => {
    if (!element.current || !bounds.current) return;
    const area = bounds.current.getBoundingClientRect();
    const box = element.current.getBoundingClientRect();
    const nextX = Math.max(x.get() + area.left + 8 - box.left, Math.min(x.get() + area.right - 8 - box.right, x.get() + dx));
    const nextY = Math.max(y.get() + area.top + 8 - box.top, Math.min(y.get() + area.bottom - 8 - box.bottom, y.get() + dy));
    x.set(nextX);
    y.set(nextY);
    setAnnouncement(dx ? `Moved ${dx > 0 ? 'right' : 'left'}.` : `Moved ${dy > 0 ? 'down' : 'up'}.`);
  };
  return <motion.div ref={element} role="group" aria-label={label} aria-describedby="studio-sticker-help" tabIndex={0}
    drag dragConstraints={bounds} dragMomentum={false} dragElastic={0} style={{ x, y, maxWidth: 'calc(100% - 2rem)' }}
    className="absolute z-20 cursor-grab select-none rounded-2xl focus-visible:ring-2 focus-visible:ring-primary active:cursor-grabbing"
    onKeyDown={event => {
      if (event.target !== event.currentTarget) return;
      const step = event.shiftKey ? 20 : 5;
      const offsets: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
      if (offsets[event.key]) { event.preventDefault(); move(...offsets[event.key]); }
      else if (event.key === 'Delete' || event.key === 'Backspace') { event.preventDefault(); onRemove(); }
    }}>
    {children}
    <div className="mt-1 flex justify-center rounded-xl border border-white/20 bg-black/90 p-1 text-white" onPointerDown={event => event.stopPropagation()}>
      {[{ label: 'left', icon: ArrowLeft, dx: -10, dy: 0 }, { label: 'up', icon: ArrowUp, dx: 0, dy: -10 }, { label: 'down', icon: ArrowDown, dx: 0, dy: 10 }, { label: 'right', icon: ArrowRight, dx: 10, dy: 0 }].map(action => <button key={action.label} type="button" aria-label={`Move sticker ${action.label}`} onClick={() => move(action.dx, action.dy)} className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-white/20"><action.icon size={16} aria-hidden="true" /></button>)}
      <button type="button" aria-label="Remove sticker" onClick={onRemove} className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-white/20"><Trash2 size={16} aria-hidden="true" /></button>
    </div>
    <span role="status" className="sr-only">{announcement}</span>
  </motion.div>;
}
