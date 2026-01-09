import { useState, useEffect, useCallback } from 'react';
import { TourStep } from '../components/UserTour';

const TOUR_STORAGE_KEY = 'ccplearn_user_tour_completed';
const TOUR_VERSION = '1.0'; // Increment to reset tours for all users

interface UseUserTourOptions {
  tourId: string;
  steps: TourStep[];
  enabled?: boolean;
  autoStart?: boolean;
}

export const useUserTour = ({ tourId, steps, enabled = true, autoStart = false }: UseUserTourOptions) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasCompletedTour, setHasCompletedTour] = useState(false);

  // Check if tour was completed
  useEffect(() => {
    if (!enabled) return;

    try {
      const completed = localStorage.getItem(`${TOUR_STORAGE_KEY}_${tourId}_${TOUR_VERSION}`);
      if (completed === 'true') {
        setHasCompletedTour(true);
      } else if (autoStart && !completed) {
        // Auto-start tour for new users
        setIsOpen(true);
      }
    } catch (error) {
      console.error('Error checking tour status:', error);
    }
  }, [tourId, enabled, autoStart]);

  const startTour = useCallback(() => {
    if (!enabled) return;
    setCurrentStep(0);
    setIsOpen(true);
  }, [enabled]);

  const closeTour = useCallback(() => {
    setIsOpen(false);
  }, []);

  const completeTour = useCallback(() => {
    try {
      localStorage.setItem(`${TOUR_STORAGE_KEY}_${tourId}_${TOUR_VERSION}`, 'true');
      setHasCompletedTour(true);
      setIsOpen(false);
    } catch (error) {
      console.error('Error saving tour completion:', error);
    }
  }, [tourId]);

  const resetTour = useCallback(() => {
    try {
      localStorage.removeItem(`${TOUR_STORAGE_KEY}_${tourId}_${TOUR_VERSION}`);
      setHasCompletedTour(false);
      setCurrentStep(0);
    } catch (error) {
      console.error('Error resetting tour:', error);
    }
  }, [tourId]);

  const nextStep = useCallback(() => {
    setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
  }, [steps.length]);

  const prevStep = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  }, []);

  return {
    isOpen,
    currentStep,
    hasCompletedTour,
    startTour,
    closeTour,
    completeTour,
    resetTour,
    nextStep,
    prevStep,
    setCurrentStep
  };
};
