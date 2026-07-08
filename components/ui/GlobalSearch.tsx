"use client";
import { useState, useRef, useEffect } from "react";
import {
  Search,
  Camera,
  User,
  Car,
  X,
  Loader2,
  ChevronRight,
} from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import Link from "next/link";
import { useTheme } from "@/lib/ThemeContext";

export default function GlobalSearch() {
  const { isLightMode } = useTheme();
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ persons: any[]; events: any[] }>({
    persons: [],
    events: [],
  });
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [searchingFace, setSearchingFace] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const faceInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        !inputRef.current?.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.length < 2) {
        setResults({ persons: [], events: [] });
        return;
      }
      setLoading(true);
      try {
        const [pRes, eRes] = await Promise.all([
          api.getPersons(),
          api.getEvents({ plate: query, limit: "5" }),
        ]);
        const filteredPersons = (pRes as any[])
          .filter(
            (p) =>
              p.name.toLowerCase().includes(query.toLowerCase()) ||
              p.plateNumbers.some((pl: string) =>
                pl.toLowerCase().includes(query.toLowerCase()),
              ),
          )
          .slice(0, 3);

        setResults({ persons: filteredPersons, events: eRes.data });
        setOpen(true);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const handleFaceSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSearchingFace(true);
    setOpen(false);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const templates = await api.detect(fd, { thumbnail: "true" });
      if (templates.count === 0 || !templates.faces?.[0]?.personId) {
        toast("No matching identified person found in image", "warning");
        return;
      }
      const personId = templates.faces[0].personId;
      window.location.href = `/persons?search=${personId}`;
    } catch (err: any) {
      toast(err.message, "error");
    } finally {
      setSearchingFace(false);
      if (faceInputRef.current) faceInputRef.current.value = "";
    }
  };

  return (
    <div className="relative w-full max-w-md">
      <div className="relative group">
        <div
          className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors ${
            isLightMode
              ? "text-slate-400 group-focus-within:text-[#0A7E8C]"
              : "text-[#566675] group-focus-within:text-[#0A7E8C]"
          }`}
        >
          {loading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Search size={16} strokeWidth={2.5} />
          )}
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length >= 2 && setOpen(true)}
          placeholder="Search plates, names, IDs..."
          className={`w-full border rounded-2xl pl-10 pr-12 py-2 text-sm font-medium transition-all outline-none ${
            isLightMode
              ? "bg-[#F2F2F7] border-transparent text-[#1D1D1F] placeholder:text-slate-400 focus:bg-white focus:border-slate-200 focus:ring-4 focus:ring-slate-100/50"
              : "bg-[#181d22] border-[#222831] text-[#c8d0d8] placeholder:text-[#566675] focus:bg-[#1f262e] focus:border-[#2f3844] focus:ring-4 focus:ring-blue-500/5"
          }`}
        />
        <button
          onClick={() => faceInputRef.current?.click()}
          disabled={searchingFace}
          className={`absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-2xl flex items-center justify-center border border-transparent transition-all ${
            isLightMode
              ? "text-slate-400 hover:text-[#0A7E8C] hover:border-slate-200"
              : "text-[#78899a] hover:text-[#0A7E8C] hover:border-[#0A7E8C]"
          }`}
        >
          {searchingFace ? (
            <Loader2 size={14} className="animate-spin text-[#0A7E8C]" />
          ) : (
            <Camera size={16} strokeWidth={2.5} />
          )}
        </button>
        <input
          type="file"
          ref={faceInputRef}
          onChange={handleFaceSearch}
          accept="image/*"
          className="hidden"
        />
      </div>

      {open && (results.persons.length > 0 || results.events.length > 0) && (
        <div
          ref={dropdownRef}
          className={`absolute top-full left-0 right-0 mt-2 rounded-2xl shadow-2xl border overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2 duration-200 ${
            isLightMode
              ? "bg-white border-slate-100 text-slate-800"
              : "bg-[#181d22] border-[#222831] text-[#c8d0d8]"
          }`}
        >
          {results.persons.length > 0 && (
            <div className="p-2">
              <p
                className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest ${isLightMode ? "text-slate-400" : "text-[#566675]"}`}
              >
                Identified Profiles
              </p>
              {results.persons.map((p) => (
                <Link
                  key={p.id}
                  href={`/persons`}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-2xl transition-colors group ${
                    isLightMode ? "hover:bg-slate-50" : "hover:bg-[#222831]/50"
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      isLightMode
                        ? "bg-[#0A7E8C]/8 text-[#0A7E8C]"
                        : "bg-[#0A7E8C]/10 text-[#0A7E8C]"
                    }`}
                  >
                    <User size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-bold truncate ${isLightMode ? "text-slate-800" : "text-[#c8d0d8]"}`}
                    >
                      {p.name}
                    </p>
                    <p
                      className={`text-[10px] font-bold uppercase tracking-tight ${isLightMode ? "text-slate-400" : "text-[#566675]"}`}
                    >
                      {p.plateNumbers[0]}
                    </p>
                  </div>
                  <ChevronRight
                    size={14}
                    className="text-slate-300 transition-all group-hover:text-[#0A7E8C]"
                  />
                </Link>
              ))}
            </div>
          )}

          {results.events.length > 0 && (
            <div
              className={`p-2 border-t ${isLightMode ? "border-slate-50" : "border-[#222831]"}`}
            >
              <p
                className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest ${isLightMode ? "text-slate-400" : "text-[#566675]"}`}
              >
                Recent Detections
              </p>
              {results.events.map((e) => (
                <Link
                  key={e.id}
                  href={`/events`}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-2xl transition-colors group ${
                    isLightMode ? "hover:bg-slate-50" : "hover:bg-[#222831]/50"
                  }`}
                >
                  <div
                    className={`w-8 h-5 rounded flex items-center justify-center ${
                      isLightMode
                        ? "bg-slate-100 text-slate-400"
                        : "bg-[#222831] text-[#78899a]"
                    }`}
                  >
                    <Car size={12} className="text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-xs font-bold tracking-tight ${isLightMode ? "text-slate-800" : "text-[#c8d0d8]"}`}
                    >
                      {e.plateText}
                    </p>
                    <p
                      className={`text-[9px] font-bold uppercase ${isLightMode ? "text-slate-400" : "text-[#566675]"}`}
                    >
                      {new Date(e.timestamp).toLocaleDateString()}
                    </p>
                  </div>
                  <ChevronRight
                    size={14}
                    className="text-slate-300 transition-all group-hover:text-[#0A7E8C]"
                  />
                </Link>
              ))}
            </div>
          )}

          <div
            className={`p-2 border-t ${
              isLightMode
                ? "bg-slate-50 border-slate-100"
                : "bg-[#12161a] border-[#222831]"
            }`}
          >
            <Link
              href="/events"
              onClick={() => setOpen(false)}
              className="block text-center text-[11px] font-bold hover:underline text-[#0A7E8C]"
            >
              View all historical records
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
