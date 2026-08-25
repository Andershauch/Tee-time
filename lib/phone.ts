export function isValidPhone(value: string) {
  if (!/^\+?[\d\s()-]+$/.test(value)) return false;
  const digits = value.replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 15;
}
