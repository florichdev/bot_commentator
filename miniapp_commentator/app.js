(function () {
  const STORAGE_PREFIX = "max-commentator:v1:";
  const MAX_LEN = 4000;
  const DEFAULT_API_BASE = "https://95.140.158.128.sslip.io";

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
    bgScheme: "gradient1",
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
    gallerySlider: document.getElementById("gallerySlider"),
  };
  const THEME_KEY = "max-commentator:theme";
  const BG_KEY = "max-commentator:bg";
  const ATTACHMENTS_MARKER = "__ATTACHMENTS__:";
  const BG_SCHEMES = [
    { id: "gradient1", label: "Изумрудный", gradient: "linear-gradient(90deg, #0f5739,#3d8e66,#45c9a4,#46b5a9,#52c9eb)" },
    { id: "gradient2", label: "Пурпурный закат", gradient: "linear-gradient(90deg, #8b24ab,#bb2c9d,#eb584d)" },
    { id: "gradient3", label: "Космический", gradient: "linear-gradient(90deg, #47bdf0,#194dc8,#d632ec)" },
    { id: "gradient4", label: "Океанская волна", gradient: "linear-gradient(90deg, #1b2c55,#3d85a9,#63cac8,#b8edff)" },
    { id: "gradient5", label: "Ночное небо", gradient: "linear-gradient(90deg, #0f172a,#4338ca)" },
    { id: "gradient6", label: "Тропический", gradient: "linear-gradient(90deg, #395492,#0099c0,#3dd5a8)" },
    { id: "gradient7", label: "Галактика", gradient: "linear-gradient(45deg, #040d2c,#462a8b,#c505d6)" },
    { id: "gradient8", label: "Кристальный", gradient: "linear-gradient(90deg, #025fa7,#1682d4,#00b0d0,#09d3f6,#42e3ff)" },
    { id: "gradient9", label: "Лавандовый", gradient: "linear-gradient(90deg, #5b247a,#8e44ad,#c39bd3)" },
    { id: "gradient10", label: "Огненный", gradient: "linear-gradient(90deg, #c0392b,#e74c3c,#f39c12,#f1c40f)" },
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

  function parseWebAppDataFromHash() {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const webAppDataRaw = hash.get("WebAppData");
    if (!webAppDataRaw) return {};
    try {
      const params = new URLSearchParams(decodeURIComponent(webAppDataRaw));
      const parsed = {};
      for (const [k, v] of params.entries()) parsed[k] = v;
      if (parsed.user && typeof parsed.user === "string") {
        try {
          parsed.user = JSON.parse(parsed.user);
        } catch {
          // keep raw user value
        }
      }
      return parsed;
    } catch {
      return {};
    }
  }

  function parseWebAppDataFromSearch() {
    const params = new URLSearchParams(window.location.search);
    const webAppDataRaw = params.get("WebAppData");
    if (!webAppDataRaw) return {};
    try {
      const parsedParams = new URLSearchParams(decodeURIComponent(webAppDataRaw));
      const parsed = {};
      for (const [k, v] of parsedParams.entries()) parsed[k] = v;
      if (parsed.user && typeof parsed.user === "string") {
        try {
          parsed.user = JSON.parse(parsed.user);
        } catch {
          // keep raw user value
        }
      }
      return parsed;
    } catch {
      return {};
    }
  }

  function parseUserFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const rawUser = params.get("user") || hash.get("user");
    if (!rawUser) return null;
    try {
      const decoded = decodeURIComponent(rawUser);
      const parsed = JSON.parse(decoded);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch {
      return null;
    }
  }

  function apiHeaders() {
    const headers = { "Content-Type": "application/json" };
    
    // Приоритет 1: из WebApp
    let initData = getInitDataRaw();
    
    // Приоритет 2: из hash (если WebApp не загрузился)
    if (!initData && window.__INIT_DATA_FROM_HASH__) {
      initData = window.__INIT_DATA_FROM_HASH__;
      console.log("[DEBUG] Using initData from hash");
    }
    
    console.log("[DEBUG] apiHeaders - initData:", initData ? `${initData.substring(0, 50)}...` : "EMPTY");
    if (initData) headers["X-Max-Init-Data"] = initData;
    console.log("[DEBUG] apiHeaders - headers:", headers);
    return headers;
  }

  function parsePostIdFromStartParam(value) {
    // Форматы: 
    // post_123 | post=123 | ch_<channel>_p_mid_xxx | 123
    // post_mid_xxx_api_base64encodedurl (новый формат)
    if (!value) return null;
    const decoded = decodeURIComponent(String(value));
    
    // Новый формат: post_mid_xxx_api_base64
    if (decoded.startsWith("post_") && decoded.includes("_api_")) {
      const parts = decoded.split("_api_");
      const postPart = parts[0].slice(5); // убираем "post_"
      if (postPart) {
        const postId = postPart.replace(/_/g, ".");
        
        // Декодируем api_base если есть
        if (parts[1]) {
          try {
            // Добавляем padding если нужно
            let base64 = parts[1];
            while (base64.length % 4 !== 0) {
              base64 += '=';
            }
            const apiBase = atob(base64.replace(/-/g, '+').replace(/_/g, '/'));
            // Сохраняем api_base для использования
            window.__STARTAPP_API_BASE__ = apiBase;
          } catch (e) {
            console.warn("Failed to decode api_base from startapp:", e);
          }
        }
        
        return postId;
      }
    }
    
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
    console.log("[DEBUG] setThemeFromMax called");
    console.log("[DEBUG] webApp:", webApp);
    console.log("[DEBUG] window.location.hash:", window.location.hash);
    console.log("[DEBUG] window.location.search:", window.location.search);
    
    // КРИТИЧНО: Сначала пробуем получить данные из hash, даже если webApp не загрузился
    // MAX передает данные в #WebAppData когда миниапп открывается через deeplink
    const hashData = parseWebAppDataFromHash();
    console.log("[DEBUG] hashData:", hashData);
    const hashUser = hashData.user;
    if (hashUser && typeof hashUser === "object") {
      console.log("[DEBUG] ✅ User from hash:", hashUser);
      state.user.id = String(hashUser.id || "");
      state.user.name = [hashUser.first_name, hashUser.last_name].filter(Boolean).join(" ").trim() || hashUser.username || "Пользователь";
      // Сохраняем initData для API запросов
      if (hashData.query_id || hashData.auth_date) {
        window.__INIT_DATA_FROM_HASH__ = Object.entries(hashData)
          .map(([k, v]) => `${k}=${typeof v === 'object' ? JSON.stringify(v) : v}`)
          .join('&');
        console.log("[DEBUG] Saved initData from hash for API");
      }
      // Продолжаем инициализацию webApp если он есть
      if (webApp) {
        if (typeof webApp.ready === "function") webApp.ready();
        if (typeof webApp.expand === "function") webApp.expand();
        if (typeof webApp.setBackgroundColor === "function") webApp.setBackgroundColor("#181818");
        if (typeof webApp.setHeaderColor === "function") webApp.setHeaderColor("#181818");
      }
      console.log("[DEBUG] Final state.user:", state.user);
      return;
    }
    
    if (!webApp) {
      console.warn("[DEBUG] No webApp found and no data in hash");
      // Пробуем другие источники
      const searchData = parseWebAppDataFromSearch();
      console.log("[DEBUG] searchData:", searchData);
      const searchUser = searchData.user;
      if (searchUser && typeof searchUser === "object") {
        console.log("[DEBUG] ✅ User from search:", searchUser);
        state.user.id = String(searchUser.id || "");
        state.user.name = [searchUser.first_name, searchUser.last_name].filter(Boolean).join(" ").trim() || searchUser.username || "Пользователь";
        console.log("[DEBUG] Final state.user:", state.user);
        return;
      }
      
      const urlUser = parseUserFromUrl();
      console.log("[DEBUG] urlUser:", urlUser);
      if (urlUser && typeof urlUser === "object") {
        console.log("[DEBUG] ✅ User from URL:", urlUser);
        state.user.id = String(urlUser.id || "");
        state.user.name = [urlUser.first_name, urlUser.last_name].filter(Boolean).join(" ").trim() || urlUser.username || "Пользователь";
        console.log("[DEBUG] Final state.user:", state.user);
        return;
      }
      
      console.log("[DEBUG] ❌ No user data found anywhere");
      console.log("[DEBUG] Final state.user:", state.user);
      return;
    }
    
    if (typeof webApp.ready === "function") webApp.ready();
    if (typeof webApp.expand === "function") webApp.expand();
    if (typeof webApp.setBackgroundColor === "function") webApp.setBackgroundColor("#181818");
    if (typeof webApp.setHeaderColor === "function") webApp.setHeaderColor("#181818");

    console.log("[DEBUG] webApp.initDataUnsafe:", webApp.initDataUnsafe);
    console.log("[DEBUG] webApp.initData:", webApp.initData);
    
    const user = webApp.initDataUnsafe?.user;
    if (user) {
      console.log("[DEBUG] ✅ User from initDataUnsafe:", user);
      state.user.id = String(user.id || "");
      state.user.name = [user.first_name, user.last_name].filter(Boolean).join(" ").trim() || user.username || "Пользователь";
      console.log("[DEBUG] Final state.user:", state.user);
      return;
    }
    
    const parsed = parseInitDataRaw();
    console.log("[DEBUG] Parsed initDataRaw:", parsed);
    const rawUser = parsed.user;
    if (rawUser && typeof rawUser === "object") {
      console.log("[DEBUG] ✅ User from parseInitDataRaw:", rawUser);
      state.user.id = String(rawUser.id || "");
      state.user.name = [rawUser.first_name, rawUser.last_name].filter(Boolean).join(" ").trim() || rawUser.username || "Пользователь";
      console.log("[DEBUG] Final state.user:", state.user);
      return;
    }
    
    console.log("[DEBUG] ❌ No user data found");
    console.log("[DEBUG] Final state.user:", state.user);
  }

  function syncAuthUiState() {
    if (!el.commentInput || !el.sendBtn) return;
    el.commentInput.disabled = false;
    el.sendBtn.disabled = false;
    el.commentInput.placeholder = "Сообщение";
  }

  function syncSortButton() {
    if (!el.sortBtn) return;
    const iconId = state.sortDesc ? "i_arrow_down" : "i_arrow_up";
    const aria = state.sortDesc ? "Сортировка: сначала новые" : "Сортировка: сначала старые";
    el.sortBtn.setAttribute("aria-label", aria);
    el.sortBtn.innerHTML = `<svg class="icon"><use href="#${iconId}"></use></svg>`;
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
    if (scheme.gradient) {
      document.documentElement.style.setProperty("--chat-gradient", scheme.gradient);
      // Извлекаем первый и последний цвет из градиента для кнопки отправки
      const colors = scheme.gradient.match(/#[0-9a-fA-F]{6}/g) || [];
      if (colors.length >= 2) {
        document.documentElement.style.setProperty("--send-bg", colors[colors.length - 1]);
        document.documentElement.style.setProperty("--send-border", colors[0]);
      }
    } else {
      // Fallback для старого формата
      document.documentElement.style.setProperty("--chat-step-1", scheme.start);
      document.documentElement.style.setProperty("--chat-step-2", scheme.end);
      document.documentElement.style.setProperty("--send-bg", scheme.end);
      document.documentElement.style.setProperty("--send-border", scheme.start);
    }
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

    const rect = el.contextMenu.getBoundingClientRect();
    const menuWidth = rect.width || 240;
    const menuHeight = rect.height || 320;
    const left = Math.min(window.innerWidth - menuWidth - 12, Math.max(12, (window.innerWidth - menuWidth) / 2));
    const top = Math.min(window.innerHeight - menuHeight - 12, Math.max(12, (window.innerHeight - menuHeight) / 2));
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
    // Приоритет 1: из startapp payload
    if (window.__STARTAPP_API_BASE__) {
      return window.__STARTAPP_API_BASE__;
    }
    
    // Приоритет 2: из query параметра
    const fromQuery = new URLSearchParams(window.location.search).get("api_base") || "";
    if (fromQuery) return fromQuery.replace(/\/$/, "");
    
    // Приоритет 3: из window.__API_BASE_URL__
    const fromWindow = window.__API_BASE_URL__ || "";
    const fromWindowNormalized = String(fromWindow || "").replace(/\/$/, "");
    if (!fromWindowNormalized) return "";

    const isGithubPages = /\.github\.io$/i.test(window.location.hostname || "");
    const isSameOriginWindowApi = fromWindowNormalized === window.location.origin || fromWindowNormalized === `${window.location.origin}/api`;
    if (isGithubPages && isSameOriginWindowApi) return DEFAULT_API_BASE;

    return fromWindowNormalized || DEFAULT_API_BASE;
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

  async function uploadFileToServer(file) {
    if (!state.apiBase) {
      console.error("API base URL not set");
      return null;
    }
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      // Получаем initData для авторизации
      let initData = getInitDataRaw();
      if (!initData && window.__INIT_DATA_FROM_HASH__) {
        initData = window.__INIT_DATA_FROM_HASH__;
      }
      
      const resp = await fetch(`${state.apiBase}/api/upload`, {
        method: "POST",
        headers: {
          "X-Max-Init-Data": initData || "",
        },
        body: formData,
      });
      
      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}));
        console.error("Upload failed:", errorData.error || resp.statusText);
        return null;
      }
      
      const data = await resp.json();
      return data.url || null;
    } catch (error) {
      console.error("Upload error:", error);
      return null;
    }
  }

  function showUploadProgress(fileCount) {
    // Создаем элемент прогресса если его нет
    let progressEl = document.getElementById('uploadProgress');
    if (!progressEl) {
      progressEl = document.createElement('div');
      progressEl.id = 'uploadProgress';
      progressEl.className = 'uploadProgress';
      progressEl.innerHTML = '<div class="uploadProgress__content"></div>';
      document.body.appendChild(progressEl);
    }
    
    const content = progressEl.querySelector('.uploadProgress__content');
    content.innerHTML = `<div class="uploadProgress__title">Загрузка файлов...</div><div class="uploadProgress__list"></div>`;
    progressEl.hidden = false;
  }

  function updateUploadProgress(index, status, message) {
    const progressEl = document.getElementById('uploadProgress');
    if (!progressEl) return;
    
    const list = progressEl.querySelector('.uploadProgress__list');
    if (!list) return;
    
    let item = list.querySelector(`[data-index="${index}"]`);
    if (!item) {
      item = document.createElement('div');
      item.className = 'uploadProgress__item';
      item.dataset.index = index;
      list.appendChild(item);
    }
    
    const icons = {
      uploading: '⏳',
      success: '✅',
      error: '❌'
    };
    
    item.className = `uploadProgress__item uploadProgress__item--${status}`;
    item.textContent = `${icons[status] || ''} ${message}`;
  }

  function hideUploadProgress() {
    setTimeout(() => {
      const progressEl = document.getElementById('uploadProgress');
      if (progressEl) {
        progressEl.hidden = true;
      }
    }, 2000); // Скрываем через 2 секунды
  }

  async function addComment(text) {
    ensureUserIdentity();
    
    const preparedAttachments = state.attachments.map((item) => ({
      name: item.name,
      url: item.url,
      type: item.type,
    }));
    
    // Сохраняем комментарий на сервере
    const remoteItemRaw = await apiCreateComment(text.slice(0, MAX_LEN), preparedAttachments);
    
    if (remoteItemRaw) {
      // Успешно сохранено на сервере - обновляем список с сервера
      const fresh = await apiListComments();
      if (fresh) {
        state.comments = fresh;
      }
    } else {
      // Ошибка сохранения на сервере
      console.error("Failed to save comment to server");
      alert("Не удалось сохранить комментарий. Проверьте подключение.");
      return;
    }
    
    state.replyTo = null;
    state.attachments = [];
    syncReplyPreview();
    renderAttachmentsBar();
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
        // Автоматически меняем фон под тему
        if (state.themeMode === "light") {
          state.bgScheme = "gradient4"; // Светлый градиент
        } else if (state.themeMode === "dark") {
          state.bgScheme = "gradient5"; // Темный градиент
        }
        applyBackgroundScheme();
        saveVisualSettings();
        // Обновляем палитру
        if (el.paletteGrid) {
          el.paletteGrid.innerHTML = BG_SCHEMES.map((scheme) => {
            if (scheme.gradient) {
              return `<button type="button" class="paletteItem" data-bg="${scheme.id}" style="background:${scheme.gradient}" aria-label="${scheme.label}"></button>`;
            } else {
              return `<button type="button" class="paletteItem" data-bg="${scheme.id}" style="--g1:${scheme.start};--g2:${scheme.end}" aria-label="${scheme.label}"></button>`;
            }
          }).join("");
        }
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
      
      if (!files.length) return;
      
      // Показываем индикатор загрузки
      showUploadProgress(files.length);
      
      const mapped = await Promise.all(files.map(async (file, index) => {
        // Проверка размера файла
        const maxSize = 10 * 1024 * 1024; // 10 MB
        if (file.size > maxSize) {
          console.error(`File ${file.name} is too large (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
          updateUploadProgress(index, 'error', `Файл слишком большой (макс 10 МБ)`);
          return null;
        }
        
        // Проверка типа файла
        const allowedTypes = [
          'image/jpeg', 'image/png', 'image/gif', 'image/webp',
          'video/mp4', 'video/webm',
          'application/pdf', 'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain'
        ];
        
        if (!allowedTypes.includes(file.type) && file.type !== 'application/octet-stream') {
          console.error(`File ${file.name} has unsupported type: ${file.type}`);
          updateUploadProgress(index, 'error', `Неподдерживаемый тип файла`);
          return null;
        }
        
        // Загружаем файл на сервер
        updateUploadProgress(index, 'uploading', `Загрузка ${file.name}...`);
        const uploadedUrl = await uploadFileToServer(file);
        
        if (!uploadedUrl) {
          console.error("Failed to upload file:", file.name);
          updateUploadProgress(index, 'error', `Ошибка загрузки ${file.name}`);
          return null;
        }
        
        updateUploadProgress(index, 'success', `Загружено: ${file.name}`);
        
        return {
          id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          name: file.name,
          type: file.type || "application/octet-stream",
          url: uploadedUrl, // ✅ Публичный URL с сервера
        };
      }));
      
      state.attachments = mapped.filter(Boolean); // Убираем null (неудачные загрузки)
      renderAttachmentsBar();
      hideUploadProgress();
      
      // Очищаем input для возможности повторной загрузки тех же файлов
      if (el.fileInput) el.fileInput.value = '';
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
      syncSortButton();
      render();
      syncScrollDownButton();
    });

    // Проверяем права администратора перед показом кнопки очистки
    async function checkAdminRights() {
      if (!state.apiBase || !isAuthorizedUser()) {
        if (el.clearBtn) el.clearBtn.style.display = "none";
        return;
      }
      
      try {
        // Проверяем права через API
        const resp = await fetch(`${state.apiBase}/api/check_admin?post_id=${encodeURIComponent(state.postId)}`, {
          method: "GET",
          headers: apiHeaders(),
        });
        
        if (resp.ok) {
          const data = await resp.json();
          const isAdmin = data.is_admin || false;
          if (el.clearBtn) {
            el.clearBtn.style.display = isAdmin ? "inline-flex" : "none";
          }
        } else {
          // Если API не поддерживает проверку прав, скрываем кнопку
          if (el.clearBtn) el.clearBtn.style.display = "none";
        }
      } catch (error) {
        console.error("Failed to check admin rights:", error);
        if (el.clearBtn) el.clearBtn.style.display = "none";
      }
    }
    checkAdminRights();

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
    state.apiBase = getApiBase();
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
    syncSortButton();
    if (el.searchPanel) el.searchPanel.hidden = true;
    updateCounter();
    syncComposerSize();
    syncReplyPreview();
    setupEvents();
    renderContextReactions();
    
    // Инициализация галереи
    if (el.gallerySlider) {
      const galleryImages = [
        { src: 'img/channel.png', alt: 'Канал', link: 'https://max.ru/id920358183590_biz' },
        { src: 'img/downloader.png', alt: 'Скачиватель', link: 'https://max.ru/id911114411208_1_bot' },
        { src: 'img/random.png', alt: 'Рандомайзер', link: 'https://max.ru/id911114411208_2_bot' },
      ];
      
      let currentSlide = 0;
      let autoSlideInterval = null;
      
      const galleryContainer = document.createElement('div');
      galleryContainer.className = 'galleryContainer';
      
      const imagesHtml = galleryImages.map((img, idx) => 
        `<a href="${img.link}" target="_blank" rel="noopener noreferrer" class="galleryLink" data-index="${idx}">
          <img class="galleryItem ${idx === 0 ? 'active' : ''}" src="${img.src}" alt="${img.alt}" loading="lazy" onerror="this.style.display='none'" draggable="false">
        </a>`
      ).join('');
      
      const dotsHtml = `<div class="galleryDots">${galleryImages.map((_, idx) => 
        `<button class="galleryDot ${idx === 0 ? 'active' : ''}" data-slide="${idx}" aria-label="Слайд ${idx + 1}"></button>`
      ).join('')}</div>`;
      
      galleryContainer.innerHTML = imagesHtml;
      el.gallerySlider.innerHTML = '';
      el.gallerySlider.appendChild(galleryContainer);
      el.gallerySlider.insertAdjacentHTML('beforeend', dotsHtml);
      
      // Функция переключения слайда
      function goToSlide(index) {
        const itemWidth = galleryContainer.querySelector('.galleryLink').offsetWidth + 10;
        galleryContainer.scrollTo({ left: index * itemWidth, behavior: 'smooth' });
        currentSlide = index;
        document.querySelectorAll('.galleryDot').forEach((dot, idx) => {
          dot.classList.toggle('active', idx === currentSlide);
        });
      }
      
      // Автосмена слайдов каждые 5 секунд
      function startAutoSlide() {
        stopAutoSlide();
        autoSlideInterval = setInterval(() => {
          const nextSlide = (currentSlide + 1) % galleryImages.length;
          goToSlide(nextSlide);
        }, 5000);
      }
      
      function stopAutoSlide() {
        if (autoSlideInterval) {
          clearInterval(autoSlideInterval);
          autoSlideInterval = null;
        }
      }
      
      // Запускаем автосмену
      startAutoSlide();
      
      // Останавливаем автосмену при взаимодействии, возобновляем через 10 сек
      let resumeTimeout = null;
      function pauseAndResume() {
        stopAutoSlide();
        clearTimeout(resumeTimeout);
        resumeTimeout = setTimeout(() => {
          startAutoSlide();
        }, 10000);
      }
      
      // Обработчик скролла для переключения точек
      galleryContainer.addEventListener('scroll', () => {
        const scrollLeft = galleryContainer.scrollLeft;
        const itemWidth = galleryContainer.querySelector('.galleryLink').offsetWidth + 10;
        const newIndex = Math.round(scrollLeft / itemWidth);
        
        if (newIndex !== currentSlide) {
          currentSlide = newIndex;
          document.querySelectorAll('.galleryDot').forEach((dot, idx) => {
            dot.classList.toggle('active', idx === currentSlide);
          });
        }
      });
      
      // Клик по точкам
      el.gallerySlider.addEventListener('click', (e) => {
        const dot = e.target.closest('.galleryDot');
        if (!dot) return;
        const slideIndex = parseInt(dot.dataset.slide);
        goToSlide(slideIndex);
        pauseAndResume();
      });
      
      // Drag-скролл мышкой
      let isDragging = false;
      let startX = 0;
      let scrollLeft = 0;
      let hasMoved = false;
      
      galleryContainer.addEventListener('mousedown', (e) => {
        // Игнорируем правую кнопку мыши
        if (e.button !== 0) return;
        
        isDragging = true;
        hasMoved = false;
        startX = e.pageX - galleryContainer.offsetLeft;
        scrollLeft = galleryContainer.scrollLeft;
        galleryContainer.style.cursor = 'grabbing';
        galleryContainer.style.userSelect = 'none';
        pauseAndResume();
      });
      
      galleryContainer.addEventListener('mouseleave', () => {
        if (isDragging) {
          isDragging = false;
          galleryContainer.style.cursor = 'grab';
          galleryContainer.style.userSelect = '';
        }
      });
      
      galleryContainer.addEventListener('mouseup', () => {
        if (isDragging) {
          isDragging = false;
          galleryContainer.style.cursor = 'grab';
          galleryContainer.style.userSelect = '';
        }
      });
      
      galleryContainer.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        e.preventDefault();
        hasMoved = true;
        const x = e.pageX - galleryContainer.offsetLeft;
        const walk = (x - startX) * 1.5; // Множитель для скорости скролла
        galleryContainer.scrollLeft = scrollLeft - walk;
      });
      
      // Открытие ссылок через WebApp API если доступно
      galleryContainer.addEventListener('click', (e) => {
        // Если был drag, не открываем ссылку
        if (hasMoved) {
          e.preventDefault();
          return;
        }
        
        const link = e.target.closest('.galleryLink');
        if (!link) return;
        
        e.preventDefault();
        const url = link.href;
        const webApp = getWebApp();
        
        if (webApp && typeof webApp.openLink === "function") {
          webApp.openLink(url);
        } else {
          window.open(url, '_blank', 'noopener,noreferrer');
        }
        
        pauseAndResume();
      });
      
      // Останавливаем автосмену при закрытии модального окна
      const settingsModal = document.getElementById('settingsModal');
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.attributeName === 'hidden') {
            if (settingsModal.hidden) {
              stopAutoSlide();
            } else {
              startAutoSlide();
            }
          }
        });
      });
      observer.observe(settingsModal, { attributes: true });
    }
    
    if (el.paletteGrid) {
      el.paletteGrid.innerHTML = BG_SCHEMES.map((scheme) => {
        if (scheme.gradient) {
          return `<button type="button" class="paletteItem" data-bg="${scheme.id}" style="background:${scheme.gradient}" aria-label="${scheme.label}"></button>`;
        } else {
          return `<button type="button" class="paletteItem" data-bg="${scheme.id}" style="--g1:${scheme.start};--g2:${scheme.end}" aria-label="${scheme.label}"></button>`;
        }
      }).join("");
    }
    render();
    syncScrollDownButton();
    if (state.apiBase) {
      apiListComments().then((items) => {
        if (items) {
          state.comments = items;
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
