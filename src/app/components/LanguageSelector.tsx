import React from 'react';
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
      <SelectTrigger className="w-[64px]" dir="ltr">
        <span className="font-semibold text-sm tracking-wide uppercase">{currentLanguage}</span>
      </SelectTrigger>
      <SelectContent dir="ltr">
        {Object.entries(languageNames).map(([code, name]) => (
          <SelectItem key={code} value={code}>
            <span className="font-semibold uppercase mr-2">{code}</span>
            <span className="text-gray-500 dark:text-gray-400 text-sm">{name}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
