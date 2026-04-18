(function () {
  const STORAGE_PREFIX = "max-commentator:v1:";
  const MAX_LEN = 1200;

  const state = {
    postId: null,
    sortDesc: true,
    comments: [],
    user: {
      id: "guest",
      name: "Гость",
    },
    apiBase: "",
  };

  const el = {
    postInfo: document.getElementById("postInfo"),
    commentInput: document.getElementById("commentInput"),
    charCounter: document.getElementById("charCounter"),
    sendBtn: document.getElementById("sendBtn"),
    sortBtn: document.getElementById("sortBtn"),
    clearBtn: document.getElementById("clearBtn"),
    shareBtn: document.getElementById("shareBtn"),
    commentsList: document.getElementById("commentsList"),
    emptyState: document.getElementById("emptyState"),
    tpl: document.getElementById("commentTemplate"),
  };

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

  function parsePostIdFromStartParam(value) {
    // Возможные варианты payload: "post_123", "post=123", "123"
    if (!value) return null;
    const decoded = decodeURIComponent(String(value));
    if (decoded.includes("post=")) {
      return decoded.split("post=")[1].split(/[;&]/)[0] || null;
    }
    if (decoded.startsWith("post_")) {
      return decoded.slice(5) || null;
    }
    return decoded;
  }

  function resolvePostId() {
    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get("post_id") || params.get("post") || params.get("id");
    if (fromQuery) return fromQuery;

    const webApp = getWebApp();
    const fromInit = webApp?.initDataUnsafe?.start_param;
    if (fromInit) return parsePostIdFromStartParam(fromInit);

    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const webAppDataRaw = hash.get("WebAppData");
    if (webAppDataRaw) {
      const appParams = new URLSearchParams(decodeURIComponent(webAppDataRaw));
      const startParam = appParams.get("start_param");
      if (startParam) return parsePostIdFromStartParam(startParam);
    }

    return "default-post";
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
      state.user.id = String(user.id || "guest");
      state.user.name = [user.first_name, user.last_name].filter(Boolean).join(" ").trim() || user.username || "Пользователь";
    }
  }

  function storageKey(postId) {
    return `${STORAGE_PREFIX}${postId}`;
  }

  function loadComments() {
    // local fallback happens in api wrappers
    const raw = localStorage.getItem(storageKey(state.postId));
    const parsed = safeParse(raw || "[]", []);
    state.comments = Array.isArray(parsed) ? parsed : [];
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
        id: String(x.id),
        postId: x.post_id,
        authorId: x.author_id,
        authorName: x.author_name,
        text: x.text,
        createdAt: x.created_at,
      }));
    } catch {
      return null;
    }
  }

  async function apiCreateComment(text) {
    if (!state.apiBase) return null;
    try {
      const resp = await fetch(`${state.apiBase}/api/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          post_id: state.postId,
          author_id: state.user.id,
          author_name: state.user.name,
          text,
        }),
      });
      const data = await resp.json();
      if (!resp.ok || !data.ok) return null;
      const x = data.item;
      return {
        id: String(x.id),
        postId: x.post_id,
        authorId: x.author_id,
        authorName: x.author_name,
        text: x.text,
        createdAt: x.created_at,
      };
    } catch {
      return null;
    }
  }

  async function apiDeleteComment(commentId) {
    if (!state.apiBase) return false;
    try {
      const resp = await fetch(
        `${state.apiBase}/api/comments/${encodeURIComponent(commentId)}?author_id=${encodeURIComponent(state.user.id)}`,
        { method: "DELETE" }
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
      const resp = await fetch(`${state.apiBase}/api/comments?post_id=${encodeURIComponent(state.postId)}`, { method: "DELETE" });
      const data = await resp.json();
      return !!(resp.ok && data.ok);
    } catch {
      return false;
    }
  }

  function formatTime(iso) {
    try {
      return new Date(iso).toLocaleString("ru-RU");
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

    el.emptyState.style.display = list.length ? "none" : "block";
    for (const item of list) {
      const node = el.tpl.content.firstElementChild.cloneNode(true);
      node.dataset.id = item.id;
      node.querySelector(".comment__author").textContent = item.authorName || "Пользователь";
      node.querySelector(".comment__time").textContent = formatTime(item.createdAt);
      node.querySelector(".comment__text").textContent = item.text;

      node.addEventListener("click", (e) => {
        const action = e.target?.dataset?.action;
        if (!action) return;
        if (action === "reply") {
          el.commentInput.value = `@${item.authorName || "Пользователь"} `;
          el.commentInput.focus();
          updateCounter();
        }
        if (action === "delete") {
          if (item.authorId !== state.user.id) {
            alert("Удалять можно только свои комментарии.");
            return;
          }
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
        }
      });

      el.commentsList.appendChild(node);
    }
  }

  function updateCounter() {
    const len = el.commentInput.value.length;
    el.charCounter.textContent = `${len} / ${MAX_LEN}`;
  }

  async function addComment(text) {
    const localItem = {
      id: `${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
      postId: state.postId,
      authorId: state.user.id,
      authorName: state.user.name,
      text,
      createdAt: new Date().toISOString(),
    };
    const remoteItem = await apiCreateComment(text);
    if (remoteItem) {
      const fresh = await apiListComments();
      state.comments = fresh || [remoteItem, ...state.comments];
    } else {
      state.comments.push(localItem);
    }
    saveComments();
    render();
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
  }

  function setupEvents() {
    el.commentInput.addEventListener("input", updateCounter);
    el.sendBtn.addEventListener("click", () => { void handleSend(); });
    el.commentInput.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") void handleSend();
    });

    el.sortBtn.addEventListener("click", () => {
      state.sortDesc = !state.sortDesc;
      el.sortBtn.textContent = state.sortDesc ? "Сначала новые" : "Сначала старые";
      render();
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
    });

    el.shareBtn.addEventListener("click", async () => {
      const link = window.location.origin + window.location.pathname + `?post_id=${encodeURIComponent(state.postId)}`;
      const webApp = getWebApp();
      if (webApp && typeof webApp.shareMaxContent === "function") {
        try {
          webApp.shareMaxContent({
            text: `Комментарии к посту ${state.postId}`,
            url: link,
          });
          return;
        } catch {
          // fallback below
        }
      }
      await navigator.clipboard.writeText(link);
      alert("Ссылка скопирована");
    });
  }

  function boot() {
    state.apiBase = getApiBase();
    setThemeFromMax();
    state.postId = resolvePostId();
    el.postInfo.textContent = `Пост: ${state.postId}`;
    loadComments();
    updateCounter();
    setupEvents();
    render();
    if (state.apiBase) {
      apiListComments().then((items) => {
        if (items) {
          state.comments = items;
          saveComments();
          render();
        }
      });
    }
  }

  boot();
})();
