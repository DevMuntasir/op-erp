import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
import { useAuth } from '@/src/App';
import { Proposal, SUPPORTED_CURRENCIES } from '@/src/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, Printer, Send, MessageCircle, FileDown, Loader2,
  Phone, Mail, Globe, MapPin, CheckCircle2, ChevronRight,
  Database, Target, PlayCircle, BarChart3, Users, Zap, Search, Layout, Video
} from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { BrandLogo } from '@/src/components/layout/BrandLogo';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { cn, formatCurrency } from '@/src/lib/utils';
import { CurrencyCode } from '@/src/types';

export const ProposalPreview = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [creatorData, setCreatorData] = useState<{name: string} | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [sending, setSending] = useState(false);
  const documentRef = useRef<HTMLDivElement>(null);

  const basePath = user?.role === 'super_admin' || user?.role === 'admin' ? '/admin' : '/employee';

  useEffect(() => {
    if (id) {
      loadProposal(id);
    }
  }, [id]);

  const loadProposal = async (proposalId: string) => {
    try {
      const docSnap = await getDoc(doc(db, 'proposals', proposalId));
      if (docSnap.exists()) {
        const data = { id: docSnap.id, ...docSnap.data() } as Proposal;
        setProposal(data);
        
        // Dynamic Hooking: If creatorName is missing, fetch it from the user document
        if (!data.creatorName && data.createdBy) {
           const userSnap = await getDoc(doc(db, 'users', data.createdBy));
           if (userSnap.exists()) {
             setCreatorData({ name: userSnap.data().name });
           }
        }
      }
    } catch (err) {
      toast.error("Failed to load proposal preview");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = async () => {
    if (!documentRef.current || !proposal) return;
    
    setExporting(true);
    const toastId = toast.loading("Generating optimized PDF document...");
    const originalScrollY = window.scrollY;
    
    try {
      const element = documentRef.current;
      
      // Safety check for dimensions to prevent createPattern error
      if (!element || element.offsetWidth === 0 || element.offsetHeight === 0) {
        toast.error("The document is currently hidden or has no size. Please ensure it is visible before exporting.", { id: toastId });
        setExporting(false);
        return;
      }
      
      // 1. Capture the document with a fixed width for A4 consistency
      window.scrollTo(0, 0);
      
      // Delay to ensure any pending layouts settle
      await new Promise(resolve => setTimeout(resolve, 500));

      const canvas = await html2canvas(element, {
        scale: 1.5,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        imageTimeout: 30000,
        logging: false,
        ignoreElements: (el) => {
          // Skip elements that are effectively invisible or have 0 dimensions
          if (el instanceof HTMLElement) {
            const style = window.getComputedStyle(el);
            if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return true;
            
            // Specifically skip images/canvases/svgs with 0 dimensions
            if (el.tagName === 'CANVAS' || el.tagName === 'IMG' || el.tagName === 'SVG') {
              if (el.offsetWidth === 0 || el.offsetHeight === 0) return true;
            }
          }
          return false;
        },
        onclone: (clonedDoc) => {
          const clonedElement = clonedDoc.querySelector('.proposal-capture') as HTMLElement;
          if (clonedElement) {
            clonedElement.style.width = '1000px';
            clonedElement.style.maxWidth = '1000px';
            clonedElement.style.padding = '60px';
            clonedElement.style.margin = '0 auto';
            clonedElement.style.backgroundColor = '#ffffff';
            clonedElement.style.boxShadow = 'none';
          }

          // Force remove all oklch and oklab usages from ANY style tag
          const styleTags = Array.from(clonedDoc.getElementsByTagName('style'));
          const brandHex = '#ff00cc'; // Exact hsl(312 100% 50%) conversion
          const zincHex = '#18181b';
          
          styleTags.forEach(tag => {
            try {
              let css = tag.innerHTML;
              
              // Filter out modern CSS functions that html2canvas cannot parse
              for (let i = 0; i < 3; i++) { 
                css = css.replace(/(oklch|oklab|lab|lch|color|color-mix|light-dark)\s*\((?:[^()]*|\((?:[^()]*|\([^()]*\))*\))*\)/gi, zincHex);
              }

              // NEW: Catch interpolation hints in gradients like "linear-gradient(in oklab, ...)"
              css = css.replace(/in\s+(oklb|oklch|oklab|oklab-linear|oklch-linear|lab|lch|srgb-linear|display-p3|a98-rgb|prophoto-rgb|rec2020|xyz|xyz-d50|xyz-d65)/gi, "in srgb");
              
              tag.innerHTML = css;
            } catch (e) {
              console.warn('Could not modify style tag', e);
            }
          });

          // Inject safe fallbacks for root variables
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
              --background: #ffffff !important;
              --foreground: #09090b !important;
            }
            * { 
              font-family: 'Geist Variable', 'Inter', -apple-system, sans-serif !important;
              -webkit-print-color-adjust: exact !important;
              color-scheme: light !important;
              letter-spacing: -0.015em !important;
              text-rendering: optimizeLegibility !important;
              box-shadow: none !important;
              text-shadow: none !important;
            }
            h1, h2, h3, h4, h5, h6, strong, b {
              font-weight: 900 !important;
              letter-spacing: -0.04em !important;
              color: #18181b !important;
            }
            .text-zinc-900 { color: #18181b !important; }
            .text-zinc-500 { color: #71717a !important; }
            .text-zinc-400 { color: #a1a1aa !important; }
            .bg-zinc-50 { background-color: #fafafa !important; }
            .bg-zinc-100 { background-color: #f4f4f5 !important; }
            .bg-zinc-900 { background-color: #18181b !important; }
            .text-brand { color: ${brandHex} !important; }
            .bg-brand { background-color: ${brandHex} !important; }
            .border-brand { border-color: ${brandHex} !important; }
          `;
          const head = clonedDoc.head || clonedDoc.getElementsByTagName('head')[0];
          if (head) {
            head.appendChild(rootStyle);
          } else {
            clonedDoc.documentElement.appendChild(rootStyle);
          }

          // Force all elements to use standard colors and fix spacing issues
          const allElements = Array.from(clonedDoc.getElementsByTagName('*'));
          for (let i = 0; i < allElements.length; i++) {
            const el = allElements[i] as HTMLElement;

            // Force remove zero-dimension elements that crash html2canvas
            if (el.tagName === 'CANVAS' || el.tagName === 'IMG' || el.tagName === 'SVG') {
                const w = el.offsetWidth || parseInt(el.getAttribute('width') || '0');
                const h = el.offsetHeight || parseInt(el.getAttribute('height') || '0');
                if (w === 0 || h === 0) {
                  el.style.display = 'none';
                  el.setAttribute('data-html2canvas-ignore', 'true');
                }
            }
            
            // Scrub inline style attribute specifically
            const inlineStyle = el.getAttribute('style');
            if (inlineStyle && (inlineStyle.includes('oklch') || inlineStyle.includes('oklab') || inlineStyle.includes('color(') || inlineStyle.includes('color-mix') || inlineStyle.includes('light-dark'))) {
              let newStyle = inlineStyle;
              for (let j = 0; j < 3; j++) {
                newStyle = newStyle.replace(/(oklch|oklab|lab|lch|color|color-mix|light-dark)\s*\((?:[^()]*|\((?:[^()]*|\([^()]*\))*\))*\)/gi, zincHex);
              }
              el.setAttribute('style', newStyle);
            }

            el.style.letterSpacing = '0px';
            el.style.wordSpacing = 'normal';
            el.style.setProperty('-webkit-font-smoothing', 'antialiased');

            // Force inline styles if they use oklab
            const colorProps = ['color', 'backgroundColor', 'borderColor', 'outlineColor', 'fill', 'stroke', 'boxShadow', 'textShadow'];
            colorProps.forEach(prop => {
              const style = window.getComputedStyle(el);
              const val = (el.style as any)[prop] || (style as any)[prop];
              
              if (val && (typeof val === 'string') && (val.includes('oklch') || val.includes('oklab') || val.includes('color(') || val.includes('color-mix') || val.includes('light-dark') || val.includes(' in '))) {
                if (prop === 'backgroundColor') {
                  if (val.includes('0.98') || val.includes('98%')) el.style.setProperty('background-color', '#fafafa', 'important');
                  else if (el.classList.contains('bg-brand')) el.style.setProperty('background-color', brandHex, 'important');
                  else el.style.setProperty('background-color', '#ffffff', 'important');
                } else if (prop === 'boxShadow' || prop === 'textShadow') {
                  el.style.setProperty(prop, 'none', 'important');
                } else if (prop === 'color') {
                  if (el.classList.contains('text-brand')) el.style.setProperty('color', brandHex, 'important');
                  else el.style.setProperty('color', zincHex, 'important');
                } else {
                  if (el.classList.contains('border-brand')) el.style.setProperty(prop, brandHex, 'important');
                  else el.style.setProperty(prop, zincHex, 'important');
                }
              }
            });

            // Strip backgrounds that use interpolation hints
            if (el.style.backgroundImage && (el.style.backgroundImage.includes('oklch') || el.style.backgroundImage.includes('oklab') || el.style.backgroundImage.includes('color(') || el.style.backgroundImage.includes('color-mix'))) {
              el.style.backgroundImage = 'none';
            }
          }
        }

      });

      // 2. Dynamic PDF Sizing based on content length
      const pdfWidth = 210; // A4 width in mm
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [pdfWidth, pdfHeight],
        compress: true
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.75);
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');

      pdf.save(`OP_Media_${proposal.clientName.replace(/\s+/g, '_')}_Strategic_Proposal.pdf`);
      toast.success("Professional PDF Generated!", { id: toastId });
    } catch (err) {
      console.error("PDF Export Error:", err);
      toast.error("Enhanced export failed. Falling back to print.", { id: toastId });
      window.print();
    } finally {
      if (typeof originalScrollY !== 'undefined') {
        window.scrollTo(0, originalScrollY);
      }
      setExporting(false);
    }
  };
  
  const handleSendToClient = async () => {
    if (!id || !proposal) return;
    setSending(true);
    try {
      await updateDoc(doc(db, 'proposals', id), {
        status: 'sent',
        sentAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setProposal(prev => prev ? { ...prev, status: 'sent' } : null);
      toast.success(`Proposal sent to ${proposal.clientName}!`);
    } catch (err) {
      toast.error("Failed to update proposal status");
    } finally {
      setSending(false);
    }
  };

  if (loading) return <div className="p-8 text-center bg-zinc-50 min-h-screen pt-20">Loading proposal preview...</div>;
  if (!proposal) return <div className="p-8 text-center bg-zinc-50 min-h-screen pt-20">Proposal not found.</div>;

  const currencySymbol = SUPPORTED_CURRENCIES.find(c => c.code === proposal.currency)?.symbol || '$';
  return (
    <div className="min-h-screen bg-zinc-100 pb-20">
      {/* Tool bar - hidden on print */}
      <div className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-zinc-200 z-[100] px-6 py-3 print:hidden">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate(`${basePath}/proposals/edit/${id}`)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div className="h-4 w-[1px] bg-zinc-200 mx-2" />
            <p className="text-sm font-medium text-zinc-500">Previewing: <span className="text-zinc-900 font-bold">{proposal.title}</span></p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint} className="h-9">
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleExportPDF} 
              disabled={exporting}
              className="h-9 border-zinc-200 text-zinc-600 bg-white hover:bg-zinc-50"
            >
              {exporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileDown className="w-4 h-4 mr-2 text-brand" />}
              Save PDF
            </Button>
            <Button 
              size="sm" 
              onClick={handleSendToClient}
              disabled={sending || proposal.status === 'sent'}
              className="h-9 bg-brand hover:bg-brand/90 text-white shadow-lg shadow-brand/20 transition-all border-none"
            >
              {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              {proposal.status === 'sent' ? 'Already Sent' : 'Send to Client'}
            </Button>
          </div>
        </div>
      </div>

      {/* Proposal Document */}
      <div className="w-full max-w-[21cm] mx-auto mt-8 print:mt-0 shadow-2xl print:shadow-none px-0 sm:px-4 md:px-0">
        <div 
          ref={documentRef}
          className="bg-[#f2f2f7] flex flex-col relative overflow-hidden font-sans min-h-screen"
        >
          {/* SEAMLESS CONTENT CONTAINER */}
          <div className="relative z-10 w-full flex flex-col space-y-20 px-6 py-12 md:px-12 md:py-24">
            
            {/* COVER SECTION */}
            <div className="flex flex-col">
              <div className="flex flex-col items-start gap-4">
                <BrandLogo className="w-32 md:w-48" />
              </div>

              <div className="flex flex-col items-center justify-center text-center py-10 md:py-20">
                <p className="text-brand font-bold text-sm md:text-lg mb-8 tracking-wide uppercase">Growth Strategy Proposal</p>
                <h1 className="text-5xl md:text-[110px] font-black text-brand leading-none tracking-tighter mb-4 drop-shadow-lg uppercase">PROPOSAL</h1>
                
                <div className="mt-10 md:mt-16 flex flex-col items-center gap-4">
                  <div className="flex flex-col items-center gap-2 mb-4">
                    <h2 className="text-zinc-400 text-xs md:text-sm font-black uppercase tracking-widest">Prepared By :</h2>
                    <p className="text-brand text-xl md:text-2xl font-black italic">{proposal.creatorName || creatorData?.name || 'OP Media Strategist'}</p>
                  </div>
                  
                  <h2 className="text-zinc-400 text-2xl md:text-4xl font-black uppercase tracking-tighter">Prepared For :</h2>
                  <p className="text-brand text-4xl md:text-6xl font-black drop-shadow-md">{proposal.clientName}</p>
                  {proposal.businessName && <p className="text-zinc-600 text-lg md:text-2xl font-bold italic">@{proposal.businessName}</p>}
                </div>
              </div>

              <div className="max-w-xl mx-auto w-full mb-12">
                 <div className="bg-black rounded-3xl p-6 md:p-10 flex flex-col items-center justify-center shadow-2xl border border-zinc-800 text-center">
                    <h3 className="text-white text-2xl md:text-4xl font-black tracking-tighter italic uppercase">{proposal.industry || 'DIGITAL GROWTH'}</h3>
                    <p className="text-zinc-500 font-bold tracking-[0.4em] text-[10px] md:text-xs mt-2 uppercase italic">{proposal.location || 'GLOBAL'}</p>
                    <p className="text-zinc-600 text-[8px] md:text-[10px] uppercase mt-4 tracking-widest font-bold italic">SECTOR PARTNER</p>
                 </div>
              </div>

              <div className="flex justify-end gap-10">
                  <div className="flex flex-col gap-3 text-right">
                     <div className="inline-block border-[2px] border-brand rounded-full px-6 py-2 text-brand font-black text-lg mb-2">CONTACT US</div>
                     <div className="space-y-2 pr-2 text-brand font-bold">
                        <p className="flex items-center justify-end gap-3 text-sm"><span>+1 (902) 403-7871</span> <Phone className="w-4 h-4" /></p>
                        <p className="flex items-center justify-end gap-3 text-sm"><span>info@opmediaagency.com</span> <Mail className="w-4 h-4" /></p>
                        <p className="flex items-center justify-end gap-3 text-sm"><span>opmediaagency.com</span> <Globe className="w-4 h-4" /></p>
                        <p className="flex items-center justify-end gap-3 text-sm"><span>Halifax, Nova Scotia, Canada</span> <MapPin className="w-4 h-4" /></p>
                     </div>
                  </div>
              </div>
            </div>

            <hr className="border-brand opacity-20" />

            {/* EXPERTISE SECTION */}
            <div className="flex flex-col items-center">
               <div className="max-w-4xl w-full">
                  <div className="bg-brand rounded-[30px] p-8 md:p-12 text-white text-center shadow-xl mb-12">
                     <h2 className="text-3xl md:text-5xl font-black mb-2">Our Expertise Sections</h2>
                     <p className="text-[10px] md:text-sm font-bold tracking-widest uppercase opacity-80 italic">OUR EXPERTISE SECTIONS ARE NOT LIMITED TO...</p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mb-20">
                     {[
                       { label: 'WEB DEVELOPMENT', icon: Layout },
                       { label: 'GOOGLE ADS', icon: Target },
                       { label: 'CONTENT CREATION', icon: PlayCircle },
                       { label: 'FACEBOOK ADS', icon: Database },
                       { label: 'SOCIAL MEDIA MARKETING', icon: Users }
                     ].map((item, i) => (
                       <div key={i} className="flex flex-col items-center gap-3">
                          <div className="w-20 h-20 md:w-24 md:h-24 rounded-full border-4 border-brand/10 flex items-center justify-center relative">
                            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-brand flex items-center justify-center shadow-lg">
                               <item.icon className="w-8 h-8 md:w-10 md:h-10 text-white" />
                            </div>
                          </div>
                          <h3 className="text-[10px] font-black text-zinc-900 text-center uppercase tracking-tighter leading-tight font-bold">{item.label}</h3>
                       </div>
                     ))}
                  </div>

                  <div className="bg-brand rounded-[30px] p-8 md:p-12 text-white text-center shadow-xl">
                     <p className="text-[10px] md:text-sm font-bold tracking-widest uppercase mb-2 opacity-80 italic">ANY A FEW MORE TO BE A MULTI-CHANNEL MARKETING EXPERT</p>
                     <h2 className="text-3xl md:text-5xl font-black">OUR Expertise Sections</h2>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mt-20">
                     {[
                       { label: 'WEB CONTENT CREATION', icon: Video },
                       { label: 'ARTICLE WRITING', icon: Loader2 },
                       { label: 'EMAIL MARKETING', icon: Mail },
                       { label: 'SEARCH ENGINE OPTIMISATION', icon: Search },
                       { label: 'LEAD GENERATION', icon: Zap }
                     ].map((item, i) => (
                       <div key={i} className="flex flex-col items-center gap-3">
                          <div className="w-20 h-20 md:w-24 md:h-24 rounded-full border-4 border-brand/10 flex items-center justify-center relative">
                            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-brand flex items-center justify-center shadow-lg">
                               <item.icon className="w-8 h-8 md:w-10 md:h-10 text-white" />
                            </div>
                          </div>
                          <h3 className="text-[10px] font-black text-zinc-900 text-center uppercase tracking-tighter leading-tight font-bold">{item.label}</h3>
                       </div>
                     ))}
                  </div>
               </div>
            </div>

            <hr className="border-brand opacity-20" />

            {/* DYNAMIC SECTIONS */}
            {proposal.sections.map((section, sidx) => (
              <div key={section.id} className="flex flex-col">
                 <div className="max-w-4xl mx-auto w-full flex flex-col">
                    <div className="bg-brand rounded-xl py-4 px-10 text-center mb-10 shadow-lg proposal-header-box">
                       <h2 className="text-white text-3xl font-black tracking-tight uppercase border-none outline-none">{section.title}</h2>
                    </div>
                    
                    <div className="flex-1 max-w-[700px] mx-auto markdown-content">
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]} 
                        rehypePlugins={[rehypeRaw]}
                      >
                        {section.content}
                      </ReactMarkdown>
                    </div>
                    
                    {sidx === 0 && (
                       <div className="mt-8 bg-zinc-50 p-8 rounded-3xl border border-zinc-100 flex items-center gap-6">
                          <div className="w-16 h-16 rounded-2xl bg-brand flex items-center justify-center text-white shadow-lg shrink-0">
                             <Target className="w-8 h-8" />
                          </div>
                          <div>
                             <p className="text-xs font-black uppercase tracking-widest text-brand mb-1">Key Growth Metric</p>
                             <p className="text-xl font-black text-zinc-900 italic tracking-tight underline decoration-brand decoration-2 underline-offset-4">Maximize Digital ROI & Lead Flow</p>
                          </div>
                       </div>
                    )}
                 </div>
              </div>
            ))}

            <hr className="border-brand opacity-20" />

            {/* PRICING / INVESTMENT */}
            {((proposal.pricingPlans && proposal.pricingPlans.length > 0) || (proposal as any).pricingPlan) && (
              <div className="flex flex-col items-center justify-center py-12 md:py-20 bg-zinc-950 rounded-[30px] md:rounded-[40px] text-white overflow-hidden relative px-6 md:px-10">
                 <div className="absolute top-0 right-0 w-64 h-64 bg-brand/10 blur-3xl" />
                 <div className="absolute bottom-0 left-0 w-64 h-64 bg-brand/5 blur-3xl" />
                 
                 <div className="max-w-6xl w-full text-center space-y-12 relative z-10">
                    <div className="space-y-2">
                       <p className="text-brand font-black uppercase tracking-[0.3em] text-[10px] md:text-xs">Strategic Partnership</p>
                       <h2 className="text-4xl md:text-[82px] font-black tracking-tighter italic leading-none">The Investment</h2>
                    </div>

                    <div className={cn(
                      "grid gap-8 w-full",
                      (proposal.pricingPlans?.length || 0) > 1 ? "md:grid-cols-2 lg:grid-cols-3" : "max-w-2xl mx-auto"
                    )}>
                      {proposal.pricingPlans && proposal.pricingPlans.length > 0 ? (
                        proposal.pricingPlans.map((plan, pidx) => (
                          <div key={pidx} className="bg-white/5 border border-white/10 p-5 md:p-6 rounded-[30px] md:rounded-[40px] shadow-2xl relative overflow-hidden group flex flex-col text-left">
                             <div className="mb-4">
                                <Badge className="bg-brand text-white border-none px-4 py-1.5 rounded-full font-black uppercase text-[8px] tracking-widest mb-3">
                                   {plan.label} MODEL
                                </Badge>
                                 <div className="text-xl md:text-3xl font-black tracking-tighter mb-1 truncate overflow-hidden whitespace-nowrap">
                                    {formatCurrency(plan.value, proposal.currency)}
                                    <span className="text-sm font-bold text-zinc-500 ml-1">/mo</span>
                                 </div>
                             </div>
                             
                             <div className="h-px bg-white/10 w-full mb-4" />
                             
                             <div className="space-y-3 flex-1">
                                {plan.items.map((item, i) => (
                                  <div key={i} className="flex items-start gap-3">
                                     <CheckCircle2 className="w-3.5 h-3.5 text-brand shrink-0 mt-0.5" />
                                     <span className="font-bold text-[9px] md:text-[10px] text-zinc-300 leading-snug">{item}</span>
                                  </div>
                                ))}
                             </div>
                          </div>
                        ))
                      ) : (proposal as any).pricingPlan ? (
                        <div className="bg-white/5 border border-white/10 p-6 md:p-10 rounded-[30px] md:rounded-[60px] shadow-2xl relative overflow-hidden group text-center max-w-2xl mx-auto w-full">
                           <Badge className="bg-brand text-white border-none px-6 py-2 rounded-full font-black uppercase text-[10px] tracking-widest mb-6">
                              {(proposal as any).pricingPlan.type} Strategy
                           </Badge>
                           <div className="text-3xl md:text-5xl font-black tracking-tighter mb-8 leading-none truncate overflow-hidden whitespace-nowrap">
                              {formatCurrency((proposal as any).pricingPlan.value, proposal.currency)}
                              <span className="text-lg md:text-xl font-bold text-zinc-500 ml-2">/month</span>
                           </div>
                           <div className="h-px bg-white/10 w-full mb-8" />
                           <div className="grid grid-cols-1 gap-4 md:gap-6 text-left max-w-lg mx-auto">
                              {((proposal as any).pricingPlan.items && (proposal as any).pricingPlan.items.length > 0 ? (proposal as any).pricingPlan.items : (proposal.services || [])).map((item: string, i: number) => (
                                <div key={i} className="flex items-start gap-4">
                                   <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5 text-brand shrink-0 mt-0.5" />
                                   <span className="font-bold text-sm md:text-lg text-zinc-300">{item}</span>
                                </div>
                              ))}
                           </div>
                        </div>
                      ) : null}
                    </div>
                    
                    <p className="text-zinc-500 font-medium italic">Investment amounts are in {proposal.currency}. Monthly management fees exclude third-party ad spend which is paid directly to platforms.</p>
                 </div>
              </div>
            )}

            <hr className="border-brand opacity-20" />

            {/* CONCLUSION & SIGNATURE */}
            <div className="flex flex-col">
               <div className="max-w-4xl w-full flex flex-col mx-auto">
                  
                  <div className="bg-brand rounded-2xl py-4 px-10 mb-12">
                     <h2 className="text-white text-3xl font-black tracking-tight">Final Impact</h2>
                  </div>

                  <div className="grid gap-4 mb-20">
                     {[
                       "Strong brand authority & festival hype",
                       "Consistent ticket sales growth",
                       "Massive reach & audience building",
                       "Increased sales through retargeting"
                     ].map((it, i) => (
                       <div key={i} className="flex items-center gap-4 text-xl font-black text-zinc-800">
                          <CheckCircle2 className="w-6 h-6 text-brand" /> {it}
                       </div>
                     ))}
                  </div>

                  <h2 className="text-5xl md:text-[100px] font-black text-brand tracking-tighter leading-none mb-8 italic text-center md:text-left uppercase">Conclusion</h2>
                  <div className="text-lg md:text-xl font-bold text-zinc-600 leading-relaxed space-y-6 text-center md:text-left">
                     <p>We would welcome the opportunity to work with <span className="text-brand font-black italic">{proposal.clientName}</span> and contribute to your success.</p>
                     <p>Our goal is to build a powerful digital marketing system that consistently drives high-quality sales and brand value.</p>
                  </div>

                  <div className="flex flex-col items-center justify-center py-10 md:py-16">
                     <p className="text-6xl md:text-[120px] text-brand font-handwritten -rotate-3 drop-shadow-md">Thank You!</p>
                  </div>

                  <div className="mt-auto pt-10 border-t-4 border-brand flex flex-col md:flex-row justify-between items-center md:items-end gap-10">
                     <div className="space-y-4 text-center md:text-left">
                        <p className="text-xl font-black text-zinc-900 uppercase">Prepared By:</p>
                        <p className="text-3xl font-black text-brand leading-none">{proposal.creatorName || creatorData?.name || 'OP Media Strategist'}</p>
                     </div>
                     <div className="flex flex-col md:items-end gap-2 text-brand font-black text-lg italic text-center md:text-right">
                        <p>www.opmediaagency.com</p>
                        <p>info@opmediaagency.com</p>
                     </div>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="fixed bottom-8 right-8 print:hidden z-[101]">
         <Button className="w-16 h-16 rounded-full bg-brand text-white shadow-2xl hover:scale-110 transition-transform border-none hover:bg-brand/90 group">
            <MessageCircle className="w-8 h-8" />
         </Button>
      </div>
    </div>
  );
};
