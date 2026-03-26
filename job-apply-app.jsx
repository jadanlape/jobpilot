import { useState, useEffect } from "react";

const PLATFORMS = ["LinkedIn", "Indeed", "Welcome to the Jungle", "Autre"];
const STATUSES = ["Envoyée", "En attente", "Entretien", "Refus", "Offre"];
const STATUS_COLORS = {
  "Envoyée": "#6366f1",
  "En attente": "#f59e0b",
  "Entretien": "#10b981",
  "Refus": "#ef4444",
  "Offre": "#8b5cf6",
};

const TABS = ["Générer", "Tracker", "Stats"];

const sampleApplications = [
  { id: 1, company: "Doctolib", role: "Développeur React", platform: "LinkedIn", date: "2026-03-20", status: "Entretien", notes: "" },
  { id: 2, company: "BlaBlaCar", role: "Product Manager", platform: "Indeed", date: "2026-03-18", status: "En attente", notes: "" },
  { id: 3, company: "Contentsquare", role: "UX Designer", platform: "Welcome to the Jungle", date: "2026-03-15", status: "Refus", notes: "" },
];

export default function App() {
  const [tab, setTab] = useState("Générer");
  const [applications, setApplications] = useState(sampleApplications);

  // Generator state
  const [cvText, setCvText] = useState("");
  const [jobOffer, setJobOffer] = useState("");
  const [platform, setPlatform] = useState("LinkedIn");
  const [generating, setGenerating] = useState(false);
  const [generatedEmail, setGeneratedEmail] = useState("");
  const [generatedLetter, setGeneratedLetter] = useState("");
  const [genError, setGenError] = useState("");
  const [activeOutput, setActiveOutput] = useState("email");

  // Tracker state
  const [newApp, setNewApp] = useState({ company: "", role: "", platform: "LinkedIn", date: new Date().toISOString().slice(0, 10), status: "Envoyée", notes: "" });
  const [filterStatus, setFilterStatus] = useState("Tout");
  const [editingId, setEditingId] = useState(null);

  // --- Generator ---
  async function handleGenerate() {
    if (!cvText.trim() || !jobOffer.trim()) {
      setGenError("Veuillez renseigner votre CV et l'offre d'emploi.");
      return;
    }
    setGenError("");
    setGenerating(true);
    setGeneratedEmail("");
    setGeneratedLetter("");
    try {
      const prompt = `Tu es un expert en recrutement. Voici le CV du candidat :
---
${cvText}
---
Et voici l'offre d'emploi sur ${platform} :
---
${jobOffer}
---

Génère deux choses :

1. [EMAIL] Un email de candidature court (5-8 lignes), professionnel, personnalisé, avec objet.
2. [LETTRE] Une lettre de motivation (3 paragraphes), percutante et adaptée à l'offre.

Sépare les deux par "---LETTRE---". Commence directement par l'email (objet inclus), sans introduction.`;

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "anthropic-dangerous-direct-browser-access": "true" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
      const text = data.content?.map(b => b.text || "").join("") || "";
      const parts = text.split("---LETTRE---");
      setGeneratedEmail(parts[0]?.trim() || text);
      setGeneratedLetter(parts[1]?.trim() || "");
      setActiveOutput("email");

      // Auto-add to tracker
      const companyMatch = jobOffer.match(/chez\s+([\w\s]+)|entreprise\s*:\s*([\w\s]+)/i);
      const roleMatch = jobOffer.match(/poste\s*:\s*([\w\s]+)|recrute.*?([\w\s]+\s+(?:développeur|designer|manager|ingénieur|analyste|chef)[\w\s]*)/i);
      setApplications(prev => [{
        id: Date.now(),
        company: companyMatch?.[1] || companyMatch?.[2] || "Entreprise",
        role: roleMatch?.[1] || roleMatch?.[2] || "Poste",
        platform,
        date: new Date().toISOString().slice(0, 10),
        status: "Envoyée",
        notes: "",
      }, ...prev]);
    } catch (e) {
      setGenError("Erreur : " + (e?.message || String(e)));
    }
    setGenerating(false);
  }

  function copyText(text) {
    navigator.clipboard.writeText(text);
  }

  // --- Tracker ---
  const filtered = filterStatus === "Tout" ? applications : applications.filter(a => a.status === filterStatus);

  function addApplication() {
    if (!newApp.company || !newApp.role) return;
    setApplications(prev => [{ ...newApp, id: Date.now() }, ...prev]);
    setNewApp({ company: "", role: "", platform: "LinkedIn", date: new Date().toISOString().slice(0, 10), status: "Envoyée", notes: "" });
  }

  function updateStatus(id, status) {
    setApplications(prev => prev.map(a => a.id === id ? { ...a, status } : a));
  }

  function deleteApp(id) {
    setApplications(prev => prev.filter(a => a.id !== id));
  }

  function exportCSV() {
    const header = "Entreprise,Poste,Plateforme,Date,Statut,Notes";
    const rows = applications.map(a => `"${a.company}","${a.role}","${a.platform}","${a.date}","${a.status}","${a.notes}"`);
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "candidatures.csv"; a.click();
  }

  // --- Stats ---
  const total = applications.length;
  const byStatus = STATUSES.reduce((acc, s) => ({ ...acc, [s]: applications.filter(a => a.status === s).length }), {});
  const byPlatform = PLATFORMS.reduce((acc, p) => ({ ...acc, [p]: applications.filter(a => a.platform === p).length }), {});
  const successRate = total ? Math.round(((byStatus["Entretien"] || 0) + (byStatus["Offre"] || 0)) / total * 100) : 0;

  return (
    <div style={{ minHeight: "100vh", background: "#0c0c14", color: "#e8e6f0", fontFamily: "'DM Sans', sans-serif", padding: "0 0 60px" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Syne:wght@600;700;800&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)", borderBottom: "1px solid #2a2a45", padding: "28px 32px 0" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #6366f1, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>✦</div>
            <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: -0.5 }}>JobPilot</h1>
            <span style={{ background: "#6366f1", color: "#fff", fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 20, letterSpacing: 1 }}>BETA</span>
          </div>
          <p style={{ margin: "0 0 20px 48px", fontSize: 13, color: "#8884a8" }}>Automatisez vos candidatures · Suivez vos progrès · Décrochez le job</p>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 4 }}>
            {TABS.map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                background: tab === t ? "#6366f1" : "transparent",
                color: tab === t ? "#fff" : "#8884a8",
                border: "none", borderRadius: "8px 8px 0 0", padding: "10px 22px",
                fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 500, cursor: "pointer",
                transition: "all .2s",
              }}>{t}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "28px 32px 0" }}>

        {/* ===== GENERATE TAB ===== */}
        {tab === "Générer" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            {/* Left: inputs */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#8884a8", letterSpacing: 1, textTransform: "uppercase", display: "block", marginBottom: 8 }}>Plateforme</label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {PLATFORMS.map(p => (
                    <button key={p} onClick={() => setPlatform(p)} style={{
                      background: platform === p ? "#6366f1" : "#1e1e35",
                      color: platform === p ? "#fff" : "#8884a8",
                      border: "1px solid " + (platform === p ? "#6366f1" : "#2a2a45"),
                      borderRadius: 8, padding: "6px 14px", fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                    }}>{p}</button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#8884a8", letterSpacing: 1, textTransform: "uppercase", display: "block", marginBottom: 8 }}>Votre CV (texte)</label>
                <textarea value={cvText} onChange={e => setCvText(e.target.value)}
                  placeholder="Collez ici le texte de votre CV : expériences, compétences, formation..."
                  style={{ width: "100%", height: 160, background: "#1e1e35", border: "1px solid #2a2a45", borderRadius: 10, color: "#e8e6f0", padding: 14, fontSize: 13, resize: "vertical", fontFamily: "'DM Sans', sans-serif", outline: "none", boxSizing: "border-box" }} />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#8884a8", letterSpacing: 1, textTransform: "uppercase", display: "block", marginBottom: 8 }}>Offre d'emploi</label>
                <textarea value={jobOffer} onChange={e => setJobOffer(e.target.value)}
                  placeholder="Collez ici la description complète de l'offre d'emploi..."
                  style={{ width: "100%", height: 140, background: "#1e1e35", border: "1px solid #2a2a45", borderRadius: 10, color: "#e8e6f0", padding: 14, fontSize: 13, resize: "vertical", fontFamily: "'DM Sans', sans-serif", outline: "none", boxSizing: "border-box" }} />
              </div>

              {genError && <p style={{ color: "#ef4444", fontSize: 13, margin: 0 }}>{genError}</p>}

              <button onClick={handleGenerate} disabled={generating} style={{
                background: generating ? "#3b3b60" : "linear-gradient(135deg, #6366f1, #8b5cf6)",
                color: "#fff", border: "none", borderRadius: 10, padding: "14px 24px",
                fontSize: 15, fontWeight: 600, cursor: generating ? "not-allowed" : "pointer",
                fontFamily: "'DM Sans', sans-serif", letterSpacing: 0.3,
                boxShadow: generating ? "none" : "0 4px 20px rgba(99,102,241,0.35)",
                transition: "all .3s",
              }}>
                {generating ? "✦ Génération en cours..." : "✦ Générer la candidature"}
              </button>
            </div>

            {/* Right: output */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {(generatedEmail || generatedLetter) ? (
                <>
                  <div style={{ display: "flex", gap: 8 }}>
                    {["email", "lettre"].map(o => (
                      <button key={o} onClick={() => setActiveOutput(o)} style={{
                        background: activeOutput === o ? "#1e1e35" : "transparent",
                        color: activeOutput === o ? "#e8e6f0" : "#8884a8",
                        border: "1px solid " + (activeOutput === o ? "#2a2a45" : "transparent"),
                        borderRadius: 8, padding: "7px 16px", fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontWeight: 500,
                        textTransform: "capitalize",
                      }}>{o === "email" ? "📧 Email" : "📄 Lettre"}</button>
                    ))}
                    <button onClick={() => copyText(activeOutput === "email" ? generatedEmail : generatedLetter)} style={{
                      marginLeft: "auto", background: "#1e1e35", color: "#8884a8", border: "1px solid #2a2a45",
                      borderRadius: 8, padding: "7px 14px", fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                    }}>Copier</button>
                  </div>

                  <div style={{ flex: 1, background: "#1e1e35", border: "1px solid #2a2a45", borderRadius: 10, padding: 16, fontSize: 13.5, lineHeight: 1.7, color: "#d4d0e8", whiteSpace: "pre-wrap", overflowY: "auto", maxHeight: 420 }}>
                    {activeOutput === "email" ? generatedEmail : generatedLetter}
                  </div>

                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => { setTab("Tracker"); }} style={{
                      flex: 1, background: "#1e1e35", color: "#8884a8", border: "1px solid #2a2a45",
                      borderRadius: 8, padding: "10px", fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                    }}>→ Voir le tracker</button>
                    <button onClick={handleGenerate} style={{
                      flex: 1, background: "transparent", color: "#6366f1", border: "1px solid #6366f1",
                      borderRadius: 8, padding: "10px", fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                    }}>↺ Régénérer</button>
                  </div>
                </>
              ) : (
                <div style={{ flex: 1, background: "#1e1e35", border: "1px dashed #2a2a45", borderRadius: 10, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, minHeight: 300, color: "#4a4870" }}>
                  <div style={{ fontSize: 40 }}>✦</div>
                  <p style={{ fontSize: 14, margin: 0, textAlign: "center", maxWidth: 200 }}>Votre email et lettre de motivation apparaîtront ici</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===== TRACKER TAB ===== */}
        {tab === "Tracker" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Add form */}
            <div style={{ background: "#1e1e35", border: "1px solid #2a2a45", borderRadius: 12, padding: 18 }}>
              <p style={{ margin: "0 0 14px", fontSize: 12, fontWeight: 600, color: "#8884a8", letterSpacing: 1, textTransform: "uppercase" }}>Ajouter une candidature</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr auto", gap: 10, alignItems: "end" }}>
                {[["company", "Entreprise", "Ex: Google"], ["role", "Poste", "Ex: UX Designer"]].map(([k, l, ph]) => (
                  <div key={k}>
                    <label style={{ fontSize: 11, color: "#6661a8", display: "block", marginBottom: 5 }}>{l}</label>
                    <input value={newApp[k]} onChange={e => setNewApp(p => ({ ...p, [k]: e.target.value }))}
                      placeholder={ph}
                      style={{ width: "100%", background: "#0c0c14", border: "1px solid #2a2a45", borderRadius: 8, color: "#e8e6f0", padding: "8px 12px", fontSize: 13, fontFamily: "'DM Sans', sans-serif", outline: "none", boxSizing: "border-box" }} />
                  </div>
                ))}
                <div>
                  <label style={{ fontSize: 11, color: "#6661a8", display: "block", marginBottom: 5 }}>Plateforme</label>
                  <select value={newApp.platform} onChange={e => setNewApp(p => ({ ...p, platform: e.target.value }))}
                    style={{ width: "100%", background: "#0c0c14", border: "1px solid #2a2a45", borderRadius: 8, color: "#e8e6f0", padding: "8px 12px", fontSize: 13, fontFamily: "'DM Sans', sans-serif", outline: "none" }}>
                    {PLATFORMS.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: "#6661a8", display: "block", marginBottom: 5 }}>Statut</label>
                  <select value={newApp.status} onChange={e => setNewApp(p => ({ ...p, status: e.target.value }))}
                    style={{ width: "100%", background: "#0c0c14", border: "1px solid #2a2a45", borderRadius: 8, color: "#e8e6f0", padding: "8px 12px", fontSize: 13, fontFamily: "'DM Sans', sans-serif", outline: "none" }}>
                    {STATUSES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <button onClick={addApplication} style={{
                  background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff", border: "none",
                  borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                  whiteSpace: "nowrap",
                }}>+ Ajouter</button>
              </div>
            </div>

            {/* Filter & export */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", gap: 6 }}>
                {["Tout", ...STATUSES].map(s => (
                  <button key={s} onClick={() => setFilterStatus(s)} style={{
                    background: filterStatus === s ? (STATUS_COLORS[s] || "#6366f1") : "#1e1e35",
                    color: filterStatus === s ? "#fff" : "#8884a8",
                    border: "1px solid " + (filterStatus === s ? (STATUS_COLORS[s] || "#6366f1") : "#2a2a45"),
                    borderRadius: 20, padding: "5px 12px", fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                  }}>{s} {s !== "Tout" && <span style={{ opacity: 0.7 }}>({applications.filter(a => a.status === s).length})</span>}</button>
                ))}
              </div>
              <button onClick={exportCSV} style={{
                background: "transparent", color: "#6366f1", border: "1px solid #6366f1",
                borderRadius: 8, padding: "7px 14px", fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
              }}>↓ Exporter CSV</button>
            </div>

            {/* Applications list */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {filtered.length === 0 && (
                <div style={{ textAlign: "center", color: "#4a4870", padding: "40px 0", fontSize: 14 }}>Aucune candidature pour ce filtre</div>
              )}
              {filtered.map(app => (
                <div key={app.id} style={{
                  background: "#1e1e35", border: "1px solid #2a2a45", borderRadius: 10,
                  padding: "14px 18px", display: "grid", gridTemplateColumns: "1fr 1fr 100px 110px 120px 36px",
                  gap: 12, alignItems: "center",
                }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{app.company}</div>
                    <div style={{ fontSize: 12, color: "#8884a8" }}>{app.role}</div>
                  </div>
                  <div style={{ fontSize: 12, color: "#8884a8" }}>{app.platform}</div>
                  <div style={{ fontSize: 12, color: "#6661a8" }}>{app.date}</div>
                  <select value={app.status} onChange={e => updateStatus(app.id, e.target.value)}
                    style={{
                      background: STATUS_COLORS[app.status] + "22",
                      color: STATUS_COLORS[app.status],
                      border: "1px solid " + STATUS_COLORS[app.status] + "44",
                      borderRadius: 20, padding: "5px 10px", fontSize: 12, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, outline: "none", cursor: "pointer",
                    }}>
                    {STATUSES.map(s => <option key={s} style={{ background: "#1e1e35", color: "#e8e6f0" }}>{s}</option>)}
                  </select>
                  <div style={{ fontSize: 12, color: "#6661a8" }}>{app.notes || "—"}</div>
                  <button onClick={() => deleteApp(app.id)} style={{
                    background: "transparent", color: "#4a4870", border: "none",
                    borderRadius: 6, padding: "4px 8px", fontSize: 16, cursor: "pointer",
                  }}>×</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== STATS TAB ===== */}
        {tab === "Stats" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            {/* KPIs */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[
                { label: "Total candidatures", value: total, icon: "📋" },
                { label: "Taux de succès", value: successRate + "%", icon: "🎯" },
                { label: "Entretiens", value: byStatus["Entretien"] || 0, icon: "💬" },
                { label: "Offres reçues", value: byStatus["Offre"] || 0, icon: "🏆" },
              ].map(({ label, value, icon }) => (
                <div key={label} style={{ background: "#1e1e35", border: "1px solid #2a2a45", borderRadius: 12, padding: 20, textAlign: "center" }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
                  <div style={{ fontSize: 28, fontFamily: "'Syne', sans-serif", fontWeight: 800, color: "#6366f1" }}>{value}</div>
                  <div style={{ fontSize: 12, color: "#8884a8", marginTop: 4 }}>{label}</div>
                </div>
              ))}
            </div>

            {/* By status */}
            <div style={{ background: "#1e1e35", border: "1px solid #2a2a45", borderRadius: 12, padding: 20 }}>
              <p style={{ margin: "0 0 16px", fontSize: 12, fontWeight: 600, color: "#8884a8", letterSpacing: 1, textTransform: "uppercase" }}>Par statut</p>
              {STATUSES.map(s => {
                const count = byStatus[s] || 0;
                const pct = total ? (count / total) * 100 : 0;
                return (
                  <div key={s} style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                      <span style={{ fontSize: 13, color: "#d4d0e8" }}>{s}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: STATUS_COLORS[s] }}>{count}</span>
                    </div>
                    <div style={{ background: "#0c0c14", borderRadius: 4, height: 6, overflow: "hidden" }}>
                      <div style={{ width: pct + "%", background: STATUS_COLORS[s], height: "100%", borderRadius: 4, transition: "width .5s" }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* By platform */}
            <div style={{ background: "#1e1e35", border: "1px solid #2a2a45", borderRadius: 12, padding: 20, gridColumn: "span 2" }}>
              <p style={{ margin: "0 0 16px", fontSize: 12, fontWeight: 600, color: "#8884a8", letterSpacing: 1, textTransform: "uppercase" }}>Par plateforme</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
                {PLATFORMS.map((p, i) => {
                  const count = byPlatform[p] || 0;
                  const colors = ["#6366f1", "#8b5cf6", "#10b981", "#f59e0b"];
                  return (
                    <div key={p} style={{ textAlign: "center", background: "#0c0c14", borderRadius: 10, padding: 16 }}>
                      <div style={{ fontSize: 26, fontFamily: "'Syne', sans-serif", fontWeight: 800, color: colors[i] }}>{count}</div>
                      <div style={{ fontSize: 12, color: "#8884a8", marginTop: 4 }}>{p}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
