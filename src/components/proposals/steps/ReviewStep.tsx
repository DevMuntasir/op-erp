import React from 'react';
import { Proposal } from '@/src/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { motion } from 'motion/react';

interface ReviewStepProps {
  formData: Partial<Proposal>;
  onUpdate: (updates: Partial<Proposal>) => void;
  isSaving: boolean;
  onSave: () => void;
}

export const ReviewStep = React.memo(({ formData, onUpdate, isSaving, onSave }: ReviewStepProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">Final Review</h2>
        <p className="text-zinc-500 text-sm">Polish and finalize your proposal</p>
      </div>

      <div className="space-y-6">
        {formData.sections?.map((section, idx) => (
          <div key={idx} className="group relative bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm hover:border-brand/40 hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-bold text-zinc-900 tracking-tight">{section.title}</h4>
              <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{String(idx + 1).padStart(2, '0')}</div>
            </div>
            <Textarea
              value={section.content}
              onChange={e => {
                const newSections = [...(formData.sections || [])];
                newSections[idx].content = e.target.value;
                onUpdate({ sections: newSections });
              }}
              className="min-h-[200px] bg-zinc-50/50 border-zinc-100 rounded-2xl italic font-bold p-6 focus:ring-brand text-zinc-700 leading-relaxed"
            />
          </div>
        ))}
      </div>

      <div className="flex justify-center pt-6">
        <Button
          size="lg"
          className="h-12 px-12 bg-brand text-white border-none shadow-lg shadow-brand/20 font-bold rounded-lg hover:scale-105 active:scale-95 transition-transform"
          onClick={onSave}
          disabled={isSaving}
        >
          {isSaving ? 'FINISHING...' : 'Save & Preview'}
        </Button>
      </div>
    </motion.div>
  );
});

ReviewStep.displayName = 'ReviewStep';
