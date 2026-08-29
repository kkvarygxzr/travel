import { lazy, Suspense, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Users, ArrowRight, ArrowLeft, Loader2, Check, View, Calendar, Palette, MessageCircle } from "lucide-react";
import { useResource } from "@/hooks/useResource";
import useSEO, { absUrl } from "@/hooks/useSEO";
import { trackViewItem } from "@/lib/tracking";
import { formatCurrency } from "@/utils/formatters";
import FleetSpecGrid from "@/components/public/FleetSpecGrid";
import GlassCard from "@/components/public/GlassCard";
import TripEstimatorInline from "@/components/public/TripEstimatorInline";
import { useLangValue } from "@/hooks/useLang";
import { bi } from "@/lib/i18n";

const PhotoSphereTour = lazy(() => import("@/components/public/PhotoSphereTour"));
// Lightbox di-mount hanya saat dibuka → code-split + defer (FASE 6 performa).
const Lightbox = lazy(() => import("@/components/public/Lightbox"));

export default function FleetDetail() {
  const lang = useLangValue();
  const { id } = useParams();
  const { data: v, loading, error } = useResource(`/public/fleet/${id}`);
  // Funnel iklan: pengunjung melihat detail unit (Meta ViewContent + GA4 view_item).
  useEffect(() => {
    if (v?.id) trackViewItem({ id: v.id, name: v.name, value: v.price_from || 0, category: "armada" });
  }, [v?.id, v?.name, v?.price_from]);
  const [lbOpen, setLbOpen] = useState(false);
  const [lbIndex, setLbIndex] = useState(0);

  // CMS-02 SEO: Product JSON-LD — dipanggil UNCONDITIONALLY (rules-of-hooks).
  const seoGallery = Array.isArray(v?.gallery) && v.gallery.length ? v.gallery : (v?.photos || []).map((u) => ({ url: u, caption: v?.name }));
  const seoHero = (seoGallery[0] && (seoGallery[0].url || seoGallery[0])) || null;
  const seoPoints = [...(Array.isArray(v?.highlights) ? v.highlights : []), ...(Array.isArray(v?.features) ? v.features : [])];
  const seoTitle = v ? bi(`${v.name} · Sewa Armada Premium`, `${v.name} · Premium Vehicle Rental`, lang) : undefined;
  const seoDesc = v ? bi(`Sewa ${v.name} (${v.capacity} kursi) — armada terawat dgn pengemudi profesional. ${seoPoints.slice(0, 3).join(", ")}`, `Rent the ${v.name} (${v.capacity} seats) — a well-maintained vehicle with a professional driver. ${seoPoints.slice(0, 3).join(", ")}`, lang).slice(0, 160) : undefined;
  const seoImage = absUrl(seoHero);
  useSEO({
    title: seoTitle,
    description: seoDesc,
    image: seoImage,
    type: "product",
    jsonLd: v ? {
      "@context": "https://schema.org",
      "@type": "Product",
      name: v.name,
      description: seoDesc,
      image: seoImage || undefined,
      brand: { "@type": "Brand", name: "RahazaTrans" },
      category: "Vehicle Rental",
      ...(v.price_from ? {
        offers: {
          "@type": "Offer",
          priceCurrency: "IDR",
          price: v.price_from,
          availability: "https://schema.org/InStock",
          priceValidUntil: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().slice(0, 10),
        },
      } : {}),
    } : undefined,
  });

  if (loading) return <div className="flex min-h-[70vh] items-center justify-center pt-24 text-muted-foreground" data-testid="fleet-detail-loading"><Loader2 className="mr-2 animate-spin" /> {bi("Memuat…", "Loading…", lang)}</div>;
  if (error || !v) return <div className="flex min-h-[70vh] flex-col items-center justify-center gap-3 pt-24" data-testid="fleet-detail-error"><p className="text-muted-foreground">{bi("Armada tidak ditemukan.", "Vehicle not found.", lang)}</p><Link to="/fleet" className="rounded-full bg-primary px-4 py-2 text-[13px] font-semibold text-primary-foreground">{bi("Kembali ke Armada", "Back to Fleet", lang)}</Link></div>;

  const gallery = Array.isArray(v.gallery) && v.gallery.length ? v.gallery : (v.photos || []).map((u) => ({ url: u, caption: v.name }));
  const heroImg = (gallery[0] && (gallery[0].url || gallery[0])) || null;
  const highlights = Array.isArray(v.highlights) ? v.highlights : [];
  const features = Array.isArray(v.features) ? v.features : [];
  const allPoints = [...highlights, ...features];
  const scenes = Array.isArray(v.tour_scenes) ? v.tour_scenes : [];
  const openLb = (i) => { setLbIndex(i); setLbOpen(true); };
  const waLink = `https://wa.me/6281120003000?text=${encodeURIComponent(bi(`Halo RahazaTrans, saya tertarik menyewa ${v.name}.`, `Hello RahazaTrans, I'm interested in renting the ${v.name}.`, lang))}`;

  return (
    <div>
      {/* HERO */}
      <section className="relative flex min-h-[56vh] items-end overflow-hidden bg-primary">
        <div className="absolute inset-0 bg-cover bg-center" style={heroImg ? { backgroundImage: `url('${heroImg}')` } : undefined} aria-hidden="true" />
        <div className="absolute inset-0" style={{ background: "var(--gradient-hero)" }} aria-hidden="true" />
        <div className="pointer-events-none absolute inset-0 bg-noise opacity-[0.06] mix-blend-overlay" aria-hidden="true" />
        <div className="relative mx-auto w-full max-w-7xl px-4 pb-10 pt-32 sm:px-6 lg:px-8">
          <Link to="/fleet" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-white/80 transition hover:text-white"><ArrowLeft size={15} /> {bi("Semua armada", "All vehicles", lang)}</Link>
          <p className="mt-4 text-[11px] uppercase tracking-[0.2em] text-white/75">{v.code} · {String(v.type).replace(/_/g, " ")}</p>
          <h1 className="mt-2 font-fraunces text-4xl text-white sm:text-5xl">{v.name}</h1>
          <div className="mt-4 flex flex-wrap items-center gap-4 text-[13.5px] text-white/85">
            <span className="inline-flex items-center gap-1.5"><Users size={15} /> {v.capacity} {bi("kursi", "seats", lang)}</span>
            {v.year ? <span className="inline-flex items-center gap-1.5"><Calendar size={14} /> {v.year}</span> : null}
            {v.color ? <span className="inline-flex items-center gap-1.5"><Palette size={14} /> {v.color}</span> : null}
            {scenes.length ? <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[12px] backdrop-blur-sm"><View size={13} /> {bi("Tur Kabin 360°", "360° Cabin Tour", lang)}</span> : null}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.55fr_1fr]">
          {/* LEFT */}
          <div className="space-y-12">
            <div>
              <h2 className="font-fraunces text-2xl text-foreground">{bi("Galeri", "Gallery", lang)}</h2>
              {gallery.length === 0 ? (
                <p className="mt-3 text-[13px] text-muted-foreground" data-testid="fleet-gallery-empty">{bi("Belum ada foto untuk unit ini.", "No photos for this unit yet.", lang)}</p>
              ) : (
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3" data-testid="fleet-gallery">
                  {gallery.map((g, i) => (
                    <button key={i} onClick={() => openLb(i)} data-testid={`fleet-gallery-${i}`} className="group relative aspect-[4/3] overflow-hidden rounded-xl bg-primary">
                      <span className="absolute inset-0 bg-cover bg-center transition duration-500 group-hover:scale-110" style={{ backgroundImage: `url('${g.url || g}')` }} />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {scenes.length ? (
              <div>
                <h2 className="font-fraunces text-2xl text-foreground">{bi("Tur Kabin 360°", "360° Cabin Tour", lang)}</h2>
                <p className="mt-1 text-[13px] text-muted-foreground">{bi("Geser untuk melihat sekeliling kabin; pilih tab untuk berpindah area (depan → tengah → belakang).", "Drag to look around the cabin; pick a tab to switch areas (front → middle → rear).", lang)}</p>
                <Suspense fallback={<div className="mt-4 h-[360px] animate-pulse rounded-2xl bg-muted sm:h-[480px]" data-testid="tour-suspense" />}>
                  <PhotoSphereTour scenes={scenes} className="mt-4" />
                </Suspense>
              </div>
            ) : null}

            <div>
              <h2 className="font-fraunces text-2xl text-foreground">{bi("Spesifikasi", "Specifications", lang)}</h2>
              <FleetSpecGrid specs={v.specs} className="mt-4" />
            </div>

            <div>
              <h2 className="font-fraunces text-2xl text-foreground">{bi("Keunggulan & Fitur", "Highlights & Features", lang)}</h2>
              {allPoints.length === 0 ? (
                <p className="mt-3 text-[13px] text-muted-foreground" data-testid="fleet-highlights-empty">{bi("Belum ada keunggulan tercatat.", "No highlights recorded yet.", lang)}</p>
              ) : (
                <ul className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2" data-testid="fleet-highlights">
                  {allPoints.map((h, i) => (
                    <li key={i} className="flex items-center gap-2 text-[14px] text-foreground/90"><Check size={16} className="flex-shrink-0 text-primary" /> {h}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* RIGHT (sticky) */}
          <div className="space-y-5 lg:sticky lg:top-28 lg:self-start">
            <GlassCard className="p-5">
              {v.price_from ? (
                <>
                  <p className="text-[12px] text-muted-foreground">{bi("Mulai dari", "From", lang)}</p>
                  <p className="font-mono text-2xl font-semibold tabular-nums text-foreground">{formatCurrency(v.price_from)}<span className="text-[13px] font-normal text-muted-foreground">/{bi("hari", "day", lang)}</span></p>
                </>
              ) : (
                <p className="font-fraunces text-xl text-foreground">{v.name}</p>
              )}
              <div className="mt-4 flex flex-col gap-2">
                <Link to={`/booking?type=${encodeURIComponent(v.type || "")}`} data-testid="fleet-detail-book" className="cta-shine flex items-center justify-center gap-2 rounded-lg py-3 text-[14px] font-semibold text-primary-foreground transition hover:opacity-90" style={{ background: "var(--gradient-cta)" }}>{bi("Pesan Unit Ini", "Book This Unit", lang)} <ArrowRight size={15} /></Link>
                <Link to="/quotation" state={{ message: bi(`Tertarik menyewa ${v.name}`, `Interested in renting the ${v.name}`, lang) }} data-testid="fleet-detail-quote" className="flex items-center justify-center gap-2 rounded-lg border border-border bg-card py-3 text-[14px] font-semibold text-foreground transition hover:-translate-y-0.5">{bi("Minta Penawaran", "Request a Quote", lang)}</Link>
                <a href={waLink} target="_blank" rel="noreferrer" data-testid="fleet-detail-wa" className="flex items-center justify-center gap-2 rounded-lg border border-border py-3 text-[14px] font-semibold text-foreground transition hover:bg-secondary"><MessageCircle size={15} /> {bi("Chat WhatsApp", "Chat on WhatsApp", lang)}</a>
              </div>
            </GlassCard>
            <TripEstimatorInline idPrefix="fleet-estimator" defaultVehicleType={v.type} />
          </div>
        </div>
      </div>

      {lbOpen ? (
        <Suspense fallback={null}>
          <Lightbox images={gallery} open={lbOpen} index={lbIndex} onClose={() => setLbOpen(false)} onIndex={setLbIndex} />
        </Suspense>
      ) : null}
    </div>
  );
}
