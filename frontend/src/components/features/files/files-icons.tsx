/* eslint-disable i18next/no-literal-string -- artifact library surface */
import React from "react";
import { artFor, FOLDER_ART, baseNameOf } from "./files-filetypes";

/**
 * File and folder artwork, drawn from the asset set in `/filetypes`.
 *
 * These replaced hand-written SVG. The registry in `files-filetypes.ts` is the
 * single place a format maps to a picture, so adding a type is one row there
 * rather than an edit in every component that draws a file.
 *
 * The component API is unchanged from the SVG version on purpose — tiles, table,
 * details panel and trash all still call `<FileArt path kind size />`, so
 * swapping the art was a change to what these render, not to who calls them.
 *
 * Only the MAIN surface uses these. The rail deliberately went back to line
 * icons: a 16px navigation list wants one consistent glyph weight, and detailed
 * artwork shrunk to rail size reads as clutter rather than as information.
 */

export interface IconProps {
  /** Rendered size in px. The assets are 512px square and scale down cleanly. */
  size?: number;
  className?: string;
}

/**
 * One entry's artwork.
 *
 * `alt` is empty and `aria-hidden` is set: the filename is always rendered
 * beside this, so announcing the type twice is noise for a screen reader. The
 * type still reaches assistive tech through the tile's own `title`.
 */
export function FileArt({
  path,
  kind,
  size = 48,
  className,
}: IconProps & { path: string; kind: string }) {
  const [broken, setBroken] = React.useState(false);
  const src = artFor(path, kind);

  // A missing asset must not leave a torn image icon in a file manager. Falling
  // back to a neutral box keeps the tile grid aligned, which a broken <img> at
  // its intrinsic size does not.
  if (broken) {
    return (
      <span
        aria-hidden="true"
        className={`inline-block rounded-sm bg-[var(--cg-bg-hover)] ${className ?? ""}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      loading="lazy"
      draggable={false}
      onError={() => setBroken(true)}
      className={className}
      style={{ width: size, height: size, objectFit: "contain" }}
    />
  );
}

/** A plain folder, for callers that have no path to resolve against. */
export function FolderArt({ size = 48, className }: IconProps) {
  return (
    <img
      src={FOLDER_ART}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      loading="lazy"
      draggable={false}
      className={className}
      style={{ width: size, height: size, objectFit: "contain" }}
    />
  );
}

export { baseNameOf };
