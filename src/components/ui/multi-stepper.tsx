import { CheckCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface Step {
  id: number;
  title: string;
  description: string;
}

interface MultiStepperProps {
  steps: Step[];
  currentStep: number;
  className?: string;
}

export function MultiStepper({ steps, currentStep, className }: MultiStepperProps) {
  return (
    <div className={cn("mb-8", className)}>
      <div className="flex justify-between items-center">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div className={cn(
              "flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors",
              step.id === currentStep 
                ? 'bg-blue-600 text-white border-blue-600' 
                : step.id < currentStep 
                  ? 'bg-green-600 text-white border-green-600'
                  : 'border-gray-300 text-gray-300'
            )}>
              {step.id < currentStep ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <span className="text-sm font-medium">{step.id}</span>
              )}
            </div>
            <div className="ml-3">
              <p className={cn(
                "text-sm font-medium transition-colors",
                step.id === currentStep 
                  ? 'text-blue-600' 
                  : step.id < currentStep 
                    ? 'text-green-600' 
                    : 'text-gray-500'
              )}>
                {step.title}
              </p>
              <p className="text-xs text-gray-500">{step.description}</p>
            </div>
            {index < steps.length - 1 && (
              <div className={cn(
                "flex-1 h-0.5 mx-4 transition-colors",
                step.id < currentStep ? 'bg-green-600' : 'bg-gray-300'
              )} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
