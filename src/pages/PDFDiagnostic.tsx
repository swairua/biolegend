import PDFLineItemsDiagnostic from '@/components/debug/PDFLineItemsDiagnostic';

export default function PDFDiagnostic() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">PDF Line Items Diagnostic</h1>
        <p className="text-muted-foreground">
          Audit and test PDF generation to ensure line items are properly included
        </p>
      </div>
      
      <PDFLineItemsDiagnostic />
    </div>
  );
}
