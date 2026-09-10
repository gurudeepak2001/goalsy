type PlaidSuccessMetadata = {
  institution?: { institution_id: string; name: string } | null;
};

type PlaidExitMetadata = {
  status?: string;
};

type PlaidHandler = {
  open: () => void;
  destroy: () => void;
};

type PlaidFactory = {
  create: (config: {
    token: string;
    onSuccess: (publicToken: string, metadata: PlaidSuccessMetadata) => void;
    onExit: (error: unknown, metadata: PlaidExitMetadata) => void;
  }) => PlaidHandler;
};

declare global {
  interface Window {
    Plaid?: PlaidFactory;
  }
}

let plaidScriptPromise: Promise<PlaidFactory> | null = null;

export function loadPlaidLink(): Promise<PlaidFactory> {
  if (window.Plaid) return Promise.resolve(window.Plaid);
  if (plaidScriptPromise) return plaidScriptPromise;

  plaidScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js';
    script.async = true;
    script.onload = () => {
      if (window.Plaid) resolve(window.Plaid);
      else reject(new Error('Plaid Link did not initialize'));
    };
    script.onerror = () => reject(new Error('Unable to load Plaid Link'));
    document.head.appendChild(script);
  });

  return plaidScriptPromise;
}