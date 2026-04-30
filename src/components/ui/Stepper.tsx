'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Upload, Layers, CalendarDays, Map, Check } from 'lucide-react';

const STEPS = [
  { key: 'upload', label: 'Upload', icon: Upload, path: 'upload' },
  { key: 'manage', label: 'Manage', icon: Layers, path: 'manage' },
  { key: 'calendar', label: 'Calendar', icon: CalendarDays, path: 'calendar' },
  { key: 'plan', label: 'Plan', icon: Map, path: 'plan' },
];

interface StepperProps {
  tripId: string;
}

export default function Stepper({ tripId }: StepperProps) {
  const pathname = usePathname();
  const currentStep = STEPS.findIndex(s => pathname?.includes(`/${s.path}`));

  return (
    <div className="bg-white border-b border-gray-100">
      <div className="max-w-4xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {STEPS.map((step, i) => {
            const isActive = i === currentStep;
            const isDone = i < currentStep;
            const Icon = step.icon;

            return (
              <div key={step.key} className="flex items-center flex-1">
                <Link
                  href={`/trips/${tripId}/${step.path}`}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                    isActive
                      ? 'bg-blue-50 text-blue-600'
                      : isDone
                      ? 'text-green-600 hover:bg-green-50'
                      : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    isActive
                      ? 'bg-blue-500 text-white'
                      : isDone
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}>
                    {isDone ? <Check size={16} /> : <Icon size={16} />}
                  </div>
                  <span className="hidden sm:inline text-sm font-medium">{step.label}</span>
                </Link>

                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 rounded ${
                    i < currentStep ? 'bg-green-300' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
