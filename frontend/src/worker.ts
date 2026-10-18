interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
  API_ORIGIN?: string;
}

function jsonError(status: number, detail: string): Response {
  return Response.json({ detail }, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

function configuredApiOrigin(value: string | undefined): URL | Response {
  if (!value?.trim()) {
    return jsonError(503, 'The API is not configured. Set API_ORIGIN to the HTTPS origin of your FinSight API.');
  }

  let origin: URL;
  try {
    origin = new URL(value);
  } catch {
    return jsonError(503, 'API_ORIGIN must be a valid HTTPS origin.');
  }

  const localDevelopmentHost = ['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname);
  if (
    (origin.protocol !== 'https:' && !(origin.protocol === 'http:' && localDevelopmentHost)) ||
    origin.username ||
    origin.password ||
    origin.pathname !== '/' ||
    origin.search ||
    origin.hash
  ) {
    return jsonError(503, 'API_ORIGIN must be an HTTPS origin (HTTP is permitted for local development only).');
  }

  return origin;
}

const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const incomingUrl = new URL(request.url);
    if (incomingUrl.pathname !== '/api' && !incomingUrl.pathname.startsWith('/api/')) {
      return env.ASSETS.fetch(request);
    }

    const origin = configuredApiOrigin(env.API_ORIGIN);
    if (origin instanceof Response) return origin;

    const upstreamUrl = new URL(origin);
    upstreamUrl.pathname = incomingUrl.pathname;
    upstreamUrl.search = incomingUrl.search;

    const upstreamRequest = new Request(upstreamUrl, request);
    const headers = new Headers(upstreamRequest.headers);
    headers.delete('host');
    headers.delete('origin');
    headers.delete('referer');

    try {
      return await fetch(new Request(upstreamRequest, { headers, redirect: 'manual' }));
    } catch (error) {
      console.error('FinSight API upstream request failed.', error);
      return jsonError(502, 'The FinSight API could not be reached. Check API_ORIGIN and the API service health.');
    }
  },
};

export default worker;
