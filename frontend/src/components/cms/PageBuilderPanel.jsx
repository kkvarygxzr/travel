import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ArrowUp, ArrowDown, ChevronDown, ChevronUp, Eye, EyeOff, Plus, Trash2, Save, ExternalLink, Loader2,
} from "lucide-react";
import apiClient from "@/services/apiClient";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingState, ErrorState } from "@/components/shared/DataStates";
import { PAGES, SECTION_META } from "@/lib/siteSections";

// Page Builder: susun/urutkan/matikan section halaman publik + override teks & gambar.
// Field kosong = teks bawaan situs (dua bahasa) tetap dipakai — aman utk mulai bertahap.

const PAGE_URL = { home: "/", about: "/about", contact: "/contact" };

function FieldEditor({ spec, value, onChange, testId }) {
  if (spec.kind === "textarea") {
    return <Textarea className="min-h-[64px] text-[12.5px]" value={value || ""} placeholder="(kosong = teks bawaan)"
      onChange={(e) => onChange(e.target.value)} data-testid={testId} />;
  }
  if (spec.kind === "lines") {
    return <Textarea className="min-h-[64px] text-[12.5px]" value={Array.isArray(value) ? value.join("\n") : ""}
      placeholder={"(kosong = bawaan)\nSatu item per baris"}
      onChange={(e) => onChange(e.target.value.split("\n").map((x) => x.trim()).filter(Boolean))} data-testid={testId} />;
  }
  return <Input className="!h-8 text-[12.5px]" value={value || ""} placeholder="(kosong = teks bawaan)"
    onChange={(e) => onChange(e.target.value)} data-testid={testId} />;
}

function ItemsEditor({ spec, value, onChange, testId }) {
  const rows = Array.isArray(value) ? value : [];
  const setRow = (i, k, v) => onChange(rows.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));
  return (
    <div className="space-y-2">
      {rows.length === 0 ? (
        <p className="text-[11.5px] text-[#8E8E93]">(kosong = daftar bawaan situs dipakai)</p>
      ) : rows.map((r, i) => (
        <div key={i} className="rounded-lg border border-[#E9E9EE] bg-[#FAFAFC] p-2.5">
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {spec.itemFields.map((f) => (
              <div key={f.key} className={f.kind === "textarea" ? "sm:col-span-2" : ""}>
                <label className="text-[10.5px] font-semibold uppercase tracking-wide text-[#8E8E93]">{f.label}</label>
                <FieldEditor spec={f} value={r[f.key]} onChange={(v) => setRow(i, f.key, v)} testId={`${testId}-${i}-${f.key}`} />
              </div>
            ))}
          </div>
          <button className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-[#A8221A]"
            onClick={() => onChange(rows.filter((_, idx) => idx !== i))} data-testid={`${testId}-del-${i}`}>
            <Trash2 size={11} /> Hapus item
          </button>
        </div>
      ))}
      <button className="secondary-button !h-7 !px-2.5 !text-[11px]"
        onClick={() => onChange([...rows, {}])} data-testid={`${testId}-add`}>
        <Plus size={11} /> Tambah item
      </button>
    </div>
  );
}

function SectionCard({ sec, idx, total, onMove, onToggle, onChangeData, onDelete }) {
  const [open, setOpen] = useState(false);
  const meta = SECTION_META[sec.type] || { label: sec.type, fields: [] };
  const setField = (key, v) => onChangeData({ ...(sec.data || {}), [key]: v });
  return (
    <div className={`rounded-xl border ${sec.enabled ? "border-[#E9E9EE] bg-white" : "border-dashed border-[#D8D8DE] bg-[#FAFAFC] opacity-70"}`}
      data-testid={`pb-section-${sec.id}`}>
      <div className="flex flex-wrap items-center gap-2 px-3.5 py-2.5">
        <div className="flex flex-col gap-0.5">
          <button className="icon-button !h-6 !w-6" disabled={idx === 0} onClick={() => onMove(idx, -1)} data-testid={`pb-up-${sec.id}`}><ArrowUp size={12} /></button>
          <button className="icon-button !h-6 !w-6" disabled={idx === total - 1} onClick={() => onMove(idx, 1)} data-testid={`pb-down-${sec.id}`}><ArrowDown size={12} /></button>
        </div>
        <div className="min-w-[160px] flex-1">
          <p className="text-[13px] font-bold text-[#1C1C1E]">{meta.label}</p>
          <p className="text-[11px] text-[#8E8E93]">{meta.desc}</p>
        </div>
        <button className="secondary-button !h-7 !px-2.5 !text-[11px]" onClick={() => onToggle(!sec.enabled)} data-testid={`pb-toggle-${sec.id}`}>
          {sec.enabled ? <><Eye size={11} /> Tampil</> : <><EyeOff size={11} /> Disembunyikan</>}
        </button>
        {meta.fields.length ? (
          <button className="secondary-button !h-7 !px-2.5 !text-[11px]" onClick={() => setOpen((v) => !v)} data-testid={`pb-edit-${sec.id}`}>
            {open ? <ChevronUp size={11} /> : <ChevronDown size={11} />} Edit isi
          </button>
        ) : null}
        <button className="icon-button !h-7 !w-7 text-[#A8221A]" onClick={onDelete} data-testid={`pb-delete-${sec.id}`}><Trash2 size={12} /></button>
      </div>
      {open ? (
        <div className="grid grid-cols-1 gap-2.5 border-t border-[#F0F0F3] px-3.5 py-3 sm:grid-cols-2">
          {meta.fields.map((f) => (
            <div key={f.key} className={f.kind !== "text" ? "sm:col-span-2" : ""}>
              <label className="text-[11px] font-semibold text-[#6B6B73]">{f.label}</label>
              {f.kind === "items"
                ? <ItemsEditor spec={f} value={(sec.data || {})[f.key]} onChange={(v) => setField(f.key, v)} testId={`pb-items-${sec.id}-${f.key}`} />
                : <FieldEditor spec={f} value={(sec.data || {})[f.key]} onChange={(v) => setField(f.key, v)} testId={`pb-field-${sec.id}-${f.key}`} />}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function PageBuilderPanel() {
  const [slug, setSlug] = useState("home");
  const [sections, setSections] = useState([]);
  const [allowed, setAllowed] = useState([]);
  const [addType, setAddType] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const load = useCallback(async (s) => {
    setLoading(true); setError(null); setDirty(false);
    try {
      const { data } = await apiClient.get(`/site/pages/${s}`);
      setSections(Array.isArray(data.sections) ? data.sections : []);
      setAllowed(Array.isArray(data.allowed_types) ? data.allowed_types : []);
    } catch (e) { setError(e?.response?.data?.detail || "Gagal memuat halaman"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(slug); }, [slug, load]);

  const patch = (fn) => { setSections(fn); setDirty(true); };
  const move = (idx, dir) => patch((rows) => {
    const next = [...rows];
    const [it] = next.splice(idx, 1);
    next.splice(idx + dir, 0, it);
    return next;
  });
  const save = async () => {
    setSaving(true);
    try {
      await apiClient.put(`/site/pages/${slug}`, { sections });
      toast.success("Halaman disimpan — perubahan langsung tampil di situs");
      setDirty(false);
    } catch (e) { toast.error(e?.response?.data?.detail || "Gagal menyimpan"); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-3" data-testid="page-builder-panel">
      <div className="flex flex-wrap items-center gap-2">
        <div className="w-[200px]">
          <Select value={slug} onValueChange={setSlug}>
            <SelectTrigger data-testid="pb-page-select"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PAGES.map((p) => <SelectItem key={p.slug} value={p.slug} data-testid={`pb-page-opt-${p.slug}`}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <a href={PAGE_URL[slug]} target="_blank" rel="noreferrer" className="secondary-button !h-9 !px-3 !text-[12px]" data-testid="pb-preview">
          <ExternalLink size={12} /> Lihat halaman
        </a>
        <div className="flex-1" />
        <button className="primary-button !h-9 !px-4 !text-[12.5px]" disabled={saving || !dirty} onClick={save} data-testid="pb-save">
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Simpan Halaman
        </button>
      </div>
      <p className="text-[12px] text-[#6B6B73]">
        Urutkan dengan panah, sembunyikan tanpa menghapus, dan isi teks hanya bila ingin mengganti —
        field kosong tetap memakai teks bawaan situs (dua bahasa).
      </p>
      {loading ? <LoadingState testId="pb-loading" /> : error ? <ErrorState message={error} onRetry={() => load(slug)} /> : (
        <>
          <div className="space-y-2">
            {sections.length === 0 ? (
              <p className="rounded-xl border border-dashed border-[#D8D8DE] px-4 py-8 text-center text-[12.5px] text-[#8E8E93]" data-testid="pb-empty">Belum ada section — tambahkan dari daftar di bawah.</p>
            ) : sections.map((sec, idx) => (
              <SectionCard key={sec.id} sec={sec} idx={idx} total={sections.length}
                onMove={move}
                onToggle={(en) => patch((rows) => rows.map((r) => (r.id === sec.id ? { ...r, enabled: en } : r)))}
                onChangeData={(data) => patch((rows) => rows.map((r) => (r.id === sec.id ? { ...r, data } : r)))}
                onDelete={() => patch((rows) => rows.filter((r) => r.id !== sec.id))} />
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[#E9E9EE] bg-[#FAFAFC] px-3.5 py-3">
            <span className="text-[12px] font-semibold text-[#6B6B73]">Tambah section:</span>
            <div className="w-[240px]">
              <Select value={addType} onValueChange={setAddType}>
                <SelectTrigger className="!h-8 bg-white text-[12px]" data-testid="pb-add-type"><SelectValue placeholder="Pilih tipe section…" /></SelectTrigger>
                <SelectContent>
                  {allowed.map((t) => <SelectItem key={t} value={t} data-testid={`pb-add-opt-${t}`}>{(SECTION_META[t] || {}).label || t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <button className="secondary-button !h-8 !px-3 !text-[11.5px]" disabled={!addType}
              onClick={() => { patch((rows) => [...rows, { id: `new-${Date.now()}`, type: addType, enabled: true, data: {} }]); setAddType(""); }}
              data-testid="pb-add-btn"><Plus size={12} /> Tambahkan</button>
          </div>
        </>
      )}
    </div>
  );
}
