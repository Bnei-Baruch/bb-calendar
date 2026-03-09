import { RouterProvider } from 'react-router';
import { LanguageProvider } from './context/LanguageContext';
import { router } from './routes';

export default function App() {
  return (
    <LanguageProvider>
      <RouterProvider router={router} />
    </LanguageProvider>
  );
}