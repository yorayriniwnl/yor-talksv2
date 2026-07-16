import React from 'react';

export function lazyWithRetry(
  factory: () => Promise<{ default: React.ComponentType<any> }>,
  maxRetries = 2,
  initialDelay = 300,
) {
  const wrappedFactory = () => {
    let attempts = 0;

    const attempt = (): Promise<{ default: React.ComponentType<any> }> =>
      factory().catch((err) => {
        if (attempts >= maxRetries) throw err;
        const delay = initialDelay * Math.pow(2, attempts);
        attempts += 1;
        return new Promise((resolve) => setTimeout(resolve, delay)).then(attempt);
      });

    return attempt();
  };

  return React.lazy(wrappedFactory);
}
