type Props = {
  mitraName: string;
  address: string;
};

export default function StoreFooter({
  mitraName,
  address,
}: Props) {
  return (
    <footer className="px-4 pb-36 pt-4">
      <div className="rounded-3xl bg-black p-5 text-white">
        <p className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-white/35">
          Served with KALOO
        </p>

        <h3 className="mt-3 text-xl font-black tracking-[-0.04em]">
          {mitraName}
        </h3>

        <p className="mt-2 text-[10px] leading-5 text-white/45">
          {address}
        </p>

        <p className="mt-5 border-t border-white/10 pt-4 text-[8px] font-extrabold uppercase tracking-[0.14em] text-white/25">
          Restaurant Operating System
        </p>
      </div>
    </footer>
  );
}
