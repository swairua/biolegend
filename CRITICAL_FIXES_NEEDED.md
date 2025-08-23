# 🚨 CRITICAL FIXES NEEDED IMMEDIATELY

## **Priority 1: Hardcoded Company/User IDs**

### **Issue**
Multiple components use hardcoded UUIDs instead of current company/user context, causing data to be associated with wrong entities.

### **Affected Files & Exact Lines**

1. **`src/components/inventory/AddInventoryItemModal.tsx`** (~line 108)
   ```typescript
   // ❌ CURRENT (WRONG)
   const newProduct = {
     company_id: '550e8400-e29b-41d4-a716-446655440000',
     // ... other fields
   };
   
   // ✅ FIX
   const newProduct = {
     company_id: currentCompany?.id,
     // ... other fields
   };
   ```

2. **`src/components/invoices/CreateInvoiceModal.tsx`**
   ```typescript
   // ❌ CURRENT (WRONG)
   created_by: '660e8400-e29b-41d4-a716-446655440000'
   
   // ✅ FIX
   created_by: user?.id || currentUser?.id
   ```

3. **`src/components/payments/RecordPaymentModal.tsx`**
   ```typescript
   // ❌ CURRENT (WRONG)
   company_id: selectedInvoice?.company_id || '550e8400-e29b-41d4-a716-446655440000'
   
   // ✅ FIX
   company_id: selectedInvoice?.company_id || currentCompany?.id
   ```

4. **Proforma Components**
   - `src/components/proforma/CreateProformaModal.tsx`
   - `src/components/proforma/EditProformaModal.tsx`

### **Impact**
- Products created will belong to wrong company
- Invoices attributed to wrong user
- Payments associated with wrong company
- Data corruption and access issues

---

## **Priority 2: TypeScript Interface Mismatch**

### **Issue**
`Invoice` interface missing `lpo_number` field that forms are trying to use.

### **File:** `src/hooks/useDatabase.ts`

```typescript
// ❌ CURRENT Interface
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

// ✅ ADD THIS FIELD
export interface Invoice {
  // ... all existing fields above
  lpo_number?: string;  // ← ADD THIS LINE
}
```

### **Impact**
- TypeScript compilation errors
- Forms sending data that doesn't match type expectations
- Loss of type safety

---

## **Priority 3: Proforma Tax Fields Not Persisted**

### **Issue**
UI calculates tax fields but database hook doesn't save them.

### **File:** `src/hooks/useQuotationItems.ts`

```typescript
// ❌ CURRENT (in useCreateProformaWithItems)
const proformaItems = items.map((item, index) => ({
  proforma_invoice_id: proformaId,
  product_id: item.product_id,
  description: item.description,
  quantity: item.quantity,
  unit_price: item.unit_price,
  discount_percentage: item.discount_percentage || 0,
  line_total: item.line_total,
  sort_order: index + 1,
  // ❌ TAX FIELDS MISSING
}));

// ✅ FIX - ADD TAX FIELDS
const proformaItems = items.map((item, index) => ({
  proforma_invoice_id: proformaId,
  product_id: item.product_id,
  description: item.description,
  quantity: item.quantity,
  unit_price: item.unit_price,
  discount_percentage: item.discount_percentage || 0,
  tax_percentage: item.tax_percentage || 0,        // ← ADD
  tax_amount: item.tax_amount || 0,                // ← ADD
  tax_inclusive: item.tax_inclusive || false,      // ← ADD
  line_total: item.line_total,
  sort_order: index + 1,
}));
```

### **Impact**
- Tax calculations lost when saving proforma
- Inconsistent data between UI and database
- Financial calculation errors

---

## **🔧 Quick Fix Commands**

### **1. Find All Hardcoded IDs**
```bash
# Search for hardcoded company ID
grep -r "550e8400-e29b-41d4-a716-446655440000" src/

# Search for hardcoded user ID  
grep -r "660e8400-e29b-41d4-a716-446655440000" src/
```

### **2. Verify Current Company Usage**
```bash
# Find components using currentCompany correctly
grep -r "currentCompany" src/components/
```

---

## **⚡ Immediate Action Plan**

1. **Update `src/hooks/useDatabase.ts`**
   - Add `lpo_number?: string` to Invoice interface

2. **Fix `src/components/inventory/AddInventoryItemModal.tsx`**
   - Replace hardcoded company_id with `currentCompany?.id`

3. **Fix `src/components/invoices/CreateInvoiceModal.tsx`**
   - Replace hardcoded created_by with actual user ID

4. **Fix `src/hooks/useQuotationItems.ts`**
   - Add tax fields to proforma items mapping

5. **Search and replace all other hardcoded IDs**

---

## **✅ Verification Steps**

After fixes:

1. **Test Product Creation**
   - Create product → verify `company_id` is correct
   
2. **Test Invoice Creation**
   - Create invoice → verify `created_by` is current user
   
3. **Test Proforma Creation**
   - Create proforma with tax → verify tax fields saved

4. **Check TypeScript Compilation**
   - Verify no compilation errors with Invoice interface

---

**These fixes are critical for data integrity and must be applied before production use.**
