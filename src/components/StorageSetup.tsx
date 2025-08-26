import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FolderOpen } from 'lucide-react';

const StorageSetup = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FolderOpen className="h-5 w-5" />
          Storage Setup
        </CardTitle>
        <CardDescription>
          Configure storage settings for file uploads
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="outline">Configure Storage</Button>
      </CardContent>
    </Card>
  );
};

export default StorageSetup;
