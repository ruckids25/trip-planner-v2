'use client';

import { CheckCircle, Loader2, AlertCircle, Search } from 'lucide-react';

export type ProcessingStatus = 'pending' | 'ocr' | 'searching' | 'done' | 'error';

export interface ProcessingItem {
  id: string;
  fileName: string;
  status: ProcessingStatus;
  placeNames?: string[];
  resolvedCount?: number;
  totalCount?: number;
  error?: string;
}

interface ProcessingCardProps {
  item: ProcessingItem;
}

export default function ProcessingCard({ item }: ProcessingCardProps) {
  const statusConfig = {
    pending: { icon: <div className="w-4 h-4 rounded-full bg-gray-300" />, text: 'Waiting...', color: 'text-gray-400' },
    ocr: { icon: <Loader2 size={16} className="animate-spin text-blue-500" />, text: 'Reading text from image...', color: 'text-blue-600' },
    searching: { icon: <Search size={16} className="animate-pulse text-purple-500" />, text: `Finding places (${item.resolvedCount || 0}/${item.totalCount || 0})`, color: 'text-purple-600' },
    done: { icon: <CheckCircle size={16} className="text-green-500" />, text: `Found ${item.resolvedCount || 0} places`, color: 'text-green-600' },
    error: { icon: <AlertCircle size={16} className="text-red-500" />, text: item.error || 'Error processing', color: 'text-red-600' },
  };

  const config = statusConfig[item.status];

  return (
    <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100">
      <div className="flex-shrink-0">{config.icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{item.fileName}</p>
        <p className={`text-xs ${config.color}`}>{config.text}</p>
      </div>
      {item.status === 'searching' && item.totalCount && (
        <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-purple-500 rounded-full transition-all duration-300"
            style={{ width: `${((item.resolvedCount || 0) / item.totalCount) * 100}%` }}
          />
        </div>
      )}
    </div>
  );
}
