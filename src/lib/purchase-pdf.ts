/**
 * PDF generator for Purchase Requests
 * Generates a professional PO-style PDF for procurement.
 */
'use client';

import jsPDF from 'jspdf';
import type { Product } from '@/lib/types';
import type { AppUser } from '@/lib/types';

export interface PurchaseRequest {
  pr_number: string;
  date: string;
  product_id: string;
  model_no: string;
  item: string;
  category: string;
  colour: string;
  current_stock: number;
  qty_to_order: number;
  vendor: string;
  priority: 'Urgent' | 'Normal';
  status: 'Pending' | 'Ordered' | 'Received' | 'Cancelled';
  expected_delivery: string;
  requested_by: string;
  notes: string;
}

export interface GeneratePRPDFOptions {
  pr: PurchaseRequest;
}

export function generatePurchaseRequestPDF({ pr }: GeneratePRPDFOptions): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageW = 210;
  const pageH = 297;
  const margin = 15;
  const contentW = pageW - margin * 2;
  let y = 0;

  // ---------- Header bar ----------
  const headerColor: [number, number, number] = pr.priority === 'Urgent' ? [190, 18, 60] : [15, 23, 42];
  doc.setFillColor(...headerColor);
  doc.rect(0, 0, pageW, 36, 'F');

  // Logo box
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(margin, 8, 18, 18, 2, 2, 'F');
  doc.setTextColor(...headerColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('LR', margin + 9, 20, { align: 'center' });

  // Company name
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('LaxRee Hotel Supplies', margin + 24, 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Purchase Request · Internal Application', margin + 24, 22);
  doc.text('Confidential · For Procurement Use Only', margin + 24, 26.5);

  // PR number (right)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(pr.pr_number, pageW - margin, 16, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(
    pr.date,
    pageW - margin,
    22,
    { align: 'right' }
  );
  if (pr.priority === 'Urgent') {
    doc.setTextColor(255, 200, 200);
    doc.setFont('helvetica', 'bold');
    doc.text('⚠ URGENT', pageW - margin, 27, { align: 'right' });
  }

  y = 46;

  // ---------- Requestor Info ----------
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageW - margin, y);
  y += 6;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('Request Details', margin, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(51, 65, 85);

  const detailLines = [
    [`PR Number`, pr.pr_number],
    [`Date`, pr.date],
    [`Requested By`, pr.requested_by],
    [`Priority`, pr.priority],
    [`Status`, pr.status],
    [`Expected Delivery`, pr.expected_delivery || 'Not specified'],
  ];
  for (const [label, value] of detailLines) {
    doc.setTextColor(100, 116, 139);
    doc.text(`${label}:`, margin, y);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text(String(value), margin + 35, y);
    doc.setFont('helvetica', 'normal');
    y += 5.5;
  }
  y += 4;

  // ---------- Vendor Info ----------
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('Vendor / Supplier', margin, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(51, 65, 85);
  const vendorText = pr.vendor || 'Not specified — to be sourced';
  const vendorLines = doc.splitTextToSize(vendorText, contentW);
  for (const line of vendorLines) {
    doc.text(line, margin, y);
    y += 5;
  }
  y += 4;

  // ---------- Item Table ----------
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('Item to be Purchased', margin, y);
  y += 4;

  const tableX = margin;
  const tableW = contentW;
  const colWidths = [12, 30, 50, 28, 25, 25]; // #, Model, Item, Colour, Current, Order Qty
  const colNames = ['#', 'Model No', 'Item Name', 'Colour', 'Current Stock', 'Order Qty'];

  doc.setFillColor(...headerColor);
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

  // Single row (one item per PR)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);

  doc.setFillColor(248, 250, 252);
  doc.rect(tableX, y, tableW, 12, 'F');

  const cells = [
    '1',
    pr.model_no,
    pr.item.substring(0, 28),
    (pr.colour || '-').substring(0, 16),
    String(pr.current_stock),
    String(pr.qty_to_order),
  ];
  x = tableX + 2;
  cells.forEach((cell, ci) => {
    if (ci === 4) {
      doc.setTextColor(225, 29, 72); // current stock in red (low)
      doc.setFont('helvetica', 'bold');
    } else if (ci === 5) {
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
    } else {
      doc.setTextColor(51, 65, 85);
      doc.setFont('helvetica', 'normal');
    }
    doc.text(cell, x, y + 7);
    x += colWidths[ci];
  });
  y += 12;

  // Table border
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.rect(tableX, y - 20, tableW, 20);

  y += 6;

  // ---------- Notes ----------
  if (pr.notes) {
    if (y > pageH - 35) {
      doc.addPage();
      y = margin;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text('Notes', margin, y);
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    const noteLines = doc.splitTextToSize(pr.notes, contentW);
    for (const line of noteLines) {
      doc.text(line, margin, y);
      y += 4.5;
    }
    y += 4;
  }

  // ---------- Justification ----------
  if (y > pageH - 35) {
    doc.addPage();
    y = margin;
  }

  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y, pageW - margin, y);
  y += 6;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('Justification', margin, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  const justification = `Current stock of ${pr.model_no} (${pr.item}) is ${pr.current_stock} units, which is below the minimum threshold. Requesting procurement of ${pr.qty_to_order} units to maintain adequate inventory levels.`;
  const justLines = doc.splitTextToSize(justification, contentW);
  for (const line of justLines) {
    doc.text(line, margin, y);
    y += 4.5;
  }
  y += 6;

  // ---------- Signatures ----------
  if (y > pageH - 35) {
    doc.addPage();
    y = margin;
  }

  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y, pageW - margin, y);
  y += 10;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);

  // Two-column signature block
  doc.text('Requested By:', margin, y);
  doc.text('Approved By:', pageW / 2 + 10, y);
  y += 12;
  doc.text('________________________', margin, y);
  doc.text('________________________', pageW / 2 + 10, y);
  y += 5;
  doc.text(pr.requested_by, margin, y);
  doc.text('Authorized Signatory', pageW / 2 + 10, y);
  y += 5;
  doc.text(`Date: ${pr.date}`, margin, y);
  doc.text('Date: ______________', pageW / 2 + 10, y);

  // ---------- Footer ----------
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `LaxRee Hotel Supplies · Purchase Request · Page ${i} of ${pageCount} · ${pr.pr_number}`,
      pageW / 2,
      pageH - 8,
      { align: 'center' }
    );
  }

  // ---------- Save ----------
  const filename = `${pr.pr_number}.pdf`;
  doc.save(filename);
}
