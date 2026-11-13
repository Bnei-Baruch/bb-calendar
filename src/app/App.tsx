import React from 'react';
import { RouterProvider } from 'react-router';
import { LanguageProvider } from './context/LanguageContext';
import { TimezoneProvider } from './context/TimezoneContext';
import { EventsProvider } from './context/EventsContext';
import { router } from './routes';

export default function App() {
  return (
    <LanguageProvider>
      <TimezoneProvider>
        <EventsProvider>
          <RouterProvider router={router} />
        </EventsProvider>
      </TimezoneProvider>
    </LanguageProvider>
  );
}
