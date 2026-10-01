import { AuthPanel } from "@/components/auth-panel";
import { SignUpForm } from "@/components/auth-forms";

export default function SignUpPage() {
  return <AuthPanel eyebrow="A local food community" title="Find your place at the table." description="Customers discover meals nearby. Mother entrepreneurs grow local kitchens. Delivery agents bring good food closer."><SignUpForm /></AuthPanel>;
}
