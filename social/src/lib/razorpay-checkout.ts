export type RazorpayCheckout = new (options: Record<string, unknown>) => {
  open: () => void;
  on?: (event: 'payment.failed', callback: () => void) => void;
};

let loading: Promise<RazorpayCheckout> | null = null;
export function loadRazorpayCheckout(): Promise<RazorpayCheckout> {
  const read = () => (window as Window & { Razorpay?: RazorpayCheckout }).Razorpay;
  const existing = read();
  if (existing) return Promise.resolve(existing);
  if (loading) return loading;
  loading = new Promise<RazorpayCheckout>((resolve, reject) => {
    const script = document.createElement('script');
    const finish = (error?: Error) => {
      clearTimeout(timer);
      script.onload = null;
      script.onerror = null;
      const checkout = read();
      if (!error && checkout) resolve(checkout);
      else { script.remove(); reject(error ?? new Error('Checkout could not load. Try again.')); }
    };
    const timer = setTimeout(() => finish(new Error('Checkout took too long to load. Try again.')), 15_000);
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.dataset.razorpayCheckout = 'true';
    script.onload = () => finish();
    script.onerror = () => finish(new Error('Checkout could not load. Check your connection and try again.'));
    document.body.appendChild(script);
  }).catch(error => { loading = null; throw error; });
  return loading;
}
