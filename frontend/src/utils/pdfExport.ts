import { jsPDF } from 'jspdf';
import type { Banknote } from '../types/banknote';
import { getImageUrl } from './fileHelpers';

export async function exportCollectionToPDF(banknotes: Banknote[], userName?: string, includePurchaseInfo: boolean = false) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const columnWidth = (pageWidth - margin * 3) / 2; // 2 columns
  const cardPadding = 3;
  const imageHeight = 52;
  const detailsHeight = 48;
  const cardHeight = imageHeight + detailsHeight + (cardPadding * 2) + 2;
  const columnGap = margin;

  let currentY = margin;
  let currentColumn = 0; // 0 = left, 1 = right

  // Title page
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('Banknote Collection', pageWidth / 2, 40, { align: 'center' });
  
  if (userName) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.text(userName, pageWidth / 2, 55, { align: 'center' });
  }
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated on ${new Date().toLocaleDateString()}`, pageWidth / 2, 65, { align: 'center' });
  doc.text(`Total: ${banknotes.length} banknote${banknotes.length !== 1 ? 's' : ''}`, pageWidth / 2, 72, { align: 'center' });
  
  doc.addPage();
  doc.setTextColor(0);
  currentY = margin;

  for (let i = 0; i < banknotes.length; i++) {
    const banknote = banknotes[i];
    
    // Calculate position
    const x = currentColumn === 0 ? margin : margin + columnWidth + columnGap;
    
    // Check if we need a new page
    if (currentY + cardHeight > pageHeight - margin) {
      doc.addPage();
      currentY = margin;
      currentColumn = 0;
    }

    // Draw subtle border around card
    doc.setDrawColor(220);
    doc.setLineWidth(0.2);
    doc.roundedRect(x, currentY, columnWidth, cardHeight, 1.5, 1.5);

    // Add obverse image if available
    const imageX = x + cardPadding;
    const imageY = currentY + cardPadding;
    const imageWidth = columnWidth - (cardPadding * 2);
    
    if (banknote.obverseImage) {
      try {
        const imageUrl = getImageUrl(banknote, banknote.obverseImage, '600x0');
        const imgData = await loadImageAsDataURL(imageUrl);
        
        // Draw image
        doc.addImage(imgData, 'JPEG', imageX, imageY, imageWidth, imageHeight, undefined, 'FAST');
        
        // Draw thin border around image for definition
        doc.setDrawColor(210);
        doc.setLineWidth(0.15);
        doc.roundedRect(imageX, imageY, imageWidth, imageHeight, 0.5, 0.5);
      } catch (error) {
        console.error('Failed to load image for PDF:', error);
        // Draw placeholder
        doc.setFillColor(248, 248, 248);
        doc.roundedRect(imageX, imageY, imageWidth, imageHeight, 1, 1, 'F');
        doc.setDrawColor(230);
        doc.setLineWidth(0.1);
        doc.roundedRect(imageX, imageY, imageWidth, imageHeight, 1, 1);
        doc.setFontSize(8);
        doc.setTextColor(180);
        doc.text('No Image', x + columnWidth / 2, currentY + cardPadding + imageHeight / 2, { align: 'center' });
        doc.setTextColor(0);
      }
    } else {
      // Draw placeholder
      doc.setFillColor(248, 248, 248);
      doc.roundedRect(imageX, imageY, imageWidth, imageHeight, 1, 1, 'F');
      doc.setDrawColor(230);
      doc.setLineWidth(0.1);
      doc.roundedRect(imageX, imageY, imageWidth, imageHeight, 1, 1);
      doc.setFontSize(8);
      doc.setTextColor(180);
      doc.text('No Image', x + columnWidth / 2, currentY + cardPadding + imageHeight / 2, { align: 'center' });
      doc.setTextColor(0);
    }

    // Details section - start below image with padding
    const detailsY = currentY + cardPadding + imageHeight + 5;
    let textY = detailsY;
    const textX = x + cardPadding + 1;
    const textMaxWidth = columnWidth - (cardPadding * 2) - 2;
    
    // Denomination - larger and bolder
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text(`${banknote.faceValue} ${banknote.currency}`, textX, textY);
    textY += 6.5;
    
    // Country and year - slightly larger, more readable
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80);
    const yearDisplay = banknote.isRangeOfYearOfIssue
      ? `${banknote.yearOfIssueStart}–${banknote.yearOfIssueEnd}`
      : banknote.yearOfIssueSingle?.toString() || '—';
    
    const countryText = banknote.noteType === 'us' 
      ? `${banknote.country} • ${yearDisplay}`
      : `${banknote.country} • ${yearDisplay}`;
    
    doc.text(countryText, textX, textY, { maxWidth: textMaxWidth });
    textY += 6;
    
    // Add a subtle separator line
    doc.setDrawColor(235);
    doc.setLineWidth(0.1);
    doc.line(textX, textY, textX + textMaxWidth, textY);
    textY += 4;
    
    // Pick# and Serial - better spacing
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    const pickLabel = banknote.noteType === 'us' ? 'Fr#' : 'Pick#';
    doc.text(`${pickLabel}: `, textX, textY);
    doc.setTextColor(40);
    doc.text(`${banknote.pickNumber || '—'}`, textX + 12, textY);
    textY += 4.5;
    
    doc.setTextColor(100);
    doc.text(`S/N: `, textX, textY);
    doc.setTextColor(40);
    doc.text(`${banknote.serialNumber || '—'}`, textX + 12, textY);
    textY += 5.5;
    
    // PMG info - highlighted
    if (banknote.grade) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0);
      let pmgText = `PMG ${banknote.grade === 'Not Listed' ? 'N/L' : banknote.grade}`;
      if (banknote.isEpq) pmgText += ' EPQ';
      if (banknote.isSpecimen) pmgText += ' SPECIMEN';
      doc.text(pmgText, textX, textY);
      textY += 5.5;
    }
    
    // Watermark - subtle
    if (banknote.watermark) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(120);
      doc.text(`Wmk: ${banknote.watermark}`, textX, textY, { maxWidth: textMaxWidth });
      textY += 4;
    }
    
    // Purchase info - if enabled
    if (includePurchaseInfo && banknote.purchasePrice > 0) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100);
      
      const purchaseText = banknote.dateOfPurchase
        ? `Purchased: ${banknote.purchasePrice} ${banknote.purchasePriceCurrency} on ${banknote.dateOfPurchase}`
        : `Purchased: ${banknote.purchasePrice} ${banknote.purchasePriceCurrency}`;
      
      doc.text(purchaseText, textX, textY, { maxWidth: textMaxWidth });
    }
    
    doc.setTextColor(0);

    // Move to next position
    if (currentColumn === 0) {
      currentColumn = 1;
    } else {
      currentColumn = 0;
      currentY += cardHeight + 7;
    }
  }

  // Footer on each page
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' }
    );
  }

  // Save PDF
  const fileName = userName 
    ? `${userName.replace(/[^a-z0-9]/gi, '_')}_collection_${new Date().toISOString().split('T')[0]}.pdf`
    : `banknote_collection_${new Date().toISOString().split('T')[0]}.pdf`;
  
  doc.save(fileName);
}

// Helper to load image as data URL for PDF embedding
async function loadImageAsDataURL(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = url;
  });
}

