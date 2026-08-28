import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { uiText } from "./ui-text.js";

export default function StickerThumbnail({ alt = "", src }) {
  const [failedSrc, setFailedSrc] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const thumbnailRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    const thumbnail = thumbnailRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
      thumbnail?.focus();
    };
  }, [isOpen]);

  if (!src || failedSrc === src) {
    return null;
  }

  const openFullSize = () => setIsOpen(true);

  return <>
    <img
      alt={alt}
      aria-label={uiText.common.openFullSize}
      className="hall-card__thumbnail"
      loading="lazy"
      onClick={openFullSize}
      onError={() => setFailedSrc(src)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openFullSize();
        }
      }}
      ref={thumbnailRef}
      role="button"
      src={src}
      tabIndex={0}
    />
    {isOpen && createPortal(
      <div
        aria-label={uiText.common.fullSizeImage}
        aria-modal="true"
        className="sticker-lightbox"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) setIsOpen(false);
        }}
        role="dialog"
      >
        <button
          aria-label={uiText.common.closeFullSize}
          autoFocus
          className="sticker-lightbox__close"
          onClick={() => setIsOpen(false)}
          type="button"
        >
          <span aria-hidden="true">×</span>
        </button>
        <img alt={alt} className="sticker-lightbox__image" src={src} />
      </div>,
      document.body,
    )}
  </>;
}
