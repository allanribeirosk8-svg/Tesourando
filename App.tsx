import React, { useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useStore } from './context/Store';
import { ClientApp } from './pages/ClientApp';
import { AdminApp } from './pages/AdminApp';
import AgendamentoPublico from './pages/AgendamentoPublico';
import { SplashScreen } from './components/SplashScreen';

const AppContent: React.FC<{
  showSplash: boolean;
  appReady: boolean;
  onSplashComplete: () => void;
}> = ({ showSplash, appReady, onSplashComplete }) => {
  const { isLoading } = useStore();

  // If app is not ready yet or the context Store is still loading data,
  // we render a solid background using the exact background color of the splash screen
  if (!appReady || isLoading) {
    return (
      <div 
        style={{ 
          position: 'fixed', 
          inset: 0, 
          backgroundColor: '#F97316',
          zIndex: 9999 
        }} 
      />
    );
  }

  if (showSplash) {
    return <SplashScreen onComplete={onSplashComplete} />;
  }

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/admin" replace />} />
        <Route path="/admin" element={<AdminApp />} />
        <Route path="/agendar/:slug" element={<AgendamentoPublico />} />
      </Routes>
    </HashRouter>
  );
};

const App: React.FC = () => {
  const isClientRoute = window.location.hash.includes('/agendar');
  const [showSplash, setShowSplash] = useState(false);
  const [appReady, setAppReady] = useState(false);

  return (
    <AppProvider onReady={() => {
      if (!isClientRoute && !sessionStorage.getItem('splashShown')) {
        setShowSplash(true);
      }
      setAppReady(true);
    }}>
      <AppContent
        showSplash={showSplash}
        appReady={appReady}
        onSplashComplete={() => {
          sessionStorage.setItem('splashShown', 'true');
          setShowSplash(false);
        }}
      />
    </AppProvider>
  );
};

export default App;