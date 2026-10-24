import { Globe, Check } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

export function LanguageSelector() {
  // The interface currently has English copy only. Keep the document language
  // from index.html, including when an older language selection is stored.
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label="Interface language: English"
          variant="ghost"
          size="sm"
          className="rounded-full text-xs font-mono font-bold flex items-center gap-1.5 h-8 px-2.5 surface-1 border border-border/40 hover:border-primary/40 transition-all cursor-pointer"
        >
          <Globe className="w-3.5 h-3.5 text-primary" />
          <span>English</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 rounded-2xl glass-heavy border border-border/50 p-1.5 font-sans">
        <DropdownMenuLabel className="text-[0.68rem] font-mono font-bold uppercase text-muted-foreground">
          Interface language
        </DropdownMenuLabel>
        <DropdownMenuItem disabled className="flex items-center justify-between rounded-xl px-2.5 py-1.5 text-xs">
          <span className="font-bold">English</span>
          <Check aria-hidden="true" className="w-3.5 h-3.5 text-primary" />
        </DropdownMenuItem>
        <p className="px-2.5 py-2 text-xs leading-relaxed text-muted-foreground">
          Yor Talks is currently available in English.
        </p>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
