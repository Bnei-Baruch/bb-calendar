import { Outlet } from 'react-router';
import { Header } from './components/Header';
import { ViewNavigation } from './components/ViewNavigation';
import { useLanguage } from './context/LanguageContext';

export default function Root() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Header currentLanguage={language} onLanguageChange={setLanguage} />
      <ViewNavigation currentLanguage={language} />
      <Outlet context={{ language }} />
    </div>
  );
}