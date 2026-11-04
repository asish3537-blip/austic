export function reportDays(value?: string) { return value === "7" ? 7 : value === "90" ? 90 : 30; }
export function reportStart(days: number, now = new Date()) { return new Date(`${now.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" })}T00:00:00+05:30`).getTime() - (days - 1) * 86400000; }
export function reportDate(date: Date) { return date.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }); }
export function rupees(value: number) { return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value); }
export function statusLabel(value: string) { return value.toLowerCase().replaceAll("_", " "); }
