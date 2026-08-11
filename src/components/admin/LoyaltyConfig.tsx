"use client";

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  BadgeDollarSign,
  CalendarClock,
  Coins,
  Gift,
  GripVertical,
  History,
  Percent,
  Plus,
  Save,
  TicketPercent,
  ToggleLeft,
  ToggleRight,
  Trash2,
  TrendingUp,
  Users,
} from 'lucide-react';

type EarningMode =
  | 'fixed_ratio'
  | 'tier_percentage';

type TierBasis =
  | 'lifetime_spending'
  | 'lifetime_points';

type LoyaltySettings = {
  isEnabled: boolean;
  earningMode: EarningMode;
  tierBasis: TierBasis;
  earningAmount: number;
  earningPoints: number;
  minimumTransaction: number;
  maximumPointsPerOrder: number | null;
  redemptionValue: number;
  minimumRedeemPoints: number;
  maximumRedeemPoints: number | null;
  maximumRedeemPercentage: number;
  allowWithCoupon: boolean;
  expirationEnabled: boolean;
  expirationDays: number;
};

type LoyaltyTier = {
  id: string;
  name: string;
  code: string;
  minimumSpending: number;
  minimumLifetimePoints: number;
  earningPercentage: number;
  sortOrder: number;
  isActive: boolean;
};

const INITIAL_SETTINGS: LoyaltySettings = {
  isEnabled: false,
  earningMode: 'fixed_ratio',
  tierBasis: 'lifetime_spending',
  earningAmount: 10000,
  earningPoints: 1,
  minimumTransaction: 10000,
  maximumPointsPerOrder: null,
  redemptionValue: 1000,
  minimumRedeemPoints: 10,
  maximumRedeemPoints: null,
  maximumRedeemPercentage: 50,
  allowWithCoupon: false,
  expirationEnabled: false,
  expirationDays: 365,
};

const INITIAL_TIERS: LoyaltyTier[] = [
  {
    id: 'bronze',
    name: 'Bronze',
    code: 'bronze',
    minimumSpending: 0,
    minimumLifetimePoints: 0,
    earningPercentage: 1,
    sortOrder: 1,
    isActive: true,
  },
  {
    id: 'silver',
    name: 'Silver',
    code: 'silver',
    minimumSpending: 1000000,
    minimumLifetimePoints: 100,
    earningPercentage: 1.5,
    sortOrder: 2,
    isActive: true,
  },
  {
    id: 'gold',
    name: 'Gold',
    code: 'gold',
    minimumSpending: 3000000,
    minimumLifetimePoints: 500,
    earningPercentage: 2,
    sortOrder: 3,
    isActive: true,
  },
  {
    id: 'platinum',
    name: 'Platinum',
    code: 'platinum',
    minimumSpending: 10000000,
    minimumLifetimePoints: 1500,
    earningPercentage: 3,
    sortOrder: 4,
    isActive: true,
  },
];

const normalizeTierCode = (
  value: string,
): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export default function LoyaltyConfig() {
  const params =
    useParams<{
      mitraSlug?: string;
      branchSlug?: string[];
    }>();

  const mitraSlug =
    params?.mitraSlug ||
    '';

  const branchSlug =
    Array.isArray(params?.branchSlug)
      ? params.branchSlug[0] || null
      : null;

  const [settings, setSettings] =
    useState<LoyaltySettings>(
      INITIAL_SETTINGS,
    );

  const [tiers, setTiers] =
    useState<LoyaltyTier[]>(
      INITIAL_TIERS,
    );

  const [isLoading, setIsLoading] =
    useState(true);

  const [isSaving, setIsSaving] =
    useState(false);

  const [saveMessage, setSaveMessage] =
    useState<string | null>(null);

  const [stats, setStats] =
    useState({
      pointsInCirculation: 0,
      membersWithPoints: 0,
      pointTransactions: 0,
    });

  useEffect(() => {
    if (!mitraSlug) {
      setIsLoading(false);
      return;
    }

    const controller =
      new AbortController();

    const loadLoyaltyConfig =
      async () => {
        setIsLoading(true);
        setSaveMessage(null);

        try {
          const query =
            new URLSearchParams({
              slug:
                mitraSlug,
            });

          if (branchSlug) {
            query.set(
              'branch_slug',
              branchSlug,
            );
          }

          const response =
            await fetch(
              `/api/loyalty/settings?${query.toString()}`,
              {
                credentials:
                  'include',
                cache:
                  'no-store',
                signal:
                  controller.signal,
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
                'Gagal mengambil konfigurasi loyalty.',
            );
          }

          if (
            result.data?.settings
          ) {
            setSettings(
              result.data.settings,
            );
          }

          if (
            Array.isArray(
              result.data?.tiers,
            ) &&
            result.data.tiers.length >
              0
          ) {
            setTiers(
              result.data.tiers,
            );
          }

          if (
            result.data?.stats
          ) {
            setStats({
              pointsInCirculation:
                Number(
                  result.data.stats
                    .pointsInCirculation ||
                    0,
                ),
              membersWithPoints:
                Number(
                  result.data.stats
                    .membersWithPoints ||
                    0,
                ),
              pointTransactions:
                Number(
                  result.data.stats
                    .pointTransactions ||
                    0,
                ),
            });
          }
        } catch (error) {
          if (
            error instanceof
              DOMException &&
            error.name ===
              'AbortError'
          ) {
            return;
          }

          console.error(
            '[LOYALTY_CONFIG_LOAD_ERROR]',
            error,
          );

          setSaveMessage(
            error instanceof Error
              ? error.message
              : 'Gagal mengambil konfigurasi loyalty.',
          );
        } finally {
          if (
            !controller.signal
              .aborted
          ) {
            setIsLoading(false);
          }
        }
      };

    void loadLoyaltyConfig();

    return () =>
      controller.abort();
  }, [
    mitraSlug,
    branchSlug,
  ]);

  const updateSetting = <
    K extends keyof LoyaltySettings,
  >(
    key: K,
    value: LoyaltySettings[K],
  ) => {
    setSettings((current) => ({
      ...current,
      [key]: value,
    }));

    setSaveMessage(null);
  };

  const updateTier = <
    K extends keyof LoyaltyTier,
  >(
    tierId: string,
    key: K,
    value: LoyaltyTier[K],
  ) => {
    setTiers((current) =>
      current.map((tier) => {
        if (tier.id !== tierId) {
          return tier;
        }

        if (
          key === 'name' &&
          typeof value === 'string'
        ) {
          return {
            ...tier,
            name: value,
            code:
              normalizeTierCode(
                value,
              ) ||
              tier.code,
          };
        }

        return {
          ...tier,
          [key]: value,
        };
      }),
    );

    setSaveMessage(null);
  };

  const addTier = () => {
    const nextSortOrder =
      tiers.length > 0
        ? Math.max(
            ...tiers.map(
              (tier) =>
                tier.sortOrder,
            ),
          ) + 1
        : 1;

    const newTierId =
      `tier-${Date.now()}`;

    setTiers((current) => [
      ...current,
      {
        id: newTierId,
        name:
          `Tier ${nextSortOrder}`,
        code:
          `tier-${nextSortOrder}`,
        minimumSpending: 0,
        minimumLifetimePoints: 0,
        earningPercentage: 1,
        sortOrder:
          nextSortOrder,
        isActive: true,
      },
    ]);

    setSaveMessage(null);
  };

  const removeTier = (
    tierId: string,
  ) => {
    setTiers((current) =>
      current
        .filter(
          (tier) =>
            tier.id !== tierId,
        )
        .map(
          (tier, index) => ({
            ...tier,
            sortOrder:
              index + 1,
          }),
        ),
    );

    setSaveMessage(null);
  };

  const previewPoints =
    useMemo(() => {
      const eligibleAmount =
        25000;

      if (
        settings.earningMode ===
        'fixed_ratio'
      ) {
        if (
          settings.earningAmount <=
            0 ||
          settings.earningPoints <=
            0
        ) {
          return 0;
        }

        return (
          Math.floor(
            eligibleAmount /
              settings.earningAmount,
          ) *
          settings.earningPoints
        );
      }

      const firstActiveTier =
        [...tiers]
          .filter(
            (tier) =>
              tier.isActive,
          )
          .sort(
            (a, b) =>
              a.sortOrder -
              b.sortOrder,
          )[0];

      if (
        !firstActiveTier ||
        settings.redemptionValue <=
          0
      ) {
        return 0;
      }

      const rewardValue =
        Math.floor(
          eligibleAmount *
            (
              firstActiveTier.earningPercentage /
              100
            ),
        );

      return Math.floor(
        rewardValue /
          settings.redemptionValue,
      );
    }, [
      settings.earningAmount,
      settings.earningMode,
      settings.earningPoints,
      settings.redemptionValue,
      tiers,
    ]);

  const validationMessage =
    useMemo(() => {
      if (
        settings.earningMode ===
          'tier_percentage' &&
        tiers.filter(
          (tier) =>
            tier.isActive,
        ).length === 0
      ) {
        return 'Aktifkan minimal satu tier.';
      }

      const duplicateCodes =
        tiers
          .map(
            (tier) =>
              tier.code,
          )
          .filter(
            (
              code,
              index,
              allCodes,
            ) =>
              code &&
              allCodes.indexOf(
                code,
              ) !== index,
          );

      if (
        duplicateCodes.length >
        0
      ) {
        return 'Kode tier tidak boleh sama.';
      }

      if (
        tiers.some(
          (tier) =>
            !tier.name.trim(),
        )
      ) {
        return 'Nama tier tidak boleh kosong.';
      }

      return null;
    }, [
      settings.earningMode,
      tiers,
    ]);

  const handleSave =
    async () => {
      if (
        validationMessage
      ) {
        setSaveMessage(
          validationMessage,
        );
        return;
      }

      setIsSaving(true);
      setSaveMessage(null);

      try {
        const payload = {
          mitraSlug,
          branchSlug,
          settings,
          tiers:
            tiers.map(
              (
                tier,
                index,
              ) => ({
                ...tier,
                code:
                  tier.code ||
                  normalizeTierCode(
                    tier.name,
                  ),
                sortOrder:
                  index + 1,
              }),
            ),
        };

        const response =
          await fetch(
            '/api/loyalty/settings',
            {
              method: 'PUT',
              credentials:
                'include',
              headers: {
                Accept:
                  'application/json',
                'Content-Type':
                  'application/json',
              },
              body:
                JSON.stringify(
                  payload,
                ),
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
              'Gagal menyimpan konfigurasi loyalty.',
          );
        }

        setSaveMessage(
          result.message ||
            'Konfigurasi loyalty berhasil disimpan.',
        );
      } catch {
        setSaveMessage(
          'Gagal menyimpan konfigurasi loyalty.',
        );
      } finally {
        setIsSaving(false);
      }
    };

  if (isLoading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center rounded-[2rem] border border-stone-200 bg-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-stone-200 border-t-[var(--color-primary)]" />
          <p className="text-xs font-bold uppercase tracking-widest text-stone-400">
            Memuat konfigurasi loyalty
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      <section className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm md:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <Gift className="h-5 w-5 text-amber-500" />
              <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-600">
                Loyalty Program
              </span>
            </div>

            <h2 className="font-display text-2xl font-black tracking-tight text-stone-900">
              Konfigurasi Sistem Poin
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-500">
              Konfigurasi berlaku untuk mitra{' '}
              <strong className="text-stone-700">
                {mitraSlug || '-'}
              </strong>
              {branchSlug
                ? ` pada cabang ${branchSlug}`
                : ' pada level mitra'}.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              updateSetting(
                'isEnabled',
                !settings.isEnabled,
              )
            }
            className={`inline-flex min-w-[190px] items-center justify-center gap-3 rounded-2xl border px-5 py-4 text-xs font-black uppercase tracking-widest transition ${
              settings.isEnabled
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-stone-200 bg-stone-50 text-stone-500'
            }`}
          >
            {settings.isEnabled ? (
              <ToggleRight className="h-6 w-6" />
            ) : (
              <ToggleLeft className="h-6 w-6" />
            )}
            {settings.isEnabled
              ? 'Program Aktif'
              : 'Program Nonaktif'}
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <SummaryCard
          icon={Coins}
          iconClass="bg-amber-50 text-amber-600"
          label="Poin Beredar"
          value={stats.pointsInCirculation.toLocaleString('id-ID')}
          description="Saldo poin aktif pada scope ini"
        />

        <SummaryCard
          icon={Users}
          iconClass="bg-blue-50 text-blue-600"
          label="Member Berpoin"
          value={stats.membersWithPoints.toLocaleString('id-ID')}
          description="Member dengan saldo poin aktif"
        />

        <SummaryCard
          icon={History}
          iconClass="bg-violet-50 text-violet-600"
          label="Transaksi Poin"
          value={stats.pointTransactions.toLocaleString('id-ID')}
          description="Jumlah seluruh mutasi poin"
        />
      </section>

      <section className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm">
        <SectionHeader
          icon={TrendingUp}
          iconClass="bg-emerald-50 text-emerald-700"
          title="Metode Perolehan Poin"
          description="Pilih salah satu metode perolehan poin untuk mitra ini."
        />

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <ModeButton
            active={
              settings.earningMode ===
              'fixed_ratio'
            }
            title="Rasio Nominal"
            description="Contoh: Rp10.000 mendapatkan 1 poin."
            onClick={() =>
              updateSetting(
                'earningMode',
                'fixed_ratio',
              )
            }
          />

          <ModeButton
            active={
              settings.earningMode ===
              'tier_percentage'
            }
            title="Persentase per Tier"
            description="Persentase reward berbeda untuk setiap tier."
            onClick={() =>
              updateSetting(
                'earningMode',
                'tier_percentage',
              )
            }
          />
        </div>
      </section>

      {settings.earningMode ===
      'fixed_ratio' ? (
        <section className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm">
          <SectionHeader
            icon={TrendingUp}
            iconClass="bg-emerald-50 text-emerald-700"
            title="Skema Rasio Nominal"
            description="Atur jumlah poin berdasarkan kelipatan nilai transaksi."
          />

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <CurrencyInput
              label="Setiap nominal transaksi"
              value={
                settings.earningAmount
              }
              min={1}
              onChange={(value) =>
                updateSetting(
                  'earningAmount',
                  value,
                )
              }
            />

            <NumberInput
              label="Poin yang diperoleh"
              value={
                settings.earningPoints
              }
              min={1}
              suffix="poin"
              icon={
                <Coins className="h-4 w-4 text-amber-500" />
              }
              onChange={(value) =>
                updateSetting(
                  'earningPoints',
                  value,
                )
              }
            />

            <CurrencyInput
              label="Minimum transaksi"
              value={
                settings.minimumTransaction
              }
              min={0}
              onChange={(value) =>
                updateSetting(
                  'minimumTransaction',
                  value,
                )
              }
            />

            <NullableNumberInput
              label="Maksimum poin per order"
              value={
                settings.maximumPointsPerOrder
              }
              suffix="poin"
              placeholder="Tidak dibatasi"
              onChange={(value) =>
                updateSetting(
                  'maximumPointsPerOrder',
                  value,
                )
              }
            />
          </div>

          <div className="mt-5 rounded-xl border border-emerald-100 bg-emerald-50 p-4">
            <p className="text-xs font-bold text-emerald-700">
              Contoh perhitungan
            </p>
            <p className="mt-1 text-xs leading-relaxed text-emerald-800/70">
              Transaksi Rp25.000 menghasilkan{' '}
              <strong>
                {previewPoints}
              </strong>{' '}
              poin.
            </p>
          </div>
        </section>
      ) : (
        <section className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <SectionHeader
              icon={Users}
              iconClass="bg-blue-50 text-blue-600"
              title="Tier Loyalty per Mitra"
              description="Nama, batas, persentase, dan status tier dapat diubah."
              compact
            />

            <button
              type="button"
              onClick={addTier}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-black uppercase tracking-widest text-emerald-700"
            >
              <Plus className="h-4 w-4" />
              Tambah Tier
            </button>
          </div>

          <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-2">
            <ModeButton
              active={
                settings.tierBasis ===
                'lifetime_spending'
              }
              title="Berdasarkan Total Belanja"
              description="Tier naik dari total belanja kumulatif member."
              onClick={() =>
                updateSetting(
                  'tierBasis',
                  'lifetime_spending',
                )
              }
            />

            <ModeButton
              active={
                settings.tierBasis ===
                'lifetime_points'
              }
              title="Berdasarkan Lifetime Points"
              description="Tier naik dari total poin yang pernah diperoleh."
              onClick={() =>
                updateSetting(
                  'tierBasis',
                  'lifetime_points',
                )
              }
            />
          </div>

          <div className="space-y-4">
            {tiers.map(
              (tier, index) => (
                <div
                  key={tier.id}
                  className={`rounded-2xl border p-4 ${
                    tier.isActive
                      ? 'border-stone-200 bg-white'
                      : 'border-stone-200 bg-stone-50 opacity-70'
                  }`}
                >
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <GripVertical className="h-5 w-5 text-stone-300" />
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-stone-400">
                          Tier {index + 1}
                        </p>
                        <p className="text-sm font-black text-stone-900">
                          {tier.name || 'Nama tier belum diisi'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          updateTier(
                            tier.id,
                            'isActive',
                            !tier.isActive,
                          )
                        }
                        className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-[10px] font-bold uppercase tracking-widest ${
                          tier.isActive
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : 'border-stone-200 bg-white text-stone-400'
                        }`}
                      >
                        {tier.isActive ? (
                          <ToggleRight className="h-4 w-4" />
                        ) : (
                          <ToggleLeft className="h-4 w-4" />
                        )}
                        {tier.isActive ? 'Aktif' : 'Nonaktif'}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          removeTier(
                            tier.id,
                          )
                        }
                        disabled={
                          tiers.length <= 1
                        }
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-100 bg-red-50 text-red-500 disabled:cursor-not-allowed disabled:opacity-30"
                        title="Hapus tier"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <TextInput
                      label="Nama Tier"
                      value={tier.name}
                      placeholder="Contoh: Gold"
                      onChange={(value) =>
                        updateTier(
                          tier.id,
                          'name',
                          value,
                        )
                      }
                    />

                    {settings.tierBasis ===
                    'lifetime_spending' ? (
                      <CurrencyInput
                        label="Minimum Total Belanja"
                        value={
                          tier.minimumSpending
                        }
                        min={0}
                        onChange={(value) =>
                          updateTier(
                            tier.id,
                            'minimumSpending',
                            value,
                          )
                        }
                      />
                    ) : (
                      <NumberInput
                        label="Minimum Lifetime Points"
                        value={
                          tier.minimumLifetimePoints
                        }
                        min={0}
                        suffix="poin"
                        onChange={(value) =>
                          updateTier(
                            tier.id,
                            'minimumLifetimePoints',
                            value,
                          )
                        }
                      />
                    )}

                    <DecimalInput
                      label="Persentase Reward"
                      value={
                        tier.earningPercentage
                      }
                      min={0}
                      max={100}
                      suffix="%"
                      onChange={(value) =>
                        updateTier(
                          tier.id,
                          'earningPercentage',
                          value,
                        )
                      }
                    />

                    <TextInput
                      label="Kode Tier"
                      value={tier.code}
                      placeholder="gold"
                      onChange={(value) =>
                        updateTier(
                          tier.id,
                          'code',
                          normalizeTierCode(
                            value,
                          ),
                        )
                      }
                    />
                  </div>
                </div>
              ),
            )}
          </div>

          <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-4">
            <p className="text-xs font-bold text-blue-700">
              Contoh perhitungan tier
            </p>
            <p className="mt-1 text-xs leading-relaxed text-blue-800/70">
              Untuk transaksi Rp25.000, tier aktif pertama menghasilkan sekitar{' '}
              <strong>
                {previewPoints}
              </strong>{' '}
              poin dengan nilai 1 poin Rp
              {settings.redemptionValue.toLocaleString('id-ID')}.
            </p>
          </div>
        </section>
      )}

      <section className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm">
        <SectionHeader
          icon={BadgeDollarSign}
          iconClass="bg-violet-50 text-violet-600"
          title="Skema Penukaran Poin"
          description="Atur nilai diskon dan batas penggunaan poin."
        />

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <CurrencyInput
            label="Nilai 1 poin"
            value={
              settings.redemptionValue
            }
            min={1}
            onChange={(value) =>
              updateSetting(
                'redemptionValue',
                value,
              )
            }
          />

          <NumberInput
            label="Minimum penukaran"
            value={
              settings.minimumRedeemPoints
            }
            min={1}
            suffix="poin"
            icon={
              <Coins className="h-4 w-4 text-amber-500" />
            }
            onChange={(value) =>
              updateSetting(
                'minimumRedeemPoints',
                value,
              )
            }
          />

          <NullableNumberInput
            label="Maksimum poin per order"
            value={
              settings.maximumRedeemPoints
            }
            suffix="poin"
            placeholder="Tidak dibatasi"
            onChange={(value) =>
              updateSetting(
                'maximumRedeemPoints',
                value,
              )
            }
          />

          <NumberInput
            label="Maksimum pembayaran dengan poin"
            value={
              settings.maximumRedeemPercentage
            }
            min={1}
            max={100}
            suffix="%"
            icon={
              <Percent className="h-4 w-4 text-violet-500" />
            }
            onChange={(value) =>
              updateSetting(
                'maximumRedeemPercentage',
                value,
              )
            }
          />
        </div>

        <div className="mt-5">
          <ToggleCard
            enabled={
              settings.allowWithCoupon
            }
            icon={TicketPercent}
            title="Boleh digabung dengan kupon"
            description="Izinkan pelanggan memakai poin dan kupon pada transaksi yang sama."
            onToggle={() =>
              updateSetting(
                'allowWithCoupon',
                !settings.allowWithCoupon,
              )
            }
          />
        </div>
      </section>

      <section className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm">
        <SectionHeader
          icon={CalendarClock}
          iconClass="bg-blue-50 text-blue-600"
          title="Masa Berlaku Poin"
          description="Atur apakah saldo poin dapat kedaluwarsa."
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_240px]">
          <ToggleCard
            enabled={
              settings.expirationEnabled
            }
            icon={CalendarClock}
            title="Aktifkan masa berlaku poin"
            description="Poin akan kedaluwarsa setelah periode tertentu."
            onToggle={() =>
              updateSetting(
                'expirationEnabled',
                !settings.expirationEnabled,
              )
            }
          />

          <label
            className={
              settings.expirationEnabled
                ? 'block'
                : 'pointer-events-none block opacity-40'
            }
          >
            <span className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-stone-500">
              Kedaluwarsa setelah
            </span>

            <div className="flex items-center rounded-xl border border-stone-200 bg-stone-50 px-4">
              <input
                type="number"
                min={1}
                value={
                  settings.expirationDays
                }
                onChange={(event) =>
                  updateSetting(
                    'expirationDays',
                    Number(
                      event.target.value,
                    ),
                  )
                }
                className="w-full bg-transparent py-3 text-sm font-bold text-stone-900 outline-none"
              />
              <span className="text-xs font-bold text-stone-400">
                hari
              </span>
            </div>
          </label>
        </div>
      </section>

      <div className="sticky bottom-4 z-20 flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white/95 p-4 shadow-xl backdrop-blur md:flex-row md:items-center md:justify-between">
        <div>
          <p
            className={`text-sm font-black ${
              validationMessage
                ? 'text-red-600'
                : 'text-stone-900'
            }`}
          >
            {saveMessage ||
              validationMessage ||
              'Simpan perubahan konfigurasi loyalty'}
          </p>

          <p className="mt-1 text-xs text-stone-500">
            Nama dan aturan tier disimpan per mitra, serta dapat dibedakan lagi per cabang.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={
            isSaving ||
            Boolean(
              validationMessage,
            )
          }
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-6 py-3 text-xs font-black uppercase tracking-widest text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Save className="h-4 w-4" />
          {isSaving
            ? 'Menyimpan...'
            : 'Simpan Pengaturan'}
        </button>
      </div>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  iconClass,
  label,
  value,
  description,
}: {
  icon: typeof Coins;
  iconClass: string;
  label: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-stone-200 bg-white p-5 shadow-sm">
      <div
        className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl ${iconClass}`}
      >
        <Icon className="h-5 w-5" />
      </div>

      <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">
        {label}
      </p>

      <p className="mt-1 font-display text-2xl font-black text-stone-900">
        {value}
      </p>

      <p className="mt-1 text-xs text-stone-400">
        {description}
      </p>
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  iconClass,
  title,
  description,
  compact = false,
}: {
  icon: typeof Coins;
  iconClass: string;
  title: string;
  description: string;
  compact?: boolean;
}) {
  return (
    <div
      className={
        compact
          ? 'flex items-center gap-3'
          : 'mb-6 flex items-center gap-3'
      }
    >
      <div
        className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconClass}`}
      >
        <Icon className="h-5 w-5" />
      </div>

      <div>
        <h3 className="font-black text-stone-900">
          {title}
        </h3>

        <p className="text-xs text-stone-500">
          {description}
        </p>
      </div>
    </div>
  );
}

function ModeButton({
  active,
  title,
  description,
  onClick,
}: {
  active: boolean;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-4 text-left transition ${
        active
          ? 'border-emerald-300 bg-emerald-50 ring-2 ring-emerald-100'
          : 'border-stone-200 bg-stone-50 hover:border-stone-300'
      }`}
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-sm font-black text-stone-900">
          {title}
        </p>

        <span
          className={`h-4 w-4 rounded-full border-4 ${
            active
              ? 'border-emerald-600 bg-white'
              : 'border-stone-300 bg-white'
          }`}
        />
      </div>

      <p className="text-xs leading-relaxed text-stone-500">
        {description}
      </p>
    </button>
  );
}

function TextInput({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-stone-500">
        {label}
      </span>

      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(event) =>
          onChange(
            event.target.value,
          )
        }
        className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-bold text-stone-900 outline-none placeholder:font-medium placeholder:text-stone-400 focus:border-emerald-400"
      />
    </label>
  );
}

function CurrencyInput({
  label,
  value,
  min,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-stone-500">
        {label}
      </span>

      <div className="flex items-center rounded-xl border border-stone-200 bg-stone-50 px-4">
        <span className="text-sm font-bold text-stone-500">
          Rp
        </span>

        <input
          type="number"
          min={min}
          value={value}
          onChange={(event) =>
            onChange(
              Number(
                event.target.value,
              ),
            )
          }
          className="w-full bg-transparent px-3 py-3 text-sm font-bold text-stone-900 outline-none"
        />
      </div>
    </label>
  );
}

function NumberInput({
  label,
  value,
  min,
  max,
  suffix,
  icon,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max?: number;
  suffix: string;
  icon?: React.ReactNode;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-stone-500">
        {label}
      </span>

      <div className="flex items-center rounded-xl border border-stone-200 bg-stone-50 px-4">
        {icon}

        <input
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={(event) =>
            onChange(
              Number(
                event.target.value,
              ),
            )
          }
          className="w-full bg-transparent px-3 py-3 text-sm font-bold text-stone-900 outline-none"
        />

        <span className="text-xs font-bold text-stone-400">
          {suffix}
        </span>
      </div>
    </label>
  );
}

function DecimalInput({
  label,
  value,
  min,
  max,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  suffix: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-stone-500">
        {label}
      </span>

      <div className="flex items-center rounded-xl border border-stone-200 bg-stone-50 px-4">
        <input
          type="number"
          min={min}
          max={max}
          step="0.001"
          value={value}
          onChange={(event) =>
            onChange(
              Number(
                event.target.value,
              ),
            )
          }
          className="w-full bg-transparent py-3 text-sm font-bold text-stone-900 outline-none"
        />

        <span className="text-xs font-bold text-stone-400">
          {suffix}
        </span>
      </div>
    </label>
  );
}

function NullableNumberInput({
  label,
  value,
  suffix,
  placeholder,
  onChange,
}: {
  label: string;
  value: number | null;
  suffix: string;
  placeholder: string;
  onChange: (
    value: number | null,
  ) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-stone-500">
        {label}
      </span>

      <div className="flex items-center rounded-xl border border-stone-200 bg-stone-50 px-4">
        <input
          type="number"
          min={1}
          value={value ?? ''}
          placeholder={placeholder}
          onChange={(event) => {
            const rawValue =
              event.target.value;

            onChange(
              rawValue === ''
                ? null
                : Number(
                    rawValue,
                  ),
            );
          }}
          className="w-full bg-transparent py-3 text-sm font-bold text-stone-900 outline-none placeholder:font-medium placeholder:text-stone-400"
        />

        <span className="text-xs font-bold text-stone-400">
          {suffix}
        </span>
      </div>
    </label>
  );
}

function ToggleCard({
  enabled,
  icon: Icon,
  title,
  description,
  onToggle,
}: {
  enabled: boolean;
  icon: typeof Coins;
  title: string;
  description: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`flex w-full items-center justify-between rounded-xl border p-4 text-left transition ${
        enabled
          ? 'border-emerald-200 bg-emerald-50'
          : 'border-stone-200 bg-stone-50'
      }`}
    >
      <div className="flex items-center gap-3">
        <Icon
          className={`h-5 w-5 ${
            enabled
              ? 'text-emerald-700'
              : 'text-stone-400'
          }`}
        />

        <div>
          <p className="text-sm font-bold text-stone-800">
            {title}
          </p>

          <p className="text-xs text-stone-500">
            {description}
          </p>
        </div>
      </div>

      {enabled ? (
        <ToggleRight className="h-6 w-6 text-emerald-700" />
      ) : (
        <ToggleLeft className="h-6 w-6 text-stone-400" />
      )}
    </button>
  );
}