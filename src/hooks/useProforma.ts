import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { calculateDocumentTotals, type TaxableItem } from '@/utils/taxCalculation';

export interface ProformaItem {
  id?: string;
  proforma_id?: string;
  product_id: string;
  product_name?: string;
  description: string;
  quantity: number;
  unit_price: number;
  discount_percentage?: number;
  discount_amount?: number;
  tax_percentage: number;
  tax_amount: number;
  tax_inclusive: boolean;
  line_total: number;
}

export interface ProformaInvoice {
  id?: string;
  company_id: string;
  customer_id: string;
  proforma_number: string;
  proforma_date: string;
  valid_until: string;
  subtotal: number;
  tax_percentage?: number;
  tax_amount: number;
  total_amount: number;
  status: 'draft' | 'sent' | 'accepted' | 'expired' | 'converted';
  notes?: string;
  terms_and_conditions?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ProformaWithItems extends ProformaInvoice {
  customers?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  proforma_items?: ProformaItem[];
}

/**
 * Hook to fetch proforma invoices for a company
 */
export const useProformas = (companyId?: string) => {
  return useQuery({
    queryKey: ['proforma_invoices', companyId],
    queryFn: async () => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from('proforma_invoices')
        .select(`
          *,
          customers (
            id,
            name,
            email,
            phone,
            address
          ),
          proforma_items (
            *,
            products (
              name
            )
          )
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching proformas:', error);
        throw error;
      }

      // Map product names to items for compatibility
      const proformasWithProductNames = data?.map(proforma => ({
        ...proforma,
        proforma_items: proforma.proforma_items?.map(item => ({
          ...item,
          product_name: item.products?.name || ''
        }))
      }));

      return proformasWithProductNames as ProformaWithItems[];
    },
    enabled: !!companyId,
  });
};

/**
 * Hook to fetch a single proforma invoice
 */
export const useProforma = (proformaId?: string) => {
  return useQuery({
    queryKey: ['proforma_invoice', proformaId],
    queryFn: async () => {
      if (!proformaId) return null;

      const { data, error } = await supabase
        .from('proforma_invoices')
        .select(`
          *,
          customers (
            id,
            name,
            email,
            phone,
            address
          ),
          proforma_items (
            *,
            products (
              name
            )
          )
        `)
        .eq('id', proformaId)
        .single();

      if (error) {
        console.error('Error fetching proforma:', error);
        throw error;
      }

      // Map product names to items for compatibility
      const proformaWithProductNames = {
        ...data,
        proforma_items: data.proforma_items?.map(item => ({
          ...item,
          product_name: item.products?.name || ''
        }))
      };

      return proformaWithProductNames as ProformaWithItems;
    },
    enabled: !!proformaId,
  });
};

/**
 * Hook to create a proforma invoice with items
 */
export const useCreateProforma = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ proforma, items }: { proforma: ProformaInvoice; items: ProformaItem[] }) => {
      // Validate and calculate totals
      const taxableItems: TaxableItem[] = items.map(item => ({
        quantity: item.quantity,
        unit_price: item.unit_price,
        tax_percentage: item.tax_percentage,
        tax_inclusive: item.tax_inclusive,
        discount_percentage: item.discount_percentage,
        discount_amount: item.discount_amount,
      }));

      const totals = calculateDocumentTotals(taxableItems);

      // Update proforma with calculated totals
      const proformaWithTotals = {
        ...proforma,
        subtotal: totals.subtotal,
        tax_amount: totals.tax_total,
        total_amount: totals.total_amount,
      };

      // Create the proforma invoice
      const { data: proformaData, error: proformaError } = await supabase
        .from('proforma_invoices')
        .insert([proformaWithTotals])
        .select()
        .single();

      if (proformaError) {
        console.error('Error creating proforma:', proformaError);
        throw proformaError;
      }

      // Create the proforma items
      if (items.length > 0) {
        const proformaItems = items.map(item => ({
          proforma_id: proformaData.id,
          product_id: item.product_id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount_percentage: item.discount_percentage || 0,
          discount_amount: item.discount_amount || 0,
          tax_percentage: item.tax_percentage,
          tax_amount: item.tax_amount,
          tax_inclusive: item.tax_inclusive,
          line_total: item.line_total,
        }));

        const { error: itemsError } = await supabase
          .from('proforma_items')
          .insert(proformaItems);

        if (itemsError) {
          console.error('Error creating proforma items:', itemsError);
          // Try to delete the proforma if items creation failed
          await supabase.from('proforma_invoices').delete().eq('id', proformaData.id);
          throw itemsError;
        }
      }

      return proformaData;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['proforma_invoices'] });
      toast.success(`Proforma invoice ${data.proforma_number} created successfully!`);
    },
    onError: (error) => {
      console.error('Error creating proforma:', error);
      toast.error('Failed to create proforma invoice');
    },
  });
};

/**
 * Hook to update a proforma invoice
 */
export const useUpdateProforma = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      proformaId, 
      proforma, 
      items 
    }: { 
      proformaId: string; 
      proforma: Partial<ProformaInvoice>; 
      items?: ProformaItem[] 
    }) => {
      // If items are provided, recalculate totals
      if (items) {
        const taxableItems: TaxableItem[] = items.map(item => ({
          quantity: item.quantity,
          unit_price: item.unit_price,
          tax_percentage: item.tax_percentage,
          tax_inclusive: item.tax_inclusive,
          discount_percentage: item.discount_percentage,
          discount_amount: item.discount_amount,
        }));

        const totals = calculateDocumentTotals(taxableItems);

        // Update proforma with calculated totals
        proforma = {
          ...proforma,
          subtotal: totals.subtotal,
          tax_amount: totals.tax_total,
          total_amount: totals.total_amount,
        };
      }

      // Update the proforma invoice
      const { data: proformaData, error: proformaError } = await supabase
        .from('proforma_invoices')
        .update(proforma)
        .eq('id', proformaId)
        .select()
        .single();

      if (proformaError) {
        console.error('Error updating proforma:', proformaError);
        throw proformaError;
      }

      // Update items if provided
      if (items) {
        // Delete existing items
        const { error: deleteError } = await supabase
          .from('proforma_items')
          .delete()
          .eq('proforma_id', proformaId);

        if (deleteError) {
          console.error('Error deleting existing proforma items:', deleteError);
          throw deleteError;
        }

        // Insert new items
        if (items.length > 0) {
          const proformaItems = items.map(item => ({
            proforma_id: proformaId,
            product_id: item.product_id,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            discount_percentage: item.discount_percentage || 0,
            discount_amount: item.discount_amount || 0,
            tax_percentage: item.tax_percentage,
            tax_amount: item.tax_amount,
            tax_inclusive: item.tax_inclusive,
            line_total: item.line_total,
          }));

          const { error: itemsError } = await supabase
            .from('proforma_items')
            .insert(proformaItems);

          if (itemsError) {
            console.error('Error creating updated proforma items:', itemsError);
            throw itemsError;
          }
        }
      }

      return proformaData;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['proforma_invoices'] });
      queryClient.invalidateQueries({ queryKey: ['proforma_invoice', data.id] });
      toast.success(`Proforma invoice ${data.proforma_number} updated successfully!`);
    },
    onError: (error) => {
      console.error('Error updating proforma:', error);
      toast.error('Failed to update proforma invoice');
    },
  });
};

/**
 * Hook to delete a proforma invoice
 */
export const useDeleteProforma = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (proformaId: string) => {
      const { error } = await supabase
        .from('proforma_invoices')
        .delete()
        .eq('id', proformaId);

      if (error) {
        console.error('Error deleting proforma:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proforma_invoices'] });
      toast.success('Proforma invoice deleted successfully!');
    },
    onError: (error) => {
      console.error('Error deleting proforma:', error);
      toast.error('Failed to delete proforma invoice');
    },
  });
};

/**
 * Hook to generate proforma number
 */
export const useGenerateProformaNumber = () => {
  return useMutation({
    mutationFn: async (companyId: string) => {
      try {
        const { data, error } = await supabase.rpc('generate_proforma_number', {
          company_uuid: companyId
        });

        if (error) {
          // Extract meaningful error message from Supabase error object
          let errorMessage = 'Unknown database error';

          if (typeof error === 'string') {
            errorMessage = error;
          } else if (error && typeof error === 'object') {
            // Handle different Supabase error formats
            if (error.message) {
              errorMessage = error.message;
            } else if (error.details) {
              errorMessage = error.details;
            } else if (error.hint) {
              errorMessage = error.hint;
            } else if (error.code) {
              errorMessage = `Database error (code: ${error.code})`;
            } else {
              // Try to get meaningful info from error object
              try {
                const errorKeys = Object.keys(error);
                if (errorKeys.length > 0) {
                  errorMessage = JSON.stringify(error, null, 2);
                }
              } catch {
                errorMessage = String(error);
              }
            }
          }

          console.error('Error generating proforma number:', errorMessage);

          // Check if it's a function not found error
          if (errorMessage.includes('function generate_proforma_number') ||
              errorMessage.includes('does not exist') ||
              errorMessage.includes('is not defined') ||
              errorMessage.includes('cannot find')) {
            console.warn('generate_proforma_number function not found, using fallback');
            throw new Error('Database function not found. Using fallback number generation.');
          }

          // Check for permission errors
          if (errorMessage.includes('permission denied') ||
              errorMessage.includes('access denied') ||
              errorMessage.includes('insufficient privilege')) {
            console.warn('Permission denied for proforma number generation, using fallback');
            throw new Error('Permission denied for database function. Using fallback number generation.');
          }

          throw new Error(`Failed to generate proforma number: ${errorMessage}`);
        }

        return data;
      } catch (error) {
        // Fallback to client-side generation
        const timestamp = Date.now().toString().slice(-6);
        const year = new Date().getFullYear();
        const fallbackNumber = `PF-${year}-${timestamp}`;

        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.warn('Proforma number generation failed, using fallback:', errorMessage);
        console.info('Generated fallback number:', fallbackNumber);

        return fallbackNumber;
      }
    },
  });
};

/**
 * Hook to convert proforma to invoice
 */
export const useConvertProformaToInvoice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (proformaId: string) => {
      // This would implement the conversion logic
      // For now, just mark the proforma as converted
      const { data, error } = await supabase
        .from('proforma_invoices')
        .update({ status: 'converted' })
        .eq('id', proformaId)
        .select()
        .single();

      if (error) {
        console.error('Error converting proforma to invoice:', error);
        throw error;
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['proforma_invoices'] });
      queryClient.invalidateQueries({ queryKey: ['proforma_invoice', data.id] });
      toast.success(`Proforma invoice ${data.proforma_number} converted to invoice!`);
    },
    onError: (error) => {
      console.error('Error converting proforma to invoice:', error);
      toast.error('Failed to convert proforma to invoice');
    },
  });
};
