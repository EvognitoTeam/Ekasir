'use client';

import {
  useState,
} from 'react';

import {
  ArrowRight,
  AtSign,
  BadgeCheck,
  Mail,
  Search,
  UserRound,
  X,
} from 'lucide-react';

import type {
  KioskCustomer,
} from './types';

type IdentifyResponse = {
  success: boolean;
  message?: string;
  data?: {
    userId: number;
    memberId: string;
    name: string;
    email: string;
    phone: string | null;
  };
};

type Props = {
  open: boolean;
  mitraSlug: string;
  branchSlug?: string;
  onClose: () => void;
  onContinue: (
    customer: KioskCustomer,
  ) => void;
};

function isEmail(
  value: string,
) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    value,
  );
}

export default function KioskMemberModal({
  open,
  mitraSlug,
  branchSlug,
  onClose,
  onContinue,
}: Props) {
  const [
    identifier,
    setIdentifier,
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
    foundMember,
    setFoundMember,
  ] =
    useState<IdentifyResponse['data']>(
      undefined,
    );

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

  if (!open) {
    return null;
  }

  const identifyMember =
    async () => {
      const value =
        identifier.trim();

      if (!value) {
        setError(
          'Masukkan ID member atau email.',
        );
        return;
      }

      setLoading(true);
      setError(null);
      setFoundMember(undefined);

      try {
        const response =
          await fetch(
            '/api/kiosk/member/identify',
            {
              method:
                'POST',
              cache:
                'no-store',
              headers: {
                Accept:
                  'application/json',
                'Content-Type':
                  'application/json',
              },
              body:
                JSON.stringify({
                  slug:
                    mitraSlug,
                  branchSlug,
                  identifier:
                    value,
                }),
            },
          );

        const result =
          await response.json() as
            IdentifyResponse;

        if (
          !response.ok ||
          !result.success ||
          !result.data
        ) {
          throw new Error(
            result.message ||
              'Member tidak ditemukan.',
          );
        }

        setFoundMember(
          result.data,
        );
      } catch (
        identifyError
      ) {
        setError(
          identifyError instanceof Error
            ? identifyError.message
            : 'Member tidak ditemukan.',
        );
      } finally {
        setLoading(false);
      }
    };

  const useMember =
    () => {
      if (!foundMember) {
        return;
      }

      onContinue({
        type:
          'member',
        userId:
          foundMember.userId,
        memberId:
          foundMember.memberId,
        name:
          foundMember.name,
        email:
          foundMember.email,
        phone:
          foundMember.phone,
      });
    };

  const useGuest =
    () => {
      const name =
        guestName.trim();

      const email =
        guestEmail
          .trim()
          .toLowerCase();

      if (
        name.length < 2
      ) {
        setError(
          'Nama minimal 2 karakter.',
        );
        return;
      }

      if (
        !isEmail(email)
      ) {
        setError(
          'Email pelanggan tidak valid.',
        );
        return;
      }

      onContinue({
        type:
          'guest',
        userId:
          null,
        memberId:
          null,
        name,
        email,
        phone:
          null,
      });
    };

  return (
    <div
      className="fixed inset-0 z-[180] flex items-end justify-center bg-stone-950/70 p-0 backdrop-blur-sm sm:items-center sm:p-4 lg:p-8"
      role="dialog"
      aria-modal="true"
      aria-label="Identitas pelanggan"
    >
      <div className="flex max-h-[96dvh] w-full max-w-5xl flex-col overflow-hidden rounded-t-[2rem] bg-stone-100 shadow-2xl sm:max-h-[92dvh] sm:rounded-[2.5rem]">
        <header className="flex items-center justify-between border-b border-stone-200 bg-white px-4 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-700 sm:text-xs">
              Sebelum membayar
            </p>
            <h2 className="text-xl font-black text-stone-950 sm:mt-1 sm:text-3xl">
              Identitas pelanggan
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-stone-100 sm:h-14 sm:w-14 sm:rounded-2xl"
          >
            <X className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-2">
          <section className="border-b border-stone-200 bg-white p-4 sm:p-6 lg:border-b-0 lg:border-r lg:p-8">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                <BadgeCheck className="h-6 w-6" />
              </span>

              <div>
                <h3 className="text-xl font-black text-stone-950 sm:text-2xl">
                  Saya member
                </h3>
                <p className="text-sm text-stone-500">
                  Cukup masukkan ID member atau email.
                </p>
              </div>
            </div>

            <div className="mt-5 flex min-h-14 items-center gap-3 rounded-2xl border border-stone-200 bg-stone-50 px-4 focus-within:border-violet-400">
              <AtSign className="h-5 w-5 shrink-0 text-stone-400" />

              <input
                type="text"
                value={
                  identifier
                }
                onChange={(
                  event,
                ) => {
                  setIdentifier(
                    event.target.value,
                  );
                  setFoundMember(
                    undefined,
                  );
                  setError(null);
                }}
                placeholder="ID member atau email"
                className="min-w-0 flex-1 bg-transparent text-base font-semibold outline-none sm:text-lg"
              />

              <button
                type="button"
                disabled={loading}
                onClick={() =>
                  void identifyMember()
                }
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-stone-950 text-white disabled:bg-stone-300"
              >
                <Search className="h-5 w-5" />
              </button>
            </div>

            {foundMember && (
              <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white">
                    <UserRound className="h-5 w-5" />
                  </span>

                  <div className="min-w-0">
                    <p className="text-lg font-black text-stone-950">
                      {foundMember.name}
                    </p>
                    <p className="mt-1 truncate text-sm text-stone-600">
                      {foundMember.email}
                    </p>
                    <p className="mt-2 inline-flex rounded-lg bg-white px-3 py-1.5 font-mono text-sm font-black text-emerald-700">
                      {foundMember.memberId}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={
                    useMember
                  }
                  className="mt-4 flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 font-black text-white"
                >
                  Gunakan member ini
                  <ArrowRight className="h-5 w-5" />
                </button>
              </div>
            )}
          </section>

          <section className="p-4 sm:p-6 lg:p-8">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                <UserRound className="h-6 w-6" />
              </span>

              <div>
                <h3 className="text-xl font-black text-stone-950 sm:text-2xl">
                  Tanpa member
                </h3>
                <p className="text-sm text-stone-500">
                  Isi nama dan email pelanggan.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <div className="flex min-h-14 items-center gap-3 rounded-2xl border border-stone-200 bg-white px-4 focus-within:border-amber-400">
                <UserRound className="h-5 w-5 shrink-0 text-stone-400" />
                <input
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
                  placeholder="Nama pelanggan"
                  className="min-w-0 flex-1 bg-transparent text-base font-semibold outline-none sm:text-lg"
                />
              </div>

              <div className="flex min-h-14 items-center gap-3 rounded-2xl border border-stone-200 bg-white px-4 focus-within:border-amber-400">
                <Mail className="h-5 w-5 shrink-0 text-stone-400" />
                <input
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
                  placeholder="Email pelanggan"
                  className="min-w-0 flex-1 bg-transparent text-base font-semibold outline-none sm:text-lg"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={
                useGuest
              }
              className="mt-4 flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-stone-950 px-4 font-black text-white"
            >
              Lanjut tanpa member
              <ArrowRight className="h-5 w-5" />
            </button>
          </section>
        </div>

        {error && (
          <div className="border-t border-red-200 bg-red-50 px-4 py-3 text-center text-sm font-bold text-red-700 sm:px-6">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
