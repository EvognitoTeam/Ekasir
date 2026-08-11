'use client';

import {
  useState,
} from 'react';

import {
  ArrowLeft,
  Eye,
  EyeOff,
  LogIn,
  Mail,
  UserRound,
  UsersRound,
} from 'lucide-react';

import type {
  KioskCustomer,
} from './types';

type Mode =
  | 'member'
  | 'guest';

type MemberLoginResponse = {
  success: boolean;
  message?: string;
  user?: {
    id: number;
    name: string;
    email: string;
    phone?: string | null;
    memberId?: string | null;
  };
};

type Props = {
  mitraSlug: string;
  onBack: () => void;
  onContinue: (
    customer:
      KioskCustomer,
  ) => void;
};

function validEmail(
  value: string,
) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    value,
  );
}

export default function KioskCustomerIdentity({
  mitraSlug,
  onBack,
  onContinue,
}: Props) {
  const [mode, setMode] =
    useState<Mode>(
      'member',
    );

  const [
    email,
    setEmail,
  ] = useState('');

  const [
    password,
    setPassword,
  ] = useState('');

  const [
    guestName,
    setGuestName,
  ] = useState('');

  const [
    guestEmail,
    setGuestEmail,
  ] = useState('');

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null,
    );

  const switchMode =
    (
      nextMode:
        Mode,
    ) => {
      setMode(nextMode);
      setError(null);
    };

  const loginMember =
    async () => {
      const normalizedEmail =
        email
          .trim()
          .toLowerCase();

      if (
        !validEmail(
          normalizedEmail,
        )
      ) {
        setError(
          'Masukkan email member yang valid.',
        );
        return;
      }

      if (
        password.length < 1
      ) {
        setError(
          'Kata sandi wajib diisi.',
        );
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response =
          await fetch(
            '/api/auth/login',
            {
              method:
                'POST',
              credentials:
                'include',
              headers: {
                Accept:
                  'application/json',
                'Content-Type':
                  'application/json',
              },
              body:
                JSON.stringify({
                  email:
                    normalizedEmail,
                  password,
                  slug:
                    mitraSlug,
                }),
            },
          );

        const result =
          await response.json() as
            MemberLoginResponse;

        if (
          !response.ok ||
          !result.success ||
          !result.user
        ) {
          throw new Error(
            result.message ||
              'Login member gagal.',
          );
        }

        onContinue({
          type:
            'member',
          userId:
            result.user.id,
          name:
            result.user.name,
          email:
            result.user.email,
          phone:
            result.user.phone ??
            null,
          memberId:
            result.user.memberId ??
            null,
        });
      } catch (
        loginError
      ) {
        setError(
          loginError instanceof Error
            ? loginError.message
            : 'Login member gagal.',
        );
      } finally {
        setLoading(false);
      }
    };

  const continueAsGuest =
    () => {
      const name =
        guestName.trim();

      const normalizedEmail =
        guestEmail
          .trim()
          .toLowerCase();

      if (
        name.length < 2
      ) {
        setError(
          'Nama pelanggan minimal 2 karakter.',
        );
        return;
      }

      if (
        !validEmail(
          normalizedEmail,
        )
      ) {
        setError(
          'Masukkan email pelanggan yang valid.',
        );
        return;
      }

      onContinue({
        type:
          'guest',
        userId:
          null,
        name,
        email:
          normalizedEmail,
        phone:
          null,
        memberId:
          null,
      });
    };

  return (
    <section className="min-h-[100dvh] bg-stone-100 px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
      <div className="mx-auto w-full max-w-5xl">
        <button
          type="button"
          onClick={onBack}
          className="flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow-sm sm:h-12 sm:w-12 lg:h-14 lg:w-14 lg:rounded-2xl"
        >
          <ArrowLeft className="h-5 w-5 lg:h-6 lg:w-6" />
        </button>

        <div className="mx-auto mt-5 max-w-3xl text-center sm:mt-8 lg:mt-10">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-amber-600 sm:text-sm sm:tracking-[0.3em]">
            Data pelanggan
          </p>

          <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] text-stone-950 sm:text-4xl lg:mt-4 lg:text-5xl">
            Sudah menjadi member?
          </h1>

          <p className="mt-3 text-sm leading-relaxed text-stone-500 sm:text-base lg:text-lg">
            Login untuk mendapatkan poin dan benefit member. Pelanggan non-member tetap dapat melanjutkan sebagai tamu.
          </p>
        </div>

        <div className="mx-auto mt-6 grid max-w-4xl grid-cols-2 rounded-2xl bg-stone-200 p-1.5 sm:mt-8">
          <button
            type="button"
            onClick={() =>
              switchMode(
                'member',
              )
            }
            className={`flex min-h-12 items-center justify-center gap-2 rounded-xl px-3 text-sm font-black transition sm:min-h-14 sm:text-base ${
              mode ===
              'member'
                ? 'bg-stone-950 text-white shadow-md'
                : 'text-stone-500'
            }`}
          >
            <UsersRound className="h-5 w-5" />
            Login Member
          </button>

          <button
            type="button"
            onClick={() =>
              switchMode(
                'guest',
              )
            }
            className={`flex min-h-12 items-center justify-center gap-2 rounded-xl px-3 text-sm font-black transition sm:min-h-14 sm:text-base ${
              mode ===
              'guest'
                ? 'bg-stone-950 text-white shadow-md'
                : 'text-stone-500'
            }`}
          >
            <UserRound className="h-5 w-5" />
            Tanpa Member
          </button>
        </div>

        <div className="mx-auto mt-4 max-w-4xl rounded-[1.75rem] border border-stone-200 bg-white p-5 shadow-xl shadow-stone-200/40 sm:mt-5 sm:p-7 lg:rounded-[2rem] lg:p-9">
          {mode ===
          'member' ? (
            <div className="space-y-5">
              <div>
                <label
                  htmlFor="kiosk-member-email"
                  className="text-sm font-black text-stone-700"
                >
                  Email member
                </label>

                <div className="mt-2 flex min-h-14 items-center gap-3 rounded-2xl border border-stone-200 bg-stone-50 px-4 focus-within:border-amber-400">
                  <Mail className="h-5 w-5 shrink-0 text-stone-400" />

                  <input
                    id="kiosk-member-email"
                    type="email"
                    value={email}
                    onChange={(
                      event,
                    ) =>
                      setEmail(
                        event.target.value,
                      )
                    }
                    autoComplete="email"
                    placeholder="member@email.com"
                    className="min-w-0 flex-1 bg-transparent text-base font-semibold outline-none sm:text-lg"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="kiosk-member-password"
                  className="text-sm font-black text-stone-700"
                >
                  Kata sandi
                </label>

                <div className="mt-2 flex min-h-14 items-center gap-3 rounded-2xl border border-stone-200 bg-stone-50 px-4 focus-within:border-amber-400">
                  <LogIn className="h-5 w-5 shrink-0 text-stone-400" />

                  <input
                    id="kiosk-member-password"
                    type={
                      showPassword
                        ? 'text'
                        : 'password'
                    }
                    value={password}
                    onChange={(
                      event,
                    ) =>
                      setPassword(
                        event.target.value,
                      )
                    }
                    autoComplete="current-password"
                    placeholder="Masukkan kata sandi"
                    className="min-w-0 flex-1 bg-transparent text-base font-semibold outline-none sm:text-lg"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(
                        (current) =>
                          !current,
                      )
                    }
                    className="flex h-10 w-10 items-center justify-center rounded-xl text-stone-500"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="button"
                disabled={loading}
                onClick={() =>
                  void loginMember()
                }
                className="min-h-16 w-full rounded-2xl bg-amber-300 px-5 text-lg font-black text-stone-950 disabled:bg-stone-300 sm:min-h-18 sm:text-xl"
              >
                {loading
                  ? 'Memeriksa akun...'
                  : 'Login dan lanjutkan'}
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              <div>
                <label
                  htmlFor="kiosk-guest-name"
                  className="text-sm font-black text-stone-700"
                >
                  Nama pelanggan
                </label>

                <div className="mt-2 flex min-h-14 items-center gap-3 rounded-2xl border border-stone-200 bg-stone-50 px-4 focus-within:border-amber-400">
                  <UserRound className="h-5 w-5 shrink-0 text-stone-400" />

                  <input
                    id="kiosk-guest-name"
                    type="text"
                    value={
                      guestName
                    }
                    onChange={(
                      event,
                    ) =>
                      setGuestName(
                        event.target.value,
                      )
                    }
                    autoComplete="name"
                    placeholder="Contoh: Budi"
                    className="min-w-0 flex-1 bg-transparent text-base font-semibold outline-none sm:text-lg"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="kiosk-guest-email"
                  className="text-sm font-black text-stone-700"
                >
                  Email
                </label>

                <div className="mt-2 flex min-h-14 items-center gap-3 rounded-2xl border border-stone-200 bg-stone-50 px-4 focus-within:border-amber-400">
                  <Mail className="h-5 w-5 shrink-0 text-stone-400" />

                  <input
                    id="kiosk-guest-email"
                    type="email"
                    value={
                      guestEmail
                    }
                    onChange={(
                      event,
                    ) =>
                      setGuestEmail(
                        event.target.value,
                      )
                    }
                    autoComplete="email"
                    placeholder="pelanggan@email.com"
                    className="min-w-0 flex-1 bg-transparent text-base font-semibold outline-none sm:text-lg"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={
                  continueAsGuest
                }
                className="min-h-16 w-full rounded-2xl bg-stone-950 px-5 text-lg font-black text-white sm:min-h-18 sm:text-xl"
              >
                Lanjut sebagai tamu
              </button>
            </div>
          )}

          {error && (
            <div className="mt-5 rounded-xl bg-red-100 px-4 py-3 text-sm font-bold text-red-700">
              {error}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
