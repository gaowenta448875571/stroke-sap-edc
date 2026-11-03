// 默认空白受试者数据结构工厂 & AI模版示范结构生成器（系统初始不含任何测试/演示患者数据）

window.addDaysToDateStr = function (dateStr, days) {
  if (!dateStr) return "";
  const parts = dateStr.split("-").map(Number);
  if (parts.length !== 3) return "";
  const dt = new Date(parts[0], parts[1] - 1, parts[2]);
  dt.setDate(dt.getDate() + days);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const d = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

window.getTodayDateStr = function () {
  const dt = new Date();
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const d = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

// 预设研究团队登录账号列表（与后端 Supabase users 表保持一致，支持动态同步与权限开通）
window.EDC_USERS = [
  {
    account: "dr_liguiwei",
    password: "lgw@1556",
    name: "李桂伟",
    role: "主任医师 (PI)",
    dept: "急症部",
    isPI: true,
    canExport: true,
    canUnlock: true,
    canManageUsers: true,
    status: "active"
  },
  {
    account: "dr_gaowentao",
    password: "448875571",
    name: "高文涛",
    role: "24专硕研究生",
    dept: "急症部",
    isPI: false,
    canExport: true,
    canUnlock: true,
    canManageUsers: true,
    status: "active"
  },
  {
    account: "dr_liruiying",
    password: "liruiying",
    name: "李蕊影",
    role: "25专硕研究生",
    dept: "急症部",
    isPI: false,
    canExport: false,
    canUnlock: false,
    canManageUsers: false,
    status: "active"
  },
  {
    account: "dr_yule",
    password: "yule",
    name: "余乐",
    role: "26专硕研究生",
    dept: "急症部",
    isPI: false,
    canExport: false,
    canUnlock: false,
    canManageUsers: false,
    status: "active"
  },
  {
    account: "dr_zhangkang",
    password: "zhangkang",
    name: "张康",
    role: "26专硕研究生",
    dept: "急症部",
    isPI: false,
    canExport: false,
    canUnlock: false,
    canManageUsers: false,
    status: "active"
  }
];

// 创建空白受试者对象（用于新增病例与导入基底，不含任何预填测试数据）
window.createEmptySubject = function (patientId = "001", customStartDate = "", creatorUser = null) {
  const startStr = customStartDate || window.getTodayDateStr();
  const u = creatorUser || window.EDC_USERS[0];
  const defaultMeds = (window.CRF_CONFIG?.presetMedications || []).map((m, idx) => ({
    id: "med_" + idx,
    category: m.category,
    name: m.name,
    used: "否",
    reason: "",
    dose: "",
    unit: m.unit,
    freq: "",
    route: m.route,
    startDate: "",
    endDate: ""
  }));

  return {
    id: patientId,
    centerId: "01",
    groupCode: "A01",
    name: "",
    initials: "",
    startDate: startStr,
    endDate: "",
    // 首次录入账号与负责人姓名绑定
    ownerAccount: u.account,
    ownerName: u.name,
    ownerRole: u.role || "研究医生",
    createdAt: new Date().toLocaleString("zh-CN"),
    investigator: u.name,
    status: "进行中", // 进行中 | 已完成 | 已锁定 | 脱落
    sapConfirmed: false,
    sapConfirmedDate: "",
    locked: false,
    queries: [],
    auditLogs: [
      {
        time: new Date().toLocaleString("zh-CN"),
        user: `${u.name} (${u.account})`,
        action: "首次录入并绑定受试者责任账号",
        field: `患者编号: ${patientId} | 绑定负责人: ${u.name} (${u.account})`
      }
    ],

    // V1 基线数据
    v1: {
      visitDate: startStr,
      consentDate: startStr,
      completed: false,
      demographics: {
        hospitalId: "",
        gender: "男",
        birthDate: "",
        age: "",
        admissionSource: "急诊",
        phone1: "",
        phone2: "",
        nativeProvince: "",
        nativeCity: "",
        nativeCounty: "",
        resideProvince: "",
        resideCity: "",
        resideCounty: "",
        height: "",
        weight: "",
        bmi: "",
        marital: "已婚",
        ethnicity: "汉族",
        ethnicityOther: "",
        education: "",
        occupation: "",
        occupationOther: ""
      },
      history: {
        source: ["家属/照护者"],
        unableReason: "",
        onsetTime: "",
        lastNormalTime: "",
        firstVisitTime: "",
        firstHospital: "",
        ivThrombolysis: "未实施",
        ivStartTime: "",
        ivNotReason: "",
        evt: "未实施",
        evtPunctureTime: "",
        evtRecanalTime: "",
        evtNotReason: "",
        admissionTime: "",
        chiefConsciousness: [],
        chiefSpeech: [],
        chiefLimbSide: "",
        chiefLimbType: [],
        chiefOther: [],
        durationVal: "",
        durationUnit: "小时",
        chiefText: "",
        onsetMode: "突然",
        onsetState: "安静/睡眠",
        mainSymptoms: [],
        mainSymptoms_other: "",
        limbWeaknessSide: "",
        limbWeaknessNote: "",
        limbNumbnessSide: "",
        limbNumbnessNote: "",
        progression: "",
        accompany: [],
        accompany_other: "",
        preHospitalTx: ["无"],
        preHospitalEffect: "无变化",
        hpiNarrative: "",
        pastDiseases: [],
        pastDetail: "",
        preMrs: "0",
        allergy: "无",
        allergyDetail: "",
        smoking: "无",
        smokingYears: "",
        drinking: "无",
        drinkingYears: "",
        baselineComorbidities: []
      },
      exam: {
        generalState: "危重",
        cooperation: "部分",
        uncoopReason: "",
        airway: "无明显异常",
        sputum: "无",
        consciousness: "清醒",
        pupilLeft: "3.0",
        pupilRight: "3.0",
        pupilEqual: "等大等圆",
        lightReflex: "灵敏",
        gaze: "无",
        visualField: "正常",
        neglect: "无",
        facialPalsy: "无",
        speech: "正常",
        swallow: "正常",
        strengthLU: "5",
        strengthRU: "5",
        strengthLL: "5",
        strengthRL: "5",
        muscleTone: "正常",
        sensory: "正常",
        sensoryDist: "",
        ataxia: "无",
        babinskiLeft: "阴性",
        babinskiRight: "阴性",
        otherSigns: ""
      },
      vitals: { temp: "", resp: "", pulse: "", sbp: "", dbp: "" },
      ecg: {
        hr: "",
        pr: "",
        qrs: "",
        qt: "",
        qtc: "",
        axis: "",
        rhythm: ["窦性心律"],
        stT: ["无明显异常"],
        stLeadDetail: "",
        conduction: ["正常"],
        chamber: [],
        autoReport: "",
        reviewerConclusion: ""
      },
      imaging: {
        brainMR: { done: "否", source: "本院", date: "", findings: "", diagnosis: "" },
        brainCT: { done: "否", source: "本院", date: "", findings: "", diagnosis: "" },
        chestCT: { done: "否", source: "本院", date: "", findings: "", diagnosis: "" },
        chestXray: { done: "否", source: "本院", date: "", findings: "", diagnosis: "" }
      },
      labs: {},
      scales: {
        GCS: { score: "", signer: u.name, isAcupuncturist: "否", details: {} },
        NIHSS: { score: "", signer: u.name, isAcupuncturist: "否", details: {} },
        SOFA: { score: "", signer: u.name, isAcupuncturist: "否", details: {}, measured: {} },
        FOIS: { score: "", signer: u.name, isAcupuncturist: "否", details: {} },
        EQ5D: { score: "", vas: 50, filler: "代理人", relation: "家属", details: {} }
      },
      tcm: {
        infoSource: "家属/照护者代述",
        commState: "部分配合",
        inducer: ["无特殊"],
        chills_fever: ["无特殊"],
        sensory_pain: ["无特殊"],
        face: ["无特殊"],
        eyes: ["无特殊"],
        mouth: ["无特殊"],
        consciousness: "清醒",
        speech: ["正常"],
        emotion: ["配合/安静"],
        swallow_resp: ["正常"],
        appetite: ["无特殊"],
        excretion: "二便正常",
        motor: "正常",
        tone: ["正常"],
        tongue_color: "淡红",
        tongue_shape: ["正常"],
        tongue_motion: ["正常"],
        fur_color: ["薄白"],
        fur_quality: ["正常"],
        pulse: ["弦"]
      },
      diagnosis: {
        toast: "大动脉粥样硬化型",
        toastOther: "",
        diseaseSubtype: ["重症脑梗死"],
        tcmSyndrome: ["风痰入络证"],
        tcmSyndromeOther: ""
      },
      eligibility: {
        inc_1: "是", inc_2: "是", inc_3: "是", inc_4: "是",
        exc_1: "否", exc_2: "否", exc_3: "否", exc_4: "否", exc_5: "否",
        enrolled: "是",
        enrollDate: startStr
      },
      biosamples: { plasma: "是", swab: "是", stool: "是" }
    },

    // V2-1 第3天观察表
    v2_1: {
      visitDate: "",
      completed: false,
      vitals: { temp: "", resp: "", pulse: "", sbp: "", dbp: "" },
      labs: {},
      scales: {
        GCS: { score: "", signer: u.name, isAcupuncturist: "否", details: {} },
        NIHSS: { score: "", signer: u.name, isAcupuncturist: "否", details: {} },
        FOIS: { score: "", signer: u.name, isAcupuncturist: "否", details: {} },
        SOFA: { score: "", signer: u.name, isAcupuncturist: "否", details: {}, measured: {} },
        EQ5D: { score: "", vas: 55, details: {} }
      }
    },

    // V2-2 第7天观察表
    v2_2: {
      visitDate: "",
      completed: false,
      vitals: { temp: "", resp: "", pulse: "", sbp: "", dbp: "" },
      labs: {},
      scales: {
        GCS: { score: "", signer: u.name, isAcupuncturist: "否", details: {} },
        NIHSS: { score: "", signer: u.name, isAcupuncturist: "否", details: {} },
        FOIS: { score: "", signer: u.name, isAcupuncturist: "否", details: {} },
        SOFA: { score: "", signer: u.name, isAcupuncturist: "否", details: {}, measured: {} },
        EQ5D: { score: "", vas: 65, details: {} }
      },
      biosamples: { plasma: "否", swab: "否", stool: "否" }
    },

    // V2-3 出现肺感染指征专表
    v2_3: {
      visitDate: "",
      vitals: { temp: "", resp: "", pulse: "", sbp: "", dbp: "" },
      sapConclusion: "排除", // 确诊 | 排除
      confirmDate: "",
      judgeSigner: "",
      isAcupuncturist: "否",
      imagingCriteria: [],
      clinicalCriteria: [],
      sputumSymptoms: [],
      feverTemp: "",
      infLabs: {
        wbc: { done: "是", day0: "", day3: "", eval: "0" },
        neut: { done: "是", day0: "", day3: "", eval: "0" },
        lymph: { done: "是", day0: "", day3: "", eval: "0" },
        nlr: { done: "是", day0: "", day3: "", eval: "0" },
        crp: { done: "是", day0: "", day3: "", eval: "0" },
        pct: { done: "是", day0: "", day3: "", eval: "0" }
      },
      pathogens: {
        sputumCulture: { done: "否", result: "ND" },
        swabCulture: { done: "否", result: "ND" },
        resp11: { done: "否", result: "ND" },
        fungiEndotoxin: { done: "否", result: "ND" }
      },
      chestCT: { done: "否", date: "", findings: "", diagnosis: "" },
      chestXray: { done: "否", date: "", findings: "", diagnosis: "" },
      psi: {
        checks: {},
        values: {},
        notes: {},
        totalScore: 0,
        riskClass: "I级 (低风险)",
        signer: u.name,
        isAcupuncturist: "否"
      },
      biosamples: { plasma: "否", swab: "否", stool: "否" }
    },

    // V3 出院时观察表
    v3: {
      visitDate: "",
      completed: false,
      scales: {
        GCS: { score: "", signer: u.name, isAcupuncturist: "否", details: {} },
        NIHSS: { score: "", signer: u.name, isAcupuncturist: "否", details: {} },
        FOIS: { score: "", signer: u.name, isAcupuncturist: "否", details: {} },
        EQ5D: { score: "", vas: 72, details: {} },
        MRS: { score: "", signer: u.name, isAcupuncturist: "否", details: {} }
      },
      outcome: {
        status: "",
        date: "",
        destination: "回家",
        destinationOther: "",
        deathReason: ""
      }
    },

    // V4 第30天随访表
    v4: {
      visitDate: "",
      completed: false,
      scales: {
        FOIS: { score: "", signer: u.name, isAcupuncturist: "否", details: {} },
        EQ5D: { score: "", vas: 78, details: {} },
        MRS: { score: "", signer: u.name, isAcupuncturist: "否", details: {} }
      },
      survival: { alive: "", deathDate: "", deathReason: "" },
      hasReadmission: "无",
      readmissions: []
    },

    // V5 第90天随访表
    v5: {
      visitDate: "",
      completed: false,
      scales: {
        FOIS: { score: "", signer: u.name, isAcupuncturist: "否", details: {} },
        EQ5D: { score: "", vas: 85, details: {} },
        MRS: { score: "", signer: u.name, isAcupuncturist: "否", details: {} }
      },
      survival: { alive: "", deathDate: "", deathReason: "" },
      hasReadmission: "无",
      readmissions: []
    },

    // 全程：并发症
    complications: {
      hasComplication: "无",
      items: []
    },

    // 全程：治疗记录
    treatment: {
      reperfusion: {
        ivUsed: "否",
        drugs: [
          { name: "尿激酶", dose: "", unit: "万单位", route: "静脉滴注/推注", startTime: "", endTime: "" },
          { name: "阿替普酶 (rt-PA)", dose: "", unit: "mg", route: "静脉泵入", startTime: "", endTime: "" },
          { name: "替奈普酶", dose: "", unit: "mg", route: "静脉推注", startTime: "", endTime: "" }
        ]
      },
      tubes: {
        ngTube: { used: "无", startDate: "", endDate: "", reasons: [] },
        foley: { used: "无", startDate: "", endDate: "", reasons: [] },
        cvc: { used: "无", startDate: "", endDate: "", reasons: [] },
        respSupport: { used: "无", mode: "鼻导管", flow: "", fio2: "", startDate: "", endDate: "", reasons: [] },
        airway: { used: "无", startDate: "", endDate: "", reasons: [] }
      },
      medications: defaultMeds,
      herbalList: [],
      nonDrug: [
        { id: "acupuncture", name: "特殊手法针法", used: "无", subtype: "醒脑开窍针法", detail: "", reason: "重症卒中", freq: "", startDate: "", endDate: "" },
        { id: "plaster", name: "中药贴敷", used: "无", subtype: "", detail: "", reason: "", freq: "", startDate: "", endDate: "" },
        { id: "auricular", name: "耳穴治疗", used: "无", subtype: "", detail: "", reason: "", freq: "", startDate: "", endDate: "" },
        { id: "brain_reflex", name: "脑反射治疗", used: "无", subtype: "", detail: "", reason: "", freq: "", startDate: "", endDate: "" },
        { id: "laser", name: "激光疗法-半导体激光治疗", used: "无", subtype: "", detail: "", reason: "", freq: "", startDate: "", endDate: "" }
      ]
    },

    // 全程：不良事件
    adverseEvents: {
      hasAE: "无",
      events: []
    },

    // 总结与签字
    summary: {
      interventionEndDate: "",
      withdrawn: "否",
      withdrawDate: "",
      withdrawReasonCode: "",
      withdrawOtherDetail: "",
      piSignature: "",
      piSignDate: "",
      piNote: ""
    }
  };
};

// 系统初始受试者列表为空（已清除全部测试与示范患者数据）
window.createInitialSampleSubjects = function () {
  return [];
};
