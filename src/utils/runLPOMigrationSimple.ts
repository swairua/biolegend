import { supabase } from '@/integrations/supabase/client';

export const runLPOMigrationSimple = async () => {
  console.log('🚀 Starting LPO tables migration (simplified)...');
  
  try {
    // Step 1: Create the LPO enum and main table
    console.log('Creating LPO tables...');
    const { error: mainError } = await supabase.rpc('exec_sql', {
      query: `
        -- Create LPO status enum
        DO $$ BEGIN
            CREATE TYPE lpo_status AS ENUM ('draft', 'sent', 'approved', 'received', 'cancelled');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;

        -- Main LPO table
        CREATE TABLE IF NOT EXISTS lpos (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
            supplier_id UUID REFERENCES customers(id) ON DELETE CASCADE,
            lpo_number VARCHAR(100) UNIQUE NOT NULL,
            lpo_date DATE NOT NULL DEFAULT CURRENT_DATE,
            delivery_date DATE,
            status lpo_status DEFAULT 'draft',
            subtotal DECIMAL(15,2) DEFAULT 0,
            tax_amount DECIMAL(15,2) DEFAULT 0,
            total_amount DECIMAL(15,2) DEFAULT 0,
            notes TEXT,
            terms_and_conditions TEXT,
            delivery_address TEXT,
            contact_person VARCHAR(255),
            contact_phone VARCHAR(50),
            created_by UUID REFERENCES users(id),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });
    
    if (mainError) {
      console.log('Main table error:', JSON.stringify(mainError, null, 2));
      if (!mainError.message?.includes('already exists')) {
        throw new Error(`Failed to create lpos table: ${JSON.stringify(mainError)}`);
      }
    }

    // Step 2: Create LPO items table
    console.log('Creating LPO items table...');
    const { error: itemsError } = await supabase.rpc('exec_sql', {
      query: `
        -- LPO items table
        CREATE TABLE IF NOT EXISTS lpo_items (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            lpo_id UUID REFERENCES lpos(id) ON DELETE CASCADE,
            product_id UUID REFERENCES products(id),
            description TEXT NOT NULL,
            quantity DECIMAL(10,3) NOT NULL,
            unit_price DECIMAL(15,2) NOT NULL,
            tax_rate DECIMAL(5,2) DEFAULT 0,
            tax_amount DECIMAL(15,2) DEFAULT 0,
            line_total DECIMAL(15,2) NOT NULL,
            notes TEXT,
            sort_order INTEGER DEFAULT 0
        );
      `
    });
    
    if (itemsError) {
      console.log('Items table error:', JSON.stringify(itemsError, null, 2));
      if (!itemsError.message?.includes('already exists')) {
        throw new Error(`Failed to create lpo_items table: ${JSON.stringify(itemsError)}`);
      }
    }

    // Step 3: Create indexes
    console.log('Creating indexes...');
    const { error: indexError } = await supabase.rpc('exec_sql', {
      query: `
        CREATE INDEX IF NOT EXISTS idx_lpos_company_id ON lpos(company_id);
        CREATE INDEX IF NOT EXISTS idx_lpos_supplier_id ON lpos(supplier_id);
        CREATE INDEX IF NOT EXISTS idx_lpos_lpo_number ON lpos(lpo_number);
        CREATE INDEX IF NOT EXISTS idx_lpos_status ON lpos(status);
        CREATE INDEX IF NOT EXISTS idx_lpos_lpo_date ON lpos(lpo_date);
        CREATE INDEX IF NOT EXISTS idx_lpo_items_lpo_id ON lpo_items(lpo_id);
        CREATE INDEX IF NOT EXISTS idx_lpo_items_product_id ON lpo_items(product_id);
      `
    });
    
    if (indexError) {
      console.log('Index creation warning:', JSON.stringify(indexError, null, 2));
      // Indexes are not critical, continue
    }

    // Step 4: Create LPO number generation function
    console.log('Creating LPO number generation function...');
    const { error: functionError } = await supabase.rpc('exec_sql', {
      query: `
        CREATE OR REPLACE FUNCTION generate_lpo_number(company_uuid UUID)
        RETURNS TEXT AS $$
        DECLARE
            company_code TEXT;
            lpo_count INTEGER;
            lpo_number TEXT;
        BEGIN
            SELECT COALESCE(UPPER(LEFT(name, 3)), 'LPO') INTO company_code
            FROM companies 
            WHERE id = company_uuid;
            
            SELECT COUNT(*) INTO lpo_count
            FROM lpos
            WHERE company_id = company_uuid;
            
            lpo_number := company_code || '-LPO-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD((lpo_count + 1)::TEXT, 4, '0');
            
            RETURN lpo_number;
        END;
        $$ LANGUAGE plpgsql;
      `
    });
    
    if (functionError) {
      console.log('Function creation error:', JSON.stringify(functionError, null, 2));
      if (!functionError.message?.includes('already exists')) {
        console.warn('LPO number generation function failed to create, but continuing...');
      }
    }

    // Verify tables were created
    console.log('🔍 Verifying LPO tables...');
    const { data: lposTest, error: lposError } = await supabase
      .from('lpos')
      .select('id')
      .limit(1);
      
    if (lposError) {
      throw new Error(`LPO table verification failed: ${JSON.stringify(lposError)}`);
    }

    const { data: itemsTest, error: itemsVerifyError } = await supabase
      .from('lpo_items')
      .select('id')
      .limit(1);

    if (itemsVerifyError) {
      throw new Error(`LPO items table verification failed: ${JSON.stringify(itemsVerifyError)}`);
    }

    console.log('✅ LPO migration completed and verified successfully!');
    return { 
      success: true, 
      message: 'LPO tables created and verified successfully!' 
    };
    
  } catch (error) {
    console.error('❌ LPO migration failed:', error);
    
    let errorMessage = 'Unknown error';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'object' && error !== null) {
      errorMessage = JSON.stringify(error, null, 2);
    } else {
      errorMessage = String(error);
    }
    
    return { 
      success: false, 
      error,
      message: `Migration failed: ${errorMessage}`
    };
  }
};
