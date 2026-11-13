'use client';

import React from 'react';
import AdminDashboardModal from '../components/AdminDashboardModal';

export default function AdminPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#05070f' }}>
      <AdminDashboardModal 
        isOpen={true} 
        onClose={() => {
          if (typeof window !== 'undefined') {
            window.location.href = '/';
          }
        }} 
      />
    </div>
  );
}
