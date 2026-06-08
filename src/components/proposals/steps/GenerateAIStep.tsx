import React from 'react';
import { Proposal } from '@/src/types';
import { Button } from '@/components/ui/button';
import { Sparkles, Rocket } from 'lucide-react';
import { motion } from 'motion/react';

interface GenerateAIStepProps {
  isGenerating: boolean;
  onGenerate: () => void;
}

export const GenerateAIStep = React.memo(({ isGenerating, onGenerate }: GenerateAIStepProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="flex flex-col items-center justify-center py-20 gap-8">
        <div className="relative">
          <div className="w-32 h-32 rounded-2xl bg-brand/10 flex items-center justify-center animate-pulse">
            <Sparkles className="w-16 h-16 text-brand" />
          </div>
          <div className="absolute -top-4 -right-4 w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center shadow-lg border-4 border-white">
            <Rocket className="w-5 h-5 text-white" />
          </div>
        </div>

        <div className="max-w-md text-center space-y-4">
          <h3 className="text-xl font-bold text-zinc-900">Ready to Generate?</h3>
          <p className="text-zinc-500 text-sm">Our AI will create sections, strategies, and CTAs in the OP Media style.</p>
        </div>

        <Button
          size="lg"
          onClick={onGenerate}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <>
              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin mr-3" />
              Crafting Proposal...
            </>
          ) : (
            <>GENERATE AI PROPOSAL</>
          )}
        </Button>
      </div>
    </motion.div>
  );
});

GenerateAIStep.displayName = 'GenerateAIStep';
