import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

function unlockScroll(el) {
  const saved = [];
  [el, ...el.querySelectorAll('*')].forEach((node) => {
    const s = window.getComputedStyle(node);
    if (s.overflow !== 'visible' || s.overflowX !== 'visible' || s.overflowY !== 'visible' || s.maxHeight !== 'none') {
      saved.push({ node, overflow: node.style.overflow, overflowX: node.style.overflowX, overflowY: node.style.overflowY, maxHeight: node.style.maxHeight });
      node.style.overflow = 'visible';
      node.style.overflowX = 'visible';
      node.style.overflowY = 'visible';
      node.style.maxHeight = 'none';
    }
  });
  return saved;
}

function restoreScroll(saved) {
  saved.forEach(({ node, overflow, overflowX, overflowY, maxHeight }) => {
    node.style.overflow = overflow;
    node.style.overflowX = overflowX;
    node.style.overflowY = overflowY;
    node.style.maxHeight = maxHeight;
  });
}

async function captureElement(el) {
  const saved = unlockScroll(el);
  await new Promise((r) => requestAnimationFrame(r));
  const canvas = await html2canvas(el, {
    scale: 1.5,
    backgroundColor: '#ffffff',
    useCORS: true,
    scrollX: 0,
    scrollY: 0,
    width: el.scrollWidth,
    height: el.scrollHeight,
    windowWidth: el.scrollWidth,
    windowHeight: el.scrollHeight,
  });
  restoreScroll(saved);
  return canvas;
}

async function addSectionPage(pdf, el, orientation, title) {
  pdf.addPage('a4', orientation);
  pdf.setFontSize(13);
  pdf.setTextColor(31, 45, 61);
  pdf.text(title, 20, 28);
  const canvas = await captureElement(el);
  const imgData = canvas.toDataURL('image/png');
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const topOffset = 38;
  const availH = pageH - topOffset - 16;
  const availW = pageW - 24;
  const ratio = Math.min(availW / canvas.width, availH / canvas.height);
  const w = canvas.width * ratio;
  const h = canvas.height * ratio;
  pdf.addImage(imgData, 'PNG', (pageW - w) / 2, topOffset, w, h);
}

export async function exportReport({ calendarEl, listEl, requirementsEl, programLabel, t }) {
  const s = (key, vars) => (t ? t(key, vars) : key);
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });

  pdf.setFontSize(18);
  pdf.setTextColor(31, 45, 61);
  pdf.text(s('pdfTitle'), 40, 60);
  pdf.setFontSize(12);
  pdf.setTextColor(107, 100, 89);
  pdf.text(programLabel, 40, 80);
  const dateStr = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  pdf.text(s('pdfGenerated', { date: dateStr }), 40, 96);

  if (calendarEl)     await addSectionPage(pdf, calendarEl,     'landscape', s('pdfCalendar'));
  if (listEl)         await addSectionPage(pdf, listEl,         'landscape', s('pdfCourseList'));
  if (requirementsEl) await addSectionPage(pdf, requirementsEl, 'portrait',  s('pdfRequirements'));

  pdf.save('course-selection-report.pdf');
}
