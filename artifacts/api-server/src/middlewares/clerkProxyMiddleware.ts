/**
 * Clerk Frontend API — Transparent CORS Proxy
 *
 * Problem: the native iOS WKWebView loads the app from capacitor://localhost.
 * Clerk's FAPI lives at clerk.<your-domain> (derived from the publishable key).
 * capacitor://localhost is not in Clerk's allowed-origins list, so direct
 * FAPI calls from the WebView are blocked by CORS.
 *
 * Solution: the native app routes ALL Clerk requests through this server at
 * /api/__clerk/*.  We forward them verbatim to Clerk's actual FAPI domain and
 * echo back the response with the caller's Origin in ACAO so WKWebView accepts
 * it.  No Clerk-Proxy-Url or Clerk-Secret-Key headers are added — those headers
 * invoke Clerk's "official proxy URL" feature which requires the proxy domain to
 * be registered in the Clerk dashboard, returning 400 when it isn't.  Instead
 * we act as a plain CORS shim: same bytes in, same bytes out, correct CORS
 * headers added.
 *
 * IMPORTANT:
 * - Only active in production (NODE_ENV=production).
 * - Must be mounted BEFORE express.json() middleware so the body is not
 *   consumed before it can be forwarded.
 *
 * Usage in app.ts:
 *   import { CLERK_PROXY_PATH, clerkProxyMiddleware } from "./middlewares/clerkProxyMiddleware";
 *   app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());
 */

import type { IncomingHttpHeaders } from 'http';
import type { RequestHandler } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

export const CLERK_PROXY_PATH = '/api/__clerk';

/**
 * Derive the Clerk FAPI base URL from the publishable key.
 *
 * A publishable key has the form:
 *   pk_live_<base64url( "clerk.<domain>$" )>
 *   pk_test_<base64url( "clerk.<domain>$" )>
 *
 * Decoding gives "clerk.<domain>$".  Stripping "clerk." prefix and "$" suffix
 * yields the bare domain; prepending https:// gives the FAPI origin.
 *
 * Example:
 *   pk_live_Y2xlcmsuZ29hbHN5LWZpbmFuY2UtdWkucmVwbGl0LmFwcCQ
 *   → base64url decode → "clerk.goalsy-finance-ui.replit.app$"
 *   → "https://clerk.goalsy-finance-ui.replit.app"
 *
 * Falls back to the generic Clerk FAPI if the key is missing or malformed.
 */
function fapiUrlFromPublishableKey(pk: string): string {
  try {
    if (!pk) return 'https://frontend-api.clerk.dev';
    const b64url = pk.replace(/^pk_(live|test)_/, '');
    // base64url → standard base64
    const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = Buffer.from(b64, 'base64').toString('utf8');
    // decoded = "clerk.<domain>$"
    const domain = decoded.replace(/\$$/, '');
    if (!domain || !domain.includes('.')) return 'https://frontend-api.clerk.dev';
    return `https://${domain}`;
  } catch {
    return 'https://frontend-api.clerk.dev';
  }
}

/**
 * Returns the first effective public hostname for the given request,
 * preferring x-forwarded-host over the Host header so callers behind a
 * proxy see the original client-facing host.
 *
 * x-forwarded-host can take three shapes:
 *   - undefined (no proxy involved)
 *   - a single string (one proxy hop)
 *   - a comma-delimited string when an upstream appended rather than
 *     replaced the header (Node folds duplicate headers this way), or a
 *     string[] in some Express typings
 * In the multi-value case, the leftmost value is the original client-
 * facing host. Take that one in all forms. Exported so that app.ts
 * (clerkMiddleware callback) and this proxy middleware agree on which
 * hostname is canonical — otherwise multi-domain/custom-domain flows
 * break.
 */
export function getClerkProxyHost(req: {
  headers: IncomingHttpHeaders;
}): string | undefined {
  const forwarded = req.headers['x-forwarded-host'];
  const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  const firstHop = raw?.split(',')[0]?.trim();
  return firstHop || req.headers.host?.trim() || undefined;
}

export function clerkProxyMiddleware(): RequestHandler {
  // Only run proxy in production — dev instances use direct Clerk calls.
  if (process.env.NODE_ENV !== 'production') {
    return (_req, _res, next) => next();
  }

  const publishableKey = process.env.CLERK_PUBLISHABLE_KEY ?? '';
  const clerkFapi = fapiUrlFromPublishableKey(publishableKey);
  console.log(`[clerk-proxy] FAPI target: ${clerkFapi}`);

  // Build the inner proxy once.
  const proxy = createProxyMiddleware({
    target: clerkFapi,
    changeOrigin: true,
    // Take over the response so it can be re-sent with a Content-Length (see
    // proxyRes); the deployment edge rejects chunked proxied responses.
    selfHandleResponse: true,
    pathRewrite: (path: string) =>
      path.replace(new RegExp(`^${CLERK_PROXY_PATH}`), ''),
    on: {
      proxyReq: (proxyReq, req) => {
        // ── Transparent CORS shim — NO Clerk-specific proxy headers ──────────
        // Do NOT add Clerk-Proxy-Url or Clerk-Secret-Key here.
        //
        // Clerk-Proxy-Url triggers Clerk's "official proxy URL" feature, which
        // requires the proxy domain to be pre-registered in the Clerk dashboard.
        // Without that registration Clerk FAPI returns 400 Bad Request.
        //
        // Clerk-Secret-Key is a server-side credential and is unnecessary for
        // transparent forwarding of front-end API calls.  Omitting it keeps
        // this proxy stateless and non-privileged.
        //
        // Only forward the client IP so Clerk's rate-limiting and audit logs
        // see the real caller rather than this server's address.
        const xff = req.headers['x-forwarded-for'];
        const clientIp =
          (Array.isArray(xff) ? xff[0] : xff)?.split(',')[0]?.trim() ||
          req.socket?.remoteAddress ||
          '';
        if (clientIp) {
          proxyReq.setHeader('X-Forwarded-For', clientIp);
        }

        const origin = req.headers['origin'] ?? '(no-origin)';
        console.log(`[clerk-proxy] → ${req.method} ${req.path} | origin: ${origin}`);
      },

      // Clerk's dynamic FAPI responses (/v1/environment, /v1/client, JWKS, …)
      // arrive without a Content-Length, so relaying them would use
      // Transfer-Encoding: chunked — which the deployment edge (Cloud Run)
      // rejects, turning the app's 200 into a 500.  Buffer only those so they
      // can be re-sent with a Content-Length; the body is forwarded untouched
      // so Content-Encoding is preserved.  Responses that already carry a
      // Content-Length (e.g. /npm/* JS assets) stream through without
      // buffering.
      proxyRes: (proxyRes, req, res) => {
        const status = proxyRes.statusCode ?? 502;
        console.log(`[clerk-proxy] ← ${status} ${req.method} ${req.path}`);

        const headers = { ...proxyRes.headers };
        // Transfer-Encoding/Connection are hop-by-hop (RFC 7230 §6.1).
        delete headers['transfer-encoding'];
        delete headers['connection'];
        delete headers['keep-alive'];

        // Clerk's FAPI sets CORS for its own web origins but not for
        // capacitor://localhost (iOS WKWebView origin).  Override so every
        // native client can read proxy responses without CORS errors.
        const requestOrigin = req.headers['origin'] as string | undefined;
        if (requestOrigin) {
          headers['access-control-allow-origin'] = requestOrigin;
          headers['access-control-allow-credentials'] = 'true';
          headers['vary'] = 'Origin';
        }

        // Content-Length is forbidden on 1xx/204; HEAD/304 may keep theirs.
        if (status < 200 || status === 204) {
          delete headers['content-length'];
        }

        const bodyless =
          req.method === 'HEAD' ||
          status < 200 ||
          status === 204 ||
          status === 304;
        if (headers['content-length'] !== undefined || bodyless) {
          res.writeHead(status, headers);
          proxyRes.on('error', () => res.destroy());
          proxyRes.pipe(res);
          return;
        }

        const chunks: Buffer[] = [];
        proxyRes.on('data', (chunk: Buffer) => chunks.push(chunk));
        proxyRes.on('end', () => {
          const body = Buffer.concat(chunks);
          headers['content-length'] = String(body.length);
          res.writeHead(status, headers);
          res.end(body);
        });
        proxyRes.on('error', () => {
          if (!res.headersSent) {
            res.writeHead(502, { 'content-length': '0' });
          }
          res.end();
        });
      },
    },
  }) as RequestHandler;

  // Answer OPTIONS preflight from the iOS WKWebView (capacitor://localhost)
  // directly — forwarding OPTIONS to Clerk FAPI returns CORS for its own
  // origin, not the native origin, causing the WebView to block the preflight.
  return (req, res, next) => {
    if (req.method === 'OPTIONS') {
      const origin = (req.headers['origin'] as string | undefined) || '*';
      res.writeHead(204, {
        'access-control-allow-origin': origin,
        'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
        'access-control-allow-headers': '*',
        'access-control-allow-credentials': 'true',
        'access-control-max-age': '86400',
        'content-length': '0',
      });
      res.end();
      return;
    }
    return proxy(req, res, next);
  };
}
