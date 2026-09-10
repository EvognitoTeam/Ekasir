"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronLeft,
  Eye,
  EyeOff,
  FileText,
  Languages,
  Loader2,
  Lock,
  Mail,
  MapPin,
  Quote,
  ScrollText,
  ShieldCheck,
  Store,
  User,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { KALOO_BRAND } from "@/config/brand";
import { PRIVACY_CONTENT, TERMS_CONTENT } from "@/constants/legal";
import { useLanguageStore } from "@/store/language.store";

type Locale = "id" | "en";
type LegalModal = "terms" | "privacy" | null;

const copy = {
  id: {
    back: "Kembali ke beranda",
    language: "Bahasa",
    step: "Langkah",
    of: "dari",
    businessData: "Data Bisnis",
    businessDesc: "Ceritakan sedikit tentang bisnis yang akan menggunakan KALOO.",
    ownerProfile: "Profil Pemilik",
    ownerDesc: "Buat kredensial utama untuk mengakses dashboard KALOO POS.",
    agreement: "Persetujuan",
    agreementDesc: "Tinjau dokumen legal sebelum menyelesaikan pendaftaran.",

    businessName: "Nama Bisnis",
    businessNamePlaceholder: "Contoh: Kopi Kaloo",
    tagline: "Slogan / Tagline",
    taglinePlaceholder: "Contoh: Kopi dari lubuk hati",
    address: "Alamat Lengkap",
    addressPlaceholder: "Alamat operasional bisnis...",

    ownerName: "Nama Pemilik",
    ownerNamePlaceholder: "Nama lengkap Anda",
    activeEmail: "Email Aktif",
    password: "Kata Sandi",
    confirmPassword: "Ulangi Kata Sandi",
    showPassword: "Tampilkan kata sandi",
    hidePassword: "Sembunyikan kata sandi",

    almostDone: "Hampir selesai.",
    almostDoneDesc:
      "Buka setiap dokumen dan baca hingga bagian akhir untuk memberikan persetujuan.",
    terms: "Syarat & Ketentuan",
    termsDesc: "Ketentuan penggunaan platform dan layanan KALOO.",
    privacy: "Kebijakan Privasi",
    privacyDesc: "Penjelasan mengenai pengelolaan data bisnis dan akun Anda.",

    readUntilEnd: "Baca hingga selesai untuk menyetujui",
    agreeClose: "Setuju & Tutup",
    scrollToAgree: "Scroll ke bawah untuk menyetujui",
    legalNote:
      "Isi dokumen di bawah mengikuti versi legal yang saat ini dipublikasikan oleh KALOO.",

    continue: "Lanjutkan",
    finish: "Selesaikan Pendaftaran",
    haveAccount: "Sudah punya akun?",
    loginHere: "Masuk di sini",

    businessRequired: "Nama bisnis dan alamat wajib diisi.",
    ownerRequired: "Nama pemilik, email, dan kata sandi wajib diisi.",
    invalidEmail: "Format email tidak valid.",
    passwordMismatch: "Konfirmasi kata sandi tidak cocok.",
    passwordMin: "Kata sandi minimal 6 karakter.",
    legalRequired:
      "Anda wajib membaca dan menyetujui Syarat & Ketentuan serta Kebijakan Privasi.",
    registerFailed: "Gagal melakukan pendaftaran.",
    networkError: "Terjadi kesalahan jaringan. Silakan coba lagi.",

    secureSetup: "3-step account setup",
  },
  en: {
    back: "Back to home",
    language: "Language",
    step: "Step",
    of: "of",
    businessData: "Business Details",
    businessDesc: "Tell us about the business that will use KALOO.",
    ownerProfile: "Owner Profile",
    ownerDesc: "Create the primary credentials used to access the KALOO POS dashboard.",
    agreement: "Agreement",
    agreementDesc: "Review the legal documents before completing registration.",

    businessName: "Business Name",
    businessNamePlaceholder: "Example: Kopi Nusantara",
    tagline: "Slogan / Tagline",
    taglinePlaceholder: "Example: Coffee from the heart",
    address: "Full Address",
    addressPlaceholder: "Business operating address...",

    ownerName: "Owner Name",
    ownerNamePlaceholder: "Your full name",
    activeEmail: "Active Email",
    password: "Password",
    confirmPassword: "Confirm Password",
    showPassword: "Show password",
    hidePassword: "Hide password",

    almostDone: "Almost there.",
    almostDoneDesc:
      "Open each document and read to the end before giving your consent.",
    terms: "Terms & Conditions",
    termsDesc: "Terms governing the use of the KALOO platform and services.",
    privacy: "Privacy Policy",
    privacyDesc: "How KALOO handles your business and account data.",

    readUntilEnd: "Read to the end to provide consent",
    agreeClose: "Agree & Close",
    scrollToAgree: "Scroll to the bottom to agree",
    legalNote:
      "The document below follows KALOO's currently published legal version.",

    continue: "Continue",
    finish: "Complete Registration",
    haveAccount: "Already have an account?",
    loginHere: "Sign in here",

    businessRequired: "Business name and address are required.",
    ownerRequired: "Owner name, email, and password are required.",
    invalidEmail: "Please enter a valid email address.",
    passwordMismatch: "Password confirmation does not match.",
    passwordMin: "Password must contain at least 6 characters.",
    legalRequired:
      "You must read and agree to the Terms & Conditions and Privacy Policy.",
    registerFailed: "Registration failed.",
    networkError: "A network error occurred. Please try again.",

    secureSetup: "3-step account setup",
  },
} as const;

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default function RegisterView() {
  const locale = useLanguageStore((state) => state.locale) as Locale;
  const setLocale = useLanguageStore((state) => state.setLocale);
  const t = copy[locale];

  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [activeModal, setActiveModal] = useState<LegalModal>(null);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    businessName: "",
    tagline: "",
    address: "",
    ownerName: "",
    email: "",
    password: "",
    confirmPassword: "",
    agreeTerms: false,
    agreePrivacy: false,
  });

  const handleInputChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
  };

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const {
      scrollTop,
      clientHeight,
      scrollHeight,
    } = event.currentTarget;

    if (scrollHeight - scrollTop > clientHeight + 5) return;

    setHasScrolledToBottom(true);

    if (activeModal === "terms") {
      setFormData((previous) => ({
        ...previous,
        agreeTerms: true,
      }));
    }

    if (activeModal === "privacy") {
      setFormData((previous) => ({
        ...previous,
        agreePrivacy: true,
      }));
    }
  };

  const openModal = (type: Exclude<LegalModal, null>) => {
    setActiveModal(type);
    setHasScrolledToBottom(
      type === "terms"
        ? formData.agreeTerms
        : formData.agreePrivacy,
    );
  };

  const closeModal = () => {
    setActiveModal(null);
  };

  const validateStep = () => {
    if (step === 1) {
      if (!formData.businessName.trim() || !formData.address.trim()) {
        setError(t.businessRequired);
        return false;
      }
    }

    if (step === 2) {
      const normalizedEmail = formData.email.trim();

      if (
        !formData.ownerName.trim() ||
        !normalizedEmail ||
        !formData.password
      ) {
        setError(t.ownerRequired);
        return false;
      }

      if (!isValidEmail(normalizedEmail)) {
        setError(t.invalidEmail);
        return false;
      }

      if (formData.password.length < 6) {
        setError(t.passwordMin);
        return false;
      }

      if (formData.password !== formData.confirmPassword) {
        setError(t.passwordMismatch);
        return false;
      }
    }

    if (step === 3) {
      if (!formData.agreeTerms || !formData.agreePrivacy) {
        setError(t.legalRequired);
        return false;
      }
    }

    setError("");
    return true;
  };

  const nextStep = () => {
    if (!validateStep()) return;
    setStep((previous) => Math.min(previous + 1, 3));
  };

  const previousStep = () => {
    setStep((previous) => Math.max(previous - 1, 1));
    setError("");
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          businessName: formData.businessName.trim(),
          tagline: formData.tagline.trim(),
          address: formData.address.trim(),
          ownerName: formData.ownerName.trim(),
          email: formData.email.trim(),
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || t.registerFailed);
      }

      if (data.slug) {
        window.location.href = `/${data.slug}/cashier`;
        return;
      }

      window.location.href = "/login";
    } catch (registerError: unknown) {
      setError(
        registerError instanceof Error
          ? registerError.message
          : t.networkError,
      );
    } finally {
      setIsLoading(false);
    }
  };

  const toggleLanguage = () => {
    setLocale(locale === "id" ? "en" : "id");
    setError("");
  };

  const title =
    step === 1
      ? t.businessData
      : step === 2
        ? t.ownerProfile
        : t.agreement;

  const description =
    step === 1
      ? t.businessDesc
      : step === 2
        ? t.ownerDesc
        : t.agreementDesc;

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

      <AnimatePresence>
        {activeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-[30px] border border-black/10 bg-[#f7f7f4] shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-black/10 px-6 py-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black text-white">
                    <ScrollText size={17} />
                  </div>

                  <div>
                    <h2 className="font-extrabold">
                      {activeModal === "terms" ? t.terms : t.privacy}
                    </h2>
                    <p className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.16em] text-black/35">
                      {t.readUntilEnd}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={closeModal}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white transition-colors hover:bg-black hover:text-white"
                  aria-label="Close"
                >
                  <X size={17} />
                </button>
              </div>

              <div className="border-b border-black/8 bg-white/55 px-6 py-3 text-xs leading-5 text-black/45">
                {t.legalNote}
              </div>

              <div
                onScroll={handleScroll}
                className="custom-scrollbar flex-1 overflow-y-auto whitespace-pre-wrap px-6 py-6 text-sm leading-7 text-black/60"
              >
                {activeModal === "terms" ? TERMS_CONTENT : PRIVACY_CONTENT}
                <div className="h-12" />
              </div>

              <div className="border-t border-black/10 bg-white p-5">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={!hasScrolledToBottom}
                  className="inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-full bg-black px-6 text-xs font-extrabold uppercase tracking-[0.12em] text-white transition-all disabled:cursor-not-allowed disabled:bg-black/15"
                >
                  {hasScrolledToBottom ? (
                    <>
                      <Check size={15} strokeWidth={2.6} />
                      {t.agreeClose}
                    </>
                  ) : (
                    t.scrollToAgree
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="relative z-10 flex min-h-[calc(100vh-80px)] items-center justify-center px-4 py-8 sm:px-6 sm:py-10">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="flex max-h-[780px] min-h-[650px] w-full max-w-xl flex-col overflow-hidden rounded-[30px] border border-black/10 bg-white shadow-[0_30px_90px_rgba(0,0,0,0.09)]"
        >
          <div className="border-b border-black/8 px-6 pb-6 pt-7 sm:px-8 sm:pt-8">
            <div className="mb-7 flex items-center justify-between gap-4">
              <div className="flex gap-2">
                {[1, 2, 3].map((item) => (
                  <div
                    key={item}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      step >= item
                        ? "w-9 bg-black"
                        : "w-4 bg-black/10"
                    }`}
                  />
                ))}
              </div>

              <div className="text-right">
                <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-black/35">
                  {t.step} {step} {t.of} 3
                </p>
                <p className="mt-1 hidden text-[9px] font-bold uppercase tracking-[0.14em] text-black/25 sm:block">
                  {t.secureSetup}
                </p>
              </div>
            </div>

            <h1 className="[font-family:var(--font-body)] text-4xl font-semibold leading-none tracking-[-0.045em]">
              {title}
            </h1>

            <p className="mt-4 max-w-md text-sm leading-6 text-black/48">
              {description}
            </p>
          </div>

          <div className="custom-scrollbar flex-1 overflow-y-auto px-6 py-6 sm:px-8">
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

            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div
                  key="step-1"
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                  transition={{ duration: 0.22 }}
                  className="space-y-5"
                >
                  <FieldLabel label={`${t.businessName} *`}>
                    <Store className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-black/30" />
                    <input
                      type="text"
                      name="businessName"
                      autoComplete="organization"
                      value={formData.businessName}
                      onChange={handleInputChange}
                      placeholder={t.businessNamePlaceholder}
                      className="w-full rounded-2xl border border-black/10 bg-[#f8f8f5] py-4 pl-11 pr-4 text-sm font-semibold outline-none transition-all placeholder:text-black/25 focus:border-black/35 focus:bg-white"
                    />
                  </FieldLabel>

                  <FieldLabel label={t.tagline}>
                    <Quote className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-black/30" />
                    <input
                      type="text"
                      name="tagline"
                      value={formData.tagline}
                      onChange={handleInputChange}
                      placeholder={t.taglinePlaceholder}
                      className="w-full rounded-2xl border border-black/10 bg-[#f8f8f5] py-4 pl-11 pr-4 text-sm font-semibold outline-none transition-all placeholder:text-black/25 focus:border-black/35 focus:bg-white"
                    />
                  </FieldLabel>

                  <FieldLabel label={`${t.address} *`}>
                    <MapPin className="absolute left-4 top-4 h-4 w-4 text-black/30" />
                    <textarea
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      rows={4}
                      placeholder={t.addressPlaceholder}
                      className="w-full resize-none rounded-2xl border border-black/10 bg-[#f8f8f5] py-4 pl-11 pr-4 text-sm font-semibold outline-none transition-all placeholder:text-black/25 focus:border-black/35 focus:bg-white"
                    />
                  </FieldLabel>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="step-2"
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                  transition={{ duration: 0.22 }}
                  className="space-y-5"
                >
                  <FieldLabel label={`${t.ownerName} *`}>
                    <User className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-black/30" />
                    <input
                      type="text"
                      name="ownerName"
                      autoComplete="name"
                      value={formData.ownerName}
                      onChange={handleInputChange}
                      placeholder={t.ownerNamePlaceholder}
                      className="w-full rounded-2xl border border-black/10 bg-[#f8f8f5] py-4 pl-11 pr-4 text-sm font-semibold outline-none transition-all placeholder:text-black/25 focus:border-black/35 focus:bg-white"
                    />
                  </FieldLabel>

                  <FieldLabel label={`${t.activeEmail} *`}>
                    <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-black/30" />
                    <input
                      type="email"
                      name="email"
                      autoComplete="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="email@domain.com"
                      className="w-full rounded-2xl border border-black/10 bg-[#f8f8f5] py-4 pl-11 pr-4 text-sm font-semibold outline-none transition-all placeholder:text-black/25 focus:border-black/35 focus:bg-white"
                    />
                  </FieldLabel>

                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <FieldLabel label={`${t.password} *`}>
                      <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-black/30" />
                      <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        autoComplete="new-password"
                        value={formData.password}
                        onChange={handleInputChange}
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
                    </FieldLabel>

                    <FieldLabel label={`${t.confirmPassword} *`}>
                      <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-black/30" />
                      <input
                        type={showPassword ? "text" : "password"}
                        name="confirmPassword"
                        autoComplete="new-password"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        placeholder="••••••••"
                        className="w-full rounded-2xl border border-black/10 bg-[#f8f8f5] py-4 pl-11 pr-4 text-sm font-semibold outline-none transition-all placeholder:text-black/25 focus:border-black/35 focus:bg-white"
                      />
                    </FieldLabel>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div
                  key="step-3"
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                  transition={{ duration: 0.22 }}
                  className="space-y-4"
                >
                  <div className="mb-6 rounded-2xl bg-[#f2f2ee] p-5">
                    <p className="font-extrabold">
                      {t.almostDone}
                    </p>
                    <p className="mt-1.5 text-xs leading-5 text-black/45">
                      {t.almostDoneDesc}
                    </p>
                  </div>

                  <LegalCard
                    icon={ShieldCheck}
                    title={t.terms}
                    description={t.termsDesc}
                    checked={formData.agreeTerms}
                    onClick={() => openModal("terms")}
                  />

                  <LegalCard
                    icon={FileText}
                    title={t.privacy}
                    description={t.privacyDesc}
                    checked={formData.agreePrivacy}
                    onClick={() => openModal("privacy")}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="border-t border-black/8 bg-white px-6 py-5 sm:px-8">
            <div className="flex gap-3">
              {step > 1 && (
                <button
                  type="button"
                  onClick={previousStep}
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-black/10 bg-[#f5f5f1] transition-colors hover:border-black/25 hover:bg-white"
                >
                  <ChevronLeft size={20} />
                </button>
              )}

              {step < 3 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="inline-flex min-h-14 flex-1 items-center justify-center gap-3 rounded-full bg-black px-6 text-xs font-extrabold uppercase tracking-[0.1em] text-white transition-all hover:-translate-y-0.5 hover:bg-[#252525]"
                >
                  {t.continue}
                  <ArrowRight size={15} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={
                    isLoading ||
                    !formData.agreeTerms ||
                    !formData.agreePrivacy
                  }
                  className="inline-flex min-h-14 flex-1 items-center justify-center gap-3 rounded-full bg-black px-6 text-xs font-extrabold uppercase tracking-[0.1em] text-white transition-all hover:-translate-y-0.5 hover:bg-[#252525] disabled:cursor-not-allowed disabled:bg-black/20 disabled:hover:translate-y-0"
                >
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      {t.finish}
                      <ArrowRight size={15} />
                    </>
                  )}
                </button>
              )}
            </div>

            <p className="mt-5 text-center text-[9px] font-bold uppercase tracking-[0.14em] text-black/35">
              {t.haveAccount}{" "}
              <Link
                href="/login"
                className="font-extrabold text-black underline-offset-4 hover:underline"
              >
                {t.loginHere}
              </Link>
            </p>
          </div>
        </motion.div>
      </main>
    </div>
  );
}

function FieldLabel({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <span className="ml-1 block text-[10px] font-extrabold uppercase tracking-[0.17em] text-black/40">
        {label}
      </span>

      <span className="relative block">
        {children}
      </span>
    </label>
  );
}

function LegalCard({
  icon: Icon,
  title,
  description,
  checked,
  onClick,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  checked: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-start gap-4 rounded-2xl border p-4 text-left transition-all ${
        checked
          ? "border-black bg-black text-white"
          : "border-black/10 bg-white hover:border-black/25"
      }`}
    >
      <div
        className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
          checked
            ? "bg-white text-black"
            : "bg-[#f2f2ee] text-black"
        }`}
      >
        {checked ? (
          <Check size={17} strokeWidth={2.6} />
        ) : (
          <Icon size={17} />
        )}
      </div>

      <div>
        <p className="text-sm font-extrabold">
          {title}
        </p>
        <p
          className={`mt-1 text-xs leading-5 ${
            checked ? "text-white/55" : "text-black/45"
          }`}
        >
          {description}
        </p>
      </div>
    </button>
  );
}
