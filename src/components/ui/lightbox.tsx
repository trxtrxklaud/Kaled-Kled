import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, Printer } from 'lucide-react';
import { Button } from './button';
import { triggerPrint } from '../../lib/utils';

interface LightboxProps {
  isOpen: boolean;
  src: string | null;
  onClose: () => void;
  onDelete?: () => void;
}

export const Lightbox: React.FC<LightboxProps> = ({ isOpen, src, onClose, onDelete }) => {
  if (!src) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
          onClick={onClose}
        >
          <div className="absolute top-4 right-4 flex gap-4">
            <Button
              variant="outline"
              size="icon"
              className="bg-white/10 text-white border-white/20 hover:bg-white/20 hover:text-white rounded-full print:hidden"
              onClick={(e) => {
                e.stopPropagation();
                triggerPrint();
              }}
              title="نطبعها (Print)"
            >
              <Printer className="w-5 h-5" />
            </Button>
            {onDelete && (
              <Button
                variant="destructive"
                size="icon"
                className="rounded-full shadow-lg print:hidden"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                  onClose();
                }}
                title="نحذفها (Delete)"
              >
                <Trash2 className="w-5 h-5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20 rounded-full print:hidden"
              onClick={onClose}
            >
              <X className="w-6 h-6" />
            </Button>
          </div>
          
          <motion.img
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", damping: 20 }}
            src={src}
            alt="Preview"
            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};
