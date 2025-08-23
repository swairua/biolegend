// Quick test script to verify PDF generation functionality
// Run this in browser console on the app page

console.log('🚀 Testing Biolegend PDF Generation...');

// Sample invoice data matching the attached document
const sampleInvoiceData = {
  type: 'invoice',
  number: 'INV-552',
  date: '2025-08-12',
  due_date: '2025-09-11',
  customer: {
    name: 'NAS AIRPORT SERVICES',
    address: 'P. O. Box 19010 00501\nNairobi, KENYA',
    phone: '+254780165490/ +254741207690'
  },
  company: {
    name: 'BIOLEGEND SCIENTIFIC LTD',
    address: 'P.O Box 85988-00200\nNAIROBI\nKenya',
    phone: 'Tel: 0741 207 690/0780 165 490',
    email: 'Email: biolegend@biolegendscientific.co.ke/info@biolegendscientific.co.ke\nWebsite:www.biolegendscientific.co.ke',
    tax_number: 'P051658002D'
  },
  items: [
    {
      description: 'Wooden Sterile swab sticks',
      quantity: 20,
      unit_price: 2000,
      tax_percentage: 16,
      tax_amount: 6400,
      line_total: 46400,
      unit_of_measure: 'Pkt of 100'
    }
  ],
  subtotal: 40000,
  tax_amount: 6400,
  total_amount: 46400,
  notes: 'Thank you for your business',
  terms_and_conditions: 'Payment terms are cash on delivery, unless credit terms are established at the Seller\'s sole discretion.'
};

// Function to test PDF generation (call this from browser console)
function testPDFGeneration() {
  try {
    // This would be called from the browser where the generatePDF function is available
    if (typeof generatePDF === 'function') {
      const pdfWindow = generatePDF(sampleInvoiceData);
      console.log('✅ PDF generated successfully!', pdfWindow ? 'Window opened' : 'Window reference received');
      return true;
    } else {
      console.log('⚠️ generatePDF function not available. Make sure you\'re on the app page.');
      console.log('📋 Sample data ready for manual testing:', sampleInvoiceData);
      return false;
    }
  } catch (error) {
    console.error('❌ PDF generation failed:', error);
    return false;
  }
}

console.log('📄 Sample Invoice Data prepared:');
console.log(JSON.stringify(sampleInvoiceData, null, 2));
console.log('\n🔧 To test PDF generation:');
console.log('1. Open the app in your browser');
console.log('2. Navigate to /setup-test');
console.log('3. Click "Generate Sample PDF" button');
console.log('4. Or run testPDFGeneration() in the browser console');

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { sampleInvoiceData, testPDFGeneration };
}
