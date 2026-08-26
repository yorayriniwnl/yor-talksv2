import { useState, useEffect } from 'react';
import { Globe, Check } from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { sounds } from '@/lib/sound';
import { toast } from 'sonner';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', native: 'English', flag: '🌐' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी', flag: '🇮🇳' },
  { code: 'es', name: 'Spanish', native: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'French', native: 'Français', flag: '🇫🇷' },
  { code: 'pt', name: 'Portuguese', native: 'Português', flag: '🇧🇷' },
  { code: 'ar', name: 'Arabic', native: 'العربية', flag: '🌍' },
  { code: 'ja', name: 'Japanese', native: '日本語', flag: '🇯🇵' },
  { code: 'sw', name: 'Swahili', native: 'Kiswahili', flag: '🌍' },
  { code: 'de', name: 'German', native: 'Deutsch', flag: '🇩🇪' },
  { code: 'ko', name: 'Korean', native: '한국어', flag: '🇰🇷' },
  { code: 'id', name: 'Indonesian', native: 'Bahasa Indonesia', flag: '🇮🇩' },
  { code: 'tr', name: 'Turkish', native: 'Türkçe', flag: '🇹🇷' },
  { code: 'ru', name: 'Russian', native: 'Русский', flag: '🇷🇺' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்', flag: '🇮🇳' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা', flag: '🇮🇳' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు', flag: '🇮🇳' },
  { code: 'mr', name: 'Marathi', native: 'मराठी', flag: '🇮🇳' },
  { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી', flag: '🇮🇳' },
  { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ', flag: '🇮🇳' },
  { code: 'pa', name: 'Punjabi', native: 'ਪੰਜਾਬੀ', flag: '🇮🇳' },
  { code: 'ml', name: 'Malayalam', native: 'മലയാളം', flag: '🇮🇳' },
] as const;

type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export function LanguageSelector() {
  const [selectedLang, setSelectedLang] = useState<SupportedLanguage>(SUPPORTED_LANGUAGES[0]);

  useEffect(() => {
    document.documentElement.lang = selectedLang.code;
  }, [selectedLang.code]);

  useEffect(() => {
    const saved = localStorage.getItem('yortalks-lang');
    if (saved) {
      const found = SUPPORTED_LANGUAGES.find((l) => l.code === saved);
      if (found) setSelectedLang(found);
    }
  }, []);

  const handleSelectLanguage = (lang: SupportedLanguage) => {
    sounds.playPop();
    setSelectedLang(lang);
    localStorage.setItem('yortalks-lang', lang.code);
    toast.success(`Language switched to ${lang.native} (${lang.name})`);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="rounded-full text-xs font-mono font-bold flex items-center gap-1.5 h-8 px-2.5 surface-1 border border-border/40 hover:border-primary/40 transition-all cursor-pointer"
        >
          <Globe className="w-3.5 h-3.5 text-primary" />
          <span>{selectedLang.native}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-80 w-56 overflow-y-auto rounded-2xl glass-heavy border border-border/50 p-1.5 font-sans">
        <div className="px-2 py-1.5 text-[0.68rem] font-mono font-bold uppercase text-muted-foreground">
          Yor languages · global by design
        </div>
        {SUPPORTED_LANGUAGES.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => handleSelectLanguage(lang)}
            className="flex items-center justify-between rounded-xl px-2.5 py-1.5 text-xs cursor-pointer hover:bg-primary/20"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm">{lang.flag}</span>
              <span className="font-bold text-foreground">{lang.native}</span>
              <span className="text-[0.68rem] text-muted-foreground">({lang.name})</span>
            </div>
            {selectedLang.code === lang.code && <Check className="w-3.5 h-3.5 text-primary font-bold" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
