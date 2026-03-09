import { createBrowserRouter } from 'react-router';
import Root from './Root';
import { DayView } from './components/DayView';
import { CalendarView } from './components/CalendarView';
import { EventDetail } from './components/EventDetail';
import { UpcomingEventsView } from './components/UpcomingEventsView';

export const router = createBrowserRouter([
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
        path: 'event/:eventId',
        Component: EventDetail,
      },
    ],
  },
]);