import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/Store';
import { ClientApp } from './pages/ClientApp';
import { AdminApp } from './pages/AdminApp';
import AgendamentoPublico from './pages/AgendamentoPublico';

const App: React.FC = () => {
  return (
    <AppProvider>
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