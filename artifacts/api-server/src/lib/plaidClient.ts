const PLAID_BASE_URLS = {
  sandbox: "https://sandbox.plaid.com",
  development: "https://development.plaid.com",
  production: "https://production.plaid.com",
} as const;

type PlaidEnvironment = keyof typeof PLAID_BASE_URLS;

export interface PlaidAccountData {
  account_id: string;
  name: string;
  official_name: string | null;
  mask: string | null;
  type: string;
  subtype: string | null;
  balances: {
    available: number | null;
    current: number | null;
    iso_currency_code: string | null;
  };
}

function plaidConfig() {
  const clientId = process.env.PLAID_CLIENT_ID;
  const secret = process.env.PLAID_SECRET;
  const environment = (process.env.PLAID_ENV ?? "sandbox") as PlaidEnvironment;
  if (!clientId || !secret) throw new Error("Plaid credentials are not configured");
  if (!PLAID_BASE_URLS[environment]) throw new Error(`Unsupported PLAID_ENV: ${environment}`);
  return { clientId, secret, baseUrl: PLAID_BASE_URLS[environment] };
}

async function plaidRequest<T>(path: string, payload: Record<string, unknown>): Promise<T> {
  const { clientId, secret, baseUrl } = plaidConfig();
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: clientId, secret, ...payload }),
  });
  const data = await response.json() as T & { error_message?: string; error_code?: string };
  if (!response.ok) {
    throw new Error(data.error_message ?? data.error_code ?? `Plaid request failed (${response.status})`);
  }
  return data;
}

export async function createPlaidLinkToken(userId: string): Promise<string> {
  const data = await plaidRequest<{ link_token: string }>("/link/token/create", {
    client_name: "Goalsy",
    language: "en",
    country_codes: ["US"],
    products: ["transactions", "liabilities"],
    user: { client_user_id: userId },
  });
  return data.link_token;
}

export function exchangePlaidPublicToken(publicToken: string) {
  return plaidRequest<{ access_token: string; item_id: string }>("/item/public_token/exchange", {
    public_token: publicToken,
  });
}

export function getPlaidItem(accessToken: string) {
  return plaidRequest<{ item: { item_id: string; institution_id: string | null } }>("/item/get", {
    access_token: accessToken,
  });
}

export function getPlaidInstitution(institutionId: string) {
  return plaidRequest<{ institution: { institution_id: string; name: string } }>("/institutions/get_by_id", {
    institution_id: institutionId,
    country_codes: ["US"],
  });
}

export function getPlaidAccounts(accessToken: string) {
  return plaidRequest<{ accounts: PlaidAccountData[] }>("/accounts/get", {
    access_token: accessToken,
  });
}

export function removePlaidItem(accessToken: string) {
  return plaidRequest<{ request_id: string }>("/item/remove", { access_token: accessToken });
}