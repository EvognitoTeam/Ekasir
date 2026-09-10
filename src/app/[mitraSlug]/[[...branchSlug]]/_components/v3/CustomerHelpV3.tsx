"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  useParams,
  usePathname,
} from "next/navigation";

import * as Icons from "lucide-react";

import {
  AnimatePresence,
  motion,
} from "framer-motion";

type Facility = {
  name: string;
  description?: string;
  icon?: string;
};

type FAQ = {
  question: string;
  answer: string;
};

type Settings = {
  wifiSSID?: string;
  wifiPassword?: string;
  facilities?: Facility[];
  faqs?: FAQ[];
  branchId?: number | null;
  outletConfigured?: boolean;
};

function parseArray<T>(
  value: unknown,
): T[] {
  if (
    Array.isArray(
      value,
    )
  ) {
    return value as T[];
  }

  if (
    typeof value ===
    "string"
  ) {
    try {
      const parsed =
        JSON.parse(
          value,
        );

      return Array.isArray(
        parsed,
      )
        ? parsed as T[]
        : [];
    } catch {
      return [];
    }
  }

  return [];
}

export default function CustomerHelpV3() {
  const params =
    useParams<{
      mitraSlug?:
        string |
        string[];
      branchSlug?:
        string |
        string[];
    }>();

  const pathname =
    usePathname();

  const slug =
    Array.isArray(
      params.mitraSlug,
    )
      ? String(
          params.mitraSlug[
            0
          ] ??
            "",
        )
      : String(
          params.mitraSlug ??
            "",
        );

  /**
   * Route customer dapat berbentuk:
   *
   * /[mitraSlug]/help
   *
   * atau:
   *
   * /[mitraSlug]/[branchSlug]/help
   *
   * Pada catch-all route, params.branchSlug bisa menjadi:
   *
   * ["GMBL92", "help"]
   *
   * String(array) akan menghasilkan:
   *
   * "GMBL92,help"
   *
   * Jadi branch harus diambil dari segment URL,
   * bukan String(params.branchSlug).
   */
  const pathSegments =
    pathname
      .split(
        "/",
      )
      .filter(
        Boolean,
      );

  const mitraIndex =
    pathSegments.indexOf(
      slug,
    );

  const afterMitra =
    mitraIndex >=
      0
      ? pathSegments.slice(
          mitraIndex +
            1,
        )
      : [];

  const branchSlug =
    afterMitra.length >=
        2 &&
      afterMitra[
        afterMitra.length -
          1
      ] ===
        "help"
      ? String(
          afterMitra[
            0
          ] ??
            "",
        )
      : "";

  const [
    data,
    setData,
  ] =
    useState<Settings>(
      {},
    );

  const [
    loading,
    setLoading,
  ] =
    useState(
      true,
    );

  const [
    toast,
    setToast,
  ] =
    useState(
      "",
    );

  useEffect(() => {
    if (
      !slug
    ) {
      return;
    }

    const controller =
      new AbortController();

    void (
      async () => {
        setLoading(
          true,
        );

        try {
          const query =
            new URLSearchParams({
              slug,
            });

          /**
           * Customer branch route:
           *
           * /[mitraSlug]/[branchSlug]/help
           *
           * Kirim branch_slug ke API.
           *
           * Untuk route pusat:
           *
           * /[mitraSlug]/help
           *
           * branch_slug kosong -> pusat.
           */
          if (
            branchSlug
          ) {
            query.set(
              "branch_slug",
              branchSlug,
            );
          }

          const response =
            await fetch(
              `/api/settings?${query.toString()}`,
              {
                signal:
                  controller.signal,
                cache:
                  "no-store",
              },
            );

          const result =
            await response.json();

          if (
            !response.ok ||
            !result.success
          ) {
            throw new Error(
              result.message ||
                "Failed to load settings",
            );
          }

          setData({
            wifiSSID:
              String(
                result.data?.wifiSSID ??
                  "",
              ),

            wifiPassword:
              String(
                result.data?.wifiPassword ??
                  "",
              ),

            /**
             * API baru memakai "facilities".
             *
             * "facility" tetap dibaca sebagai fallback
             * supaya aman selama masa transisi.
             */
            facilities:
              parseArray<Facility>(
                result.data?.facilities ??
                  result.data?.facility,
              ),

            /**
             * FAQ adalah GLOBAL.
             */
            faqs:
              parseArray<FAQ>(
                result.data?.faq,
              ),

            branchId:
              result.data?.branchId ??
              null,

            outletConfigured:
              Boolean(
                result.data?.outletConfigured,
              ),
          });
        } catch (
          error
        ) {
          if (
            error instanceof
              DOMException &&
            error.name ===
              "AbortError"
          ) {
            return;
          }

          console.error(
            "[CUSTOMER_HELP_SETTINGS_ERROR]",
            error,
          );

          setData(
            {},
          );
        } finally {
          if (
            !controller.signal.aborted
          ) {
            setLoading(
              false,
            );
          }
        }
      }
    )();

    return () =>
      controller.abort();
  }, [
    branchSlug,
    slug,
  ]);

  const copyWifi =
    async () => {
      const text =
        `WiFi: ${data.wifiSSID || "-"} | Password: ${data.wifiPassword || "-"}`;

      try {
        await navigator.clipboard.writeText(
          text,
        );

        setToast(
          "WiFi copied",
        );

        window.setTimeout(
          () =>
            setToast(
              "",
            ),
          2200,
        );
      } catch {
        setToast(
          text,
        );

        window.setTimeout(
          () =>
            setToast(
              "",
            ),
          3500,
        );
      }
    };

  if (
    loading
  ) {
    return (
      <div className="flex min-h-[70dvh] items-center justify-center bg-stone-50">
        <Icons.Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-stone-50 px-4 pb-32 pt-7">
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{
              opacity:
                0,
              y:
                -10,
            }}
            animate={{
              opacity:
                1,
              y:
                0,
            }}
            exit={{
              opacity:
                0,
            }}
            className="fixed left-1/2 top-5 z-[120] -translate-x-1/2 rounded-full bg-black px-4 py-2 text-xs font-bold text-white shadow-xl"
          >
            {
              toast
            }
          </motion.div>
        )}
      </AnimatePresence>

      <p className="text-[10px] font-black uppercase tracking-[.2em] text-black/30">
        Service hub
      </p>

      <h1 className="mt-2 text-[40px] font-black leading-[.92] tracking-[-.065em]">
        Need
        <br />
        something?
      </h1>

      <p className="mt-4 max-w-[300px] text-xs leading-5 text-black/45">
        Wi-Fi, fasilitas restoran, dan jawaban cepat tanpa meninggalkan meja Anda.
      </p>

      {(data.wifiSSID ||
        data.wifiPassword) && (
        <button
          type="button"
          onClick={() =>
            void copyWifi()
          }
          className="mt-8 w-full rounded-[28px] bg-black p-5 text-left text-white"
        >
          <div className="flex items-start justify-between">
            <Icons.Wifi className="h-5 w-5" />

            <span className="text-[9px] font-black uppercase tracking-[.14em] text-white/35">
              Tap to copy
            </span>
          </div>

          <p className="mt-8 text-[9px] font-black uppercase tracking-[.16em] text-white/35">
            Wi-Fi network
          </p>

          <p className="mt-1 text-2xl font-black tracking-[-.04em]">
            {data.wifiSSID ||
              "Not available"}
          </p>

          <p className="mt-4 font-mono text-xs text-white/55">
            {data.wifiPassword ||
              "No password"}
          </p>
        </button>
      )}

      {!!data.facilities?.length && (
        <section className="mt-9">
          <p className="mb-3 text-[9px] font-black uppercase tracking-[.18em] text-black/30">
            At this place
          </p>

          <div className="grid grid-cols-2 gap-2.5">
            {data.facilities.map(
              (
                facility,
                index,
              ) => {
                const Icon =
                  (
                    Icons as unknown as
                      Record<
                        string,
                        React.ComponentType<{
                          className?: string;
                        }>
                      >
                  )[
                    facility.icon ||
                      "CheckCircle2"
                  ] ||
                  Icons.CheckCircle2;

                return (
                  <div
                    key={
                      index
                    }
                    className="min-h-36 rounded-3xl border border-black/[.07] bg-white p-4"
                  >
                    <Icon className="h-5 w-5" />

                    <p className="mt-8 text-sm font-black">
                      {
                        facility.name
                      }
                    </p>

                    <p className="mt-1 text-[10px] leading-4 text-black/38">
                      {
                        facility.description
                      }
                    </p>
                  </div>
                );
              },
            )}
          </div>
        </section>
      )}

      {!!data.faqs?.length && (
        <section className="mt-10">
          <p className="text-[9px] font-black uppercase tracking-[.18em] text-black/30">
            FAQ
          </p>

          <h2 className="mt-1 text-2xl font-black tracking-[-.05em]">
            Quick answers
          </h2>

          <div className="mt-4 divide-y divide-black/[.07] border-y border-black/[.07]">
            {data.faqs.map(
              (
                faq,
                index,
              ) => (
                <details
                  key={
                    index
                  }
                  className="group py-4"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-black">
                    <span>
                      {String(
                        index +
                          1,
                      ).padStart(
                        2,
                        "0",
                      )}{" "}
                      ·{" "}
                      {
                        faq.question
                      }
                    </span>

                    <Icons.Plus className="h-4 w-4 transition-transform group-open:rotate-45" />
                  </summary>

                  <p className="mt-3 pl-8 text-xs leading-5 text-black/48">
                    {
                      faq.answer
                    }
                  </p>
                </details>
              ),
            )}
          </div>
        </section>
      )}
    </div>
  );
}
