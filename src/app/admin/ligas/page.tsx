const COURT="#2ee6c1",BALL="#d6ff3d",BG0="#05070d",INK0="#f5f7fb",INK2="#7a8298",MONO="var(--font-jetbrains)",DISP="var(--font-archivo)";
export default function AdminLigas(){
  return(
    <div style={{padding:"48px",minHeight:"100vh"}}>
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:"48px",flexWrap:"wrap",gap:"16px"}}>
        <div>
          <div style={{fontFamily:MONO,fontSize:"11px",letterSpacing:"0.22em",textTransform:"uppercase",color:COURT,display:"flex",alignItems:"center",gap:"10px",marginBottom:"12px"}}><span style={{width:"20px",height:"1px",background:COURT,display:"inline-block"}}/>Admin</div>
          <h1 style={{fontFamily:DISP,fontSize:"36px",color:INK0,margin:0}}>Ligas</h1>
        </div>
        <button disabled style={{padding:"11px 24px",borderRadius:"10px",background:`linear-gradient(90deg,${COURT},${BALL})`,border:"none",fontFamily:MONO,fontSize:"12px",fontWeight:700,color:BG0,letterSpacing:"0.08em",opacity:0.5,cursor:"not-allowed"}}>
          + Crear liga
        </button>
      </div>
      <div style={{border:"1px dashed rgba(255,255,255,0.1)",borderRadius:"16px",padding:"80px 40px",textAlign:"center"}}>
        <div style={{fontSize:"48px",marginBottom:"16px",opacity:0.3}}>◈</div>
        <p style={{fontFamily:MONO,fontSize:"12px",color:INK2,letterSpacing:"0.1em",textTransform:"uppercase"}}>Gestión de ligas — Próximamente</p>
      </div>
    </div>
  );
}
