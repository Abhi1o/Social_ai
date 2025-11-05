'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function MediaPage() {
  return (
    <div className="p-6">
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-white">Media Library</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-400">Media library page coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
}