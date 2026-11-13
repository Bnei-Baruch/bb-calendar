import { createContext, useContext, useState, ReactNode } from 'react';
import { ISRAEL_TZ, resolveTz, setActiveTimezone } from '../utils/timezone';

interface TimezoneContextType {
  /** Stored choice: 'local' or an IANA id. */
  timezone: string;
  /** IANA zone actually used for display (Israel until the user chooses). */
  effectiveTz: string;
  hasChosen: boolean;
  setTimezone: (tz: string) => void;
}

const KEY = 'timezone';
const TimezoneContext = createContext<TimezoneContextType | undefined>(undefined);

function readStored(): string | null {
  try { return localStorage.getItem(KEY); } catch { return null; }
}

export function TimezoneProvider({ children }: { children: ReactNode }) {
  const [timezone, setTz] = useState<string | null>(readStored);

  const setTimezone = (tz: string) => {
    try { localStorage.setItem(KEY, tz); } catch { /* storage unavailable */ }
    setTz(tz);
  };

  const effectiveTz = timezone ? resolveTz(timezone) : ISRAEL_TZ;
  setActiveTimezone(effectiveTz); // keep non-React helpers in sync before children render

  return (
    <TimezoneContext.Provider value={{ timezone: timezone ?? ISRAEL_TZ, effectiveTz, hasChosen: !!timezone, setTimezone }}>
      {children}
    </TimezoneContext.Provider>
  );
}

export function useTimezone() {
  const ctx = useContext(TimezoneContext);
  if (!ctx) throw new Error('useTimezone must be used within TimezoneProvider');
  return ctx;
}
