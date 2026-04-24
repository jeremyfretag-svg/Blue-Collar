"use client";

import Link from "next/link";
import { BadgeCheck, MapPin } from "lucide-react";
import type { Worker } from "@/types";
import BookmarkButton from "./BookmarkButton";
import StarRating from "./StarRating";
import { useCompare } from "@/context/CompareContext";

export default function WorkerCard({ worker }: { worker: Worker }) {
  const { toggle, isSelected, isFull } = useCompare();
  const checked = isSelected(worker.id);

  const initials = worker.name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="relative group flex flex-col gap-4 rounded-xl border bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
      {/* Compare checkbox */}
      <label
        className="absolute top-3 right-3 flex items-center gap-1.5 cursor-pointer z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          type="checkbox"
          checked={checked}
          disabled={!checked && isFull}
          onChange={() => toggle(worker)}
          className="h-4 w-4 rounded border-gray-300 accent-blue-600 cursor-pointer disabled:cursor-not-allowed"
          aria-label={`Compare ${worker.name}`}
        />
        <span className="text-xs text-gray-500 select-none">Compare</span>
      </label>

      <Link href={`/workers/${worker.id}`} className="flex flex-col gap-4">
        {/* Avatar + name */}
        <div className="flex items-center gap-3">
          {worker.avatar ? (
            <img
              src={worker.avatar}
              alt={worker.name}
              className="h-14 w-14 rounded-full object-cover ring-2 ring-blue-100"
            />
          ) : (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 font-bold text-lg">
              {initials}
            </div>
          )}

          <div className="min-w-0 flex-1 pr-16">
            <div className="flex items-center gap-1.5 font-semibold text-gray-800 truncate">
              <span className="truncate">{worker.name}</span>
              {worker.isVerified && (
                <BadgeCheck size={16} className="shrink-0 text-blue-500" aria-label="Verified" />
              )}
            </div>
            <span className="mt-0.5 inline-block rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600">
              {worker.category.name}
            </span>
          </div>

          <BookmarkButton workerId={worker.id} />
        </div>

        {worker.averageRating != null && (
          <div className="flex items-center gap-1.5">
            <StarRating rating={worker.averageRating} />
            <span className="text-xs text-gray-400">
              {worker.averageRating.toFixed(1)} ({worker.reviewCount})
            </span>
          </div>
        )}

        {worker.bio && (
          <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed">{worker.bio}</p>
        )}

        {worker.location && (
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <MapPin size={12} />
            <span>{worker.location}</span>
          </div>
        )}

        <div className="mt-auto pt-1">
          <span className="inline-block w-full rounded-md border border-blue-600 py-1.5 text-center text-sm font-medium text-blue-600 transition-colors group-hover:bg-blue-600 group-hover:text-white">
            View Profile
          </span>
        </div>
      </Link>
    </div>
  );
}
