// ---------------------------------------------------------------------------
// Electron serves files via file:// protocol in production.
// Absolute paths like "/img/avatars/x.png" break under file:// because
// they resolve from the filesystem root instead of the app folder.
//
// Fix: detect Electron prod via protocol and build the correct base path
// dynamically so avatars resolve correctly in both dev and production.
// ---------------------------------------------------------------------------

const FALLBACK_AVATAR =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

const DEFAULT_AVATAR_FILE = "Detective.png";

// Resolve the correct base URL for public assets at runtime.
// - In dev (http://localhost):  base = "/"  → "/img/avatars/"
// - In Electron prod (file://): base = folder of index.html → correct abs path
const getAvatarBase = (): string => {
  if (typeof window !== "undefined" && window.location.protocol === "file:") {
    // Electron production: build absolute path from current file location
    const base = window.location.href
      .replace(/\/[^/]*$/, "") // strip index.html filename
      .replace(/\/$/, "");     // strip trailing slash
    return `${base}/img/avatars/`;
  }
  // Dev server or web: use absolute path from root
  return "/img/avatars/";
};

export const getAvatarFileName = (avatar: string): string => {
  if (!avatar) return "";
  return avatar.split("/").pop() ?? avatar;
};

export const getAvatarSrc = (avatar: string | undefined | null): string => {
  // Data URIs and external URLs — use as-is
  if (
    avatar &&
    (avatar.startsWith("data:") ||
      avatar.startsWith("http://") ||
      avatar.startsWith("https://"))
  ) {
    return avatar;
  }

  // Extract just the filename in case a full path was stored
  const rawFileName =
    avatar && avatar.trim() !== ""
      ? avatar.split("/").pop() ?? avatar
      : DEFAULT_AVATAR_FILE;

  const fileName =
    rawFileName.trim() !== "" ? rawFileName : DEFAULT_AVATAR_FILE;

  return `${getAvatarBase()}${encodeURIComponent(fileName)}`;
};

// Export for use in onError handlers in components
export { FALLBACK_AVATAR };
