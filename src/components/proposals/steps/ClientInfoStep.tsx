import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { searchProposalClients } from '@/src/api/endpoints/proposals.api';
import { Proposal } from '@/src/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'motion/react';

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

interface ClientInfoStepProps {
  formData: Partial<Proposal>;
  onUpdate: (updates: Partial<Proposal>) => void;
}

export const ClientInfoStep = React.memo(({ formData, onUpdate }: ClientInfoStepProps) => {
  const [clientQ, setClientQ] = React.useState('');
  const [isCustomIndustry, setIsCustomIndustry] = React.useState(
    formData.industry && !INDUSTRIES.slice(0, -1).includes(formData.industry)
  );

  const clientSearchQuery = useQuery({
    queryKey: ['proposal-client-search', clientQ],
    queryFn: () => searchProposalClients(clientQ),
    enabled: clientQ.length >= 2,
    staleTime: 10_000,
  });

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">Client Foundation</h2>
        <p className="text-zinc-500 text-sm">Tell us who we are growing today</p>
      </div>

      <Card className="border-zinc-200 shadow-sm rounded-2xl overflow-hidden">
        <CardContent className="p-8 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-zinc-400">Client Name</Label>
              <div className="relative">
                <Input
                  value={formData.clientName}
                  onChange={e => {
                    onUpdate({ clientName: e.target.value });
                    setClientQ(e.target.value);
                  }}
                  placeholder="e.g. John Smith"
                  className="h-12 border-zinc-200 focus:ring-brand rounded-xl font-bold"
                />
                {clientSearchQuery.data && clientSearchQuery.data.length > 0 && clientQ.length >= 2 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute top-full left-0 right-0 mt-2 bg-white border border-zinc-200 rounded-xl shadow-lg z-50"
                  >
                    {clientSearchQuery.data.slice(0, 5).map((client) => (
                      <div
                        key={client.id}
                        onClick={() => {
                          onUpdate({
                            clientName: client.name,
                            clientEmail: client.email,
                            businessName: client.company || formData.businessName,
                          });
                          setClientQ('');
                        }}
                        className="p-3 border-b border-zinc-100 last:border-b-0 cursor-pointer hover:bg-zinc-50 transition-colors"
                      >
                        <p className="text-sm font-bold text-zinc-900">{client.name}</p>
                        <p className="text-xs text-zinc-500">{client.email}</p>
                        {client.company && <p className="text-xs text-zinc-400">{client.company}</p>}
                      </div>
                    ))}
                  </motion.div>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-zinc-400">Business Name</Label>
              <Input
                value={formData.businessName}
                onChange={e => onUpdate({ businessName: e.target.value })}
                placeholder="e.g. Magnetic World"
                className="h-12 border-zinc-200 focus:ring-brand rounded-xl font-bold"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-black uppercase tracking-widest text-zinc-400">Client Email</Label>
            <Input
              value={formData.clientEmail}
              onChange={e => onUpdate({ clientEmail: e.target.value })}
              placeholder="client@growth.com"
              className="h-12 border-zinc-200 focus:ring-brand rounded-xl font-bold"
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-zinc-400">Industry</Label>
              <div className="space-y-3">
                <select
                  className="w-full h-12 border border-zinc-200 px-4 rounded-xl font-bold focus:ring-2 focus:ring-brand outline-none bg-white"
                  value={isCustomIndustry ? 'Other (Custom)' : formData.industry}
                  onChange={e => {
                    if (e.target.value === 'Other (Custom)') {
                      setIsCustomIndustry(true);
                      onUpdate({ industry: '' });
                    } else {
                      setIsCustomIndustry(false);
                      onUpdate({ industry: e.target.value });
                    }
                  }}
                >
                  <option value="">Select Industry</option>
                  {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                </select>

                {isCustomIndustry && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                    <Input
                      value={formData.industry}
                      onChange={e => onUpdate({ industry: e.target.value })}
                      placeholder="Type your custom industry..."
                      className="h-12 border-brand focus:ring-brand rounded-xl font-bold italic"
                    />
                  </motion.div>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-zinc-400">Location</Label>
              <Input
                value={formData.location}
                onChange={e => onUpdate({ location: e.target.value })}
                placeholder="e.g. Halifax, Canada"
                className="h-12 border-zinc-200 focus:ring-brand rounded-xl font-bold"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-black uppercase tracking-widest text-zinc-400">Brief Business Description</Label>
            <Textarea
              value={formData.businessDescription}
              onChange={e => onUpdate({ businessDescription: e.target.value })}
              placeholder="What do they actually do? (Service, product, pricing model)"
              className="min-h-[120px] border-zinc-200 focus:ring-brand rounded-xl font-bold"
            />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
});

ClientInfoStep.displayName = 'ClientInfoStep';
