# Form to Database Field Mapping Guide

This document provides a complete mapping between form fields and database columns to ensure proper data handling.

## Critical Issues Fixed

### 1. **High Priority Issues (Fixed)**
- ✅ Fixed `remittance_items` → `remittance_advice_items` in tax migration
- ✅ Added missing `unit_of_measure` columns to `lpo_items` and `delivery_note_items`
- ✅ Added delivery tracking fields (`delivery_method`, `tracking_number`, `carrier`)
- ✅ Added `lpo_number` to invoices table
- ✅ Ensured all tax columns exist on item tables

### 2. **Medium Priority Issues (Fixed)**
- ✅ Added form-compatible stock level columns (`min_stock_level`, `max_stock_level`)
- ✅ Added `discount_before_vat` columns for proper discount handling
- ✅ Added `product_name` columns for historical tracking

## Form Entity Mappings

### CUSTOMERS (CreateCustomerModal.tsx)
| Form Field | Database Column | Table | Notes |
|------------|----------------|-------|-------|
| `name` | `name` | customers | Required |
| `email` | `email` | customers | Optional |
| `phone` | `phone` | customers | Optional |
| `address` | `address` | customers | Optional |
| `city` | `city` | customers | Optional |
| `country` | `country` | customers | Default: 'Kenya' |
| `credit_limit` | `credit_limit` | customers | Number |
| `payment_terms` | `payment_terms` | customers | Number (days) |
| `is_active` | `is_active` | customers | Boolean |
| Generated: `customer_code` | `customer_code` | customers | Auto: CUST### |

**Additional DB fields not in form:**
- `state`, `postal_code`, `tax_number` - Consider adding to form

### PRODUCTS/INVENTORY (AddInventoryItemModal.tsx)
| Form Field | Database Column | Table | Notes |
|------------|----------------|-------|-------|
| `name` | `name` | products | Required |
| `product_code` | `product_code` | products | Auto-generated or manual |
| `description` | `description` | products | Optional |
| `category_id` | `category_id` | products | FK to product_categories |
| `unit_of_measure` | `unit_of_measure` | products | Default: 'pieces' |
| `cost_price` | `cost_price` | products | Number |
| `selling_price` | `selling_price` | products | Required |
| `stock_quantity` | `stock_quantity` | products | Number |
| `min_stock_level` | `min_stock_level` | products | ✅ Added |
| `max_stock_level` | `max_stock_level` | products | ✅ Added |

**Field Name Mapping:**
- Form uses `min_stock_level` → DB now has both `minimum_stock_level` and `min_stock_level`
- Form uses `max_stock_level` → DB now has both `maximum_stock_level` and `max_stock_level`

### INVOICES (CreateInvoiceModal.tsx)

#### Invoice Header
| Form Field | Database Column | Table | Notes |
|------------|----------------|-------|-------|
| `customer_id` | `customer_id` | invoices | Required, FK |
| `invoice_date` | `invoice_date` | invoices | Required |
| `due_date` | `due_date` | invoices | Required |
| `lpo_number` | `lpo_number` | invoices | ✅ Added |
| `notes` | `notes` | invoices | Optional |
| `terms_and_conditions` | `terms_and_conditions` | invoices | Optional |

#### Invoice Items
| Form Field | Database Column | Table | Notes |
|------------|----------------|-------|-------|
| `product_id` | `product_id` | invoice_items | FK to products |
| `product_name` | `product_name` | invoice_items | ✅ Added for history |
| `description` | `description` | invoice_items | Required |
| `quantity` | `quantity` | invoice_items | Required |
| `unit_price` | `unit_price` | invoice_items | Required |
| `discount_before_vat` | `discount_before_vat` | invoice_items | ✅ Added |
| `tax_percentage` | `tax_percentage` | invoice_items | ✅ Ensured exists |
| `tax_amount` | `tax_amount` | invoice_items | ✅ Ensured exists |
| `tax_inclusive` | `tax_inclusive` | invoice_items | ✅ Ensured exists |
| `line_total` | `line_total` | invoice_items | Calculated |

### QUOTATIONS (CreateQuotationModal.tsx)
**Same structure as invoices**, using `quotations` and `quotation_items` tables.
All tax and discount columns have been added.

### LPOs (CreateLPOModal.tsx)

#### LPO Header
| Form Field | Database Column | Table | Notes |
|------------|----------------|-------|-------|
| `supplier_id` | `supplier_id` | lpos | FK to customers(id) |
| `lpo_date` | `lpo_date` | lpos | Required |
| `delivery_date` | `delivery_date` | lpos | Optional |
| `delivery_address` | `delivery_address` | lpos | Optional |
| `contact_person` | `contact_person` | lpos | Optional |
| `contact_phone` | `contact_phone` | lpos | Optional |
| `notes` | `notes` | lpos | Optional |
| `terms_and_conditions` | `terms_and_conditions` | lpos | Optional |

#### LPO Items
| Form Field | Database Column | Table | Notes |
|------------|----------------|-------|-------|
| `product_id` | `product_id` | lpo_items | FK to products |
| `product_name` | `product_name` | lpo_items | ✅ Added |
| `description` | `description` | lpo_items | Required |
| `quantity` | `quantity` | lpo_items | Required |
| `unit_price` | `unit_price` | lpo_items | Required |
| `unit_of_measure` | `unit_of_measure` | lpo_items | ✅ Added |
| `tax_rate` | `tax_rate` | lpo_items | Exists as tax_rate |
| `tax_amount` | `tax_amount` | lpo_items | Exists |
| `line_total` | `line_total` | lpo_items | Calculated |

### DELIVERY NOTES (CreateDeliveryNoteModal.tsx)

#### Delivery Note Header
| Form Field | Database Column | Table | Notes |
|------------|----------------|-------|-------|
| `customer_id` | `customer_id` | delivery_notes | Required, FK |
| `related_invoice_id` | `invoice_id` | delivery_notes | Optional, FK |
| `delivery_date` | `delivery_date` | delivery_notes | Required |
| `delivery_method` | `delivery_method` | delivery_notes | ✅ Added |
| `tracking_number` | `tracking_number` | delivery_notes | ✅ Added |
| `carrier` | `carrier` | delivery_notes | ✅ Added |
| `delivery_address` | `delivery_address` | delivery_notes | Exists |
| `delivered_by` | `delivered_by` | delivery_notes | Exists |
| `received_by` | `received_by` | delivery_notes | Exists |

#### Delivery Note Items
| Form Field | Database Column | Table | Notes |
|------------|----------------|-------|-------|
| `product_id` | `product_id` | delivery_note_items | FK to products |
| `description` | `description` | delivery_note_items | Required |
| `quantity_ordered` | `quantity_ordered` | delivery_note_items | Exists |
| `quantity_delivered` | `quantity_delivered` | delivery_note_items | Exists |
| `unit_of_measure` | `unit_of_measure` | delivery_note_items | ✅ Added |

### PAYMENTS (RecordPaymentModal.tsx)
| Form Field | Database Column | Table | Notes |
|------------|----------------|-------|-------|
| `invoice_id` | `invoice_id` | payments | ✅ Added for direct reference |
| `amount` | `amount` | payments | Required |
| `payment_date` | `payment_date` | payments | Required |
| `payment_method` | `payment_method` | payments | Required |
| `reference_number` | `reference_number` | payments | Optional |
| `notes` | `notes` | payments | Optional |

**Payment Allocation Logic:**
- Create payment record in `payments` table
- Create allocation record in `payment_allocations` table linking payment to invoice
- Use `invoice_id` column for direct reference or rely on `payment_allocations`

### REMITTANCE ADVICE (CreateRemittanceModal.tsx)
| Form Field | Database Column | Table | Notes |
|------------|----------------|-------|-------|
| `customer_name` | `customer_name` | remittance_advice | ✅ Added |
| `customer_address` | `customer_address` | remittance_advice | ✅ Added |
| `date` | `advice_date` | remittance_advice | Field name difference |
| `notes` | `notes` | remittance_advice | Exists |

**Alternative:** Use `customer_id` instead of denormalized name/address

### USERS (CreateUserModal.tsx)
| Form Field | Database Column | Table | Notes |
|------------|----------------|-------|-------|
| `full_name` | `full_name` | profiles | Supabase pattern |
| `email` | `email` | profiles | Required |
| `role` | `role` | profiles | Enum |
| `phone` | `phone` | profiles | Optional |
| `department` | `department` | profiles | Optional |
| `position` | `position` | profiles | Optional |
| `status` | `status` | profiles | Enum |

**User Model Decision:**
- Use `profiles` table (Supabase auth pattern) instead of custom `users` table
- Map form fields to `profiles` table columns

## Implementation Notes

### 1. Form Validation Updates Needed
- Ensure forms validate required fields that map to NOT NULL columns
- Update form field names to match database columns where needed
- Add validation for foreign key relationships

### 2. API/Hook Updates Needed
- Update `useCreateCustomer`, `useCreateProduct`, etc. to handle new columns
- Map form field names to database column names in mutation functions
- Handle the user model choice (profiles vs users)

### 3. Data Type Considerations
- `DECIMAL` columns: Ensure forms send numbers, not strings
- `UUID` foreign keys: Validate UUIDs before sending to database
- `DATE` fields: Ensure proper date format (YYYY-MM-DD)
- `BOOLEAN` fields: Ensure true/false values, not 1/0

### 4. Migration Status
Run the `DATABASE_FIXES_MIGRATION.sql` script to ensure all columns exist.

### 5. Testing Checklist
- [ ] Test customer creation with all fields
- [ ] Test product creation with min/max stock levels
- [ ] Test invoice creation with LPO number and tax calculations
- [ ] Test LPO creation with unit of measure
- [ ] Test delivery note creation with tracking fields
- [ ] Test payment recording with invoice reference
- [ ] Test user creation using profiles table

## Common Pitfalls to Avoid

1. **Field Name Mismatches**: Always map form field names to actual database columns
2. **Missing Foreign Keys**: Ensure referenced IDs exist before creating records
3. **Tax Calculation**: Use the correct tax columns (tax_percentage, tax_amount, tax_inclusive)
4. **User Model Confusion**: Stick to either `users` or `profiles` table consistently
5. **Payment Allocations**: Remember to create both payment and allocation records

## Next Steps

1. Run the migration script in Supabase SQL Editor
2. Update form validation and API calls to use correct field mappings
3. Test all create/edit forms to ensure they work without errors
4. Consider adding the missing form fields (state, postal_code, etc.) for completeness
