import fs from 'node:fs';

const appSrc = fs.readFileSync('c:/Proyectos/keepbonts/src/app.jsx', 'utf8');
const indexHtml = fs.readFileSync('c:/Proyectos/keepbonts/www/index.html', 'utf8');

// --- 1. Strip the Capacitor import lines from app.jsx, keep everything after them ---
const lines = appSrc.split('\n');
const lastImportIdx = lines.reduce((acc, l, i) => l.startsWith('import ') ? i : acc, -1);
let body = lines.slice(lastImportIdx + 1).join('\n');

// --- 2. Turn the module export into a plain function ---
body = body.replace('export default function App(){', 'function App(){');

// --- 3. Browser stubs replacing the native Capacitor plugins ---
const stubs = `const {useState, useEffect, useMemo} = React;

/* ---- Stand-ins for native Capacitor plugins (this is a browser mockup, not the installed app) ---- */
const LocalNotifications = {
  checkPermissions: async () => ({ display: 'prompt' }),
  requestPermissions: async () => ({ display: 'granted' }),
  getPending: async () => ({ notifications: [] }),
  cancel: async () => {},
  schedule: async () => {},
};
const Contacts = {
  checkPermissions: async () => ({ contacts: 'prompt' }),
  getContacts: async () => { throw new Error('Not implemented on web.'); },
};
const ImpactStyle = { Light: 'LIGHT', Medium: 'MEDIUM', Heavy: 'HEAVY' };
const Haptics = { impact: async () => {} };
const CameraResultType = { DataUrl: 'dataUrl' };
const CameraSource = { Prompt: 'PROMPT' };
const Camera = {
  getPhoto: () => new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.style.display = 'none';
    document.body.appendChild(input);
    let settled = false;
    const cleanup = () => { if (input.parentNode) document.body.removeChild(input); };
    input.addEventListener('change', () => {
      const file = input.files && input.files[0];
      if (!file) { settled = true; cleanup(); reject(new Error('cancelled')); return; }
      const reader = new FileReader();
      reader.onload = () => { settled = true; cleanup(); resolve({ dataUrl: reader.result }); };
      reader.onerror = () => { settled = true; cleanup(); reject(new Error('read error')); };
      reader.readAsDataURL(file);
    });
    window.addEventListener('focus', function onFocus(){
      window.removeEventListener('focus', onFocus);
      setTimeout(() => { if (!settled) { cleanup(); reject(new Error('cancelled')); } }, 400);
    });
    input.click();
  }),
};

`;

// --- 4. Phone-frame shell wrapping the ported <App/> (same chrome as the original mockup) ---
const shell = `
function StatusBar(){
  return (
    <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 22px 2px", fontSize:".78rem", fontWeight:700, color:"var(--ink)"}}>
      <span className="tabular">9:41</span>
      <div style={{display:"flex", alignItems:"center", gap:5}}>
        <svg width="15" height="11" viewBox="0 0 16 12" fill="none"><path d="M1 9.5 L1 11 L3 11 L3 7.5 Z M5 6.5 L5 11 L7 11 L7 4.5 Z M9 4 L9 11 L11 11 L11 1.5 Z" fill="var(--ink)"/></svg>
        <svg width="20" height="11" viewBox="0 0 24 12" fill="none"><rect x="1" y="1.5" width="19" height="9" rx="2.5" stroke="var(--ink)" strokeWidth="1.2"/><rect x="2.5" y="3" width="14" height="6" rx="1.2" fill="var(--ink)"/><rect x="21" y="4" width="2" height="4" rx="1" fill="var(--ink)"/></svg>
      </div>
    </div>
  );
}

function MockupShell(){
  return (
    <div style={{minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:18, padding:"48px 16px"}}>
      <div style={{textAlign:"center"}}>
        <p className="font-display" style={{margin:0, fontSize:"1.05rem", fontWeight:600, color:"#F4EEDD"}}>KeepBonds</p>
        <p style={{margin:"2px 0 0", fontSize:".75rem", color:"#C7BDA4"}}>Prototipo interactivo &middot; toca una persona o usa la barra inferior</p>
      </div>
      <div className="phone-shell">
        <div className="phone-btn" style={{left:-2, top:120, width:3, height:60, borderRadius:"0 3px 3px 0"}} />
        <div className="phone-btn" style={{left:-2, top:190, width:3, height:60, borderRadius:"0 3px 3px 0"}} />
        <div className="phone-btn" style={{right:-2, top:150, width:3, height:90, borderRadius:"3px 0 0 3px"}} />
        <div className="phone-screen">
          <StatusBar />
          <App />
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<MockupShell/>);
`;

const script = stubs + body + shell;

// --- 5. Pull the current app CSS straight out of www/index.html ---
const cssMatch = indexHtml.match(/<style>([\s\S]*?)<\/style>/);
const appCss = cssMatch[1];

const frameCss = `
  .phone-shell{
    width: 375px;
    height: 800px;
    border-radius: 3rem;
    background: linear-gradient(155deg,#38352D 0%, #2E2B25 20%, #1C1A16 100%);
    padding: 14px;
    box-shadow:
      0 40px 80px -25px rgba(20,16,8,0.55),
      0 10px 30px -12px rgba(20,16,8,0.4),
      inset 0 1px 0 rgba(255,255,255,0.09),
      inset 0 0 0 1px rgba(255,255,255,0.05);
    position:relative;
  }
  .phone-shell::before{
    content:"";
    position:absolute; left:50%; top:26px; transform:translateX(-50%);
    width:10px; height:10px; border-radius:50%;
    background:#0d0c0a;
    box-shadow: 0 0 0 3px rgba(255,255,255,0.03);
  }
  .phone-btn{ position:absolute; background:#211F1A; }
  .phone-screen{
    width:100%; height:100%;
    background: var(--cream);
    border-radius: 2.3rem;
    overflow:hidden;
    position:relative;
    display:flex;
    flex-direction:column;
  }
  .phone-screen .app-root{ height:auto; flex:1; min-height:0; }
`;

const finalHtml = `<!doctype html>
<title>KeepBonds</title>
<meta charset="UTF-8" />
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Karla:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&display=swap">
<script src="https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.23.5/babel.min.js"></script>
<style>
${appCss}
${frameCss}
</style>

<div id="root"></div>

<script type="text/babel" data-presets="react">
${script}
</script>
`;

fs.writeFileSync('c:/Proyectos/keepbonts/mockup-artifact.html', finalHtml, 'utf8');
console.log('Wrote mockup-artifact.html,', finalHtml.length, 'bytes');
