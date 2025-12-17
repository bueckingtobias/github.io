/* Gym Dashboard – Push/Pull/Legs
   - localStorage persistence
   - Session Builder (exercises + sets)
   - Save sessions to history
   - Chart: total tonnage over time
   - PDF Export per current session (html2pdf)
*/

(function () {
  "use strict";

  const STORAGE_KEY = "tg_gym_dashboard_v1";

  // ---------- Defaults ----------
  const DEFAULT_SPLITS = {
    push: {
      title: "Push",
      targetExercises: 6,
      exercises: [
        "Bankdrücken (Langhantel)",
        "Schrägbank Kurzhantel",
        "Schulterdrücken",
        "Seitheben",
        "Trizeps Pushdown",
        "Dips (assistiert/gewichtet)"
      ]
    },
    pull: {
      title: "Pull",
      targetExercises: 6,
      exercises: [
        "Klimmzug / Latzug",
        "Rudern (Kabel/Brustgestützt)",
        "Lat Pulldown eng",
        "Face Pulls",
        "Bizepscurls (Kurzhantel)",
        "Hammercurls"
      ]
    },
    legs: {
      title: "Beine",
      targetExercises: 5,
      exercises: [
        "Kniebeugen / Hack Squat",
        "Beinpresse",
        "Beinstrecker",
        "Beinbeuger",
        "Wadenheben"
      ]
    }
  };

  // ---------- DOM ----------
  const el = (id) => document.getElementById(id);

  const tabPush = el("tabPush");
  const tabPull = el("tabPull");
  const tabLegs = el("tabLegs");

  const inputBodyweight = el("inputBodyweight");
  const inputNote = el("inputNote");

  const btnStampStart = el("btnStampStart");
  const btnStampEnd = el("btnStampEnd");

  const metaStart = el("metaStart");
  const metaEnd = el("metaEnd");
  const metaDuration = el("metaDuration");

  const workoutTitle = el("workoutTitle");
  const workoutTbody = el("workoutTbody");

  const btnAddExercise = el("btnAddExercise");
  const btnResetCurrent = el("btnResetCurrent");
  const btnSaveSession = el("btnSaveSession");
  const btnPdf = el("btnPdf");

  const kpiSets = el("kpiSets");
  const kpiReps = el("kpiReps");
  const kpiTonnage = el("kpiTonnage");

  const pillStorage = el("pillStorage");
  const pillSessions = el("pillSessions");

  const historyList = el("historyList");

  const btnFilterAll = el("btnFilterAll");
  const btnFilterPush = el("btnFilterPush");
  const btnFilterPull = el("btnFilterPull");
  const btnFilterLegs = el("btnFilterLegs");

  const btnExportJson = el("btnExportJson");
  const fileImportJson = el("fileImportJson");
  const btnResetAll = el("btnResetAll");

  // PDF elements
  const pdfArea = el("pdfArea");
  const pdfSub = el("pdfSub");
  const pdfSplit = el("pdfSplit");
  const pdfBw = el("pdfBw");
  const pdfStart = el("pdfStart");
  const pdfEnd = el("pdfEnd");
  const pdfDur = el("pdfDur");
  const pdfTon = el("pdfTon");
  const pdfNote = el("pdfNote");
  const pdfTbody = el("pdfTbody");

  // ---------- State ----------
  let state = loadState();

  // current view filter for history
  let historyFilter = "all";

  // Chart
  let chart = null;

  // ---------- Init ----------
  function init() {
    // tabs
    tabPush.addEventListener("click", () => setSplit("push"));
    tabPull.addEventListener("click", () => setSplit("pull"));
    tabLegs.addEventListener("click", () => setSplit("legs"));

    btnStampStart.addEventListener("click", stampStart);
    btnStampEnd.addEventListener("click", stampEnd);

    inputBodyweight.addEventListener("input", () => {
      state.current.bodyweightKg = toNum(inputBodyweight.value);
      persist();
      renderKPIs();
    });

    inputNote.addEventListener("input", () => {
      state.current.note = String(inputNote.value || "");
      persist();
    });

    btnAddExercise.addEventListener("click", addExercise);
    btnResetCurrent.addEventListener("click", resetCurrentSession);
    btnSaveSession.addEventListener("click", saveSessionToHistory);
    btnPdf.addEventListener("click", exportPdf);

    btnFilterAll.addEventListener("click", () => { historyFilter = "all"; renderHistory(); renderChart(); });
    btnFilterPush.addEventListener("click", () => { historyFilter = "push"; renderHistory(); renderChart(); });
    btnFilterPull.addEventListener("click", () => { historyFilter = "pull"; renderHistory(); renderChart(); });
    btnFilterLegs.addEventListener("click", () => { historyFilter = "legs"; renderHistory(); renderChart(); });

    btnExportJson.addEventListener("click", exportJsonBackup);
    fileImportJson.addEventListener("change", importJsonBackup);
    btnResetAll.addEventListener("click", resetAllData);

    // initial render
    hydrateHeaderPills();
    setSplit(state.current.split || "push", { silent: true });
    hydrateSessionInputs();
    renderWorkoutTable();
    renderKPIs();
    renderHistory();
    renderChart();

    // update duration every second if started and not ended
    setInterval(() => {
      if (state.current.startAt && !state.current.endAt) {
        metaDuration.textContent = formatDurationMs(Date.now() - state.current.startAt);
      }
    }, 1000);
  }

  // ---------- Persistence ----------
  function loadState() {
    const blank = {
      version: 1,
      current: buildFreshSession("push"),
      sessions: [] // history
    };

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return blank;

      const parsed = JSON.parse(raw);

      // basic shape validation
      if (!parsed || typeof parsed !== "object") return blank;
      if (!parsed.current || !parsed.sessions) return blank;

      // migrate or ensure defaults
      parsed.current = normalizeSession(parsed.current);
      parsed.sessions = Array.isArray(parsed.sessions) ? parsed.sessions.map(normalizeSession).filter(Boolean) : [];

      return parsed;
    } catch {
      return blank;
    }
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      hydrateHeaderPills();
    } catch (e) {
      // storage full / blocked
      pillStorage.textContent = "Storage: ERROR";
    }
  }

  function hydrateHeaderPills() {
    const ok = storageAvailable();
    pillStorage.textContent = ok ? "Storage: localStorage ✓" : "Storage: nicht verfügbar";
    pillSessions.textContent = `Sessions: ${state.sessions.length}`;
  }

  function storageAvailable() {
    try {
      const t = "__tg_test__";
      localStorage.setItem(t, "1");
      localStorage.removeItem(t);
      return true;
    } catch {
      return false;
    }
  }

  // ---------- Session Builders ----------
  function buildFreshSession(splitKey) {
    const splitDef = DEFAULT_SPLITS[splitKey] || DEFAULT_SPLITS.push;

    return normalizeSession({
      id: uid(),
      split: splitKey,
      bodyweightKg: null,
      note: "",
      startAt: null,
      endAt: null,
      exercises: splitDef.exercises.map((name) => ({
        id: uid(),
        name,
        sets: [
          // start with 1 empty set row per exercise to reduce taps
          { id: uid(), reps: null, weight: null }
        ]
      }))
    });
  }

  function normalizeSession(s) {
    if (!s || typeof s !== "object") return null;

    return {
      id: String(s.id || uid()),
      split: (s.split === "push" || s.split === "pull" || s.split === "legs") ? s.split : "push",
      bodyweightKg: (s.bodyweightKg === null || s.bodyweightKg === undefined) ? null : toNum(s.bodyweightKg),
      note: String(s.note || ""),
      startAt: (s.startAt ? Number(s.startAt) : null),
      endAt: (s.endAt ? Number(s.endAt) : null),
      exercises: Array.isArray(s.exercises) ? s.exercises.map((ex) => ({
        id: String(ex.id || uid()),
        name: String(ex.name || "Übung"),
        sets: Array.isArray(ex.sets) ? ex.sets.map((st) => ({
          id: String(st.id || uid()),
          reps: (st.reps === null || st.reps === undefined) ? null : toNum(st.reps),
          weight: (st.weight === null || st.weight === undefined) ? null : toNum(st.weight)
        })) : [{ id: uid(), reps: null, weight: null }]
      })) : []
    };
  }

  function setSplit(splitKey, opts = {}) {
    state.current.split = splitKey;

    // if switching split and current is basically empty, auto-load defaults
    // (keeps current work if user already typed)
    if (opts.silent) {
      // do nothing special
    }

    setTabsActive(splitKey);
    workoutTitle.textContent = DEFAULT_SPLITS[splitKey].title;

    // If current exercises mismatch target count and have no meaningful data, rebuild
    if (!opts.silent && shouldAutoRebuildForSplit(splitKey)) {
      state.current = buildFreshSession(splitKey);
      hydrateSessionInputs();
    }

    persist();
    renderWorkoutTable();
    renderKPIs();
  }

  function setTabsActive(splitKey) {
    [tabPush, tabPull, tabLegs].forEach(b => b.classList.remove("active"));
    if (splitKey === "push") tabPush.classList.add("active");
    if (splitKey === "pull") tabPull.classList.add("active");
    if (splitKey === "legs") tabLegs.classList.add("active");
  }

  function shouldAutoRebuildForSplit(splitKey) {
    // if user already entered meaningful set data, don't nuke it
    const hasData = state.current.exercises.some(ex =>
      ex.sets.some(st => (toNum(st.reps) > 0) || (toNum(st.weight) > 0))
    );
    if (hasData) return false;

    // if split changed or exercise count doesn't match desired, rebuild
    const target = DEFAULT_SPLITS[splitKey].targetExercises;
    const count = state.current.exercises.length;
    if (state.current.split !== splitKey) return true;
    if (count !== target) return true;

    return false;
  }

  function hydrateSessionInputs() {
    inputBodyweight.value = state.current.bodyweightKg ?? "";
    inputNote.value = state.current.note ?? "";

    metaStart.textContent = state.current.startAt ? formatDateTime(state.current.startAt) : "—";
    metaEnd.textContent = state.current.endAt ? formatDateTime(state.current.endAt) : "—";

    if (state.current.startAt && state.current.endAt) {
      metaDuration.textContent = formatDurationMs(state.current.endAt - state.current.startAt);
    } else if (state.current.startAt && !state.current.endAt) {
      metaDuration.textContent = formatDurationMs(Date.now() - state.current.startAt);
    } else {
      metaDuration.textContent = "—";
    }
  }

  // ---------- Stamping ----------
  function stampStart() {
    state.current.startAt = Date.now();
    state.current.endAt = null; // reset end if restamped
    persist();
    hydrateSessionInputs();
  }

  function stampEnd() {
    if (!state.current.startAt) state.current.startAt = Date.now();
    state.current.endAt = Date.now();
    persist();
    hydrateSessionInputs();
  }

  // ---------- Workout Table Rendering ----------
  function renderWorkoutTable() {
    workoutTbody.innerHTML = "";

    state.current.exercises.forEach((ex, exIdx) => {
      const tr = document.createElement("tr");

      // Exercise Name + inline actions
      const tdEx = document.createElement("td");
      tdEx.className = "col-ex";
      tdEx.innerHTML = `
        <div class="ex-name">
          <input type="text" value="${escapeHtml(ex.name)}" data-role="ex-name" data-exid="${ex.id}" placeholder="Übung" />
          <div class="small-actions">
            <button class="btn btn-ghost" data-role="add-set" data-exid="${ex.id}">Satz +</button>
            <button class="btn btn-ghost" data-role="dup-ex" data-exid="${ex.id}">Dupl.</button>
            <button class="btn btn-danger" data-role="del-ex" data-exid="${ex.id}">Löschen</button>
          </div>
        </div>
      `;
      tr.appendChild(tdEx);

      // Sets
      const tdSets = document.createElement("td");
      tdSets.className = "col-sets";
      const setsWrap = document.createElement("div");
      setsWrap.className = "sets";

      ex.sets.forEach((st, setIdx) => {
        const row = document.createElement("div");
        row.className = "set-row";
        row.innerHTML = `
          <input type="number" min="0" step="1" placeholder="Reps"
                 data-role="set-reps" data-exid="${ex.id}" data-setid="${st.id}" value="${st.reps ?? ""}" />
          <input type="number" min="0" step="0.5" placeholder="Gewicht"
                 data-role="set-weight" data-exid="${ex.id}" data-setid="${st.id}" value="${st.weight ?? ""}" />
          <div class="badge-ton" title="Reps × Gewicht" data-role="set-ton" data-exid="${ex.id}" data-setid="${st.id}">
            ${formatKg(calcSetTonnage(st))}
          </div>
          <div class="icon-btn danger" title="Satz löschen" data-role="del-set" data-exid="${ex.id}" data-setid="${st.id}">×</div>
        `;
        setsWrap.appendChild(row);
      });

      tdSets.appendChild(setsWrap);
      tr.appendChild(tdSets);

      // Exercise tonnage
      const tdTon = document.createElement("td");
      tdTon.className = "col-tonnage";
      tdTon.innerHTML = `<span class="badge-ton" data-role="ex-ton" data-exid="${ex.id}">${formatKg(calcExerciseTonnage(ex))}</span>`;
      tr.appendChild(tdTon);

      // row actions placeholder
      const tdA = document.createElement("td");
      tdA.className = "col-actions";
      tdA.innerHTML = `<span class="tag ${state.current.split}">${(state.current.split || "push").toUpperCase()}</span>`;
      tr.appendChild(tdA);

      workoutTbody.appendChild(tr);
    });

    // delegate inputs + buttons
    workoutTbody.querySelectorAll('input[data-role="ex-name"]').forEach(inp => {
      inp.addEventListener("input", (e) => {
        const exid = e.target.dataset.exid;
        const ex = findExercise(exid);
        if (!ex) return;
        ex.name = String(e.target.value || "");
        persist();
        // no need full rerender
        renderKPIs();
      });
    });

    workoutTbody.querySelectorAll('input[data-role="set-reps"]').forEach(inp => {
      inp.addEventListener("input", onSetChange);
    });

    workoutTbody.querySelectorAll('input[data-role="set-weight"]').forEach(inp => {
      inp.addEventListener("input", onSetChange);
    });

    workoutTbody.querySelectorAll('button[data-role="add-set"]').forEach(btn => {
      btn.addEventListener("click", () => {
        const exid = btn.dataset.exid;
        const ex = findExercise(exid);
        if (!ex) return;
        ex.sets.push({ id: uid(), reps: null, weight: null });
        persist();
        renderWorkoutTable();
        renderKPIs();
      });
    });

    workoutTbody.querySelectorAll('button[data-role="dup-ex"]').forEach(btn => {
      btn.addEventListener("click", () => {
        const exid = btn.dataset.exid;
        const ex = findExercise(exid);
        if (!ex) return;

        const clone = {
          id: uid(),
          name: ex.name + " (Copy)",
          sets: ex.sets.map(st => ({
            id: uid(),
            reps: st.reps,
            weight: st.weight
          }))
        };
        state.current.exercises.splice(indexOfExercise(exid) + 1, 0, clone);
        persist();
        renderWorkoutTable();
        renderKPIs();
      });
    });

    workoutTbody.querySelectorAll('button[data-role="del-ex"]').forEach(btn => {
      btn.addEventListener("click", () => {
        const exid = btn.dataset.exid;
        const idx = indexOfExercise(exid);
        if (idx < 0) return;
        state.current.exercises.splice(idx, 1);
        persist();
        renderWorkoutTable();
        renderKPIs();
      });
    });

    workoutTbody.querySelectorAll('div[data-role="del-set"]').forEach(btn => {
      btn.addEventListener("click", () => {
        const exid = btn.dataset.exid;
        const setid = btn.dataset.setid;
        const ex = findExercise(exid);
        if (!ex) return;
        const si = ex.sets.findIndex(s => s.id === setid);
        if (si < 0) return;
        ex.sets.splice(si, 1);
        if (ex.sets.length === 0) ex.sets.push({ id: uid(), reps: null, weight: null });
        persist();
        renderWorkoutTable();
        renderKPIs();
      });
    });
  }

  function onSetChange(e) {
    const exid = e.target.dataset.exid;
    const setid = e.target.dataset.setid;

    const ex = findExercise(exid);
    if (!ex) return;

    const st = ex.sets.find(s => s.id === setid);
    if (!st) return;

    if (e.target.dataset.role === "set-reps") st.reps = toNum(e.target.value);
    if (e.target.dataset.role === "set-weight") st.weight = toNum(e.target.value);

    persist();

    // update badges without full rerender
    updateComputedBadges(exid, setid);
    renderKPIs();
  }

  function updateComputedBadges(exid, setid) {
    const ex = findExercise(exid);
    if (!ex) return;
    const st = ex.sets.find(s => s.id === setid);

    const setTonEl = workoutTbody.querySelector(`div[data-role="set-ton"][data-exid="${cssEsc(exid)}"][data-setid="${cssEsc(setid)}"]`);
    if (setTonEl && st) setTonEl.textContent = formatKg(calcSetTonnage(st));

    const exTonEl = workoutTbody.querySelector(`span[data-role="ex-ton"][data-exid="${cssEsc(exid)}"]`);
    if (exTonEl) exTonEl.textContent = formatKg(calcExerciseTonnage(ex));
  }

  // ---------- Actions ----------
  function addExercise() {
    const max = 50;
    if (state.current.exercises.length >= max) return;

    state.current.exercises.push({
      id: uid(),
      name: "Neue Übung",
      sets: [{ id: uid(), reps: null, weight: null }]
    });

    persist();
    renderWorkoutTable();
    renderKPIs();
  }

  function resetCurrentSession() {
    const splitKey = state.current.split || "push";
    state.current = buildFreshSession(splitKey);
    persist();
    hydrateSessionInputs();
    renderWorkoutTable();
    renderKPIs();
  }

  function saveSessionToHistory() {
    // Ensure start/end
    if (!state.current.startAt) state.current.startAt = Date.now();
    if (!state.current.endAt) state.current.endAt = Date.now();

    // compute summary snapshot
    const summary = computeSessionSummary(state.current);

    const copy = JSON.parse(JSON.stringify(state.current));
    copy.summary = summary;

    state.sessions.push(copy);

    // start fresh for same split
    const splitKey = state.current.split || "push";
    state.current = buildFreshSession(splitKey);

    persist();
    hydrateSessionInputs();
    renderWorkoutTable();
    renderKPIs();
    renderHistory();
    renderChart();
  }

  // ---------- KPIs ----------
  function renderKPIs() {
    const sum = computeSessionSummary(state.current);
    kpiSets.textContent = String(sum.totalSets);
    kpiReps.textContent = String(sum.totalReps);
    kpiTonnage.textContent = formatKg(sum.totalTonnageKg);
  }

  function computeSessionSummary(session) {
    let totalSets = 0;
    let totalReps = 0;
    let totalTonnageKg = 0;

    session.exercises.forEach(ex => {
      ex.sets.forEach(st => {
        const reps = toNum(st.reps);
        const w = toNum(st.weight);
        const ton = (reps > 0 && w > 0) ? (reps * w) : 0;

        // count set only if any meaningful entry
        if (reps > 0 || w > 0) totalSets += 1;

        totalReps += Math.max(0, reps);
        totalTonnageKg += ton;
      });
    });

    return {
      totalSets,
      totalReps,
      totalTonnageKg: round2(totalTonnageKg)
    };
  }

  function calcSetTonnage(st) {
    const reps = toNum(st.reps);
    const w = toNum(st.weight);
    return round2((reps > 0 && w > 0) ? reps * w : 0);
  }

  function calcExerciseTonnage(ex) {
    return round2(ex.sets.reduce((a, st) => a + calcSetTonnage(st), 0));
  }

  // ---------- History ----------
  function renderHistory() {
    historyList.innerHTML = "";

    const sessions = getFilteredSessions();

    sessions
      .slice()
      .sort((a, b) => (b.endAt || 0) - (a.endAt || 0))
      .forEach((s) => {
        const sum = s.summary || computeSessionSummary(s);
        const title = `${DEFAULT_SPLITS[s.split].title} · ${formatDateTime(s.endAt || s.startAt || Date.now())}`;

        const dur = (s.startAt && s.endAt) ? formatDurationMs(s.endAt - s.startAt) : "—";
        const bw = (s.bodyweightKg ?? null) ? `${round1(s.bodyweightKg)} kg` : "—";

        const item = document.createElement("div");
        item.className = "item";

        item.innerHTML = `
          <div class="item-left">
            <div class="item-title">
              <span>${escapeHtml(title)}</span>
              <span class="tag ${s.split}">${(s.split || "push").toUpperCase()}</span>
            </div>
            <div class="item-sub">
              Sets ${sum.totalSets} · Reps ${sum.totalReps} · Tonnage ${formatKg(sum.totalTonnageKg)} · BW ${bw} · Dauer ${dur}
            </div>
          </div>
          <div class="item-right">
            <div class="badge-ton">${formatKg(sum.totalTonnageKg)} kg</div>
            <div class="item-btns">
              <button class="btn btn-ghost" data-role="load" data-id="${s.id}">Laden</button>
              <button class="btn btn-ghost" data-role="pdf" data-id="${s.id}">PDF</button>
              <button class="btn btn-danger" data-role="del" data-id="${s.id}">Löschen</button>
            </div>
          </div>
        `;

        historyList.appendChild(item);
      });

    historyList.querySelectorAll('button[data-role="load"]').forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.id;
        const s = state.sessions.find(x => x.id === id);
        if (!s) return;
        // load into current editor (deep copy)
        state.current = normalizeSession(JSON.parse(JSON.stringify(s)));
        // keep summary in history; current doesn't need it
        delete state.current.summary;
        persist();
        setSplit(state.current.split, { silent: true });
        hydrateSessionInputs();
        renderWorkoutTable();
        renderKPIs();
      });
    });

    historyList.querySelectorAll('button[data-role="del"]').forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.id;
        const idx = state.sessions.findIndex(x => x.id === id);
        if (idx < 0) return;
        state.sessions.splice(idx, 1);
        persist();
        renderHistory();
        renderChart();
      });
    });

    historyList.querySelectorAll('button[data-role="pdf"]').forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        const s = state.sessions.find(x => x.id === id);
        if (!s) return;
        await exportPdfForSession(s);
      });
    });
  }

  function getFilteredSessions() {
    if (historyFilter === "all") return state.sessions;
    return state.sessions.filter(s => s.split === historyFilter);
  }

  // ---------- Chart ----------
  function renderChart() {
    const sessions = getFilteredSessions()
      .slice()
      .sort((a, b) => (a.endAt || 0) - (b.endAt || 0));

    const labels = sessions.map(s => {
      const t = s.endAt || s.startAt || Date.now();
      return formatDateShort(t);
    });

    const data = sessions.map(s => {
      const sum = s.summary || computeSessionSummary(s);
      return sum.totalTonnageKg;
    });

    const ctx = el("chartTonnage");
    if (!ctx) return;

    if (chart) {
      chart.data.labels = labels;
      chart.data.datasets[0].data = data;
      chart.update();
      return;
    }

    chart = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [{
          label: "Gesamt bewegte Masse (kg)",
          data,
          tension: 0.25,
          fill: false,
          borderWidth: 2,
          pointRadius: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: { color: "rgba(255,255,255,.75)" }
          },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${formatKg(ctx.parsed.y)} kg`
            }
          }
        },
        scales: {
          x: {
            ticks: { color: "rgba(255,255,255,.65)" },
            grid: { color: "rgba(255,255,255,.06)" }
          },
          y: {
            ticks: { color: "rgba(255,255,255,.65)" },
            grid: { color: "rgba(255,255,255,.06)" }
          }
        }
      }
    });
  }

  // ---------- PDF ----------
  async function exportPdf() {
    // export current session
    await exportPdfForSession(state.current);
  }

  async function exportPdfForSession(session) {
    // ensure summary + dates
    const s = normalizeSession(session);
    const sum = computeSessionSummary(s);

    // Fill pdf area
    const endTs = s.endAt || Date.now();
    const startTs = s.startAt || null;

    pdfSub.textContent = `Erstellt: ${formatDateTime(Date.now())}`;
    pdfSplit.textContent = DEFAULT_SPLITS[s.split].title;
    pdfBw.textContent = (s.bodyweightKg ?? null) ? `${round1(s.bodyweightKg)} kg` : "—";
    pdfStart.textContent = startTs ? formatDateTime(startTs) : "—";
    pdfEnd.textContent = endTs ? formatDateTime(endTs) : "—";
    pdfDur.textContent = (startTs && endTs) ? formatDurationMs(endTs - startTs) : "—";
    pdfTon.textContent = `${formatKg(sum.totalTonnageKg)} kg`;
    pdfNote.textContent = s.note ? `Notiz: ${s.note}` : " ";

    // Table rows
    pdfTbody.innerHTML = "";
    s.exercises.forEach(ex => {
      ex.sets.forEach((st, idx) => {
        const reps = toNum(st.reps);
        const w = toNum(st.weight);
        const ton = calcSetTonnage(st);

        // only include meaningful rows
        if (!(reps > 0 || w > 0)) return;

        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${escapeHtml(ex.name)}</td>
          <td>${idx + 1}</td>
          <td>${reps > 0 ? reps : ""}</td>
          <td>${w > 0 ? round2(w) : ""}</td>
          <td>${ton > 0 ? round2(ton) : ""}</td>
        `;
        pdfTbody.appendChild(tr);
      });
    });

    const filename = `Training_${DEFAULT_SPLITS[s.split].title}_${formatFileDate(endTs)}.pdf`;

    const opt = {
      margin: 10,
      filename,
      image: { type: "jpeg", quality: 0.95 },
      html2canvas: { scale: 2, backgroundColor: "#0b0f14" },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
    };

    // generate
    await html2pdf().set(opt).from(pdfArea).save();
  }

  // ---------- Backup Export/Import ----------
  function exportJsonBackup() {
    const payload = {
      exportedAt: Date.now(),
      data: state
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `GymDashboard_Backup_${formatFileDate(Date.now())}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);
  }

  async function importJsonBackup(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      const incoming = parsed.data || parsed;
      if (!incoming || !incoming.current || !incoming.sessions) throw new Error("Ungültiges Backup");

      state = {
        version: 1,
        current: normalizeSession(incoming.current),
        sessions: Array.isArray(incoming.sessions) ? incoming.sessions.map(normalizeSession).filter(Boolean) : []
      };

      persist();
      setSplit(state.current.split, { silent: true });
      hydrateSessionInputs();
      renderWorkoutTable();
      renderKPIs();
      renderHistory();
      renderChart();
    } catch {
      alert("Import fehlgeschlagen: Datei ist kein gültiges Backup.");
    } finally {
      e.target.value = "";
    }
  }

  function resetAllData() {
    const ok = confirm("Wirklich ALLE Trainingsdaten löschen? (localStorage wird geleert)");
    if (!ok) return;

    state = {
      version: 1,
      current: buildFreshSession("push"),
      sessions: []
    };
    persist();
    setSplit("push", { silent: true });
    hydrateSessionInputs();
    renderWorkoutTable();
    renderKPIs();
    renderHistory();
    renderChart();
  }

  // ---------- Helpers ----------
  function findExercise(exid) {
    return state.current.exercises.find(ex => ex.id === exid) || null;
  }
  function indexOfExercise(exid) {
    return state.current.exercises.findIndex(ex => ex.id === exid);
  }

  function toNum(v) {
    if (v === null || v === undefined || v === "") return 0;
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  function round2(n) { return Math.round((Number(n) || 0) * 100) / 100; }
  function round1(n) { return Math.round((Number(n) || 0) * 10) / 10; }

  function formatKg(n) {
    const x = round2(n);
    if (!x) return "0";
    return x.toLocaleString("de-DE", { maximumFractionDigits: 2 });
  }

  function pad2(x) { return String(x).padStart(2, "0"); }

  function formatDateTime(ts) {
    const d = new Date(ts);
    // locale de-DE
    return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  }

  function formatDateShort(ts) {
    const d = new Date(ts);
    return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}`;
  }

  function formatFileDate(ts) {
    const d = new Date(ts);
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}_${pad2(d.getHours())}${pad2(d.getMinutes())}`;
  }

  function formatDurationMs(ms) {
    const total = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    if (h > 0) return `${h}h ${pad2(m)}m`;
    return `${m}m ${pad2(s)}s`;
  }

  function uid() {
    return Math.random().toString(16).slice(2) + "-" + Date.now().toString(16);
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function cssEsc(str) {
    // minimal escape for querySelector
    return String(str).replaceAll('"', '\\"');
  }

  // ---------- Start ----------
  init();

})();