import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import logger from '../../config/logger.js';

/**
 * Generate a professional Purchase Order PDF using pdfkit and save it to disk.
 * @param {Object} purchase - Mongoose VendorPurchase document
 * @returns {Promise<string>} - Resolves with the secure file path on disk
 */
export const generatePurchasePdf = async (purchase) => {
  // 1. Define file paths
  const secureDir = path.join(process.cwd(), 'uploads', 'secure_purchases');
  if (!fs.existsSync(secureDir)) {
    fs.mkdirSync(secureDir, { recursive: true });
  }
  const filePath = path.join(secureDir, `${purchase._id}.pdf`);

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const writeStream = fs.createWriteStream(filePath);
      doc.pipe(writeStream);

      // --- Header / Brand ---
      doc.fillColor('#0A3324')
         .fontSize(22)
         .text('AGRIPORT', 50, 50, { bold: true });
      doc.fontSize(10)
         .fillColor('#555555')
         .text('Wholesale Agro-Trading Platform', 50, 75);

      // --- Company Info (Left) ---
      doc.fontSize(9)
         .fillColor('#333333')
         .text('Agriport Private Limited', 50, 95)
         .text('GSTIN: 27AAAAA1111A1Z1')
         .text('Bhiwandi Warehouse, Sector 5, Thane')
         .text('Maharashtra - 421302')
         .text('Email: purchase@agriport.in | Phone: +91 9999900000');

      // --- PO details (Right-aligned) ---
      doc.fontSize(16)
         .fillColor('#0A3324')
         .text('PURCHASE ORDER', 300, 50, { align: 'right' });

      const poRef = `PO-${purchase._id.toString().slice(-8).toUpperCase()}`;
      doc.fontSize(9)
         .fillColor('#333333')
         .text(`PO Reference: ${poRef}`, 300, 75, { align: 'right' })
         .text(`PO Date: ${new Date(purchase.purchaseDate).toLocaleDateString('en-IN')}`, 300, 90, { align: 'right' })
         .text(`Status: ${(purchase.status || 'pending').toUpperCase()}`, 300, 105, { align: 'right' });

      // Draw a line separating header
      doc.moveTo(50, 140).lineTo(545, 140).strokeColor('#cccccc').stroke();

      // --- Vendor Info (Left) & Bill From (Right) ---
      doc.fontSize(10)
         .fillColor('#0A3324')
         .text('VENDOR / SUPPLIER:', 50, 155, { bold: true })
         .text('BILL FROM:', 300, 155, { bold: true });

      doc.fontSize(9)
         .fillColor('#333333')
         .text(`Name: ${purchase.vendorName || 'N/A'}`, 50, 170)
         .text(`Phone: ${purchase.vendorPhone || 'N/A'}`, 50, 185)
         .text(`Origin: ${purchase.origin || 'N/A'}`, 50, 200);

      doc.text('Agriport Private Limited', 300, 170)
         .text('Bhiwandi Warehouse, Sector 5, Thane', 300, 185, { width: 245 })
         .text('Maharashtra - 421302', 300, 200);

      // Draw a line separating address details
      doc.moveTo(50, 225).lineTo(545, 225).strokeColor('#cccccc').stroke();

      // --- Product Info ---
      doc.fontSize(10)
         .fillColor('#0A3324')
         .text('PRODUCT DETAILS:', 50, 240, { bold: true });

      doc.fontSize(9)
         .fillColor('#333333')
         .text(`Product: ${purchase.productName || 'N/A'}`, 50, 258)
         .text(`Brand: ${purchase.brand || 'N/A'}`, 50, 273)
         .text(`Lead Time: ${purchase.leadTimeDays ? `${purchase.leadTimeDays} days` : 'N/A'}`, 50, 288);

      // Draw a line
      doc.moveTo(50, 308).lineTo(545, 308).strokeColor('#cccccc').stroke();

      // --- Line Items Table (Variants) ---
      const tableTop = 325;
      doc.fontSize(10)
         .fillColor('#0A3324')
         .text('Size / Variant', 50, tableTop, { bold: true })
         .text('Packing', 180, tableTop, { bold: true })
         .text('Net Wt (kg)', 260, tableTop, { bold: true, align: 'right', width: 80 })
         .text('Qty (Cartons)', 350, tableTop, { bold: true, align: 'right', width: 80 })
         .text('Price/Unit (₹)', 445, tableTop, { bold: true, align: 'right', width: 100 });

      // Draw table header line
      doc.moveTo(50, tableTop + 15).lineTo(545, tableTop + 15).strokeColor('#0A3324').stroke();

      let rowY = tableTop + 25;
      const variants = purchase.sizeVariants || [];
      if (variants.length > 0) {
        for (const variant of variants) {
          doc.fontSize(9)
             .fillColor('#333333')
             .text(variant.size || 'N/A', 50, rowY, { width: 120 })
             .text(variant.packingType || 'Cartoon', 180, rowY, { width: 80 })
             .text(variant.netWeight ? variant.netWeight.toFixed(1) : 'N/A', 260, rowY, { align: 'right', width: 80 })
             .text(`${variant.stock || 0}`, 350, rowY, { align: 'right', width: 80 })
             .text(variant.price ? variant.price.toFixed(2) : '0.00', 445, rowY, { align: 'right', width: 100 });
          rowY += 20;
        }
      } else {
        // No variants — show aggregated single line
        doc.fontSize(9)
           .fillColor('#333333')
           .text(purchase.productName || 'N/A', 50, rowY, { width: 190 })
           .text('N/A', 180, rowY, { width: 80 })
           .text('N/A', 260, rowY, { align: 'right', width: 80 })
           .text(`${purchase.quantity || 0}`, 350, rowY, { align: 'right', width: 80 })
           .text(purchase.buyPrice ? purchase.buyPrice.toFixed(2) : '0.00', 445, rowY, { align: 'right', width: 100 });
        rowY += 20;
      }

      // Draw line under table items
      doc.moveTo(50, rowY).lineTo(545, rowY).strokeColor('#cccccc').stroke();

      // --- Financial Summary ---
      rowY += 10;
      doc.fontSize(9)
         .fillColor('#333333')
         .text(`Total Cartons: ${purchase.quantity || 0}`, 50, rowY)
         .text(`Buy Price/Carton: ₹ ${purchase.buyPrice ? purchase.buyPrice.toFixed(2) : '0.00'}`, 50, rowY + 15);

      doc.fontSize(11)
         .fillColor('#0A3324')
         .text('Total Purchase Value:', 300, rowY, { bold: true, align: 'right', width: 140 })
         .text(`₹ ${purchase.total ? purchase.total.toFixed(2) : '0.00'}`, 445, rowY, { bold: true, align: 'right', width: 100 });

      // --- Notes (if any) ---
      if (purchase.notes) {
        rowY += 40;
        doc.moveTo(50, rowY).lineTo(545, rowY).strokeColor('#cccccc').stroke();
        rowY += 10;
        doc.fontSize(9)
           .fillColor('#555555')
           .text('Notes:', 50, rowY, { bold: true })
           .text(purchase.notes, 50, rowY + 15, { width: 495 });
      }

      // --- Footer ---
      doc.fontSize(8)
         .fillColor('#777777')
         .text('This Purchase Order is issued by Agriport Private Limited for internal procurement reference.', 50, 720, { align: 'center', width: 495 })
         .text('This document is computer-generated and does not require a physical signature.', 50, 735, { align: 'center', width: 495 });

      doc.end();

      writeStream.on('finish', () => {
        logger.info(`Purchase PDF generated successfully at: ${filePath}`);
        resolve(filePath);
      });

      writeStream.on('error', (err) => {
        logger.error('Error writing purchase PDF stream:', err);
        reject(err);
      });
    } catch (err) {
      logger.error('Error generating purchase PDF:', err);
      reject(err);
    }
  });
};
