// 前后端分离数据接口适配器 (Storage, JWT Auth, Backend Permission & REST API Adapter)

const STORAGE_KEY = "STROKE_SAP_EDC_SUBJECTS_V4";
const API_CONFIG_KEY = "STROKE_SAP_EDC_API_CONFIG";
const SESSION_KEY = "STROKE_SAP_EDC_AUTH_SESSION_V1";
const USERS_STORAGE_KEY = "STROKE_SAP_EDC_USERS_V1";

window.EDC_API = {
  getConfig() {
    try {
      const saved = localStorage.getItem(API_CONFIG_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    const isHttpOrigin =
      typeof window !== "undefined" &&
      window.location &&
      (window.location.protocol === "http:" || window.location.protocol === "https:");
    return {
      mode: "local", // 'local' | 'remote'
      baseUrl: isHttpOrigin ? `${window.location.origin}/api/v1` : "http://127.0.0.1:8000/api/v1",
      token: ""
    };
  },

  saveConfig(cfg) {
    localStorage.setItem(API_CONFIG_KEY, JSON.stringify(cfg));
  },

  // 若部署在 Render 等同源后端环境或本地启动了 8000 端口后端，启动时自动探测 /api/v1/health 并切换为 remote 模式
  async autoDetectBackendIfNeeded() {
    try {
      const saved = localStorage.getItem(API_CONFIG_KEY);
      if (saved) return; // 用户已手动保存过配置则尊重用户选择
      const candidates = [];
      if (
        typeof window !== "undefined" &&
        window.location &&
        (window.location.protocol === "http:" || window.location.protocol === "https:")
      ) {
        candidates.push(`${window.location.origin}/api/v1`);
      }
      candidates.push("http://127.0.0.1:8000/api/v1");

      for (const candidateUrl of candidates) {
        try {
          const res = await fetch(`${candidateUrl}/health`);
          if (res.ok) {
            const data = await res.json();
            if (data && data.status === "ok") {
              this.saveConfig({ mode: "remote", baseUrl: candidateUrl, token: "" });
              return;
            }
          }
        } catch (err) {}
      }
    } catch (e) {
      // 本地静态打开且后端未启动，静默保持 local 模式
    }
  },

  // ==================== 账号登录、退出与会话管理 ====================
  getSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return null;
  },

  saveSession(session) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    if (session && session.token) {
      const cfg = this.getConfig();
      cfg.token = session.token;
      this.saveConfig(cfg);
    }
  },

  clearSession() {
    localStorage.removeItem(SESSION_KEY);
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
          if (Array.isArray(data.users)) {
            this.saveLocalUsers(data.users);
            return data.users;
          }
        }
      } catch (e) {
        console.warn("从远程后端拉取用户列表失败，使用本地缓存:", e);
      }
    }
    return this.getLocalUsers();
  },

  // 账号密码登录（支持远程后端 JWT 鉴权与本地演示鉴权）
  async login(account, password) {
    const cleanAcc = String(account || "").trim();
    const cleanPwd = String(password || "").trim();
    if (!cleanAcc || !cleanPwd) {
      throw new Error("请输入登录账号和密码");
    }

    const cfg = this.getConfig();
    if (cfg.mode === "remote") {
      const res = await fetch(`${cfg.baseUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account: cleanAcc, password: cleanPwd })
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload.detail || payload.message || "后端登录鉴权失败，请检查账号或密码");
      }
      const session = {
        token: payload.token,
        user: payload.user,
        loginTime: new Date().toLocaleString("zh-CN"),
        authSource: "remote"
      };
      this.saveSession(session);
      await this.fetchUsers();
      return session;
    }

    // 本地模式鉴权（读取权限表）
    const users = this.getLocalUsers();
    const found = users.find(u => u.account === cleanAcc);
    if (!found) {
      throw new Error(`账号 "${cleanAcc}" 不存在，请联系管理员/PI在后端开通账号`);
    }
    if (found.status === "disabled") {
      throw new Error(`账号 "${cleanAcc}" 已被后端停用，请联系管理员/PI开通`);
    }
    const expectedPwd = found.password || "123456";
    if (cleanPwd !== expectedPwd) {
      throw new Error("登录密码不正确（演示账号默认密码为 123456）");
    }
    const safeUser = { ...found };
    delete safeUser.password;
    const session = {
      token: `local_token_${cleanAcc}_${Date.now()}`,
      user: safeUser,
      loginTime: new Date().toLocaleString("zh-CN"),
      authSource: "local"
    };
    this.saveSession(session);
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
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
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

  // 导出为标准科研分析 CSV (宽表格式，直接兼容 SPSS / R / Stata / Excel，同时可作为 CSV 导入模版)
  CSV_HEADERS: [
    "患者编号(SUBJID)", "中心号(SITEID)", "患者姓名(NAME)", "姓名缩写(INITIALS)",
    "首次录入负责人账号(OWNER_ACCT)", "负责人姓名(OWNER_NAME)",
    "入组日期(STARTDTC)", "研究状态(STATUS)", "性别(SEX)", "出生日期(BRTHDTC)", "年龄(AGE)", "身高cm(HEIGHT)", "体重kg(WEIGHT)", "BMI",
    "住院号(HOSPID)", "手机号1(PHONE1)", "入院来源", "发病时间", "静脉溶栓", "血管内治疗", "TOAST分型", "中医证候", "是否符合纳排入组",
    "V1_体温", "V1_呼吸", "V1_脉搏", "V1_收缩压", "V1_舒张压",
    "V1_WBC", "V1_NEUT", "V1_LYMPH", "V1_NLR", "V1_CRP", "V1_PCT", "V1_IL6", "V1_IL10", "V1_TNFa",
    "V1_GCS", "V1_NIHSS", "V1_SOFA", "V1_FOIS", "V1_EQ5D_VAS",
    "V2_1_D3_GCS", "V2_1_D3_NIHSS", "V2_1_D3_SOFA", "V2_1_D3_FOIS",
    "V2_2_D7_GCS", "V2_2_D7_NIHSS", "V2_2_D7_SOFA", "V2_2_D7_FOIS",
    "是否确诊SAP(肺部感染)", "SAP确诊日期", "V2_3_PSI总分", "V2_3_PSI分级", "V2_3_痰培养结果",
    "V3_出院结局", "V3_出院mRS", "V3_出院NIHSS",
    "V4_D30生存", "V4_D30_mRS", "V4_D30_FOIS", "V4_D30再入院",
    "V5_D90生存", "V5_D90_mRS", "V5_D90_FOIS", "V5_D90再入院",
    "是否退出试验", "PI审核签名"
  ],

  subjectToCSVRow(s) {
    return [
      s.id,
      s.centerId || "01",
      s.name || "",
      s.initials || "",
      s.ownerAccount || "dr_lihua",
      s.ownerName || s.investigator || "李华",
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
      s.v1?.scales?.NIHSS?.score ?? "",
      s.v1?.scales?.SOFA?.score ?? "",
      s.v1?.scales?.FOIS?.score ?? "",
      s.v1?.scales?.EQ5D?.vas ?? "",
      s.v2_1?.scales?.GCS?.score ?? "",
      s.v2_1?.scales?.NIHSS?.score ?? "",
      s.v2_1?.scales?.SOFA?.score ?? "",
      s.v2_1?.scales?.FOIS?.score ?? "",
      s.v2_2?.scales?.GCS?.score ?? "",
      s.v2_2?.scales?.NIHSS?.score ?? "",
      s.v2_2?.scales?.SOFA?.score ?? "",
      s.v2_2?.scales?.FOIS?.score ?? "",
      s.sapConfirmed ? "1(确诊)" : "0(未感染)",
      s.v2_3?.confirmDate || "",
      s.v2_3?.psi?.totalScore ?? "",
      s.v2_3?.psi?.riskClass || "",
      s.v2_3?.pathogens?.sputumCulture?.result || "",
      s.v3?.outcome?.status || "",
      s.v3?.scales?.MRS?.score ?? "",
      s.v3?.scales?.NIHSS?.score ?? "",
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
      version: "1.0 (2026-04-20)",
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

  // 下载供 AI 整理或本地填报的 JSON 标准模版
  downloadJSONTemplate(currentUser) {
    const u = currentUser || { account: "dr_wangqiang", name: "王强", role: "主治医师" };
    const sample = window.createEmptySubject("005", window.getTodayDateStr(), u);
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

    const templateObj = {
      _instructions: "【AI与本地数据整理标准JSON模版】可将单例或多例受试者对象放入 subjects 数组中。导入时若 id 已存在将更新该受试者，若不存在将新增并自动绑定当前登录账号为首次录入负责人。缺失值请填 NA / ND / UNK。",
      project: "重症卒中相关性肺炎多组学预测标志物筛选及针刺多靶点调控机制研究",
      version: "1.0",
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
    const u = currentUser || { account: "dr_wangqiang", name: "王强", role: "主治医师" };
    const sample = window.createEmptySubject("005", window.getTodayDateStr(), u);
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
  getAIPromptText(currentUser) {
    const u = currentUser || { account: "dr_wangqiang", name: "王强" };
    return `你是一名严谨的神经重症临床科研数据提取助手。请根据我提供的患者病历/出院小结/检验报告，结合我上传的《重症卒中CRF_AI数据整理导入标准模版.json》（或CSV模版），将患者信息提取为完全符合该模版字段结构的 JSON 数据（直接输出纯 JSON 代码块，包含顶层 "subjects": [ ... ]）。
提取规则：
1. 患者编号(id)为三位数字字符串（如 "005"），姓名缩写(initials)按规则生成三位大写字母（三字填首字母；两字加填第二字第二字母；四字填前三字首字母）。
2. 首次录入负责人账号(ownerAccount)默认填 "${u.account}"，负责人姓名(ownerName)默认填 "${u.name}"。
3. 实验室检查项（如 v1.labs.wbc、neut、lymph、crp、pct、plt、ddimer、inr、aptt、fib、alb、palb、hb、glu、scr、tbil、pao2_fio2、il2、il4、il6、ifn_gamma、il10、tnf_alpha）格式均为 {"val": "数值", "eval": "0或1或2或9", "note": "备注"}，其中 eval: "0"=正常, "1"=异常无意义, "2"=异常有意义, "9"=未查(ND)。
4. 若某项选择“其他”，请将具体说明填入对应的 _other 字段（如 ethnicityOther、occupationOther、toastOther、tcmSyndromeOther 等）。
5. 未查项目填 "ND"，不适用填 "NA"，不详填 "UNK"。`;
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

  // 将导入的 JSON 或 CSV 内容解析并合并至现有受试者队列
  importDataText(rawText, formatHint, existingSubjects, currentUser) {
    const u = currentUser || { account: "dr_wangqiang", name: "王强", role: "主治医师" };
    const trimmed = (rawText || "").trim();
    if (!trimmed) throw new Error("导入内容为空，请选择文件或粘贴数据内容");

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
        const id = String(item.id || item.SUBJID || String(existingSubjects.length + idx + 1).padStart(3, "0")).padStart(3, "0");
        const startDate = item.startDate || item.v1?.eligibility?.enrollDate || window.getTodayDateStr();
        const base = window.createEmptySubject(id, startDate, u);
        this.deepMergeSubject(base, item);
        base.id = id;
        if (!base.ownerAccount) base.ownerAccount = u.account;
        if (!base.ownerName) base.ownerName = u.name;
        base.auditLogs = base.auditLogs || [];
        base.auditLogs.unshift({
          time: new Date().toLocaleString("zh-CN"),
          user: `${u.name} (${u.account})`,
          action: "通过 JSON 一键导入/更新病例数据",
          field: `患者编号: ${id} | 绑定负责人: ${base.ownerName} (${base.ownerAccount})`
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
        const rawId = getCol("SUBJID") || getCol("患者编号") || row[0] || String(existingSubjects.length + r).padStart(3, "0");
        const id = String(rawId).padStart(3, "0");
        const startDate = getCol("STARTDTC") || getCol("入组日期") || window.getTodayDateStr();
        const s = window.createEmptySubject(id, startDate, u);

        s.centerId = getCol("SITEID") || getCol("中心号") || "01";
        s.name = getCol("患者姓名") || getCol("NAME") || s.name;
        s.initials = (getCol("INITIALS") || getCol("姓名缩写") || "XXX").toUpperCase();
        s.ownerAccount = getCol("OWNER_ACCT") || getCol("负责人账号") || u.account;
        s.ownerName = getCol("OWNER_NAME") || getCol("负责人姓名") || u.name;
        s.investigator = s.ownerName;
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
        if (getCol("V1_NIHSS") !== "") s.v1.scales.NIHSS.score = getCol("V1_NIHSS");
        if (getCol("V1_SOFA") !== "") s.v1.scales.SOFA.score = getCol("V1_SOFA");
        if (getCol("V1_FOIS") !== "") s.v1.scales.FOIS.score = getCol("V1_FOIS");
        if (getCol("V1_EQ5D_VAS") !== "") s.v1.scales.EQ5D.vas = getCol("V1_EQ5D_VAS");

        if (getCol("V2_1_D3_GCS") !== "") s.v2_1.scales.GCS.score = getCol("V2_1_D3_GCS");
        if (getCol("V2_1_D3_NIHSS") !== "") s.v2_1.scales.NIHSS.score = getCol("V2_1_D3_NIHSS");
        if (getCol("V2_1_D3_SOFA") !== "") s.v2_1.scales.SOFA.score = getCol("V2_1_D3_SOFA");
        if (getCol("V2_1_D3_FOIS") !== "") s.v2_1.scales.FOIS.score = getCol("V2_1_D3_FOIS");

        if (getCol("V2_2_D7_GCS") !== "") s.v2_2.scales.GCS.score = getCol("V2_2_D7_GCS");
        if (getCol("V2_2_D7_NIHSS") !== "") s.v2_2.scales.NIHSS.score = getCol("V2_2_D7_NIHSS");
        if (getCol("V2_2_D7_SOFA") !== "") s.v2_2.scales.SOFA.score = getCol("V2_2_D7_SOFA");
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

        s.auditLogs.unshift({
          time: new Date().toLocaleString("zh-CN"),
          user: `${u.name} (${u.account})`,
          action: "通过 CSV 宽表一键导入病例数据",
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
