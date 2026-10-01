import Image from "next/image";

export function AuthPanel({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <main className="auth-shell">
      <aside className="auth-aside">
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
        <Image src="/assets/mother-child-meal.svg" alt="Mother and child enjoying a meal" width={560} height={430} />
        <span className="aside-seal">Purity · Hygiene · Delivered</span>
      </aside>
      <section className="auth-panel">{children}</section>
    </main>
  );
}
