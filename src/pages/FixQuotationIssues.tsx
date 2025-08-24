import { FixQuotationColumns } from '@/components/FixQuotationColumns';

export default function FixQuotationIssues() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Fix Quotation Issues</h1>
        <p className="text-muted-foreground mt-2">
          Resolve foreign key failures and database issues in quotation creation.
        </p>
      </div>
      
      <FixQuotationColumns />
      
      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">Alternative Manual Fix</h3>
        <p className="text-blue-800 text-sm mb-2">
          If the automatic fix doesn't work, you can manually run the SQL in your Supabase Dashboard:
        </p>
        <ol className="list-decimal list-inside text-blue-800 text-sm space-y-1">
          <li>Go to your Supabase Dashboard → SQL Editor</li>
          <li>Copy the contents of <code>fix-quotation-tax-columns.sql</code></li>
          <li>Paste and run the SQL</li>
          <li>Refresh the application</li>
        </ol>
      </div>
    </div>
  );
}
