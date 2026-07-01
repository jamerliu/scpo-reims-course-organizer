import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

async function drawElementOnCurrentPage(pdf, el, topOffset = 40) {
  const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#ffffff' });
  const imgData = canvas.toDataURL('image/png');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight() - topOffset;
  const ratio = Math.min(pageWidth / canvas.width, pageHeight / canvas.height, 1);
  const w = canvas.width * ratio;
  const h = canvas.height * ratio;
  pdf.addImage(imgData, 'PNG', (pageWidth - w) / 2, topOffset, w, h);
}

export async function exportReport({ calendarEl, listEl, requirementsEl, programLabel }) {
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });

  pdf.setFontSize(16);
  pdf.text(`Course Selection Report — ${programLabel}`, 20, 30);
  if (calendarEl) await drawElementOnCurrentPage(pdf, calendarEl);

  pdf.addPage('a4', 'portrait');
  pdf.setFontSize(16);
  pdf.text('Selected Courses', 20, 30);
  if (listEl) await drawElementOnCurrentPage(pdf, listEl);

  if (requirementsEl) {
    pdf.addPage('a4', 'portrait');
    pdf.setFontSize(16);
    pdf.text('Requirement Checklist', 20, 30);
    await drawElementOnCurrentPage(pdf, requirementsEl);
  }

  pdf.save('course-selection-report.pdf');
}
