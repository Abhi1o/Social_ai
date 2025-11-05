'use client';

import { useEffect } from 'react';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'react-hot-toast';
import { useUIStore } from '@/store/ui';
import { useAuthStore } from '@/store/auth';
import { detectDevice, isTouchDevice } from '@/lib/utils';

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const { setIsMobile } = useUIStore();
  const { refreshProfile } = useAuthStore();

  useEffect(() => {
    // Detect device type
    const device = detectDevice();
    setIsMobile(device === 'mobile');

    // Add touch class to body if touch device
    if (isTouchDevice()) {
      document.body.classList.add('touch-device');
    }

    // Handle resize
    const handleResize = () => {
      const newDevice = detectDevice();
      setIsMobile(newDevice === 'mobile');
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setIsMobile]);

  useEffect(() => {
    // Try to refresh profile on app load
    const token = localStorage.getItem('auth_token');
    if (token) {
      refreshProfile().catch(() => {
        // Silently fail - user will be redirected to login if needed
      });
    }
  }, [refreshProfile]);

  useEffect(() => {
    // Register service worker for PWA
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('SW registered: ', registration);
        })
        .catch((registrationError) => {
          console.log('SW registration failed: ', registrationError);
        });
    }
  }, []);

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
      
      {/* Toast notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '12px',
            color: 'inherit',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: 'white',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: 'white',
            },
          },
        }}
      />
    </ThemeProvider>
  );
}