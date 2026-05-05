export const isValidEmail = (email: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
export const isValidUUID = (id: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
export const isValidLength = (str: string, min: number, max: number): boolean =>
  str.length >= min && str.length <= max;
export const isValidUrl = (url: string): boolean => {
  try {
    const u = new URL(url);
    return ["http:", "https:"].includes(u.protocol);
  } catch {
    return false;
  }
};
export const sanitiseHtml = (str: string): string =>
  str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
export const isValidAustralianPhone = (phone: string): boolean =>
  /^(\+61|0)[2-9]\d{8}$/.test(phone.replace(/\s/g, ""));
