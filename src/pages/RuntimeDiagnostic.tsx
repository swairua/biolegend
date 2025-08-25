import { RuntimeErrorDiagnostic } from '@/components/debug/RuntimeErrorDiagnostic';

const RuntimeDiagnosticPage = () => {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Runtime Error Diagnostic</h1>
        <p className="text-muted-foreground mt-2">
          Monitor authentication state and loading performance in real-time.
        </p>
      </div>
      
      <RuntimeErrorDiagnostic />
    </div>
  );
};

export default RuntimeDiagnosticPage;
