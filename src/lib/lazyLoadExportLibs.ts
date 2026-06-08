let htmlToCanvasLib: any = null;
let jspdfLib: any = null;

export const loadHtmlToCanvas = async () => {
  if (htmlToCanvasLib) return htmlToCanvasLib;
  try {
    const module = await import('html2canvas');
    htmlToCanvasLib = module.default;
    return htmlToCanvasLib;
  } catch (error) {
    console.error('Failed to load html2canvas:', error);
    throw error;
  }
};

export const loadJsPdf = async () => {
  if (jspdfLib) return jspdfLib;
  try {
    const module = await import('jspdf');
    jspdfLib = module.jsPDF;
    return jspdfLib;
  } catch (error) {
    console.error('Failed to load jsPDF:', error);
    throw error;
  }
};

export const exportPDF = async (element: HTMLElement, filename: string = 'document.pdf') => {
  try {
    const html2canvas = await loadHtmlToCanvas();
    const jsPDF = await loadJsPdf();

    const canvas = await html2canvas(element);
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgWidth = 210;
    const pageHeight = 295;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(filename);
  } catch (error) {
    console.error('Error exporting PDF:', error);
    throw error;
  }
};
