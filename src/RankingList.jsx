import { useId, useRef } from "react";
import { uiText } from "./ui-text.js";

export default function RankingList({ children, items, title }) {
  const dialogRef = useRef(null);
  const titleId = useId();

  return (
    <>
      {children(items.slice(0, 5))}
      <button
        className="ranking-show-all"
        type="button"
        aria-haspopup="dialog"
        onClick={() => dialogRef.current.showModal()}
      >
        {uiText.rankings.showAll}
      </button>
      <dialog className="ranking-dialog" ref={dialogRef} aria-labelledby={titleId}>
        <div className="ranking-dialog__header">
          <h2 id={titleId}>{title}</h2>
          <button type="button" onClick={() => dialogRef.current.close()}>
            {uiText.rankings.close}
          </button>
        </div>
        <div
          className="ranking-dialog__list"
          onClick={(event) => {
            if (event.target.closest("a")) dialogRef.current.close();
          }}
        >
          {children(items)}
        </div>
      </dialog>
    </>
  );
}
