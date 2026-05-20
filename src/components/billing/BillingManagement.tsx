import React, { useEffect, useState } from 'react';
import { 
  CreditCard, 
  Search, 
  Filter, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  FileText,
  Calendar,
  Receipt,
  Download,
  Plus,
  Trash2,
  DollarSign,
  User,
  Layers
} from 'lucide-react';
import { collection, query, orderBy, onSnapshot, limit, where, addDoc, updateDoc, doc, serverTimestamp, getDocs } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
import { useAuth } from '@/src/App';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatCurrency } from '@/src/lib/utils';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { CurrencyCode, SUPPORTED_CURRENCIES } from '@/src/types';

import { BrandLogo } from '@/src/components/layout/BrandLogo';

interface InvoiceRecord {
  id: string;
  userId: string;
  clientName: string;
  clientEmail: string;
  amount: number;
  currency: CurrencyCode;
  status: 'paid' | 'pending' | 'failed' | 'scheduled';
  type: string;
  paymentDate: any;
  createdAt: any;
  isAutoPunch?: boolean;
  isManual?: boolean;
  message?: string;
  lineItems?: LineItem[];
}

interface Client {
  id: string;
  name: string;
  email: string;
  invoiceValue: number;
  autoPay?: boolean;
}

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  price: number;
}

const BillingManagement: React.FC = () => {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Generator State
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [viewingInvoice, setViewingInvoice] = useState<InvoiceRecord | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: '1', description: '', quantity: 1, price: 0 }
  ]);
  const [isSaving, setIsSaving] = useState(false);
  const [invoiceNote, setInvoiceNote] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>('USD');

  const renderInvoicePortal = (invoice: any) => {
    const currency = invoice.currency?.toUpperCase() as CurrencyCode || 'USD';
    const currencySymbol = SUPPORTED_CURRENCIES.find(c => c.code === currency)?.symbol || '$';
    const safeItems = (invoice.lineItems && invoice.lineItems.length > 0) ? invoice.lineItems : [
      { 
        description: invoice.description || invoice.message || 'Professional Services', 
        quantity: 1, 
        price: Number(invoice.amount || invoice.invoiceValue || 0) 
      }
    ];
    
    // Calculate subtotal/total based ONCE on item data to ensure consistency
    const currentSubtotal = safeItems.reduce((sum: number, item: any) => sum + (Number(item.quantity || 0) * Number(item.price || 0)), 0);
    const currentTotal = currentSubtotal;
    
    const logoUrl = "/api/proxy-image?url=https://www.opmediaagency.com/wp-content/uploads/2025/03/OP-Media-Logo3.png";

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
                <p className="text-3xl font-black italic tracking-tighter text-zinc-900">{currencySymbol}{Number(invoice.amount).toFixed(2)}</p>
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
    if (!element) return;
    
    setIsExporting(true);
    const originalScrollY = window.scrollY;
    try {
      // Scroll to top to ensure clean capture
      window.scrollTo(0, 0);
      
      // Wait a moment for any assets/fonts/logo to fully settle in the view
      await new Promise(r => setTimeout(r, 1000));

      const canvas = await html2canvas(element, {
        scale: 1.5, // Optimized scale
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: 800,
        windowWidth: 800,
        onclone: (clonedDoc) => {
          const clonedElement = clonedDoc.getElementById('invoice-capture');
          if (clonedElement) {
            clonedElement.style.width = '800px';
            clonedElement.style.maxWidth = '800px';
            clonedElement.style.margin = '0';
            clonedElement.style.boxShadow = 'none';
            clonedElement.style.border = 'none';
          }

          // Force remove all oklch and oklab usages from ANY style tag
          const styleTags = Array.from(clonedDoc.getElementsByTagName('style'));
          const safeColor = '#18181b';
          
          styleTags.forEach(tag => {
            try {
              let css = tag.innerHTML;
              // Aggressive replacement for all modern color functions that html2canvas cannot parse
              // We do it multiple times to catch nested functions if they exist
              for (let i = 0; i < 3; i++) {
                css = css.replace(/(oklch|oklab|lab|lch|color|color-mix|light-dark)\s*\((?:[^()]*|\((?:[^()]*|\([^()]*\))*\))*\)/gi, safeColor);
              }
              
              // NEW: Catch interpolation hints in gradients/color-mix like "linear-gradient(in oklab, ...)"
              css = css.replace(/in\s+(oklb|oklch|oklab|oklab-linear|oklch-linear|lab|lch|srgb-linear|display-p3|a98-rgb|prophoto-rgb|rec2020|xyz|xyz-d50|xyz-d65)/gi, "in srgb");

              // Also catch custom properties that might contain these functions
              css = css.replace(/--[a-zA-Z0-9-]+\s*:\s*[^;!]+(oklch|oklab|color|color-mix|light-dark)[^;!]+[;!]/gi, (match) => {
                const parts = match.split(':');
                return parts[0] + ': ' + safeColor + (match.includes('!') ? ' !important;' : ';');
              });
              
              tag.innerHTML = css;
            } catch (e) {
              console.warn('Could not modify style tag', e);
            }
          });

          // Inject safe fallbacks for root variables
          const rootStyle = clonedDoc.createElement('style');
          rootStyle.innerHTML = `
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
              --brand: #e11d48 !important;
              --background: #ffffff !important;
              --foreground: #09090b !important;
              --primary: #18181b !important;
              --primary-foreground: #ffffff !important;
              --secondary: #f4f4f5 !important;
              --border: #e4e4e7 !important;
              --input: #e4e4e7 !important;
            }
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
            
            // Fix letter spacing and font rendering
            el.style.letterSpacing = '0px'; 
            el.style.wordSpacing = 'normal';
            el.style.setProperty('-webkit-font-smoothing', 'antialiased');

            // Force inline styles if they use problematic color functions
            const colorProps = ['color', 'backgroundColor', 'borderColor', 'outlineColor', 'fill', 'stroke', 'boxShadow', 'textShadow'];
            colorProps.forEach(prop => {
              const style = window.getComputedStyle(el);
              const val = (el.style as any)[prop] || (style as any)[prop];
              
              if (val && (typeof val === 'string') && (val.includes('oklch') || val.includes('oklab') || val.includes('color(') || val.includes('color-mix') || val.includes('light-dark') || val.includes(' in '))) {
                 if (prop === 'backgroundColor') {
                    if (val.includes('0.98') || val.includes('98%')) el.style.setProperty('background-color', '#fafafa', 'important');
                    else el.style.setProperty('background-color', '#ffffff', 'important');
                 } else if (prop === 'boxShadow' || prop === 'textShadow') {
                    el.style.setProperty(prop, 'none', 'important');
                 } else if (prop === 'color') {
                    el.style.setProperty('color', '#18181b', 'important');
                 } else {
                    el.style.setProperty(prop, '#18181b', 'important');
                 }
              }
            });

            // Strip backgrounds that use interpolation hints
            if (el.style.backgroundImage && (el.style.backgroundImage.includes('oklch') || el.style.backgroundImage.includes('oklab') || el.style.backgroundImage.includes('color(') || el.style.backgroundImage.includes('color-mix'))) {
              el.style.backgroundImage = 'none';
            }
          }

          const styleTag = clonedDoc.createElement('style');
          styleTag.innerHTML = `
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&display=swap');
            * { 
              font-family: 'Inter', system-ui, sans-serif !important;
              -webkit-print-color-adjust: exact !important;
              color-scheme: light !important;
              letter-spacing: normal !important;
              text-rendering: optimizeLegibility !important;
            }
            :root {
              --brand: #e11d48 !important;
              --zinc-50: #fafafa !important;
              --zinc-100: #f4f4f5 !important;
              --zinc-200: #e4e4e7 !important;
              --zinc-300: #d4d4d8 !important;
              --zinc-400: #a1a1aa !important;
              --zinc-500: #71717a !important;
              --zinc-900: #18181b !important;
              /* Tailwind 4 variables */
              --color-brand: #e11d48 !important;
              --color-zinc-50: #fafafa !important;
              --color-zinc-100: #f4f4f5 !important;
              --color-zinc-200: #e4e4e7 !important;
              --color-zinc-300: #d4d4d8 !important;
              --color-zinc-400: #a1a1aa !important;
              --color-zinc-500: #71717a !important;
              --color-zinc-900: #18181b !important;
              --color-zinc-950: #09090b !important;
            }
            /* Explicitly override classes that often use oklch */
            .text-zinc-900 { color: #18181b !important; }
            .text-zinc-500 { color: #71717a !important; }
            .text-zinc-400 { color: #a1a1aa !important; }
            .bg-zinc-50 { background-color: #fafafa !important; }
            .bg-zinc-100 { background-color: #f4f4f5 !important; }
            .bg-zinc-900 { background-color: #18181b !important; }
            .border-zinc-100 { border-color: #f4f4f5 !important; }
            .border-zinc-200 { border-color: #e4e4e7 !important; }
            .text-brand { color: #e11d48 !important; }
            .bg-brand { background-color: #e11d48 !important; }
          `;
          clonedDoc.head.appendChild(styleTag);
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
      setIsExporting(false);
    }
  };

  const handlePrint = (invoice: any) => {
    setViewingInvoice(invoice);
    // Use a longer delay and ensure the component is rendered
    setTimeout(() => {
      window.print();
    }, 800);
  };

  useEffect(() => {
    if (!user) return;

    // Fetch clients with proper isolation
    let qClients;
    if (user.role === 'super_admin') {
      qClients = query(collection(db, 'clients'), orderBy('name', 'asc'));
    } else if (user.role === 'admin') {
      qClients = query(collection(db, 'clients'), where('adminId', '==', user.uid), orderBy('name', 'asc'));
    } else {
      // Employee sees clients they created or are assigned to
      qClients = query(collection(db, 'clients'), where('createdBy', '==', user.uid), orderBy('name', 'asc'));
    }

    const unsubClients = onSnapshot(qClients, (snap) => {
      setClients(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client)));
    }, (err) => {
      console.error("Fetch clients error:", err);
      // Fallback for employee if createdBy is empty (checking assignedEmployees instead)
      if (user.role === 'employee' && err.message.includes('permission-denied')) {
        const qFallback = query(collection(db, 'clients'), where('assignedEmployees', 'array-contains', user.uid), orderBy('name', 'asc'));
        onSnapshot(qFallback, (s) => setClients(s.docs.map(d => ({ id: d.id, ...d.data() } as Client))));
      }
    });

    // Fetch all payments/invoices with proper isolation
    let qPayments;
    if (user.role === 'super_admin') {
      qPayments = query(collection(db, 'payments'), orderBy('createdAt', 'desc'), limit(200));
    } else if (user.role === 'admin') {
      qPayments = query(collection(db, 'payments'), where('adminId', '==', user.uid), orderBy('createdAt', 'desc'), limit(200));
    } else {
      qPayments = query(collection(db, 'payments'), where('issuedBy', '==', user.uid), orderBy('createdAt', 'desc'), limit(200));
    }

    const unsubscribe = onSnapshot(qPayments, (snap) => {
      const docs = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as InvoiceRecord));
      setInvoices(docs);
      setLoading(false);
    }, (err) => {
      console.error("Fetch payments error:", err);
      setLoading(false);
    });

    return () => {
      unsubClients();
      unsubscribe();
    };
  }, [user]);

  const addLineItem = () => {
    setLineItems([...lineItems, { id: Math.random().toString(), description: '', quantity: 1, price: 0 }]);
  };

  const removeLineItem = (id: string) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter(item => item.id !== id));
    }
  };

  const updateLineItem = (id: string, field: keyof LineItem, value: any) => {
    setLineItems(lineItems.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const subtotal = lineItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);
  const tax = 0; // Future: dynamic tax
  const total = subtotal + tax;

  const handleIssueInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient || subtotal <= 0) {
      toast.error("Please select a client and add at least one line item");
      return;
    }

    setIsSaving(true);
    try {
      const clientEmail = selectedClient.email.toLowerCase().trim();
      
      // Find userId
      const uSnap = await getDocs(query(collection(db, 'users'), where('email', '==', clientEmail), limit(1)));
      const userId = uSnap.empty ? clientEmail : uSnap.docs[0].id;

      const description = invoiceNote || `Services for ${selectedClient.name}`;
      const itemsPlain = lineItems.map(item => ({
        description: item.description,
        quantity: Number(item.quantity),
        price: Number(item.price)
      }));

      await addDoc(collection(db, 'payments'), {
        userId,
        clientEmail,
        clientName: selectedClient.name,
        amount: total,
        currency: selectedCurrency,
        status: 'pending',
        type: 'invoice',
        message: description,
        lineItems: itemsPlain,
        paymentDate: null,
        createdAt: serverTimestamp(),
        issuedBy: user?.uid,
        adminId: user?.role === 'admin' ? user.uid : (user?.adminId || user?.uid),
        isManual: true,
        generatorUsed: true
      });

      await addDoc(collection(db, 'notifications'), {
        userId,
        title: 'New Invoice Issued',
        message: `An invoice for ${formatCurrency(total, selectedCurrency)} has been generated and is ready for payment.`,
        type: 'billing',
        read: false,
        createdAt: serverTimestamp()
      });

      toast.success("Invoice generated successfully");
      setIsGeneratorOpen(false);
      // Reset state
      setSelectedClient(null);
      setLineItems([{ id: '1', description: '', quantity: 1, price: 0 }]);
      setInvoiceNote('');
    } catch (error) {
      console.error("Error generating invoice:", error);
      toast.error("Failed to generate invoice");
    } finally {
      setIsSaving(false);
    }
  };

  const stats = {
    totalBilled: invoices.reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0),
    paidTotal: invoices.filter(i => i.status === 'paid').reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0),
    pendingTotal: invoices.filter(i => i.status === 'pending').reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0),
    failedCount: invoices.filter(i => i.status === 'failed').length
  };

  const [activeTab, setActiveTab] = useState<'invoices' | 'clients'>('invoices');

  const handleToggleAutoPay = async (clientId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'clients', clientId), { autoPay: !currentStatus });
      toast.success(`Auto-pay ${!currentStatus ? 'enabled' : 'disabled'} for client`);
    } catch (err: any) {
      toast.error("Failed to update auto-pay status", { description: err.message });
    }
  };

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = 
      inv.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      inv.clientEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 bg-zinc-50/50 min-h-screen pb-24 lg:pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight italic">Billing & Invoices</h1>
          <p className="text-zinc-500 font-bold uppercase text-[9px] sm:text-[10px] tracking-widest leading-none">Super Admin Ledger & History</p>
        </div>

        <Dialog open={isGeneratorOpen} onOpenChange={setIsGeneratorOpen}>
          <DialogTrigger render={
            <Button className="bg-zinc-900 text-white hover:bg-zinc-800 h-12 px-8 rounded-2xl shadow-xl shadow-black/10 font-black text-[10px] uppercase tracking-widest gap-2">
              <Plus className="w-4 h-4" />
              Create New Invoice
            </Button>
          } />
          <DialogContent className="w-[95vw] sm:max-w-3xl rounded-3xl sm:rounded-[3rem] border-none shadow-2xl p-0 overflow-hidden bg-zinc-50">
            <DialogHeader className="px-6 py-6 sm:px-10 sm:py-8 bg-white border-b border-zinc-100">
              <div className="flex items-center gap-4 mb-2">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-zinc-900 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg shadow-black/20">
                  <Receipt className="w-5 h-5 sm:w-6 sm:h-6 text-brand" />
                </div>
                <div>
                  <DialogTitle className="text-xl sm:text-2xl font-black tracking-tight italic text-zinc-900">Generate Invoice</DialogTitle>
                  <DialogDescription className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-zinc-400">Professional Billing System</DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <form onSubmit={handleIssueInvoice} className="p-6 sm:p-10 space-y-8 max-h-[70vh] overflow-y-auto">
              {/* Client & Currency Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                     <User className="w-4 h-4 text-zinc-400" />
                     <Label className="text-xs font-black uppercase tracking-widest text-zinc-500">Select Client</Label>
                  </div>
                  <Select 
                    value={selectedClient?.id || ""}
                    onValueChange={(val) => {
                      const c = clients.find(cl => cl.id === val);
                      if (c) setSelectedClient(c);
                    }}
                  >
                    <SelectTrigger className="h-14 rounded-2xl border-none shadow-sm bg-white font-bold text-zinc-600">
                      <SelectValue placeholder="Pick a client from roster..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-none shadow-2xl">
                      {clients.map(c => (
                        <SelectItem key={c.id} value={c.id} className="rounded-xl font-bold py-3">
                          {c.name} ({c.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                     <DollarSign className="w-4 h-4 text-zinc-400" />
                     <Label className="text-xs font-black uppercase tracking-widest text-zinc-500">Currency</Label>
                  </div>
                  <Select 
                    value={selectedCurrency} 
                    onValueChange={(val: CurrencyCode) => setSelectedCurrency(val)}
                  >
                    <SelectTrigger className="h-14 rounded-2xl border-none shadow-sm bg-white font-bold text-zinc-600">
                      <SelectValue placeholder="Select Currency" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-none shadow-2xl">
                      {SUPPORTED_CURRENCIES.map(curr => (
                        <SelectItem key={curr.code} value={curr.code} className="rounded-xl font-bold py-3">
                          {curr.code} ({curr.symbol}) - {curr.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Line Items */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-zinc-400" />
                      <Label className="text-xs font-black uppercase tracking-widest text-zinc-500">Service Line Items</Label>
                   </div>
                   <Button 
                     type="button" 
                     variant="outline" 
                     size="sm" 
                     onClick={addLineItem}
                     className="rounded-full h-8 px-4 font-black text-[8px] uppercase tracking-widest border-zinc-200"
                   >
                     Add Row
                   </Button>
                </div>

                <div className="space-y-3">
                  <AnimatePresence>
                    {lineItems.map((item, index) => (
                      <motion.div 
                        key={item.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="flex flex-col md:grid md:grid-cols-12 gap-4 md:gap-3 items-stretch md:items-end bg-white p-5 sm:p-4 rounded-2xl shadow-sm border border-zinc-100 group"
                      >
                        <div className="md:col-span-6 space-y-1.5">
                          <Label className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Description</Label>
                          <Input 
                            placeholder="e.g. SEO Strategic Retainer" 
                            value={item.description}
                            onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                            className="bg-zinc-50 border-none h-11 rounded-xl text-sm w-full"
                            required
                          />
                        </div>
                        <div className="flex gap-3 md:col-span-6 md:grid md:grid-cols-6 md:gap-3 md:items-end">
                          <div className="flex-1 md:col-span-2 space-y-1.5">
                            <Label className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Qty</Label>
                            <Input 
                              type="number" 
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateLineItem(item.id, 'quantity', Number(e.target.value))}
                              className="bg-zinc-50 border-none h-11 rounded-xl font-black italic w-full"
                              required
                            />
                          </div>
                          <div className="flex-1 md:col-span-3 space-y-1.5">
                            <Label className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Price ({selectedCurrency})</Label>
                            <Input 
                              type="number" 
                              step="0.01"
                              value={item.price}
                              onChange={(e) => updateLineItem(item.id, 'price', Number(e.target.value))}
                              className="bg-zinc-50 border-none h-11 rounded-xl font-black text-brand italic w-full"
                              required
                            />
                          </div>
                          <div className="flex-none md:col-span-1 flex justify-center md:pb-2 self-end">
                             <Button 
                               type="button" 
                               variant="ghost" 
                               size="icon" 
                               onClick={() => removeLineItem(item.id)}
                               disabled={lineItems.length === 1}
                               className="h-10 w-10 md:h-8 md:w-8 text-zinc-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-zinc-50 md:border-none"
                             >
                               <Trash2 className="w-4 h-4" />
                             </Button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>

              {/* Summary & Note */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pt-4">
                 <div className="space-y-4">
                    <Label className="text-xs font-black uppercase tracking-widest text-zinc-500 italic">Admin Notes (Optional)</Label>
                    <textarea 
                      placeholder="Add a payment term or custom message..."
                      className="w-full h-32 p-4 bg-white border-none rounded-3xl shadow-sm text-sm focus:ring-1 focus:ring-zinc-200 outline-none"
                      value={invoiceNote}
                      onChange={(e) => setInvoiceNote(e.target.value)}
                    />
                 </div>
                 <div className="bg-zinc-900 rounded-[2.5rem] p-8 text-white space-y-6 relative overflow-hidden">
                    <div className="absolute right-0 top-0 w-32 h-32 bg-brand/10 blur-[50px] pointer-events-none" />
                    <div className="flex items-center justify-between text-zinc-500 font-bold uppercase text-[10px] tracking-widest">
                       <span>Subtotal</span>
                       <span>{formatCurrency(subtotal, selectedCurrency)}</span>
                    </div>
                    <div className="flex items-center justify-between text-zinc-500 font-bold uppercase text-[10px] tracking-widest border-b border-zinc-800 pb-4">
                       <span>Tax (0%)</span>
                       <span>{formatCurrency(0, selectedCurrency)}</span>
                    </div>
                    <div className="flex items-center justify-between pt-2">
                       <span className="text-lg font-black italic tracking-tighter">Grand Total</span>
                       <span className="text-3xl font-black italic text-brand tracking-tighter">{formatCurrency(total, selectedCurrency)}</span>
                    </div>
                 </div>
              </div>
            </form>

            <DialogFooter className="px-6 py-6 sm:px-10 sm:py-8 bg-white border-t border-zinc-100 mt-0">
               <div className="flex flex-col sm:flex-row items-center justify-between w-full gap-6">
                  <p className="text-[9px] sm:text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-center sm:text-left sm:max-w-[200px]">
                    This will be locked and sent to the client portal instantly.
                  </p>
                  <div className="flex gap-3 w-full sm:w-auto">
                    <Button 
                      type="button"
                      variant="ghost" 
                      onClick={() => setIsPreviewOpen(true)}
                      className="rounded-xl sm:rounded-2xl h-11 sm:h-12 px-6 sm:px-8 font-black text-[10px] uppercase tracking-widest gap-2"
                      disabled={!selectedClient || subtotal <= 0}
                    >
                      <FileText className="w-4 h-4" />
                      Preview
                    </Button>
                    <Button variant="ghost" type="button" onClick={() => setIsGeneratorOpen(false)} className="flex-1 sm:flex-none rounded-xl sm:rounded-2xl h-11 sm:h-12 px-6 sm:px-8 font-black text-[10px] uppercase tracking-widest italic">Cancel</Button>
                    <Button 
                      type="submit" 
                      onClick={handleIssueInvoice}
                      disabled={isSaving}
                      className="flex-1 sm:flex-none bg-brand text-white hover:bg-brand/90 h-11 sm:h-12 px-8 sm:px-10 rounded-xl sm:rounded-2xl shadow-xl shadow-brand/20 font-black text-[10px] uppercase tracking-widest gap-2"
                    >
                      {isSaving ? "Wait..." : "Issue"}
                      <ArrowUpRight className="w-4 h-4" />
                    </Button>
                  </div>
               </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Live Preview Modal (Draft) */}
        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogContent className="max-w-5xl rounded-[3rem] border-none shadow-2xl p-0 overflow-hidden bg-zinc-100 h-[90vh] flex flex-col">
            <div className="p-4 sm:p-8 bg-white border-b border-zinc-100 flex items-center justify-between no-print">
               <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center">
                    <Receipt className="w-5 h-5 text-brand" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black italic tracking-tighter">Draft Preview</h3>
                    <p className="text-[10px] font-black uppercase text-zinc-400">Live Invoice Generation</p>
                  </div>
               </div>
               <div className="flex gap-2">
                 <Button variant="ghost" onClick={() => window.print()} className="rounded-xl font-black text-[10px] uppercase tracking-widest gap-2">
                   <Download className="w-4 h-4" /> Print
                 </Button>
                 <Button onClick={() => setIsPreviewOpen(false)} className="rounded-xl bg-zinc-900 text-white font-black text-[10px] uppercase tracking-widest">
                   Exit Preview
                 </Button>
               </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 sm:p-12 print:p-0">
               {renderInvoicePortal({
                 clientName: selectedClient?.name,
                 clientEmail: selectedClient?.email,
                 amount: total,
                 lineItems: lineItems,
                 message: invoiceNote,
                 status: 'pending',
                 createdAt: new Date()
               })}
            </div>
          </DialogContent>
        </Dialog>

        {/* View/History Modal */}
        <Dialog open={!!viewingInvoice} onOpenChange={(open) => !open && setViewingInvoice(null)}>
          <DialogContent className="max-w-5xl rounded-[3rem] border-none shadow-2xl p-0 overflow-hidden bg-zinc-100 h-[90vh] flex flex-col">
            <div className="p-4 sm:p-8 bg-white border-b border-zinc-100 flex items-center justify-between no-print">
               <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black italic tracking-tighter text-zinc-900">Registered Invoice</h3>
                    <p className="text-[10px] font-black uppercase text-zinc-400">Final Ledger Record</p>
                  </div>
               </div>
               <div className="flex gap-2">
                 <Button 
                   variant="ghost" 
                   onClick={handleDownloadPDF} 
                   disabled={isExporting}
                   className="rounded-xl font-black text-[10px] uppercase tracking-widest gap-2 italic"
                 >
                   {isExporting ? <div className="w-4 h-4 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin" /> : <Download className="w-4 h-4" />}
                   Download PDF
                 </Button>
                 <Button onClick={() => setViewingInvoice(null)} className="rounded-xl bg-zinc-900 text-white font-black text-[10px] uppercase tracking-widest">
                   Close Viewer
                 </Button>
               </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 sm:p-12 print:p-0">
               {viewingInvoice && renderInvoicePortal(viewingInvoice)}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
        <Card className="rounded-[2rem] border-none shadow-sm bg-white overflow-hidden group relative">
          <div className="absolute inset-0 bg-brand/5 scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500" />
          <CardHeader className="relative p-6 pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Total Billed</CardTitle>
          </CardHeader>
          <CardContent className="relative p-6 pt-0">
            <div className="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tighter italic">
              ${stats.totalBilled.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-zinc-400">
               <Receipt className="w-3 h-3" />
               Current Lifecycle
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-none shadow-sm bg-white overflow-hidden group">
          <CardHeader className="p-6 pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Total Paid</CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <div className="text-2xl sm:text-3xl font-black text-emerald-600 tracking-tighter italic">
              ${stats.paidTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-emerald-500">
               <ArrowUpRight className="w-3 h-3" />
               Success Rate
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-none shadow-sm bg-white overflow-hidden group">
          <CardHeader className="p-6 pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Pending</CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <div className="text-2xl sm:text-3xl font-black text-amber-500 tracking-tighter italic">
              ${stats.pendingTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-amber-500 italic">
               Awaiting action
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-none shadow-sm bg-white overflow-hidden group">
          <CardHeader className="p-6 pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Issues</CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <div className="text-2xl sm:text-3xl font-black text-zinc-400 tracking-tighter italic">
              {stats.failedCount} Failed
            </div>
            <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-zinc-300">
               <AlertCircle className="w-3 h-3" />
               Critical Alerts
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-3 mb-8 bg-zinc-100 p-2 rounded-[2rem] w-full sm:w-fit no-print">
        <Button 
          variant={activeTab === 'invoices' ? 'default' : 'ghost'} 
          onClick={() => setActiveTab('invoices')}
          className={cn(
             "h-11 sm:h-12 flex-1 sm:flex-none px-6 sm:px-8 rounded-xl sm:rounded-2xl font-black text-[9px] sm:text-[10px] uppercase tracking-widest transition-all",
             activeTab === 'invoices' ? "bg-zinc-900 text-white shadow-xl shadow-black/20" : "text-zinc-500 hover:text-zinc-900"
          )}
        >
          <Receipt className="w-4 h-4 mr-2" />
          <span className="hidden sm:inline">Invoice History</span>
          <span className="sm:hidden">History</span>
        </Button>
        <Button 
          variant={activeTab === 'clients' ? 'default' : 'ghost'} 
          onClick={() => setActiveTab('clients')}
          className={cn(
             "h-11 sm:h-12 flex-1 sm:flex-none px-6 sm:px-8 rounded-xl sm:rounded-2xl font-black text-[9px] sm:text-[10px] uppercase tracking-widest transition-all",
             activeTab === 'clients' ? "bg-zinc-900 text-white shadow-xl shadow-black/20" : "text-zinc-500 hover:text-zinc-900"
          )}
        >
          <User className="w-4 h-4 mr-2" />
          <span className="hidden sm:inline">Client Control</span>
          <span className="sm:hidden">Control</span>
        </Button>
      </div>

      <Card className="rounded-[2.5rem] border-none shadow-xl shadow-black/5 bg-white overflow-hidden">
        <CardHeader className="p-6 sm:p-8 border-b border-zinc-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <CardTitle className="text-xl font-bold flex items-center gap-3">
              {activeTab === 'invoices' ? <Receipt className="w-6 h-6 text-brand" /> : <User className="w-6 h-6 text-brand" />}
              {activeTab === 'invoices' ? 'Invoice History' : 'Client Ledger Settings'}
            </CardTitle>
            <CardDescription className="text-xs font-bold uppercase tracking-widest text-zinc-400">
              {activeTab === 'invoices' ? 'Automated and Manual Invoices' : 'Configure payment rules for individual clients'}
            </CardDescription>
          </div>
          
          <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 items-stretch sm:items-center">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <Input 
                placeholder={activeTab === 'invoices' ? "Search records..." : "Search clients..."}
                className="pl-10 h-11 bg-zinc-50 border-none rounded-xl text-sm focus-visible:ring-1 focus-visible:ring-zinc-200 w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {activeTab === 'invoices' && (
              <div className="flex gap-1 bg-zinc-100 p-1 rounded-xl overflow-x-auto no-scrollbar">
                {['all', 'paid', 'pending', 'failed'].map(f => (
                  <Button 
                    key={f}
                    variant={statusFilter === f ? 'default' : 'ghost'}
                    className={cn(
                      "flex-1 sm:flex-none px-4 h-9 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap",
                      statusFilter === f ? "bg-zinc-900 text-white" : "text-zinc-500 hover:text-zinc-900"
                    )}
                    onClick={() => setStatusFilter(f)}
                  >
                    {f}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            {activeTab === 'invoices' ? (
              <Table className="min-w-[800px] md:min-w-0">
                <TableHeader className="bg-zinc-50/50">
                  <TableRow className="border-none">
                    <TableHead className="px-6 sm:px-8 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400">Date</TableHead>
                    <TableHead className="px-6 sm:px-8 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400">Client / Record</TableHead>
                    <TableHead className="px-6 sm:px-8 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400">Amount</TableHead>
                    <TableHead className="px-6 sm:px-8 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400">Status</TableHead>
                    <TableHead className="px-6 sm:px-8 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400">Type</TableHead>
                    <TableHead className="px-6 sm:px-8 py-5 text-right"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-64 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-zinc-50 flex items-center justify-center">
                            <FileText className="w-6 h-6 text-zinc-200" />
                          </div>
                          <p className="text-xs font-black text-zinc-400 uppercase tracking-widest">No invoice records found</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredInvoices.map((inv) => (
                      <TableRow key={inv.id} className="group border-b border-zinc-50/10 hover:bg-zinc-50/50 transition-colors">
                        <TableCell className="px-6 sm:px-8 py-6">
                          <div className="flex flex-col gap-1">
                            <span className="text-sm font-bold text-zinc-900">
                              {inv.createdAt?.toDate ? inv.createdAt.toDate().toLocaleDateString() : 
                               inv.createdAt ? new Date(inv.createdAt).toLocaleDateString() : 'N/A'}
                            </span>
                            <span className="text-[9px] font-black text-zinc-400 italic">ID: {inv.id?.toString().slice(0, 12) || 'N/A'}...</span>
                          </div>
                        </TableCell>
                        <TableCell className="px-6 sm:px-8 py-6">
                          <div className="flex flex-col gap-1">
                            <span className="font-black text-zinc-900 text-sm tracking-tight">{inv.clientName}</span>
                            <span className="text-xs text-zinc-500 font-medium">{inv.clientEmail}</span>
                          </div>
                        </TableCell>
                        <TableCell className="px-6 sm:px-8 py-6">
                          <div className="flex flex-col items-start">
                            <span className="text-sm font-black text-zinc-900 tracking-tight italic">
                              ${Number(inv.amount).toFixed(2)}
                            </span>
                            <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">{inv.currency || 'USD'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="px-6 sm:px-8 py-6">
                          <Badge className={cn(
                            "rounded-full px-4 py-1 font-black text-[10px] uppercase tracking-widest border-none shadow-sm",
                            inv.status === 'paid' ? "bg-emerald-100 text-emerald-700" :
                            inv.status === 'pending' ? "bg-amber-100 text-amber-700" :
                            "bg-red-100 text-red-700"
                          )}>
                            {inv.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-6 sm:px-8 py-6">
                          <div className="flex items-center gap-2">
                            {inv.isAutoPunch ? (
                              <div className="flex items-center gap-1 text-[10px] font-black text-brand uppercase tracking-widest">
                                <Clock className="w-3 h-3" />
                                Auto
                              </div>
                            ) : inv.isManual ? (
                              <div className="flex items-center gap-1 text-[10px] font-black text-zinc-600 uppercase tracking-widest">
                                <Receipt className="w-3 h-3" />
                                Manual
                              </div>
                            ) : (
                              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Standard</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="px-6 sm:px-8 py-6 text-right">
                           <div className="flex justify-end gap-2">
                             <Button 
                               variant="ghost" 
                               size="icon" 
                               className="h-8 w-8 rounded-lg text-zinc-400 hover:text-zinc-900"
                               onClick={() => setViewingInvoice(inv)}
                             >
                               <FileText className="w-4 h-4" />
                             </Button>
                             <Button 
                               variant="ghost" 
                               size="icon" 
                               className="h-8 w-8 rounded-lg text-zinc-400 hover:text-zinc-900"
                               onClick={() => handlePrint(inv)}
                             >
                               <Download className="w-4 h-4" />
                             </Button>
                           </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            ) : (
              <Table className="min-w-[800px] md:min-w-0">
                <TableHeader className="bg-zinc-50/50">
                  <TableRow className="border-none">
                    <TableHead className="px-6 sm:px-8 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400">Client Profile</TableHead>
                    <TableHead className="px-6 sm:px-8 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400">Monthly Value</TableHead>
                    <TableHead className="px-6 sm:px-8 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400">Auto-Pay</TableHead>
                    <TableHead className="px-6 sm:px-8 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400">Status</TableHead>
                    <TableHead className="px-6 sm:px-8 py-5 text-right px-8"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.email.toLowerCase().includes(searchTerm.toLowerCase())).map((client) => (
                    <TableRow key={client.id} className="group border-b border-zinc-50/10 hover:bg-zinc-50/50 transition-colors">
                      <TableCell className="px-6 sm:px-8 py-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center text-white font-black italic">
                            {client.name[0]}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-black text-zinc-900 italic tracking-tight">{client.name}</span>
                            <span className="text-[10px] text-zinc-400 font-medium">{client.email}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 sm:px-8 py-6">
                        <span className="text-sm font-black text-zinc-600 italic animate-pulse">
                          {SUPPORTED_CURRENCIES.find(c => c.code === (client as any).currency)?.symbol || '$'}
                          {client.invoiceValue || '0'}/mo
                        </span>
                      </TableCell>
                      <TableCell className="px-6 sm:px-8 py-6">
                        <Button 
                          size="sm"
                          variant={client.autoPay ? "default" : "outline"}
                          onClick={() => handleToggleAutoPay(client.id, !!client.autoPay)}
                          className={cn(
                            "rounded-xl h-8 px-4 font-black text-[9px] uppercase tracking-widest transition-all",
                            client.autoPay ? "bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/20" : "bg-transparent text-zinc-400 border-zinc-200"
                          )}
                        >
                          {client.autoPay ? 'ACTIVE' : 'DISABLED'}
                        </Button>
                      </TableCell>
                      <TableCell className="px-6 sm:px-8 py-6">
                        <Badge className="bg-emerald-100 text-emerald-700 text-[9px] font-black px-2.5 py-0.5 rounded-full border-none">PORTAL ACTIVE</Badge>
                      </TableCell>
                      <TableCell className="px-6 border-zinc-50/10 py-6 text-right">
                         <Button variant="ghost" size="sm" className="rounded-lg text-[9px] font-black uppercase tracking-widest italic text-brand">Configure API</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         <Card className="rounded-[2.5rem] border-none shadow-sm bg-white p-8">
            <h3 className="text-sm font-black uppercase tracking-widest text-zinc-400 mb-6 italic">Recent Automated Batch</h3>
            <div className="space-y-4">
               {invoices.filter(i => i.isAutoPunch).slice(0, 5).map(i => (
                 <div key={i.id} className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl">
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                          <CheckCircle className="w-5 h-5 text-emerald-500" />
                       </div>
                       <div>
                          <p className="text-sm font-black text-zinc-900">{i.clientName}</p>
                          <p className="text-[10px] font-bold text-zinc-400 uppercase">Cycle Success</p>
                       </div>
                    </div>
                    <span className="font-black text-sm italic">${Number(i.amount).toFixed(2)}</span>
                 </div>
               ))}
               {invoices.filter(i => i.isAutoPunch).length === 0 && (
                 <p className="text-xs text-zinc-400 italic">No automated batches processed yet.</p>
               )}
            </div>
         </Card>

         <Card className="rounded-[2.5rem] border-none shadow-sm bg-white p-8">
            <h3 className="text-sm font-black uppercase tracking-widest text-zinc-400 mb-6 italic">Billing Configuration</h3>
            <div className="space-y-6">
               <div className="p-6 bg-zinc-900 text-white rounded-3xl relative overflow-hidden">
                  <div className="absolute right-0 top-0 w-32 h-32 bg-brand/20 blur-[60px] pointer-events-none" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">Global Cycle</p>
                  <p className="text-2xl font-black italic tracking-tighter">Rolling 30-Day</p>
                  <p className="text-xs text-zinc-400 mt-4 font-medium leading-relaxed">
                    Automated invoices generate on Day 30 of each client's retention cycle. 
                    Charges are automatically attempted if Stripe linkage exists.
                  </p>
               </div>
               
               <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-zinc-50 rounded-2xl">
                     <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Tax Engine</p>
                     <p className="text-sm font-bold text-zinc-900 underline decoration-zinc-200">System Default (0%)</p>
                  </div>
                  <div className="p-4 bg-zinc-50 rounded-2xl">
                     <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Currency</p>
                     <p className="text-sm font-bold text-zinc-900 underline decoration-zinc-200">USD - Global</p>
                  </div>
               </div>
            </div>
         </Card>
      </div>
    </div>
  );
};

export default BillingManagement;
