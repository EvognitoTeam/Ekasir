"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Languages,
  Loader2,
  Lock,
  Mail,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { KALOO_BRAND } from "@/config/brand";
import { useLanguageStore } from "@/store/language.store";

type Locale = "id" | "en";

const copy = {
  id: {
    back: "Kembali ke beranda",
    language: "Bahasa",
    welcome: "Selamat Datang",
    subtitle: "Masuk ke akun KALOO untuk mengelola operasional bisnis Anda.",
    email: "Alamat Email",
    password: "Kata Sandi",
    forgot: "Lupa Sandi?",
    login: "Masuk Sekarang",
    noAccount: "Belum punya akun?",
    register: "Daftar Sekarang",
    showPassword: "Tampilkan kata sandi",
    hidePassword: "Sembunyikan kata sandi",
    required: "Email dan kata sandi wajib diisi.",
    loginFailed: "Login gagal. Periksa kembali email dan kata sandi Anda.",
    slugMissing: "Slug toko tidak ditemukan.",
    genericError: "Terjadi kesalahan saat login.",
    notAuthorized: "Akses ditolak. Anda tidak memiliki izin untuk halaman tersebut.",
    sessionExpired: "Sesi Anda telah berakhir. Silakan masuk kembali.",
    invalidTenant: "Akses ditolak. Anda mencoba masuk ke dashboard toko yang salah.",
    authError: "Terjadi kesalahan autentikasi. Silakan masuk kembali.",
    secureAccess: "Secure business access",
  },
  en: {
    back: "Back to home",
    language: "Language",
    welcome: "Welcome Back",
    subtitle: "Sign in to your KALOO account to manage your business operations.",
    email: "Email Address",
    password: "Password",
    forgot: "Forgot Password?",
    login: "Sign In",
    noAccount: "Don't have an account?",
    register: "Create Account",
    showPassword: "Show password",
    hidePassword: "Hide password",
    required: "Email and password are required.",
    loginFailed: "Login failed. Please check your email and password.",
    slugMissing: "Store slug was not found.",
    genericError: "An error occurred while signing in.",
    notAuthorized: "Access denied. You do not have permission to open that page.",
    sessionExpired: "Your session has expired. Please sign in again.",
    invalidTenant: "Access denied. You are trying to access a different store dashboard.",
    authError: "An authentication error occurred. Please sign in again.",
    secureAccess: "Secure business access",
  },
} as const;

function redirectByRole(role: string | undefined, slug: string | undefined) {
  if (!slug) return false;

  if (role === "Owner") {
    window.location.href = `/${slug}/admin/dashboard`;
    return true;
  }

  if (role === "Cashier") {
    window.location.href = `/${slug}/cashier`;
    return true;
  }

  if (role === "Kitchen") {
    window.location.href = `/${slug}/kitchen`;
    return true;
  }

  return false;
}

export default function LoginView() {
  const locale = useLanguageStore((state) => state.locale) as Locale;
  const setLocale = useLanguageStore((state) => state.setLocale);
  const t = copy[locale];

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const checkSession = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/session", {
        credentials: "include",
        cache: "no-store",
      });

      if (!res.ok) return;

      const data = await res.json();

      if (!data.authenticated) return;

      const role = data.user?.role;
      const slug = data.user?.slug;

      if (!redirectByRole(role, slug)) {
        window.location.href = "/";
      }
    } catch {
      // Session check is optional on the login screen.
    }
  }, []);

  useEffect(() => {
    void checkSession();

    const searchParams = new URLSearchParams(window.location.search);
    const urlError = searchParams.get("error");

    if (!urlError) return;

    if (urlError === "not_authorized") {
      setError(t.notAuthorized);
      return;
    }

    if (urlError === "session_expired") {
      setError(t.sessionExpired);
      return;
    }

    if (urlError === "invalid_tenant") {
      setError(t.invalidTenant);
      return;
    }

    setError(t.authError);
  }, [checkSession, t.authError, t.invalidTenant, t.notAuthorized, t.sessionExpired]);

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    const normalizedEmail = email.trim();

    if (!normalizedEmail || !password) {
      setError(t.required);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          email: normalizedEmail,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || t.loginFailed);
      }

      const storeSlug = data.user?.slug;
      const role = data.user?.role;

      if (!storeSlug) {
        throw new Error(t.slugMissing);
      }

      if (!redirectByRole(role, storeSlug)) {
        window.location.href = "/";
      }
    } catch (loginError: unknown) {
      setError(
        loginError instanceof Error
          ? loginError.message
          : t.genericError,
      );
    } finally {
      setIsLoading(false);
    }
  };

  const toggleLanguage = () => {
    setLocale(locale === "id" ? "en" : "id");
    setError("");
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f7f7f4] text-[#111111]">
      <div className="pointer-events-none fixed inset-0 opacity-[0.32] [background-image:linear-gradient(to_right,rgba(17,17,17,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(17,17,17,0.035)_1px,transparent_1px)] [background-size:40px_40px]" />

      <header className="relative z-20">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="group flex items-center gap-3"
            aria-label={KALOO_BRAND.name}
          >
            <div className="relative h-11 w-11 overflow-hidden rounded-xl border border-black/10 bg-white">
              <Image
                src={KALOO_BRAND.logo}
                alt={`${KALOO_BRAND.name} Logo`}
                fill
                unoptimized
                sizes="44px"
                className="object-contain p-1.5"
                priority
              />
            </div>

            <div className="hidden leading-none sm:block">
              <p className="text-sm font-extrabold tracking-[0.18em]">
                {KALOO_BRAND.name}
              </p>
              <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.26em] text-black/40">
                {KALOO_BRAND.descriptor}
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="hidden items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2.5 text-xs font-bold text-black/60 transition-colors hover:border-black/25 hover:text-black sm:inline-flex"
            >
              <ArrowLeft size={14} />
              {t.back}
            </Link>

            <button
              type="button"
              onClick={toggleLanguage}
              aria-label={t.language}
              className="inline-flex h-10 items-center gap-2 rounded-full border border-black/10 bg-white px-3 text-xs font-extrabold transition-colors hover:border-black/25"
            >
              <Languages size={15} />
              {locale.toUpperCase()}
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 flex min-h-[calc(100vh-80px)] items-center justify-center px-4 py-10 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="w-full max-w-md overflow-hidden rounded-[30px] border border-black/10 bg-white shadow-[0_30px_90px_rgba(0,0,0,0.09)]"
        >
          <div className="border-b border-black/8 px-7 pb-7 pt-8 sm:px-9 sm:pt-10">
            <div className="mb-7 flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black text-white">
                <Lock size={19} strokeWidth={1.8} />
              </div>

              <span className="rounded-full bg-[#f2f2ee] px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.18em] text-black/40">
                {t.secureAccess}
              </span>
            </div>

            <h1 className="[font-family:var(--font-body)] text-4xl font-semibold leading-none tracking-[-0.045em]">
              {t.welcome}
            </h1>

            <p className="mt-4 max-w-sm text-sm leading-6 text-black/48">
              {t.subtitle}
            </p>
          </div>

          <div className="px-7 py-7 sm:px-9 sm:py-8">
            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  key={error}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold leading-5 text-red-700"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="ml-1 text-[10px] font-extrabold uppercase tracking-[0.17em] text-black/40"
                >
                  {t.email}
                </label>

                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-black/30" />

                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      setError("");
                    }}
                    placeholder="admin@bisnis.com"
                    className="w-full rounded-2xl border border-black/10 bg-[#f8f8f5] py-4 pl-11 pr-4 text-sm font-semibold outline-none transition-all placeholder:text-black/25 focus:border-black/35 focus:bg-white"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="mx-1 flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="text-[10px] font-extrabold uppercase tracking-[0.17em] text-black/40"
                  >
                    {t.password}
                  </label>

                  <Link
                    href="/forgot-password"
                    className="text-[10px] font-extrabold text-black/50 transition-colors hover:text-black"
                  >
                    {t.forgot}
                  </Link>
                </div>

                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-black/30" />

                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      setError("");
                    }}
                    placeholder="••••••••"
                    className="w-full rounded-2xl border border-black/10 bg-[#f8f8f5] py-4 pl-11 pr-12 text-sm font-semibold outline-none transition-all placeholder:text-black/25 focus:border-black/35 focus:bg-white"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={showPassword ? t.hidePassword : t.showPassword}
                    className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-black/35 transition-colors hover:bg-black/5 hover:text-black"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="mt-2 inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-full bg-black px-6 text-sm font-extrabold text-white transition-all hover:-translate-y-0.5 hover:bg-[#252525] disabled:cursor-not-allowed disabled:bg-black/25 disabled:hover:translate-y-0"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    {t.login}
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 border-t border-black/8 pt-6 text-center">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-black/35">
                {t.noAccount}{" "}
                <Link
                  href="/register"
                  className="font-extrabold text-black underline-offset-4 hover:underline"
                >
                  {t.register}
                </Link>
              </p>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
