import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Language, languageNames } from '../utils/i18n';

interface LanguageSelectorProps {
  currentLanguage: Language;
  onLanguageChange: (language: Language) => void;
}

export function LanguageSelector({ currentLanguage, onLanguageChange }: LanguageSelectorProps) {
  return (
    <Select value={currentLanguage} onValueChange={(value) => onLanguageChange(value as Language)}>
      <SelectTrigger className="w-[140px]" dir="ltr">
        <SelectValue />
      </SelectTrigger>
      <SelectContent dir="ltr">
        {Object.entries(languageNames).map(([code, name]) => (
          <SelectItem key={code} value={code}>
            {name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
