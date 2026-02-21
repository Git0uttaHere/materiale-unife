(function () {
  "use strict";

  function esc(str) {
    const d = document.createElement("div");
    d.textContent = str;
    return d.innerHTML;
  }

  function transformDriveUrl(url) {
    if (!url) return "";
    if (url.includes("drive.google.com")) return url.replace("/view", "/preview");
    if (url.includes("youtube.com/watch")) return url.replace("watch?v=", "embed/");
    if (url.includes("youtu.be/")) {
      const id = url.split("youtu.be/")[1].split(/[?&]/)[0];
      return "https://www.youtube.com/embed/" + id;
    }
    return url;
  }

  // ── Video Section ──

  function initVideoSection(cfg) {
    const { videos, sectionEl, storageKey } = cfg;
    const player = sectionEl.querySelector(".video-player");
    const playlist = sectionEl.querySelector(".playlist");
    const positionEl = sectionEl.querySelector(".video-position");
    const prevBtn = sectionEl.querySelector(".prev-btn");
    const nextBtn = sectionEl.querySelector(".next-btn");
    const markBtn = sectionEl.querySelector(".mark-seen-btn");

    let currentIndex = 0;
    let seenIds = new Set();

    function loadSeen() {
      try {
        const raw = localStorage.getItem(storageKey);
        seenIds = raw ? new Set(JSON.parse(raw)) : new Set();
      } catch { seenIds = new Set(); }
    }

    function saveSeen() {
      try { localStorage.setItem(storageKey, JSON.stringify([...seenIds])); } catch {}
    }

    function renderPlaylist() {
      playlist.innerHTML = "";
      videos.forEach((video, index) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "playlist-item";
        if (video.type === "tutorato") btn.classList.add("tutorato");
        if (video.type === "lab") btn.classList.add("lab");
        if (index === currentIndex) btn.classList.add("active");
        if (seenIds.has(video.id) && index !== currentIndex) btn.classList.add("seen");

        const badgeMap = {
          lesson: { cls: "badge-lesson", label: "Lezione" },
          tutorato: { cls: "badge-tutorato", label: "Tutorato" },
          extra: { cls: "badge-extra", label: "Recupero" },
          lab: { cls: "badge-lab", label: "Lab" }
        };
        const b = badgeMap[video.type] || badgeMap.lesson;
        const seenLabel = seenIds.has(video.id) ? '<span class="seen-flag">✓ visto</span>' : "";

        btn.innerHTML = `
          <div class="playlist-thumbnail"><div class="play-icon">▶</div></div>
          <div class="playlist-meta">
            <div class="playlist-title">${esc(video.title)}</div>
            <div class="playlist-subtitle">
              <span>${esc(video.dateLabel)}</span>
              <span class="badge ${b.cls}">${b.label}</span>
              ${seenLabel}
            </div>
          </div>`;
        btn.addEventListener("click", () => loadVideo(index));
        playlist.appendChild(btn);
      });
    }

    function loadVideo(index) {
      if (index < 0 || index >= videos.length) return;
      currentIndex = index;
      player.src = transformDriveUrl(videos[index].url);
      positionEl.textContent = `${index + 1} / ${videos.length}`;
      renderPlaylist();
      const active = playlist.querySelector(".playlist-item.active");
      if (active) active.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }

    loadSeen();
    loadVideo(0);
    if (prevBtn) prevBtn.addEventListener("click", () => loadVideo(currentIndex - 1));
    if (nextBtn) nextBtn.addEventListener("click", () => loadVideo(currentIndex + 1));
    if (markBtn) markBtn.addEventListener("click", () => {
      const v = videos[currentIndex];
      if (v) { seenIds.add(v.id); saveSeen(); renderPlaylist(); }
    });
  }

  // ── Pomodoro ──

  function initPomodoro(prefix) {
    const DURATION = 25 * 60;
    const MAX = 8;
    let remaining = DURATION, running = false, completed = 0, interval = null;

    const sk = (k) => `${prefix}_${k}`;

    function dayId() {
      const now = new Date();
      const c = new Date(now.getTime());
      if (c.getHours() < 6) c.setDate(c.getDate() - 1);
      return `${c.getFullYear()}-${String(c.getMonth() + 1).padStart(2, "0")}-${String(c.getDate()).padStart(2, "0")}`;
    }

    function save() {
      localStorage.setItem(sk("pomodoroDayId"), dayId());
      localStorage.setItem(sk("pomodoroCompleted"), String(completed));
      localStorage.setItem(sk("pomodoroRemaining"), String(remaining));
      localStorage.setItem(sk("pomodoroIsRunning"), running ? "true" : "false");
      if (running) localStorage.setItem(sk("pomodoroLastUpdate"), String(Date.now()));
    }

    function load() {
      if (localStorage.getItem(sk("pomodoroDayId")) !== dayId()) {
        completed = 0; remaining = DURATION; running = false; save(); return;
      }
      completed = parseInt(localStorage.getItem(sk("pomodoroCompleted")) || "0", 10);
      remaining = parseInt(localStorage.getItem(sk("pomodoroRemaining")) || String(DURATION), 10);
      running = localStorage.getItem(sk("pomodoroIsRunning")) === "true";
      if (running) {
        const last = parseInt(localStorage.getItem(sk("pomodoroLastUpdate")) || "0", 10);
        if (last > 0) {
          remaining = Math.max(0, remaining - Math.floor((Date.now() - last) / 1000));
          if (remaining === 0) running = false;
        }
      }
    }

    function fmt(s) {
      return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
    }

    function updateUI() {
      const timerEl = document.getElementById("pomodoro-timer");
      const btn = document.getElementById("startPauseBtn");
      const countEl = document.getElementById("pomodoro-count");
      const dotsEl = document.getElementById("pomodoro-dots");
      if (!timerEl) return;
      timerEl.textContent = fmt(remaining);
      btn.innerHTML = running ? "⏸ Pausa" : "▶ Avvia";
      countEl.textContent = `${completed} / ${MAX} pomodori`;
      dotsEl.innerHTML = "";
      for (let i = 0; i < MAX; i++) {
        const dot = document.createElement("div");
        dot.className = "pomodoro-dot" + (i < completed ? " done" : "");
        dotsEl.appendChild(dot);
      }
    }

    function tick() {
      if (!running) return;
      remaining--;
      if (remaining <= 0) {
        remaining = 0; running = false;
        completed = Math.min(MAX, completed + 1);
      }
      save(); updateUI();
    }

    function startInterval() {
      if (interval) clearInterval(interval);
      interval = setInterval(tick, 1000);
    }

    load(); updateUI();
    if (running) startInterval();

    document.getElementById("startPauseBtn").addEventListener("click", () => {
      if (completed >= MAX) return;
      running = !running;
      if (running) { localStorage.setItem(sk("pomodoroLastUpdate"), String(Date.now())); startInterval(); }
      else { if (interval) clearInterval(interval); }
      save(); updateUI();
    });

    document.getElementById("resetPomodoroBtn").addEventListener("click", () => {
      running = false; remaining = DURATION;
      if (interval) clearInterval(interval);
      save(); updateUI();
    });

    document.getElementById("resetDayBtn").addEventListener("click", () => {
      running = false; completed = 0; remaining = DURATION;
      if (interval) clearInterval(interval);
      save(); updateUI();
    });
  }

  // ── Material Preview ──

  function initMaterialPreview(sectionEl) {
    const preview = sectionEl.querySelector(".material-preview");
    const info = sectionEl.querySelector(".material-info");
    if (!preview || !info) return;

    sectionEl.querySelectorAll(".resource-card").forEach((card) => {
      card.addEventListener("click", (e) => {
        if (e.target.closest(".resource-open")) return;
        const url = card.dataset.url || "";
        const title = card.dataset.title || "File";
        const date = card.dataset.date || "N/D";
        const noPreview = card.dataset.noPreview === "true";

        if (noPreview) {
          preview.src = "";
          info.textContent = `${title} · anteprima non disponibile (apri con ↗)`;
          return;
        }
        preview.src = transformDriveUrl(url);
        info.textContent = `${title} · ${date}`;
      });
    });
  }

  // ── Renderers ──

  function renderHeader(data) {
    const header = document.getElementById("app-header");
    header.innerHTML = `
      <div>
        <div style="margin-bottom:4px"><a href="index.html" class="back-link">◀ Tutte le materie</a></div>
        <h1>${esc(data.title)}</h1>
        ${data.subtitle ? `<div class="subtitle">${esc(data.subtitle)}</div>` : ""}
      </div>
      <div class="tag">Modalità deep work</div>`;
  }

  function renderVideoSection(section) {
    const el = document.createElement("section");
    el.className = "card video-section";
    el.innerHTML = `
      <div class="card-header">
        <div>
          <h2>${esc(section.title)}</h2>
          <span>${esc(section.subtitle)}</span>
        </div>
      </div>
      <div class="card-body">
        <div class="video-player-wrapper">
          <div class="video-iframe-container">
            <iframe class="video-player" src="" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
          </div>
          <div class="video-hint">
            <strong>Nota:</strong> i video sono su Google Drive. Devi essere loggato con l'account abilitato per poterli riprodurre. Usa il tasto del player per il <strong>full screen</strong>.
          </div>
        </div>
        <div class="video-controls-row">
          <div class="video-nav">
            <button class="nav-btn prev-btn" aria-label="Video precedente">◀</button>
            <span class="video-position">1 / ${section.videos.length}</span>
            <button class="nav-btn next-btn" aria-label="Video successivo">▶</button>
          </div>
          <button class="btn btn-small mark-seen-btn">✓ Segna come visto</button>
        </div>
        <div class="playlist"></div>
      </div>`;
    return el;
  }

  function renderResourceCard(res) {
    const card = document.createElement("div");
    card.className = "resource-card";
    card.dataset.url = res.url;
    card.dataset.title = res.title;
    card.dataset.date = res.date || "N/D";
    card.dataset.type = res.type || "";
    if (res.noPreview) card.dataset.noPreview = "true";

    card.innerHTML = `
      <div class="resource-icon ${esc(res.iconClass || "ext-pdf")}">${esc(res.icon || "PDF")}</div>
      <div class="resource-content">
        <div class="resource-header">
          <div class="resource-title">${esc(res.title)}</div>
          <a class="resource-open" href="${esc(res.url)}" target="_blank" rel="noopener" title="Apri">↗</a>
        </div>
        <div class="resource-meta">
          <span class="resource-pill">${esc(res.type || "")}</span>
          <span class="resource-date">${esc(res.date || "N/D")}</span>
        </div>
      </div>`;
    return card;
  }

  function renderMaterialSection(section) {
    const el = document.createElement("section");
    el.className = "card notes-section";
    el.id = section.id;

    let groupsHtml = "";
    for (const group of section.groups) {
      groupsHtml += `
        <div class="notes-group">
          <div class="notes-group-title">
            <h3>${esc(group.title)}</h3>
            <span>${esc(group.subtitle)}</span>
          </div>
          <div class="resources-grid" data-group-id="${esc(group.title)}"></div>
        </div>`;
    }

    el.innerHTML = `
      <div class="card-header">
        <div>
          <h2>${esc(section.title)}</h2>
          <span>${esc(section.subtitle)}</span>
        </div>
      </div>
      <div class="card-body">
        <div class="material-preview-wrapper">
          <div class="material-iframe-container">
            <iframe class="material-preview" src="" allow="fullscreen"></iframe>
          </div>
          <div class="material-hint">
            <span><strong>Anteprima materiale</strong> · clicca una card nella griglia per vedere il file qui sopra.</span>
            <span class="material-info">Nessun file selezionato.</span>
          </div>
        </div>
        ${groupsHtml}
      </div>`;

    section.groups.forEach((group) => {
      const grid = el.querySelector(`[data-group-id="${group.title}"]`);
      if (grid) {
        group.resources.forEach((res) => grid.appendChild(renderResourceCard(res)));
      }
    });

    return el;
  }

  function renderNotes(notes) {
    if (!notes || notes.length === 0) return null;
    const wrapper = document.createElement("div");
    wrapper.className = "notes-group";
    wrapper.innerHTML = `
      <div class="notes-group-title">
        <h3>3. Note</h3>
        <span>Domande/risposte riportate dal corso</span>
      </div>`;

    const container = document.createElement("div");
    container.style.cssText = "display:flex; flex-direction:column; gap:10px; font-size:0.85rem; color: var(--text); line-height:1.45;";

    for (const note of notes) {
      const card = document.createElement("div");
      card.className = "note-card";
      let html = `<div class="note-card-title">${esc(note.title)}</div>`;
      for (const entry of note.entries) {
        html += `<div><strong>${esc(entry.author)}</strong> · ${esc(entry.date)}</div>`;
        html += `<div class="note-entry-text">${entry.text}</div>`;
      }
      card.innerHTML = html;
      container.appendChild(card);
    }
    wrapper.appendChild(container);
    return wrapper;
  }

  function renderPomodoro(prefix) {
    const el = document.createElement("section");
    el.className = "card pomodoro-section";
    el.innerHTML = `
      <div class="card-header">
        <div>
          <h2>Timer Pomodoro</h2>
          <span>25 minuti · 8 pomodori · reset automatico alle 06:00 (ora locale)</span>
        </div>
      </div>
      <div class="card-body">
        <div id="pomodoro-timer" class="pomodoro-timer">25:00</div>
        <div class="pomodoro-controls">
          <button id="startPauseBtn" class="btn btn-primary">▶ Avvia</button>
          <button id="resetPomodoroBtn" class="btn btn-small">↺ Reset pomodoro</button>
          <button id="resetDayBtn" class="btn btn-small btn-danger">✕ Reset giornata</button>
        </div>
        <div class="pomodoro-progress">
          <div id="pomodoro-count">0 / 8 pomodori</div>
          <div id="pomodoro-dots" class="pomodoro-dots"></div>
        </div>
        <div class="pomodoro-info">
          Ogni <strong>pomodoro</strong> sono 25 minuti di concentrazione totale (niente telefono, niente notifiche).
          Dopo ogni pomodoro fai una <strong>pausa breve di 5 minuti</strong>; dopo 4 pomodori consecutivi, pausa più lunga di 15–20 minuti.
        </div>
      </div>`;
    return el;
  }

  function renderWalkthrough(wt) {
    if (!wt) return null;
    const el = document.createElement("section");
    el.className = "card walkthrough-section";
    let stepsHtml = "";
    for (const step of wt.steps) {
      const items = step.items.map((i) => `<li>${i}</li>`).join("");
      stepsHtml += `<li><strong>${step.title}</strong><ul>${items}</ul></li>`;
    }
    el.innerHTML = `
      <div class="card-header">
        <div>
          <h2>${esc(wt.title)}</h2>
          <span>${esc(wt.subtitle)}</span>
        </div>
      </div>
      <div class="card-body"><ol>${stepsHtml}</ol></div>`;
    return el;
  }

  // ── Main ──

  async function main() {
    const params = new URLSearchParams(window.location.search);
    const course = params.get("course");
    if (!course) {
      window.location.href = "index.html";
      return;
    }

    let data;
    try {
      const resp = await fetch(`data/${course}.json`);
      if (!resp.ok) throw new Error(resp.statusText);
      data = await resp.json();
    } catch (err) {
      document.getElementById("app-main").innerHTML =
        `<div class="card" style="padding:24px;text-align:center;">Corso non trovato: <strong>${esc(course)}</strong><br><a href="index.html">Torna alla home</a></div>`;
      return;
    }

    document.title = data.title + " - Dashboard Studio";
    renderHeader(data);

    const main = document.getElementById("app-main");

    for (const vs of data.videoSections) {
      const el = renderVideoSection(vs);
      main.appendChild(el);
      initVideoSection({ videos: vs.videos, sectionEl: el, storageKey: vs.storageKey });
    }

    main.appendChild(renderPomodoro(data.storagePrefix));
    initPomodoro(data.storagePrefix);

    for (const ms of data.materialSections) {
      const el = renderMaterialSection(ms);
      main.appendChild(el);
      initMaterialPreview(el);

      if (data.notes && data.notes.length > 0 && ms === data.materialSections[data.materialSections.length - 1]) {
        const notesEl = renderNotes(data.notes);
        if (notesEl) el.querySelector(".card-body").appendChild(notesEl);
      }
    }

    const wtEl = renderWalkthrough(data.walkthrough);
    if (wtEl) main.appendChild(wtEl);
  }

  document.addEventListener("DOMContentLoaded", main);
})();
