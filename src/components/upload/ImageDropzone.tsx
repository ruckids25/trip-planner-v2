'use client';

import { useState, useCallback, useRef } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { formatFileSize } from '@/lib/image-utils';

interface ImageDropzoneProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
}

export default function ImageDropzone({ onFilesSelected, disabled }: ImageDropzoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const [previews, setPreviews] = useState<{ file: File; url: string }[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback((files: FileList | File[]) => {
    const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (imageFiles.length === 0) return;

    const newPreviews = imageFiles.map(file => ({
      file,
      url: URL.createObjectURL(file),
    }));

    setPreviews(prev => [...prev, ...newPreviews]);
    onFilesSelected(imageFiles);
  }, [onFilesSelected]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (!disabled) handleFiles(e.dataTransfer.files);
  }, [handleFiles, disabled]);

  const removePreview = (idx: number) => {
    setPreviews(prev => {
      URL.revokeObjectURL(prev[idx].url);
      return prev.filter((_, i) => i !== idx);
    });
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
          dragOver
            ? 'border-blue-400 bg-blue-50'
            : disabled
            ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
            : 'border-gray-300 hover:border-blue-300 hover:bg-blue-50/50'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
          disabled={disabled}
        />
        <div className="flex flex-col items-center gap-3">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
            dragOver ? 'bg-blue-100 text-blue-500' : 'bg-gray-100 text-gray-400'
          }`}>
            <Upload size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700">
              {dragOver ? 'Drop images here' : 'Drag & drop screenshots here'}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              or click to browse — supports PNG, JPG, WEBP
            </p>
          </div>
        </div>
      </div>

      {previews.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {previews.map((p, i) => (
            <div key={i} className="relative group rounded-xl overflow-hidden border border-gray-200">
              <img src={p.url} alt="" className="w-full h-32 object-cover" />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                <p className="text-white text-xs truncate">{p.file.name}</p>
                <p className="text-white/70 text-xs">{formatFileSize(p.file.size)}</p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); removePreview(i); }}
                className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
