const trimLeadingSlashes = (value: string): string => value.replace(/^\/+/, "");

const encodePathSegments = (value: string): string =>
  value
    .split("/")
    .filter((segment) => segment.length > 0)
    .map((segment) => encodeURIComponent(segment))
    .join("/");

export const publicAssetUrl = (relativePath: string): string => {
  const safeRelativePath = encodePathSegments(trimLeadingSlashes(relativePath));

  if (typeof window !== "undefined" && window.location.protocol === "file:") {
    const baseDir = new URL("./", window.location.href);
    return new URL(safeRelativePath, baseDir).toString();
  }

  const base = import.meta.env.BASE_URL || "/";
  const normalizedBase = base.endsWith("/") ? base : `${base}/`;
  return `${normalizedBase}${safeRelativePath}`;
};
