// Debug component to check data flow in quotation modal
// This shows what's happening with companies/customers/products

import { useCompanies, useCustomers, useProducts } from '@/hooks/useDatabase';

export function DebugQuotationData() {
  const { data: companies, isLoading: loadingCompanies, error: companiesError } = useCompanies();
  const currentCompany = companies?.[0];
  const { data: customers, isLoading: loadingCustomers, error: customersError } = useCustomers(currentCompany?.id);
  const { data: products, isLoading: loadingProducts, error: productsError } = useProducts(currentCompany?.id);

  console.log('=== QUOTATION MODAL DEBUG ===');
  console.log('Companies:', { 
    data: companies, 
    loading: loadingCompanies, 
    error: companiesError,
    count: companies?.length || 0 
  });
  console.log('Current Company:', currentCompany);
  console.log('Customers:', { 
    data: customers, 
    loading: loadingCustomers, 
    error: customersError,
    count: customers?.length || 0,
    companyId: currentCompany?.id 
  });
  console.log('Products:', { 
    data: products, 
    loading: loadingProducts, 
    error: productsError,
    count: products?.length || 0 
  });

  return (
    <div className="p-4 bg-gray-100 rounded-lg">
      <h3 className="font-bold mb-2">Quotation Modal Data Debug</h3>
      <div className="space-y-2 text-sm">
        <div>
          <strong>Companies:</strong> {loadingCompanies ? 'Loading...' : 
            companiesError ? `Error: ${companiesError.message}` : 
            `Found ${companies?.length || 0} companies`}
        </div>
        {currentCompany && (
          <div><strong>Current Company:</strong> {currentCompany.name} (ID: {currentCompany.id})</div>
        )}
        <div>
          <strong>Customers:</strong> {loadingCustomers ? 'Loading...' : 
            customersError ? `Error: ${customersError.message}` : 
            `Found ${customers?.length || 0} customers`}
        </div>
        <div>
          <strong>Products:</strong> {loadingProducts ? 'Loading...' : 
            productsError ? `Error: ${productsError.message}` : 
            `Found ${products?.length || 0} products`}
        </div>
      </div>
      
      {customers && customers.length > 0 && (
        <div className="mt-4">
          <strong>Customer List:</strong>
          <ul className="list-disc list-inside">
            {customers.map(customer => (
              <li key={customer.id}>{customer.name} ({customer.customer_code})</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
