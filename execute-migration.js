// Temporary script to execute force migration
import { executeComprehensiveMigration } from './src/utils/comprehensiveMigration.js';

console.log('🚀 Starting force migration...');

executeComprehensiveMigration()
  .then((result) => {
    console.log('Migration completed:', result);
    if (result.success) {
      console.log('✅ Migration successful!');
    } else {
      console.log('⚠️ Migration completed with issues');
    }
  })
  .catch((error) => {
    console.error('❌ Migration failed:', error);
  });
