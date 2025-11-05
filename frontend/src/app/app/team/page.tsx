'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TeamPage() {
  return (
    <div className="p-6">
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-white">Team Management</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-400">Team management page coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
}