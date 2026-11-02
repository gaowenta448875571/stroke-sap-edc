// 默认空白受试者数据结构工厂 & 预设临床示范病例数据

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

// 预设研究团队登录账号列表（支持后端接口动态同步与权限开通：PI解锁、数据导出、账号管理）
window.EDC_USERS = [
  {
    account: "dr_lihua",
    password: "123456",
    name: "李华",
    role: "主任医师 (PI)",
    dept: "神经重症科",
    isPI: true,
    canExport: true,
    canUnlock: true,
    canManageUsers: true,
    status: "active"
  },
  {
    account: "dr_wangqiang",
    password: "123456",
    name: "王强",
    role: "主治医师 (Sub-I)",
    dept: "卒中中心",
    isPI: false,
    canExport: false,
    canUnlock: false,
    canManageUsers: false,
    status: "active"
  },
  {
    account: "dr_chenjing",
    password: "123456",
    name: "陈静",
    role: "住院医师 / 针灸师",
    dept: "针灸临床部",
    isPI: false,
    canExport: false,
    canUnlock: false,
    canManageUsers: false,
    status: "active"
  },
  {
    account: "crc_zhaolei",
    password: "123456",
    name: "赵磊",
    role: "临床研究协调员 (CRC)",
    dept: "科研随访组",
    isPI: false,
    canExport: false,
    canUnlock: false,
    canManageUsers: false,
    status: "active"
  }
];

window.createEmptySubject = function (patientId = "005", customStartDate = "", creatorUser = null) {
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
      completed: true,
      demographics: {
        hospitalId: "",
        gender: "男",
        birthDate: "1958-05-12",
        age: 68,
        admissionSource: "急诊",
        phone1: "",
        phone2: "",
        nativeProvince: "",
        nativeCity: "",
        nativeCounty: "",
        resideProvince: "",
        resideCity: "",
        resideCounty: "",
        height: 170,
        weight: 68,
        bmi: "23.5",
        marital: "已婚",
        ethnicity: "汉族",
        ethnicityOther: "",
        education: "高中",
        occupation: "退（离）休人员",
        occupationOther: ""
      },
      history: {
        source: ["家属/照护者", "院前急救/转诊资料"],
        unableReason: "",
        onsetTime: "",
        lastNormalTime: "",
        firstVisitTime: "",
        firstHospital: "",
        ivThrombolysis: "未实施",
        ivStartTime: "",
        ivNotReason: "超出静脉溶栓时间窗",
        evt: "未实施",
        evtPunctureTime: "",
        evtRecanalTime: "",
        evtNotReason: "",
        admissionTime: "",
        chiefConsciousness: [],
        chiefSpeech: [],
        chiefLimbSide: "右侧",
        chiefLimbType: ["无力", "瘫痪"],
        chiefOther: [],
        durationVal: "",
        durationUnit: "小时",
        chiefText: "",
        onsetMode: "突然",
        onsetState: "安静/睡眠",
        mainSymptoms: ["意识障碍", "言语障碍", "肢体无力/瘫痪"],
        progression: "持续加重",
        accompany: ["饮水呛咳", "吞咽困难", "咳痰"],
        preHospitalTx: ["无"],
        preHospitalEffect: "无变化",
        hpiNarrative: "",
        pastDiseases: ["高血压"],
        pastDetail: "",
        preMrs: "0",
        allergy: "无",
        allergyDetail: "",
        smoking: "无",
        smokingYears: "",
        drinking: "无",
        drinkingYears: "",
        baselineComorbidities: ["高血压"]
      },
      exam: {
        generalState: "危重",
        cooperation: "部分",
        uncoopReason: "",
        airway: "痰鸣音",
        sputum: "白黏",
        consciousness: "嗜睡",
        pupilLeft: "3.0",
        pupilRight: "3.0",
        pupilEqual: "等大等圆",
        lightReflex: "灵敏",
        gaze: "向左",
        visualField: "偏盲",
        neglect: "无",
        facialPalsy: "右侧",
        speech: "构音障碍",
        swallow: "障碍",
        strengthLU: "5",
        strengthRU: "1",
        strengthLL: "5",
        strengthRL: "2",
        muscleTone: "增高",
        sensory: "减退",
        sensoryDist: "右",
        ataxia: "无法配合",
        babinskiLeft: "阴性",
        babinskiRight: "阳性",
        otherSigns: ""
      },
      vitals: { temp: "36.8", resp: "20", pulse: "82", sbp: "165", dbp: "95" },
      ecg: {
        hr: "82",
        pr: "160",
        qrs: "92",
        qt: "380",
        qtc: "415",
        axis: "+30",
        rhythm: ["窦性心律"],
        stT: ["无明显异常"],
        stLeadDetail: "",
        conduction: ["正常"],
        chamber: [],
        autoReport: "窦性心律，正常范围心电图",
        reviewerConclusion: "正常范围心电图，未见急性心肌缺血改变"
      },
      imaging: {
        brainMR: { done: "是", source: "本院", date: "", findings: "", diagnosis: "" },
        brainCT: { done: "是", source: "本院", date: "", findings: "", diagnosis: "" },
        chestCT: { done: "是", source: "本院", date: "", findings: "", diagnosis: "" },
        chestXray: { done: "否", source: "本院", date: "", findings: "ND", diagnosis: "ND" }
      },
      labs: {},
      scales: {
        GCS: { score: 12, signer: "王医生", isAcupuncturist: "否", details: { eye: 3, verbal: 4, motor: 5 } },
        NIHSS: {
          score: 16,
          signer: "王医生",
          isAcupuncturist: "否",
          details: { "1a": 1, "1b": 1, "1c": 1, "2": 1, "3": 1, "4": 1, "5a": 0, "5b": 3, "6a": 0, "6b": 3, "7": 0, "8": 1, "9": 2, "10": 1, "11": 0 }
        },
        SOFA: {
          score: 3,
          signer: "王医生",
          isAcupuncturist: "否",
          details: { resp: 1, coag: 0, liver: 0, cardio: 0, cns: 2, renal: 0 },
          measured: { resp: "345", coag: "198", liver: "16.5", cardio: "85", cns: "12", renal: "88" }
        },
        FOIS: { score: 2, signer: "王医生", isAcupuncturist: "否", details: { level: 2 } },
        EQ5D: { score: "3-3-3-2-2 / VAS:45", vas: 45, filler: "代理人", relation: "子女", details: { mobility: 3, selfcare: 3, activity: 3, pain: 2, anxiety: 2 } }
      },
      tcm: {
        infoSource: "家属/照护者代述",
        commState: "部分配合",
        inducer: ["无特殊"],
        chills_fever: ["无特殊"],
        sensory_pain: ["感觉麻木(半身)"],
        face: ["口舌歪斜"],
        eyes: ["凝视偏向"],
        mouth: ["口角流涎"],
        consciousness: "嗜睡",
        speech: ["舌强言蹇", "构音障碍"],
        emotion: ["配合/安静"],
        swallow_resp: ["吞咽障碍", "饮水呛咳", "咳痰/痰多"],
        appetite: ["纳差"],
        excretion: "二便不通（闭）",
        motor: "半身不遂(右)",
        tone: ["肢体强痉"],
        tongue_color: "绛",
        tongue_shape: ["胖大", "齿痕"],
        tongue_motion: ["歪斜", "僵硬/舌强"],
        fur_color: ["黄"],
        fur_quality: ["厚", "腻"],
        pulse: ["弦", "滑", "数"]
      },
      diagnosis: {
        toast: "大动脉粥样硬化型",
        toastOther: "",
        diseaseSubtype: ["重症脑梗死", "大面积脑梗死"],
        tcmSyndrome: ["风痰入络证", "痰热腑实证"],
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
        GCS: { score: "", signer: "", isAcupuncturist: "否", details: {} },
        NIHSS: { score: "", signer: "", isAcupuncturist: "否", details: {} },
        FOIS: { score: "", signer: "", isAcupuncturist: "否", details: {} },
        SOFA: { score: "", signer: "", isAcupuncturist: "否", details: {} },
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
        GCS: { score: "", signer: "", isAcupuncturist: "否", details: {} },
        NIHSS: { score: "", signer: "", isAcupuncturist: "否", details: {} },
        FOIS: { score: "", signer: "", isAcupuncturist: "否", details: {} },
        SOFA: { score: "", signer: "", isAcupuncturist: "否", details: {} },
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
        signer: "",
        isAcupuncturist: "否"
      },
      biosamples: { plasma: "否", swab: "否", stool: "否" }
    },

    // V3 出院时观察表
    v3: {
      visitDate: "",
      completed: false,
      scales: {
        GCS: { score: "", signer: "", isAcupuncturist: "否", details: {} },
        NIHSS: { score: "", signer: "", isAcupuncturist: "否", details: {} },
        FOIS: { score: "", signer: "", isAcupuncturist: "否", details: {} },
        EQ5D: { score: "", vas: 72, details: {} },
        MRS: { score: "", signer: "", isAcupuncturist: "否", details: {} }
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
        FOIS: { score: "", signer: "", isAcupuncturist: "否", details: {} },
        EQ5D: { score: "", vas: 78, details: {} },
        MRS: { score: "", signer: "", isAcupuncturist: "否", details: {} }
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
        FOIS: { score: "", signer: "", isAcupuncturist: "否", details: {} },
        EQ5D: { score: "", vas: 85, details: {} },
        MRS: { score: "", signer: "", isAcupuncturist: "否", details: {} }
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
        ngTube: { used: "有", startDate: "", endDate: "", reasons: ["吞咽困难", "营养支持"] },
        foley: { used: "无", startDate: "", endDate: "", reasons: [] },
        cvc: { used: "无", startDate: "", endDate: "", reasons: [] },
        respSupport: { used: "普通氧疗(鼻导管/面罩)", mode: "鼻导管", flow: "3", fio2: "33", startDate: "", endDate: "", reasons: ["误吸风险/肺部感染相关"] },
        airway: { used: "无", startDate: "", endDate: "", reasons: [] }
      },
      medications: defaultMeds,
      herbalList: [],
      nonDrug: [
        { id: "acupuncture", name: "特殊手法针法", used: "有", subtype: "醒脑开窍针法", detail: "内关、人中、三阴交、极泉、尺泽、委中、风池、完骨、翳风", reason: "重症卒中", freq: "每日2次", startDate: "", endDate: "" },
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

// 生成 4 个具有代表性的真实临床示范病例（包含第3天、第7天、第30天、第90天不同时间节点的提醒状态）
window.createInitialSampleSubjects = function () {
  const today = window.getTodayDateStr();

  // 病例 001：92天前入组，已完整走完第3天、第7天、第30天、第90天全部随访及肺部感染专表
  const start1 = window.addDaysToDateStr(today, -92);
  const s1 = window.createEmptySubject("001", start1);
  s1.name = "张建国";
  s1.initials = "ZJG";
  s1.endDate = window.addDaysToDateStr(start1, 90);
  s1.status = "已完成";
  s1.sapConfirmed = true;
  s1.sapConfirmedDate = window.addDaysToDateStr(start1, 4);
  s1.v1.visitDate = start1;
  s1.v1.consentDate = start1;
  Object.assign(s1.v1.demographics, {
    hospitalId: "ZY20260502088",
    gender: "男",
    birthDate: "1954-03-18",
    age: 72,
    admissionSource: "急诊",
    phone1: "13800138101",
    phone2: "13900139102",
    nativeProvince: "天津市",
    nativeCity: "天津市",
    nativeCounty: "南开区",
    resideProvince: "天津市",
    resideCity: "天津市",
    resideCounty: "南开区",
    height: 172,
    weight: 76,
    bmi: "25.7"
  });
  Object.assign(s1.v1.history, {
    onsetTime: `${start1}T06:30`,
    lastNormalTime: `${window.addDaysToDateStr(start1, -1)}T22:30`,
    firstVisitTime: `${start1}T08:15`,
    firstHospital: "本院急诊卒中中心",
    ivThrombolysis: "实施",
    ivStartTime: `${start1}T08:50`,
    evt: "实施",
    evtPunctureTime: `${start1}T09:40`,
    evtRecanalTime: `${start1}T10:35`,
    admissionTime: `${start1}T11:20`,
    chiefConsciousness: ["嗜睡"],
    chiefSpeech: ["构音不清", "失语"],
    chiefLimbSide: "右侧",
    chiefLimbType: ["瘫痪"],
    chiefOther: ["饮水呛咳", "吞咽困难"],
    durationVal: "5",
    durationUnit: "小时",
    chiefText: "突发右侧肢体瘫痪伴言语不能、意识嗜睡 5 小时",
    hpiNarrative: "患者晨起被家属发现右侧肢体完全不能活动，呼之能睁眼但不能言语，伴饮水呛咳、喉间痰鸣，急诊头颅CTA示左侧大脑中动脉M1段闭塞，予阿替普酶桥接机械取栓治疗后收入NICU。",
    pastDiseases: ["高血压", "糖尿病", "房颤/房扑"],
    pastDetail: "高血压病史15年，最高180/105mmHg，规律服氨氯地平；2型糖尿病8年；阵发性房颤3年未规律抗凝。",
    smoking: "吸烟",
    smokingYears: "35",
    baselineComorbidities: ["高血压", "糖尿病", "心律失常"]
  });
  s1.v1.imaging.brainMR = {
    done: "是",
    source: "本院",
    date: start1.slice(5),
    findings: "左侧大脑半球大脑中动脉供血区（额颞顶叶及基底节区）见大片状DWI高信号，ADC值明显减低，中线结构轻度右移。",
    diagnosis: "左侧大脑中动脉供血区急性大面积脑梗死"
  };
  s1.v1.imaging.chestCT = {
    done: "是",
    source: "本院",
    date: start1.slice(5),
    findings: "双肺纹理略增粗，未见明确实变及新发渗出影。",
    diagnosis: "入院基线双肺未见活动性肺炎征象"
  };
  s1.v1.labs = {
    wbc: { val: "9.2", eval: "0", note: "" },
    neut: { val: "6.9", eval: "1", note: "" },
    lymph: { val: "1.38", eval: "0", note: "" },
    nlr: { val: "5.00", eval: "2", note: "自动计算" },
    crp: { val: "8.5", eval: "0", note: "" },
    pct: { val: "0.04", eval: "0", note: "" },
    plt: { val: "198", eval: "0", note: "" },
    ddimer: { val: "2.45", eval: "2", note: "升高" },
    inr: { val: "1.08", eval: "0", note: "" },
    aptt: { val: "29.4", eval: "0", note: "" },
    fib: { val: "3.65", eval: "0", note: "" },
    alb: { val: "36.2", eval: "1", note: "" },
    palb: { val: "185", eval: "1", note: "" },
    hb: { val: "136", eval: "0", note: "" },
    glu: { val: "9.8", eval: "2", note: "应激性高血糖" },
    scr: { val: "88", eval: "0", note: "" },
    tbil: { val: "16.5", eval: "0", note: "" },
    pao2_fio2: { val: "345", eval: "1", note: "" },
    il2: { val: "3.2", eval: "0", note: "" },
    il4: { val: "2.8", eval: "0", note: "" },
    il6: { val: "42.6", eval: "2", note: "显著升高，提示早期炎性风暴倾向" },
    ifn_gamma: { val: "6.4", eval: "0", note: "" },
    il10: { val: "12.5", eval: "2", note: "代偿性抗炎因子升高" },
    tnf_alpha: { val: "15.2", eval: "2", note: "" }
  };

  // s1 的 V2-1、V2-2、V2-3、V3、V4、V5 均已完成
  s1.v2_1.completed = true;
  s1.v2_1.visitDate = window.addDaysToDateStr(start1, 3);
  s1.v2_1.vitals = { temp: "37.4", resp: "22", pulse: "88", sbp: "150", dbp: "86" };
  s1.v2_1.scales.GCS = { score: 13, signer: "王医生", isAcupuncturist: "否", details: { eye: 3, verbal: 4, motor: 6 } };
  s1.v2_1.scales.NIHSS = {
    score: 14,
    signer: "王医生",
    isAcupuncturist: "否",
    details: { "1a": 1, "1b": 1, "1c": 0, "2": 1, "3": 1, "4": 1, "5a": 0, "5b": 3, "6a": 0, "6b": 2, "7": 0, "8": 1, "9": 2, "10": 1, "11": 0 }
  };
  s1.v2_1.scales.FOIS = { score: 3, signer: "王医生", isAcupuncturist: "否", details: { level: 3 } };
  s1.v2_1.scales.SOFA = {
    score: 2,
    signer: "王医生",
    isAcupuncturist: "否",
    details: { resp: 1, coag: 0, liver: 0, cardio: 0, cns: 1, renal: 0 },
    measured: { resp: "330", coag: "190", liver: "15.0", cardio: "84", cns: "13", renal: "85" }
  };
  s1.v2_1.scales.EQ5D = { score: "3-3-3-2-1 / VAS:55", vas: 55, details: { mobility: 3, selfcare: 3, activity: 3, pain: 2, anxiety: 1 } };

  s1.v2_2.completed = true;
  s1.v2_2.visitDate = window.addDaysToDateStr(start1, 7);
  s1.v2_2.vitals = { temp: "37.0", resp: "19", pulse: "80", sbp: "142", dbp: "82" };
  s1.v2_2.scales.GCS = { score: 14, signer: "王医生", isAcupuncturist: "否", details: { eye: 4, verbal: 4, motor: 6 } };
  s1.v2_2.scales.NIHSS = {
    score: 11,
    signer: "王医生",
    isAcupuncturist: "否",
    details: { "1a": 0, "1b": 1, "1c": 0, "2": 0, "3": 1, "4": 1, "5a": 0, "5b": 2, "6a": 0, "6b": 2, "7": 0, "8": 1, "9": 2, "10": 1, "11": 0 }
  };
  s1.v2_2.scales.FOIS = { score: 4, signer: "王医生", isAcupuncturist: "否", details: { level: 4 } };
  s1.v2_2.scales.SOFA = {
    score: 1,
    signer: "王医生",
    isAcupuncturist: "否",
    details: { resp: 0, coag: 0, liver: 0, cardio: 0, cns: 1, renal: 0 },
    measured: { resp: "405", coag: "205", liver: "14.2", cardio: "82", cns: "14", renal: "82" }
  };
  s1.v2_2.scales.EQ5D = { score: "2-3-2-2-1 / VAS:65", vas: 65, details: { mobility: 2, selfcare: 3, activity: 2, pain: 2, anxiety: 1 } };
  s1.v2_2.biosamples = { plasma: "是", swab: "是", stool: "是" };

  s1.v2_3.visitDate = window.addDaysToDateStr(start1, 4);
  s1.v2_3.vitals = { temp: "38.7", resp: "28", pulse: "112", sbp: "138", dbp: "80" };
  s1.v2_3.sapConclusion = "确诊";
  s1.v2_3.confirmDate = window.addDaysToDateStr(start1, 4).slice(5);
  s1.v2_3.judgeSigner = "李华主任医师";
  s1.v2_3.isAcupuncturist = "否";
  s1.v2_3.imagingCriteria = ["新出现的斑片状浸润影", "叶或段实变影", "伴随征象：胸腔积液"];
  s1.v2_3.clinicalCriteria = ["呼吸道症状", "发热", "肺部体征", "外周血常规异常"];
  s1.v2_3.sputumSymptoms = ["脓痰", "呼吸困难"];
  s1.v2_3.feverTemp = "38.7";
  s1.v2_3.infLabs = {
    wbc: { done: "是", day0: "14.8", day3: "10.2", eval: "2" },
    neut: { done: "是", day0: "12.6", day3: "7.8", eval: "2" },
    lymph: { done: "是", day0: "0.95", day3: "1.42", eval: "2" },
    nlr: { done: "是", day0: "13.26", day3: "5.49", eval: "2" },
    crp: { done: "是", day0: "86.4", day3: "32.1", eval: "2" },
    pct: { done: "是", day0: "1.28", day3: "0.31", eval: "2" }
  };
  s1.v2_3.pathogens = {
    sputumCulture: { done: "是", result: "肺炎克雷伯菌 (Klebsiella pneumoniae) +++，对头孢哌酮舒巴坦、美罗培南敏感" },
    swabCulture: { done: "是", result: "肺炎克雷伯菌 ++" },
    resp11: { done: "是", result: "呼吸道病毒11项均阴性；肺炎支原体耐药基因阴性" },
    fungiEndotoxin: { done: "是", result: "G试验、GM试验阴性；内毒素 18.5 pg/mL (轻度升高)" }
  };
  s1.v2_3.chestCT = {
    done: "是",
    date: window.addDaysToDateStr(start1, 4).slice(5),
    findings: "右肺下叶背段及左肺下叶后基底段新见大片斑片状实变影及磨玻璃渗出影，内见支气管充气征，右侧少量胸腔积液。",
    diagnosis: "符合卒中相关性肺炎 (SAP) 影像学改变，伴右侧少量胸腔积液"
  };
  s1.v2_3.psi = {
    checks: { cvd: true, altered_mental: true, pleural_effusion: true },
    values: { resp_rate: "28", sbp: "138", temp: "38.7", pulse: "112", ph: "7.39", bun: "8.2", sodium: "136", glucose: "10.4", hct: "38", pao2: "68" },
    notes: { cvd: "本次急性大面积脑梗死" },
    totalScore: 112,
    riskClass: "IV级 (中度风险, 91-130分)",
    signer: "王医生",
    isAcupuncturist: "否"
  };
  s1.v2_3.biosamples = { plasma: "是", swab: "是", stool: "是" };

  s1.v3.completed = true;
  s1.v3.visitDate = window.addDaysToDateStr(start1, 14);
  s1.v3.outcome = { status: "存活出院", date: window.addDaysToDateStr(start1, 14), destination: "康复机构", destinationOther: "", deathReason: "" };
  s1.v3.scales.GCS = { score: 15, signer: "王医生", isAcupuncturist: "否", details: { eye: 4, verbal: 5, motor: 6 } };
  s1.v3.scales.MRS = { score: 3, signer: "王医生", isAcupuncturist: "否", details: { grade: 3 } };
  s1.v3.scales.NIHSS = {
    score: 8,
    signer: "王医生",
    isAcupuncturist: "否",
    details: { "1a": 0, "1b": 0, "1c": 0, "2": 0, "3": 0, "4": 1, "5a": 0, "5b": 2, "6a": 0, "6b": 2, "7": 0, "8": 1, "9": 1, "10": 1, "11": 0 }
  };
  s1.v3.scales.FOIS = { score: 5, signer: "王医生", isAcupuncturist: "否", details: { level: 5 } };
  s1.v3.scales.EQ5D = { score: "2-2-2-2-1 / VAS:72", vas: 72, details: { mobility: 2, selfcare: 2, activity: 2, pain: 2, anxiety: 1 } };

  s1.v4.completed = true;
  s1.v4.visitDate = window.addDaysToDateStr(start1, 30);
  s1.v4.survival.alive = "是";
  s1.v4.scales.MRS = { score: 3, signer: "赵磊", isAcupuncturist: "否", details: { grade: 3 } };
  s1.v4.scales.FOIS = { score: 6, signer: "赵磊", isAcupuncturist: "否", details: { level: 6 } };
  s1.v4.scales.EQ5D = { score: "2-2-2-1-1 / VAS:78", vas: 78, details: { mobility: 2, selfcare: 2, activity: 2, pain: 1, anxiety: 1 } };

  s1.v5.completed = true;
  s1.v5.visitDate = window.addDaysToDateStr(start1, 90);
  s1.v5.survival.alive = "是";
  s1.v5.scales.MRS = { score: 2, signer: "赵磊", isAcupuncturist: "否", details: { grade: 2 } };
  s1.v5.scales.FOIS = { score: 7, signer: "赵磊", isAcupuncturist: "否", details: { level: 7 } };
  s1.v5.scales.EQ5D = { score: "1-2-2-1-1 / VAS:85", vas: 85, details: { mobility: 1, selfcare: 2, activity: 2, pain: 1, anxiety: 1 } };

  s1.treatment.reperfusion.ivUsed = "是";
  s1.treatment.reperfusion.drugs[1] = {
    name: "阿替普酶 (rt-PA)",
    dose: "68",
    unit: "mg",
    route: "静脉泵入",
    startTime: `${start1} 08:50`,
    endTime: "09:50"
  };
  (s1.treatment.medications || []).forEach(m => {
    if (m.name.includes("阿司匹林")) {
      Object.assign(m, { used: "是", reason: "重症卒中", dose: "100", freq: "qd", startDate: window.addDaysToDateStr(start1, 1), endDate: window.addDaysToDateStr(start1, 14) });
    } else if (m.name.includes("阿托伐他汀")) {
      Object.assign(m, { used: "是", reason: "重症卒中", dose: "20", freq: "qn", startDate: start1, endDate: window.addDaysToDateStr(start1, 14) });
    } else if (m.name.includes("依达拉奉")) {
      Object.assign(m, { used: "是", reason: "重症卒中", dose: "15", freq: "bid", startDate: start1, endDate: window.addDaysToDateStr(start1, 14) });
    } else if (m.name.includes("头孢哌酮")) {
      Object.assign(m, { used: "是", reason: "并发症(卒中相关性肺炎)", dose: "3.0", freq: "q8h", startDate: window.addDaysToDateStr(start1, 4), endDate: window.addDaysToDateStr(start1, 12) });
    }
  });

  s1.summary = {
    interventionEndDate: window.addDaysToDateStr(start1, 14),
    withdrawn: "否",
    withdrawDate: "",
    withdrawReasonCode: "",
    withdrawOtherDetail: "",
    piSignature: "李华",
    piSignDate: window.addDaysToDateStr(start1, 91),
    piNote: "全部访视（V1-V5）及多组学生物样本（血浆、咽拭子、粪便）均按方案完整采集，数据核查无误。"
  };

  // 病例 002：7天前入组 → 第3天(V2-1)已完成，今天正好是【第7天 (V2-2) 采集到期日】！（首次录入账号：dr_wangqiang 王强）
  const start2 = window.addDaysToDateStr(today, -7);
  const s2 = window.createEmptySubject("002", start2, window.EDC_USERS[1]);
  s2.name = "林淑芬";
  s2.initials = "LSF";
  s2.status = "进行中";
  Object.assign(s2.v1.demographics, {
    hospitalId: "ZY20260610112",
    gender: "女",
    birthDate: "1962-09-25",
    age: 64,
    admissionSource: "急诊",
    phone1: "13611223344",
    height: 160,
    weight: 58,
    bmi: "22.7"
  });
  s2.v2_1.completed = true;
  s2.v2_1.visitDate = window.addDaysToDateStr(start2, 3);
  s2.v2_1.vitals = { temp: "36.9", resp: "19", pulse: "78", sbp: "146", dbp: "84" };
  s2.v2_1.scales.GCS = { score: 14, signer: "王强", isAcupuncturist: "否", details: { eye: 4, verbal: 4, motor: 6 } };
  s2.v2_1.scales.NIHSS = {
    score: 12,
    signer: "王强",
    isAcupuncturist: "否",
    details: { "1a": 0, "1b": 1, "1c": 0, "2": 1, "3": 1, "4": 1, "5a": 0, "5b": 2, "6a": 0, "6b": 2, "7": 0, "8": 1, "9": 2, "10": 1, "11": 0 }
  };
  s2.v2_1.scales.FOIS = { score: 3, signer: "王强", isAcupuncturist: "否", details: { level: 3 } };
  s2.v2_1.scales.SOFA = {
    score: 2,
    signer: "王强",
    isAcupuncturist: "否",
    details: { resp: 1, coag: 0, liver: 0, cardio: 0, cns: 1, renal: 0 },
    measured: { resp: "350", coag: "210", liver: "13.8", cardio: "86", cns: "14", renal: "72" }
  };
  s2.v2_1.scales.EQ5D = { score: "3-3-3-2-1 / VAS:58", vas: 58, details: { mobility: 3, selfcare: 3, activity: 3, pain: 2, anxiety: 1 } };

  // 病例 003：3天前入组 → 今天正好是【第3天 (V2-1) 采集到期日】！（首次录入账号：dr_chenjing 陈静）
  const start3 = window.addDaysToDateStr(today, -3);
  const s3 = window.createEmptySubject("003", start3, window.EDC_USERS[2]);
  s3.name = "王明";
  s3.initials = "WMI";
  s3.status = "进行中";
  Object.assign(s3.v1.demographics, {
    hospitalId: "ZY20260701019",
    gender: "男",
    birthDate: "1966-11-08",
    age: 60,
    admissionSource: "急诊",
    phone1: "13588990011",
    height: 175,
    weight: 80,
    bmi: "26.1"
  });

  // 病例 004：31天前入组 → 第3天、第7天、出院已完成，【第30天 (V4) 随访已超期1天待采集】！（首次录入账号：crc_zhaolei 赵磊）
  const start4 = window.addDaysToDateStr(today, -31);
  const s4 = window.createEmptySubject("004", start4, window.EDC_USERS[3]);
  s4.name = "赵秀兰";
  s4.initials = "ZXL";
  s4.status = "进行中";
  Object.assign(s4.v1.demographics, {
    hospitalId: "ZY20260412055",
    gender: "女",
    birthDate: "1956-02-14",
    age: 70,
    admissionSource: "外院转入",
    phone1: "13766554433",
    height: 158,
    weight: 61,
    bmi: "24.4"
  });
  s4.v2_1.completed = true;
  s4.v2_1.visitDate = window.addDaysToDateStr(start4, 3);
  s4.v2_1.vitals = { temp: "36.7", resp: "18", pulse: "76", sbp: "138", dbp: "80" };
  s4.v2_2.completed = true;
  s4.v2_2.visitDate = window.addDaysToDateStr(start4, 7);
  s4.v2_2.vitals = { temp: "36.6", resp: "18", pulse: "74", sbp: "134", dbp: "78" };
  s4.v3.completed = true;
  s4.v3.visitDate = window.addDaysToDateStr(start4, 15);
  s4.v3.outcome = { status: "存活出院", date: window.addDaysToDateStr(start4, 15), destination: "回家", destinationOther: "", deathReason: "" };

  return [s1, s2, s3, s4];
};
