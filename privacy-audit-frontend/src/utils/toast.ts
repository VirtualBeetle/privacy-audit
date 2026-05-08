export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastOptions {
  type?: ToastType;
  duration?: number;
  action?: { label: string; onClick: () => void };
}

export function toast(message: string, options: ToastOptions = {}) {
  window.dispatchEvent(
    new CustomEvent('dg-toast', {
      detail: { message, type: options.type ?? 'info', duration: options.duration ?? 4000, action: options.action },
    }),
  );
}

toast.success = (msg: string, opts?: Omit<ToastOptions, 'type'>) => toast(msg, { ...opts, type: 'success' });
toast.error   = (msg: string, opts?: Omit<ToastOptions, 'type'>) => toast(msg, { ...opts, type: 'error' });
toast.warning = (msg: string, opts?: Omit<ToastOptions, 'type'>) => toast(msg, { ...opts, type: 'warning' });
toast.info    = (msg: string, opts?: Omit<ToastOptions, 'type'>) => toast(msg, { ...opts, type: 'info' });
