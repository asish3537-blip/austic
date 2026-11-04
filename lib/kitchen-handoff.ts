// Accept a kitchen identifier, never a caller-provided redirect URL.
export function kitchenId(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  return /^(?:[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}|sample-[a-z]{1,32})$/i.test(value) &&
    !/\s/.test(value) ? value : undefined;
}

export function signInLink(path: "/sign-in" | "/password-sign-in", value?: string) {
  const id = kitchenId(value);
  return id ? `${path}?kitchen=${encodeURIComponent(id)}` : path;
}

export function afterSignIn(destination: string, value?: string) {
  const id = kitchenId(value);
  return destination === "/customer/dashboard" && id ? `/customer/kitchens/${id}` : destination;
}
