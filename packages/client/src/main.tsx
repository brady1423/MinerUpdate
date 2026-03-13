import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './index.css';
import { ScanProvider } from './context/ScanContext';
import { FirmwareUpdateProvider } from './context/FirmwareUpdateContext';
import Scan from './pages/Scan';
import MinerDetail from './pages/MinerDetail';

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ScanProvider>
        <FirmwareUpdateProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Scan />} />
              <Route path="/miners/:ip" element={<MinerDetail />} />
            </Routes>
          </BrowserRouter>
        </FirmwareUpdateProvider>
      </ScanProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
