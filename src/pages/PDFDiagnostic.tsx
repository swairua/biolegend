// Debug component removed during cleanup

export default function PDFDiagnostic() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">PDF Line Items Diagnostic</h1>
        <p className="text-muted-foreground">
          Audit and test PDF generation to ensure line items are properly included
        </p>
      </div>
      
      <div className="text-center py-8">
        <p className="text-muted-foreground">PDF diagnostic component has been disabled in this version.</p>
      </div>
    </div>
  );
}
