'use client';

import { useState } from 'react';
import { Trip } from '@/types';
import Modal from '@/components/ui/Modal';
import { Copy, Check, Link as LinkIcon, Mail } from 'lucide-react';

interface ShareModalProps {
  trip: Trip;
  open: boolean;
  onClose: () => void;
}

export default function ShareModal({ trip, open, onClose }: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/trips/${trip.id}/plan` : '';

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal open={open} onClose={onClose} title="Share Trip">
      <div className="space-y-4">
        <div>
          <p className="text-sm text-gray-600 mb-3">
            Share this link with friends so they can view and collaborate on <strong>{trip.title}</strong>.
          </p>

          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-2.5 border border-gray-200">
              <LinkIcon size={14} className="text-gray-400" />
              <span className="text-sm text-gray-600 truncate">{shareUrl}</span>
            </div>
            <button
              onClick={handleCopy}
              className={`p-2.5 rounded-xl transition-colors ${
                copied ? 'bg-green-100 text-green-600' : 'bg-blue-50 text-blue-500 hover:bg-blue-100'
              }`}
            >
              {copied ? <Check size={18} /> : <Copy size={18} />}
            </button>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-4">
          <p className="text-xs text-gray-500 mb-3">Or share via:</p>
          <div className="flex gap-2">
            <button
              onClick={() => window.open(`mailto:?subject=${encodeURIComponent(trip.title)}&body=${encodeURIComponent(`Check out my trip plan: ${shareUrl}`)}`, '_blank')}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-xl text-sm text-gray-700 hover:bg-gray-200 transition-colors"
            >
              <Mail size={14} /> Email
            </button>
            <button
              onClick={() => window.open(`https://line.me/R/msg/text/?${encodeURIComponent(`${trip.title}\n${shareUrl}`)}`, '_blank')}
              className="flex items-center gap-2 px-4 py-2 bg-green-100 rounded-xl text-sm text-green-700 hover:bg-green-200 transition-colors"
            >
              LINE
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
