// Fallback data for Cloudflare environment when database is not available
export const FALLBACK_DATA = {
  plans: [
    {
      id: 'fallback-1',
      name: 'Basic Plan',
      description: 'Basic planning features',
      features: ['Basic planning', 'Up to 5 users', 'Standard support'],
      price: 0,
      currency: 'USD',
      interval: 'month',
    },
    {
      id: 'fallback-2',
      name: 'Pro Plan',
      description: 'Advanced planning features',
      features: ['Advanced planning', 'Unlimited users', 'Priority support', 'Custom integrations'],
      price: 29,
      currency: 'USD',
      interval: 'month',
    }
  ],
  user: {
    id: 'fallback-user',
    name: 'Demo User',
    email: 'demo@example.com',
    image: 'https://www.gravatar.com/avatar/demo?d=identicon',
  }
};

export const isCloudflareEnvironment = () => {
  return process.env.NEXT_PUBLIC_VERCEL_ENV !== 'development' && 
         typeof process.env.NEXT_PUBLIC_VERCEL_URL === 'undefined';
};

export const shouldUseFallbackData = () => {
  return isCloudflareEnvironment();
}; 