const SUPPORTED_IMAGE = /\.(?:webp|png|jpe?g)(?:[?#].*)?$/i;

export function normalizeImageUrl(value?: string): string {
  const input = value?.trim();
  if (!input || !SUPPORTED_IMAGE.test(input)) return "";
  if (/^https:\/\//i.test(input)) return input;
  if (/^[a-z][a-z\d+.-]*:/i.test(input) || input.startsWith("//")) return "";
  return input.startsWith("/") ? input : `/${input}`;
}
