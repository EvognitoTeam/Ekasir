/* eslint-disable @next/next/no-img-element */
'use client';

import {
  FormEvent,
  useMemo,
  useState,
} from 'react';

import {
  CheckCircle2,
  Clock3,
  Copy,
  Loader2,
  Play,
  RotateCcw,
  Server,
  ShieldCheck,
  TerminalSquare,
  XCircle,
} from 'lucide-react';

type HttpMethod =
  | 'GET'
  | 'POST'
  | 'PUT'
  | 'PATCH'
  | 'DELETE';

type ApiPreset = {
  label: string;
  method: HttpMethod;
  path: string;
  body?: string;
  description: string;
};

const PRESETS: ApiPreset[] = [
  {
    label: 'Auth · Login',
    method: 'POST',
    path: '/v1/auth/login',
    description: 'Login mobile dan ambil access token.',
    body: JSON.stringify(
      {
        email: '',
        password: '',
      },
      null,
      2,
    ),
  },
  {
    label: 'Auth · Refresh',
    method: 'POST',
    path: '/v1/auth/refresh',
    description: 'Refresh access token.',
    body: JSON.stringify(
      {
        refreshToken: '',
      },
      null,
      2,
    ),
  },
  {
    label: 'Auth · Me',
    method: 'GET',
    path: '/v1/auth/me',
    description: 'Cek user yang sedang terautentikasi.',
  },
  {
    label: 'POS · Bootstrap',
    method: 'GET',
    path: '/v1/pos/bootstrap',
    description: 'Ambil data awal aplikasi POS mobile.',
  },
  {
    label: 'POS · Products',
    method: 'GET',
    path: '/v1/pos/products?page=1&limit=50',
    description: 'Ambil daftar produk dengan pagination.',
  },
  {
    label: 'POS · Tables',
    method: 'GET',
    path: '/v1/pos/tables',
    description: 'Ambil daftar meja.',
  },
  {
    label: 'POS · Orders',
    method: 'GET',
    path: '/v1/pos/orders?page=1&limit=20',
    description: 'Ambil daftar order.',
  },
  {
    label: 'Members · Search',
    method: 'GET',
    path: '/v1/members/search?query=085176773826',
    description: 'Cari member berdasarkan nomor / query.',
  },
  {
    label: 'Members · Identify',
    method: 'POST',
    path: '/v1/members/identify',
    description: 'Identifikasi member.',
    body: JSON.stringify(
      {
        query: '',
      },
      null,
      2,
    ),
  },
  {
    label: 'Members · Points Config',
    method: 'GET',
    path: '/v1/members/points/config',
    description: 'Ambil konfigurasi loyalty / points.',
  },
];

function getDefaultBaseUrl() {
  if (
    typeof window !== 'undefined' &&
    window.location.hostname.includes(
      'kalooposlocal.test',
    )
  ) {
    return 'http://api.kalooposlocal.test:3000';
  }

  return 'https://api.kaloopos.com';
}

function prettyJson(value: unknown) {
  try {
    return JSON.stringify(
      value,
      null,
      2,
    );
  } catch {
    return String(value);
  }
}

function normalizeUrl(
  baseUrl: string,
  path: string,
) {
  const base =
    baseUrl.replace(
      /\/+$/,
      '',
    );

  const target =
    path.startsWith('/')
      ? path
      : `/${path}`;

  return `${base}${target}`;
}

export default function ApiTestPage() {
  const [baseUrl, setBaseUrl] =
    useState(
      getDefaultBaseUrl,
    );

  const [method, setMethod] =
    useState<HttpMethod>(
      'POST',
    );

  const [path, setPath] =
    useState(
      '/v1/auth/login',
    );

  const [token, setToken] =
    useState('');

  const [body, setBody] =
    useState(
      JSON.stringify(
        {
          email: '',
          password: '',
        },
        null,
        2,
      ),
    );

  const [
    responseBody,
    setResponseBody,
  ] = useState('');

  const [
    responseHeaders,
    setResponseHeaders,
  ] = useState('');

  const [
    responseStatus,
    setResponseStatus,
  ] = useState<number | null>(
    null,
  );

  const [
    responseStatusText,
    setResponseStatusText,
  ] = useState('');

  const [duration, setDuration] =
    useState<number | null>(
      null,
    );

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState('');

  const requestUrl =
    useMemo(
      () =>
        normalizeUrl(
          baseUrl,
          path,
        ),
      [baseUrl, path],
    );

  const hasBody =
    method !== 'GET';

  function applyPreset(
    preset: ApiPreset,
  ) {
    setMethod(preset.method);
    setPath(preset.path);
    setBody(
      preset.body ?? '',
    );
    setResponseBody('');
    setResponseHeaders('');
    setResponseStatus(null);
    setResponseStatusText('');
    setDuration(null);
    setError('');
  }

  async function runRequest(
    event?: FormEvent,
  ) {
    event?.preventDefault();

    setLoading(true);
    setError('');
    setResponseBody('');
    setResponseHeaders('');
    setResponseStatus(null);
    setResponseStatusText('');
    setDuration(null);

    const startedAt =
      performance.now();

    try {
      const headers =
        new Headers();

      headers.set(
        'Accept',
        'application/json',
      );

      if (hasBody) {
        headers.set(
          'Content-Type',
          'application/json',
        );
      }

      if (token.trim()) {
        headers.set(
          'Authorization',
          `Bearer ${token.trim()}`,
        );
      }

      const response =
        await fetch(
          requestUrl,
          {
            method,
            headers,
            body:
              hasBody &&
              body.trim()
                ? body
                : undefined,
          },
        );

      const endedAt =
        performance.now();

      setDuration(
        Math.round(
          endedAt -
            startedAt,
        ),
      );

      setResponseStatus(
        response.status,
      );

      setResponseStatusText(
        response.statusText,
      );

      const headersObject =
        Object.fromEntries(
          response.headers.entries(),
        );

      setResponseHeaders(
        prettyJson(
          headersObject,
        ),
      );

      const raw =
        await response.text();

      if (!raw) {
        setResponseBody(
          '(empty response)',
        );
        return;
      }

      try {
        const parsed =
          JSON.parse(raw);

        setResponseBody(
          prettyJson(
            parsed,
          ),
        );

        const possibleToken =
          parsed?.accessToken ??
          parsed?.token ??
          parsed?.data
            ?.accessToken ??
          parsed?.data?.token;

        if (
          typeof possibleToken ===
            'string' &&
          possibleToken
        ) {
          setToken(
            possibleToken,
          );
        }
      } catch {
        setResponseBody(raw);
      }
    } catch (requestError) {
      const endedAt =
        performance.now();

      setDuration(
        Math.round(
          endedAt -
            startedAt,
        ),
      );

      setError(
        requestError instanceof
          Error
          ? requestError.message
          : String(
              requestError,
            ),
      );
    } finally {
      setLoading(false);
    }
  }

  async function copyResponse() {
    if (!responseBody) {
      return;
    }

    await navigator.clipboard.writeText(
      responseBody,
    );
  }

  function resetResponse() {
    setResponseBody('');
    setResponseHeaders('');
    setResponseStatus(null);
    setResponseStatusText('');
    setDuration(null);
    setError('');
  }

  const statusOk =
    responseStatus !== null &&
    responseStatus >= 200 &&
    responseStatus < 300;

  return (
    <main className="min-h-screen bg-[#f7f7f5] text-[#111111]">
      <div className="mx-auto max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8">
        <header className="mb-5 flex flex-col gap-4 rounded-[28px] border border-black/[0.07] bg-white p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-black text-white">
              <TerminalSquare className="h-5 w-5" />
            </div>

            <div>
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-black tracking-[-0.04em] sm:text-3xl">
                  KALOO API Tester
                </h1>

                <span className="rounded-full bg-black px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-white">
                  Mobile API
                </span>
              </div>

              <p className="max-w-3xl text-sm leading-6 text-black/50">
                Test endpoint
                {' '}
                <strong className="text-black/70">
                  api.kaloopos.com/v1/*
                </strong>
                {' '}
                langsung dari browser.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-xs font-bold text-black/50">
            <span className="inline-flex items-center gap-2 rounded-full bg-stone-100 px-3 py-2">
              <Server className="h-3.5 w-3.5" />
              {baseUrl}
            </span>

            <span className="inline-flex items-center gap-2 rounded-full bg-stone-100 px-3 py-2">
              <ShieldCheck className="h-3.5 w-3.5" />
              Bearer Token
            </span>
          </div>
        </header>

        <div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="rounded-[28px] border border-black/[0.07] bg-white p-4 shadow-sm">
            <div className="mb-3 px-1">
              <h2 className="text-sm font-black">
                Endpoint cepat
              </h2>

              <p className="mt-1 text-xs leading-5 text-black/40">
                Pilih endpoint lalu edit parameter sesuai kebutuhan.
              </p>
            </div>

            <div className="space-y-2">
              {PRESETS.map(
                (preset) => (
                  <button
                    key={`${preset.method}-${preset.path}`}
                    type="button"
                    onClick={() =>
                      applyPreset(
                        preset,
                      )
                    }
                    className="w-full rounded-2xl border border-black/[0.06] p-3 text-left transition hover:border-black/20 hover:bg-stone-50 active:scale-[0.99]"
                  >
                    <div className="mb-1 flex items-center gap-2">
                      <span className="rounded-md bg-black px-1.5 py-0.5 text-[9px] font-black text-white">
                        {preset.method}
                      </span>

                      <span className="text-xs font-black">
                        {preset.label}
                      </span>
                    </div>

                    <p className="break-all font-mono text-[10px] leading-4 text-black/40">
                      {preset.path}
                    </p>

                    <p className="mt-1.5 text-[10px] leading-4 text-black/45">
                      {
                        preset.description
                      }
                    </p>
                  </button>
                ),
              )}
            </div>
          </aside>

          <section className="space-y-5">
            <form
              onSubmit={runRequest}
              className="rounded-[28px] border border-black/[0.07] bg-white p-5 shadow-sm"
            >
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-black tracking-[-0.03em]">
                    Request
                  </h2>

                  <p className="mt-1 text-xs text-black/40">
                    Base URL dan path dapat diubah manual.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={
                    resetResponse
                  }
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-black/10 px-3 text-xs font-black transition hover:bg-stone-50"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset response
                </button>
              </div>

              <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
                <label className="block">
                  <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.12em] text-black/45">
                    Method
                  </span>

                  <select
                    value={method}
                    onChange={(
                      event,
                    ) =>
                      setMethod(
                        event
                          .target
                          .value as HttpMethod,
                      )
                    }
                    className="h-12 w-full rounded-xl border border-black/10 bg-white px-3 text-sm font-black outline-none transition focus:border-black"
                  >
                    {[
                      'GET',
                      'POST',
                      'PUT',
                      'PATCH',
                      'DELETE',
                    ].map(
                      (value) => (
                        <option
                          key={
                            value
                          }
                          value={
                            value
                          }
                        >
                          {value}
                        </option>
                      ),
                    )}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.12em] text-black/45">
                    API Base URL
                  </span>

                  <input
                    value={baseUrl}
                    onChange={(
                      event,
                    ) =>
                      setBaseUrl(
                        event
                          .target
                          .value,
                      )
                    }
                    className="h-12 w-full rounded-xl border border-black/10 bg-white px-3 font-mono text-sm outline-none transition focus:border-black"
                    placeholder="http://api.kalooposlocal.test:3000"
                  />
                </label>
              </div>

              <label className="mt-4 block">
                <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.12em] text-black/45">
                  Endpoint Path
                </span>

                <input
                  value={path}
                  onChange={(
                    event,
                  ) =>
                    setPath(
                      event.target
                        .value,
                    )
                  }
                  className="h-12 w-full rounded-xl border border-black/10 bg-white px-3 font-mono text-sm outline-none transition focus:border-black"
                  placeholder="/v1/pos/bootstrap"
                />
              </label>

              <div className="mt-3 rounded-xl bg-stone-100 px-3 py-2.5">
                <p className="break-all font-mono text-xs font-bold text-black/60">
                  {requestUrl}
                </p>
              </div>

              <label className="mt-4 block">
                <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.12em] text-black/45">
                  Bearer Token
                </span>

                <textarea
                  value={token}
                  onChange={(
                    event,
                  ) =>
                    setToken(
                      event.target
                        .value,
                    )
                  }
                  rows={3}
                  className="w-full resize-y rounded-xl border border-black/10 bg-white p-3 font-mono text-xs leading-5 outline-none transition focus:border-black"
                  placeholder="Kosongkan untuk endpoint public. Token hasil login akan otomatis dimasukkan jika format response dikenali."
                />
              </label>

              {hasBody && (
                <label className="mt-4 block">
                  <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.12em] text-black/45">
                    JSON Body
                  </span>

                  <textarea
                    value={body}
                    onChange={(
                      event,
                    ) =>
                      setBody(
                        event
                          .target
                          .value,
                      )
                    }
                    rows={10}
                    spellCheck={
                      false
                    }
                    className="w-full resize-y rounded-xl border border-black/10 bg-[#111111] p-4 font-mono text-xs leading-5 text-white outline-none"
                    placeholder='{ "key": "value" }'
                  />
                </label>
              )}

              <button
                type="submit"
                disabled={loading}
                className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-black px-5 text-sm font-black text-white transition hover:bg-black/85 active:scale-[0.995] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Mengirim...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 fill-current" />
                    Send Request
                  </>
                )}
              </button>
            </form>

            <div className="rounded-[28px] border border-black/[0.07] bg-white p-5 shadow-sm">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-black tracking-[-0.03em]">
                    Response
                  </h2>

                  <p className="mt-1 text-xs text-black/40">
                    Status, response headers, dan response body.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {responseStatus !==
                    null && (
                    <span
                      className={[
                        'inline-flex h-9 items-center gap-2 rounded-full px-3 text-xs font-black',
                        statusOk
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-red-50 text-red-700',
                      ].join(
                        ' ',
                      )}
                    >
                      {statusOk ? (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5" />
                      )}

                      {
                        responseStatus
                      }{' '}
                      {
                        responseStatusText
                      }
                    </span>
                  )}

                  {duration !==
                    null && (
                    <span className="inline-flex h-9 items-center gap-2 rounded-full bg-stone-100 px-3 text-xs font-black text-black/55">
                      <Clock3 className="h-3.5 w-3.5" />
                      {duration} ms
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={
                      copyResponse
                    }
                    disabled={
                      !responseBody
                    }
                    className="inline-flex h-9 items-center gap-2 rounded-full border border-black/10 px-3 text-xs font-black disabled:opacity-30"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copy
                  </button>
                </div>
              </div>

              {error && (
                <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-red-700">
                    Request Error
                  </p>

                  <p className="mt-2 break-words font-mono text-xs leading-5 text-red-700">
                    {error}
                  </p>

                  <p className="mt-3 text-xs leading-5 text-red-700/70">
                    Jika browser menampilkan
                    CORS error, pastikan
                    origin halaman tester
                    diizinkan oleh proxy /
                    API server.
                  </p>
                </div>
              )}

              <div className="grid gap-4 lg:grid-cols-2">
                <div>
                  <div className="mb-2 text-[11px] font-black uppercase tracking-[0.12em] text-black/45">
                    Headers
                  </div>

                  <pre className="min-h-[220px] overflow-auto rounded-2xl bg-[#111111] p-4 font-mono text-[11px] leading-5 text-white">
                    {responseHeaders ||
                      '// Response headers akan muncul di sini'}
                  </pre>
                </div>

                <div>
                  <div className="mb-2 text-[11px] font-black uppercase tracking-[0.12em] text-black/45">
                    Body
                  </div>

                  <pre className="min-h-[220px] max-h-[600px] overflow-auto whitespace-pre-wrap break-words rounded-2xl bg-[#111111] p-4 font-mono text-[11px] leading-5 text-white">
                    {responseBody ||
                      '// Response body akan muncul di sini'}
                  </pre>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
