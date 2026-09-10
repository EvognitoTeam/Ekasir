"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  BadgePercent,
  CalendarClock,
  Coins,
  Gift,
  Loader2,
  Plus,
  Save,
  ShieldCheck,
  Sparkles,
  Trash2,
  TrendingUp,
  Users,
  WalletCards,
} from "lucide-react";
import { useParams } from "next/navigation";

import { useLanguageStore } from "@/store/language.store";
import { Toast } from "@/utils/toast";

type EarningMode = "fixed_ratio" | "tier_percentage";
type TierBasis = "lifetime_spending" | "lifetime_points";

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
  earningMode: "fixed_ratio",
  tierBasis: "lifetime_spending",
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
  { id: "bronze", name: "Bronze", code: "bronze", minimumSpending: 0, minimumLifetimePoints: 0, earningPercentage: 1, sortOrder: 1, isActive: true },
  { id: "silver", name: "Silver", code: "silver", minimumSpending: 1000000, minimumLifetimePoints: 100, earningPercentage: 1.5, sortOrder: 2, isActive: true },
  { id: "gold", name: "Gold", code: "gold", minimumSpending: 3000000, minimumLifetimePoints: 500, earningPercentage: 2, sortOrder: 3, isActive: true },
  { id: "platinum", name: "Platinum", code: "platinum", minimumSpending: 10000000, minimumLifetimePoints: 1500, earningPercentage: 3, sortOrder: 4, isActive: true },
];

const copy = {
  id: {
    eyebrow: "Organization / Retention",
    title: "Loyalty & Points",
    subtitle: "Atur cara poin diperoleh, tier member, nilai redeem, batas penggunaan, dan masa berlaku poin.",
    active: "Program aktif",
    inactive: "Program nonaktif",
    enabledHelp: "Saat aktif, order yang memenuhi syarat dapat menghasilkan poin sesuai aturan di bawah.",
    pointsCirculation: "Poin beredar",
    members: "Member berpoin",
    transactions: "Transaksi poin",
    earningTitle: "Mesin earning",
    earningSubtitle: "Tentukan bagaimana transaksi dikonversi menjadi poin.",
    fixedRatio: "Rasio tetap",
    fixedRatioDesc: "Contoh: setiap Rp10.000 mendapat 1 poin.",
    tierPercentage: "Persentase per tier",
    tierPercentageDesc: "Reward dihitung dari persentase tier member lalu dikonversi ke poin.",
    every: "Setiap belanja",
    earn: "Dapat poin",
    minimumTransaction: "Minimum transaksi",
    maxPerOrder: "Maksimum poin / order",
    unlimited: "Kosong = tanpa batas",
    preview: "Simulasi Rp25.000",
    previewSuffix: "poin",
    tiersTitle: "Tier member",
    tiersSubtitle: "Susun level member dan persentase reward untuk mode tier.",
    tierBasis: "Basis kenaikan tier",
    spending: "Lifetime spending",
    lifetimePoints: "Lifetime points",
    addTier: "Tambah tier",
    tierName: "Nama tier",
    code: "Kode",
    minSpend: "Min. spending",
    minPoints: "Min. lifetime points",
    earningPercent: "Reward %",
    activeTier: "Aktif",
    moveUp: "Naik",
    moveDown: "Turun",
    remove: "Hapus",
    redemptionTitle: "Redemption",
    redemptionSubtitle: "Atur nilai Rupiah per poin dan seberapa banyak poin dapat digunakan.",
    pointValue: "Nilai 1 poin",
    minRedeem: "Minimum redeem poin",
    maxRedeem: "Maksimum redeem poin",
    maxPercent: "Maksimum % total belanja",
    couponTogether: "Boleh digabung dengan kupon",
    couponTogetherDesc: "Jika dimatikan, poin tidak boleh digunakan bersamaan dengan coupon/promo.",
    expirationTitle: "Masa berlaku poin",
    expirationSubtitle: "Poin baru dapat diberi tanggal kedaluwarsa otomatis.",
    expirationEnable: "Aktifkan kedaluwarsa",
    expirationDays: "Masa berlaku",
    days: "hari",
    save: "Simpan konfigurasi",
    saving: "Menyimpan...",
    validationTier: "Aktifkan minimal satu tier.",
    validationCode: "Kode tier tidak boleh sama.",
    validationName: "Nama tier tidak boleh kosong.",
    loadError: "Gagal mengambil konfigurasi loyalty.",
    saveError: "Gagal menyimpan konfigurasi loyalty.",
    saved: "Konfigurasi loyalty berhasil disimpan.",
    howItWorks: "Preview sistem",
    fixedPreview: "Dengan rasio saat ini, transaksi Rp25.000 menghasilkan",
    tierPreview: "Dengan tier aktif pertama, transaksi Rp25.000 menghasilkan sekitar",
    redeemPreview: "Nilai redeem",
    redeemPreviewText: "10 poin bernilai",
  },
  en: {
    eyebrow: "Organization / Retention",
    title: "Loyalty & Points",
    subtitle: "Configure point earning, member tiers, redemption value, usage limits, and point expiration.",
    active: "Program active",
    inactive: "Program inactive",
    enabledHelp: "When active, eligible orders can earn points based on the rules below.",
    pointsCirculation: "Points in circulation",
    members: "Members with points",
    transactions: "Point transactions",
    earningTitle: "Earning engine",
    earningSubtitle: "Choose how transactions are converted into points.",
    fixedRatio: "Fixed ratio",
    fixedRatioDesc: "Example: every Rp10,000 earns 1 point.",
    tierPercentage: "Percentage by tier",
    tierPercentageDesc: "Reward is calculated from the member tier percentage and converted to points.",
    every: "Every spend",
    earn: "Earn points",
    minimumTransaction: "Minimum transaction",
    maxPerOrder: "Maximum points / order",
    unlimited: "Empty = unlimited",
    preview: "Rp25,000 simulation",
    previewSuffix: "points",
    tiersTitle: "Member tiers",
    tiersSubtitle: "Build member levels and reward percentages for tier mode.",
    tierBasis: "Tier progression basis",
    spending: "Lifetime spending",
    lifetimePoints: "Lifetime points",
    addTier: "Add tier",
    tierName: "Tier name",
    code: "Code",
    minSpend: "Min. spending",
    minPoints: "Min. lifetime points",
    earningPercent: "Reward %",
    activeTier: "Active",
    moveUp: "Up",
    moveDown: "Down",
    remove: "Remove",
    redemptionTitle: "Redemption",
    redemptionSubtitle: "Set the Rupiah value per point and redemption limits.",
    pointValue: "Value of 1 point",
    minRedeem: "Minimum redeem points",
    maxRedeem: "Maximum redeem points",
    maxPercent: "Maximum % of purchase",
    couponTogether: "Allow with coupon",
    couponTogetherDesc: "When disabled, points cannot be redeemed together with a coupon/promo.",
    expirationTitle: "Point expiration",
    expirationSubtitle: "Newly earned points can receive an automatic expiration date.",
    expirationEnable: "Enable expiration",
    expirationDays: "Validity period",
    days: "days",
    save: "Save configuration",
    saving: "Saving...",
    validationTier: "Enable at least one tier.",
    validationCode: "Tier codes must be unique.",
    validationName: "Tier names cannot be empty.",
    loadError: "Failed to load loyalty configuration.",
    saveError: "Failed to save loyalty configuration.",
    saved: "Loyalty configuration saved successfully.",
    howItWorks: "System preview",
    fixedPreview: "With the current ratio, an Rp25,000 transaction earns",
    tierPreview: "With the first active tier, an Rp25,000 transaction earns approximately",
    redeemPreview: "Redemption value",
    redeemPreviewText: "10 points are worth",
  },
} as const;

function normalizeTierCode(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function numberValue(value: string, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function nullableNumber(value: string): number | null {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatIDR(value: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
}

export default function AdminLoyaltyPage() {
  const params = useParams<{ mitraSlug: string }>();
  const mitraSlug = String(params.mitraSlug ?? "");
  const branchSlug: string | null = null;
  const locale = useLanguageStore((state) => state.locale);
  const t = copy[locale];

  const [settings, setSettings] = useState<LoyaltySettings>(INITIAL_SETTINGS);
  const [tiers, setTiers] = useState<LoyaltyTier[]>(INITIAL_TIERS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [stats, setStats] = useState({ pointsInCirculation: 0, membersWithPoints: 0, pointTransactions: 0 });

  useEffect(() => {
    if (!mitraSlug) return;
    const controller = new AbortController();
    const load = async () => {
      setIsLoading(true);
      try {
        const query = new URLSearchParams({ slug: mitraSlug });
        if (branchSlug) query.set("branch_slug", branchSlug);
        const response = await fetch(`/api/loyalty/settings?${query.toString()}`, {
          credentials: "include",
          cache: "no-store",
          signal: controller.signal,
          headers: { Accept: "application/json" },
        });
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.message || t.loadError);
        if (result.data?.settings) setSettings({ ...INITIAL_SETTINGS, ...result.data.settings });
        if (Array.isArray(result.data?.tiers) && result.data.tiers.length > 0) setTiers(result.data.tiers);
        if (result.data?.stats) {
          setStats({
            pointsInCirculation: Number(result.data.stats.pointsInCirculation || 0),
            membersWithPoints: Number(result.data.stats.membersWithPoints || 0),
            pointTransactions: Number(result.data.stats.pointTransactions || 0),
          });
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        console.error("[ADMIN_LOYALTY_LOAD]", error);
        Toast.fire({ icon: "error", title: error instanceof Error ? error.message : t.loadError });
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [mitraSlug, t.loadError]);

  const updateSetting = <K extends keyof LoyaltySettings>(key: K, value: LoyaltySettings[K]) => {
    setSettings((current) => ({ ...current, [key]: value }));
  };

  const updateTier = <K extends keyof LoyaltyTier>(tierId: string, key: K, value: LoyaltyTier[K]) => {
    setTiers((current) => current.map((tier) => {
      if (tier.id !== tierId) return tier;
      if (key === "name" && typeof value === "string") {
        return { ...tier, name: value, code: normalizeTierCode(value) || tier.code };
      }
      return { ...tier, [key]: value };
    }));
  };

  const addTier = () => {
    const next = tiers.length ? Math.max(...tiers.map((tier) => tier.sortOrder)) + 1 : 1;
    setTiers((current) => [...current, {
      id: `tier-${Date.now()}`,
      name: `Tier ${next}`,
      code: `tier-${next}`,
      minimumSpending: 0,
      minimumLifetimePoints: 0,
      earningPercentage: 1,
      sortOrder: next,
      isActive: true,
    }]);
  };

  const removeTier = (id: string) => {
    setTiers((current) => current.filter((tier) => tier.id !== id).map((tier, index) => ({ ...tier, sortOrder: index + 1 })));
  };

  const moveTier = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= tiers.length) return;
    setTiers((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next.map((tier, i) => ({ ...tier, sortOrder: i + 1 }));
    });
  };

  const previewPoints = useMemo(() => {
    const eligibleAmount = 25000;
    if (settings.earningMode === "fixed_ratio") {
      if (settings.earningAmount <= 0 || settings.earningPoints <= 0) return 0;
      return Math.floor(eligibleAmount / settings.earningAmount) * settings.earningPoints;
    }
    const firstActiveTier = [...tiers].filter((tier) => tier.isActive).sort((a, b) => a.sortOrder - b.sortOrder)[0];
    if (!firstActiveTier || settings.redemptionValue <= 0) return 0;
    const rewardValue = Math.floor(eligibleAmount * (firstActiveTier.earningPercentage / 100));
    return Math.floor(rewardValue / settings.redemptionValue);
  }, [settings.earningAmount, settings.earningMode, settings.earningPoints, settings.redemptionValue, tiers]);

  const validationMessage = useMemo(() => {
    if (settings.earningMode === "tier_percentage" && tiers.filter((tier) => tier.isActive).length === 0) return t.validationTier;
    const codes = tiers.map((tier) => tier.code).filter(Boolean);
    if (new Set(codes).size !== codes.length) return t.validationCode;
    if (tiers.some((tier) => !tier.name.trim())) return t.validationName;
    return null;
  }, [settings.earningMode, t.validationCode, t.validationName, t.validationTier, tiers]);

  const handleSave = async () => {
    if (validationMessage) {
      Toast.fire({ icon: "warning", title: validationMessage });
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        mitraSlug,
        branchSlug,
        settings,
        tiers: tiers.map((tier, index) => ({
          ...tier,
          code: tier.code || normalizeTierCode(tier.name),
          sortOrder: index + 1,
        })),
      };
      const response = await fetch("/api/loyalty/settings", {
        method: "PUT",
        credentials: "include",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || t.saveError);
      Toast.fire({ icon: "success", title: result.message || t.saved });
    } catch (error) {
      console.error("[ADMIN_LOYALTY_SAVE]", error);
      Toast.fire({ icon: "error", title: error instanceof Error ? error.message : t.saveError });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="flex min-h-[520px] items-center justify-center bg-[#f7f7f4]"><Loader2 className="h-7 w-7 animate-spin text-black/35" /></div>;
  }

  return (
    <div className="min-h-full bg-[#f7f7f4] text-[#111]">
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-black/35">{t.eyebrow}</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">{t.title}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-black/45">{t.subtitle}</p>
          </div>
          <button type="button" onClick={() => void handleSave()} disabled={isSaving} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-black px-5 text-xs font-bold text-white shadow-sm disabled:opacity-50">
            {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}{isSaving ? t.saving : t.save}
          </button>
        </div>

        <section className={`mt-6 overflow-hidden rounded-[28px] border ${settings.isEnabled ? "border-black/15 bg-black text-white" : "border-black/[0.07] bg-white"}`}>
          <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="flex items-start gap-4">
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${settings.isEnabled ? "bg-white/10" : "bg-[#f2f2ee] text-black/45"}`}><Gift size={18} /></div>
              <div><p className="text-xl font-semibold tracking-[-0.03em]">{settings.isEnabled ? t.active : t.inactive}</p><p className={`mt-1 max-w-2xl text-xs leading-5 ${settings.isEnabled ? "text-white/45" : "text-black/40"}`}>{t.enabledHelp}</p></div>
            </div>
            <Toggle checked={settings.isEnabled} onChange={(value) => updateSetting("isEnabled", value)} inverted={settings.isEnabled} />
          </div>
        </section>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <Metric icon={Coins} label={t.pointsCirculation} value={stats.pointsInCirculation.toLocaleString("id-ID")} />
          <Metric icon={Users} label={t.members} value={stats.membersWithPoints.toLocaleString("id-ID")} />
          <Metric icon={TrendingUp} label={t.transactions} value={stats.pointTransactions.toLocaleString("id-ID")} />
        </div>

        <div className="mt-6 grid gap-5 xl:grid-cols-[1.18fr_.82fr]">
          <div className="space-y-5">
            <Section title={t.earningTitle} subtitle={t.earningSubtitle} icon={Sparkles}>
              <div className="grid gap-3 sm:grid-cols-2">
                <Choice active={settings.earningMode === "fixed_ratio"} title={t.fixedRatio} description={t.fixedRatioDesc} onClick={() => updateSetting("earningMode", "fixed_ratio")} />
                <Choice active={settings.earningMode === "tier_percentage"} title={t.tierPercentage} description={t.tierPercentageDesc} onClick={() => updateSetting("earningMode", "tier_percentage")} />
              </div>

              {settings.earningMode === "fixed_ratio" && (
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <NumberField label={t.every} value={settings.earningAmount} onChange={(v) => updateSetting("earningAmount", v)} prefix="Rp" />
                  <NumberField label={t.earn} value={settings.earningPoints} onChange={(v) => updateSetting("earningPoints", v)} suffix={t.previewSuffix} />
                </div>
              )}

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <NumberField label={t.minimumTransaction} value={settings.minimumTransaction} onChange={(v) => updateSetting("minimumTransaction", v)} prefix="Rp" />
                <NullableNumberField label={t.maxPerOrder} value={settings.maximumPointsPerOrder} onChange={(v) => updateSetting("maximumPointsPerOrder", v)} hint={t.unlimited} />
              </div>
            </Section>

            <Section title={t.tiersTitle} subtitle={t.tiersSubtitle} icon={BadgePercent}>
              <div className="mb-5 grid gap-3 sm:grid-cols-2">
                <Choice active={settings.tierBasis === "lifetime_spending"} title={t.spending} description={t.tierBasis} onClick={() => updateSetting("tierBasis", "lifetime_spending")} compact />
                <Choice active={settings.tierBasis === "lifetime_points"} title={t.lifetimePoints} description={t.tierBasis} onClick={() => updateSetting("tierBasis", "lifetime_points")} compact />
              </div>

              <div className="space-y-3">
                {tiers.map((tier, index) => (
                  <div key={tier.id} className={`rounded-[22px] border p-4 ${tier.isActive ? "border-black/10 bg-[#fafaf7]" : "border-black/[0.06] bg-[#f5f5f2] opacity-60"}`}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-black text-[10px] font-extrabold text-white">{index + 1}</span>
                        <Toggle checked={tier.isActive} onChange={(value) => updateTier(tier.id, "isActive", value)} small />
                      </div>
                      <div className="flex gap-1">
                        <IconButton disabled={index === 0} title={t.moveUp} onClick={() => moveTier(index, -1)}><ArrowUp size={13} /></IconButton>
                        <IconButton disabled={index === tiers.length - 1} title={t.moveDown} onClick={() => moveTier(index, 1)}><ArrowDown size={13} /></IconButton>
                        <IconButton disabled={tiers.length <= 1} title={t.remove} danger onClick={() => removeTier(tier.id)}><Trash2 size={13} /></IconButton>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <TextField label={t.tierName} value={tier.name} onChange={(v) => updateTier(tier.id, "name", v)} />
                      <TextField label={t.code} value={tier.code} onChange={(v) => updateTier(tier.id, "code", normalizeTierCode(v))} mono />
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                      {settings.tierBasis === "lifetime_spending" ? (
                        <NumberField label={t.minSpend} value={tier.minimumSpending} onChange={(v) => updateTier(tier.id, "minimumSpending", v)} prefix="Rp" compact />
                      ) : (
                        <NumberField label={t.minPoints} value={tier.minimumLifetimePoints} onChange={(v) => updateTier(tier.id, "minimumLifetimePoints", v)} compact />
                      )}
                      <NumberField label={t.earningPercent} value={tier.earningPercentage} onChange={(v) => updateTier(tier.id, "earningPercentage", v)} suffix="%" step="0.1" compact />
                      <div className="hidden sm:block" />
                    </div>
                  </div>
                ))}
              </div>
              <button type="button" onClick={addTier} className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl border border-black/10 bg-white px-4 text-[10px] font-extrabold uppercase tracking-[0.08em]"><Plus size={13} />{t.addTier}</button>
            </Section>
          </div>

          <div className="space-y-5">
            <section className="overflow-hidden rounded-[26px] bg-black p-5 text-white shadow-sm sm:p-6">
              <div className="flex items-center justify-between"><div><p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-white/35">{t.howItWorks}</p><h2 className="mt-1 text-xl font-semibold">{t.preview}</h2></div><WalletCards size={20} className="text-white/30" /></div>
              <div className="mt-7 rounded-[20px] bg-white/[0.07] p-4"><p className="text-[10px] leading-5 text-white/45">{settings.earningMode === "fixed_ratio" ? t.fixedPreview : t.tierPreview}</p><p className="mt-2 text-4xl font-semibold tracking-[-0.05em]">{previewPoints} <span className="text-sm text-white/40">{t.previewSuffix}</span></p></div>
              <div className="mt-3 rounded-[20px] border border-white/10 p-4"><p className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-white/30">{t.redeemPreview}</p><p className="mt-2 text-xs text-white/55">{t.redeemPreviewText} <strong className="text-white">{formatIDR(10 * Math.max(0, settings.redemptionValue))}</strong></p></div>
            </section>

            <Section title={t.redemptionTitle} subtitle={t.redemptionSubtitle} icon={Coins}>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                <NumberField label={t.pointValue} value={settings.redemptionValue} onChange={(v) => updateSetting("redemptionValue", v)} prefix="Rp" />
                <NumberField label={t.minRedeem} value={settings.minimumRedeemPoints} onChange={(v) => updateSetting("minimumRedeemPoints", v)} />
                <NullableNumberField label={t.maxRedeem} value={settings.maximumRedeemPoints} onChange={(v) => updateSetting("maximumRedeemPoints", v)} hint={t.unlimited} />
                <NumberField label={t.maxPercent} value={settings.maximumRedeemPercentage} onChange={(v) => updateSetting("maximumRedeemPercentage", v)} suffix="%" />
              </div>
              <div className="mt-5 flex items-start justify-between gap-4 rounded-[18px] bg-[#f5f5f1] p-4"><div><p className="text-xs font-extrabold">{t.couponTogether}</p><p className="mt-1 text-[10px] leading-5 text-black/40">{t.couponTogetherDesc}</p></div><Toggle checked={settings.allowWithCoupon} onChange={(value) => updateSetting("allowWithCoupon", value)} /></div>
            </Section>

            <Section title={t.expirationTitle} subtitle={t.expirationSubtitle} icon={CalendarClock}>
              <div className="flex items-center justify-between gap-4 rounded-[18px] bg-[#f5f5f1] p-4"><p className="text-xs font-extrabold">{t.expirationEnable}</p><Toggle checked={settings.expirationEnabled} onChange={(value) => updateSetting("expirationEnabled", value)} /></div>
              {settings.expirationEnabled && <div className="mt-4"><NumberField label={t.expirationDays} value={settings.expirationDays} onChange={(v) => updateSetting("expirationDays", v)} suffix={t.days} /></div>}
            </Section>

            {validationMessage && <div className="rounded-[20px] border border-amber-200 bg-amber-50 p-4 text-xs font-bold text-amber-800">{validationMessage}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, subtitle, icon: Icon, children }: { title: string; subtitle: string; icon: typeof Gift; children: React.ReactNode }) {
  return <section className="rounded-[26px] border border-black/[0.07] bg-white p-5 shadow-sm sm:p-6"><div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#f2f2ee] text-black/40"><Icon size={16} /></span><div><h2 className="text-lg font-semibold tracking-[-0.025em]">{title}</h2><p className="mt-1 text-[11px] leading-5 text-black/40">{subtitle}</p></div></div><div className="mt-5">{children}</div></section>;
}

function Metric({ icon: Icon, label, value }: { icon: typeof Coins; label: string; value: string }) {
  return <div className="rounded-[22px] border border-black/[0.07] bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><span className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-black/30">{label}</span><Icon size={15} className="text-black/25" /></div><p className="mt-3 text-3xl font-semibold tracking-[-0.05em]">{value}</p></div>;
}

function Toggle({ checked, onChange, small = false, inverted = false }: { checked: boolean; onChange: (value: boolean) => void; small?: boolean; inverted?: boolean }) {
  return <button type="button" onClick={() => onChange(!checked)} className={`relative shrink-0 rounded-full transition ${small ? "h-7 w-12" : "h-8 w-14"} ${checked ? (inverted ? "bg-white" : "bg-black") : "bg-black/15"}`}><span className={`absolute top-1 rounded-full transition-all ${small ? "h-5 w-5" : "h-6 w-6"} ${checked ? (small ? "left-6" : "left-7") : "left-1"} ${checked && inverted ? "bg-black" : "bg-white"}`} /></button>;
}

function Choice({ active, title, description, onClick, compact = false }: { active: boolean; title: string; description: string; onClick: () => void; compact?: boolean }) {
  return <button type="button" onClick={onClick} className={`rounded-[18px] border text-left transition ${compact ? "p-3" : "p-4"} ${active ? "border-black bg-black text-white" : "border-black/[0.08] bg-[#fafaf7]"}`}><p className="text-xs font-extrabold">{title}</p><p className={`mt-1 text-[9px] leading-4 ${active ? "text-white/45" : "text-black/35"}`}>{description}</p></button>;
}

function TextField({ label, value, onChange, mono = false }: { label: string; value: string; onChange: (value: string) => void; mono?: boolean }) {
  return <label className="block"><span className="mb-1.5 block text-[8px] font-extrabold uppercase tracking-[0.12em] text-black/30">{label}</span><input value={value} onChange={(e) => onChange(e.target.value)} className={`h-11 w-full rounded-xl border border-black/[0.08] bg-white px-3 text-xs font-semibold outline-none focus:border-black/20 ${mono ? "font-mono" : ""}`} /></label>;
}

function NumberField({ label, value, onChange, prefix, suffix, step = "1", compact = false }: { label: string; value: number; onChange: (value: number) => void; prefix?: string; suffix?: string; step?: string; compact?: boolean }) {
  return <label className="block"><span className="mb-1.5 block text-[8px] font-extrabold uppercase tracking-[0.12em] text-black/30">{label}</span><div className="relative"><input type="number" min="0" step={step} value={Number.isFinite(value) ? value : 0} onChange={(e) => onChange(numberValue(e.target.value))} className={`w-full rounded-xl border border-black/[0.08] bg-white text-xs font-semibold outline-none focus:border-black/20 ${compact ? "h-10" : "h-11"} ${prefix ? "pl-9" : "pl-3"} ${suffix ? "pr-14" : "pr-3"}`} />{prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[9px] font-bold text-black/30">{prefix}</span>}{suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-bold text-black/30">{suffix}</span>}</div></label>;
}

function NullableNumberField({ label, value, onChange, hint }: { label: string; value: number | null; onChange: (value: number | null) => void; hint: string }) {
  return <label className="block"><span className="mb-1.5 block text-[8px] font-extrabold uppercase tracking-[0.12em] text-black/30">{label}</span><input type="number" min="0" value={value ?? ""} onChange={(e) => onChange(nullableNumber(e.target.value))} placeholder={hint} className="h-11 w-full rounded-xl border border-black/[0.08] bg-white px-3 text-xs font-semibold outline-none placeholder:text-black/20 focus:border-black/20" /></label>;
}

function IconButton({ children, title, onClick, disabled = false, danger = false }: { children: React.ReactNode; title: string; onClick: () => void; disabled?: boolean; danger?: boolean }) {
  return <button type="button" title={title} onClick={onClick} disabled={disabled} className={`flex h-8 w-8 items-center justify-center rounded-lg border border-black/[0.07] bg-white disabled:opacity-25 ${danger ? "text-red-500" : "text-black/45"}`}>{children}</button>;
}
