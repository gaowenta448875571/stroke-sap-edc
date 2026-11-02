// 临床量表完整评估标准与自动算分配置
// 严格对应《病例报告表.docx》与《病例报告表精简版.doc》中的评分细则

window.CLINICAL_SCALES = {
  GCS: {
    id: "GCS",
    name: "格拉斯哥昏迷评分 (GCS)",
    range: "3 - 15 分",
    needAcupunctureFlag: true,
    description: "请根据真实情况进行填写，总分 3-15 分（15分意识清醒，≤8分为昏迷）。",
    items: [
      {
        id: "eye",
        title: "1. 睁眼反应 (E)",
        options: [
          { score: 1, label: "1分 - 任何刺激不睁眼" },
          { score: 2, label: "2分 - 疼痛刺激时睁眼" },
          { score: 3, label: "3分 - 语言刺激时睁眼" },
          { score: 4, label: "4分 - 自己睁眼" }
        ]
      },
      {
        id: "verbal",
        title: "2. 言语反应 (V)",
        options: [
          { score: 1, label: "1分 - 无语言" },
          { score: 2, label: "2分 - 难以理解" },
          { score: 3, label: "3分 - 能理解，不连贯" },
          { score: 4, label: "4分 - 对话含糊" },
          { score: 5, label: "5分 - 正常" }
        ]
      },
      {
        id: "motor",
        title: "3. 非偏瘫侧运动反应 (M)",
        options: [
          { score: 1, label: "1分 - 对任何疼痛无运动反应" },
          { score: 2, label: "2分 - 痛刺激时有伸展反应" },
          { score: 3, label: "3分 - 痛刺激时有屈曲反应" },
          { score: 4, label: "4分 - 痛刺激时有逃避反应" },
          { score: 5, label: "5分 - 痛刺激时能拨开医生的手" },
          { score: 6, label: "6分 - 正常（执行指令）" }
        ]
      }
    ]
  },

  NIHSS: {
    id: "NIHSS",
    name: "美国国立卫生研究院卒中量表 (NIHSS)",
    range: "0 - 42 分",
    needAcupunctureFlag: true,
    description: "按表逐项评定，其中 9 分项（截肢/关节融合/气管插管）不计入总分，须注明原因。",
    items: [
      {
        id: "1a",
        title: "1a. 意识水平",
        method: "先观察，如患者为非觉醒状态，再依次呼叫患者、轻拍肩膀、按压眶上切迹判断",
        options: [
          { score: 0, label: "0分 - 清醒，反应敏锐" },
          { score: 1, label: "1分 - 嗜睡，最小刺激能唤醒患者完成指令、回答问题或有反应" },
          { score: 2, label: "2分 - 昏睡或反应迟钝，需强烈反复刺激或疼痛刺激才有非固定模式反应" },
          { score: 3, label: "3分 - 仅有反射活动或自发反应，或完全没反应、软瘫" }
        ]
      },
      {
        id: "1b",
        title: "1b. 意识水平提问",
        method: "询问患者月份、年龄。回答必须正确，不能大致正常",
        options: [
          { score: 0, label: "0分 - 都正确" },
          { score: 1, label: "1分 - 正确回答一个（气管插管/创伤/严重构音障碍不能说话者记1分）" },
          { score: 2, label: "2分 - 两个都不正确或不能说（失语和昏迷者记2分）" }
        ]
      },
      {
        id: "1c",
        title: "1c. 意识水平指令",
        method: "要求患者睁眼、闭眼；非瘫痪手握拳、张手",
        options: [
          { score: 0, label: "0分 - 都正确" },
          { score: 1, label: "1分 - 正确完成一个" },
          { score: 2, label: "2分 - 都不正确" }
        ]
      },
      {
        id: "2",
        title: "2. 凝视",
        method: "只测试水平眼球运动，对随意或反射性眼球运动记分",
        options: [
          { score: 0, label: "0分 - 正常" },
          { score: 1, label: "1分 - 部分凝视麻痹（眼球偏斜能被随意或反射性活动纠正；独立外周神经麻痹记1分）" },
          { score: 2, label: "2分 - 被动凝视或完全凝视麻痹（不能被眼头动作克服）" }
        ]
      },
      {
        id: "3",
        title: "3. 视野",
        method: "用对诊法检查视野（上下象限），可用辨认手指数或视威胁检测",
        options: [
          { score: 0, label: "0分 - 无视野缺失" },
          { score: 1, label: "1分 - 部分偏盲（明确的非对称盲，包括象限盲）" },
          { score: 2, label: "2分 - 完全偏盲" },
          { score: 3, label: "3分 - 双侧偏盲（全盲，包括皮质盲）" }
        ]
      },
      {
        id: "4",
        title: "4. 面瘫",
        method: "通过言语指令或动作示意，要求患者示齿、扬眉和闭眼",
        options: [
          { score: 0, label: "0分 - 正常" },
          { score: 1, label: "1分 - 最小（鼻唇沟变平、微笑时不对称）" },
          { score: 2, label: "2分 - 部分（下面部完全或几乎完全瘫痪，中枢性瘫）" },
          { score: 3, label: "3分 - 完全（单或双侧瘫痪，上下面部缺乏运动，周围性瘫）" }
        ]
      },
      {
        id: "5a",
        title: "5a. 左上肢运动",
        method: "坐位90°、卧位45°时嘱患者伸展上肢，坚持10s",
        options: [
          { score: 0, label: "0分 - 于要求位置坚持10s，无下落" },
          { score: 1, label: "1分 - 能抬起，但不能维持10s，下落时不撞击床" },
          { score: 2, label: "2分 - 能对抗一些重力，但不能达到或维持要求位置，较快下落到床" },
          { score: 3, label: "3分 - 不能抗重力，上肢快速下落" },
          { score: 4, label: "4分 - 无运动" },
          { score: 9, label: "9分 - 截肢或关节融合（不计入总分）", excludeFromSum: true }
        ]
      },
      {
        id: "5b",
        title: "5b. 右上肢运动",
        method: "坐位90°、卧位45°时嘱患者伸展上肢，坚持10s",
        options: [
          { score: 0, label: "0分 - 于要求位置坚持10s，无下落" },
          { score: 1, label: "1分 - 能抬起，但不能维持10s，下落时不撞击床" },
          { score: 2, label: "2分 - 能对抗一些重力，但不能达到或维持要求位置，较快下落到床" },
          { score: 3, label: "3分 - 不能抗重力，上肢快速下落" },
          { score: 4, label: "4分 - 无运动" },
          { score: 9, label: "9分 - 截肢或关节融合（不计入总分）", excludeFromSum: true }
        ]
      },
      {
        id: "6a",
        title: "6a. 左下肢运动",
        method: "卧位抬高30°，坚持5s",
        options: [
          { score: 0, label: "0分 - 于要求位置坚持5s，不下落" },
          { score: 1, label: "1分 - 在5s末下落，不撞击床" },
          { score: 2, label: "2分 - 5s内较快下落到床上，但可抗重力" },
          { score: 3, label: "3分 - 快速落下，不能抗重力" },
          { score: 4, label: "4分 - 无运动" },
          { score: 9, label: "9分 - 截肢或关节融合（不计入总分）", excludeFromSum: true }
        ]
      },
      {
        id: "6b",
        title: "6b. 右下肢运动",
        method: "卧位抬高30°，坚持5s",
        options: [
          { score: 0, label: "0分 - 于要求位置坚持5s，不下落" },
          { score: 1, label: "1分 - 在5s末下落，不撞击床" },
          { score: 2, label: "2分 - 5s内较快下落到床上，但可抗重力" },
          { score: 3, label: "3分 - 快速落下，不能抗重力" },
          { score: 4, label: "4分 - 无运动" },
          { score: 9, label: "9分 - 截肢或关节融合（不计入总分）", excludeFromSum: true }
        ]
      },
      {
        id: "7",
        title: "7. 共济失调",
        method: "双侧指鼻、跟膝胫试验",
        options: [
          { score: 0, label: "0分 - 没有共济失调" },
          { score: 1, label: "1分 - 一个肢体有" },
          { score: 2, label: "2分 - 两个及两个以上肢体有" },
          { score: 9, label: "9分 - 截肢或关节融合（不计入总分）", excludeFromSum: true }
        ]
      },
      {
        id: "8",
        title: "8. 感觉",
        method: "针刺刺激观察感觉缺失（无反应四肢瘫、昏迷记2分）",
        options: [
          { score: 0, label: "0分 - 正常，无感觉缺失" },
          { score: 1, label: "1分 - 轻到中度，患侧针刺感不明显或为钝性或仅有触觉" },
          { score: 2, label: "2分 - 严重到完全感觉缺失，面、上肢、下肢无触觉" }
        ]
      },
      {
        id: "9",
        title: "9. 语言",
        method: "叫出物体名称、阅读句子及理解指令（昏迷记3分）",
        options: [
          { score: 0, label: "0分 - 正常，无失语" },
          { score: 1, label: "1分 - 轻到中度，流利程度和理解能力有一些缺损" },
          { score: 2, label: "2分 - 严重失语，破碎语言表达，需推理猜测" },
          { score: 3, label: "3分 - 哑或完全失语，不能讲或不能理解" }
        ]
      },
      {
        id: "10",
        title: "10. 构音障碍",
        method: "读或重复单词（妈妈、大地、飞机、丝绸、按时开工）",
        options: [
          { score: 0, label: "0分 - 正常" },
          { score: 1, label: "1分 - 轻到中度，至少有一些发声不清，但能被理解" },
          { score: 2, label: "2分 - 言语不清，不能被理解" },
          { score: 9, label: "9分 - 气管插管或其他物理障碍（不计入总分）", excludeFromSum: true }
        ]
      },
      {
        id: "11",
        title: "11. 忽视症",
        method: "检验对左右侧同时发生的皮肤感觉和视觉刺激的识别能力",
        options: [
          { score: 0, label: "0分 - 无忽视症" },
          { score: 1, label: "1分 - 视、触、听、空间觉或自身注意力下降，或双侧同时刺激时任一感觉消失" },
          { score: 2, label: "2分 - 对超过一种以上感觉测试有严重的半侧注意力丧失" }
        ]
      }
    ]
  },

  SOFA: {
    id: "SOFA",
    name: "序贯器官衰竭评分 (SOFA)",
    range: "0 - 24 分",
    needAcupunctureFlag: true,
    description: "评估六大器官系统功能障碍程度，支持填入实测结果并打分。",
    items: [
      {
        id: "resp",
        title: "1. 呼吸系统 (PaO₂/FiO₂ 氧合指数, mmHg)",
        hasMeasuredInput: true,
        unit: "mmHg",
        options: [
          { score: 0, label: "0分 - ≥ 400" },
          { score: 1, label: "1分 - < 400" },
          { score: 2, label: "2分 - < 300" },
          { score: 3, label: "3分 - < 200 + 机械通气（无创/有创）" },
          { score: 4, label: "4分 - < 100 + 机械通气（无创/有创）" }
        ]
      },
      {
        id: "coag",
        title: "2. 凝血系统 (血小板计数, ×10⁹/L)",
        hasMeasuredInput: true,
        unit: "×10⁹/L",
        options: [
          { score: 0, label: "0分 - ≥ 150" },
          { score: 1, label: "1分 - < 150" },
          { score: 2, label: "2分 - < 100" },
          { score: 3, label: "3分 - < 50" },
          { score: 4, label: "4分 - < 20" }
        ]
      },
      {
        id: "liver",
        title: "3. 肝脏 (总胆红素, μmol/L)",
        hasMeasuredInput: true,
        unit: "μmol/L",
        options: [
          { score: 0, label: "0分 - < 20" },
          { score: 1, label: "1分 - 20 ~ 32" },
          { score: 2, label: "2分 - 33 ~ 101" },
          { score: 3, label: "3分 - 102 ~ 204" },
          { score: 4, label: "4分 - > 204" }
        ]
      },
      {
        id: "cardio",
        title: "4. 心血管系统 (MAP 或血管活性药物剂量 μg/kg·min)",
        hasMeasuredInput: true,
        unit: "mmHg / μg/kg·min",
        options: [
          { score: 0, label: "0分 - MAP ≥ 70 mmHg" },
          { score: 1, label: "1分 - MAP < 70 mmHg" },
          { score: 2, label: "2分 - 多巴胺 ≤ 5 或多巴酚丁胺任何剂量" },
          { score: 3, label: "3分 - 多巴胺 > 5，或肾上腺素 ≤ 0.1，或去甲肾上腺素 ≤ 0.1" },
          { score: 4, label: "4分 - 多巴胺 > 15，或肾上腺素 > 0.1，或去甲肾上腺素 > 0.1" }
        ]
      },
      {
        id: "cns",
        title: "5. 中枢神经系统 (格拉斯哥昏迷评分 GCS)",
        hasMeasuredInput: true,
        unit: "分",
        options: [
          { score: 0, label: "0分 - GCS = 15" },
          { score: 1, label: "1分 - GCS 13 ~ 14" },
          { score: 2, label: "2分 - GCS 10 ~ 12" },
          { score: 3, label: "3分 - GCS 6 ~ 9" },
          { score: 4, label: "4分 - GCS < 6" }
        ]
      },
      {
        id: "renal",
        title: "6. 肾脏功能 (肌酐 μmol/L 或尿量)",
        hasMeasuredInput: true,
        unit: "μmol/L",
        options: [
          { score: 0, label: "0分 - < 110" },
          { score: 1, label: "1分 - 110 ~ 170" },
          { score: 2, label: "2分 - 171 ~ 299" },
          { score: 3, label: "3分 - 300 ~ 440 或尿量 < 500 ml/d" },
          { score: 4, label: "4分 - > 440 或尿量 < 200 ml/d" }
        ]
      }
    ]
  },

  FOIS: {
    id: "FOIS",
    name: "功能性经口摄食分级 (FOIS)",
    range: "1 - 7 级",
    needAcupunctureFlag: true,
    description: "评估患者经口进食与管饲依赖情况（单选 1-7 级）。",
    items: [
      {
        id: "level",
        title: "功能性经口摄食分级 (1-7级)",
        options: [
          { score: 1, label: "1级 - 不能经口进食" },
          { score: 2, label: "2级 - 依赖鼻饲管进食，最小量的尝试进食食物或液体" },
          { score: 3, label: "3级 - 依赖管饲进食，经口进食单一质地的食物或液体" },
          { score: 4, label: "4级 - 完全经口进食单一质地的食物" },
          { score: 5, label: "5级 - 完全经口进食多种质地的食物，但需要特殊的准备或代偿" },
          { score: 6, label: "6级 - 完全经口进食不需要特殊的准备，但有特殊的食物限制" },
          { score: 7, label: "7级 - 完全经口进食没有限制" }
        ]
      }
    ]
  },

  EQ5D: {
    id: "EQ5D",
    name: "EQ-5D-3L 健康指数量表 (EuroQol)",
    range: "5维度 + VAS (0-100分)",
    needAcupunctureFlag: false,
    description: "记录 5 个健康维度状态（1-3级）及今日健康 VAS 评分（0-100分）。",
    items: [
      {
        id: "mobility",
        title: "1. 活动能力",
        options: [
          { score: 1, label: "1 - 走路没问题" },
          { score: 2, label: "2 - 走路有些问题" },
          { score: 3, label: "3 - 卧床不起" }
        ]
      },
      {
        id: "selfcare",
        title: "2. 自理能力",
        options: [
          { score: 1, label: "1 - 可以完全自理" },
          { score: 2, label: "2 - 洗澡或穿衣服有些问题" },
          { score: 3, label: "3 - 无法自己洗澡或穿衣服" }
        ]
      },
      {
        id: "activity",
        title: "3. 日常活动（工作、学习、家务、家庭或闲暇活动）",
        options: [
          { score: 1, label: "1 - 进行日常活动没有问题" },
          { score: 2, label: "2 - 进行日常活动有些问题" },
          { score: 3, label: "3 - 无法进行日常活动" }
        ]
      },
      {
        id: "pain",
        title: "4. 疼痛 / 不舒适",
        options: [
          { score: 1, label: "1 - 没有疼痛/不舒适" },
          { score: 2, label: "2 - 有中度疼痛/不舒适" },
          { score: 3, label: "3 - 极度疼痛/不舒适" }
        ]
      },
      {
        id: "anxiety",
        title: "5. 焦虑 / 抑郁",
        options: [
          { score: 1, label: "1 - 不焦虑/抑郁" },
          { score: 2, label: "2 - 轻度焦虑/抑郁" },
          { score: 3, label: "3 - 中度/重度焦虑/抑郁" }
        ]
      }
    ],
    hasVasScore: true
  },

  MRS: {
    id: "MRS",
    name: "改良 Rankin 量表 (mRS)",
    range: "0 - 6 分",
    needAcupunctureFlag: true,
    description: "评估脑卒中后神经功能残障与独立生活能力（0-6分）。",
    items: [
      {
        id: "grade",
        title: "mRS 患者功能残障状况评分",
        options: [
          { score: 0, label: "0分 - 完全没有症状" },
          { score: 1, label: "1分 - 尽管有症状，但未见明显残障；能完成所有经常从事的职责和活动" },
          { score: 2, label: "2分 - 轻度残障；不能完成所有以前从事的活动，但能处理个人事务而不需帮助" },
          { score: 3, label: "3分 - 中度残障；需要一些协助，但行走不需要协助" },
          { score: 4, label: "4分 - 重度残障；离开他人协助不能行走，以及不能照顾自己的身体需要" },
          { score: 5, label: "5分 - 严重残障；卧床不起、大小便失禁、需持续护理和照顾" },
          { score: 6, label: "6分 - 死亡" }
        ]
      }
    ]
  }
};
