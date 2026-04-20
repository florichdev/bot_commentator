(function () {
  const STORAGE_PREFIX = "max-commentator:v1:";
  const MAX_LEN = 4000;

  const state = {
    postId: null,
    sortDesc: false,
    comments: [],
    user: {
      id: "",
      name: "",
    },
    apiBase: "",
    replyTo: null,
    contextCommentId: null,
    searchQuery: "",
    searchOpen: false,
    themeMode: "system",
    bgScheme: "ocean",
    attachments: [],
    postLink: "",
  };

  const el = {
    commentInput: document.getElementById("commentInput"),
    charCounter: document.getElementById("charCounter"),
    sendBtn: document.getElementById("sendBtn"),
    sortBtn: document.getElementById("sortBtn"),
    clearBtn: document.getElementById("clearBtn"),
    searchToggleBtn: document.getElementById("searchToggleBtn"),
    searchPanel: document.getElementById("searchPanel"),
    searchInput: document.getElementById("searchInput"),
    searchCloseBtn: document.getElementById("searchCloseBtn"),
    settingsBtn: document.getElementById("settingsBtn"),
    settingsModal: document.getElementById("settingsModal"),
    settingsCloseBtn: document.getElementById("settingsCloseBtn"),
    paletteGrid: document.getElementById("paletteGrid"),
    openBotBtn: document.getElementById("openBotBtn"),
    commentsCount: document.getElementById("commentsCount"),
    commentsList: document.getElementById("commentsList"),
    emptyState: document.getElementById("emptyState"),
    tpl: document.getElementById("commentTemplate"),
    replyPreview: document.getElementById("replyPreview"),
    replyPreviewAuthor: document.getElementById("replyPreviewAuthor"),
    replyPreviewText: document.getElementById("replyPreviewText"),
    replyCancelBtn: document.getElementById("replyCancelBtn"),
    chatBody: document.querySelector(".chat__body"),
    scrollDownBtn: document.getElementById("scrollDownBtn"),
    contextMenu: document.getElementById("contextMenu"),
    contextMenuOverlay: document.getElementById("contextMenuOverlay"),
    contextReactions: document.getElementById("contextReactions"),
    attachBtn: document.getElementById("attachBtn"),
    fileInput: document.getElementById("fileInput"),
    attachmentsBar: document.getElementById("attachmentsBar"),
  };
  const THEME_KEY = "max-commentator:theme";
  const BG_KEY = "max-commentator:bg";
  const ATTACHMENTS_MARKER = "__ATTACHMENTS__:";
  const BG_SCHEMES = [
    { id: "ocean", label: "Океан", start: "#0f2f46", end: "#1b5f8a" },
    { id: "violet", label: "Аметист", start: "#2c1f4d", end: "#6f49b6" },
    { id: "sunset", label: "Закат", start: "#4a2331", end: "#d16a5a" },
    { id: "forest", label: "Лагуна", start: "#123a35", end: "#2d8b78" },
    { id: "graphite", label: "Ночной графит", start: "#151922", end: "#46546a" },
  ];
  const REACTIONS = ["👍", "❤️", "😂", "😮", "😡", "👎", "🔥", "🎉", "😢", "🤔", "👏", "👀", "💩", "😍", "😎", "😱", "🤢", "🥳", "💪", "🙏", "😘", "⭐", "🚀", "🥵", "🥶", "🤯", "🍷", "📝", "🤝", "✍️", "❤️‍🔥", "😁", "💯", "👌", "🎁", "🤑", "🫰", "🛌", "🛀", "🏴‍☠️", "🦾", "1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];

  function safeParse(json, fallback) {
    try {
      return JSON.parse(json);
    } catch {
      return fallback;
    }
  }

  function getWebApp() {
    return window.WebApp || window.Telegram?.WebApp || null;
  }

  function getInitDataRaw() {
    const webApp = getWebApp();
    if (!webApp) return "";
    if (typeof webApp.initData === "string" && webApp.initData) return webApp.initData;
    const raw = webApp.initDataManager?.rawInitData;
    return typeof raw === "string" ? raw : "";
  }

  function parseInitDataRaw() {
    const raw = getInitDataRaw();
    if (!raw) return {};
    const parsed = {};
    const params = new URLSearchParams(raw);
    for (const [k, v] of params.entries()) parsed[k] = v;
    if (parsed.user && typeof parsed.user === "string") {
      try {
        parsed.user = JSON.parse(parsed.user);
      } catch {
        // keep as string
      }
    }
    return parsed;
  }

  function apiHeaders() {
    const headers = { "Content-Type": "application/json" };
    const initData = getInitDataRaw();
    if (initData) headers["X-Max-Init-Data"] = initData;
    return headers;
  }

  function parsePostIdFromStartParam(value) {
    // Форматы: post_123 | post=123 | ch_<channel>_p_mid_xxx | 123
    if (!value) return null;
    const decoded = decodeURIComponent(String(value));
    if (decoded.includes("post=")) {
      return decoded.split("post=")[1].split(/[;&]/)[0] || null;
    }
    if (decoded.startsWith("post_")) {
      const payload = decoded.slice(5) || "";
      if (!payload) return null;
      return payload.replace(/_/g, ".");
    }
    if (decoded.startsWith("ch_")) {
      const idx = decoded.indexOf("_p_");
      if (idx !== -1) {
        const rawPost = decoded.slice(idx + 3).split("_c_")[0];
        if (rawPost) return rawPost.replace(/_/g, ".");
      }
    }
    return decoded;
  }

  function resolvePostId() {
    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get("post_id") || params.get("post") || params.get("id");
    if (fromQuery) return fromQuery;
    const fromStartapp = params.get("startapp") || params.get("WebAppStartParam");
    if (fromStartapp) return parsePostIdFromStartParam(fromStartapp);

    const webApp = getWebApp();
    const fromInit = webApp?.initDataUnsafe?.start_param;
    if (fromInit) return parsePostIdFromStartParam(fromInit);
    const fromInitDataRaw = parseInitDataRaw().start_param;
    if (fromInitDataRaw) return parsePostIdFromStartParam(fromInitDataRaw);

    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const fromHashStartapp = hash.get("startapp") || hash.get("WebAppStartParam");
    if (fromHashStartapp) return parsePostIdFromStartParam(fromHashStartapp);
    const webAppDataRaw = hash.get("WebAppData");
    if (webAppDataRaw) {
      const appParams = new URLSearchParams(decodeURIComponent(webAppDataRaw));
      const startParam = appParams.get("start_param");
      if (startParam) return parsePostIdFromStartParam(startParam);
    }

    return "default-post";
  }

  function resolvePostLink(postId) {
    if (!postId || postId === "default-post") return "";
    const explicit = new URLSearchParams(window.location.search).get("post_url");
    if (explicit) return explicit;
    return `https://max.ru/?message_id=${encodeURIComponent(postId)}`;
  }

  function setThemeFromMax() {
    const webApp = getWebApp();
    if (!webApp) return;
    if (typeof webApp.ready === "function") webApp.ready();
    if (typeof webApp.expand === "function") webApp.expand();
    if (typeof webApp.setBackgroundColor === "function") webApp.setBackgroundColor("#181818");
    if (typeof webApp.setHeaderColor === "function") webApp.setHeaderColor("#181818");

    const user = webApp.initDataUnsafe?.user;
    if (user) {
      state.user.id = String(user.id || "");
      state.user.name = [user.first_name, user.last_name].filter(Boolean).join(" ").trim() || user.username || "Пользователь";
      return;
    }
    const parsed = parseInitDataRaw();
    const rawUser = parsed.user;
    if (rawUser && typeof rawUser === "object") {
      state.user.id = String(rawUser.id || "");
      state.user.name = [rawUser.first_name, rawUser.last_name].filter(Boolean).join(" ").trim() || rawUser.username || "Пользователь";
    }
  }

  function syncAuthUiState() {
    if (!el.commentInput || !el.sendBtn) return;
    el.commentInput.disabled = false;
    el.sendBtn.disabled = false;
    el.commentInput.placeholder = "Сообщение";
  }

  function applyTheme() {
    const root = document.documentElement;
    root.classList.remove("theme-light", "theme-dark");
    if (state.themeMode === "light") {
      root.classList.add("theme-light");
    } else if (state.themeMode === "dark") {
      root.classList.add("theme-dark");
    }
  }

  function applyBackgroundScheme() {
    const scheme = BG_SCHEMES.find((item) => item.id === state.bgScheme) || BG_SCHEMES[0];
    document.documentElement.style.setProperty("--chat-step-1", scheme.start);
    document.documentElement.style.setProperty("--chat-step-2", scheme.end);
    document.documentElement.style.setProperty("--send-bg", scheme.end);
    document.documentElement.style.setProperty("--send-border", scheme.start);
  }

  function loadVisualSettings() {
    const storedTheme = localStorage.getItem(THEME_KEY);
    if (storedTheme && ["light", "dark", "system"].includes(storedTheme)) {
      state.themeMode = storedTheme;
    }
    const storedBg = localStorage.getItem(BG_KEY);
    if (storedBg && BG_SCHEMES.some((item) => item.id === storedBg)) {
      state.bgScheme = storedBg;
    }
  }

  function saveVisualSettings() {
    localStorage.setItem(THEME_KEY, state.themeMode);
    localStorage.setItem(BG_KEY, state.bgScheme);
  }

  function isAuthorizedUser() {
    return Boolean(state.user.id);
  }

  function ensureUserIdentity() {
    if (state.user.id) return;
    const key = `${STORAGE_PREFIX}guest-id`;
    let guestId = localStorage.getItem(key);
    if (!guestId) {
      guestId = `guest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      localStorage.setItem(key, guestId);
    }
    state.user.id = guestId;
    state.user.name = "Гость";
  }

  function storageKey(postId) {
    return `${STORAGE_PREFIX}${postId}`;
  }

  function normalizeComment(item) {
    const normalized = { ...item };
    normalized.reactions = normalized.reactions && typeof normalized.reactions === "object" ? normalized.reactions : {};
    normalized.reactedBy = normalized.reactedBy && typeof normalized.reactedBy === "object" ? normalized.reactedBy : {};
    normalized.replyTo = normalized.replyTo || null;
    if (!normalized.attachments || !Array.isArray(normalized.attachments)) {
      normalized.attachments = [];
    }
    return normalized;
  }

  function parseCommentTextAndAttachments(rawText) {
    const text = String(rawText || "");
    if (!text.includes(ATTACHMENTS_MARKER)) return { text, attachments: [] };
    const markerIndex = text.indexOf(ATTACHMENTS_MARKER);
    const mainText = text.slice(0, markerIndex).trimEnd();
    const payload = text.slice(markerIndex + ATTACHMENTS_MARKER.length);
    try {
      const attachments = JSON.parse(payload);
      if (Array.isArray(attachments)) {
        return { text: mainText, attachments };
      }
    } catch {}
    return { text, attachments: [] };
  }

  function getInitials(name) {
    const parts = String(name || "Пользователь").trim().split(/\s+/).filter(Boolean).slice(0, 2);
    return parts.map((part) => part[0]).join("") || "П";
  }

  function findCommentById(id) {
    return state.comments.find((x) => x.id === id) || null;
  }

  function closeContextMenu() {
    state.contextCommentId = null;
    el.contextMenu.hidden = true;
    el.contextMenuOverlay.hidden = true;
  }

  function openContextMenu(commentId, x, y) {
    state.contextCommentId = commentId;
    el.contextMenu.hidden = false;
    el.contextMenuOverlay.hidden = false;
    const menuWidth = 240;
    const menuHeight = 320;
    const left = Math.min(window.innerWidth - menuWidth - 12, Math.max(12, x));
    const top = Math.min(window.innerHeight - menuHeight - 12, Math.max(12, y));
    el.contextMenu.style.left = `${left}px`;
    el.contextMenu.style.top = `${top}px`;
  }

  function renderContextReactions() {
    el.contextReactions.innerHTML = "";
    for (const emoji of REACTIONS) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "reactionMenuBtn";
      btn.dataset.menuReaction = emoji;
      btn.setAttribute("aria-label", emoji);
      btn.textContent = emoji;
      el.contextReactions.appendChild(btn);
    }
  }

  async function toggleReaction(item, emoji) {
    if (!emoji || !REACTIONS.includes(emoji)) return;
    const current = item.reactedBy?.[state.user.id];
    item.reactions = item.reactions || {};
    item.reactedBy = item.reactedBy || {};

    if (current === emoji) {
      item.reactions[emoji] = Math.max(0, Number(item.reactions[emoji] || 0) - 1);
      delete item.reactedBy[state.user.id];
    } else {
      if (current) {
        item.reactions[current] = Math.max(0, Number(item.reactions[current] || 0) - 1);
      }
      item.reactions[emoji] = Number(item.reactions[emoji] || 0) + 1;
      item.reactedBy[state.user.id] = emoji;
    }
    saveComments();
    render();
  }

  function loadComments() {
    // local fallback happens in api wrappers
    const raw = localStorage.getItem(storageKey(state.postId));
    const parsed = safeParse(raw || "[]", []);
    state.comments = Array.isArray(parsed) ? parsed.map(normalizeComment) : [];
  }

  function saveComments() {
    localStorage.setItem(storageKey(state.postId), JSON.stringify(state.comments));
  }

  function getApiBase() {
    const fromWindow = window.__API_BASE_URL__ || "";
    const fromQuery = new URLSearchParams(window.location.search).get("api_base") || "";
    return (fromQuery || fromWindow).replace(/\/$/, "");
  }

  async function apiListComments() {
    if (!state.apiBase) return null;
    try {
      const resp = await fetch(`${state.apiBase}/api/comments?post_id=${encodeURIComponent(state.postId)}`);
      const data = await resp.json();
      if (!resp.ok || !data.ok) return null;
      return data.items.map((x) => ({
        ...(() => {
          const parsed = parseCommentTextAndAttachments(x.text);
          return {
            text: parsed.text,
            attachments: parsed.attachments,
          };
        })(),
        id: String(x.id),
        postId: x.post_id,
        authorId: x.author_id,
        authorName: x.author_name,
        createdAt: x.created_at,
      })).map(normalizeComment);
    } catch {
      return null;
    }
  }

  async function apiCreateComment(text, attachments = []) {
    if (!state.apiBase || !isAuthorizedUser()) return null;
    try {
      const payloadText = attachments.length
        ? `${text}\n${ATTACHMENTS_MARKER}${JSON.stringify(attachments)}`
        : text;
      const resp = await fetch(`${state.apiBase}/api/comments`, {
        method: "POST",
        headers: apiHeaders(),
        body: JSON.stringify({
          post_id: state.postId,
          author_id: state.user.id,
          author_name: state.user.name,
          text: payloadText,
        }),
      });
      const data = await resp.json();
      if (!resp.ok || !data.ok) return null;
      const x = data.item;
      return {
        ...(() => {
          const parsed = parseCommentTextAndAttachments(x.text);
          return {
            text: parsed.text,
            attachments: parsed.attachments,
          };
        })(),
        id: String(x.id),
        postId: x.post_id,
        authorId: x.author_id,
        authorName: x.author_name,
        createdAt: x.created_at,
      };
    } catch {
      return null;
    }
  }

  async function apiDeleteComment(commentId) {
    if (!state.apiBase || !isAuthorizedUser()) return false;
    try {
      const resp = await fetch(
        `${state.apiBase}/api/comments/${encodeURIComponent(commentId)}?author_id=${encodeURIComponent(state.user.id)}`,
        { method: "DELETE", headers: apiHeaders() }
      );
      const data = await resp.json();
      return !!(resp.ok && data.ok);
    } catch {
      return false;
    }
  }

  async function apiClearPostComments() {
    if (!state.apiBase) return false;
    try {
      const resp = await fetch(`${state.apiBase}/api/comments?post_id=${encodeURIComponent(state.postId)}`, { method: "DELETE", headers: apiHeaders() });
      const data = await resp.json();
      return !!(resp.ok && data.ok);
    } catch {
      return false;
    }
  }

  function formatTime(iso) {
    try {
      const d = new Date(iso);
      const now = new Date();
      const sameDay =
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate();
      if (sameDay) {
        return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
      }
      return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" }) + " " +
        d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return iso;
    }
  }

  function render() {
    el.commentsList.innerHTML = "";
    const list = [...state.comments].sort((a, b) => {
      const aa = new Date(a.createdAt).getTime();
      const bb = new Date(b.createdAt).getTime();
      return state.sortDesc ? bb - aa : aa - bb;
    });
    const query = state.searchQuery.trim().toLowerCase();
    const filteredList = query ? list.filter((item) => String(item.text || "").toLowerCase().includes(query)) : list;

    el.commentsCount.textContent = `Комментариев: ${filteredList.length}`;
    el.emptyState.style.display = filteredList.length ? "none" : "block";
    let prevDateKey = "";
    for (const item of filteredList) {
      const d = new Date(item.createdAt);
      const dateKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (dateKey !== prevDateKey) {
        prevDateKey = dateKey;
        const divider = document.createElement("li");
        divider.className = "dateDivider";
        divider.textContent = d.toLocaleDateString("ru-RU", { day: "2-digit", month: "long", year: "numeric" });
        el.commentsList.appendChild(divider);
      }
      const node = el.tpl.content.firstElementChild.cloneNode(true);
      node.dataset.id = item.id;
      node.id = `comment-${item.id}`;
      const isMine = isAuthorizedUser() && item.authorId === state.user.id;
      node.classList.add(isMine ? "msg--mine" : "msg--other");
      node.querySelector(".msg__avatar").textContent = getInitials(item.authorName);
      node.querySelector(".bubble__author").textContent = item.authorName || "Пользователь";
      node.querySelector(".bubble__time").textContent = formatTime(item.createdAt);
      node.querySelector(".bubble__text").textContent = item.text;
      if (item.attachments?.length) {
        const attachmentsWrap = document.createElement("div");
        attachmentsWrap.className = "bubble__attachments";
        for (const file of item.attachments) {
          const chip = document.createElement("a");
          chip.className = "attachChip";
          chip.textContent = `📎 ${file.name || "файл"}`;
          chip.href = file.url || "#";
          chip.target = "_blank";
          chip.rel = "noopener noreferrer";
          attachmentsWrap.appendChild(chip);
        }
        node.querySelector(".bubble__text").after(attachmentsWrap);
      }
      node.classList.toggle("is-selected", !!item.selected);

      const reactionsWrap = node.querySelector(".bubble__reactions");
      reactionsWrap.innerHTML = "";
      for (const key of Object.keys(item.reactions || {})) {
        const count = Number(item.reactions?.[key] || 0);
        if (count < 1) continue;
        const pill = document.createElement("span");
        pill.className = "reactionPill";
        pill.textContent = `${key} ${count}`;
        reactionsWrap.appendChild(pill);
      }

      if (item.replyTo) {
        const replyLine = document.createElement("div");
        replyLine.className = "replyPreview replyPreview--inBubble";
        replyLine.innerHTML = `<span class="replyPreview__author">${item.replyTo.author}</span><span class="replyPreview__text">${item.replyTo.text}</span>`;
        node.querySelector(".bubble__text").before(replyLine);
      }

      node.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        openContextMenu(item.id, e.clientX, e.clientY);
      });
      node.addEventListener("click", (e) => {
        const action = e.target?.dataset?.action;
        if (action !== "reply-inline") return;
        state.replyTo = {
          id: item.id,
          author: item.authorName || "Пользователь",
          text: String(item.text || "").slice(0, 80),
        };
        syncReplyPreview();
        el.commentInput.focus();
      });

      el.commentsList.appendChild(node);
    }
  }

  function updateCounter() {
    if (!el.commentInput || !el.charCounter) return;
    const len = el.commentInput.value.length;
    el.charCounter.textContent = `${len} / ${MAX_LEN}`;
  }

  function syncReplyPreview() {
    if (!el.replyPreview || !el.replyPreviewAuthor || !el.replyPreviewText) return;
    if (!state.replyTo) {
      el.replyPreview.hidden = true;
      return;
    }
    el.replyPreview.hidden = false;
    el.replyPreviewAuthor.textContent = state.replyTo.author;
    el.replyPreviewText.textContent = state.replyTo.text;
  }

  function syncScrollDownButton() {
    const body = el.chatBody;
    if (!body) return;
    const distance = body.scrollHeight - body.scrollTop - body.clientHeight;
    el.scrollDownBtn.classList.toggle("is-visible", distance > 220);
  }

  function scrollToBottom(smooth = true) {
    const body = el.chatBody;
    if (!body) return;
    body.scrollTo({ top: body.scrollHeight, behavior: smooth ? "smooth" : "auto" });
  }

  function syncComposerSize() {
    const node = el.commentInput;
    if (!node) return;

    node.style.height = "auto";
    const min = 40;
    const max = 120;
    const next = Math.min(max, Math.max(min, node.scrollHeight));
    node.style.height = `${next}px`;
    node.style.overflowY = node.scrollHeight > max ? "auto" : "hidden";
  }

  function renderAttachmentsBar() {
    if (!el.attachmentsBar) return;
    el.attachmentsBar.innerHTML = "";
    el.attachmentsBar.hidden = !state.attachments.length;
    for (const item of state.attachments) {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "attachDraftChip";
      chip.textContent = `📎 ${item.name}`;
      chip.dataset.id = item.id;
      el.attachmentsBar.appendChild(chip);
    }
  }

  async function addComment(text) {
    ensureUserIdentity();
    const localItem = {
      id: `${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
      postId: state.postId,
      authorId: state.user.id,
      authorName: state.user.name,
      text,
      createdAt: new Date().toISOString(),
      replyTo: state.replyTo,
      reactions: {},
      reactedBy: {},
    };
    const preparedAttachments = state.attachments.map((item) => ({
      name: item.name,
      url: item.url,
      type: item.type,
    }));
    const remoteItemRaw = await apiCreateComment(text.slice(0, MAX_LEN), preparedAttachments);
    const remoteItem = remoteItemRaw ? normalizeComment({ ...remoteItemRaw, replyTo: state.replyTo, attachments: preparedAttachments }) : null;
    if (remoteItem) {
      const fresh = await apiListComments();
      state.comments = fresh || [remoteItem, ...state.comments];
    } else {
      // Если API недоступен (например, GitHub Pages без backend), сохраняем локально.
      state.comments.push(localItem);
    }
    state.replyTo = null;
    state.attachments = [];
    syncReplyPreview();
    renderAttachmentsBar();
    saveComments();
    render();
    scrollToBottom();
  }

  async function handleSend() {
    const text = el.commentInput.value.trim();
    if (!text) return;
    if (text.length > MAX_LEN) {
      alert("Слишком длинный комментарий.");
      return;
    }
    await addComment(text);
    el.commentInput.value = "";
    updateCounter();
    syncComposerSize();
  }

  function setupEvents() {
    if (!el.commentInput || !el.sendBtn || !el.sortBtn || !el.clearBtn) return;
    el.commentInput.addEventListener("input", () => {
      updateCounter();
      syncComposerSize();
    });
    el.sendBtn.addEventListener("click", () => { void handleSend(); });
    el.commentInput.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") void handleSend();
    });
    el.commentInput.addEventListener("focus", () => {
      setTimeout(() => scrollToBottom(false), 120);
    });
    el.searchInput?.addEventListener("input", () => {
      state.searchQuery = el.searchInput.value || "";
      render();
      syncScrollDownButton();
    });
    el.searchToggleBtn?.addEventListener("click", () => {
      state.searchOpen = !state.searchOpen;
      el.searchPanel.hidden = !state.searchOpen;
      if (state.searchOpen) el.searchInput.focus();
    });
    el.searchCloseBtn?.addEventListener("click", () => {
      state.searchOpen = false;
      state.searchQuery = "";
      el.searchInput.value = "";
      el.searchPanel.hidden = true;
      render();
      syncScrollDownButton();
    });
    el.settingsBtn?.addEventListener("click", () => {
      el.settingsModal.hidden = false;
    });
    el.settingsCloseBtn?.addEventListener("click", () => {
      el.settingsModal.hidden = true;
    });
    el.settingsModal?.addEventListener("click", (e) => {
      if (e.target === el.settingsModal) el.settingsModal.hidden = true;
    });
    document.querySelectorAll("[data-theme]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.themeMode = btn.dataset.theme;
        applyTheme();
        saveVisualSettings();
      });
    });
    el.paletteGrid?.addEventListener("click", (e) => {
      const target = e.target.closest("[data-bg]");
      if (!target) return;
      state.bgScheme = target.dataset.bg;
      applyBackgroundScheme();
      saveVisualSettings();
    });
    el.openBotBtn?.addEventListener("click", () => {
      const botUrl = "https://max.ru/id911114411208_3_bot";
      const webApp = getWebApp();
      if (webApp && typeof webApp.openLink === "function") {
        webApp.openLink(botUrl);
        return;
      }
      window.open(botUrl, "_blank", "noopener");
    });
    el.attachBtn?.addEventListener("click", () => {
      el.fileInput.click();
    });
    el.fileInput?.addEventListener("change", async () => {
      const files = Array.from(el.fileInput.files || []).slice(0, 6);
      const mapped = await Promise.all(files.map(async (file) => {
        const blobUrl = URL.createObjectURL(file);
        return {
          id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          name: file.name,
          type: file.type || "application/octet-stream",
          url: blobUrl,
        };
      }));
      state.attachments = mapped;
      renderAttachmentsBar();
    });
    el.attachmentsBar?.addEventListener("click", (e) => {
      const chip = e.target.closest("[data-id]");
      if (!chip) return;
      const id = chip.dataset.id;
      state.attachments = state.attachments.filter((item) => item.id !== id);
      renderAttachmentsBar();
    });
    el.replyCancelBtn?.addEventListener("click", () => {
      state.replyTo = null;
      syncReplyPreview();
    });
    el.chatBody?.addEventListener("scroll", syncScrollDownButton);
    el.scrollDownBtn?.addEventListener("click", () => scrollToBottom(true));
    el.contextMenuOverlay?.addEventListener("click", closeContextMenu);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeContextMenu();
    });
    el.contextMenu?.addEventListener("click", async (e) => {
      const item = findCommentById(state.contextCommentId);
      if (!item) {
        closeContextMenu();
        return;
      }
      const reaction = e.target?.dataset?.menuReaction || e.target?.closest("[data-menu-reaction]")?.dataset?.menuReaction;
      if (reaction) {
        await toggleReaction(item, reaction);
        closeContextMenu();
        return;
      }

      const action = e.target?.dataset?.menuAction || e.target?.closest("[data-menu-action]")?.dataset?.menuAction;
      if (!action) return;

      if (action === "reply") {
        state.replyTo = {
          id: item.id,
          author: item.authorName || "Пользователь",
          text: String(item.text || "").slice(0, 80),
        };
        syncReplyPreview();
        el.commentInput.focus();
      }

      if (action === "copy") {
        await navigator.clipboard.writeText(item.text || "");
      }

      if (action === "report") {
        alert("Жалоба отправлена.");
      }

      if (action === "delete") {
        if (item.authorId === state.user.id) {
          const deletedRemote = await apiDeleteComment(item.id);
          if (!deletedRemote) {
            state.comments = state.comments.filter((x) => x.id !== item.id);
            saveComments();
          } else {
            const fresh = await apiListComments();
            if (fresh) {
              state.comments = fresh;
              saveComments();
            }
          }
          render();
        } else {
          alert("Можно удалять только свои комментарии.");
        }
      }

      if (action === "select") {
        item.selected = !item.selected;
        saveComments();
        render();
      }

      closeContextMenu();
    });

    el.sortBtn.addEventListener("click", () => {
      state.sortDesc = !state.sortDesc;
      el.sortBtn.textContent = state.sortDesc ? "Сначала новые" : "Сначала старые";
      render();
      syncScrollDownButton();
    });

    el.clearBtn.addEventListener("click", async () => {
      const ok = confirm("Очистить все комментарии для этого поста?");
      if (!ok) return;
      const clearedRemote = await apiClearPostComments();
      if (!clearedRemote) {
        state.comments = [];
      } else {
        const fresh = await apiListComments();
        state.comments = fresh || [];
      }
      saveComments();
      render();
      syncScrollDownButton();
    });

  }

  function boot() {
    setThemeFromMax();
    ensureUserIdentity();
    loadVisualSettings();
    applyTheme();
    applyBackgroundScheme();
    state.apiBase = getApiBase() || window.location.origin;
    state.postId = resolvePostId();
    state.postLink = resolvePostLink(state.postId);
    syncAuthUiState();
    setTimeout(() => {
      setThemeFromMax();
      syncAuthUiState();
    }, 1200);
    setTimeout(() => {
      setThemeFromMax();
      syncAuthUiState();
    }, 2500);
    loadComments();
    if (el.sortBtn) el.sortBtn.textContent = state.sortDesc ? "Сначала новые" : "Сначала старые";
    if (el.searchPanel) el.searchPanel.hidden = true;
    updateCounter();
    syncComposerSize();
    syncReplyPreview();
    setupEvents();
    renderContextReactions();
    if (el.paletteGrid) {
      el.paletteGrid.innerHTML = BG_SCHEMES.map((scheme) => (
      `<button type="button" class="paletteItem" data-bg="${scheme.id}" style="--g1:${scheme.start};--g2:${scheme.end}" aria-label="${scheme.label}"></button>`
      )).join("");
    }
    render();
    syncScrollDownButton();
    if (state.apiBase) {
      apiListComments().then((items) => {
        if (items) {
          state.comments = items;
          saveComments();
          render();
          syncScrollDownButton();
        }
      });
    }
  }

  function setupViewportHeightSync() {
    const apply = () => {
      const vh = (window.visualViewport?.height || window.innerHeight) * 0.01;
      document.documentElement.style.setProperty("--app-vh", `${vh}px`);
    };
    apply();
    window.addEventListener("resize", apply);
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", apply);
      window.visualViewport.addEventListener("scroll", apply);
    }
  }

  setupViewportHeightSync();
  boot();
})();
