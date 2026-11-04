export function AuthPanel({ children, title }: { eyebrow: string; title: string; description: string; children: React.ReactNode }) {
  return <main className="simple-auth"><h1 className="visually-hidden">{title}</h1><section className="auth-panel">{children}</section></main>;
}
