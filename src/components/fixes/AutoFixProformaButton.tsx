import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertTriangle, Wrench, Loader2 } from 'lucide-react';
import { autoFixProformaFunction, executeProformaFunctionFix } from '@/utils/immediateProformaFix';
import { toast } from 'sonner';

interface AutoFixProformaButtonProps {
  onSuccess?: (generatedNumber: string) => void;
  onError?: (error: string) => void;
  className?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
}

export const AutoFixProformaButton = ({ 
  onSuccess, 
  onError, 
  className = "",
  variant = "default" 
}: AutoFixProformaButtonProps) => {
  const [isFixing, setIsFixing] = useState(false);
  const [fixResult, setFixResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleAutoFix = async () => {
    setIsFixing(true);
    setFixResult(null);
    
    try {
      console.log('🔧 Starting auto-fix process...');
      
      // Show progress toast
      const progressToast = toast.loading('Fixing proforma function...');
      
      // Attempt the fix
      const result = await executeProformaFunctionFix();
      
      if (result) {
        // Try to generate a test number
        const testNumber = await autoFixProformaFunction();
        
        setFixResult({ success: true, message: `Fix successful! Test number: ${testNumber}` });
        onSuccess?.(testNumber);
        
        toast.dismiss(progressToast);
        toast.success(`Proforma function fixed! Generated: ${testNumber}`);
        
      } else {
        setFixResult({ success: false, message: 'Automatic fix failed. Manual intervention required.' });
        onError?.('Automatic fix failed');
        
        toast.dismiss(progressToast);
        toast.error('Automatic fix failed. Please try the manual SQL method.');
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Auto-fix process failed:', error);
      
      setFixResult({ success: false, message: `Fix failed: ${errorMessage}` });
      onError?.(errorMessage);
      
      toast.error('Auto-fix process failed. Please try manual method.');
    } finally {
      setIsFixing(false);
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <Button 
        onClick={handleAutoFix} 
        disabled={isFixing}
        variant={variant}
        className="flex items-center gap-2"
      >
        {isFixing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Wrench className="h-4 w-4" />
        )}
        {isFixing ? 'Fixing...' : 'Auto-Fix Function'}
      </Button>
      
      {fixResult && (
        <Alert className={fixResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
          {fixResult.success ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-red-600" />
          )}
          <AlertDescription className={fixResult.success ? "text-green-800" : "text-red-800"}>
            {fixResult.message}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};
