"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Languages,
  Loader2,
  LockKeyhole,
  Mail,
  RotateCcw,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { KALOO_BRAND } from "@/config/brand";
import { useLanguageStore } from "@/store/language.store";

type Locale = "id" | "en";

const copy = {
  id: {
    backHome: "Kembali ke beranda",
    language: "Bahasa",
    badge: "Pemulihan Akun",
    title: "Lupa kata sandi?",
    description:
      "Masukkan email yang terdaftar di KALOO. Jika akun ditemukan, kami akan mengirimkan instruksi untuk membuat kata sandi baru.",
    emailLabel: "Alamat Email",
    emailPlaceholder: "admin@bisnis.com",
    send: "Kirim Instruksi Reset",
    backLogin: "Kembali ke halaman masuk",
    required: "Alamat email wajib diisi.",
    invalidEmail: "Format email tidak valid.",
    failed:
      "Permintaan reset kata sandi gagal. Silakan coba lagi.",
    network:
      "Terjadi kesalahan jaringan. Silakan coba lagi.",
    privacy:
      "Untuk keamanan akun, KALOO tidak akan menampilkan apakah suatu alamat email terdaftar atau tidak.",
    successBadge: "Permintaan Terkirim",
    successTitle: "Periksa email Anda.",
    successDescription:
      "Jika email tersebut terdaftar di KALOO, instruksi untuk mengatur ulang kata sandi akan dikirimkan ke:",
    successNote:
      "Tidak menerima email? Periksa folder spam atau tunggu beberapa saat sebelum mencoba kembali.",
    tryAgain: "Gunakan Email Lain",
    login: "Kembali ke Login",
  },
  en: {
    backHome: "Back to home",
    language: "Language",
    badge: "Account Recovery",
    title: "Forgot your password?",
    description:
      "Enter the email registered with KALOO. If the account exists, we will send instructions to create a new password.",
    emailLabel: "Email Address",
    emailPlaceholder: "admin@business.com",
    send: "Send Reset Instructions",
    backLogin: "Back to sign in",
    required: "Email address is required.",
    invalidEmail: "Please enter a valid email address.",
    failed:
      "Password reset request failed. Please try again.",
    network:
      "A network error occurred. Please try again.",
    privacy:
      "For account security, KALOO will not reveal whether an email address is registered.",
    successBadge: "Request Sent",
    successTitle: "Check your email.",
    successDescription:
      "If this email is registered with KALOO, password reset instructions will be sent to:",
    successNote:
      "Didn't receive an email? Check your spam folder or wait a moment before trying again.",
    tryAgain: "Use Another Email",
    login: "Back to Login",
  },
} as const;

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default function ForgotPasswordView() {
  const locale =
    useLanguageStore((state) => state.locale) as Locale;

  const setLocale =
    useLanguageStore((state) => state.setLocale);

  const t = copy[locale];

  const [email, setEmail] = useState("");
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");

  const toggleLanguage = () => {
    setLocale(locale === "id" ? "en" : "id");
    setError("");
  };

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setError("");

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError(t.required);
      return;
    }

    if (!isValidEmail(normalizedEmail)) {
      setError(t.invalidEmail);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(
        "/api/auth/forgot-password",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: normalizedEmail,
          }),
        },
      );

      let data: {
        success?: boolean;
        message?: string;
      } = {};

      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (!response.ok || data.success === false) {
        throw new Error(
          data.message || t.failed,
        );
      }

      setSubmittedEmail(normalizedEmail);
      setIsSuccess(true);
    } catch (requestError: unknown) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : t.network,
      );
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setEmail("");
    setSubmittedEmail("");
    setError("");
    setIsSuccess(false);
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
                src="/logo.png"
                alt={`${KALOO_BRAND.name} Logo`}
                fill
                sizes="44px"
                priority
                className="object-contain p-1.5"
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
              {t.backHome}
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
        <AnimatePresence mode="wait">
          {!isSuccess ? (
            <motion.div
              key="request"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-md overflow-hidden rounded-[30px] border border-black/10 bg-white shadow-[0_30px_90px_rgba(0,0,0,0.09)]"
            >
              <div className="border-b border-black/8 px-7 pb-7 pt-8 sm:px-9 sm:pt-10">
                <div className="mb-7 flex items-center justify-between gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black text-white">
                    <LockKeyhole
                      size={19}
                      strokeWidth={1.8}
                    />
                  </div>

                  <span className="rounded-full bg-[#f2f2ee] px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.18em] text-black/40">
                    {t.badge}
                  </span>
                </div>

                <h1 className="[font-family:var(--font-body)] text-4xl font-semibold leading-[0.98] tracking-[-0.045em]">
                  {t.title}
                </h1>

                <p className="mt-4 text-sm leading-6 text-black/48">
                  {t.description}
                </p>
              </div>

              <div className="px-7 py-7 sm:px-9 sm:py-8">
                <AnimatePresence mode="wait">
                  {error && (
                    <motion.div
                      key={error}
                      initial={{
                        opacity: 0,
                        y: -8,
                      }}
                      animate={{
                        opacity: 1,
                        y: 0,
                      }}
                      exit={{
                        opacity: 0,
                        y: -8,
                      }}
                      className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold leading-5 text-red-700"
                    >
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                <form
                  onSubmit={handleSubmit}
                  className="space-y-5"
                >
                  <div className="space-y-2">
                    <label
                      htmlFor="email"
                      className="ml-1 text-[10px] font-extrabold uppercase tracking-[0.17em] text-black/40"
                    >
                      {t.emailLabel}
                    </label>

                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-black/30" />

                      <input
                        id="email"
                        type="email"
                        autoComplete="email"
                        autoFocus
                        value={email}
                        onChange={(event) => {
                          setEmail(event.target.value);
                          setError("");
                        }}
                        placeholder={t.emailPlaceholder}
                        className="w-full rounded-2xl border border-black/10 bg-[#f8f8f5] py-4 pl-11 pr-4 text-sm font-semibold outline-none transition-all placeholder:text-black/25 focus:border-black/35 focus:bg-white"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-full bg-black px-6 text-sm font-extrabold text-white transition-all hover:-translate-y-0.5 hover:bg-[#252525] disabled:cursor-not-allowed disabled:bg-black/25 disabled:hover:translate-y-0"
                  >
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        {t.send}
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-6 rounded-2xl bg-[#f2f2ee] p-4">
                  <p className="text-xs leading-5 text-black/45">
                    {t.privacy}
                  </p>
                </div>

                <div className="mt-7 border-t border-black/8 pt-6 text-center">
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-black/45 transition-colors hover:text-black"
                  >
                    <ArrowLeft size={13} />
                    {t.backLogin}
                  </Link>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="success"
              initial={{
                opacity: 0,
                y: 18,
                scale: 0.985,
              }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
              }}
              exit={{
                opacity: 0,
                y: -12,
              }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-md overflow-hidden rounded-[30px] border border-black/10 bg-white shadow-[0_30px_90px_rgba(0,0,0,0.09)]"
            >
              <div className="px-7 pb-8 pt-9 sm:px-9 sm:pt-10">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-black text-white">
                  <CheckCircle2
                    size={23}
                    strokeWidth={1.8}
                  />
                </div>

                <p className="mt-8 text-[10px] font-extrabold uppercase tracking-[0.2em] text-black/35">
                  {t.successBadge}
                </p>

                <h1 className="mt-3 [font-family:var(--font-body)] text-4xl font-semibold leading-[0.98] tracking-[-0.045em]">
                  {t.successTitle}
                </h1>

                <p className="mt-5 text-sm leading-6 text-black/48">
                  {t.successDescription}
                </p>

                <div className="mt-5 rounded-2xl border border-black/10 bg-[#f7f7f4] px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white">
                      <Mail
                        size={15}
                        className="text-black/55"
                      />
                    </div>

                    <p className="min-w-0 truncate text-sm font-extrabold">
                      {submittedEmail}
                    </p>
                  </div>
                </div>

                <p className="mt-5 text-xs leading-5 text-black/38">
                  {t.successNote}
                </p>

                <div className="mt-8 space-y-3">
                  <Link
                    href="/login"
                    className="inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-full bg-black px-6 text-sm font-extrabold text-white transition-all hover:-translate-y-0.5 hover:bg-[#252525]"
                  >
                    {t.login}
                    <ArrowRight size={16} />
                  </Link>

                  <button
                    type="button"
                    onClick={resetForm}
                    className="inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-full border border-black/10 bg-white px-6 text-xs font-extrabold transition-colors hover:border-black/25"
                  >
                    <RotateCcw size={14} />
                    {t.tryAgain}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
