// Validation utilities for delivery notes to ensure they are properly backed by sales

export interface DeliveryNoteValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export const validateDeliveryNoteData = (
  deliveryNote: any,
  items: any[] = []
): DeliveryNoteValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required fields
  if (!deliveryNote.company_id) {
    errors.push('Company ID is required');
  }

  if (!deliveryNote.customer_id) {
    errors.push('Customer ID is required');
  }

  if (!deliveryNote.invoice_id) {
    errors.push('Invoice ID is required - delivery notes must be backed by a sale');
  }

  if (!deliveryNote.delivery_date) {
    errors.push('Delivery date is required');
  }

  if (!deliveryNote.delivery_address) {
    warnings.push('Delivery address is recommended');
  }

  // Check items
  if (!items || items.length === 0) {
    errors.push('At least one delivery item is required');
  }

  items.forEach((item, index) => {
    if (!item.product_id) {
      errors.push(`Item ${index + 1}: Product ID is required`);
    }
    
    if (!item.quantity || item.quantity <= 0) {
      errors.push(`Item ${index + 1}: Quantity must be greater than 0`);
    }

    if (item.quantity_delivered > item.quantity_ordered) {
      errors.push(`Item ${index + 1}: Delivered quantity cannot exceed ordered quantity`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

// Helper to check if delivery note has proper sales backing
export const hasProperSalesBacking = (deliveryNote: any): boolean => {
  return !!(deliveryNote.invoice_id || deliveryNote.quotation_id);
};

// Helper to get sales backing status
export const getSalesBackingStatus = (deliveryNote: any): {
  isBackedBySale: boolean;
  backingType: 'invoice' | 'quotation' | 'none';
  backingReference?: string;
} => {
  if (deliveryNote.invoice_id) {
    return {
      isBackedBySale: true,
      backingType: 'invoice',
      backingReference: deliveryNote.invoice_number || deliveryNote.invoice_id
    };
  }

  if (deliveryNote.quotation_id) {
    return {
      isBackedBySale: true,
      backingType: 'quotation',
      backingReference: deliveryNote.quotation_number || deliveryNote.quotation_id
    };
  }

  return {
    isBackedBySale: false,
    backingType: 'none'
  };
};
