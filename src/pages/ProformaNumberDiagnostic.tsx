import { ProformaNumberDiagnostic } from '@/components/debug/ProformaNumberDiagnostic';

const ProformaNumberDiagnosticPage = () => {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Proforma Number Generation Debug</h1>
        <p className="text-muted-foreground mt-2">
          This diagnostic tool helps identify and fix issues with proforma number generation.
        </p>
      </div>
      
      <ProformaNumberDiagnostic />
    </div>
  );
};

export default ProformaNumberDiagnosticPage;
