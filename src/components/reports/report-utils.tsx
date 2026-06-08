import {
  Search,
  Activity,
  Eye,
  ShieldCheck,
  AlertCircle,
  TrendingUp,
  Heart,
  Star,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Compress an uploaded image to a 1600px-long-side JPEG and return both the raw
 * base64 (for API upload) and a data-URL preview. Extracted from the legacy
 * ReportGenerator so the new API-driven Reports page can reuse it.
 */
export const compressImage = (file: File): Promise<{ base64: string; preview: string }> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        const MAX_SIZE = 1600;
        if (width > height) {
          if (width > MAX_SIZE) {
            height = Math.round((height * MAX_SIZE) / width);
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width = Math.round((width * MAX_SIZE) / height);
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
        resolve({
          base64: compressedDataUrl.split(',')[1],
          preview: compressedDataUrl,
        });
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
};

/**
 * Branded ReactMarkdown component overrides for rendering report `contentMd`.
 */
export const MarkdownComponents: any = {
  h1: ({ children }: any) => (
    <div className="mb-12 text-center relative">
      <h1 className="text-4xl font-black text-zinc-900 tracking-tighter uppercase mb-2">{children}</h1>
      <div className="w-24 h-1.5 bg-brand mx-auto rounded-full" />
      <p className="mt-4 text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">Official OP Media Performance Audit</p>
    </div>
  ),
  h2: ({ children }: any) => (
    <div className="flex items-center gap-3 mt-12 mb-6 group">
      <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center text-white shrink-0 group-hover:bg-brand transition-colors">
        {String(children).includes('Overview') && <Search className="w-5 h-5" />}
        {String(children).includes('Summary') && <Activity className="w-5 h-5" />}
        {String(children).includes('Observations') && <Eye className="w-5 h-5" />}
        {String(children).includes('Status') && <ShieldCheck className="w-5 h-5" />}
        {String(children).includes('Issues') && <AlertCircle className="w-5 h-5" />}
        {String(children).includes('Roadmap') && <TrendingUp className="w-5 h-5" />}
        {String(children).includes('Note') && <Heart className="w-5 h-5" />}
        {!['Overview', 'Summary', 'Observations', 'Status', 'Issues', 'Roadmap', 'Note'].some((k) => String(children).includes(k)) && <Star className="w-5 h-5" />}
      </div>
      <h2 className="text-xl font-black text-zinc-900 uppercase tracking-tight">{children}</h2>
      <div className="h-px bg-zinc-100 flex-1 ml-2" />
    </div>
  ),
  p: ({ children }: any) => {
    const text = String(children);
    if (text.startsWith('Status:')) {
      const statusValue = text.replace('Status:', '').trim().toLowerCase();
      let color = 'bg-zinc-100 text-zinc-900';
      if (statusValue.includes('completed')) color = 'bg-emerald-500 text-white';
      if (statusValue.includes('progress')) color = 'bg-blue-500 text-white';
      if (statusValue.includes('optimized')) color = 'bg-brand text-white shadow-lg shadow-brand/20';

      return (
        <div className="my-4">
          <div className={cn('inline-flex items-center px-6 py-2.5 rounded-2xl font-black uppercase tracking-widest text-[11px]', color)}>
            {children}
          </div>
        </div>
      );
    }
    return <p className="text-zinc-600 leading-relaxed font-medium mb-4 text-base">{children}</p>;
  },
  ul: ({ children }: any) => <ul className="space-y-3 mb-8 bg-zinc-50/50 p-6 rounded-3xl border border-zinc-100">{children}</ul>,
  li: ({ children }: any) => (
    <li className="flex items-start gap-3 text-zinc-700">
      <div className="w-5 h-5 rounded-md bg-brand/10 flex items-center justify-center shrink-0 mt-0.5">
        <Check className="w-3 h-3 text-brand" />
      </div>
      <span className="font-semibold text-sm">{children}</span>
    </li>
  ),
  hr: () => <div className="h-px bg-gradient-to-r from-transparent via-zinc-200 to-transparent my-12" />,
  strong: ({ children }: any) => <strong className="font-black text-zinc-900 border-b-2 border-brand/20">{children}</strong>,
  em: ({ children }: any) => <em className="text-zinc-500 italic bg-zinc-100 px-2 py-0.5 rounded-md not-italic font-bold text-xs">{children}</em>,
};

/**
 * High-fidelity PDF export of a report DOM node. Handles the `oklch`/modern-CSS
 * color-function crash by rewriting styles in the html2canvas clone. Extracted
 * verbatim from the legacy ReportGenerator.
 */
export const exportReportPDF = async (
  title: string,
  elementId: string,
  onError?: (message: string) => void,
): Promise<boolean> => {
  const element = document.getElementById(elementId);
  if (!element) {
    onError?.('Capture element not found');
    return false;
  }

  if (element.offsetWidth === 0 || element.offsetHeight === 0) {
    onError?.('The element is currently hidden or has no size. Please ensure it is visible before exporting.');
    return false;
  }

  const originalScrollY = window.scrollY;

  try {
    window.scrollTo(0, 0);
    const scrollArea = element.parentElement?.querySelector('[role="region"]');
    if (scrollArea) {
      scrollArea.scrollTop = 0;
    }

    const images = Array.from(element.querySelectorAll('img'));
    await Promise.all(images.map(img => new Promise(resolve => {
      if (img.complete) {
        resolve(null);
      } else {
        img.onload = () => resolve(null);
        img.onerror = () => resolve(null);
      }
    })));
    await new Promise((resolve) => setTimeout(resolve, 500));

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      imageTimeout: 45000,
      logging: false,
      ignoreElements: (el) => {
        if (el instanceof HTMLElement) {
          const style = window.getComputedStyle(el);
          if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return true;
          if (el.tagName === 'CANVAS' || el.tagName === 'IMG' || el.tagName === 'SVG') {
            if (el.offsetWidth === 0 || el.offsetHeight === 0) return true;
          }
        }
        return false;
      },
      onclone: (clonedDoc) => {
        const clonedElement = clonedDoc.getElementById(elementId);
        if (clonedElement) {
          const actualWidth = element.offsetWidth;
          clonedElement.style.width = `${actualWidth}px`;
          clonedElement.style.padding = '60px';
          clonedElement.style.backgroundColor = '#ffffff';
          clonedElement.style.borderRadius = '0px';
          clonedElement.style.margin = '0';
          clonedElement.style.boxSizing = 'border-box';
        }

        const styleTags = Array.from(clonedDoc.getElementsByTagName('style'));
        const brandHex = '#ff00cc';
        const zincHex = '#18181b';
        const zincLight = '#71717a';

        styleTags.forEach((tag) => {
          try {
            let css = tag.innerHTML;
            css = css.replace(/oklch\(0\.627\s+0\.265\s+303\.9\)/gi, brandHex);

            for (let i = 0; i < 3; i++) {
              css = css.replace(/(oklch|oklab|lab|lch|color|color-mix|light-dark)\s*\((?:[^()]*|\((?:[^()]*|\([^()]*\))*\))*\)/gi, (match) => {
                if (match.includes('312') || match.includes('303') || match.includes('brand')) return brandHex;
                return zincHex;
              });
            }

            css = css.replace(/in\s+(oklb|oklch|oklab|oklab-linear|oklch-linear|lab|lch|srgb-linear|display-p3|a98-rgb|prophoto-rgb|rec2020|xyz|xyz-d50|xyz-d65)/gi, 'in srgb');

            tag.innerHTML = css;
          } catch (e) {
            console.warn('Could not modify style tag during PDF export', e);
          }
        });

        const rootStyle = clonedDoc.createElement('style');
        rootStyle.innerHTML = `
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
          @font-face {
            font-family: 'Geist Variable';
            src: url('https://cdn.jsdelivr.net/npm/@fontsource-variable/geist/files/geist-latin-wght-normal.woff2') format('woff2-variations');
            font-weight: 100 900;
            font-display: swap;
            font-style: normal;
          }
          :root {
            --zinc-50: #fafafa !important;
            --zinc-100: #f4f4f5 !important;
            --zinc-200: #e4e4e7 !important;
            --zinc-300: #d4d4d8 !important;
            --zinc-400: #a1a1aa !important;
            --zinc-500: #71717a !important;
            --zinc-600: #52525b !important;
            --zinc-700: #3f3f46 !important;
            --zinc-800: #27272a !important;
            --zinc-900: #18181b !important;
            --zinc-950: #09090b !important;
            --brand: ${brandHex} !important;
            --color-brand: ${brandHex} !important;
          }
          * {
            font-family: 'Geist Variable', 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
            letter-spacing: -0.015em !important;
            -webkit-print-color-adjust: exact !important;
            box-shadow: none !important;
            text-shadow: none !important;
          }
          html, body {
            background-color: #ffffff !important;
            color: #18181b !important;
          }
          h1, h2, h3, h4, h5, h6, strong, b {
            font-weight: 900 !important;
            letter-spacing: -0.04em !important;
            color: #18181b !important;
          }
          .bg-brand { background-color: ${brandHex} !important; }
          .bg-brand\/10 { background-color: rgba(255, 0, 204, 0.1) !important; }
          .bg-brand\/50 { background-color: rgba(255, 0, 204, 0.5) !important; }
          .text-brand { color: ${brandHex} !important; }
          .bg-zinc-50 { background-color: #fafafa !important; }
          .bg-zinc-100 { background-color: #f4f4f5 !important; }
          .bg-zinc-900 { background-color: #18181b !important; }
          .bg-zinc-950 { background-color: #09090b !important; }
          .text-zinc-900 { color: #18181b !important; }
          .text-zinc-700 { color: #3f3f46 !important; }
          .text-zinc-600 { color: #52525b !important; }
          .text-zinc-500 { color: #71717a !important; }
          .text-zinc-400 { color: #a1a1aa !important; }
          .text-white { color: #ffffff !important; }
          .border-zinc-100 { border-color: #f4f4f5 !important; }
          .border-zinc-200 { border-color: #e4e4e7 !important; }
          .border-brand { border-color: ${brandHex} !important; }

          .markdown-body { line-height: 1.6 !important; color: #18181b !important; }
          .markdown-body h1 {
            font-size: 32pt !important;
            margin-bottom: 20pt !important;
            text-align: center !important;
            color: #18181b !important;
            text-transform: uppercase !important;
            letter-spacing: -0.05em !important;
          }
          .markdown-body h2 {
            font-size: 18pt !important;
            margin-top: 30pt !important;
            margin-bottom: 15pt !important;
            border-bottom: 2pt solid #f4f4f5 !important;
            padding-bottom: 8pt !important;
            color: #18181b !important;
            text-transform: uppercase !important;
            letter-spacing: -0.02em !important;
          }
          .markdown-body h3 { font-size: 14pt !important; margin-top: 20pt !important; margin-bottom: 10pt !important; color: #18181b !important; }
          .markdown-body p { margin-bottom: 12pt !important; font-size: 11pt !important; color: #3f3f46 !important; }
          .markdown-body ul, .markdown-body ol { margin-bottom: 15pt !important; padding-left: 20pt !important; }
          .markdown-body li {
            margin-bottom: 8pt !important;
            font-size: 10.5pt !important;
            color: #3f3f46 !important;
            list-style-type: none !important;
            position: relative !important;
          }
          .markdown-body li::before {
            content: "•";
            color: ${brandHex} !important;
            font-weight: bold !important;
            position: absolute !important;
            left: -15pt !important;
          }
          .markdown-body strong { color: #18181b !important; font-weight: 800 !important; }
        `;
        const head = clonedDoc.head || clonedDoc.getElementsByTagName('head')[0];
        if (head) {
          head.appendChild(rootStyle);
        } else {
          clonedDoc.documentElement.appendChild(rootStyle);
        }

        const all = clonedDoc.querySelectorAll('*');
        all.forEach((el: any) => {
          if (el.tagName === 'CANVAS' || el.tagName === 'IMG' || el.tagName === 'SVG') {
            const w = el.offsetWidth || parseInt(el.getAttribute('width') || '0');
            const h = el.offsetHeight || parseInt(el.getAttribute('height') || '0');
            if (w === 0 || h === 0) {
              el.style.display = 'none';
              el.setAttribute('data-html2canvas-ignore', 'true');
            }
          }

          if (el.style.backgroundImage && (el.style.backgroundImage.includes('oklch') || el.style.backgroundImage.includes('gradient'))) {
            if (el.style.backgroundImage.includes('oklch')) el.style.backgroundImage = 'none';
          }

          const inlineStyle = el.getAttribute('style');
          if (inlineStyle && (inlineStyle.includes('oklch') || inlineStyle.includes('oklab') || inlineStyle.includes('color(') || inlineStyle.includes('color-mix') || inlineStyle.includes('light-dark'))) {
            let newStyle = inlineStyle;
            for (let j = 0; j < 3; j++) {
              newStyle = newStyle.replace(/(oklch|oklab|lab|lch|color|color-mix|light-dark)\s*\((?:[^()]*|\((?:[^()]*|\([^()]*\))*\))*\)/gi, (match) => {
                if (match.includes('312') || match.includes('303') || match.includes('brand')) return brandHex;
                return zincHex;
              });
            }
            el.setAttribute('style', newStyle);
          }

          const computed = window.getComputedStyle(el);
          const colorProps = ['color', 'backgroundColor', 'borderColor', 'outlineColor', 'fill', 'stroke'];

          colorProps.forEach((prop) => {
            const val = (computed as any)[prop];
            if (val && typeof val === 'string' && (val.includes('oklch') || val.includes('oklab') || val.includes('color(') || val.includes('color-mix'))) {
              if (prop === 'backgroundColor') {
                if (el.classList.contains('bg-brand') || val.includes('312')) el.style.setProperty('background-color', brandHex, 'important');
                else if (el.classList.contains('bg-zinc-950') || el.classList.contains('bg-zinc-900')) el.style.setProperty('background-color', zincHex, 'important');
                else if (el.classList.contains('bg-zinc-50')) el.style.setProperty('background-color', '#fafafa', 'important');
                else el.style.setProperty('background-color', '#ffffff', 'important');
              } else if (prop === 'color') {
                if (el.classList.contains('text-brand') || val.includes('312')) el.style.setProperty('color', brandHex, 'important');
                else if (el.classList.contains('text-zinc-400')) el.style.setProperty('color', '#a1a1aa', 'important');
                else if (el.classList.contains('text-zinc-500')) el.style.setProperty('color', zincLight, 'important');
                else el.style.setProperty('color', zincHex, 'important');
              } else if (prop === 'borderColor') {
                if (el.classList.contains('border-brand')) el.style.setProperty('border-color', brandHex, 'important');
                else el.style.setProperty('border-color', '#e4e4e7', 'important');
              }
            }
          });
        });
      },
    });

    const pdfWidth = 210;
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    const pdf = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: [pdfWidth, pdfHeight],
      compress: true,
    });
    const imgData = canvas.toDataURL('image/jpeg', 0.75);
    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
    pdf.save(`OP_Media_Report_${title.replace(/\s+/g, '_')}.pdf`);
    return true;
  } catch (err) {
    console.error(err);
    onError?.('Export failed. Try again.');
    return false;
  } finally {
    window.scrollTo(0, originalScrollY);
  }
};
