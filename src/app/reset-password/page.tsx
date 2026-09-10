"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  AnimatePresence,
  motion,
} from "framer-motion";

import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Languages,
  Loader2,
  LockKeyhole,
  ShieldAlert,
} from "lucide-react";

import Image
  from "next/image";

import Link
  from "next/link";

import {
  KALOO_BRAND,
} from "@/config/brand";

import {
  useLanguageStore,
} from "@/store/language.store";

type Locale =
  | "id"
  | "en";

type PageState =
  | "checking"
  | "ready"
  | "invalid"
  | "success";

const copy = {
  id: {
    language:
      "Bahasa",
    backHome:
      "Kembali ke beranda",

    checking:
      "Memeriksa tautan reset...",
    checkingDesc:
      "KALOO sedang memastikan tautan ini masih valid.",

    badge:
      "Buat Kata Sandi Baru",
    title:
      "Atur ulang kata sandi Anda.",
    description:
      "Gunakan kata sandi baru yang mudah Anda ingat tetapi sulit ditebak orang lain.",

    password:
      "Kata Sandi Baru",
    confirm:
      "Ulangi Kata Sandi",
    showPassword:
      "Tampilkan kata sandi",
    hidePassword:
      "Sembunyikan kata sandi",
    hint:
      "Minimal 6 karakter.",
    submit:
      "Simpan Kata Sandi Baru",

    passwordRequired:
      "Kata sandi baru wajib diisi.",
    passwordMin:
      "Kata sandi minimal 6 karakter.",
    passwordMismatch:
      "Konfirmasi kata sandi tidak cocok.",
    genericError:
      "Kata sandi tidak dapat diperbarui. Silakan coba lagi.",

    invalidBadge:
      "Tautan Tidak Valid",
    invalidTitle:
      "Tautan reset tidak dapat digunakan.",
    invalidDescription:
      "Tautan mungkin sudah kedaluwarsa, sudah pernah digunakan, atau tidak valid. Minta tautan reset baru untuk melanjutkan.",
    requestAgain:
      "Minta Tautan Baru",
    backLogin:
      "Kembali ke Login",

    successBadge:
      "Password Diperbarui",
    successTitle:
      "Kata sandi baru sudah aktif.",
    successDescription:
      "Anda sekarang dapat masuk ke KALOO POS menggunakan kata sandi yang baru.",
    login:
      "Masuk ke KALOO POS",

    security:
      "Tautan reset hanya dapat digunakan satu kali dan akan dinonaktifkan setelah password berhasil diganti.",
  },

  en: {
    language:
      "Language",
    backHome:
      "Back to home",

    checking:
      "Checking reset link...",
    checkingDesc:
      "KALOO is verifying that this link is still valid.",

    badge:
      "Create New Password",
    title:
      "Reset your password.",
    description:
      "Choose a new password that is easy for you to remember and difficult for others to guess.",

    password:
      "New Password",
    confirm:
      "Confirm New Password",
    showPassword:
      "Show password",
    hidePassword:
      "Hide password",
    hint:
      "At least 6 characters.",
    submit:
      "Save New Password",

    passwordRequired:
      "A new password is required.",
    passwordMin:
      "Password must contain at least 6 characters.",
    passwordMismatch:
      "Password confirmation does not match.",
    genericError:
      "Your password could not be updated. Please try again.",

    invalidBadge:
      "Invalid Link",
    invalidTitle:
      "This reset link cannot be used.",
    invalidDescription:
      "The link may have expired, already been used, or may be invalid. Request a new password reset link to continue.",
    requestAgain:
      "Request New Link",
    backLogin:
      "Back to Login",

    successBadge:
      "Password Updated",
    successTitle:
      "Your new password is active.",
    successDescription:
      "You can now sign in to KALOO POS using your new password.",
    login:
      "Sign In to KALOO POS",

    security:
      "A reset link can only be used once and becomes invalid immediately after your password is changed.",
  },
} as const;

export default function ResetPasswordView() {
  const locale =
    useLanguageStore(
      (state) =>
        state.locale,
    ) as Locale;

  const setLocale =
    useLanguageStore(
      (state) =>
        state.setLocale,
    );

  const t =
    copy[locale];

  const [
    pageState,
    setPageState,
  ] =
    useState<PageState>(
      "checking",
    );

  const [
    token,
    setToken,
  ] =
    useState("");

  const [
    password,
    setPassword,
  ] =
    useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] =
    useState("");

  const [
    showPassword,
    setShowPassword,
  ] =
    useState(false);

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");

  useEffect(() => {
    let cancelled =
      false;

    const validateToken =
      async () => {
        const searchParams =
          new URLSearchParams(
            window.location.search,
          );

        const urlToken =
          searchParams
            .get("token")
            ?.trim() ?? "";

        if (
          !urlToken
        ) {
          if (
            !cancelled
          ) {
            setPageState(
              "invalid",
            );
          }

          return;
        }

        setToken(
          urlToken,
        );

        try {
          const response =
            await fetch(
              `/api/auth/reset-password?token=${encodeURIComponent(
                urlToken,
              )}`,
              {
                method:
                  "GET",
                cache:
                  "no-store",
              },
            );

          const data =
            await response.json();

          if (
            cancelled
          ) {
            return;
          }

          if (
            !response.ok ||
            !data.success ||
            data.valid !==
              true
          ) {
            setPageState(
              "invalid",
            );

            return;
          }

          setPageState(
            "ready",
          );
        } catch {
          if (
            !cancelled
          ) {
            setPageState(
              "invalid",
            );
          }
        }
      };

    void validateToken();

    return () => {
      cancelled =
        true;
    };
  }, []);

  const toggleLanguage =
    () => {
      setLocale(
        locale === "id"
          ? "en"
          : "id",
      );

      setError("");
    };

  const handleSubmit =
    async (
      event:
        React.FormEvent<HTMLFormElement>,
    ) => {
      event.preventDefault();

      setError("");

      if (
        !password
      ) {
        setError(
          t.passwordRequired,
        );

        return;
      }

      if (
        password.length <
        6
      ) {
        setError(
          t.passwordMin,
        );

        return;
      }

      if (
        password !==
        confirmPassword
      ) {
        setError(
          t.passwordMismatch,
        );

        return;
      }

      setIsLoading(
        true,
      );

      try {
        const response =
          await fetch(
            "/api/auth/reset-password",
            {
              method:
                "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  token,
                  password,
                }),
            },
          );

        const data =
          await response.json();

        if (
          !response.ok ||
          !data.success
        ) {
          if (
            data?.error
              ?.code ===
            "INVALID_OR_EXPIRED_TOKEN"
          ) {
            setPageState(
              "invalid",
            );

            return;
          }

          throw new Error(
            data.message ||
              t.genericError,
          );
        }

        setPassword("");
        setConfirmPassword("");
        setPageState(
          "success",
        );
      } catch (
        submitError:
          unknown
      ) {
        setError(
          submitError instanceof
            Error
            ? submitError.message
            : t.genericError,
        );
      } finally {
        setIsLoading(
          false,
        );
      }
    };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f7f7f4] text-[#111111]">
      <div className="pointer-events-none fixed inset-0 opacity-[0.32] [background-image:linear-gradient(to_right,rgba(17,17,17,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(17,17,17,0.035)_1px,transparent_1px)] [background-size:40px_40px]" />

      <header className="relative z-20">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="group flex items-center gap-3"
            aria-label={
              KALOO_BRAND.name
            }
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
                {
                  KALOO_BRAND.name
                }
              </p>

              <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.26em] text-black/40">
                {
                  KALOO_BRAND.descriptor
                }
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="hidden items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2.5 text-xs font-bold text-black/60 transition-colors hover:border-black/25 hover:text-black sm:inline-flex"
            >
              <ArrowLeft
                size={14}
              />
              {t.backHome}
            </Link>

            <button
              type="button"
              onClick={
                toggleLanguage
              }
              aria-label={
                t.language
              }
              className="inline-flex h-10 items-center gap-2 rounded-full border border-black/10 bg-white px-3 text-xs font-extrabold transition-colors hover:border-black/25"
            >
              <Languages
                size={15}
              />
              {
                locale.toUpperCase()
              }
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 flex min-h-[calc(100vh-80px)] items-center justify-center px-4 py-10 sm:px-6">
        <AnimatePresence
          mode="wait"
        >
          {pageState ===
            "checking" && (
            <motion.div
              key="checking"
              initial={{
                opacity: 0,
                y: 16,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              exit={{
                opacity: 0,
              }}
              className="w-full max-w-md rounded-[30px] border border-black/10 bg-white px-8 py-10 text-center shadow-[0_30px_90px_rgba(0,0,0,0.09)]"
            >
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-black text-white">
                <Loader2
                  size={22}
                  className="animate-spin"
                />
              </div>

              <h1 className="mt-7 text-xl font-extrabold">
                {
                  t.checking
                }
              </h1>

              <p className="mt-2 text-sm leading-6 text-black/45">
                {
                  t.checkingDesc
                }
              </p>
            </motion.div>
          )}

          {pageState ===
            "ready" && (
            <motion.div
              key="ready"
              initial={{
                opacity: 0,
                y: 18,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              exit={{
                opacity: 0,
                y: -12,
              }}
              className="w-full max-w-md overflow-hidden rounded-[30px] border border-black/10 bg-white shadow-[0_30px_90px_rgba(0,0,0,0.09)]"
            >
              <div className="border-b border-black/8 px-7 pb-7 pt-8 sm:px-9 sm:pt-10">
                <div className="mb-7 flex items-center justify-between gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black text-white">
                    <LockKeyhole
                      size={19}
                      strokeWidth={
                        1.8
                      }
                    />
                  </div>

                  <span className="rounded-full bg-[#f2f2ee] px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.18em] text-black/40">
                    {
                      t.badge
                    }
                  </span>
                </div>

                <h1 className="[font-family:var(--font-body)] text-4xl font-semibold leading-[0.98] tracking-[-0.045em]">
                  {
                    t.title
                  }
                </h1>

                <p className="mt-4 text-sm leading-6 text-black/48">
                  {
                    t.description
                  }
                </p>
              </div>

              <div className="px-7 py-7 sm:px-9 sm:py-8">
                <AnimatePresence
                  mode="wait"
                >
                  {error && (
                    <motion.div
                      key={
                        error
                      }
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
                      {
                        error
                      }
                    </motion.div>
                  )}
                </AnimatePresence>

                <form
                  onSubmit={
                    handleSubmit
                  }
                  className="space-y-5"
                >
                  <PasswordField
                    label={
                      t.password
                    }
                    value={
                      password
                    }
                    show={
                      showPassword
                    }
                    onChange={(
                      value,
                    ) => {
                      setPassword(
                        value,
                      );
                      setError(
                        "",
                      );
                    }}
                    onToggle={() =>
                      setShowPassword(
                        (
                          current,
                        ) =>
                          !current,
                      )
                    }
                    showLabel={
                      t.showPassword
                    }
                    hideLabel={
                      t.hidePassword
                    }
                  />

                  <PasswordField
                    label={
                      t.confirm
                    }
                    value={
                      confirmPassword
                    }
                    show={
                      showPassword
                    }
                    onChange={(
                      value,
                    ) => {
                      setConfirmPassword(
                        value,
                      );
                      setError(
                        "",
                      );
                    }}
                    onToggle={() =>
                      setShowPassword(
                        (
                          current,
                        ) =>
                          !current,
                      )
                    }
                    showLabel={
                      t.showPassword
                    }
                    hideLabel={
                      t.hidePassword
                    }
                  />

                  <p className="ml-1 text-xs text-black/35">
                    {
                      t.hint
                    }
                  </p>

                  <button
                    type="submit"
                    disabled={
                      isLoading
                    }
                    className="inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-full bg-black px-6 text-sm font-extrabold text-white transition-all hover:-translate-y-0.5 hover:bg-[#252525] disabled:cursor-not-allowed disabled:bg-black/25 disabled:hover:translate-y-0"
                  >
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        {
                          t.submit
                        }
                        <ArrowRight
                          size={
                            16
                          }
                        />
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-6 rounded-2xl bg-[#f2f2ee] p-4">
                  <p className="text-xs leading-5 text-black/45">
                    {
                      t.security
                    }
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {pageState ===
            "invalid" && (
            <motion.div
              key="invalid"
              initial={{
                opacity: 0,
                y: 18,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              exit={{
                opacity: 0,
              }}
              className="w-full max-w-md overflow-hidden rounded-[30px] border border-black/10 bg-white shadow-[0_30px_90px_rgba(0,0,0,0.09)]"
            >
              <div className="px-7 pb-8 pt-9 sm:px-9 sm:pt-10">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-black text-white">
                  <ShieldAlert
                    size={22}
                  />
                </div>

                <p className="mt-8 text-[10px] font-extrabold uppercase tracking-[0.2em] text-black/35">
                  {
                    t.invalidBadge
                  }
                </p>

                <h1 className="mt-3 [font-family:var(--font-body)] text-4xl font-semibold leading-[0.98] tracking-[-0.045em]">
                  {
                    t.invalidTitle
                  }
                </h1>

                <p className="mt-5 text-sm leading-6 text-black/48">
                  {
                    t.invalidDescription
                  }
                </p>

                <div className="mt-8 space-y-3">
                  <Link
                    href="/forgot-password"
                    className="inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-full bg-black px-6 text-sm font-extrabold text-white transition-all hover:-translate-y-0.5 hover:bg-[#252525]"
                  >
                    {
                      t.requestAgain
                    }
                    <ArrowRight
                      size={16}
                    />
                  </Link>

                  <Link
                    href="/login"
                    className="inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-full border border-black/10 bg-white px-6 text-xs font-extrabold transition-colors hover:border-black/25"
                  >
                    <ArrowLeft
                      size={14}
                    />
                    {
                      t.backLogin
                    }
                  </Link>
                </div>
              </div>
            </motion.div>
          )}

          {pageState ===
            "success" && (
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
              }}
              className="w-full max-w-md overflow-hidden rounded-[30px] border border-black/10 bg-white shadow-[0_30px_90px_rgba(0,0,0,0.09)]"
            >
              <div className="px-7 pb-8 pt-9 sm:px-9 sm:pt-10">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-black text-white">
                  <CheckCircle2
                    size={23}
                    strokeWidth={
                      1.8
                    }
                  />
                </div>

                <p className="mt-8 text-[10px] font-extrabold uppercase tracking-[0.2em] text-black/35">
                  {
                    t.successBadge
                  }
                </p>

                <h1 className="mt-3 [font-family:var(--font-body)] text-4xl font-semibold leading-[0.98] tracking-[-0.045em]">
                  {
                    t.successTitle
                  }
                </h1>

                <p className="mt-5 text-sm leading-6 text-black/48">
                  {
                    t.successDescription
                  }
                </p>

                <Link
                  href="/login"
                  className="mt-8 inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-full bg-black px-6 text-sm font-extrabold text-white transition-all hover:-translate-y-0.5 hover:bg-[#252525]"
                >
                  {
                    t.login
                  }
                  <ArrowRight
                    size={16}
                  />
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function PasswordField({
  label,
  value,
  show,
  onChange,
  onToggle,
  showLabel,
  hideLabel,
}: {
  label: string;
  value: string;
  show: boolean;
  onChange: (
    value: string,
  ) => void;
  onToggle: () => void;
  showLabel: string;
  hideLabel: string;
}) {
  return (
    <div className="space-y-2">
      <label className="ml-1 text-[10px] font-extrabold uppercase tracking-[0.17em] text-black/40">
        {label}
      </label>

      <div className="relative">
        <LockKeyhole className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-black/30" />

        <input
          type={
            show
              ? "text"
              : "password"
          }
          autoComplete="new-password"
          value={value}
          onChange={(
            event,
          ) =>
            onChange(
              event.target.value,
            )
          }
          placeholder="••••••••"
          maxLength={128}
          className="w-full rounded-2xl border border-black/10 bg-[#f8f8f5] py-4 pl-11 pr-12 text-sm font-semibold outline-none transition-all placeholder:text-black/25 focus:border-black/35 focus:bg-white"
        />

        <button
          type="button"
          onClick={
            onToggle
          }
          aria-label={
            show
              ? hideLabel
              : showLabel
          }
          className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-black/35 transition-colors hover:bg-black/5 hover:text-black"
        >
          {show ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  );
}
