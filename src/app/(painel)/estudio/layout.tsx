import { EstudioMenu } from "@/components/estudio/EstudioMenu";
import "./estudio.css";

export default function EstudioLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="estudio">
      <EstudioMenu />
      {children}
    </div>
  );
}
