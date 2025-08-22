import { runProductCategoryMigration } from './fixProductCategoryMigration';

// Force run the migration immediately
console.log('🚀 FORCING Product Category Migration...');

runProductCategoryMigration()
  .then((result) => {
    console.log('✅ MIGRATION COMPLETED!');
    console.log('Result:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('🎉 Product category migration was successful!');
      console.log('Details:');
      console.log('- Product categories table created:', result.details?.productCategoriesTableCreated);
      console.log('- Categories inserted:', result.details?.categoriesInserted);
      console.log('- Has category_id column:', result.details?.hasCategoryId);
      console.log('- Company ID used:', result.details?.companyId);
    } else {
      console.error('❌ Migration failed:', result.message);
      console.error('Error:', result.error);
    }
  })
  .catch((error) => {
    console.error('❌ MIGRATION SCRIPT ERROR:', error);
  });

export { runProductCategoryMigration };
