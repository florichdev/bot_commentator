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
      photo_url: null,
      isPremium: false, // Премиум-статус пользователя
    },
    apiBase: "",
    replyTo: null,
    contextCommentId: null,
    deleteCommentId: null,
    editCommentId: null,
    searchQuery: "",
    searchOpen: false,
    themeMode: "system",
    bgScheme: "pattern-only",
    bgMode: "presets", // "presets" или "custom" для градиента
    customGradient: null, // Кастомный градиент {gradient1: {h, s, l, hex}, gradient2: {h, s, l, hex}}
    premiumColorScheme: "gold", // Цветовая схема премиум-комментариев
    premiumColorMode: "presets", // "presets" или "custom"
    premiumCustomColors: null, // Кастомные цвета пользователя
    premiumEmoji: "👑", // Эмодзи для премиум-бейджа
    premiumEmojiMode: "emoji", // "emoji" или "color" для заливки
    premiumEmojiColor: "#ffd700", // Цвет заливки эмодзи
    attachments: [],
    postLink: "",
    mediaCache: {}, // Кеш для data URLs изображений по message_id
    premiumUsers: {}, // Кеш премиум-статусов других пользователей {user_id: boolean}
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
    premiumColorPalette: document.getElementById("premiumColorPalette"),
    premiumEmojiPalette: document.getElementById("premiumEmojiPalette"),
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
    deleteModal: document.getElementById("deleteModal"),
    deleteForMeBtn: document.getElementById("deleteForMeBtn"),
    deleteForAllBtn: document.getElementById("deleteForAllBtn"),
    deleteCancelBtn: document.getElementById("deleteCancelBtn"),
    clearModal: document.getElementById("clearModal"),
    clearConfirmBtn: document.getElementById("clearConfirmBtn"),
    clearCancelBtn: document.getElementById("clearCancelBtn"),
    editModal: document.getElementById("editModal"),
    editTextarea: document.getElementById("editTextarea"),
    editCharCounter: document.getElementById("editCharCounter"),
    editSaveBtn: document.getElementById("editSaveBtn"),
    editCancelBtn: document.getElementById("editCancelBtn"),
    editCloseBtn: document.getElementById("editCloseBtn"),
    contextEditBtn: document.getElementById("contextEditBtn"),
  };
  const THEME_KEY = "max-commentator:theme";
  const BG_KEY = "max-commentator:bg";
  const ATTACHMENTS_MARKER = "__ATTACHMENTS__:";
  const BG_SCHEMES = [
    { id: "pattern-only", label: "Только паттерн", gradient: null }, // Новая опция без градиента
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
  
  // Базовые реакции (доступны всем)
  const BASIC_REACTIONS = ["❤️", "👍", "👎", "😂", "😮", "😢"];
  
  // Премиум реакции (только для премиум-пользователей)
  const PREMIUM_REACTIONS = ["🔥", "💯", "🎉", "⚡", "💎", "🚀", "🏆", "✨"];
  
  // Цветовые схемы для премиум-комментариев
  const PREMIUM_COLOR_SCHEMES = [
    { 
      id: "gold", 
      label: "Золотой", 
      color1: "rgba(255, 215, 0, 0.21)", 
      color2: "rgba(255, 193, 7, 0.12)", 
      color3: "rgba(255, 215, 0, 0.08)",
      border: "rgba(255, 215, 0, 0.45)",
      glow: "rgba(255, 215, 0, 0.2)",
      nameColor: "rgba(255, 215, 0, 0.95)"
    },
    { 
      id: "silver", 
      label: "Серебряный", 
      color1: "rgba(192, 192, 192, 0.21)", 
      color2: "rgba(169, 169, 169, 0.12)", 
      color3: "rgba(192, 192, 192, 0.08)",
      border: "rgba(192, 192, 192, 0.45)",
      glow: "rgba(192, 192, 192, 0.2)",
      nameColor: "rgba(192, 192, 192, 0.95)"
    },
    { 
      id: "blue", 
      label: "Синий", 
      color1: "rgba(0, 150, 255, 0.21)", 
      color2: "rgba(0, 120, 255, 0.12)", 
      color3: "rgba(0, 150, 255, 0.08)",
      border: "rgba(0, 150, 255, 0.45)",
      glow: "rgba(0, 150, 255, 0.2)",
      nameColor: "rgba(0, 150, 255, 0.95)"
    },
    { 
      id: "purple", 
      label: "Фиолетовый", 
      color1: "rgba(138, 43, 226, 0.21)", 
      color2: "rgba(147, 51, 234, 0.12)", 
      color3: "rgba(138, 43, 226, 0.08)",
      border: "rgba(138, 43, 226, 0.45)",
      glow: "rgba(138, 43, 226, 0.2)",
      nameColor: "rgba(138, 43, 226, 0.95)"
    },
    { 
      id: "green", 
      label: "Зеленый", 
      color1: "rgba(34, 197, 94, 0.21)", 
      color2: "rgba(22, 163, 74, 0.12)", 
      color3: "rgba(34, 197, 94, 0.08)",
      border: "rgba(34, 197, 94, 0.45)",
      glow: "rgba(34, 197, 94, 0.2)",
      nameColor: "rgba(34, 197, 94, 0.95)"
    },
    { 
      id: "red", 
      label: "Красный", 
      color1: "rgba(239, 68, 68, 0.21)", 
      color2: "rgba(220, 38, 38, 0.12)", 
      color3: "rgba(239, 68, 68, 0.08)",
      border: "rgba(239, 68, 68, 0.45)",
      glow: "rgba(239, 68, 68, 0.2)",
      nameColor: "rgba(239, 68, 68, 0.95)"
    }
  ];
  
  // Эмодзи для премиум-бейджа
  const PREMIUM_EMOJIS = ["👑", "⭐", "💎", "🔥", "✨", "🏆", "💫", "🌟", "⚡", "🎖️"];
  
  const PREMIUM_COLOR_KEY = "max-commentator:premium-color";
  const PREMIUM_EMOJI_KEY = "max-commentator:premium-emoji";
  const PREMIUM_EMOJI_MODE_KEY = "max-commentator:premium-emoji-mode";
  const PREMIUM_EMOJI_COLOR_KEY = "max-commentator:premium-emoji-color";
  const PREMIUM_COLOR_MODE_KEY = "max-commentator:premium-color-mode";
  const PREMIUM_CUSTOM_COLORS_KEY = "max-commentator:premium-custom-colors";
  const BG_MODE_KEY = "max-commentator:bg-mode";
  const CUSTOM_GRADIENT_KEY = "max-commentator:custom-gradient";

  function safeParse(json, fallback) {
    try {
      return JSON.parse(json);
    } catch {
      return fallback;
    }
  }

  // Функции конвертации цветов для мобильного color picker
  function hslToHex(h, s, l) {
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = n => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
  }

  function hexToHsl(hex) {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    
    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    
    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100)
    };
  }

  function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  // Debounce функция для оптимизации API вызовов
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Функция для парсинга Markdown (только для премиум-пользователей)
  function parseMarkdown(text) {
    if (!text) return '';
    
    // Экранируем HTML теги для безопасности
    let html = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    
    // Парсим Markdown
    // **жирный** или __жирный__
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
    
    // *курсив* или _курсив_
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(/_(.+?)_/g, '<em>$1</em>');
    
    // [текст](ссылка)
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    
    // `код`
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // ~~зачеркнутый~~
    html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');
    
    // Переносы строк
    html = html.replace(/\n/g, '<br>');
    
    return html;
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
    
    // Кодируем initData для безопасной передачи в заголовках (решает проблему с кириллицей)
    if (initData) {
      try {
        // Используем encodeURIComponent для кодирования всех не-ASCII символов
        headers["X-Max-Init-Data"] = encodeURIComponent(initData);
        console.log("[DEBUG] apiHeaders - encoded initData:", headers["X-Max-Init-Data"].substring(0, 50) + "...");
      } catch (e) {
        console.error("[DEBUG] Failed to encode initData:", e);
        headers["X-Max-Init-Data"] = initData;
      }
    }
    
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
      state.user.photo_url = hashUser.photo_url || null; // Сохраняем аватарку
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
    
    let actualTheme = state.themeMode;
    
    // Для системной темы определяем автоматически
    if (state.themeMode === "system") {
      actualTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    
    if (actualTheme === "light") {
      root.classList.add("theme-light");
    }
    // Для темной темы класс не добавляем - используем :root по умолчанию
  }

  function applyBackgroundScheme() {
    // Если выбран кастомный режим и есть кастомный градиент
    if (state.bgMode === 'custom' && state.customGradient) {
      const color1 = state.customGradient.gradient1?.hex || '#0f5739';
      const color2 = state.customGradient.gradient2?.hex || '#52c9eb';
      const gradient = `linear-gradient(90deg, ${color1}, ${color2})`;
      document.documentElement.style.setProperty("--chat-bg-base", gradient);
      document.documentElement.style.setProperty("--overlay-gradients", 
        `radial-gradient(45% 35% at 50% 35%, rgba(128, 210, 255, 0.08) 0%, rgba(0,0,0,0) 68%),
         radial-gradient(57.57% 53.61% at 94.4% 14.38%, var(--chat-additional-1) 0%, var(--chat-additional-2) 48%, var(--chat-additional-3) 100%),
         radial-gradient(140.37% 51.38% at 0% 80.05%, var(--chat-additional-4) 0%, var(--chat-additional-5) 52%, var(--chat-additional-6) 100%)`
      );
      return;
    }
    
    const scheme = BG_SCHEMES.find((item) => item.id === state.bgScheme) || BG_SCHEMES[0];
    
    if (scheme.gradient) {
      // Применяем градиент как фон чата
      document.documentElement.style.setProperty("--chat-bg-base", scheme.gradient);
      
      // Применяем дополнительные градиенты поверх паттерна
      document.documentElement.style.setProperty("--overlay-gradients", 
        `radial-gradient(45% 35% at 50% 35%, rgba(128, 210, 255, 0.08) 0%, rgba(0,0,0,0) 68%),
         radial-gradient(57.57% 53.61% at 94.4% 14.38%, var(--chat-additional-1) 0%, var(--chat-additional-2) 48%, var(--chat-additional-3) 100%),
         radial-gradient(140.37% 51.38% at 0% 80.05%, var(--chat-additional-4) 0%, var(--chat-additional-5) 52%, var(--chat-additional-6) 100%)`
      );
      
      // Извлекаем цвета для кнопки отправки
      const colors = scheme.gradient.match(/#[0-9a-fA-F]{6}/g) || [];
      if (colors.length >= 2) {
        document.documentElement.style.setProperty("--send-bg", colors[0]);
        document.documentElement.style.setProperty("--send-border", colors[0]);
      }
    } else {
      // Без градиента - только паттерн с базовым цветом
      const isLight = document.documentElement.classList.contains('theme-light');
      
      if (isLight) {
        document.documentElement.style.setProperty("--chat-bg-base", "#f5f9ff");
      } else {
        document.documentElement.style.setProperty("--chat-bg-base", "#0d141e");
      }
      
      // Убираем дополнительные градиенты
      document.documentElement.style.setProperty("--overlay-gradients", "none");
    }
  }
  
  function applyPremiumColors() {
    let colors;
    
    if (state.premiumColorMode === "custom" && state.premiumCustomColors) {
      colors = state.premiumCustomColors;
    } else {
      const colorScheme = PREMIUM_COLOR_SCHEMES.find((item) => item.id === state.premiumColorScheme) || PREMIUM_COLOR_SCHEMES[0];
      colors = colorScheme;
    }
    
    document.documentElement.style.setProperty("--premium-color-1", colors.color1);
    document.documentElement.style.setProperty("--premium-color-2", colors.color2);
    document.documentElement.style.setProperty("--premium-color-3", colors.color3);
    document.documentElement.style.setProperty("--premium-border", colors.border);
    document.documentElement.style.setProperty("--premium-glow", colors.glow);
    document.documentElement.style.setProperty("--premium-name-color", colors.nameColor);
    
    // Применяем эмодзи или цветную заливку
    if (state.premiumEmojiMode === 'color') {
      document.documentElement.style.setProperty("--premium-emoji", `""`);
      document.documentElement.style.setProperty("--premium-emoji-color", state.premiumEmojiColor);
    } else {
      document.documentElement.style.setProperty("--premium-emoji", `"${state.premiumEmoji}"`);
      document.documentElement.style.setProperty("--premium-emoji-color", "transparent");
    }
  }

  /**
   * Применяет индивидуальные премиум стили к элементу комментария
   * @param {Object} comment - Объект комментария с настройками автора
   * @param {HTMLElement} element - DOM элемент комментария
   */
  function applyUserPremiumStyles(comment, element) {
    if (!comment || !element) return;
    
    // Определяем цвета автора комментария
    let colors;
    
    if (comment.premium_custom_colors) {
      // Используем кастомные цвета автора
      colors = comment.premium_custom_colors;
    } else if (comment.premium_color_scheme) {
      // Используем предустановленную схему автора
      const colorScheme = PREMIUM_COLOR_SCHEMES.find((item) => item.id === comment.premium_color_scheme);
      colors = colorScheme || PREMIUM_COLOR_SCHEMES[0];
    } else {
      // Дефолтная золотая схема
      colors = PREMIUM_COLOR_SCHEMES[0];
    }
    
    // Применяем цвета через inline стили к элементу
    const bubble = element.querySelector('.bubble');
    const authorEl = element.querySelector('.bubble__author');
    const avatarEl = element.querySelector('.msg__avatar');
    
    if (bubble) {
      // Применяем градиент фона к сообщению
      bubble.style.background = `linear-gradient(135deg, ${colors.color1} 0%, ${colors.color2} 50%, ${colors.color3} 100%)`;
      // Применяем цвет рамки сообщения
      bubble.style.borderColor = colors.border;
      // Применяем свечение
      bubble.style.boxShadow = `0 0 20px ${colors.glow}`;
    }
    
    if (authorEl) {
      // Применяем цвет имени
      authorEl.style.color = colors.nameColor;
    }
    
    if (avatarEl) {
      // Применяем цвет рамки аватарки
      avatarEl.style.borderColor = colors.border;
      avatarEl.style.boxShadow = `0 0 12px ${colors.glow}`;
    }
    
    // Применяем цвет эмодзи если используется режим заливки
    if (comment.premium_emoji_mode === 'color' && comment.premium_emoji_color) {
      const badge = element.querySelector('.premium-badge');
      if (badge) {
        badge.style.setProperty('--premium-emoji-color', comment.premium_emoji_color);
      }
    }
  }

  async function loadVisualSettings() {
    // Сначала пробуем загрузить с сервера
    if (state.apiBase && isAuthorizedUser()) {
      const serverSettings = await apiLoadUserSettings();
      if (serverSettings) {
        console.log("[DEBUG] Loaded settings from server:", serverSettings);
        
        // Применяем настройки с сервера
        if (serverSettings.themeMode && ["light", "dark", "system"].includes(serverSettings.themeMode)) {
          state.themeMode = serverSettings.themeMode;
        }
        if (serverSettings.bgScheme && BG_SCHEMES.some((item) => item.id === serverSettings.bgScheme)) {
          state.bgScheme = serverSettings.bgScheme;
        }
        if (serverSettings.bgMode && ["presets", "custom"].includes(serverSettings.bgMode)) {
          state.bgMode = serverSettings.bgMode;
        }
        if (serverSettings.customGradient) {
          state.customGradient = serverSettings.customGradient;
        }
        if (serverSettings.premiumColorScheme && PREMIUM_COLOR_SCHEMES.some((item) => item.id === serverSettings.premiumColorScheme)) {
          state.premiumColorScheme = serverSettings.premiumColorScheme;
        }
        if (serverSettings.premiumEmoji && PREMIUM_EMOJIS.includes(serverSettings.premiumEmoji)) {
          state.premiumEmoji = serverSettings.premiumEmoji;
        }
        if (serverSettings.premiumEmojiMode && ["emoji", "color"].includes(serverSettings.premiumEmojiMode)) {
          state.premiumEmojiMode = serverSettings.premiumEmojiMode;
        }
        if (serverSettings.premiumEmojiColor) {
          state.premiumEmojiColor = serverSettings.premiumEmojiColor;
        }
        if (serverSettings.premiumColorMode && ["presets", "custom"].includes(serverSettings.premiumColorMode)) {
          state.premiumColorMode = serverSettings.premiumColorMode;
        }
        if (serverSettings.premiumCustomColors) {
          state.premiumCustomColors = serverSettings.premiumCustomColors;
        }
        
        return; // Успешно загрузили с сервера
      }
    }
    
    // Fallback на localStorage если сервер недоступен
    console.log("[DEBUG] Loading settings from localStorage (fallback)");
    const storedTheme = localStorage.getItem(THEME_KEY);
    if (storedTheme && ["light", "dark", "system"].includes(storedTheme)) {
      state.themeMode = storedTheme;
    }
    const storedBg = localStorage.getItem(BG_KEY);
    if (storedBg && BG_SCHEMES.some((item) => item.id === storedBg)) {
      state.bgScheme = storedBg;
    }
    const storedBgMode = localStorage.getItem(BG_MODE_KEY);
    if (storedBgMode && ["presets", "custom"].includes(storedBgMode)) {
      state.bgMode = storedBgMode;
    }
    const storedCustomGradient = localStorage.getItem(CUSTOM_GRADIENT_KEY);
    if (storedCustomGradient) {
      try {
        state.customGradient = JSON.parse(storedCustomGradient);
      } catch (e) {
        console.error("Failed to parse custom gradient:", e);
      }
    }
    const storedPremiumColor = localStorage.getItem(PREMIUM_COLOR_KEY);
    if (storedPremiumColor && PREMIUM_COLOR_SCHEMES.some((item) => item.id === storedPremiumColor)) {
      state.premiumColorScheme = storedPremiumColor;
    }
    const storedPremiumEmoji = localStorage.getItem(PREMIUM_EMOJI_KEY);
    if (storedPremiumEmoji && PREMIUM_EMOJIS.includes(storedPremiumEmoji)) {
      state.premiumEmoji = storedPremiumEmoji;
    }
    const storedPremiumEmojiMode = localStorage.getItem(PREMIUM_EMOJI_MODE_KEY);
    if (storedPremiumEmojiMode && ["emoji", "color"].includes(storedPremiumEmojiMode)) {
      state.premiumEmojiMode = storedPremiumEmojiMode;
    }
    const storedPremiumEmojiColor = localStorage.getItem(PREMIUM_EMOJI_COLOR_KEY);
    if (storedPremiumEmojiColor) {
      state.premiumEmojiColor = storedPremiumEmojiColor;
    }
    const storedPremiumColorMode = localStorage.getItem(PREMIUM_COLOR_MODE_KEY);
    if (storedPremiumColorMode && ["presets", "custom"].includes(storedPremiumColorMode)) {
      state.premiumColorMode = storedPremiumColorMode;
    }
    const storedCustomColors = localStorage.getItem(PREMIUM_CUSTOM_COLORS_KEY);
    if (storedCustomColors) {
      try {
        state.premiumCustomColors = JSON.parse(storedCustomColors);
      } catch (e) {
        console.error("Failed to parse custom colors:", e);
      }
    }
  }

  // Debounced версия saveVisualSettings для оптимизации
  const debouncedSaveVisualSettings = debounce(async function() {
    // Сохраняем в localStorage (для быстрого доступа и fallback)
    localStorage.setItem(THEME_KEY, state.themeMode);
    localStorage.setItem(BG_KEY, state.bgScheme);
    localStorage.setItem(BG_MODE_KEY, state.bgMode);
    if (state.customGradient) {
      localStorage.setItem(CUSTOM_GRADIENT_KEY, JSON.stringify(state.customGradient));
    }
    localStorage.setItem(PREMIUM_COLOR_KEY, state.premiumColorScheme);
    localStorage.setItem(PREMIUM_EMOJI_KEY, state.premiumEmoji);
    localStorage.setItem(PREMIUM_EMOJI_MODE_KEY, state.premiumEmojiMode);
    localStorage.setItem(PREMIUM_EMOJI_COLOR_KEY, state.premiumEmojiColor);
    localStorage.setItem(PREMIUM_COLOR_MODE_KEY, state.premiumColorMode);
    if (state.premiumCustomColors) {
      localStorage.setItem(PREMIUM_CUSTOM_COLORS_KEY, JSON.stringify(state.premiumCustomColors));
    }
    
    // Сохраняем на сервер (если доступен)
    if (state.apiBase && isAuthorizedUser()) {
      const settings = {
        themeMode: state.themeMode,
        bgScheme: state.bgScheme,
        bgMode: state.bgMode,
        customGradient: state.customGradient,
        premiumColorScheme: state.premiumColorScheme,
        premiumColorMode: state.premiumColorMode,
        premiumCustomColors: state.premiumCustomColors,
        premiumEmoji: state.premiumEmoji,
        premiumEmojiMode: state.premiumEmojiMode,
        premiumEmojiColor: state.premiumEmojiColor
      };
      
      const success = await apiSaveUserSettings(settings);
      if (success) {
        console.log("[DEBUG] Settings saved to server");
      } else {
        console.warn("[DEBUG] Failed to save settings to server, using localStorage only");
      }
    }
  }, 500); // Debounce 500ms

  function saveVisualSettings() {
    debouncedSaveVisualSettings();
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
    normalized.photo_url = normalized.photo_url || null; // Сохраняем аватарку
    normalized.selected = normalized.selected || false; // Сохраняем состояние выбора
    if (!normalized.attachments || !Array.isArray(normalized.attachments)) {
      normalized.attachments = [];
    } else {
      // Оставляем attachments как есть - URL будет загружаться динамически при рендеринге
      // Сохраняем только те вложения, у которых есть token, photo_id, message_id или preview_url
      normalized.attachments = normalized.attachments.filter(att => att.token || att.photo_id || att.message_id || att.preview_url);
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

  function formatReactionCount(count) {
    const num = Number(count);
    if (num >= 1000000) {
      const millions = num / 1000000;
      return (millions % 1 === 0 ? millions.toString() : millions.toFixed(1).replace(/\.0$/, '')) + 'M';
    }
    if (num >= 1000) {
      const thousands = num / 1000;
      return (thousands % 1 === 0 ? thousands.toString() : thousands.toFixed(1).replace(/\.0$/, '')) + 'k';
    }
    return String(num);
  }

  function setAvatar(avatarElement, authorId, authorName, photoUrl = null) {
    console.log("[DEBUG] setAvatar called:", { authorId, authorName, photoUrl, myId: state.user.id, myPhoto: state.user.photo_url });
    
    // Если это мой комментарий, используем мою аватарку
    const isMine = isAuthorizedUser() && authorId === state.user.id;
    const userPhotoUrl = isMine ? state.user.photo_url : photoUrl;
    
    console.log("[DEBUG] isMine:", isMine, "userPhotoUrl:", userPhotoUrl);
    
    if (userPhotoUrl) {
      // Используем фото профиля
      avatarElement.innerHTML = `<img src="${userPhotoUrl}" alt="${authorName}" class="avatar-img" onerror="this.parentElement.textContent='${getInitials(authorName)}'">`;
      console.log("[DEBUG] Set avatar image for", authorName);
    } else {
      // Используем инициалы
      avatarElement.textContent = getInitials(authorName);
      console.log("[DEBUG] Set avatar initials for", authorName);
    }
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
    
    // Показываем/скрываем кнопку редактирования
    const comment = findCommentById(commentId);
    if (comment && el.contextEditBtn) {
      const isMine = comment.authorId === state.user.id;
      const commentAge = Date.now() - new Date(comment.createdAt).getTime();
      const maxAge = 24 * 60 * 60 * 1000; // 24 часа
      const canEdit = isMine && commentAge <= maxAge && state.user.isPremium;
      el.contextEditBtn.hidden = !canEdit;
    }
    
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

  function openDeleteModal(commentId) {
    state.deleteCommentId = commentId;
    el.deleteModal.hidden = false;
    closeContextMenu();
  }

  function closeDeleteModal() {
    state.deleteCommentId = null;
    el.deleteModal.hidden = true;
  }

  function openEditModal(commentId) {
    const comment = findCommentById(commentId);
    if (!comment) return;
    
    // Проверяем что это свой комментарий
    if (comment.authorId !== state.user.id) return;
    
    // Проверяем что комментарий не старше 24 часов
    const commentAge = Date.now() - new Date(comment.createdAt).getTime();
    const maxAge = 24 * 60 * 60 * 1000; // 24 часа
    if (commentAge > maxAge) {
      alert("Редактирование доступно только в течение 24 часов после публикации");
      return;
    }
    
    state.editCommentId = commentId;
    el.editTextarea.value = comment.text;
    el.editCharCounter.textContent = comment.text.length;
    el.editModal.hidden = false;
    el.editTextarea.focus();
  }

  function closeEditModal() {
    state.editCommentId = null;
    el.editTextarea.value = "";
    el.editCharCounter.textContent = "0";
    el.editModal.hidden = true;
  }

  function applyFormatting(format) {
    const textarea = el.editTextarea;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    
    let formattedText = '';
    let cursorOffset = 0;
    
    switch(format) {
      case 'bold':
        formattedText = `**${selectedText}**`;
        cursorOffset = selectedText ? formattedText.length : 2;
        break;
      case 'italic':
        formattedText = `*${selectedText}*`;
        cursorOffset = selectedText ? formattedText.length : 1;
        break;
      case 'strikethrough':
        formattedText = `~~${selectedText}~~`;
        cursorOffset = selectedText ? formattedText.length : 2;
        break;
      case 'code':
        formattedText = `\`${selectedText}\``;
        cursorOffset = selectedText ? formattedText.length : 1;
        break;
      case 'link':
        const url = prompt('Введите URL:');
        if (url) {
          formattedText = `[${selectedText || 'текст ссылки'}](${url})`;
          cursorOffset = formattedText.length;
        } else {
          return;
        }
        break;
      default:
        return;
    }
    
    if (formattedText) {
      textarea.value = textarea.value.substring(0, start) + formattedText + textarea.value.substring(end);
      textarea.focus();
      
      // Устанавливаем курсор
      if (selectedText) {
        textarea.setSelectionRange(start + cursorOffset, start + cursorOffset);
      } else {
        textarea.setSelectionRange(start + cursorOffset, start + cursorOffset);
      }
      
      // Обновляем счетчик
      el.editCharCounter.textContent = textarea.value.length;
    }
  }

  async function saveEditedComment() {
    if (!state.editCommentId) return;
    
    const newText = el.editTextarea.value.trim();
    if (!newText) {
      alert("Комментарий не может быть пустым");
      return;
    }
    
    if (newText.length > 4000) {
      alert("Комментарий слишком длинный (максимум 4000 символов)");
      return;
    }
    
    const comment = findCommentById(state.editCommentId);
    if (!comment) {
      closeEditModal();
      return;
    }
    
    // Обновляем локально
    comment.text = newText;
    comment.editedAt = new Date().toISOString();
    comment.editCount = (comment.editCount || 0) + 1;
    
    saveComments();
    render();
    closeEditModal();
    
    // Отправляем на сервер (пока просто логируем, API редактирования будет позже)
    console.log("[DEBUG] Comment edited:", { id: state.editCommentId, newText });
    // TODO: Добавить API вызов для редактирования на сервере
  }

  async function deleteCommentForMe(commentId) {
    // Удаляем только локально
    state.comments = state.comments.filter((x) => x.id !== commentId);
    saveComments();
    render();
    closeDeleteModal();
  }

  async function deleteCommentForAll(commentId) {
    // Удаляем на сервере и локально
    const deletedRemote = await apiDeleteComment(commentId);
    if (!deletedRemote) {
      state.comments = state.comments.filter((x) => x.id !== commentId);
      saveComments();
    } else {
      const fresh = await apiListComments();
      if (fresh) {
        state.comments = fresh;
        saveComments();
      }
    }
    render();
    closeDeleteModal();
  }

  function renderContextReactions() {
    el.contextReactions.innerHTML = "";
    const availableReactions = getAvailableReactions();
    
    for (const emoji of availableReactions) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "reactionMenuBtn";
      btn.dataset.menuReaction = emoji;
      btn.setAttribute("aria-label", emoji);
      btn.textContent = emoji;
      el.contextReactions.appendChild(btn);
    }
    
    // Если пользователь не премиум, добавляем подсказку о премиум-реакциях
    if (!state.user.isPremium) {
      const premiumHint = document.createElement("div");
      premiumHint.className = "premium-reactions-hint";
      premiumHint.innerHTML = `
        <span class="premium-reactions-hint__icon">👑</span>
        <span class="premium-reactions-hint__text">Больше реакций в премиум</span>
      `;
      premiumHint.style.cssText = "grid-column: 1 / -1; text-align: center; padding: 8px; font-size: 12px; color: rgba(255,255,255,0.7); border-top: 1px solid rgba(255,255,255,0.1); margin-top: 4px;";
      el.contextReactions.appendChild(premiumHint);
    }
  }

  async function toggleReaction(item, emoji) {
    if (!emoji || !REACTIONS.includes(emoji)) return;
    const current = item.reactedBy?.[state.user.id];
    item.reactions = item.reactions || {};
    item.reactedBy = item.reactedBy || {};

    // Проверяем ограничение на 3 вида реакций
    const currentReactionTypes = Object.keys(item.reactions).filter(key => item.reactions[key] > 0);
    
    // Для премиум-пользователей: множественные реакции
    const isPremium = state.user.isPremium;
    
    if (isPremium) {
      // Премиум: можно ставить несколько реакций
      const userReactions = item.reactedBy[state.user.id];
      const userReactionsArray = Array.isArray(userReactions) ? userReactions : (userReactions ? [userReactions] : []);
      
      if (userReactionsArray.includes(emoji)) {
        // Убираем эту реакцию
        item.reactions[emoji] = Math.max(0, Number(item.reactions[emoji] || 0) - 1);
        const newUserReactions = userReactionsArray.filter(e => e !== emoji);
        if (newUserReactions.length === 0) {
          delete item.reactedBy[state.user.id];
        } else {
          item.reactedBy[state.user.id] = newUserReactions;
        }
      } else {
        // Добавляем новую реакцию
        // Проверяем лимит на 3 вида реакций для комментария
        if (!currentReactionTypes.includes(emoji) && currentReactionTypes.length >= 3) {
          showNotification("⚠️ Вы можете поставить максимум 3 разных реакции", "warning");
          return;
        }
        
        item.reactions[emoji] = Number(item.reactions[emoji] || 0) + 1;
        userReactionsArray.push(emoji);
        item.reactedBy[state.user.id] = userReactionsArray;
      }
    } else {
      // Обычный пользователь: только одна реакция
      if (current === emoji) {
        // Убираем реакцию
        item.reactions[emoji] = Math.max(0, Number(item.reactions[emoji] || 0) - 1);
        delete item.reactedBy[state.user.id];
      } else {
        // Проверяем лимит на 3 вида реакций
        if (!current && !currentReactionTypes.includes(emoji) && currentReactionTypes.length >= 3) {
          showNotification("⚠️ Вы можете поставить максимум 3 разных реакции", "warning");
          return;
        }
        
        if (current) {
          item.reactions[current] = Math.max(0, Number(item.reactions[current] || 0) - 1);
        }
        item.reactions[emoji] = Number(item.reactions[emoji] || 0) + 1;
        item.reactedBy[state.user.id] = emoji;
      }
    }
    
    // Сохраняем локально
    saveComments();
    render();
    
    // Отправляем на сервер
    await apiUpdateReactions(item.id, item.reactions, item.reactedBy);
  }

  function loadComments() {
    // Защита: не загружаем комментарии если postId = "default-post"
    if (state.postId === "default-post") {
      state.comments = [];
      return;
    }
    
    const raw = localStorage.getItem(storageKey(state.postId));
    const parsed = safeParse(raw || "[]", []);
    state.comments = Array.isArray(parsed) ? parsed.map(normalizeComment) : [];
  }

  async function loadCommentsFromServer() {
    if (!state.apiBase) return;
    
    // Защита: не загружаем комментарии с сервера если postId = "default-post"
    if (state.postId === "default-post") {
      state.comments = [];
      render();
      return;
    }
    
    const serverComments = await apiListComments();
    if (serverComments && serverComments.length >= 0) {
      // Сохраняем текущее состояние выбора перед обновлением
      const selectedMap = {};
      state.comments.forEach(comment => {
        if (comment.selected) {
          selectedMap[comment.id] = true;
        }
      });
      
      // Обновляем из сервера и восстанавливаем состояние выбора
      state.comments = serverComments.map(serverComment => {
        const normalized = normalizeComment(serverComment);
        // Восстанавливаем selected если был выбран ранее
        if (selectedMap[normalized.id]) {
          normalized.selected = true;
        }
        return normalized;
      });
      
      saveComments();
      render();
    }
  }

  // Real-time обновления через Long Polling
  let pollingInterval = null;
  let lastCommentCount = 0;

  function startRealTimeUpdates() {
    if (pollingInterval) return; // Уже запущено
    
    console.log("[DEBUG] Starting real-time updates");
    
    // Обновляем каждые 5 секунд
    pollingInterval = setInterval(async () => {
      try {
        if (!state.apiBase) return;
        
        const serverComments = await apiListComments();
        if (serverComments && Array.isArray(serverComments)) {
          const newCount = serverComments.length;
          
          // Проверяем есть ли новые комментарии от других пользователей
          let newCommentsFromOthers = 0;
          if (newCount > lastCommentCount && lastCommentCount > 0) {
            // Находим новые комментарии
            const newComments = serverComments.slice(0, newCount - lastCommentCount);
            // Считаем только чужие комментарии
            newCommentsFromOthers = newComments.filter(c => c.author_id !== state.user.id).length;
            
            // Показываем уведомление только о чужих комментариях
            if (newCommentsFromOthers > 0) {
              showNewCommentsNotification(newCommentsFromOthers);
            }
          }
          
          // Мерджим комментарии: обновляем реакции с сервера и сохраняем selected
          const mergedComments = serverComments.map(serverComment => {
            const localComment = state.comments.find(c => c.id === serverComment.id);
            if (localComment) {
              // Используем серверные реакции (они актуальнее) и сохраняем локальный selected
              return {
                ...serverComment,
                reactions: serverComment.reactions || {},
                reactedBy: serverComment.reactedBy || {},
                selected: localComment.selected || false // Сохраняем состояние выбора
              };
            }
            return serverComment;
          });
          
          // Обновляем состояние только если есть изменения
          const hasChanges = newCount !== lastCommentCount || 
                            JSON.stringify(mergedComments) !== JSON.stringify(state.comments);
          
          if (hasChanges) {
            state.comments = mergedComments;
            lastCommentCount = newCount;
            saveComments();
            render();
          }
        }
      } catch (error) {
        console.warn("[DEBUG] Real-time update failed:", error);
      }
    }, 5000); // 5 секунд
  }

  function stopRealTimeUpdates() {
    if (pollingInterval) {
      console.log("[DEBUG] Stopping real-time updates");
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
  }

  function showNewCommentsNotification(count) {
    // Правильное склонение
    let text;
    if (count === 1) {
      text = "Новый комментарий";
    } else if (count >= 2 && count <= 4) {
      text = `${count} новых`;
    } else {
      text = `${count} новых`;
    }
    
    // Создаем уведомление о новых комментариях
    const notification = document.createElement("div");
    notification.className = "newCommentsNotification";
    notification.textContent = text;
    notification.addEventListener("click", () => {
      scrollToBottom(true);
      notification.remove();
    });
    
    document.body.appendChild(notification);
    
    // Автоматически убираем через 5 секунд
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 5000);
  }

  function saveComments() {
    try {
      // Сохраняем комментарии с URL (они теперь постоянные через proxy)
      localStorage.setItem(storageKey(state.postId), JSON.stringify(state.comments));
    } catch (e) {
      console.error("Failed to save comments to localStorage:", e);
      // Если переполнен - очищаем старые комментарии
      if (e.name === 'QuotaExceededError') {
        try {
          localStorage.removeItem(storageKey(state.postId));
          console.log("Cleared localStorage for this post due to quota");
        } catch (clearError) {
          console.error("Failed to clear localStorage:", clearError);
        }
      }
    }
  }

  function getApiBase() {
    console.log("[DEBUG] getApiBase called");
    
    // Приоритет 1: из startapp payload
    if (window.__STARTAPP_API_BASE__) {
      console.log("[DEBUG] Using API base from startapp:", window.__STARTAPP_API_BASE__);
      return window.__STARTAPP_API_BASE__;
    }
    
    // Приоритет 2: из query параметра
    const fromQuery = new URLSearchParams(window.location.search).get("api_base") || "";
    if (fromQuery) {
      console.log("[DEBUG] Using API base from query:", fromQuery);
      return fromQuery.replace(/\/$/, "");
    }
    
    // Приоритет 3: из window.__API_BASE_URL__
    const fromWindow = window.__API_BASE_URL__ || "";
    const fromWindowNormalized = String(fromWindow || "").replace(/\/$/, "");
    console.log("[DEBUG] window.__API_BASE_URL__:", fromWindow);
    console.log("[DEBUG] fromWindowNormalized:", fromWindowNormalized);
    
    if (!fromWindowNormalized) {
      console.log("[DEBUG] No API base found, using DEFAULT_API_BASE:", DEFAULT_API_BASE);
      return DEFAULT_API_BASE;
    }

    const isGithubPages = /\.github\.io$/i.test(window.location.hostname || "");
    const isSameOriginWindowApi = fromWindowNormalized === window.location.origin || fromWindowNormalized === `${window.location.origin}/api`;
    
    console.log("[DEBUG] isGithubPages:", isGithubPages);
    console.log("[DEBUG] isSameOriginWindowApi:", isSameOriginWindowApi);
    console.log("[DEBUG] window.location.hostname:", window.location.hostname);
    console.log("[DEBUG] window.location.origin:", window.location.origin);
    
    if (isGithubPages && isSameOriginWindowApi) {
      console.log("[DEBUG] GitHub Pages detected, using DEFAULT_API_BASE:", DEFAULT_API_BASE);
      return DEFAULT_API_BASE;
    }

    console.log("[DEBUG] Using fromWindowNormalized or DEFAULT_API_BASE:", fromWindowNormalized || DEFAULT_API_BASE);
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
        photo_url: x.author_photo_url,
        replyTo: x.reply_to, // Добавляем поддержку ответов
        reactions: x.reactions || {}, // Добавляем реакции
        reactedBy: x.reacted_by || {}, // Добавляем информацию о том, кто поставил реакции
      })).map(normalizeComment);
    } catch {
      return null;
    }
  }

  async function apiCreateComment(text, attachments = []) {
    console.log("[DEBUG] apiCreateComment called with:", { text: text.substring(0, 50), attachments: attachments.length });
    console.log("[DEBUG] state.apiBase:", state.apiBase);
    console.log("[DEBUG] isAuthorizedUser():", isAuthorizedUser());
    console.log("[DEBUG] state.user:", state.user);
    
    if (!state.apiBase) {
      console.error("API base URL not set - cannot save comment to server");
      return null;
    }
    
    if (!isAuthorizedUser()) {
      console.error("User not authorized - cannot save comment to server");
      return null;
    }
    
    try {
      const payloadText = attachments.length
        ? `${text}\n${ATTACHMENTS_MARKER}${JSON.stringify(attachments)}`
        : text;
        
      console.log("[DEBUG] Sending request to:", `${state.apiBase}/api/comments`);
      console.log("[DEBUG] Request payload:", {
        post_id: state.postId,
        author_id: state.user.id,
        author_name: state.user.name,
        text: payloadText.substring(0, 100)
      });
      
      const resp = await fetch(`${state.apiBase}/api/comments`, {
        method: "POST",
        headers: apiHeaders(),
        body: JSON.stringify({
          post_id: state.postId,
          author_id: state.user.id,
          author_name: state.user.name,
          author_photo_url: state.user.photo_url,
          text: payloadText,
          reply_to: state.replyTo, // Добавляем информацию об ответе
        }),
      });
      
      console.log("[DEBUG] Response status:", resp.status);
      console.log("[DEBUG] Response ok:", resp.ok);
      
      const data = await resp.json();
      console.log("[DEBUG] Response data:", data);
      
      if (!resp.ok || !data.ok) {
        console.error("Server returned error:", data);
        if (data.error === "user_banned") {
          throw new Error("USER_BANNED:" + (data.message || "Вы заблокированы в этом канале"));
        }
        return null;
      }
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
    } catch (error) {
      if (error.message && error.message.startsWith("USER_BANNED:")) {
        throw error; // Пробрасываем ошибку бана дальше
      }
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

  async function apiUpdateReactions(commentId, reactions, reactedBy) {
    if (!state.apiBase || !isAuthorizedUser()) return false;
    try {
      const resp = await fetch(`${state.apiBase}/api/comments/${encodeURIComponent(commentId)}/reactions`, {
        method: "PUT",
        headers: apiHeaders(),
        body: JSON.stringify({
          reactions,
          reacted_by: reactedBy,
          user_id: state.user.id,
        }),
      });
      const data = await resp.json();
      return !!(resp.ok && data.ok);
    } catch (error) {
      console.warn("[DEBUG] Failed to update reactions:", error);
      return false;
    }
  }

  async function apiReportComment(commentId) {
    if (!state.apiBase || !isAuthorizedUser()) return false;
    try {
      const resp = await fetch(`${state.apiBase}/api/comments/${encodeURIComponent(commentId)}/report`, {
        method: "POST",
        headers: apiHeaders(),
        body: JSON.stringify({
          reporter_id: state.user.id,
          reporter_name: state.user.name,
          post_id: state.postId,
        }),
      });
      const data = await resp.json();
      return !!(resp.ok && data.ok);
    } catch (error) {
      console.warn("[DEBUG] Failed to report comment:", error);
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

  // Проверка премиум-статуса пользователя
  async function apiCheckPremiumStatus(userId) {
    if (!state.apiBase) return false;
    try {
      const resp = await fetch(`${state.apiBase}/api/premium/check?user_id=${encodeURIComponent(userId)}`, { 
        method: "GET", 
        headers: apiHeaders() 
      });
      const data = await resp.json();
      return !!(resp.ok && data.ok && data.is_premium);
    } catch {
      return false;
    }
  }

  // Загрузка настроек пользователя с сервера
  async function apiLoadUserSettings() {
    if (!state.apiBase || !isAuthorizedUser()) return null;
    try {
      const resp = await fetch(`${state.apiBase}/api/user/settings`, {
        method: "GET",
        headers: apiHeaders()
      });
      if (!resp.ok) return null;
      const data = await resp.json();
      return data.settings || null;
    } catch (err) {
      console.error("Failed to load user settings:", err);
      return null;
    }
  }

  // Сохранение настроек пользователя на сервер
  async function apiSaveUserSettings(settings) {
    if (!state.apiBase || !isAuthorizedUser()) return false;
    try {
      const resp = await fetch(`${state.apiBase}/api/user/settings`, {
        method: "PUT",
        headers: apiHeaders(),
        body: JSON.stringify({ settings })
      });
      return resp.ok;
    } catch (err) {
      console.error("Failed to save user settings:", err);
      return false;
    }
  }

  // Получить доступные реакции для пользователя
  function getAvailableReactions() {
    if (state.user.isPremium) {
      // Премиум-пользователи видят все реакции: базовые + премиум
      return [...BASIC_REACTIONS, ...PREMIUM_REACTIONS];
    } else {
      // Обычные пользователи видят только базовые
      return BASIC_REACTIONS;
    }
  }

  // Проверить, является ли пользователь премиум
  function isUserPremium(userId) {
    if (userId === state.user.id) {
      return state.user.isPremium;
    }
    // Проверяем кеш для других пользователей
    return state.premiumUsers[userId] || false;
  }

  async function sendMediaToPersonalChat(identifier, fileName, mediaType, authorName, commentText, authorId) {
    console.log(`[DEBUG] sendMediaToPersonalChat called:`, { identifier, fileName, mediaType, authorName, commentText, authorId });
    
    if (!state.apiBase || !isAuthorizedUser()) {
      console.error("Cannot send media: not authorized or no API base");
      return;
    }
    
    try {
      // Отправляем запрос на сервер, который перешлет медиа в личный чат
      const resp = await fetch(`${state.apiBase}/api/send-media-to-user`, {
        method: "POST",
        headers: apiHeaders(),
        body: JSON.stringify({
          identifier: identifier,
          file_name: fileName,
          media_type: mediaType,
          author_name: authorName || "Пользователь",
          comment_text: commentText || "",
          mentioned_user_id: authorId || null
        })
      });
      
      const data = await resp.json();
      
      if (resp.ok && data.ok) {
        console.log("[DEBUG] Media sent to personal chat successfully");
        // Показываем уведомление пользователю
        showNotification("Медиа отправлено");
      } else {
        console.error("Failed to send media:", data.error);
        showNotification("Ошибка отправки медиа");
      }
    } catch (error) {
      console.error("Error sending media to personal chat:", error);
      showNotification("Ошибка отправки медиа");
    }
  }

  async function sendUserMentionToPersonalChat(userId, userName) {
    console.log(`[DEBUG] sendUserMentionToPersonalChat called:`, { userId, userName });
    
    if (!state.apiBase || !isAuthorizedUser()) {
      console.error("Cannot send mention: not authorized or no API base");
      return;
    }
    
    try {
      // Отправляем запрос на сервер, который перешлет упоминание в личный чат
      const resp = await fetch(`${state.apiBase}/api/send-user-mention`, {
        method: "POST",
        headers: apiHeaders(),
        body: JSON.stringify({
          mentioned_user_id: userId,
          mentioned_user_name: userName
        })
      });
      
      const data = await resp.json();
      
      if (resp.ok && data.ok) {
        console.log("[DEBUG] User mention sent to personal chat successfully");
        showNotification("Профиль отправлен");
      } else {
        console.error("Failed to send mention:", data.error);
        showNotification("Ошибка отправки профиля");
      }
    } catch (error) {
      console.error("Error sending mention to personal chat:", error);
      showNotification("Ошибка отправки профиля");
    }
  }

  function showNotification(message, type = 'info') {
    // Создаем простое уведомление
    const notification = document.createElement("div");
    notification.className = "toast-notification";
    notification.textContent = message;
    
    // Цвета для разных типов уведомлений
    const colors = {
      'info': 'rgba(24, 119, 242, 0.95)',
      'warning': 'rgba(255, 152, 0, 0.95)',
      'error': 'rgba(255, 69, 58, 0.95)',
      'success': 'rgba(52, 199, 89, 0.95)'
    };
    
    const bgColor = colors[type] || colors['info'];
    
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: ${bgColor};
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      z-index: 10000;
      font-size: 14px;
      text-align: center;
      animation: fadeInOut 3s ease-in-out;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  function formatTime(iso) {
    try {
      // Парсим дату (сервер отправляет UTC с 'Z')
      const d = new Date(iso);
      
      // Конвертируем в МСК (UTC+3)
      const mskTime = new Date(d.getTime() + (3 * 3600000));
      
      // Текущее время в МСК
      const now = new Date();
      const nowMsk = new Date(now.getTime() + (3 * 3600000));
      
      const sameDay =
        mskTime.getUTCFullYear() === nowMsk.getUTCFullYear() &&
        mskTime.getUTCMonth() === nowMsk.getUTCMonth() &&
        mskTime.getUTCDate() === nowMsk.getUTCDate();
      
      const hours = String(mskTime.getUTCHours()).padStart(2, '0');
      const minutes = String(mskTime.getUTCMinutes()).padStart(2, '0');
      
      if (sameDay) {
        return `${hours}:${minutes}`;
      }
      
      const day = String(mskTime.getUTCDate()).padStart(2, '0');
      const month = String(mskTime.getUTCMonth() + 1).padStart(2, '0');
      return `${day}.${month} ${hours}:${minutes}`;
    } catch {
      return iso;
    }
  }

  function render() {
    // Дополнительная защита: если postId = "default-post", очищаем комментарии
    if (state.postId === "default-post") {
      state.comments = [];
      // Очищаем localStorage от старых комментариев
      try {
        localStorage.removeItem(`comments_${state.postId}`);
        localStorage.removeItem('comments_default-post');
      } catch (e) {
        console.warn("Failed to clear localStorage:", e);
      }
    }
    
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
      
      const avatarEl = node.querySelector(".msg__avatar");
      setAvatar(avatarEl, item.authorId, item.authorName, item.photo_url);
      
      const authorEl = node.querySelector(".bubble__author");
      
      // Проверяем премиум-статус автора комментария
      const isAuthorPremium = isUserPremium(item.authorId);
      
      // Добавляем значок премиум рядом с ником (в конце)
      if (isAuthorPremium) {
        // Используем premium_emoji из данных комментария (если есть), иначе дефолтный
        const authorPremiumEmoji = item.premium_emoji || '👑';
        authorEl.innerHTML = `${item.authorName || "Пользователь"} <span class="premium-badge" style="--premium-emoji: '${authorPremiumEmoji}';"></span>`;
        // Добавляем класс для подсветки комментария
        node.classList.add("msg--premium");
        
        // Применяем индивидуальные премиум стили автора
        applyUserPremiumStyles(item, node);
      } else {
        authorEl.textContent = item.authorName || "Пользователь";
      }
      
      // Добавляем обработчики кликов на автора и аватар
      if (!isMine) {
        avatarEl.style.cursor = "pointer";
        authorEl.style.cursor = "pointer";
        
        const handleUserClick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          sendUserMentionToPersonalChat(item.authorId, item.authorName);
        };
        
        avatarEl.addEventListener("click", handleUserClick);
        authorEl.addEventListener("click", handleUserClick);
      }
      
      node.querySelector(".bubble__time").textContent = formatTime(item.createdAt);
      
      // Применяем Markdown форматирование для премиум-пользователей
      const textEl = node.querySelector(".bubble__text");
      const isAuthorPremiumUser = isUserPremium(item.authorId);
      if (isAuthorPremiumUser) {
        textEl.innerHTML = parseMarkdown(item.text);
      } else {
        textEl.textContent = item.text;
      }
      if (item.attachments?.length) {
        const attachmentsWrap = document.createElement("div");
        attachmentsWrap.className = "bubble__attachments";
        console.log(`[DEBUG] Rendering ${item.attachments.length} attachments for comment ${item.id}`);
        for (const file of item.attachments) {
          console.log(`[DEBUG] Attachment:`, { name: file.name, type: file.type, photo_id: file.photo_id, message_id: file.message_id, token: file.token });
          console.log(`[DEBUG] Full attachment object:`, file);
          const isImage = file.type && file.type.startsWith('image/');
          const isVideo = file.type && file.type.startsWith('video/');
          
          // Определяем идентификатор для загрузки (приоритет: message_id > photo_id > token)
          const identifier = file.message_id || file.photo_id || file.token;
          
          // Показываем превью для изображений
          if (isImage && identifier) {
            // Предпросмотр изображения
            const imgWrap = document.createElement("div");
            imgWrap.className = "attachImage";
            const img = document.createElement("img");
            img.alt = file.name || "изображение";
            img.loading = "lazy";
            
            // Показываем placeholder пока загружается
            img.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect fill='%23f0f0f0' width='100' height='100'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23999'%3E⏳%3C/text%3E%3C/svg%3E";
            
            console.log(`[DEBUG] Loading image via proxy for identifier: ${identifier.substring(0, 50)}...`);
            
            // Проверяем кеш
            if (state.mediaCache[identifier]) {
              console.log(`[DEBUG] Image loaded from cache for ${identifier.substring(0, 30)}...`);
              img.src = state.mediaCache[identifier];
            } else {
              // Загружаем data URL через прокси
              const apiBase = state.apiBase || getApiBase();
              fetch(`${apiBase}/api/media/${encodeURIComponent(identifier)}`)
                .then(resp => {
                  if (!resp.ok) {
                    throw new Error(`HTTP ${resp.status}`);
                  }
                  return resp.json();
                })
                .then(data => {
                  if (data.ok && data.data_url) {
                    // Сохраняем в кеш
                    state.mediaCache[identifier] = data.data_url;
                    img.src = data.data_url;
                    console.log(`[DEBUG] Image loaded successfully, data URL size: ${data.data_url.length} chars`);
                  } else {
                    throw new Error(data.error || "No data URL in response");
                  }
                })
                .catch(err => {
                  console.warn("Image failed to load via proxy:", err);
                  // Заменяем на ссылку при ошибке загрузки
                  const chip = document.createElement("div");
                  chip.className = "attachChip";
                  chip.style.cursor = "pointer";
                  chip.textContent = `🖼️ ${file.name || "изображение"}`;
                  chip.addEventListener("click", (e) => {
                    e.preventDefault();
                    // Пробуем открыть через прокси
                    window.open(`${apiBase}/api/media/${encodeURIComponent(identifier)}`, "_blank", "noopener");
                  });
                  imgWrap.replaceWith(chip);
                });
            }
            
            img.addEventListener("click", (e) => {
              e.preventDefault();
              // Отправляем медиа в личный чат через бота
              sendMediaToPersonalChat(identifier, file.name, 'image', item.authorName, item.text, item.authorId);
            });
            imgWrap.appendChild(img);
            attachmentsWrap.appendChild(imgWrap);
          } else if (isVideo && identifier) {
            // Превью для видео
            const videoWrap = document.createElement("div");
            videoWrap.className = "attachImage attachImage--video";
            videoWrap.style.cssText = "position: relative; background: #1a1a1a; display: flex; align-items: center; justify-content: center; min-height: 150px; overflow: hidden;";
            
            // Создаем video элемент для получения первого кадра
            const video = document.createElement("video");
            video.style.cssText = "width: 100%; height: 100%; object-fit: cover; position: absolute; top: 0; left: 0;";
            video.muted = true;
            video.preload = "metadata";
            
            // Пытаемся загрузить видео для превью
            if (state.mediaCache[identifier]) {
              video.src = state.mediaCache[identifier];
              video.currentTime = 0.1; // Берем кадр с 0.1 секунды
            } else {
              // Загружаем через прокси
              const apiBase = state.apiBase || getApiBase();
              fetch(`${apiBase}/api/media/${encodeURIComponent(identifier)}`)
                .then(resp => resp.json())
                .then(data => {
                  if (data.ok && data.data_url) {
                    state.mediaCache[identifier] = data.data_url;
                    video.src = data.data_url;
                    video.currentTime = 0.1;
                  }
                })
                .catch(err => console.warn("Failed to load video preview:", err));
            }
            
            videoWrap.appendChild(video);
            
            // Иконка воспроизведения поверх видео
            const playIcon = document.createElement("div");
            playIcon.innerHTML = "▶️";
            playIcon.style.cssText = "font-size: 48px; opacity: 0.9; position: relative; z-index: 1; pointer-events: none;";
            
            videoWrap.appendChild(playIcon);
            
            videoWrap.addEventListener("click", (e) => {
              e.preventDefault();
              // Отправляем видео в личный чат через бота
              sendMediaToPersonalChat(identifier, file.name, 'video', item.authorName, item.text, item.authorId);
            });
            
            videoWrap.style.cursor = "pointer";
            attachmentsWrap.appendChild(videoWrap);
          } else if (identifier) {
            // Кликабельная ссылка на файл (аудио и другие типы)
            const chip = document.createElement("div");
            chip.className = "attachChip";
            chip.style.cursor = "pointer";
            const icon = file.type && file.type.startsWith('audio/') ? "🎵" : "📎";
            chip.textContent = `${icon} ${file.name || "файл"}`;
            chip.addEventListener("click", (e) => {
              e.preventDefault();
              // Отправляем медиа в личный чат через бота
              const mediaType = file.type && file.type.startsWith('audio/') ? 'audio' : 'file';
              sendMediaToPersonalChat(identifier, file.name, mediaType, item.authorName, item.text, item.authorId);
            });
            attachmentsWrap.appendChild(chip);
          }
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
        
        // Проверяем, поставил ли текущий пользователь эту реакцию
        const userReaction = item.reactedBy?.[state.user?.id];
        // Поддержка множественных реакций для премиум-пользователей
        const hasReaction = Array.isArray(userReaction) 
          ? userReaction.includes(key) 
          : userReaction === key;
        
        if (hasReaction) {
          pill.className += " is-active";
        }
        
        pill.textContent = `${key} ${formatReactionCount(count)}`;
        pill.dataset.reaction = key;
        pill.style.cursor = "pointer";
        
        // Добавляем обработчик клика для переключения реакции
        pill.addEventListener("click", async (e) => {
          e.stopPropagation();
          await toggleReaction(item, key);
        });
        
        reactionsWrap.appendChild(pill);
      }

      if (item.replyTo) {
        const replyLine = document.createElement("div");
        replyLine.className = "replyPreview replyPreview--inBubble";
        
        // Формируем текст с иконками вложений
        let replyText = item.replyTo.text || "";
        if (item.replyTo.attachments && item.replyTo.attachments.length > 0) {
          const attachmentIcons = item.replyTo.attachments.map(att => {
            if (att.type && att.type.startsWith('image/')) return '🖼️';
            if (att.type && att.type.startsWith('video/')) return '🎬';
            if (att.type && att.type.startsWith('audio/')) return '🎵';
            return '📎';
          }).join(' ');
          
          replyText = replyText ? `${attachmentIcons} ${replyText}` : attachmentIcons;
        }
        
        replyLine.innerHTML = `<span class="replyPreview__author">${item.replyTo.author}</span><span class="replyPreview__text">${replyText}</span>`;
        node.querySelector(".bubble__text").before(replyLine);
      }

      node.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        openContextMenu(item.id, e.clientX, e.clientY);
      });
      
      // iOS: добавляем обработчики touch событий ТОЛЬКО для долгого нажатия
      let touchStartTime = 0;
      let touchStartX = 0;
      let touchStartY = 0;
      let longPressTimer = null;
      let longPressTriggered = false;
      
      node.addEventListener("touchstart", (e) => {
        // Проверяем, что тап не по интерактивному элементу
        const target = e.target;
        const isInteractive = target.closest('.reactionPill') || 
                             target.closest('.attachImage') || 
                             target.closest('.attachChip') || 
                             target.closest('.msg__avatar') || 
                             target.closest('.bubble__author');
        
        // Если тап по интерактивному элементу - не обрабатываем
        if (isInteractive) {
          return;
        }
        
        touchStartTime = Date.now();
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        longPressTriggered = false;
        
        // Долгое нажатие для контекстного меню (500ms)
        longPressTimer = setTimeout(() => {
          longPressTriggered = true;
          // Вибрация при долгом нажатии (если поддерживается)
          if (navigator.vibrate) {
            navigator.vibrate(50);
          }
          openContextMenu(item.id, touchStartX, touchStartY);
        }, 500);
      }, { passive: true });
      
      node.addEventListener("touchmove", (e) => {
        // Отменяем долгое нажатие если палец двигается
        if (longPressTimer) {
          const moveX = Math.abs(e.touches[0].clientX - touchStartX);
          const moveY = Math.abs(e.touches[0].clientY - touchStartY);
          if (moveX > 10 || moveY > 10) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
          }
        }
      }, { passive: true });
      
      node.addEventListener("touchend", (e) => {
        if (longPressTimer) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
        }
        
        // НЕ открываем контекстное меню при коротком тапе
        // Короткий тап должен работать только для интерактивных элементов
      }, { passive: true });
      
      node.addEventListener("touchcancel", () => {
        if (longPressTimer) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
        }
      }, { passive: true });
      
      node.addEventListener("click", (e) => {
        const action = e.target?.dataset?.action;
        if (action !== "reply-inline") return;
        state.replyTo = {
          id: item.id,
          author: item.authorName || "Пользователь",
          text: String(item.text || "").slice(0, 80),
          attachments: item.attachments || [], // Добавляем вложения
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
    
    // Формируем текст с информацией о вложениях
    let textContent = state.replyTo.text;
    if (state.replyTo.attachments && state.replyTo.attachments.length > 0) {
      const attachmentIcons = state.replyTo.attachments.map(att => {
        if (att.type && att.type.startsWith('image/')) return '🖼️';
        if (att.type && att.type.startsWith('video/')) return '🎬';
        if (att.type && att.type.startsWith('audio/')) return '🎵';
        return '📎';
      }).join(' ');
      
      textContent = textContent ? `${attachmentIcons} ${textContent}` : attachmentIcons;
    }
    
    el.replyPreviewText.textContent = textContent;
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
      const isImage = item.type && item.type.startsWith('image/');
      const isVideo = item.type && item.type.startsWith('video/');
      
      if (isImage) {
        // Показываем превью изображения
        const preview = document.createElement("div");
        preview.className = "attachDraftPreview";
        preview.dataset.id = item.id;
        
        // Если есть preview_url - показываем, иначе placeholder
        const imgSrc = item.preview_url || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect fill='%23f0f0f0' width='100' height='100'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23999'%3E⏳%3C/text%3E%3C/svg%3E";
        
        preview.innerHTML = `
          <img src="${imgSrc}" alt="${item.name}" class="attachDraftPreview__img">
          <button type="button" class="attachDraftPreview__remove" title="Удалить">×</button>
        `;
        el.attachmentsBar.appendChild(preview);
      } else if (isVideo) {
        // Показываем превью видео
        const preview = document.createElement("div");
        preview.className = "attachDraftPreview attachDraftPreview--video";
        preview.dataset.id = item.id;
        
        if (item.preview_url) {
          preview.innerHTML = `
            <video src="${item.preview_url}" class="attachDraftPreview__img" muted></video>
            <div class="attachDraftPreview__icon">▶️</div>
            <button type="button" class="attachDraftPreview__remove" title="Удалить">×</button>
          `;
        } else {
          preview.innerHTML = `
            <div class="attachDraftPreview__img" style="background:#f0f0f0;display:flex;align-items:center;justify-content:center;">⏳</div>
            <button type="button" class="attachDraftPreview__remove" title="Удалить">×</button>
          `;
        }
        el.attachmentsBar.appendChild(preview);
      } else {
        // Показываем название файла для аудио и других типов
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "attachDraftChip";
        const icon = isVideo ? "🎬" : (item.type && item.type.startsWith('audio/') ? "🎵" : "📎");
        chip.textContent = `${icon} ${item.name}`;
        chip.dataset.id = item.id;
        el.attachmentsBar.appendChild(chip);
      }
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
      
      // Кодируем initData для безопасной передачи
      const headers = {};
      if (initData) {
        try {
          headers["X-Max-Init-Data"] = encodeURIComponent(initData);
        } catch (e) {
          console.error("Failed to encode initData:", e);
          headers["X-Max-Init-Data"] = initData;
        }
      }
      
      const resp = await fetch(`${state.apiBase}/api/upload`, {
        method: "POST",
        headers: headers,
        body: formData,
      });
      
      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}));
        console.error("Upload failed:", errorData.error || resp.statusText);
        return null;
      }
      
      const data = await resp.json();
      console.log("[DEBUG] Upload response:", data);
      
      // Сервер возвращает token, type, max_api_type, message_id и опционально photo_id
      if (data.token) {
        // Загружаем превью через прокси сразу после загрузки
        let previewUrl = null;
        const identifier = data.message_id || data.photo_id || data.token;
        
        if (identifier) {
          try {
            const mediaResp = await fetch(`${state.apiBase}/api/media/${encodeURIComponent(identifier)}`);
            if (mediaResp.ok) {
              const mediaData = await mediaResp.json();
              if (mediaData.ok && mediaData.data_url) {
                previewUrl = mediaData.data_url;
                // Сохраняем в кеш
                state.mediaCache[identifier] = previewUrl;
                console.log(`[DEBUG] Preview loaded for ${identifier.substring(0, 30)}..., size: ${mediaData.data_url.length} chars`);
              }
            }
          } catch (err) {
            console.warn("Failed to load preview:", err);
          }
        }
        
        return {
          token: data.token,
          photo_id: data.photo_id, // Для изображений
          message_id: data.message_id, // ID сообщения в архивном канале MAX
          type: data.type || file.type,
          max_api_type: data.max_api_type, // image, video, audio
          preview_url: previewUrl, // Data URL превью для отображения
        };
      }
      return null;
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
    console.log("[DEBUG] addComment called with text:", text.substring(0, 50));
    
    // Проверка на наличие валидного postId
    if (!state.postId || state.postId === "default-post") {
      console.warn("[BLOCKED] Cannot add comment without valid post_id");
      alert("⚠️ Комментарии можно писать только в контексте поста.\n\nОткройте миниапп через кнопку под постом в канале.");
      return;
    }
    
    ensureUserIdentity();
    
    const preparedAttachments = state.attachments.map((item) => ({
      name: item.name,
      token: item.token, // Токен для MAX API
      photo_id: item.photo_id, // ID фото (если есть)
      message_id: item.message_id, // ID сообщения в архивном канале MAX
      type: item.type, // MIME тип
      max_api_type: item.max_api_type, // image, video, audio
    }));
    
    console.log("[DEBUG] Prepared attachments:", preparedAttachments.length);
    
    try {
      const remoteItemRaw = await apiCreateComment(text.slice(0, MAX_LEN), preparedAttachments);
      
      if (remoteItemRaw) {
        console.log("[DEBUG] Comment saved to server successfully");
        const fresh = await apiListComments();
        if (fresh) {
          state.comments = fresh;
          saveComments();
        }
      } else {
        console.log("[DEBUG] Failed to save comment to server, saving locally");
        const localItem = {
          id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          postId: state.postId,
          authorId: state.user.id,
          authorName: state.user.name,
          text: text.slice(0, MAX_LEN),
          attachments: preparedAttachments,
          createdAt: new Date().toISOString(),
          reactions: {},
          reactedBy: {},
          replyTo: state.replyTo,
        };
        state.comments.push(localItem);
        saveComments();
        console.warn("Комментарий сохранен локально, сервер недоступен");
      }
    } catch (error) {
      if (error.message && error.message.startsWith("USER_BANNED:")) {
        const message = error.message.replace("USER_BANNED:", "");
        alert("🚫 " + message);
        return; // Не добавляем комментарий локально при бане
      } else {
        console.error("Error creating comment:", error);
        // При других ошибках сохраняем локально
        const localItem = {
          id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          postId: state.postId,
          authorId: state.user.id,
          authorName: state.user.name,
          text: text.slice(0, MAX_LEN),
          attachments: preparedAttachments,
          createdAt: new Date().toISOString(),
          reactions: {},
          reactedBy: {},
          replyTo: state.replyTo,
        };
        state.comments.push(localItem);
        saveComments();
        console.warn("Комментарий сохранен локально из-за ошибки");
      }
    }
    
    state.replyTo = null;
    state.attachments = [];
    syncReplyPreview();
    renderAttachmentsBar();
    render();
    scrollToBottom();
  }

  async function handleSend() {
    console.log("[DEBUG] handleSend called");
    console.log("[DEBUG] state.attachments BEFORE check:", JSON.stringify(state.attachments));
    const text = el.commentInput.value.trim();
    console.log("[DEBUG] text:", text);
    console.log("[DEBUG] attachments count:", state.attachments.length);
    console.log("[DEBUG] attachments:", state.attachments);
    
    // Разрешаем отправку если есть текст ИЛИ вложения
    if (!text && state.attachments.length === 0) {
      console.log("[DEBUG] No text and no attachments, skipping");
      return;
    }
    
    if (text.length > MAX_LEN) {
      alert("Слишком длинный комментарий.");
      return;
    }
    
    // Если нет текста, но есть вложения - отправляем с пустым текстом
    const finalText = text || "";
    console.log("[DEBUG] Sending comment with text:", finalText, "and attachments:", state.attachments.length);
    await addComment(finalText);
    el.commentInput.value = "";
    updateCounter();
    syncComposerSize();
  }

  function setupEvents() {
    console.log("[DEBUG] setupEvents called");
    console.log("[DEBUG] el.commentInput:", el.commentInput);
    console.log("[DEBUG] el.sendBtn:", el.sendBtn);
    console.log("[DEBUG] el.sortBtn:", el.sortBtn);
    console.log("[DEBUG] el.clearBtn:", el.clearBtn);
    
    if (!el.commentInput || !el.sendBtn || !el.sortBtn || !el.clearBtn) {
      console.error("[DEBUG] Some elements not found, skipping event setup");
      return;
    }
    
    el.commentInput.addEventListener("input", () => {
      updateCounter();
      syncComposerSize();
    });
    el.sendBtn.addEventListener("click", () => { 
      console.log("[DEBUG] Send button clicked");
      void handleSend(); 
    });
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
      
      // Проверяем премиум-статус и показываем/скрываем премиум-настройки
      const premiumSections = document.querySelectorAll('.premium-settings-section');
      if (state.user.isPremium) {
        // Показываем премиум-настройки
        premiumSections.forEach(section => {
          section.style.display = '';
          // Удаляем заглушку если она есть
          const lockedMsg = section.querySelector('.premium-locked-message');
          if (lockedMsg) lockedMsg.remove();
        });
      } else {
        // Скрываем настройки и показываем заглушку
        premiumSections.forEach(section => {
          // Скрываем все элементы кроме label
          const children = Array.from(section.children);
          children.forEach(child => {
            if (!child.classList.contains('settingsModal__label') && !child.classList.contains('premium-locked-message')) {
              child.style.display = 'none';
            }
          });
          
          // Добавляем заглушку если её ещё нет
          if (!section.querySelector('.premium-locked-message')) {
            const lockedMsg = document.createElement('div');
            lockedMsg.className = 'premium-locked-message';
            lockedMsg.innerHTML = '<p>🔒 Для разблокировки премиум-функций оформите подписку в боте через /subscribe</p>';
            section.appendChild(lockedMsg);
          }
        });
      }
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
        // Не меняем автоматически градиент - пользователь выбирает сам
        // Только обновляем применение текущей схемы под новую тему
        applyBackgroundScheme();
        saveVisualSettings();
        // Обновляем палитру
        if (el.paletteGrid) {
          el.paletteGrid.innerHTML = BG_SCHEMES.map((scheme) => {
            if (scheme.id === "pattern-only") {
              const isDark = document.documentElement.classList.contains('theme-dark') || 
                             (!document.documentElement.classList.contains('theme-light') && 
                              window.matchMedia("(prefers-color-scheme: dark)").matches);
              const patternBg = isDark ? '#0d141e' : '#f5f9ff';
              return `<button type="button" class="paletteItem" data-bg="${scheme.id}" style="background:${patternBg}" aria-label="${scheme.label}"></button>`;
            } else if (scheme.gradient) {
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
      console.log("[DEBUG] Palette clicked, target:", target);
      if (!target) return;
      state.bgScheme = target.dataset.bg;
      console.log("[DEBUG] Selected bgScheme:", state.bgScheme);
      applyBackgroundScheme();
      saveVisualSettings();
    });
    
    // Обработчик кликов по палитре премиум-цветов
    el.premiumColorPalette?.addEventListener("click", (e) => {
      const target = e.target.closest("[data-premium-color]");
      if (!target) return;
      state.premiumColorScheme = target.dataset.premiumColor;
      state.premiumColorMode = "presets";
      applyPremiumColors();
      saveVisualSettings();
      
      // Обновляем активный класс
      el.premiumColorPalette.querySelectorAll(".premium-color-item").forEach(item => {
        item.classList.toggle("active", item.dataset.premiumColor === state.premiumColorScheme);
      });
      
      // Перерендериваем комментарии чтобы применить новые цвета
      render();
    });
    
    // Обработчик переключения режима (готовые/кастомные цвета)
    document.querySelectorAll('.premium-mode-btn[data-mode]').forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.mode;
        if (!mode) return;
        
        state.premiumColorMode = mode;
        
        // Обновляем активный класс кнопок
        btn.parentElement.querySelectorAll('.premium-mode-btn').forEach(b => {
          b.classList.toggle('active', b.dataset.mode === mode);
        });
        
        // Показываем/скрываем соответствующие панели
        const palette = document.getElementById('premiumColorPalette');
        const picker = document.getElementById('premiumColorPicker');
        
        if (mode === 'presets') {
          palette.hidden = false;
          picker.hidden = true;
        } else {
          palette.hidden = true;
          picker.hidden = false;
        }
        
        saveVisualSettings();
      });
    });
    
    // Функция обновления color picker
    function updateColorPicker(target, h, s, l) {
      const hex = hslToHex(h, s, l);
      
      if (target === 'emoji') {
        document.getElementById('valueHEmoji').textContent = h + '°';
        document.getElementById('valueSEmoji').textContent = s + '%';
        document.getElementById('valueLEmoji').textContent = l + '%';
        document.getElementById('hexValueEmoji').textContent = hex;
        document.getElementById('previewEmojiColor').style.background = hex;
        document.getElementById('emojiColorPreview').style.background = hex;
        
        state.premiumEmojiColor = hex;
        state.premiumEmojiMode = 'color';
        
        // Применяем только цвет эмодзи
        document.documentElement.style.setProperty("--premium-emoji", `""`);
        document.documentElement.style.setProperty("--premium-emoji-color", hex);
        
        saveVisualSettings();
        render();
      } else if (target === 'gradient1' || target === 'gradient2') {
        const targetNum = target === 'gradient1' ? '1' : '2';
        document.getElementById('valueHGradient' + targetNum).textContent = h + '°';
        document.getElementById('valueSGradient' + targetNum).textContent = s + '%';
        document.getElementById('valueLGradient' + targetNum).textContent = l + '%';
        document.getElementById('hexValueGradient' + targetNum).textContent = hex;
        document.getElementById('previewGradient' + targetNum).style.background = hex;
        
        state.customGradient = state.customGradient || {};
        state.customGradient[target] = { h, s, l, hex };
        
        // Обновляем предпросмотр градиента
        const color1 = state.customGradient.gradient1?.hex || '#0f5739';
        const color2 = state.customGradient.gradient2?.hex || '#52c9eb';
        const gradient = `linear-gradient(90deg, ${color1}, ${color2})`;
        document.getElementById('gradientPreview').style.background = gradient;
        
        // Применяем градиент
        state.bgMode = 'custom';
        applyBackgroundScheme();
        saveVisualSettings();
      } else {
        const targetNum = target;
        document.getElementById('valueH' + targetNum).textContent = h + '°';
        document.getElementById('valueS' + targetNum).textContent = s + '%';
        document.getElementById('valueL' + targetNum).textContent = l + '%';
        document.getElementById('hexValue' + targetNum).textContent = hex;
        
        const rgba1 = hexToRgba(hex, 0.21);
        const rgba2 = hexToRgba(hex, 0.12);
        const rgba3 = hexToRgba(hex, 0.08);
        const rgbaBorder = hexToRgba(hex, 0.45);
        const rgbaGlow = hexToRgba(hex, 0.2);
        const rgbaName = hexToRgba(hex, 0.95);
        
        if (targetNum === '1') {
          document.getElementById('previewColor1').style.background = rgba1;
          document.documentElement.style.setProperty("--premium-color-1", rgba1);
        } else if (targetNum === '2') {
          document.getElementById('previewColor2').style.background = rgba2;
          document.documentElement.style.setProperty("--premium-color-2", rgba2);
        }
        
        // Автоматически обновляем остальные параметры
        document.documentElement.style.setProperty("--premium-color-3", rgba3);
        document.documentElement.style.setProperty("--premium-border", rgbaBorder);
        document.documentElement.style.setProperty("--premium-glow", rgbaGlow);
        document.documentElement.style.setProperty("--premium-name-color", rgbaName);
        
        state.premiumCustomColors = state.premiumCustomColors || {};
        state.premiumCustomColors['color' + targetNum] = { h, s, l, hex };
        state.premiumCustomColors.color1 = rgba1;
        state.premiumCustomColors.color2 = rgba2;
        state.premiumCustomColors.color3 = rgba3;
        state.premiumCustomColors.border = rgbaBorder;
        state.premiumCustomColors.glow = rgbaGlow;
        state.premiumCustomColors.nameColor = rgbaName;
        
        saveVisualSettings();
        render();
      }
    }
    
    // Обработчики слайдеров
    document.querySelectorAll('.mobile-color-picker__slider').forEach(slider => {
      slider.addEventListener('input', (e) => {
        const target = e.target.dataset.target;
        const channel = e.target.dataset.channel;
        
        let h, s, l;
        if (target === 'emoji') {
          h = parseInt(document.querySelector('[data-target="emoji"][data-channel="h"]').value);
          s = parseInt(document.querySelector('[data-target="emoji"][data-channel="s"]').value);
          l = parseInt(document.querySelector('[data-target="emoji"][data-channel="l"]').value);
        } else {
          h = parseInt(document.querySelector(`[data-target="${target}"][data-channel="h"]`).value);
          s = parseInt(document.querySelector(`[data-target="${target}"][data-channel="s"]`).value);
          l = parseInt(document.querySelector(`[data-target="${target}"][data-channel="l"]`).value);
        }
        
        updateColorPicker(target, h, s, l);
      });
    });
    
    // Обработчики пресетов для эмодзи
    document.querySelectorAll('.mobile-color-picker__preset').forEach(preset => {
      preset.addEventListener('click', (e) => {
        const hex = e.target.dataset.color;
        const hsl = hexToHsl(hex);
        
        document.querySelector('[data-target="emoji"][data-channel="h"]').value = hsl.h;
        document.querySelector('[data-target="emoji"][data-channel="s"]').value = hsl.s;
        document.querySelector('[data-target="emoji"][data-channel="l"]').value = hsl.l;
        
        updateColorPicker('emoji', hsl.h, hsl.s, hsl.l);
      });
    });
    
    // Обработчик переключения режима эмодзи (эмодзи/цветная заливка)
    document.querySelectorAll('.premium-mode-btn[data-emoji-mode]').forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.emojiMode;
        if (!mode) return;
        
        state.premiumEmojiMode = mode;
        
        // Обновляем активный класс кнопок
        btn.parentElement.querySelectorAll('.premium-mode-btn').forEach(b => {
          b.classList.toggle('active', b.dataset.emojiMode === mode);
        });
        
        // Показываем/скрываем соответствующие панели
        const emojiPalette = document.getElementById('premiumEmojiPalette');
        const colorPicker = document.getElementById('premiumEmojiColorPicker');
        
        if (mode === 'emoji') {
          emojiPalette.hidden = false;
          colorPicker.hidden = true;
        } else {
          emojiPalette.hidden = true;
          colorPicker.hidden = false;
        }
        
        applyPremiumColors();
        saveVisualSettings();
        render();
      });
    });
    
    // Обработчик переключения режима градиента (готовые/кастомный)
    document.querySelectorAll('.premium-mode-btn[data-bg-mode]').forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.bgMode;
        if (!mode) return;
        
        state.bgMode = mode;
        
        // Обновляем активный класс кнопок
        btn.parentElement.querySelectorAll('.premium-mode-btn').forEach(b => {
          b.classList.toggle('active', b.dataset.bgMode === mode);
        });
        
        // Показываем/скрываем соответствующие панели
        const palette = document.getElementById('paletteGrid');
        const picker = document.getElementById('customGradientPicker');
        
        if (mode === 'presets') {
          palette.hidden = false;
          picker.hidden = true;
        } else {
          palette.hidden = true;
          picker.hidden = false;
        }
        
        applyBackgroundScheme();
        saveVisualSettings();
      });
    });
    
    // Обработчик кликов по палитре премиум-эмодзи
    el.premiumEmojiPalette?.addEventListener("click", (e) => {
      const target = e.target.closest("[data-premium-emoji]");
      if (!target) return;
      state.premiumEmoji = target.dataset.premiumEmoji;
      applyPremiumColors();
      saveVisualSettings();
      
      // Обновляем активный класс
      el.premiumEmojiPalette.querySelectorAll(".premium-emoji-item").forEach(item => {
        item.classList.toggle("active", item.dataset.premiumEmoji === state.premiumEmoji);
      });
      
      // Перерендериваем комментарии чтобы применить новый эмодзи
      render();
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
      const files = Array.from(el.fileInput.files || []).slice(0, 1); // Только 1 файл
      
      if (!files.length) return;
      
      // Показываем индикатор загрузки
      showUploadProgress(files.length);
      
      const mapped = await Promise.all(files.map(async (file, index) => {
        // Безопасная валидация типов файлов
        const allowedTypes = {
          'image/png': { maxSize: 10 * 1024 * 1024, label: 'PNG' },
          'image/jpeg': { maxSize: 10 * 1024 * 1024, label: 'JPEG' },
          'video/mp4': { maxSize: 100 * 1024 * 1024, label: 'MP4' },
          'audio/mpeg': { maxSize: 20 * 1024 * 1024, label: 'MP3' }
        };
        
        // Проверка типа файла
        if (!allowedTypes[file.type]) {
          console.error(`File ${file.name} has unsupported type: ${file.type}`);
          updateUploadProgress(index, 'error', `Разрешены только: PNG, JPEG, MP4, MP3`);
          return null;
        }
        
        // Проверка расширения файла (защита от двойных расширений)
        const fileName = file.name.toLowerCase();
        const validExtensions = {
          'image/png': ['.png'],
          'image/jpeg': ['.jpg', '.jpeg'],
          'video/mp4': ['.mp4'],
          'audio/mpeg': ['.mp3']
        };
        
        const allowedExts = validExtensions[file.type] || [];
        const hasValidExt = allowedExts.some(ext => fileName.endsWith(ext));
        
        if (!hasValidExt) {
          console.error(`File ${file.name} has invalid extension for type ${file.type}`);
          updateUploadProgress(index, 'error', `Неверное расширение файла`);
          return null;
        }
        
        // Проверка на двойное расширение (file.jpg.exe)
        const parts = fileName.split('.');
        if (parts.length > 2) {
          console.error(`File ${file.name} has suspicious double extension`);
          updateUploadProgress(index, 'error', `Подозрительное имя файла`);
          return null;
        }
        
        // Проверка размера файла
        const maxSize = allowedTypes[file.type].maxSize;
        if (file.size > maxSize) {
          const maxMB = (maxSize / 1024 / 1024).toFixed(0);
          console.error(`File ${file.name} is too large (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
          updateUploadProgress(index, 'error', `Макс ${maxMB} МБ для ${allowedTypes[file.type].label}`);
          return null;
        }
        
        // Загружаем файл на сервер
        updateUploadProgress(index, 'uploading', `Загрузка ${file.name}...`);
        const uploadResult = await uploadFileToServer(file);
        
        if (!uploadResult) {
          console.error("Failed to upload file:", file.name);
          updateUploadProgress(index, 'error', `Ошибка загрузки ${file.name}`);
          return null;
        }
        
        updateUploadProgress(index, 'success', `Загружено: ${file.name}`);
        
        return {
          id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          name: file.name,
          type: uploadResult.type || file.type,
          max_api_type: uploadResult.max_api_type, // image, video, audio
          preview_url: uploadResult.preview_url, // Локальное превью для отображения
          token: uploadResult.token, // Токен для отправки через API
          photo_id: uploadResult.photo_id, // Для изображений
          message_id: uploadResult.message_id, // ID сообщения в архивном канале MAX
        };
      }));
      
      // Добавляем новые файлы к существующим (не заменяем!)
      const newFiles = mapped.filter(Boolean); // Убираем null (неудачные загрузки)
      state.attachments = [...state.attachments, ...newFiles];
      console.log("[DEBUG] Files uploaded, state.attachments:", state.attachments);
      console.log("[DEBUG] state.attachments length:", state.attachments.length);
      console.log("[DEBUG] state.attachments JSON:", JSON.stringify(state.attachments));
      renderAttachmentsBar();
      hideUploadProgress();
      
      // Очищаем input для возможности повторной загрузки тех же файлов
      if (el.fileInput) el.fileInput.value = '';
    });
    el.attachmentsBar?.addEventListener("click", (e) => {
      // Обработка клика на кнопку удаления в превью
      const removeBtn = e.target.closest(".attachDraftPreview__remove");
      if (removeBtn) {
        const preview = removeBtn.closest("[data-id]");
        if (preview) {
          const id = preview.dataset.id;
          state.attachments = state.attachments.filter((item) => item.id !== id);
          renderAttachmentsBar();
        }
        return;
      }
      
      // Обработка клика на chip (старый формат)
      const chip = e.target.closest(".attachDraftChip[data-id]");
      if (chip) {
        const id = chip.dataset.id;
        state.attachments = state.attachments.filter((item) => item.id !== id);
        renderAttachmentsBar();
      }
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
    
    // Останавливаем real-time обновления при закрытии страницы
    window.addEventListener("beforeunload", () => {
      stopRealTimeUpdates();
    });
    
    // Останавливаем обновления при потере фокуса (экономия ресурсов)
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        stopRealTimeUpdates();
      } else {
        startRealTimeUpdates();
      }
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
          attachments: item.attachments || [], // Добавляем вложения
        };
        syncReplyPreview();
        el.commentInput.focus();
      }

      if (action === "edit") {
        openEditModal(item.id);
      }

      if (action === "copy") {
        await navigator.clipboard.writeText(item.text || "");
      }

      if (action === "report") {
        const success = await apiReportComment(item.id);
        if (success) {
          alert("✅ Жалоба отправлена администратору канала.");
        } else {
          alert("❌ Не удалось отправить жалобу. Попробуйте позже.");
        }
      }

      if (action === "delete") {
        if (item.authorId === state.user.id) {
          openDeleteModal(item.id);
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
      // Показываем модальное окно подтверждения
      el.clearModal.hidden = false;
    });
    
    el.clearConfirmBtn?.addEventListener("click", async () => {
      el.clearModal.hidden = true;
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
    
    el.clearCancelBtn?.addEventListener("click", () => {
      el.clearModal.hidden = true;
    });
    
    el.clearModal?.querySelector(".deleteModal__overlay")?.addEventListener("click", () => {
      el.clearModal.hidden = true;
    });

    // Обработчики для модального окна удаления
    el.deleteForMeBtn?.addEventListener("click", () => {
      if (state.deleteCommentId) {
        deleteCommentForMe(state.deleteCommentId);
      }
    });

    el.deleteForAllBtn?.addEventListener("click", () => {
      if (state.deleteCommentId) {
        deleteCommentForAll(state.deleteCommentId);
      }
    });

    el.deleteCancelBtn?.addEventListener("click", closeDeleteModal);

    // Закрытие модального окна по клику на overlay
    el.deleteModal?.addEventListener("click", (e) => {
      if (e.target === el.deleteModal || e.target.classList.contains("deleteModal__overlay")) {
        closeDeleteModal();
      }
    });

    // Закрытие модального окна по Escape
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !el.deleteModal.hidden) {
        closeDeleteModal();
      }
      if (e.key === "Escape" && !el.editModal.hidden) {
        closeEditModal();
      }
    });

    // Обработчики для модального окна редактирования
    el.editSaveBtn?.addEventListener("click", () => {
      saveEditedComment();
    });

    el.editCancelBtn?.addEventListener("click", closeEditModal);
    el.editCloseBtn?.addEventListener("click", closeEditModal);

    // Обработчики для кнопок форматирования
    document.querySelectorAll('.format-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const format = btn.dataset.format;
        if (format) {
          applyFormatting(format);
        }
      });
    });

    // Обновление счетчика символов
    el.editTextarea?.addEventListener("input", () => {
      el.editCharCounter.textContent = el.editTextarea.value.length;
    });

    // Закрытие модального окна редактирования по клику на overlay
    el.editModal?.addEventListener("click", (e) => {
      if (e.target === el.editModal || e.target.classList.contains("deleteModal__overlay")) {
        closeEditModal();
      }
    });

  }

  async function boot() {
    setThemeFromMax();
    ensureUserIdentity();
    await loadVisualSettings();
    applyTheme();
    applyBackgroundScheme();
    applyPremiumColors();
    state.apiBase = getApiBase();
    state.postId = resolvePostId();
    state.postLink = resolvePostLink(state.postId);
    
    // Дополнительная защита: очищаем старые комментарии если нет валидного postId
    if (!state.postId || state.postId === "default-post") {
      try {
        // Очищаем все возможные ключи localStorage с комментариями
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('comments_')) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
        console.log("[DEBUG] Cleared localStorage keys:", keysToRemove);
      } catch (e) {
        console.warn("Failed to clear localStorage:", e);
      }
    }
    
    // Блокируем UI если нет валидного postId
    if (!state.postId || state.postId === "default-post") {
      if (el.commentInput) {
        el.commentInput.disabled = true;
        el.commentInput.placeholder = "⚠️ Откройте миниапп через кнопку под постом в канале";
      }
      if (el.sendBtn) el.sendBtn.disabled = true;
      if (el.attachBtn) el.attachBtn.disabled = true;
      if (el.emptyState) {
        el.emptyState.innerHTML = "<p>⚠️ Комментарии доступны только в контексте поста.<br><br>Откройте миниапп через кнопку под постом в канале.</p>";
      }
    }
    
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
    loadCommentsFromServer().then(async () => {
      // Инициализируем счетчик после первой загрузки
      lastCommentCount = state.comments.length;
      
      // Загружаем премиум-статус текущего пользователя
      if (state.user.id && state.apiBase) {
        try {
          const isPremium = await apiCheckPremiumStatus(state.user.id);
          state.user.isPremium = isPremium;
          console.log(`[DEBUG] User premium status loaded: ${isPremium}`);
          
          // Загружаем премиум-статусы авторов комментариев
          const authorIds = [...new Set(state.comments.map(c => c.authorId))];
          for (const authorId of authorIds) {
            if (authorId && authorId !== state.user.id) {
              try {
                const authorPremium = await apiCheckPremiumStatus(authorId);
                state.premiumUsers[authorId] = authorPremium;
              } catch (e) {
                console.warn(`Failed to load premium status for user ${authorId}:`, e);
              }
            }
          }
          
          // Перерисовываем комментарии с учетом премиум-статусов
          render();
          renderContextReactions();
        } catch (e) {
          console.warn("Failed to load premium status:", e);
        }
      }
      
      // Запускаем real-time обновления
      startRealTimeUpdates();
    });
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
        if (scheme.id === "pattern-only") {
          // Для "только паттерн" показываем текущий паттерн темы
          const isDark = document.documentElement.classList.contains('theme-dark') || 
                         (!document.documentElement.classList.contains('theme-light') && 
                          window.matchMedia("(prefers-color-scheme: dark)").matches);
          const patternBg = isDark ? '#0d141e' : '#f5f9ff';
          return `<button type="button" class="paletteItem" data-bg="${scheme.id}" style="background:${patternBg}" aria-label="${scheme.label}"></button>`;
        } else if (scheme.gradient) {
          return `<button type="button" class="paletteItem" data-bg="${scheme.id}" style="background:${scheme.gradient}" aria-label="${scheme.label}"></button>`;
        } else {
          return `<button type="button" class="paletteItem" data-bg="${scheme.id}" style="--g1:${scheme.start};--g2:${scheme.end}" aria-label="${scheme.label}"></button>`;
        }
      }).join("");
    }
    
    // Рендеринг палитры премиум-цветов
    if (el.premiumColorPalette) {
      el.premiumColorPalette.innerHTML = PREMIUM_COLOR_SCHEMES.map((scheme) => {
        const isActive = state.premiumColorScheme === scheme.id;
        return `<button type="button" class="premium-color-item ${isActive ? 'active' : ''}" data-premium-color="${scheme.id}" style="background:linear-gradient(135deg, ${scheme.color1} 0%, ${scheme.color2} 50%, ${scheme.color3} 100%); border-color: ${scheme.border}; color: ${scheme.glow};" aria-label="${scheme.label}"></button>`;
      }).join("");
    }
    
    // Рендеринг палитры премиум-эмодзи
    if (el.premiumEmojiPalette) {
      el.premiumEmojiPalette.innerHTML = PREMIUM_EMOJIS.map((emoji) => {
        const isActive = state.premiumEmoji === emoji;
        return `<button type="button" class="premium-emoji-item ${isActive ? 'active' : ''}" data-premium-emoji="${emoji}" aria-label="Эмодзи ${emoji}">${emoji}</button>`;
      }).join("");
    }
    
    render();
    syncScrollDownButton();
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
  
  // Ждем загрузки DOM перед инициализацией
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  // Тест форматирования чисел реакций (только для разработки)
  if (window.location.search.includes('test=reactions')) {
    console.log('=== Тест форматирования чисел реакций ===');
    const testCases = [
      999, 1000, 1100, 1500, 2000, 10000, 15500, 
      999999, 1000000, 1100000, 2500000, 10000000
    ];
    
    testCases.forEach(num => {
      console.log(`${num} → ${formatReactionCount(num)}`);
    });
    console.log('=== Конец теста ===');
  }
})();
