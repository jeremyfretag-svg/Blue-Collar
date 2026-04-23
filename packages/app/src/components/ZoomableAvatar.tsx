"use client";

import { useState } from "react";
import ImageLightbox from "./ImageLightbox";

interface Props {
  src: string;
  alt: string;
  className?: string;
}

export default function ZoomableAvatar({ src, alt, className }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`View full size photo of ${alt}`}
        className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className={className} />
      </button>
      {open && <ImageLightbox src={src} alt={alt} onClose={() => setOpen(false)} />}
    </>
  );
}
