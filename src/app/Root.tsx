import React from 'react';
import { Outlet } from 'react-router';
import { Header } from './components/Header';
import { ViewNavigation } from './components/ViewNavigation';
import { LoginPage } from './components/LoginPage';
import { useLanguage } from './context/LanguageContext';
import keycloak from '../keycloak';

export default function Root() {
  const { language, setLanguage } = useLanguage();

  if (!keycloak.authenticated) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Header currentLanguage={language} onLanguageChange={setLanguage} />
      <ViewNavigation currentLanguage={language} />
      <div className="pb-16 sm:pb-0">
        <Outlet context={{ language }} />
      </div>
    </div>
  );
}