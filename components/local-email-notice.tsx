import { isEmailConfigured } from "@/lib/email";

export function LocalEmailNotice() {
  if (process.env.NODE_ENV === "production" || isEmailConfigured()) return null;
  return <div className="form-note" role="note"><strong>Local test preview</strong><p>Email delivery is off on this server. Test accounts here are separate from the live website.</p><a className="text-link" href="https://paustik.in/sign-up">Create a live account</a> · <a className="text-link" href="https://paustik.in/forgot-password">Reset a live password</a></div>;
}

