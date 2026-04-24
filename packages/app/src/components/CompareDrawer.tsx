"use client";

import { useState } from "react";
import { X, BadgeCheck, MapPin, Star } from "lucide-react";
import { useCompare } from "@/context/CompareContext";
import type { Worker } from "@/types";

function Cell({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 text-sm text-gray-700 border-b ${className}`}>{children}</td>;
}

function Rating({ value }: { value?: number | null }) {
  if (value == null) return <span className="text-gray-400">—</span>;
  return (
    <span className="flex items-center gap-1">
      <Star size={13} className="fill-yellow-400 text-yellow-400" />
      {value.toFixed(1)}
    </span>
  );
}

export default function CompareDrawer() {
  const { selected, remove, clear } = useCompare();
  const [open, setOpen] = useState(false);

  if (selected.length === 0) return null;

  const rows: { label: string; render: (w: Worker) => React.ReactNode }[] = [
    { label: "Category", render: (w) => w.category.name },
    { label: "Rating", render: (w) => <Rating value={w.averageRating} /> },
    { label: "Reviews", render: (w) => w.reviewCount ?? "—" },
    { label: "Location", render: (w) => w.location ? <span className="flex items-center gap-1"><MapPin size={12} />{w.location}</span> : "—" },
    { label: "Verified", render: (w) => w.isVerified ? <BadgeCheck size={16} className="text-blue-500" /> : "—" },
    { label: "Contact", render: (w) => w.email ?? w.phone ?? "—" },
  ];

  return (
    <>
      {/* Sticky bar */}
      <div className="fixed bottom-0 inset-x-0 z-40 bg-white border-t shadow-lg px-4 py-3 flex items-center gap-3">
        <div className="flex items-center gap-2 flex-1 flex-wrap">
          {selected.map((w) => (
            <span key={w.id} className="flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
              {w.name}
              <button onClick={() => remove(w.id)} aria-label={`Remove ${w.name}`}>
                <X size={13} />
              </button>
            </span>
          ))}
        </div>
        <button onClick={clear} className="text-xs text-gray-400 hover:text-gray-600 shrink-0">Clear</button>
        <button
          onClick={() => setOpen(true)}
          className="shrink-0 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Compare ({selected.length})
        </button>
      </div>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-auto rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Compare Workers</h2>
              <button onClick={() => setOpen(false)} aria-label="Close"><X size={20} /></button>
            </div>

            <div className="overflow-x-auto p-4">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-28 border-b" />
                    {selected.map((w) => (
                      <th key={w.id} className="px-4 py-3 border-b">
                        <div className="flex flex-col items-center gap-1">
                          {w.avatar ? (
                            <img src={w.avatar} alt={w.name} className="h-12 w-12 rounded-full object-cover ring-2 ring-blue-100" />
                          ) : (
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600 font-bold">
                              {w.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
                            </div>
                          )}
                          <span className="text-sm font-semibold text-gray-800">{w.name}</span>
                          <button onClick={() => remove(w.id)} className="text-xs text-gray-400 hover:text-red-500">Remove</button>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ label, render }) => (
                    <tr key={label} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-xs font-medium text-gray-500 uppercase border-b">{label}</td>
                      {selected.map((w) => <Cell key={w.id}>{render(w)}</Cell>)}
                    </tr>
                  ))}
                  <tr>
                    <td className="px-4 py-3 border-b" />
                    {selected.map((w) => (
                      <td key={w.id} className="px-4 py-3 border-b">
                        <a
                          href={`/workers/${w.id}`}
                          className="block rounded-md bg-blue-600 py-1.5 text-center text-sm font-medium text-white hover:bg-blue-700"
                        >
                          View Profile
                        </a>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
