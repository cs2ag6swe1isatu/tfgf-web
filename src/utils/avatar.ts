const AVATAR_ASSET_PREFIX = "/img/avatars/";

export const getAvatarFileName = (avatar: string): string => {
  if (!avatar) return "";
  return avatar.split("/").pop() ?? avatar;
};

export const getAvatarSrc = (avatar: string): string => {
  const finalAvatar = (avatar && avatar.trim() !== "") ? avatar : "Detective.png";
  
  if (
    finalAvatar.startsWith("/") ||
    finalAvatar.startsWith("http://") ||
    finalAvatar.startsWith("https://") ||
    finalAvatar.startsWith("data:")
  ) {
    return finalAvatar;
  }

  return `${AVATAR_ASSET_PREFIX}${encodeURIComponent(finalAvatar)}`;
};