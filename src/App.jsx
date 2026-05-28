import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { supabase, db, signIn, signUp, signOut } from "./supabase.js";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { Mic, Camera, Plus, X, ChevronRight, ChevronLeft, Users, FileText, Shield, Crown, Home, BarChart3, Settings, Bell, Search, Calendar, Download, Check, CreditCard, DollarSign, ArrowUpRight, ArrowDownRight, Copy, UserPlus, ShieldCheck, Target, MicOff, Volume2, TrendingUp, Activity, UserCheck, Zap } from "lucide-react";

const ADMIN_EMAIL = "lgpelicer@gmail.com";

// ── FEATURE 6 — NEO DARK DESIGN SYSTEM ───────────────────────────────────────
const T = {
  // Backgrounds Neo Dark
  bg: "#0D0D14", surface: "#13131F", surfaceAlt: "#1A1A2E",
  card: "rgba(19,19,31,0.90)", border: "rgba(109,40,217,0.18)",
  // Receita / Despesa
  income: "#34D399", incomeSoft: "rgba(52,211,153,0.10)", incomeGlow: "rgba(52,211,153,0.22)",
  expense: "#F87171", expenseSoft: "rgba(248,113,113,0.10)", expenseGlow: "rgba(248,113,113,0.22)",
  // Roxo escuro — primary accent
  accent: "#6D28D9", accentAlt: "#8B5CF6", accentSoft: "rgba(109,40,217,0.14)",
  accentGlow: "rgba(109,40,217,0.40)",
  // Ciano elétrico — secondary accent
  cyan: "#22D3EE", cyanSoft: "rgba(34,211,238,0.12)", cyanGlow: "rgba(34,211,238,0.28)",
  // Gradiente principal (roxo → ciano)
  grad: "linear-gradient(135deg,#4C1D95,#06B6D4)",
  gradCard: "linear-gradient(135deg,rgba(76,29,149,0.16),rgba(6,182,212,0.06))",
  // Gold / status
  gold: "#FBBF24", goldSoft: "rgba(251,191,36,0.12)",
  // Texto
  text: "#F1F5F9", textMuted: "#94A3B8", textDim: "#4B5563",
  // Radii & fonts
  radius: "18px", radiusSm: "12px", radiusXs: "7px",
  font: "'DM Sans', sans-serif", fontDisplay: "'Outfit', sans-serif",
  // Admin / Agent
  admin: "#8B5CF6", adminSoft: "rgba(139,92,246,0.14)", adminGlow: "rgba(139,92,246,0.35)",
  agent: "#22D3EE", agentSoft: "rgba(34,211,238,0.10)", agentGlow: "rgba(34,211,238,0.28)",
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

// ── FEATURE 3 — GUIABOLSO: AUTO-CATEGORIZAÇÃO ────────────────────────────────
const AUTO_RULES = [
  { patterns: ["amazon","shopee","mercado livre","magazine","americanas"], category: "vestuario" },
  { patterns: ["uber","99","cabify","taxi","gasolina","combustivel","posto","onibus","metro"], category: "transporte" },
  { patterns: ["ifood","rappi","restaurante","almoco","jantar","lanche","cafe","padaria","pizza"], category: "alimentacao" },
  { patterns: ["netflix","spotify","prime","disney","hbo","cinema","steam","playstation","show"], category: "lazer" },
  { patterns: ["farmacia","drogaria","remedio","medicamento","droga"], category: "farmacia" },
  { patterns: ["mercado","supermercado","feira","hortifruti","atacadao","assai"], category: "mercado" },
  { patterns: ["medico","consulta","hospital","dentista","exame","clinica","laboratorio"], category: "saude" },
  { patterns: ["aluguel","condominio","luz","agua","internet","gas","iptu"], category: "moradia" },
  { patterns: ["escola","faculdade","curso","livro","mensalidade","universidade"], category: "educacao" },
  { patterns: ["salario","pagamento","contracheque","folha"], category: "salario" },
  { patterns: ["freelance","projeto","servico","cliente","honorario"], category: "freelance" },
  { patterns: ["investimento","dividendo","rendimento","juros","tesouro","fundo"], category: "investimento" },
];
function autoCategorize(description) {
  if (!description) return null;
  const d = description.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  for (const rule of AUTO_RULES) { if (rule.patterns.some(p => d.includes(p))) return rule.category; }
  return null;
}

// ── WALLET: MULTIMOEDA ───────────────────────────────────────────────────────
const CURRENCIES = {
  BRL: { symbol: "R$", label: "Real",  flag: "🇧🇷", decimals: 2 },
  USD: { symbol: "$",  label: "Dólar", flag: "🇺🇸", decimals: 2 },
  EUR: { symbol: "€",  label: "Euro",  flag: "🇪🇺", decimals: 2 },
  GBP: { symbol: "£",  label: "Libra", flag: "🇬🇧", decimals: 2 },
  JPY: { symbol: "¥",  label: "Iene",  flag: "🇯🇵", decimals: 0 },
};

// Taxas fallback (1 moeda estrangeira = X BRL). Supabase atualiza a cada 6h quando configurado.
const FALLBACK_RATES = { BRL: 1, USD: 5.10, EUR: 5.55, GBP: 6.40, JPY: 0.034 };

function fmtCurrency(value, currency = "BRL") {
  const c = CURRENCIES[currency] || CURRENCIES.BRL;
  const n = Number(value) || 0;
  const formatted = n.toFixed(c.decimals).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${c.flag} ${c.symbol} ${formatted}`;
}

function useExchangeRate() {
  const [rates, setRates] = useState(FALLBACK_RATES);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    // Tenta buscar taxas atualizadas da API pública (gratuita, sem key)
    fetch("https://open.er-api.com/v6/latest/USD")
      .then(r => r.json())
      .then(data => {
        if (data?.rates) {
          const usdToBRL = data.rates.BRL || FALLBACK_RATES.USD;
          setRates({
            BRL: 1,
            USD: usdToBRL,
            EUR: usdToBRL / (data.rates.EUR || 1) * (data.rates.BRL || 1) / (data.rates.USD || 1),
            GBP: usdToBRL / (data.rates.GBP || 1) * (data.rates.BRL || 1) / (data.rates.USD || 1),
            JPY: usdToBRL / (data.rates.JPY || 1) * (data.rates.BRL || 1) / (data.rates.USD || 1),
          });
          setLastUpdated(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
        }
      })
      .catch(() => { /* usa fallback silenciosamente */ });
  }, []);

  const convert = useCallback((amount, from, to = "BRL") => {
    if (from === to) return amount;
    const inBRL = amount * (rates[from] || 1);
    if (to === "BRL") return inBRL;
    return inBRL / (rates[to] || 1);
  }, [rates]);

  return { rates, lastUpdated, convert };
}
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
  @keyframes neoGlow  { 0%,100%{box-shadow:0 0 12px rgba(109,40,217,0.3)} 50%{box-shadow:0 0 24px rgba(34,211,238,0.4)} }
  @keyframes shimmer  { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
  .neo-card { border:1px solid rgba(109,40,217,0.22) !important; transition:border-color 0.3s,box-shadow 0.3s; }
  .neo-card:hover { border-color:rgba(34,211,238,0.35) !important; box-shadow:0 0 20px rgba(109,40,217,0.18); }
  .anim-item { animation:fadeUp 0.5s ease both; }
  .glass { backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px); }
`;

// ── SHARED COMPONENTS ────────────────────────────────────────────────────────
function GlassCard({ children, style, onClick }) {
  return <div className="glass neo-card" onClick={onClick} style={{background:T.card,borderRadius:T.radius,padding:"16px",...style}}>{children}</div>;
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
    primary:{background:T.grad,color:"#fff",boxShadow:`0 4px 18px ${T.accentGlow}`},
    danger: {background:`linear-gradient(135deg,${T.expense},#DC2626)`,color:"#fff"},
    ghost:  {background:"transparent",color:T.textMuted,border:`1px solid rgba(109,40,217,0.25)`},
    accent: {background:`linear-gradient(135deg,${T.accent},${T.cyan})`,color:"#fff",boxShadow:`0 4px 16px ${T.accentGlow}`},
    gold:   {background:`linear-gradient(135deg,${T.gold},#F59E0B)`,color:"#000"},
    admin:  {background:`linear-gradient(135deg,${T.admin},#4C1D95)`,color:"#fff"},
    agent:  {background:`linear-gradient(135deg,${T.cyan},#0891B2)`,color:"#000"},
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
        <div key={t.id} onClick={()=>onChange(t.id)} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2,padding:"8px 0",cursor:"pointer",color:active===t.id?(t.id==="admin"?T.admin:T.cyan):T.textDim}}>
          {t.icon}
          <span style={{fontSize:9,fontFamily:T.font,fontWeight:active===t.id?600:400}}>{t.label}</span>
          {active===t.id && <div style={{width:4,height:4,borderRadius:2,background:t.id==="admin"?T.admin:T.cyan,marginTop:1}} />}
        </div>
      ))}
    </div>
  );
}

function CurrencySelector({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const cur = CURRENCIES[value] || CURRENCIES.BRL;
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);
  return (
    <div ref={ref} style={{position:"relative",marginBottom:12}}>
      <label style={{fontFamily:T.font,fontSize:12,color:T.textMuted,marginBottom:6,display:"block",fontWeight:500}}>Moeda</label>
      <div onClick={()=>setOpen(o=>!o)} style={{display:"flex",alignItems:"center",gap:8,background:T.surfaceAlt,borderRadius:T.radiusSm,border:`1px solid ${open?T.accent:T.border}`,padding:"12px",cursor:"pointer",transition:"border-color 0.2s"}}>
        <span style={{fontSize:18}}>{cur.flag}</span>
        <span style={{fontFamily:T.font,fontSize:15,color:T.text,fontWeight:500}}>{value} — {cur.label}</span>
        <span style={{marginLeft:"auto",color:T.textDim,fontSize:12}}>▾</span>
      </div>
      {open && (
        <div style={{position:"absolute",top:"100%",left:0,right:0,zIndex:200,background:T.surface,border:`1px solid ${T.border}`,borderRadius:T.radiusSm,overflow:"hidden",boxShadow:"0 8px 24px rgba(0,0,0,0.4)",marginTop:4}}>
          {Object.entries(CURRENCIES).map(([code,c])=>(
            <div key={code} onClick={()=>{onChange(code);setOpen(false);}} style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px",cursor:"pointer",background:value===code?T.accentSoft:"transparent",borderBottom:`1px solid ${T.border}`,transition:"background 0.15s"}}>
              <span style={{fontSize:18}}>{c.flag}</span>
              <span style={{fontFamily:T.font,fontSize:14,color:T.text,fontWeight:value===code?600:400}}>{code}</span>
              <span style={{fontSize:13,color:T.textDim}}>{c.label}</span>
              {value===code && <span style={{marginLeft:"auto",color:T.accent,fontSize:12}}>✓</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CurrencyBadge({ currency }) {
  if (!currency || currency === "BRL") return null;
  const c = CURRENCIES[currency];
  if (!c) return null;
  return (
    <span style={{fontSize:9,fontWeight:700,fontFamily:T.font,padding:"2px 5px",borderRadius:4,background:T.accentSoft,color:T.accent,border:`1px solid ${T.accent}40`,marginLeft:4,verticalAlign:"middle"}}>
      {c.flag} {currency}
    </span>
  );
}

function ExchangeRateBar({ rates, lastUpdated }) {
  const currencies = [
    { code: "USD", ...CURRENCIES.USD },
    { code: "EUR", ...CURRENCIES.EUR },
    { code: "GBP", ...CURRENCIES.GBP },
    { code: "JPY", ...CURRENCIES.JPY },
  ];
  return (
    <div style={{display:"flex",alignItems:"center",gap:0,padding:"8px 16px",background:T.surfaceAlt,borderRadius:T.radiusSm,marginBottom:12,overflowX:"auto",border:`1px solid ${T.border}`}}>
      {currencies.map((c,i)=>(
        <div key={c.code} style={{display:"flex",alignItems:"center",gap:6,flexShrink:0,paddingRight:i<currencies.length-1?14:0,marginRight:i<currencies.length-1?14:0,borderRight:i<currencies.length-1?`1px solid ${T.border}`:"none"}}>
          <span style={{fontSize:14}}>{c.flag}</span>
          <div>
            <span style={{fontSize:10,color:T.textDim,fontFamily:T.font}}>{c.code} </span>
            <span style={{fontSize:12,fontWeight:700,color:T.text,fontFamily:T.fontDisplay}}>{fmt(rates[c.code]||FALLBACK_RATES[c.code])}</span>
          </div>
        </div>
      ))}
      {lastUpdated && <span style={{marginLeft:"auto",fontSize:9,color:T.textDim,flexShrink:0,paddingLeft:8}}>🕐 {lastUpdated}</span>}
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
      <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:2,flexShrink:0}}>
        <p style={{fontSize:14,fontWeight:700,fontFamily:T.fontDisplay,color:isIncome?T.income:T.expense}}>{isIncome?"+":"-"}{fmt(tx.valueInBRL??tx.value)}</p>
        {tx.currency && tx.currency !== "BRL" && (
          <span style={{fontSize:10,color:T.textDim,fontFamily:T.font}}>{fmtCurrency(tx.value, tx.currency)}<CurrencyBadge currency={tx.currency}/></span>
        )}
      </div>
      <X size={14} color={T.textDim} style={{cursor:"pointer",flexShrink:0,marginLeft:4}} onClick={e=>{e.stopPropagation();onDelete(tx.id);}} />
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

// ── DATA GENERATORS ──────────────────────────────────────────────────────────
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
    {cat:"vestuario",  desc:"Roupas",             min:50,max:300},
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
    const count=pm===0?14:8+Math.floor(Math.random()*8);
    for (let i=0;i<count;i++) {
      const exp=expenses[Math.floor(Math.random()*expenses.length)];
      data.push({id:uid(),type:"expense",value:exp.min+Math.floor(Math.random()*(exp.max-exp.min)),category:exp.cat,description:exp.desc,user:Math.random()>0.7?"Maria":"Você",date:`${cy}-${String(cm+1).padStart(2,"0")}-${String(Math.floor(Math.random()*28)+1).padStart(2,"0")}`,timestamp:Date.now()});
    }
  }
  return data.sort((a,b)=>new Date(b.date)-new Date(a.date));
}

// ── MAIN APP ──────────────────────────────────────────────────────────────────
export default function Valora() {
  // ── Auth state ──────────────────────────────────────────────────────────────
  const [authUser,setAuthUser]       = useState(null);   // supabase user object
  const [authLoading,setAuthLoading] = useState(true);   // checking session
  const [showAuth,setShowAuth]       = useState(false);  // show auth screen

  // ── App state ───────────────────────────────────────────────────────────────
  const [tab,setTab] = useState("home");
  const [transactions,setTransactions] = useState(()=>loadData("valora_tx",generateSampleData()));
  const [bills,setBills] = useState(()=>loadData("valora_bills",generateSampleBills()));
  const [goals,setGoals] = useState(()=>loadData("valora_goals",generateSampleGoals()));
  const [sharedKey,setSharedKey]     = useState(()=>loadData("valora_key",null));
  const [userName,setUserName]       = useState(()=>loadData("valora_user",""));
  const [userEmail,setUserEmail]     = useState(()=>loadData("valora_email",""));
  const [isPremium,setIsPremium]     = useState(()=>loadData("valora_premium",false));
  const [trialStartDate]             = useState(()=>{ const s=loadData("valora_trial_start",null); if(!s){saveData("valora_trial_start",today());return today();}return s; });
  const [showAddSheet,setShowAddSheet]   = useState(false);
  const [addType,setAddType]             = useState("expense");
  const [showVoiceSheet,setShowVoiceSheet] = useState(false);
  const [showShared,setShowShared]       = useState(false);
  const [showNotifSheet,setShowNotifSheet] = useState(false);
  const [showSecuritySheet,setShowSecuritySheet] = useState(false);
  const [showPremium,setShowPremium]     = useState(false);
  const [showCheckout,setShowCheckout]   = useState(false);
  const [filterMonth,setFilterMonth]     = useState(new Date().getMonth());
  const [filterYear]                     = useState(new Date().getFullYear());
  const [notification,setNotification]   = useState(null);
  const [searchQuery,setSearchQuery]     = useState("");
  const [voiceText,setVoiceText]         = useState("");
  const [isListeningLegacy,setIsListeningLegacy] = useState(false);
  const [formValue,setFormValue]   = useState("");
  const [formCurrency,setFormCurrency] = useState("BRL");
  const [formCategory,setFormCategory] = useState("outros");
  const [formDesc,setFormDesc]     = useState("");
  const [formDate,setFormDate]     = useState(today());
  const [autoDetected,setAutoDetected] = useState(null);
  const [autoCatEnabled,setAutoCatEnabled] = useState(()=>loadData("valora_autocat",true));
  const { rates, lastUpdated, convert } = useExchangeRate();
  const [allUsers]                 = useState(()=>loadData("valora_all_users",generateSimulatedUsers()));
  const [showAgent,setShowAgent]   = useState(false);
  const [agentResponse,setAgentResponse] = useState("");
  const [showRelatorios,setShowRelatorios] = useState(false);
  const briefingDone = useRef(false);

  const isAdmin = userEmail.toLowerCase()===ADMIN_EMAIL;
  const trialDaysLeft = useMemo(()=>{ const diff=Math.floor((Date.now()-new Date(trialStartDate).getTime())/864e5); return Math.max(0,7-diff); },[trialStartDate]);
  const isBlocked = trialDaysLeft<=0 && !isPremium && !isAdmin;

  // ── Supabase: verificar sessão ao iniciar ──────────────────────────────────
  useEffect(()=>{
    supabase.auth.getSession().then(({ data: { session } })=>{
      if (session?.user) {
        setAuthUser(session.user);
        loadFromSupabase(session.user);
        setShowAuth(false);
      }
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session)=>{
      if (session?.user) {
        setAuthUser(session.user);
        setShowAuth(false);
        setAuthLoading(false);
      } else {
        setAuthUser(null);
        // Only show auth if initial loading is already done (avoid flicker on startup)
        setAuthLoading(prev => { if (!prev) setShowAuth(true); return false; });
      }
    });
    return ()=>subscription.unsubscribe();
  },[]); // eslint-disable-line

  // ── Carregar dados do Supabase ─────────────────────────────────────────────
  const loadFromSupabase = async (user) => {
    const uid = user.id;
    const key = loadData("valora_key", null);
    try {
      const [txRes, billsRes, goalsRes, profileRes] = await Promise.all([
        db.getTransactions(uid, key),
        db.getBills(uid, key),
        db.getGoals(uid, key),
        db.getProfile(uid),
      ]);
      if (txRes.data?.length)    setTransactions(txRes.data.map(mapTx));
      if (billsRes.data?.length) setBills(billsRes.data.map(mapBill));
      if (goalsRes.data?.length) setGoals(goalsRes.data.map(mapGoal));
      if (profileRes.data) {
        const p = profileRes.data;
        if (p.name)       setUserName(p.name);
        if (p.shared_key) setSharedKey(p.shared_key);
        if (p.is_premium) setIsPremium(true);
        setAutoCatEnabled(p.auto_cat_enabled ?? true);
        const email = user.email || "";
        setUserEmail(email);
        saveData("valora_email", email);
      }
    } catch(e) { console.warn("Supabase load error:", e); }
  };

  // Mappers: Supabase → app format
  const mapTx   = r => ({ id:r.id, type:r.type, value:r.value, valueInBRL:r.value_in_brl??r.value, currency:r.currency||"BRL", category:r.category, description:r.description, date:r.date, user:userName||"Você", timestamp:new Date(r.created_at).getTime() });
  const mapBill  = r => ({ id:r.id, name:r.name, amount:r.amount, dueDay:r.due_day, category:r.category||"outros", active:r.active, paid:r.paid });
  const mapGoal  = r => ({ id:r.id, name:r.name, target:r.target, current:r.current_amount, deadline:r.deadline, icon:r.icon||"🎯" });

  // ── Salvar no Supabase (quando autenticado) ────────────────────────────────
  const syncTx = useCallback(async (tx)=>{
    if (!authUser) return;
    // Insert novas transações não salvas (identificadas por falta de created_at)
    const newTx = tx.filter(t=>!t._synced);
    for (const t of newTx) {
      await db.addTransaction({ id:t.id, user_id:authUser.id, shared_key:sharedKey||null, type:t.type, value:t.value, value_in_brl:t.valueInBRL, currency:t.currency||"BRL", category:t.category, description:t.description, date:t.date });
    }
  },[authUser,sharedKey]);

  // ── Persistência local (fallback offline) ─────────────────────────────────
  useEffect(()=>{ saveData("valora_tx",transactions); },[transactions]);
  useEffect(()=>{ saveData("valora_bills",bills); },[bills]);
  useEffect(()=>{ saveData("valora_goals",goals); },[goals]);
  useEffect(()=>{ saveData("valora_key",sharedKey); },[sharedKey]);
  useEffect(()=>{ saveData("valora_user",userName); },[userName]);
  useEffect(()=>{ saveData("valora_email",userEmail); },[userEmail]);
  useEffect(()=>{ saveData("valora_premium",isPremium); },[isPremium]);
  useEffect(()=>{ saveData("valora_autocat",autoCatEnabled); },[autoCatEnabled]);

  // ── Realtime: modo casal ───────────────────────────────────────────────────
  useEffect(()=>{
    if (!authUser||!sharedKey) return;
    const channel = supabase.channel(`shared_${sharedKey}`)
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'transactions',filter:`shared_key=eq.${sharedKey}`},(payload)=>{
        setTransactions(prev=>{ if(prev.find(t=>t.id===payload.new.id)) return prev; return [mapTx(payload.new),...prev]; });
      })
      .on('postgres_changes',{event:'DELETE',schema:'public',table:'transactions',filter:`shared_key=eq.${sharedKey}`},(payload)=>{
        setTransactions(prev=>prev.filter(t=>t.id!==payload.old.id));
      })
      .subscribe();
    return ()=>supabase.removeChannel(channel);
  },[authUser,sharedKey]); // eslint-disable-line

  // ── Auth handlers ──────────────────────────────────────────────────────────
  const handleAuth = (user, name) => {
    setAuthUser(user); setShowAuth(false);
    setUserName(name); setUserEmail(user.email||"");
    saveData("valora_user",name); saveData("valora_email",user.email||"");
    loadFromSupabase(user);
  };

  const handleSignOut = async () => {
    await signOut(); setAuthUser(null); setShowAuth(true);
    setUserName(""); setUserEmail("");
  };

  // ── Todos os hooks ANTES de qualquer return condicional (Rules of Hooks) ────
  const notify = (msg, type="success") => { setNotification({msg,type}); setTimeout(()=>setNotification(null),3000); };

  const monthTx = useMemo(()=>transactions.filter(t=>{const d=new Date(t.date);return d.getMonth()===filterMonth&&d.getFullYear()===filterYear;}),[transactions,filterMonth,filterYear]);
  const totalIncome  = useMemo(()=>monthTx.filter(t=>t.type==="income").reduce((s,t)=>s+(t.valueInBRL??t.value),0),[monthTx]);
  const totalExpense = useMemo(()=>monthTx.filter(t=>t.type==="expense").reduce((s,t)=>s+(t.valueInBRL??t.value),0),[monthTx]);
  const balance = totalIncome-totalExpense;

  const catData = useMemo(()=>{
    const map={}; monthTx.filter(t=>t.type==="expense").forEach(t=>{map[t.category]=(map[t.category]||0)+(t.valueInBRL??t.value);});
    return Object.entries(map).map(([k,v])=>({name:CATEGORIES[k]?.label||k,value:v,color:CATEGORIES[k]?.color||"#94A3B8",key:k})).sort((a,b)=>b.value-a.value);
  },[monthTx]);

  const monthlyChart = useMemo(()=>MONTHS.map((m,i)=>{
    const mt=transactions.filter(t=>{const d=new Date(t.date);return d.getMonth()===i&&d.getFullYear()===filterYear;});
    return {name:m,receitas:mt.filter(t=>t.type==="income").reduce((s,t)=>s+(t.valueInBRL??t.value),0),despesas:mt.filter(t=>t.type==="expense").reduce((s,t)=>s+(t.valueInBRL??t.value),0)};
  }),[transactions,filterYear]);

  const agentContext = useMemo(()=>({transactions,bills,goals,userName,filterMonth,filterYear}),[transactions,bills,goals,userName,filterMonth,filterYear]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const voice = useValoraVoice({ onResult: useCallback((query)=>{
    const response = processValoraQuery(query, agentContext);
    setAgentResponse(response);
  },[agentContext]) });

  // Briefing proativo ao abrir
  useEffect(()=>{
    if (showAuth||briefingDone.current) return;
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
  },[showAuth]); // eslint-disable-line

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

  const addTransaction = async (tx) => {
    const id = uid();
    const currency = tx.currency || "BRL";
    const valueInBRL = currency === "BRL" ? tx.value : convert(tx.value, currency, "BRL");
    const newTx = {id,date:tx.date||today(),...tx,currency,valueInBRL,user:userName||"Você",timestamp:Date.now()};
    setTransactions(prev=>[newTx,...prev]);
    const displayVal = currency === "BRL" ? fmt(tx.value) : `${fmtCurrency(tx.value, currency)} (${fmt(valueInBRL)})`;
    notify(tx.type==="income"?`+${displayVal} registrado!`:`${displayVal} registrado!`,tx.type==="income"?"success":"expense");
    if (authUser) {
      db.addTransaction({ id, user_id:authUser.id, shared_key:sharedKey||null, type:tx.type, value:tx.value, value_in_brl:valueInBRL, currency, category:tx.category, description:tx.description||"", date:newTx.date }).catch(console.warn);
    }
  };
  const deleteTransaction = (id) => {
    setTransactions(prev=>prev.filter(t=>t.id!==id));
    if (authUser) db.deleteTransaction(id).catch(console.warn);
    notify("Transação removida","info");
  };

  const handleFormSubmit = () => {
    const val = parseFloat(formValue.replace(",","."));
    if (!val||val<=0) { notify("Valor inválido","error"); return; }
    addTransaction({type:addType,value:val,currency:formCurrency,category:formCategory,description:formDesc||CATEGORIES[formCategory]?.label,date:formDate});
    setFormValue("");setFormCurrency("BRL");setFormDesc("");setFormCategory("outros");setFormDate(today());setAutoDetected(null);setShowAddSheet(false);
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

  // handleCreateShared: agora salva no Supabase também
  const handleCreateSharedSupabase = async () => {
    const code=`VALORA-${uid().toUpperCase()}`;
    if (authUser) await db.upsertProfile({ id: authUser.id, shared_key: code });
    setSharedKey(code);
    notify("Conta compartilhada criada! Compartilhe o código.");
  };

  const handleJoinSharedSupabase = async (code) => {
    if (!code.startsWith("VALORA-")) return;
    if (authUser) {
      await db.upsertProfile({ id: authUser.id, shared_key: code });
      const txRes = await db.getTransactions(authUser.id, code);
      if (txRes.data?.length) setTransactions(txRes.data.map(mapTx));
    }
    setSharedKey(code);
    notify("Conectado ao modo casal! 🎉");
  };
  // ── Render condicional (sem early returns — respeita Rules of Hooks) ─────────
  if (authLoading) return (
    <div style={{background:T.bg,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{textAlign:"center"}}>
        <div style={{fontSize:40,marginBottom:12}}>💚</div>
        <p style={{color:T.textMuted,fontFamily:T.font,fontSize:14}}>Carregando...</p>
      </div>
    </div>
  );

  if (showAuth) return <AuthScreen onAuth={handleAuth}/>;

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
      <div style={{position:"fixed",top:"-30%",left:"-20%",width:"140%",height:"60%",background:`radial-gradient(ellipse at 20% 40%, ${isAdmin?T.adminGlow:T.accentGlow} 0%, transparent 55%), radial-gradient(ellipse at 80% 60%, ${T.cyanGlow} 0%, transparent 50%)`,pointerEvents:"none",zIndex:0,opacity:0.4}} />

      {notification && (
        <div style={{position:"fixed",top:16,left:16,right:16,zIndex:3000,padding:"14px 16px",borderRadius:T.radiusSm,background:notification.type==="success"?T.income:notification.type==="expense"?T.expense:notification.type==="error"?"#EF4444":T.accent,color:"#fff",fontFamily:T.font,fontWeight:600,fontSize:14,animation:"slideDown 0.3s ease",display:"flex",alignItems:"center",gap:8,boxShadow:"0 8px 24px rgba(0,0,0,0.4)"}}>
          <Check size={16}/>{notification.msg}
        </div>
      )}

      <div style={{position:"relative",zIndex:1}}>
        {tab==="home"         && <HomeScreen balance={balance} totalIncome={totalIncome} totalExpense={totalExpense} catData={catData} monthlyChart={monthlyChart} transactions={monthTx} filterMonth={filterMonth} setFilterMonth={setFilterMonth} userName={userName} sharedKey={sharedKey} isPremium={isPremium} isAdmin={isAdmin} onShowPremium={()=>setShowPremium(true)} onShowShared={()=>setShowShared(true)} onDelete={deleteTransaction} onOpenAgent={()=>{setAgentResponse("");setShowAgent(true);}} rates={rates} lastUpdated={lastUpdated} onShowRelatorios={()=>setShowRelatorios(true)} />}
        {tab==="transactions" && <TransactionsScreen transactions={monthTx} filterMonth={filterMonth} setFilterMonth={setFilterMonth} searchQuery={searchQuery} setSearchQuery={setSearchQuery} onDelete={deleteTransaction} />}
        {tab==="planejar"     && <PlanejamentoScreen bills={bills} setBills={setBills} goals={goals} setGoals={setGoals} notify={notify} />}
        {tab==="settings"     && <SettingsScreen userName={userName} setUserName={n=>{setUserName(n);saveData("valora_user",n);}} userEmail={userEmail} sharedKey={sharedKey} isPremium={isPremium} isAdmin={isAdmin} onShowPremium={()=>setShowPremium(true)} onShowShared={()=>setShowShared(true)} onAdminTab={()=>setTab("admin")} autoCatEnabled={autoCatEnabled} setAutoCatEnabled={setAutoCatEnabled} onSignOut={handleSignOut} onShowNotif={()=>setShowNotifSheet(true)} onShowSecurity={()=>setShowSecuritySheet(true)} transactions={transactions} bills={bills} goals={goals} />}
        {tab==="admin" && isAdmin && <AdminPanel allUsers={allUsers} />}
      </div>

      {showRelatorios && <RelatoriosScreen transactions={transactions} onClose={()=>setShowRelatorios(false)}/>}
      <AgentFAB onClick={()=>setShowAgent(true)} speaking={voice.speaking} listening={voice.listening} />
      <div onClick={()=>setShowAddSheet(true)} style={{position:"fixed",bottom:72,left:"50%",transform:"translateX(-50%)",zIndex:950,width:56,height:56,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",background:T.grad,cursor:"pointer",boxShadow:`0 4px 24px ${T.accentGlow}`,border:`3px solid ${T.bg}`}}><Plus size={28} color="#fff"/></div>

      <TabBar active={tab} onChange={setTab} isAdmin={isAdmin} />

      <JotaOverlay open={showAgent} onClose={()=>setShowAgent(false)}
        listening={voice.listening} speaking={voice.speaking} transcript={voice.transcript}
        agentContext={agentContext} onListen={voice.listen} onStop={voice.stop} supported={voice.supported} />

      {/* ADD TRANSACTION */}
      <BottomSheet open={showAddSheet} onClose={()=>setShowAddSheet(false)} title="Nova Transação">
        <div style={{display:"flex",gap:8,marginBottom:16}}>
          {[{t:"expense",l:"Despesa",c:T.expense},{t:"income",l:"Receita",c:T.income}].map(x=>(
            <div key={x.t} onClick={()=>setAddType(x.t)} style={{flex:1,padding:"10px",borderRadius:T.radiusSm,textAlign:"center",background:addType===x.t?x.c+"20":T.surfaceAlt,border:`2px solid ${addType===x.t?x.c:T.border}`,color:addType===x.t?x.c:T.textMuted,fontFamily:T.font,fontWeight:600,fontSize:14,cursor:"pointer"}}>{x.l}</div>
          ))}
        </div>
        <CurrencySelector value={formCurrency} onChange={setFormCurrency} />
        <Input label={`Valor (${formCurrency})`} value={formValue} onChange={setFormValue} type="number" placeholder="0,00" icon={<DollarSign size={16}/>} />
        {formCurrency !== "BRL" && formValue && parseFloat(formValue) > 0 && (
          <div style={{background:T.accentSoft,border:`1px solid ${T.accent}30`,borderRadius:T.radiusXs,padding:"8px 12px",marginBottom:12,fontSize:12,color:T.accent,fontFamily:T.font}}>
            ≈ {fmt(convert(parseFloat(formValue.replace(",",".")), formCurrency, "BRL"))} em reais
          </div>
        )}
        <Input label="Descrição" value={formDesc} onChange={v=>{ setFormDesc(v); if(autoCatEnabled){ const cat=autoCategorize(v); if(cat){setFormCategory(cat);setAutoDetected(cat);}else setAutoDetected(null); }}} placeholder="Ex: Almoço no restaurante" icon={<FileText size={16}/>} />
        {autoDetected && <div style={{display:"flex",alignItems:"center",gap:6,padding:"6px 10px",marginBottom:8,borderRadius:T.radiusXs,background:T.accentSoft,border:`1px solid ${T.accent}30`,fontSize:12,color:T.accent}}><span style={{fontSize:14}}>{CATEGORIES[autoDetected]?.icon}</span>Detectado: <strong>{CATEGORIES[autoDetected]?.label}</strong></div>}
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
              <Btn variant="accent" onClick={handleCreateSharedSupabase} icon={<UserPlus size={16}/>}>Criar Conta Compartilhada</Btn>
              <div style={{margin:"16px 0",color:T.textDim,fontSize:13}}>ou</div>
              <Input placeholder="Cole a chave aqui (VALORA-...)" value="" onChange={v=>{if(v.length>8)handleJoinSharedSupabase(v);}} />
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

      {/* NOTIFICAÇÕES */}
      <NotifSheet open={showNotifSheet} onClose={()=>setShowNotifSheet(false)} bills={bills} />

      {/* SEGURANÇA */}
      <SecuritySheet open={showSecuritySheet} onClose={()=>setShowSecuritySheet(false)} userEmail={userEmail} />
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
function AdminPanel({ allUsers: _unused }) {
  const [adminTab,setAdminTab]=useState("overview");
  const [users,setUsers]=useState([]);
  const [loadingUsers,setLoadingUsers]=useState(true);
  React.useEffect(()=>{
    supabase.from("profiles").select("*").then(({data,error})=>{
      if(!error&&data) setUsers(data);
      setLoadingUsers(false);
    });
  },[]);
  const allUsers = users;
  const totalUsers=allUsers.length, premiumUsers=allUsers.filter(u=>u.premium).length;
  const monthlyRevenue=premiumUsers*14.90;
  const activeToday=allUsers.filter(u=>u.last_active===today()||u.lastActive===today()).length;
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
      {adminTab==="users"&&(loadingUsers?<p style={{textAlign:"center",color:T.textDim,padding:16}}>Carregando...</p>:allUsers.length===0?<p style={{textAlign:"center",color:T.textDim,padding:16}}>Nenhum usuário cadastrado ainda</p>:allUsers.map((u,i)=>{
        const displayName=u.name||u.full_name||u.email||"Usuário";
        const isPrem=u.premium||u.is_premium||false;
        return (
        <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"12px",marginBottom:6,background:T.card,borderRadius:T.radiusSm,border:`1px solid ${T.border}`}}>
          <div style={{width:38,height:38,borderRadius:"50%",background:isPrem?`linear-gradient(135deg,${T.gold},#F59E0B)`:`linear-gradient(135deg,${T.accent},#6366F1)`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:T.fontDisplay,fontSize:14,fontWeight:700,color:isPrem?"#000":"#fff",flexShrink:0}}>{displayName[0].toUpperCase()}</div>
          <div style={{flex:1,minWidth:0}}><p style={{fontSize:13,fontWeight:600,color:T.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{displayName}</p><p style={{fontSize:11,color:T.textDim}}>{u.email||""}</p></div>
          <p style={{fontSize:10,color:isPrem?T.gold:T.textDim,fontWeight:600,flexShrink:0}}>{isPrem?"PREMIUM":"FREE"}</p>
        </div>);
      }))}
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

// ── AUTH SCREEN (Supabase) ─────────────────────────────────────────────────────
function AuthScreen({ onAuth }) {
  const [mode,setMode]       = useState("welcome"); // welcome | login | signup
  const [step,setStep]       = useState(0);
  const [name,setName]       = useState("");
  const [email,setEmail]     = useState("");
  const [password,setPass]   = useState("");
  const [loading,setLoading] = useState(false);
  const [error,setError]     = useState("");

  const slides=[
    {emoji:"💚",title:"Bem-vindo ao Valora",desc:"O app que ajuda você a valorizar, controlar e organizar seu dinheiro."},
    {emoji:"🤖",title:"Seu Assistente de Voz",desc:"Pergunte à Valora IA: \"quanto gastei esse mês?\" e ela responde por voz."},
    {emoji:"🎯",title:"Metas e Contas",desc:"Cadastre contas fixas e metas. Nunca mais esqueça um vencimento."},
  ];

  const handleSignUp = async () => {
    if (!name.trim()||!email.trim()||!password.trim()) return setError("Preencha todos os campos.");
    if (password.length<6) return setError("Senha mínima: 6 caracteres.");
    setLoading(true); setError("");
    const { data, error: e } = await signUp(email.trim(), password, name.trim());
    setLoading(false);
    if (e) return setError(e.message);
    // If no session, email confirmation is required
    if (!data?.session) {
      setError("Conta criada! Verifique seu e-mail para confirmar antes de entrar.");
      return;
    }
    if (data?.user) onAuth(data.user, name.trim());
  };

  const handleSignIn = async () => {
    if (!email.trim()||!password.trim()) return setError("Preencha e-mail e senha.");
    setLoading(true); setError("");
    const { data, error: e } = await signIn(email.trim(), password);
    setLoading(false);
    if (e) {
      if (e.message?.includes('Email not confirmed')) {
        return setError("Confirme seu e-mail primeiro. Verifique sua caixa de entrada.");
      }
      return setError("E-mail ou senha incorretos.");
    }
    if (data?.user) onAuth(data.user, data.user.user_metadata?.name || email.split("@")[0]);
  };

  if (mode==="welcome") return (
    <div style={{fontFamily:T.font,background:T.bg,color:T.text,minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"40px 24px",maxWidth:430,margin:"0 auto"}}>
      <style>{globalCSS}</style>
      {step<3?(
        <div style={{textAlign:"center",animation:"fadeUp 0.5s ease"}}>
          <div style={{fontSize:64,marginBottom:24}}>{slides[step].emoji}</div>
          <h1 style={{fontFamily:T.fontDisplay,fontSize:28,fontWeight:800,marginBottom:12,lineHeight:1.2}}>{slides[step].title}</h1>
          <p style={{color:T.textMuted,fontSize:15,lineHeight:1.6,marginBottom:40,maxWidth:300,margin:"0 auto 40px"}}>{slides[step].desc}</p>
          <div style={{display:"flex",gap:8,justifyContent:"center",marginBottom:32}}>{[0,1,2].map(i=>(<div key={i} style={{width:step===i?24:8,height:8,borderRadius:4,background:step===i?T.income:T.surfaceAlt,transition:"all 0.3s"}}/>))}</div>
          <Btn variant="primary" onClick={()=>setStep(s=>s+1)} style={{maxWidth:280,margin:"0 auto"}}>{step===2?"Começar":"Próximo"}</Btn>
        </div>
      ):(
        <div style={{textAlign:"center",animation:"fadeUp 0.5s ease",width:"100%",maxWidth:320}}>
          <div style={{fontSize:48,marginBottom:16}}>💚</div>
          <h2 style={{fontFamily:T.fontDisplay,fontSize:26,fontWeight:800,marginBottom:8}}>Valora</h2>
          <p style={{color:T.textMuted,fontSize:14,marginBottom:32}}>Seu controle financeiro inteligente</p>
          <Btn variant="primary" onClick={()=>setMode("signup")} style={{marginBottom:12}}>Criar conta grátis</Btn>
          <Btn variant="ghost" onClick={()=>setMode("login")}>Já tenho conta — Entrar</Btn>
        </div>
      )}
    </div>
  );

  return (
    <div style={{fontFamily:T.font,background:T.bg,color:T.text,minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"24px",maxWidth:430,margin:"0 auto"}}>
      <style>{globalCSS}</style>
      <div style={{width:"100%",maxWidth:340,animation:"fadeUp 0.4s ease"}}>
        <button onClick={()=>{setMode("welcome");setStep(3);setError("");}} style={{background:"none",border:"none",color:T.textMuted,cursor:"pointer",fontSize:13,marginBottom:24,padding:0}}>← Voltar</button>
        <div style={{fontSize:40,marginBottom:12,textAlign:"center"}}>{mode==="signup"?"👤":"🔑"}</div>
        <h2 style={{fontFamily:T.fontDisplay,fontSize:24,fontWeight:700,marginBottom:4,textAlign:"center"}}>{mode==="signup"?"Criar conta":"Entrar"}</h2>
        <p style={{color:T.textMuted,fontSize:13,marginBottom:28,textAlign:"center"}}>{mode==="signup"?"Dados salvos na nuvem com segurança":"Bem-vindo de volta!"}</p>

        {mode==="signup"&&<Input placeholder="Seu nome" value={name} onChange={setName}/>}
        <Input placeholder="E-mail" value={email} onChange={setEmail} type="email"/>
        <Input placeholder="Senha (mín. 6 caracteres)" value={password} onChange={setPass} type="password"/>

        {email.toLowerCase()===ADMIN_EMAIL&&(
          <div style={{display:"flex",alignItems:"center",gap:6,padding:"8px 12px",background:T.adminSoft,borderRadius:T.radiusXs,marginBottom:12,border:`1px solid ${T.admin}30`}}>
            <ShieldCheck size={14} color={T.admin}/>
            <span style={{fontSize:12,color:T.admin,fontWeight:600}}>Conta administrador</span>
          </div>
        )}
        {error&&<p style={{color:T.expense,fontSize:13,marginBottom:12,textAlign:"center"}}>{error}</p>}

        <Btn variant="primary" onClick={mode==="signup"?handleSignUp:handleSignIn} disabled={loading} style={{marginTop:4}}>
          {loading?"Aguarde...":(mode==="signup"?"Criar conta":"Entrar")}
        </Btn>
        <p style={{textAlign:"center",marginTop:16,fontSize:13,color:T.textMuted}}>
          {mode==="signup"?"Já tem conta? ":"Não tem conta? "}
          <span onClick={()=>{setMode(mode==="signup"?"login":"signup");setError("");}} style={{color:T.cyan,cursor:"pointer",fontWeight:600}}>
            {mode==="signup"?"Entrar":"Criar conta"}
          </span>
        </p>
      </div>
    </div>
  );
}


// ── Notifications BottomSheet ─────────────────────────────────────────────────
function NotifSheet({ open, onClose, bills }) {
  const [pushEnabled, setPushEnabled] = React.useState(true);
  const overdue = (bills||[]).filter(b=>b.active&&!b.paid);
  return (
    <BottomSheet open={open} onClose={onClose} title="Notificações">
      <div style={{padding:"4px 0"}}>
        <div style={{display:"flex",alignItems:"center",gap:12,padding:"12px 0",borderBottom:`1px solid ${T.border}`,marginBottom:12}}>
          <Bell size={18} color={T.gold}/>
          <div style={{flex:1}}><p style={{fontSize:14,fontWeight:600}}>Notificações push</p><p style={{fontSize:12,color:T.textDim}}>Alertas de vencimentos e gastos</p></div>
          <div onClick={()=>setPushEnabled(v=>!v)} style={{width:44,height:24,borderRadius:12,padding:2,cursor:"pointer",background:pushEnabled?T.accent:T.surfaceAlt,transition:"background 0.2s",flexShrink:0}}>
            <div style={{width:20,height:20,borderRadius:10,background:"#fff",transform:pushEnabled?"translateX(20px)":"translateX(0)",transition:"transform 0.2s"}}/>
          </div>
        </div>
        <p style={{fontSize:12,fontWeight:600,color:T.textMuted,marginBottom:8,textTransform:"uppercase",letterSpacing:0.5}}>Alertas recentes</p>
        {overdue.length===0
          ? <p style={{fontSize:13,color:T.textDim,textAlign:"center",padding:"16px 0"}}>Nenhuma conta pendente</p>
          : overdue.map((b,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:`1px solid ${T.border}`}}>
                <Bell size={14} color={T.gold}/>
                <div style={{flex:1}}><p style={{fontSize:13,fontWeight:600}}>{b.name}</p><p style={{fontSize:11,color:T.textDim}}>Vence dia {b.dueDay} • R$ {b.amount?.toFixed(2)}</p></div>
              </div>
            ))
        }
      </div>
    </BottomSheet>
  );
}

// ── Security BottomSheet ──────────────────────────────────────────────────────
function SecuritySheet({ open, onClose, userEmail }) {
  const [newPass, setNewPass] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [msg, setMsg] = React.useState("");

  const handleChangePass = async () => {
    if (!newPass || newPass.length < 6) { setMsg("Senha deve ter ao menos 6 caracteres."); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPass });
    setLoading(false);
    if (error) setMsg("Erro: " + error.message);
    else { setMsg("Senha alterada com sucesso!"); setNewPass(""); }
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Segurança">
      <div style={{padding:"4px 0"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,padding:"12px",background:T.surfaceAlt,borderRadius:T.radiusSm,marginBottom:16}}>
          <Shield size={16} color={"#3B82F6"}/>
          <div><p style={{fontSize:12,color:T.textDim}}>Conta</p><p style={{fontSize:14,fontWeight:600}}>{userEmail||"—"}</p></div>
        </div>
        <p style={{fontSize:13,fontWeight:600,marginBottom:8}}>Alterar senha</p>
        <Input placeholder="Nova senha (mín. 6 caracteres)" value={newPass} onChange={v=>setNewPass(v)} />
        {msg&&<p style={{fontSize:12,color:msg.startsWith("Erro")?T.expense:T.income,margin:"8px 0"}}>{msg}</p>}
        <Btn variant="accent" onClick={handleChangePass} style={{marginTop:12}} disabled={loading}>
          {loading?"Salvando...":"Alterar Senha"}
        </Btn>
      </div>
    </BottomSheet>
  );
}

// ── Shared join input helper (local state avoids stale closure) ───────────────
function JoinSharedInput({ onJoin }) {
  const [code, setCode] = React.useState("");
  return (
    <div style={{display:"flex",gap:8,flexDirection:"column"}}>
      <Input placeholder="Cole a chave aqui (VALORA-...)" value={code} onChange={v=>setCode(v)} />
      <Btn variant="accent" onClick={()=>{if(code.trim())onJoin(code.trim());}}>Entrar na conta compartilhada</Btn>
    </div>
  );
}

// ── HOME ──────────────────────────────────────────────────────────────────────
function HomeScreen({ balance, totalIncome, totalExpense, catData, monthlyChart, transactions, filterMonth, setFilterMonth, userName, sharedKey, isPremium, isAdmin, onShowPremium, onShowShared, onDelete, onOpenAgent, rates, lastUpdated, onShowRelatorios }) {
  return (
    <div style={{padding:"0 16px 20px"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 0 12px"}}>
        <div><p style={{fontSize:13,color:T.textMuted,fontWeight:500}}>Olá, {userName||"Usuário"} {isAdmin?"🛡️":"👋"}</p><h1 style={{fontFamily:T.fontDisplay,fontSize:20,fontWeight:700,marginTop:2}}>Valora</h1></div>
        <div style={{display:"flex",gap:8}}>
          {sharedKey&&<div onClick={onShowShared} style={{width:36,height:36,borderRadius:"50%",background:T.accentSoft,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}><Users size={16} color={T.accent}/></div>}
          {!isPremium&&<div onClick={onShowPremium} style={{width:36,height:36,borderRadius:"50%",background:T.goldSoft,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}><Crown size={16} color={T.gold}/></div>}
        </div>
      </div>

      <ExchangeRateBar rates={rates} lastUpdated={lastUpdated} />

      {/* Agent Card */}
      <div className="anim-item" onClick={onOpenAgent} style={{display:"flex",alignItems:"center",gap:12,padding:"14px 16px",marginBottom:16,background:`linear-gradient(135deg,${T.agentSoft},rgba(34,211,238,0.04))`,borderRadius:T.radiusSm,border:`1px solid ${T.agent}30`,cursor:"pointer"}}>
        <div style={{width:38,height:38,borderRadius:"50%",background:`linear-gradient(135deg,${T.agent},#0891B2)`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,boxShadow:`0 0 12px ${T.agentGlow}`}}><span style={{fontSize:20}}>🤖</span></div>
        <div style={{flex:1}}><p style={{fontSize:13,fontWeight:700,color:T.agent}}>Valora IA</p><p style={{fontSize:12,color:T.textDim,marginTop:1}}>Pergunte sobre seus gastos por voz ou texto</p></div>
        <Mic size={16} color={T.agent}/>
      </div>

      <div className="anim-item" style={{animationDelay:"0.05s"}}>
        <GlassCard style={{background:T.gradCard,padding:"20px",marginBottom:16}}>
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

      {sharedKey && <CoupleView transactions={transactions} sharedKey={sharedKey} userName={userName}/>}

      <div className="anim-item" style={{animationDelay:"0.25s"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
          <h3 style={{fontFamily:T.fontDisplay,fontSize:14,fontWeight:600,color:T.textMuted}}>Últimas Transações</h3>
          <div onClick={onShowRelatorios} style={{display:"flex",alignItems:"center",gap:5,fontSize:12,color:T.accent,cursor:"pointer",fontWeight:600,padding:"4px 10px",borderRadius:20,background:T.accentSoft}}>
            <TrendingUp size={12}/>Relatórios
          </div>
        </div>
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
function SettingsScreen({ userName, setUserName, userEmail, sharedKey, isPremium, isAdmin, onShowPremium, onShowShared, onAdminTab, autoCatEnabled, setAutoCatEnabled, onSignOut, onShowNotif, onShowSecurity, transactions, bills, goals }) {
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
      {/* Auto-categorização toggle — Feature 3 GuiaBolso */}
      <GlassCard style={{marginBottom:8,padding:"14px 16px"}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:36,height:36,borderRadius:T.radiusXs,background:T.cyanSoft,display:"flex",alignItems:"center",justifyContent:"center",color:T.cyan}}><Zap size={18}/></div>
          <div style={{flex:1}}><p style={{fontSize:14,fontWeight:600}}>Auto-categorização</p><p style={{fontSize:12,color:T.textDim}}>Detecta categoria pela descrição</p></div>
          <div onClick={()=>setAutoCatEnabled(v=>!v)} style={{width:44,height:24,borderRadius:12,padding:2,cursor:"pointer",background:autoCatEnabled?T.cyan:T.surfaceAlt,transition:"background 0.2s",flexShrink:0}}><div style={{width:20,height:20,borderRadius:10,background:"#fff",transform:autoCatEnabled?"translateX(20px)":"translateX(0)",transition:"transform 0.2s"}}/></div>
        </div>
      </GlassCard>
      {[
        {icon:<Users size={18}/>,label:"Conta Compartilhada",desc:sharedKey?"Conectada":"Não configurada",color:T.accent,onClick:onShowShared},
        {icon:<Crown size={18}/>,label:"Valora Premium",desc:isPremium?"Ativo ✓":"R$ 14,90/mês",color:T.gold,onClick:onShowPremium},
        {icon:<Shield size={18}/>,label:"Segurança",desc:"Biometria e criptografia",color:"#3B82F6",onClick:onShowSecurity},
        {icon:<Bell size={18}/>,label:"Notificações",desc:"Alertas de gastos e vencimentos",color:"#F59E0B",onClick:onShowNotif},
        {icon:<Download size={18}/>,label:"Backup",desc:"Dados locais",color:"#10B981",onClick:()=>{
          const data={transactions,bills,goals,exportedAt:new Date().toISOString()};
          const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
          const url=URL.createObjectURL(blob);
          const a=document.createElement("a");
          a.href=url;a.download=`valora-backup-${new Date().toISOString().split("T")[0]}.json`;
          document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);
        }},
      ].map((item,i)=>(
        <GlassCard key={i} onClick={item.onClick} style={{marginBottom:8,cursor:item.onClick?"pointer":"default",padding:"14px 16px"}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:36,height:36,borderRadius:T.radiusXs,background:item.color+"15",display:"flex",alignItems:"center",justifyContent:"center",color:item.color}}>{item.icon}</div>
            <div style={{flex:1}}><p style={{fontSize:14,fontWeight:600}}>{item.label}</p><p style={{fontSize:12,color:T.textDim}}>{item.desc}</p></div>
            {item.onClick?<ChevronRight size={16} color={T.textDim}/>:null}
          </div>
        </GlassCard>
      ))}
      {onSignOut&&(
        <GlassCard onClick={onSignOut} style={{marginBottom:8,padding:"14px 16px",cursor:"pointer",border:`1px solid ${T.expense}20`}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:36,height:36,borderRadius:T.radiusXs,background:T.expenseSoft,display:"flex",alignItems:"center",justifyContent:"center",color:T.expense}}><X size={18}/></div>
            <div style={{flex:1}}><p style={{fontSize:14,fontWeight:600,color:T.expense}}>Sair da conta</p><p style={{fontSize:12,color:T.textDim}}>Deslogar do Valora</p></div>
          </div>
        </GlassCard>
      )}
      <div style={{textAlign:"center",padding:"24px 0",color:T.textDim}}>
        <p style={{fontSize:12,fontFamily:T.fontDisplay,fontWeight:500}}>Valora v2.0 • Powered by AI 🤖</p>
        <p style={{fontSize:11,marginTop:4}}>Feito com 💚 para suas finanças</p>
      </div>
    </div>
  );
}


// ══════════════════════════════════════════════════════════════════════════════
// FEATURE 2 — MOBILLS: RELATÓRIOS AVANÇADOS
// ══════════════════════════════════════════════════════════════════════════════
function RelatoriosScreen({ transactions, onClose }) {
  const now = new Date();
  const [selMonth, setSelMonth] = useState(now.getMonth());
  const [selYear]  = useState(now.getFullYear());

  const prevMonth = (selMonth - 1 + 12) % 12;
  const prevYear  = selMonth === 0 ? selYear - 1 : selYear;

  const monthTx = useMemo(() =>
    transactions.filter(t => { const d = new Date(t.date); return d.getMonth()===selMonth && d.getFullYear()===selYear; }),
    [transactions, selMonth, selYear]);

  const prevTx = useMemo(() =>
    transactions.filter(t => { const d = new Date(t.date); return d.getMonth()===prevMonth && d.getFullYear()===prevYear; }),
    [transactions, prevMonth, prevYear]);

  const totalInc  = monthTx.filter(t => t.type==="income").reduce((s,t)  => s+(t.valueInBRL??t.value), 0);
  const totalExp  = monthTx.filter(t => t.type==="expense").reduce((s,t) => s+(t.valueInBRL??t.value), 0);
  const prevExp   = prevTx.filter(t  => t.type==="expense").reduce((s,t) => s+(t.valueInBRL??t.value), 0);
  const balance   = totalInc - totalExp;
  const savRate   = totalInc > 0 ? ((totalInc - totalExp) / totalInc * 100) : 0;
  const expDiff   = prevExp  > 0 ? ((totalExp - prevExp) / prevExp * 100) : 0;

  const catData = useMemo(() => {
    const map = {};
    monthTx.filter(t => t.type==="expense").forEach(t => { map[t.category] = (map[t.category]||0) + (t.valueInBRL??t.value); });
    return Object.entries(map).map(([k,v]) => ({ name: CATEGORIES[k]?.label||k, value: v, color: CATEGORIES[k]?.color||"#94A3B8", key: k }))
      .sort((a,b) => b.value - a.value);
  }, [monthTx]);

  const yearData = useMemo(() => MONTHS.map((m,i) => {
    const mt = transactions.filter(t => { const d = new Date(t.date); return d.getMonth()===i && d.getFullYear()===selYear; });
    return { name: m, receitas: mt.filter(t=>t.type==="income").reduce((s,t)=>s+(t.valueInBRL??t.value),0), despesas: mt.filter(t=>t.type==="expense").reduce((s,t)=>s+(t.valueInBRL??t.value),0) };
  }), [transactions, selYear]);

  const exportCSV = () => {
    const rows = [["Data","Tipo","Descrição","Categoria","Valor BRL","Moeda","Valor Original"]];
    monthTx.forEach(t => rows.push([t.date, t.type==="income"?"Receita":"Despesa", t.description, CATEGORIES[t.category]?.label||t.category, (t.valueInBRL??t.value).toFixed(2), t.currency||"BRL", t.value.toFixed(2)]));
    const csv = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob(["﻿"+csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a"); a.href = url; a.download = `valora-${MONTHS[selMonth]}-${selYear}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const maxCat = catData[0]?.value || 1;

  return (
    <div style={{position:"fixed",inset:0,zIndex:2000,background:T.bg,overflowY:"auto",fontFamily:T.font}}>
      <style>{globalCSS}</style>
      <div style={{maxWidth:430,margin:"0 auto",padding:"0 16px 80px"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 0 12px"}}>
          <h1 style={{fontFamily:T.fontDisplay,fontSize:22,fontWeight:700}}>Relatórios</h1>
          <div style={{display:"flex",gap:8}}>
            <div onClick={exportCSV} style={{display:"flex",alignItems:"center",gap:6,padding:"8px 14px",borderRadius:T.radiusSm,background:T.accentSoft,color:T.accent,cursor:"pointer",fontSize:13,fontWeight:600,border:`1px solid ${T.accent}30`}}><Download size={14}/>CSV</div>
            <div onClick={onClose} style={{width:36,height:36,borderRadius:"50%",background:T.surfaceAlt,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}><X size={18} color={T.textMuted}/></div>
          </div>
        </div>

        <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:16,marginBottom:16}}>
          <ChevronLeft size={20} color={T.textMuted} style={{cursor:"pointer"}} onClick={()=>setSelMonth(p=>(p-1+12)%12)}/>
          <span style={{fontFamily:T.fontDisplay,fontSize:16,fontWeight:600,minWidth:120,textAlign:"center"}}>{MONTHS_FULL[selMonth]} {selYear}</span>
          <ChevronRight size={20} color={T.textMuted} style={{cursor:"pointer"}} onClick={()=>setSelMonth(p=>(p+1)%12)}/>
        </div>

        {/* Summary Cards */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
          {[
            {label:"Receitas",   value:fmt(totalInc), color:T.income,  bg:T.incomeSoft},
            {label:"Despesas",   value:fmt(totalExp), color:T.expense, bg:T.expenseSoft},
            {label:"Saldo",      value:fmt(balance),  color:balance>=0?T.income:T.expense, bg:balance>=0?T.incomeSoft:T.expenseSoft},
            {label:"Poupança",   value:savRate.toFixed(0)+"%", color:T.accent, bg:T.accentSoft},
          ].map((c,i)=>(
            <div key={i} style={{background:c.bg,borderRadius:T.radiusSm,padding:"12px 14px"}}>
              <p style={{fontSize:11,color:c.color,fontWeight:600,marginBottom:4}}>{c.label}</p>
              <p style={{fontFamily:T.fontDisplay,fontSize:18,fontWeight:700,color:c.color}}>{c.value}</p>
            </div>
          ))}
        </div>

        {/* Comparação mês anterior */}
        {prevExp > 0 && (
          <GlassCard style={{marginBottom:14,padding:"12px 16px",display:"flex",alignItems:"center",gap:12}}>
            {expDiff > 0
              ? <ArrowUpRight size={20} color={T.expense}/>
              : <ArrowDownRight size={20} color={T.income}/>}
            <div style={{flex:1}}>
              <p style={{fontSize:13,color:T.text,fontWeight:500}}>
                {expDiff > 0
                  ? `${expDiff.toFixed(0)}% mais gastos que ${MONTHS_FULL[prevMonth]}`
                  : `${Math.abs(expDiff).toFixed(0)}% menos gastos que ${MONTHS_FULL[prevMonth]}`}
              </p>
              <p style={{fontSize:11,color:T.textDim,marginTop:2}}>{MONTHS_FULL[prevMonth]}: {fmt(prevExp)} → {MONTHS_FULL[selMonth]}: {fmt(totalExp)}</p>
            </div>
          </GlassCard>
        )}

        {/* Categorias com barras */}
        {catData.length > 0 && (
          <GlassCard style={{marginBottom:14,padding:"16px"}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
              <div style={{width:100,height:100,flexShrink:0}}>
                <ResponsiveContainer>
                  <PieChart><Pie data={catData} dataKey="value" cx="50%" cy="50%" innerRadius={26} outerRadius={46} paddingAngle={3} strokeWidth={0}>
                    {catData.map((c,i)=><Cell key={i} fill={c.color}/>)}
                  </Pie></PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{flex:1}}>
                {catData.slice(0,5).map((c,i)=>(
                  <div key={i} style={{marginBottom:8}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                      <span style={{fontSize:12,color:T.textMuted}}>{c.name}</span>
                      <span style={{fontSize:12,fontWeight:600,color:T.text}}>{fmt(c.value)}</span>
                    </div>
                    <div style={{height:4,background:T.surfaceAlt,borderRadius:2,overflow:"hidden"}}>
                      <div style={{height:"100%",width:`${(c.value/maxCat*100).toFixed(0)}%`,background:c.color,borderRadius:2,transition:"width 0.6s ease"}}/>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </GlassCard>
        )}

        {/* Evolução anual */}
        <GlassCard style={{marginBottom:14,padding:"16px"}}>
          <h3 style={{fontFamily:T.fontDisplay,fontSize:13,fontWeight:600,marginBottom:12,color:T.textMuted}}>Evolução Anual {selYear}</h3>
          <div style={{height:180}}>
            <ResponsiveContainer>
              <AreaChart data={yearData}>
                <defs>
                  <linearGradient id="gInc" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={T.income} stopOpacity={0.3}/><stop offset="95%" stopColor={T.income} stopOpacity={0}/></linearGradient>
                  <linearGradient id="gExp" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={T.expense} stopOpacity={0.3}/><stop offset="95%" stopColor={T.expense} stopOpacity={0}/></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={T.border}/>
                <XAxis dataKey="name" tick={{fill:T.textDim,fontSize:9}} axisLine={false} tickLine={false}/>
                <YAxis hide/>
                <Tooltip contentStyle={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:8,fontSize:11}} formatter={v=>fmt(v)}/>
                <Area type="monotone" dataKey="receitas" stroke={T.income} fill="url(#gInc)" strokeWidth={2}/>
                <Area type="monotone" dataKey="despesas" stroke={T.expense} fill="url(#gExp)" strokeWidth={2}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// FEATURE 4 — ORGANIZZE: MODO CASAL APRIMORADO
// ══════════════════════════════════════════════════════════════════════════════
function CoupleView({ transactions, sharedKey, userName }) {
  const myTx      = transactions.filter(t => t.user === userName || t.user === "Você");
  const partnerTx = transactions.filter(t => t.user !== userName && t.user !== "Você");
  const myTotal   = myTx.filter(t=>t.type==="expense").reduce((s,t)=>s+(t.valueInBRL??t.value),0);
  const partTotal = partnerTx.filter(t=>t.type==="expense").reduce((s,t)=>s+(t.valueInBRL??t.value),0);
  const total     = myTotal + partTotal;

  if (!sharedKey) return null;
  return (
    <GlassCard style={{marginBottom:12,padding:"14px 16px"}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
        <Users size={16} color={T.accent}/>
        <span style={{fontSize:13,fontWeight:600,color:T.accent}}>Visão do Casal</span>
        <span style={{marginLeft:"auto",fontSize:10,color:T.textDim,fontFamily:"monospace"}}>{sharedKey}</span>
      </div>
      <div style={{display:"flex",gap:10,marginBottom:10}}>
        {[{label:"Você",value:myTotal,color:T.income},{label:"Parceiro(a)",value:partTotal,color:T.accent}].map((p,i)=>(
          <div key={i} style={{flex:1,background:T.surfaceAlt,borderRadius:T.radiusXs,padding:"10px 12px"}}>
            <p style={{fontSize:11,color:p.color,fontWeight:600,marginBottom:3}}>{p.label}</p>
            <p style={{fontFamily:T.fontDisplay,fontSize:15,fontWeight:700,color:p.color}}>{fmt(p.value)}</p>
          </div>
        ))}
      </div>
      {total > 0 && (
        <div>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
            <span style={{fontSize:11,color:T.textDim}}>Você {total > 0 ? (myTotal/total*100).toFixed(0) : 0}%</span>
            <span style={{fontSize:11,color:T.textDim}}>Parceiro(a) {total > 0 ? (partTotal/total*100).toFixed(0) : 0}%</span>
          </div>
          <div style={{height:6,background:T.surfaceAlt,borderRadius:3,overflow:"hidden",display:"flex"}}>
            <div style={{width:`${total>0?(myTotal/total*100):50}%`,background:T.income,transition:"width 0.6s ease"}}/>
            <div style={{flex:1,background:T.accent}}/>
          </div>
          <p style={{fontSize:11,color:T.textDim,textAlign:"center",marginTop:6}}>Total conjunto: {fmt(total)}</p>
        </div>
      )}
    </GlassCard>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// FEATURE 5 — JOTA IA: ASSISTENTE FINANCEIRO INTELIGENTE
// ══════════════════════════════════════════════════════════════════════════════
const CHIPS = ["Qual meu saldo?","Onde gastei mais?","Dica de economia","Resumo do mês","Contas a vencer"];

function JotaOverlay({ open, onClose, listening, speaking, transcript, agentContext, onListen, onStop, supported }) {
  const [history, setHistory] = useState([]);
  const [input, setInput]     = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }); }, [history, loading]);
  useEffect(() => { if (open) setTimeout(()=>inputRef.current?.focus(), 300); }, [open]);
  useEffect(() => { if (transcript && !listening) sendMessage(transcript); }, [transcript, listening]); // eslint-disable-line

  const sendMessage = async (text) => {
    if (!text?.trim()) return;
    setInput("");
    setHistory(h => [...h, { role:"user", text: text.trim() }]);
    setLoading(true);
    try {
      const reply = processValoraQuery(text, agentContext || {});
      setHistory(h => [...h, { role:"assistant", text: reply }]);
    } catch {
      setHistory(h => [...h, { role:"assistant", text: "Desculpe, ocorreu um erro. Tente novamente." }]);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;
  return (
    <div style={{position:"fixed",inset:0,zIndex:1500,display:"flex",flexDirection:"column",background:"rgba(0,0,0,0.75)",backdropFilter:"blur(6px)"}}>
      <div style={{flex:1,maxWidth:430,width:"100%",margin:"0 auto",display:"flex",flexDirection:"column",height:"100%"}}>
        <div style={{display:"flex",alignItems:"center",gap:12,padding:"16px 20px",background:T.surface,borderBottom:`1px solid ${T.border}`}}>
          <div style={{width:40,height:40,borderRadius:"50%",background:`linear-gradient(135deg,${T.agent},#0891B2)`,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`0 0 14px ${T.agentGlow}`}}>
            <span style={{fontSize:20}}>&#x1F916;</span>
          </div>
          <div style={{flex:1}}>
            <p style={{fontSize:14,fontWeight:700,color:T.agent}}>Jota &#8212; Valora IA</p>
            <p style={{fontSize:11,color:T.textDim}}>{loading?"Pensando...":"Online"}</p>
          </div>
          <div onClick={()=>{onClose();window.speechSynthesis?.cancel();}} style={{width:32,height:32,borderRadius:"50%",background:T.surfaceAlt,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}><X size={16} color={T.textMuted}/></div>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"16px 20px",display:"flex",flexDirection:"column",gap:12}}>
          {history.length === 0 && (
            <div style={{textAlign:"center",padding:"32px 0"}}>
              <p style={{fontSize:28,marginBottom:8}}>&#x1F916;</p>
              <p style={{fontSize:14,color:T.text,fontWeight:600,marginBottom:4}}>Ola! Sou o Jota.</p>
              <p style={{fontSize:13,color:T.textDim}}>Pergunte sobre seus gastos, saldo, metas ou peça dicas financeiras.</p>
            </div>
          )}
          {history.map((m,i) => (
            <div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start"}}>
              <div style={{maxWidth:"82%",padding:"10px 14px",borderRadius:m.role==="user"?"16px 16px 4px 16px":"16px 16px 16px 4px",background:m.role==="user"?`linear-gradient(135deg,${T.accent},${T.agent})`:T.surfaceAlt,color:T.text,fontSize:14,lineHeight:1.5,fontFamily:T.font}}>
                {m.text}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{display:"flex",justifyContent:"flex-start"}}>
              <div style={{padding:"10px 16px",borderRadius:"16px 16px 16px 4px",background:T.surfaceAlt,display:"flex",gap:6,alignItems:"center"}}>
                {[0,1,2].map(i=><div key={i} style={{width:6,height:6,borderRadius:"50%",background:T.textDim,animation:`wave 1.2s ease-in-out ${i*0.2}s infinite`}}/>)}
              </div>
            </div>
          )}
          <div ref={bottomRef}/>
        </div>
        {history.length === 0 && (
          <div style={{display:"flex",gap:8,padding:"0 20px 12px",overflowX:"auto"}}>
            {CHIPS.map((c,i)=>(
              <div key={i} onClick={()=>sendMessage(c)} style={{flexShrink:0,padding:"8px 14px",borderRadius:20,background:T.surfaceAlt,border:`1px solid ${T.border}`,fontSize:12,color:T.textMuted,cursor:"pointer",fontFamily:T.font,whiteSpace:"nowrap"}}>{c}</div>
            ))}
          </div>
        )}
        <div style={{padding:"12px 20px 24px",background:T.surface,borderTop:`1px solid ${T.border}`,display:"flex",gap:10,alignItems:"flex-end"}}>
          <div style={{flex:1,background:T.surfaceAlt,borderRadius:22,border:`1px solid ${T.border}`,padding:"10px 16px",display:"flex",alignItems:"center"}}>
            <input ref={inputRef} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendMessage(input)} placeholder="Pergunte algo..." style={{flex:1,background:"transparent",border:"none",outline:"none",color:T.text,fontFamily:T.font,fontSize:14}}/>
          </div>
          {supported && (
            <div onClick={listening?onStop:onListen} style={{width:44,height:44,borderRadius:"50%",background:listening?T.expense:T.surfaceAlt,border:`1px solid ${listening?T.expense:T.border}`,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>{listening?<MicOff size={20} color={T.expense}/>:<Mic size={20} color={T.textMuted}/>}</div>
          )}
          <div onClick={()=>sendMessage(input)} style={{width:44,height:44,borderRadius:"50%",background:`linear-gradient(135deg,${T.agent},#0891B2)`,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0}}><Send size={18} color="#000"/></div>
        </div>
      </div>
    </div>
  );
}
