import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Download, 
  Calendar, 
  Building2, 
  User, 
  MapPin,
  CreditCard,
  DollarSign
} from 'lucide-react';
import { downloadRemittancePDF } from '@/utils/pdfGenerator';
import { toast } from 'sonner';

interface ViewRemittanceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  remittance: any;
  onDownload?: () => void;
}

export function ViewRemittanceModal({ 
  open, 
  onOpenChange, 
  remittance,
  onDownload 
}: ViewRemittanceModalProps) {

  if (!remittance) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount || 0);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
        return 'bg-success text-success-foreground';
      case 'draft':
        return 'bg-warning text-warning-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const handleDownload = () => {
    try {
      // Use the same download function from the parent component
      const remittanceData = {
        advice_number: remittance.advice_number || remittance.adviceNumber,
        advice_date: remittance.advice_date || remittance.date,
        total_payment: remittance.total_payment || remittance.totalPayment,
        customers: {
          name: remittance.customers?.name || remittance.customerName || 'N/A',
          address: remittance.customers?.address || remittance.customerAddress || 'N/A',
          city: remittance.customers?.city || 'Nairobi',
          country: remittance.customers?.country || 'Kenya'
        },
        notes: remittance.notes || `Remittance advice for ${remittance.customers?.name || remittance.customerName}`
      };

      downloadRemittancePDF(remittanceData);
      toast.success(`PDF download started for ${remittance.advice_number || remittance.adviceNumber}`);
      onDownload?.();
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Failed to download PDF. Please try again.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5 text-primary" />
            <span>Remittance Advice Details</span>
          </DialogTitle>
          <DialogDescription>
            View complete remittance advice information
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  <span>Remittance Advice #{remittance.advice_number || remittance.adviceNumber}</span>
                </div>
                <Badge className={getStatusColor(remittance.status || 'draft')}>
                  {(remittance.status || 'draft').charAt(0).toUpperCase() + (remittance.status || 'draft').slice(1)}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Date:</span>
                    <span>{formatDate(remittance.advice_date || remittance.date || new Date())}</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Total Payment:</span>
                    <span className="text-lg font-bold text-primary">
                      {formatCurrency(remittance.total_payment || remittance.totalPayment || 0)}
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Customer:</span>
                    </div>
                    <div className="ml-6">
                      <div className="font-semibold">
                        {remittance.customers?.name || remittance.customerName || 'N/A'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {remittance.customers?.address || remittance.customerAddress || 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Company Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Building2 className="h-5 w-5 text-primary" />
                <span>From: MedPlus Africa Limited</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div>P.O Box 85988-00200, Nairobi, Kenya</div>
                <div>Tel: 0741 207 690/0780 165 490</div>
                <div>Email: biolegend@biolegendscientific.co.ke/info@biolegendscientific.co.ke</div>
                <div>Website: www.biolegendscientific.co.ke</div>
                <div className="text-xs italic text-primary/70">Delivering Discoveries.... and more</div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Items */}
          {(remittance.items || []).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Payment Details</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Invoice/Credit Note</TableHead>
                      <TableHead className="text-right">Invoice Amount</TableHead>
                      <TableHead className="text-right">Credit Note</TableHead>
                      <TableHead className="text-right">Payment</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(remittance.items || []).map((item: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell>{formatDate(item.date)}</TableCell>
                        <TableCell>
                          {item.invoiceNumber || item.creditNote || 'N/A'}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.invoiceAmount ? formatCurrency(item.invoiceAmount) : ''}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.creditAmount ? formatCurrency(item.creditAmount) : ''}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(item.payment || 0)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="border-t-2">
                      <TableCell colSpan={4} className="font-semibold">Total Payment</TableCell>
                      <TableCell className="text-right font-bold text-lg">
                        {formatCurrency(remittance.total_payment || remittance.totalPayment || 0)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {remittance.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{remittance.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
