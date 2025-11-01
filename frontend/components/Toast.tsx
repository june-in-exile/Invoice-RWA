import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ToastProps {
  message: string;
  show: boolean;
}

const Toast: React.FC<ToastProps> = ({ message, show }) => {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, bottom: '4rem' }}
          animate={{ opacity: 1, bottom: '6rem' }}
          exit={{ opacity: 0, bottom: '4rem' }}
          transition={{ duration: 0.3 }}
          className="fixed left-1/2 -translate-x-1/2 bg-gray-800 text-white text-sm font-medium px-4 py-2 rounded-lg z-50 pointer-events-none"
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Toast;
