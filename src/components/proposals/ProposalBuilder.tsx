import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc, addDoc, collection, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
import { useAuth } from '@/src/App';
import { Proposal, ProposalSection, ProposalStatus, CurrencyCode, SUPPORTED_CURRENCIES } from '@/src/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, Plus, Trash2, ArrowLeft, Save, Sparkles, 
  Layout, DollarSign, Clock, CheckCircle2, ChevronRight, 
  ChevronLeft, Eye, Send
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { BrandLogo } from '@/src/components/layout/BrandLogo';
import { generateProposalSection, suggestProposalTitle } from '@/src/services/geminiService';
import { cn } from '@/lib/utils';

export const ProposalBuilder = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const basePath = user?.role === 'super_admin' || user?.role === 'admin' ? '/admin' : '/employee';

  const [loading, setLoading] = useState(!!id);
  const [saving, setSaving] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  
  const [title, setTitle] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [industry, setIndustry] = useState('');
  const [location, setLocation] = useState('');
  const [businessDescription, setBusinessDescription] = useState('');
  const [goals, setGoals] = useState<string[]>([]);
  const [status, setStatus] = useState<ProposalStatus>('draft');
  const [currency, setCurrency] = useState<CurrencyCode>('USD');
  const [sections, setSections] = useState<ProposalSection[]>([]);
  const [totalValue, setTotalValue] = useState(0);
  const [isCustomIndustry, setIsCustomIndustry] = useState(false);

  const INDUSTRIES = [
    'E-commerce', 'Real Estate', 'Healthcare', 'SaaS', 'Education', 
    'Home Services', 'Law & Legal', 'Hospitality', 'Fitness', 'Automotive',
    'Finance & Banking', 'Technology & IT', 'Media & Entertainment', 'Manufacturing', 
    'Retail & Fashion', 'Construction & Engineering', 'Non-Profit & NGO', 'Beauty & Wellness', 
    'Food & Beverage', 'Travel & Tourism', 'Gaming & Esports', 'Logistics & Supply Chain', 
    'Professional Services', 'Energy & Utilities', 'Agriculture', 'Pets & Veterinary', 
    'Web3 & Blockchain', 'Government & Public Sector', 'Sports & Recreation', 
    'Creative & Design', 'Other (Custom)'
  ];

  const [activeTab, setActiveTab] = useState('settings');

  useEffect(() => {
    if (id) {
      loadProposal(id);
    } else {
      // Default sections for a marketing proposal
      setSections([
        { id: '1', title: 'Executive Summary', content: '', type: 'text' },
        { id: '2', title: 'Target Audience', content: '', type: 'text' },
        { id: '3', title: 'Our Recommendations', content: '', type: 'services' },
        { id: '4', title: 'Investment & Pricing', content: '', type: 'pricing' },
        { id: '5', title: 'Execution Roadmap', content: '', type: 'timeline' }
      ]);
    }
  }, [id]);

  const loadProposal = async (proposalId: string) => {
    try {
      const docSnap = await getDoc(doc(db, 'proposals', proposalId));
      if (docSnap.exists()) {
        const data = docSnap.data() as Proposal;
        setTitle(data.title);
        setClientName(data.clientName);
        setClientEmail(data.clientEmail || '');
        setIndustry(data.industry || '');
        setLocation(data.location || '');
        setStatus(data.status);
        setCurrency(data.currency || 'USD');
        setSections(data.sections || []);
        setTotalValue(data.totalValue || 0);
        
        // Handle goals as string (legacy) or array
        if (typeof data.goals === 'string') {
          setGoals([data.goals]);
        } else {
          setGoals(data.goals || []);
        }

        // Check if industry is custom
        if (data.industry && !INDUSTRIES.slice(0, -1).includes(data.industry)) {
          setIsCustomIndustry(true);
        }
      }
    } catch (err) {
      toast.error("Failed to load proposal");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!title || !clientName) {
      toast.error("Title and Client Name are required");
      return;
    }

    setSaving(true);
    try {
      const adminId = user?.role === 'admin' ? user.uid : user?.adminId || user?.uid;
      const proposalData = {
        title,
        clientName,
        clientEmail,
        industry,
        location,
        status,
        currency,
        sections,
        totalValue,
        adminId,
        createdBy: user?.uid,
        creatorName: user?.name,
        updatedAt: serverTimestamp()
      };

      if (id) {
        await updateDoc(doc(db, 'proposals', id), proposalData);
        toast.success("Proposal updated");
      } else {
        const newDoc = await addDoc(collection(db, 'proposals'), {
          ...proposalData,
          createdAt: serverTimestamp()
        });
        toast.success("Proposal created");
        navigate(`${basePath}/proposals/edit/${newDoc.id}`);
      }
    } catch (err) {
      console.error(err);
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  };

  const addSection = (type: ProposalSection['type']) => {
    const newSection: ProposalSection = {
      id: Math.random().toString(36).substr(2, 9),
      title: type === 'text' ? 'New Section' : type.charAt(0).toUpperCase() + type.slice(1),
      content: '',
      type
    };
    setSections([...sections, newSection]);
  };

  const removeSection = (sectionId: string) => {
    setSections(sections.filter(s => s.id !== sectionId));
  };

  const updateSection = (sectionId: string, field: keyof ProposalSection, value: any) => {
    setSections(sections.map(s => s.id === sectionId ? { ...s, [field]: value } : s));
  };

  const toggleGoal = (goal: string) => {
    if (goals.includes(goal)) {
      setGoals(goals.filter(g => g !== goal));
    } else {
      setGoals([...goals, goal]);
    }
  };

  const handleGenerateContent = async (sectionId: string) => {
    if (!clientName) {
      toast.error("Please enter a Client Name first");
      return;
    }
    
    const section = sections.find(s => s.id === sectionId);
    if (!section) return;

    setAiGenerating(true);
    const toastId = toast.loading(`Gemini is drafting "${section.title}"...`);
    
    try {
      const content = await generateProposalSection(
        section.type,
        clientName,
        businessDescription,
        goals
      );
      updateSection(sectionId, 'content', content);
      toast.success("Content generated!", { id: toastId });
    } catch (err) {
      toast.error("AI Generation failed", { id: toastId });
    } finally {
      setAiGenerating(false);
    }
  };

  const handleSuggestTitle = async () => {
    if (!clientName) {
      toast.error("Enter client name first");
      return;
    }
    setAiGenerating(true);
    try {
      const suggested = await suggestProposalTitle(clientName, businessDescription);
      setTitle(suggested);
      toast.success("AI suggested a title!");
    } catch (err) {
      toast.error("AI suggestion failed");
    } finally {
      setAiGenerating(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading builder...</div>;

  return (
    <div className="p-4 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`${basePath}/proposals`)} className="rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-4">
            <BrandLogo className="h-10 w-auto md:h-12" />
            <div className="h-8 w-px bg-zinc-200" />
            <div>
              <h2 className="text-2xl font-black text-zinc-900 tracking-tight">{id ? 'Edit Proposal' : 'Build New Proposal'}</h2>
              <p className="text-zinc-500 font-bold uppercase tracking-widest text-[10px]">Draft your professional marketing strategy</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => navigate(`${basePath}/proposals/preview/${id}`)} disabled={!id}>
            <Eye className="w-4 h-4 mr-2" />
            Preview
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="bg-brand text-white hover:scale-[1.05] transition-all font-bold shadow-lg shadow-brand/20"
          >
            {saving ? 'Saving...' : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Proposal
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
          <Card className="border-zinc-200">
            <CardHeader className="bg-zinc-50/50 pb-4">
              <CardTitle className="text-lg">Project Info</CardTitle>
              <CardDescription>Essential details for the proposal</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Proposal Title</Label>
                  <Button variant="ghost" size="sm" onClick={handleSuggestTitle} className="h-7 text-xs text-blue-600 hover:text-blue-700 p-0">
                    <Sparkles className="w-3 h-3 mr-1" />
                    AI Suggest
                  </Button>
                </div>
                <Input 
                  value={title} 
                  onChange={e => setTitle(e.target.value)} 
                  placeholder="e.g., Q2 SEO & Content Strategy"
                  className="border-zinc-200"
                />
              </div>

              <div className="space-y-2">
                <Label>Client Name</Label>
                <Input 
                  value={clientName} 
                  onChange={e => setClientName(e.target.value)} 
                  placeholder="Company or Contact Name"
                  className="border-zinc-200"
                />
              </div>

              <div className="space-y-2">
                <Label>Client Email</Label>
                <Input 
                  type="email"
                  value={clientEmail} 
                  onChange={e => setClientEmail(e.target.value)} 
                  placeholder="client@example.com"
                  className="border-zinc-200"
                />
              </div>

              <div className="space-y-2">
                <Label>Industry</Label>
                <div className="space-y-2">
                  <select 
                    className="w-full h-10 border border-zinc-200 px-3 py-2 rounded-md text-sm focus:ring-2 focus:ring-brand outline-none bg-white font-medium"
                    value={isCustomIndustry ? 'Other (Custom)' : industry}
                    onChange={e => {
                      if (e.target.value === 'Other (Custom)') {
                        setIsCustomIndustry(true);
                        setIndustry('');
                      } else {
                        setIsCustomIndustry(false);
                        setIndustry(e.target.value);
                      }
                    }}
                  >
                    <option value="">Select Industry</option>
                    {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                  </select>
                  
                  {isCustomIndustry && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                      <Input 
                        value={industry} 
                        onChange={e => setIndustry(e.target.value)} 
                        placeholder="Type custom industry..."
                        className="border-brand font-medium italic"
                      />
                    </motion.div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Location</Label>
                <Input 
                  value={location} 
                  onChange={e => setLocation(e.target.value)} 
                  placeholder="e.g., Halifax, Canada"
                  className="border-zinc-200 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Monthly Investment</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">
                      {SUPPORTED_CURRENCIES.find(c => c.code === currency)?.symbol || '$'}
                    </span>
                    <Input 
                      type="number"
                      value={totalValue} 
                      onChange={e => setTotalValue(Number(e.target.value))} 
                      className="pl-8 border-zinc-200"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Currency</Label>
                  <select 
                    className="w-full h-10 border border-zinc-200 px-3 py-2 rounded-md text-sm focus:ring-2 focus:ring-brand outline-none bg-white font-medium"
                    value={currency}
                    onChange={e => setCurrency(e.target.value as CurrencyCode)}
                  >
                    {SUPPORTED_CURRENCIES.map(curr => (
                      <option key={curr.code} value={curr.code}>{curr.code} ({curr.symbol})</option>
                    ))}
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-zinc-200">
            <CardHeader className="bg-zinc-50/50 pb-4">
              <CardTitle className="text-lg">Proposal Context</CardTitle>
              <CardDescription>Help Gemini write better content</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label>Business Description</Label>
                <Textarea 
                  value={businessDescription} 
                  onChange={e => setBusinessDescription(e.target.value)} 
                  placeholder="What does their business do?"
                  className="min-h-[100px] border-zinc-200"
                />
              </div>
              <div className="space-y-4">
                <Label>Primary Growth Goals</Label>
                <div className="flex flex-wrap gap-2">
                  {INDUSTRIES.length > 0 && [
                    'Lead Generation & Sales',
                    'Brand Awareness & Authority',
                    'Event Hype & Ticket Sales',
                    'Retargeting & ROI Optimization',
                    'Customer Retention & LTV',
                    'Market Expansion',
                    'Community Building'
                  ].map(goal => (
                    <button
                      key={goal}
                      onClick={() => toggleGoal(goal)}
                      className={cn(
                        "px-4 py-1.5 rounded-full border text-xs font-bold transition-all flex items-center gap-1.5",
                        goals.includes(goal) 
                          ? "border-brand bg-brand text-white shadow-lg shadow-brand/20" 
                          : "border-zinc-200 bg-white text-zinc-500 hover:border-brand/40"
                      )}
                    >
                      {goals.includes(goal) && <CheckCircle2 className="w-3 h-3" />}
                      {goal}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-8 flex flex-col h-full">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden flex flex-col">
            <TabsList className="w-full justify-start rounded-none border-b border-zinc-100 bg-white p-0 h-14">
              <TabsTrigger value="settings" className="rounded-none h-full data-[state=active]:bg-brand/5 data-[state=active]:border-b-4 data-[state=active]:border-brand data-[state=active]:text-brand border-r border-zinc-100 px-6 font-bold uppercase tracking-widest text-[10px]">
                <Layout className="w-4 h-4 mr-2" />
                Hierarchy
              </TabsTrigger>
              <TabsTrigger value="content" className="rounded-none h-full data-[state=active]:bg-brand/5 data-[state=active]:border-b-4 data-[state=active]:border-brand data-[state=active]:text-brand border-r border-zinc-100 px-6 font-bold uppercase tracking-widest text-[10px]">
                <FileText className="w-4 h-4 mr-2" />
                Strategy
              </TabsTrigger>
            </TabsList>

            <TabsContent value="settings" className="p-6 focus-visible:ring-0">
               <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-zinc-900">Proposal Structure</h3>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => addSection('text')}>+ Text</Button>
                      <Button variant="outline" size="sm" onClick={() => addSection('services')}>+ Services</Button>
                      <Button variant="outline" size="sm" onClick={() => addSection('pricing')}>+ Pricing</Button>
                      <Button variant="outline" size="sm" onClick={() => addSection('timeline')}>+ Timeline</Button>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    {sections.map((section, idx) => (
                      <div draggable key={section.id} className="flex items-center gap-4 p-4 bg-zinc-50 rounded-lg border border-zinc-200">
                        <div className="flex-none bg-white p-2 rounded-md shadow-sm border border-zinc-200 text-zinc-400 font-mono text-xs">
                          {String(idx + 1).padStart(2, '0')}
                        </div>
                        <div className="flex-1">
                          <Input 
                            value={section.title} 
                            onChange={(e) => updateSection(section.id, 'title', e.target.value)}
                            className="bg-transparent border-none font-medium h-auto p-0 focus-visible:ring-0"
                          />
                          <p className="text-xs text-zinc-400 capitalize">{section.type} Section</p>
                        </div>
                        <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-red-500" onClick={() => removeSection(section.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
               </div>
            </TabsContent>

            <TabsContent value="content" className="p-0 focus-visible:ring-0">
              <ScrollArea className="h-[70vh]">
                <div className="p-6 space-y-12">
                  <AnimatePresence>
                    {sections.map((section) => (
                      <motion.div 
                        key={section.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-4"
                      >
                        <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
                          <h4 className="font-bold text-lg text-zinc-900">{section.title}</h4>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleGenerateContent(section.id)}
                            className="text-blue-600 h-8 font-medium hover:bg-blue-50"
                          >
                            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                            AI Draft
                          </Button>
                        </div>
                        <Textarea 
                          value={section.content}
                          onChange={(e) => updateSection(section.id, 'content', e.target.value)}
                          placeholder={`Enter content for ${section.title}...`}
                          className="min-h-[200px] border-zinc-100 focus-visible:ring-zinc-900 leading-relaxed text-zinc-700"
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      </div>
    </div>
  );
};

// Simplified ScrollArea for the builder
const ScrollArea = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <div className={`overflow-y-auto ${className}`}>
    {children}
  </div>
);
