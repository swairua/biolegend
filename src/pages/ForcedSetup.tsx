import React from 'react';
import { ForcedInitialSetup } from '@/components/ForcedInitialSetup';

export default function ForcedSetup() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="container mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            🚀 MedPlus Africa System Setup
          </h1>
          <p className="text-xl text-gray-600">
            Automated initial setup and database configuration
          </p>
        </div>
        
        <ForcedInitialSetup />
      </div>
    </div>
  );
}
