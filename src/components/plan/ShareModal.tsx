'use client';

import { useState } from 'react';
import { Trip } from '@/types';
import Modal from '@/components/ui/Modal';
import { Copy, Check, Link as LinkIcon, Mail, Eye, Pencil } from 'lucide-react';

interface ShareModalProps {
  trip: Trip;
  open: boolean;
  onClose: () => void;
}

export default function ShareModal({ trip, open, onClose }: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [permission, setPermission] = useState<'view' | 'edit'>('view');

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const shareUrl = `${baseUrl}/trips/${trip.id}/plan${permission === 'edit' ? '?mode=edit' : ''}`;

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
            Share this link with friends so they can access <strong>{trip.title}</strong>.
          </p>

          {/* Permission toggle */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 mb-3">
            <button
              onClick={() => { setPermission('view'); setCopied(false); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                permission === 'view'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Eye size={14} /> View Only
            </button>
            <button
              onClick={() => { setPermission('edit'); setCopied(false); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                permission === 'edit'
                  ? 'bg-white text-orange-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Pencil size={14} /> Can Edit
            </button>
          </div>

          <p className="text-xs text-gray-400 mb-2">
            {permission === 'view'
              ? 'Recipients can view the trip plan but cannot make changes.'
              : 'Recipients can view and edit spots, times, and notes.'}
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
