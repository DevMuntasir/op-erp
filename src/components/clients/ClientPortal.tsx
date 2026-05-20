import React, { useEffect, useState } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot,
  orderBy,
  doc,
  updateDoc,
  serverTimestamp,
  limit,
  getDocs
} from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
import { useAuth } from '@/src/App';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { 
  FileText, 
  Clock, 
  ChevronRight, 
  ExternalLink,
  MessageSquare,
  Image as ImageIcon,
  Calendar,
  User,
  LogOut,
  Layout,
  ChevronLeft,
  Search,
  Bell,
  CheckCircle,
  FileSearch,
  Settings,
  Lock,
  Eye,
  EyeOff,
  Shield,
  Mail,
  Maximize2,
  X,
  CreditCard,
  Receipt,
  Download
} from 'lucide-react';
import { cn, formatCurrency } from '@/src/lib/utils';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { 
  CurrencyCode,
  SUPPORTED_CURRENCIES
} from '@/src/types';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { updatePassword } from 'firebase/auth';
import { auth } from '@/src/lib/firebase';
import { handleFirestoreError, OperationType } from '@/src/lib/firestore-errors';

import { BrandLogo } from '@/src/components/layout/BrandLogo';

export const ClientPortal: React.FC = () => {
  const { user, firebaseUser, logout } = useAuth();
  const navigate = useNavigate();
  const [reports, setReports] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [previewEmail, setPreviewEmail] = useState<string>('');
  const [availablePreviewEmails, setAvailablePreviewEmails] = useState<string[]>([]);
  const [clientData, setClientData] = useState<any>(null);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'billing'>('overview');
  const [subscription, setSubscription] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [isBillingActionLoading, setIsBillingActionLoading] = useState(false);
  const [viewingInvoice, setViewingInvoice] = useState<any>(null);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  
  // Settings state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const isSuperAdmin = user?.role === 'super_admin';
  const canSeeBilling = !isAdmin || isSuperAdmin;

  const renderInvoicePortal = (invoice: any) => {
    const currency = (invoice.currency || 'USD') as CurrencyCode;
    
    const safeItems = (invoice.lineItems && invoice.lineItems.length > 0) ? invoice.lineItems : [
      { 
        description: invoice.description || invoice.message || 'Professional Services', 
        quantity: 1, 
        price: Number(invoice.amount || invoice.invoiceValue || 0) 
      }
    ];
    
    const currentSubtotal = safeItems.reduce((sum: number, item: any) => sum + (Number(item.quantity || 0) * Number(item.price || 0)), 0);
    const currentTotal = currentSubtotal;
    
    return (
      <div id="invoice-capture" className="bg-white p-8 sm:p-16 max-w-[800px] mx-auto min-h-[1000px] flex flex-col font-sans text-zinc-900 border border-zinc-100 shadow-sm print:shadow-none print:border-none print:p-0">
        {/* Header Section */}
        <div className="flex justify-between items-start border-b border-zinc-200 pb-12 mb-12">
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <BrandLogo className="w-32 sm:w-40 md:w-48 lg:w-56" />
              <div className="pt-1">
                <h1 className="text-3xl font-black tracking-tighter uppercase italic">Invoice</h1>
                <p className="text-[10px] font-black text-zinc-400 mt-0.5 tracking-[0.2em] uppercase italic leading-none">Official Agency Ledger</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-8 pt-6">
              <div className="space-y-1">
                <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest leading-none">Ledger Identification</p>
                <p className="text-sm font-black font-mono">#{invoice.id?.slice(-12).toUpperCase() || 'PROVISIONAL'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Date Issued</p>
                <p className="text-sm font-semibold">
                  {invoice.createdAt?.toDate ? invoice.createdAt.toDate().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 
                   invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
            </div>
          </div>

          <div className="text-right">
             <div className={cn(
                "inline-flex items-center px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest mb-6",
                invoice.status === 'paid' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" :
                invoice.status === 'pending' ? "bg-zinc-100 text-zinc-600 border border-zinc-200" :
                "bg-red-50 text-red-600 border border-red-100"
              )}>
                {invoice.status || 'DRAFT'}
             </div>
             
             <div className="space-y-1">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Amount Due</p>
                <p className="text-3xl font-black italic tracking-tighter text-zinc-900">{formatCurrency(Number(invoice.amount), currency)}</p>
             </div>
          </div>
        </div>

        {/* Address Info */}
        <div className="grid grid-cols-2 gap-16 mb-16 pb-12 border-b border-zinc-100">
           <div className="space-y-4">
              <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-100 pb-2">From</h3>
              <div className="space-y-2">
                <p className="text-base font-bold text-zinc-900 uppercase tracking-tight">OP Media Agency</p>
                <div className="text-xs text-zinc-500 leading-relaxed font-medium">
                  Super Admin Management<br />
                  Global Operations Center<br />
                  Halifax, Nova Scotia, Canada<br />
                  <span className="text-brand font-black underline underline-offset-4 decoration-brand/20">info@opmediaagency.com</span>
                </div>
              </div>
           </div>
           
           <div className="space-y-4">
              <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-100 pb-2">Bill To</h3>
              <div className="space-y-2">
                <p className="text-base font-bold text-zinc-900 tracking-tight">{invoice.clientName || 'Valued Client'}</p>
                <div className="text-xs text-zinc-500 leading-relaxed font-medium">
                  {invoice.clientEmail || 'client@email.com'}<br />
                  Enterprise Strategic Partner<br />
                  Authorized Service Entity
                </div>
              </div>
           </div>
        </div>

        {/* Line Items */}
        <div className="flex-1 mb-16">
          <table className="w-full">
            <thead>
              <tr className="bg-zinc-50 border-y border-zinc-100 rounded-lg">
                <th className="py-4 px-4 text-left text-[10px] font-bold uppercase tracking-widest text-zinc-500">Service Description</th>
                <th className="py-4 px-4 text-center text-[10px] font-bold uppercase tracking-widest text-zinc-500 w-24">Quantity</th>
                <th className="py-4 px-4 text-right text-[10px] font-bold uppercase tracking-widest text-zinc-500 w-32">Rate</th>
                <th className="py-4 px-4 text-right text-[10px] font-bold uppercase tracking-widest text-zinc-500 w-32">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {safeItems.map((item: any, i: number) => (
                <tr key={i}>
                  <td className="py-6 px-4">
                    <p className="text-sm font-semibold text-zinc-900 leading-tight">{item.description}</p>
                    <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest mt-1">Professional Services</p>
                  </td>
                  <td className="py-6 px-4 text-center text-sm font-medium text-zinc-500">{item.quantity}</td>
                  <td className="py-6 px-4 text-right text-sm font-medium text-zinc-900">{formatCurrency(item.price, currency)}</td>
                  <td className="py-6 px-4 text-right text-sm font-bold text-zinc-900">{formatCurrency(item.quantity * item.price, currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals Section */}
        <div className="bg-zinc-50 rounded-[2rem] p-10 flex flex-col sm:flex-row justify-between gap-12 border border-zinc-100">
            <div className="max-w-xs space-y-4">
               <div>
                  <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Payment Notes</h3>
                  <p className="text-xs text-zinc-500 font-medium leading-relaxed italic">
                    {invoice.message || "Thank you for partnering with OP Media Agency. Please settle this invoice within the agreed 7 business day payment window to maintain service continuity."}
                  </p>
               </div>
              <div className="pt-4 border-t border-zinc-200">
                  <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Global Support</p>
                  <p className="text-[10px] font-bold text-zinc-900 mt-1 uppercase">info@opmediaagency.com</p>
               </div>
            </div>
            
            <div className="w-full sm:w-64 space-y-3">
               <div className="flex justify-between items-center text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                  <span>Subtotal</span>
                  <span>{formatCurrency(currentSubtotal, currency)}</span>
               </div>
               <div className="flex justify-between items-center text-[10px] font-bold text-zinc-400 uppercase tracking-widest pb-4 border-b border-zinc-200">
                  <span>Tax (VAT 0%)</span>
                  <span>{formatCurrency(0, currency)}</span>
               </div>
               <div className="flex justify-between items-center pt-2">
                  <span className="text-[11px] font-black uppercase tracking-widest text-zinc-400 italic">Total Amount</span>
                  <span className="text-2xl font-black italic tracking-tighter text-zinc-900 leading-none">{formatCurrency(currentTotal, currency)}</span>
               </div>
            </div>
        </div>

        <div className="mt-16 text-center border-t border-zinc-100 pt-8">
          <p className="text-[9px] font-black uppercase tracking-widest text-zinc-300 italic">
            Powered by OP Media Agency Finance Infrastructure &bull; Secure Ledger System v2.1
          </p>
        </div>
      </div>
    );
  };
  
  const [isExporting, setIsExporting] = useState(false);

  const handleDownloadPDF = async () => {
    const element = document.getElementById('invoice-capture');
    if (!element) {
      toast.error("Capture element not found");
      return;
    }
    
    // Safety check for dimensions to prevent createPattern error
    if (element.offsetWidth === 0 || element.offsetHeight === 0) {
      toast.error("The document is currently hidden or has no size. Please ensure it is visible before downloading.");
      return;
    }
    
    setIsExporting(true);
    const originalScrollY = window.scrollY;
    try {
      window.scrollTo(0, 0);
      
      // Wait for assets to settle and layout to stabilize
      await new Promise(r => setTimeout(r, 1000));

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
          const clonedElement = clonedDoc.getElementById('invoice-capture');
          if (clonedElement) {
            clonedElement.style.width = '1000px';
            clonedElement.style.maxWidth = '1000px';
            clonedElement.style.padding = '60px';
            clonedElement.style.margin = '0 auto';
            clonedElement.style.boxShadow = 'none';
            clonedElement.style.border = 'none';
            clonedElement.style.backgroundColor = '#ffffff';
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

          // Scrub inline styles and computed styles
          const all = clonedDoc.querySelectorAll('*');
          all.forEach((el: any) => {
            // Scrub inline style attribute specifically
            const inlineStyle = el.getAttribute('style');
            if (inlineStyle && (inlineStyle.includes('oklch') || inlineStyle.includes('oklab') || inlineStyle.includes('color(') || inlineStyle.includes('color-mix') || inlineStyle.includes('light-dark'))) {
              let newStyle = inlineStyle;
              for (let j = 0; j < 3; j++) {
                newStyle = newStyle.replace(/(oklch|oklab|lab|lch|color|color-mix|light-dark)\s*\((?:[^()]*|\((?:[^()]*|\([^()]*\))*\))*\)/gi, zincHex);
              }
              el.setAttribute('style', newStyle);
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
              font-family: 'Geist Variable', 'Inter', system-ui, sans-serif !important;
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
            .bg-brand { background-color: ${brandHex} !important; }
            .text-brand { color: ${brandHex} !important; }
            .bg-zinc-50 { background-color: #fafafa !important; }
            .bg-zinc-100 { background-color: #f4f4f5 !important; }
            .bg-zinc-900 { background-color: #18181b !important; }
            .border-zinc-100 { border-color: #f4f4f5 !important; }
            .border-zinc-200 { border-color: #e4e4e7 !important; }
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
            
            // Fix letter spacing and font rendering
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
      
      const imgData = canvas.toDataURL('image/jpeg', 0.75);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: 'a4',
        compress: true
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
      pdf.save(`Invoice-${viewingInvoice?.id?.slice(-8).toUpperCase() || 'Record'}.pdf`);
      toast.success("Invoice downloaded successfully");
    } catch (err: any) {
      console.error("PDF Export failed:", err);
      toast.error("Enhanced export failed. Falling back to print.");
      window.print();
    } finally {
      if (typeof originalScrollY !== 'undefined') {
        window.scrollTo(0, originalScrollY);
      }
      setIsExporting(false);
    }
  };

  const handlePayInvoice = async (invoice: any) => {
    setIsProcessingPayment(true);
    try {
      // Simulate payment delay
      await new Promise(r => setTimeout(r, 2000));
      
      await updateDoc(doc(db, 'payments', invoice.id), {
        status: 'paid',
        paymentDate: serverTimestamp(),
        stripeInvoiceUrl: 'https://ambient.agency/receipt/' + invoice.id
      });
      
      toast.success("Payment successful", { description: "Invoice marked as paid in the ledger." });
      setIsPayModalOpen(false);
      setViewingInvoice(null);
    } catch (err: any) {
      toast.error("Payment failed", { description: err.message });
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Fetch notifications
  useEffect(() => {
    if (!firebaseUser?.uid) return;
    
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', firebaseUser.uid),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(q, (snap) => {
      setNotifications(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'notifications');
    });
    return () => unsub();
  }, [firebaseUser]);

  const [selectedImageView, setSelectedImageView] = useState<string | null>(null);

  // Mark all as read helper
  const markAsRead = async () => {
    const unread = notifications.filter(n => !n.read);
    for (const n of unread) {
      await updateDoc(doc(db, 'notifications', n.id), { read: true });
    }
  };

  // Fullscreen ImageViewer Modal (Internal Agency Standard)
  const ImageViewer = () => (
    <Dialog open={!!selectedImageView} onOpenChange={() => setSelectedImageView(null)}>
      <DialogContent className="max-w-none sm:max-w-none w-screen h-[100dvh] p-0 bg-zinc-950/98 border-none shadow-none flex flex-col items-center justify-start overflow-y-auto z-[100]">
        {selectedImageView && (
          <div className="w-full min-h-full flex flex-col items-center justify-center p-4 sm:p-8 gap-4 sm:gap-8">
            <div className="relative bg-zinc-900 w-full max-w-6xl aspect-video sm:flex-1 flex items-center justify-center rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border border-white/5 shrink-0">
              <motion.img 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                src={selectedImageView} 
                alt="Fullscreen Evidence" 
                className="max-h-full max-w-full object-contain"
                referrerPolicy="no-referrer"
              />
              <Button 
                size="icon" 
                variant="ghost" 
                onClick={() => setSelectedImageView(null)}
                className="absolute top-3 right-3 sm:top-6 sm:right-6 bg-white/20 hover:bg-white/40 text-white rounded-full backdrop-blur-md z-10"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </Button>
            </div>
            
            <div className="w-full max-w-6xl pb-8">
              <div className="relative bg-zinc-900/90 backdrop-blur-xl px-4 sm:px-8 py-3 sm:py-5 rounded-2xl sm:rounded-[3rem] flex flex-col sm:flex-row items-center gap-4 sm:gap-12 text-white shadow-2xl border border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-brand/20 flex items-center justify-center">
                    <Maximize2 className="w-4 h-4 sm:w-6 sm:h-6 text-brand" />
                  </div>
                  <div>
                    <p className="text-[10px] sm:text-lg font-black tracking-widest uppercase">Verified Evidence</p>
                    <p className="text-[8px] sm:text-xs font-bold text-zinc-400 uppercase tracking-widest">Original Diagnostic Frame</p>
                  </div>
                </div>

                <div className="hidden sm:block h-12 w-px bg-white/10" />
                
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button 
                    variant="outline" 
                    className="flex-1 sm:flex-initial rounded-xl sm:rounded-2xl border-white/10 text-white hover:bg-white/10 font-bold h-10 sm:h-14 px-4 sm:px-8 text-[10px] sm:text-sm"
                    onClick={() => window.open(selectedImageView, '_blank')}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Original
                  </Button>
                  <Button 
                    className="flex-1 sm:flex-initial rounded-xl sm:rounded-2xl bg-white text-zinc-900 hover:bg-zinc-100 font-extrabold h-10 sm:h-14 px-6 sm:px-10 text-[10px] sm:text-sm"
                    onClick={() => setSelectedImageView(null)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );

  const BillingView = () => (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-zinc-900 italic">Financial Overview & Invoices</h2>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mt-1 italic">Agency Service & Investment Tracking</p>
        </div>
        {!subscription && (
          <Button 
            onClick={handleSubscribe} 
            disabled={isBillingActionLoading}
            className="bg-brand text-white hover:bg-brand/90 font-black text-xs uppercase tracking-widest px-8 rounded-2xl h-12 shadow-xl shadow-brand/20"
          >
            {isBillingActionLoading ? "Processing..." : "Activate Subscription"}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
        <Card className="rounded-[2.5rem] border-none shadow-sm bg-white p-6 sm:p-8 group hover:shadow-xl hover:shadow-brand/5 transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-zinc-50 rounded-2xl flex items-center justify-center text-zinc-400 group-hover:text-brand transition-colors">
              <Shield className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <Badge className={cn(
              "px-2 py-0.5 rounded-full border-none font-black text-[8px] uppercase tracking-widest",
              subscription?.status === 'active' || clientData?.status === 'active' ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
            )}>
              {subscription?.status || clientData?.status || 'No Active Plan'}
            </Badge>
          </div>
          <div className="space-y-1">
            <h4 className="text-lg sm:text-xl font-black tracking-tight text-zinc-900">{subscription?.plan || (clientData?.status === 'active' ? 'Enterprise Tier' : 'Evaluation')}</h4>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em]">Service Status</p>
          </div>
        </Card>

        <Card className="rounded-[2.5rem] border-none shadow-sm bg-white p-6 sm:p-8 group hover:shadow-xl transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-zinc-50 rounded-2xl flex items-center justify-center text-zinc-400 group-hover:text-amber-500 transition-colors">
              <Calendar className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
          </div>
          <div className="space-y-1">
            <h4 className="text-lg sm:text-xl font-black tracking-tight text-zinc-900">
              {clientData?.assignedDate ? (
                clientData.assignedDate.toDate ? clientData.assignedDate.toDate().toLocaleDateString() : 
                new Date(clientData.assignedDate).toLocaleDateString()
              ) : 'Pending Assignment'}
            </h4>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em]">Assigned Date</p>
          </div>
        </Card>

        <Card className="rounded-[2.5rem] border-none shadow-sm bg-white p-6 sm:p-8 group hover:shadow-xl transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-zinc-50 rounded-2xl flex items-center justify-center text-zinc-400 group-hover:text-blue-500 transition-colors">
              <Clock className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
          </div>
          <div className="space-y-1">
            <h4 className="text-lg sm:text-xl font-black tracking-tight text-zinc-900">
              {subscription?.nextBillingDate ? new Date(subscription.nextBillingDate).toLocaleDateString() : 
               clientData?.nextBillingDate ? new Date(clientData.nextBillingDate).toLocaleDateString() : 'N/A'}
            </h4>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em]">Next Billing Date</p>
          </div>
        </Card>

        <Card className="rounded-[2.5rem] border-none shadow-sm bg-white p-6 sm:p-8 group hover:shadow-xl transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-zinc-50 rounded-2xl flex items-center justify-center text-zinc-400 group-hover:text-emerald-500 transition-colors">
              <CreditCard className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            {subscription && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleManageBilling}
                disabled={isBillingActionLoading}
                className="text-[8px] font-black uppercase tracking-widest text-brand"
              >
                Update
              </Button>
            )}
          </div>
          <div className="space-y-1">
            <h4 className="text-lg sm:text-xl font-black tracking-tight text-zinc-900">
              {formatCurrency(subscription?.amount || clientData?.invoiceValue || 0, subscription?.currency || clientData?.currency || 'USD')}/mo
            </h4>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em]">Monthly Invoice Value</p>
          </div>
        </Card>
      </div>

      <Card className="rounded-[2.5rem] sm:rounded-[3rem] border-none shadow-sm overflow-hidden bg-white">
        <CardHeader className="p-6 sm:p-8 pb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-xl font-black tracking-tight">Billing History</CardTitle>
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mt-1 italic">Verified Financial Records</p>
          </div>
          <Badge className="bg-zinc-50 text-zinc-400 border-none font-bold text-[9px] px-3 py-1 rounded-xl w-fit">Last 12 Months</Badge>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead className="bg-zinc-50/50">
                <tr>
                  <th className="text-left py-4 px-8 text-[10px] font-black uppercase tracking-widest text-zinc-400">Date</th>
                  <th className="text-left py-4 px-8 text-[10px] font-black uppercase tracking-widest text-zinc-400">Amount</th>
                  <th className="text-left py-4 px-8 text-[10px] font-black uppercase tracking-widest text-zinc-400">Status</th>
                  <th className="text-right py-4 px-8 text-[10px] font-black uppercase tracking-widest text-zinc-400">Invoice</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {payments.length > 0 ? payments.map((payment) => (
                  <tr key={payment.id} className="group hover:bg-zinc-50/30 transition-colors">
                    <td className="py-5 px-8">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-bold text-zinc-900">
                          {payment.paymentDate ? new Date(payment.paymentDate).toLocaleDateString() : 
                           payment.createdAt ? (payment.createdAt.toDate ? payment.createdAt.toDate().toLocaleDateString() : new Date(payment.createdAt).toLocaleDateString()) : 'N/A'}
                        </span>
                        {payment.isManual && payment.message && (
                          <span className="text-[9px] text-zinc-400 font-medium italic line-clamp-1">{payment.message}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-5 px-8">
                      <span className="text-sm font-black text-zinc-600">{formatCurrency(payment.amount, payment.currency?.toUpperCase() || 'USD')}</span>
                    </td>
                    <td className="py-5 px-8">
                      <Badge className={cn(
                        "text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full border-none",
                        payment.status === 'paid' || payment.status === 'succeeded' ? "bg-emerald-100 text-emerald-700" : 
                        payment.status === 'pending' ? "bg-amber-100 text-amber-700 animate-pulse" :
                        "bg-red-100 text-red-700"
                      )}>
                        {payment.status}
                      </Badge>
                    </td>
                    <td className="py-5 px-8 text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setViewingInvoice(payment)}
                          className="rounded-xl h-9 px-4 hover:bg-zinc-100 text-[10px] font-black uppercase tracking-widest"
                        >
                          <Eye className="w-3.5 h-3.5 mr-2" />
                          View
                        </Button>

                        {payment.status === 'pending' && (
                          <Button 
                            onClick={() => {
                              setViewingInvoice(payment);
                              setIsPayModalOpen(true);
                            }}
                            className="rounded-xl h-9 px-4 bg-brand text-white hover:bg-brand/90 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-brand/20"
                          >
                            <CreditCard className="w-3.5 h-3.5 mr-2" />
                            Pay Now
                          </Button>
                        )}

                        {payment.status === 'paid' && payment.stripeInvoiceUrl && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => window.open(payment.stripeInvoiceUrl, '_blank')}
                            className="rounded-xl h-9 px-4 hover:bg-zinc-100 text-[10px] font-black uppercase tracking-widest text-zinc-400"
                          >
                            <Download className="w-3.5 h-3.5 mr-2" />
                            PDF
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4} className="py-20 text-center">
                      <Receipt className="w-12 h-12 text-zinc-100 mx-auto mb-4" />
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest italic">No payment history found</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  const extractShortSummary = (fullReport: string) => {
    if (!fullReport) return '';
    const sections = fullReport.split('---');
    const summarySection = sections.find(s => s.includes('Short Summary'));
    if (summarySection) {
      return summarySection.replace(/### Short Summary \(for WhatsApp\/Email\)/g, '').trim();
    }
    // Try to find the last section if --- exists but not perfectly labeled
    if (sections.length > 1) {
      return sections[sections.length - 1].trim();
    }
    return fullReport.slice(-200); // Fallback
  };

  const cleanReportContent = (fullReport: string) => {
    if (!fullReport) return '';
    const sections = fullReport.split('---');
    // Remove the Short Summary section from the main display
    const filteredSections = sections.filter(s => !s.includes('Short Summary'));
    return filteredSections.join('---')
      .replace(/^(\*\*?Client:\*\*?|\*\*?Service:\*\*?|\*\*?Reporting Period:\*\*?|Client:|Service:|Reporting Period:).*\n?/gm, '');
  };

  // Fetch all possible client emails for admin preview
  useEffect(() => {
    if (!isAdmin || !firebaseUser) return;
    
    let q;
    if (isSuperAdmin) {
      q = query(collection(db, 'clients'), orderBy('name', 'asc'));
    } else {
      const adminId = user?.role === 'admin' ? user.uid : (user?.adminId || user?.uid);
      q = query(collection(db, 'clients'), where('adminId', '==', adminId), orderBy('name', 'asc'));
    }

    const unsub = onSnapshot(q, (snap) => {
      const emails = new Set<string>();
      snap.docs.forEach(doc => {
        const data = doc.data();
        if (data.email) emails.add(data.email);
      });
      const emailList = Array.from(emails);
      setAvailablePreviewEmails(emailList);
      
      // Auto-select first client if none selected
      if (emailList.length > 0 && !previewEmail) {
        setPreviewEmail(emailList[0]);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'clients (admin preview set)');
    });
    return () => unsub();
  }, [isAdmin, isSuperAdmin, user?.uid]);

  useEffect(() => {
    if (!firebaseUser) return;
    
    const targetEmail = (isAdmin && previewEmail) 
      ? previewEmail 
      : firebaseUser?.email?.toLowerCase().trim();

    if (!targetEmail) {
      if (!isAdmin) setLoading(false);
      return;
    }

    setLoading(true);
    const reportsRef = collection(db, 'reports');
    
    // Add adminId filter if regular admin to satisfy security rules
    let q;
    if (user?.role === 'admin') {
      q = query(
        reportsRef, 
        where('adminId', '==', user.uid),
        where('clientEmail', '==', targetEmail),
        where('sentToClient', '==', true)
      );
    } else {
      q = query(
        reportsRef, 
        where('clientEmail', '==', targetEmail),
        where('sentToClient', '==', true)
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Sort manually to avoid index requirement
      const sorted = docs.sort((a: any, b: any) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
        return dateB - dateA;
      });
      
      setReports(sorted);
      setLoading(false);
      if (sorted.length > 0 && !selectedReport) {
        setSelectedReport(sorted[0]);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'reports (client filtered)');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [firebaseUser, previewEmail]);

  // Fetch tasks related to target email
  useEffect(() => {
    if (!firebaseUser) return;

    const targetEmail = (isAdmin && previewEmail) 
      ? previewEmail 
      : firebaseUser?.email?.toLowerCase().trim();

    if (!targetEmail) {
      setTasks([]);
      return;
    }

    const tasksRef = collection(db, 'tasks');
    let q;
    if (user?.role === 'admin') {
      q = query(
        tasksRef, 
        where('adminId', '==', user.uid),
        where('clientEmail', '==', targetEmail)
      );
    } else {
      q = query(
        tasksRef, 
        where('clientEmail', '==', targetEmail)
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTasks(docs);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'tasks (client filtered)');
    });

    return () => unsubscribe();
  }, [firebaseUser, isAdmin, previewEmail]);

  // Fetch client document and assigned team
  useEffect(() => {
    if (!firebaseUser) return;

    const targetEmail = (isAdmin && previewEmail) 
      ? previewEmail 
      : firebaseUser?.email?.toLowerCase().trim();

    if (!targetEmail) return;

    let q;
    if (user?.role === 'admin') {
      q = query(
        collection(db, 'clients'), 
        where('adminId', '==', user.uid),
        where('email', '==', targetEmail), 
        limit(1)
      );
    } else {
      q = query(
        collection(db, 'clients'), 
        where('email', '==', targetEmail), 
        limit(1)
      );
    }
    const unsubClient = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        const docSnap = snap.docs[0];
        const data = { id: docSnap.id, ...docSnap.data() };
        setClientData(data);
        
        // Fetch profiles for assigned employees
        if (data.assignedEmployees?.length > 0) {
          const profilesRef = collection(db, 'profiles');
          const qTeam = query(profilesRef, where('__name__', 'in', data.assignedEmployees));
          getDocs(qTeam).then(profileSnap => {
            setTeamMembers(profileSnap.docs.map(d => ({ uid: d.id, ...d.data() })));
          }).catch(error => {
            handleFirestoreError(error, OperationType.GET, 'profiles (team members)');
          });
        } else {
          setTeamMembers([]);
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'clients (document)');
    });

    return () => unsubClient();
  }, [firebaseUser, isAdmin, previewEmail]);

  const [resolvedClientUid, setResolvedClientUid] = useState<string | null>(null);

  // Resolve client UID for billing/fetching when admin is previewing
  useEffect(() => {
    if (!isAdmin || !clientData?.email) {
      setResolvedClientUid(null);
      return;
    }

    const resolveUid = async () => {
      try {
        const q = query(collection(db, 'users'), where('email', '==', clientData.email.toLowerCase().trim()), limit(1));
        const snap = await getDocs(q);
        if (!snap.empty) {
          setResolvedClientUid(snap.docs[0].id);
        } else {
          // Fallback to placeholder or email if not found in users yet
          setResolvedClientUid(clientData.email.toLowerCase().trim().replace(/\./g, '_'));
        }
      } catch (err) {
        console.error("Error resolving client UID:", err);
        setResolvedClientUid(clientData.email.toLowerCase().trim().replace(/\./g, '_'));
      }
    };

    resolveUid();
  }, [isAdmin, clientData?.email]);

  // Fetch subscription and payments
  useEffect(() => {
    if (!firebaseUser?.uid) return;

    const targetUserId = isAdmin ? resolvedClientUid : firebaseUser.uid;
    if (!targetUserId) return;

    // Subscription Listener
    const unsubSub = onSnapshot(doc(db, 'subscriptions', targetUserId), (doc) => {
      if (doc.exists()) {
        setSubscription({ id: doc.id, ...doc.data() });
      } else {
        setSubscription(null);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `subscriptions/${targetUserId}`);
    });

    // Payments Listener
    if (!canSeeBilling) {
      setPayments([]);
      unsubSub();
      return;
    }

    const qPayments = query(
      collection(db, 'payments'),
      where('userId', '==', targetUserId),
      orderBy('paymentDate', 'desc')
    );
    const unsubPayments = onSnapshot(qPayments, (snap) => {
      setPayments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'payments');
    });

    return () => {
      unsubSub();
      unsubPayments();
    };
  }, [firebaseUser, previewEmail, clientData?.id, resolvedClientUid, isSuperAdmin, isAdmin]);

  const handleSubscribe = async () => {
    if (!firebaseUser) return;
    setIsBillingActionLoading(true);
    try {
      const response = await fetch('/api/stripe/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: firebaseUser.uid,
          userEmail: firebaseUser.email
        }),
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error("Failed to create subscription session");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred");
    } finally {
      setIsBillingActionLoading(false);
    }
  };

  const handleManageBilling = async () => {
    if (!subscription?.stripeCustomerId) return;
    setIsBillingActionLoading(true);
    try {
      const response = await fetch('/api/stripe/customer-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: subscription.stripeCustomerId
        }),
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error("Failed to open billing portal");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred");
    } finally {
      setIsBillingActionLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setIsUpdatingPassword(true);
    try {
      if (auth.currentUser) {
        await updatePassword(auth.currentUser, newPassword);
        toast.success("Password updated successfully");
        setIsSettingsOpen(false);
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (error: any) {
      console.error("Password update error:", error);
      if (error.code === 'auth/requires-recent-login') {
        toast.error("Security session expired", { description: "Please log out and log back in to change your password." });
      } else {
        toast.error(error.message || "Failed to update password");
      }
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-zinc-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-brand border-t-transparent rounded-full animate-spin" />
          <p className="font-black text-[10px] uppercase tracking-[0.2em] text-zinc-400">Loading your reports</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col">
      <ImageViewer />
      
      {/* Invoice Detail / Payment Modal */}
      <Dialog open={!!viewingInvoice} onOpenChange={(open) => !open && (setViewingInvoice(null), setIsPayModalOpen(false))}>
        <DialogContent className="max-w-5xl rounded-[3rem] border-none shadow-2xl p-0 overflow-hidden bg-zinc-100 h-[90vh] flex flex-col">
          <div className="p-4 sm:p-8 bg-white border-b border-zinc-100 flex items-center justify-between no-print">
             <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center">
                  <Receipt className="w-5 h-5 text-brand" />
                </div>
                <div>
                  <h3 className="text-xl font-black italic tracking-tighter">
                    {isPayModalOpen ? 'Secure Checkout' : 'Invoice Detail'}
                  </h3>
                  <p className="text-[10px] font-black uppercase text-zinc-400">Ledger Entry Verification</p>
                </div>
             </div>
             <div className="flex gap-2">
               {!isPayModalOpen && viewingInvoice?.status === 'pending' && (
                 <Button onClick={() => setIsPayModalOpen(true)} className="rounded-xl bg-brand text-white font-black text-[10px] uppercase tracking-widest">
                   Pay Now
                 </Button>
               )}
               <Button 
                 variant="ghost" 
                 onClick={handleDownloadPDF} 
                 disabled={isExporting}
                 className="rounded-xl font-black text-[10px] uppercase tracking-widest gap-2"
               >
                 {isExporting ? <div className="w-4 h-4 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin" /> : <Download className="w-4 h-4" />} 
                 Download PDF
               </Button>
               <Button variant="ghost" onClick={() => setViewingInvoice(null)} className="rounded-xl font-black text-[10px] uppercase tracking-widest">
                 Close
               </Button>
             </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 sm:p-12 print:p-0 flex flex-col lg:flex-row gap-8 bg-zinc-50 translate-z-0">
             <div className="flex-1">
                {viewingInvoice && renderInvoicePortal(viewingInvoice)}
             </div>
             
             {isPayModalOpen && (
               <div className="w-full lg:w-96 space-y-6 no-print p-4">
                  <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-zinc-100 space-y-6">
                    <div className="flex items-center gap-3 pb-6 border-b border-zinc-100">
                      <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center">
                        <CreditCard className="w-5 h-5 text-brand" />
                      </div>
                      <h4 className="text-sm font-black italic">Payment Method</h4>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="p-4 rounded-2xl bg-zinc-900 text-white relative overflow-hidden group">
                         <div className="absolute right-[-10%] top-[-10%] w-32 h-32 bg-brand/20 blur-3xl" />
                         <p className="text-[8px] font-black uppercase tracking-widest text-zinc-400 mb-4">Saved Card</p>
                         <p className="text-sm font-mono tracking-widest mb-6">•••• •••• •••• 4242</p>
                         <div className="flex justify-between items-end">
                            <div>
                               <p className="text-[7px] font-bold text-zinc-500 uppercase tracking-widest">Holder</p>
                               <p className="text-[9px] font-black uppercase tracking-tight">{user?.name || 'Valued Client'}</p>
                            </div>
                            <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" className="h-4 filter brightness-0 invert opacity-50" alt="Visa" />
                         </div>
                      </div>
                      
                      <div className="space-y-2">
                         <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Card Security Code</p>
                         <Input className="h-12 rounded-2xl bg-zinc-50 border-none" placeholder="CVC" maxLength={3} />
                      </div>
                    </div>

                    <div className="space-y-3 pt-4">
                      <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                        <span>Invoice Total</span>
                        <span>${Number(viewingInvoice?.amount).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                        <span>Processing Fee</span>
                        <span className="text-emerald-500">Waived</span>
                      </div>
                      <div className="pt-3 border-t border-zinc-100 flex justify-between items-center">
                        <span className="text-xs font-black uppercase italic text-brand">Total Charge</span>
                        <span className="text-xl font-black italic">${Number(viewingInvoice?.amount).toFixed(2)}</span>
                      </div>
                    </div>

                    <Button 
                      onClick={() => handlePayInvoice(viewingInvoice)}
                      disabled={isProcessingPayment}
                      className="w-full h-14 bg-zinc-900 text-white hover:bg-brand hover:text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl transition-all"
                    >
                      {isProcessingPayment ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Processing...
                        </div>
                      ) : (
                        `Authorize Payment`
                      )}
                    </Button>
                  </div>
                  
                  <div className="bg-zinc-900/5 p-6 rounded-2xl border border-zinc-900/10 flex gap-3">
                    <Shield className="w-5 h-5 text-brand shrink-0" />
                    <p className="text-[9px] font-bold text-zinc-500 uppercase leading-relaxed">
                      Transactions are 256-bit encrypted. By clicking authorize, you agree to fulfill this professional obligation.
                    </p>
                  </div>
               </div>
             )}
          </div>
        </DialogContent>
      </Dialog>
      {/* Header */}
      <header className="bg-white border-b border-zinc-100 px-4 sm:px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3 sm:gap-6">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-brand flex items-center justify-center cursor-pointer shadow-lg shadow-brand/20" onClick={() => isAdmin ? navigate('/admin') : null}>
              <Layout className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xs sm:text-sm font-black tracking-tight uppercase truncate max-w-[120px] sm:max-w-none">
                  {isAdmin ? 'Portal Preview' : 'Client Portal'}
                </h1>
                {clientData?.autoPay && (
                  <Badge className="bg-emerald-500 text-white font-black text-[7px] uppercase tracking-tighter px-1.5 py-0 rounded-md border-none animate-pulse">
                    Auto-Pay ON
                  </Badge>
                )}
              </div>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                {isAdmin ? (previewEmail || 'Select a client') : firebaseUser?.email}
              </p>
            </div>
          </div>

          {isAdmin && (
            <div className="flex items-center gap-2 border-l border-zinc-100 pl-6 ml-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Previewing:</span>
              <Select value={previewEmail} onValueChange={setPreviewEmail}>
                <SelectTrigger className="w-[200px] h-9 rounded-xl border-zinc-100 bg-zinc-50 text-[10px] font-bold">
                  <SelectValue placeholder="Select Client Email" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-zinc-100">
                  {availablePreviewEmails.length === 0 ? (
                    <div className="p-4 text-center text-[10px] uppercase font-black text-zinc-400">No active client reports found</div>
                  ) : (
                    availablePreviewEmails.map(email => (
                      <SelectItem key={email} value={email} className="text-[10px] font-bold py-2.5 rounded-xl capitalize">
                        {email}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button variant="outline" size="sm" onClick={() => navigate('/admin')} className="rounded-xl font-black text-[10px] uppercase tracking-widest border-zinc-200">
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back to Admin
            </Button>
          )}

          <Popover onOpenChange={(open) => open && markAsRead()}>
            <PopoverTrigger render={
              <Button variant="ghost" size="icon" className="relative rounded-xl hover:bg-zinc-100">
                <Bell className="w-5 h-5 text-zinc-600" />
                {notifications.some(n => !n.read) && (
                  <span className="absolute top-2 right-2 w-2 h-2 bg-brand rounded-full border-2 border-white ring-1 ring-brand/20 animate-pulse" />
                )}
              </Button>
            } />
            <PopoverContent className="w-80 p-0 rounded-[2rem] border-zinc-100 shadow-2xl overflow-hidden mt-2" align="end">
              <div className="p-5 border-b border-zinc-100 bg-zinc-50/50">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-widest">Notifications</h3>
                  <Badge className="bg-brand text-white font-black text-[8px] uppercase px-1.5 py-0 rounded-full border-none">
                    {notifications.filter(n => !n.read).length} New
                  </Badge>
                </div>
              </div>
              <ScrollArea className="h-80">
                <div className="p-2">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center">
                      <Bell className="w-8 h-8 text-zinc-100 mx-auto mb-2" />
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">All caught up</p>
                    </div>
                  ) : (
                    notifications.map(n => (
                      <div 
                        key={n.id} 
                        className={cn(
                          "p-4 rounded-2xl hover:bg-zinc-50 transition-colors cursor-pointer",
                          !n.read && "bg-brand/5 border border-brand/10"
                        )}
                        onClick={() => {
                          if (n.type === 'report') {
                            const report = reports.find(r => r.id === n.relatedId);
                            if (report) setSelectedReport(report);
                          }
                        }}
                      >
                        <div className="flex gap-3">
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                            n.type === 'report' ? "bg-brand/10 text-brand" : "bg-zinc-100 text-zinc-400"
                          )}>
                            <FileText className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-zinc-900 leading-tight">{n.title}</p>
                            <p className="text-[10px] text-zinc-500 mt-0.5 line-clamp-2">{n.message}</p>
                            <p className="text-[8px] font-black uppercase tracking-tighter text-zinc-400 mt-2">
                              {n.createdAt?.toDate ? n.createdAt.toDate().toLocaleTimeString() : 'Just now'}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </PopoverContent>
          </Popover>

          <Button 
            variant="ghost" 
            size="icon" 
            className="rounded-xl hover:bg-zinc-100"
            onClick={() => setIsSettingsOpen(true)}
          >
            <Settings className="w-5 h-5 text-zinc-600" />
          </Button>

          <Button variant="ghost" size="sm" onClick={logout} className="rounded-xl font-black text-[10px] uppercase tracking-widest text-red-500 hover:text-red-600 hover:bg-red-50">
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      <div className="flex-1 p-3 sm:p-6 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
        {/* Sidebar List */}
        <div className="lg:col-span-4 space-y-6">
          <div className="flex flex-col gap-2 mb-4 sm:mb-8 bg-zinc-100/50 p-2 rounded-3xl">
            <Button 
               variant={activeTab === 'overview' && !selectedReport ? 'default' : 'ghost'} 
               onClick={() => { setActiveTab('overview'); setSelectedReport(null); }}
               className={cn(
                 "justify-start h-12 px-6 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all", 
                 activeTab === 'overview' && !selectedReport ? "bg-zinc-900 text-white shadow-xl shadow-black/10" : "text-zinc-500 hover:bg-zinc-200/50"
               )}
            >
               <Layout className="w-4 h-4 mr-3" />
               Dashboard
            </Button>
            {canSeeBilling && (
              <Button 
                 variant={activeTab === 'billing' ? 'default' : 'ghost'} 
                 onClick={() => { setActiveTab('billing'); setSelectedReport(null); }}
                 className={cn(
                   "justify-start h-12 px-6 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all", 
                   activeTab === 'billing' ? "bg-zinc-900 text-white shadow-xl shadow-black/10" : "text-zinc-500 hover:bg-zinc-200/50"
                 )}
              >
                 <Receipt className="w-4 h-4 mr-3" />
                 Invoices
              </Button>
            )}
          </div>

          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black uppercase tracking-widest text-zinc-400">
              Recent Reports
            </h2>
            <Badge className="bg-zinc-100 text-zinc-600 font-black text-[8px] uppercase tracking-widest border-none px-2 py-0.5 rounded-full">
              {reports.length} Reports
            </Badge>
          </div>

          <ScrollArea className="h-[calc(100vh-200px)]">
            <div className="space-y-3 pr-4 pb-4">
              {reports.length === 0 ? (
                <div className="text-center p-12 bg-white rounded-[2.5rem] border-2 border-dashed border-zinc-100">
                  <FileText className="w-12 h-12 text-zinc-100 mx-auto mb-4" />
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">No reports available</p>
                </div>
              ) : (
                reports.map((r) => (
                  <motion.div
                    key={r.id}
                    layout
                    onClick={async () => {
                      setActiveTab('overview');
                      setSelectedReport(r);
                      if (!r.isViewed && !isAdmin) {
                        try {
                          await updateDoc(doc(db, 'reports', r.id), {
                            isViewed: true,
                            viewedAt: serverTimestamp()
                          });
                        } catch (err) {
                          console.error("Failed to mark viewed:", err);
                        }
                      }
                    }}
                    className={cn(
                      "p-5 rounded-2xl cursor-pointer transition-all border-2 relative overflow-hidden group",
                      selectedReport?.id === r.id 
                        ? "border-brand bg-white shadow-xl shadow-brand/5" 
                        : "border-transparent bg-white hover:border-zinc-200"
                    )}
                  >
                    {!r.isViewed && !isAdmin && (
                      <div className="absolute top-0 right-0 p-2">
                        <div className="w-2 h-2 bg-brand rounded-full ring-4 ring-brand/10" />
                      </div>
                    )}
                    {selectedReport?.id === r.id && (
                      <motion.div 
                        layoutId="active-indicator"
                        className="absolute left-0 top-0 bottom-0 w-1.5 bg-brand"
                      />
                    )}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3 h-3 text-brand" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                          {r.createdAt?.toDate ? r.createdAt.toDate().toLocaleDateString() : 'Just now'}
                        </span>
                      </div>
                      <Badge className={cn(
                        "text-[8px] font-black uppercase px-2 py-0.5 rounded-full border-none",
                        r.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' :
                        r.status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                        r.status === 'Pending' ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      )}>
                        {r.status}
                      </Badge>
                    </div>
                    <h3 className="font-black text-zinc-900 tracking-tight mb-1">{r.projectName}</h3>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest line-clamp-1">Service Status Update</p>
                  </motion.div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-8 flex flex-col">
          <AnimatePresence mode="wait">
            {activeTab === 'billing' ? (
              <BillingView key="billing" />
            ) : !selectedReport ? (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
              >
                {/* Stats Overview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card className="rounded-[2.5rem] border-none shadow-sm bg-white p-8 group hover:shadow-xl hover:shadow-brand/5 transition-all">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 bg-zinc-50 rounded-2xl flex items-center justify-center text-zinc-400 group-hover:text-brand transition-colors">
                        <FileText className="w-6 h-6" />
                      </div>
                      <Badge className="bg-emerald-100 text-emerald-700 font-black text-[8px] uppercase tracking-widest px-2 py-0.5 rounded-full border-none">
                        Active
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-3xl font-black tracking-tighter text-zinc-900">{reports.length}</h4>
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em]">Total Reports</p>
                    </div>
                  </Card>

                  <Card className="rounded-[2.5rem] border-none shadow-sm bg-white p-8 group hover:shadow-xl hover:shadow-blue-500/5 transition-all">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 bg-zinc-50 rounded-2xl flex items-center justify-center text-zinc-400 group-hover:text-blue-500 transition-colors">
                        <CheckCircle className="w-6 h-6" />
                      </div>
                      <Badge className="bg-blue-100 text-blue-700 font-black text-[8px] uppercase tracking-widest px-2 py-0.5 rounded-full border-none">
                        Pending
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-3xl font-black tracking-tighter text-zinc-900">{tasks.filter(t => t.status !== 'submitted').length}</h4>
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em]">Open Tasks</p>
                    </div>
                  </Card>

                  <Card className="rounded-[2.5rem] border-none shadow-sm bg-white p-8 group hover:shadow-xl hover:shadow-rose-500/5 transition-all">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 bg-zinc-50 rounded-2xl flex items-center justify-center text-zinc-400 group-hover:text-rose-500 transition-colors">
                        <Bell className="w-6 h-6" />
                      </div>
                      <Badge className="bg-rose-100 text-rose-700 font-black text-[8px] uppercase tracking-widest px-2 py-0.5 rounded-full border-none">
                        Updates
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-3xl font-black tracking-tighter text-zinc-900">{notifications.filter(n => !n.read).length}</h4>
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em]">New Alerts</p>
                    </div>
                  </Card>
                </div>

                <div className="bg-zinc-900 text-white p-12 rounded-[3.5rem] shadow-2xl relative overflow-hidden group">
                  <div className="absolute right-[-10%] top-[-10%] w-96 h-96 bg-brand/20 blur-[120px] pointer-events-none group-hover:bg-brand/30 transition-all duration-1000" />
                  <div className="relative z-10 space-y-4 max-w-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 bg-brand rounded-full animate-pulse" />
                      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Live Dashboard</span>
                    </div>
                    <h2 className="text-4xl md:text-5xl font-black tracking-tighter leading-tight italic">
                      Welcome back, <span className="text-brand block md:inline">{user?.name || 'Client'}</span>
                    </h2>
                    <p className="text-zinc-400 text-sm font-medium leading-relaxed">
                      Track your agency project progress in real-time. Everything from bi-weekly analytical reports to pending task verifications is gathered here for your oversight.
                    </p>
                    <div className="pt-4 flex flex-wrap gap-4">
                      {reports.length > 0 && (
                        <Button 
                          onClick={() => setSelectedReport(reports[0])}
                          className="bg-white text-zinc-900 hover:bg-zinc-100 font-black text-[10px] uppercase tracking-[0.2em] px-8 rounded-2xl h-12 shadow-xl shadow-black/20"
                        >
                          View Latest Report
                          <ChevronRight className="w-4 h-4 ml-2" />
                        </Button>
                      )}
                      <Button variant="ghost" className="text-white hover:bg-white/10 font-black text-[10px] uppercase tracking-[0.2em] px-6 rounded-2xl h-12">
                        Get Support
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Ongoing Tasks Col */}
                  <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between px-4">
                      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">All Ongoing Tasks</h3>
                      <Badge variant="outline" className="text-zinc-400 font-bold text-[8px] uppercase tracking-widest border-zinc-200">
                        Cross-Project View
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {tasks.length > 0 ? tasks.map((task) => (
                        <motion.div
                          key={task.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-white p-6 rounded-[2rem] border border-zinc-100 shadow-sm hover:shadow-md transition-all group"
                        >
                          <div className="flex items-start justify-between mb-4">
                            <div className="space-y-1">
                              <Badge className={cn(
                                "text-[8px] font-black uppercase px-2 py-0.5 rounded-full border-none",
                                task.status === 'submitted' ? 'bg-emerald-100 text-emerald-700' :
                                task.status === 'in-progress' ? 'bg-blue-100 text-blue-700' :
                                'bg-zinc-100 text-zinc-600'
                              )}>
                                {task.status}
                              </Badge>
                              <p className="text-[8px] font-black uppercase tracking-widest text-zinc-400 ml-1">{task.projectName || 'Unassigned'}</p>
                            </div>
                            {task.priority === 'high' && (
                              <Badge className="bg-rose-100 text-rose-700 font-black text-[8px] uppercase px-2 py-0.5 rounded-full border-none">
                                Priority
                              </Badge>
                            )}
                          </div>
                          <h4 className="font-black text-zinc-900 tracking-tight mb-2 group-hover:text-brand transition-colors truncate">
                            {task.title}
                          </h4>
                          <p className="text-[11px] text-zinc-500 font-medium line-clamp-2 mb-4 leading-relaxed h-8">
                            {task.description}
                          </p>
                          <div className="flex items-center justify-between pt-4 border-t border-zinc-50">
                            <div className="flex items-center gap-2">
                              <Clock className="w-3 h-3 text-zinc-300" />
                              <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400">
                                {task.dueDate ? `Due: ${new Date(task.dueDate).toLocaleDateString()}` : 'No Deadline'}
                              </span>
                            </div>
                            <ChevronRight className="w-4 h-4 text-zinc-200 group-hover:text-brand transition-colors" />
                          </div>
                        </motion.div>
                      )) : (
                        <div className="col-span-full p-12 text-center bg-white rounded-[2rem] border border-dashed border-zinc-200">
                          <FileSearch className="w-12 h-12 text-zinc-100 mx-auto mb-4" />
                          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">No active tasks found</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Sidebar/Team Col */}
                  <div className="space-y-8">
                    {/* Your Team */}
                    <div className="bg-white p-8 rounded-[2.5rem] border border-zinc-100 shadow-sm">
                      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-6">Your Dedicated Team</h3>
                      <div className="space-y-4">
                        {teamMembers.length > 0 ? teamMembers.map(member => (
                          <div key={member.uid} className="flex items-center gap-4 p-3 bg-zinc-50 rounded-2xl hover:bg-white border border-transparent hover:border-zinc-100 transition-all group">
                            <Avatar className="w-10 h-10 rounded-xl border-none shadow-sm">
                              <AvatarImage src={member.photoURL} />
                              <AvatarFallback className="bg-white text-xs font-black">{member.name?.[0]}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="text-xs font-black text-zinc-900 truncate tracking-tight">{member.name}</p>
                              <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">{member.title || 'Agency Expert'}</p>
                            </div>
                            <Button variant="ghost" size="icon" className="ml-auto w-8 h-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                              <Mail className="w-3 h-3 text-brand" />
                            </Button>
                          </div>
                        )) : (
                          <p className="text-[9px] font-bold text-zinc-300 uppercase tracking-widest text-center italic">Assigning team members...</p>
                        )}
                      </div>
                    </div>

                    {/* Quick Access */}
                    <div className="bg-brand/5 p-8 rounded-[2.5rem] border border-brand/10">
                      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-brand/60 mb-6">Portal Support</h3>
                      <div className="space-y-3">
                        <Button className="w-full justify-start h-12 bg-white text-zinc-900 border border-zinc-100 rounded-2xl hover:bg-zinc-50 group">
                          <Settings className="w-4 h-4 mr-3 text-zinc-400 group-hover:text-brand transition-colors" />
                          <span className="text-[9px] font-black uppercase tracking-widest">Portal Settings</span>
                        </Button>
                        <Button className="w-full justify-start h-12 bg-white text-zinc-900 border border-zinc-100 rounded-2xl hover:bg-zinc-50 group">
                          <Lock className="w-4 h-4 mr-3 text-zinc-400 group-hover:text-brand transition-colors" />
                          <span className="text-[9px] font-black uppercase tracking-widest">Privacy Policy</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key={selectedReport.id}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-6"
              >
                {/* Header Card */}
                <div className="bg-zinc-900 text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
                  <div className="absolute right-0 top-0 w-64 h-64 bg-brand/20 blur-[100px] pointer-events-none" />
                  <div className="relative z-10 space-y-6">
                    <div className="flex flex-wrap items-center gap-4">
                      <Badge className="bg-brand text-white font-black text-[10px] uppercase tracking-widest px-4 py-1.5 rounded-full border-none">
                        Project Update
                      </Badge>
                      <div className="flex items-center gap-2 text-zinc-400">
                        <Calendar className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-widest">
                          Report Date: {selectedReport.createdAt?.toDate ? selectedReport.createdAt.toDate().toLocaleDateString() : 'Just now'}
                        </span>
                      </div>
                    </div>
                    <h2 className="text-4xl md:text-5xl font-black tracking-tighter leading-tight italic">
                      {selectedReport.projectName}
                    </h2>
                    <div className="flex items-center gap-12 pt-4 border-t border-white/10">
                      <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Service Status</p>
                        <p className={`font-black uppercase tracking-widest text-sm ${
                          selectedReport.status === 'Completed' ? 'text-emerald-400' :
                          selectedReport.status === 'In Progress' ? 'text-blue-400' :
                          selectedReport.status === 'Pending' ? 'text-amber-400' :
                          'text-red-400'
                        }`}>
                          {selectedReport.status}
                        </p>
                      </div>
                      {selectedReport.reportingPeriod && (
                        <div className="space-y-1">
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Reporting Period</p>
                          <p className="font-black text-sm tracking-tight text-white">
                            {selectedReport.reportingPeriod}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Evidence Grid */}
                {selectedReport.images && selectedReport.images.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-4">Visual Evidence & Insights</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {selectedReport.images.map((img: string, i: number) => (
                        <motion.div 
                           key={i}
                           whileHover={{ scale: 1.05 }}
                           onClick={() => setSelectedImageView(img)}
                           className="aspect-square rounded-3xl overflow-hidden border border-zinc-200 bg-white group cursor-pointer relative"
                        >
                           <img src={img} alt="Evidence" className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" />
                           <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Maximize2 className="w-6 h-6 text-white" />
                           </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick Summary Card */}
                <Card className="border-none bg-brand/5 rounded-[2.5rem] overflow-hidden">
                  <CardHeader className="p-8 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center">
                        <MessageSquare className="w-5 h-5 text-brand" />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-black tracking-tight uppercase italic">Quick Summary</CardTitle>
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">The Bottom Line</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-8 pt-0">
                    <p className="text-sm font-bold text-zinc-700 italic leading-relaxed bg-white/50 p-6 rounded-2xl border border-brand/10">
                      "{extractShortSummary(selectedReport.content)}"
                    </p>
                  </CardContent>
                </Card>

                {/* Markdown Content */}
                <Card className="rounded-[2.5rem] border-none shadow-sm overflow-hidden bg-white">
                  <CardHeader className="bg-zinc-50/30 p-8 md:p-12 border-b border-zinc-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-1">
                      <CardTitle className="text-2xl font-black tracking-tight text-zinc-900">Project Intelligence Report</CardTitle>
                      <CardDescription className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">Detailed performance audit & strategic roadmap</CardDescription>
                    </div>
                    <div className="flex items-center gap-3 bg-white p-2 rounded-2xl shadow-sm border border-zinc-100">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Verified by Internal AI</span>
                    </div>
                  </CardHeader>
                  <CardContent className="p-8 md:p-16">
                    <div className="report-content">
                      <ReactMarkdown>{cleanReportContent(selectedReport.content)}</ReactMarkdown>
                    </div>
                  </CardContent>
                  <CardFooter className="p-8 md:p-12 bg-zinc-50/30 border-t border-zinc-100 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-zinc-900 flex items-center justify-center text-white font-black italic">A</div>
                      <div>
                        <p className="text-sm font-black tracking-tight">Executive Intelligence Unit</p>
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Agency Standard Verification</p>
                      </div>
                    </div>
                    <Badge className="bg-white border-zinc-200 text-zinc-400 font-bold text-[9px] uppercase tracking-widest px-4 py-2 rounded-xl shadow-sm">
                      Internal Document ID: {selectedReport.id.slice(0, 8).toUpperCase()}
                    </Badge>
                  </CardFooter>
                </Card>

                {/* Related Tasks section */}
                {tasks.filter(t => !selectedReport || t.projectName === selectedReport.projectName).length > 0 && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between px-4">
                      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Related Project Tasks</h3>
                      <Badge className="bg-zinc-100 text-zinc-500 font-black text-[8px] uppercase tracking-widest px-2 py-0.5 rounded-full border-none">
                        Active Assignments
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {tasks
                        .filter(t => !selectedReport || t.projectName === selectedReport.projectName)
                        .map((task) => (
                          <motion.div
                            key={task.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white p-6 rounded-[2rem] border border-zinc-100 shadow-sm hover:shadow-md transition-all group"
                          >
                            <div className="flex items-start justify-between mb-4">
                              <Badge className={cn(
                                "text-[8px] font-black uppercase px-2 py-0.5 rounded-full border-none",
                                task.status === 'submitted' ? 'bg-emerald-100 text-emerald-700' :
                                task.status === 'in-progress' ? 'bg-blue-100 text-blue-700' :
                                'bg-zinc-100 text-zinc-600'
                              )}>
                                {task.status === 'submitted' ? 'Verification Pending' : task.status}
                              </Badge>
                              {task.priority === 'high' && (
                                <Badge className="bg-rose-100 text-rose-700 font-black text-[8px] uppercase px-2 py-0.5 rounded-full border-none">
                                  Priority
                                </Badge>
                              )}
                            </div>
                            <h4 className="font-black text-zinc-900 tracking-tight mb-2 group-hover:text-brand transition-colors">
                              {task.title}
                            </h4>
                            <p className="text-xs text-zinc-500 font-medium line-clamp-2 mb-4 leading-relaxed">
                              {task.description}
                            </p>
                            <div className="flex items-center justify-between pt-4 border-t border-zinc-50">
                              <div className="flex items-center gap-2">
                                <Clock className="w-3 h-3 text-zinc-300" />
                                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400">
                                  {task.dueDate ? `Due: ${new Date(task.dueDate).toLocaleDateString()}` : 'No Deadline'}
                                </span>
                              </div>
                              {task.status === 'submitted' && (
                                <div className="flex items-center gap-1 text-emerald-500">
                                  <CheckCircle className="w-3 h-3" />
                                  <span className="text-[9px] font-black uppercase tracking-widest">Completed</span>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="max-w-md rounded-[2.5rem] p-0 overflow-hidden border-zinc-100 shadow-2xl">
          <DialogHeader className="p-8 bg-zinc-50/50 border-b border-zinc-100">
            <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-brand" />
            </div>
            <DialogTitle className="text-xl font-black tracking-tight uppercase italic">Security Settings</DialogTitle>
            <DialogDescription className="font-bold text-[10px] uppercase tracking-widest text-zinc-400">Manage your portal access and security</DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleChangePassword} className="p-8 space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">New Password</Label>
                <div className="relative">
                  <Input 
                    type={showPass ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="h-12 rounded-2xl border-zinc-100 bg-zinc-50/50 px-5 focus-visible:ring-brand"
                    placeholder="Minimum 6 characters"
                    required
                  />
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon" 
                    className="absolute right-2 top-2 h-8 w-8 text-zinc-400 hover:text-zinc-900"
                    onClick={() => setShowPass(!showPass)}
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Confirm New Password</Label>
                <Input 
                  type={showPass ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-12 rounded-2xl border-zinc-100 bg-zinc-50/50 px-5 focus-visible:ring-brand"
                  placeholder="Repeat new password"
                  required
                />
              </div>
            </div>

            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-3">
              <Lock className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-[10px] font-bold text-amber-700 leading-relaxed uppercase tracking-tight">
                Updating your password will help keep your agency data secure. Make sure to use a unique combination of symbols and letters.
              </p>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsSettingsOpen(false)} className="rounded-xl font-black text-[10px] uppercase tracking-widest border-zinc-100">Cancel</Button>
              <Button type="submit" disabled={isUpdatingPassword} className="rounded-xl font-black text-[10px] uppercase tracking-widest bg-zinc-900 text-white hover:bg-zinc-800 grow">
                {isUpdatingPassword ? "Updating..." : "Update Security"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
