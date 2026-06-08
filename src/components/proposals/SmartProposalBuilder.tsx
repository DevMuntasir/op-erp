import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createProposal,
  generateProposalContent,
  getProposal,
  updateProposal,
} from '@/src/api/endpoints/proposals.api';
import type { CreateProposalRequest, UpdateProposalRequest } from '@/src/api/endpoints/proposals.api';
import { queryKeys } from '@/src/shared/constants/query-keys';
import { useAuth } from '@/src/App';
import { Proposal } from '@/src/types';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Building2, Target, DollarSign, Sparkles, Eye, ChevronRight, ChevronLeft, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { BrandLogo } from '@/src/components/layout/BrandLogo';
import { cn } from '@/src/lib/utils';
import { ProposalToolbar, ToolbarLeft, ToolbarRight } from '@/src/components/proposals/ProposalToolbar';
import { ClientInfoStep, ServicesStep, PricingStep, GenerateAIStep, ReviewStep } from './steps';

const STEPS = [
  { id: 'client', title: 'Client Info', icon: Building2 },
  { id: 'services', title: 'Strategy', icon: Target },
  { id: 'pricing', title: 'Pricing', icon: DollarSign },
  { id: 'content', title: 'AI Content', icon: Sparkles },
  { id: 'review', title: 'Final Review', icon: Eye },
];

export const SmartProposalBuilder = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const basePath = user?.role === 'super_admin' || user?.role === 'admin' ? '/admin' : '/employee';

  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Partial<Proposal>>({
    title: '',
    clientName: '',
    clientEmail: '',
    businessName: '',
    industry: '',
    location: '',
    businessDescription: '',
    goals: [],
    targetAudience: '',
    monthlyBudget: 2500,
    services: [],
    deliverables: [],
    pricingPlans: [],
    templateId: 'minimal',
    sections: [],
    status: 'draft'
  });

  const proposalQuery = useQuery({
    queryKey: queryKeys.proposal(id!),
    queryFn: () => getProposal(id!),
    enabled: !!id,
  });

  const loading = !!id && proposalQuery.isLoading;

  useEffect(() => {
    if (proposalQuery.data) {
      setFormData({ ...proposalQuery.data });
    }
  }, [proposalQuery.data]);

  useEffect(() => {
    if (proposalQuery.isError) {
      toast.error('Failed to load proposal');
      navigate(`${basePath}/proposals`);
    }
  }, [proposalQuery.isError, basePath, navigate]);

  const updateFormData = useCallback((updates: Partial<Proposal>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  }, []);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
      window.scrollTo(0, 0);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      window.scrollTo(0, 0);
    }
  };

  const generateMutation = useMutation({
    mutationFn: (data: Partial<Proposal>) =>
      generateProposalContent({
        clientName: data.clientName!,
        businessName: data.businessName ?? undefined,
        location: data.location ?? undefined,
        businessDescription: data.businessDescription ?? undefined,
        targetAudience: data.targetAudience ?? undefined,
        industry: data.industry ?? undefined,
        goals: Array.isArray(data.goals) ? data.goals : undefined,
        services: data.services ?? undefined,
        monthlyBudget: data.monthlyBudget ?? undefined,
        currency: data.currency ?? undefined,
        pricingPlans: data.pricingPlans,
      }),
    onSuccess: (result) => {
      updateFormData({ sections: result.sections });
      toast.success('AI Proposal Generated!');
      setCurrentStep(4);
    },
    onError: (error: Error) => {
      toast.error('AI Generation failed', { description: error.message });
    },
  });

  const handleGenerateAI = () => {
    if (!formData.clientName) {
      toast.error('Please enter client details first');
      setCurrentStep(0);
      return;
    }
    generateMutation.mutate(formData);
  };

  const createMutation = useMutation({
    mutationFn: (body: CreateProposalRequest) => createProposal(body),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.proposals() });
      queryClient.invalidateQueries({ queryKey: queryKeys.proposalSummary });
      toast.success('Proposal created');
      navigate(`${basePath}/proposals/edit/${created.id}`);
    },
    onError: (error: Error) => {
      toast.error('Failed to create proposal', { description: error.message });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateProposalRequest }) =>
      updateProposal(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.proposals() });
      queryClient.invalidateQueries({ queryKey: queryKeys.proposal(id!) });
      queryClient.invalidateQueries({ queryKey: queryKeys.proposalSummary });
      toast.success('Proposal updated');
    },
    onError: (error: Error) => {
      toast.error('Failed to save proposal', { description: error.message });
    },
  });

  const saving = createMutation.isPending || updateMutation.isPending;
  const generating = generateMutation.isPending;

  const handleSave = () => {
    const totalValue = formData.pricingPlans?.reduce((s, p) => s + (p.value ?? 0), 0) ?? 0;
    const title = formData.title || `Proposal for ${formData.businessName || formData.clientName}`;

    if (id) {
      updateMutation.mutate({
        id,
        body: { ...formData, title, totalValue } as UpdateProposalRequest,
      });
    } else {
      createMutation.mutate({ ...formData, title, totalValue } as CreateProposalRequest);
    }
  };

  if (loading) return <div className="p-8 text-center bg-zinc-50 min-h-screen pt-20">Loading modern builder...</div>;

  return (
    <div className="min-h-screen bg-zinc-50/50 pb-24">
      <ProposalToolbar sticky>
        <ToolbarLeft className="gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`${basePath}/proposals`)} className="rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-4">
            <BrandLogo className="h-10 w-auto md:h-12" />
            <div className="h-8 w-px bg-zinc-200" />
            <div>
              <h1 className="text-xl font-black text-zinc-900 tracking-tight">Proposal Builder</h1>
              <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest leading-none mt-1">Growth OS for Marketing Agencies</p>
            </div>
          </div>
        </ToolbarLeft>
        <ToolbarRight>
          <Button variant="outline" className="rounded-full px-6 border-zinc-200" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Draft'}
          </Button>
          <Button onClick={() => navigate(`${basePath}/proposals/preview/${id}`)} disabled={!id}>
            <Eye className="w-4 h-4 mr-2" />
            Live Preview
          </Button>
        </ToolbarRight>
      </ProposalToolbar>

      <div className="max-w-5xl mx-auto mt-10 px-4 mb-12">
        <div className="flex items-center justify-between relative">
          <div className="absolute top-6 left-0 right-0 h-1 bg-gradient-to-r from-zinc-100 via-zinc-100 to-zinc-100 -z-10" />

          {STEPS.map((step, idx) => (
            <div key={step.id} className="flex flex-col items-center gap-3 relative z-10 flex-1 group">
              <motion.div
                initial={false}
                animate={{
                  scale: currentStep === idx ? 1.1 : 1,
                }}
                transition={{ duration: 0.3 }}
                className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 shrink-0 shadow-sm",
                  currentStep === idx
                    ? "bg-gradient-to-br from-brand to-pink-600 text-white shadow-lg shadow-brand/30 ring-4 ring-brand/20"
                    : currentStep > idx
                      ? "bg-zinc-900 text-white shadow-md"
                      : "bg-white border-2 border-zinc-200 text-zinc-400 group-hover:border-brand/40 group-hover:shadow-md"
                )}
              >
                {currentStep > idx ? (
                  <CheckCircle2 className="w-6 h-6" />
                ) : (
                  <step.icon className="w-6 h-6" />
                )}
              </motion.div>

              <div className="text-center min-w-max">
                <span className={cn(
                  "text-xs font-black uppercase tracking-wider leading-tight block transition-colors duration-300",
                  currentStep === idx
                    ? "text-brand"
                    : currentStep > idx
                      ? "text-zinc-700"
                      : "text-zinc-500 group-hover:text-brand/60"
                )}>
                  {step.title}
                </span>
              </div>

              {idx < STEPS.length - 1 && (
                <motion.div
                  className={cn(
                    "absolute top-6 left-[calc(50%+24px)] w-[calc(100%+8px)] h-1 rounded-full -z-10",
                    currentStep > idx
                      ? "bg-gradient-to-r from-zinc-900 to-zinc-700"
                      : "bg-zinc-200"
                  )}
                  initial={false}
                  animate={{
                    background: currentStep > idx
                      ? "linear-gradient(to right, #18181b, #a1a1aa)"
                      : "rgb(229, 229, 229)"
                  }}
                  transition={{ duration: 0.3 }}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-3xl mx-auto pb-20">
        <AnimatePresence mode="wait">
          {currentStep === 0 && <ClientInfoStep formData={formData} onUpdate={updateFormData} />}
          {currentStep === 1 && <ServicesStep formData={formData} onUpdate={updateFormData} />}
          {currentStep === 2 && <PricingStep formData={formData} onUpdate={updateFormData} />}
          {currentStep === 3 && <GenerateAIStep isGenerating={generating} onGenerate={handleGenerateAI} />}
          {currentStep === 4 && <ReviewStep formData={formData} onUpdate={updateFormData} isSaving={saving} onSave={handleSave} />}
        </AnimatePresence>

        <div className="fixed bottom-0 left-0 w-full bg-white/80 backdrop-blur-md border-t border-zinc-200 py-3 z-[99]">
          <div className="max-w-4xl mx-auto px-6 flex items-center justify-between">
            <Button
              variant="ghost"
              className={cn("h-10 rounded-lg font-bold border border-zinc-200 px-4 text-sm", currentStep === 0 && "opacity-0")}
              onClick={handleBack}
              disabled={currentStep === 0}
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Back
            </Button>

            <div className="text-zinc-400 text-xs font-black tracking-widest px-4">
              STEP {currentStep + 1} / {STEPS.length}
            </div>

            {currentStep < STEPS.length - 1 ? (
              <Button
                onClick={handleNext}
                disabled={currentStep === 3 && !formData.sections?.length}
              >
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Completing...' : 'Finish'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
