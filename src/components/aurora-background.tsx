export function AuroraBackground({ subtle = false }: { subtle?: boolean }) {
  return (
    <div className="aurora-scene" aria-hidden="true">
      <div className={`aurora-light aurora-light-one ${subtle ? "opacity-50" : ""}`} />
      <div className={`aurora-light aurora-light-two ${subtle ? "opacity-40" : ""}`} />
      <div className={`aurora-light aurora-light-three ${subtle ? "opacity-30" : ""}`} />
      <div className="aurora-grid" />
    </div>
  );
}