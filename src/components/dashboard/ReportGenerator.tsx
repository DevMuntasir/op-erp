import React, { useState, useRef, useEffect } from 'react';
import { 
  FileText, 
  Upload, 
  X, 
  Clipboard, 
  Check, 
  Loader2, 
  Image as ImageIcon,
  Sparkles,
  Copy,
  Plus,
  Trash2,
  History,
  MessageSquare,
  ChevronRight,
  Clock,
  ExternalLink,
  Search,
  Pencil,
  Share2,
  Maximize2,
  Eye,
  Activity,
  ShieldCheck,
  AlertCircle,
  TrendingUp,
  Heart,
  Star,
  FileDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { generateClientReport } from '@/src/services/geminiService';
import { cn } from '@/lib/utils';
import { auth, db } from '@/src/lib/firebase';
import { handleFirestoreError, OperationType } from '@/src/lib/firestore-errors';
import { 
  collection, 
  addDoc, 
  updateDoc,
  query, 
  where, 
  onSnapshot, 
  orderBy, 
  serverTimestamp,
  doc,
  getDoc,
  getDocs
} from 'firebase/firestore';

interface ImageFile {
  id: string;
  data: string; // base64
  mimeType: string;
  preview: string; // blob url
}

interface ReportData {
  id: string;
  clientName: string;
  clientEmail?: string;
  projectName: string;
  notes: string;
  reportingPeriod?: string;
  content: string;
  images: string[];
  status: string;
  adminId: string;
  createdBy: string;
  createdAt: any;
  sentToClient?: boolean;
  sentAt?: any;
  isViewed?: boolean;
  viewedAt?: any;
}

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export const ReportGenerator: React.FC = () => {
  const [clientName, setClientName] = useState('');
  const [projectName, setProjectName] = useState('');
  const [reportingPeriod, setReportingPeriod] = useState('');
  const [notes, setNotes] = useState('');
  const [images, setImages] = useState<ImageFile[]>([]);
  const [generating, setGenerating] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const [analyzedImages, setAnalyzedImages] = useState<ImageFile[]>([]);
  const [copied, setCopied] = useState(false);
  const [pastReports, setPastReports] = useState<ReportData[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [viewHistory, setViewHistory] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ReportData | null>(null);
  const [editingReportId, setEditingReportId] = useState<string | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [availableClients, setAvailableClients] = useState<any[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [loadingClients, setLoadingClients] = useState(false);
  const [delivering, setDelivering] = useState(false);
  const [exporting, setExporting] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  const [selectedImageView, setSelectedImageView] = useState<string | null>(null);

  // Fetch user data for adminId
  useEffect(() => {
    if (!auth.currentUser) return;

    const fetchUser = async () => {
      const userRef = doc(db, 'users', auth.currentUser!.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const data = userSnap.data();
        setUserData({
          ...data,
          uid: data.uid || auth.currentUser!.uid // Ensure UID is present
        });
      }
    };
    fetchUser();
  }, []);

  // Fullscreen ImageViewer Modal
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
                    <p className="text-[10px] sm:text-lg font-black tracking-widest uppercase">Evidence Verification</p>
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

  // Fetch report history
  useEffect(() => {
    if (!auth.currentUser || !userData) return;

    const reportsRef = collection(db, 'reports');
    // Staff see their own reports, admins see all reports for their agency
    // We remove orderBy here to avoid composite index requirement in dev
    const q = userData.role === 'employee' 
      ? query(reportsRef, where('createdBy', '==', auth.currentUser.uid))
      : query(reportsRef, where('adminId', '==', userData.uid || auth.currentUser.uid));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reports = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ReportData[];
      
      // Sort in memory to avoid index requirements
      const sortedReports = reports.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
        return dateB - dateA;
      });

      setPastReports(sortedReports);
      setLoadingHistory(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'reports');
      setLoadingHistory(false);
    });

    return () => unsubscribe();
  }, [userData]);

  // Fetch available clients
  useEffect(() => {
    if (!auth.currentUser || !userData) return;

    setLoadingClients(true);
    const clientsRef = collection(db, 'clients');
    const adminId = userData.role === 'employee' ? userData.adminId : (userData.uid || auth.currentUser.uid);
    
    if (!adminId) {
      setLoadingClients(false);
      return;
    }

    const q = query(clientsRef, where('adminId', '==', adminId));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const clients = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAvailableClients(clients);
      setLoadingClients(false);
    }, (error) => {
      console.error("Firestore clients error:", error);
      handleFirestoreError(error, OperationType.LIST, 'clients');
      setLoadingClients(false);
    });

    return () => unsubscribe();
  }, [userData]);

  const compressImage = (file: File): Promise<{ base64: string, preview: string }> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Target long side to be 1600px for high fidelity but reasonable size
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
          
          // Return as JPEG with 0.7 quality - good balance for AI analysis
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
          resolve({
            base64: compressedDataUrl.split(',')[1],
            preview: compressedDataUrl
          });
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const MarkdownComponents: any = {
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
          {!['Overview', 'Summary', 'Observations', 'Status', 'Issues', 'Roadmap', 'Note'].some(k => String(children).includes(k)) && <Star className="w-5 h-5" />}
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
            <div className={cn("inline-flex items-center px-6 py-2.5 rounded-2xl font-black uppercase tracking-widest text-[11px]", color)}>
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
    em: ({ children }: any) => <em className="text-zinc-500 italic bg-zinc-100 px-2 py-0.5 rounded-md not-italic font-bold text-xs">{children}</em>
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const filesArray = Array.from(files);
    for (const file of filesArray) {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image`);
        continue;
      }

      try {
        const { base64, preview } = await compressImage(file);
        
        const newImage: ImageFile = {
          id: Math.random().toString(36).substring(7),
          data: base64,
          mimeType: 'image/jpeg',
          preview: preview
        };
        
        setImages(prev => [...prev, newImage]);
      } catch (err) {
        console.error("Compression error:", err);
        toast.error(`Failed to process ${file.name}`);
      }
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (id: string) => {
    setImages(prev => {
      const filtered = prev.filter(img => img.id === id);
      // Clean up blob URL
      if (filtered[0]) URL.revokeObjectURL(filtered[0].preview);
      return prev.filter(img => img.id !== id);
    });
  };

  const handleEditReport = (r: ReportData) => {
    setClientName(r.clientName);
    setProjectName(r.projectName);
    setReportingPeriod(r.reportingPeriod || '');
    setNotes(r.notes);
    setReport(r.content);
    setEditingReportId(r.id);
    
    // Map existing images back to ImageFile structure
    const existingImages: ImageFile[] = (r.images || []).map(imgData => {
      const match = imgData.match(/^data:(image\/[a-z]+);base64,(.+)$/);
      return {
        id: Math.random().toString(36).substring(7),
        data: match ? match[2] : '',
        mimeType: match ? match[1] : 'image/jpeg',
        preview: imgData // Use the data URL directly as preview
      };
    });
    
    setImages(existingImages);
    setAnalyzedImages(existingImages);
    setViewHistory(false);
    setSelectedReport(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast.info("Report loaded for editing");
  };

  const handleGenerateReport = async () => {
    if (images.length === 0 && !notes.trim()) {
      toast.error('Please provide at least one image or some notes.');
      return;
    }

    if (!auth.currentUser || !userData) {
      toast.error('Session not initialized. Please wait.');
      return;
    }

    setGenerating(true);
    try {
      const result = await generateClientReport(
        images.map(img => ({ data: img.data, mimeType: img.mimeType })),
        notes,
        clientName,
        projectName
      );
      
      // Extract status from report content or use default
      let finalStatus = 'Completed';
      if (result.toLowerCase().includes('in progress')) finalStatus = 'In Progress';
      else if (result.toLowerCase().includes('pending')) finalStatus = 'Pending';
      else if (result.toLowerCase().includes('requires attention')) finalStatus = 'Requires Attention';

      // Save or Update in Firestore
      const targetClient = availableClients.find(c => c.name === clientName);
      const normalizedClientEmail = targetClient?.email ? targetClient.email.toLowerCase().trim() : null;
      
      const reportData: any = {
        clientName: clientName || 'Anonymous Client',
        clientEmail: normalizedClientEmail,
        projectName: projectName || 'General Service',
        reportingPeriod: reportingPeriod,
        notes: notes,
        content: result,
        images: images.map(img => `data:${img.mimeType};base64,${img.data}`),
        status: finalStatus,
        adminId: userData.role === 'employee' ? userData.adminId : (userData.uid || auth.currentUser.uid),
        updatedAt: serverTimestamp(),
        sentToClient: !!normalizedClientEmail, // Automatically "send" if client is known
        sentAt: normalizedClientEmail ? serverTimestamp() : null
      };

      if (!editingReportId) {
        reportData.createdBy = auth.currentUser.uid;
        reportData.createdAt = serverTimestamp();
      }

      try {
        let finalReportId = editingReportId;
        if (editingReportId) {
          await updateDoc(doc(db, 'reports', editingReportId), reportData);
        } else {
          const docRef = await addDoc(collection(db, 'reports'), reportData);
          finalReportId = docRef.id;
        }
        
        // INTERNAL DELIVERY SYSTEM: Create Notification
        if (reportData.sentToClient && reportData.clientEmail) {
          const normalizedEmail = reportData.clientEmail.toLowerCase().trim();
          const qAdminId = userData.role === 'employee' ? userData.adminId : (userData.uid || auth.currentUser.uid);
          
          // Query users with both email and adminId to satisfy security rules
          const clientsQuery = query(
            collection(db, 'users'), 
            where('email', '==', normalizedEmail),
            where('adminId', '==', qAdminId)
          );
          
          const clientSnap = await getDocs(clientsQuery);
          if (!clientSnap.empty) {
            const clientUid = clientSnap.docs[0].id;
            await addDoc(collection(db, 'notifications'), {
              userId: clientUid,
              title: "New Report Delivered",
              message: `A new report for project "${reportData.projectName}" is available in your portal.`,
              type: "report",
              relatedId: finalReportId,
              read: false,
              adminId: qAdminId,
              createdAt: serverTimestamp()
            });
          }
          
          // Call Server Delivery API for Email/Logs
          if (normalizedEmail) {
            try {
              await fetch('/api/deliver-report', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  reportId: finalReportId,
                  clientEmail: normalizedEmail,
                  clientName: reportData.clientName,
                  projectName: reportData.projectName
                })
              });
            } catch (e) {
              console.warn("Delivery API call failed during auto-delivery");
            }
          }
        }
        
        if (targetClient) {
          toast.success(`Report delivered to client portal (${targetClient.email})`);
        } else {
          toast.success(editingReportId ? 'Report updated!' : 'Report generated!');
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, 'reports');
      }

      setReport(result);
      setEditingReportId(null);
      setAnalyzedImages([...images]); // Save the images analyzed for this report
    } catch (error) {
      console.error(error);
      toast.error('Failed to generate report.');
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportPDF = async (title: string, elementId: string) => {
    const element = document.getElementById(elementId);
    if (!element) {
      toast.error("Capture element not found");
      return;
    }

    // Safety check for dimensions to prevent createPattern error
    if (element.offsetWidth === 0 || element.offsetHeight === 0) {
      toast.error("The element is currently hidden or has no size. Please ensure it is visible before exporting.");
      return;
    }
    
    setExporting(true);
    const toastId = toast.loading("Generating high-fidelity PDF report...");
    const originalScrollY = window.scrollY;
    
    try {
      window.scrollTo(0, 0);
      
      // Delay to ensure any pending layouts or transitions complete
      await new Promise(resolve => setTimeout(resolve, 800));

      const canvas = await html2canvas(element, {
        scale: 1.5,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        imageTimeout: 30000,
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
            clonedElement.style.width = '1000px';
            clonedElement.style.padding = '60px';
            clonedElement.style.backgroundColor = '#ffffff';
            clonedElement.style.borderRadius = '0px'; // Flat for PDF
          }

          const styleTags = Array.from(clonedDoc.getElementsByTagName('style'));
          const brandHex = '#ff00cc'; 
          const zincHex = '#18181b';
          const zincLight = '#71717a';
          
          styleTags.forEach(tag => {
            try {
              let css = tag.innerHTML;
              
              // More granular replacement: check for brand keywords in the CSS nearby if possible, 
              // but mostly we need to stop everything becoming pure black.
              // We'll replace brand-related OKLCH with brandHex and others with zinc.
              css = css.replace(/oklch\(0\.627\s+0\.265\s+303\.9\)/gi, brandHex); // Approximate brand oklch
              
              for (let i = 0; i < 3; i++) { 
                css = css.replace(/(oklch|oklab|lab|lch|color|color-mix|light-dark)\s*\((?:[^()]*|\((?:[^()]*|\([^()]*\))*\))*\)/gi, (match) => {
                  if (match.includes('312') || match.includes('303') || match.includes('brand')) return brandHex;
                  return zincHex;
                });
              }

              css = css.replace(/in\s+(oklb|oklch|oklab|oklab-linear|oklch-linear|lab|lch|srgb-linear|display-p3|a98-rgb|prophoto-rgb|rec2020|xyz|xyz-d50|xyz-d65)/gi, "in srgb");
              
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
            h1, h2, h3, h4, h5, h6, strong, b { 
              font-weight: 900 !important; 
              letter-spacing: -0.04em !important;
              color: #18181b !important;
            }
            .bg-brand { background-color: ${brandHex} !important; }
            .text-brand { color: ${brandHex} !important; }
            .bg-zinc-900 { background-color: #18181b !important; }
            .bg-zinc-950 { background-color: #09090b !important; }
            .text-zinc-900 { color: #18181b !important; }
            .text-zinc-600 { color: #52525b !important; }
            .text-zinc-400 { color: #a1a1aa !important; }
            .border-zinc-100 { border-color: #f4f4f5 !important; }
            .border-zinc-200 { border-color: #e4e4e7 !important; }
            
            /* Professional Markdown Styles */
            .markdown-body {
              line-height: 1.6 !important;
              color: #18181b !important;
            }
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
            
            colorProps.forEach(prop => {
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
        }
      });

      const pdfWidth = 210;
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: [pdfWidth, pdfHeight],
        compress: true
      });
      const imgData = canvas.toDataURL('image/jpeg', 0.75);
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
      pdf.save(`OP_Media_Report_${title.replace(/\s+/g, '_')}.pdf`);
      toast.success("PDF Exported Successfully", { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error("Export failed. Try again.", { id: toastId });
    } finally {
      window.scrollTo(0, originalScrollY);
      setExporting(false);
    }
  };

  const extractShortSummary = (fullReport: string) => {
    const sections = fullReport.split('---');
    const summarySection = sections.find(s => s.includes('Short Summary'));
    if (summarySection) {
      return summarySection.replace(/### Short Summary \(for WhatsApp\/Email\)/g, '').trim();
    }
    return fullReport.slice(-200); // Fallback
  };

  return (
    <div className="p-6 lg:p-10 space-y-8 max-w-6xl mx-auto">
      <ImageViewer />
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-zinc-900 tracking-tight">Client Reporting</h1>
          <p className="text-zinc-500 font-medium">AI-powered status updates from the field.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline"
            onClick={() => setViewHistory(!viewHistory)}
            className={cn(
              "rounded-xl font-bold uppercase tracking-widest text-[10px] transition-all",
              viewHistory ? "bg-zinc-900 text-white hover:bg-zinc-800" : ""
            )}
          >
            <History className="w-3.5 h-3.5 mr-2" />
            {viewHistory ? 'New Report' : `History (${pastReports.length})`}
          </Button>
          <Button 
            variant="outline" 
            onClick={() => {
              setReport(null);
              setImages([]);
              setAnalyzedImages([]);
              setNotes('');
              setClientName('');
              setProjectName('');
              setSelectedReport(null);
              setEditingReportId(null);
            }}
            className="rounded-xl font-bold uppercase tracking-widest text-[10px]"
          >
            <Trash2 className="w-3.5 h-3.5 mr-2" />
            Reset
          </Button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {viewHistory ? (
          <motion.div 
            key="history"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8"
          >
            {/* HISTORY LIST */}
            <div className="lg:col-span-4 space-y-4">
              <div className="bg-zinc-900 text-white p-6 rounded-[2rem]">
                <h3 className="text-lg font-black tracking-tight uppercase">Recent Reports</h3>
                <p className="text-zinc-400 text-[10px] font-black uppercase tracking-widest">Select a report to view details</p>
              </div>
              
              <ScrollArea className="h-[600px] pr-4">
                <div className="space-y-3">
                  {loadingHistory ? (
                    <div className="flex justify-center py-10">
                      <Loader2 className="w-6 h-6 animate-spin text-zinc-300" />
                    </div>
                  ) : pastReports.length === 0 ? (
                    <div className="text-center py-20 px-6 border-2 border-dashed border-zinc-100 rounded-3xl">
                      <Clock className="w-10 h-10 text-zinc-200 mx-auto mb-4" />
                      <p className="text-sm font-bold text-zinc-400 uppercase tracking-widest">No Reports Yet</p>
                    </div>
                  ) : (
                      pastReports.map((r) => (
                        <div 
                          key={r.id}
                          onClick={() => {
                            setSelectedReport(r);
                            setTimeout(() => {
                              detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }, 100);
                          }}
                          className={cn(
                            "p-4 rounded-2xl cursor-pointer transition-all border-2 group relative",
                            selectedReport?.id === r.id 
                              ? "border-brand bg-brand/[0.03] shadow-lg shadow-brand/10" 
                              : "border-transparent bg-white hover:bg-zinc-50 hover:border-zinc-100"
                          )}
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <p className="text-xs font-black text-brand uppercase tracking-tighter">
                                  {r.createdAt?.toDate ? r.createdAt.toDate().toLocaleDateString() : 'Just now'}
                                </p>
                                <div className="flex gap-2">
                                  {(r as any).sentToClient && (
                                    <Badge className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full border-none bg-emerald-50 text-emerald-600">
                                      Delivered
                                    </Badge>
                                  )}
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
                              </div>
                              <h4 className="font-black text-zinc-900 line-clamp-1">{r.clientName}</h4>
                              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest line-clamp-1">{r.projectName}</p>
                            </div>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-8 w-8 rounded-full lg:opacity-0 lg:group-hover:opacity-100 hover:bg-brand/10 hover:text-brand transition-all shrink-0 bg-zinc-50 lg:bg-transparent"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditReport(r);
                              }}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* HISTORY DETAIL */}
            <div className="lg:col-span-8 scroll-mt-20" ref={detailRef}>
              {!selectedReport ? (
                 <div className="h-full min-h-[400px] border-2 border-dashed border-zinc-100 rounded-[2.5rem] flex flex-col items-center justify-center p-12 text-center bg-white">
                  <div className="w-20 h-20 rounded-3xl bg-zinc-50 flex items-center justify-center mb-6">
                    <History className="w-10 h-10 text-zinc-200" />
                  </div>
                  <h3 className="text-xl font-black text-zinc-300 tracking-tight uppercase">History Explorer</h3>
                  <p className="text-zinc-400 text-sm max-w-[280px] mt-2 font-medium">Select a prior report from the left to review its content and evidence.</p>
                </div>
              ) : (
                <div className="space-y-6">
                   <Card className="border-none shadow-2xl shadow-zinc-200/50 rounded-[2.5rem] overflow-hidden bg-white">
                    <CardHeader className="border-b border-zinc-100 flex flex-row items-center justify-between p-8 bg-zinc-50/50">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-brand/10 flex items-center justify-center">
                          <FileText className="w-6 h-6 text-brand" />
                        </div>
                        <div>
                          <CardTitle className="text-xl font-black tracking-tight uppercase">{selectedReport.clientName}</CardTitle>
                          <CardDescription className="text-zinc-400 text-[10px] font-black uppercase tracking-widest">{selectedReport.projectName}</CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!(selectedReport as any).sentToClient && (
                          <Button 
                            size="sm" 
                            onClick={async () => {
                              const client = availableClients.find(c => c.name === selectedReport.clientName);
                              const email = client?.email || (selectedReport as any).clientEmail;
                              
                              if (!email) {
                                toast.error("Client email missing. Update client records first.");
                                return;
                              }
                              
                              try {
                                const normalizedEmail = email.toLowerCase().trim();
                                const qAdminId = userData.role === 'employee' ? userData.adminId : (userData.uid || auth.currentUser.uid);

                                await updateDoc(doc(db, 'reports', selectedReport.id), {
                                  sentToClient: true,
                                  clientEmail: normalizedEmail,
                                  sentAt: serverTimestamp()
                                });

                                // INTERNAL DELIVERY SYSTEM: Create Notification
                                const clientsQuery = query(
                                  collection(db, 'users'), 
                                  where('email', '==', normalizedEmail),
                                  where('adminId', '==', qAdminId)
                                );
                                
                                const clientSnap = await getDocs(clientsQuery);
                                if (!clientSnap.empty) {
                                  const clientUid = clientSnap.docs[0].id; // This is the ID used in users collection
                                  await addDoc(collection(db, 'notifications'), {
                                    userId: clientUid, 
                                    title: "New Report Delivered",
                                    message: `A new report for project "${selectedReport.projectName}" is available in your portal.`,
                                    type: "report",
                                    relatedId: selectedReport.id,
                                    read: false,
                                    adminId: qAdminId,
                                    createdAt: serverTimestamp()
                                  });
                                }

                                // Call Server Delivery API for Email/Logs
                                try {
                                  await fetch('/api/deliver-report', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                      reportId: selectedReport.id,
                                      clientEmail: normalizedEmail,
                                      clientName: selectedReport.clientName,
                                      projectName: selectedReport.projectName
                                    })
                                  });
                                } catch (e) {
                                  console.warn("Delivery API call-back failed, but portal delivery succeeded.");
                                }

                                setSelectedReport({ ...selectedReport, sentToClient: true, clientEmail: normalizedEmail });
                                toast.success("Published & delivered to client");
                              } catch (err) {
                                toast.error("Failed to publish");
                              }
                            }}
                            className="bg-brand text-white hover:bg-brand/90 font-black text-[10px] uppercase tracking-widest h-9 px-4 rounded-xl shadow-lg shadow-brand/20"
                          >
                            <Share2 className="w-3.5 h-3.5 mr-2" />
                            Deliver to Portal
                          </Button>
                        )}
                        {(selectedReport as any).sentToClient && (
                          <div className="flex flex-col items-end gap-1">
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest border border-emerald-100">
                              <Check className="w-3 h-3" />
                              Delivered to {availableClients.find(c => c.name === selectedReport.clientName)?.email || (selectedReport as any).clientEmail || 'Client'}
                            </div>
                            {(selectedReport as any).isViewed && (
                              <div className="flex items-center gap-1 text-[8px] font-black uppercase tracking-widest text-brand mr-2">
                                <Clock className="w-2.5 h-2.5" />
                                Viewed by Client {(selectedReport as any).viewedAt?.toDate ? (selectedReport as any).viewedAt.toDate().toLocaleString() : ''}
                              </div>
                            )}
                          </div>
                        )}
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="rounded-xl border-zinc-200 font-black text-[10px] uppercase tracking-widest bg-white hover:bg-zinc-50"
                          onClick={() => handleExportPDF(selectedReport.clientName, 'history-report-capture')}
                          disabled={exporting}
                        >
                           {exporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileDown className="w-4 h-4 mr-2 text-brand" />}
                           Save PDF
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="rounded-xl border-zinc-200 font-black text-[10px] uppercase tracking-widest bg-white hover:bg-zinc-50"
                          onClick={() => handleEditReport(selectedReport)}
                        >
                           <Pencil className="w-3.5 h-3.5 mr-2" />
                           Edit Report
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="rounded-xl font-black text-[10px] uppercase tracking-widest"
                          onClick={() => copyToClipboard(selectedReport.content)}
                        >
                           {copied ? <Check className="w-4 h-4 mr-2 text-emerald-500" /> : <Copy className="w-4 h-4 mr-2" />}
                           Copy Content
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="p-8" id="history-report-capture">
                      <div className="mb-8 pb-8 border-b border-zinc-100">
                        <div className="flex flex-wrap justify-between items-end gap-4">
                          <div>
                            <h2 className="text-3xl font-black text-zinc-900 tracking-tighter uppercase leading-none mb-1">{selectedReport.clientName}</h2>
                            <p className="text-brand font-black uppercase tracking-widest text-xs">{selectedReport.projectName}</p>
                          </div>
                          {selectedReport.reportingPeriod && (
                            <div className="text-right">
                              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest leading-none mb-1">Reporting Period</p>
                              <p className="text-sm font-bold text-zinc-900 leading-none">{selectedReport.reportingPeriod}</p>
                            </div>
                          )}
                        </div>
                      </div>
                      {/* Quick Summary Card in History */}
                      <div className="mb-8 p-6 bg-brand/5 rounded-3xl border border-brand/10">
                        <div className="flex items-center gap-2 mb-3">
                          <MessageSquare className="w-4 h-4 text-brand" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-brand">Quick Summary</span>
                        </div>
                        <p className="text-sm font-bold text-zinc-700 italic leading-relaxed">
                          "{extractShortSummary(selectedReport.content)}"
                        </p>
                      </div>

                      <div className="report-content">
                        <ReactMarkdown components={MarkdownComponents}>
                          {selectedReport.content
                            .split('---')
                            .filter(s => !s.includes('Short Summary'))
                            .join('---')
                            .replace(/^(\*\*?Client:\*\*?|\*\*?Service:\*\*?|\*\*?Reporting Period:\*\*?|Client:|Service:|Reporting Period:).*\n?/gm, '')
                          }
                        </ReactMarkdown>
                      </div>

                      {selectedReport.images && selectedReport.images.length > 0 && (
                        <div className="mt-12 pt-12 border-t border-zinc-100">
                          <h4 className="text-sm font-black uppercase tracking-widest text-zinc-400 mb-6 flex items-center gap-2">
                            <ImageIcon className="w-4 h-4" />
                            Archived Evidence
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {selectedReport.images.map((img, idx) => (
                              <div 
                                key={idx} 
                                onClick={() => setSelectedImageView(img)}
                                className="group relative rounded-3xl overflow-hidden shadow-sm border border-zinc-100 bg-zinc-50 cursor-pointer"
                              >
                                <img 
                                  src={img} 
                                  alt={`Evidence ${idx + 1}`} 
                                  className="w-full aspect-[4/3] object-cover transition-transform group-hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                   <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
                                      <Maximize2 className="w-6 h-6" />
                                   </div>
                                </div>
                                <div className="absolute bottom-4 left-4">
                                  <Badge className="bg-black/40 backdrop-blur-md text-white border-none py-1.5 px-3 rounded-full text-[10px] font-black uppercase tracking-widest leading-none">
                                    Evidence 0{idx + 1}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="generator"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
          >
            {/* INPUT PANEL */}
            <div className="lg:col-span-5 space-y-6">
              <Card className="border-none shadow-2xl shadow-zinc-200/50 rounded-3xl overflow-hidden">
                <CardHeader className="bg-zinc-900 text-white p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand/20 flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-brand" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-black tracking-tight">
                        {editingReportId ? 'Edit Report' : 'Report Inputs'}
                      </CardTitle>
                      <CardDescription className="text-zinc-400 text-xs font-bold uppercase tracking-widest">
                        {editingReportId ? 'Modify existing evidence or context' : 'Provide context for the AI'}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-6 bg-white">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-2 md:col-span-2 lg:col-span-1">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Target Client</Label>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <Select 
                            value={selectedClientId || ''} 
                            onValueChange={(id) => {
                              setSelectedClientId(id);
                              const client = availableClients.find(c => c.id === id);
                              if (client) setClientName(client.name);
                            }}
                          >
                            <SelectTrigger className="rounded-xl bg-zinc-50 border-none h-11 text-sm font-medium focus:ring-1 focus:ring-brand/20">
                              <SelectValue placeholder={loadingClients ? "Loading..." : "Select Client"} />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl border-zinc-100 shadow-xl">
                              <ScrollArea className="h-[200px]">
                                {availableClients.length === 0 ? (
                                  <div className="p-4 text-center">
                                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">No clients found</p>
                                  </div>
                                ) : (
                                  availableClients.map(client => (
                                    <SelectItem 
                                      key={client.id} 
                                      value={client.id}
                                      className="rounded-xl focus:bg-brand/5 focus:text-brand font-bold py-3"
                                    >
                                      <div className="flex flex-col">
                                        <span className="text-sm">{client.name}</span>
                                        <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">{client.email}</span>
                                      </div>
                                    </SelectItem>
                                  ))
                                )}
                              </ScrollArea>
                            </SelectContent>
                          </Select>
                        </div>
                        <Input 
                          placeholder="Or type client name"
                          value={clientName}
                          onChange={(e) => {
                            setClientName(e.target.value);
                            setSelectedClientId(null);
                          }}
                          className="w-1/3 rounded-xl bg-zinc-50 border-none h-11 text-xs font-medium focus-visible:ring-1 focus-visible:ring-brand/20"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Project / Service</Label>
                      <Input 
                        placeholder="e.g. Roof Repair" 
                        value={projectName}
                        onChange={e => setProjectName(e.target.value)}
                        className="rounded-xl bg-zinc-50 border-none h-11 text-sm font-medium focus-visible:ring-1 focus-visible:ring-brand/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Reporting Period</Label>
                      <Input 
                        placeholder="e.g. May 1st - May 7th" 
                        value={reportingPeriod}
                        onChange={e => setReportingPeriod(e.target.value)}
                        className="rounded-xl bg-zinc-50 border-none h-11 text-sm font-medium focus-visible:ring-1 focus-visible:ring-brand/20"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Project Images</Label>
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-zinc-100 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-brand/40 hover:bg-brand/[0.02] transition-all group"
                    >
                      <div className="w-12 h-12 rounded-full bg-zinc-50 flex items-center justify-center group-hover:bg-brand/10 transition-all">
                        <Upload className="w-6 h-6 text-zinc-300 group-hover:text-brand transition-all" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-bold text-zinc-900">Upload Photos</p>
                        <p className="text-xs text-zinc-400 mt-1">Drag and drop or click to browse</p>
                      </div>
                      <input 
                        type="file" 
                        multiple 
                        accept="image/*" 
                        className="hidden" 
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                      />
                    </div>

                    <AnimatePresence>
                      {images.length > 0 && (
                        <div className="grid grid-cols-3 gap-2 mt-4">
                          {images.map((img) => (
                            <motion.div 
                              key={img.id}
                              layout
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.9 }}
                              className="relative aspect-square rounded-xl overflow-hidden group cursor-pointer"
                              onClick={() => setSelectedImageView(img.preview)}
                            >
                              <img src={img.preview} alt="Upload" className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Maximize2 className="w-4 h-4 text-white" />
                              </div>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeImage(img.id);
                                }}
                                className="absolute top-1 right-1 bg-black/50 hover:bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all z-10"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Employee Notes (Internal)</Label>
                    <Textarea 
                      placeholder="Describe what was done, any specific issues noticed, or internal context..." 
                      className="min-h-[120px] rounded-2xl bg-zinc-50 border-none p-4 text-sm font-medium focus-visible:ring-1 focus-visible:ring-brand/20 resize-none"
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                    />
                  </div>

                  <Button 
                    onClick={handleGenerateReport}
                    disabled={generating || delivering || (images.length === 0 && !notes.trim())}
                    className="w-full bg-zinc-900 hover:bg-zinc-800 text-white rounded-2xl h-14 font-black uppercase tracking-widest text-xs transition-all shadow-xl shadow-zinc-200"
                  >
                    {generating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {editingReportId ? 'Updating Report...' : 'Analyzing Evidence...'}
                      </>
                    ) : delivering ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin text-brand" />
                        Delivering to Client...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        {editingReportId ? 'Update & Save Changes' : 'Generate Professional Report'}
                      </>
                    )}
                  </Button>
                  {editingReportId && (
                    <Button 
                      variant="ghost" 
                      onClick={() => {
                        setEditingReportId(null);
                        setReport(null);
                        setImages([]);
                        setNotes('');
                        setClientName('');
                        setProjectName('');
                      }}
                      className="w-full font-black text-[10px] uppercase tracking-widest text-zinc-400 hover:text-zinc-600"
                    >
                      Cancel Editing
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* OUTPUT PANEL */}
            <div className="lg:col-span-7">
              <AnimatePresence mode="wait">
                {!report ? (
                  <motion.div 
                    key="empty"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="h-full min-h-[400px] border-2 border-dashed border-zinc-200 rounded-[2.5rem] flex flex-col items-center justify-center p-12 text-center"
                  >
                    <div className="w-20 h-20 rounded-3xl bg-zinc-50 flex items-center justify-center mb-6">
                      <FileText className="w-10 h-10 text-zinc-200" />
                    </div>
                    <h3 className="text-xl font-black text-zinc-300 tracking-tight uppercase">Ready to Report</h3>
                    <p className="text-zinc-400 text-sm max-w-[280px] mt-2 font-medium">
                      Fill in the details and upload evidence to generate a professional client update.
                    </p>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="report"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-6"
                  >
                    <Card className="border-none shadow-2xl shadow-zinc-200/50 rounded-[2.5rem] overflow-hidden bg-white">
                      <CardHeader className="border-b border-zinc-100 flex flex-row items-center justify-between p-8 bg-zinc-50/50">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-brand/10 flex items-center justify-center">
                            <FileText className="w-6 h-6 text-brand" />
                          </div>
                          <div>
                            <CardTitle className="text-xl font-black tracking-tight uppercase">Generated Report</CardTitle>
                            <CardDescription className="text-zinc-400 text-[10px] font-black uppercase tracking-widest">Final Audit & Review</CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                           <Button 
                             size="sm" 
                             variant="outline" 
                             className="rounded-xl border-zinc-200 font-black text-[10px] uppercase tracking-widest bg-white hover:bg-zinc-50"
                             onClick={() => handleExportPDF(clientName || 'Report', 'new-report-capture')}
                             disabled={exporting}
                           >
                              {exporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileDown className="w-4 h-4 mr-2 text-brand" />}
                              Save PDF
                           </Button>
                           <Button 
                            size="sm" 
                            variant="ghost" 
                            className="rounded-xl font-black text-[10px] uppercase tracking-widest"
                            onClick={() => copyToClipboard(report)}
                           >
                             {copied ? <Check className="w-4 h-4 mr-2 text-emerald-500" /> : <Copy className="w-4 h-4 mr-2" />}
                             Full Report
                           </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="p-8" id="new-report-capture">
                        <div className="mb-8 pb-8 border-b border-zinc-100">
                          <div className="flex flex-wrap justify-between items-end gap-4">
                            <div>
                              <h2 className="text-3xl font-black text-zinc-900 tracking-tighter uppercase leading-none mb-1">{clientName || 'Generated Report'}</h2>
                              <p className="text-brand font-black uppercase tracking-widest text-xs">{projectName || 'Project Overview'}</p>
                            </div>
                            {reportingPeriod && (
                              <div className="text-right">
                                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest leading-none mb-1">Reporting Period</p>
                                <p className="text-sm font-bold text-zinc-900 leading-none">{reportingPeriod}</p>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="report-content">
                          <ReactMarkdown components={MarkdownComponents}>
                            {report
                              .split('---')
                              .filter(s => !s.includes('Short Summary'))
                              .join('---')
                              .replace(/^(\*\*?Client:\*\*?|\*\*?Service:\*\*?|\*\*?Reporting Period:\*\*?|Client:|Service:|Reporting Period:).*\n?/gm, '')
                            }
                          </ReactMarkdown>
                        </div>

                        {analyzedImages.length > 0 && (
                          <div className="mt-12 pt-12 border-t border-zinc-100">
                            <h4 className="text-sm font-black uppercase tracking-widest text-zinc-400 mb-6 flex items-center gap-2">
                              <ImageIcon className="w-4 h-4" />
                              Visual Evidence
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {analyzedImages.map((img, idx) => (
                                <div key={img.id} className="group relative rounded-3xl overflow-hidden shadow-sm border border-zinc-100 bg-zinc-50">
                                  <img 
                                    src={img.preview} 
                                    alt={`Captured Evidence 0${idx + 1}`} 
                                    className="w-full aspect-[4/3] object-cover transition-transform group-hover:scale-105"
                                  />
                                  <div className="absolute bottom-4 left-4">
                                    <Badge className="bg-black/40 backdrop-blur-md text-white border-none py-1.5 px-3 rounded-full text-[10px] font-black uppercase tracking-widest leading-none">
                                      Captured Evidence 0{idx + 1}
                                    </Badge>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* QUICK SUMMARY CARD */}
                    <Card className="border-none bg-brand/5 rounded-3xl overflow-hidden">
                      <CardHeader className="p-6 pb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <MessageSquare className="w-4 h-4 text-brand" />
                            <CardTitle className="text-sm font-black tracking-tight uppercase">Quick Summary</CardTitle>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 text-[10px] font-bold uppercase tracking-wider text-brand hover:bg-brand/10"
                            onClick={() => copyToClipboard(extractShortSummary(report))}
                          >
                            Copy for Social/WP
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="p-6 pt-0">
                        <p className="text-sm font-bold text-zinc-700 italic leading-relaxed">
                          "{extractShortSummary(report)}"
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};