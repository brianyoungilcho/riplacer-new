import { useState } from 'react';
import { 
  Target, 
  AlertTriangle, 
  ArrowRight, 
  MessageCircle, 
  Mail, 
  Copy, 
  Check,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export interface AccountPlan {
  executiveSummary: string;
  whoToTarget: string[];
  whoToAvoid: string[];
  nextSteps: string[];
  talkTrack: string[];
  emailDraft?: string;
  risks: string[];
  confidence: number;
  lastUpdated: string;
}

interface AccountPlanViewProps {
  plan: AccountPlan;
  prospectName: string;
  onClose?: () => void;
  className?: string;
}

export function AccountPlanView({ plan, prospectName, onClose, className }: AccountPlanViewProps) {
  const [emailCopied, setEmailCopied] = useState(false);

  const copyEmail = () => {
    if (plan.emailDraft) {
      navigator.clipboard.writeText(plan.emailDraft);
      setEmailCopied(true);
      toast.success('Email copied to clipboard');
      setTimeout(() => setEmailCopied(false), 2000);
    }
  };

  return (
    <div className={cn("bg-white border border-gray-200 rounded-xl overflow-hidden", className)}>
      {/* Header */}
      <div className="px-5 py-4 bg-gradient-to-r from-primary/5 to-primary/10 border-b border-gray-100 flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">Account Plan</h3>
          <p className="text-sm text-gray-500 mt-0.5">{prospectName}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs text-gray-500">Win Probability</p>
            <p className={cn(
              "text-lg font-bold",
              plan.confidence >= 70 ? "text-green-600" :
              plan.confidence >= 50 ? "text-amber-600" : "text-gray-600"
            )}>
              {plan.confidence}%
            </p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          )}
        </div>
      </div>

      <div className="p-5 space-y-6">
        {/* Executive Summary */}
        <div>
          <p className="text-gray-700">{plan.executiveSummary}</p>
        </div>

        {/* Who to Target / Avoid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-green-700 font-medium mb-2">
              <Target className="w-4 h-4" />
              Target These People
            </div>
            <ul className="space-y-1">
              {plan.whoToTarget.map((person, idx) => (
                <li key={idx} className="text-sm text-green-800 flex items-start gap-2">
                  <span className="text-green-500 mt-1">•</span>
                  {person}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-red-50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-red-700 font-medium mb-2">
              <AlertTriangle className="w-4 h-4" />
              Approach with Caution
            </div>
            <ul className="space-y-1">
              {plan.whoToAvoid.map((person, idx) => (
                <li key={idx} className="text-sm text-red-800 flex items-start gap-2">
                  <span className="text-red-500 mt-1">•</span>
                  {person}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Next Steps */}
        <div>
          <div className="flex items-center gap-2 font-medium text-gray-900 mb-3">
            <ArrowRight className="w-4 h-4 text-primary" />
            Recommended Next Steps
          </div>
          <ol className="space-y-2">
            {plan.nextSteps.map((step, idx) => (
              <li key={idx} className="flex items-start gap-3 text-sm">
                <span className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center flex-shrink-0 text-xs font-medium">
                  {idx + 1}
                </span>
                <span className="text-gray-700 pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Talk Track */}
        <div>
          <div className="flex items-center gap-2 font-medium text-gray-900 mb-3">
            <MessageCircle className="w-4 h-4 text-primary" />
            Key Talking Points
          </div>
          <ul className="space-y-2">
            {plan.talkTrack.map((point, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-primary mt-1">✓</span>
                {point}
              </li>
            ))}
          </ul>
        </div>

        {/* Email Draft */}
        {plan.emailDraft && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 font-medium text-gray-900">
                <Mail className="w-4 h-4 text-primary" />
                Draft Outreach Email
              </div>
              <button
                onClick={copyEmail}
                className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
              >
                {emailCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy
                  </>
                )}
              </button>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap">
              {plan.emailDraft}
            </div>
          </div>
        )}

        {/* Risks */}
        {plan.risks.length > 0 && (
          <div className="bg-amber-50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-amber-700 font-medium mb-2">
              <AlertTriangle className="w-4 h-4" />
              Key Risks
            </div>
            <ul className="space-y-1">
              {plan.risks.map((risk, idx) => (
                <li key={idx} className="text-sm text-amber-800 flex items-start gap-2">
                  <span className="text-amber-500 mt-1">⚠</span>
                  {risk}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 bg-gray-50 border-t border-gray-100">
        <p className="text-xs text-gray-400">
          Generated: {new Date(plan.lastUpdated).toLocaleString()}
        </p>
      </div>
    </div>
  );
}
