export function BrandAvatar({ name, logoUrl, color, size = 40 }: { name: string; logoUrl: string | null; color: string; size?: number }) {
  if (logoUrl) {
    // eslint-disable-next-line @next/next/no-img-element -- user uploads served by our own route
    return <img src={logoUrl} alt="" width={size} height={size} className="shrink-0 rounded-lg border bg-white object-contain" style={{ width: size, height: size }} />;
  }
  return (
    <span className="flex shrink-0 items-center justify-center rounded-lg font-semibold text-white" style={{ width: size, height: size, backgroundColor: color }}>
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}
