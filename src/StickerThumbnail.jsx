import { useState } from "react";

export default function StickerThumbnail({ src }) {
  const [failedSrc, setFailedSrc] = useState("");

  if (!src || failedSrc === src) {
    return null;
  }

  return (
    <img
      alt=""
      className="hall-card__thumbnail"
      loading="lazy"
      onError={() => setFailedSrc(src)}
      src={src}
    />
  );
}
