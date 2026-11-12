import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import TopBar from './TopBar.jsx';
import DisclaimerFooter from '../common/DisclaimerFooter.jsx';

export default function AppShell() {
  return (
    <div className="min-h-screen bg-surface flex">
      <Sidebar />
      <div className="pl-[260px] w-full min-h-screen flex flex-col justify-between">
        <TopBar />
        <main className="w-full pt-[70px] bg-surface flex-1">
          <div className="max-w-[1200px] mx-auto p-space-xl">
            <Outlet />
          </div>
        </main>
        <DisclaimerFooter className="no-print" />
      </div>
    </div>
  );
}

