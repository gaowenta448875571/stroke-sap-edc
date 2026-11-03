// 前后端分离数据接口适配器 (Storage, JWT Auth, Backend Permission & REST API Adapter)

const STORAGE_KEY = "STROKE_SAP_EDC_SUBJECTS_V5";
const API_CONFIG_KEY = "STROKE_SAP_EDC_API_CONFIG_V3";
const SESSION_KEY = "STROKE_SAP_EDC_AUTH_SESSION_V3";
const USERS_STORAGE_KEY = "STROKE_SAP_EDC_USERS_V3";
const REMEMBER_CREDS_KEY = "STROKE_SAP_EDC_REMEMBER_CREDS_V1";

window.EDC_API = {
  getConfig() {
    try {
      const saved = localStorage.getItem(API_CONFIG_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    const isHttpOrigin =
      typeof window !== "undefined" &&
      window.location &&
      (window.location.protocol === "http:" || window.location.protocol === "https:") &&
      window.location.hostname !== "localhost" &&
      window.location.hostname !== "127.0.0.1";
    return {
      mode: "remote", // 默认连接云端 Supabase + Render 后端
      baseUrl: isHttpOrigin
        ? `${window.location.origin}/api/v1`
        : "https://stroke-sap-edc-system.onrender.com/api/v1",
      token: ""
    };
  },

  saveConfig(cfg) {
    localStorage.setItem(API_CONFIG_KEY, JSON.stringify(cfg));
  },

  // 启动时自动探测可用后端并同步为 remote 模式，确保前端实时读取 Supabase 最新修改
  async autoDetectBackendIfNeeded() {
    try {
      const currentCfg = this.getConfig();
      const candidates = [];
      if (
        typeof window !== "undefined" &&
        window.location &&
        (window.location.protocol === "http:" || window.location.protocol === "https:")
      ) {
        candidates.push(`${window.location.origin}/api/v1`);
      }
      candidates.push("https://stroke-sap-edc-system.onrender.com/api/v1");
      candidates.push("http://127.0.0.1:8000/api/v1");

      for (const candidateUrl of candidates) {
        try {
          const res = await fetch(`${candidateUrl}/health`);
          if (res.ok) {
            const data = await res.json();
            if (data && data.status === "ok") {
              this.saveConfig({ mode: "remote", baseUrl: candidateUrl, token: currentCfg.token || "" });
              return;
            }
          }
        } catch (err) {}
      }
    } catch (e) {
      // 网络离线时静默回退
    }
  },

  // ==================== 记住密码、自动登录与会话管理 ====================
  getRememberedCreds() {
    try {
      const raw = localStorage.getItem(REMEMBER_CREDS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.rememberPassword) {
          return {
            account: parsed.account || "",
            password: parsed.password || "",
            rememberPassword: true,
            autoLogin: Boolean(parsed.autoLogin)
          };
        }
      }
    } catch (e) {}
    return { account: "", password: "", rememberPassword: false, autoLogin: false };
  },

  saveRememberedCreds({ account, password, rememberPassword, autoLogin }) {
    if (rememberPassword || autoLogin) {
      localStorage.setItem(
        REMEMBER_CREDS_KEY,
        JSON.stringify({
          account: account || "",
          password: password || "",
          rememberPassword: true,
          autoLogin: Boolean(autoLogin)
        })
      );
    } else {
      localStorage.removeItem(REMEMBER_CREDS_KEY);
    }
  },

  getSession() {
    try {
      // 优先读取当前标签页会话（避免刷新页面丢失当前填报状态）
      const tabRaw = typeof sessionStorage !== "undefined" ? sessionStorage.getItem(SESSION_KEY) : null;
      if (tabRaw) return JSON.parse(tabRaw);
      // 仅当用户勾选了“下次自动登录”时才从 localStorage 恢复持久会话
      const creds = this.getRememberedCreds();
      if (creds.autoLogin) {
        const raw = localStorage.getItem(SESSION_KEY);
        if (raw) return JSON.parse(raw);
      }
    } catch (e) {}
    return null;
  },

  saveSession(session, autoLogin = false) {
    try {
      if (typeof sessionStorage !== "undefined") {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
      }
    } catch (e) {}
    if (autoLogin) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
    if (session && session.token) {
      const cfg = this.getConfig();
      cfg.token = session.token;
      this.saveConfig(cfg);
    }
  },

  clearSession() {
    try {
      if (typeof sessionStorage !== "undefined") {
        sessionStorage.removeItem(SESSION_KEY);
      }
    } catch (e) {}
    localStorage.removeItem(SESSION_KEY);
    // 用户主动退出登录时，关闭自动登录标记（若勾选了记住密码则保留账号密码）
    const creds = this.getRememberedCreds();
    if (creds.rememberPassword) {
      this.saveRememberedCreds({ ...creds, autoLogin: false });
    }
    const cfg = this.getConfig();
    cfg.token = "";
    this.saveConfig(cfg);
  },

  // 获取系统账号与权限列表（远程模式下从后端数据库拉取，本地模式下从本地权限表读取）
  getLocalUsers() {
    try {
      const raw = localStorage.getItem(USERS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          window.EDC_USERS = parsed;
          return parsed;
        }
      }
    } catch (e) {}
    const initial = (window.EDC_USERS || []).map(u => ({ ...u }));
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(initial));
    return initial;
  },

  saveLocalUsers(users) {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    window.EDC_USERS = users;
  },

  async fetchUsers() {
    const cfg = this.getConfig();
    if (cfg.mode === "remote") {
      try {
        const res = await fetch(`${cfg.baseUrl}/admin/users`, {
          headers: cfg.token ? { Authorization: `Bearer ${cfg.token}` } : {}
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.users) && data.users.length > 0) {
            // 保留本地已知明文密码映射以便离线兜底，但账号列表完全以 Supabase 数据库为准
            const localMap = {};
            (window.EDC_USERS || []).forEach(u => {
              if (u.password) localMap[u.account] = u.password;
            });
            const merged = data.users.map(u => ({
              ...u,
              password: u.password || localMap[u.account] || ""
            }));
            this.saveLocalUsers(merged);
            return merged;
          }
        }
      } catch (e) {
        console.warn("从远程后端拉取用户列表失败，使用本地缓存:", e);
      }
    }
    return this.getLocalUsers();
  },

  // 账号密码登录（优先通过远程 Supabase 后端鉴权）
  async login(account, password, options = {}) {
    const cleanAcc = String(account || "").trim();
    const cleanPwd = String(password || "").trim();
    const rememberPassword = Boolean(options.rememberPassword || options.autoLogin);
    const autoLogin = Boolean(options.autoLogin);

    if (!cleanAcc || !cleanPwd) {
      throw new Error("请输入登录账号和密码");
    }

    const cfg = this.getConfig();
    if (cfg.mode === "remote") {
      try {
        const res = await fetch(`${cfg.baseUrl}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ account: cleanAcc, password: cleanPwd })
        });
        const payload = await res.json().catch(() => ({}));
        if (res.ok && payload.user) {
          const session = {
            token: payload.token,
            user: payload.user,
            loginTime: new Date().toLocaleString("zh-CN"),
            authSource: "remote"
          };
          this.saveRememberedCreds({ account: cleanAcc, password: cleanPwd, rememberPassword, autoLogin });
          this.saveSession(session, autoLogin);
          await this.fetchUsers();
          return session;
        }
        // 若云端尚未完成最新部署但账号已在最新用户列表中匹配，继续走下方校验；若账号确实不存在则直接报错
        const latestUsers = await this.fetchUsers();
        const inLatest = latestUsers.find(u => u.account === cleanAcc);
        if (!inLatest) {
          throw new Error(payload.detail || `账号 "${cleanAcc}" 不存在或已在 Supabase 中修改，请使用最新账号登录`);
        }
        if (inLatest.status === "disabled") {
          throw new Error(payload.detail || `账号 "${cleanAcc}" 已被停用`);
        }
        if (!inLatest.password || inLatest.password !== cleanPwd) {
          throw new Error(payload.detail || "登录密码错误");
        }
      } catch (err) {
        if (err.message && (err.message.includes("账号") || err.message.includes("密码") || err.message.includes("停用"))) {
          throw err;
        }
      }
    }

    // 本地/兜底鉴权（严格基于从后端同步的最新账号列表）
    const users = await this.fetchUsers();
    const found = users.find(u => u.account === cleanAcc);
    if (!found) {
      throw new Error(`账号 "${cleanAcc}" 不存在，请核对 Supabase users 表中的账号名`);
    }
    if (found.status === "disabled") {
      throw new Error(`账号 "${cleanAcc}" 已被后端停用`);
    }
    const expectedPwd = found.password || "123456";
    if (cleanPwd !== expectedPwd) {
      throw new Error("登录密码不正确");
    }
    const safeUser = { ...found };
    delete safeUser.password;
    const session = {
      token: `local_token_${cleanAcc}_${Date.now()}`,
      user: safeUser,
      loginTime: new Date().toLocaleString("zh-CN"),
      authSource: "local"
    };
    this.saveRememberedCreds({ account: cleanAcc, password: cleanPwd, rememberPassword, autoLogin });
    this.saveSession(session, autoLogin);
    return session;
  },

  async logout() {
    const cfg = this.getConfig();
    if (cfg.mode === "remote" && cfg.token) {
      try {
        await fetch(`${cfg.baseUrl}/auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${cfg.token}` }
        });
      } catch (e) {}
    }
    this.clearSession();
  },

  // 后端开通新账号或修改账号权限
  async upsertUserAccount(userObj) {
    const cfg = this.getConfig();
    if (cfg.mode === "remote") {
      const res = await fetch(`${cfg.baseUrl}/admin/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(cfg.token ? { Authorization: `Bearer ${cfg.token}` } : {})
        },
        body: JSON.stringify(userObj)
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload.detail || "后端保存账号权限失败");
      }
      if (Array.isArray(payload.users)) {
        this.saveLocalUsers(payload.users);
        return payload.users;
      }
    }

    const users = this.getLocalUsers().slice();
    const idx = users.findIndex(u => u.account === userObj.account);
    if (idx >= 0) {
      users[idx] = {
        ...users[idx],
        ...userObj,
        password: userObj.password ? userObj.password : users[idx].password || "123456"
      };
    } else {
      users.push({
        account: userObj.account,
        password: userObj.password || "123456",
        name: userObj.name || userObj.account,
        role: userObj.role || "研究医师 (Sub-I)",
        dept: userObj.dept || "卒中中心",
        isPI: Boolean(userObj.isPI),
        canExport: Boolean(userObj.canExport || userObj.isPI),
        canUnlock: Boolean(userObj.canUnlock || userObj.isPI),
        canManageUsers: Boolean(userObj.canManageUsers || userObj.isPI),
        status: userObj.status || "active"
      });
    }
    this.saveLocalUsers(users);
    return users;
  },

  async deleteUserAccount(account) {
    const cfg = this.getConfig();
    if (cfg.mode === "remote") {
      const res = await fetch(`${cfg.baseUrl}/admin/users/${encodeURIComponent(account)}`, {
        method: "DELETE",
        headers: cfg.token ? { Authorization: `Bearer ${cfg.token}` } : {}
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload.detail || "后端删除账号失败");
      }
      if (Array.isArray(payload.users)) {
        this.saveLocalUsers(payload.users);
        return payload.users;
      }
    }
    const users = this.getLocalUsers().filter(u => u.account !== account);
    this.saveLocalUsers(users);
    return users;
  },

  async testBackendHealth(baseUrl) {
    const targetUrl = (baseUrl || this.getConfig().baseUrl).replace(/\/+$/, "");
    const res = await fetch(`${targetUrl}/health`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  },

  // 加载所有受试者数据
  async listSubjects() {
    const cfg = this.getConfig();
    if (cfg.mode === "remote") {
      try {
        const res = await fetch(`${cfg.baseUrl}/subjects`, {
          headers: cfg.token ? { Authorization: `Bearer ${cfg.token}` } : {}
        });
        if (res.ok) {
          const remoteList = await res.json();
          if (Array.isArray(remoteList) && remoteList.length > 0) {
            remoteList.forEach(s => this.reconcileSubjectScales(s));
            localStorage.setItem(STORAGE_KEY, JSON.stringify(remoteList));
            return remoteList;
          }
          // 若远程 Supabase 数据库首次启用尚无受试者，自动初始化示范数据并同步至云端
          const initialRemote = window.createInitialSampleSubjects();
          await this.saveSubjects(initialRemote);
          return initialRemote;
        }
      } catch (e) {
        console.warn("远程后端未连接，自动回退至本地存储模式:", e);
      }
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          parsed.forEach(s => this.reconcileSubjectScales(s));
          return parsed;
        }
      }
    } catch (e) {
      console.error("读取本地受试者数据失败:", e);
    }

    const initial = window.createInitialSampleSubjects();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  },

  // 保存受试者数据
  async saveSubjects(subjects) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(subjects));
    const cfg = this.getConfig();
    if (cfg.mode === "remote") {
      try {
        await fetch(`${cfg.baseUrl}/subjects/sync`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(cfg.token ? { Authorization: `Bearer ${cfg.token}` } : {})
          },
          body: JSON.stringify({ subjects })
        });
      } catch (e) {
        console.warn("远程同步暂未就绪，已安全保存在本地浏览器:", e);
      }
    }
    return true;
  },

  // 重置为初始演示数据
  resetDemoData() {
    const initial = window.createInitialSampleSubjects();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  },

  // 量表细则字符串序列化与解析辅助函数（支持 CSV 与 JSON 导入导出完整保留“展开量表细则算分”中每一项得分）
  serializeScaleDetails(scaleKey, details) {
    if (!details || typeof details !== "object") return "";
    const keys = Object.keys(details);
    if (keys.length === 0) return "";
    if (scaleKey === "GCS") {
      if (details.eye !== undefined || details.verbal !== undefined || details.motor !== undefined) {
        return `eye:${details.eye ?? ""};verbal:${details.verbal ?? ""};motor:${details.motor ?? ""}`;
      }
    }
    if (scaleKey === "EQ5D") {
      if (details.mobility !== undefined) {
        return `${details.mobility || 1}-${details.selfcare || 1}-${details.activity || 1}-${details.pain || 1}-${details.anxiety || 1}`;
      }
    }
    return keys.map(k => `${k}:${details[k]}`).join(";");
  },

  parseScaleDetailsString(scaleKey, rawStr) {
    const str = String(rawStr || "").trim();
    if (!str) return null;
    if (str.startsWith("{")) {
      try {
        return JSON.parse(str);
      } catch (e) {}
    }
    const res = {};
    if (scaleKey === "GCS" && /^\d+-\d+-\d+$/.test(str)) {
      const [e, v, m] = str.split("-").map(Number);
      return { eye: e, verbal: v, motor: m };
    }
    if (scaleKey === "EQ5D" && /^\d-\d-\d-\d-\d/.test(str)) {
      const clean = str.split("/")[0].trim();
      const [m, s, a, p, x] = clean.split("-").map(Number);
      return { mobility: m, selfcare: s, activity: a, pain: p, anxiety: x };
    }
    str.split(/[;；,，]/).forEach(pair => {
      const [k, v] = pair.split(/[:=：]/).map(s => (s || "").trim());
      if (k && v !== undefined && v !== "") {
        const num = Number(v);
        res[k] = isNaN(num) ? v : num;
      }
    });
    return Object.keys(res).length > 0 ? res : null;
  },

  // 自动对齐与同步受试者所有访视下的量表细则 (details) 与总分 (score)
  reconcileSubjectScales(subj) {
    if (!subj) return;
    const visitKeys = ["v1", "v2_1", "v2_2", "v3", "v4", "v5"];
    visitKeys.forEach(vKey => {
      const scales = subj[vKey]?.scales;
      if (!scales) return;
      Object.keys(scales).forEach(sKey => {
        const sc = scales[sKey];
        const def = window.CLINICAL_SCALES?.[sKey];
        if (!sc || !def) return;
        sc.details = sc.details && typeof sc.details === "object" ? sc.details : {};

        // 1. 若为单条目量表 (FOIS / MRS)，当只有总分而 details 为空时，自动回填 details
        if (sKey === "FOIS" && sc.details.level === undefined && sc.score !== "" && sc.score !== undefined) {
          const n = parseInt(sc.score, 10);
          if (!isNaN(n)) sc.details.level = n;
        }
        if (sKey === "MRS" && sc.details.grade === undefined && sc.score !== "" && sc.score !== undefined) {
          const n = parseInt(sc.score, 10);
          if (!isNaN(n)) sc.details.grade = n;
        }
        // 若 EQ5D 只有形如 "3-3-3-2-2 / VAS:45" 的 score 字符串，自动拆解出 5 个维度细则
        if (sKey === "EQ5D" && Object.keys(sc.details).length === 0 && typeof sc.score === "string" && /^\d-\d-\d-\d-\d/.test(sc.score)) {
          const parsedEq = this.parseScaleDetailsString("EQ5D", sc.score);
          if (parsedEq) sc.details = parsedEq;
          const vasMatch = sc.score.match(/VAS\s*[:：]?\s*(\d+)/i);
          if (vasMatch) sc.vas = Number(vasMatch[1]);
        }
        // 若 GCS / NIHSS / SOFA 已有总分但 details 为空（如仅导入了总分或旧历史数据），自动生成与总分完全匹配的默认细则项
        if (Object.keys(sc.details).length === 0 && sc.score !== "" && sc.score !== undefined && sc.score !== null) {
          const targetTotal = parseInt(sc.score, 10);
          if (!isNaN(targetTotal) && targetTotal >= 0) {
            if (sKey === "GCS" && targetTotal >= 3 && targetTotal <= 15) {
              let rem = targetTotal - 3; // E(1..4), V(1..5), M(1..6)
              const mAdd = Math.min(5, rem); rem -= mAdd;
              const vAdd = Math.min(4, rem); rem -= vAdd;
              const eAdd = Math.min(3, rem);
              sc.details = { eye: 1 + eAdd, verbal: 1 + vAdd, motor: 1 + mAdd };
            } else if (sKey === "NIHSS") {
              let rem = targetTotal;
              const nihssOrder = ["5b", "6b", "9", "4", "1a", "1b", "2", "3", "8", "10", "1c", "11", "7", "5a", "6a"];
              const maxMap = { "1a": 3, "1b": 2, "1c": 2, "2": 2, "3": 3, "4": 3, "5a": 4, "5b": 4, "6a": 4, "6b": 4, "7": 2, "8": 2, "9": 3, "10": 2, "11": 2 };
              const dObj = { "1a": 0, "1b": 0, "1c": 0, "2": 0, "3": 0, "4": 0, "5a": 0, "5b": 0, "6a": 0, "6b": 0, "7": 0, "8": 0, "9": 0, "10": 0, "11": 0 };
              nihssOrder.forEach(k => {
                if (rem > 0) {
                  const take = Math.min(maxMap[k], rem);
                  dObj[k] = take;
                  rem -= take;
                }
              });
              sc.details = dObj;
            } else if (sKey === "SOFA") {
              let rem = targetTotal;
              const sofaOrder = ["cns", "resp", "cardio", "coag", "liver", "renal"];
              const dObj = { resp: 0, coag: 0, liver: 0, cardio: 0, cns: 0, renal: 0 };
              sofaOrder.forEach(k => {
                if (rem > 0) {
                  const take = Math.min(4, rem);
                  dObj[k] = take;
                  rem -= take;
                }
              });
              sc.details = dObj;
            }
          }
        }

        // 2. 规范化 details 数值并根据 details 自动重算或补全总分 score
        const detailKeys = Object.keys(sc.details);
        if (detailKeys.length > 0) {
          detailKeys.forEach(k => {
            const num = Number(sc.details[k]);
            if (!isNaN(num) && sc.details[k] !== "") sc.details[k] = num;
          });
          if (sKey === "EQ5D") {
            const m = sc.details.mobility || 1;
            const s = sc.details.selfcare || 1;
            const a = sc.details.activity || 1;
            const p = sc.details.pain || 1;
            const x = sc.details.anxiety || 1;
            const vas = sc.vas ?? 70;
            sc.score = `${m}-${s}-${a}-${p}-${x} / VAS:${vas}`;
          } else if (sc.score === "" || sc.score === undefined || sc.score === null) {
            let sum = 0;
            def.items.forEach(item => {
              const val = parseInt(sc.details[item.id], 10);
              const opt = item.options.find(o => o.score === val);
              if (!isNaN(val) && !(opt && opt.excludeFromSum)) {
                sum += val;
              }
            });
            sc.score = sum;
          }
        }
      });
    });
  },

  // 标准科研 CSV 宽表表头（不含患者编号与首次录入负责人信息，导入时由系统按顺位自动生成编号并匹配当前登录账号）
  CSV_HEADERS: [
    "中心号(SITEID)", "患者姓名(NAME)", "姓名缩写(INITIALS)",
    "入组日期(STARTDTC)", "研究状态(STATUS)", "性别(SEX)", "出生日期(BRTHDTC)", "年龄(AGE)", "身高cm(HEIGHT)", "体重kg(WEIGHT)", "BMI",
    "住院号(HOSPID)", "手机号1(PHONE1)", "入院来源", "发病时间", "静脉溶栓", "血管内治疗", "TOAST分型", "中医证候", "是否符合纳排入组",
    "V1_体温", "V1_呼吸", "V1_脉搏", "V1_收缩压", "V1_舒张压",
    "V1_WBC", "V1_NEUT", "V1_LYMPH", "V1_NLR", "V1_CRP", "V1_PCT", "V1_IL6", "V1_IL10", "V1_TNFa",
    "V1_GCS", "V1_GCS_细则(E-V-M)", "V1_NIHSS", "V1_NIHSS_15项细则", "V1_SOFA", "V1_SOFA_6项细则", "V1_FOIS", "V1_EQ5D_5维细则", "V1_EQ5D_VAS",
    "V2_1_D3_GCS", "V2_1_D3_GCS_细则", "V2_1_D3_NIHSS", "V2_1_D3_NIHSS_15项细则", "V2_1_D3_SOFA", "V2_1_D3_SOFA_6项细则", "V2_1_D3_FOIS",
    "V2_2_D7_GCS", "V2_2_D7_GCS_细则", "V2_2_D7_NIHSS", "V2_2_D7_NIHSS_15项细则", "V2_2_D7_SOFA", "V2_2_D7_SOFA_6项细则", "V2_2_D7_FOIS",
    "是否确诊SAP(肺部感染)", "SAP确诊日期", "V2_3_PSI总分", "V2_3_PSI分级", "V2_3_痰培养结果",
    "V3_出院结局", "V3_出院mRS", "V3_出院NIHSS", "V3_出院NIHSS_15项细则",
    "V4_D30生存", "V4_D30_mRS", "V4_D30_FOIS", "V4_D30再入院",
    "V5_D90生存", "V5_D90_mRS", "V5_D90_FOIS", "V5_D90再入院",
    "是否退出试验", "PI审核签名"
  ],

  subjectToCSVRow(s) {
    return [
      s.centerId || "01",
      s.name || "",
      s.initials || "",
      s.startDate || "",
      s.status || "进行中",
      s.v1?.demographics?.gender || "",
      s.v1?.demographics?.birthDate || "",
      s.v1?.demographics?.age || "",
      s.v1?.demographics?.height || "",
      s.v1?.demographics?.weight || "",
      s.v1?.demographics?.bmi || "",
      s.v1?.demographics?.hospitalId || "",
      s.v1?.demographics?.phone1 || "",
      s.v1?.demographics?.admissionSource || "",
      s.v1?.history?.onsetTime || "",
      s.v1?.history?.ivThrombolysis || "",
      s.v1?.history?.evt || "",
      s.v1?.diagnosis?.toast || "",
      (s.v1?.diagnosis?.tcmSyndrome || []).join(";"),
      s.v1?.eligibility?.enrolled || "",
      s.v1?.vitals?.temp || "",
      s.v1?.vitals?.resp || "",
      s.v1?.vitals?.pulse || "",
      s.v1?.vitals?.sbp || "",
      s.v1?.vitals?.dbp || "",
      s.v1?.labs?.wbc?.val || "",
      s.v1?.labs?.neut?.val || "",
      s.v1?.labs?.lymph?.val || "",
      s.v1?.labs?.nlr?.val || "",
      s.v1?.labs?.crp?.val || "",
      s.v1?.labs?.pct?.val || "",
      s.v1?.labs?.il6?.val || "",
      s.v1?.labs?.il10?.val || "",
      s.v1?.labs?.tnf_alpha?.val || "",
      s.v1?.scales?.GCS?.score ?? "",
      this.serializeScaleDetails("GCS", s.v1?.scales?.GCS?.details),
      s.v1?.scales?.NIHSS?.score ?? "",
      this.serializeScaleDetails("NIHSS", s.v1?.scales?.NIHSS?.details),
      s.v1?.scales?.SOFA?.score ?? "",
      this.serializeScaleDetails("SOFA", s.v1?.scales?.SOFA?.details),
      s.v1?.scales?.FOIS?.score ?? "",
      this.serializeScaleDetails("EQ5D", s.v1?.scales?.EQ5D?.details),
      s.v1?.scales?.EQ5D?.vas ?? "",
      s.v2_1?.scales?.GCS?.score ?? "",
      this.serializeScaleDetails("GCS", s.v2_1?.scales?.GCS?.details),
      s.v2_1?.scales?.NIHSS?.score ?? "",
      this.serializeScaleDetails("NIHSS", s.v2_1?.scales?.NIHSS?.details),
      s.v2_1?.scales?.SOFA?.score ?? "",
      this.serializeScaleDetails("SOFA", s.v2_1?.scales?.SOFA?.details),
      s.v2_1?.scales?.FOIS?.score ?? "",
      s.v2_2?.scales?.GCS?.score ?? "",
      this.serializeScaleDetails("GCS", s.v2_2?.scales?.GCS?.details),
      s.v2_2?.scales?.NIHSS?.score ?? "",
      this.serializeScaleDetails("NIHSS", s.v2_2?.scales?.NIHSS?.details),
      s.v2_2?.scales?.SOFA?.score ?? "",
      this.serializeScaleDetails("SOFA", s.v2_2?.scales?.SOFA?.details),
      s.v2_2?.scales?.FOIS?.score ?? "",
      s.sapConfirmed ? "1(确诊)" : "0(未感染)",
      s.v2_3?.confirmDate || "",
      s.v2_3?.psi?.totalScore ?? "",
      s.v2_3?.psi?.riskClass || "",
      s.v2_3?.pathogens?.sputumCulture?.result || "",
      s.v3?.outcome?.status || "",
      s.v3?.scales?.MRS?.score ?? "",
      s.v3?.scales?.NIHSS?.score ?? "",
      this.serializeScaleDetails("NIHSS", s.v3?.scales?.NIHSS?.details),
      s.v4?.survival?.alive || "",
      s.v4?.scales?.MRS?.score ?? "",
      s.v4?.scales?.FOIS?.score ?? "",
      s.v4?.hasReadmission || "",
      s.v5?.survival?.alive || "",
      s.v5?.scales?.MRS?.score ?? "",
      s.v5?.scales?.FOIS?.score ?? "",
      s.v5?.hasReadmission || "",
      s.summary?.withdrawn || "否",
      s.summary?.piSignature || ""
    ];
  },

  exportToCSV(subjects) {
    const headers = this.CSV_HEADERS;
    const rows = subjects.map(s => this.subjectToCSVRow(s));

    const escapeCsv = val => {
      const str = String(val ?? "").replace(/"/g, '""');
      return `"${str}"`;
    };

    const csvContent = "\uFEFF" + [
      headers.map(escapeCsv).join(","),
      ...rows.map(r => r.map(escapeCsv).join(","))
    ].join("\r\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `重症卒中CRF临床科研数据集_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  },

  // 导出完整 JSON 备份包
  exportToJSON(subjects) {
    const payload = {
      project: "重症卒中相关性肺炎多组学预测标志物筛选及针刺多靶点调控机制研究",
      version: "1.0",
      exportedAt: new Date().toISOString(),
      subjectCount: subjects.length,
      subjects
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `重症卒中eCRF全量数据包_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  // 下载供 AI 整理或本地填报的 JSON 标准模版（不含患者编号与负责人信息，导入时自动生成与匹配）
  downloadJSONTemplate(currentUser) {
    const u = currentUser || { account: "dr_gaowentao", name: "高文涛", role: "24专硕研究生" };
    const sample = window.createEmptySubject("", window.getTodayDateStr(), u);
    delete sample.id;
    delete sample.ownerAccount;
    delete sample.ownerName;
    delete sample.investigator;
    delete sample.auditLogs;

    sample.name = "陈志远";
    sample.initials = "CZY";
    sample.v1.demographics.hospitalId = "ZY20261102005";
    sample.v1.demographics.gender = "男";
    sample.v1.demographics.birthDate = "1959-08-20";
    sample.v1.demographics.age = 67;
    sample.v1.demographics.phone1 = "13800001111";
    sample.v1.labs = {
      wbc: { val: "10.5", eval: "2", note: "轻度升高" },
      neut: { val: "8.1", eval: "2", note: "" },
      lymph: { val: "1.35", eval: "0", note: "" },
      nlr: { val: "6.00", eval: "2", note: "自动计算" },
      crp: { val: "18.2", eval: "2", note: "" },
      pct: { val: "0.08", eval: "1", note: "" }
    };
    // 完整填充 V2-1、V2-2、V3、V4、V5 的量表细则结构示范，确保 AI 可直接按此结构输出逐项细则
    sample.v2_1.scales = {
      GCS: { score: 13, signer: "", isAcupuncturist: "否", details: { eye: 3, verbal: 4, motor: 6 } },
      NIHSS: {
        score: 14,
        signer: "",
        isAcupuncturist: "否",
        details: { "1a": 1, "1b": 1, "1c": 0, "2": 1, "3": 1, "4": 1, "5a": 0, "5b": 3, "6a": 0, "6b": 2, "7": 0, "8": 1, "9": 2, "10": 1, "11": 0 }
      },
      FOIS: { score: 3, signer: "", isAcupuncturist: "否", details: { level: 3 } },
      SOFA: {
        score: 2,
        signer: "",
        isAcupuncturist: "否",
        details: { resp: 1, coag: 0, liver: 0, cardio: 0, cns: 1, renal: 0 },
        measured: { resp: "330", coag: "190", liver: "15.0", cardio: "84", cns: "13", renal: "85" }
      },
      EQ5D: { score: "3-3-3-2-1 / VAS:55", vas: 55, details: { mobility: 3, selfcare: 3, activity: 3, pain: 2, anxiety: 1 } }
    };
    sample.v2_2.scales = {
      GCS: { score: 14, signer: "", isAcupuncturist: "否", details: { eye: 4, verbal: 4, motor: 6 } },
      NIHSS: {
        score: 11,
        signer: "",
        isAcupuncturist: "否",
        details: { "1a": 0, "1b": 1, "1c": 0, "2": 0, "3": 1, "4": 1, "5a": 0, "5b": 2, "6a": 0, "6b": 2, "7": 0, "8": 1, "9": 2, "10": 1, "11": 0 }
      },
      FOIS: { score: 4, signer: "", isAcupuncturist: "否", details: { level: 4 } },
      SOFA: {
        score: 1,
        signer: "",
        isAcupuncturist: "否",
        details: { resp: 0, coag: 0, liver: 0, cardio: 0, cns: 1, renal: 0 },
        measured: { resp: "405", coag: "205", liver: "14.2", cardio: "82", cns: "14", renal: "82" }
      },
      EQ5D: { score: "2-3-2-2-1 / VAS:65", vas: 65, details: { mobility: 2, selfcare: 3, activity: 2, pain: 2, anxiety: 1 } }
    };
    sample.v3.scales = {
      GCS: { score: 15, signer: "", isAcupuncturist: "否", details: { eye: 4, verbal: 5, motor: 6 } },
      NIHSS: {
        score: 8,
        signer: "",
        isAcupuncturist: "否",
        details: { "1a": 0, "1b": 0, "1c": 0, "2": 0, "3": 0, "4": 1, "5a": 0, "5b": 2, "6a": 0, "6b": 2, "7": 0, "8": 1, "9": 1, "10": 1, "11": 0 }
      },
      FOIS: { score: 5, signer: "", isAcupuncturist: "否", details: { level: 5 } },
      EQ5D: { score: "2-2-2-2-1 / VAS:72", vas: 72, details: { mobility: 2, selfcare: 2, activity: 2, pain: 2, anxiety: 1 } },
      MRS: { score: 3, signer: "", isAcupuncturist: "否", details: { grade: 3 } }
    };
    sample.v4.scales = {
      FOIS: { score: 6, signer: "", isAcupuncturist: "否", details: { level: 6 } },
      EQ5D: { score: "2-2-2-1-1 / VAS:78", vas: 78, details: { mobility: 2, selfcare: 2, activity: 2, pain: 1, anxiety: 1 } },
      MRS: { score: 3, signer: "", isAcupuncturist: "否", details: { grade: 3 } }
    };
    sample.v5.scales = {
      FOIS: { score: 7, signer: "", isAcupuncturist: "否", details: { level: 7 } },
      EQ5D: { score: "1-2-2-1-1 / VAS:85", vas: 85, details: { mobility: 1, selfcare: 2, activity: 2, pain: 1, anxiety: 1 } },
      MRS: { score: 2, signer: "", isAcupuncturist: "否", details: { grade: 2 } }
    };

    const templateObj = {
      _instructions: "【AI与本地数据整理标准JSON模版】可将单例或多例受试者对象放入 subjects 数组中。无需填写患者编号与首次录入负责人信息（导入时系统将按当前患者顺位自动生成三位数字编号，并自动绑定当前登录账号与姓名）。量表不仅导入总分(score)，还会将 scales.<量表名>.details 中的逐项评分细则直接回填至“展开量表细则算分”弹窗中。缺失值请填 NA / ND / UNK。",
      _scaleDetailsReference: {
        GCS: "details: { eye: 1~4, verbal: 1~5, motor: 1~6 }",
        NIHSS: "details: { '1a':0~3, '1b':0~2, '1c':0~2, '2':0~2, '3':0~3, '4':0~3, '5a':0~4或9, '5b':0~4或9, '6a':0~4或9, '6b':0~4或9, '7':0~2或9, '8':0~2, '9':0~3, '10':0~2或9, '11':0~2 }",
        SOFA: "details: { resp:0~4, coag:0~4, liver:0~4, cardio:0~4, cns:0~4, renal:0~4 }, measured: { resp:'氧合指数', coag:'PLT', liver:'TBIL', cardio:'MAP', cns:'GCS', renal:'Cr' }",
        FOIS: "details: { level: 1~7 }",
        EQ5D: "details: { mobility:1~3, selfcare:1~3, activity:1~3, pain:1~3, anxiety:1~3 }, vas: 0~100",
        MRS: "details: { grade: 0~6 }"
      },
      project: "重症卒中相关性肺炎多组学预测标志物筛选及针刺多靶点调控机制研究",
      subjects: [sample]
    };

    const blob = new Blob([JSON.stringify(templateObj, null, 2)], { type: "application/json;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "重症卒中CRF_AI数据整理导入标准模版.json";
    a.click();
    URL.revokeObjectURL(url);
  },

  // 下载供 AI 整理或 Excel 本地填报的 CSV 标准宽表模版
  downloadCSVTemplate(currentUser) {
    const u = currentUser || { account: "dr_gaowentao", name: "高文涛", role: "24专硕研究生" };
    const sample = window.createEmptySubject("", window.getTodayDateStr(), u);
    sample.name = "陈志远";
    sample.initials = "CZY";
    sample.v1.demographics.hospitalId = "ZY20261102005";
    sample.v1.demographics.phone1 = "13800001111";
    sample.v1.labs = {
      wbc: { val: "10.5", eval: "2", note: "" },
      neut: { val: "8.1", eval: "2", note: "" },
      lymph: { val: "1.35", eval: "0", note: "" },
      nlr: { val: "6.00", eval: "2", note: "" },
      crp: { val: "18.2", eval: "2", note: "" },
      pct: { val: "0.08", eval: "1", note: "" }
    };

    const escapeCsv = val => `"${String(val ?? "").replace(/"/g, '""')}"`;
    const csvContent = "\uFEFF" + [
      this.CSV_HEADERS.map(escapeCsv).join(","),
      this.subjectToCSVRow(sample).map(escapeCsv).join(",")
    ].join("\r\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "重症卒中CRF_AI宽表数据导入模版.csv";
    a.click();
    URL.revokeObjectURL(url);
  },

  // 生成供数据录入员复制到 AI（DeepSeek/ChatGPT/Kimi/Claude）的病历结构化提取提示词
  getAIPromptText() {
    return `你是一名严谨的神经重症临床科研数据提取助手。请根据我提供的患者病历/出院小结/检验报告/量表评估记录，结合我上传的《重症卒中CRF_AI数据整理导入标准模版.json》（或CSV模版），将患者信息提取为完全符合该模版字段结构的 JSON 数据（直接输出纯 JSON 代码块，包含顶层 "subjects": [ ... ]）。
提取规则：
1. 姓名缩写(initials)按规则生成三位大写字母（三字填首字母；两字加填第二字第二字母；四字填前三字首字母）。无需填写患者编号或录入负责人信息，系统导入时会自动按顺位生成编号并匹配当前登录账号。
2. 实验室检查项（如 v1.labs.wbc、neut、lymph、crp、pct、plt、ddimer、inr、aptt、fib、alb、palb、hb、glu、scr、tbil、pao2_fio2、il2、il4、il6、ifn_gamma、il10、tnf_alpha）格式均为 {"val": "数值", "eval": "0或1或2或9", "note": "备注"}，其中 eval: "0"=正常, "1"=异常但无临床意义, "2"=异常且有临床意义, "9"=未查(ND)。
3. 【重要：临床量表不仅要填总分 score，还必须尽可能根据病历查体记录提取填充 details 逐项评分细则，以便系统“展开量表细则算分”直接展示每一项】：
   - GCS.details: {"eye": 1~4, "verbal": 1~5, "motor": 1~6}
   - NIHSS.details (15项): {"1a":0~3, "1b":0~2, "1c":0~2, "2":0~2, "3":0~3, "4":0~3, "5a":0~4, "5b":0~4, "6a":0~4, "6b":0~4, "7":0~2, "8":0~2, "9":0~3, "10":0~2, "11":0~2}
   - SOFA.details (6项): {"resp":0~4, "coag":0~4, "liver":0~4, "cardio":0~4, "cns":0~4, "renal":0~4} 及 measured 实测值 {"resp":"氧合指数", "coag":"PLT", "liver":"TBIL", "cardio":"MAP", "cns":"GCS", "renal":"Cr"}
   - FOIS.details: {"level": 1~7}
   - EQ5D.details: {"mobility":1~3, "selfcare":1~3, "activity":1~3, "pain":1~3, "anxiety":1~3} 以及 vas (0~100)
   - MRS.details: {"grade": 0~6}
4. 若某项选择“其他”，请将具体说明填入对应的 _other 字段（如 ethnicityOther、occupationOther、toastOther、tcmSyndromeOther 等）。未查项目填 "ND"，不适用填 "NA"，不详填 "UNK"。`;
  },

  // 深度合并工具（保证导入的残缺 JSON 仍拥有完整的默认属性树）
  deepMergeSubject(target, source) {
    if (!source || typeof source !== "object") return target;
    Object.keys(source).forEach(key => {
      const sVal = source[key];
      const tVal = target[key];
      if (Array.isArray(sVal)) {
        target[key] = [...sVal];
      } else if (sVal && typeof sVal === "object" && tVal && typeof tVal === "object" && !Array.isArray(tVal)) {
        this.deepMergeSubject(tVal, sVal);
      } else if (sVal !== undefined) {
        target[key] = sVal;
      }
    });
    return target;
  },

  // 解析 CSV 文本行（支持引号转义）
  parseCSVLines(csvText) {
    const clean = csvText.replace(/^\uFEFF/, "").trim();
    const rows = [];
    let curRow = [];
    let curVal = "";
    let inQuotes = false;

    for (let i = 0; i < clean.length; i++) {
      const ch = clean[i];
      const next = clean[i + 1];
      if (inQuotes) {
        if (ch === '"' && next === '"') {
          curVal += '"';
          i++;
        } else if (ch === '"') {
          inQuotes = false;
        } else {
          curVal += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === ",") {
          curRow.push(curVal.trim());
          curVal = "";
        } else if (ch === "\n" || (ch === "\r" && next === "\n")) {
          if (ch === "\r") i++;
          curRow.push(curVal.trim());
          if (curRow.some(c => c !== "")) rows.push(curRow);
          curRow = [];
          curVal = "";
        } else {
          curVal += ch;
        }
      }
    }
    if (curVal !== "" || curRow.length > 0) {
      curRow.push(curVal.trim());
      if (curRow.some(c => c !== "")) rows.push(curRow);
    }
    return rows;
  },

  // 将导入的 JSON 或 CSV 内容解析并合并至现有受试者队列（自动按当前队列顺位生成 3 位患者编号，并自动绑定当前登录账号与姓名）
  importDataText(rawText, formatHint, existingSubjects, currentUser) {
    const u = currentUser || { account: "dr_gaowentao", name: "高文涛", role: "24专硕研究生" };
    const trimmed = (rawText || "").trim();
    if (!trimmed) throw new Error("导入内容为空，请选择文件或粘贴数据内容");

    const maxExistingNum = (existingSubjects || []).reduce((max, s) => {
      const n = parseInt(s.id, 10);
      return !isNaN(n) && n > max ? n : max;
    }, (existingSubjects || []).length);

    const isJson = formatHint === "json" || trimmed.startsWith("{") || trimmed.startsWith("[");
    const importedList = [];

    if (isJson) {
      // 允许用户直接粘贴带 ```json 代码块的 AI 回复
      const cleanedJson = trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
      const parsed = JSON.parse(cleanedJson);
      const rawArr = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed.subjects)
        ? parsed.subjects
        : [parsed];

      rawArr.forEach((item, idx) => {
        if (!item || typeof item !== "object") return;
        const autoId = String(maxExistingNum + idx + 1).padStart(3, "0");
        const id = item.id && String(item.id).trim() ? String(item.id).trim().padStart(3, "0") : autoId;
        const startDate = item.startDate || item.v1?.eligibility?.enrollDate || window.getTodayDateStr();
        const base = window.createEmptySubject(id, startDate, u);
        this.deepMergeSubject(base, item);
        base.id = id;
        // 强制根据当前系统登录的账号自动匹配首次录入负责人账号与姓名
        base.ownerAccount = u.account;
        base.ownerName = u.name;
        base.investigator = u.name;
        this.reconcileSubjectScales(base);
        base.auditLogs = base.auditLogs || [];
        base.auditLogs.unshift({
          time: new Date().toLocaleString("zh-CN"),
          user: `${u.name} (${u.account})`,
          action: "通过 JSON 一键导入/更新病例数据（含详细量表细则）",
          field: `患者编号: ${id} | 自动绑定当前登录负责人: ${base.ownerName} (${base.ownerAccount})`
        });
        importedList.push(base);
      });
    } else {
      // 解析 CSV 格式
      const rows = this.parseCSVLines(trimmed);
      if (rows.length < 2) throw new Error("CSV 文件至少需要包含表头行和 1 行数据");
      const headers = rows[0];
      const colIdx = namePart => headers.findIndex(h => h.includes(namePart));

      for (let r = 1; r < rows.length; r++) {
        const row = rows[r];
        const getCol = key => {
          const idx = colIdx(key);
          return idx >= 0 && row[idx] !== undefined ? row[idx] : "";
        };
        const autoId = String(maxExistingNum + r).padStart(3, "0");
        const explicitId = getCol("SUBJID") || getCol("患者编号");
        const id = explicitId ? String(explicitId).trim().padStart(3, "0") : autoId;
        const startDate = getCol("STARTDTC") || getCol("入组日期") || window.getTodayDateStr();
        const s = window.createEmptySubject(id, startDate, u);

        s.centerId = getCol("SITEID") || getCol("中心号") || "01";
        s.name = getCol("患者姓名") || getCol("NAME") || s.name;
        s.initials = (getCol("INITIALS") || getCol("姓名缩写") || "XXX").toUpperCase();
        // 自动匹配当前登录账号与姓名
        s.ownerAccount = u.account;
        s.ownerName = u.name;
        s.investigator = u.name;
        s.status = getCol("STATUS") || getCol("研究状态") || "进行中";

        if (getCol("SEX") || getCol("性别")) s.v1.demographics.gender = getCol("SEX") || getCol("性别");
        if (getCol("BRTHDTC") || getCol("出生日期")) s.v1.demographics.birthDate = getCol("BRTHDTC") || getCol("出生日期");
        if (getCol("AGE") || getCol("年龄")) s.v1.demographics.age = Number(getCol("AGE") || getCol("年龄")) || 65;
        if (getCol("HEIGHT") || getCol("身高")) s.v1.demographics.height = Number(getCol("HEIGHT") || getCol("身高")) || 170;
        if (getCol("WEIGHT") || getCol("体重")) s.v1.demographics.weight = Number(getCol("WEIGHT") || getCol("体重")) || 68;
        if (getCol("BMI")) s.v1.demographics.bmi = getCol("BMI");
        if (getCol("HOSPID") || getCol("住院号")) s.v1.demographics.hospitalId = getCol("HOSPID") || getCol("住院号");
        if (getCol("PHONE1") || getCol("手机号1")) s.v1.demographics.phone1 = getCol("PHONE1") || getCol("手机号1");
        if (getCol("入院来源")) s.v1.demographics.admissionSource = getCol("入院来源");
        if (getCol("发病时间")) s.v1.history.onsetTime = getCol("发病时间");
        if (getCol("静脉溶栓")) s.v1.history.ivThrombolysis = getCol("静脉溶栓");
        if (getCol("血管内治疗")) s.v1.history.evt = getCol("血管内治疗");
        if (getCol("TOAST分型")) s.v1.diagnosis.toast = getCol("TOAST分型");
        if (getCol("中医证候")) s.v1.diagnosis.tcmSyndrome = getCol("中医证候").split(/[;；,，]/).map(x => x.trim()).filter(Boolean);
        if (getCol("是否符合纳排入组")) s.v1.eligibility.enrolled = getCol("是否符合纳排入组");

        if (getCol("V1_体温")) s.v1.vitals.temp = getCol("V1_体温");
        if (getCol("V1_呼吸")) s.v1.vitals.resp = getCol("V1_呼吸");
        if (getCol("V1_脉搏")) s.v1.vitals.pulse = getCol("V1_脉搏");
        if (getCol("V1_收缩压")) s.v1.vitals.sbp = getCol("V1_收缩压");
        if (getCol("V1_舒张压")) s.v1.vitals.dbp = getCol("V1_舒张压");

        const mapLab = (csvKey, labId) => {
          const val = getCol(csvKey);
          if (val !== "") s.v1.labs[labId] = { val, eval: "0", note: "" };
        };
        mapLab("V1_WBC", "wbc");
        mapLab("V1_NEUT", "neut");
        mapLab("V1_LYMPH", "lymph");
        mapLab("V1_NLR", "nlr");
        mapLab("V1_CRP", "crp");
        mapLab("V1_PCT", "pct");
        mapLab("V1_IL6", "il6");
        mapLab("V1_IL10", "il10");
        mapLab("V1_TNFa", "tnf_alpha");

        if (getCol("V1_GCS") !== "") s.v1.scales.GCS.score = getCol("V1_GCS");
        if (getCol("V1_GCS_细则")) {
          const d = this.parseScaleDetailsString("GCS", getCol("V1_GCS_细则"));
          if (d) s.v1.scales.GCS.details = d;
        }
        if (getCol("V1_NIHSS") !== "") s.v1.scales.NIHSS.score = getCol("V1_NIHSS");
        if (getCol("V1_NIHSS_15项细则")) {
          const d = this.parseScaleDetailsString("NIHSS", getCol("V1_NIHSS_15项细则"));
          if (d) s.v1.scales.NIHSS.details = d;
        }
        if (getCol("V1_SOFA") !== "") s.v1.scales.SOFA.score = getCol("V1_SOFA");
        if (getCol("V1_SOFA_6项细则")) {
          const d = this.parseScaleDetailsString("SOFA", getCol("V1_SOFA_6项细则"));
          if (d) s.v1.scales.SOFA.details = d;
        }
        if (getCol("V1_FOIS") !== "") s.v1.scales.FOIS.score = getCol("V1_FOIS");
        if (getCol("V1_EQ5D_5维细则")) {
          const d = this.parseScaleDetailsString("EQ5D", getCol("V1_EQ5D_5维细则"));
          if (d) s.v1.scales.EQ5D.details = d;
        }
        if (getCol("V1_EQ5D_VAS") !== "") s.v1.scales.EQ5D.vas = getCol("V1_EQ5D_VAS");

        if (getCol("V2_1_D3_GCS") !== "") s.v2_1.scales.GCS.score = getCol("V2_1_D3_GCS");
        if (getCol("V2_1_D3_GCS_细则")) {
          const d = this.parseScaleDetailsString("GCS", getCol("V2_1_D3_GCS_细则"));
          if (d) s.v2_1.scales.GCS.details = d;
        }
        if (getCol("V2_1_D3_NIHSS") !== "") s.v2_1.scales.NIHSS.score = getCol("V2_1_D3_NIHSS");
        if (getCol("V2_1_D3_NIHSS_15项细则")) {
          const d = this.parseScaleDetailsString("NIHSS", getCol("V2_1_D3_NIHSS_15项细则"));
          if (d) s.v2_1.scales.NIHSS.details = d;
        }
        if (getCol("V2_1_D3_SOFA") !== "") s.v2_1.scales.SOFA.score = getCol("V2_1_D3_SOFA");
        if (getCol("V2_1_D3_SOFA_6项细则")) {
          const d = this.parseScaleDetailsString("SOFA", getCol("V2_1_D3_SOFA_6项细则"));
          if (d) s.v2_1.scales.SOFA.details = d;
        }
        if (getCol("V2_1_D3_FOIS") !== "") s.v2_1.scales.FOIS.score = getCol("V2_1_D3_FOIS");

        if (getCol("V2_2_D7_GCS") !== "") s.v2_2.scales.GCS.score = getCol("V2_2_D7_GCS");
        if (getCol("V2_2_D7_GCS_细则")) {
          const d = this.parseScaleDetailsString("GCS", getCol("V2_2_D7_GCS_细则"));
          if (d) s.v2_2.scales.GCS.details = d;
        }
        if (getCol("V2_2_D7_NIHSS") !== "") s.v2_2.scales.NIHSS.score = getCol("V2_2_D7_NIHSS");
        if (getCol("V2_2_D7_NIHSS_15项细则")) {
          const d = this.parseScaleDetailsString("NIHSS", getCol("V2_2_D7_NIHSS_15项细则"));
          if (d) s.v2_2.scales.NIHSS.details = d;
        }
        if (getCol("V2_2_D7_SOFA") !== "") s.v2_2.scales.SOFA.score = getCol("V2_2_D7_SOFA");
        if (getCol("V2_2_D7_SOFA_6项细则")) {
          const d = this.parseScaleDetailsString("SOFA", getCol("V2_2_D7_SOFA_6项细则"));
          if (d) s.v2_2.scales.SOFA.details = d;
        }
        if (getCol("V2_2_D7_FOIS") !== "") s.v2_2.scales.FOIS.score = getCol("V2_2_D7_FOIS");

        const sapVal = getCol("是否确诊SAP");
        if (sapVal.includes("1") || sapVal.includes("确诊") || sapVal === "是") {
          s.sapConfirmed = true;
          s.v2_3.sapConclusion = "确诊";
        }
        if (getCol("SAP确诊日期")) s.v2_3.confirmDate = getCol("SAP确诊日期");
        if (getCol("V2_3_PSI总分")) s.v2_3.psi.totalScore = Number(getCol("V2_3_PSI总分")) || 0;
        if (getCol("V2_3_PSI分级")) s.v2_3.psi.riskClass = getCol("V2_3_PSI分级");
        if (getCol("V2_3_痰培养结果")) {
          s.v2_3.pathogens.sputumCulture = { done: "是", result: getCol("V2_3_痰培养结果") };
        }
        if (getCol("V3_出院结局")) s.v3.outcome.status = getCol("V3_出院结局");
        if (getCol("V3_出院mRS") !== "") s.v3.scales.MRS.score = getCol("V3_出院mRS");
        if (getCol("V3_出院NIHSS") !== "") s.v3.scales.NIHSS.score = getCol("V3_出院NIHSS");
        if (getCol("V3_出院NIHSS_15项细则")) {
          const d = this.parseScaleDetailsString("NIHSS", getCol("V3_出院NIHSS_15项细则"));
          if (d) s.v3.scales.NIHSS.details = d;
        }

        if (getCol("V4_D30生存")) s.v4.survival.alive = getCol("V4_D30生存");
        if (getCol("V4_D30_mRS") !== "") s.v4.scales.MRS.score = getCol("V4_D30_mRS");
        if (getCol("V4_D30_FOIS") !== "") s.v4.scales.FOIS.score = getCol("V4_D30_FOIS");
        if (getCol("V4_D30再入院")) s.v4.hasReadmission = getCol("V4_D30再入院");

        if (getCol("V5_D90生存")) s.v5.survival.alive = getCol("V5_D90生存");
        if (getCol("V5_D90_mRS") !== "") s.v5.scales.MRS.score = getCol("V5_D90_mRS");
        if (getCol("V5_D90_FOIS") !== "") s.v5.scales.FOIS.score = getCol("V5_D90_FOIS");
        if (getCol("V5_D90再入院")) s.v5.hasReadmission = getCol("V5_D90再入院");

        if (getCol("是否退出试验")) s.summary.withdrawn = getCol("是否退出试验");
        if (getCol("PI审核签名")) s.summary.piSignature = getCol("PI审核签名");

        this.reconcileSubjectScales(s);

        s.auditLogs.unshift({
          time: new Date().toLocaleString("zh-CN"),
          user: `${u.name} (${u.account})`,
          action: "通过 CSV 宽表一键导入病例数据（含详细量表细则）",
          field: `患者编号: ${id} | 绑定负责人: ${s.ownerName} (${s.ownerAccount})`
        });
        importedList.push(s);
      }
    }

    if (importedList.length === 0) {
      throw new Error("未识别到有效的受试者记录，请检查文件格式");
    }

    let addedCount = 0;
    let updatedCount = 0;
    importedList.forEach(imp => {
      const existIdx = existingSubjects.findIndex(s => s.id === imp.id);
      if (existIdx >= 0) {
        existingSubjects[existIdx] = imp;
        updatedCount++;
      } else {
        existingSubjects.push(imp);
        addedCount++;
      }
    });

    this.saveSubjects(existingSubjects);
    return {
      total: importedList.length,
      addedCount,
      updatedCount,
      firstId: importedList[0].id
    };
  }
};
