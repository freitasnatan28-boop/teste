import { Nav } from "@/components/Nav";

export default function PainelLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      <main className="conteudo">{children}</main>
    </>
  );
}
