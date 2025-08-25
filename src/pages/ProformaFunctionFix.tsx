import { ProformaFunctionFix } from '@/components/fixes/ProformaFunctionFix';

const ProformaFunctionFixPage = () => {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Fix Proforma Function Error</h1>
        <p className="text-muted-foreground mt-2">
          Resolve the "generate_proforma_number function not found" error.
        </p>
      </div>
      
      <ProformaFunctionFix />
    </div>
  );
};

export default ProformaFunctionFixPage;
