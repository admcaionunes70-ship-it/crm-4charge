import { useEffect, useState } from "react";
import { isSupabaseConfigured, supabase } from "./supabaseClient";

const COLORS = {
  bg: "#0A0A0F",
  card: "#13131A",
  border: "#1E1E2E",
  accent: "#FF6B00",
  accentDim: "#FF6B0022",
  green: "#00C896",
  greenDim: "#00C89622",
  yellow: "#FFB800",
  red: "#FF4560",
  purple: "#A78BFA",
  blue: "#38BDF8",
  text: "#F0F0F5",
  muted: "#7A7A9A",
  white: "#FFFFFF",
};

const STATUS_LIST = ["Novo", "Abordado", "Apresentado", "Proposta Enviada", "Ganho", "Perdido"];
const STATUS_COLORS = {
  Novo: COLORS.muted,
  Abordado: COLORS.yellow,
  Apresentado: COLORS.purple,
  "Proposta Enviada": COLORS.blue,
  Ganho: COLORS.green,
  Perdido: COLORS.red,
};

const CANAIS = ["Presencial", "WhatsApp", "Instagram"];
const SEGMENTOS = ["Clínica/Consultório", "Imobiliária", "Alimentação", "Escola/Curso", "Auto Center", "Ótica", "Farmácia", "Pet", "Outro"];
const TOTENS = ["Steak & Bar Pai D'égua", "Clínica Ronaldo Lobato", "Academia Jr Physical Power", "Todos os 3"];
const TABS = ["Início", "CRM", "Metas", "Scripts", "Pontos", "Rotina"];
const EMPTY_FORM = {
  estabelecimento: "",
  dono: "",
  whatsapp: "",
  segmento: "",
  totem: "",
  canal: "",
  status: "Novo",
  followup: "",
  observacoes: "",
  valor: "",
  dataFechamento: "",
};

function hoje() {
  return new Date().toISOString().split("T")[0];
}

function fromDbContato(contato) {
  return {
    ...contato,
    dataFechamento: contato.data_fechamento || "",
    followup: contato.followup || "",
    valor: contato.valor ?? "",
  };
}

function toDbContato(form, userId) {
  return {
    user_id: userId,
    estabelecimento: form.estabelecimento.trim(),
    dono: form.dono || null,
    whatsapp: form.whatsapp || null,
    segmento: form.segmento || null,
    totem: form.totem || null,
    canal: form.canal || null,
    status: form.status || "Novo",
    followup: form.followup || null,
    observacoes: form.observacoes || null,
    valor: form.valor === "" ? null : Number(form.valor),
    data_fechamento: form.dataFechamento || null,
  };
}

function normalizePhone(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return "";
  return digits.startsWith("55") ? digits : `55${digits}`;
}

function whatsappLink(contato) {
  const phone = normalizePhone(contato.whatsapp);
  const nome = contato.dono || contato.estabelecimento;
  const mensagem = `Oi, ${nome}! Sou Rayla, da 4Charge. Estou passando para falar da campanha de junho e julho nos totens da Augusto Montenegro. Posso te mandar os detalhes?`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(mensagem)}`;
}

function mesAtual() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatData(data) {
  if (!data) return "—";
  const [y, m, d] = data.split("-");
  return `${d}/${m}/${y}`;
}

function isHoje(data) {
  return data === hoje();
}

function isAtrasado(data) {
  return data && data < hoje();
}

function isMesAtual(data) {
  return data && data.startsWith(mesAtual());
}

function Badge({ children, color = COLORS.accent, style = {} }) {
  return (
    <span style={{ background: `${color}22`, color, border: `1px solid ${color}44`, borderRadius: 6, padding: "2px 10px", fontSize: 11, fontWeight: 700, letterSpacing: 0.5, ...style }}>
      {children}
    </span>
  );
}

function Card({ children, style = {} }) {
  return (
    <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 16, marginBottom: 12, ...style }}>
      {children}
    </div>
  );
}

function TabBar({ active, setActive }) {
  return (
    <div style={{ display: "flex", background: COLORS.card, borderBottom: `1px solid ${COLORS.border}`, position: "sticky", top: 0, zIndex: 10, overflowX: "auto" }}>
      {TABS.map((tab) => (
        <button key={tab} onClick={() => setActive(tab)} style={{ flex: 1, padding: "13px 8px", background: "none", border: "none", borderBottom: active === tab ? `2px solid ${COLORS.accent}` : "2px solid transparent", color: active === tab ? COLORS.accent : COLORS.muted, fontWeight: active === tab ? 800 : 500, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" }}>
          {tab}
        </button>
      ))}
    </div>
  );
}

function ProgressBar({ value, max, color = COLORS.accent, height = 8 }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div style={{ background: COLORS.border, borderRadius: 4, height, overflow: "hidden" }}>
      <div style={{ background: color, borderRadius: 4, height, width: `${pct}%`, transition: "width 0.6s ease" }} />
    </div>
  );
}

function Stat({ valor, label, cor, sub }) {
  return (
    <Card style={{ padding: "14px 10px", textAlign: "center", marginBottom: 0 }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: cor }}>{valor}</div>
      <div style={{ fontSize: 10, color: COLORS.muted, marginTop: 2 }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: cor, marginTop: 3, fontWeight: 600 }}>{sub}</div>}
    </Card>
  );
}

function Input({ label, value, onChange, type = "text", options, placeholder }) {
  const base = { width: "100%", background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "10px 12px", color: COLORS.text, fontSize: 13, marginTop: 4, boxSizing: "border-box" };

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, color: COLORS.muted, fontWeight: 700, letterSpacing: 0.5 }}>{label}</div>
      {options ? (
        <select value={value} onChange={(e) => onChange(e.target.value)} style={base}>
          <option value="">Selecionar...</option>
          {options.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      ) : type === "textarea" ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={{ ...base, minHeight: 80, resize: "vertical" }} />
      ) : (
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={base} />
      )}
    </div>
  );
}

function Login({ onAuth }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState("login");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event) {
    event.preventDefault();
    setMessage("");

    if (!isSupabaseConfigured) {
      setMessage("Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env.");
      return;
    }

    setLoading(true);
    const authCall = mode === "login"
      ? supabase.auth.signInWithPassword({ email, password })
      : supabase.auth.signUp({ email, password });

    const { data, error } = await authCall;
    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    if (data.session) {
      onAuth(data.session);
      return;
    }

    setMessage("Cadastro criado. Confirme seu e-mail se o Supabase solicitar validação.");
  }

  return (
    <div style={{ background: COLORS.bg, minHeight: "100vh", color: COLORS.text, fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", width: "100vw", minWidth: "100vw", padding: "clamp(16px, 3vw, 40px)", boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 440 }}>
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11, color: COLORS.accent, fontWeight: 800, letterSpacing: 2, marginBottom: 6 }}>CRM ONLINE</div>
          <div style={{ fontSize: 30, fontWeight: 900, color: COLORS.white }}>4Charge</div>
          <div style={{ fontSize: 13, color: COLORS.muted }}>Entre para acessar seus contatos, metas e follow-ups.</div>
        </div>

        <Card style={{ border: `1px solid ${COLORS.accent}44` }}>
          <form onSubmit={submit}>
            <Input label="E-MAIL" value={email} onChange={setEmail} type="email" placeholder="voce@email.com" />
            <Input label="SENHA" value={password} onChange={setPassword} type="password" placeholder="Minimo 6 caracteres" />

            {message && <div style={{ background: COLORS.accentDim, border: `1px solid ${COLORS.accent}44`, color: COLORS.text, borderRadius: 10, padding: 10, fontSize: 12, marginBottom: 12 }}>{message}</div>}

            <button disabled={loading} style={{ ...buttonPrimary, opacity: loading ? 0.7 : 1 }}>
              {loading ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar conta"}
            </button>
          </form>

          <button onClick={() => { setMode(mode === "login" ? "signup" : "login"); setMessage(""); }} style={{ ...buttonSecondary, width: "100%", marginTop: 10 }}>
            {mode === "login" ? "Criar nova conta" : "Ja tenho conta"}
          </button>
        </Card>
      </div>
    </div>
  );
}

function Inicio({ contatos }) {
  const ganhosMes = contatos.filter((c) => c.status === "Ganho" && isMesAtual(c.dataFechamento));
  const faturamento = ganhosMes.reduce((acc, c) => acc + (parseFloat(c.valor) || 0), 0);
  const followupsHoje = contatos.filter((c) => isHoje(c.followup) && !["Ganho", "Perdido"].includes(c.status)).length;

  const tabela = [
    { plano: "3 meses", t1: "R$197", t2: "R$347", t3: "R$447" },
    { plano: "6 meses", t1: "R$177", t2: "R$317", t3: "R$407" },
    { plano: "12 meses", t1: "R$157", t2: "R$287", t3: "R$367" },
  ];

  return (
    <div>
      <div style={{ background: `linear-gradient(135deg, ${COLORS.accent}18 0%, ${COLORS.bg} 60%)`, borderBottom: `1px solid ${COLORS.border}`, padding: "24px 16px 20px" }}>
        <div style={{ fontSize: 11, color: COLORS.accent, fontWeight: 700, letterSpacing: 2, marginBottom: 6 }}>BELÉM · PARQUE VERDE</div>
        <div style={{ fontSize: 28, fontWeight: 900, color: COLORS.white, lineHeight: 1.2 }}>4Charge</div>
        <div style={{ fontSize: 13, color: COLORS.muted }}>Painel Operacional — Campanha Junho & Julho</div>
      </div>

      <div style={{ padding: "clamp(16px, 2.5vw, 32px)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginBottom: 12 }}>
          <Stat valor="11K" label="impactos/mês" cor={COLORS.accent} />
          <Stat valor={ganhosMes.length} label="fechamentos" cor={COLORS.green} sub="este mês" />
          <Stat valor={followupsHoje || "—"} label="follow-ups hoje" cor={followupsHoje ? COLORS.yellow : COLORS.muted} />
        </div>

        {faturamento > 0 && (
          <Card style={{ border: `1px solid ${faturamento >= 1890 ? COLORS.green : COLORS.accent}44`, background: `${faturamento >= 1890 ? COLORS.green : COLORS.accent}11` }}>
            <div style={{ fontSize: 11, color: faturamento >= 1890 ? COLORS.green : COLORS.accent, fontWeight: 800 }}>FATURAMENTO DO MÊS</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: COLORS.white }}>R$ {faturamento.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
            <ProgressBar value={faturamento} max={2500} color={faturamento >= 1890 ? COLORS.green : COLORS.accent} />
          </Card>
        )}

        <Card style={{ border: `1px solid ${COLORS.accent}44`, background: COLORS.accentDim }}>
          <div style={{ fontWeight: 800, color: COLORS.accent, marginBottom: 8 }}>🎯 Campanha Ativa</div>
          <div style={{ fontSize: 16, fontWeight: 900, color: COLORS.white }}>Junho & Julho — Presença Local nas Datas que Movimentam</div>
          <div style={{ fontSize: 12, color: COLORS.muted, lineHeight: 1.6, marginTop: 6 }}>Festa junina · Férias escolares · Fim de semestre · Vagas limitadas por totem</div>
        </Card>

        <Card>
          <div style={{ fontSize: 12, color: COLORS.accent, fontWeight: 800, marginBottom: 8 }}>ARGUMENTO DE VENDA</div>
          <div style={{ fontSize: 13, color: COLORS.text, lineHeight: 1.6, fontStyle: "italic" }}>"Junho e julho são dois dos meses de maior movimento no comércio local. Temos as últimas vagas nos nossos totens da Augusto Montenegro para você aparecer para mais de 11 mil pessoas nesse período."</div>
        </Card>

        <Card>
          <div style={{ fontSize: 12, color: COLORS.accent, fontWeight: 800, marginBottom: 12 }}>TABELA DE PLANOS</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr>
                {["Plano", "1 Totem", "2 Totens", "3 Totens"].map((h) => (
                  <th key={h} style={{ color: COLORS.muted, padding: "6px 4px", textAlign: "left", borderBottom: `1px solid ${COLORS.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tabela.map((row, index) => (
                <tr key={row.plano} style={{ background: index === 0 ? COLORS.accentDim : "transparent" }}>
                  <td style={{ padding: "10px 4px", color: index === 0 ? COLORS.accent : COLORS.text, fontWeight: 700 }}>{row.plano}</td>
                  <td style={{ padding: "10px 4px", color: COLORS.white, fontWeight: 700 }}>{row.t1}</td>
                  <td style={{ padding: "10px 4px", color: COLORS.white, fontWeight: 700 }}>{row.t2}</td>
                  <td style={{ padding: "10px 4px", color: COLORS.white, fontWeight: 700 }}>{row.t3}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}

function Metas({ contatos }) {
  const totalContatos = contatos.length;
  const abordados = contatos.filter((c) => c.status !== "Novo").length;
  const apresentados = contatos.filter((c) => ["Apresentado", "Proposta Enviada", "Ganho"].includes(c.status)).length;
  const propostas = contatos.filter((c) => ["Proposta Enviada", "Ganho"].includes(c.status)).length;
  const ganhosMes = contatos.filter((c) => c.status === "Ganho" && isMesAtual(c.dataFechamento));
  const perdidos = contatos.filter((c) => c.status === "Perdido").length;
  const faturamento = ganhosMes.reduce((acc, c) => acc + (parseFloat(c.valor) || 0), 0);
  const ticketMedio = ganhosMes.length ? faturamento / ganhosMes.length : 0;

  const txApresentacao = abordados ? Math.round((apresentados / abordados) * 100) : 0;
  const txFechamento = propostas ? Math.round((ganhosMes.length / propostas) * 100) : 0;
  const corFaturamento = faturamento >= 1890 ? COLORS.green : faturamento >= 945 ? COLORS.yellow : COLORS.accent;

  return (
    <div style={{ padding: "clamp(16px, 2.5vw, 32px)" }}>
      <Card style={{ border: `1px solid ${corFaturamento}44`, background: `${corFaturamento}11` }}>
        <div style={{ fontSize: 11, color: corFaturamento, fontWeight: 900, letterSpacing: 1 }}>FATURAMENTO DO MÊS</div>
        <div style={{ fontSize: 32, fontWeight: 900, color: COLORS.white }}>R$ {faturamento.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: COLORS.muted, margin: "8px 0 10px" }}>
          <span>Break-even: R$1.890</span>
          <span>Meta: R$2.500</span>
        </div>
        <ProgressBar value={faturamento} max={2500} color={corFaturamento} height={10} />
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8, marginBottom: 12 }}>
        <Stat valor={totalContatos} label="Contatos" cor={COLORS.accent} sub="meta 80" />
        <Stat valor={ganhosMes.length} label="Fechamentos" cor={COLORS.green} sub="meta 8" />
        <Stat valor={ticketMedio > 0 ? `R$${Math.round(ticketMedio)}` : "—"} label="Ticket médio" cor={ticketMedio >= 247 ? COLORS.green : COLORS.yellow} />
      </div>

      <Card>
        <div style={{ fontSize: 12, color: COLORS.accent, fontWeight: 900, marginBottom: 14 }}>FUNIL DE VENDAS</div>
        {[
          { label: "Abordados", val: abordados, max: totalContatos || 1, cor: COLORS.yellow },
          { label: "Apresentados", val: apresentados, max: abordados || 1, cor: COLORS.purple },
          { label: "Propostas", val: propostas, max: apresentados || 1, cor: COLORS.blue },
          { label: "Fechamentos", val: ganhosMes.length, max: propostas || 1, cor: COLORS.green },
        ].map((item) => (
          <div key={item.label} style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
              <span style={{ fontSize: 12 }}>{item.label}</span>
              <span style={{ fontSize: 12, fontWeight: 800, color: item.cor }}>{item.val}</span>
            </div>
            <ProgressBar value={item.val} max={item.max} color={item.cor} />
          </div>
        ))}
      </Card>

      <Card>
        <div style={{ fontSize: 12, color: COLORS.accent, fontWeight: 900, marginBottom: 12 }}>KPIs</div>
        <div style={{ fontSize: 13, lineHeight: 1.8 }}>
          Conversão abordagem → apresentação: <b>{txApresentacao}%</b><br />
          Conversão proposta → fechamento: <b>{txFechamento}%</b><br />
          Perdidos: <b>{perdidos}</b>
        </div>
      </Card>
    </div>
  );
}

const buttonPrimary = {
  width: "100%",
  background: COLORS.accent,
  color: "#fff",
  border: "none",
  borderRadius: 12,
  padding: 13,
  fontSize: 14,
  fontWeight: 800,
  cursor: "pointer",
};

const buttonSecondary = {
  background: COLORS.card,
  border: `1px solid ${COLORS.border}`,
  borderRadius: 10,
  padding: "8px 14px",
  color: COLORS.text,
  fontSize: 13,
  cursor: "pointer",
};

function CRM({ contatos, setContatos, user }) {
  const [view, setView] = useState("lista");
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [detalheId, setDetalheId] = useState(null);
  const [filtroStatus, setFiltroStatus] = useState("Todos");
  const [busca, setBusca] = useState("");
  const [saving, setSaving] = useState(false);

  async function registrarAtividade(contatoId, tipo, descricao) {
    await supabase.from("atividades").insert({
      user_id: user.id,
      contato_id: contatoId,
      tipo,
      descricao,
    });
  }

  async function salvarFollowup(contatoId, dataFollowup, observacao) {
    if (!dataFollowup) return;

    await supabase.from("followups").upsert({
      user_id: user.id,
      contato_id: contatoId,
      data_followup: dataFollowup,
      observacao: observacao || null,
      concluido: false,
    }, { onConflict: "contato_id,data_followup" });
  }

  async function salvar() {
    if (!form.estabelecimento.trim()) return alert("Informe o estabelecimento.");

    setSaving(true);
    const payload = toDbContato(form, user.id);

    if (editId !== null) {
      const { data, error } = await supabase
        .from("contatos")
        .update(payload)
        .eq("id", editId)
        .select()
        .single();

      if (error) {
        setSaving(false);
        return alert(error.message);
      }

      const contatoAtualizado = fromDbContato(data);
      await salvarFollowup(editId, contatoAtualizado.followup, contatoAtualizado.observacoes);
      await registrarAtividade(editId, "atualizacao", `Contato atualizado: ${contatoAtualizado.status}`);
      setContatos((lista) => lista.map((item) => (item.id === editId ? contatoAtualizado : item)));
    } else {
      const { data, error } = await supabase
        .from("contatos")
        .insert(payload)
        .select()
        .single();

      if (error) {
        setSaving(false);
        return alert(error.message);
      }

      const novoContato = fromDbContato(data);
      await salvarFollowup(novoContato.id, novoContato.followup, novoContato.observacoes);
      await registrarAtividade(novoContato.id, "criacao", "Contato criado");
      setContatos((lista) => [novoContato, ...lista]);
    }

    setSaving(false);
    setForm(EMPTY_FORM);
    setEditId(null);
    setView("lista");
  }

  async function excluir(id) {
    if (confirm("Deseja excluir este contato?")) {
      const { error } = await supabase.from("contatos").delete().eq("id", id);

      if (error) return alert(error.message);

      setContatos((lista) => lista.filter((item) => item.id !== id));
      setView("lista");
    }
  }

  function editarContato(contato) {
    setForm({ ...contato });
    setEditId(contato.id);
    setView("form");
  }

  const contatoDetalhe = contatos.find((c) => c.id === detalheId);
  const followupsHoje = contatos.filter((c) => isHoje(c.followup) && !["Ganho", "Perdido"].includes(c.status)).length;
  const atrasados = contatos.filter((c) => isAtrasado(c.followup) && !["Ganho", "Perdido"].includes(c.status)).length;
  const ganhos = contatos.filter((c) => c.status === "Ganho");
  const faturamento = ganhos.filter((c) => isMesAtual(c.dataFechamento)).reduce((acc, c) => acc + (parseFloat(c.valor) || 0), 0);

  const listaFiltrada = contatos.filter((c) => {
    const passaStatus = filtroStatus === "Todos" || c.status === filtroStatus;
    const termo = busca.toLowerCase();
    const passaBusca = !termo || c.estabelecimento.toLowerCase().includes(termo) || (c.dono || "").toLowerCase().includes(termo);
    return passaStatus && passaBusca;
  });

  if (view === "form") {
    return (
      <div style={{ padding: "clamp(16px, 2.5vw, 32px)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <button onClick={() => setView("lista")} style={buttonSecondary}>← Voltar</button>
          <div style={{ fontWeight: 800, color: COLORS.white }}>{editId ? "Editar contato" : "Novo contato"}</div>
        </div>

        <Card>
          <Input label="ESTABELECIMENTO *" value={form.estabelecimento} onChange={(v) => setForm((f) => ({ ...f, estabelecimento: v }))} />
          <Input label="NOME DO DONO/DECISOR" value={form.dono} onChange={(v) => setForm((f) => ({ ...f, dono: v }))} />
          <Input label="WHATSAPP" value={form.whatsapp} onChange={(v) => setForm((f) => ({ ...f, whatsapp: v }))} type="tel" />
          <Input label="SEGMENTO" value={form.segmento} onChange={(v) => setForm((f) => ({ ...f, segmento: v }))} options={SEGMENTOS} />
          <Input label="TOTEM INDICADO" value={form.totem} onChange={(v) => setForm((f) => ({ ...f, totem: v }))} options={TOTENS} />
          <Input label="CANAL DE ABORDAGEM" value={form.canal} onChange={(v) => setForm((f) => ({ ...f, canal: v }))} options={CANAIS} />
          <Input label="STATUS" value={form.status} onChange={(v) => setForm((f) => ({ ...f, status: v }))} options={STATUS_LIST} />
          <Input label="DATA DO FOLLOW-UP" value={form.followup} onChange={(v) => setForm((f) => ({ ...f, followup: v }))} type="date" />

          {form.status === "Ganho" && (
            <>
              <Input label="VALOR FECHADO (R$)" value={form.valor} onChange={(v) => setForm((f) => ({ ...f, valor: v }))} type="number" />
              <Input label="DATA DE FECHAMENTO" value={form.dataFechamento} onChange={(v) => setForm((f) => ({ ...f, dataFechamento: v }))} type="date" />
            </>
          )}

          <Input label="OBSERVAÇÕES" value={form.observacoes} onChange={(v) => setForm((f) => ({ ...f, observacoes: v }))} type="textarea" />
        </Card>

        <button onClick={salvar} disabled={saving} style={{ ...buttonPrimary, opacity: saving ? 0.7 : 1 }}>{saving ? "Salvando..." : editId ? "Salvar alteracoes" : "Adicionar contato"}</button>
        {editId !== null && <button onClick={() => excluir(editId)} style={{ ...buttonPrimary, background: COLORS.red, marginTop: 10 }}>Excluir contato</button>}
      </div>
    );
  }

  if (view === "detalhe" && contatoDetalhe) {
    const c = contatoDetalhe;
    const cor = STATUS_COLORS[c.status] || COLORS.muted;

    return (
      <div style={{ padding: "clamp(16px, 2.5vw, 32px)" }}>
        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          <button onClick={() => setView("lista")} style={buttonSecondary}>← Voltar</button>
          <button onClick={() => editarContato(c)} style={buttonSecondary}>Editar</button>
        </div>

        <Card style={{ border: `1px solid ${cor}44` }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: COLORS.white }}>{c.estabelecimento}</div>
          {c.dono && <div style={{ fontSize: 13, color: COLORS.muted, marginTop: 4 }}>👤 {c.dono}</div>}
          <div style={{ marginTop: 10 }}><Badge color={cor}>{c.status}</Badge></div>
        </Card>

        {c.whatsapp && (
          <a href={whatsappLink(c)} target="_blank" rel="noreferrer" style={{ ...buttonPrimary, display: "block", textAlign: "center", textDecoration: "none", marginBottom: 10, background: COLORS.green }}>
            Abrir WhatsApp com mensagem pronta
          </a>
        )}

        {[["WhatsApp", c.whatsapp], ["Segmento", c.segmento], ["Totem indicado", c.totem], ["Canal", c.canal], ["Follow-up", c.followup ? formatData(c.followup) : ""], ["Valor fechado", c.valor ? `R$ ${c.valor}` : ""], ["Data fechamento", c.dataFechamento ? formatData(c.dataFechamento) : ""]].filter(([, value]) => value).map(([label, value]) => (
          <Card key={label} style={{ padding: "12px 16px", marginBottom: 8 }}>
            <div style={{ fontSize: 10, color: COLORS.muted, fontWeight: 900, letterSpacing: 1 }}>{label.toUpperCase()}</div>
            <div style={{ fontSize: 14, color: COLORS.text, marginTop: 2 }}>{value}</div>
          </Card>
        ))}

        {c.observacoes && (
          <Card>
            <div style={{ fontSize: 10, color: COLORS.muted, fontWeight: 900, letterSpacing: 1, marginBottom: 6 }}>OBSERVAÇÕES</div>
            <div style={{ fontSize: 13, color: COLORS.text, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{c.observacoes}</div>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: "clamp(16px, 2.5vw, 32px)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginBottom: 12 }}>
        <Stat valor={contatos.length} label="Total contatos" cor={COLORS.accent} />
        <Stat valor={ganhos.length} label="Ganhos" cor={COLORS.green} />
        <Stat valor={followupsHoje} label="Follow-ups hoje" cor={COLORS.yellow} />
        <Stat valor={atrasados} label="Atrasados" cor={atrasados > 0 ? COLORS.red : COLORS.muted} />
      </div>

      {faturamento > 0 && (
        <Card style={{ border: `1px solid ${COLORS.green}44`, background: COLORS.greenDim }}>
          <div style={{ fontSize: 11, color: COLORS.green, fontWeight: 900 }}>FATURAMENTO DO MÊS</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: COLORS.white }}>R$ {faturamento.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
        </Card>
      )}

      <input placeholder="🔍 Buscar..." value={busca} onChange={(e) => setBusca(e.target.value)} style={{ width: "100%", background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "10px 14px", color: COLORS.text, fontSize: 13, marginBottom: 10, boxSizing: "border-box" }} />

      <div style={{ display: "flex", gap: 6, overflowX: "auto", marginBottom: 14 }}>
        {["Todos", ...STATUS_LIST].map((s) => {
          const color = STATUS_COLORS[s] || COLORS.accent;
          return (
            <button key={s} onClick={() => setFiltroStatus(s)} style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${filtroStatus === s ? color : COLORS.border}`, background: filtroStatus === s ? `${color}22` : COLORS.card, color: filtroStatus === s ? color : COLORS.muted, fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
              {s}
            </button>
          );
        })}
      </div>

      <button onClick={() => { setForm(EMPTY_FORM); setEditId(null); setView("form"); }} style={buttonPrimary}>+ Novo contato</button>

      <div style={{ height: 14 }} />

      {listaFiltrada.length === 0 && (
        <div style={{ textAlign: "center", color: COLORS.muted, padding: "40px 0", fontSize: 13 }}>
          {contatos.length === 0 ? "Nenhum contato ainda. Toque em + Novo contato para começar." : "Nenhum resultado."}
        </div>
      )}

      {listaFiltrada.map((c) => {
        const cor = STATUS_COLORS[c.status] || COLORS.muted;
        const atrasado = isAtrasado(c.followup) && !["Ganho", "Perdido"].includes(c.status);
        const fhoje = isHoje(c.followup) && !["Ganho", "Perdido"].includes(c.status);

        return (
          <div key={c.id} onClick={() => { setDetalheId(c.id); setView("detalhe"); }} style={{ background: COLORS.card, border: `1px solid ${atrasado ? `${COLORS.red}66` : fhoje ? `${COLORS.yellow}66` : COLORS.border}`, borderRadius: 14, padding: 14, marginBottom: 10, cursor: "pointer" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
              <div style={{ fontWeight: 900, color: COLORS.white, fontSize: 14, flex: 1 }}>{c.estabelecimento}</div>
              <Badge color={cor}>{c.status}</Badge>
            </div>
            {c.dono && <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 4 }}>👤 {c.dono}</div>}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
              {c.segmento && <Badge color={COLORS.muted}>{c.segmento}</Badge>}
              {c.canal && <Badge color={COLORS.muted}>{c.canal}</Badge>}
              {c.followup && <Badge color={atrasado ? COLORS.red : fhoje ? COLORS.yellow : COLORS.muted}>{atrasado ? "⚠️ " : fhoje ? "📅 Hoje — " : "📅 "}{formatData(c.followup)}</Badge>}
              {c.valor && c.status === "Ganho" && <Badge color={COLORS.green}>R$ {c.valor}</Badge>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const scripts = [
  { id: "presencial", titulo: "🏪 Presencial", subtitulo: "Com atendente/recepcionista", passos: [
    { label: "Chegando", texto: "Oi, tudo bem? Meu nome é Rayla, sou consultora da 4Charge. A gente opera os totens de carregamento de celular aqui na Augusto Montenegro. Queria mostrar esse dado para o responsável — são 5 minutinhos. Ele está?" },
    { label: "Com o dono", texto: "Muito prazer. A gente já opera aqui no Parque Verde e Augusto Montenegro com totens de carregamento de celular com tela de anúncio. Passamos de 11 mil pessoas visualizando nos nossos pontos. Posso te mostrar rapidinho como funciona?" },
    { label: "Oferta com urgência", texto: "Para essa campanha de junho e julho eu tenho condição especial. As vagas são limitadas e quem fechar agora garante exclusividade do segmento nos pontos contratados." },
  ]},
  { id: "objecoes", titulo: "🛡️ Objeções", subtitulo: "Respostas prontas", passos: [
    { label: "Preciso pensar", texto: "Faz sentido. Só reforço que as vagas dessa campanha precisam ser fechadas esta semana para garantir a condição especial e a exclusividade do segmento." },
    { label: "Está caro", texto: "Entendo. Mas são mais de 11 mil pessoas por mês vendo seu negócio na região. Isso representa menos de R$7 por dia no plano de entrada." },
    { label: "Já faço Instagram", texto: "Instagram é ótimo para quem já segue você. O totem alcança quem ainda não conhece seu negócio, mas já circula na região todos os dias." },
  ]},
  { id: "whatsapp", titulo: "💬 WhatsApp", subtitulo: "Sequência de mensagens", passos: [
    { label: "Após visita", texto: "Oi, tudo bem? Sou Rayla, da 4Charge. Passei no estabelecimento para apresentar nossa campanha de junho e julho nos totens da Augusto Montenegro. Posso te mandar os detalhes?" },
    { label: "Follow-up", texto: "Oi, só passando para confirmar se recebeu minha mensagem. Estou fechando as últimas vagas da campanha e queria te dar prioridade antes de abrir para outro negócio do mesmo segmento." },
  ]},
];

function Scripts() {
  const [scriptAtivo, setScriptAtivo] = useState(0);
  const [passoAberto, setPassoAberto] = useState(null);
  const script = scripts[scriptAtivo];

  return (
    <div style={{ padding: "clamp(16px, 2.5vw, 32px)" }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, overflowX: "auto" }}>
        {scripts.map((item, index) => (
          <button key={item.id} onClick={() => { setScriptAtivo(index); setPassoAberto(null); }} style={{ padding: "8px 14px", borderRadius: 10, border: `1px solid ${index === scriptAtivo ? COLORS.accent : COLORS.border}`, background: index === scriptAtivo ? COLORS.accentDim : COLORS.card, color: index === scriptAtivo ? COLORS.accent : COLORS.muted, fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
            {item.titulo}
          </button>
        ))}
      </div>

      <div style={{ fontSize: 11, color: COLORS.muted, marginBottom: 12 }}>{script.subtitulo}</div>

      {script.passos.map((passo, index) => (
        <Card key={passo.label} style={{ cursor: "pointer" }}>
          <div onClick={() => setPassoAberto(passoAberto === index ? null : index)} style={{ display: "flex", justifyContent: "space-between" }}>
            <div><Badge color={COLORS.accent}>{index + 1}</Badge><span style={{ marginLeft: 10, fontWeight: 800, color: COLORS.text, fontSize: 14 }}>{passo.label}</span></div>
            <span style={{ color: COLORS.muted, fontSize: 18 }}>{passoAberto === index ? "−" : "+"}</span>
          </div>

          {passoAberto === index && (
            <div style={{ marginTop: 14, background: COLORS.bg, borderRadius: 10, padding: 14, fontSize: 13, color: COLORS.text, lineHeight: 1.7, borderLeft: `3px solid ${COLORS.accent}`, whiteSpace: "pre-wrap" }}>{passo.texto}</div>
          )}
        </Card>
      ))}
    </div>
  );
}

function Pontos() {
  return (
    <div style={{ padding: "clamp(16px, 2.5vw, 32px)" }}>
      <Card>
        <div style={{ color: COLORS.accent, fontWeight: 900, marginBottom: 8 }}>Pontos de mídia</div>
        <div style={{ fontSize: 13, color: COLORS.text, lineHeight: 1.8 }}>
          <b>Steak & Bar Pai D'égua:</b> 8.000 pessoas/mês<br />
          <b>Clínica Ronaldo Lobato:</b> 2.500 pessoas/mês<br />
          <b>Academia Jr Physical Power:</b> 1.300 pessoas/mês
        </div>
      </Card>
    </div>
  );
}

function Rotina() {
  const rotina = [
    "08h – 09h: Responder WhatsApps e follow-ups",
    "09h – 12h: Prospecção presencial — 10 visitas",
    "12h – 14h: Almoço + envio de propostas",
    "14h – 17h: Prospecção presencial — 8 visitas",
    "17h – 18h: Atualizar CRM e programar follow-ups",
  ];

  return (
    <div style={{ padding: "clamp(16px, 2.5vw, 32px)" }}>
      <Card style={{ border: `1px solid ${COLORS.accent}44`, background: COLORS.accentDim }}>
        <div style={{ fontSize: 13, fontWeight: 900, color: COLORS.accent, marginBottom: 4 }}>Rayla — Rotina Diária</div>
        <div style={{ fontSize: 12, color: COLORS.muted }}>18 abordagens · 3 apresentações · 2 propostas/dia</div>
      </Card>
      {rotina.map((item) => <Card key={item}><div style={{ fontSize: 13, color: COLORS.text }}>{item}</div></Card>)}
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState(TABS[0]);
  const [contatos, setContatos] = useState([]);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    async function carregarContatos() {
      if (!session?.user) {
        setContatos([]);
        return;
      }

      setLoading(true);
      await supabase.from("users").upsert({
        id: session.user.id,
        email: session.user.email,
      });

      const { data, error } = await supabase
        .from("contatos")
        .select("*")
        .eq("user_id", session.user.id)
        .order("updated_at", { ascending: false });

      if (error) {
        alert(error.message);
      } else {
        setContatos((data || []).map(fromDbContato));
      }

      setLoading(false);
    }

    carregarContatos();
  }, [session]);

  if (loading) {
    return (
      <div style={{ background: COLORS.bg, minHeight: "100vh", color: COLORS.text, fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", width: "100vw", minWidth: "100vw", display: "grid", placeItems: "center" }}>
        <div style={{ color: COLORS.muted, fontSize: 13 }}>Carregando CRM...</div>
      </div>
    );
  }

  if (!session) return <Login onAuth={setSession} />;

  const pages = {
    [TABS[0]]: <Inicio contatos={contatos} />,
    CRM: <CRM contatos={contatos} setContatos={setContatos} user={session.user} />,
    Metas: <Metas contatos={contatos} />,
    Scripts: <Scripts />,
    Pontos: <Pontos />,
    Rotina: <Rotina />,
  };

  return (
    <div style={{ background: COLORS.bg, minHeight: "100vh", color: COLORS.text, fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", width: "100vw", minWidth: "100vw", maxWidth: "none", margin: 0, boxSizing: "border-box" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: COLORS.card, borderBottom: `1px solid ${COLORS.border}` }}>
        <span style={{ color: COLORS.muted, fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{session.user.email}</span>
        <button onClick={() => supabase.auth.signOut()} style={{ ...buttonSecondary, padding: "6px 10px", fontSize: 11 }}>Sair</button>
      </div>
      <TabBar active={tab} setActive={setTab} />
      {pages[tab]}
      <div style={{ height: 32 }} />
    </div>
  );
}
