import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { Mic, Camera, Plus, X, ChevronRight, ChevronLeft, Users, FileText, Shield, Crown, Home, BarChart3, Settings, Bell, Search, Calendar, Download, Check, CreditCard, DollarSign, ArrowUpRight, ArrowDownRight, Copy, UserPlus, ShieldCheck, Target, MicOff, Volume2, TrendingUp, Activity, UserCheck } from "lucide-react";

const ADMIN_EMAIL = "lgpelicer@gmail.com";

const T = {
  bg: "#0A0E17", surface: "#111827", surfaceAlt: "#1A2332",
  card: "rgba(26,35,50,0.85)", border: "rgba(255,255,255,0.06)",
  income: "#34D399", incomeSoft: "rgba(52,211,153,0.12)", incomeGlow: "rgba(52,211,153,0.25)",
  expense: "#F87171", expenseSoft: "rgba(248,113,113,0.12)", expenseGlow: "rgba(248,113,113,0.25)",
  accent: "#818CF8", accentSoft: "rgba(129,140,248,0.12)",
  gold: "#FBBF24", goldSoft: "rgba(251,191,36,0.12)",
  text: "#F1F5F9", textMuted: "#94A3B8", textDim: "#64748B",
  radius: "16px", radiusSm: "10px", radiusXs: "6px",
  font: "'DM Sans', sans-serif", fontDisplay: "'Outfit', sans-serif",
  admin: "#A78BFA", adminSoft: "rgba(167,139,250,0.12)", adminGlow: "rgba(167,139,250,0.3)",
  agent: "#22D3EE", agentSoft: "rgba(34,211,238,0.12)", agentGlow: "rgba(34,211,238,0.25)",
};

const CATEGORIES = {
  alimentacao: { label: "Alimentação", icon: "🍽️", color: "#F97316" },
  transporte: { label: "Transporte", icon: "🚗", color: "#3B82F6" },
  moradia: { label: "Moradia", icon: "🏠", color: "#8B5CF6" },
  saude: { label: "Saúde", icon: "💊", color: "#EC4899" },
  educacao: { label: "Educação", icon: "📚", color: "#06B6D4" },
  lazer: { label: "Lazer", icon: "🎮", color: "#F59E0B" },
  vestuario: { label: "Vestuário", icon: "👕", color: "#10B981" },
  farmacia: { label: "Farmácia", icon: "💉", color: "#EF4444" },
  mercado: { label: "Mercado", icon: "🛒", color: "#22D3EE" },
  salario: { label: "Salário", icon: "💰", color: "#34D399" },
  freelance: { label: "Freelance", icon: "💻", color: "#818CF8" },
  investimento: { label: "Investimento", icon: "📈", color: "#FBBF24" },
  outros: { label: "Outros", icon: "📦", color: "#94A3B8" },
};

const MONTHS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const MONTHS_FULL = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const fmt = (v) => v.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const fmtDate = (d) => new Date(d).toLocaleDateString("pt-BR");
const uid = () => Math.random().toString(36).slice(2,10);
const today = () => new Date().toISOString().split("T")[0];
function norm(s) { return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,""); }

// ── NLP ENGINE ──────────────────────────────────────────────────────────────
function processValoraQuery(query, { transactions, bills, goals, userName, filterMonth, filterYear }) {
  const q = norm(query);
  const now = new Date();
  const month = filterMonth ?? now.getMonth();
  const year = filterYear ?? now.getFullYear();
  const prevMonth = (month-1+12)%12;
  const prevYear = month===0?year-1:year;

  const monthTx = transactions.filter(t=>{ const d=new Date(t.date); return d.getMonth()===month&&d.getFullYear()===year; });
  const prevTx   = transactions.filter(t=>{ const d=new Date(t.date); return d.getMonth()===prevMonth&&d.getFullYear()===prevYear; });

  const totalExpense = monthTx.filter(t=>t.type==="expense").reduce((s,t)=>s+t.value,0);
  const totalIncome  = monthTx.filter(t=>t.type==="income").reduce((s,t)=>s+t.value,0);
  const balance = totalIncome - totalExpense;
  const prevExpense = prevTx.filter(t=>t.type==="expense").reduce((s,t)=>s+t.value,0);

  const nome = userName ? userName.split(" ")[0] : "você";
  const mes  = MONTHS_FULL[month];
  const mesPrev = MONTHS_FULL[prevMonth];

  const catPatterns = [
    [/restaurante|alimenta|almoco|jantar|comida|lanche|cafe|ifood|delivery/,"alimentacao"],
    [/mercado|supermercado|feira/,"mercado"],
    [/uber|transporte|gasolina|combustivel|onibus|metro|taxi/,"transporte"],
    [/aluguel|moradia|luz|agua|internet|condominio/,"moradia"],
    [/saude|medico|consulta|hospital|exame|dentista/,"saude"],
    [/farmacia|remedio|medicamento/,"farmacia"],
    [/lazer|cinema|netflix|jogo|viagem|bar|festa/,"lazer"],
    [/roupa|vestuario|sapato|tenis/,"vestuario"],
    [/educacao|curso|faculdade|escola|livro/,"educacao"],
    [/investimento|rendimento|dividendo/,"investimento"],
    [/salario|pagamento|contracheque/,"salario"],
    [/freelance|projeto/,"freelance"],
  ];
  let detectedCat = null;
  for (const [re, cat] of catPatterns) { if (re.test(q)) { detectedCat=cat; break; } }

  const todayNum = now.getDate();
  const upcoming = (bills||[]).filter(b=>{
    const d = b.dueDay>=todayNum ? b.dueDay-todayNum : (30-todayNum+b.dueDay);
    return d<=7 && b.active && !b.paid;
  });

  const catTotals = () => {
    const map={}; monthTx.filter(t=>t.type==="expense").forEach(t=>{map[t.category]=(map[t.category]||0)+t.value;}); return map;
  };

  if (/saldo|quanto (tenho|sobrou|resta)|balanc/.test(q))
    return `${nome}, seu saldo de ${mes} é ${balance>=0?"positivo":"negativo"}: ${fmt(Math.abs(balance))}. Receitas: ${fmt(totalIncome)}, despesas: ${fmt(totalExpense)}.`;

  if (detectedCat && /gastei|gasto|gasta|gastar|quanto/.test(q)) {
    const total = monthTx.filter(t=>t.type==="expense"&&t.category===detectedCat).reduce((s,t)=>s+t.value,0);
    if (total===0) return `Não encontrei gastos com ${CATEGORIES[detectedCat]?.label} em ${mes}.`;
    const prev  = prevTx.filter(t=>t.type==="expense"&&t.category===detectedCat).reduce((s,t)=>s+t.value,0);
    const diff  = prev>0?((total-prev)/prev*100):null;
    let r = `Em ${mes} você gastou ${fmt(total)} com ${CATEGORIES[detectedCat]?.label}.`;
    if (diff!==null) r+=` Isso é ${Math.abs(diff).toFixed(0)}% ${diff>0?"a mais":"a menos"} que ${mesPrev}.`;
    return r;
  }

  if (/quanto gastei|total.*gasto|total.*despesa/.test(q)) {
    const diff = prevExpense>0?((totalExpense-prevExpense)/prevExpense*100):null;
    let r = `Em ${mes} você gastou ${fmt(totalExpense)} no total.`;
    if (diff!==null) r+=` ${diff>0?`Atenção: ${diff.toFixed(0)}% a mais que ${mesPrev}.`:`Ótimo: ${Math.abs(diff).toFixed(0)}% a menos que ${mesPrev}!`}`;
    return r;
  }

  if (/maior gasto|mais gast|categoria que mais/.test(q)) {
    const map = catTotals();
    const top = Object.entries(map).sort((a,b)=>b[1]-a[1])[0];
    if (!top) return `Sem gastos registrados em ${mes}.`;
    return `Seu maior gasto em ${mes} foi com ${CATEGORIES[top[0]]?.label}, totalizando ${fmt(top[1])}.`;
  }

  if (/conta|vencer|pagar|boleto|vencimento/.test(q)) {
    if (upcoming.length===0) return `Nenhuma conta vencendo nos próximos 7 dias. Tudo em dia! 🎉`;
    return `Você tem ${upcoming.length} conta${upcoming.length>1?"s":""} chegando: ${upcoming.map(b=>`${b.name} (${fmt(b.amount)}) no dia ${b.dueDay}`).join(", ")}.`;
  }

  if (/meta|objetivo|economizar|guardar|poupanca/.test(q)) {
    if (!goals||goals.length===0) return `Você ainda não tem metas. Vá em Planejar para criar uma!`;
    return goals.map(g=>`${g.name}: ${Math.min((g.current/g.target*100),100).toFixed(0)}% (${fmt(g.current)} de ${fmt(g.target)})`).join(". ")+".";
  }

  if (/resumo|como estou|como to|como ta|situacao|financas|como anda/.test(q)) {
    const taxa = totalIncome>0?((totalIncome-totalExpense)/totalIncome*100):0;
    const map  = catTotals();
    const top  = Object.entries(map).sort((a,b)=>b[1]-a[1])[0];
    let r = `${nome}, em ${mes}: receitas ${fmt(totalIncome)}, despesas ${fmt(totalExpense)}. Saldo ${balance>=0?"positivo":"negativo"} de ${fmt(Math.abs(balance))}.`;
    if (top) r+=` Maior gasto: ${CATEGORIES[top[0]]?.label}.`;
    if (taxa>0) r+=` Você economiza ${taxa.toFixed(0)}% da renda.`;
    if (upcoming.length>0) r+=` Atenção: ${upcoming.length} conta${upcoming.length>1?"s":""} vencendo em breve.`;
    return r;
  }

  if (/receita|salario|quanto recebi|ganhei|renda/.test(q))
    return `Em ${mes} você recebeu ${fmt(totalIncome)} no total.`;

  if (/mes passado|comparado|anterior/.test(q)) {
    const diff = totalExpense-prevExpense;
    if (diff>0) return `Em ${mes} você gastou ${fmt(diff)} a mais que em ${mesPrev}.`;
    if (diff<0) return `Parabéns! Em ${mes} você economizou ${fmt(Math.abs(diff))} comparado a ${mesPrev}.`;
    return `Seus gastos em ${mes} foram similares a ${mesPrev}.`;
  }

  if (/dica|conselho|sugestao|melhorar/.test(q)) {
    const taxa = totalIncome>0?((totalIncome-totalExpense)/totalIncome*100):0;
    if (taxa<0) return `Atenção, ${nome}! Você gasta mais do que ganha. Revise os gastos com lazer e alimentação fora de casa.`;
    if (taxa<10) return `Sua economia está em ${taxa.toFixed(0)}%. Tente chegar a 20% cortando gastos desnecessários.`;
    if (taxa>30) return `Excelente! Você economiza ${taxa.toFixed(0)}% da renda. Continue assim!`;
    return `Você economiza ${taxa.toFixed(0)}% da renda. A meta ideal é 20%. Que tal reduzir um pouco os gastos com lazer?`;
  }

  if (/^(oi|ola|hey|valora|boa|tudo|como vai|alo)/.test(q)||q.trim().length<6) {
    const h=now.getHours();
    const saud=h<12?"Bom dia":h<18?"Boa tarde":"Boa noite";
    return `${saud}, ${nome}! Pode me perguntar sobre gastos, saldo, contas a vencer, metas ou pedir um resumo. Estou aqui!`;
  }

  return `Não entendi. Tente perguntar: "quanto gastei esse mês?", "quais contas vencem?", "como estou financeiramente?" ou "me dê uma dica".`;
}

function getProactiveBriefing({ transactions, bills, goals, userName }) {
  const now = new Date();
  const month = now.getMonth(); const year = now.getFullYear();
  const nome = userName ? userName.split(" ")[0] : "";
  const h = now.getHours();
  const saud = h<12?"Bom dia":h<18?"Boa tarde":"Boa noite";
  const todayNum = now.getDate();

  const monthTx = transactions.filter(t=>{const d=new Date(t.date);return d.getMonth()===month&&d.getFullYear()===year;});
  const totalExpense = monthTx.filter(t=>t.type==="expense").reduce((s,t)=>s+t.value,0);
  const totalIncome  = monthTx.filter(t=>t.type==="income").reduce((s,t)=>s+t.value,0);
  const upcoming = (bills||[]).filter(b=>{const d=b.dueDay>=todayNum?b.dueDay-todayNum:(30-todayNum+b.dueDay);return d<=3&&b.active&&!b.paid;});

  let msg = `${saud}${nome?", "+nome:""}! `;
  if (upcoming.length>0) msg += `Você tem ${upcoming.length} conta${upcoming.length>1?"s":""} vencendo nos próximos 3 dias. `;
  if (totalIncome>0&&totalExpense/totalIncome>0.85) msg += `Atenção: você já usou ${((totalExpense/totalIncome)*100).toFixed(0)}% da sua renda este mês. `;
  msg += `Saldo de ${MONTHS_FULL[month]}: ${fmt(totalIncome-totalExpense)}.`;
  return msg;
}

// ── VOICE HOOK ──────────────────────────────────────────────────────────────
function useValoraVoice({ onResult }) {
  const recogRef = useRef(null);
  const [listening, setListening] = useState(false);
  const [speaking,  setSpeaking]  = useState(false);
  const [transcript,setTranscript]= useState("");
  const supported = typeof window!=="undefined" && ("webkitSpeechRecognition" in window || "SpeechRecognition" in window);

  const speak = useCallback((text, onEnd) => {
    if (!("speechSynthesis" in window)) { onEnd?.(); return; }
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang="pt-BR"; utter.rate=1.05; utter.pitch=1.1;
    const trySpeak = () => {
      const voices = window.speechSynthesis.getVoices();
      const pt = voices.find(v=>v.lang.startsWith("pt"))||voices[0];
      if (pt) utter.voice = pt;
      setSpeaking(true);
      utter.onend = ()=>{setSpeaking(false);onEnd?.();};
      utter.onerror= ()=>{setSpeaking(false);onEnd?.();};
      window.speechSynthesis.speak(utter);
    };
    if (window.speechSynthesis.getVoices().length===0) window.speechSynthesis.onvoiceschanged=trySpeak;
    else trySpeak();
  },[]);

  const listen = useCallback(()=>{
    if (!supported) return;
    const SR = window.SpeechRecognition||window.webkitSpeechRecognition;
    const r = new SR();
    r.lang="pt-BR"; r.continuous=false; r.interimResults=true;
    r.onstart  = ()=>{ setListening(true); setTranscript(""); };
    r.onresult = (e)=>{
      const text = Array.from(e.results).map(x=>x[0].transcript).join("");
      setTranscript(text);
      if (e.results[e.results.length-1].isFinal){ onResult(text); setListening(false); }
    };
    r.onerror  = ()=>setListening(false);
    r.onend    = ()=>setListening(false);
    recogRef.current = r;
    r.start();
  },[supported,onResult]);

  const stop = useCallback(()=>{ recogRef.current?.stop(); setListening(false); },[]);

  return { listen, stop, speak, listening, speaking, transcript, supported };
}

// ── NOTIFICATIONS ───────────────────────────────────────────────────────────
function requestNotifPermission() {
  if ("Notification" in window && Notification.permission==="default") Notification.requestPermission();
}
function sendNotif(title, body) {
  if ("Notification" in window && Notification.permission==="granted") new Notification(title,{body});
}

// ── VOICE COMMAND PARSER ────────────────────────────────────────────────────
function parseVoiceCommand(text) {
  const t = text.toLowerCase();
  const valMatch = t.match(/(\d+[\.,]?\d*)\s*(reais|real|r\$)?/);
  const value = valMatch ? parseFloat(valMatch[1].replace(",",".")) : null;
  const isIncome = /receb|ganhe|entr|salário|receita|ganhei|recebi/.test(t);
  let category = "outros";
  if (/farmácia|farmacia|remédio|remedio/.test(t)) category="farmacia";
  else if (/mercado|supermercado|feira/.test(t)) category="mercado";
  else if (/restaurante|almoço|almoco|jantar|comida|lanche|café/.test(t)) category="alimentacao";
  else if (/uber|ônibus|onibus|gasolina|combustível|estacionamento/.test(t)) category="transporte";
  else if (/aluguel|condomínio|condominio|luz|água|agua|internet/.test(t)) category="moradia";
  else if (/médico|medico|consulta|exame|hospital|dentista/.test(t)) category="saude";
  else if (/curso|livro|escola|faculdade|mensalidade/.test(t)) category="educacao";
  else if (/cinema|netflix|jogo|viagem|bar|festa/.test(t)) category="lazer";
  else if (/roupa|sapato|tênis|tenis|calça|camisa/.test(t)) category="vestuario";
  else if (/salário|salario/.test(t)) category="salario";
  else if (/freelance|freelancer|job|projeto/.test(t)) category="freelance";
  else if (/investimento|ação|ações|fundo|rendimento|dividendo/.test(t)) category="investimento";
  return { value, type: isIncome?"income":"expense", category, description: text };
}

function loadData(key, def) { try { return JSON.parse(localStorage.getItem(key))||def; } catch { return def; } }
function saveData(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }

// ── GLOBAL CSS ──────────────────────────────────────────────────────────────
const globalCSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=Outfit:wght@400;500;600;700;800&display=swap');
  * { box-sizing:border-box; margin:0; padding:0; -webkit-tap-highlight-color:transparent; }
  ::-webkit-scrollbar { width:0; height:0; }
  @keyframes fadeUp   { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
  @keyframes slideUp  { from{transform:translateY(100%)} to{transform:translateY(0)} }
  @keyframes slideDown{ from{transform:translateY(-20px);opacity:0} to{transform:translateY(0);opacity:1} }
  @keyframes pulse    { 0%,100%{transform:scale(1)} 50%{transform:scale(1.05)} }
  @keyframes pulseRing{ 0%{transform:scale(1);opacity:1} 100%{transform:scale(2.2);opacity:0} }
  @keyframes scaleIn  { from{transform:scale(0.8);opacity:0} to{transform:scale(1);opacity:1} }
  @keyframes spin     { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
  @keyframes wave     { 0%,100%{height:6px} 50%{height:26px} }
  .anim-item { animation:fadeUp 0.5s ease both; }
  .glass { backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px); }
`;

// ── SHARED COMPONENTS ────────────────────────────────────────────────────────
function GlassCard({ children, style, onClick }) {
  return <div className="glass" onClick={onClick} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:T.radius,padding:"16px",...style}}>{children}</div>;
}

function BottomSheet({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div style={{position:"fixed",inset:0,zIndex:1000,display:"flex",flexDirection:"column",justifyContent:"flex-end"}}>
      <div onClick={onClose} style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.6)",backdropFilter:"blur(4px)"}} />
      <div className="glass" style={{position:"relative",background:T.surface,borderRadius:"24px 24px 0 0",padding:"24px 20px",maxHeight:"88vh",overflowY:"auto",animation:"slideUp 0.3s ease",border:`1px solid ${T.border}`,borderBottom:"none"}}>
        <div style={{width:40,height:4,background:T.textDim,borderRadius:2,margin:"0 auto 16px"}} />
        {title && <h3 style={{fontFamily:T.fontDisplay,fontSize:18,fontWeight:700,color:T.text,marginBottom:16}}>{title}</h3>}
        {children}
      </div>
    </div>
  );
}

function Btn({ children, variant="primary", onClick, style, disabled, icon }) {
  const base = {fontFamily:T.font,fontWeight:600,fontSize:14,border:"none",borderRadius:T.radiusSm,padding:"12px 20px",cursor:disabled?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,transition:"all 0.2s",opacity:disabled?0.5:1,width:"100%"};
  const v = {
    primary:{background:`linear-gradient(135deg,${T.income},#059669)`,color:"#fff"},
    danger: {background:`linear-gradient(135deg,${T.expense},#DC2626)`,color:"#fff"},
    ghost:  {background:"transparent",color:T.textMuted,border:`1px solid ${T.border}`},
    accent: {background:`linear-gradient(135deg,${T.accent},#6366F1)`,color:"#fff"},
    gold:   {background:`linear-gradient(135deg,${T.gold},#F59E0B)`,color:"#000"},
    admin:  {background:`linear-gradient(135deg,${T.admin},#7C3AED)`,color:"#fff"},
    agent:  {background:`linear-gradient(135deg,${T.agent},#0891B2)`,color:"#000"},
  };
  return <button disabled={disabled} onClick={onClick} style={{...base,...v[variant],...style}}>{icon}{children}</button>;
}

function Input({ label, value, onChange, type="text", placeholder, icon, style }) {
  return (
    <div style={{marginBottom:12,...style}}>
      {label && <label style={{fontFamily:T.font,fontSize:12,color:T.textMuted,marginBottom:6,display:"block",fontWeight:500}}>{label}</label>}
      <div style={{display:"flex",alignItems:"center",background:T.surfaceAlt,borderRadius:T.radiusSm,border:`1px solid ${T.border}`,padding:"0 12px"}}>
        {icon && <span style={{color:T.textDim,marginRight:8,display:"flex"}}>{icon}</span>}
        <input value={value} onChange={e=>onChange(e.target.value)} type={type} placeholder={placeholder}
          style={{flex:1,background:"transparent",border:"none",outline:"none",color:T.text,fontFamily:T.font,fontSize:15,padding:"12px 0",width:"100%"}} />
      </div>
    </div>
  );
}

function TabBar({ active, onChange, isAdmin }) {
  const tabs = [
    {id:"home",        icon:<Home size={20}/>,      label:"Início"},
    {id:"transactions",icon:<BarChart3 size={20}/>,  label:"Extrato"},
    {id:"planejar",    icon:<Target size={20}/>,     label:"Planejar"},
    {id:"settings",    icon:<Settings size={20}/>,   label:"Config"},
  ];
  if (isAdmin) tabs.push({id:"admin",icon:<ShieldCheck size={20}/>,label:"Admin"});
  return (
    <div className="glass" style={{position:"fixed",bottom:0,left:0,right:0,zIndex:900,background:"rgba(10,14,23,0.92)",borderTop:`1px solid ${T.border}`,display:"flex",padding:"6px 0 env(safe-area-inset-bottom,8px)"}}>
      {tabs.map(t=>(
        <div key={t.id} onClick={()=>onChange(t.id)} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2,padding:"8px 0",cursor:"pointer",color:active===t.id?(t.id==="admin"?T.admin:T.income):T.textDim}}>
          {t.icon}
          <span style={{fontSize:9,fontFamily:T.font,fontWeight:active===t.id?600:400}}>{t.label}</span>
          {active===t.id && <div style={{width:4,height:4,borderRadius:2,background:t.id==="admin"?T.admin:T.income,marginTop:1}} />}
        </div>
      ))}
    </div>
  );
}

function TransactionItem({ tx, onDelete, delay=0 }) {
  const cat = CATEGORIES[tx.category]||CATEGORIES.outros;
  const isIncome = tx.type==="income";
  return (
    <div className="anim-item" style={{display:"flex",alignItems:"center",gap:12,padding:"12px",marginBottom:8,background:T.card,borderRadius:T.radiusSm,border:`1px solid ${T.border}`,animationDelay:`${delay}s`}}>
      <div style={{width:40,height:40,borderRadius:T.radiusXs,background:isIncome?T.incomeSoft:cat.color+"15",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{cat.icon}</div>
      <div style={{flex:1,minWidth:0}}>
        <p style={{fontSize:14,fontWeight:600,color:T.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{tx.description}</p>
        <p style={{fontSize:11,color:T.textDim,marginTop:2}}>{fmtDate(tx.date)} • {tx.user}</p>
      </div>
      <p style={{fontSize:14,fontWeight:700,fontFamily:T.fontDisplay,color:isIncome?T.income:T.expense,flexShrink:0}}>{isIncome?"+":"-"}{fmt(tx.value)}</p>
      <X size={14} color={T.textDim} style={{cursor:"pointer",flexShrink:0}} onClick={e=>{e.stopPropagation();onDelete(tx.id);}} />
    </div>
  );
}

// ── AGENT OVERLAY ─────────────────────────────────────────────────────────────
function AgentOverlay({ open, onClose, listening, speaking, transcript, agentResponse, onListen, onStop, onTextSubmit, supported }) {
  const [textInput, setTextInput] = useState("");
  if (!open) return null;
  return (
    <div style={{position:"fixed",inset:0,zIndex:2000,display:"flex",flexDirection:"column",justifyContent:"flex-end"}}>
      <div onClick={onClose} style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.78)",backdropFilter:"blur(10px)"}} />
      <div className="glass" style={{position:"relative",background:`linear-gradient(160deg,${T.surface},#0d1525)`,borderRadius:"28px 28px 0 0",padding:"28px 24px 40px",border:`1px solid ${T.agent}30`,borderBottom:"none",animation:"slideUp 0.35s ease"}}>

        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:24}}>
          <div style={{width:48,height:48,borderRadius:"50%",background:`linear-gradient(135deg,${T.agent},#0891B2)`,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`0 0 20px ${T.agentGlow}`,flexShrink:0}}>
            <span style={{fontSize:22}}>🤖</span>
          </div>
          <div style={{flex:1}}>
            <p style={{fontFamily:T.fontDisplay,fontSize:18,fontWeight:700,color:T.text}}>Valora IA</p>
            <p style={{fontSize:12,color:T.agent}}>{listening?"Ouvindo...":speaking?"Respondendo...":"Pronta para ajudar"}</p>
          </div>
          <X size={20} color={T.textDim} onClick={onClose} style={{cursor:"pointer"}} />
        </div>

        <div style={{minHeight:80,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:20}}>
          {listening ? (
            <div style={{display:"flex",alignItems:"center",gap:4}}>
              {[0,1,2,3,4,5,6].map(i=>(
                <div key={i} style={{width:4,borderRadius:2,background:T.agent,height:8,animation:`wave 0.8s ease-in-out ${i*0.1}s infinite`}} />
              ))}
            </div>
          ) : speaking ? (
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <Volume2 size={22} color={T.income} style={{animation:"pulse 1s infinite"}} />
              <p style={{fontSize:13,color:T.income}}>Respondendo por voz...</p>
            </div>
          ) : agentResponse ? (
            <div style={{background:T.agentSoft,borderRadius:T.radiusSm,padding:"14px 16px",border:`1px solid ${T.agent}30`,width:"100%"}}>
              <p style={{fontSize:14,color:T.text,lineHeight:1.6}}>{agentResponse}</p>
            </div>
          ) : (
            <p style={{fontSize:13,color:T.textDim,fontStyle:"italic",textAlign:"center"}}>
              {supported?"Toque no microfone e pergunte algo":"Digite sua pergunta abaixo"}
            </p>
          )}
        </div>

        {transcript && listening && (
          <div style={{background:T.surfaceAlt,borderRadius:T.radiusXs,padding:"10px 12px",marginBottom:12,border:`1px solid ${T.border}`}}>
            <p style={{fontSize:13,color:T.textMuted,fontStyle:"italic"}}>"{transcript}"</p>
          </div>
        )}

        {supported && (
          <div style={{marginBottom:16}}>
            <button onClick={listening?onStop:onListen} style={{width:"100%",height:56,borderRadius:"50px",border:"none",cursor:"pointer",background:listening?`linear-gradient(135deg,${T.expense},#DC2626)`:`linear-gradient(135deg,${T.agent},#0891B2)`,display:"flex",alignItems:"center",justifyContent:"center",gap:10,fontFamily:T.font,fontWeight:700,fontSize:15,color:listening?"#fff":"#000",boxShadow:listening?`0 0 24px ${T.expenseGlow}`:`0 0 24px ${T.agentGlow}`,position:"relative"}}>
              {listening&&<div style={{position:"absolute",inset:-4,borderRadius:"50px",border:`2px solid ${T.expense}`,animation:"pulseRing 1.2s infinite"}} />}
              {listening?<MicOff size={22}/>:<Mic size={22}/>}
              {listening?"Parar":"Falar com Valora"}
            </button>
          </div>
        )}

        <div style={{display:"flex",gap:8,marginBottom:14}}>
          <input value={textInput} onChange={e=>setTextInput(e.target.value)}
            onKeyDown={e=>{if(e.key==="Enter"&&textInput.trim()){onTextSubmit(textInput);setTextInput("");}}}
            placeholder="Ou digite sua pergunta..."
            style={{flex:1,background:T.surfaceAlt,border:`1px solid ${T.border}`,borderRadius:"50px",padding:"12px 16px",color:T.text,fontFamily:T.font,fontSize:14,outline:"none"}} />
          <button onClick={()=>{if(textInput.trim()){onTextSubmit(textInput);setTextInput("");}}}
            style={{width:44,height:44,borderRadius:"50%",background:`linear-gradient(135deg,${T.agent},#0891B2)`,border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            <ChevronRight size={20} color="#000" />
          </button>
        </div>

        {!agentResponse && !listening && (
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {["Resumo do mês","Contas a vencer","Maior gasto","Minhas metas","Me dê uma dica"].map(s=>(
              <div key={s} onClick={()=>{onTextSubmit(s);}} style={{padding:"6px 12px",borderRadius:20,background:T.surfaceAlt,border:`1px solid ${T.border}`,fontSize:12,color:T.textMuted,cursor:"pointer",whiteSpace:"nowrap"}}>{s}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AgentFAB({ onClick, speaking, listening }) {
  const active = listening||speaking;
  return (
    <div onClick={onClick} style={{position:"fixed",right:20,bottom:90,zIndex:850,width:52,height:52,borderRadius:"50%",background:active?`linear-gradient(135deg,${T.expense},#DC2626)`:`linear-gradient(135deg,${T.agent},#0891B2)`,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`0 4px 20px ${active?T.expenseGlow:T.agentGlow}`,cursor:"pointer",border:`2px solid ${T.bg}`,animation:active?"pulse 1.5s infinite":"none"}}>
      {active?<MicOff size={20} color="#fff"/>:<Mic size={20} color="#000"/>}
    </div>
  );
}

// ── MAIN APP ──────────────────────────────────────────────────────────────────
export default function Valora() {
  const [tab,setTab] = useState("home");
  const [transactions,setTransactions] = useState(()=>loadData("valora_tx",generateSampleData()));
  const [bills,setBills] = useState(()=>loadData("valora_bills",generateSampleBills()));
  const [goals,setGoals] = useState(()=>loadData("valora_goals",generateSampleGoals()));
  const [sharedKey,setSharedKey]     = useState(()=>loadData("valora_key",null));
  const [userName,setUserName]       = useState(()=>loadData("valora_user",""));
  const [userEmail,setUserEmail]     = useState(()=>loadData("valora_email",""));
  const [isPremium,setIsPremium]     = useState(()=>loadData("valora_premium",false));
  const [trialStartDate]             = useState(()=>{ const s=loadData("valora_trial_start",null); if(!s){saveData("valora_trial_start",today());return today();}return s; });
  const [showOnboarding,setShowOnboarding] = useState(()=>!loadData("valora_onboarded",false));
  const [showAddSheet,setShowAddSheet]   = useState(false);
  const [addType,setAddType]             = useState("expense");
  const [showVoiceSheet,setShowVoiceSheet] = useState(false);
  const [showShared,setShowShared]       = useState(false);
  const [showPremium,setShowPremium]     = useState(false);
  const [showCheckout,setShowCheckout]   = useState(false);
  const [filterMonth,setFilterMonth]     = useState(new Date().getMonth());
  const [filterYear]                     = useState(new Date().getFullYear());
  const [notification,setNotification]   = useState(null);
  const [searchQuery,setSearchQuery]     = useState("");
  const [voiceText,setVoiceText]         = useState("");
  const [isListeningLegacy,setIsListeningLegacy] = useState(false);
  const [formValue,setFormValue]   = useState("");
  const [formCategory,setFormCategory] = useState("outros");
  const [formDesc,setFormDesc]     = useState("");
  const [formDate,setFormDate]     = useState(today());
  const [allUsers]                 = useState(()=>loadData("valora_all_users",generateSimulatedUsers()));
  const [showAgent,setShowAgent]   = useState(false);
  const [agentResponse,setAgentResponse] = useState("");
  const briefingDone = useRef(false);

  const isAdmin = userEmail.toLowerCase()===ADMIN_EMAIL;
  const trialDaysLeft = useMemo(()=>{ const diff=Math.floor((Date.now()-new Date(trialStartDate).getTime())/864e5); return Math.max(0,7-diff); },[trialStartDate]);
  const isBlocked = trialDaysLeft<=0 && !isPremium && !isAdmin;

  useEffect(()=>{ saveData("valora_tx",transactions); if(sharedKey)saveData(`valora_shared_${sharedKey}_tx`,transactions); },[transactions,sharedKey]);
  useEffect(()=>{ saveData("valora_bills",bills); if(sharedKey)saveData(`valora_shared_${sharedKey}_bills`,bills); },[bills,sharedKey]);
  useEffect(()=>{ saveData("valora_goals",goals); if(sharedKey)saveData(`valora_shared_${sharedKey}_goals`,goals); },[goals,sharedKey]);
  useEffect(()=>{ saveData("valora_key",sharedKey); },[sharedKey]);
  useEffect(()=>{ saveData("valora_user",userName); },[userName]);
  useEffect(()=>{ saveData("valora_email",userEmail); },[userEmail]);
  useEffect(()=>{ saveData("valora_premium",isPremium); },[isPremium]);

  const notify = (msg, type="success") => { setNotification({msg,type}); setTimeout(()=>setNotification(null),3000); };

  const monthTx = useMemo(()=>transactions.filter(t=>{const d=new Date(t.date);return d.getMonth()===filterMonth&&d.getFullYear()===filterYear;}),[transactions,filterMonth,filterYear]);
  const totalIncome  = useMemo(()=>monthTx.filter(t=>t.type==="income").reduce((s,t)=>s+t.value,0),[monthTx]);
  const totalExpense = useMemo(()=>monthTx.filter(t=>t.type==="expense").reduce((s,t)=>s+t.value,0),[monthTx]);
  const balance = totalIncome-totalExpense;

  const catData = useMemo(()=>{
    const map={}; monthTx.filter(t=>t.type==="expense").forEach(t=>{map[t.category]=(map[t.category]||0)+t.value;});
    return Object.entries(map).map(([k,v])=>({name:CATEGORIES[k]?.label||k,value:v,color:CATEGORIES[k]?.color||"#94A3B8",key:k})).sort((a,b)=>b.value-a.value);
  },[monthTx]);

  const monthlyChart = useMemo(()=>MONTHS.map((m,i)=>{
    const mt=transactions.filter(t=>{const d=new Date(t.date);return d.getMonth()===i&&d.getFullYear()===filterYear;});
    return {name:m,receitas:mt.filter(t=>t.type==="income").reduce((s,t)=>s+t.value,0),despesas:mt.filter(t=>t.type==="expense").reduce((s,t)=>s+t.value,0)};
  }),[transactions,filterYear]);

  const agentContext = useMemo(()=>({transactions,bills,goals,userName,filterMonth,filterYear}),[transactions,bills,goals,userName,filterMonth,filterYear]);

  const handleAgentQuery = useCallback((query)=>{
    const response = processValoraQuery(query, agentContext);
    setAgentResponse(response);
    voice.speak(response);
  },[agentContext]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const voice = useValoraVoice({ onResult: handleAgentQuery });

  // Briefing proativo ao abrir
  useEffect(()=>{
    if (showOnboarding||briefingDone.current) return;
    briefingDone.current = true;
    requestNotifPermission();
    setTimeout(()=>{
      const msg = getProactiveBriefing({transactions,bills,goals,userName});
      setAgentResponse(msg);
      setShowAgent(true);
      voice.speak(msg);
      const now=new Date(); const todayNum=now.getDate();
      const urgent=(bills||[]).filter(b=>{const d=b.dueDay>=todayNum?b.dueDay-todayNum:(30-todayNum+b.dueDay);return d<=2&&b.active&&!b.paid;});
      if (urgent.length>0) sendNotif("Valora 💰",`${urgent.length} conta(s) vencendo em breve: ${urgent.map(b=>b.name).join(", ")}`);
    },1400);
  },[showOnboarding]); // eslint-disable-line

  const handleCreateShared = () => {
    const code=`VALORA-${uid().toUpperCase()}`;
    saveData(`valora_shared_${code}_tx`,transactions);
    saveData(`valora_shared_${code}_bills`,bills);
    saveData(`valora_shared_${code}_goals`,goals);
    setSharedKey(code);
    notify("Conta compartilhada criada! Compartilhe o código.");
  };
  const handleJoinShared = (code) => {
    if (!code.startsWith("VALORA-")) return;
    const stx=loadData(`valora_shared_${code}_tx`,null);
    const sbills=loadData(`valora_shared_${code}_bills`,null);
    const sgoals=loadData(`valora_shared_${code}_goals`,null);
    if (stx) { setTransactions(prev=>{ const ids=new Set(prev.map(t=>t.id)); return [...prev,...stx.filter(t=>!ids.has(t.id))].sort((a,b)=>new Date(b.date)-new Date(a.date)); }); }
    if (sbills) setBills(sbills);
    if (sgoals) setGoals(sgoals);
    setSharedKey(code);
    notify(stx?"Conectado! Dados sincronizados 🎉":"Conectado! Aguardando dados do parceiro.");
  };

  const addTransaction = (tx) => {
    setTransactions(prev=>[{id:uid(),date:tx.date||today(),...tx,user:userName||"Você",timestamp:Date.now()},...prev]);
    notify(tx.type==="income"?`+${fmt(tx.value)} registrado!`:`${fmt(tx.value)} registrado!`,tx.type==="income"?"success":"expense");
  };
  const deleteTransaction = (id) => { setTransactions(prev=>prev.filter(t=>t.id!==id)); notify("Transação removida","info"); };

  const handleFormSubmit = () => {
    const val = parseFloat(formValue.replace(",","."));
    if (!val||val<=0) { notify("Valor inválido","error"); return; }
    addTransaction({type:addType,value:val,category:formCategory,description:formDesc||CATEGORIES[formCategory]?.label,date:formDate});
    setFormValue("");setFormDesc("");setFormCategory("outros");setFormDate(today());setShowAddSheet(false);
  };

  const handleLegacyVoice = () => {
    if (!("webkitSpeechRecognition" in window)&&!("SpeechRecognition" in window)){ notify("Voz não suportada","error"); return; }
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    const r=new SR(); r.lang="pt-BR"; r.continuous=false; r.interimResults=true;
    setIsListeningLegacy(true); setShowVoiceSheet(true); setVoiceText("Ouvindo...");
    r.onresult=(e)=>setVoiceText(Array.from(e.results).map(x=>x[0].transcript).join(""));
    r.onend=()=>setIsListeningLegacy(false);
    r.onerror=()=>{ setIsListeningLegacy(false); notify("Erro no reconhecimento","error"); };
    r.start();
  };

  const processVoiceText = () => {
    if (!voiceText) return;
    const parsed = parseVoiceCommand(voiceText);
    if (parsed.value){ addTransaction(parsed); setShowVoiceSheet(false); setVoiceText(""); }
    else notify("Não entendi o valor. Tente novamente.","error");
  };

  const handleOnboardingDone = (name, email) => {
    setUserName(name); setUserEmail(email);
    setShowOnboarding(false); saveData("valora_onboarded",true);
  };

  if (showOnboarding) return <OnboardingScreen onDone={handleOnboardingDone} />;
  if (isBlocked) return (
    <>
      <PaywallScreen trialDaysLeft={0} onSubscribe={()=>setShowCheckout(true)} />
      <CheckoutSheet open={showCheckout} onClose={()=>setShowCheckout(false)} onSuccess={()=>{setIsPremium(true);setShowCheckout(false);notify("Premium ativado! 🎉");}} />
    </>
  );

  return (
    <div style={{fontFamily:T.font,background:T.bg,color:T.text,minHeight:"100vh",maxWidth:430,margin:"0 auto",position:"relative",overflow:"hidden",paddingBottom:80,paddingTop:!isPremium&&trialDaysLeft>0?36:0}}>
      <style>{globalCSS}</style>
      {!isPremium && trialDaysLeft>0 && (
        <div style={{position:"fixed",top:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:430,zIndex:3500,background:`linear-gradient(135deg,${T.gold},#F59E0B)`,padding:"7px 16px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <span style={{fontSize:12,fontWeight:600,color:"#000"}}>🕐 {trialDaysLeft} dia{trialDaysLeft!==1?"s":""} de trial restante{trialDaysLeft!==1?"s":""}</span>
          <span onClick={()=>setShowPremium(true)} style={{fontSize:12,fontWeight:700,color:"#000",cursor:"pointer",textDecoration:"underline"}}>Assinar agora →</span>
        </div>
      )}
      <div style={{position:"fixed",top:"-30%",left:"-20%",width:"140%",height:"60%",background:`radial-gradient(ellipse at 30% 50%, ${isAdmin?T.adminGlow:T.incomeGlow} 0%, transparent 60%)`,pointerEvents:"none",zIndex:0,opacity:0.4}} />

      {notification && (
        <div style={{position:"fixed",top:16,left:16,right:16,zIndex:3000,padding:"14px 16px",borderRadius:T.radiusSm,background:notification.type==="success"?T.income:notification.type==="expense"?T.expense:notification.type==="error"?"#EF4444":T.accent,color:"#fff",fontFamily:T.font,fontWeight:600,fontSize:14,animation:"slideDown 0.3s ease",display:"flex",alignItems:"center",gap:8,boxShadow:"0 8px 24px rgba(0,0,0,0.4)"}}>
          <Check size={16}/>{notification.msg}
        </div>
      )}

      <div style={{position:"relative",zIndex:1}}>
        {tab==="home"         && <HomeScreen balance={balance} totalIncome={totalIncome} totalExpense={totalExpense} catData={catData} monthlyChart={monthlyChart} transactions={monthTx} filterMonth={filterMonth} setFilterMonth={setFilterMonth} userName={userName} sharedKey={sharedKey} isPremium={isPremium} isAdmin={isAdmin} onShowPremium={()=>setShowPremium(true)} onShowShared={()=>setShowShared(true)} onDelete={deleteTransaction} onOpenAgent={()=>{setAgentResponse("");setShowAgent(true);}} />}
        {tab==="transactions" && <TransactionsScreen transactions={monthTx} filterMonth={filterMonth} setFilterMonth={setFilterMonth} searchQuery={searchQuery} setSearchQuery={setSearchQuery} onDelete={deleteTransaction} />}
        {tab==="planejar"     && <PlanejamentoScreen bills={bills} setBills={setBills} goals={goals} setGoals={setGoals} notify={notify} />}
        {tab==="settings"     && <SettingsScreen userName={userName} setUserName={n=>{setUserName(n);saveData("valora_user",n);}} userEmail={userEmail} sharedKey={sharedKey} isPremium={isPremium} isAdmin={isAdmin} onShowPremium={()=>setShowPremium(true)} onShowShared={()=>setShowShared(true)} onAdminTab={()=>setTab("admin")} />}
        {tab==="admin" && isAdmin && <AdminPanel allUsers={allUsers} />}
      </div>

      <AgentFAB onClick={()=>{setAgentResponse("");setShowAgent(true);}} speaking={voice.speaking} listening={voice.listening} />
      <div onClick={()=>setShowAddSheet(true)} style={{position:"fixed",bottom:72,left:"50%",transform:"translateX(-50%)",zIndex:950,width:56,height:56,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",background:`linear-gradient(135deg,${T.income},${T.accent})`,cursor:"pointer",boxShadow:`0 4px 24px ${T.incomeGlow}`,border:`3px solid ${T.bg}`}}><Plus size={28} color="#fff"/></div>

      <TabBar active={tab} onChange={setTab} isAdmin={isAdmin} />

      <AgentOverlay open={showAgent} onClose={()=>{setShowAgent(false);window.speechSynthesis?.cancel();}}
        listening={voice.listening} speaking={voice.speaking} transcript={voice.transcript}
        agentResponse={agentResponse} onListen={voice.listen} onStop={voice.stop}
        onTextSubmit={q=>{setAgentResponse("");handleAgentQuery(q);}} supported={voice.supported} />

      {/* ADD TRANSACTION */}
      <BottomSheet open={showAddSheet} onClose={()=>setShowAddSheet(false)} title="Nova Transação">
        <div style={{display:"flex",gap:8,marginBottom:16}}>
          {[{t:"expense",l:"Despesa",c:T.expense},{t:"income",l:"Receita",c:T.income}].map(x=>(
            <div key={x.t} onClick={()=>setAddType(x.t)} style={{flex:1,padding:"10px",borderRadius:T.radiusSm,textAlign:"center",background:addType===x.t?x.c+"20":T.surfaceAlt,border:`2px solid ${addType===x.t?x.c:T.border}`,color:addType===x.t?x.c:T.textMuted,fontFamily:T.font,fontWeight:600,fontSize:14,cursor:"pointer"}}>{x.l}</div>
          ))}
        </div>
        <Input label="Valor (R$)" value={formValue} onChange={setFormValue} type="number" placeholder="0,00" icon={<DollarSign size={16}/>} />
        <Input label="Descrição" value={formDesc} onChange={setFormDesc} placeholder="Ex: Almoço no restaurante" icon={<FileText size={16}/>} />
        <Input label="Data" value={formDate} onChange={setFormDate} type="date" icon={<Calendar size={16}/>} />
        <label style={{fontFamily:T.font,fontSize:12,color:T.textMuted,marginBottom:8,display:"block",fontWeight:500}}>Categoria</label>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:16}}>
          {Object.entries(CATEGORIES).filter(([k])=>addType==="income"?["salario","freelance","investimento","outros"].includes(k):!["salario","freelance","investimento"].includes(k)).map(([k,v])=>(
            <div key={k} onClick={()=>setFormCategory(k)} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4,padding:"10px 4px",borderRadius:T.radiusSm,cursor:"pointer",background:formCategory===k?v.color+"20":T.surfaceAlt,border:`2px solid ${formCategory===k?v.color:"transparent"}`}}>
              <span style={{fontSize:20}}>{v.icon}</span>
              <span style={{fontSize:10,color:formCategory===k?v.color:T.textMuted,fontWeight:500,textAlign:"center"}}>{v.label}</span>
            </div>
          ))}
        </div>
        <Btn variant={addType==="income"?"primary":"danger"} onClick={handleFormSubmit}>{addType==="income"?"Registrar Receita":"Registrar Despesa"}</Btn>
        <div style={{display:"flex",gap:8,marginTop:12}}>
          <Btn variant="ghost" onClick={handleLegacyVoice} icon={<Mic size={16}/>} style={{flex:1}}>Voz</Btn>
          <Btn variant="ghost" onClick={()=>notify(isPremium?"Em breve!":"Recurso Premium 🔒","info")} icon={<Camera size={16}/>} style={{flex:1}}>{isPremium?"Foto":"Foto 🔒"}</Btn>
        </div>
      </BottomSheet>

      {/* VOICE REGISTRATION */}
      <BottomSheet open={showVoiceSheet} onClose={()=>{setShowVoiceSheet(false);setIsListeningLegacy(false);setVoiceText("");}} title="Registrar por Voz">
        <div style={{textAlign:"center",padding:"20px 0"}}>
          <div style={{width:80,height:80,borderRadius:"50%",margin:"0 auto 20px",display:"flex",alignItems:"center",justifyContent:"center",background:isListeningLegacy?T.incomeGlow:T.surfaceAlt,animation:isListeningLegacy?"pulse 1.5s infinite":"none",border:`2px solid ${isListeningLegacy?T.income:T.border}`}}><Mic size={32} color={isListeningLegacy?T.income:T.textMuted}/></div>
          {voiceText&&voiceText!=="Ouvindo..."&&<div style={{background:T.surfaceAlt,borderRadius:T.radiusSm,padding:12,margin:"12px 0",color:T.text,fontSize:15}}>"{voiceText}"</div>}
          <div style={{display:"flex",gap:8,marginTop:16}}>
            <Btn variant="ghost" onClick={handleLegacyVoice} icon={<Mic size={16}/>} style={{flex:1}}>{isListeningLegacy?"Ouvindo...":"Gravar"}</Btn>
            {voiceText&&voiceText!=="Ouvindo..."&&<Btn variant="primary" onClick={processVoiceText} style={{flex:1}}>Registrar</Btn>}
          </div>
          <div style={{marginTop:16}}>
            <Input label="Ou digite o comando" value={voiceText} onChange={setVoiceText} placeholder="Gastei 30 reais na farmácia" />
            <Btn variant="primary" onClick={processVoiceText}>Processar</Btn>
          </div>
        </div>
      </BottomSheet>

      {/* SHARED */}
      <BottomSheet open={showShared} onClose={()=>setShowShared(false)} title="Conta Compartilhada">
        <div style={{textAlign:"center",padding:"8px 0"}}>
          <div style={{width:64,height:64,borderRadius:"50%",background:T.accentSoft,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px"}}><Users size={28} color={T.accent}/></div>
          {sharedKey?(
            <>
              <p style={{color:T.textMuted,fontSize:14,marginBottom:12}}>Sua chave de acesso:</p>
              <div style={{background:T.surfaceAlt,borderRadius:T.radiusSm,padding:"14px",fontFamily:"monospace",fontSize:18,color:T.income,fontWeight:700,border:`1px dashed ${T.income}40`,marginBottom:16,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                {sharedKey}<Copy size={16} style={{cursor:"pointer",color:T.textMuted}} onClick={()=>{navigator.clipboard?.writeText(sharedKey);notify("Chave copiada!");}}/>
              </div>
              <Btn variant="ghost" onClick={()=>{setSharedKey(null);notify("Conta desvinculada");}}>Desvincular</Btn>
            </>
          ):(
            <>
              <p style={{color:T.textMuted,fontSize:14,marginBottom:16}}>Gerencie finanças com sua família.</p>
              <Btn variant="accent" onClick={handleCreateShared} icon={<UserPlus size={16}/>}>Criar Conta Compartilhada</Btn>
              <div style={{margin:"16px 0",color:T.textDim,fontSize:13}}>ou</div>
              <Input placeholder="Cole a chave aqui (VALORA-...)" value="" onChange={v=>{if(v.length>8)handleJoinShared(v);}} />
            </>
          )}
        </div>
      </BottomSheet>

      {/* PREMIUM */}
      <BottomSheet open={showPremium} onClose={()=>setShowPremium(false)} title="">
        <div style={{textAlign:"center",padding:"8px 0"}}>
          <div style={{width:72,height:72,borderRadius:"50%",margin:"0 auto 16px",background:`linear-gradient(135deg,${T.gold},#F59E0B)`,display:"flex",alignItems:"center",justifyContent:"center"}}><Crown size={32} color="#000"/></div>
          <h2 style={{fontFamily:T.fontDisplay,fontSize:24,fontWeight:800,marginBottom:4}}>Valora Premium</h2>
          <p style={{color:T.gold,fontFamily:T.fontDisplay,fontSize:16,fontWeight:600,marginBottom:4}}>R$ 14,90/mês</p>
          <p style={{color:T.textDim,fontSize:12,marginBottom:16}}>ou R$ 99,90/ano — economia de 44% 🔥</p>
          {[{i:"📸",t:"Leitura de notas fiscais"},{i:"📊",t:"Relatórios avançados"},{i:"📄",t:"PDF Imposto de Renda"},{i:"🧠",t:"IA avançada com API"},{i:"🏷️",t:"Categorias personalizadas"},{i:"☁️",t:"Backup na nuvem"}].map((f,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:`1px solid ${T.border}`}}>
              <span style={{fontSize:20}}>{f.i}</span><span style={{fontSize:14,color:T.text}}>{f.t}</span><Check size={16} color={T.income} style={{marginLeft:"auto"}}/>
            </div>
          ))}
          {isPremium?(<Btn variant="ghost" onClick={()=>{setIsPremium(false);setShowPremium(false);notify("Premium cancelado");}} style={{marginTop:20}}>Cancelar</Btn>)
          :(<Btn variant="gold" onClick={()=>{setShowPremium(false);setShowCheckout(true);}} style={{marginTop:20}} icon={<CreditCard size={16}/>}>Assinar Agora</Btn>)}
        </div>
      </BottomSheet>

      <CheckoutSheet open={showCheckout} onClose={()=>setShowCheckout(false)} onSuccess={()=>{setIsPremium(true);setShowCheckout(false);notify("Premium ativado! 🎉");}} />
    </div>
  );
}

// ── PLANEJAMENTO ──────────────────────────────────────────────────────────────
function PlanejamentoScreen({ bills, setBills, goals, setGoals, notify }) {
  const [section,setSection] = useState("bills");
  const [showAddBill,setShowAddBill]   = useState(false);
  const [showAddGoal,setShowAddGoal]   = useState(false);
  const now=new Date(); const todayNum=now.getDate();

  const getDays = dueDay => dueDay>=todayNum ? dueDay-todayNum : 30-todayNum+dueDay;
  const togglePaid = id => setBills(prev=>prev.map(b=>b.id===id?{...b,paid:!b.paid}:b));
  const deleteBill = id => { setBills(prev=>prev.filter(b=>b.id!==id)); notify("Conta removida","info"); };
  const deleteGoal = id => { setGoals(prev=>prev.filter(g=>g.id!==id)); notify("Meta removida","info"); };
  const addToGoal  = (id,amt) => setGoals(prev=>prev.map(g=>g.id===id?{...g,current:Math.min(g.current+amt,g.target)}:g));

  return (
    <div style={{padding:"0 16px 20px"}}>
      <div style={{padding:"16px 0 12px"}}>
        <h1 style={{fontFamily:T.fontDisplay,fontSize:22,fontWeight:700}}>Planejamento</h1>
        <p style={{fontSize:12,color:T.textDim,marginTop:2}}>Contas e metas financeiras</p>
      </div>

      <div style={{display:"flex",gap:6,marginBottom:20}}>
        {[{id:"bills",l:"Contas a Pagar"},{id:"goals",l:"Metas"}].map(s=>(
          <div key={s.id} onClick={()=>setSection(s.id)} style={{padding:"8px 16px",borderRadius:20,cursor:"pointer",background:section===s.id?T.income+"20":T.surfaceAlt,color:section===s.id?T.income:T.textMuted,fontSize:13,fontWeight:600,border:`1px solid ${section===s.id?T.income+"40":"transparent"}`}}>{s.l}</div>
        ))}
      </div>

      {section==="bills" && (
        <>
          <div style={{display:"flex",gap:8,marginBottom:16}}>
            <GlassCard style={{flex:1,padding:"12px",textAlign:"center"}}>
              <p style={{fontSize:10,color:T.textDim}}>Total mensal</p>
              <p style={{fontFamily:T.fontDisplay,fontSize:18,fontWeight:700,color:T.expense}}>{fmt(bills.filter(b=>b.active).reduce((s,b)=>s+b.amount,0))}</p>
            </GlassCard>
            <GlassCard style={{flex:1,padding:"12px",textAlign:"center"}}>
              <p style={{fontSize:10,color:T.textDim}}>Vencendo em 7 dias</p>
              <p style={{fontFamily:T.fontDisplay,fontSize:18,fontWeight:700,color:T.gold}}>{bills.filter(b=>getDays(b.dueDay)<=7&&b.active&&!b.paid).length}</p>
            </GlassCard>
          </div>

          {bills.map((b,i)=>{
            const days=getDays(b.dueDay);
            const urgColor=b.paid?T.income:days<=2?T.expense:days<=7?T.gold:T.textMuted;
            const cat=CATEGORIES[b.category]||CATEGORIES.outros;
            return (
              <div key={b.id} className="anim-item" style={{display:"flex",alignItems:"center",gap:12,padding:"14px",marginBottom:8,background:T.card,borderRadius:T.radiusSm,border:`1px solid ${b.paid?T.income+"20":days<=2?T.expense+"30":T.border}`,animationDelay:`${i*0.04}s`}}>
                <div onClick={()=>togglePaid(b.id)} style={{width:24,height:24,borderRadius:"50%",border:`2px solid ${urgColor}`,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",background:b.paid?urgColor:"transparent",flexShrink:0}}>
                  {b.paid&&<Check size={14} color="#fff"/>}
                </div>
                <div style={{width:36,height:36,borderRadius:T.radiusXs,background:cat.color+"15",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{cat.icon}</div>
                <div style={{flex:1,minWidth:0}}>
                  <p style={{fontSize:14,fontWeight:600,color:b.paid?T.textDim:T.text,textDecoration:b.paid?"line-through":"none"}}>{b.name}</p>
                  <p style={{fontSize:11,color:urgColor,marginTop:2}}>{b.paid?"Pago ✓":`Vence dia ${b.dueDay} • ${days===0?"Hoje!":days===1?"Amanhã":`${days} dias`}`}</p>
                </div>
                <p style={{fontFamily:T.fontDisplay,fontSize:15,fontWeight:700,color:b.paid?T.textDim:T.expense,flexShrink:0}}>{fmt(b.amount)}</p>
                <X size={14} color={T.textDim} style={{cursor:"pointer",flexShrink:0}} onClick={()=>deleteBill(b.id)} />
              </div>
            );
          })}
          <Btn variant="ghost" onClick={()=>setShowAddBill(true)} icon={<Plus size={16}/>} style={{marginTop:8}}>Adicionar Conta</Btn>
          <AddBillSheet open={showAddBill} onClose={()=>setShowAddBill(false)} onAdd={bill=>{setBills(prev=>[...prev,{id:uid(),...bill,paid:false,active:true}]);notify("Conta adicionada!");setShowAddBill(false);}} />
        </>
      )}

      {section==="goals" && (
        <>
          {goals.map((g,i)=>{
            const pct=Math.min((g.current/g.target)*100,100);
            const daysLeft=g.deadline?Math.max(0,Math.ceil((new Date(g.deadline)-new Date())/(864e5))):null;
            return (
              <div key={g.id} className="anim-item" style={{padding:"16px",marginBottom:12,background:T.card,borderRadius:T.radius,border:`1px solid ${T.border}`,animationDelay:`${i*0.05}s`}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <span style={{fontSize:24}}>{g.icon}</span>
                    <div>
                      <p style={{fontSize:15,fontWeight:700,color:T.text}}>{g.name}</p>
                      {daysLeft!==null&&<p style={{fontSize:11,color:T.textDim}}>{daysLeft} dias restantes</p>}
                    </div>
                  </div>
                  <X size={14} color={T.textDim} style={{cursor:"pointer"}} onClick={()=>deleteGoal(g.id)} />
                </div>
                <div style={{background:T.surfaceAlt,borderRadius:4,height:8,marginBottom:8,overflow:"hidden"}}>
                  <div style={{width:`${pct}%`,height:"100%",background:pct>=100?T.income:`linear-gradient(90deg,${T.accent},${T.income})`,borderRadius:4,transition:"width 0.4s ease"}} />
                </div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                  <span style={{fontSize:13,color:T.income,fontWeight:600}}>{fmt(g.current)}</span>
                  <span style={{fontSize:12,color:T.textDim}}>{pct.toFixed(0)}%</span>
                  <span style={{fontSize:13,color:T.textMuted,fontWeight:600}}>{fmt(g.target)}</span>
                </div>
                {pct<100?(
                  <div style={{display:"flex",gap:6}}>
                    {[50,100,200,500].map(amt=>(
                      <div key={amt} onClick={()=>addToGoal(g.id,amt)} style={{flex:1,padding:"6px 0",borderRadius:T.radiusXs,background:T.accentSoft,border:`1px solid ${T.accent}30`,textAlign:"center",cursor:"pointer",fontSize:12,color:T.accent,fontWeight:600}}>+{amt}</div>
                    ))}
                  </div>
                ):(
                  <div style={{textAlign:"center",padding:"8px",background:T.incomeSoft,borderRadius:T.radiusXs,color:T.income,fontSize:13,fontWeight:600}}>🎉 Meta atingida!</div>
                )}
              </div>
            );
          })}
          <Btn variant="ghost" onClick={()=>setShowAddGoal(true)} icon={<Plus size={16}/>} style={{marginTop:8}}>Adicionar Meta</Btn>
          <AddGoalSheet open={showAddGoal} onClose={()=>setShowAddGoal(false)} onAdd={goal=>{setGoals(prev=>[...prev,{id:uid(),...goal}]);notify("Meta criada!");setShowAddGoal(false);}} />
        </>
      )}
    </div>
  );
}

function AddBillSheet({ open, onClose, onAdd }) {
  const [name,setName]=useState(""); const [amount,setAmount]=useState(""); const [dueDay,setDueDay]=useState(""); const [category,setCategory]=useState("moradia");
  if (!open) return null;
  return (
    <BottomSheet open={open} onClose={onClose} title="Nova Conta Fixa">
      <Input label="Nome" value={name} onChange={setName} placeholder="Ex: Aluguel" />
      <Input label="Valor (R$)" value={amount} onChange={setAmount} type="number" placeholder="0,00" icon={<DollarSign size={16}/>} />
      <Input label="Dia do vencimento" value={dueDay} onChange={setDueDay} type="number" placeholder="Ex: 10" icon={<Calendar size={16}/>} />
      <label style={{fontFamily:T.font,fontSize:12,color:T.textMuted,marginBottom:8,display:"block",fontWeight:500}}>Categoria</label>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6,marginBottom:16}}>
        {["moradia","saude","lazer","educacao","transporte","farmacia","mercado","outros"].map(k=>(
          <div key={k} onClick={()=>setCategory(k)} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4,padding:"8px 4px",borderRadius:T.radiusSm,cursor:"pointer",background:category===k?CATEGORIES[k].color+"20":T.surfaceAlt,border:`2px solid ${category===k?CATEGORIES[k].color:"transparent"}`}}>
            <span style={{fontSize:18}}>{CATEGORIES[k].icon}</span>
            <span style={{fontSize:9,color:category===k?CATEGORIES[k].color:T.textMuted,fontWeight:500,textAlign:"center"}}>{CATEGORIES[k].label}</span>
          </div>
        ))}
      </div>
      <Btn variant="primary" onClick={()=>{if(!name||!amount||!dueDay)return;onAdd({name,amount:parseFloat(amount),dueDay:parseInt(dueDay),category});}}>Salvar</Btn>
    </BottomSheet>
  );
}

function AddGoalSheet({ open, onClose, onAdd }) {
  const [name,setName]=useState(""); const [target,setTarget]=useState(""); const [current,setCurrent]=useState("0"); const [deadline,setDeadline]=useState(""); const [icon,setIcon]=useState("🎯");
  const icons=["🎯","🏦","✈️","🏠","🚗","📱","🎓","💍","🏋️","🎮"];
  if (!open) return null;
  return (
    <BottomSheet open={open} onClose={onClose} title="Nova Meta Financeira">
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12}}>
        {icons.map(ic=>(<div key={ic} onClick={()=>setIcon(ic)} style={{width:40,height:40,borderRadius:T.radiusXs,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,cursor:"pointer",background:icon===ic?T.accentSoft:T.surfaceAlt,border:`2px solid ${icon===ic?T.accent:"transparent"}`}}>{ic}</div>))}
      </div>
      <Input label="Nome da meta" value={name} onChange={setName} placeholder="Ex: Viagem nas férias" />
      <Input label="Valor alvo (R$)" value={target} onChange={setTarget} type="number" placeholder="0,00" icon={<Target size={16}/>} />
      <Input label="Já tenho (R$)" value={current} onChange={setCurrent} type="number" placeholder="0,00" icon={<DollarSign size={16}/>} />
      <Input label="Prazo" value={deadline} onChange={setDeadline} type="date" icon={<Calendar size={16}/>} />
      <Btn variant="accent" onClick={()=>{if(!name||!target)return;onAdd({name,target:parseFloat(target),current:parseFloat(current||0),deadline,icon});}}>Criar Meta</Btn>
    </BottomSheet>
  );
}

// ── CHECKOUT ──────────────────────────────────────────────────────────────────
function CheckoutSheet({ open, onClose, onSuccess }) {
  const [step,setStep]=useState("method"); const [method,setMethod]=useState(null);
  const reset=()=>{setStep("method");setMethod(null);};
  const handlePay=m=>{setMethod(m);setStep("processing");setTimeout(()=>setStep("success"),2500);};
  if (!open) return null;
  return (
    <BottomSheet open={open} onClose={()=>{reset();onClose();}} title={step==="success"?"":"Pagamento Seguro"}>
      {step==="method"&&(<div>
        <div style={{textAlign:"center",marginBottom:20}}>
          <p style={{fontFamily:T.fontDisplay,fontSize:32,fontWeight:800,color:T.gold}}>R$ 14,90<span style={{fontSize:14,color:T.textMuted,fontWeight:400}}>/mês</span></p>
          <p style={{fontSize:12,color:T.textDim,marginTop:4}}>ou <span style={{color:T.gold,fontWeight:700}}>R$ 99,90/ano</span> — economia de 44% 🔥</p>
        </div>
        {[{id:"pix",label:"Pix",desc:"Aprovação instantânea",icon:"🟢"},{id:"card",label:"Cartão de Crédito",desc:"Visa, Mastercard, Elo",icon:"💳"},{id:"boleto",label:"Boleto Bancário",desc:"Aprovação em até 3 dias",icon:"📄"}].map(m=>(
          <div key={m.id} onClick={()=>handlePay(m.id)} style={{display:"flex",alignItems:"center",gap:12,padding:"14px",marginBottom:8,background:T.surfaceAlt,borderRadius:T.radiusSm,cursor:"pointer",border:`1px solid ${T.border}`}}>
            <span style={{fontSize:24}}>{m.icon}</span><div style={{flex:1}}><span style={{fontSize:14,fontWeight:600,color:T.text}}>{m.label}</span><p style={{fontSize:12,color:T.textDim,marginTop:2}}>{m.desc}</p></div><ChevronRight size={16} color={T.textDim}/>
          </div>
        ))}
      </div>)}
      {step==="processing"&&(<div style={{textAlign:"center",padding:"40px 0"}}><div style={{width:64,height:64,borderRadius:"50%",margin:"0 auto 20px",border:`3px solid ${T.border}`,borderTopColor:T.gold,animation:"spin 1s linear infinite"}}/><h3 style={{fontFamily:T.fontDisplay,fontSize:18,fontWeight:700}}>Processando...</h3></div>)}
      {step==="success"&&(<div style={{textAlign:"center",padding:"24px 0"}}><div style={{width:72,height:72,borderRadius:"50%",margin:"0 auto 16px",background:T.incomeSoft,display:"flex",alignItems:"center",justifyContent:"center"}}><Check size={36} color={T.income}/></div><h3 style={{fontFamily:T.fontDisplay,fontSize:22,fontWeight:800,color:T.income}}>Pagamento Confirmado!</h3><p style={{color:T.textMuted,fontSize:14,marginTop:8,marginBottom:24}}>Bem-vindo ao Valora Premium 👑</p><Btn variant="primary" onClick={()=>{reset();onSuccess();}}>Começar a usar</Btn></div>)}
    </BottomSheet>
  );
}

// ── ADMIN ─────────────────────────────────────────────────────────────────────
function AdminPanel({ allUsers }) {
  const [adminTab,setAdminTab]=useState("overview");
  const totalUsers=allUsers.length, premiumUsers=allUsers.filter(u=>u.premium).length;
  const monthlyRevenue=premiumUsers*14.90;
  const activeToday=allUsers.filter(u=>u.lastActive===today()).length;
  const growthData=MONTHS.map((m,i)=>({name:m,usuarios:Math.floor(20+i*12+Math.random()*15),premium:Math.floor(3+i*3+Math.random()*5)}));
  return (
    <div style={{padding:"0 16px 20px"}}>
      <div style={{padding:"16px 0 12px"}}><div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}><ShieldCheck size={20} color={T.admin}/><span style={{fontSize:11,fontWeight:600,color:T.admin,textTransform:"uppercase",letterSpacing:1}}>Painel Admin</span></div><h1 style={{fontFamily:T.fontDisplay,fontSize:22,fontWeight:700}}>Olá, Administrador</h1></div>
      <div style={{display:"flex",gap:6,marginBottom:16,overflowX:"auto"}}>
        {[{id:"overview",l:"Visão Geral"},{id:"users",l:"Usuários"},{id:"revenue",l:"Receita"}].map(t=>(<div key={t.id} onClick={()=>setAdminTab(t.id)} style={{padding:"8px 16px",borderRadius:20,whiteSpace:"nowrap",cursor:"pointer",background:adminTab===t.id?T.admin+"20":T.surfaceAlt,color:adminTab===t.id?T.admin:T.textMuted,fontSize:13,fontWeight:600,border:`1px solid ${adminTab===t.id?T.admin+"40":"transparent"}`}}>{t.l}</div>))}
      </div>
      {adminTab==="overview"&&(<>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16}}>
          {[{label:"Total Usuários",value:totalUsers,color:T.accent},{label:"Premium",value:premiumUsers,color:T.gold},{label:"Gratuitos",value:totalUsers-premiumUsers,color:T.income},{label:"Ativos Hoje",value:activeToday,color:"#22D3EE"}].map((k,i)=>(
            <GlassCard key={i} style={{padding:"14px"}}><p style={{fontSize:11,color:T.textDim}}>{k.label}</p><p style={{fontFamily:T.fontDisplay,fontSize:24,fontWeight:800,color:k.color}}>{k.value}</p></GlassCard>
          ))}
        </div>
        <GlassCard style={{marginBottom:16}}><p style={{fontSize:11,color:T.textDim}}>Receita Mensal</p><p style={{fontFamily:T.fontDisplay,fontSize:28,fontWeight:800,color:T.gold}}>{fmt(monthlyRevenue)}</p><p style={{fontSize:12,color:T.textDim,marginTop:4}}>Conversão: {(premiumUsers/totalUsers*100).toFixed(1)}%</p></GlassCard>
        <GlassCard style={{padding:16}}><h3 style={{fontFamily:T.fontDisplay,fontSize:14,fontWeight:600,color:T.textMuted,marginBottom:12}}>Crescimento</h3><div style={{height:160}}><ResponsiveContainer><AreaChart data={growthData}><XAxis dataKey="name" tick={{fill:T.textDim,fontSize:10}} axisLine={false} tickLine={false}/><YAxis hide/><Tooltip contentStyle={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:8,fontSize:12}}/><Area type="monotone" dataKey="usuarios" stroke={T.accent} fill={T.accentSoft} strokeWidth={2}/><Area type="monotone" dataKey="premium" stroke={T.gold} fill={T.goldSoft} strokeWidth={2}/></AreaChart></ResponsiveContainer></div></GlassCard>
      </>)}
      {adminTab==="users"&&allUsers.map((u,i)=>(
        <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"12px",marginBottom:6,background:T.card,borderRadius:T.radiusSm,border:`1px solid ${T.border}`}}>
          <div style={{width:38,height:38,borderRadius:"50%",background:u.premium?`linear-gradient(135deg,${T.gold},#F59E0B)`:`linear-gradient(135deg,${T.accent},#6366F1)`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:T.fontDisplay,fontSize:14,fontWeight:700,color:u.premium?"#000":"#fff",flexShrink:0}}>{u.name[0].toUpperCase()}</div>
          <div style={{flex:1,minWidth:0}}><p style={{fontSize:13,fontWeight:600,color:T.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{u.name}</p><p style={{fontSize:11,color:T.textDim}}>{u.email}</p></div>
          <p style={{fontSize:10,color:u.premium?T.gold:T.textDim,fontWeight:600,flexShrink:0}}>{u.premium?"PREMIUM":"FREE"}</p>
        </div>
      ))}
      {adminTab==="revenue"&&(
        <GlassCard><p style={{fontSize:11,color:T.textDim}}>Receita Mensal Estimada</p><p style={{fontFamily:T.fontDisplay,fontSize:28,fontWeight:800,color:T.gold}}>{fmt(monthlyRevenue)}</p><p style={{fontSize:12,color:T.textDim,marginTop:4}}>Anual estimado: {fmt(monthlyRevenue*12)}</p></GlassCard>
      )}
    </div>
  );
}

// ── PAYWALL ───────────────────────────────────────────────────────────────────
function PaywallScreen({ onSubscribe }) {
  const features = [
    {i:"🤖",t:"Agente IA de voz (Valora IA)"},
    {i:"🎯",t:"Metas e contas a pagar"},
    {i:"📊",t:"Relatórios e gráficos avançados"},
    {i:"👥",t:"Conta compartilhada familiar"},
    {i:"🔔",t:"Alertas de vencimentos"},
    {i:"📄",t:"Exportar relatório PDF"},
    {i:"☁️",t:"Backup automático na nuvem"},
  ];
  return (
    <div style={{fontFamily:T.font,background:T.bg,color:T.text,minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"40px 24px",maxWidth:430,margin:"0 auto"}}>
      <style>{globalCSS}</style>
      <div style={{textAlign:"center",width:"100%",animation:"fadeUp 0.5s ease"}}>
        <div style={{width:80,height:80,borderRadius:"50%",margin:"0 auto 20px",background:`linear-gradient(135deg,${T.gold},#F59E0B)`,display:"flex",alignItems:"center",justifyContent:"center"}}><Crown size={36} color="#000"/></div>
        <h1 style={{fontFamily:T.fontDisplay,fontSize:26,fontWeight:800,marginBottom:8}}>Período de Trial Encerrado</h1>
        <p style={{color:T.textMuted,fontSize:14,lineHeight:1.6,marginBottom:24}}>Seus 7 dias gratuitos terminaram. Assine para continuar gerenciando suas finanças com a Valora IA.</p>

        <div className="glass" style={{background:T.card,border:`1px solid ${T.gold}30`,borderRadius:T.radius,padding:"20px 24px",marginBottom:20,textAlign:"left"}}>
          <div style={{textAlign:"center",marginBottom:16}}>
            <p style={{fontFamily:T.fontDisplay,fontSize:32,fontWeight:800,color:T.gold}}>R$ 14,90<span style={{fontSize:14,color:T.textMuted,fontWeight:400}}>/mês</span></p>
            <p style={{fontSize:12,color:T.income,fontWeight:600,marginTop:4}}>ou R$ 99,90/ano — economia de 44% 🔥</p>
          </div>
          {features.map((f,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:i<features.length-1?`1px solid ${T.border}`:"none"}}>
              <span style={{fontSize:18}}>{f.i}</span>
              <span style={{fontSize:13,color:T.text,flex:1}}>{f.t}</span>
              <Check size={14} color={T.income}/>
            </div>
          ))}
        </div>

        <Btn variant="gold" onClick={onSubscribe} icon={<Crown size={18}/>} style={{marginBottom:12,fontSize:16,padding:"16px"}}>Assinar Valora Premium</Btn>
        <p style={{fontSize:11,color:T.textDim}}>Cancele quando quiser • Pagamento seguro</p>
      </div>
    </div>
  );
}

// ── ONBOARDING ────────────────────────────────────────────────────────────────
function OnboardingScreen({ onDone }) {
  const [step,setStep]=useState(0); const [name,setName]=useState(""); const [email,setEmail]=useState("");
  const steps=[
    {emoji:"💚",title:"Bem-vindo ao Valora",desc:"O app que ajuda você a valorizar, controlar e organizar seu dinheiro."},
    {emoji:"🤖",title:"Seu Assistente de Voz",desc:"Pergunte à Valora IA: \"quanto gastei esse mês?\" e ela responde por voz, como uma Alexa financeira."},
    {emoji:"🎯",title:"Metas e Contas",desc:"Cadastre contas fixas e metas. Nunca mais esqueça um vencimento."},
  ];
  return (
    <div style={{fontFamily:T.font,background:T.bg,color:T.text,minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"40px 24px",maxWidth:430,margin:"0 auto"}}>
      <style>{globalCSS}</style>
      {step<3?(
        <div style={{textAlign:"center",animation:"fadeUp 0.5s ease"}}>
          <div style={{fontSize:64,marginBottom:24}}>{steps[step].emoji}</div>
          <h1 style={{fontFamily:T.fontDisplay,fontSize:28,fontWeight:800,marginBottom:12,lineHeight:1.2}}>{steps[step].title}</h1>
          <p style={{color:T.textMuted,fontSize:15,lineHeight:1.6,marginBottom:40,maxWidth:300,margin:"0 auto 40px"}}>{steps[step].desc}</p>
          <div style={{display:"flex",gap:8,justifyContent:"center",marginBottom:32}}>{[0,1,2].map(i=>(<div key={i} style={{width:step===i?24:8,height:8,borderRadius:4,background:step===i?T.income:T.surfaceAlt,transition:"all 0.3s"}}/>))}</div>
          <Btn variant="primary" onClick={()=>setStep(step+1)} style={{maxWidth:280,margin:"0 auto"}}>{step===2?"Criar conta":"Próximo"}</Btn>
        </div>
      ):(
        <div style={{textAlign:"center",animation:"fadeUp 0.5s ease",width:"100%",maxWidth:320}}>
          <div style={{fontSize:48,marginBottom:16}}>👤</div>
          <h2 style={{fontFamily:T.fontDisplay,fontSize:24,fontWeight:700,marginBottom:8}}>Criar sua conta</h2>
          <p style={{color:T.textMuted,fontSize:14,marginBottom:24}}>Seus dados ficam salvos localmente no dispositivo.</p>
          <Input placeholder="Seu nome" value={name} onChange={setName} />
          <Input placeholder="Seu e-mail" value={email} onChange={setEmail} type="email" />
          {email.toLowerCase()===ADMIN_EMAIL&&(<div style={{display:"flex",alignItems:"center",gap:6,padding:"8px 12px",background:T.adminSoft,borderRadius:T.radiusXs,marginBottom:12,border:`1px solid ${T.admin}30`}}><ShieldCheck size={14} color={T.admin}/><span style={{fontSize:12,color:T.admin,fontWeight:600}}>Conta administrador detectada</span></div>)}
          <Btn variant="primary" onClick={()=>onDone(name||"Usuário",email)} style={{marginTop:8}}>Entrar no Valora</Btn>
        </div>
      )}
    </div>
  );
}

// ── HOME ──────────────────────────────────────────────────────────────────────
function HomeScreen({ balance, totalIncome, totalExpense, catData, monthlyChart, transactions, filterMonth, setFilterMonth, userName, sharedKey, isPremium, isAdmin, onShowPremium, onShowShared, onDelete, onOpenAgent }) {
  return (
    <div style={{padding:"0 16px 20px"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 0 12px"}}>
        <div><p style={{fontSize:13,color:T.textMuted,fontWeight:500}}>Olá, {userName||"Usuário"} {isAdmin?"🛡️":"👋"}</p><h1 style={{fontFamily:T.fontDisplay,fontSize:20,fontWeight:700,marginTop:2}}>Valora</h1></div>
        <div style={{display:"flex",gap:8}}>
          {sharedKey&&<div onClick={onShowShared} style={{width:36,height:36,borderRadius:"50%",background:T.accentSoft,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}><Users size={16} color={T.accent}/></div>}
          {!isPremium&&<div onClick={onShowPremium} style={{width:36,height:36,borderRadius:"50%",background:T.goldSoft,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}><Crown size={16} color={T.gold}/></div>}
        </div>
      </div>

      {/* Agent Card */}
      <div className="anim-item" onClick={onOpenAgent} style={{display:"flex",alignItems:"center",gap:12,padding:"14px 16px",marginBottom:16,background:`linear-gradient(135deg,${T.agentSoft},rgba(34,211,238,0.04))`,borderRadius:T.radiusSm,border:`1px solid ${T.agent}30`,cursor:"pointer"}}>
        <div style={{width:38,height:38,borderRadius:"50%",background:`linear-gradient(135deg,${T.agent},#0891B2)`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,boxShadow:`0 0 12px ${T.agentGlow}`}}><span style={{fontSize:20}}>🤖</span></div>
        <div style={{flex:1}}><p style={{fontSize:13,fontWeight:700,color:T.agent}}>Valora IA</p><p style={{fontSize:12,color:T.textDim,marginTop:1}}>Pergunte sobre seus gastos por voz ou texto</p></div>
        <Mic size={16} color={T.agent}/>
      </div>

      <div className="anim-item" style={{animationDelay:"0.05s"}}>
        <GlassCard style={{background:`linear-gradient(135deg,rgba(52,211,153,0.08),rgba(129,140,248,0.08))`,border:`1px solid ${T.incomeGlow}`,padding:"20px",marginBottom:16}}>
          <p style={{fontSize:12,color:T.textMuted,fontWeight:500,marginBottom:4}}>Saldo do Mês</p>
          <h2 style={{fontFamily:T.fontDisplay,fontSize:32,fontWeight:800,color:balance>=0?T.income:T.expense,marginBottom:12}}>{fmt(balance)}</h2>
          <div style={{display:"flex",gap:12}}>
            <div style={{flex:1,background:T.incomeSoft,borderRadius:T.radiusXs,padding:"10px 12px"}}><div style={{display:"flex",alignItems:"center",gap:4,marginBottom:2}}><ArrowUpRight size={14} color={T.income}/><span style={{fontSize:11,color:T.income,fontWeight:600}}>Receitas</span></div><span style={{fontFamily:T.fontDisplay,fontSize:16,fontWeight:700,color:T.income}}>{fmt(totalIncome)}</span></div>
            <div style={{flex:1,background:T.expenseSoft,borderRadius:T.radiusXs,padding:"10px 12px"}}><div style={{display:"flex",alignItems:"center",gap:4,marginBottom:2}}><ArrowDownRight size={14} color={T.expense}/><span style={{fontSize:11,color:T.expense,fontWeight:600}}>Despesas</span></div><span style={{fontFamily:T.fontDisplay,fontSize:16,fontWeight:700,color:T.expense}}>{fmt(totalExpense)}</span></div>
          </div>
        </GlassCard>
      </div>

      <div className="anim-item" style={{animationDelay:"0.1s",display:"flex",alignItems:"center",justifyContent:"center",gap:16,marginBottom:16}}>
        <ChevronLeft size={20} color={T.textMuted} style={{cursor:"pointer"}} onClick={()=>setFilterMonth(p=>(p-1+12)%12)}/>
        <span style={{fontFamily:T.fontDisplay,fontSize:16,fontWeight:600,minWidth:100,textAlign:"center"}}>{MONTHS[filterMonth]} 2026</span>
        <ChevronRight size={20} color={T.textMuted} style={{cursor:"pointer"}} onClick={()=>setFilterMonth(p=>(p+1)%12)}/>
      </div>

      {catData.length>0&&(
        <div className="anim-item" style={{animationDelay:"0.15s"}}>
          <GlassCard style={{marginBottom:16,padding:"16px"}}>
            <h3 style={{fontFamily:T.fontDisplay,fontSize:14,fontWeight:600,marginBottom:12,color:T.textMuted}}>Gastos por Categoria</h3>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <div style={{width:120,height:120}}><ResponsiveContainer><PieChart><Pie data={catData} dataKey="value" cx="50%" cy="50%" innerRadius={30} outerRadius={52} paddingAngle={3} strokeWidth={0}>{catData.map((c,i)=><Cell key={i} fill={c.color}/>)}</Pie></PieChart></ResponsiveContainer></div>
              <div style={{flex:1,display:"flex",flexDirection:"column",gap:6}}>{catData.slice(0,5).map((c,i)=>(<div key={i} style={{display:"flex",alignItems:"center",gap:8,fontSize:12}}><div style={{width:8,height:8,borderRadius:2,background:c.color,flexShrink:0}}/><span style={{color:T.textMuted,flex:1}}>{c.name}</span><span style={{color:T.text,fontWeight:600,fontFamily:T.fontDisplay}}>{fmt(c.value)}</span></div>))}</div>
            </div>
          </GlassCard>
        </div>
      )}

      <div className="anim-item" style={{animationDelay:"0.2s"}}>
        <GlassCard style={{marginBottom:16,padding:"16px"}}>
          <h3 style={{fontFamily:T.fontDisplay,fontSize:14,fontWeight:600,marginBottom:12,color:T.textMuted}}>Visão Anual</h3>
          <div style={{height:160}}><ResponsiveContainer><BarChart data={monthlyChart} barGap={2}><CartesianGrid strokeDasharray="3 3" stroke={T.border}/><XAxis dataKey="name" tick={{fill:T.textDim,fontSize:10}} axisLine={false} tickLine={false}/><YAxis hide/><Tooltip contentStyle={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:8,fontSize:12}} formatter={v=>fmt(v)}/><Bar dataKey="receitas" fill={T.income} radius={[3,3,0,0]} maxBarSize={16}/><Bar dataKey="despesas" fill={T.expense} radius={[3,3,0,0]} maxBarSize={16}/></BarChart></ResponsiveContainer></div>
        </GlassCard>
      </div>

      <div className="anim-item" style={{animationDelay:"0.25s"}}>
        <h3 style={{fontFamily:T.fontDisplay,fontSize:14,fontWeight:600,marginBottom:12,color:T.textMuted}}>Últimas Transações</h3>
        {transactions.slice(0,8).map((t,i)=><TransactionItem key={t.id} tx={t} onDelete={onDelete} delay={i*0.03}/>)}
        {transactions.length===0&&<div style={{textAlign:"center",padding:"32px 0",color:T.textDim}}><p style={{fontSize:14}}>Nenhuma transação este mês</p></div>}
      </div>
    </div>
  );
}

// ── TRANSACTIONS ──────────────────────────────────────────────────────────────
function TransactionsScreen({ transactions, filterMonth, setFilterMonth, searchQuery, setSearchQuery, onDelete }) {
  const filtered = useMemo(()=>{
    if (!searchQuery) return transactions;
    const q=searchQuery.toLowerCase();
    return transactions.filter(t=>t.description.toLowerCase().includes(q)||(CATEGORIES[t.category]?.label||"").toLowerCase().includes(q));
  },[transactions,searchQuery]);
  return (
    <div style={{padding:"0 16px 20px"}}>
      <div style={{padding:"16px 0 12px"}}><h1 style={{fontFamily:T.fontDisplay,fontSize:22,fontWeight:700}}>Extrato</h1></div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:16,marginBottom:12}}>
        <ChevronLeft size={20} color={T.textMuted} style={{cursor:"pointer"}} onClick={()=>setFilterMonth(p=>(p-1+12)%12)}/>
        <span style={{fontFamily:T.fontDisplay,fontSize:15,fontWeight:600}}>{MONTHS[filterMonth]} 2026</span>
        <ChevronRight size={20} color={T.textMuted} style={{cursor:"pointer"}} onClick={()=>setFilterMonth(p=>(p+1)%12)}/>
      </div>
      <div style={{position:"relative",marginBottom:16}}><Search size={16} color={T.textDim} style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)"}}/><input value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder="Buscar transação..." style={{width:"100%",background:T.surfaceAlt,border:`1px solid ${T.border}`,borderRadius:T.radiusSm,padding:"10px 12px 10px 36px",color:T.text,fontFamily:T.font,fontSize:14,outline:"none"}}/></div>
      <div style={{display:"flex",gap:8,marginBottom:16}}>
        <GlassCard style={{flex:1,padding:"12px",textAlign:"center"}}><p style={{fontSize:11,color:T.income,fontWeight:600}}>Receitas</p><p style={{fontFamily:T.fontDisplay,fontSize:16,fontWeight:700,color:T.income}}>{fmt(filtered.filter(t=>t.type==="income").reduce((s,t)=>s+t.value,0))}</p></GlassCard>
        <GlassCard style={{flex:1,padding:"12px",textAlign:"center"}}><p style={{fontSize:11,color:T.expense,fontWeight:600}}>Despesas</p><p style={{fontFamily:T.fontDisplay,fontSize:16,fontWeight:700,color:T.expense}}>{fmt(filtered.filter(t=>t.type==="expense").reduce((s,t)=>s+t.value,0))}</p></GlassCard>
      </div>
      {filtered.map((t,i)=><TransactionItem key={t.id} tx={t} onDelete={onDelete} delay={i*0.02}/>)}
      {filtered.length===0&&<div style={{textAlign:"center",padding:"40px 0",color:T.textDim}}><Search size={32} style={{marginBottom:8,opacity:0.3}}/><p>Nenhuma transação encontrada</p></div>}
    </div>
  );
}

// ── SETTINGS ──────────────────────────────────────────────────────────────────
function SettingsScreen({ userName, setUserName, userEmail, sharedKey, isPremium, isAdmin, onShowPremium, onShowShared, onAdminTab }) {
  const [editName,setEditName]=useState(false); const [tempName,setTempName]=useState(userName);
  return (
    <div style={{padding:"0 16px 20px"}}>
      <div style={{padding:"16px 0 12px"}}><h1 style={{fontFamily:T.fontDisplay,fontSize:22,fontWeight:700}}>Configurações</h1></div>
      <GlassCard style={{marginBottom:12}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:48,height:48,borderRadius:"50%",background:`linear-gradient(135deg,${isAdmin?T.admin:T.income},${T.accent})`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:T.fontDisplay,fontSize:20,fontWeight:700,color:"#fff"}}>{(userName||"U")[0].toUpperCase()}</div>
          <div style={{flex:1}}>
            {editName?(<div style={{display:"flex",gap:8}}><input value={tempName} onChange={e=>setTempName(e.target.value)} style={{flex:1,background:T.surfaceAlt,border:`1px solid ${T.border}`,borderRadius:T.radiusXs,padding:"6px 10px",color:T.text,fontFamily:T.font,fontSize:14,outline:"none"}}/><div onClick={()=>{setUserName(tempName);setEditName(false);}} style={{cursor:"pointer",color:T.income,display:"flex",alignItems:"center"}}><Check size={20}/></div></div>):(<><p style={{fontSize:16,fontWeight:600}}>{userName||"Usuário"}</p><p style={{fontSize:12,color:T.textDim}}>{userEmail}</p><p style={{fontSize:11,color:T.accent,cursor:"pointer",marginTop:2}} onClick={()=>setEditName(true)}>Editar nome</p></>)}
          </div>
          {isPremium&&<Crown size={20} color={T.gold}/>}
          {isAdmin&&<ShieldCheck size={20} color={T.admin}/>}
        </div>
      </GlassCard>
      {isAdmin&&(<GlassCard onClick={onAdminTab} style={{marginBottom:12,cursor:"pointer",border:`1px solid ${T.admin}25`,background:T.adminSoft}}><div style={{display:"flex",alignItems:"center",gap:12}}><div style={{width:36,height:36,borderRadius:T.radiusXs,background:T.admin+"20",display:"flex",alignItems:"center",justifyContent:"center"}}><ShieldCheck size={18} color={T.admin}/></div><div style={{flex:1}}><p style={{fontSize:14,fontWeight:600,color:T.admin}}>Painel Administrativo</p><p style={{fontSize:12,color:T.textDim}}>Métricas, usuários e receita</p></div><ChevronRight size={16} color={T.admin}/></div></GlassCard>)}
      {[
        {icon:<Users size={18}/>,label:"Conta Compartilhada",desc:sharedKey?"Conectada":"Não configurada",color:T.accent,onClick:onShowShared},
        {icon:<Crown size={18}/>,label:"Valora Premium",desc:isPremium?"Ativo ✓":"R$ 14,90/mês",color:T.gold,onClick:onShowPremium},
        {icon:<Shield size={18}/>,label:"Segurança",desc:"Biometria e criptografia",color:"#3B82F6"},
        {icon:<Bell size={18}/>,label:"Notificações",desc:"Alertas de gastos e vencimentos",color:"#F59E0B"},
        {icon:<Download size={18}/>,label:"Backup",desc:"Dados locais",color:"#10B981"},
      ].map((item,i)=>(
        <GlassCard key={i} onClick={item.onClick} style={{marginBottom:8,cursor:item.onClick?"pointer":"default",padding:"14px 16px"}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:36,height:36,borderRadius:T.radiusXs,background:item.color+"15",display:"flex",alignItems:"center",justifyContent:"center",color:item.color}}>{item.icon}</div>
            <div style={{flex:1}}><p style={{fontSize:14,fontWeight:600}}>{item.label}</p><p style={{fontSize:12,color:T.textDim}}>{item.desc}</p></div>
            {item.toggle?(<div onClick={e=>{e.stopPropagation();item.onToggle();}} style={{width:44,height:24,borderRadius:12,padding:2,cursor:"pointer",background:item.checked?T.income:T.surfaceAlt,transition:"background 0.2s"}}><div style={{width:20,height:20,borderRadius:10,background:"#fff",transform:item.checked?"translateX(20px)":"translateX(0)",transition:"transform 0.2s"}}/></div>):item.onClick?<ChevronRight size={16} color={T.textDim}/>:null}
          </div>
        </GlassCard>
      ))}
      <div style={{textAlign:"center",padding:"24px 0",color:T.textDim}}>
        <p style={{fontSize:12,fontFamily:T.fontDisplay,fontWeight:500}}>Valora v2.0 • Powered by AI 🤖</p>
        <p style={{fontSize:11,marginTop:4}}>Feito com 💚 para suas finanças</p>
      </div>
    </div>
  );
}

// ── DATA GENERATORS ───────────────────────────────────────────────────────────
function generateSampleBills() {
  return [
    {id:uid(),name:"Aluguel",      amount:1500,dueDay:5, category:"moradia",  active:true,paid:false},
    {id:uid(),name:"Internet",     amount:120, dueDay:10,category:"moradia",  active:true,paid:false},
    {id:uid(),name:"Netflix",      amount:45,  dueDay:15,category:"lazer",    active:true,paid:true},
    {id:uid(),name:"Conta de Luz", amount:180, dueDay:20,category:"moradia",  active:true,paid:false},
    {id:uid(),name:"Academia",     amount:99,  dueDay:8, category:"saude",    active:true,paid:false},
  ];
}

function generateSampleGoals() {
  return [
    {id:uid(),name:"Reserva de emergência",target:10000,current:3200,deadline:"2026-12-31",icon:"🏦"},
    {id:uid(),name:"Viagem nas férias",    target:4000, current:900, deadline:"2026-07-15",icon:"✈️"},
  ];
}

function generateSimulatedUsers() {
  const names=[
    {name:"Lucas Pelicer",    email:"lgpelicer@gmail.com",    premium:true},
    {name:"Maria Silva",      email:"maria.silva@email.com",  premium:true},
    {name:"João Santos",      email:"joao.santos@email.com",  premium:false},
    {name:"Ana Oliveira",     email:"ana.oliveira@email.com", premium:true},
    {name:"Carlos Ferreira",  email:"carlos.f@email.com",     premium:false},
    {name:"Beatriz Costa",    email:"bea.costa@email.com",    premium:false},
    {name:"Pedro Almeida",    email:"pedro.alm@email.com",    premium:true},
    {name:"Juliana Rodrigues",email:"ju.rodrigues@email.com", premium:false},
    {name:"Rafael Lima",      email:"rafa.lima@email.com",    premium:true},
    {name:"Camila Souza",     email:"cami.souza@email.com",   premium:false},
  ];
  const now=new Date();
  return names.map(n=>({...n,id:uid(),
    joinDate:new Date(now.getFullYear(),now.getMonth()-Math.floor(Math.random()*6),Math.floor(Math.random()*28)+1).toISOString().split("T")[0],
    lastActive:new Date(now.getFullYear(),now.getMonth(),now.getDate()-Math.floor(Math.random()*10)).toISOString().split("T")[0],
    transactions:Math.floor(Math.random()*120)+10,
  }));
}

function generateSampleData() {
  const data=[]; const now=new Date(); const m=now.getMonth(); const y=now.getFullYear();
  const expenses=[
    {cat:"alimentacao",desc:"Almoço restaurante",min:25,max:80},
    {cat:"alimentacao",desc:"iFood delivery",    min:20,max:60},
    {cat:"mercado",    desc:"Supermercado",       min:80,max:450},
    {cat:"transporte", desc:"Uber",               min:12,max:45},
    {cat:"transporte", desc:"Gasolina",           min:100,max:300},
    {cat:"moradia",    desc:"Aluguel",            min:1500,max:1500},
    {cat:"moradia",    desc:"Conta de luz",       min:80,max:250},
    {cat:"moradia",    desc:"Internet",           min:120,max:120},
    {cat:"saude",      desc:"Consulta médica",    min:150,max:350},
    {cat:"farmacia",   desc:"Medicamentos",       min:30,max:120},
    {cat:"lazer",      desc:"Netflix",            min:45,max:45},
    {cat:"lazer",      desc:"Cinema",             min:30,max:80},
    {cat:"educacao",   desc:"Curso online",       min:50,max:200},
  ];
  const incomes=[
    {cat:"salario",    desc:"Salário",            min:5000,max:5000},
    {cat:"freelance",  desc:"Projeto freelance",  min:500,max:2000},
    {cat:"investimento",desc:"Rendimento",        min:50,max:300},
  ];
  for (let pm=0;pm<=5;pm++) {
    const cm=(m-pm+12)%12; const cy=m-pm<0?y-1:y;
    incomes.forEach(inc=>{
      if (Math.random()>0.3) data.push({id:uid(),type:"income",value:inc.min+Math.floor(Math.random()*(inc.max-inc.min)),category:inc.cat,description:inc.desc,user:Math.random()>0.8?"Maria":"Você",date:`${cy}-${String(cm+1).padStart(2,"0")}-${String(Math.floor(Math.random()*20)+1).padStart(2,"0")}`,timestamp:Date.now()});
    });
    const count = pm===0?14:8+Math.floor(Math.random()*8);
    for (let i=0;i<count;i++) {
      const exp=expenses[Math.floor(Math.random()*expenses.length)];
      data.push({id:uid(),type:"expense",value:exp.min+Math.floor(Math.random()*(exp.max-exp.min)),category:exp.cat,description:exp.desc,user:Math.random()>0.7?"Maria":"Você",date:`${cy}-${String(cm+1).padStart(2,"0")}-${String(Math.floor(Math.random()*28)+1).padStart(2,"0")}`,timestamp:Date.now()});
    }
  }
  return data.sort((a,b)=>new Date(b.date)-new Date(a.date));
}
