import { createBrowserRouter, Navigate } from 'react-router';
import Root from './Root';
import { DayView } from './components/DayView';
import { CalendarView } from './components/CalendarView';
import { EventDetail } from './components/EventDetail';
import { UpcomingEventsView } from './components/UpcomingEventsView';
import { HolidaysView } from './components/HolidaysView';
import { PostsView } from './components/PostsView';
import { AdminGuard } from './admin/AdminGuard';
import { TemplateList } from './admin/TemplateList';
import { TemplateForm } from './admin/TemplateForm';
import { EmbedScheduleView } from './components/EmbedScheduleView';

export const router = createBrowserRouter([
  {
    path: '/embed/:eventId',
    Component: EmbedScheduleView,
  },
  {
    path: '/',
    Component: Root,
    children: [
      {
        index: true,
        Component: DayView,
      },
      {
        path: 'calendar',
        Component: CalendarView,
      },
      {
        path: 'upcoming',
        Component: UpcomingEventsView,
      },
      {
        path: 'holidays',
        Component: HolidaysView,
      },
      {
        path: 'posts',
        Component: PostsView,
      },
      {
        path: 'event/:eventId',
        Component: EventDetail,
      },
      {
        path: 'admin',
        Component: AdminGuard,
        children: [
          {
            path: 'templates',
            Component: TemplateList,
          },
          {
            path: 'templates/new',
            Component: TemplateForm,
          },
          {
            path: 'templates/:id',
            Component: TemplateForm,
          },
        ],
      },
      {
        path: '*',
        Component: () => Navigate({ to: '/', replace: true }),
      },
    ],
  },
]);