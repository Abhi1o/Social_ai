'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function InboxPage() {
  return (
    <div className="p-6">
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-white">Social Inbox</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-400">Inbox page coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
}