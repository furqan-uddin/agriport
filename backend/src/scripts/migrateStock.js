/**
 * One-time migration script: Recompute product.stock from sizeVariants carton counts
 * and migrate specifications['Brand Name'] to product.brand top-level field.
 *
 * Run: node --experimental-vm-modules migrateStock.js
 * Or:  npx dotenv -e .env -- node migrateStock.js
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../.env') });

const MONGO_URI = process.env.MONGO_URI || process.env.DATABASE_URL || 'mongodb://localhost:27017/agriport';

const productSchema = new mongoose.Schema({}, { strict: false, collection: 'products' });
const Product = mongoose.model('Product', productSchema);

async function migrate() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB. Starting migration...\n');

  const products = await Product.find({});
  console.log(`Found ${products.length} products to process.`);

  let updated = 0;
  let skipped = 0;

  for (const product of products) {
    const updates = {};

    // 1. Recompute stock from sizeVariants carton counts
    const sizeVariants = product.sizeVariants || [];
    const newStock = sizeVariants.reduce((sum, v) => sum + (v.stock || 0), 0);
    if (product.stock !== newStock) {
      updates.stock = newStock;
    }

    // 2. Migrate specifications['Brand Name'] → product.brand (if not already set)
    const specs = product.specifications;
    if (specs && !product.brand) {
      const brandName = specs instanceof Map
        ? specs.get('Brand Name')
        : (specs['Brand Name'] || null);
      if (brandName) {
        updates.brand = brandName;
      }
    }

    // 3. Update status based on new stock
    const newStatus = (updates.stock !== undefined ? updates.stock : product.stock) > 0
      ? 'in_stock'
      : 'out_of_stock';
    if (product.status !== newStatus) {
      updates.status = newStatus;
    }

    if (Object.keys(updates).length > 0) {
      await Product.updateOne({ _id: product._id }, { $set: updates });
      console.log(`  ✓ Updated "${product.name}" — stock: ${product.stock} → ${updates.stock ?? product.stock}, brand: "${updates.brand ?? product.brand ?? ''}"`);
      updated++;
    } else {
      skipped++;
    }
  }

  console.log(`\nMigration complete. Updated: ${updated}, Already correct: ${skipped}`);
  await mongoose.disconnect();
  console.log('Disconnected from MongoDB.');
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
