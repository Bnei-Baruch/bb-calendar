import { RouterProvider } from 'react-router';
import { LanguageProvider } from './context/LanguageContext';
import { EventsProvider } from './context/EventsContext';
import { router } from './routes';

export default function App() {
  return (
    <LanguageProvider>
      <EventsProvider>
        <RouterProvider router={router} />
      </EventsProvider>
    </LanguageProvider>
  );
}
