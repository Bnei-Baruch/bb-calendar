import keycloak from '../../keycloak';

async function authHeaders(): Promise<Record<string, string>> {
  if (keycloak.authenticated) await keycloak.updateToken(30);
  return keycloak.token ? { Authorization: `Bearer ${keycloak.token}` } : {};
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = await authHeaders();
  const res = await fetch(`/api/admin${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...headers, ...(options.headers ?? {}) },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

export const adminApi = {
  // Events
  getEvents: () => request<AdminEvent[]>('/events'),
  getEvent: (id: string) => request<AdminEvent>(`/events/${id}`),
  createEvent: (data: EventPayload) => request<AdminEvent>('/events', { method: 'POST', body: JSON.stringify(data) }),
  updateEvent: (id: string, data: EventPayload) => request<AdminEvent>(`/events/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteEvent: (id: string) => request<{ ok: boolean }>(`/events/${id}`, { method: 'DELETE' }),
  deleteEventFuture: (id: string) => request<{ ok: boolean }>(`/events/${id}?future=true`, { method: 'DELETE' }),
  updateEventSeries: (id: string, data: Omit<EventPayload, 'date' | 'endDate' | 'type' | 'parentId'>) =>
    request<{ ok: boolean }>(`/events/${id}/series`, { method: 'PUT', body: JSON.stringify(data) }),

  // Templates
  getTemplates: () => request<AdminTemplate[]>('/templates'),
  getTemplate: (id: number) => request<AdminTemplate>(`/templates/${id}`),
  createTemplate: (data: TemplatePayload) => request<AdminTemplate>('/templates', { method: 'POST', body: JSON.stringify(data) }),
  updateTemplate: (id: number, data: TemplatePayload) => request<AdminTemplate>(`/templates/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTemplate: (id: number) => request<{ ok: boolean }>(`/templates/${id}`, { method: 'DELETE' }),
  importTemplatesFromSheets: (url: string) =>
    request<{ created: number; updated: number }>('/templates/import-sheets', { method: 'POST', body: JSON.stringify({ url }) }),
  importEventsFromSheets: (url: string, parentId: string) =>
    request<{ created: number; updated: number }>('/events/import-sheets', { method: 'POST', body: JSON.stringify({ url, parentId }) }),

  // Generate
  generatePreview: (targetMonth: string, referenceMonth: string) =>
    request<GeneratePreview>('/generate/preview', { method: 'POST', body: JSON.stringify({ targetMonth, referenceMonth }) }),
  generateConfirm: (events: PreviewEvent[], targetMonth: string) =>
    request<{ created: number }>('/generate/confirm', { method: 'POST', body: JSON.stringify({ events, targetMonth }) }),
  deleteGenerated: (tag: string) => request<{ deleted: number }>(`/generate/${tag}`, { method: 'DELETE' }),

  // Holidays
  getHolidays: (year: number) => request<Holiday[]>(`/holidays/${year}`),
  getYearHolidays: (year: number) => request<{ holidays: HolidayGroup[] }>(`/holidays/year/${year}`),
  aiHolidayPreview: (currentYear: number, targetYear: number) =>
    request<{ suggestions: HolidaySuggestion[]; targetYear: number; currentYear: number }>(
      '/holidays/ai-preview', { method: 'POST', body: JSON.stringify({ currentYear, targetYear }) }
    ),
  createHolidays: (items: HolidaySuggestion[]) =>
    request<{ created: number }>('/holidays/create', { method: 'POST', body: JSON.stringify({ items }) }),

  // AI
  translate: (text: string, sourceLang: string, targetLangs: string[]) =>
    request<{ translations: Record<string, string> }>('/translate', {
      method: 'POST', body: JSON.stringify({ text, sourceLang, targetLangs }),
    }),
};

export interface AdminEvent {
  id: string;
  type: string;
  date: string;
  endDate?: string;
  startTime: string;
  endTime: string;
  title: Record<string, string>;
  description?: Record<string, string>;
  location?: string;
  private: boolean;
  generationTag?: string;
  parentId?: string;
  createdByRole?: string;
  recurrence?: 'daily' | 'weekly' | 'monthly' | 'custom';
  recurrenceEnd?: string;
  recurrenceId?: string;
  recurrenceDays?: string;
}

export interface EventPayload {
  type?: string;
  date: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  titles: Record<string, string>;
  descriptions?: Record<string, string>;
  location?: string;
  private?: boolean;
  parentId?: string;
  recurrence?: string;
  recurrenceEnd?: string;
  recurrenceDays?: string;
}

export interface AdminTemplate {
  id: number;
  name: string;
  titles: Record<string, string>;
  defaultStartTime: string;
  defaultEndTime: string;
  privateByDefault: boolean;
  type: string;
}

export interface TemplatePayload {
  name: string;
  titles: Record<string, string>;
  defaultStartTime?: string;
  defaultEndTime?: string;
  privateByDefault?: boolean;
  type?: string;
}

export interface PreviewEvent {
  date: string;
  startTime: string;
  endTime: string;
  type: string;
  titles: Record<string, string>;
  private: boolean;
}

export interface GeneratePreview {
  previewEvents: PreviewEvent[];
  holidayDates: Holiday[];
  referenceMonth: string;
  targetMonth: string;
}

export interface Holiday {
  date: string;
  nameHe: string;
  nameEn: string;
  category: string;
}

export interface HolidayGroup {
  family: string;
  nameEn: string;
  nameHe: string;
  date: string;
  endDate: string;
  category: string;
}

export interface HolidaySuggestion {
  family: string;
  nameHe: string;
  nameEn: string;
  date: string;
  endDate: string;
  category: string;
  titles: Record<string, string>;
  type: string;
}
