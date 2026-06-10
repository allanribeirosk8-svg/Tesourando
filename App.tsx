import React, { useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/Store';
import { ClientApp } from './pages/ClientApp';
import { AdminApp } from './pages/AdminApp';
import AgendamentoPublico from './pages/AgendamentoPublico';
import { SplashScreen } from './components/SplashScreen';

const App: React.FC = () => {
  const isClientRoute = window.location.hash.includes('/agendar');
  const [showSplash, setShowSplash] = useState(
    () => !isClientRoute && !sessionStorage.getItem('splashShown')
  );

  function handleSplashComplete() {
    sessionStorage.setItem('splashShown', 'true');
    setShowSplash(false);
  }

  return (
    <AppProvider>
      {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
      <HashRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/admin" replace />} />
          <Route path="/admin" element={<AdminApp />} />
          <Route path="/agendar/:slug" element={<AgendamentoPublico />} />
        </Routes>
      </HashRouter>

    </AppProvider>
  );
};

export default App;