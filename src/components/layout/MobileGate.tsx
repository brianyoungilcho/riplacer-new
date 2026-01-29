import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Crosshair, Monitor, ArrowRight } from 'lucide-react';

interface MobileGateProps {
  children: ReactNode;
}

export function MobileGate({ children }: MobileGateProps) {
  const isMobile = useIsMobile();
  const location = useLocation();

  if (isMobile) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
        {/* Logo */}
        <Link
          to="/"
          onClick={(e) => {
            if (location.pathname === '/') {
              e.preventDefault();
              window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
            }
          }}
          className="flex items-center gap-2.5 mb-8"
          aria-label="Riplacer home"
        >
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
            <Crosshair className="w-6 h-6 text-white" strokeWidth={2.5} />
          </div>
          <span className="font-bold text-2xl text-gray-900">Riplacer</span>
        </Link>

        {/* Icon */}
        <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center mb-6">
          <Monitor className="w-10 h-10 text-gray-400" />
        </div>

        {/* Message */}
        <h1 className="text-2xl font-bold text-gray-900 mb-3">
          Desktop experience only
        </h1>
        <p className="text-gray-600 max-w-sm mb-8">
          Riplacer is built for serious prospecting. For the best experience with maps 
          and detailed intel, please continue on your desktop or laptop.
        </p>

        {/* Actions */}
        <div className="space-y-3 w-full max-w-xs">
          <Button
            variant="outline"
            size="lg"
            className="w-full"
            onClick={() => {
              // Copy link to clipboard
              navigator.clipboard.writeText(window.location.origin);
              alert('Link copied! Open riplacer.com on your desktop.');
            }}
          >
            Copy link to clipboard
          </Button>
          
          <Link to="/" className="block">
            <Button
              variant="ghost"
              className="w-full text-gray-600"
            >
              Back to home
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>

        {/* Footer note */}
        <p className="text-xs text-gray-400 mt-12">
          Mobile version coming soon
        </p>
      </div>
    );
  }

  return <>{children}</>;
}

