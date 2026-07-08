"use client";
import { useState } from "react";
import useSWR from "swr";
import TopBar from "@/components/ui/TopBar";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";
import { Person } from "@/types";
import {
  Plus,
  Pencil,
  Trash2,
  Users,
  Clock,
  Car,
  User,
  Camera,
  Search,
  ChevronRight,
} from "lucide-react";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { useTheme } from "@/lib/ThemeContext";
import { ActivityListSkeleton } from "@/components/ui/Skeleton";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function PersonForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Partial<Person>;
  onSave: (data: any) => void;
  onCancel: () => void;
}) {
  const { isLightMode } = useTheme();
  const [name, setName] = useState(initial?.name ?? "");
  const [plates, setPlates] = useState(
    (initial?.plateNumbers ?? [""]).join("\n"),
  );
  const [notes, setNotes] = useState(initial?.notes ?? "");

  const submit = () => {
    const plateNumbers = plates
      .split("\n")
      .map((p) => p.trim())
      .filter(Boolean);
    if (!name.trim() || plateNumbers.length === 0) return;
    onSave({
      name: name.trim(),
      plateNumbers,
      notes: notes.trim() || undefined,
    });
  };

  const labelStyle = {
    display: "block",
    fontSize: "11px",
    fontWeight: 700,
    color: isLightMode ? "#8E8E93" : "#78899a",
    marginBottom: 6,
    marginLeft: 4,
    letterSpacing: "0.04em",
    textTransform: "uppercase" as const,
  };

  const inputStyle = isLightMode
    ? "w-full px-4 py-2.5 rounded-2xl border border-slate-200 bg-white text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm font-medium"
    : "w-full px-4 py-2.5 rounded-2xl border border-[#222831] bg-[#0e1114] text-[#c8d0d8] outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm font-medium";

  const cancelBtnColor = isLightMode
    ? "text-slate-400 hover:bg-slate-100"
    : "text-[#78899a] hover:bg-[#181d22]";

  return (
    <div className="space-y-5">
      <div>
        <label style={labelStyle}>Full Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputStyle}
          placeholder="e.g. Tim Cook"
        />
      </div>
      <div>
        <label style={labelStyle}>
          License Plates{" "}
          <span className="text-[10px] font-normal lowercase">
            (one per line)
          </span>
        </label>
        <textarea
          value={plates}
          onChange={(e) => setPlates(e.target.value)}
          rows={3}
          style={{ fontFamily: "SF Mono, monospace", resize: "none" }}
          className={inputStyle}
          placeholder={"ABC-1234\nXYZ-9999"}
        />
      </div>
      <div>
        <label style={labelStyle}>Administrative Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          style={{ resize: "none" }}
          className={inputStyle}
          placeholder="Optional background details…"
        />
      </div>
      <div className="flex gap-3 pt-2">
        <button onClick={submit} className="btn-apple flex-1">
          {initial?.id ? "Save Changes" : "Register Person"}
        </button>
        <button
          onClick={onCancel}
          className={`px-6 py-2.5 rounded-2xl text-sm font-semibold transition-all ${cancelBtnColor}`}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function PersonCard({
  person,
  onEdit,
  onDelete,
  onView,
  onEnrollFace,
}: {
  person: Person;
  onEdit: () => void;
  onDelete: () => void;
  onView: () => void;
  onEnrollFace: () => void;
}) {
  const { isLightMode } = useTheme();

  const cardBg = isLightMode
    ? "bg-white border-slate-100"
    : "bg-[#0e1114] border-[#222831]";
  const headingColor = isLightMode ? "text-slate-800" : "text-[#c8d0d8]";
  const secTextColor = isLightMode ? "text-slate-400" : "text-[#78899a]";
  const thBorder = isLightMode
    ? "border-slate-100 bg-[#F2F2F7]"
    : "border-[#222831] bg-black/35";
  const textIconColor = isLightMode ? "text-slate-300" : "text-[#3d4f5e]";
  const dividerBorder = isLightMode ? "rgba(60,60,67,0.06)" : "#181d22";
  const hoverOverlay = isLightMode
    ? "rgba(0,122,255,0.75)"
    : "rgba(232,160,0,0.75)";

  return (
    <div
      className={`p-5 flex flex-col group hover:scale-[1.01] transition-transform duration-200 border rounded-2xl shadow-sm ${cardBg}`}
    >
      <div className="flex items-start gap-4 flex-1">
        <div
          className={`w-20 h-20 rounded-2xl flex-shrink-0 overflow-hidden flex items-center justify-center relative cursor-pointer shadow-inner border ${thBorder}`}
          onClick={onEnrollFace}
        >
          {(person as any).faceThumbnail ? (
            <img
              src={`data:image/jpeg;base64,${(person as any).faceThumbnail}`}
              alt={person.name}
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <User size={28} className={textIconColor} strokeWidth={1.5} />
          )}
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-300 backdrop-blur-[2px]"
            style={{ background: hoverOverlay }}
          >
            <Camera size={20} className="text-white drop-shadow-md" />
          </div>
        </div>

        <div className="flex-1 min-w-0 pt-1">
          <div className="flex items-start justify-between">
            <h3
              className={`font-bold text-base tracking-tight truncate ${headingColor}`}
            >
              {person.name}
            </h3>
            <div className="flex gap-1">
              <button
                onClick={onEdit}
                aria-label="Edit person"
                className={`p-1.5 rounded transition-all ${
                  isLightMode
                    ? "text-slate-300 hover:text-[#0A7E8C] hover:bg-[#0A7E8C]/8"
                    : "text-[#3d4f5e] hover:text-[#0A7E8C] hover:bg-[#0A7E8C]/10"
                }`}
              >
                <Pencil size={14} />
              </button>
              <button
                onClick={onDelete}
                aria-label="Delete person"
                className={`p-1.5 rounded transition-all ${
                  isLightMode
                    ? "text-slate-300 hover:text-[#FF3B30] hover:bg-red-50"
                    : "text-[#3d4f5e] hover:text-[#d93a3a] hover:bg-red-950/20"
                }`}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {person.plateNumbers.map((p) => (
              <span
                key={p}
                className={`plate-badge text-[10px] py-0.5 px-2 ${
                  isLightMode
                    ? ""
                    : "bg-[#0a0c0e] border border-[#222831] text-[#c8d0d8]"
                }`}
              >
                {p}
              </span>
            ))}
            {(person as any).faceCount > 0 && (
              <span
                className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded"
                style={{ color: "#30D158", background: "rgba(48,209,88,0.1)" }}
              >
                <Camera size={8} /> {(person as any).faceCount} face
                {(person as any).faceCount > 1 ? "s" : ""}
              </span>
            )}
          </div>
          {person.notes && (
            <p
              className={`text-[11px] mt-2 line-clamp-1 italic font-medium ${secTextColor}`}
            >
              "{person.notes}"
            </p>
          )}
        </div>
      </div>

      <div
        className="flex items-center justify-between pt-4 mt-4"
        style={{ borderTop: `1px solid ${dividerBorder}` }}
      >
        <div
          className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest ${secTextColor}`}
        >
          <Clock size={10} />
          {new Date(person.createdAt).toLocaleDateString()}
        </div>
        <button
          onClick={onView}
          className="text-xs font-bold flex items-center gap-1 transition-all text-[#0A7E8C]"
        >
          Activity <ChevronRight size={14} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}

export default function PersonsClient() {
  const { isLightMode } = useTheme();
  const { toast } = useToast();
  const { data: persons = [], mutate } = useSWR<Person[]>(
    "/api/persons",
    fetcher,
  );
  const [addOpen, setAddOpen] = useState(false);
  const [editPerson, setEditPerson] = useState<Person | null>(null);
  const [viewPerson, setViewPerson] = useState<any | null>(null);
  const [search, setSearch] = useState("");
  const [enrollId, setEnrollId] = useState<string | null>(null);

  const handleEnroll = (id: string) => {
    setEnrollId(id);
    const input = document.getElementById("enroll-input") as HTMLInputElement;
    input?.click();
  };

  const uploadFace = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !enrollId) return;
    try {
      const fd = new FormData();
      fd.append("image", file);
      await api.enrollFace(enrollId, fd);
      toast("Face biometric profile updated", "success");
      mutate();
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setEnrollId(null);
      e.target.value = "";
    }
  };

  const filtered = persons.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.plateNumbers.some((pl) =>
        pl.toLowerCase().includes(search.toLowerCase()),
      ),
  );

  const create = async (data: any) => {
    try {
      await api.createPerson(data);
      toast("Person registered successfully", "success");
      mutate();
      setAddOpen(false);
    } catch (e: any) {
      toast(e.message, "error");
    }
  };

  const update = async (data: any) => {
    if (!editPerson) return;
    try {
      await api.updatePerson(editPerson.id, data);
      toast("Profile updated", "success");
      mutate();
      setEditPerson(null);
    } catch (e: any) {
      toast(e.message, "error");
    }
  };

  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    id: string | null;
  }>({ open: false, id: null });

  const remove = async () => {
    if (!confirmState.id) return;
    try {
      await api.deletePerson(confirmState.id);
      toast("Registry entry removed", "info");
      mutate();
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setConfirmState({ open: false, id: null });
    }
  };

  const viewHistory = async (person: Person) => {
    setViewPerson({ name: person.name, plateNumbers: person.plateNumbers, isLoading: true });
    try {
      const data = await api.getPerson(person.id);
      setViewPerson(data);
    } catch (e: any) {
      toast(e.message, "error");
      setViewPerson(null);
    }
  };

  const secTextColor = isLightMode ? "text-slate-400" : "text-[#78899a]";
  const cardBg = isLightMode ? "bg-white" : "bg-[#0e1114]";
  const cardBorder = isLightMode
    ? "border border-slate-100"
    : "border border-[#222831]";
  const inputBg = isLightMode
    ? "bg-[#F2F2F7] text-[#1D1D1F] border-transparent focus-within:border-slate-200 focus-within:bg-white focus-within:ring-4 focus-within:ring-slate-100/50"
    : "bg-[#181d22] text-[#c8d0d8] border-[#222831] focus-within:border-[#2f3844] focus-within:bg-[#0e1114] focus-within:ring-4 focus-within:ring-blue-500/5";
  const dividerBorder = isLightMode ? "border-slate-50" : "border-[#181d22]";
  const visitCardBg = isLightMode
    ? "bg-white border-slate-100"
    : "bg-[#12161a] border-[#222831]";

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <TopBar title="Persons" connected={false} />

      <main className="flex-1 p-6 max-w-6xl w-full mx-auto space-y-6 overflow-y-auto">
        {/* Action Header */}
        <div className="flex flex-col sm:flex-row items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
          <div
            className={`flex items-center gap-3 rounded-2xl px-4 py-2.5 flex-1 border transition-all ${inputBg}`}
          >
            <Search
              size={16}
              strokeWidth={2.5}
              className={isLightMode ? "text-slate-400" : "text-[#78899a]"}
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, plate number..."
              className="text-sm font-medium outline-none flex-1 bg-transparent placeholder-slate-500"
            />
          </div>
          <button
            onClick={() => setAddOpen(true)}
            className="btn-apple h-[46px] px-6 flex items-center gap-2 whitespace-nowrap shadow-md"
          >
            <Plus size={18} strokeWidth={2.5} />
            Add Profile
          </button>
        </div>

        {filtered.length === 0 ? (
          <div
            className={`py-32 text-center rounded-2xl shadow-sm animate-in zoom-in-95 duration-500 border ${cardBg} ${cardBorder}`}
          >
            <div
              className={`w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 ${
                isLightMode ? "bg-slate-50" : "bg-[#12161a]"
              }`}
            >
              <Users
                size={32}
                className={isLightMode ? "text-slate-200" : "text-[#3d4f5e]"}
                strokeWidth={1.5}
              />
            </div>
            <p
              className={`text-lg font-bold ${isLightMode ? "text-slate-800" : "text-[#c8d0d8]"}`}
            >
              Registry Empty
            </p>
            <p className={`text-sm mt-1 max-w-[240px] mx-auto ${secTextColor}`}>
              No matching profiles found in the database.
            </p>
            <button
              onClick={() => setAddOpen(true)}
              className="mt-6 text-sm font-bold text-[#0A7E8C] hover:underline"
            >
              Register first person
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {filtered.map((p) => (
              <PersonCard
                key={p.id}
                person={p}
                onEdit={() => setEditPerson(p)}
                onDelete={() => setConfirmState({ open: true, id: p.id })}
                onView={() => viewHistory(p)}
                onEnrollFace={() => handleEnroll(p.id)}
              />
            ))}
            <input
              id="enroll-input"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={uploadFace}
            />
          </div>
        )}
      </main>

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="New Profile Registration"
      >
        <PersonForm onSave={create} onCancel={() => setAddOpen(false)} />
      </Modal>

      <Modal
        open={!!editPerson}
        onClose={() => setEditPerson(null)}
        title="Update Profile Details"
      >
        {editPerson && (
          <PersonForm
            initial={editPerson}
            onSave={update}
            onCancel={() => setEditPerson(null)}
          />
        )}
      </Modal>

      <Modal
        open={!!viewPerson}
        onClose={() => setViewPerson(null)}
        title={`${viewPerson?.name} Activity`}
        width="max-w-2xl"
      >
        {viewPerson && (
          <div className="space-y-6">
            <div
              className={`flex flex-wrap gap-2 pb-4 border-b ${dividerBorder}`}
            >
              {viewPerson.plateNumbers?.map((p: string) => (
                <span
                  key={p}
                  className={`plate-badge text-[11px] px-3 py-1 ${
                    isLightMode
                      ? ""
                      : "bg-[#0a0c0e] border border-[#222831] text-[#c8d0d8]"
                  }`}
                >
                  {p}
                </span>
              ))}
            </div>

            <div className="space-y-3">
              <p
                className={`text-[10px] font-black uppercase tracking-widest ml-1 ${secTextColor}`}
              >
                Detection Log
              </p>
              {viewPerson.isLoading ? (
                <ActivityListSkeleton count={3} />
              ) : !viewPerson.visits || viewPerson.visits.length === 0 ? (
                <div
                  className={`py-20 text-center rounded-2xl border border-dashed ${
                    isLightMode
                      ? "bg-slate-50/50 border-slate-200"
                      : "bg-black/35 border-[#222831]"
                  }`}
                >
                  <Clock
                    size={24}
                    className={`mx-auto mb-3 ${isLightMode ? "text-slate-200" : "text-[#3d4f5e]"}`}
                  />
                  <p className={`text-xs font-bold ${secTextColor}`}>
                    No events logged yet
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
                  {viewPerson.visits.map((v: any) => (
                    <div
                      key={v.id}
                      className={`flex items-center gap-4 p-3 border rounded-2xl shadow-sm ${visitCardBg}`}
                    >
                      {v.thumbnailBase64 && (
                        <img
                          src={`data:image/jpeg;base64,${v.thumbnailBase64}`}
                          alt={v.plateText}
                          className={`w-20 h-11 object-cover rounded-2xl shadow-sm border ${
                            isLightMode ? "border-white" : "border-[#222831]"
                          }`}
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`plate-badge text-[10px] ${
                              isLightMode
                                ? ""
                                : "bg-[#0a0c0e] border border-[#222831] text-[#c8d0d8]"
                            }`}
                          >
                            {v.plateText}
                          </span>
                          <span className="text-[11px] font-bold text-[#30D158]">
                            {Math.round(v.confidence * 100)}%
                          </span>
                        </div>
                        <p
                          className={`text-[10px] font-bold mt-1 uppercase tracking-tight ${secTextColor}`}
                        >
                          {new Date(v.timestamp).toLocaleString(undefined, {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      <ConfirmModal
        open={confirmState.open}
        title="Delete Person"
        message="Are you sure you want to delete this person? This cannot be undone."
        confirmLabel="Delete"
        onConfirm={remove}
        onCancel={() => setConfirmState({ open: false, id: null })}
      />
    </div>
  );
}
