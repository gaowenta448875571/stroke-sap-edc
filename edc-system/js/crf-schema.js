// 病例报告表 (CRF) 核心元数据配置
// 严格对应《重症卒中相关性肺炎多组学预测标志物筛选及针刺多靶点调控机制研究 病例报告表（CRF）》

window.CRF_CONFIG = {
  project: {
    title: "重症卒中相关性肺炎多组学预测标志物筛选及针刺多靶点调控机制研究",
    shortTitle: "病例报告表 (eCRF)",
    version: "第1.0版 / 2026年04月20日",
    sapRuleNote: "若确诊肺部感染，停止在“未感染路径”中采集炎症指标，转入肺部感染观察表中采集；其他指标、结局、安全性及临床必需信息仍按方案采集。"
  },

  // 访视与模块导航列表（严格对应研究流程表）
  visits: [
    {
      id: "FLOWCHART",
      code: "流程与说明",
      name: "研究流程表与填表说明",
      timeWindow: "全周期总览",
      category: "overview"
    },
    {
      id: "V1",
      code: "V1",
      name: "基线入组筛查表",
      timeWindow: "-1 ~ 0 天（入院基线）",
      category: "visit",
      modules: [
        "知情同意与人口学",
        "病史与入院查体",
        "基础生命体征与心电图",
        "颅脑与胸部影像",
        "基线实验室全套检查",
        "临床量表评分 (GCS/NIHSS/SOFA/FOIS/EQ-5D)",
        "中医四诊信息采集与诊断",
        "纳入/排除标准与入组确认",
        "生物样本采集 (血浆/咽拭子/粪便)"
      ]
    },
    {
      id: "V2_1",
      code: "V2-1",
      name: "第3天治疗观察表",
      timeWindow: "住院期间 - 第 3 天",
      category: "visit",
      modules: [
        "基础生命体征监测",
        "实验室检查（炎症5项/出凝血5项/器官功能3项）",
        "临床量表评分（GCS/NIHSS/FOIS/SOFA/EQ-5D）"
      ]
    },
    {
      id: "V2_2",
      code: "V2-2",
      name: "第7天治疗观察表",
      timeWindow: "住院期间 - 第 7 天",
      category: "visit",
      modules: [
        "基础生命体征监测",
        "实验室检查（炎症6项含PCT/出凝血5项/器官功能3项）",
        "临床量表评分（GCS/NIHSS/FOIS/SOFA/EQ-5D）",
        "生物样本采集（血浆/咽拭子/粪便）"
      ]
    },
    {
      id: "V2_3",
      code: "V2-3",
      name: "出现肺感染指征专表",
      timeWindow: "住院期间 - 出现肺感染指征时触发",
      category: "visit",
      isConditional: true,
      modules: [
        "基础生命体征与触发时点炎症指标",
        "肺部感染诊断判定与诊断依据核查",
        "感染实验室（当天 vs 3日后）与病原学检查",
        "胸部影像复查与肺炎 PSI 严重度评分",
        "生物样本采集（血浆/咽拭子/粪便）"
      ]
    },
    {
      id: "V3",
      code: "V3",
      name: "出院时观察表",
      timeWindow: "出院当日",
      category: "visit",
      modules: [
        "出院量表评分（GCS/NIHSS/FOIS/EQ-5D）",
        "改良 Rankin 量表 (mRS)",
        "出院时结局与去向"
      ]
    },
    {
      id: "V4",
      code: "V4",
      name: "第30天随访表",
      timeWindow: "发病第 30 天 (±3天)",
      category: "followup",
      modules: [
        "随访量表评分（FOIS/EQ-5D/mRS）",
        "第30天生存状态",
        "截至发病第30天再入院事件"
      ]
    },
    {
      id: "V5",
      code: "V5",
      name: "第90天随访表",
      timeWindow: "发病第 90 天 (±5天)",
      category: "followup",
      modules: [
        "随访量表评分（FOIS/EQ-5D/mRS）",
        "第90天生存状态",
        "发病第31-90天再入院事件"
      ]
    },
    {
      id: "COMPLICATIONS",
      code: "全程-并发症",
      name: "并发症记录表",
      timeWindow: "住院与观察期间随时记录",
      category: "continuous"
    },
    {
      id: "TREATMENT",
      code: "全程-治疗",
      name: "治疗与用药记录表",
      timeWindow: "再灌注/管道/西药/中成药/中草药/针刺非药物",
      category: "continuous"
    },
    {
      id: "AE",
      code: "全程-AE",
      name: "不良事件 (AE/SAE) 记录表",
      timeWindow: "试验期间随时记录与上报",
      category: "continuous"
    },
    {
      id: "SUMMARY",
      code: "总结与签审",
      name: "试验总结与PI审核签字页",
      timeWindow: "研究完成或退出时",
      category: "summary"
    }
  ],

  // 研究流程矩阵（用于流程表展示与进度追踪）
  scheduleMatrix: [
    { item: "签署知情同意书", v1: true, v2_1: false, v2_2: false, v2_3: false, v3: false, v4: false, v5: false },
    { item: "人口学资料", v1: true, v2_1: false, v2_2: false, v2_3: false, v3: false, v4: false, v5: false },
    { item: "病史资料与入院查体", v1: true, v2_1: false, v2_2: false, v2_3: false, v3: false, v4: false, v5: false },
    { item: "基础生命体征监测表", v1: true, v2_1: true, v2_2: true, v2_3: true, v3: false, v4: false, v5: false },
    { item: "入院心电图 (ECG)", v1: true, v2_1: false, v2_2: false, v2_3: false, v3: false, v4: false, v5: false },
    { item: "颅脑影像 (MR / CT)", v1: true, v2_1: false, v2_2: false, v2_3: false, v3: false, v4: false, v5: false },
    { item: "实验室 - 炎症指标", v1: true, v2_1: true, v2_2: true, v2_3: true, v3: false, v4: false, v5: false },
    { item: "实验室 - 出凝血指标", v1: true, v2_1: true, v2_2: true, v2_3: false, v3: false, v4: false, v5: false },
    { item: "实验室 - 营养与代谢指标", v1: true, v2_1: false, v2_2: false, v2_3: false, v3: false, v4: false, v5: false },
    { item: "实验室 - 器官功能指标", v1: true, v2_1: true, v2_2: true, v2_3: false, v3: false, v4: false, v5: false },
    { item: "实验室 - 细胞因子指标", v1: true, v2_1: false, v2_2: false, v2_3: false, v3: false, v4: false, v5: false },
    { item: "GCS 评分", v1: true, v2_1: true, v2_2: true, v2_3: false, v3: true, v4: false, v5: false },
    { item: "NIHSS 评分", v1: true, v2_1: true, v2_2: true, v2_3: false, v3: true, v4: false, v5: false },
    { item: "FOIS 评分", v1: true, v2_1: true, v2_2: true, v2_3: false, v3: true, v4: true, v5: true },
    { item: "SOFA 评分", v1: true, v2_1: true, v2_2: true, v2_3: false, v3: false, v4: false, v5: false },
    { item: "EQ-5D-3L 评分", v1: true, v2_1: true, v2_2: true, v2_3: false, v3: true, v4: true, v5: true },
    { item: "四诊信息采集与诊断", v1: true, v2_1: false, v2_2: false, v2_3: false, v3: false, v4: false, v5: false },
    { item: "胸部影像 (胸CT / 胸X线)", v1: true, v2_1: false, v2_2: false, v2_3: true, v3: false, v4: false, v5: false },
    { item: "病原学检查 (痰/咽培养/耐药/真菌)", v1: false, v2_1: false, v2_2: false, v2_3: true, v3: false, v4: false, v5: false },
    { item: "肺炎 PSI 评分", v1: false, v2_1: false, v2_2: false, v2_3: true, v3: false, v4: false, v5: false },
    { item: "生物样本采集（血、咽拭子、粪便）", v1: true, v2_1: false, v2_2: true, v2_3: true, v3: false, v4: false, v5: false },
    { item: "生存状态", v1: false, v2_1: false, v2_2: false, v2_3: false, v3: true, v4: true, v5: true },
    { item: "mRS 评分", v1: false, v2_1: false, v2_2: false, v2_3: false, v3: true, v4: true, v5: true },
    { item: "再入院事件", v1: false, v2_1: false, v2_2: false, v2_3: false, v3: false, v4: true, v5: true }
  ],

  // 实验室指标定义（含单位与参考范围提示）
  labPanels: {
    inflammation: {
      title: "炎症指标",
      items: [
        { id: "wbc", name: "白细胞数 (WBC)", unit: "×10⁹/L", ref: "3.5 - 9.5", inV2_1: true },
        { id: "neut", name: "中性粒细胞绝对值 (NEUT#)", unit: "×10⁹/L", ref: "1.8 - 6.3", inV2_1: true },
        { id: "lymph", name: "淋巴细胞绝对值 (LYMPH#)", unit: "×10⁹/L", ref: "1.1 - 3.2", inV2_1: true },
        { id: "nlr", name: "中性粒细胞/淋巴细胞比值 (NLR)", unit: "比值(自动计算)", ref: "1.0 - 3.0", inV2_1: true, autoCalc: true },
        { id: "crp", name: "C-反应蛋白 (CRP)", unit: "mg/L", ref: "0 - 10", inV2_1: true },
        { id: "pct", name: "降钙素原-PCT定量", unit: "ng/mL", ref: "< 0.05", inV2_1: false }
      ]
    },
    coagulation: {
      title: "出凝血指标",
      items: [
        { id: "plt", name: "血小板计数 (PLT)", unit: "×10⁹/L", ref: "125 - 350" },
        { id: "ddimer", name: "D-二聚体 (D-Dimer)", unit: "mg/L FEU", ref: "0 - 0.55" },
        { id: "inr", name: "国际标准化比值 (INR)", unit: "-", ref: "0.8 - 1.2" },
        { id: "aptt", name: "活化部分凝血活酶时间 (APTT)", unit: "s", ref: "25 - 37" },
        { id: "fib", name: "纤维蛋白原 (FIB)", unit: "g/L", ref: "2.0 - 4.0" }
      ]
    },
    nutrition: {
      title: "营养与代谢指标",
      items: [
        { id: "alb", name: "白蛋白 (ALB)", unit: "g/L", ref: "40 - 55" },
        { id: "palb", name: "前白蛋白 (PA)", unit: "mg/L", ref: "200 - 400" },
        { id: "hb", name: "血红蛋白 (Hb)", unit: "g/L", ref: "120 - 160" },
        { id: "glu", name: "随机/空腹血糖 (GLU)", unit: "mmol/L", ref: "3.9 - 6.1" }
      ]
    },
    organ: {
      title: "器官功能指标",
      items: [
        { id: "scr", name: "血清肌酐 (SCr)", unit: "μmol/L", ref: "44 - 106" },
        { id: "tbil", name: "总胆红素 (TBIL)", unit: "μmol/L", ref: "3.4 - 20.5" },
        { id: "pao2_fio2", name: "氧合指数 (PaO₂/FiO₂)", unit: "mmHg", ref: "400 - 500" }
      ]
    },
    cytokines: {
      title: "细胞因子指标",
      items: [
        { id: "il2", name: "白介素-2 (IL-2)", unit: "pg/mL", ref: "0 - 5.0" },
        { id: "il4", name: "白介素-4 (IL-4)", unit: "pg/mL", ref: "0 - 5.0" },
        { id: "il6", name: "白介素-6 (IL-6)", unit: "pg/mL", ref: "0 - 7.0" },
        { id: "ifn_gamma", name: "干扰素γ (IFN-γ)", unit: "pg/mL", ref: "0 - 10.0" },
        { id: "il10", name: "白介素-10 (IL-10)", unit: "pg/mL", ref: "0 - 5.0" },
        { id: "tnf_alpha", name: "肿瘤坏死因子-α (TNF-α)", unit: "pg/mL", ref: "0 - 8.1" }
      ]
    }
  },

  // 中医四诊信息采集模块
  tcmFourDiagnostics: [
    {
      category: "一、寒热与诱因",
      fields: [
        { id: "inducer", label: "发病诱因", type: "checkbox", options: ["无特殊", "情绪诱发", "劳累诱发", "受凉诱发", "其他", "无法获知"] },
        { id: "chills_fever", label: "寒热表现", type: "checkbox", options: ["无特殊", "五心烦热", "恶寒", "发热", "寒热往来", "其他", "无法评估"] }
      ]
    },
    {
      category: "二、疼痛与感觉",
      fields: [
        { id: "sensory_pain", label: "疼痛/感觉异常", type: "checkbox", options: ["无特殊", "感觉麻木(半身)", "感觉麻木(全身)", "感觉麻木(局部)", "疼痛(半身)", "疼痛(全身)", "疼痛(局部)", "其他", "无法评估"] }
      ]
    },
    {
      category: "三、头面五官",
      fields: [
        { id: "face", label: "面部症状", type: "checkbox", options: ["无特殊", "口舌歪斜", "牙关紧闭", "目合口张", "面红目赤", "其他", "无法评估"] },
        { id: "eyes", label: "眼部症状", type: "checkbox", options: ["无特殊", "瞳孔变化(大小/对光)", "凝视偏向", "其他", "无法评估"] },
        { id: "mouth", label: "口咽症状", type: "checkbox", options: ["无特殊", "气粗口臭", "口角流涎", "其他", "无法评估"] }
      ]
    },
    {
      category: "四、神志与言语",
      fields: [
        { id: "consciousness", label: "意识状态", type: "radio", options: ["清醒", "嗜睡", "昏睡", "昏迷", "意识模糊", "镇静状态", "其他"] },
        { id: "speech", label: "言语功能", type: "checkbox", options: ["正常", "舌强言蹇", "构音障碍", "失语", "其他", "气管插管/无法评估"] },
        { id: "emotion", label: "情志表现", type: "checkbox", options: ["配合/安静", "心烦易怒", "躁扰不宁", "其他", "无法评估"] }
      ]
    },
    {
      category: "五、饮食二便",
      fields: [
        { id: "swallow_resp", label: "吞咽与呼吸", type: "checkbox", options: ["正常", "吞咽障碍", "饮水呛咳", "呃逆", "咳痰/痰多", "其他", "无法评估"] },
        { id: "appetite", label: "胃纳呕吐", type: "checkbox", options: ["无特殊", "纳差", "呕吐", "腹胀", "其他", "无法评估"] },
        { id: "excretion", label: "二便情况", type: "radio", options: ["二便正常", "二便不通（闭）", "二便自遗（脱）", "其他", "无法获知"] }
      ]
    },
    {
      category: "六、肢体经络",
      fields: [
        { id: "motor", label: "运动功能", type: "radio", options: ["正常", "半身不遂(左)", "半身不遂(右)", "四肢瘫", "其他", "无法评估"] },
        { id: "tone", label: "肌张力/形态", type: "checkbox", options: ["正常", "肢体软瘫", "肢体强痉", "肢体抽搐", "共济失调", "其他", "无法评估"] }
      ]
    },
    {
      category: "七、舌象 (关键)",
      fields: [
        { id: "tongue_color", label: "舌色", type: "radio", options: ["淡红", "淡白", "红", "绛", "紫", "其他", "未查/无法观察"] },
        { id: "tongue_shape", label: "舌形 (可多选)", type: "checkbox", options: ["正常", "胖大", "胀大", "瘦薄", "齿痕", "裂纹", "芒刺", "苍老", "娇嫩", "其他", "未查/无法观察"] },
        { id: "tongue_motion", label: "舌态", type: "checkbox", options: ["正常", "歪斜", "僵硬/舌强", "短缩", "颤动", "痿软", "吐弄", "麻痹", "其他", "未查/无法观察"] },
        { id: "fur_color", label: "苔色", type: "checkbox", options: ["薄白", "白", "黄", "灰", "黑", "其他", "未查/无法观察"] },
        { id: "fur_quality", label: "苔质 (可多选)", type: "checkbox", options: ["正常", "薄", "厚", "腻", "燥", "润", "腐", "剥落", "无根", "其他", "未查/无法观察"] }
      ]
    },
    {
      category: "八、脉象 (关键)",
      fields: [
        {
          id: "pulse",
          label: "脉象 (多选)",
          type: "checkbox",
          options: ["浮", "沉", "迟", "数", "虚", "实", "弦", "滑", "涩", "细", "洪", "濡", "弱", "紧", "缓", "结", "代", "促", "疾", "动", "微", "散", "芤", "革", "伏", "牢", "短", "长", "大", "无脉", "其他", "未查/无法评估"]
        }
      ]
    }
  ],

  // 纳入标准与排除标准（严格对应《病例报告表.docx》）
  eligibility: {
    inclusion: [
      { id: "inc_1", text: "1. 符合重症卒中诊断标准且符合中医中风病标准" },
      { id: "inc_2", text: "2. 年龄 ≥ 18岁，性别不限" },
      { id: "inc_3", text: "3. 重症卒中发作后 24 小时内入院" },
      { id: "inc_4", text: "4. 了解并遵循临床试验程序，自愿参加并签署知情同意书（可由本人或监护人自愿签署）" }
    ],
    exclusion: [
      { id: "exc_1", text: "1. 蛛网膜下腔出血、脑出血患者" },
      { id: "exc_2", text: "2. 非脑血管病因素：经 CT/MRI 证实为脑肿瘤、脑外伤、脑脓肿等引起的脑部病变" },
      { id: "exc_3", text: "3. 入院时已存在肺炎、需氧疗的重度慢性肺疾病（如 COPD GOLD Ⅲ-Ⅳ级）或其他活动性感染" },
      { id: "exc_4", text: "4. 重症卒中入院 24 小时，溶栓或血管内治疗后已转为非重症卒中者" },
      { id: "exc_5", text: "5. 入院前 72 小时内已接受抗生素治疗（避免掩盖 SAP 临床症状）" }
    ]
  },

  // 肺炎 PSI 评分项目定义
  psiItems: [
    { id: "nursing_home", category: "人口学特征", label: "常住养老院", points: 10, type: "check" },
    { id: "neoplastic", category: "合并症", label: "肿瘤（活动性或1年内确诊，除外皮肤基底细胞癌）", points: 30, type: "check_note" },
    { id: "liver", category: "合并症", label: "肝脏疾病（临床诊断或肝硬化影像证据）", points: 20, type: "check_note" },
    { id: "chf", category: "合并症", label: "充血性心力衰竭（有病史或影像学证据）", points: 10, type: "check_note" },
    { id: "cvd", category: "合并症", label: "脑血管疾病（如卒中、TIA史）", points: 10, type: "check_note" },
    { id: "renal", category: "合并症", label: "肾脏疾病（既往有慢性肾病史或透析）", points: 10, type: "check_note" },
    { id: "altered_mental", category: "体征", label: "精神状态改变（意识模糊/定向力障碍）", points: 20, type: "check" },
    { id: "resp_rate", category: "体征", label: "呼吸频率 ≥ 30 次/分", points: 20, type: "check_val", unit: "次/分" },
    { id: "sbp", category: "体征", label: "收缩压 (SBP) < 90 mmHg", points: 20, type: "check_val", unit: "mmHg" },
    { id: "temp", category: "体征", label: "体温 < 35℃ 或 ≥ 40℃", points: 15, type: "check_val", unit: "℃" },
    { id: "pulse", category: "体征", label: "脉搏 ≥ 125 次/分", points: 10, type: "check_val", unit: "次/分" },
    { id: "ph", category: "实验室和影像学", label: "动脉血 pH 值 < 7.35", points: 30, type: "check_val", unit: "" },
    { id: "bun", category: "实验室和影像学", label: "血尿素氮 (BUN) ≥ 11 mmol/L (30 mg/dL)", points: 20, type: "check_val", unit: "mmol/L" },
    { id: "sodium", category: "实验室和影像学", label: "血钠 (Na) < 130 mmol/L", points: 20, type: "check_val", unit: "mmol/L" },
    { id: "glucose", category: "实验室和影像学", label: "血糖 (Glucose) ≥ 14 mmol/L (250 mg/dL)", points: 10, type: "check_val", unit: "mmol/L" },
    { id: "hct", category: "实验室和影像学", label: "红细胞压积 (HCT) < 30%", points: 10, type: "check_val", unit: "%" },
    { id: "pao2", category: "实验室和影像学", label: "动脉血氧分压 (PaO₂) < 60 mmHg (或 SpO₂ < 90%)", points: 10, type: "check_val", unit: "mmHg" },
    { id: "pleural_effusion", category: "实验室和影像学", label: "胸腔积液（影像学显示有积液）", points: 10, type: "check" }
  ],

  // 预设西药+中成药清单
  presetMedications: [
    { category: "抗血小板", name: "阿司匹林", unit: "mg", route: "PO/NG" },
    { category: "抗血小板", name: "氯吡格雷", unit: "mg", route: "PO/NG" },
    { category: "抗血小板", name: "替格瑞洛", unit: "mg", route: "PO/NG" },
    { category: "调脂稳斑药", name: "阿托伐他汀", unit: "mg", route: "PO/NG" },
    { category: "调脂稳斑药", name: "瑞舒伐他汀", unit: "mg", route: "PO/NG" },
    { category: "改善脑循环", name: "依达拉奉右莰醇", unit: "ml", route: "IV" },
    { category: "改善脑循环", name: "丁苯酞", unit: "ml", route: "IV" },
    { category: "改善脑循环", name: "尤瑞克林", unit: "PNA", route: "IV" },
    { category: "改善脑循环", name: "川芎嗪", unit: "ml", route: "IV" },
    { category: "改善脑循环", name: "银杏叶提取物", unit: "ml", route: "IV" },
    { category: "降颅压", name: "甘露醇", unit: "g", route: "IV" },
    { category: "控制血压", name: "氨氯地平", unit: "mg", route: "PO/NG" },
    { category: "抗生素", name: "头孢哌酮钠舒巴坦钠", unit: "g", route: "IV" },
    { category: "抗生素", name: "多西环素", unit: "mg", route: "PO/IV" },
    { category: "抗生素", name: "米诺环素", unit: "mg", route: "PO/IV" },
    { category: "中成药", name: "醒脑治瘫胶囊", unit: "粒/g", route: "PO/NG" },
    { category: "中成药", name: "益肾养肝合剂", unit: "ml", route: "PO/NG" },
    { category: "中成药", name: "扶正合剂", unit: "ml", route: "PO/NG" },
    { category: "中成药", name: "脑血栓丸", unit: "丸/g", route: "PO/NG" },
    { category: "中成药", name: "中风丸", unit: "丸/g", route: "PO/NG" }
  ],

  // 预设非药物疗法
  presetNonDrugTherapies: [
    { id: "acupuncture", name: "特殊手法针法", detailLabel: "针法选择（醒脑开窍针法 / 其他针法）", hasAcuType: true },
    { id: "plaster", name: "中药贴敷", detailLabel: "贴敷部位及药物描述" },
    { id: "auricular", name: "耳穴治疗", detailLabel: "耳穴部位描述" },
    { id: "brain_reflex", name: "脑反射治疗", detailLabel: "治疗部位描述" },
    { id: "laser", name: "激光疗法-半导体激光治疗", detailLabel: "照射部位描述" }
  ]
};
