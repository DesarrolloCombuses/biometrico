const config = window.APP_CONFIG || {};
const hasConfig = Boolean(config.SUPABASE_URL && config.SUPABASE_ANON_KEY && !config.SUPABASE_URL.includes("PEGA_AQUI"));
const supabaseClient = hasConfig
  ? window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY)
  : null;
const BUK_OBRA_ID = 39305;
const FACE_FALLBACK_DELAY_MS = 5000;
const FACE_IMAGE_CHECK_TIMEOUT_MS = 4500;
const FACE_IDENTITY_TIMEOUT_MS = 6500;

const $ = (selector) => document.querySelector(selector);

if (window.matchMedia?.("(pointer: coarse)").matches || navigator.maxTouchPoints > 0) {
  document.documentElement.classList.add("touch-device");
}

const state = {
  user: null,
  colaborador: null,
  csvCandidate: null,
  compressedFile: null,
  faceValidated: false,
  faceWarning: "",
  nextSentido: "entrada",
  currentHistory: [],
  lastAttendance: null,
  cameraStream: null,
  cameraOpenedAt: 0,
  cameraFallbackTimer: null,
  liveDetectionRunning: false,
  liveFaceOk: false,
  serverClock: null,
  serverClockTimer: null,
  csvRows: [],
  csvLoaded: false,
  dniValidationTimer: null,
  visionTasks: null,
  faceDetector: null,
  faceDetectorReady: false,
  faceApiReady: false,
  isAdmin: false,
  adminMarks: [],
  adminFilteredMarks: [],
  adminPage: 1,
  adminPageSize: 15,
  cameraMode: "attendance",
  enrollCandidate: null,
  enrollColaborador: null
};

const elements = {
  loginView: $("#loginView"),
  appView: $("#appView"),
  registerTabButton: $("#registerTabButton"),
  databaseTabButton: $("#databaseTabButton"),
  adminTabButton: $("#adminTabButton"),
  registerPanel: $("#registerPanel"),
  databasePanel: $("#databasePanel"),
  adminPanel: $("#adminPanel"),
  loginForm: $("#loginForm"),
  loginMessage: $("#loginMessage"),
  emailInput: $("#emailInput"),
  passwordInput: $("#passwordInput"),
  userLabel: $("#userLabel"),
  connectionStatus: $("#connectionStatus"),
  logoutButton: $("#logoutButton"),
  attendanceForm: $("#attendanceForm"),
  dniInput: $("#dniInput"),
  searchButton: $("#searchButton"),
  collaboratorBox: $("#collaboratorBox"),
  serverDateLabel: $("#serverDateLabel"),
  serverTimeLabel: $("#serverTimeLabel"),
  markControls: $("#markControls"),
  nextMarkLabel: $("#nextMarkLabel"),
  stepDni: $("#stepDni"),
  stepPhoto: $("#stepPhoto"),
  stepRegister: $("#stepRegister"),
  observacionInput: $("#observacionInput"),
  cameraButton: $("#cameraButton"),
  cameraBox: $("#cameraBox"),
  cameraVideo: $("#cameraVideo"),
  liveFaceStatus: $("#liveFaceStatus"),
  faceGuide: $("#faceGuide"),
  captureButton: $("#captureButton"),
  stopCameraButton: $("#stopCameraButton"),
  previewBox: $("#previewBox"),
  photoPreview: $("#photoPreview"),
  photoName: $("#photoName"),
  photoSize: $("#photoSize"),
  submitButton: $("#submitButton"),
  nextActionNotice: $("#nextActionNotice"),
  formMessage: $("#formMessage"),
  bukResultBox: $("#bukResultBox"),
  processOverlay: $("#processOverlay"),
  processTitle: $("#processTitle"),
  processText: $("#processText"),
  refreshButton: $("#refreshButton"),
  historySubtitle: $("#historySubtitle"),
  historySummary: $("#historySummary"),
  historyTotal: $("#historyTotal"),
  historyLast: $("#historyLast"),
  historyNext: $("#historyNext"),
  historyList: $("#historyList"),
  csvStatus: $("#csvStatus"),
  csvSearchInput: $("#csvSearchInput"),
  reloadCsvButton: $("#reloadCsvButton"),
  csvTableBody: $("#csvTableBody"),
  manualExitForm: $("#manualExitForm"),
  manualDniInput: $("#manualDniInput"),
  manualDateInput: $("#manualDateInput"),
  manualTimeInput: $("#manualTimeInput"),
  manualReasonInput: $("#manualReasonInput"),
  manualExitButton: $("#manualExitButton"),
  manualMessage: $("#manualMessage"),
  adminNameSearchInput: $("#adminNameSearchInput"),
  adminDniSearchInput: $("#adminDniSearchInput"),
  adminDateSearchInput: $("#adminDateSearchInput"),
  adminCargoFilter: $("#adminCargoFilter"),
  reloadMarksButton: $("#reloadMarksButton"),
  adminMarksStatus: $("#adminMarksStatus"),
  adminMarksBody: $("#adminMarksBody"),
  adminPrevPageButton: $("#adminPrevPageButton"),
  adminNextPageButton: $("#adminNextPageButton"),
  adminPageLabel: $("#adminPageLabel"),
  enrollFaceForm: $("#enrollFaceForm"),
  enrollDniInput: $("#enrollDniInput"),
  enrollValidateButton: $("#enrollValidateButton"),
  enrollBox: $("#enrollBox"),
  enrollPreviewBox: $("#enrollPreviewBox"),
  enrollPreviewImage: $("#enrollPreviewImage"),
  enrollCameraButton: $("#enrollCameraButton"),
  deleteEnrollButton: $("#deleteEnrollButton"),
  enrollMessage: $("#enrollMessage")
};

function setMessage(target, text, type = "") {
  target.textContent = text;
  target.className = `message ${type}`.trim();
}

function setBusy(button, busy) {
  button.disabled = busy;
}

function showProcess(title, text) {
  if (!elements.processOverlay) return;
  elements.processTitle.textContent = title;
  elements.processText.textContent = text;
  elements.processOverlay.classList.remove("hidden");
}

function hideProcess() {
  elements.processOverlay?.classList.add("hidden");
}

function isMobilePhotoOnlyMode() {
  return state.cameraMode === "attendance"
    && (document.documentElement.classList.contains("touch-device") || window.matchMedia?.("(max-width: 820px)").matches);
}

function setNextActionNotice(text = "") {
  if (!elements.nextActionNotice) return;
  elements.nextActionNotice.textContent = text;
  elements.nextActionNotice.classList.toggle("hidden", !text);
}

function clearBukResult() {
  elements.bukResultBox.textContent = "";
  elements.bukResultBox.classList.add("hidden");
}

function showBukResult(value) {
  elements.bukResultBox.textContent = JSON.stringify(value, null, 2);
  elements.bukResultBox.classList.remove("hidden");
}

function setWorkflowState(stage) {
  [elements.stepDni, elements.stepPhoto, elements.stepRegister].forEach((step) => {
    step.classList.remove("active", "done");
  });

  if (stage === "dni") {
    elements.stepDni.classList.add("active");
  }

  if (stage === "photo") {
    elements.stepDni.classList.add("done");
    elements.stepPhoto.classList.add("active");
  }

  if (stage === "register") {
    elements.stepDni.classList.add("done");
    elements.stepPhoto.classList.add("done");
    elements.stepRegister.classList.add("active");
  }

  elements.cameraButton.disabled = stage === "dni";
  elements.submitButton.disabled = stage !== "register";
  elements.submitButton.classList.toggle("attention", stage === "register");
  elements.markControls.classList.toggle("hidden", stage === "dni");
  elements.nextMarkLabel.textContent = state.nextSentido;

  if (stage === "dni") {
    setNextActionNotice("");
  } else if (stage === "photo") {
    setNextActionNotice("Paso pendiente: abre la camara y toma una foto del colaborador.");
  } else if (stage === "register") {
    setNextActionNotice("Ultimo paso: toca el boton verde Registrar asistencia para guardar la marca.");
  }
}

function resetCaptureState(clearHistory = true) {
  state.colaborador = null;
  state.csvCandidate = null;
  state.compressedFile = null;
  state.faceValidated = false;
  state.faceWarning = "";
  state.faceWarning = "";
  elements.previewBox.classList.add("hidden");
  elements.photoPreview.removeAttribute("src");
  setNextActionNotice("");
  setWorkflowState("dni");
  clearBukResult();
  if (clearHistory) clearHistoryPanel();
}

function renderIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function isOnline() {
  return navigator.onLine;
}

function updateConnectionStatus() {
  const online = isOnline();
  elements.connectionStatus.textContent = online ? "Con conexión" : "Sin conexión";
  elements.connectionStatus.classList.toggle("online", online);
  elements.connectionStatus.classList.toggle("offline", !online);

  if (!online) {
    if (elements.searchButton) elements.searchButton.disabled = true;
    if (elements.cameraButton) elements.cameraButton.disabled = true;
    if (elements.submitButton) elements.submitButton.disabled = true;
    if (elements.manualExitButton) elements.manualExitButton.disabled = true;
    setMessage(elements.formMessage, "Sin internet. No se puede validar ni registrar asistencia.", "error");
  } else {
    if (elements.searchButton) elements.searchButton.disabled = false;
    if (elements.manualExitButton) elements.manualExitButton.disabled = false;
    setWorkflowState(state.faceValidated ? "register" : (state.csvCandidate ? "photo" : "dni"));
  }
}

function requireOnline(messageTarget = elements.formMessage) {
  if (isOnline()) return true;
  updateConnectionStatus();
  setMessage(messageTarget, "Sin internet. Revisa la conexión antes de continuar.", "error");
  return false;
}

async function syncServerClock() {
  if (!requireOnline()) return null;

  const { data, error } = await supabaseClient.rpc("obtener_hora_servidor_colombia");
  if (error || !data) {
    setMessage(elements.formMessage, "No se pudo sincronizar la hora del servidor.", "error");
    return null;
  }

  state.serverClock = {
    syncedAtMs: Date.now(),
    timestamp: data.timestamp,
    fecha: data.fecha,
    hora: data.hora
  };
  renderServerClock();
  return state.serverClock;
}

function getTrustedNowParts() {
  if (!state.serverClock) return getTodayPartsFromDate(new Date());

  const base = new Date(`${state.serverClock.timestamp}-05:00`);
  const trusted = new Date(base.getTime() + (Date.now() - state.serverClock.syncedAtMs));
  return getTodayPartsFromDate(trusted);
}

function renderServerClock() {
  const now = getTrustedNowParts();
  elements.serverDateLabel.textContent = now.date;
  elements.serverTimeLabel.textContent = now.time.slice(0, 5);
}

function startServerClock() {
  window.clearInterval(state.serverClockTimer);
  syncServerClock();
  state.serverClockTimer = window.setInterval(() => {
    if (state.serverClock) renderServerClock();
  }, 1000);
}

async function init() {
  renderIcons();
  updateConnectionStatus();
  window.addEventListener("online", updateConnectionStatus);
  window.addEventListener("offline", updateConnectionStatus);

  if (!hasConfig) {
    setMessage(elements.loginMessage, "Falta configurar Supabase en supabase-config.js.", "error");
    elements.loginForm.querySelectorAll("input, button").forEach((el) => {
      el.disabled = true;
    });
    return;
  }

  setWorkflowState("dni");

  const { data } = await supabaseClient.auth.getSession();
  if (data.session?.user) {
    showApp(data.session.user);
  } else {
    showLogin();
  }

  supabaseClient.auth.onAuthStateChange((_event, session) => {
    if (session?.user) {
      showApp(session.user);
    } else {
      showLogin();
    }
  });
}

function showLogin() {
  state.user = null;
  stopCamera();
  elements.loginView.classList.remove("hidden");
  elements.appView.classList.add("hidden");
  clearHistoryPanel();
}

async function showApp(user) {
  state.user = user;
  elements.userLabel.textContent = user.email || "Usuario autenticado";
  elements.loginView.classList.add("hidden");
  elements.appView.classList.remove("hidden");
  await loadProfile();
  setupManualDefaults();
  startServerClock();
  loadCollaboratorsCsv();
  clearHistoryPanel();
}

async function login(event) {
  event.preventDefault();
  setBusy(elements.loginForm.querySelector("button"), true);
  setMessage(elements.loginMessage, "");

  const email = elements.emailInput.value.trim();
  const password = elements.passwordInput.value;
  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });

  if (error) {
    setMessage(elements.loginMessage, "Usuario o contrasena incorrectos.", "error");
  }

  setBusy(elements.loginForm.querySelector("button"), false);
}

async function logout() {
  await supabaseClient.auth.signOut();
}

async function loadProfile() {
  const { data } = await supabaseClient
    .from("perfiles")
    .select("rol,activo")
    .eq("user_id", state.user.id)
    .maybeSingle();

  state.isAdmin = Boolean(data?.activo && data?.rol === "admin");
  elements.adminTabButton.classList.toggle("hidden", !state.isAdmin);
  elements.databaseTabButton.classList.toggle("hidden", !state.isAdmin);
}

function showTab(tabName) {
  if ((tabName === "database" || tabName === "admin") && !state.isAdmin) {
    tabName = "register";
  }

  const isDatabase = tabName === "database";
  const isAdmin = tabName === "admin";
  elements.registerPanel.classList.toggle("hidden", isDatabase || isAdmin);
  elements.databasePanel.classList.toggle("hidden", !isDatabase);
  elements.adminPanel.classList.toggle("hidden", !isAdmin);
  elements.registerTabButton.classList.toggle("active", !isDatabase && !isAdmin);
  elements.databaseTabButton.classList.toggle("active", isDatabase);
  elements.adminTabButton.classList.toggle("active", isAdmin);

  if (isDatabase && !state.csvLoaded) {
    loadCollaboratorsCsv();
  }

  if (isAdmin) {
    syncServerClock().then(setupManualDefaults);
    loadAdminMarks();
  }
}

function normalizeDni(value) {
  return String(value || "").trim().replace(/\s+/g, "");
}

function scheduleDniValidation() {
  if (!requireOnline()) return;
  window.clearTimeout(state.dniValidationTimer);
  resetCaptureState(true);
  stopCamera();

  const dni = normalizeDni(elements.dniInput.value);
  if (!dni) {
    elements.collaboratorBox.className = "result-box muted";
    elements.collaboratorBox.textContent = "Digita una cedula para validar si esta activa.";
    return;
  }

  elements.collaboratorBox.className = "result-box muted";
  elements.collaboratorBox.textContent = "Validando cedula...";

  state.dniValidationTimer = window.setTimeout(() => {
    buscarColaborador();
  }, 450);
}

async function buscarColaborador() {
  if (!requireOnline()) return;
  const dni = normalizeDni(elements.dniInput.value);
  resetCaptureState(false);

  if (!dni) {
    elements.collaboratorBox.className = "result-box muted";
    elements.collaboratorBox.textContent = "Digita una cedula para validar si esta activa.";
    stopCamera();
    return;
  }

  const csvCollaborator = await findActiveCsvCollaborator(dni);
  if (!csvCollaborator) {
    elements.collaboratorBox.className = "result-box";
    elements.collaboratorBox.textContent = "Registro rechazado: la cedula no esta activa en la base de colaboradores.";
    setMessage(elements.formMessage, "Cedula no autorizada para registrar asistencia.", "error");
    stopCamera();
    return;
  }

  state.csvCandidate = csvCollaborator;
  setBusy(elements.searchButton, true);
  elements.collaboratorBox.className = "result-box muted";
  elements.collaboratorBox.textContent = "Consultando registro local...";

  const { data, error } = await supabaseClient
    .from("colaboradores")
    .select("id,dni,nombre,empresa,contrato,especialidad,estado,obra_id,foto_referencia_path,rostro_enrolado,obras(nombre,obra_id_externo)")
    .eq("dni", dni)
    .maybeSingle();

  setBusy(elements.searchButton, false);

  if (error) {
    elements.collaboratorBox.className = "result-box";
    elements.collaboratorBox.textContent = "No se pudo validar la cedula en Supabase.";
    setMessage(elements.formMessage, error.message || "Error validando cedula.", "error");
    return;
  }

  state.colaborador = data || null;
  await loadTodayHistory(dni);
  await loadLastAttendance(dni);
  state.nextSentido = getNextSentidoFromLastAttendance();
  renderHistorySummary(state.currentHistory, dni);
  const faceStatus = data?.rostro_enrolado ? "Rostro enrolado." : "Sin rostro enrolado: solo se validara presencia de rostro.";
  const openInfo = getOpenAttendanceInfo();
  elements.collaboratorBox.className = "result-box";
  elements.collaboratorBox.innerHTML = `
    <strong>${escapeHtml(csvCollaborator.nombre || "Colaborador activo")}</strong>
    <div>Cedula: ${escapeHtml(csvCollaborator.cedula)}</div>
    <div>Cargo: ${escapeHtml(csvCollaborator.cargo || "Sin cargo")}</div>
    <div>Empresa: ${escapeHtml(csvCollaborator.empresa || "Sin empresa")}</div>
    <div>Vehiculo: ${escapeHtml(csvCollaborator.vehiculo || "Sin vehiculo")}</div>
    <div>Ruta: ${escapeHtml(csvCollaborator.ruta || "Sin ruta")}</div>
    <div>${data ? "Validado localmente." : "Validado por CSV. Se creara localmente al registrar."}</div>
    <div>${escapeHtml(faceStatus)}</div>
    <div>Proxima marca permitida: ${escapeHtml(state.nextSentido)}</div>
    ${openInfo ? `<div>${escapeHtml(openInfo)}</div>` : ""}
  `;
  setWorkflowState("photo");
  setMessage(elements.formMessage, "Cedula activa. Ubica tu rostro dentro del recuadro para tomar la foto.", "success");
  await startCamera();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function startCamera() {
  const messageTarget = state.cameraMode === "enroll" ? elements.enrollMessage : elements.formMessage;
  if (!requireOnline(messageTarget)) return;
  if (state.cameraMode === "attendance" && !state.csvCandidate) {
    setMessage(messageTarget, "Primero valida una cedula activa.", "error");
    return;
  }
  if (state.cameraMode === "enroll" && !state.enrollCandidate) {
    setMessage(messageTarget, "Primero valida una cedula activa.", "error");
    return;
  }

  if (state.cameraStream) {
    elements.cameraBox.classList.remove("hidden");
    return;
  }

  try {
    state.cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false
    });
    elements.cameraVideo.srcObject = state.cameraStream;
    elements.cameraBox.classList.remove("hidden");
    state.liveFaceOk = false;
    state.cameraOpenedAt = Date.now();
    elements.captureButton.disabled = true;
    elements.faceGuide.classList.remove("ready", "error");
    if (isMobilePhotoOnlyMode()) {
      state.liveFaceOk = true;
      elements.captureButton.disabled = false;
      elements.faceGuide.classList.add("ready");
      elements.liveFaceStatus.textContent = "Modo movil: toma una foto frontal como evidencia. No se hara validacion facial automatica.";
      setMessage(elements.formMessage, "Modo movil: solo se tomara la foto como evidencia.", "success");
    } else {
      setMessage(elements.formMessage, "Ubica el rostro dentro del recuadro y captura.", "");
      scheduleAttendanceFaceFallback();
      initFaceDetector().then((ready) => {
        if (ready) {
          startLiveFaceDetection();
        } else {
          elements.liveFaceStatus.textContent = "El lector facial no cargo. Toma una foto frontal para registrar con evidencia.";
        }
      });
    }
  } catch (_error) {
    setMessage(elements.formMessage, "No se pudo abrir la camara.", "error");
  }
}

async function startEnrollCamera() {
  if (!requireOnline(elements.enrollMessage)) return;
  if (!state.enrollCandidate) {
    setMessage(elements.enrollMessage, "Primero valida una cedula activa.", "error");
    return;
  }

  state.cameraMode = "enroll";
  await startCamera();
}

function stopCamera() {
  state.liveDetectionRunning = false;
  state.liveFaceOk = false;
  state.cameraOpenedAt = 0;
  if (state.cameraFallbackTimer) {
    clearTimeout(state.cameraFallbackTimer);
    state.cameraFallbackTimer = null;
  }
  if (state.cameraStream) {
    state.cameraStream.getTracks().forEach((track) => track.stop());
    state.cameraStream = null;
  }
  elements.captureButton.disabled = true;
  elements.faceGuide.classList.remove("ready", "error");
  elements.cameraBox.classList.add("hidden");
}

function scheduleAttendanceFaceFallback() {
  if (state.cameraFallbackTimer) {
    clearTimeout(state.cameraFallbackTimer);
    state.cameraFallbackTimer = null;
  }

  if (state.cameraMode !== "attendance") return;

  state.cameraFallbackTimer = setTimeout(() => {
    state.cameraFallbackTimer = null;
    if (!state.cameraStream || state.liveFaceOk || state.cameraMode !== "attendance") return;
    elements.captureButton.disabled = false;
    elements.liveFaceStatus.textContent = "Puedes capturar la foto. Si el lector facial no responde, la asistencia se registra con advertencia.";
    elements.faceGuide.classList.add("error");
  }, FACE_FALLBACK_DELAY_MS);
}

async function startLiveFaceDetection() {
  if (!state.faceDetectorReady || state.liveDetectionRunning) return;

  state.liveDetectionRunning = true;
  let lastRun = 0;

  const loop = async () => {
    if (!state.liveDetectionRunning || !state.cameraStream) return;

    const now = performance.now();
    if (elements.cameraVideo.videoWidth && now - lastRun > 260) {
      lastRun = now;
      try {
        const result = state.faceDetector.detect(elements.cameraVideo);
        const status = validateDetectedFaces(
          result.detections || [],
          elements.cameraVideo.videoWidth,
          elements.cameraVideo.videoHeight
        );
        state.liveFaceOk = status.ok;
        elements.captureButton.disabled = !status.ok && !canUseAttendanceFaceFallback();
        elements.liveFaceStatus.textContent = status.ok
          ? "Rostro validado en tiempo real. Puedes capturar."
          : canUseAttendanceFaceFallback()
            ? `${status.message} Puedes capturar y registrar con advertencia.`
            : status.message;
        elements.faceGuide.classList.toggle("ready", status.ok);
        elements.faceGuide.classList.toggle("error", !status.ok);
      } catch (_error) {
        state.liveFaceOk = false;
        elements.captureButton.disabled = !canUseAttendanceFaceFallback();
        elements.liveFaceStatus.textContent = canUseAttendanceFaceFallback()
          ? "El lector facial no responde. Puedes capturar y registrar con advertencia."
          : "Validando rostro...";
      }
    }

    requestAnimationFrame(loop);
  };

  requestAnimationFrame(loop);
}

function canUseAttendanceFaceFallback() {
  return state.cameraMode === "attendance"
    && state.cameraOpenedAt > 0
    && Date.now() - state.cameraOpenedAt >= FACE_FALLBACK_DELAY_MS;
}

async function capturePhoto() {
  if (!isMobilePhotoOnlyMode() && !state.liveFaceOk && !canUseAttendanceFaceFallback()) {
    setMessage(elements.formMessage, "Ubica un rostro claro dentro del recuadro antes de capturar.", "error");
    return;
  }

  const video = elements.cameraVideo;
  if (!video.videoWidth || !video.videoHeight) {
    setMessage(elements.formMessage, "La camara aun no esta lista.", "error");
    return;
  }

  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext("2d").drawImage(video, 0, 0);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));

  if (state.cameraMode === "enroll") {
    await saveReferenceFace(new File([blob], "referencia.jpg", { type: "image/jpeg" }));
    return;
  }

  const ok = await prepareImageFile(new File([blob], "camara.jpg", { type: "image/jpeg" }));

  if (ok) {
    stopCamera();
    setWorkflowState("register");
  }
}

async function prepareImageFile(file) {
  setMessage(elements.formMessage, isMobilePhotoOnlyMode() ? "Preparando foto de evidencia..." : "Comprimiendo y validando rostro...");
  const compressed = await compressImage(file, 720, 0.72);
  const previewUrl = URL.createObjectURL(compressed);
  const mobilePhotoOnly = isMobilePhotoOnlyMode();
  const faceCheck = state.liveFaceOk
    ? { ok: true, message: "Rostro validado. Ya puedes registrar la asistencia." }
    : await runOptionalFaceCheck(() => validateFaceInImage(previewUrl), FACE_IMAGE_CHECK_TIMEOUT_MS, "La validacion facial tardo demasiado.");

  if (mobilePhotoOnly) {
    state.faceWarning = "Registro movil: se guardo foto de evidencia sin validacion facial automatica.";
  } else if (!faceCheck.ok) {
    state.faceWarning = faceCheck.message;
  }

  if (!mobilePhotoOnly && state.cameraMode === "attendance" && state.colaborador?.rostro_enrolado && state.colaborador?.foto_referencia_path) {
    setMessage(elements.formMessage, "Comparando rostro con referencia enrolada...");
    const identityCheck = await runOptionalFaceCheck(
      () => verifyFaceIdentity(previewUrl, state.colaborador.foto_referencia_path),
      FACE_IDENTITY_TIMEOUT_MS,
      "La comparacion con el rostro enrolado tardo demasiado."
    );
    if (!identityCheck.ok) {
      state.faceWarning = state.faceWarning
        ? `${state.faceWarning} ${identityCheck.message}`
        : identityCheck.message;
    }
  }

  state.compressedFile = compressed;
  state.faceValidated = true;
  elements.photoPreview.src = previewUrl;
  elements.photoName.textContent = compressed.name;
  elements.photoSize.textContent = `${Math.round(compressed.size / 1024)} KB`;
  elements.previewBox.classList.remove("hidden");
  setMessage(
    elements.formMessage,
    mobilePhotoOnly
      ? "Foto lista. Ahora toca el boton Registrar asistencia para guardar la marca."
      : state.faceWarning
      ? `Foto lista. Advertencia facial: ${state.faceWarning} La asistencia se puede registrar con evidencia fotografica.`
      : faceCheck.message,
    mobilePhotoOnly ? "success" : (state.faceWarning ? "error" : "success")
  );
  return true;
}

async function runOptionalFaceCheck(checkFn, timeoutMs, timeoutMessage) {
  try {
    return await withTimeout(checkFn(), timeoutMs, { ok: false, message: timeoutMessage });
  } catch (error) {
    return {
      ok: false,
      message: error?.message || "No se pudo completar la validacion facial."
    };
  }
}

function withTimeout(promise, timeoutMs, fallbackValue) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(fallbackValue), timeoutMs);
    Promise.resolve(promise)
      .then((value) => resolve(value))
      .catch((error) => resolve({ ok: false, message: error?.message || fallbackValue.message }))
      .finally(() => clearTimeout(timer));
  });
}

async function initFaceDetector() {
  if (state.faceDetectorReady) return true;

  try {
    if (!state.visionTasks) {
      state.visionTasks = window.vision?.FilesetResolver
        ? window.vision
        : await import("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/vision_bundle.mjs");
    }

    const vision = await state.visionTasks.FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm"
    );
    const baseOptions = {
      modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/latest/blaze_face_short_range.tflite"
    };
    const taskOptions = {
      runningMode: "IMAGE",
      minDetectionConfidence: 0.85,
      minSuppressionThreshold: 0.3
    };

    try {
      state.faceDetector = await state.visionTasks.FaceDetector.createFromOptions(vision, {
        baseOptions: { ...baseOptions, delegate: "GPU" },
        ...taskOptions
      });
    } catch (_gpuError) {
      state.faceDetector = await state.visionTasks.FaceDetector.createFromOptions(vision, {
        baseOptions,
        ...taskOptions
      });
    }

    state.faceDetectorReady = true;
    return true;
  } catch (_error) {
    return false;
  }
}

async function validateFaceInImage(imageUrl) {
  const image = await loadImageFromUrl(imageUrl);

  if (await initFaceDetector()) {
    const result = state.faceDetector.detect(image);
    return validateDetectedFaces(result.detections || [], image.naturalWidth, image.naturalHeight);
  }

  if ("FaceDetector" in window) {
    const detector = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 2 });
    const faces = await detector.detect(image);
    return validateDetectedFaces(faces, image.naturalWidth, image.naturalHeight);
  }

  return {
    ok: false,
    message: "No se pudo cargar el validador facial. Revisa internet y recarga la pagina."
  };
}

async function initFaceApi() {
  if (state.faceApiReady) return true;
  if (!window.faceapi) return false;

  try {
    const modelUrl = "https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@0.22.2/weights";
    await Promise.all([
      window.faceapi.nets.ssdMobilenetv1.loadFromUri(modelUrl),
      window.faceapi.nets.faceLandmark68Net.loadFromUri(modelUrl),
      window.faceapi.nets.faceRecognitionNet.loadFromUri(modelUrl)
    ]);
    state.faceApiReady = true;
    return true;
  } catch (_error) {
    return false;
  }
}

async function verifyFaceIdentity(capturedImageUrl, referencePath) {
  if (!(await initFaceApi())) {
    return {
      ok: false,
      message: "No se pudo cargar el modelo de verificacion facial. Revisa internet y recarga."
    };
  }

  const { data, error } = await supabaseClient.storage
    .from("rostros-referencia")
    .download(referencePath);

  if (error || !data) {
    return {
      ok: false,
      message: "No se pudo cargar el rostro de referencia del colaborador."
    };
  }

  const referenceUrl = URL.createObjectURL(data);
  const capturedImage = await loadImageFromUrl(capturedImageUrl);
  const referenceImage = await loadImageFromUrl(referenceUrl);

  const captured = await window.faceapi
    .detectSingleFace(capturedImage)
    .withFaceLandmarks()
    .withFaceDescriptor();

  const reference = await window.faceapi
    .detectSingleFace(referenceImage)
    .withFaceLandmarks()
    .withFaceDescriptor();

  URL.revokeObjectURL(referenceUrl);

  if (!captured) {
    return { ok: false, message: "No se pudo extraer descriptor del rostro capturado." };
  }

  if (!reference) {
    return { ok: false, message: "El rostro de referencia guardado no es valido." };
  }

  const distance = window.faceapi.euclideanDistance(captured.descriptor, reference.descriptor);
  if (distance > 0.5) {
    return {
      ok: false,
      message: `El rostro no coincide con la referencia enrolada. Distancia: ${distance.toFixed(2)}`
    };
  }

  return {
    ok: true,
    message: `Identidad facial verificada. Distancia: ${distance.toFixed(2)}`
  };
}

function validateDetectedFaces(faces, imageWidth, imageHeight) {
  if (!faces.length) {
    return { ok: false, message: "No se detecto un rostro claro. Toma una foto frontal dentro del recuadro." };
  }

  if (faces.length > 1) {
    return { ok: false, message: "Se detecto mas de un rostro. Debe aparecer solo el colaborador." };
  }

  const score = faces[0].categories?.[0]?.score ?? faces[0].score?.[0] ?? 1;
  if (score < 0.55) {
    return { ok: false, message: "El rostro no es suficientemente claro. Mejora la luz y vuelve a capturar." };
  }

  const box = faces[0].boundingBox || faces[0].box;
  const x = Array.isArray(box) ? box[0] : box.originX ?? box.x ?? 0;
  const y = Array.isArray(box) ? box[1] : box.originY ?? box.y ?? 0;
  const width = Array.isArray(box) ? box[2] : box.width;
  const height = Array.isArray(box) ? box[3] : box.height;
  const faceArea = width * height;
  const imageArea = imageWidth * imageHeight;

  const faceRatio = faceArea / imageArea;
  if (faceRatio < 0.035) {
    return { ok: false, message: "El rostro esta muy pequeno. Acerca la camara y vuelve a capturar." };
  }

  if (faceRatio > 0.78) {
    return { ok: false, message: "El rostro esta demasiado cerca. Alejate un poco de la camara." };
  }

  const faceCenterX = x + width / 2;
  const faceCenterY = y + height / 2;
  const guideLeft = imageWidth * 0.08;
  const guideRight = imageWidth * 0.92;
  const guideTop = imageHeight * 0.06;
  const guideBottom = imageHeight * 0.94;

  if (
    faceCenterX < guideLeft ||
    faceCenterX > guideRight ||
    faceCenterY < guideTop ||
    faceCenterY > guideBottom
  ) {
    return { ok: false, message: "Centra el rostro dentro del recuadro." };
  }

  const aspectRatio = width / height;
  if (aspectRatio < 0.35 || aspectRatio > 1.65) {
    return { ok: false, message: "Toma la foto de frente, sin girar demasiado el rostro." };
  }

  return { ok: true, message: "Rostro validado. Ya puedes registrar la asistencia." };
}

function loadImageFromUrl(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = url;
  });
}

async function compressImage(file, maxSize, quality) {
  const image = await loadImage(file);
  const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);
  canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);

  let currentQuality = quality;
  let blob = await canvasToBlob(canvas, currentQuality);

  while (blob.size > 650000 && currentQuality > 0.42) {
    currentQuality -= 0.08;
    blob = await canvasToBlob(canvas, currentQuality);
  }

  return new File([blob], `${Date.now()}-asistencia.webp`, { type: "image/webp" });
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = URL.createObjectURL(file);
  });
}

function canvasToBlob(canvas, quality) {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/webp", quality));
}

function getTodayParts() {
  return getTrustedNowParts();
}

function getTodayPartsFromDate(now) {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hour = String(now.getHours()).padStart(2, "0");
  const minute = String(now.getMinutes()).padStart(2, "0");
  const second = String(now.getSeconds()).padStart(2, "0");
  return { year, month, day, date: `${year}-${month}-${day}`, time: `${hour}:${minute}:${second}` };
}

function setupManualDefaults() {
  const now = getTodayParts();
  elements.manualDateInput.value = now.date;
  elements.manualTimeInput.value = now.time.slice(0, 5);
}

async function getLocation() {
  if (!navigator.geolocation) return {};

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({
        latitud: position.coords.latitude,
        longitud: position.coords.longitude
      }),
      () => resolve({}),
      { enableHighAccuracy: true, timeout: 7000, maximumAge: 30000 }
    );
  });
}

async function submitAttendance(event) {
  event.preventDefault();
  if (!requireOnline()) return;
  setMessage(elements.formMessage, "");
  clearBukResult();

  const dni = normalizeDni(elements.dniInput.value);
  const csvCollaborator = await findActiveCsvCollaborator(dni);

  if (!csvCollaborator) {
    setMessage(elements.formMessage, "Registro rechazado: la cedula no esta activa en la base.", "error");
    setWorkflowState("dni");
    return;
  }

  if (!state.faceValidated || !state.compressedFile) {
    setMessage(elements.formMessage, "Primero toma la foto de evidencia.", "error");
    setWorkflowState("photo");
    return;
  }

  if (!state.colaborador) {
    const ensuredCollaborator = await ensureLocalCollaborator(csvCollaborator);
    if (!ensuredCollaborator) return;
    state.colaborador = ensuredCollaborator;
  }

  setBusy(elements.submitButton, true);
  elements.submitButton.classList.remove("attention");
  showProcess("Registrando asistencia", "Guardando foto, marca y envio a Buk/Ctrlit...");

  try {
    await syncServerClock();
    const sentido = state.nextSentido;
    const now = getTodayParts();
    const colaboradorDni = state.colaborador.dni;
    const photoPath = `asistencias/${now.year}/${now.month}/${now.day}/${colaboradorDni}-${sentido}-${Date.now()}.webp`;

    const { error: uploadError } = await supabaseClient.storage
      .from(config.FOTO_BUCKET)
      .upload(photoPath, state.compressedFile, {
        contentType: "image/webp",
        upsert: false
      });

    if (uploadError) throw uploadError;
    showProcess("Registrando asistencia", "Foto guardada. Preparando datos de asistencia...");

    const location = await getLocation();
    const userObservation = elements.observacionInput.value.trim();
    const faceObservation = state.faceWarning ? `Validacion facial con advertencia: ${state.faceWarning}` : "";
    const payload = {
      colaborador_id: state.colaborador.id,
      obra_id: state.colaborador.obra_id,
      fecha: now.date,
      hora: now.time,
      jornada: now.date,
      sentido,
      foto_path: photoPath,
      foto_eliminar_en: addDays(now.date, 15),
      latitud: location.latitud || null,
      longitud: location.longitud || null,
      origen: "web",
      registrado_por: state.user.id,
      observacion: [userObservation, faceObservation].filter(Boolean).join(" | ") || null
    };

    const { data: insertedAttendance, error: insertError } = await supabaseClient
      .from("asistencias")
      .insert(payload)
      .select("id")
      .single();

    if (insertError) throw insertError;
    showProcess("Enviando a Buk/Ctrlit", "La marca ya quedo guardada. Estamos enviando la informacion...");

    const { data: bukData, error: bukError } = await supabaseClient.functions.invoke("enviar-asistencia-buk", {
      body: {
        asistencia_id: insertedAttendance.id,
        obra_id: BUK_OBRA_ID,
        dni_colaborador: colaboradorDni,
        jornada: now.date,
        fecha: now.date,
        hora: now.time,
        sentido
      }
    });

    showBukResult(bukData || bukError);

    if (bukError || !bukData?.ok) {
      setMessage(elements.formMessage, "Asistencia guardada, pero no se pudo enviar a Buk/Ctrlit.", "error");
    } else {
      setMessage(elements.formMessage, "Asistencia registrada y enviada a Buk/Ctrlit.", "success");
    }

    resetAttendanceForm(true);
    elements.dniInput.value = colaboradorDni;
    await loadTodayHistory(colaboradorDni);
    await loadLastAttendance(colaboradorDni);
    state.nextSentido = getNextSentidoFromLastAttendance();
    renderHistorySummary(state.currentHistory, colaboradorDni);
  } catch (error) {
    setMessage(elements.formMessage, error.message || "No se pudo registrar la asistencia.", "error");
    elements.submitButton.disabled = !state.faceValidated;
  } finally {
    hideProcess();
    if (state.faceValidated) {
      elements.submitButton.disabled = false;
      elements.submitButton.classList.add("attention");
    }
  }
}

async function ensureLocalCollaborator(csvCollaborator) {
  setMessage(elements.formMessage, "Creando registro local del colaborador...");

  const { data: obra, error: obraError } = await supabaseClient
    .from("obras")
    .select("id,nombre,obra_id_externo")
    .eq("obra_id_externo", BUK_OBRA_ID)
    .maybeSingle();

  if (obraError || !obra) {
    setMessage(elements.formMessage, "No existe la obra fija 39305 en Supabase.", "error");
    return null;
  }

  const { data: created, error: createError } = await supabaseClient
    .from("colaboradores")
    .insert({
      dni: csvCollaborator.cedula,
      nombre: csvCollaborator.nombre || `Colaborador ${csvCollaborator.cedula}`,
      empresa: csvCollaborator.empresa || null,
      especialidad: csvCollaborator.cargo || null,
      estado: "vinculado",
      obra_id: obra.id,
      puede_usar_app: true
    })
    .select("id,dni,nombre,empresa,contrato,especialidad,estado,obra_id,foto_referencia_path,rostro_enrolado,rostro_enrolado_at,obras(nombre,obra_id_externo)")
    .single();

  if (createError) {
    setMessage(elements.formMessage, createError.message || "No se pudo crear el colaborador local.", "error");
    return null;
  }

  return created;
}

function addDays(dateString, days) {
  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function resetAttendanceForm(preserveBukResult = false) {
  state.colaborador = null;
  state.csvCandidate = null;
  state.compressedFile = null;
  state.faceValidated = false;
  elements.attendanceForm.reset();
  elements.collaboratorBox.className = "result-box muted";
  elements.collaboratorBox.textContent = "Digita una cedula para validar si esta activa.";
  elements.previewBox.classList.add("hidden");
  setWorkflowState("dni");
  stopCamera();
  if (!preserveBukResult) clearBukResult();
}

async function loadTodayHistory() {
  const today = getTodayParts().date;
  elements.historyList.textContent = "Cargando...";

  const dni = normalizeDni(arguments[0] || elements.dniInput.value);
  let query = supabaseClient
    .from("asistencias")
    .select(dni ? "id,fecha,hora,sentido,origen,observacion,enviado_buk,buk_status,colaboradores!inner(dni,nombre)" : "id,fecha,hora,sentido,origen,observacion,enviado_buk,buk_status,colaboradores(dni,nombre)")
    .eq("fecha", today)
    .order("created_at", { ascending: false })
    .limit(12);

  if (dni) {
    query = query.eq("colaboradores.dni", dni);
  }

  const { data, error } = await query;

  if (error) {
    elements.historyList.textContent = "No se pudieron cargar los registros.";
    return;
  }

  const rows = dni ? data.filter((item) => item.colaboradores?.dni === dni) : data;
  state.currentHistory = rows;
  renderHistorySummary(rows, dni);

  if (!rows.length) {
    elements.historyList.textContent = dni ? "Sin registros para esta cedula hoy." : "Sin registros para hoy.";
    return;
  }

  elements.historyList.innerHTML = rows.map((item) => `
    <article class="history-item">
      <div class="history-time">${escapeHtml(String(item.hora).slice(0, 5))}</div>
      <div class="history-main">
        <strong>
          ${escapeHtml(item.colaboradores?.nombre || "Sin nombre")}
          <span class="pill ${escapeHtml(item.sentido)}">${escapeHtml(item.sentido)}</span>
        </strong>
        <div class="history-meta">
          <span>Cedula ${escapeHtml(item.colaboradores?.dni || "")}</span>
          <span>${escapeHtml(item.fecha)}</span>
          <span>${escapeHtml(item.origen || "web")}</span>
          <span>Buk ${item.enviado_buk ? "OK" : escapeHtml(item.buk_status || "pendiente")}</span>
          ${item.observacion ? `<span>${escapeHtml(item.observacion)}</span>` : ""}
        </div>
      </div>
    </article>
  `).join("");
}

async function refreshCurrentHistory() {
  const dni = normalizeDni(elements.dniInput.value);
  await loadTodayHistory(dni);
  await loadLastAttendance(dni);
  state.nextSentido = getNextSentidoFromLastAttendance();
  renderHistorySummary(state.currentHistory, dni);
  setWorkflowState(state.faceValidated ? "register" : (state.csvCandidate ? "photo" : "dni"));
}

async function loadLastAttendance(dni) {
  const cleanDni = normalizeDni(dni);
  if (!cleanDni) {
    state.lastAttendance = null;
    return null;
  }

  const { data, error } = await supabaseClient
    .from("asistencias")
    .select("id,fecha,hora,sentido,origen,colaboradores!inner(dni,nombre)")
    .eq("colaboradores.dni", cleanDni)
    .order("fecha", { ascending: false })
    .order("hora", { ascending: false })
    .limit(1);

  if (error) {
    state.lastAttendance = null;
    return null;
  }

  state.lastAttendance = data?.[0] || null;
  return state.lastAttendance;
}

function clearHistoryPanel() {
  state.currentHistory = [];
  state.lastAttendance = null;
  elements.historySubtitle.textContent = "Digita una cedula para consultar";
  elements.historySummary.classList.add("hidden");
  elements.historyList.textContent = "Digita una cedula para ver sus registros de hoy.";
}

function renderHistorySummary(rows, dni) {
  if (!dni) {
    elements.historySummary.classList.add("hidden");
    elements.historySubtitle.textContent = "Digita una cedula para consultar";
    return;
  }

  const lastToday = rows[0];
  const next = getNextSentidoFromLastAttendance();
  elements.historySubtitle.textContent = dni;
  elements.historyTotal.textContent = String(rows.length);
  elements.historyLast.textContent = lastToday ? `${lastToday.sentido} ${String(lastToday.hora).slice(0, 5)}` : "--";
  elements.historyNext.textContent = next;
  elements.historySummary.classList.remove("hidden");
}

function getNextSentidoFromLastAttendance() {
  const last = state.lastAttendance;
  if (!last) return "entrada";
  return last.sentido === "entrada" ? "salida" : "entrada";
}

function getOpenAttendanceInfo() {
  const last = state.lastAttendance;
  if (!last || last.sentido !== "entrada") return "";
  const today = getTodayParts().date;
  if (last.fecha === today) return "";
  return `Entrada abierta desde ${last.fecha} ${String(last.hora).slice(0, 5)}. Debe registrar salida.`;
}

async function loadCollaboratorsCsv() {
  if (!requireOnline(elements.csvStatus)) return;
  elements.csvStatus.textContent = "Cargando base...";
  elements.csvTableBody.innerHTML = "";

  try {
    const response = await fetch(config.COLABORADORES_CSV_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const csvText = await response.text();
    state.csvRows = parseCsv(csvText)
      .map(normalizeCsvRow)
      .filter((row) => row.estado.toUpperCase() === "ACTIVO");
    state.csvLoaded = true;
    renderCsvTable();
  } catch (error) {
    elements.csvStatus.textContent = `No se pudo cargar el CSV: ${error.message}`;
  }
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell);
      if (row.some((value) => value.trim() !== "")) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  row.push(cell);
  if (row.some((value) => value.trim() !== "")) rows.push(row);

  const headers = rows.shift()?.map((header) => header.trim()) || [];
  return rows.map((values) => {
    const record = {};
    headers.forEach((header, index) => {
      record[header] = values[index]?.trim() || "";
    });
    return record;
  });
}

function normalizeCsvRow(row) {
  return {
    cedula: row.CEDULA || "",
    nombre: row["NOMBRE COMPLETO"] || "",
    estado: row.ESTADO || "",
    cargo: row["CARGO FUNCIONARIO"] || "",
    empresa: row.EMPRESA || "",
    vehiculo: row.VEHICULO_ASOCIADO || "",
    ruta: row.RUTA || ""
  };
}

async function ensureCsvLoaded() {
  if (!state.csvLoaded) await loadCollaboratorsCsv();
}

async function findActiveCsvCollaborator(dni) {
  await ensureCsvLoaded();
  return state.csvRows.find((row) => normalizeDni(row.cedula) === normalizeDni(dni)) || null;
}

function renderCsvTable() {
  const query = elements.csvSearchInput.value.trim().toLowerCase();
  const filtered = state.csvRows.filter((row) => {
    if (!query) return true;
    return [row.cedula, row.nombre, row.estado, row.cargo, row.empresa, row.vehiculo, row.ruta]
      .some((value) => String(value).toLowerCase().includes(query));
  });

  elements.csvStatus.textContent = `${filtered.length} de ${state.csvRows.length} colaboradores activos`;
  elements.csvTableBody.innerHTML = filtered.slice(0, 300).map((row) => `
    <tr>
      <td>${escapeHtml(row.cedula)}</td>
      <td>${escapeHtml(row.nombre)}</td>
      <td class="status-active">${escapeHtml(row.estado)}</td>
      <td>${escapeHtml(row.cargo)}</td>
      <td>${escapeHtml(row.empresa)}</td>
      <td>${escapeHtml(row.vehiculo)}</td>
      <td>${escapeHtml(row.ruta)}</td>
      <td><button class="mini-button" type="button" data-use-dni="${escapeHtml(row.cedula)}">Usar</button></td>
    </tr>
  `).join("");

  if (filtered.length > 300) {
    elements.csvStatus.textContent += " - mostrando primeros 300";
  }
}

function useCsvDni(dni) {
  elements.dniInput.value = dni;
  showTab("register");
  buscarColaborador();
}

async function loadAdminMarks() {
  if (!state.isAdmin) return;
  if (!requireOnline(elements.adminMarksStatus)) return;

  await ensureCsvLoaded();
  elements.adminMarksStatus.textContent = "Cargando marcas...";

  const { data, error } = await supabaseClient
    .from("asistencias")
    .select("id,fecha,hora,sentido,origen,observacion,enviado_buk,buk_status,colaboradores(dni,nombre)")
    .order("fecha", { ascending: false })
    .order("hora", { ascending: false })
    .limit(500);

  if (error) {
    elements.adminMarksStatus.textContent = "No se pudieron cargar las marcas.";
    return;
  }

  state.adminMarks = data || [];
  populateAdminCargoFilter();
  state.adminPage = 1;
  renderAdminMarks();
}

function renderAdminMarks() {
  const nameQuery = elements.adminNameSearchInput.value.trim().toLowerCase();
  const dniQuery = normalizeDni(elements.adminDniSearchInput.value);
  const dateQuery = elements.adminDateSearchInput.value;
  const selectedCargos = getSelectedAdminCargos();
  const rows = state.adminMarks.filter((item) => {
    const dni = item.colaboradores?.dni || "";
    const name = getDisplayNameForDni(dni, item.colaboradores?.nombre);
    const cargo = getCargoForDni(dni);

    if (nameQuery && !name.toLowerCase().includes(nameQuery)) return false;
    if (dniQuery && !normalizeDni(dni).includes(dniQuery)) return false;
    if (dateQuery && item.fecha !== dateQuery) return false;
    if (selectedCargos.length && !selectedCargos.includes(cargo)) return false;
    return true;
  });

  state.adminFilteredMarks = rows;
  const totalPages = Math.max(1, Math.ceil(rows.length / state.adminPageSize));
  if (state.adminPage > totalPages) state.adminPage = totalPages;
  const start = (state.adminPage - 1) * state.adminPageSize;
  const pageRows = rows.slice(start, start + state.adminPageSize);

  elements.adminMarksStatus.textContent = `${rows.length} de ${state.adminMarks.length} marcas`;
  elements.adminPageLabel.textContent = `Página ${state.adminPage} de ${totalPages}`;
  elements.adminPrevPageButton.disabled = state.adminPage <= 1;
  elements.adminNextPageButton.disabled = state.adminPage >= totalPages;
  elements.adminMarksBody.innerHTML = pageRows.map((item) => `
    <tr>
      <td>${escapeHtml(item.fecha)}</td>
      <td>${escapeHtml(String(item.hora).slice(0, 5))}</td>
      <td>${escapeHtml(item.colaboradores?.dni || "")}</td>
      <td>${escapeHtml(getDisplayNameForDni(item.colaboradores?.dni, item.colaboradores?.nombre))}</td>
      <td><span class="pill ${escapeHtml(item.sentido)}">${escapeHtml(item.sentido)}</span></td>
      <td>${escapeHtml(item.origen || "")}</td>
      <td>${item.enviado_buk ? "OK" : escapeHtml(item.buk_status || "Pendiente")}</td>
      <td>${escapeHtml(item.observacion || "")}</td>
    </tr>
  `).join("");
}

function populateAdminCargoFilter() {
  const current = new Set(getSelectedAdminCargos());
  const cargos = Array.from(new Set(state.adminMarks
    .map((item) => getCargoForDni(item.colaboradores?.dni))
    .filter(Boolean)))
    .sort((a, b) => a.localeCompare(b));

  elements.adminCargoFilter.innerHTML = cargos.map((cargo) => `
    <option value="${escapeHtml(cargo)}" ${current.has(cargo) ? "selected" : ""}>${escapeHtml(cargo)}</option>
  `).join("");
}

function getSelectedAdminCargos() {
  return Array.from(elements.adminCargoFilter.selectedOptions || []).map((option) => option.value);
}

function getCargoForDni(dni) {
  const csvRow = state.csvRows.find((row) => normalizeDni(row.cedula) === normalizeDni(dni));
  return csvRow?.cargo || "";
}

function getDisplayNameForDni(dni, localName = "") {
  const cleanLocalName = String(localName || "").trim();
  if (cleanLocalName && !cleanLocalName.toLowerCase().startsWith("colaborador ")) {
    return cleanLocalName;
  }

  const csvRow = state.csvRows.find((row) => normalizeDni(row.cedula) === normalizeDni(dni));
  return csvRow?.nombre || cleanLocalName || "";
}

async function registerManualExit(event) {
  event.preventDefault();
  if (!state.isAdmin) return;
  if (!requireOnline(elements.manualMessage)) return;

  const dni = normalizeDni(elements.manualDniInput.value);
  const fecha = elements.manualDateInput.value;
  const hora = elements.manualTimeInput.value;
  const motivo = elements.manualReasonInput.value.trim();

  if (!dni || !fecha || !hora || !motivo) {
    setMessage(elements.manualMessage, "Completa cedula, fecha, hora y motivo.", "error");
    return;
  }

  const csvCollaborator = await findActiveCsvCollaborator(dni);
  if (!csvCollaborator) {
    setMessage(elements.manualMessage, "La cedula no esta activa en la base de colaboradores.", "error");
    return;
  }

  setBusy(elements.manualExitButton, true);
  setMessage(elements.manualMessage, "Validando ultima marca...");

  try {
    const colaborador = await ensureExistingCollaborator(csvCollaborator);
    if (!colaborador) return;

    const { data: lastRows, error: lastError } = await supabaseClient
      .from("asistencias")
      .select("sentido,hora")
      .eq("colaborador_id", colaborador.id)
      .eq("fecha", fecha)
      .order("created_at", { ascending: false })
      .limit(1);

    if (lastError) throw lastError;

    const last = lastRows?.[0];
    if (!last || last.sentido !== "entrada") {
      setMessage(elements.manualMessage, "No se puede registrar salida manual: primero debe existir una entrada abierta.", "error");
      return;
    }

    const observacion = `Salida manual. Motivo: ${motivo}`;
    const { data: insertedAttendance, error: insertError } = await supabaseClient
      .from("asistencias")
      .insert({
        colaborador_id: colaborador.id,
        obra_id: colaborador.obra_id,
        fecha,
        hora,
        jornada: fecha,
        sentido: "salida",
        origen: "manual",
        registrado_por: state.user.id,
        observacion
      })
      .select("id")
      .single();

    if (insertError) throw insertError;

    const { data: bukData, error: bukError } = await supabaseClient.functions.invoke("enviar-asistencia-buk", {
      body: {
        asistencia_id: insertedAttendance.id,
        obra_id: BUK_OBRA_ID,
        dni_colaborador: colaborador.dni,
        jornada: fecha,
        fecha,
        hora,
        sentido: "salida"
      }
    });

    if (bukError || !bukData?.ok) {
      setMessage(elements.manualMessage, "Salida guardada, pero no se pudo enviar a Buk/Ctrlit.", "error");
    } else {
      setMessage(elements.manualMessage, "Salida manual registrada y enviada a Buk/Ctrlit.", "success");
    }

    elements.manualReasonInput.value = "";
    await loadAdminMarks();
  } catch (error) {
    setMessage(elements.manualMessage, error.message || "No se pudo registrar la salida manual.", "error");
  } finally {
    setBusy(elements.manualExitButton, false);
  }
}

async function ensureExistingCollaborator(csvCollaborator) {
  const { data } = await supabaseClient
    .from("colaboradores")
    .select("id,dni,nombre,empresa,contrato,especialidad,estado,obra_id,foto_referencia_path,rostro_enrolado,rostro_enrolado_at,obras(nombre,obra_id_externo)")
    .eq("dni", csvCollaborator.cedula)
    .maybeSingle();

  if (data) return data;
  return await ensureLocalCollaborator(csvCollaborator);
}

async function validateEnrollCollaborator() {
  if (!state.isAdmin) return;
  if (!requireOnline(elements.enrollMessage)) return;

  const dni = normalizeDni(elements.enrollDniInput.value);
  state.enrollCandidate = null;
  state.enrollColaborador = null;
  elements.enrollCameraButton.disabled = true;
  elements.deleteEnrollButton.disabled = true;
  elements.enrollPreviewBox.classList.add("hidden");
  elements.enrollPreviewImage.removeAttribute("src");

  if (!dni) {
    elements.enrollBox.className = "result-box muted";
    elements.enrollBox.textContent = "Digita la cedula del colaborador.";
    return;
  }

  const csvCollaborator = await findActiveCsvCollaborator(dni);
  if (!csvCollaborator) {
    elements.enrollBox.className = "result-box";
    elements.enrollBox.textContent = "La cedula no esta activa en la base de colaboradores.";
    setMessage(elements.enrollMessage, "No se puede enrolar un colaborador inactivo o inexistente.", "error");
    return;
  }

  const colaborador = await ensureExistingCollaborator(csvCollaborator);
  if (!colaborador) return;

  state.enrollCandidate = csvCollaborator;
  state.enrollColaborador = colaborador;
  elements.deleteEnrollButton.disabled = !colaborador.rostro_enrolado || !colaborador.foto_referencia_path;
  elements.enrollBox.className = "result-box";
  elements.enrollBox.innerHTML = `
    <strong>${escapeHtml(csvCollaborator.nombre || colaborador.nombre || "Colaborador")}</strong>
    <div>Cedula: ${escapeHtml(csvCollaborator.cedula)}</div>
    <div>Cargo: ${escapeHtml(csvCollaborator.cargo || "Sin cargo")}</div>
    <div>Rostro: ${colaborador.rostro_enrolado ? "enrolado" : "sin enrolar"}</div>
    <div>Estado: listo para capturar rostro de referencia.</div>
  `;
  elements.enrollCameraButton.disabled = false;
  await showEnrollReferencePreview(colaborador);
  setMessage(elements.enrollMessage, "Colaborador validado. Captura el rostro de referencia.", "success");
}

async function showEnrollReferencePreview(colaborador) {
  if (!colaborador.rostro_enrolado || !colaborador.foto_referencia_path) {
    elements.enrollPreviewBox.classList.add("hidden");
    elements.enrollPreviewImage.removeAttribute("src");
    return;
  }

  const { data, error } = await supabaseClient.storage
    .from("rostros-referencia")
    .createSignedUrl(colaborador.foto_referencia_path, 300);

  if (error || !data?.signedUrl) {
    elements.enrollPreviewBox.classList.add("hidden");
    return;
  }

  elements.enrollPreviewImage.src = data.signedUrl;
  elements.enrollPreviewBox.classList.remove("hidden");
}

async function saveReferenceFace(file) {
  if (!state.enrollColaborador || !state.enrollCandidate) {
    setMessage(elements.enrollMessage, "No hay colaborador validado para enrolar.", "error");
    return;
  }

  setMessage(elements.enrollMessage, "Guardando rostro de referencia...");

  const compressed = await compressImage(file, 720, 0.72);
  const path = `rostros/${state.enrollCandidate.cedula}/referencia-${Date.now()}.webp`;

  if (state.enrollColaborador.foto_referencia_path) {
    await supabaseClient.storage
      .from("rostros-referencia")
      .remove([state.enrollColaborador.foto_referencia_path]);
  }

  const { error: uploadError } = await supabaseClient.storage
    .from("rostros-referencia")
    .upload(path, compressed, {
      contentType: "image/webp",
      upsert: true
    });

  if (uploadError) {
    setMessage(elements.enrollMessage, uploadError.message || "No se pudo subir el rostro.", "error");
    return;
  }

  const { error: updateError } = await supabaseClient
    .from("colaboradores")
    .update({
      foto_referencia_path: path,
      rostro_enrolado: true,
      rostro_enrolado_at: new Date().toISOString()
    })
    .eq("id", state.enrollColaborador.id);

  if (updateError) {
    setMessage(elements.enrollMessage, updateError.message || "No se pudo actualizar el colaborador.", "error");
    return;
  }

  stopCamera();
  state.cameraMode = "attendance";
  elements.enrollCameraButton.disabled = true;
  elements.deleteEnrollButton.disabled = false;
  state.enrollColaborador = {
    ...state.enrollColaborador,
    foto_referencia_path: path,
    rostro_enrolado: true
  };
  await showEnrollReferencePreview(state.enrollColaborador);
  elements.enrollBox.className = "result-box";
  elements.enrollBox.innerHTML += "<div>Rostro de referencia enrolado correctamente.</div>";
  setMessage(elements.enrollMessage, "Rostro de referencia guardado correctamente.", "success");
}

async function deleteReferenceFace() {
  if (!state.isAdmin || !state.enrollColaborador) return;
  if (!state.enrollColaborador.rostro_enrolado || !state.enrollColaborador.foto_referencia_path) {
    setMessage(elements.enrollMessage, "Este colaborador no tiene rostro enrolado.", "error");
    return;
  }

  const ok = window.confirm("¿Eliminar el rostro enrolado de este colaborador?");
  if (!ok) return;

  setMessage(elements.enrollMessage, "Eliminando rostro enrolado...");
  elements.deleteEnrollButton.disabled = true;

  const path = state.enrollColaborador.foto_referencia_path;
  const { error: removeError } = await supabaseClient.storage
    .from("rostros-referencia")
    .remove([path]);

  if (removeError) {
    setMessage(elements.enrollMessage, removeError.message || "No se pudo eliminar la foto.", "error");
    elements.deleteEnrollButton.disabled = false;
    return;
  }

  const { error: updateError } = await supabaseClient
    .from("colaboradores")
    .update({
      foto_referencia_path: null,
      rostro_enrolado: false,
      rostro_enrolado_at: null
    })
    .eq("id", state.enrollColaborador.id);

  if (updateError) {
    setMessage(elements.enrollMessage, updateError.message || "No se pudo actualizar el colaborador.", "error");
    return;
  }

  state.enrollColaborador = {
    ...state.enrollColaborador,
    foto_referencia_path: null,
    rostro_enrolado: false,
    rostro_enrolado_at: null
  };
  elements.enrollPreviewBox.classList.add("hidden");
  elements.enrollPreviewImage.removeAttribute("src");
  elements.enrollBox.className = "result-box";
  elements.enrollBox.innerHTML += "<div>Rostro enrolado eliminado.</div>";
  setMessage(elements.enrollMessage, "Rostro enrolado eliminado correctamente.", "success");
}

elements.loginForm.addEventListener("submit", login);
elements.logoutButton.addEventListener("click", logout);
elements.registerTabButton.addEventListener("click", () => showTab("register"));
elements.databaseTabButton.addEventListener("click", () => showTab("database"));
elements.adminTabButton.addEventListener("click", () => showTab("admin"));
elements.searchButton.addEventListener("click", buscarColaborador);
elements.dniInput.addEventListener("input", scheduleDniValidation);
elements.dniInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    buscarColaborador();
  }
});
elements.cameraButton.addEventListener("click", startCamera);
elements.captureButton.addEventListener("click", capturePhoto);
elements.stopCameraButton.addEventListener("click", stopCamera);
elements.attendanceForm.addEventListener("submit", submitAttendance);
elements.refreshButton.addEventListener("click", refreshCurrentHistory);
elements.reloadCsvButton.addEventListener("click", loadCollaboratorsCsv);
elements.csvSearchInput.addEventListener("input", renderCsvTable);
elements.manualExitForm.addEventListener("submit", registerManualExit);
elements.reloadMarksButton.addEventListener("click", loadAdminMarks);
elements.adminDniSearchInput.addEventListener("input", () => {
  state.adminPage = 1;
  renderAdminMarks();
});
elements.adminDateSearchInput.addEventListener("input", () => {
  state.adminPage = 1;
  renderAdminMarks();
});
elements.adminNameSearchInput.addEventListener("input", () => {
  state.adminPage = 1;
  renderAdminMarks();
});
elements.adminCargoFilter.addEventListener("change", () => {
  state.adminPage = 1;
  renderAdminMarks();
});
elements.adminPrevPageButton.addEventListener("click", () => {
  state.adminPage = Math.max(1, state.adminPage - 1);
  renderAdminMarks();
});
elements.adminNextPageButton.addEventListener("click", () => {
  state.adminPage += 1;
  renderAdminMarks();
});
elements.enrollValidateButton.addEventListener("click", validateEnrollCollaborator);
elements.enrollCameraButton.addEventListener("click", startEnrollCamera);
elements.deleteEnrollButton.addEventListener("click", deleteReferenceFace);
elements.csvTableBody.addEventListener("click", (event) => {
  const button = event.target.closest("[data-use-dni]");
  if (button) useCsvDni(button.dataset.useDni);
});

init();

