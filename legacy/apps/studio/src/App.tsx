import { Film, FolderOpen, Play, Sparkles } from "lucide-react";

const tasks = ["Scene-based project format", "Remotion demo composition", "GitHub Actions MP4 rendering"];

export default function App() {
  return (
    <main className="shell">
      <header className="topbar">
        <a className="brand" href="/">
          <span className="brand-mark"><Film size={18} /></span>
          <span>AI Video Studio</span><span className="version">M1</span>
        </a>
        <span className="topbar-meta"><i className="status-dot" /> Render engine foundation</span>
      </header>
      <section className="workspace">
        <div className="intro">
          <div className="eyebrow"><Sparkles size={14} /> PROMPT-DRIVEN VIDEO CREATION</div>
          <h1>Turn an idea into a video.</h1>
          <p>Describe what you want to create. Build scenes, preview the composition, and render an MP4 in the cloud.</p>
        </div>
        <section className="prompt-panel">
          <div className="panel-heading">
            <div><span className="panel-kicker">NEW PROJECT</span><h2>What should we create?</h2></div>
            <span className="cloud-label"><i className="status-dot" /> GitHub Actions renderer</span>
          </div>
          <textarea aria-label="Video prompt" placeholder="A 10-second animated explainer showing how the internet works, with clean typography, connected nodes, and smooth transitions..." rows={5} disabled />
          <div className="prompt-footer">
            <span>Prompt-to-project generation arrives in a later milestone.</span>
            <button type="button" disabled><Play size={15} /> Generate video</button>
          </div>
        </section>
        <div className="section-heading">
          <div><span className="panel-kicker">MILESTONE 01</span><h2>Render engine foundation</h2></div>
          <span className="milestone-state">In progress</span>
        </div>
        <section className="milestone-list">
          {tasks.map((task, index) => (
            <div className="milestone-row" key={task}>
              <span className="step-number">0{index + 1}</span>
              <span className="milestone-name">{task}</span>
              <span className="milestone-status">{index === 0 ? "Defined" : "To verify"}</span>
            </div>
          ))}
        </section>
        <section className="empty-project">
          <div className="empty-icon"><FolderOpen size={20} /></div>
          <div><strong>No rendered videos yet</strong><p>Your first MP4 will appear as a downloadable Actions artifact.</p></div>
        </section>
      </section>
    </main>
  );
}
