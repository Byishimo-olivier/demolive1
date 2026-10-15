import { ReactNode } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from './button';
import { MultiStepper, Step } from './multi-stepper';
import { cn } from '../../lib/utils';

interface MultiStepFormProps {
  steps: Step[];
  currentStep: number;
  onNext: () => void;
  onPrevious: () => void;
  onCancel: () => void;
  onSubmit?: () => void;
  children: ReactNode;
  isSubmitting?: boolean;
  canSubmit?: boolean;
  submitLabel?: string;
  cancelLabel?: string;
  className?: string;
  nextDisabled?: boolean;
}

export function MultiStepForm({
  steps,
  currentStep,
  onNext,
  onPrevious,
  onCancel,
  onSubmit,
  children,
  isSubmitting = false,
  canSubmit = true,
  submitLabel = 'Submit',
  cancelLabel = 'Cancel',
  className,
  nextDisabled = false
}: MultiStepFormProps) {
  const isFirstStep = currentStep === 1;
  const isLastStep = currentStep === steps.length;

  return (
    <div className={cn("space-y-8", className)}>
      {/* Progress Steps */}
      <MultiStepper steps={steps} currentStep={currentStep} />

      {/* Form Content */}
      <div className="space-y-6">
        {children}
      </div>

      {/* Navigation Actions */}
      <div className="flex justify-between gap-4 pt-6 border-t">
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {cancelLabel}
          </Button>
          
          {!isFirstStep && (
            <Button
              type="button"
              variant="outline"
              onClick={onPrevious}
              disabled={isSubmitting}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
          )}
        </div>
        
        <div className="flex gap-2">
          {!isLastStep ? (
            <Button
              type="button"
              onClick={onNext}
              disabled={isSubmitting || nextDisabled}
              size="lg"
            >
              Next
              <ArrowLeft className="h-4 w-4 ml-2 rotate-180" />
            </Button>
          ) : (
            canSubmit && onSubmit && (
              <Button 
                type="submit" 
                onClick={onSubmit}
                disabled={isSubmitting}
                size="lg"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  submitLabel
                )}
              </Button>
            )
          )}
        </div>
      </div>
    </div>
  );
}
