import React, { useEffect, useRef, useState } from 'react';
import { X, ChevronRight, ChevronLeft, Sparkles } from 'lucide-react';
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
      let top = 0;
      let left = 0;

      switch (position) {
        case 'top':
          top = rect.top + scrollY - 10;
          left = rect.left + scrollX + rect.width / 2;
          break;
        case 'bottom':
          top = rect.bottom + scrollY + 10;
          left = rect.left + scrollX + rect.width / 2;
          break;
        case 'left':
          top = rect.top + scrollY + rect.height / 2;
          left = rect.left + scrollX - 10;
          break;
        case 'right':
          top = rect.top + scrollY + rect.height / 2;
          left = rect.right + scrollX + 10;
          break;
        case 'center':
          top = window.innerHeight / 2 + scrollY;
          left = window.innerWidth / 2 + scrollX;
          break;
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
    if (currentStepData.action) {
      currentStepData.action();
    }
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
  const tooltipStyle: React.CSSProperties = {
    position: 'absolute',
    top: `${position.top}px`,
    left: `${position.left}px`,
    transform: 'translate(-50%, 0)',
    zIndex: 10000,
    maxWidth: '320px',
    pointerEvents: 'auto'
  };

  // Adjust for RTL
  if (isRtl && currentStepData.position === 'right') {
    tooltipStyle.transform = 'translate(50%, 0)';
  }

  return (
    <>
      {/* Overlay */}
      <div
        ref={overlayRef}
        className="fixed inset-0 bg-black/50 dark:bg-black/70 z-[9997] transition-opacity"
        onClick={handleSkip}
        style={{ pointerEvents: 'auto' }}
      />

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        style={tooltipStyle}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-5 animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-green-100 dark:bg-green-900 rounded-lg">
              <Sparkles className="w-4 h-4 text-green-600 dark:text-green-400" />
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
          <button
            onClick={handleSkip}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            aria-label={t.tourClose || 'Close'}
          >
            <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <p className="text-sm text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
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
              className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
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
                  ? 'bg-green-600 dark:bg-green-500'
                  : index < currentStep
                  ? 'bg-green-300 dark:bg-green-700'
                  : 'bg-gray-200 dark:bg-gray-700'
              }`}
            />
          ))}
        </div>
      </div>

      <style>{`
        .tour-highlight {
          outline: 3px solid rgba(34, 197, 94, 0.5) !important;
          outline-offset: 4px !important;
          border-radius: 8px !important;
          background-color: rgba(34, 197, 94, 0.1) !important;
        }
      `}</style>
    </>
  );
};
