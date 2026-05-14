const AVATAR_ASSET_PREFIX = "/img/avatars/";

export const getAvatarFileName = (avatar: string): string => {
  if (!avatar) return "";
  return avatar.split("/").pop() ?? avatar;
};

export const getAvatarSrc = (avatar: string): string => {
  if (!avatar) return "";
  if (
    avatar.startsWith("/") ||
    avatar.startsWith("http://") ||
    avatar.startsWith("https://") ||
    avatar.startsWith("data:")
  ) {
    return avatar;
  }

  return `${AVATAR_ASSET_PREFIX}${encodeURIComponent(avatar)}`;
};