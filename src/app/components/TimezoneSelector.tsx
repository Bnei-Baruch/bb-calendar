import { useState } from 'react';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from './ui/drawer';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from './ui/command';
import { useTimezone } from '../context/TimezoneContext';
import type { Language } from '../utils/i18n';
import { tzStrings } from '../utils/tzStrings';
import {
  QUICK_ZONES, ISRAEL_TZ, resolveTz, getAllTimeZones, getUtcOffsetLabel, cityLabel, shortZoneLabel,
} from '../utils/timezone';

interface Props {
  language: Language;
  /** popover on desktop header, bottom drawer on mobile. */
  mode: 'popover' | 'drawer';
  isRTL: boolean;
}

const ALL_ZONES = getAllTimeZones();

function ZoneList({ language, onPick, isRTL }: { language: Language; onPick: (tz: string) => void; isRTL: boolean }) {
  const t = tzStrings[language] ?? tzStrings.en;
  const { timezone, hasChosen } = useTimezone();
  const quickIds = new Set(QUICK_ZONES.map(z => z.tz));
  const labelFor = (key: string, fallback: string) =>
    key === 'local' ? t.local : key === 'israel' ? t.israel : fallback;

  return (
    <Command dir={isRTL ? 'rtl' : 'ltr'} className="bg-transparent">
      <CommandInput placeholder={t.search} className="text-base sm:text-sm" />
      <CommandList className="max-h-[60vh] lg:max-h-80">
        <CommandEmpty>{t.none}</CommandEmpty>
        <CommandGroup heading={t.quick}>
          {QUICK_ZONES.map(z => {
            const real = resolveTz(z.tz);
            const selected = hasChosen
              ? (z.tz === 'local' ? timezone === 'local' : timezone === z.tz)
              : z.tz === ISRAEL_TZ;
            return (
              <CommandItem key={z.key} value={`${labelFor(z.key, z.label)} ${real}`} onSelect={() => onPick(z.tz)}
                className="min-h-11 lg:min-h-0 justify-between">
                <div className="flex flex-col text-start">
                  <span className="font-medium">{labelFor(z.key, z.label)}</span>
                  <span className="text-xs text-muted-foreground" dir="ltr">{real}</span>
                </div>
                <span className="flex items-center gap-2 text-xs text-muted-foreground" dir="ltr">
                  {getUtcOffsetLabel(real)}{selected && <Check className="size-4" />}
                </span>
              </CommandItem>
            );
          })}
        </CommandGroup>
        <CommandGroup heading={t.allZones}>
          {ALL_ZONES.filter(z => !quickIds.has(z)).map(z => (
            <CommandItem key={z} value={`${cityLabel(z)} ${z}`} onSelect={() => onPick(z)}
              className="min-h-11 lg:min-h-0 justify-between">
              <div className="flex flex-col text-start">
                <span>{cityLabel(z)}</span>
                <span className="text-xs text-muted-foreground" dir="ltr">{z}</span>
              </div>
              <span className="flex items-center gap-2 text-xs text-muted-foreground" dir="ltr">
                {getUtcOffsetLabel(z)}{hasChosen && timezone === z && <Check className="size-4" />}
              </span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );
}

export function TimezoneSelector({ language, mode, isRTL }: Props) {
  const [open, setOpen] = useState(false);
  const { timezone, effectiveTz, setTimezone } = useTimezone();
  const t = tzStrings[language] ?? tzStrings.en;
  const label = shortZoneLabel(timezone, t.local);
  const offset = getUtcOffsetLabel(effectiveTz);

  const trigger = mode === 'popover' ? (
    <button
      aria-label={t.change}
      title={t.change}
      className="h-9 px-2.5 flex items-center gap-1.5 rounded-md border border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-semibold text-gray-700 dark:text-gray-200"
    >
      <Globe className="w-4 h-4 text-gray-500 dark:text-gray-400" />
      <span dir="ltr">{label}</span>
      <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
    </button>
  ) : (
    <button
      aria-label={t.change}
      className="h-9 px-3 flex items-center gap-1.5 rounded-full border border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-200"
    >
      <Globe className="w-4 h-4 text-gray-500 dark:text-gray-400" />
      <span dir="ltr">{label} · {offset}</span>
      <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
    </button>
  );

  const pick = (tz: string) => { setTimezone(tz); setOpen(false); };

  if (mode === 'popover') {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>{trigger}</PopoverTrigger>
        <PopoverContent align={isRTL ? 'start' : 'end'} className="w-80 p-0 z-[9999]">
          <ZoneList language={language} onPick={pick} isRTL={isRTL} />
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>{trigger}</DrawerTrigger>
      <DrawerContent className="z-[9999]">
        <DrawerHeader className="pb-0">
          <DrawerTitle>{t.change}</DrawerTitle>
        </DrawerHeader>
        <div className="px-2 pb-4">
          <ZoneList language={language} onPick={pick} isRTL={isRTL} />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
