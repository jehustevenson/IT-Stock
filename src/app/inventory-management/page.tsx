import React from 'react';
import AppLayout from '@/components/AppLayout';
import InventoryClient from './components/InventoryClient';

export default function InventoryManagementPage() {
  return (
    <AppLayout>
      <InventoryClient />
    </AppLayout>
  );
}