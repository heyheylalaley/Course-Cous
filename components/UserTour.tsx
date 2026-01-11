import React, { useEffect, useRef, useState } from 'react';
import { ChevronRight, ChevronLeft, Sparkles } from 'lucide-react';
import { Language } from '../types';
import { TRANSLATIONS } from '../translations';

export interface TourStep {
  id: string;
  target: string; // CSS selector or data-tour attribute
  title: string;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  action?: () => void; // Optional action to perform before showing this step
}

interface UserTourProps {
  isOpen: boolean;
  steps: TourStep[];
  onClose: () => void;
  onComplete: () => void;
  language: Language;
  currentStep: number;
  onStepChange: (step: number) => void;
}

export const UserTour: React.FC<UserTourProps> = ({
  isOpen,
  steps,
  onClose,
  onComplete,
  language,
  currentStep,
  onStepChange
}) => {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const [highlightElement, setHighlightElement] = useState<HTMLElement | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const t = TRANSLATIONS[language] as any;
  const isRtl = language === 'ar';

  const currentStepData = steps[currentStep];

  useEffect(() => {
    if (!isOpen || !currentStepData) return;

    const updatePosition = () => {
      let element: HTMLElement | null = null;
      
      // Try to find element by selector
      if (currentStepData.target.startsWith('[') || currentStepData.target.startsWith('.')) {
        element = document.querySelector(currentStepData.target) as HTMLElement;
      } else if (currentStepData.target === 'body') {
        element = document.body;
      } else {
        // Try to find by data-tour attribute
        element = document.querySelector(`[data-tour="${currentStepData.target}"]`) as HTMLElement;
      }
      
      if (!element) {
        setHighlightElement(null);
        // For center position, we still show the tooltip
        if (currentStepData.position === 'center') {
          const centerX = window.innerWidth / 2;
          const centerY = window.innerHeight / 2;
          setPosition({ top: centerY, left: centerX });
        } else {
          setPosition(null);
        }
        return;
      }

      setHighlightElement(element);
      calculatePosition(element);
    };

    const calculatePosition = (element: HTMLElement) => {
      const rect = element.getBoundingClientRect();
      const scrollX = window.scrollX || window.pageXOffset;
      const scrollY = window.scrollY || window.pageYOffset;

      const position = currentStepData.position || 'bottom';
      const tooltipWidth = 320; // maxWidth from tooltipStyle
      const tooltipHeight = 200; // Approximate height, will be adjusted
      const padding = 20; // Space from viewport edges
      const gap = 10; // Gap between element and tooltip

      let top = 0;
      let left = 0;
      let finalPosition = position;

      // Calculate initial position
      switch (position) {
        case 'top':
          top = rect.top + scrollY - gap;
          left = rect.left + scrollX + rect.width / 2;
          break;
        case 'bottom':
          top = rect.bottom + scrollY + gap;
          left = rect.left + scrollX + rect.width / 2;
          break;
        case 'left':
          top = rect.top + scrollY + rect.height / 2;
          left = rect.left + scrollX - gap;
          break;
        case 'right':
          top = rect.top + scrollY + rect.height / 2;
          left = rect.right + scrollX + gap;
          break;
        case 'center':
          top = window.innerHeight / 2 + scrollY;
          left = window.innerWidth / 2 + scrollX;
          break;
      }

      // Adjust for viewport boundaries
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const halfTooltipWidth = tooltipWidth / 2;

      // Horizontal adjustments
      if (left - halfTooltipWidth < padding) {
        // Too far left
        left = padding + halfTooltipWidth;
      } else if (left + halfTooltipWidth > viewportWidth - padding) {
        // Too far right
        left = viewportWidth - padding - halfTooltipWidth;
      }

      // Vertical adjustments
      if (top - tooltipHeight < padding) {
        // Too high, move below if possible
        if (position === 'top' && rect.bottom + scrollY + gap + tooltipHeight < viewportHeight - padding) {
          top = rect.bottom + scrollY + gap;
          finalPosition = 'bottom';
        } else {
          top = padding + tooltipHeight / 2;
        }
      } else if (top + tooltipHeight > viewportHeight + scrollY - padding) {
        // Too low, move above if possible
        if (position === 'bottom' && rect.top + scrollY - gap - tooltipHeight > padding) {
          top = rect.top + scrollY - gap;
          finalPosition = 'top';
        } else {
          top = viewportHeight + scrollY - padding - tooltipHeight / 2;
        }
      }

      // On mobile, prefer bottom or top positioning
      const isMobile = viewportWidth < 768;
      if (isMobile && (finalPosition === 'left' || finalPosition === 'right')) {
        // On mobile, use top or bottom instead
        const rectBottom = rect.bottom + scrollY;
        const rectTop = rect.top + scrollY;
        
        if (rectBottom + gap + tooltipHeight < viewportHeight + scrollY - padding) {
          top = rectBottom + gap;
          finalPosition = 'bottom';
        } else if (rectTop - gap - tooltipHeight > scrollY + padding) {
          top = rectTop - gap;
          finalPosition = 'top';
        } else {
          // Center vertically if neither works
          top = (viewportHeight / 2) + scrollY;
        }
        // Center horizontally on mobile
        left = Math.max(
          padding + halfTooltipWidth, 
          Math.min(
            viewportWidth - padding - halfTooltipWidth, 
            rect.left + scrollX + rect.width / 2
          )
        );
      }

      setPosition({ top, left });
    };

    // Wait a bit for DOM to be ready
    const timeout = setTimeout(updatePosition, 100);
    updatePosition();

    // Update on scroll/resize
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);

    return () => {
      clearTimeout(timeout);
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen, currentStep, currentStepData]);

  // Execute action when entering a step (not when leaving)
  useEffect(() => {
    if (!isOpen || !currentStepData) return;
    
    // Execute action when entering this step
    if (currentStepData.action) {
      // Small delay to ensure DOM is ready
      const timeout = setTimeout(() => {
        currentStepData.action?.();
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, [isOpen, currentStep, currentStepData]);

  useEffect(() => {
    if (!isOpen || !highlightElement) return;

    // Scroll element into view
    highlightElement.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });

    // Add highlight class
    highlightElement.style.zIndex = '9998';
    highlightElement.style.position = 'relative';
    highlightElement.classList.add('tour-highlight');

    return () => {
      if (highlightElement) {
        highlightElement.style.zIndex = '';
        highlightElement.style.position = '';
        highlightElement.classList.remove('tour-highlight');
      }
    };
  }, [isOpen, highlightElement]);

  if (!isOpen || !currentStepData || !position) return null;

  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;

  const handleNext = () => {
    // Action is now called when entering a step, not when leaving
    if (isLastStep) {
      onComplete();
    } else {
      onStepChange(currentStep + 1);
    }
  };

  const handlePrev = () => {
    onStepChange(Math.max(0, currentStep - 1));
  };

  const handleSkip = () => {
    onClose();
  };

  // Calculate tooltip position (adjust to prevent overflow)
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 320;
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 568;
  const tooltipMaxWidth = isMobile ? Math.min(320, viewportWidth - 32) : 320;
  const tooltipPadding = 16;
  const estimatedTooltipHeight = 250; // Approximate height
  
  // Convert absolute position to fixed position (relative to viewport)
  const scrollY = typeof window !== 'undefined' ? window.scrollY || window.pageYOffset : 0;
  const scrollX = typeof window !== 'undefined' ? window.scrollX || window.pageXOffset : 0;
  
  // Calculate fixed position (relative to viewport, not document)
  const fixedTop = position.top - scrollY;
  const fixedLeft = position.left - scrollX;
  
  // Clamp to viewport boundaries
  const clampedTop = Math.max(
    tooltipPadding, 
    Math.min(fixedTop, viewportHeight - estimatedTooltipHeight - tooltipPadding)
  );
  const halfTooltipWidth = tooltipMaxWidth / 2;
  const clampedLeft = Math.max(
    tooltipPadding + halfTooltipWidth,
    Math.min(fixedLeft, viewportWidth - tooltipPadding - halfTooltipWidth)
  );
  
  // For RTL, ensure tooltip doesn't go off right edge (which is more critical in RTL)
  let finalLeft = clampedLeft;
  let finalTransform = 'translate(-50%, 0)';
  
  if (isRtl) {
    // In RTL, ensure we don't exceed the right edge (left side of viewport in RTL context)
    // Add extra safety margin for RTL
    const rtlMaxLeft = viewportWidth - tooltipPadding - halfTooltipWidth;
    finalLeft = Math.min(finalLeft, rtlMaxLeft);
    
    // For RTL with 'right' position, flip the transform
    if (currentStepData.position === 'right') {
      finalTransform = 'translate(50%, 0)';
    } else if (currentStepData.position === 'left') {
      // In RTL, 'left' position means tooltip should be to the right, so flip transform
      finalTransform = 'translate(-50%, 0)';
    }
  }
  
  const tooltipStyle: React.CSSProperties = {
    position: 'fixed', // Use fixed for viewport-relative positioning
    top: `${clampedTop}px`,
    left: `${finalLeft}px`,
    transform: finalTransform,
    zIndex: 10000,
    maxWidth: `${tooltipMaxWidth}px`,
    width: isMobile ? 'calc(100vw - 32px)' : 'auto',
    pointerEvents: 'auto',
    maxHeight: `${viewportHeight - clampedTop - tooltipPadding}px`,
    overflowY: 'auto',
    overflowX: 'hidden'
  };

  // On mobile, center horizontally if tooltip would be too close to edge
  if (isMobile) {
    if (finalLeft - halfTooltipWidth < tooltipPadding || finalLeft + halfTooltipWidth > viewportWidth - tooltipPadding) {
      tooltipStyle.left = '50%';
      tooltipStyle.transform = 'translate(-50%, 0)';
    }
  }

  return (
    <>
      {/* Overlay */}
      <div
        ref={overlayRef}
        className="fixed inset-0 bg-black/30 dark:bg-black/50 z-[9997] transition-opacity"
        style={{ pointerEvents: 'none' }}
      />

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        style={tooltipStyle}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5 animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-amber-100 dark:bg-amber-900 rounded-lg">
              <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                {currentStepData.title}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {t.tourStep || 'Step'} {currentStep + 1} {t.tourOf || 'of'} {steps.length}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <p className="text-sm text-gray-700 dark:text-gray-300 mb-4 leading-relaxed break-words">
          {currentStepData.content}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={handleSkip}
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors px-3 py-1.5"
          >
            {t.tourSkip || 'Skip Tour'}
          </button>
          <div className="flex items-center gap-2">
            {!isFirstStep && (
              <button
                onClick={handlePrev}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                {t.tourPrev || 'Previous'}
              </button>
            )}
            <button
              onClick={handleNext}
              className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors"
            >
              {isLastStep ? (t.tourFinish || 'Finish') : (t.tourNext || 'Next')}
              {!isLastStep && <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Progress indicator */}
        <div className="mt-4 flex items-center gap-1.5">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                index === currentStep
                  ? 'bg-amber-600 dark:bg-amber-500'
                  : index < currentStep
                  ? 'bg-amber-300 dark:bg-amber-700'
                  : 'bg-gray-200 dark:bg-gray-700'
              }`}
            />
          ))}
        </div>
      </div>

      <style>{`
        .tour-highlight {
          outline: 4px solid rgba(245, 158, 11, 0.8) !important;
          outline-offset: 6px !important;
          border-radius: 12px !important;
          background-color: rgba(245, 158, 11, 0.15) !important;
          box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.3), 0 0 20px rgba(245, 158, 11, 0.2) !important;
          transition: all 0.3s ease !important;
        }
        @media (max-width: 768px) {
          .tour-highlight {
            outline: 5px solid rgba(245, 158, 11, 0.9) !important;
            outline-offset: 8px !important;
            box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.4), 0 0 30px rgba(245, 158, 11, 0.3) !important;
          }
        }
      `}</style>
    </>
  );
};
