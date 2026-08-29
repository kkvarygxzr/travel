import { useEffect, useState } from "react";
import apiClient from "@/services/apiClient";

// Page builder situs: ambil urutan + override section dari CMS.
// Gagal fetch / kosong → fallback urutan bawaan agar halaman TIDAK pernah blank.
const DEFAULT_ORDER = {
  home: ["hero", "booking_steps", "value_props", "stats_band", "fleet_featured",
    "destinations_featured", "testimonials", "trust", "faq", "cta_band"],
  about: ["page_hero", "stat_cards", "about_story"],
  contact: ["page_hero", "contact_channels", "contact_cta"],
};

export function ov(d, key, fallback) {
  const v = d && d[key];
  return (typeof v === "string" && v.trim()) || (Array.isArray(v) && v.length) ? v : fallback;
}

export default function useSitePage(slug) {
  const [sections, setSections] = useState(null);
  useEffect(() => {
    let alive = true;
    apiClient.get(`/public/pages/${slug}`)
      .then((r) => {
        if (!alive) return;
        const rows = Array.isArray(r.data?.sections) ? r.data.sections : [];
        setSections(rows.length ? rows : null);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [slug]);
  return sections || (DEFAULT_ORDER[slug] || []).map((type) => ({ id: type, type, data: {} }));
}
