"use client";

import Image from "next/image";
import { useState } from "react";

/** Your profile photo, or your initial when there isn't one (or it won't load). */
export default function Portrait({ photoUrl, initial, className }: { photoUrl: string | null; initial: string; className?: string }) {
  const [failed, setFailed] = useState<string | null>(null);
  const showPhoto = photoUrl !== null && failed !== photoUrl;
  return (
    <span className={className}>
      {showPhoto
        ? <Image src={photoUrl} alt="" fill sizes="240px" unoptimized draggable={false} onError={() => setFailed(photoUrl)} />
        : <span aria-hidden="true">{initial}</span>}
    </span>
  );
}
