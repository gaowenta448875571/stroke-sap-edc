// 重症卒中临床科研电子数据采集系统 (eCRF / EDC) 主应用控制器

window.App = {
  state: {
    mainTab: "editor", // 'dashboard' | 'editor'
    subjects: [],
    currentSubjectId: "001",
    currentVisitId: "V1",
    v1SubTab: 0, // V1 内部子模块页签索引 (0~8)
    isAuthenticated: false,
    loginAccount: "",
    loginPassword: "",
    rememberPassword: false,
    autoLogin: false,
    loginError: "",
    showLoginBackendCfg: false,
    currentUser: null,
    usersList: [],
    mobileNavOpen: false, // 窄屏(<1024px)下访视与时间节点导航栏折叠状态
    mobileToolbarOpen: false, // 窄屏下顶部工具抽屉展开状态
    scaleModal: {
      open: false,
      visitKey: "v1",
      scaleKey: "GCS",
      tempDetails: {},
      tempMeasured: {},
      tempVas: 70,
      tempSigner: "高文涛",
      tempIsAcu: "否"
    },
    auditModalOpen: false,
    newSubjectModalOpen: false,
    reminderModalOpen: false,
    importModalOpen: false,
    docxPreviewModalOpen: false,
    userAdminModalOpen: false,
    reminderFilter: "pending", // 'pending' | 'all'
    reminderOwnerFilter: "all", // 'all' | account string
    toastMessage: ""
  },

  _scrollRightToTop: false,

  // 4 个关键时间节点定义（入组后第3天、第7天、第30天、第90天）
  MILESTONES: [
    {
      key: "v2_1",
      visitId: "V2_1",
      code: "V2-1",
      dayOffset: 3,
      label: "第3天数据采集",
      windowDesc: "入组后第 3 天",
      tasks: "基础生命体征、炎症/出凝血/器官功能指标、GCS/NIHSS/FOIS/SOFA/EQ-5D量表"
    },
    {
      key: "v2_2",
      visitId: "V2_2",
      code: "V2-2",
      dayOffset: 7,
      label: "第7天数据采集",
      windowDesc: "入组后第 7 天",
      tasks: "基础生命体征、实验室指标(含PCT)、5项临床量表、多组学生物样本(血浆/咽拭子/粪便)"
    },
    {
      key: "v4",
      visitId: "V4",
      code: "V4",
      dayOffset: 30,
      label: "第30天随访采集",
      windowDesc: "入组后第 30 天 (±3天)",
      tasks: "第30天生存状态、FOIS/EQ-5D/mRS量表评分、截至第30天再入院事件"
    },
    {
      key: "v5",
      visitId: "V5",
      code: "V5",
      dayOffset: 90,
      label: "第90天随访采集",
      windowDesc: "入组后第 90 天 (±5天)",
      tasks: "第90天生存状态、FOIS/EQ-5D/mRS量表评分、第31-90天再入院事件"
    }
  ],

  async init() {
    await window.EDC_API.autoDetectBackendIfNeeded();
    this.state.usersList = await window.EDC_API.fetchUsers();

    // 恢复记住的账号密码（若未勾选记住密码，登录框默认为空）
    const creds = window.EDC_API.getRememberedCreds();
    this.state.loginAccount = creds.account || "";
    this.state.loginPassword = creds.password || "";
    this.state.rememberPassword = Boolean(creds.rememberPassword);
    this.state.autoLogin = Boolean(creds.autoLogin);

    const session = window.EDC_API.getSession();
    if (session && session.user) {
      // 严格核对后端最新用户表，若原账号已在 Supabase 中修改/删除或停用，则立即使旧会话失效
      const latestUser = this.state.usersList.find(u => u.account === session.user.account);
      if (!latestUser || latestUser.status === "disabled") {
        await window.EDC_API.logout();
        this.state.isAuthenticated = false;
        this.state.currentUser = null;
      } else {
        this.state.isAuthenticated = true;
        this.state.currentUser = { ...latestUser };
      }
    }
    this.state.subjects = await window.EDC_API.listSubjects();
    if (this.state.subjects.length > 0) {
      this.state.currentSubjectId = this.state.subjects[0].id;
    }
    this.render();
  },

  isCurrentUserPI() {
    const u = this.state.currentUser;
    return Boolean(u && (u.isPI === true || u.canUnlock === true || String(u.role || "").includes("PI")));
  },

  canCurrentUserExport() {
    const u = this.state.currentUser;
    return Boolean(u && (u.canExport === true || u.isPI === true || String(u.role || "").includes("PI")));
  },

  canCurrentUserManageUsers() {
    const u = this.state.currentUser;
    return Boolean(u && (u.canManageUsers === true || u.isPI === true || String(u.role || "").includes("PI")));
  },

  // 账号密码登录提交
  async handleLoginSubmit(formEl) {
    const acc = formEl.querySelector("[name='login_account']")?.value.trim() || "";
    const pwd = formEl.querySelector("[name='login_password']")?.value.trim() || "";
    const autoLogin = Boolean(formEl.querySelector("[name='login_auto']")?.checked);
    const rememberPassword = Boolean(formEl.querySelector("[name='login_remember']")?.checked) || autoLogin;
    this.state.loginAccount = acc;
    this.state.loginPassword = pwd;
    this.state.rememberPassword = rememberPassword;
    this.state.autoLogin = autoLogin;
    this.state.loginError = "";
    try {
      const session = await window.EDC_API.login(acc, pwd, { rememberPassword, autoLogin });
      this.state.isAuthenticated = true;
      this.state.currentUser = session.user;
      this.state.usersList = await window.EDC_API.fetchUsers();
      this.state.subjects = await window.EDC_API.listSubjects();
      if (this.state.subjects.length > 0 && !this.state.currentSubjectId) {
        this.state.currentSubjectId = this.state.subjects[0].id;
      }
      this.showToast(
        `✓ 登录成功：欢迎 ${session.user.name} (${session.user.account}) · ${
          this.isCurrentUserPI() ? "已开通PI审核/导出/权限管理" : "数据录入员"
        }`
      );
      this.render();
    } catch (err) {
      this.state.loginError = err.message || String(err);
      this.render();
    }
  },

  // 退出当前登录账号
  async handleLogout() {
    const prevName = this.state.currentUser ? `${this.state.currentUser.name} (${this.state.currentUser.account})` : "";
    await window.EDC_API.logout();
    const creds = window.EDC_API.getRememberedCreds();
    this.state.isAuthenticated = false;
    this.state.currentUser = null;
    this.state.loginAccount = creds.rememberPassword ? creds.account : "";
    this.state.loginPassword = creds.rememberPassword ? creds.password : "";
    this.state.rememberPassword = Boolean(creds.rememberPassword);
    this.state.autoLogin = false;
    this.state.mobileToolbarOpen = false;
    this.state.userAdminModalOpen = false;
    this.state.loginError = "";
    if (prevName) {
      this.showToast(`已安全退出账号：${prevName}`);
    }
    this.render();
  },

  // 仅后端开通导出权限或 PI 权限可执行导出 CSV / JSON
  handleExportCSV() {
    if (!this.canCurrentUserExport()) {
      this.showToast("🔒 权限不足：当前账号未开通 CSV 导出权限（需 PI 或后端管理员开通）！");
      alert("【权限受限】\n导出全量科研数据（CSV / JSON）需由后端开通导出权限或使用主要研究者 (PI) 账号登录执行。");
      return;
    }
    window.EDC_API.exportToCSV(this.state.subjects);
    this.persist("导出全队列科研宽表CSV", `导出人: ${this.state.currentUser.name} (${this.state.currentUser.account})`);
    this.showToast("✓ 权限验证通过：已导出宽表 CSV（可直接导入 SPSS / R）");
  },

  handleExportJSON() {
    if (!this.canCurrentUserExport()) {
      this.showToast("🔒 权限不足：当前账号未开通 JSON 导出权限（需 PI 或后端管理员开通）！");
      alert("【权限受限】\n导出全量科研数据（CSV / JSON）需由后端开通导出权限或使用主要研究者 (PI) 账号登录执行。");
      return;
    }
    window.EDC_API.exportToJSON(this.state.subjects);
    this.persist("导出全队列JSON数据包", `导出人: ${this.state.currentUser.name} (${this.state.currentUser.account})`);
    this.showToast("✓ 权限验证通过：已导出全量 JSON 数据包");
  },

  // 切换访视或时间节点（宽屏下右栏滚回顶部、左栏保持原位；窄屏下自动折叠导航栏并滚至内容区）
  selectVisit(visitId, subjectId = "") {
    if (subjectId) {
      this.state.currentSubjectId = subjectId;
    }
    this.state.currentVisitId = visitId;
    this.state.mainTab = "editor";
    this.state.mobileNavOpen = false; // 窄屏下自动折叠上方导航栏
    this._scrollRightToTop = true;
    this.render();
  },

  // 切换 V1 内部子模块页签
  selectV1SubTab(idx) {
    this.state.v1SubTab = idx;
    this._scrollRightToTop = true;
    this.render();
  },

  toggleMobileNav() {
    this.state.mobileNavOpen = !this.state.mobileNavOpen;
    this.render();
  },

  getCurrentSubject() {
    return this.state.subjects.find(s => s.id === this.state.currentSubjectId) || this.state.subjects[0];
  },

  // 根据路径读取当前受试者深层字段
  getByPath(path) {
    const subj = this.getCurrentSubject();
    if (!subj || !path) return undefined;
    const parts = path.split(".");
    let cur = subj;
    for (let i = 0; i < parts.length; i++) {
      if (cur === undefined || cur === null) return undefined;
      cur = cur[parts[i]];
    }
    return cur;
  },

  // 判断某个时间节点是否已完成采集
  isMilestoneDone(subj, mKey) {
    const vObj = subj?.[mKey];
    if (!vObj) return false;
    if (vObj.completed === true) return true;
    if (mKey === "v2_1" || mKey === "v2_2") {
      return Boolean(vObj.vitals?.temp && (vObj.scales?.NIHSS?.score !== "" && vObj.scales?.NIHSS?.score !== undefined));
    }
    if (mKey === "v4" || mKey === "v5") {
      return Boolean(vObj.survival?.alive && (vObj.scales?.MRS?.score !== "" && vObj.scales?.MRS?.score !== undefined));
    }
    return false;
  },

  // 计算单个受试者的 4 个关键时间节点日程与提醒状态（携带首次录入绑定的负责人账号与负责人姓名）
  getSubjectMilestones(subj) {
    const baseDate = subj?.startDate || subj?.v1?.eligibility?.enrollDate || subj?.v1?.consentDate || window.getTodayDateStr();
    const todayStr = window.getTodayDateStr();
    const tParts = todayStr.split("-").map(Number);
    const todayMs = new Date(tParts[0], tParts[1] - 1, tParts[2]).getTime();
    const ownerAccount = subj?.ownerAccount || "dr_liguiwei";
    const ownerName = subj?.ownerName || subj?.investigator || "李桂伟";
    const ownerRole = subj?.ownerRole || "研究医生";

    return this.MILESTONES.map(m => {
      const dueDate = window.addDaysToDateStr(baseDate, m.dayOffset);
      const dParts = (dueDate || todayStr).split("-").map(Number);
      const dueMs = new Date(dParts[0], dParts[1] - 1, dParts[2]).getTime();
      const diffDays = Math.round((dueMs - todayMs) / 86400000);
      const done = this.isMilestoneDone(subj, m.key);

      let status = "scheduled"; // 'completed' | 'overdue' | 'today' | 'soon' | 'scheduled'
      let statusText = `${diffDays}天后 (${dueDate.slice(5)})`;
      let badgeCls = "bg-slate-100 text-slate-600 border-slate-200";
      let priority = 4;

      if (done) {
        status = "completed";
        statusText = "已完成采集";
        badgeCls = "bg-emerald-50 text-emerald-700 border-emerald-200";
        priority = 5;
      } else if (diffDays < 0) {
        status = "overdue";
        statusText = `已逾期 ${Math.abs(diffDays)} 天`;
        badgeCls = "bg-rose-100 text-rose-800 border-rose-300 font-bold animate-pulse";
        priority = 1;
      } else if (diffDays === 0) {
        status = "today";
        statusText = "今日到期需采集";
        badgeCls = "bg-amber-100 text-amber-900 border-amber-300 font-bold";
        priority = 2;
      } else if (diffDays <= 3) {
        status = "soon";
        statusText = `还有 ${diffDays} 天到期`;
        badgeCls = "bg-sky-100 text-sky-800 border-sky-300 font-semibold";
        priority = 3;
      }

      return {
        ...m,
        subjectId: subj.id,
        subjectName: subj.name,
        subjectInitials: subj.initials,
        ownerAccount,
        ownerName,
        ownerRole,
        enrollDate: baseDate,
        dueDate,
        actualDate: subj[m.key]?.visitDate || "",
        diffDays,
        done,
        status,
        statusText,
        badgeCls,
        priority
      };
    });
  },

  // 汇总全部受试者的时间节点提醒列表
  getAllReminders() {
    const all = [];
    this.state.subjects.forEach(s => {
      if (s.summary?.withdrawn === "是") return;
      const msList = this.getSubjectMilestones(s);
      all.push(...msList);
    });
    return all.sort((a, b) => a.priority - b.priority || a.diffDays - b.diffDays);
  },

  showToast(msg) {
    this.state.toastMessage = msg;
    const toastEl = document.getElementById("edc-toast");
    if (toastEl) {
      toastEl.textContent = msg;
      toastEl.classList.remove("hidden");
      clearTimeout(this._toastTimer);
      this._toastTimer = setTimeout(() => {
        toastEl.classList.add("hidden");
      }, 2800);
    }
  },

  async persist(logAction, logField) {
    const subj = this.getCurrentSubject();
    if (subj && logAction) {
      const curU = this.state.currentUser;
      subj.auditLogs = subj.auditLogs || [];
      subj.auditLogs.unshift({
        time: new Date().toLocaleString("zh-CN"),
        user: curU ? `${curU.name} (${curU.account})` : (subj.ownerName || subj.investigator || "研究医生"),
        action: logAction,
        field: logField || ""
      });
    }
    await window.EDC_API.saveSubjects(this.state.subjects);
  },

  // 根据路径读取或更新受试者对象深层字段
  // skipRender=true 时用于纯文本/数值输入框失焦保存，避免重绘打断用户连续输入下一个输入框的焦点
  setByPath(path, val, labelForAudit = "", skipRender = false) {
    const subj = this.getCurrentSubject();
    if (!subj) return;
    if (subj.locked && path !== "locked") {
      this.showToast("当前病例已由主要研究者(PI)审核锁定，不可修改数据！");
      this.render();
      return;
    }
    const parts = path.split(".");
    let cur = subj;
    for (let i = 0; i < parts.length - 1; i++) {
      if (cur[parts[i]] === undefined || cur[parts[i]] === null) cur[parts[i]] = {};
      cur = cur[parts[i]];
    }
    const lastKey = parts[parts.length - 1];
    cur[lastKey] = val;

    // 实验室检查临床意义评估：选择 9（未查 ND）后，前方自动填入数值 "ND"
    if (lastKey === "eval" && path.includes(".labs.")) {
      if (String(val) === "9") {
        cur.val = "ND";
      } else if (cur.val === "ND") {
        cur.val = "";
      }
    } else if (lastKey === "eval" && path.includes(".infLabs.")) {
      if (String(val) === "9") {
        cur.done = "否";
        cur.day0 = "ND";
        cur.day3 = "ND";
      } else if (cur.day0 === "ND" || cur.day3 === "ND") {
        cur.done = "是";
        if (cur.day0 === "ND") cur.day0 = "";
        if (cur.day3 === "ND") cur.day3 = "";
      }
    }

    // 若修改了入组日期 startDate，同步更新 v1.eligibility.enrollDate
    if (path === "startDate" && subj.v1?.eligibility) {
      subj.v1.eligibility.enrollDate = val;
    } else if (path === "v1.eligibility.enrollDate") {
      subj.startDate = val;
    }

    // 触发联动衍生计算
    this.runDerivedCalculations(subj, path);
    this.persist("更新数据字段", `${labelForAudit || path} → ${JSON.stringify(val)}`);

    // 仅在需要刷新衍生UI或单选/多选状态时重绘；纯文本/备注输入若声明 skipRender 则原位更新，绝不丢失下一个输入框焦点
    const needsStructuralRender =
      !skipRender ||
      path === "startDate" ||
      path === "v1.eligibility.enrollDate" ||
      path === "v1.demographics.height" ||
      path === "v1.demographics.weight" ||
      path === "v1.demographics.birthDate" ||
      path.endsWith(".neut.val") ||
      path.endsWith(".lymph.val") ||
      path.endsWith(".neut.day0") ||
      path.endsWith(".lymph.day0") ||
      path.endsWith(".neut.day3") ||
      path.endsWith(".lymph.day3") ||
      path === "name" ||
      path === "initials";

    if (needsStructuralRender) {
      this.render();
    } else {
      const auditBtn = document.getElementById("edc-audit-btn-count");
      if (auditBtn) auditBtn.textContent = (subj.auditLogs || []).length;
    }
  },

  // 切换多选数组中的值
  toggleArrayItem(path, itemValue, labelForAudit = "") {
    const subj = this.getCurrentSubject();
    if (!subj) return;
    if (subj.locked) {
      this.showToast("当前病例已由主要研究者(PI)审核锁定，不可修改数据！");
      return;
    }
    const parts = path.split(".");
    let cur = subj;
    for (let i = 0; i < parts.length - 1; i++) {
      if (cur[parts[i]] === undefined || cur[parts[i]] === null) cur[parts[i]] = {};
      cur = cur[parts[i]];
    }
    const lastKey = parts[parts.length - 1];
    const arr = Array.isArray(cur[lastKey]) ? [...cur[lastKey]] : [];
    const idx = arr.indexOf(itemValue);
    if (idx >= 0) arr.splice(idx, 1);
    else arr.push(itemValue);
    cur[lastKey] = arr;

    this.runDerivedCalculations(subj, path);
    this.persist("修改多选条目", `${labelForAudit || path}: [${arr.join(", ")}]`);
    this.render();
  },

  // 切换肢体无力/麻木部位备注（支持多选部位如 左侧/右侧/左上/左下/右上/右下/两侧）
  toggleLimbSymptomSide(path, side, labelForAudit = "") {
    const subj = this.getCurrentSubject();
    if (!subj) return;
    if (subj.locked) {
      this.showToast("当前病例已由主要研究者(PI)审核锁定，不可修改数据！");
      return;
    }
    const raw = this.getByPath(path);
    const arr = Array.isArray(raw)
      ? [...raw]
      : raw
      ? String(raw).split(/[、,，/\s]+/).filter(Boolean)
      : [];
    const idx = arr.indexOf(side);
    if (idx >= 0) arr.splice(idx, 1);
    else arr.push(side);
    const joined = arr.join("、");
    if (path === "v1.history.limbWeaknessSide" && subj.v1?.history) {
      subj.v1.history.chiefLimbSide = joined;
    }
    this.setByPath(path, joined, labelForAudit);
  },

  async deleteSubject(subjectId) {
    const target = this.state.subjects.find(s => s.id === subjectId);
    if (!target) return;
    if (!confirm(`确定要彻底删除患者 [${target.id}] ${target.name || target.initials || ""} 的全部记录吗？`)) return;
    this.state.subjects = await window.EDC_API.deleteSubjectById(subjectId, this.state.subjects);
    if (this.state.currentSubjectId === subjectId) {
      this.state.currentSubjectId = this.state.subjects[0]?.id || "";
    }
    this.showToast(`已删除患者 [${subjectId}] 数据`);
    this.render();
  },

  async handleClearAllSubjects() {
    if (this.state.subjects.length === 0) {
      this.showToast("当前系统中已无任何患者数据");
      return;
    }
    if (!confirm(`确定要清空当前系统中的所有 ${this.state.subjects.length} 例患者数据吗？此操作将同步清除云端数据库记录。`)) return;
    this.state.subjects = await window.EDC_API.clearAllSubjects();
    this.state.currentSubjectId = "";
    this.showToast("已清空系统中的所有患者数据");
    this.render();
  },

  // 自动计算衍生指标（BMI、NLR、PSI 总分等）
  runDerivedCalculations(subj, changedPath = "") {
    const h = parseFloat(subj.v1?.demographics?.height);
    const w = parseFloat(subj.v1?.demographics?.weight);
    if (h > 50 && w > 15) {
      subj.v1.demographics.bmi = (w / Math.pow(h / 100, 2)).toFixed(1);
    }

    if (subj.v1?.demographics?.birthDate) {
      const birthYear = parseInt(subj.v1.demographics.birthDate.slice(0, 4), 10);
      const refYear = parseInt((subj.startDate || "2026").slice(0, 4), 10) || 2026;
      if (birthYear > 1900 && birthYear <= refYear) {
        subj.v1.demographics.age = refYear - birthYear;
      }
    }

    ["v1", "v2_1", "v2_2"].forEach(vKey => {
      const labs = subj[vKey]?.labs;
      if (labs) {
        if (String(labs.nlr?.eval) === "9") {
          labs.nlr.val = "ND";
        } else if (labs.neut?.val === "ND" || labs.lymph?.val === "ND") {
          if (!labs.nlr) labs.nlr = { val: "ND", eval: "9", note: "自动计算" };
          else {
            labs.nlr.val = "ND";
            labs.nlr.eval = "9";
          }
        } else {
          const neut = parseFloat(labs.neut?.val);
          const lymph = parseFloat(labs.lymph?.val);
          if (!isNaN(neut) && !isNaN(lymph) && lymph > 0) {
            if (!labs.nlr) labs.nlr = { val: "", eval: "0", note: "自动计算" };
            labs.nlr.val = (neut / lymph).toFixed(2);
          }
        }
      }
    });

    if (subj.v2_3?.infLabs) {
      const inf = subj.v2_3.infLabs;
      const n0 = parseFloat(inf.neut?.day0);
      const l0 = parseFloat(inf.lymph?.day0);
      if (!isNaN(n0) && !isNaN(l0) && l0 > 0) {
        if (!inf.nlr) inf.nlr = { done: "是", day0: "", day3: "", eval: "0", note: "" };
        inf.nlr.day0 = (n0 / l0).toFixed(2);
      }
      const n3 = parseFloat(inf.neut?.day3);
      const l3 = parseFloat(inf.lymph?.day3);
      if (!isNaN(n3) && !isNaN(l3) && l3 > 0) {
        if (!inf.nlr) inf.nlr = { done: "是", day0: "", day3: "", eval: "0", note: "" };
        inf.nlr.day3 = (n3 / l3).toFixed(2);
      }
    }

    if (changedPath.startsWith("v2_3.sapConclusion")) {
      subj.sapConfirmed = subj.v2_3.sapConclusion === "确诊";
    }

    if (subj.v2_3?.psi) {
      const age = parseInt(subj.v1?.demographics?.age, 10) || 65;
      const isFemale = subj.v1?.demographics?.gender === "女";
      let total = isFemale ? Math.max(0, age - 10) : age;
      (window.CRF_CONFIG.psiItems || []).forEach(item => {
        if (subj.v2_3.psi.checks?.[item.id]) {
          total += item.points;
        }
      });
      subj.v2_3.psi.totalScore = total;
      if (total <= 50) subj.v2_3.psi.riskClass = "I级 (低风险, ≤50分)";
      else if (total <= 70) subj.v2_3.psi.riskClass = "II级 (低风险, 51-70分)";
      else if (total <= 90) subj.v2_3.psi.riskClass = "III级 (低风险, 71-90分)";
      else if (total <= 130) subj.v2_3.psi.riskClass = "IV级 (中度风险, 91-130分)";
      else subj.v2_3.psi.riskClass = "V级 (高风险, >130分)";
    }
  },

  // 打开交互式量表评分计算器弹窗
  openScaleModal(visitKey, scaleKey) {
    const subj = this.getCurrentSubject();
    if (subj?.locked) {
      this.showToast("当前病例已由主要研究者(PI)审核锁定，不可修改评分！");
      return;
    }
    const scaleObj = subj[visitKey]?.scales?.[scaleKey] || { score: "", signer: subj.investigator, isAcupuncturist: "否", details: {} };
    this.state.scaleModal = {
      open: true,
      visitKey,
      scaleKey,
      tempDetails: { ...(scaleObj.details || {}) },
      tempMeasured: { ...(scaleObj.measured || {}) },
      tempVas: scaleObj.vas ?? 70,
      tempSigner: scaleObj.signer || subj.ownerName || subj.investigator || "高文涛",
      tempIsAcu: scaleObj.isAcupuncturist || "否"
    };
    this.render();
  },

  // 量表弹窗内选择某个评分项（保持弹窗滚动条位置，绝不跳回顶部）
  selectScaleOption(itemId, scoreVal) {
    this.state.scaleModal.tempDetails[itemId] = scoreVal;
    this.render();
  },

  // 实时拖动或输入今日健康 VAS 视觉模拟评分 (0-100分) —— 原位更新 DOM，不触发整页重绘以保证拖动顺滑
  updateScaleModalVas(rawVal, source = "range") {
    let v = parseInt(rawVal, 10);
    if (isNaN(v)) v = 0;
    v = Math.max(0, Math.min(100, v));
    this.state.scaleModal.tempVas = v;

    const dispEl = document.getElementById("edc-scale-vas-display");
    if (dispEl) dispEl.textContent = `${v} 分`;

    if (source !== "range") {
      const rangeEl = document.getElementById("edc-scale-vas-range");
      if (rangeEl) rangeEl.value = String(v);
    }
    if (source !== "num") {
      const numEl = document.getElementById("edc-scale-vas-num");
      if (numEl) numEl.value = String(v);
    }

    const { tempDetails } = this.state.scaleModal;
    const m = tempDetails.mobility || 1;
    const s = tempDetails.selfcare || 1;
    const a = tempDetails.activity || 1;
    const p = tempDetails.pain || 1;
    const x = tempDetails.anxiety || 1;
    const liveTotal = `${m}-${s}-${a}-${p}-${x} (VAS: ${v}分)`;

    const totalEl = document.getElementById("edc-scale-live-total");
    if (totalEl) totalEl.textContent = liveTotal;

    const confirmBtn = document.getElementById("edc-scale-confirm-btn");
    if (confirmBtn) confirmBtn.textContent = `✓ 确认算分并回填 (${liveTotal})`;
  },

  closeScaleModal() {
    this.state.scaleModal.open = false;
    this.render();
  },

  saveScaleModal() {
    const { visitKey, scaleKey, tempDetails, tempMeasured, tempVas, tempSigner, tempIsAcu } = this.state.scaleModal;
    const subj = this.getCurrentSubject();
    const def = window.CLINICAL_SCALES[scaleKey];
    if (!subj || !def) return;

    let finalScore = 0;
    if (scaleKey === "EQ5D") {
      const m = tempDetails.mobility || 1;
      const s = tempDetails.selfcare || 1;
      const a = tempDetails.activity || 1;
      const p = tempDetails.pain || 1;
      const x = tempDetails.anxiety || 1;
      finalScore = `${m}-${s}-${a}-${p}-${x} / VAS:${tempVas}`;
    } else {
      def.items.forEach(item => {
        const val = parseInt(tempDetails[item.id], 10);
        const opt = item.options.find(o => o.score === val);
        if (!isNaN(val) && !(opt && opt.excludeFromSum)) {
          finalScore += val;
        }
      });
    }

    if (!subj[visitKey].scales) subj[visitKey].scales = {};
    subj[visitKey].scales[scaleKey] = {
      score: finalScore,
      vas: tempVas,
      signer: tempSigner,
      isAcupuncturist: tempIsAcu,
      details: { ...tempDetails },
      measured: { ...tempMeasured }
    };

    this.state.scaleModal.open = false;
    this.persist("完成量表评估计算", `${visitKey.toUpperCase()} - ${def.name} = ${finalScore}`);
    this.showToast(`已回填 ${def.name} 评分：${finalScore}`);
    this.render();
  },

  // 新增受试者（自动与首次录入账号及负责人姓名绑定）
  createNewSubject(formEl) {
    const id = formEl.querySelector("[name='new_id']").value.trim() || String(this.state.subjects.length + 1).padStart(3, "0");
    const name = formEl.querySelector("[name='new_name']").value.trim();
    const initials = formEl.querySelector("[name='new_initials']").value.trim().toUpperCase();
    const enrollDate = formEl.querySelector("[name='new_enroll_date']")?.value || window.getTodayDateStr();
    const ownerAccount = formEl.querySelector("[name='new_owner_account']")?.value.trim() || this.state.currentUser.account;
    const ownerName = formEl.querySelector("[name='new_owner_name']")?.value.trim() || this.state.currentUser.name;

    if (this.state.subjects.some(s => s.id === id)) {
      this.showToast(`患者编号 ${id} 已存在，请使用其他三位数字编号`);
      return;
    }

    const creatorObj = {
      account: ownerAccount,
      name: ownerName,
      role: this.state.currentUser.account === ownerAccount ? this.state.currentUser.role : "研究医生"
    };
    const newSubj = window.createEmptySubject(id, enrollDate, creatorObj);
    newSubj.name = name;
    newSubj.initials = initials || "XXX";
    newSubj.ownerAccount = ownerAccount;
    newSubj.ownerName = ownerName;
    newSubj.investigator = ownerName;

    this.state.subjects.push(newSubj);
    this.state.currentSubjectId = id;
    this.state.currentVisitId = "V1";
    this.state.v1SubTab = 0;
    this.state.newSubjectModalOpen = false;
    this._scrollRightToTop = true;
    this.persist(
      "首次录入受试者并绑定责任账号",
      `编号 ${id} (${initials}) | 入组日期 ${enrollDate} | 绑定负责人: ${ownerName} (账号: ${ownerAccount})`
    );
    this.showToast(`已创建受试者 ${id}，已绑定首次录入负责人：${ownerName} (${ownerAccount})！`);
    this.render();
  },

  // 主渲染入口（严格保持左栏、右栏及量表弹窗内部滚动位置，解决滚回顶部问题）
  render() {
    const root = document.getElementById("app-root");
    if (!root) return;

    // 若未登录，直接渲染登录界面
    if (!this.state.isAuthenticated || !this.state.currentUser) {
      root.innerHTML = this.renderLoginView();
      return;
    }

    // 1. 记录重绘前各独立滚动容器的 scrollTop
    const prevLeftPane = document.getElementById("edc-left-pane");
    const prevRightPane = document.getElementById("edc-right-pane");
    const prevScaleBody = document.getElementById("edc-scale-modal-body");
    const prevReminderBody = document.getElementById("edc-reminder-modal-body");
    const prevDocxBody = document.getElementById("edc-docx-modal-body");
    const prevAdminBody = document.getElementById("edc-admin-modal-body");
    const prevImportBody = document.getElementById("edc-import-modal-body");

    const savedLeftScroll = prevLeftPane ? prevLeftPane.scrollTop : 0;
    const savedRightScroll = prevRightPane ? prevRightPane.scrollTop : 0;
    const savedScaleScroll = prevScaleBody ? prevScaleBody.scrollTop : 0;
    const savedReminderScroll = prevReminderBody ? prevReminderBody.scrollTop : 0;
    const savedDocxScroll = prevDocxBody ? prevDocxBody.scrollTop : 0;
    const savedAdminScroll = prevAdminBody ? prevAdminBody.scrollTop : 0;
    const savedImportScroll = prevImportBody ? prevImportBody.scrollTop : 0;
    const savedWinScrollY = typeof window.scrollY === "number" ? window.scrollY : 0;

    const subj = this.getCurrentSubject();

    root.innerHTML = `
      <div class="${this.state.mainTab === "editor" ? "lg:h-screen lg:flex lg:flex-col lg:overflow-hidden" : "min-h-screen"}">
        ${this.renderTopNavbar(subj)}
        <main class="w-full max-w-[1800px] mx-auto px-3 sm:px-5 ${
          this.state.mainTab === "editor" ? "py-3 lg:flex-1 lg:min-h-0 lg:overflow-hidden" : "py-5"
        }">
          ${
            this.state.mainTab === "dashboard"
              ? this.renderDashboardView()
              : this.renderCRFEditorView(subj)
          }
        </main>
      </div>
      ${this.state.scaleModal.open ? this.renderScaleModal() : ""}
      ${this.state.auditModalOpen ? this.renderAuditModal(subj) : ""}
      ${this.state.newSubjectModalOpen ? this.renderNewSubjectModal() : ""}
      ${this.state.reminderModalOpen ? this.renderReminderModal() : ""}
      ${this.state.importModalOpen ? this.renderImportModal() : ""}
      ${this.state.docxPreviewModalOpen ? this.renderDocxPreviewModal(subj) : ""}
      ${this.state.userAdminModalOpen ? this.renderUserAdminModal() : ""}
    `;

    // 2. 恢复各独立滚动容器的滚动条位置
    const nextLeftPane = document.getElementById("edc-left-pane");
    const nextRightPane = document.getElementById("edc-right-pane");
    const nextScaleBody = document.getElementById("edc-scale-modal-body");
    const nextReminderBody = document.getElementById("edc-reminder-modal-body");
    const nextDocxBody = document.getElementById("edc-docx-modal-body");
    const nextAdminBody = document.getElementById("edc-admin-modal-body");
    const nextImportBody = document.getElementById("edc-import-modal-body");

    // 左栏始终保持在原位
    if (nextLeftPane) {
      nextLeftPane.scrollTop = savedLeftScroll;
    }

    // 右栏：若点击了左栏访视/节点按钮，则右栏回顶部；否则保持当前滚动位置
    if (this._scrollRightToTop) {
      this._scrollRightToTop = false;
      if (nextRightPane) {
        nextRightPane.scrollTop = 0;
      }
      // 窄屏单栏模式下，点击访视按钮自动折叠导航后，平滑滚动至右侧表单顶部
      if (typeof window.innerWidth === "number" && window.innerWidth < 1024 && nextRightPane && nextRightPane.scrollIntoView) {
        nextRightPane.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    } else {
      if (nextRightPane) {
        nextRightPane.scrollTop = savedRightScroll;
      }
      if (typeof window.scrollTo === "function" && (typeof window.innerWidth !== "number" || window.innerWidth < 1024 || this.state.mainTab === "dashboard")) {
        window.scrollTo(0, savedWinScrollY);
      }
    }

    // 恢复展开的各弹窗内部滚动条位置
    if (nextScaleBody) nextScaleBody.scrollTop = savedScaleScroll;
    if (nextReminderBody) nextReminderBody.scrollTop = savedReminderScroll;
    if (nextDocxBody) nextDocxBody.scrollTop = savedDocxScroll;
    if (nextAdminBody) nextAdminBody.scrollTop = savedAdminScroll;
    if (nextImportBody) nextImportBody.scrollTop = savedImportScroll;
  },

  // 账号登录视图（简洁专业的临床科研登录页）
  renderLoginView() {
    const proj = window.CRF_CONFIG.project;

    return `
      <div class="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-sky-950 flex flex-col justify-center items-center px-4 py-8">
        <div class="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
          <!-- 登录卡片头部 -->
          <div class="bg-slate-900 text-white px-6 py-6 border-b border-slate-800">
            <div class="flex items-center gap-3">
              <div class="w-12 h-9 px-2 rounded-lg bg-gradient-to-br from-sky-500 to-teal-500 flex items-center justify-center font-extrabold text-xs tracking-tight shadow-inner shrink-0">
                eCRF
              </div>
              <div>
                <h1 class="text-base sm:text-lg font-bold tracking-tight leading-snug">${proj.title}</h1>
              </div>
            </div>
            <p class="text-xs text-slate-400 mt-2.5">
              临床科研电子数据采集系统 (EDC)
            </p>
          </div>

          <!-- 登录表单主体 -->
          <form onsubmit="event.preventDefault();App.handleLoginSubmit(this)" class="p-6 space-y-4">
            ${
              this.state.loginError
                ? `
              <div class="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                <span>⚠️</span>
                <span>${this.state.loginError}</span>
              </div>
            `
                : ""
            }

            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1.5">研究者账号 / 工号</label>
              <input type="text" name="login_account" value="${this.state.loginAccount || ""}" required
                autocomplete="username"
                placeholder="请输入研究者账号"
                class="crf-input py-2.5 text-sm font-medium" />
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1.5">登录密码</label>
              <input type="password" name="login_password" value="${this.state.loginPassword || ""}" required
                autocomplete="current-password"
                placeholder="请输入登录密码"
                class="crf-input py-2.5 text-sm font-medium" />
            </div>

            <div class="flex items-center justify-between text-xs text-slate-600 pt-0.5">
              <label class="inline-flex items-center gap-1.5 cursor-pointer select-none">
                <input type="checkbox" name="login_remember" ${this.state.rememberPassword ? "checked" : ""}
                  onchange="App.state.rememberPassword=this.checked;if(!this.checked){App.state.autoLogin=false;var autoBox=this.form.querySelector('[name=login_auto]');if(autoBox)autoBox.checked=false;}"
                  class="rounded border-slate-300 text-sky-600 focus:ring-sky-500" />
                <span>记住账号密码</span>
              </label>
              <label class="inline-flex items-center gap-1.5 cursor-pointer select-none">
                <input type="checkbox" name="login_auto" ${this.state.autoLogin ? "checked" : ""}
                  onchange="App.state.autoLogin=this.checked;if(this.checked){App.state.rememberPassword=true;var remBox=this.form.querySelector('[name=login_remember]');if(remBox)remBox.checked=true;}"
                  class="rounded border-slate-300 text-sky-600 focus:ring-sky-500" />
                <span>下次自动登录</span>
              </label>
            </div>

            <button type="submit"
              class="w-full py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer">
              <span>🔐 登录进入 eCRF 系统</span>
            </button>
          </form>
        </div>
      </div>
    `;
  },

  // 顶部全局导航栏（全屏与非全屏保持统一紧凑布局，工具与账号统一收纳在“工具/账号”菜单中，不撑高顶栏）
  renderTopNavbar(subj) {
    const proj = window.CRF_CONFIG.project;
    const allReminders = this.getAllReminders();
    const urgentCount = allReminders.filter(r => r.status === "overdue" || r.status === "today" || r.status === "soon").length;
    const curUser = this.state.currentUser || { account: "dr_liguiwei", name: "李桂伟", role: "主任医师 (PI)", isPI: true };
    const isPI = this.isCurrentUserPI();
    const canExport = this.canCurrentUserExport();
    const canManageUsers = this.canCurrentUserManageUsers();

    return `
      <header class="bg-slate-900 text-white shadow-md sticky top-0 z-30 shrink-0 no-print">
        <!-- 第一层主栏（全屏与常规桌面端完全一致） -->
        <div class="w-full max-w-[1800px] mx-auto px-3 sm:px-5 h-14 flex items-center justify-between gap-3">
          <!-- 左侧 Logo 与完整项目标题 -->
          <div class="flex items-center gap-2.5 min-w-0 flex-1">
            <div class="w-11 h-8 sm:h-9 px-1.5 rounded-lg bg-gradient-to-br from-sky-500 to-teal-500 flex items-center justify-center font-extrabold text-xs tracking-tight shadow-inner shrink-0 select-none">
              eCRF
            </div>
            <div class="min-w-0 flex-1">
              <h1 class="font-bold text-xs sm:text-sm lg:text-[15px] tracking-tight leading-snug truncate">${proj.title}</h1>
              <p class="hidden sm:block text-[11px] text-slate-400 leading-tight mt-0.5 truncate">
                临床科研电子数据采集系统 · 当前登录：<span class="text-sky-300 font-semibold">${curUser.name} (${curUser.account})</span> ${
                  isPI ? "[PI权限]" : canExport ? "[已授权导出]" : "[数据录入员]"
                }
              </p>
            </div>
          </div>

          <!-- 桌面端中部：主视图切换页签 (lg 及以上显示在顶栏中间) -->
          <div class="hidden lg:flex items-center gap-1 bg-slate-800 p-1 rounded-lg border border-slate-700 shrink-0">
            <button onclick="App.state.mainTab='dashboard';App.render()"
              class="px-3 py-1.5 rounded-md text-xs font-medium transition ${
                this.state.mainTab === "dashboard" ? "bg-sky-600 text-white shadow" : "text-slate-300 hover:text-white"
              }">
              📊 队列总览与访视矩阵
            </button>
            <button onclick="App.state.mainTab='editor';App.render()"
              class="px-3 py-1.5 rounded-md text-xs font-medium transition ${
                this.state.mainTab === "editor" ? "bg-sky-600 text-white shadow" : "text-slate-300 hover:text-white"
              }">
              📝 病例报告表 (eCRF) 填报
            </button>
          </div>

          <!-- 右侧操作区（全屏与非全屏一致：采集提醒 + 工具/账号折叠按钮） -->
          <div class="flex items-center gap-2 shrink-0">
            <!-- 采集节点提醒按钮 -->
            <button onclick="App.state.reminderModalOpen=true;App.render()"
              class="px-2.5 py-1.5 rounded-lg ${
                urgentCount > 0
                  ? "bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/40"
                  : "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600"
              } text-xs font-semibold flex items-center gap-1 transition cursor-pointer">
              <span>🔔</span>
              <span class="hidden sm:inline">采集提醒</span>
              <span class="px-1.5 py-0.2 rounded-full ${urgentCount > 0 ? "bg-rose-600 text-white" : "bg-slate-700 text-slate-300"} text-[11px] font-bold">${urgentCount}</span>
            </button>

            <!-- 工具与账号折叠菜单按钮（所有屏幕宽度下统一折叠） -->
            <button onclick="App.state.mobileToolbarOpen=!App.state.mobileToolbarOpen;App.render()"
              class="px-2.5 py-1.5 rounded-lg ${
                this.state.mobileToolbarOpen
                  ? "bg-sky-600 text-white border border-sky-400"
                  : "bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200"
              } text-xs font-semibold flex items-center gap-1 transition cursor-pointer">
              <span>${this.state.mobileToolbarOpen ? "✕" : "☰"}</span>
              <span>工具/账号</span>
            </button>
          </div>
        </div>

        <!-- 手机/平板端 (< lg) 第二层：主视图切换双栏 -->
        <div class="lg:hidden px-3 pb-2 flex items-center justify-between gap-2 border-t border-slate-800 pt-2">
          <div class="grid grid-cols-2 gap-1 bg-slate-800 p-1 rounded-lg border border-slate-700 flex-1">
            <button onclick="App.state.mainTab='dashboard';App.render()"
              class="py-1.5 rounded text-xs font-semibold text-center transition ${
                this.state.mainTab === "dashboard" ? "bg-sky-600 text-white shadow" : "text-slate-300"
              }">
              📊 队列总览
            </button>
            <button onclick="App.state.mainTab='editor';App.render()"
              class="py-1.5 rounded text-xs font-semibold text-center transition ${
                this.state.mainTab === "editor" ? "bg-sky-600 text-white shadow" : "text-slate-300"
              }">
              📝 eCRF 填报
            </button>
          </div>
        </div>

        <!-- 展开式工具/账号抽屉 (全屏与非全屏通用：包含当前登录账号、权限管理、退出登录、AI导入/模版、导出CSV/JSON) -->
        ${
          this.state.mobileToolbarOpen
            ? `
          <div class="bg-slate-800/95 border-t border-slate-700 px-3 sm:px-5 py-3 text-xs">
            <div class="w-full max-w-[1800px] mx-auto space-y-3">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="text-slate-300 font-semibold">👤 当前登录：</span>
                  <span class="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-600 text-sky-300 font-bold">
                    ${curUser.name} (${curUser.account}) · ${curUser.role}
                  </span>
                  ${
                    canManageUsers
                      ? `
                    <button onclick="App.state.userAdminModalOpen=true;App.state.mobileToolbarOpen=false;App.render()"
                      class="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold cursor-pointer">
                      🔑 后端账号与权限开通
                    </button>
                  `
                      : ""
                  }
                  <button onclick="App.handleLogout()"
                    class="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold cursor-pointer">
                    🚪 退出登录
                  </button>
                </div>
                <span class="text-[11px] ${canExport ? "text-emerald-400" : "text-amber-300"}">
                  ${canExport ? "✓ 已具备数据导出权限" : "ℹ️ 导出 CSV/JSON 需由后端开通权限"}
                </span>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button onclick="App.state.importModalOpen=true;App.state.mobileToolbarOpen=false;App.render()"
                  class="py-2 px-3 rounded-lg bg-teal-700 hover:bg-teal-600 text-white font-semibold text-center cursor-pointer">
                  📥 导入数据 / 下载 AI 模版
                </button>
                <button onclick="App.handleExportCSV()"
                  class="py-2 px-3 rounded-lg border font-semibold text-center cursor-pointer ${
                    canExport ? "bg-slate-700 hover:bg-slate-600 text-white border-slate-500" : "bg-slate-900/50 text-slate-400 border-slate-700"
                  }">
                  ${canExport ? "⬇ 导出宽表 CSV" : "🔒 导出CSV (仅授权)"}
                </button>
                <button onclick="App.handleExportJSON()"
                  class="py-2 px-3 rounded-lg border font-semibold text-center cursor-pointer ${
                    canExport ? "bg-slate-700 hover:bg-slate-600 text-white border-slate-500" : "bg-slate-900/50 text-slate-400 border-slate-700"
                  }">
                  ${canExport ? "⬇ 导出全量 JSON" : "🔒 导出JSON (仅授权)"}
                </button>
              </div>
            </div>
          </div>
        `
            : ""
        }
      </header>
    `;
  },

  // 1. 队列总览与受试者访视矩阵视图（含第3/7/30/90天时间节点提醒看板及负责人账号信息）
  renderDashboardView() {
    const total = this.state.subjects.length;
    const sapCount = this.state.subjects.filter(s => s.sapConfirmed).length;
    const lockedCount = this.state.subjects.filter(s => s.locked).length;
    const allReminders = this.getAllReminders();
    const dueReminders = allReminders.filter(r => r.status === "overdue" || r.status === "today" || r.status === "soon");
    const pendingReminders = allReminders.filter(r => !r.done);
    const curUser = this.state.currentUser || { account: "dr_liguiwei", name: "李桂伟" };
    const filteredPending =
      this.state.reminderOwnerFilter === "all"
        ? pendingReminders
        : pendingReminders.filter(r => r.ownerAccount === this.state.reminderOwnerFilter);

    return `
      <div class="space-y-6">
        <!-- 统计指标卡 -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p class="text-xs font-medium text-slate-500 uppercase">已入组受试者总数</p>
              <p class="text-3xl font-bold text-slate-900 mt-1">${total} <span class="text-sm font-normal text-slate-500">例</span></p>
              <p class="text-xs text-slate-500 mt-1">已签审锁定 ${lockedCount} 例 · 进行中 ${total - lockedCount} 例</p>
            </div>
            <div class="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center text-2xl">👥</div>
          </div>

          <div class="bg-white rounded-xl p-5 border border-amber-200 shadow-sm flex items-center justify-between cursor-pointer hover:border-amber-400 transition"
               onclick="App.state.reminderModalOpen=true;App.render()">
            <div>
              <p class="text-xs font-bold text-amber-800 uppercase">第3 / 7 / 30 / 90天近期采集提醒</p>
              <p class="text-3xl font-bold text-amber-600 mt-1">${dueReminders.length} <span class="text-sm font-normal text-slate-500">项待急办</span></p>
              <p class="text-xs text-amber-700 mt-1">按首次录入负责人账号精准提醒 · 点击查看</p>
            </div>
            <div class="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-2xl">⏰</div>
          </div>

          <div class="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p class="text-xs font-medium text-slate-500 uppercase">确诊卒中相关性肺炎 (SAP)</p>
              <p class="text-3xl font-bold text-rose-600 mt-1">${sapCount} <span class="text-sm font-normal text-slate-500">例 (${total ? Math.round((sapCount / total) * 100) : 0}%)</span></p>
              <p class="text-xs text-rose-500 mt-1">自动激活 V2-3 肺感染专表与 PSI 评分</p>
            </div>
            <div class="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center text-2xl">🫁</div>
          </div>

          <div class="bg-white rounded-xl p-5 border border-teal-200 shadow-sm flex items-center justify-between cursor-pointer hover:border-teal-400 transition"
               onclick="App.state.importModalOpen=true;App.render()">
            <div>
              <p class="text-xs font-bold text-teal-800 uppercase">AI 辅助数据整理与一键导入</p>
              <p class="text-lg font-bold text-teal-700 mt-1">下载 CSV / JSON 模版 →</p>
              <p class="text-xs text-teal-600 mt-1">支持本地 AI 整理病历后一键批量导入</p>
            </div>
            <div class="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center text-2xl">📥</div>
          </div>
        </div>

        <!-- 入组后第3天、第7天、第30天、第90天数据采集时间节点提醒看板（展示首次录入负责人账号与负责人姓名） -->
        <div class="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden">
          <div class="px-4 sm:px-6 py-3.5 bg-gradient-to-r from-amber-50 via-orange-50/40 to-white border-b border-amber-200 flex flex-wrap items-center justify-between gap-3">
            <div class="flex items-center gap-2.5">
              <span class="text-lg">⏰</span>
              <div>
                <h2 class="text-sm sm:text-base font-bold text-slate-900">入组后关键时间节点（第3天 / 第7天 / 第30天 / 第90天）数据采集提醒</h2>
                <p class="text-xs text-slate-500">每例患者与首次录入账号自动绑定，系统根据入组日期推算节点并向对应<strong>负责人账号及姓名</strong>发出采集提醒</p>
              </div>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <select onchange="App.state.reminderOwnerFilter=this.value;App.render()"
                class="border border-amber-300 bg-white rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none">
                <option value="all" ${this.state.reminderOwnerFilter === "all" ? "selected" : ""}>👥 全部负责人账号 (${pendingReminders.length})</option>
                <option value="${curUser.account}" ${this.state.reminderOwnerFilter === curUser.account ? "selected" : ""}>
                  👤 仅看当前账号: ${curUser.name} (${curUser.account})
                </option>
                ${(window.EDC_USERS || [])
                  .filter(u => u.account !== curUser.account)
                  .map(
                    u => `
                  <option value="${u.account}" ${this.state.reminderOwnerFilter === u.account ? "selected" : ""}>
                    负责人: ${u.name} (${u.account})
                  </option>
                `
                  )
                  .join("")}
              </select>
              <button onclick="App.state.reminderModalOpen=true;App.render()"
                class="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold transition">
                查看全部日程 (${allReminders.length})
              </button>
            </div>
          </div>

          <div class="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            ${
              filteredPending.length === 0
                ? `<div class="col-span-3 py-6 text-center text-slate-400 text-xs">🎉 当前筛选条件下，所有第3天、第7天、第30天、第90天数据采集均已完成！</div>`
                : filteredPending
                    .slice(0, 6)
                    .map(
                      r => `
                  <div class="p-3.5 rounded-xl border ${
                    r.status === "overdue"
                      ? "bg-rose-50/60 border-rose-200"
                      : r.status === "today"
                      ? "bg-amber-50/70 border-amber-300"
                      : "bg-slate-50/70 border-slate-200"
                  } flex flex-col justify-between gap-2.5">
                    <div class="flex items-start justify-between gap-2">
                      <div>
                        <div class="flex items-center gap-1.5 flex-wrap">
                          <span class="font-mono font-bold text-xs px-1.5 py-0.5 rounded bg-slate-800 text-white">${r.subjectId}</span>
                          <span class="font-bold text-sm text-slate-900">${r.subjectInitials} (${r.subjectName || "匿名"})</span>
                          <span class="text-xs font-bold text-sky-700">· ${r.code} ${r.label}</span>
                        </div>
                        <p class="text-[11px] text-slate-500 mt-1">
                          入组日期：<span class="font-mono">${r.enrollDate}</span> → <strong>应采集日：<span class="font-mono text-slate-800">${r.dueDate}</span></strong>
                        </p>
                      </div>
                      <span class="px-2 py-0.5 rounded-full text-[11px] border shrink-0 ${r.badgeCls}">
                        ${r.statusText}
                      </span>
                    </div>

                    <!-- 醒目展示绑定的首次录入负责人姓名与负责人账号 -->
                    <div class="flex items-center justify-between bg-sky-50/90 border border-sky-200/80 px-2.5 py-1.5 rounded-lg text-xs">
                      <div class="flex items-center gap-1.5 text-slate-800">
                        <span>👤</span>
                        <span>负责人姓名：<strong class="text-slate-900">${r.ownerName}</strong></span>
                      </div>
                      <span class="font-mono text-[11px] px-1.5 py-0.5 rounded bg-white text-sky-800 border border-sky-200 font-semibold">
                        账号: ${r.ownerAccount}
                      </span>
                    </div>

                    <div class="text-[11px] text-slate-600 bg-white/80 px-2.5 py-1.5 rounded border border-slate-200/70">
                      📋 <strong>待采内容：</strong>${r.tasks}
                    </div>
                    <div class="flex items-center justify-end">
                      <button onclick="App.selectVisit('${r.visitId}', '${r.subjectId}')"
                        class="text-xs font-bold text-sky-700 hover:text-sky-900 flex items-center gap-1">
                        立即去填报 ${r.code} 表单 →
                      </button>
                    </div>
                  </div>
                `
                    )
                    .join("")
            }
          </div>
        </div>

        <!-- 受试者全访视进度矩阵 -->
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div class="px-4 sm:px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/60">
            <div>
              <h2 class="text-base font-bold text-slate-800">受试者访视采集状态矩阵 (Subject Visit Matrix)</h2>
              <p class="text-xs text-slate-500 mt-0.5">矩阵内直接展示每例受试者绑定的首次录入负责人（姓名/账号）及第3/7/30/90天目标采集日期与提醒状态</p>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <button onclick="App.state.importModalOpen=true;App.render()"
                class="px-3 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold shadow-xs transition">
                📥 导入CSV/JSON与模版
              </button>
              <button onclick="App.state.newSubjectModalOpen=true;App.render()"
                class="px-3.5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-xs transition">
                ＋ 新增入组受试者
              </button>
              ${
                this.state.subjects.length > 0
                  ? `
                <button onclick="App.handleClearAllSubjects()"
                  class="px-3 py-2 rounded-lg bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 text-xs font-medium transition">
                  🗑 清空全部病例
                </button>
              `
                  : ""
              }
            </div>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="bg-slate-100/80 text-slate-600 text-xs border-b border-slate-200">
                  <th class="py-3 px-4 font-semibold">患者编号</th>
                  <th class="py-3 px-3 font-semibold">姓名缩写</th>
                  <th class="py-3 px-3 font-semibold">首次录入负责人<br><span class="font-normal text-[11px] text-slate-400">负责人姓名 / 绑定账号</span></th>
                  <th class="py-3 px-3 font-semibold">性别/年龄</th>
                  <th class="py-3 px-3 font-semibold">入组日期</th>
                  <th class="py-3 px-3 font-semibold text-center">V1 基线<br><span class="font-normal text-[11px] text-slate-400">-1~0天</span></th>
                  <th class="py-3 px-3 font-semibold text-center bg-sky-50/50">V2-1 (第3天)<br><span class="font-normal text-[11px] text-sky-600">⏰ +3天提醒</span></th>
                  <th class="py-3 px-3 font-semibold text-center bg-sky-50/50">V2-2 (第7天)<br><span class="font-normal text-[11px] text-sky-600">⏰ +7天提醒</span></th>
                  <th class="py-3 px-3 font-semibold text-center">V2-3 (SAP)<br><span class="font-normal text-[11px] text-rose-500">肺感染专表</span></th>
                  <th class="py-3 px-3 font-semibold text-center">V3<br><span class="font-normal text-[11px] text-slate-400">出院时</span></th>
                  <th class="py-3 px-3 font-semibold text-center bg-sky-50/50">V4 (第30天)<br><span class="font-normal text-[11px] text-sky-600">⏰ +30天提醒</span></th>
                  <th class="py-3 px-3 font-semibold text-center bg-sky-50/50">V5 (第90天)<br><span class="font-normal text-[11px] text-sky-600">⏰ +90天提醒</span></th>
                  <th class="py-3 px-3 font-semibold text-center">PI签审状态</th>
                  <th class="py-3 px-4 font-semibold text-right">操作</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-200 text-sm">
                ${
                  this.state.subjects.length === 0
                    ? `<tr>
                        <td colspan="14" class="py-12 text-center text-slate-400 text-xs">
                          当前系统暂无受试者数据。请点击右上角 <strong class="text-sky-700">「＋ 新增入组受试者」</strong> 或 <strong class="text-teal-700">「📥 导入CSV/JSON与模版」</strong> 录入患者。
                        </td>
                      </tr>`
                    : this.state.subjects
                        .map(s => {
                          const msMap = {};
                          this.getSubjectMilestones(s).forEach(m => {
                            msMap[m.visitId] = m;
                          });
                          const ownerAcct = s.ownerAccount || "dr_liguiwei";
                          const ownerName = s.ownerName || s.investigator || "李桂伟";

                          const renderMilestoneCell = visitId => {
                            const m = msMap[visitId];
                            if (!m) return "";
                            return `
                              <button onclick="App.selectVisit('${visitId}', '${s.id}')"
                                title="提醒负责人：${ownerName} (${ownerAcct})"
                                class="inline-flex flex-col items-center gap-0.5 px-2.5 py-1 rounded-lg border text-xs transition hover:shadow-xs ${m.badgeCls}">
                                <span>${m.done ? "✓ 已完成" : m.statusText}</span>
                                <span class="text-[10px] font-mono opacity-80">${m.dueDate.slice(5)}</span>
                              </button>
                            `;
                          };

                          const renderSimpleDot = (visitId, done, specialSap = false) => {
                            let cls = "bg-slate-100 text-slate-500 border-slate-200";
                            let label = "待填";
                            if (specialSap) {
                              if (s.sapConfirmed) {
                                cls = "bg-rose-600 text-white border-rose-600";
                                label = "确诊SAP";
                              } else {
                                cls = "bg-slate-100 text-slate-400 border-slate-200";
                                label = "未触发";
                              }
                            } else if (done) {
                              cls = "bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold";
                              label = "✓ 已完成";
                            }
                            return `
                              <button onclick="App.selectVisit('${visitId}', '${s.id}')"
                                class="px-2.5 py-1 rounded-lg border text-xs ${cls} hover:opacity-90 transition">
                                ${label}
                              </button>
                            `;
                          };

                          return `
                            <tr class="hover:bg-sky-50/40 transition">
                              <td class="py-3.5 px-4 font-bold text-sky-800 font-mono">${s.id}</td>
                              <td class="py-3.5 px-3">
                                <div class="font-semibold text-slate-800 font-mono">${s.initials}</div>
                                <div class="text-xs text-slate-400">${s.name || "未填姓名"}</div>
                              </td>
                              <td class="py-3.5 px-3">
                                <div class="font-semibold text-slate-800 text-xs">👤 ${ownerName}</div>
                                <div class="text-[11px] font-mono text-sky-700">${ownerAcct}</div>
                              </td>
                              <td class="py-3.5 px-3 text-slate-600">${s.v1?.demographics?.gender || "-"} / ${s.v1?.demographics?.age || "-"}岁</td>
                              <td class="py-3.5 px-3 text-xs font-mono text-slate-700 font-semibold">${s.startDate || "-"}</td>
                              <td class="py-3.5 px-3 text-center">${renderSimpleDot("V1", !!s.v1?.consentDate)}</td>
                              <td class="py-3.5 px-3 text-center bg-sky-50/20">${renderMilestoneCell("V2_1")}</td>
                              <td class="py-3.5 px-3 text-center bg-sky-50/20">${renderMilestoneCell("V2_2")}</td>
                              <td class="py-3.5 px-3 text-center">${renderSimpleDot("V2_3", s.sapConfirmed, true)}</td>
                              <td class="py-3.5 px-3 text-center">${renderSimpleDot("V3", !!s.v3?.outcome?.status)}</td>
                              <td class="py-3.5 px-3 text-center bg-sky-50/20">${renderMilestoneCell("V4")}</td>
                              <td class="py-3.5 px-3 text-center bg-sky-50/20">${renderMilestoneCell("V5")}</td>
                              <td class="py-3.5 px-3 text-center">
                                <span class="px-2.5 py-1 rounded-full text-xs font-medium ${
                                  s.locked
                                    ? "bg-slate-800 text-white"
                                    : s.summary?.piSignature
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-slate-100 text-slate-600"
                                }">
                                  ${s.locked ? "🔒 已锁定" : s.summary?.piSignature ? "已签审" : "录入中"}
                                </span>
                              </td>
                              <td class="py-3.5 px-4 text-right space-x-1 whitespace-nowrap">
                                <button onclick="App.selectVisit('V1', '${s.id}')"
                                  class="text-xs font-semibold text-sky-600 hover:text-sky-800 px-2.5 py-1 rounded border border-sky-200 bg-sky-50">
                                  填报 →
                                </button>
                                <button onclick="App.state.currentSubjectId='${s.id}';App.state.docxPreviewModalOpen=true;App.render()"
                                  title="预览并导出该患者的《病例报告表.docx》"
                                  class="text-xs font-semibold text-slate-700 hover:text-slate-900 px-2 py-1 rounded border border-slate-300 bg-white">
                                  📄 Word
                                </button>
                                <button onclick="App.deleteSubject('${s.id}')"
                                  title="删除该受试者记录"
                                  class="text-xs font-semibold text-rose-600 hover:text-rose-800 px-2 py-1 rounded border border-rose-200 bg-rose-50/60">
                                  删除
                                </button>
                              </td>
                            </tr>
                          `;
                        })
                        .join("")
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  },

  // 2. 核心 eCRF 编辑器视图（宽屏下左右两栏独立滚动条；窄屏下单栏可折叠导航并自动跳转至内容区）
  renderCRFEditorView(subj) {
    if (!subj) {
      return `
        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-10 text-center max-w-2xl mx-auto my-8 space-y-4">
          <div class="w-16 h-16 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center text-3xl mx-auto">📋</div>
          <h2 class="text-lg font-bold text-slate-800">当前系统暂无受试者数据</h2>
          <p class="text-xs sm:text-sm text-slate-500 leading-relaxed">
            所有历史测试/示范数据已清空。您可以点击下方按钮手动新增首位入组受试者，或使用 AI 本地整理病历后通过 JSON / CSV 一键批量导入。
          </p>
          <div class="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button onclick="App.state.newSubjectModalOpen=true;App.render()"
              class="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs sm:text-sm font-bold shadow transition cursor-pointer">
              ＋ 新增入组受试者
            </button>
            <button onclick="App.state.importModalOpen=true;App.render()"
              class="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs sm:text-sm font-bold shadow transition cursor-pointer">
              📥 导入 CSV / JSON 与下载 AI 模版
            </button>
          </div>
        </div>
      `;
    }
    const visits = window.CRF_CONFIG.visits;
    const curVisit = visits.find(v => v.id === this.state.currentVisitId) || visits[0];
    const subjMilestones = this.getSubjectMilestones(subj);
    const msByVisitId = {};
    subjMilestones.forEach(m => {
      msByVisitId[m.visitId] = m;
    });
    const ownerAcct = subj.ownerAccount || "dr_liguiwei";
    const ownerName = subj.ownerName || subj.investigator || "李桂伟";

    return `
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5 items-start edc-split-layout">
        <!-- 左栏（宽屏独立滚动，窄屏支持展开/折叠） -->
        <aside id="edc-left-pane" class="lg:col-span-3 space-y-3 edc-pane-scroll lg:pr-1 no-print">
          <!-- 当前受试者切换卡片 -->
          <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-3.5 space-y-2.5">
            <div class="flex items-center justify-between">
              <label class="text-xs font-bold text-slate-500 uppercase tracking-wider">当前受试者切换</label>
              <div class="flex items-center gap-2">
                <button onclick="App.state.docxPreviewModalOpen=true;App.render()" class="text-xs text-slate-700 hover:text-sky-700 font-semibold">
                  📄 导出Word
                </button>
                <button onclick="App.state.newSubjectModalOpen=true;App.render()" class="text-xs text-sky-600 hover:underline font-semibold">
                  + 新增病例
                </button>
              </div>
            </div>
            <select onchange="App.state.currentSubjectId=this.value;App._scrollRightToTop=true;App.render()"
              class="w-full border border-slate-300 rounded-lg px-2.5 py-2 text-xs sm:text-sm font-semibold text-slate-800 bg-slate-50 focus:outline-none focus:border-sky-600">
              ${this.state.subjects
                .map(
                  s => `
                <option value="${s.id}" ${s.id === subj.id ? "selected" : ""}>
                  [${s.id}] ${s.initials} (${s.name || "匿名"}) · 负责人:${s.ownerName || "李桂伟"}(${s.ownerAccount || "dr_liguiwei"})
                </option>
              `
                )
                .join("")}
            </select>

            <!-- 首次录入绑定账号与负责人信息 -->
            <div class="p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
              <div>
                <span class="text-[11px] text-slate-400">首次录入负责人：</span>
                <strong class="text-slate-800">👤 ${ownerName}</strong>
                <span class="font-mono text-sky-700">(${ownerAcct})</span>
              </div>
              <span class="px-1.5 py-0.5 rounded bg-sky-100 text-sky-800 text-[10px] font-semibold">提醒绑定</span>
            </div>

            <!-- 窄屏(<1024px)专用：醒目高亮的展开/折叠访视导航按钮 -->
            <div class="lg:hidden pt-1.5">
              <button onclick="App.toggleMobileNav()"
                class="w-full py-3 px-3.5 rounded-xl bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-bold flex items-center justify-between shadow-lg ring-2 ring-sky-300/80 transition cursor-pointer">
                <span class="truncate flex items-center gap-1.5">
                  <span class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white text-sky-700 font-extrabold text-xs shrink-0">☰</span>
                  <span class="truncate">当前表单：${curVisit.code} · ${curVisit.name}</span>
                </span>
                <span class="px-2.5 py-1 rounded-lg bg-amber-400 text-slate-950 font-extrabold text-xs shrink-0 ml-2 shadow-xs">
                  ${this.state.mobileNavOpen ? "🔼 收起目录" : "📂 点击展开访视目录"}
                </span>
              </button>
            </div>
          </div>

          <!-- 导航主体区：窄屏下默认折叠（点击后自动收起并跳至下方内容），宽屏下常驻并独立滚动 -->
          <div class="${this.state.mobileNavOpen ? "block" : "hidden"} lg:block space-y-3">
            <!-- 当前患者：第3天、第7天、第30天、第90天采集时间节点提醒 -->
            <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-3.5 space-y-2">
              <div class="flex items-center justify-between text-xs">
                <span class="font-bold text-slate-700">⏰ 关键采集时间节点提醒</span>
                <span class="text-[11px] text-slate-400 font-mono">入组:${subj.startDate}</span>
              </div>
              <div class="grid grid-cols-2 gap-1.5">
                ${subjMilestones
                  .map(
                    m => `
                  <button onclick="App.selectVisit('${m.visitId}')"
                    title="提醒负责人：${m.ownerName} (账号: ${m.ownerAccount})"
                    class="p-2 rounded-lg border text-left transition hover:shadow-xs ${
                      this.state.currentVisitId === m.visitId ? "ring-2 ring-sky-600 " : ""
                    }${m.badgeCls}">
                    <div class="flex items-center justify-between text-[11px] font-bold">
                      <span>${m.label.replace("数据采集", "").replace("随访采集", "")} (${m.code})</span>
                      <span>${m.done ? "✓" : "⏰"}</span>
                    </div>
                    <div class="text-[11px] font-mono mt-0.5">${m.dueDate}</div>
                    <div class="text-[10px] opacity-90 truncate">${m.statusText}</div>
                    <div class="text-[10px] opacity-80 truncate mt-0.5 font-mono">👤 ${m.ownerName}(${m.ownerAccount})</div>
                  </button>
                `
                  )
                  .join("")}
              </div>

              <!-- SAP 感染路径状态提示 -->
              <div class="p-2.5 rounded-lg text-xs ${
                subj.sapConfirmed ? "bg-rose-50 border border-rose-200 text-rose-800" : "bg-emerald-50 border border-emerald-200 text-emerald-800"
              }">
                <div class="flex items-center justify-between font-bold">
                  <span>${subj.sapConfirmed ? "⚠️ 已确诊肺部感染 (SAP)" : "✓ 未感染常规随访路径"}</span>
                  <button onclick="App.selectVisit('V2_3')" class="underline text-[11px]">
                    ${subj.sapConfirmed ? "查看V2-3专表" : "去判定"}
                  </button>
                </div>
                <p class="mt-1 text-[11px] opacity-90 leading-relaxed">
                  ${window.CRF_CONFIG.project.sapRuleNote}
                </p>
              </div>
            </div>

            <!-- 访视与模块时间轴导航 -->
            <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div class="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <span class="text-xs font-bold text-slate-700 uppercase tracking-wider">CRF 访视与表单导航</span>
                <span class="text-[11px] text-slate-400">点击自动回顶</span>
              </div>
              <div class="divide-y divide-slate-100">
                ${visits
                  .map(v => {
                    const isActive = this.state.currentVisitId === v.id;
                    const isSapVisit = v.id === "V2_3";
                    const ms = msByVisitId[v.id];
                    return `
                      <button onclick="App.selectVisit('${v.id}')"
                        class="w-full text-left px-3.5 py-2.5 flex items-center justify-between gap-2 transition ${
                          isActive
                            ? "visit-step active"
                            : isSapVisit && subj.sapConfirmed
                            ? "bg-rose-50/70 hover:bg-rose-100/60 text-rose-900"
                            : "hover:bg-slate-50 text-slate-700"
                        }">
                        <div class="min-w-0 flex-1">
                          <div class="flex items-center justify-between gap-1.5">
                            <div class="flex items-center gap-1.5 truncate">
                              <span class="text-xs font-bold px-1.5 py-0.5 rounded ${
                                isActive
                                  ? "bg-white/20 text-white"
                                  : isSapVisit
                                  ? "bg-rose-100 text-rose-700"
                                  : "bg-slate-100 text-slate-600"
                              }">${v.code}</span>
                              <span class="text-sm font-semibold truncate">${v.name}</span>
                            </div>
                            ${
                              ms
                                ? `<span class="text-[10px] px-1.5 py-0.5 rounded shrink-0 ${
                                    isActive
                                      ? "bg-white/20 text-white"
                                      : ms.done
                                      ? "bg-emerald-100 text-emerald-700"
                                      : ms.status === "overdue"
                                      ? "bg-rose-100 text-rose-700 font-bold"
                                      : ms.status === "today"
                                      ? "bg-amber-100 text-amber-800 font-bold"
                                      : "bg-slate-100 text-slate-500"
                                  }">${ms.done ? "已采" : ms.dueDate.slice(5)}</span>`
                                : ""
                            }
                          </div>
                          <p class="text-[11px] mt-0.5 truncate ${isActive ? "text-sky-100" : "text-slate-400"}">${v.timeWindow}</p>
                        </div>
                        <span class="text-xs ${isActive ? "text-white" : "text-slate-300"}">❯</span>
                      </button>
                    `;
                  })
                  .join("")}
              </div>
            </div>
          </div>
        </aside>

        <!-- 右栏：CRF 标准纸质表头 + 当前访视表单内容区（宽屏下独立滚动，点击左栏时自动滚回顶部） -->
        <section id="edc-right-pane" class="lg:col-span-9 space-y-4 edc-pane-scroll lg:pl-1 print-container">
          ${this.renderCRFPageHeader(subj)}
          <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-6">
            ${this.renderActiveVisitContent(subj)}
          </div>
          ${this.renderCRFPageFooter(subj)}
        </section>
      </div>
    `;
  },

  // 严格复刻纸质版 CRF 每页顶部的受试者表头 + 首次录入绑定账号 + 缺失值编码辅助栏
  renderCRFPageHeader(subj) {
    const curVisit = window.CRF_CONFIG.visits.find(v => v.id === this.state.currentVisitId) || window.CRF_CONFIG.visits[0];
    const ownerAcct = subj.ownerAccount || "dr_liguiwei";
    const ownerName = subj.ownerName || subj.investigator || "李桂伟";
    return `
      <div class="bg-white rounded-xl border-2 border-slate-800 shadow-sm p-3.5 sm:p-4">
        <div class="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200">
          <div>
            <span class="text-xs font-semibold text-sky-700 uppercase tracking-wider">
              ${window.CRF_CONFIG.project.title}
            </span>
            <h2 class="text-base sm:text-xl font-bold text-slate-900 mt-0.5">
              ${curVisit.code} · ${curVisit.name}
              <span class="text-xs font-normal text-slate-500 ml-1 sm:ml-2">(${curVisit.timeWindow})</span>
            </h2>
          </div>

          <div class="flex flex-wrap items-center gap-1.5 sm:gap-2 no-print">
            <span class="px-2.5 py-1 rounded-lg bg-sky-50 border border-sky-200 text-xs text-slate-700">
              👤 负责人：<strong class="text-slate-900">${ownerName}</strong> <span class="font-mono text-sky-700">(${ownerAcct})</span>
            </span>
            <button onclick="App.state.auditModalOpen=true;App.render()"
              class="px-2.5 py-1 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-xs font-medium text-slate-700 flex items-center gap-1 cursor-pointer">
              🕒 稽查 (<span id="edc-audit-btn-count">${(subj.auditLogs || []).length}</span>)
            </button>
            <span class="px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 ${
              subj.locked
                ? "bg-slate-800 text-white"
                : "bg-emerald-50 text-emerald-700 border border-emerald-200"
            }">
              ${subj.locked ? "🔒 已锁定" : "📝 采集中"}
            </span>
          </div>
        </div>

        <!-- 标准页眉要素 + 首次录入绑定负责人（账号/姓名） -->
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-3 text-xs">
          <div>
            <label class="text-slate-500 block mb-1">研究中心号 (□□)</label>
            <input type="text" maxlength="2" value="${subj.centerId || "01"}"
              onchange="App.setByPath('centerId', this.value, '研究中心号', true)"
              class="crf-input font-mono font-bold text-center" />
          </div>
          <div>
            <label class="text-slate-500 block mb-1">患者编号 (□□□)</label>
            <input type="text" maxlength="3" value="${subj.id}" readonly
              class="crf-input font-mono font-bold text-center bg-slate-100" />
          </div>
          <div>
            <label class="text-slate-500 block mb-1">患者姓名 (溯源用)</label>
            <input type="text" value="${subj.name || ""}" placeholder="输入汉字姓名"
              onchange="App.setByPath('name', this.value, '患者姓名')"
              class="crf-input" />
          </div>
          <div>
            <label class="text-slate-500 block mb-1" title="三字填首字母；两字加填第二字第二字母；四字填前三字首字母">姓名拼音缩写 (□□□)</label>
            <input type="text" maxlength="3" value="${subj.initials || ""}"
              onchange="App.setByPath('initials', this.value.toUpperCase(), '姓名拼音缩写')"
              class="crf-input font-mono font-bold uppercase text-center" />
          </div>
          <div>
            <label class="text-slate-500 block mb-1" title="修改入组日期将自动重算第3/7/30/90天提醒时间">研究开始(入组)日期</label>
            <input type="date" value="${subj.startDate || ""}"
              onchange="App.setByPath('startDate', this.value, '研究开始日期')"
              class="crf-input" />
          </div>
          <div>
            <label class="text-slate-500 block mb-1" title="与首次录入账号自动绑定，用于随访节点提醒">首次录入绑定负责人</label>
            <input type="text" value="${ownerName} (${ownerAcct})" readonly
              class="crf-input bg-slate-100 font-semibold text-slate-700" />
          </div>
        </div>

        <!-- 填表规范快捷提醒条 -->
        <div class="mt-2.5 pt-2 border-t border-dashed border-slate-200 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 no-print">
          <div>
            📌 <strong>CRF 缺失值标准代码</strong>：不适用填 <code class="px-1 py-0.5 bg-slate-100 rounded text-slate-700 font-mono">NA</code>，未检查填 <code class="px-1 py-0.5 bg-slate-100 rounded text-slate-700 font-mono">ND</code>，无法获得/不详填 <code class="px-1 py-0.5 bg-slate-100 rounded text-slate-700 font-mono">UNK</code>。若选项不符勾选<strong>“其他”</strong>即可填写具体说明。
          </div>
          <div class="text-emerald-700 font-medium">✓ 所有修改自动保存并记录稽查轨迹</div>
        </div>
      </div>
    `;
  },

  // 严格复刻纸质版 CRF 每页底部的签名栏
  renderCRFPageFooter(subj) {
    return `
      <div class="bg-white rounded-xl border border-slate-300 px-4 sm:px-5 py-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
        <div class="flex flex-wrap items-center gap-3">
          <div class="flex items-center gap-2">
            <span class="font-semibold text-slate-800">本页研究医生签名：</span>
            <input type="text" value="${subj.investigator || subj.ownerName || ""}"
              onchange="App.setByPath('investigator', this.value, '研究医生签名', true)"
              class="border-b border-slate-400 px-2 py-0.5 font-semibold text-slate-900 focus:outline-none focus:border-sky-600 w-32" />
          </div>
          <span class="hidden sm:inline text-slate-300">|</span>
          <span>首次录入绑定账号：<strong class="font-mono text-slate-800">${subj.ownerAccount || "dr_liguiwei"}</strong> (${subj.ownerName || "李桂伟"})</span>
        </div>
        <div class="flex items-center gap-2">
          <span>签署日期：</span>
          <span class="font-mono font-semibold text-slate-800">${window.getTodayDateStr()}</span>
        </div>
      </div>
    `;
  },

  // 根据当前选中的访视分发渲染
  renderActiveVisitContent(subj) {
    switch (this.state.currentVisitId) {
      case "FLOWCHART":
        return this.renderFlowchartAndInstructions();
      case "V1":
        return this.renderVisitV1(subj);
      case "V2_1":
        return this.renderVisitV2_1(subj);
      case "V2_2":
        return this.renderVisitV2_2(subj);
      case "V2_3":
        return this.renderVisitV2_3(subj);
      case "V3":
        return this.renderVisitV3(subj);
      case "V4":
        return this.renderVisitFollowup(subj, "v4", "第30天", "截至发病第30天再入院事件");
      case "V5":
        return this.renderVisitFollowup(subj, "v5", "第90天", "发病第31-90天再入院事件");
      case "COMPLICATIONS":
        return this.renderComplicationsSection(subj);
      case "TREATMENT":
        return this.renderTreatmentSection(subj);
      case "AE":
        return this.renderAESection(subj);
      case "SUMMARY":
        return this.renderSummarySection(subj);
      default:
        return this.renderVisitV1(subj);
    }
  },

  // 模块 A：研究流程表与填写说明
  renderFlowchartAndInstructions() {
    return `
      <div class="space-y-6">
        <div class="bg-sky-50/70 border border-sky-200 rounded-xl p-4 space-y-2 text-xs sm:text-sm text-slate-700 leading-relaxed">
          <h3 class="font-bold text-sky-900 text-base">📋 病例报告表（CRF）填写说明</h3>
          <ol class="list-decimal list-inside space-y-1">
            <li>本 CRF 用于研究数据采集；原始病历、检验/检查报告等为源数据。若本 CRF 经方案指定为源文件，应在源文件清单中注明。</li>
            <li>所有适用项目均须填写；不适用填写 <strong>“不适用 (NA)”</strong>，未检查填写 <strong>“未查 (ND)”</strong>，无法获得或不详填写 <strong>“不详 (UNK)”</strong>，并尽可能注明原因。</li>
            <li><strong>患者编号</strong>：填三位数字，如“005”等。<strong>患者姓名拼音缩写</strong>：三字姓名者，只填每个字汉语拼音的第一个字母；两字姓名者，加填第二个汉字汉语拼音的第二个字母；四字姓名者，不填第四个字的汉语拼音第一个字母。</li>
            <li><strong>研究开始日期</strong>：指签署知情同意书日期。<strong>研究结束日期</strong>：指最后一次复诊日期，有随访者应指最后一次随访日期。</li>
            <li class="text-rose-700 font-semibold">${window.CRF_CONFIG.project.sapRuleNote}</li>
          </ol>
        </div>

        <div>
          <h3 class="font-bold text-slate-800 text-base mb-3">🗓 研究流程表 (Study Schedule Matrix)</h3>
          <div class="overflow-x-auto">
            <table class="w-full crf-table text-center">
              <thead>
                <tr>
                  <th class="w-64">评估/采集项目</th>
                  <th class="text-center">V1<br><span class="font-normal text-xs">-1~0天</span></th>
                  <th class="text-center">V2-1<br><span class="font-normal text-xs">住院第3天</span></th>
                  <th class="text-center">V2-2<br><span class="font-normal text-xs">住院第7天</span></th>
                  <th class="text-center bg-rose-50 text-rose-800">V2-3<br><span class="font-normal text-xs">出现肺感染指征</span></th>
                  <th class="text-center">V3<br><span class="font-normal text-xs">出院时</span></th>
                  <th class="text-center">V4<br><span class="font-normal text-xs">第30天</span></th>
                  <th class="text-center">V5<br><span class="font-normal text-xs">第90天</span></th>
                </tr>
              </thead>
              <tbody>
                ${window.CRF_CONFIG.scheduleMatrix
                  .map(
                    row => `
                  <tr>
                    <td class="font-medium text-slate-800 text-left">${row.item}</td>
                    <td class="text-center">${row.v1 ? "●" : ""}</td>
                    <td class="text-center">${row.v2_1 ? "●" : ""}</td>
                    <td class="text-center">${row.v2_2 ? "●" : ""}</td>
                    <td class="text-center bg-rose-50/30 font-bold text-rose-600">${row.v2_3 ? "●" : ""}</td>
                    <td class="text-center">${row.v3 ? "●" : ""}</td>
                    <td class="text-center">${row.v4 ? "●" : ""}</td>
                    <td class="text-center">${row.v5 ? "●" : ""}</td>
                  </tr>
                `
                  )
                  .join("")}
                <tr class="bg-slate-50 font-semibold">
                  <td class="text-left">并发症 / 治疗记录 / 不良事件 / 试验总结</td>
                  <td colspan="7" class="text-center text-sky-700">● 全研究周期持续监测与记录</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  },

  // 全局第3天、第7天、第30天、第90天采集节点提醒中心弹窗（包含负责人账号及负责人姓名）
  renderReminderModal() {
    const all = this.getAllReminders();
    const byStatus = this.state.reminderFilter === "pending" ? all.filter(r => !r.done) : all;
    const list =
      this.state.reminderOwnerFilter === "all"
        ? byStatus
        : byStatus.filter(r => r.ownerAccount === this.state.reminderOwnerFilter);

    return `
      <div class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
        <div class="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-5xl w-full max-h-[88vh] flex flex-col overflow-hidden">
          <div class="px-4 sm:px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
            <div>
              <h3 class="text-sm sm:text-lg font-bold">🔔 入组后关键时间节点（第3天 / 第7天 / 第30天 / 第90天）采集提醒中心</h3>
              <p class="text-xs text-slate-400 mt-0.5">当前系统日期：${window.getTodayDateStr()} · 每位患者与首次录入账号自动绑定，提醒直接关联负责人账号与姓名</p>
            </div>
            <button onclick="App.state.reminderModalOpen=false;App.render()" class="text-slate-400 hover:text-white text-2xl">×</button>
          </div>

          <div class="px-4 sm:px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div class="flex flex-wrap items-center gap-2">
              <button onclick="App.state.reminderFilter='pending';App.render()"
                class="px-3 py-1.5 rounded-lg font-semibold transition ${
                  this.state.reminderFilter === "pending" ? "bg-sky-600 text-white" : "bg-white text-slate-600 border border-slate-300"
                }">
                待采集节点 (${all.filter(r => !r.done).length})
              </button>
              <button onclick="App.state.reminderFilter='all';App.render()"
                class="px-3 py-1.5 rounded-lg font-semibold transition ${
                  this.state.reminderFilter === "all" ? "bg-sky-600 text-white" : "bg-white text-slate-600 border border-slate-300"
                }">
                全部节点记录 (${all.length})
              </button>

              <span class="text-slate-300 mx-1">|</span>
              <span class="text-slate-600 font-semibold">负责人筛选：</span>
              <select onchange="App.state.reminderOwnerFilter=this.value;App.render()"
                class="border border-slate-300 bg-white rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800">
                <option value="all" ${this.state.reminderOwnerFilter === "all" ? "selected" : ""}>全部负责人账号</option>
                ${(window.EDC_USERS || [])
                  .map(
                    u => `
                  <option value="${u.account}" ${this.state.reminderOwnerFilter === u.account ? "selected" : ""}>
                    ${u.name} (账号: ${u.account})
                  </option>
                `
                  )
                  .join("")}
              </select>
            </div>
            <span class="text-slate-500 hidden sm:inline">点击右侧“立即去采集”可直接跳转至对应受试者访视表</span>
          </div>

          <div id="edc-reminder-modal-body" class="p-4 sm:p-6 overflow-y-auto flex-1">
            <div class="overflow-x-auto">
              <table class="w-full crf-table">
                <thead>
                  <tr>
                    <th class="w-20">患者编号</th>
                    <th class="w-28">姓名缩写</th>
                    <th class="w-44">首次录入负责人 (姓名 / 账号)</th>
                    <th class="w-24">入组日期</th>
                    <th class="w-32">采集时间节点</th>
                    <th class="w-24">计划采集日期</th>
                    <th class="w-32">提醒状态</th>
                    <th>本节点需采集内容</th>
                    <th class="w-24 text-center">操作</th>
                  </tr>
                </thead>
                <tbody>
                  ${
                    list.length === 0
                      ? `<tr><td colspan="9" class="text-center py-8 text-slate-400">暂无符合条件的时间节点提醒任务</td></tr>`
                      : list
                          .map(
                            r => `
                        <tr>
                          <td class="font-mono font-bold text-sky-800">${r.subjectId}</td>
                          <td class="font-semibold">${r.subjectInitials} <span class="text-xs text-slate-400">(${r.subjectName || ""})</span></td>
                          <td>
                            <div class="font-bold text-slate-900">👤 ${r.ownerName}</div>
                            <div class="font-mono text-[11px] text-sky-700">账号: ${r.ownerAccount}</div>
                          </td>
                          <td class="font-mono text-xs">${r.enrollDate}</td>
                          <td class="font-bold text-slate-800">${r.code} · ${r.label}</td>
                          <td class="font-mono font-bold text-slate-900">${r.dueDate}</td>
                          <td><span class="px-2 py-0.5 rounded-full text-xs border ${r.badgeCls}">${r.statusText}</span></td>
                          <td class="text-xs text-slate-600 min-w-[200px]">${r.tasks}</td>
                          <td class="text-center">
                            <button onclick="App.state.reminderModalOpen=false;App.selectVisit('${r.visitId}', '${r.subjectId}')"
                              class="px-2.5 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold">
                              ${r.done ? "查看数据" : "立即去采集"}
                            </button>
                          </td>
                        </tr>
                      `
                          )
                          .join("")
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  // ==================== AI 整理与 CSV / JSON 一键导入及标准模版下载弹窗 ====================
  renderImportModal() {
    const curUser = this.state.currentUser || { account: "dr_gaowentao", name: "高文涛" };
    const aiPrompt = window.EDC_API.getAIPromptText(curUser);

    return `
      <div class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
        <div class="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
          <div class="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
            <div>
              <h3 class="text-base sm:text-lg font-bold">📥 数据导入与 AI 本地整理标准模版中心 (CSV / JSON)</h3>
              <p class="text-xs text-slate-400 mt-0.5">支持数据录入员下载标准模版、使用 AI 整理病历后一键批量导入系统（导入时自动顺位生成患者编号并绑定当前登录账号：${curUser.name} ${curUser.account}）</p>
            </div>
            <button onclick="App.state.importModalOpen=false;App.render()" class="text-slate-400 hover:text-white text-2xl">×</button>
          </div>

          <div id="edc-import-modal-body" class="p-5 overflow-y-auto space-y-5 flex-1 text-xs">
            <!-- 第一步：下载模版与复制 AI 提示词 -->
            <div class="bg-teal-50/70 border border-teal-200 rounded-xl p-4 space-y-3">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <h4 class="font-bold text-sm text-teal-950">第一步：下载标准导入模版 & 复制 AI 病历整理提示词</h4>
                <span class="px-2 py-0.5 rounded bg-teal-600 text-white text-[11px] font-semibold">推荐工作流</span>
              </div>
              <p class="text-slate-600 leading-relaxed">
                您可以先下载下方 <strong>JSON 标准模版</strong>（包含全部访视、中医四诊、24项检验与量表完整字段）或 <strong>CSV 宽表模版</strong>（兼容 Excel），连同出院小结/住院病历发给本地或在线 AI 工具整理后直接导入。
              </p>
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <button type="button" onclick="window.EDC_API.downloadJSONTemplate(App.state.currentUser);App.showToast('已下载 JSON 标准导入模版')"
                  class="py-2.5 px-3 rounded-xl bg-white hover:bg-teal-50 text-teal-800 border border-teal-300 font-bold flex items-center justify-center gap-1.5 shadow-2xs transition">
                  📄 下载 JSON 标准模版
                </button>
                <button type="button" onclick="window.EDC_API.downloadCSVTemplate(App.state.currentUser);App.showToast('已下载 CSV 宽表导入模版')"
                  class="py-2.5 px-3 rounded-xl bg-white hover:bg-teal-50 text-teal-800 border border-teal-300 font-bold flex items-center justify-center gap-1.5 shadow-2xs transition">
                  📊 下载 CSV 宽表模版
                </button>
                <button type="button" onclick="navigator.clipboard.writeText(document.getElementById('edc-ai-prompt-box').value);App.showToast('已复制 AI 病历整理提示词！可直接粘贴给 AI')"
                  class="py-2.5 px-3 rounded-xl bg-teal-700 hover:bg-teal-600 text-white font-bold flex items-center justify-center gap-1.5 shadow-2xs transition">
                  🤖 复制 AI 整理提示词
                </button>
              </div>
              <div>
                <label class="text-[11px] font-semibold text-teal-800 block mb-1">附：AI 病历提取标准提示词（可复制发给 DeepSeek / ChatGPT / Kimi / 本地大模型）：</label>
                <textarea id="edc-ai-prompt-box" rows="3" readonly class="crf-input font-mono text-[11px] bg-white/80">${aiPrompt}</textarea>
              </div>
            </div>

            <!-- 第二步：上传 CSV / JSON 文件一键导入 -->
            <div class="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <h4 class="font-bold text-sm text-slate-900">第二步（方式 A）：选择整理好的本地 CSV 或 JSON 文件一键导入</h4>
              <div class="flex flex-wrap items-center gap-3">
                <input id="edc-import-file-input" type="file" accept=".json,.csv,text/csv,application/json"
                  onchange="App.handleFileImport(this)"
                  class="block w-full sm:w-auto text-xs text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-sky-600 file:text-white hover:file:bg-sky-500 cursor-pointer" />
                <span class="text-slate-400 text-[11px]">选择文件后将自动解析并导入受试者列表</span>
              </div>
            </div>

            <!-- 第三步：或者直接粘贴 AI 输出的 JSON / CSV 文本一键导入 -->
            <div class="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <div class="flex items-center justify-between">
                <h4 class="font-bold text-sm text-slate-900">第二步（方式 B）：直接粘贴 AI 生成的 JSON 或 CSV 文本一键导入</h4>
                <button type="button" onclick="App.handleTextImport()"
                  class="px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold shadow-xs">
                  ⚡ 立即解析并导入粘贴内容
                </button>
              </div>
              <textarea id="edc-import-paste-box" rows="6"
                placeholder='在此直接粘贴 AI 生成的 JSON 代码块（如 { "name": "王五", "initials": "WWU", ... }）或 CSV 文本...'
                class="crf-input font-mono text-xs"></textarea>
            </div>
          </div>

          <div class="px-5 py-3 bg-slate-100 border-t border-slate-200 text-xs text-slate-500">
            提示：导入时患者编号将按当前已入组患者顺位自动生成三位数字（如 001、005...），并自动匹配当前系统登录账号 (${curUser.name} / ${curUser.account}) 作为首次录入负责人。
          </div>
        </div>
      </div>
    `;
  },

  handleFileImport(fileInput) {
    const file = fileInput?.files?.[0];
    if (!file) return;
    const isCsv = file.name.toLowerCase().endsWith(".csv");
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const text = e.target.result;
        const res = window.EDC_API.importDataText(text, isCsv ? "csv" : "json", this.state.subjects, this.state.currentUser);
        this.state.currentSubjectId = res.firstId;
        this.state.importModalOpen = false;
        this._scrollRightToTop = true;
        this.showToast(`✓ 成功导入 ${res.total} 例患者数据（新增 ${res.addedCount} 例，更新 ${res.updatedCount} 例）！`);
        this.render();
      } catch (err) {
        alert("导入失败：" + (err.message || err));
      }
    };
    reader.readAsText(file, "UTF-8");
  },

  handleTextImport() {
    const box = document.getElementById("edc-import-paste-box");
    const text = box ? box.value : "";
    try {
      const res = window.EDC_API.importDataText(text, "auto", this.state.subjects, this.state.currentUser);
      this.state.currentSubjectId = res.firstId;
      this.state.importModalOpen = false;
      this._scrollRightToTop = true;
      this.showToast(`✓ 成功导入 ${res.total} 例患者数据（新增 ${res.addedCount} 例，更新 ${res.updatedCount} 例）！`);
      this.render();
    } catch (err) {
      alert("解析导入内容失败：" + (err.message || err));
    }
  },

  // ==================== 选中病人的《病例报告表.docx》预览与下载弹窗 ====================
  renderDocxPreviewModal(subj) {
    if (!subj) return "";
    return `
      <div class="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
        <div class="bg-slate-100 rounded-2xl shadow-2xl border border-slate-300 max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden">
          <!-- 顶部控制栏 -->
          <div class="px-4 sm:px-6 py-4 bg-slate-900 text-white flex items-center justify-between gap-3 no-print">
            <div class="min-w-0">
              <h3 class="text-sm sm:text-lg font-bold">📄 患者 [${subj.id}] ${subj.name || subj.initials} — 《病例报告表.docx》导出预览</h3>
              <p class="text-xs text-slate-400 mt-0.5">格式严格对应原《病例报告表.docx》，已将该受试者当前填报的所有勾选项 (☑/□)、检验值、量表分及签名完整填入表内</p>
            </div>
            <div class="flex items-center gap-3 shrink-0">
              <button type="button" onclick="window.DOCX_EXPORTER.downloadFilledDocx(App.getCurrentSubject());App.showToast('已生成并下载填好数据的《病例报告表_' + App.getCurrentSubject().id + '.docx》！')"
                class="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow flex items-center gap-1.5 transition cursor-pointer">
                📥 下载填好的《病例报告表.docx》
              </button>
              <button type="button" onclick="App.state.docxPreviewModalOpen=false;App.render()"
                title="关闭窗口"
                class="text-slate-400 hover:text-white text-2xl leading-none px-1 cursor-pointer">
                ×
              </button>
            </div>
          </div>

          <!-- 纸质 Word 排版预览主体 -->
          <div id="edc-docx-modal-body" class="p-3 sm:p-6 overflow-y-auto flex-1">
            ${window.DOCX_EXPORTER.renderFullPrintHTML(subj)}
          </div>
        </div>
      </div>
    `;
  },

  // ==================== 后端连接设置、账号开通与权限配置弹窗 ====================
  saveBackendConfigFromDOM(modeId, urlId) {
    const modeEl = document.getElementById(modeId);
    const urlEl = document.getElementById(urlId);
    const cfg = window.EDC_API.getConfig();
    if (modeEl) cfg.mode = modeEl.value;
    if (urlEl) cfg.baseUrl = urlEl.value.trim().replace(/\/+$/, "");
    window.EDC_API.saveConfig(cfg);
    this.showToast(`✓ 已保存后端配置：${cfg.mode === "remote" ? "远程后端模式 (" + cfg.baseUrl + ")" : "本地存储模式"}`);
    this.render();
  },

  async testBackendFromDOM(urlId) {
    const urlEl = document.getElementById(urlId);
    const baseUrl = urlEl ? urlEl.value.trim().replace(/\/+$/, "") : window.EDC_API.getConfig().baseUrl;
    try {
      const info = await window.EDC_API.testBackendHealth(baseUrl);
      this.showToast(`✓ 后端服务器连接成功！状态: ${info.status || "ok"}`);
      alert(`【后端连接成功】\n服务地址: ${baseUrl}\n状态: ${info.status || "ok"}\n数据库用户数: ${info.userCount ?? "-"} 人\n受试者记录数: ${info.subjectCount ?? "-"} 例`);
    } catch (err) {
      alert(`【连接未就绪】\n无法访问 ${baseUrl}/health (${err.message || err})。\n\n请确认已启动后端服务（python3 main.py）或已部署至云服务器，未启动前可使用“本地存储模式”完整体验账号权限开通。`);
    }
  },

  async handleCreateUserForm(formEl) {
    const account = formEl.querySelector("[name='u_account']")?.value.trim();
    const name = formEl.querySelector("[name='u_name']")?.value.trim();
    const password = formEl.querySelector("[name='u_password']")?.value.trim() || "123456";
    const role = formEl.querySelector("[name='u_role']")?.value.trim() || "主治医师 (Sub-I)";
    const dept = formEl.querySelector("[name='u_dept']")?.value.trim() || "卒中中心";
    const isPI = Boolean(formEl.querySelector("[name='u_is_pi']")?.checked);
    const canExport = Boolean(formEl.querySelector("[name='u_can_export']")?.checked) || isPI;
    const canUnlock = Boolean(formEl.querySelector("[name='u_can_unlock']")?.checked) || isPI;
    const canManageUsers = Boolean(formEl.querySelector("[name='u_can_manage']")?.checked) || isPI;

    if (!account || !name) {
      this.showToast("请填写账号/工号与研究者姓名");
      return;
    }
    try {
      this.state.usersList = await window.EDC_API.upsertUserAccount({
        account,
        name,
        password,
        role,
        dept,
        isPI,
        canExport,
        canUnlock,
        canManageUsers,
        status: "active"
      });
      this.persist("后端开通/更新研究者账号与权限", `账号: ${account} (${name}) | 角色: ${role} | PI权限: ${isPI ? "是" : "否"} | 导出权限: ${canExport ? "是" : "否"}`);
      this.showToast(`✓ 已在后端成功开通/更新账号：${name} (${account})`);
      formEl.reset();
      this.render();
    } catch (err) {
      alert("开通账号失败：" + (err.message || err));
    }
  },

  async toggleUserPermField(account, fieldKey) {
    const users = await window.EDC_API.fetchUsers();
    const target = users.find(u => u.account === account);
    if (!target) return;
    const updated = { ...target };
    if (fieldKey === "status") {
      updated.status = target.status === "disabled" ? "active" : "disabled";
    } else {
      updated[fieldKey] = !target[fieldKey];
      if (fieldKey === "isPI" && updated.isPI) {
        updated.canExport = true;
        updated.canUnlock = true;
        updated.canManageUsers = true;
      }
    }
    try {
      this.state.usersList = await window.EDC_API.upsertUserAccount(updated);
      if (this.state.currentUser && this.state.currentUser.account === account) {
        this.state.currentUser = { ...this.state.currentUser, ...updated };
      }
      this.showToast(`✓ 已更新账号 ${target.name} (${account}) 的后端权限配置`);
      this.render();
    } catch (err) {
      alert("更新权限失败：" + (err.message || err));
    }
  },

  async handleDeleteUserAccount(account) {
    if (account === "dr_liguiwei" || (this.state.currentUser && account === this.state.currentUser.account)) {
      this.showToast("不可删除主 PI 账号或当前正在登录的账号！");
      return;
    }
    try {
      this.state.usersList = await window.EDC_API.deleteUserAccount(account);
      this.showToast(`已移除账号 ${account}`);
      this.render();
    } catch (err) {
      alert("删除账号失败：" + (err.message || err));
    }
  },

  renderUserAdminModal() {
    const cfg = window.EDC_API.getConfig();
    const users = window.EDC_API.getLocalUsers();

    return `
      <div class="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
        <div class="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
          <!-- 头部 -->
          <div class="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
            <div>
              <h3 class="text-base sm:text-lg font-bold flex items-center gap-2">
                <span>🔑</span>
                <span>研究者账号开通与后端权限管理中心</span>
              </h3>
              <p class="text-xs text-slate-400 mt-0.5">支持通过后端 API 或命令行开通账号，精细化分配 PI 解锁、数据导出 (CSV/JSON) 与账号管理权限</p>
            </div>
            <button type="button" onclick="App.state.userAdminModalOpen=false;App.render()"
              title="关闭窗口"
              class="text-slate-400 hover:text-white text-2xl leading-none px-1 cursor-pointer">
              ×
            </button>
          </div>

          <div id="edc-admin-modal-body" class="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 text-xs">
            <!-- 1. 后端 API 连接配置 -->
            <div class="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div class="font-bold text-slate-800 flex items-center justify-between">
                <span>🌐 后端鉴权与权限服务连接设置</span>
                <span class="px-2 py-0.5 rounded text-[11px] ${
                  cfg.mode === "remote" ? "bg-emerald-100 text-emerald-800" : "bg-sky-100 text-sky-800"
                }">${cfg.mode === "remote" ? "当前: 远程后端数据库鉴权" : "当前: 本地存储模拟鉴权"}</span>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                <div>
                  <label class="block font-semibold text-slate-600 mb-1">鉴权与数据模式</label>
                  <select id="admin-cfg-mode" class="crf-input text-xs py-1.5">
                    <option value="local" ${cfg.mode === "local" ? "selected" : ""}>本地存储模式 (离线可用)</option>
                    <option value="remote" ${cfg.mode === "remote" ? "selected" : ""}>远程后端服务器模式 (FastAPI)</option>
                  </select>
                </div>
                <div class="sm:col-span-2">
                  <label class="block font-semibold text-slate-600 mb-1">远程后端 API 地址 (如 Render / Railway / Koyeb 部署地址)</label>
                  <div class="flex gap-2">
                    <input type="text" id="admin-cfg-url" value="${cfg.baseUrl}"
                      placeholder="http://127.0.0.1:8000/api/v1"
                      class="crf-input font-mono text-xs py-1.5 flex-1" />
                    <button type="button" onclick="App.saveBackendConfigFromDOM('admin-cfg-mode','admin-cfg-url')"
                      class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold shrink-0">
                      保存设置
                    </button>
                    <button type="button" onclick="App.testBackendFromDOM('admin-cfg-url')"
                      class="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold shrink-0">
                      测试连通
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- 2. 现有账号权限矩阵（点击即可实时切换权限或启停用） -->
            <div class="border border-slate-200 rounded-xl overflow-hidden">
              <div class="px-4 py-2.5 bg-slate-100 border-b border-slate-200 font-bold text-slate-800 flex items-center justify-between">
                <span>👥 已开通研究者账号及权限列表（点击对应权限标签可实时开通/关闭）</span>
                <span class="text-[11px] font-normal text-slate-500">共 ${users.length} 个账号</span>
              </div>
              <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse">
                  <thead>
                    <tr class="bg-slate-50 border-b border-slate-200 text-slate-600">
                      <th class="py-2.5 px-3">姓名 / 账号</th>
                      <th class="py-2.5 px-3">角色与科室</th>
                      <th class="py-2.5 px-3 text-center">PI签审解锁权</th>
                      <th class="py-2.5 px-3 text-center">CSV/JSON导出权</th>
                      <th class="py-2.5 px-3 text-center">账号管理权</th>
                      <th class="py-2.5 px-3 text-center">账号状态</th>
                      <th class="py-2.5 px-3 text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-200">
                    ${users
                      .map(
                        u => `
                      <tr class="hover:bg-slate-50">
                        <td class="py-2.5 px-3">
                          <div class="font-bold text-slate-900">${u.name}</div>
                          <div class="text-[11px] text-slate-500 font-mono">${u.account}</div>
                        </td>
                        <td class="py-2.5 px-3">
                          <div class="font-medium text-slate-800">${u.role || "-"}</div>
                          <div class="text-[11px] text-slate-500">${u.dept || "-"}</div>
                        </td>
                        <td class="py-2.5 px-3 text-center">
                          <button type="button" onclick="App.toggleUserPermField('${u.account}','isPI')"
                            class="px-2.5 py-1 rounded-full font-bold transition ${
                              u.isPI || u.canUnlock
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                : "bg-slate-100 text-slate-400 border border-slate-200"
                            }">
                            ${u.isPI || u.canUnlock ? "✓ 已开通" : "未开通"}
                          </button>
                        </td>
                        <td class="py-2.5 px-3 text-center">
                          <button type="button" onclick="App.toggleUserPermField('${u.account}','canExport')"
                            class="px-2.5 py-1 rounded-full font-bold transition ${
                              u.canExport || u.isPI
                                ? "bg-sky-100 text-sky-800 border border-sky-300"
                                : "bg-slate-100 text-slate-400 border border-slate-200"
                            }">
                            ${u.canExport || u.isPI ? "✓ 允许导出" : "禁止导出"}
                          </button>
                        </td>
                        <td class="py-2.5 px-3 text-center">
                          <button type="button" onclick="App.toggleUserPermField('${u.account}','canManageUsers')"
                            class="px-2.5 py-1 rounded-full font-bold transition ${
                              u.canManageUsers || u.isPI
                                ? "bg-indigo-100 text-indigo-800 border border-indigo-300"
                                : "bg-slate-100 text-slate-400 border border-slate-200"
                            }">
                            ${u.canManageUsers || u.isPI ? "✓ 管理员" : "普通用户"}
                          </button>
                        </td>
                        <td class="py-2.5 px-3 text-center">
                          <button type="button" onclick="App.toggleUserPermField('${u.account}','status')"
                            class="px-2 py-0.5 rounded font-semibold ${
                              u.status === "disabled" ? "bg-rose-100 text-rose-700" : "bg-teal-100 text-teal-800"
                            }">
                            ${u.status === "disabled" ? "已停用" : "正常启用"}
                          </button>
                        </td>
                        <td class="py-2.5 px-3 text-right">
                          ${
                            u.account !== "dr_liguiwei"
                              ? `<button type="button" onclick="App.handleDeleteUserAccount('${u.account}')" class="text-rose-600 hover:underline font-semibold">删除</button>`
                              : `<span class="text-slate-400">主PI</span>`
                          }
                        </td>
                      </tr>
                    `
                      )
                      .join("")}
                  </tbody>
                </table>
              </div>
            </div>

            <!-- 3. 开通新研究者账号表单 -->
            <form onsubmit="event.preventDefault();App.handleCreateUserForm(this)" class="p-4 rounded-xl bg-sky-50/60 border border-sky-200 space-y-3">
              <div class="font-bold text-slate-900">➕ 后端开通新研究者账号 / 重置密码</div>
              <div class="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
                <div>
                  <label class="block text-[11px] font-semibold text-slate-600 mb-1">登录账号 / 工号 *</label>
                  <input type="text" name="u_account" required placeholder="如: dr_zhangsan" class="crf-input text-xs py-1.5" />
                </div>
                <div>
                  <label class="block text-[11px] font-semibold text-slate-600 mb-1">研究者姓名 *</label>
                  <input type="text" name="u_name" required placeholder="如: 张三" class="crf-input text-xs py-1.5" />
                </div>
                <div>
                  <label class="block text-[11px] font-semibold text-slate-600 mb-1">初始登录密码 *</label>
                  <input type="text" name="u_password" value="123456" required class="crf-input text-xs py-1.5 font-mono" />
                </div>
                <div>
                  <label class="block text-[11px] font-semibold text-slate-600 mb-1">临床角色</label>
                  <input type="text" name="u_role" value="主治医师 (Sub-I)" class="crf-input text-xs py-1.5" />
                </div>
                <div>
                  <label class="block text-[11px] font-semibold text-slate-600 mb-1">所属科室</label>
                  <input type="text" name="u_dept" value="卒中中心" class="crf-input text-xs py-1.5" />
                </div>
              </div>
              <div class="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div class="flex flex-wrap items-center gap-4">
                  <label class="inline-flex items-center gap-1.5 cursor-pointer font-semibold text-slate-700">
                    <input type="checkbox" name="u_is_pi" class="rounded" />
                    <span>开通 PI 审核与解锁权限</span>
                  </label>
                  <label class="inline-flex items-center gap-1.5 cursor-pointer font-semibold text-slate-700">
                    <input type="checkbox" name="u_can_export" class="rounded" />
                    <span>开通 CSV / JSON 数据导出权限</span>
                  </label>
                  <label class="inline-flex items-center gap-1.5 cursor-pointer font-semibold text-slate-700">
                    <input type="checkbox" name="u_can_manage" class="rounded" />
                    <span>开通后台账号管理权限</span>
                  </label>
                </div>
                <button type="submit" class="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold shadow-xs">
                  ✓ 立即开通 / 更新账号
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;
  }
};
