import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Minus, Calendar, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface CreateRemittanceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface RemittanceItem {
  id: string;
  date: string;
  invoiceNumber?: string;
  creditNote?: string;
  invoiceAmount?: number;
  creditAmount?: number;
  payment: number;
}

export function CreateRemittanceModal({ open, onOpenChange, onSuccess }: CreateRemittanceModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    adviceNumber: `RA-${new Date().getFullYear()}-${String(Date.now()).slice(-3)}`,
    customerName: '',
    customerAddress: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const [items, setItems] = useState<RemittanceItem[]>([
    {
      id: '1',
      date: new Date().toISOString().split('T')[0],
      invoiceNumber: '',
      creditNote: '',
      invoiceAmount: 0,
      creditAmount: 0,
      payment: 0,
    }
  ]);

  const addItem = () => {
    const newItem: RemittanceItem = {
      id: Date.now().toString(),
      date: new Date().toISOString().split('T')[0],
      invoiceNumber: '',
      creditNote: '',
      invoiceAmount: 0,
      creditAmount: 0,
      payment: 0,
    };
    setItems([...items, newItem]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof RemittanceItem, value: any) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const calculateTotalPayment = () => {
    return items.reduce((sum, item) => sum + (item.payment || 0), 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validate form
      if (!formData.customerName.trim()) {
        toast.error('Customer name is required');
        return;
      }

      if (items.some(item => !item.date || item.payment === 0)) {
        toast.error('All items must have a date and payment amount');
        return;
      }

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      const remittanceData = {
        ...formData,
        items,
        totalPayment: calculateTotalPayment(),
        status: 'draft',
        createdAt: new Date().toISOString(),
      };

      console.log('Creating remittance advice:', remittanceData);
      
      toast.success('Remittance advice created successfully!');
      onSuccess?.();
      onOpenChange(false);
      
      // Reset form
      setFormData({
        adviceNumber: `RA-${new Date().getFullYear()}-${String(Date.now()).slice(-3)}`,
        customerName: '',
        customerAddress: '',
        date: new Date().toISOString().split('T')[0],
        notes: '',
      });
      setItems([{
        id: '1',
        date: new Date().toISOString().split('T')[0],
        invoiceNumber: '',
        creditNote: '',
        invoiceAmount: 0,
        creditAmount: 0,
        payment: 0,
      }]);
      
    } catch (error) {
      console.error('Error creating remittance advice:', error);
      toast.error('Failed to create remittance advice. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5 text-primary" />
            <span>Create Remittance Advice</span>
          </DialogTitle>
          <DialogDescription>
            Create a new remittance advice document for customer payments
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="adviceNumber">Advice Number</Label>
                  <Input
                    id="adviceNumber"
                    value={formData.adviceNumber}
                    onChange={(e) => setFormData({ ...formData, adviceNumber: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="customerName">Customer Name</Label>
                <Input
                  id="customerName"
                  value={formData.customerName}
                  onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                  placeholder="Enter customer name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="customerAddress">Customer Address</Label>
                <Textarea
                  id="customerAddress"
                  value={formData.customerAddress}
                  onChange={(e) => setFormData({ ...formData, customerAddress: e.target.value })}
                  placeholder="Enter customer address"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Payment Items */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                <span>Payment Items</span>
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Invoice Number</TableHead>
                    <TableHead>Credit Note</TableHead>
                    <TableHead>Invoice Amount</TableHead>
                    <TableHead>Credit Amount</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Input
                          type="date"
                          value={item.date}
                          onChange={(e) => updateItem(item.id, 'date', e.target.value)}
                          className="w-full"
                          required
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={item.invoiceNumber || ''}
                          onChange={(e) => updateItem(item.id, 'invoiceNumber', e.target.value)}
                          placeholder="Invoice #"
                          className="w-full"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={item.creditNote || ''}
                          onChange={(e) => updateItem(item.id, 'creditNote', e.target.value)}
                          placeholder="Credit Note #"
                          className="w-full"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          value={item.invoiceAmount || ''}
                          onChange={(e) => updateItem(item.id, 'invoiceAmount', parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                          className="w-full"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          value={item.creditAmount || ''}
                          onChange={(e) => updateItem(item.id, 'creditAmount', parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                          className="w-full"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          value={item.payment || ''}
                          onChange={(e) => updateItem(item.id, 'payment', parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                          className="w-full"
                          required
                        />
                      </TableCell>
                      <TableCell>
                        {items.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeItem(item.id)}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="mt-4 flex justify-end">
                <div className="text-right">
                  <div className="text-lg font-semibold">
                    Total Payment: ${calculateTotalPayment().toFixed(2)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Additional Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Enter any additional notes or comments"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Remittance Advice'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
