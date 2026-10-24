import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Award, ShieldAlert, Sparkles } from 'lucide-react';

interface FounderBadgeProps {
  isFounder?: boolean;
  passNumber?: string;
  variant?: 'compact' | 'pill' | 'card';
  className?: string;
}

export function FounderBadge({
  isFounder = true,
  passNumber,
  variant = 'compact',
  className,
}: FounderBadgeProps) {
  if (!isFounder) return null;

  if (variant === 'pill') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider',
              'bg-gradient-to-r from-[#e84b4b]/20 via-[#ffd700]/15 to-[#e84b4b]/20',
              'border border-[#e84b4b]/50 text-[#ff8a7f] shadow-[0_0_12px_rgba(232,75,75,0.25)]',
              className,
            )}
          >
            <ShieldAlert className="w-3 h-3 text-[#e84b4b] shrink-0" />
            <span>VIP FOUNDER</span>
            {passNumber && <span className="text-[#ffd700] ml-0.5">#{passNumber}</span>}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs font-sans">
          <p className="font-bold text-[#ff8a7f]">VIP Founder Member</p>
          <p className="text-[#9ea4b0] text-[11px]">
            Pre-registered pioneer for the 01 Dec 2026 Global Genesis Launch
          </p>
        </TooltipContent>
      </Tooltip>
    );
  }

  if (variant === 'card') {
    return (
      <div
        className={cn(
          'p-3 rounded-xl bg-gradient-to-r from-[#141822] via-[#1b202e] to-[#141822]',
          'border border-[#e84b4b]/40 shadow-[0_0_20px_rgba(232,75,75,0.15)] flex items-center justify-between',
          className,
        )}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#e84b4b]/20 border border-[#e84b4b]/40 flex items-center justify-center text-[#ff8a7f]">
            <Award className="w-4 h-4 text-[#e84b4b]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-xs font-bold text-white uppercase tracking-wider">
                VIP Founder Status
              </span>
              <span className="text-[9px] font-mono font-extrabold px-1.5 py-0.2 rounded bg-[#e84b4b] text-white">
                MYTHIC
              </span>
            </div>
            <p className="text-[11px] text-[#9298a5]">
              Guaranteed handle lock &amp; 1-Year SuperPass unlocked for 01 Dec 2026
            </p>
          </div>
        </div>
        {passNumber && (
          <span className="font-mono text-xs font-bold text-[#ffd700] px-2 py-1 rounded bg-[#10131b] border border-[#252932]">
            #{passNumber}
          </span>
        )}
      </div>
    );
  }

  // Compact variant: Small glowing mythic shield icon next to username
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            'inline-flex items-center justify-center shrink-0 cursor-pointer align-middle ml-0.5',
            className,
          )}
          aria-label="VIP Founder Badge"
        >
          <span className="relative flex items-center justify-center w-4 h-4 rounded-full bg-gradient-to-tr from-[#e84b4b] via-[#ffd700] to-[#ff8a7f] p-[1px] shadow-[0_0_8px_rgba(232,75,75,0.6)]">
            <span className="w-full h-full bg-[#0a0c10] rounded-full flex items-center justify-center">
              <ShieldAlert className="w-2.5 h-2.5 text-[#ff8a7f]" />
            </span>
          </span>
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs font-sans">
        <div className="flex items-center gap-1.5 font-bold text-[#ff8a7f] mb-0.5">
          <Sparkles className="w-3.5 h-3.5 text-[#ffd700]" />
          <span>VIP Founder</span>
        </div>
        <p className="text-[#9ea4b0] text-[11px]">
          Pre-registered for 01 Dec 2026 Global Launch
        </p>
      </TooltipContent>
    </Tooltip>
  );
}
