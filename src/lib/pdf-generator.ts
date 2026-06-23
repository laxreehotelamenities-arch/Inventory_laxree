/**
 * Client-side PDF generation for order request lists.
 * Uses jsPDF to generate a professional PDF download in the browser.
 */
'use client';

import jsPDF from 'jspdf';
import type { Product } from '@/lib/types';
import type { AppUser } from '@/lib/types';

export interface CartItem {
  product: Product;
  qty: number;
}

export interface GeneratePDFOptions {
  cart: CartItem[];
  user: AppUser;
  orderId: string;
  submittedAt: Date;
}

export function generateOrderPDF({ cart, user, orderId, submittedAt }: GeneratePDFOptions): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageW = 210; // A4 width
  const pageH = 297; // A4 height
  const margin = 15;
  const contentW = pageW - margin * 2;
  let y = margin;

  // ---------- Header ----------
  // Dark header bar
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageW, 32, 'F');

  // Logo box
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(margin, 8, 16, 16, 2, 2, 'F');
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('LR', margin + 8, 18.5, { align: 'center' });

  // Company name
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('LaxRee Hotel Supplies', margin + 22, 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Inventory Order Request', margin + 22, 22);
  doc.text('Internal Application · Confidential', margin + 22, 26.5);

  // Order ID (right side)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`Order #${orderId}`, pageW - margin, 16, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(
    submittedAt.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
    pageW - margin,
    22,
    { align: 'right' }
  );

  y = 42;

  // ---------- Requestor Info ----------
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageW - margin, y);
  y += 6;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('Requestor Details', margin, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(51, 65, 85); // slate-700

  const requestorLines = [
    `Name: ${user.name}`,
    `Role: ${user.role.charAt(0).toUpperCase() + user.role.slice(1)} · ${user.department}`,
    `User ID: ${user.id}`,
  ];
  for (const line of requestorLines) {
    doc.text(line, margin, y);
    y += 5;
  }
  y += 4;

  // ---------- Items Table ----------
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('Requested Items', margin, y);
  y += 4;

  // Table header
  const tableX = margin;
  const tableW = contentW;
  const colWidths = [12, 30, 60, 30, 25, 33]; // #, Model, Item, Colour, Qty, Status
  const colNames = ['#', 'Model No', 'Item Name', 'Colour', 'Qty', 'Stock Status'];

  doc.setFillColor(15, 23, 42);
  doc.rect(tableX, y, tableW, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);

  let x = tableX + 2;
  for (let i = 0; i < colNames.length; i++) {
    doc.text(colNames[i], x, y + 5.5);
    x += colWidths[i];
  }
  y += 8;

  // Table rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  let totalQty = 0;
  cart.forEach((item, idx) => {
    // Check page break
    if (y > pageH - 30) {
      doc.addPage();
      y = margin;
    }

    // Alternating row background
    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252); // slate-50
      doc.rect(tableX, y, tableW, 9, 'F');
    }

    // Status text
    let statusText = 'Available';
    let statusColor: [number, number, number] = [16, 185, 129]; // emerald
    if (item.product.stock_qty === 0) {
      statusText = 'Out of Stock';
      statusColor = [225, 29, 72]; // rose
    } else if (item.product.stock_qty <= 10) {
      statusText = 'Limited Stock';
      statusColor = [245, 158, 11]; // amber
    }

    // Cell content
    const cells = [
      String(idx + 1),
      item.product.model_no || '-',
      (item.product.item || item.product.name || '-').substring(0, 35),
      (item.product.colour || '-').substring(0, 18),
      String(item.qty),
      statusText,
    ];

    x = tableX + 2;
    cells.forEach((cell, ci) => {
      if (ci === 5) {
        doc.setTextColor(...statusColor);
        doc.setFont('helvetica', 'bold');
      } else {
        doc.setTextColor(51, 65, 85);
        doc.setFont('helvetica', 'normal');
      }
      // Truncate if too long
      const maxWidth = colWidths[ci] - 4;
      const truncated =
        doc.getTextWidth(cell) > maxWidth
          ? doc.splitTextToSize(cell, maxWidth)[0]
          : cell;
      doc.text(truncated, x, y + 6);
      x += colWidths[ci];
    });

    totalQty += item.qty;
    y += 9;
  });

  // Table border
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.rect(tableX, y - cart.length * 9 - 8, tableW, cart.length * 9 + 8);

  y += 4;

  // ---------- Total ----------
  if (y > pageH - 25) {
    doc.addPage();
    y = margin;
  }

  doc.setFillColor(241, 245, 249); // slate-100
  doc.rect(tableX, y, tableW, 10, 'F');
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('TOTAL', tableX + 2, y + 6.5);
  doc.text(`Total Items: ${cart.length}`, tableX + 50, y + 6.5);
  doc.text(`Total Quantity: ${totalQty} units`, tableX + 110, y + 6.5);
  y += 14;

  // ---------- Dispatch Information ----------
  if (y > pageH - 35) {
    doc.addPage();
    y = margin;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('Dispatch Information', margin, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);

  const dispatchInfo = [
    '• Available items: Dispatch within 7-10 days',
    '• Limited stock items: Dispatch within 7-10 days',
    '• Out of stock items: It will be available once order is confirmed (24-30 days)',
    '',
    'Note: Final pricing, taxes, and exact dispatch dates will be confirmed by the LaxRee sales team upon order verification. This request list is non-binding.',
  ];
  for (const line of dispatchInfo) {
    const lines = doc.splitTextToSize(line, contentW);
    for (const l of lines) {
      doc.text(l, margin, y);
      y += 4.5;
    }
  }

  y += 6;

  // ---------- Signature ----------
  if (y > pageH - 30) {
    doc.addPage();
    y = margin;
  }

  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y, pageW - margin, y);
  y += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text('Generated by LaxRee Inventory Portal (Internal App)', margin, y);
  y += 5;
  doc.text(
    `Requestor Signature: ____________________________   Date: ______________`,
    margin,
    y
  );

  // ---------- Footer (page number) ----------
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `LaxRee Hotel Supplies · Page ${i} of ${pageCount} · Order #${orderId}`,
      pageW / 2,
      pageH - 8,
      { align: 'center' }
    );
  }

  // ---------- Save ----------
  const filename = `LaxRee-Order-${orderId}.pdf`;
  doc.save(filename);
}
