/** Only allow same-site relative paths as a return target after sign-in. */
export function safeNext(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/hum";
  return value;
}
