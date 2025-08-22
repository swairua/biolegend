import { runLPOMigration } from './runLPOMigration';

// Execute the migration immediately when this file is imported
(async () => {
  console.log('🚀 Force executing LPO migration...');
  try {
    const result = await runLPOMigration();
    if (result.success) {
      console.log('✅ LPO Migration completed successfully!');
    } else {
      console.error('❌ LPO Migration failed:', result.message);
    }
  } catch (error) {
    console.error('❌ Error executing LPO migration:', error);
  }
})();
