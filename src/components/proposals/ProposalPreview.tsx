import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getProposal, sendProposal } from '@/src/api/endpoints/proposals.api';
import { queryKeys } from '@/src/shared/constants/query-keys';
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
import { ProposalToolbar, ToolbarLeft, ToolbarRight, ToolbarDivider, ToolbarTitle } from '@/src/components/proposals/ProposalToolbar';

export const ProposalPreview = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [exporting, setExporting] = useState(false);
  const documentRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const basePath = user?.role === 'super_admin' || user?.role === 'admin' ? '/admin' : '/employee';

  const proposalQuery = useQuery({
    queryKey: queryKeys.proposal(id!),
    queryFn: () => getProposal(id!),
    enabled: !!id,
  });

  const proposal = proposalQuery.data ?? null;
  const loading = proposalQuery.isLoading;

  const sendMutation = useMutation({
    mutationFn: () => sendProposal(id!),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.proposal(id!), updated);
      queryClient.invalidateQueries({ queryKey: queryKeys.proposals() });
      queryClient.invalidateQueries({ queryKey: queryKeys.proposalSummary });
      toast.success(`Proposal sent to ${updated.clientName}!`);
    },
    onError: (error: Error) => {
      toast.error('Failed to send proposal', { description: error.message });
    },
  });

  const handleSendToClient = () => {
    if (!id || !proposal) return;
    sendMutation.mutate();
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
  

  if (loading) return <div className="p-8 text-center bg-zinc-50 min-h-screen pt-20">Loading proposal preview...</div>;
  if (!proposal) return <div className="p-8 text-center bg-zinc-50 min-h-screen pt-20">Proposal not found.</div>;

  const currencySymbol = SUPPORTED_CURRENCIES.find(c => c.code === proposal.currency)?.symbol || '$';
  return (
    <div className="min-h-screen bg-zinc-50 pb-20">
      <ProposalToolbar sticky>
        <ToolbarLeft>
          <Button variant="ghost" size="sm" onClick={() => navigate(`${basePath}/proposals/edit/${id}`)} className="h-9 px-3 rounded-lg">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <ToolbarDivider />
          <ToolbarTitle>
            Previewing: <span className="text-zinc-900 font-bold">{proposal.title}</span>
          </ToolbarTitle>
        </ToolbarLeft>
        <ToolbarRight>
          <Button variant="outline" size="icon-lg" onClick={handlePrint} >
            <Printer className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="icon-lg"
            onClick={handleExportPDF}
            disabled={exporting}
            
          >
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4 text-brand" /> } 
          </Button>
          <Button
          
            onClick={handleSendToClient}
            disabled={sendMutation.isPending || proposal.status === 'sent'}
           
          >
            {sendMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Send className="w-4 h-4 mr-1" />}
            {proposal.status === 'sent' ? 'Sent' : 'Send'}
          </Button>
        </ToolbarRight>
      </ProposalToolbar>

      {/* Proposal Document */}
      <div className="w-full max-w-[21cm] mx-auto mt-8 print:mt-0 shadow-2xl print:shadow-none px-0 sm:px-4 md:px-0">
        <div
          ref={documentRef}
          className="bg-white flex flex-col relative overflow-hidden font-sans min-h-screen"
        >
          {/* SEAMLESS CONTENT CONTAINER */}
          <div className="relative z-10 w-full flex flex-col space-y-28 px-6 py-16 md:px-16 md:py-32">
            
            {/* COVER SECTION */}
            <div className="flex flex-col">
              <div className="flex flex-col items-start gap-4">
                <BrandLogo className="w-32 md:w-48" />
              </div>

              <div className="flex flex-col items-center justify-center text-center py-20 md:py-40">
                <p className="text-brand font-semibold text-xs md:text-sm mb-8 tracking-widest uppercase">Strategic Digital Growth Proposal</p>
                <h1 className="text-7xl md:text-[90px] font-black text-zinc-900 leading-none tracking-tighter mb-8 uppercase">PROPOSAL</h1>
                
                <div className="mt-12 md:mt-32 flex flex-col items-center gap-8">
                  <div className="flex flex-col items-center gap-3">
                    <h2 className="text-zinc-400 text-xs md:text-xs font-semibold uppercase tracking-widest letter-spacing">Prepared For</h2>
                    <p className="text-zinc-900 text-3xl md:text-4xl font-black tracking-tighter leading-none">{proposal.clientName}</p>
                    {proposal.businessName && <p className="text-zinc-500 text-lg md:text-lg font-medium mt-3">@{proposal.businessName}</p>}
                  </div>
                </div>
              </div>

              <div className="max-w-3xl mx-auto w-full mb-12">
                 <div className="bg-zinc-900 rounded-2xl p-10 md:p-14 flex flex-col items-center justify-center shadow-lg text-center border border-zinc-800">
                    <p className="text-zinc-400 text-xs font-semibold uppercase tracking-widest mb-4">Industry & Location</p>
                    <h3 className="text-white text-4xl md:text-6xl font-black tracking-tighter mb-5">{proposal.industry || 'DIGITAL GROWTH'}</h3>
                    <div className="h-1 w-10 bg-brand rounded-full mb-5" />
                    <p className="text-zinc-200 font-medium text-base md:text-lg">{proposal.location || 'Global'}</p>
                 </div>
              </div>

              <div className=" gap-8 mt-12">
                 
            
                     <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Get In Touch</p>
                     <div className="space-y-4 text-zinc-600 font-medium w-fit text-left mt-4">
                        <p className="flex items-center gap-3 text-sm"><Phone className="w-4 h-4 text-brand" /> <span>+1 (902) 403-7871</span></p>
                        <p className="flex items-center gap-3 text-sm"><Mail className="w-4 h-4 text-brand" /> <span>info@opmediaagency.com</span></p>
                        <p className="flex items-center gap-3 text-sm"><Globe className="w-4 h-4 text-brand" /> <span>opmediaagency.com</span></p>
                        <p className="flex items-center gap-3 text-sm"><MapPin className="w-4 h-4 text-brand" /> <span>Halifax, Nova Scotia</span></p>
                     </div>
           
              </div>
            </div>

            <div className="h-px bg-linear-to-r from-transparent via-zinc-200 to-transparent" />

            {/* EXPERTISE SECTION */}
            <div className="flex flex-col items-center">
               <div className="max-w-6xl w-full">
                  <div className="text-center mb-24">
                     <p className="text-brand font-semibold text-xs md:text-xs tracking-widest uppercase mb-5">Our Expertise</p>
                     <h2 className="text-5xl md:text-7xl font-black text-zinc-900 mb-6 leading-tight">Comprehensive Digital Services</h2>
                     <p className="text-zinc-500 text-base md:text-lg font-medium max-w-3xl mx-auto">We specialize in a wide range of digital marketing and development solutions tailored to drive your business growth</p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-12 md:gap-16">
                     {[
                       { label: 'WEB DEVELOPMENT', icon: Layout },
                       { label: 'GOOGLE ADS', icon: Target },
                       { label: 'CONTENT CREATION', icon: PlayCircle },
                       { label: 'FACEBOOK ADS', icon: Database },
                       { label: 'SOCIAL MEDIA MARKETING', icon: Users },
                       { label: 'WEB CONTENT', icon: Video },
                       { label: 'ARTICLE WRITING', icon: Loader2 },
                       { label: 'EMAIL MARKETING', icon: Mail },
                       { label: 'SEO OPTIMIZATION', icon: Search },
                       { label: 'LEAD GENERATION', icon: Zap }
                     ].map((item, i) => (
                       <div key={i} className="flex flex-col items-center gap-3 group">
                          <div className="w-20 h-20 md:w-24 md:h-24 rounded-xl bg-linear-to-br from-brand/15 to-brand/5 flex items-center justify-center shadow-md hover:shadow-lg hover:from-brand/25 hover:to-brand/10 transition-all duration-300 group-hover:scale-105">
                            <item.icon className="w-9 h-9 md:w-11 md:h-11 text-brand group-hover:scale-110 transition-transform duration-300" />
                          </div>
                          <h3 className="text-[10px] md:text-xs font-semibold text-zinc-700 text-center uppercase tracking-wide leading-tight group-hover:text-brand transition-colors duration-300">{item.label}</h3>
                       </div>
                     ))}
                  </div>

                  <div className="mt-24 bg-linear-to-r from-brand/5 via-transparent to-brand/5 rounded-2xl p-12 md:p-16 border border-brand/10 text-center">
                     <p className="text-zinc-600 text-base md:text-lg font-medium leading-relaxed">Our expert team combines cutting-edge technology with strategic insights to deliver solutions that not only meet your current needs but anticipate future market trends and opportunities.</p>
                  </div>
               </div>
            </div>

            <div className="h-px bg-linear-to-r from-transparent via-zinc-200 to-transparent" />

            {/* DYNAMIC SECTIONS */}
            {(proposal.sections ?? []).map((section) => (
              <div key={section.id} className="flex flex-col">
                 <div className="max-w-4xl mx-auto w-full flex flex-col">
                    <div className="flex items-center gap-4 mb-16">
                       <div className="h-1.5 w-12 bg-brand rounded-full" />
                       <h2 className="text-zinc-900 text-4xl md:text-6xl font-black tracking-tighter">{section.title}</h2>
                    </div>

                    <div className="prose prose-base md:prose-lg max-w-4xl mx-auto markdown-content text-zinc-600 leading-relaxed space-y-5">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeRaw]}
                      >
                        {section.content}
                      </ReactMarkdown>
                    </div>
                 </div>
              </div>
            ))}

            <div className="h-px bg-linear-to-r from-transparent via-zinc-200 to-transparent" />

            {/* PRICING / INVESTMENT */}
            {((proposal.pricingPlans && proposal.pricingPlans.length > 0) || (proposal as any).pricingPlan) && (
              <div className="flex flex-col items-center justify-center py-20 md:py-32 bg-zinc-900 rounded-3xl text-white overflow-hidden relative px-6 md:px-12 border border-zinc-800">
                 <div className="absolute top-0 right-0 w-96 h-96 bg-brand/5 blur-3xl" />
                 <div className="absolute bottom-0 left-0 w-96 h-96 bg-brand/5 blur-3xl" />

                 <div className="max-w-6xl w-full text-center space-y-16 relative z-10">
                    <div className="space-y-5">
                       <p className="text-brand font-semibold uppercase tracking-widest text-xs md:text-xs">Investment & Pricing</p>
                       <h2 className="text-5xl md:text-7xl font-black tracking-tighter leading-none">Strategic Partnership Plans</h2>
                    </div>

                    <div className={cn(
                      "grid gap-10 w-full",
                      (proposal.pricingPlans?.length || 0) > 1 ? "md:grid-cols-2 lg:grid-cols-3" : "max-w-2xl mx-auto"
                    )}>
                      {proposal.pricingPlans && proposal.pricingPlans.length > 0 ? (
                        proposal.pricingPlans.map((plan, pidx) => (
                          <div key={pidx} className="bg-white/5 border border-white/10 p-8 md:p-10 rounded-3xl shadow-lg relative overflow-hidden group flex flex-col text-left hover:bg-white/10 transition-colors">
                             <div className="mb-6">
                                <Badge className="bg-brand text-white border-none px-4 py-2 rounded-full font-semibold uppercase text-xs tracking-widest mb-4">
                                   {plan.label}
                                </Badge>
                                 <div className="text-3xl md:text-4xl font-black tracking-tight mb-2 leading-none">
                                    {formatCurrency(plan.value, proposal.currency)}
                                    <span className="text-lg font-medium text-zinc-400 ml-2">/mo</span>
                                 </div>
                             </div>
                             
                             <div className="h-px bg-white/10 w-full mb-6" />

                             <div className="space-y-4 flex-1">
                                {(plan.items ?? []).map((item, i) => (
                                  <div key={i} className="flex items-start gap-3">
                                     <CheckCircle2 className="w-4 h-4 text-brand shrink-0 mt-0.5" />
                                     <span className="font-medium text-sm text-zinc-300 leading-snug">{item}</span>
                                  </div>
                                ))}
                             </div>
                          </div>
                        ))
                      ) : (proposal as any).pricingPlan ? (
                        <div className="bg-white/5 border border-white/10 p-10 md:p-14 rounded-3xl shadow-lg relative overflow-hidden group text-center max-w-2xl mx-auto w-full hover:bg-white/10 transition-colors">
                           <Badge className="bg-brand text-white border-none px-5 py-2 rounded-full font-semibold uppercase text-xs tracking-widest mb-6">
                              {(proposal as any).pricingPlan.type} Strategy
                           </Badge>
                           <div className="text-4xl md:text-5xl font-black tracking-tight mb-8 leading-none">
                              {formatCurrency((proposal as any).pricingPlan.value, proposal.currency)}
                              <span className="text-lg md:text-xl font-medium text-zinc-400 ml-2">/month</span>
                           </div>
                           <div className="h-px bg-white/10 w-full mb-8" />
                           <div className="grid grid-cols-1 gap-5 md:gap-6 text-left max-w-lg mx-auto">
                              {((proposal as any).pricingPlan.items && (proposal as any).pricingPlan.items.length > 0 ? (proposal as any).pricingPlan.items : (proposal.services || [])).map((item: string, i: number) => (
                                <div key={i} className="flex items-start gap-4">
                                   <CheckCircle2 className="w-5 h-5 text-brand shrink-0 mt-0.5" />
                                   <span className="font-medium text-base text-zinc-300">{item}</span>
                                </div>
                              ))}
                           </div>
                        </div>
                      ) : null}
                    </div>
                    
                    <p className="text-zinc-400 font-medium text-sm">Investment amounts are in {proposal.currency}. Monthly management fees exclude third-party ad spend which is paid directly to platforms.</p>
                 </div>
              </div>
            )}

            <hr className="border-brand opacity-20" />

            {/* CONCLUSION & SIGNATURE */}
            <div className="flex flex-col">
               <div className="max-w-4xl w-full flex flex-col mx-auto">

                  <div className="flex items-center gap-4 mb-18">
                     <div className="h-1.5 w-12 bg-brand rounded-full" />
                     <h2 className="text-zinc-900 text-5xl md:text-6xl font-black tracking-tighter">Conclusion</h2>
                  </div>

                  <div className="text-base md:text-lg text-zinc-600 leading-relaxed space-y-7 mb-20">
                     <p>We are excited about the opportunity to partner with <span className="text-brand font-semibold">{proposal.clientName}</span> and drive measurable growth for your business.</p>
                     <p>Our comprehensive digital marketing approach is designed to build sustainable brand authority, generate qualified leads, and deliver consistent, high-quality results that directly impact your bottom line.</p>
                  </div>

                  <div className="bg-brand/5 border border-brand/20 rounded-2xl p-10 md:p-14 mb-20">
                     <p className="text-xs font-semibold text-brand uppercase tracking-widest mb-6">Expected Outcomes</p>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-7">
                        {[
                          "Enhanced brand visibility and authority",
                          "Increased qualified lead generation",
                          "Improved conversion rates",
                          "Sustainable growth trajectory"
                        ].map((it, i) => (
                          <div key={i} className="flex items-start gap-4">
                             <CheckCircle2 className="w-5 h-5 text-brand shrink-0 mt-1" />
                             <span className="font-medium text-zinc-700 text-sm md:text-base">{it}</span>
                          </div>
                        ))}
                     </div>
                  </div>

                  <div className="text-center mb-20">
                     <p className="text-5xl md:text-6xl text-zinc-900 font-black tracking-tighter">Ready to Begin?</p>
                  </div>

                  <div className="border-t-2 border-zinc-200 pt-16 flex flex-col md:flex-row justify-between items-start md:items-end gap-10">
                     <div className="space-y-4">
                        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest letter-spacing">Prepared By</p>
                        <p className="text-3xl font-black text-zinc-900">{proposal.creatorName || 'OP Media Strategist'}</p>
                        <p className="text-sm text-zinc-500 font-medium">Strategic Digital Growth Specialist</p>
                     </div>
                     <div className="flex flex-col gap-4 text-right">
                        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Contact</p>
                        <div className="space-y-3 text-zinc-600 font-medium text-sm">
                           <p>www.opmediaagency.com</p>
                           <p>info@opmediaagency.com</p>
                        </div>
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
