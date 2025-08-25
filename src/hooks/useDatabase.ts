import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Types
export interface Company {
  id: string;
  name: string;
  registration_number?: string;
  tax_number?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  currency?: string;
  logo_url?: string;
  fiscal_year_start?: number;
  tax_settings?: TaxSetting[];
  created_at?: string;
  updated_at?: string;
}

export interface TaxSetting {
  id: string;
  company_id: string;
  name: string;
  rate: number;
  is_active: boolean;
  is_default?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface StockMovement {
  id: string;
  company_id: string;
  product_id: string;
  movement_type: 'IN' | 'OUT' | 'ADJUSTMENT';
  reference_type: 'INVOICE' | 'DELIVERY_NOTE' | 'RESTOCK' | 'ADJUSTMENT';
  reference_id?: string;
  quantity: number;
  cost_per_unit?: number;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Customer {
  id: string;
  company_id: string;
  customer_code: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  credit_limit?: number;
  payment_terms?: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Product {
  id: string;
  company_id: string;
  category_id?: string;
  product_code: string;
  name: string;
  description?: string;
  unit_of_measure?: string;
  cost_price?: number;
  selling_price: number;
  stock_quantity?: number;
  minimum_stock_level?: number;
  maximum_stock_level?: number;
  reorder_point?: number;
  is_active?: boolean;
  track_inventory?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Invoice {
  id: string;
  company_id: string;
  customer_id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  status: string;
  subtotal?: number;
  tax_amount?: number;
  total_amount?: number;
  paid_amount?: number;
  balance_due?: number;
  notes?: string;
  terms_and_conditions?: string;
  affects_inventory?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Payment {
  id: string;
  company_id: string;
  customer_id: string;
  payment_number: string;
  payment_date: string;
  amount: number;
  payment_method: string;
  reference_number?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface RemittanceAdvice {
  id: string;
  company_id: string;
  customer_id: string;
  advice_number: string;
  advice_date: string;
  total_payment: number;
  status: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface DeliveryNote {
  id: string;
  company_id: string;
  customer_id: string;
  delivery_number: string; // Matches database schema
  delivery_note_number?: string; // For backward compatibility
  delivery_date: string;
  delivery_address: string;
  delivery_method: string;
  tracking_number?: string;
  carrier?: string;
  status: string;
  notes?: string;
  delivered_by?: string;
  received_by?: string;
  invoice_number?: string;
  created_at?: string;
  updated_at?: string;
}

export interface LPO {
  id: string;
  company_id: string;
  supplier_id: string;
  lpo_number: string;
  lpo_date: string;
  delivery_date?: string;
  status: 'draft' | 'sent' | 'approved' | 'received' | 'cancelled';
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  notes?: string;
  terms_and_conditions?: string;
  delivery_address?: string;
  contact_person?: string;
  contact_phone?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  // Related data
  suppliers?: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  lpo_items?: LPOItem[];
}

export interface LPOItem {
  id: string;
  lpo_id: string;
  product_id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  tax_amount: number;
  line_total: number;
  notes?: string;
  sort_order: number;
  // Related data
  products?: {
    name: string;
    product_code: string;
    unit_of_measure?: string;
  };
}

// Companies hooks
export const useCompanies = () => {
  return useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Company[];
    },
  });
};

export const useCreateCompany = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (company: Omit<Company, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('companies')
        .insert([company])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
    },
  });
};

export const useUpdateCompany = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...company }: Partial<Company> & { id: string }) => {
      const { data, error } = await supabase
        .from('companies')
        .update(company)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
    },
  });
};

// Customers hooks
export const useCustomers = (companyId?: string) => {
  return useQuery({
    queryKey: ['customers', companyId],
    queryFn: async () => {
      let query = supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (companyId) {
        query = query.eq('company_id', companyId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as Customer[];
    },
  });
};

export const useCreateCustomer = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (customer: Omit<Customer, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('customers')
        .insert([customer])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
};

export const useUpdateCustomer = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...customer }: Partial<Customer> & { id: string }) => {
      const { data, error } = await supabase
        .from('customers')
        .update(customer)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
};

export const useDeleteCustomer = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
};

// Products hooks
export const useProducts = (companyId?: string) => {
  return useQuery({
    queryKey: ['products', companyId],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select(`
          *,
          product_categories(name)
        `)
        .order('created_at', { ascending: false });
      
      if (companyId) {
        query = query.eq('company_id', companyId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data;
    },
  });
};

export const useCreateProduct = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (product: Omit<Product, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('products')
        .insert([product])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
};

export const useUpdateProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...product }: Partial<Product> & { id: string }) => {
      const { data, error } = await supabase
        .from('products')
        .update(product)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
};

// Stock Movement hooks
export const useCreateStockMovement = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (movement: Omit<StockMovement, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('stock_movements')
        .insert([movement])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock_movements'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
};

// Tax Settings hooks
export const useTaxSettings = (companyId?: string) => {
  return useQuery({
    queryKey: ['tax_settings', companyId],
    queryFn: async () => {
      let query = supabase
        .from('tax_settings')
        .select('*')
        .order('created_at', { ascending: false });

      if (companyId) {
        query = query.eq('company_id', companyId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as TaxSetting[];
    },
  });
};

export const useCreateTaxSetting = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taxSetting: Omit<TaxSetting, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('tax_settings')
        .insert([taxSetting])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax_settings'] });
    },
  });
};

export const useUpdateTaxSetting = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...taxSetting }: Partial<TaxSetting> & { id: string }) => {
      const { data, error } = await supabase
        .from('tax_settings')
        .update(taxSetting)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax_settings'] });
    },
  });
};

export const useDeleteTaxSetting = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('tax_settings')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax_settings'] });
    },
  });
};

// Invoices hooks - Fixed to avoid relationship ambiguity
export const useInvoices = (companyId?: string) => {
  return useQuery({
    queryKey: ['invoices', companyId],
    queryFn: async () => {
      if (!companyId) return [];

      try {
        // Step 1: Get invoices without embedded relationships
        let query = supabase
          .from('invoices')
          .select(`
            id,
            company_id,
            customer_id,
            invoice_number,
            invoice_date,
            due_date,
            status,
            subtotal,
            tax_amount,
            total_amount,
            paid_amount,
            balance_due,
            notes,
            terms_and_conditions,
            lpo_number,
            created_at,
            updated_at
          `)
          .eq('company_id', companyId)
          .order('created_at', { ascending: false });

        const { data: invoices, error: invoicesError } = await query;

        if (invoicesError) throw invoicesError;
        if (!invoices || invoices.length === 0) return [];

        // Step 2: Get customers separately (filter out invalid UUIDs)
        const customerIds = [...new Set(invoices.map(invoice => invoice.customer_id).filter(id => id && typeof id === 'string' && id.length === 36))];
        const { data: customers } = customerIds.length > 0 ? await supabase
          .from('customers')
          .select('id, name, email, phone, address, city, country')
          .in('id', customerIds) : { data: [] };

        // Step 3: Get invoice items separately
        const { data: invoiceItems } = await supabase
          .from('invoice_items')
          .select(`
            id,
            invoice_id,
            product_id,
            description,
            quantity,
            unit_price,
            discount_before_vat,
            tax_percentage,
            tax_amount,
            tax_inclusive,
            line_total,
            sort_order
          `)
          .in('invoice_id', invoices.map(inv => inv.id));

        // Step 4: Create lookup maps
        const customerMap = new Map();
        (customers || []).forEach(customer => {
          customerMap.set(customer.id, customer);
        });

        const itemsMap = new Map();
        (invoiceItems || []).forEach(item => {
          if (!itemsMap.has(item.invoice_id)) {
            itemsMap.set(item.invoice_id, []);
          }
          itemsMap.get(item.invoice_id).push(item);
        });

        // Step 5: Combine data
        return invoices.map(invoice => ({
          ...invoice,
          customers: customerMap.get(invoice.customer_id) || {
            name: 'Unknown Customer',
            email: null,
            phone: null
          },
          invoice_items: itemsMap.get(invoice.id) || []
        }));

      } catch (error) {
        console.error('Error in useInvoices:', error);
        throw error;
      }
    },
  });
};

export const useCustomerInvoices = (customerId?: string, companyId?: string) => {
  return useQuery({
    queryKey: ['customer_invoices', customerId, companyId],
    queryFn: async () => {
      if (!customerId) return [];

      try {
        // Get invoices without embedded relationships
        let query = supabase
          .from('invoices')
          .select(`
            id,
            company_id,
            customer_id,
            invoice_number,
            invoice_date,
            due_date,
            status,
            subtotal,
            tax_amount,
            total_amount,
            paid_amount,
            balance_due,
            notes,
            terms_and_conditions,
            lpo_number,
            created_at,
            updated_at
          `)
          .eq('customer_id', customerId)
          .order('created_at', { ascending: false });

        if (companyId) {
          query = query.eq('company_id', companyId);
        }

        const { data: invoices, error: invoicesError } = await query;

        if (invoicesError) throw invoicesError;
        if (!invoices || invoices.length === 0) return [];

        // Get invoice items separately
        const { data: invoiceItems } = await supabase
          .from('invoice_items')
          .select(`
            id,
            invoice_id,
            product_id,
            description,
            quantity,
            unit_price,
            discount_before_vat,
            tax_percentage,
            tax_amount,
            tax_inclusive,
            line_total,
            sort_order
          `)
          .in('invoice_id', invoices.map(inv => inv.id));

        // Group items by invoice
        const itemsMap = new Map();
        (invoiceItems || []).forEach(item => {
          if (!itemsMap.has(item.invoice_id)) {
            itemsMap.set(item.invoice_id, []);
          }
          itemsMap.get(item.invoice_id).push(item);
        });

        // Combine data
        return invoices.map(invoice => ({
          ...invoice,
          invoice_items: itemsMap.get(invoice.id) || []
        }));

      } catch (error) {
        console.error('Error in useCustomerInvoices:', error);
        throw error;
      }
    },
    enabled: !!customerId,
  });
};

export const useCreateInvoice = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (invoice: Omit<Invoice, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('invoices')
        .insert([invoice])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
};

// Payments hooks
export const usePayments = (companyId?: string) => {
  return useQuery({
    queryKey: ['payments', companyId],
    queryFn: async () => {
      let query = supabase
        .from('payments')
        .select(`
          *,
          customers(name, email),
          payment_allocations(*, invoices(invoice_number, total_amount))
        `)
        .order('created_at', { ascending: false });

      if (companyId) {
        query = query.eq('company_id', companyId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
  });
};

export const useCustomerPayments = (customerId?: string, companyId?: string) => {
  return useQuery({
    queryKey: ['customer_payments', customerId, companyId],
    queryFn: async () => {
      if (!customerId) return [];

      let query = supabase
        .from('payments')
        .select(`
          *,
          payment_allocations(*, invoices(invoice_number, total_amount))
        `)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (companyId) {
        query = query.eq('company_id', companyId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
    enabled: !!customerId,
  });
};

export const useCreatePayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (paymentData: Omit<Payment, 'id' | 'created_at' | 'updated_at'> & { invoice_id: string }) => {
      // Validate UUID fields before insert
      if (!paymentData.company_id || typeof paymentData.company_id !== 'string' || paymentData.company_id.length !== 36) {
        throw new Error('Invalid company ID. Please refresh and try again.');
      }
      if (paymentData.customer_id && (typeof paymentData.customer_id !== 'string' || paymentData.customer_id.length !== 36)) {
        throw new Error('Invalid customer ID. Please select a valid invoice.');
      }
      if (!paymentData.invoice_id || typeof paymentData.invoice_id !== 'string' || paymentData.invoice_id.length !== 36) {
        throw new Error('Invalid invoice ID. Please select a valid invoice.');
      }

      // Use database function to record payment with invoice allocation and balance update
      const { data, error } = await supabase.rpc('record_payment_with_allocation', {
        p_company_id: paymentData.company_id,
        p_customer_id: paymentData.customer_id,
        p_invoice_id: paymentData.invoice_id,
        p_payment_number: paymentData.payment_number,
        p_payment_date: paymentData.payment_date,
        p_amount: paymentData.amount,
        p_payment_method: paymentData.payment_method,
        p_reference_number: paymentData.reference_number || paymentData.payment_number,
        p_notes: paymentData.notes || null
      });

      if (error) {
        console.error('Database function error:', error);
        throw error;
      }

      if (!data || !data.success) {
        throw new Error(data?.error || 'Failed to record payment');
      }

      return data;
    },
    onSuccess: (result) => {
      // Invalidate multiple cache keys to refresh UI
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice', result.invoice_id] });
      queryClient.invalidateQueries({ queryKey: ['customer_invoices'] });
    },
  });
};

// Remittance Advice hooks
export const useRemittanceAdvice = (companyId?: string) => {
  return useQuery({
    queryKey: ['remittance_advice', companyId],
    queryFn: async () => {
      let query = supabase
        .from('remittance_advice')
        .select(`
          *,
          customers(name, email, address),
          remittance_advice_items(*, payments(payment_number), invoices(invoice_number))
        `)
        .order('created_at', { ascending: false });
      
      if (companyId) {
        query = query.eq('company_id', companyId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data;
    },
  });
};

export const useCreateRemittanceAdvice = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (remittance: Omit<RemittanceAdvice, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('remittance_advice')
        .insert([remittance])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['remittance_advice'] });
    },
  });
};

// Quotations hooks
export const useQuotations = (companyId?: string) => {
  return useQuery({
    queryKey: ['quotations', companyId],
    queryFn: async () => {
      let query = supabase
        .from('quotations')
        .select(`
          *,
          customers(name, email, phone),
          quotation_items(*, products(name, unit_of_measure))
        `)
        .order('created_at', { ascending: false });
      
      if (companyId) {
        query = query.eq('company_id', companyId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data;
    },
  });
};

export const useCreateQuotation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (quotation: any) => {
      const { data, error } = await supabase
        .from('quotations')
        .insert([quotation])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
    },
  });
};

// Stock movements hooks
export const useStockMovements = (companyId?: string) => {
  return useQuery({
    queryKey: ['stock_movements', companyId],
    queryFn: async () => {
      let query = supabase
        .from('stock_movements')
        .select(`
          *,
          products(name, product_code, unit_of_measure)
        `)
        .order('created_at', { ascending: false });
      
      if (companyId) {
        query = query.eq('company_id', companyId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data;
    },
  });
};

// Helper function to generate document numbers
export const useGenerateDocumentNumber = () => {
  return useMutation({
    mutationFn: async ({ companyId, type }: { companyId: string; type: 'quotation' | 'invoice' | 'remittance' | 'proforma' }) => {
      const functionName = `generate_${type}_number`;
      const { data, error } = await supabase.rpc(functionName, { company_uuid: companyId });
      
      if (error) throw error;
      return data;
    },
  });
};

// Delivery Notes hooks
export const useDeliveryNotes = (companyId?: string) => {
  return useQuery({
    queryKey: ['delivery_notes', companyId],
    queryFn: async () => {
      let query = supabase
        .from('delivery_notes')
        .select(`
          *,
          customers(name, email, phone, address, city, country),
          delivery_note_items(*, products(name, unit_of_measure))
        `)
        .order('created_at', { ascending: false });

      if (companyId) {
        query = query.eq('company_id', companyId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
  });
};

export const useCreateDeliveryNote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (deliveryNote: Omit<DeliveryNote, 'id' | 'created_at' | 'updated_at'>) => {
      // Validate that delivery note is backed by a sale (invoice)
      if (!deliveryNote.invoice_id) {
        throw new Error('Delivery note must be linked to an existing invoice or sale.');
      }

      // Verify the invoice exists and belongs to the same company
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .select('id, customer_id, company_id')
        .eq('id', deliveryNote.invoice_id)
        .eq('company_id', deliveryNote.company_id)
        .single();

      if (invoiceError || !invoice) {
        throw new Error('Related invoice not found or does not belong to this company.');
      }

      // Verify customer matches
      if (invoice.customer_id !== deliveryNote.customer_id) {
        throw new Error('Delivery note customer must match the invoice customer.');
      }

      const { data, error } = await supabase
        .from('delivery_notes')
        .insert([deliveryNote])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery_notes'] });
    },
  });
};

export const useUpdateDeliveryNote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...deliveryNote }: Partial<DeliveryNote> & { id: string }) => {
      const { data, error } = await supabase
        .from('delivery_notes')
        .update(deliveryNote)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery_notes'] });
    },
  });
};

// Dashboard stats hook
export const useDashboardStats = (companyId?: string) => {
  return useQuery({
    queryKey: ['dashboard_stats', companyId],
    queryFn: async () => {
      // Get counts and totals
      const [
        { data: invoices },
        { data: customers },
        { data: products },
        { data: payments }
      ] = await Promise.all([
        supabase
          .from('invoices')
          .select('total_amount, status')
          .eq('company_id', companyId || '550e8400-e29b-41d4-a716-446655440000'),
        supabase
          .from('customers')
          .select('id')
          .eq('company_id', companyId || '550e8400-e29b-41d4-a716-446655440000'),
        supabase
          .from('products')
          .select('stock_quantity, minimum_stock_level')
          .eq('company_id', companyId || '550e8400-e29b-41d4-a716-446655440000'),
        supabase
          .from('payments')
          .select('amount')
          .eq('company_id', companyId || '550e8400-e29b-41d4-a716-446655440000')
      ]);

      const totalRevenue = invoices?.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0) || 0;
      const totalPayments = payments?.reduce((sum, pay) => sum + Number(pay.amount || 0), 0) || 0;
      const lowStockProducts = products?.filter(p => p.stock_quantity <= p.minimum_stock_level).length || 0;
      const pendingInvoices = invoices?.filter(inv => inv.status === 'sent').length || 0;

      return {
        totalRevenue,
        totalPayments,
        customerCount: customers?.length || 0,
        productCount: products?.length || 0,
        lowStockProducts,
        pendingInvoices,
        totalInvoices: invoices?.length || 0
      };
    },
  });
};

// ============= LPO Hooks =============

export const useLPOs = (companyId?: string) => {
  return useQuery({
    queryKey: ['lpos', companyId],
    queryFn: async () => {
      let query = supabase
        .from('lpos')
        .select(`
          *,
          suppliers:customers!supplier_id(name, email, phone, address, city, country),
          lpo_items(*, products(name, product_code, unit_of_measure))
        `)
        .order('created_at', { ascending: false });

      if (companyId) {
        query = query.eq('company_id', companyId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });
};

export const useLPO = (lpoId?: string) => {
  return useQuery({
    queryKey: ['lpo', lpoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lpos')
        .select(`
          *,
          suppliers:customers!supplier_id(name, email, phone, address, city, country),
          lpo_items(*, products(name, product_code, unit_of_measure))
        `)
        .eq('id', lpoId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!lpoId,
  });
};

export const useCreateLPO = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ lpo, items }: { lpo: Omit<LPO, 'id' | 'created_at' | 'updated_at'>; items: Omit<LPOItem, 'id' | 'lpo_id'>[] }) => {
      // Validate required fields
      if (!lpo.company_id) {
        throw new Error('Company ID is required');
      }
      if (!lpo.supplier_id) {
        throw new Error('Supplier is required');
      }
      if (!lpo.lpo_number) {
        throw new Error('LPO number is required');
      }
      if (!items || items.length === 0) {
        throw new Error('At least one item is required');
      }

      // Create LPO
      const { data: lpoData, error: lpoError } = await supabase
        .from('lpos')
        .insert([lpo])
        .select()
        .single();

      if (lpoError) throw lpoError;

      // Create LPO items
      if (items.length > 0) {
        const lpoItems = items.map((item, index) => ({
          ...item,
          lpo_id: lpoData.id,
          sort_order: index + 1
        }));

        const { error: itemsError } = await supabase
          .from('lpo_items')
          .insert(lpoItems);

        if (itemsError) throw itemsError;
      }

      return lpoData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lpos'] });
    },
  });
};

export const useUpdateLPO = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<LPO> & { id: string }) => {
      const { data, error } = await supabase
        .from('lpos')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lpos'] });
      queryClient.invalidateQueries({ queryKey: ['lpo'] });
    },
  });
};

export const useDeleteLPO = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('lpos')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lpos'] });
    },
  });
};

// Generate LPO number
export const useGenerateLPONumber = () => {
  return useMutation({
    mutationFn: async (companyId: string) => {
      if (!companyId) {
        throw new Error('Company ID is required to generate LPO number');
      }

      const { data, error } = await supabase
        .rpc('generate_lpo_number', { company_uuid: companyId });

      if (error) {
        console.error('Error generating LPO number:', error);
        throw new Error(`Failed to generate LPO number: ${error.message}`);
      }

      if (!data) {
        throw new Error('No LPO number was generated');
      }

      return data;
    },
  });
};

// Get suppliers (customers marked as suppliers)
export const useSuppliers = (companyId?: string) => {
  return useQuery({
    queryKey: ['suppliers', companyId],
    queryFn: async () => {
      let query = supabase
        .from('customers')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (companyId) {
        query = query.eq('company_id', companyId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });
};

// LPO Items Management Hooks

// Create LPO Item
export const useCreateLPOItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (item: Omit<LPOItem, 'id'>) => {
      const { data, error } = await supabase
        .from('lpo_items')
        .insert([item])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['lpos'] });
      queryClient.invalidateQueries({ queryKey: ['lpo', data.lpo_id] });
    },
  });
};

// Update LPO Item
export const useUpdateLPOItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<LPOItem> }) => {
      const { data, error } = await supabase
        .from('lpo_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['lpos'] });
      queryClient.invalidateQueries({ queryKey: ['lpo', data.lpo_id] });
    },
  });
};

// Delete LPO Item
export const useDeleteLPOItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('lpo_items')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lpos'] });
    },
  });
};

// Update LPO with Items (complete update)
export const useUpdateLPOWithItems = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      lpoId,
      lpoUpdates,
      items
    }: {
      lpoId: string;
      lpoUpdates: Partial<LPO>;
      items: (Omit<LPOItem, 'lpo_id'> & { id?: string })[];
    }) => {
      // Update LPO
      const { data: lpoData, error: lpoError } = await supabase
        .from('lpos')
        .update(lpoUpdates)
        .eq('id', lpoId)
        .select()
        .single();

      if (lpoError) throw lpoError;

      // Get existing items
      const { data: existingItems, error: existingError } = await supabase
        .from('lpo_items')
        .select('id')
        .eq('lpo_id', lpoId);

      if (existingError) throw existingError;

      // Delete all existing items
      if (existingItems && existingItems.length > 0) {
        const { error: deleteError } = await supabase
          .from('lpo_items')
          .delete()
          .eq('lpo_id', lpoId);

        if (deleteError) throw deleteError;
      }

      // Insert new items
      if (items.length > 0) {
        const lpoItems = items.map((item, index) => ({
          ...item,
          id: undefined, // Let database generate new IDs
          lpo_id: lpoId,
          sort_order: index + 1,
        }));

        const { error: itemsError } = await supabase
          .from('lpo_items')
          .insert(lpoItems);

        if (itemsError) throw itemsError;
      }

      return lpoData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lpos'] });
      queryClient.invalidateQueries({ queryKey: ['lpo'] });
    },
  });
};
