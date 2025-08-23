/**
 * Comprehensive rebranding utility for updating all Biolegend Scientific Ltd references
 * This utility provides the new branding constants and can be used to ensure consistency
 */

export const BIOLEGEND_BRANDING = {
  // Company Information
  COMPANY_NAME: 'Biolegend Scientific Ltd',
  COMPANY_NAME_FULL: 'Biolegend Scientific Ltd',
  COMPANY_TAGLINE: 'Delivering Discoveries.... and more',
  
  // Contact Information
  ADDRESS: 'P.O Box 85988-00200, Nairobi, Kenya',
  PHONE: 'Tel: 0741 207 690/0780 165 490',
  EMAIL: 'biolegend@biolegendscientific.co.ke',
  EMAIL_SECONDARY: 'info@biolegendscientific.co.ke',
  WEBSITE: 'www.biolegendscientific.co.ke',
  
  // Admin Credentials
  ADMIN_EMAIL: 'admin@biolegendscientific.co.ke',
  ADMIN_PASSWORD: 'Biolegend2024!Admin',
  
  // Branding Assets
  LOGO_URL: 'https://cdn.builder.io/api/v1/image/assets%2F69400b16069b456f9aaefcb4af79d463%2F1183a0a5c37e4fe69d12256c4d461bcd?format=webp&width=800',
  
  // Colors (HSL values for CSS variables)
  COLORS: {
    PRIMARY: '280 45% 42%', // Biolegend Purple
    SECONDARY: '45 85% 57%', // Biolegend Gold
    SUCCESS: '140 50% 45%', // Green
  },
  
  // Email Templates
  EMAIL_SIGNATURE: `Best regards,
Biolegend Scientific Ltd Team
Tel: 0741 207 690/0780 165 490
Email: biolegend@biolegendscientific.co.ke/info@biolegendscientific.co.ke
Website: www.biolegendscientific.co.ke`,
  
  // PDF Headers
  PDF_HEADER_INFO: [
    'P.O Box 85988-00200, Nairobi, Kenya',
    'Tel: 0741 207 690/0780 165 490',
    'Email: biolegend@biolegendscientific.co.ke/info@biolegendscientific.co.ke',
    'Website: www.biolegendscientific.co.ke'
  ],
};

/**
 * Legacy MedPlus patterns to be replaced
 */
export const LEGACY_PATTERNS = {
  COMPANY_NAMES: [
    'MedPlus Africa',
    'MedPlus Africa Limited',
    'MedPlus Africa Ltd',
    'Medplus Africa Limited'
  ],
  
  EMAILS: [
    'admin@medplus.app',
    'admin@medplusafrica.com',
    'sales@medplusafrica.com',
    'info@medplusafrica.com',
    'superadmin@medplusafrica.co'
  ],
  
  PHONES: [
    '+254 713149223, +254 733 468610',
    'Tel: +254 713149223, +254 733 468610'
  ],
  
  ADDRESSES: [
    'Siens Plaza 4th floor room 1 opposite kcb bank River road',
    'P.O BOX 45352 - 00100, NAIROBI KENYA'
  ]
};

/**
 * Generate email template with Biolegend branding
 */
export const generateBiolegendEmailTemplate = (
  type: 'quotation' | 'invoice' | 'general',
  documentNumber?: string,
  customerName?: string
) => {
  const subjects = {
    quotation: `Quotation ${documentNumber} from ${BIOLEGEND_BRANDING.COMPANY_NAME}`,
    invoice: `Invoice ${documentNumber} from ${BIOLEGEND_BRANDING.COMPANY_NAME}`,
    general: `Message from ${BIOLEGEND_BRANDING.COMPANY_NAME}`
  };

  const body = `Dear ${customerName || 'Valued Customer'},

Thank you for your business with ${BIOLEGEND_BRANDING.COMPANY_NAME}.

${BIOLEGEND_BRANDING.EMAIL_SIGNATURE}`;

  return {
    subject: subjects[type],
    body
  };
};

/**
 * Get company details object for PDF generation
 */
export const getBiolegendCompanyDetails = () => ({
  name: BIOLEGEND_BRANDING.COMPANY_NAME,
  address: BIOLEGEND_BRANDING.ADDRESS,
  city: 'Nairobi',
  country: 'Kenya',
  phone: BIOLEGEND_BRANDING.PHONE,
  email: BIOLEGEND_BRANDING.EMAIL,
  tax_number: 'P051701091X',
  logo_url: BIOLEGEND_BRANDING.LOGO_URL
});

/**
 * CSS variables for Biolegend color scheme
 */
export const BIOLEGEND_CSS_VARIABLES = `
  /* Biolegend Scientific Ltd Brand Colors */
  --primary: ${BIOLEGEND_BRANDING.COLORS.PRIMARY};
  --secondary: ${BIOLEGEND_BRANDING.COLORS.SECONDARY};
  --success: ${BIOLEGEND_BRANDING.COLORS.SUCCESS};
`;

console.log('🎨 Biolegend Scientific Ltd Branding Loaded');
console.log('📧 Admin Email:', BIOLEGEND_BRANDING.ADMIN_EMAIL);
console.log('📞 Phone:', BIOLEGEND_BRANDING.PHONE);
console.log('🏢 Company:', BIOLEGEND_BRANDING.COMPANY_NAME);
