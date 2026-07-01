import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import Order from './order.model.js';
import Transaction from '../payments/transaction.model.js';
import logger from '../../config/logger.js';

/**
 * Generate a professional tax invoice PDF using pdfkit and save it securely.
 * @param {Object} order - Mongoose Order document
 * @returns {Promise<string>} - Resolves with the secure file path on disk
 */
export const generateInvoice = async (order) => {
  // 1. Ensure invoiceNo and gatePassNo are populated
  let modified = false;
  const cleanRef = order.reference.replace('AGP-', '');

  if (!order.invoiceNo) {
    order.invoiceNo = `INV-${cleanRef}`;
    modified = true;
  }
  if (!order.gatePassNo) {
    order.gatePassNo = `GP-${cleanRef}`;
    modified = true;
  }
  if (modified) {
    await order.save();
  }

  // 2. Fetch associated transaction for payment details
  const transaction = await Transaction.findOne({ orderId: order._id });

  // 3. Define file paths
  const secureDir = path.join(process.cwd(), 'uploads', 'secure_invoices');
  if (!fs.existsSync(secureDir)) {
    fs.mkdirSync(secureDir, { recursive: true });
  }
  const filePath = path.join(secureDir, `${order.reference}.pdf`);

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
         .text('Email: billing@agriport.in | Phone: +91 9999900000');

      // --- Invoice details (Right-aligned) ---
      doc.fontSize(16)
         .fillColor('#0A3324')
         .text('INVOICE', 350, 50, { align: 'right' });
      
      doc.fontSize(9)
         .fillColor('#333333')
         .text(`Invoice No: ${order.invoiceNo}`, 350, 75, { align: 'right' })
         .text(`Invoice Date: ${new Date(order.createdAt).toLocaleDateString('en-IN')}`, 350, 90, { align: 'right' })
         .text(`Order Reference: ${order.reference}`, 350, 105, { align: 'right' })
         .text(`Payment Status: ${(order.paymentStatus || 'pending').toUpperCase()}`, 350, 120, { align: 'right' })
         .text(`Payment Mode: ${(order.paymentMode || 'offline').toUpperCase()}`, 350, 135, { align: 'right' });

      // Draw a line separating header
      doc.moveTo(50, 160).lineTo(545, 160).strokeColor('#cccccc').stroke();

      // --- Bill To & Deliver To (Side by side) ---
      doc.fontSize(10)
         .fillColor('#0A3324')
         .text('BILL TO:', 50, 175, { bold: true })
         .text('PICKUP DETAILS:', 300, 175, { bold: true });

      doc.fontSize(9)
         .fillColor('#333333')
         .text(`Name: ${order.customerName || 'N/A'}`, 50, 190)
         .text(`Company: ${order.companyName || 'N/A'}`, 50, 205)
         .text(`Phone: ${order.customerPhone || 'N/A'}`, 50, 220)
         .text(`Billing City: ${order.customerCity || 'N/A'}`, 50, 235);

      doc.text(`Gate Pass No: ${order.gatePassNo || 'N/A'}`, 300, 190)
         .text(`Pickup Warehouse: ${order.pickupAddress || 'Agriport Bhiwandi Warehouse'}`, 300, 205, { width: 245 })
         .text(`Delivery Address: ${order.deliveryAddress || 'N/A'}`, 300, 235, { width: 245 });

      // Draw a line separating address details
      doc.moveTo(50, 275).lineTo(545, 275).strokeColor('#cccccc').stroke();

      // --- Line Items Table ---
      const tableTop = 295;
      doc.fontSize(10)
         .fillColor('#0A3324')
         .text('Product Description', 50, tableTop, { bold: true })
         .text('Unit Price (₹)', 250, tableTop, { bold: true, align: 'right', width: 80 })
         .text('Qty', 350, tableTop, { bold: true, align: 'right', width: 50 })
         .text('Total (₹)', 445, tableTop, { bold: true, align: 'right', width: 100 });

      // Draw table header line
      doc.moveTo(50, tableTop + 15).lineTo(545, tableTop + 15).strokeColor('#0A3324').stroke();

      let rowY = tableTop + 25;
      for (const line of order.lines) {
        doc.fontSize(9)
           .fillColor('#333333')
           .text(line.name, 50, rowY, { width: 190 })
           .text(line.unitPrice.toFixed(2), 250, rowY, { align: 'right', width: 80 })
           .text(`${line.quantity} ${line.unit}`, 350, rowY, { align: 'right', width: 50 })
           .text(line.lineTotal.toFixed(2), 445, rowY, { align: 'right', width: 100 });

        rowY += 20;
      }

      // Draw line under table items
      doc.moveTo(50, rowY).lineTo(545, rowY).strokeColor('#cccccc').stroke();

      // --- Financial Summaries (Right Aligned) ---
      rowY += 10;
      doc.fontSize(11)
         .fillColor('#0A3324')
         .text('Grand Total:', 350, rowY, { bold: true, align: 'right', width: 90 })
         .text(`₹ ${order.total.toFixed(2)}`, 445, rowY, { bold: true, align: 'right', width: 100 });

      // --- Footer ---
      doc.fontSize(8)
         .fillColor('#777777')
         .text('Thank you for choosing Agriport for your wholesale agro-sourcing requirements.', 50, 720, { align: 'center', width: 495 })
         .text('This document is a computer-generated invoice and does not require a physical signature.', 50, 735, { align: 'center', width: 495 });

      doc.end();

      writeStream.on('finish', () => {
        logger.info(`Invoice generated successfully at: ${filePath}`);
        resolve(filePath);
      });

      writeStream.on('error', (err) => {
        logger.error('Error writing invoice stream:', err);
        reject(err);
      });
    } catch (err) {
      logger.error('Error generating invoice PDF:', err);
      reject(err);
    }
  });
};
