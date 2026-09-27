export function Flash({ msg, erro }: { msg?: string; erro?: string }) {
  if (!msg && !erro) return null;
  return (
    <div className={erro ? "flash flash-erro" : "flash flash-ok"} role={erro ? "alert" : "status"}>
      {erro ?? msg}
    </div>
  );
}
