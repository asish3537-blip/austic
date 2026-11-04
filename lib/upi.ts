export function upiReceiver() {
  const id = process.env.PAUSTIK_UPI_ID?.trim();
  const name = process.env.PAUSTIK_UPI_NAME?.trim();
  if (!id || !name || !/^[a-zA-Z0-9._-]{2,200}@[a-zA-Z0-9.-]{2,80}$/.test(id) || /[\r\n]/.test(name) || name.length > 80) return null;
  return { id, name };
}

export function upiPaymentUri(receiver: { id: string; name: string }, orderNumber: string, amount: string) {
  if (!/^\d{1,10}\.\d{2}$/.test(amount) || Number(amount) <= 0) throw new Error("INVALID_UPI_AMOUNT");
  const reference = orderNumber.replace(/[^a-zA-Z0-9]/g, "").slice(0, 35);
  if (!reference) throw new Error("INVALID_UPI_REFERENCE");
  const query = new URLSearchParams({ pa: receiver.id, pn: receiver.name, tr: reference, tn: "Paustik " + orderNumber, am: amount, cu: "INR" });
  return "upi://pay?" + query.toString();
}

