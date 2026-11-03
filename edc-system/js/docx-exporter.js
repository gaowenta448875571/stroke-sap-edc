// 原版《病例报告表.docx》1:1 精确填报导出器与在线打印预览引擎
// 100% 基于 /病例报告表.docx 原始 OpenXML 结构 (含封面、填写说明、36个页眉、15个页脚、图片、样式及全部47张原版表格)

window.DOCX_EXPORTER = (function () {
  function escXml(str) {
    return String(str === undefined || str === null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function hasVal(v) {
    return v !== undefined && v !== null && String(v).trim() !== "";
  }

  // 解析日期字符串 "YYYY-MM-DD", "MM-DD", 或 "YYYY-MM-DDTHH:mm"
  function parseDateParts(dateStr, fallbackYear) {
    if (!hasVal(dateStr)) return null;
    const s = String(dateStr).trim();
    const mFull = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[T\s]+(\d{1,2}):(\d{1,2}))?/);
    if (mFull) {
      return {
        yyyy: mFull[1],
        yy: mFull[1].slice(2),
        mm: mFull[2].padStart(2, "0"),
        dd: mFull[3].padStart(2, "0"),
        hh: mFull[4] ? mFull[4].padStart(2, "0") : "",
        mi: mFull[5] ? mFull[5].padStart(2, "0") : ""
      };
    }
    const mShort = s.match(/^(\d{1,2})[-/](\d{1,2})$/);
    if (mShort) {
      const y = fallbackYear || "2026";
      return {
        yyyy: String(y),
        yy: String(y).slice(2),
        mm: mShort[1].padStart(2, "0"),
        dd: mShort[2].padStart(2, "0"),
        hh: "",
        mi: ""
      };
    }
    return null;
  }

  // 格式化为 "20YY年MM月DD日" 或保留 "20□□年□□月□□日"
  function fmtBoxDate(dateStr, fallback) {
    const p = parseDateParts(dateStr);
    if (!p) return fallback || "20□□年□□月□□日";
    return `${p.yyyy}年${p.mm}月${p.dd}日`;
  }

  // 格式化为 "YYYY年MM月DD日" 或保留 "____年__月__日"
  function fmtLineDate(dateStr, fallback) {
    const p = parseDateParts(dateStr);
    if (!p) return fallback || "____年__月__日";
    return `${p.yyyy}年${p.mm}月${p.dd}日`;
  }

  // 格式化为 "YYYY年MM月DD日HH时mm分"
  function fmtLineDateTime(dateStr, fallback) {
    const p = parseDateParts(dateStr);
    if (!p) return fallback || "____年__月__日__时__分";
    return `${p.yyyy}年${p.mm}月${p.dd}日${p.hh || "00"}时${p.mi || "00"}分`;
  }

  // 格式化为 "MM月DD日"
  function fmtMonthDay(dateStr, fallback) {
    const p = parseDateParts(dateStr);
    if (!p) return fallback || "__月__日";
    return `${p.mm}月${p.dd}日`;
  }

  // 在原版文本中勾选匹配项: 将 "□label" 或 "□ label" 替换为 "☑label" / "☑ label"
  function checkOpt(origText, selected) {
    let res = origText;
    const list = Array.isArray(selected)
      ? selected.map(s => String(s).trim()).filter(Boolean)
      : hasVal(selected)
      ? [String(selected).trim()]
      : [];
    if (!list.length) return res;
    list.forEach(opt => {
      if (!opt) return;
      const escaped = opt.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re1 = new RegExp(`□(\\s*)${escaped}`, "g");
      if (re1.test(res)) {
        res = res.replace(re1, `☑$1${opt}`);
      } else {
        const re2 = new RegExp(`${escaped}(\\s*)□`, "g");
        if (re2.test(res)) {
          res = res.replace(re2, `${opt}$1☑`);
        }
      }
      const re3 = new RegExp(`${escaped}（\\s*）`, "g");
      if (re3.test(res)) {
        res = res.replace(re3, `${opt}（√）`);
      }
      const re4 = new RegExp(`（\\s*）(\\s*)${escaped}`, "g");
      if (re4.test(res)) {
        res = res.replace(re4, `（√）$1${opt}`);
      }
    });
    return res;
  }

  // 勾选以特定分值/数字开头的框，例如 "□ 0 " 或 "□1  "
  function checkScorePrefix(origText, scoreVal) {
    if (!hasVal(scoreVal)) return origText;
    const s = String(scoreVal).trim();
    const escaped = s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`□(\\s*)${escaped}(?=\\s|$|[^0-9])`);
    return origText.replace(re, `☑$1${s}`);
  }

  // 构建针对当前受试者 subj 的全部标记覆盖字典
  function buildOverrides(subj) {
    const ov = {};
    const v1 = subj.v1 || {};
    const dem = v1.demographics || {};
    const hx = v1.history || {};
    const ex = v1.exam || {};
    const vit1 = v1.vitals || {};
    const ecg = v1.ecg || {};
    const img1 = v1.imaging || {};
    const labs1 = v1.labs || {};
    const sc1 = v1.scales || {};
    const tcm = v1.tcm || {};
    const diag = v1.diagnosis || {};
    const elig = v1.eligibility || {};
    const bio1 = v1.biosamples || {};

    const v2_1 = subj.v2_1 || {};
    const v2_2 = subj.v2_2 || {};
    const v2_3 = subj.v2_3 || {};
    const v3 = subj.v3 || {};
    const v4 = subj.v4 || {};
    const v5 = subj.v5 || {};

    const compObj = subj.complications || {};
    const txObj = subj.treatment || {};
    const aeObj = subj.adverseEvents || {};
    const cs = subj.summary || {};

    const centerId = subj.centerId || "01";
    const subjId = subj.id || "□□□";
    const initials = subj.initials || "□□□";
    const invName = subj.investigator || subj.ownerName || cs.piSignature || "李桂伟";
    const startDate = v1.visitDate || subj.startDate || "";
    const endDate = subj.endDate || cs.interventionEndDate || v5.visitDate || v3.visitDate || "";

    // =========================================================================
    // 1. 页眉 (H2..H32) & 页脚 (F3..F14)
    // =========================================================================
    const headerVisitDateMap = {
      2: startDate,
      3: startDate,
      5: v1.consentDate || startDate,
      7: v2_1.visitDate || startDate,
      8: v2_1.visitDate || startDate,
      9: v2_2.visitDate || startDate,
      10: v2_2.visitDate || startDate,
      11: v2_2.visitDate || startDate,
      12: v2_2.visitDate || startDate,
      13: v2_3.visitDate || subj.sapConfirmedDate || startDate,
      14: v2_3.visitDate || subj.sapConfirmedDate || startDate,
      15: v3.visitDate || (v3.outcome && v3.outcome.date) || startDate,
      16: v3.visitDate || (v3.outcome && v3.outcome.date) || startDate,
      17: v4.visitDate || startDate,
      18: v4.visitDate || startDate,
      19: v5.visitDate || startDate,
      20: v5.visitDate || startDate,
      21: v5.visitDate || startDate,
      22: v5.visitDate || startDate,
      23: startDate,
      24: startDate,
      25: startDate,
      26: startDate,
      27: startDate,
      28: startDate,
      29: startDate,
      30: startDate,
      31: endDate || startDate,
      32: cs.piSignDate || endDate || startDate
    };
    Object.keys(headerVisitDateMap).forEach(hnum => {
      ov[`H${hnum}_C1_P1`] = centerId;
      ov[`H${hnum}_C2_P1`] = subjId;
      ov[`H${hnum}_C3_P1`] = initials;
      ov[`H${hnum}_C4_P1`] = fmtBoxDate(headerVisitDateMap[hnum]);
    });

    [3, 4, 6, 8, 10, 12, 14].forEach(fnum => {
      ov[`F${fnum}_P0`] = `研究者签名：${invName}                  日期：${fmtBoxDate(cs.piSignDate || startDate)}`;
    });

    // =========================================================================
    // 2. 封面与正文段落 (B_16..B_20, B_61)
    // =========================================================================
    ov["B_16"] = `患者编号：${subjId}`;
    ov["B_17"] = `患者姓名拼音缩写：${initials} `;
    ov["B_18"] = `研究开始日期：${fmtBoxDate(v1.consentDate || startDate)}`;
    ov["B_19"] = `研究结束日期：${fmtBoxDate(endDate)}`;
    ov["B_20"] = `研究者签名：${invName}`;

    const isElig = elig.enrolled !== "否";
    ov["B_61"] = `可否入选：是${isElig ? "☑" : "□"} 否${!isElig ? "☑" : "□"}——患者编号${subjId}——入组时间：${fmtBoxDate(elig.enrollDate || startDate)}`;

    // =========================================================================
    // 3. T1: 签署知情同意书日期
    // =========================================================================
    ov["T1_R1_C0_P0"] = `患者签署知情同意书日期：${fmtBoxDate(v1.consentDate || startDate)}`;

    // =========================================================================
    // 4. T2: 人口学资料
    // =========================================================================
    ov["T2_R1_C1_P0"] = `住院号/门急诊号：${dem.hospitalId || "________________"}`;
    ov["T2_R2_C1_P0"] = orig => checkOpt(orig, dem.gender);
    ov["T2_R3_C1_P0"] = fmtLineDate(dem.birthDate);
    ov["T2_R4_C1_P0"] = orig => {
      let s = checkOpt(orig, dem.admissionSource);
      if (hasVal(dem.admissionSource_other)) {
        s = s.replace("□其他：________", `☑其他：${dem.admissionSource_other}`);
      }
      return s;
    };
    ov["T2_R5_C0_P0"] = `手机号1：${dem.phone1 || "________________"}  手机号2：${dem.phone2 || "________________"}`;
    if (hasVal(dem.nativeProvince) || hasVal(dem.nativeCity) || hasVal(dem.nativeCounty)) {
      ov["T2_R6_C1_P0"] = `${dem.nativeProvince || "____"}省（自治区、直辖市）${dem.nativeCity || "____"}市（地区、州）${dem.nativeCounty || "____"}县（区）`;
    }
    if (hasVal(dem.resideProvince) || hasVal(dem.resideCity) || hasVal(dem.resideCounty)) {
      ov["T2_R7_C1_P0"] = `${dem.resideProvince || "____"}省（自治区、直辖市）${dem.resideCity || "____"}市（地区、州）${dem.resideCounty || "____"}县（区）`;
    }
    ov["T2_R8_C0_P0"] = `身高：${hasVal(dem.height) ? dem.height : "____"}cm    体重：${hasVal(dem.weight) ? dem.weight : "____"}kg  BMI：${hasVal(dem.bmi) ? dem.bmi : "____"}kg/m2（☑实测 □估算 □无法获得）`;
    ov["T2_R9_C1_P0"] = orig => checkOpt(orig, dem.marital);
    ov["T2_R10_C1_P0"] = orig => checkOpt(orig, dem.ethnicity);
    ov["T2_R10_C1_P1"] = orig => {
      let s = checkOpt(orig, dem.ethnicity);
      const ethOther = dem.ethnicityOther || dem.ethnicity_other;
      if (hasVal(ethOther)) {
        s = s.replace("□其他:_________", `☑其他:${ethOther}`);
      }
      return s;
    };
    ov["T2_R11_C1_P0"] = orig => checkOpt(orig, dem.education);
    ov["T2_R11_C1_P1"] = orig => checkOpt(orig, dem.education);
    ov["T2_R11_C1_P2"] = orig => checkOpt(orig, dem.education);
    ov["T2_R12_C1_P0"] = orig => checkOpt(orig, dem.occupation);
    ov["T2_R12_C1_P1"] = orig => checkOpt(orig, dem.occupation);
    ov["T2_R12_C1_P2"] = orig => checkOpt(orig, dem.occupation);
    ov["T2_R12_C1_P3"] = orig => {
      let s = checkOpt(orig, dem.occupation);
      const occOther = dem.occupationOther || dem.occupation_other;
      if (hasVal(occOther)) {
        s = s.replace("□其他：_________", `☑其他：${occOther}`);
      }
      return s;
    };

    // =========================================================================
    // 5. T3: 病史资料与入院查体
    // =========================================================================
    ov["T3_R1_C0_P0"] = orig => checkOpt(orig, hx.source);
    ov["T3_R1_C0_P1"] = orig => {
      let s = checkOpt(orig, hx.source);
      if (hasVal(hx.unableReason)) s = checkOpt(s, hx.unableReason);
      return s;
    };
    ov["T3_R2_C1_P0"] = `症状首次出现时间：${fmtLineDateTime(hx.onsetTime)}`;
    ov["T3_R2_C1_P1"] = `最后正常时间：${fmtLineDateTime(hx.lastNormalTime)}  ${!hasVal(hx.lastNormalTime) ? "☑不详" : "□不详"}`;
    ov["T3_R3_C1_P0"] = `${fmtLineDateTime(hx.firstVisitTime)}  首诊机构：${hx.firstHospital || "________________"}`;

    const ivtDone = hx.ivThrombolysis === "实施";
    ov["T3_R4_C1_P0"] = `${ivtDone ? "☑" : "□"}实施  开始时间：${ivtDone ? fmtLineDateTime(hx.ivStartTime) : "____年__月__日__时__分"}`;
    ov["T3_R4_C1_P1"] = `${hx.ivThrombolysis === "未实施" ? "☑" : "□"}未实施  未实施主要原因：${hx.ivNotReason || "________________"}`;

    const evtDone = hx.evt === "实施";
    ov["T3_R5_C1_P0"] = `${evtDone ? "☑" : "□"}实施  穿刺时间：${evtDone ? fmtLineDateTime(hx.evtPunctureTime) : "____年__月__日__时__分"}  再通时间：${evtDone ? fmtLineDateTime(hx.evtRecanalTime) : "____年__月__日__时__分"}`;
    ov["T3_R5_C1_P1"] = `${hx.evt === "未实施" ? "☑" : "□"}未实施  未实施/未再通主要原因：${hx.evtNotReason || "________________"}`;

    ov["T3_R6_C1_P0"] = fmtLineDateTime(hx.admissionTime);

    // 主诉
    ov["T3_R7_C1_P1"] = orig => {
      let s = checkOpt(orig, hx.chiefConsciousness);
      if (Array.isArray(hx.chiefConsciousness) && hx.chiefConsciousness.length > 0) {
        s = s.replace("□意识障碍", "☑意识障碍");
      }
      return s;
    };
    ov["T3_R7_C1_P2"] = orig => {
      let s = checkOpt(orig, hx.chiefSpeech);
      if (Array.isArray(hx.chiefSpeech) && hx.chiefSpeech.length > 0) {
        s = s.replace("□言语障碍", "☑言语障碍");
      }
      return s;
    };
    ov["T3_R7_C1_P3"] = orig => {
      let s = orig;
      if (hasVal(hx.chiefLimbSide) || (Array.isArray(hx.chiefLimbType) && hx.chiefLimbType.length > 0)) {
        s = s.replace("□肢体症状", "☑肢体症状");
        s = checkOpt(s, hx.chiefLimbSide);
        s = checkOpt(s, hx.chiefLimbType);
      }
      return s;
    };
    ov["T3_R7_C1_P4"] = orig => {
      let s = checkOpt(orig, hx.chiefOther);
      if (Array.isArray(hx.chiefOther) && hx.chiefOther.length > 0) {
        s = s.replace(/^□其他：/, "☑其他：");
      }
      if (hasVal(hx.chiefOther_other)) {
        s = s.replace("□其他：________", `☑其他：${hx.chiefOther_other}`);
      }
      return s;
    };
    if (hasVal(hx.durationVal)) {
      const isDay = hx.durationUnit === "天";
      ov["T3_R7_C1_P5"] = `症状持续时间：${hx.durationVal} ${!isDay ? "☑" : "□"}小时 ${isDay ? "☑" : "□"}天`;
    }
    if (hasVal(hx.chiefText)) {
      ov["T3_R7_C1_P6"] = `主诉原文/补充：${hx.chiefText}`;
    }

    // 现病史
    ov["T3_R8_C1_P0"] = orig => checkOpt(orig, hx.onsetMode);
    ov["T3_R8_C1_P1"] = orig => {
      let s = checkOpt(orig, hx.onsetState);
      if (hasVal(hx.onsetState_other)) s = s.replace("□其他：____", `☑其他：${hx.onsetState_other}`);
      return s;
    };
    ov["T3_R8_C1_P2"] = orig => checkOpt(orig, hx.mainSymptoms);
    ov["T3_R8_C1_P3"] = orig => checkOpt(orig, hx.mainSymptoms);
    ov["T3_R8_C1_P4"] = orig => checkOpt(orig, hx.progression);
    ov["T3_R8_C1_P5"] = orig => checkOpt(orig, hx.accompany);
    ov["T3_R8_C1_P6"] = orig => {
      let s = checkOpt(orig, hx.preHospitalTx);
      s = checkOpt(s, hx.preHospitalEffect);
      return s;
    };
    if (hasVal(hx.hpiNarrative)) {
      ov["T3_R8_C1_P7"] = `补充病程（含转诊经过、用药及重要阴性症状）：${hx.hpiNarrative}`;
    }

    // 既往病史
    ov["T3_R9_C1_P1"] = orig => checkOpt(orig, hx.pastDiseases);
    ov["T3_R9_C1_P2"] = orig => checkOpt(orig, hx.pastDiseases);
    ov["T3_R9_C1_P3"] = orig => {
      let s = checkOpt(orig, hx.pastDiseases);
      if (hasVal(hx.pastDiseases_other)) s = s.replace("□其他：________________", `☑其他：${hx.pastDiseases_other}`);
      return s;
    };
    ov["T3_R9_C1_P4"] = orig => checkOpt(orig, hx.pastDiseases);
    if (hasVal(hx.pastDetail)) {
      ov["T3_R9_C1_P5"] = `所选疾病的诊断年份/病程、治疗及控制情况：${hx.pastDetail}`;
      ov["T3_R9_C1_P6"] = "";
      ov["T3_R9_C1_P7"] = "";
    }

    // 入院查体
    ov["T3_R10_C1_P0"] = orig => checkOpt(orig, ex.generalState);
    ov["T3_R10_C1_P1"] = orig => {
      let s = checkOpt(orig, ex.cooperation);
      if (hasVal(ex.uncoopReason)) s = checkOpt(s, ex.uncoopReason);
      return s;
    };
    ov["T3_R10_C1_P3"] = orig => {
      let s = checkOpt(orig, ex.airway);
      s = checkOpt(s, ex.sputum);
      return s;
    };
    ov["T3_R10_C1_P4"] = orig => checkOpt(orig, ex.consciousness);
    ov["T3_R10_C1_P5"] = orig => {
      let s = orig;
      if (hasVal(ex.pupilLeft)) s = s.replace("左____mm", `左${ex.pupilLeft}mm`);
      if (hasVal(ex.pupilRight)) s = s.replace("右____mm", `右${ex.pupilRight}mm`);
      s = checkOpt(s, ex.pupilEqual);
      s = checkOpt(s, ex.lightReflex);
      s = checkOpt(s, ex.gaze);
      s = checkOpt(s, ex.visualField);
      s = checkOpt(s, ex.neglect);
      return s;
    };
    ov["T3_R10_C1_P6"] = orig => checkOpt(orig, ex.facialPalsy);
    ov["T3_R10_C1_P7"] = orig => checkOpt(orig, ex.speech);
    ov["T3_R10_C1_P8"] = orig => checkOpt(orig, ex.swallow);
    if (hasVal(ex.strengthLU) || hasVal(ex.strengthRU) || hasVal(ex.strengthLL) || hasVal(ex.strengthRL)) {
      ov["T3_R10_C1_P9"] = `肌力：左上肢${ex.strengthLU ?? "__"}级，右上肢${ex.strengthRU ?? "__"}级，左下肢${ex.strengthLL ?? "__"}级，右下肢${ex.strengthRL ?? "__"}级  □不能评估`;
    }
    ov["T3_R10_C1_P10"] = orig => checkOpt(orig, ex.muscleTone);
    ov["T3_R10_C1_P11"] = orig => {
      let s = checkOpt(orig, ex.sensory);
      s = checkOpt(s, ex.sensoryDist);
      s = checkOpt(s, ex.ataxia);
      return s;
    };
    ov["T3_R10_C1_P12"] = orig => {
      let s = orig;
      if (hasVal(ex.babinskiLeft)) {
        s = s.replace("左Babinski征 □阴性 □阳性 □未查", checkOpt("左Babinski征 □阴性 □阳性 □未查", ex.babinskiLeft));
      }
      if (hasVal(ex.babinskiRight)) {
        s = s.replace("右Babinski征 □阴性 □阳性 □未查", checkOpt("右Babinski征 □阴性 □阳性 □未查", ex.babinskiRight));
      }
      if (hasVal(ex.otherSigns)) {
        s = s.replace("其他重要体征：________________", `其他重要体征：${ex.otherSigns}`);
      }
      return s;
    };

    // 发病前mRS、过敏史、个人史、合并疾病
    ov["T3_R11_C1_P0"] = orig => checkOpt(orig, hx.preMrs);
    ov["T3_R12_C1_P0"] = orig => {
      if (hx.allergy === "有") {
        return `☑有：${hx.allergyDetail || "________"}   □无`;
      } else if (hx.allergy === "无") {
        return "□有：                   ☑无";
      }
      return orig;
    };
    ov["T3_R13_C1_P0"] = orig => {
      let s = checkOpt(orig, hx.smoking);
      if (hasVal(hx.smokingYears)) s = s.replace("___年", `${hx.smokingYears}年`);
      return s;
    };
    ov["T3_R13_C1_P1"] = orig => {
      let s = checkOpt(orig, hx.drinking);
      if (hasVal(hx.drinkingYears)) s = s.replace("___年", `${hx.drinkingYears}年`);
      return s;
    };
    ov["T3_R14_C1_P1"] = orig => {
      let s = checkOpt(orig, hx.baselineComorbidities);
      if (hasVal(hx.baselineComorbidities_other)) {
        s = s.replace("□其他：________________", `☑其他：${hx.baselineComorbidities_other}`);
      }
      return s;
    };

    // =========================================================================
    // 6. 生命体征表 (T4: V1, T18: V2_1, T21: V2_2, T25: V2_3)
    // =========================================================================
    function fillVitalsTable(tIdx, vit) {
      if (!vit) return;
      if (hasVal(vit.temp)) ov[`T${tIdx}_R2_C1_P0`] = String(vit.temp);
      if (hasVal(vit.resp)) ov[`T${tIdx}_R3_C1_P0`] = String(vit.resp);
      if (hasVal(vit.pulse)) ov[`T${tIdx}_R4_C1_P0`] = String(vit.pulse);
      if (hasVal(vit.sbp) || hasVal(vit.dbp)) {
        ov[`T${tIdx}_R5_C1_P0`] = `${vit.sbp || "__"}/${vit.dbp || "__"}`;
      }
    }
    fillVitalsTable(4, vit1);
    fillVitalsTable(18, v2_1.vitals);
    fillVitalsTable(21, v2_2.vitals);
    fillVitalsTable(25, v2_3.vitals);

    // =========================================================================
    // 7. T5: 入院心电图 (ECG)
    // =========================================================================
    ov["T5_R2_C1_P0"] = `心率${ecg.hr || "____"}次/分；PR${ecg.pr || "____"}ms；QRS${ecg.qrs || "____"}ms；QT${ecg.qt || "____"}ms；QTc${ecg.qtc || "____"}ms；电轴${ecg.axis || "____"}°`;
    ov["T5_R3_C1_P0"] = orig => checkOpt(orig, ecg.rhythm);
    ov["T5_R3_C1_P1"] = orig => {
      let s = checkOpt(orig, ecg.rhythm);
      if (hasVal(ecg.rhythm_other)) s = s.replace("□其他：________________", `☑其他：${ecg.rhythm_other}`);
      return s;
    };
    ov["T5_R4_C1_P0"] = orig => checkOpt(orig, ecg.stT);
    if (hasVal(ecg.stLeadDetail)) {
      ov["T5_R4_C1_P1"] = `导联及程度：${ecg.stLeadDetail}`;
    }
    ov["T5_R5_C1_P0"] = orig => checkOpt(orig, ecg.conduction);
    ov["T5_R5_C1_P1"] = orig => checkOpt(orig, ecg.conduction);
    ov["T5_R5_C1_P2"] = orig => {
      let s = checkOpt(orig, ecg.conduction);
      if (hasVal(ecg.conduction_other)) s = s.replace("□其他：____", `☑其他：${ecg.conduction_other}`);
      return s;
    };
    ov["T5_R6_C1_P0"] = orig => checkOpt(orig, ecg.chamber);
    ov["T5_R6_C1_P1"] = orig => {
      let s = checkOpt(orig, ecg.chamber);
      if (hasVal(ecg.chamber_other)) s = s.replace("□其他：________________", `☑其他：${ecg.chamber_other}`);
      return s;
    };
    if (hasVal(ecg.autoReport)) {
      ov["T5_R7_C1_P0"] = ecg.autoReport;
      ov["T5_R7_C1_P1"] = "";
    }
    if (hasVal(ecg.reviewerConclusion)) {
      ov["T5_R8_C1_P0"] = ecg.reviewerConclusion;
      ov["T5_R8_C1_P1"] = "";
    }

    // =========================================================================
    // 8. T6 (颅脑影像) & T7 (胸部影像)
    // =========================================================================
    function fillImgRow(tIdx, rIdx, obj) {
      if (!obj) return;
      if (hasVal(obj.done)) {
        ov[`T${tIdx}_R${rIdx}_C1_P0`] = orig => checkOpt(orig, obj.done);
      }
      if (hasVal(obj.source)) {
        ov[`T${tIdx}_R${rIdx}_C2_P0`] = orig => checkOpt(orig, obj.source);
        ov[`T${tIdx}_R${rIdx}_C2_P1`] = orig => checkOpt(orig, obj.source);
      }
      if (hasVal(obj.date)) {
        ov[`T${tIdx}_R${rIdx}_C3_P0`] = fmtMonthDay(obj.date);
      }
      if (hasVal(obj.findings)) {
        ov[`T${tIdx}_R${rIdx}_C4_P0`] = obj.findings;
        for (let p = 1; p <= 5; p++) ov[`T${tIdx}_R${rIdx}_C4_P${p}`] = "";
      }
      if (hasVal(obj.diagnosis)) {
        ov[`T${tIdx}_R${rIdx}_C5_P0`] = obj.diagnosis;
        for (let p = 1; p <= 5; p++) ov[`T${tIdx}_R${rIdx}_C5_P${p}`] = "";
      }
    }
    fillImgRow(6, 3, img1.brainMR);
    fillImgRow(6, 4, img1.brainCT);
    fillImgRow(7, 2, img1.chestCT);
    fillImgRow(7, 3, img1.chestXray);

    // =========================================================================
    // 9. 实验室检查表 (T8: V1 24项, T19: V2_1 13项, T22: V2_2 14项, T26: V2_3 6项)
    // =========================================================================
    const LAB_KEYS_T8 = [
      ["wbc", "×10^9/L"], ["neut", "×10^9/L"], ["lymph", "×10^9/L"], ["nlr", ""],
      ["crp", "mg/L"], ["pct", "ng/mL"], ["plt", "×10^9/L"], ["ddimer", "mg/L"],
      ["inr", ""], ["aptt", "s"], ["fib", "g/L"], ["alb", "g/L"],
      ["palb", "mg/L"], ["hb", "g/L"], ["glu", "mmol/L"], ["scr", "μmol/L"],
      ["tbil", "μmol/L"], ["pao2_fio2", "mmHg"], ["il2", "pg/mL"], ["il4", "pg/mL"],
      ["il6", "pg/mL"], ["ifn_gamma", "pg/mL"], ["il10", "pg/mL"], ["tnf_alpha", "pg/mL"]
    ];
    const LAB_KEYS_T19 = [
      ["wbc", "×10^9/L"], ["neut", "×10^9/L"], ["lymph", "×10^9/L"], ["nlr", ""],
      ["crp", "mg/L"], ["plt", "×10^9/L"], ["ddimer", "mg/L"], ["inr", ""],
      ["aptt", "s"], ["fib", "g/L"], ["scr", "μmol/L"], ["tbil", "μmol/L"], ["pao2_fio2", "mmHg"]
    ];
    const LAB_KEYS_T22 = [
      ["wbc", "×10^9/L"], ["neut", "×10^9/L"], ["lymph", "×10^9/L"], ["nlr", ""],
      ["crp", "mg/L"], ["pct", "ng/mL"], ["plt", "×10^9/L"], ["ddimer", "mg/L"],
      ["inr", ""], ["aptt", "s"], ["fib", "g/L"], ["scr", "μmol/L"],
      ["tbil", "μmol/L"], ["pao2_fio2", "mmHg"]
    ];

    function fillLabTable(tIdx, labObj, keysSpec) {
      const labs = labObj || {};
      keysSpec.forEach(([k, defaultUnit], idx) => {
        const rIdx = idx + 2;
        const item = labs[k] || {};
        const val = item.val !== undefined ? item.val : item.day0;
        const sig = item.eval !== undefined ? item.eval : item.sig;
        if (hasVal(val)) {
          const u = item.unit || defaultUnit || "";
          ov[`T${tIdx}_R${rIdx}_C2_P0`] = `${val}${u ? " " + u : ""}`;
        } else if (String(sig) === "9") {
          ov[`T${tIdx}_R${rIdx}_C2_P0`] = "ND";
        }
        if (hasVal(sig)) {
          ov[`T${tIdx}_R${rIdx}_C3_P0`] = orig => checkOpt(orig, String(sig));
          ov[`T${tIdx}_R${rIdx}_C3_P1`] = orig => checkOpt(orig, String(sig));
        }
        if (hasVal(item.note)) {
          ov[`T${tIdx}_R${rIdx}_C4_P0`] = item.note;
        }
      });
    }
    fillLabTable(8, labs1, LAB_KEYS_T8);
    fillLabTable(19, v2_1.labs, LAB_KEYS_T19);
    fillLabTable(22, v2_2.labs, LAB_KEYS_T22);
    fillLabTable(26, v2_3.infLabs, [
      ["wbc", "×10^9/L"], ["neut", "×10^9/L"], ["lymph", "×10^9/L"],
      ["nlr", ""], ["crp", "mg/L"], ["pct", "ng/mL"]
    ]);

    // =========================================================================
    // 10. T9: V1 格拉斯哥昏迷量表 (GCS)
    // =========================================================================
    const gcsObj = sc1.GCS || {};
    const gcsDet = gcsObj.details || {};
    for (let p = 0; p < 4; p++) {
      ov[`T9_R2_C2_P${p}`] = orig => checkScorePrefix(orig, gcsDet.eye ?? gcsDet.E);
    }
    for (let p = 0; p < 5; p++) {
      ov[`T9_R3_C2_P${p}`] = orig => checkScorePrefix(orig, gcsDet.verbal ?? gcsDet.V);
    }
    for (let p = 0; p < 6; p++) {
      ov[`T9_R4_C2_P${p}`] = orig => checkScorePrefix(orig, gcsDet.motor ?? gcsDet.M);
    }
    if (hasVal(gcsObj.score)) {
      ov["T9_R5_C1_P0"] = `${gcsObj.score} 分`;
    }
    ov["T9_R6_C0_P0"] = `评估者签名：${gcsObj.signer || invName} (是否为针刺操作者： ${gcsObj.isAcupuncturist === "是" ? "☑" : "□"}是 ${gcsObj.isAcupuncturist !== "是" ? "☑" : "□"}否)`;

    // =========================================================================
    // 11. T10: V1 NIHSS 量表
    // =========================================================================
    const nihssObj = sc1.NIHSS || {};
    const nihssDet = nihssObj.details || {};
    const nihssRowMap = [
      [2, 3, "1a", 4], [3, 3, "1b", 3], [4, 3, "1c", 3], [5, 3, "2", 3],
      [6, 3, "3", 4], [7, 3, "4", 4], [8, 4, "5a", 6], [9, 4, "5b", 6],
      [10, 4, "6a", 6], [11, 4, "6b", 6], [12, 3, "7", 4], [13, 3, "8", 3],
      [14, 3, "9", 4], [15, 3, "10", 4], [16, 3, "11", 3]
    ];
    nihssRowMap.forEach(([rIdx, cIdx, key, pCount]) => {
      const val = nihssDet[key];
      if (hasVal(val)) {
        for (let p = 0; p < pCount; p++) {
          ov[`T10_R${rIdx}_C${cIdx}_P${p}`] = orig => checkScorePrefix(orig, val);
        }
      }
    });
    if (hasVal(nihssObj.score)) {
      ov["T10_R17_C1_P0"] = `${nihssObj.score} 分`;
    }
    ov["T10_R18_C0_P0"] = `评估者签名：${nihssObj.signer || invName} (是否为针刺操作者： ${nihssObj.isAcupuncturist === "是" ? "☑" : "□"}是 ${nihssObj.isAcupuncturist !== "是" ? "☑" : "□"}否)`;

    // =========================================================================
    // 12. T11: V1 SOFA 评分
    // =========================================================================
    const sofaObj = sc1.SOFA || {};
    const sofaDet = sofaObj.details || {};
    const sofaSysKeys = ["resp", "coag", "liver", "cv", "cns", "renal"];
    sofaSysKeys.forEach((sysKey, sysIdx) => {
      const baseRow = 2 + sysIdx * 5;
      const sc = sofaDet[sysKey];
      if (hasVal(sc)) {
        const scNum = Number(sc);
        if (scNum >= 0 && scNum <= 4) {
          ov[`T11_R${baseRow + scNum}_C3_P0`] = orig => checkScorePrefix(orig, scNum);
        }
      }
    });
    if (hasVal(sofaObj.score)) {
      ov["T11_R32_C1_P0"] = `${sofaObj.score} 分`;
    }

    // =========================================================================
    // 13. T12: V1 FOIS 评分
    // =========================================================================
    const foisObj = sc1.FOIS || {};
    const foisVal = (foisObj.details && foisObj.details.level) ?? foisObj.score;
    if (hasVal(foisVal)) {
      const fNum = Number(foisVal);
      if (fNum >= 1 && fNum <= 7) {
        ov[`T12_R${1 + fNum}_C2_P0`] = "☑";
      }
    }
    ov["T12_R9_C0_P0"] = `评估者签名：${foisObj.signer || invName} (是否为针刺操作者： ${foisObj.isAcupuncturist === "是" ? "☑" : "□"}是 ${foisObj.isAcupuncturist !== "是" ? "☑" : "□"}否)`;

    // =========================================================================
    // 14. T13: V1 EQ-5D-3L 量表
    // =========================================================================
    const eq5dObj = sc1.EQ5D || {};
    const eq5dDet = eq5dObj.details || {};
    [
      [2, "mobility"],
      [4, "selfcare"],
      [6, "activity"],
      [8, "pain"],
      [10, "anxiety"]
    ].forEach(([rIdx, k]) => {
      const v = Number(eq5dDet[k]);
      if (v >= 1 && v <= 3) {
        ov[`T13_R${rIdx}_C1_P${v - 1}`] = "☑";
      }
    });
    if (hasVal(eq5dObj.vas)) {
      ov["T13_R11_C0_P0"] = `今日健康评分：${eq5dObj.vas} 分 (${eq5dObj.score || ""})`;
    }

    // =========================================================================
    // 15. T14: V1 四诊信息采集表
    // =========================================================================
    ov["T14_R0_C0_P1"] = orig => checkOpt(orig, tcm.infoSource);
    ov["T14_R0_C0_P2"] = orig => checkOpt(orig, tcm.commState);
    const tcmRowMap = [
      [2, "inducer", "inducer_other"],
      [3, "chills_fever", null],
      [4, "sensory_pain", "sensory_pain_other"],
      [5, "face", null],
      [6, "eyes", null],
      [7, "mouth", null],
      [8, "consciousness", null],
      [9, "speech", null],
      [10, "emotion", null],
      [11, "swallow_resp", null],
      [12, "appetite", null],
      [13, "excretion", null],
      [14, "motor", null],
      [15, "tone", null],
      [16, "tongue_color", null],
      [17, "tongue_shape", null],
      [18, "tongue_motion", null],
      [19, "fur_color", null],
      [20, "fur_quality", null]
    ];
    tcmRowMap.forEach(([rIdx, fieldKey, otherKey]) => {
      const val = tcm[fieldKey];
      if (hasVal(val)) {
        ov[`T14_R${rIdx}_C2_P0`] = orig => {
          let s = checkOpt(orig, val);
          // 兼容 "半身不遂(右)" -> 勾选 "半身不遂" 和 "右"
          const strVal = Array.isArray(val) ? val.join(",") : String(val);
          if (strVal.includes("半身不遂")) {
            s = checkOpt(s, "半身不遂");
            if (strVal.includes("左")) s = checkOpt(s, "左");
            if (strVal.includes("右")) s = checkOpt(s, "右");
          }
          if (strVal.includes("感觉麻木")) {
            s = checkOpt(s, "感觉麻木");
            if (strVal.includes("半身")) s = checkOpt(s, "半身");
          }
          if (otherKey && hasVal(tcm[otherKey])) {
            s = s.replace("□其他：____", `☑其他：${tcm[otherKey]}`);
          }
          return s;
        };
      }
    });
    if (hasVal(tcm.pulse)) {
      for (let p = 0; p <= 2; p++) {
        ov[`T14_R21_C2_P${p}`] = orig => checkOpt(orig, tcm.pulse);
      }
    }

    // =========================================================================
    // 16. T15: V1 诊断 (TOAST、疾病分型、中医证候)
    // =========================================================================
    if (hasVal(diag.toast)) {
      for (let p = 0; p <= 2; p++) {
        ov[`T15_R1_C1_P${p}`] = orig => {
          let s = checkOpt(orig, diag.toast);
          if (p === 1 && hasVal(diag.toastOther)) {
            s = s.replace("□其他明确病因型，        ", `☑其他明确病因型，${diag.toastOther}`);
          }
          return s;
        };
      }
    }
    if (hasVal(diag.diseaseSubtype)) {
      for (let p = 0; p <= 1; p++) {
        ov[`T15_R2_C1_P${p}`] = orig => checkOpt(orig, diag.diseaseSubtype);
      }
    }
    if (hasVal(diag.tcmSyndrome)) {
      ov["T15_R3_C1_P0"] = orig => checkOpt(orig, diag.tcmSyndrome);
      ov["T15_R3_C1_P1"] = orig => {
        let s = checkOpt(orig, diag.tcmSyndrome);
        if (hasVal(diag.tcmSyndromeOther)) {
          s = s.replace("□其他：_________", `☑其他：${diag.tcmSyndromeOther}`);
        }
        return s;
      };
    }

    // =========================================================================
    // 17. T16: V1 纳入排除标准
    // =========================================================================
    for (let i = 1; i <= 4; i++) {
      const v = elig[`inc_${i}`];
      const rIdx = 1 + i;
      if (v === "是") ov[`T16_R${rIdx}_C1_P0`] = "☑";
      else if (v === "否") ov[`T16_R${rIdx}_C2_P0`] = "☑";
    }
    for (let i = 1; i <= 5; i++) {
      const v = elig[`exc_${i}`];
      const rIdx = 7 + i;
      if (v === "是") ov[`T16_R${rIdx}_C1_P0`] = "☑";
      else if (v === "否") ov[`T16_R${rIdx}_C2_P0`] = "☑";
    }

    // =========================================================================
    // 18. T17 (V1 生物样本) & T24 (V2_2 生物样本)
    // =========================================================================
    [
      [1, "plasma"],
      [2, "swab"],
      [3, "stool"]
    ].forEach(([rIdx, k]) => {
      if (bio1[k] === "是") ov[`T17_R${rIdx}_C2_P0`] = "☑";
      else if (bio1[k] === "否") ov[`T17_R${rIdx}_C3_P0`] = "☑";
      const bio2 = v2_2.biosamples || {};
      if (hasVal(bio2[k])) {
        ov[`T24_R${rIdx}_C2_P0`] = orig => checkOpt(orig, bio2[k]);
      }
    });

    // =========================================================================
    // 19. 量表评分汇总表 (T20: V2_1, T23: V2_2, T29: V3, T32: V4, T35: V5)
    // =========================================================================
    function fillScaleSummaryTable(tIdx, scMap, rowsSpec) {
      const scales = scMap || {};
      rowsSpec.forEach(([rIdx, scaleKey, suffix]) => {
        const scObj = scales[scaleKey] || {};
        const val = scaleKey === "EQ5D" ? (scObj.score || (hasVal(scObj.vas) ? `VAS: ${scObj.vas}` : "")) : scObj.score;
        if (hasVal(val)) {
          ov[`T${tIdx}_R${rIdx}_C1_P0`] = `${val}${suffix || ""}`;
          ov[`T${tIdx}_R${rIdx}_C2_P0`] = scObj.signer || invName;
          const isAcu = scObj.isAcupuncturist === "是";
          ov[`T${tIdx}_R${rIdx}_C3_P0`] = `${isAcu ? "☑" : "□"}是 ${!isAcu ? "☑" : "□"}否`;
        }
      });
    }
    const ROWS_T20_T23 = [
      [2, "GCS", " 分"],
      [3, "NIHSS", " 分"],
      [4, "FOIS", " 级"],
      [5, "SOFA", " 分"],
      [6, "EQ5D", ""]
    ];
    fillScaleSummaryTable(20, v2_1.scales, ROWS_T20_T23);
    fillScaleSummaryTable(23, v2_2.scales, ROWS_T20_T23);

    const ROWS_T29 = [
      [2, "GCS", " 分"],
      [3, "NIHSS", " 分"],
      [4, "FOIS", " 级"],
      [5, "EQ5D", ""]
    ];
    fillScaleSummaryTable(29, v3.scales, ROWS_T29);

    const ROWS_T32_T35 = [
      [2, "FOIS", " 级"],
      [3, "EQ5D", ""],
      [4, "MRS", " 级"]
    ];
    fillScaleSummaryTable(32, v4.scales, ROWS_T32_T35);
    fillScaleSummaryTable(35, v5.scales, ROWS_T32_T35);

    // =========================================================================
    // 20. T27: V2_3 肺部感染诊断及相关指标数据采集表
    // =========================================================================
    ov["T27_R1_C0_P1"] = `请根据后附依据进行综合判定，判定者签名：${v2_3.judgeSigner || invName} (是否为针刺操作者： ${v2_3.isAcupuncturist === "是" ? "☑" : "□"}是 ${v2_3.isAcupuncturist !== "是" ? "☑" : "□"}否)`;
    if (v2_3.sapConclusion === "确诊" || subj.sapConfirmed) {
      ov["T27_R2_C0_P0"] = `☑是  (确诊肺部感染)，确诊日期：${fmtMonthDay(v2_3.confirmDate || v2_3.visitDate || subj.sapConfirmedDate)}`;
      ov["T27_R2_C0_P1"] = "□否  (排除肺部感染)";
    } else if (v2_3.sapConclusion === "排除") {
      ov["T27_R2_C0_P0"] = "□是  (确诊肺部感染)，确诊日期：__月__日";
      ov["T27_R2_C0_P1"] = "☑否  (排除肺部感染)";
    }
    if (hasVal(v2_3.imagingCriteria)) {
      for (let p = 0; p <= 4; p++) {
        ov[`T27_R4_C1_P${p}`] = orig => checkOpt(orig, v2_3.imagingCriteria);
      }
    }
    if (hasVal(v2_3.clinicalCriteria)) {
      const clinArr = Array.isArray(v2_3.clinicalCriteria) ? v2_3.clinicalCriteria : [v2_3.clinicalCriteria];
      if (clinArr.some(x => x.includes("呼吸道症状") || x.includes("咳嗽"))) {
        ov["T27_R5_C1_P0"] = "☑呼吸道症状：";
      }
      if (clinArr.some(x => x.includes("发热"))) {
        ov["T27_R5_C1_P4"] = `☑发热：体温 (T) ≥ ${v2_3.feverTemp || (v2_3.vitals && v2_3.vitals.temp) || "38.0"} ℃`;
      }
      if (clinArr.some(x => x.includes("肺部体征") || x.includes("湿啰音"))) {
        ov["T27_R5_C1_P5"] = "☑肺部体征：";
      }
      if (clinArr.some(x => x.includes("外周血") || x.includes("白细胞"))) {
        ov["T27_R5_C1_P8"] = "☑外周血常规异常：";
      }
    }
    if (hasVal(v2_3.sputumSymptoms)) {
      const accArr = Array.isArray(v2_3.sputumSymptoms) ? v2_3.sputumSymptoms : [v2_3.sputumSymptoms];
      ov["T27_R5_C1_P3"] = orig => {
        let s = orig;
        accArr.forEach(item => {
          s = s.replace(`[  ]${item}`, `[√]${item}`);
        });
        return s;
      };
    }

    // 感染核心6项 (当天 & 3日后): R10..R15
    const infLabs = v2_3.infLabs || {};
    [
      [10, "wbc"],
      [11, "neut"],
      [12, "lymph"],
      [13, "nlr"],
      [14, "crp"],
      [15, "pct"]
    ].forEach(([rIdx, k]) => {
      const item = infLabs[k] || {};
      if (hasVal(item.done)) {
        ov[`T27_R${rIdx}_C1_P0`] = orig => checkOpt(orig, item.done);
      }
      if (hasVal(item.day0)) ov[`T27_R${rIdx}_C2_P0`] = String(item.day0);
      if (hasVal(item.day3)) ov[`T27_R${rIdx}_C3_P0`] = String(item.day3);
    });

    // 病原学4项: R16..R19
    const patho = v2_3.pathogens || {};
    [
      [16, "sputumCulture", true],
      [17, "swabCulture", true],
      [18, "resp11", false],
      [19, "fungiEndotoxin", false]
    ].forEach(([rIdx, k, hasC3Underlines]) => {
      const item = patho[k] || {};
      if (hasVal(item.done)) {
        ov[`T27_R${rIdx}_C1_P0`] = orig => checkOpt(orig, item.done);
      }
      if (hasVal(item.result)) {
        ov[`T27_R${rIdx}_C2_P0`] = item.result;
        ov[`T27_R${rIdx}_C2_P1`] = "";
        ov[`T27_R${rIdx}_C2_P2`] = "";
        if (hasC3Underlines) {
          ov[`T27_R${rIdx}_C3_P0`] = "";
          ov[`T27_R${rIdx}_C3_P1`] = "";
          ov[`T27_R${rIdx}_C3_P2`] = "";
        }
      }
    });

    // 肺感染时胸部影像: R22 (胸CT), R23 (胸X片)
    if (v2_3.chestCT && hasVal(v2_3.chestCT.done)) {
      ov["T27_R22_C1_P0"] = orig => checkOpt(orig, v2_3.chestCT.done);
      if (hasVal(v2_3.chestCT.date)) ov["T27_R22_C2_P0"] = fmtMonthDay(v2_3.chestCT.date);
      if (hasVal(v2_3.chestCT.findings)) ov["T27_R22_C3_P0"] = v2_3.chestCT.findings;
      if (hasVal(v2_3.chestCT.diagnosis)) ov["T27_R22_C4_P0"] = v2_3.chestCT.diagnosis;
    }
    if (v2_3.chestXray && hasVal(v2_3.chestXray.done)) {
      ov["T27_R23_C1_P0"] = orig => checkOpt(orig, v2_3.chestXray.done);
      if (hasVal(v2_3.chestXray.date)) ov["T27_R23_C2_P0"] = fmtMonthDay(v2_3.chestXray.date);
      if (hasVal(v2_3.chestXray.findings)) ov["T27_R23_C3_P0"] = v2_3.chestXray.findings;
      if (hasVal(v2_3.chestXray.diagnosis)) ov["T27_R23_C4_P0"] = v2_3.chestXray.diagnosis;
    }

    // =========================================================================
    // 21. T28: V2_3 肺炎PSI评分
    // =========================================================================
    const psi = v2_3.psi || {};
    const psiChecks = psi.checks || {};
    const psiVals = psi.values || {};
    const psiNotes = psi.notes || {};
    if (hasVal(dem.age)) {
      const ageNum = Number(dem.age);
      if (dem.gender === "女") {
        ov["T28_R3_C1_P0"] = `年龄(岁)-10=分值：${Math.max(0, ageNum - 10)}`;
      } else {
        ov["T28_R2_C1_P0"] = `年龄(岁)=分值：${ageNum}`;
      }
    }
    [
      [4, "nursing_home", null],
      [6, "neoplastic", "neoplastic"],
      [7, "liver", "liver"],
      [8, "chf", "chf"],
      [9, "cvd", "cvd"],
      [10, "renal", "renal"],
      [12, "altered_mental", null],
      [13, "resp_rate", null],
      [14, "sbp", null],
      [15, "temp", null],
      [16, "pulse", null],
      [18, "ph", null],
      [19, "bun", null],
      [20, "sodium", null],
      [21, "glucose", null],
      [22, "hct", null],
      [23, "pao2", null],
      [24, "pleural_effusion", null]
    ].forEach(([rIdx, checkKey, noteKey]) => {
      if (psiChecks[checkKey]) {
        ov[`T28_R${rIdx}_C1_P0`] = orig => orig.replace("□", "☑");
      }
      if (noteKey && hasVal(psiNotes[noteKey])) {
        ov[`T28_R${rIdx}_C2_P0`] = psiNotes[noteKey];
        ov[`T28_R${rIdx}_C2_P1`] = "";
      }
    });
    if (hasVal(psiVals.resp_rate)) ov["T28_R13_C2_P0"] = `${psiVals.resp_rate}次/分`;
    if (hasVal(psiVals.sbp)) ov["T28_R14_C2_P0"] = `${psiVals.sbp}mmHg`;
    if (hasVal(psiVals.temp)) ov["T28_R15_C2_P0"] = `${psiVals.temp}℃`;
    if (hasVal(psiVals.pulse)) ov["T28_R16_C2_P0"] = `${psiVals.pulse}次/分`;
    if (hasVal(psiVals.ph)) ov["T28_R18_C2_P0"] = `${psiVals.ph}`;
    if (hasVal(psiVals.bun)) ov["T28_R19_C2_P0"] = `${psiVals.bun}mmol/L`;
    if (hasVal(psiVals.sodium)) ov["T28_R20_C2_P0"] = `${psiVals.sodium}mmol/L`;
    if (hasVal(psiVals.glucose)) ov["T28_R21_C2_P0"] = `${psiVals.glucose}mmol/L`;
    if (hasVal(psiVals.hct)) ov["T28_R22_C2_P0"] = `${psiVals.hct}%`;
    if (hasVal(psiVals.pao2)) ov["T28_R23_C2_P0"] = `${psiVals.pao2}mmHg`;
    if (hasVal(psi.totalScore) && Number(psi.totalScore) > 0) {
      ov["T28_R25_C1_P0"] = `${psi.totalScore}分 (${psi.riskClass || ""})`;
    }
    ov["T28_R26_C0_P0"] = `评估者签名：${psi.signer || invName} (是否为针刺操作者： ${psi.isAcupuncturist === "是" ? "☑" : "□"}是 ${psi.isAcupuncturist !== "是" ? "☑" : "□"}否)`;

    // =========================================================================
    // 22. T30 (V3 mRS评分) & T31 (V3 出院结局记录)
    // =========================================================================
    const mrsObj = (v3.scales && v3.scales.MRS) || {};
    if (hasVal(mrsObj.score)) {
      const mNum = Number(mrsObj.score);
      if (mNum >= 0 && mNum <= 6) {
        ov[`T30_R${2 + mNum}_C1_P0`] = orig => checkScorePrefix(orig, mNum);
      }
    }
    ov["T30_R9_C0_P0"] = `评估者签名：${mrsObj.signer || invName} (是否为针刺操作者： ${mrsObj.isAcupuncturist === "是" ? "☑" : "□"}是 ${mrsObj.isAcupuncturist !== "是" ? "☑" : "□"}否)`;

    const out3 = v3.outcome || {};
    if (hasVal(out3.status)) {
      ov["T31_R2_C0_P0"] = orig => checkOpt(orig, out3.status);
      ov["T31_R2_C0_P1"] = orig => checkOpt(orig, out3.status);
    }
    if (hasVal(out3.date)) {
      ov["T31_R2_C1_P0"] = fmtLineDate(out3.date);
    }
    if (hasVal(out3.destination)) {
      for (let p = 0; p <= 2; p++) {
        ov[`T31_R2_C2_P${p}`] = orig => {
          let s = checkOpt(orig, out3.destination);
          if (p === 2 && hasVal(out3.destinationOther)) {
            s = s.replace("□其他", `☑其他(${out3.destinationOther})`);
          }
          return s;
        };
      }
    }
    if (hasVal(out3.deathReason)) {
      ov["T31_R2_C3_P0"] = out3.deathReason;
    }

    // =========================================================================
    // 23. T33/T34 (V4 第30天随访) & T36/T37 (V5 第90天随访)
    // =========================================================================
    function fillFollowupTables(survTblIdx, readmTblIdx, vd) {
      const surv = vd.survival || {};
      if (hasVal(surv.alive)) {
        ov[`T${survTblIdx}_R2_C1_P0`] = orig => checkOpt(orig, surv.alive);
      }
      if (hasVal(surv.deathDate)) {
        ov[`T${survTblIdx}_R2_C2_P0`] = fmtLineDate(surv.deathDate);
      }
      if (hasVal(surv.deathReason)) {
        ov[`T${survTblIdx}_R2_C3_P0`] = surv.deathReason;
      }
      if (hasVal(vd.hasReadmission)) {
        ov[`T${readmTblIdx}_R0_C0_P1`] = orig => checkOpt(orig, vd.hasReadmission);
      }
      const rList = Array.isArray(vd.readmissions) ? vd.readmissions : [];
      rList.slice(0, 4).forEach((item, idx) => {
        const rIdx = idx + 2;
        if (hasVal(item.reason)) ov[`T${readmTblIdx}_R${rIdx}_C0_P0`] = item.reason;
        if (hasVal(item.admitDate)) ov[`T${readmTblIdx}_R${rIdx}_C1_P0`] = fmtLineDate(item.admitDate);
        if (hasVal(item.dischargeDate)) ov[`T${readmTblIdx}_R${rIdx}_C2_P0`] = fmtLineDate(item.dischargeDate);
        if (hasVal(item.Days || item.days)) ov[`T${readmTblIdx}_R${rIdx}_C3_P0`] = String(item.Days || item.days);
      });
    }
    fillFollowupTables(33, 34, v4);
    fillFollowupTables(36, 37, v5);

    // =========================================================================
    // 24. T38: 并发症记录
    // =========================================================================
    const compItems = Array.isArray(compObj.items) ? compObj.items.slice() : [];
    if (subj.sapConfirmed && !compItems.some(x => x && x.name && x.name.includes("肺"))) {
      compItems.unshift({
        name: "卒中相关性肺炎 (SAP)",
        startDate: subj.sapConfirmedDate || v2_3.visitDate,
        ongoing: "否",
        endDate: v3.visitDate
      });
    }
    const hasComp = compObj.hasComplication === "有" || compItems.length > 0;
    ov["T38_R0_C0_P1"] = hasComp ? "□无 ☑有" : "☑无 □有";
    compItems.slice(0, 12).forEach((item, idx) => {
      if (!item || !item.name) return;
      const rIdx = idx + 3; // R3..R14
      ov[`T38_R${rIdx}_C0_P0`] = item.name;
      if (hasVal(item.startDate)) ov[`T38_R${rIdx}_C1_P0`] = fmtLineDate(item.startDate);
      if (item.ongoing === "是" || item.ongoing === true) {
        ov[`T38_R${rIdx}_C2_P0`] = "☑";
      } else if (hasVal(item.endDate)) {
        ov[`T38_R${rIdx}_C3_P0`] = fmtLineDate(item.endDate);
      }
    });

    // =========================================================================
    // 25. T39: 急性期再灌注治疗
    // =========================================================================
    const repObj = txObj.reperfusion || {};
    const repDrugs = Array.isArray(repObj.drugs) ? repObj.drugs : [];
    const ivUsed = repObj.ivUsed === "是" || hx.ivThrombolysis === "实施";
    ov["T39_R1_C0_P0"] = `静脉溶栓 ${ivUsed ? "☑" : "□"}是 ${!ivUsed ? "☑" : "□"}否`;
    repDrugs.forEach(r => {
      if (!r || !r.name) return;
      let rIdx = 6;
      if (r.name.includes("尿激酶")) rIdx = 3;
      else if (r.name.includes("阿替普酶") || r.name.includes("rt-PA")) rIdx = 4;
      else if (r.name.includes("替奈普酶")) rIdx = 5;
      if (hasVal(r.dose)) ov[`T39_R${rIdx}_C1_P0`] = String(r.dose);
      if (hasVal(r.startTime)) ov[`T39_R${rIdx}_C4_P0`] = r.startTime;
      if (hasVal(r.endTime)) ov[`T39_R${rIdx}_C5_P0`] = r.endTime;
    });

    // =========================================================================
    // 26. T40: 管道管理
    // =========================================================================
    const tubesObj = txObj.tubes || {};
    [
      [2, tubesObj.ngTube, 2],
      [3, tubesObj.foley, 0],
      [4, tubesObj.cvc, 1]
    ].forEach(([rIdx, tb, maxReasonP]) => {
      if (!tb) return;
      const isUsed = tb.used === "有" || tb.used === "是";
      ov[`T40_R${rIdx}_C1_P0`] = !isUsed ? "☑无" : "□无";
      ov[`T40_R${rIdx}_C1_P1`] = isUsed ? "☑有" : "□有";
      if (hasVal(tb.startDate)) ov[`T40_R${rIdx}_C2_P0`] = fmtLineDate(tb.startDate);
      if (hasVal(tb.endDate)) ov[`T40_R${rIdx}_C3_P0`] = fmtLineDate(tb.endDate);
      if (hasVal(tb.reasons)) {
        for (let p = 0; p <= maxReasonP; p++) {
          ov[`T40_R${rIdx}_C4_P${p}`] = orig => checkOpt(orig, tb.reasons);
        }
      }
    });

    const respSup = tubesObj.respSupport || {};
    if (hasVal(respSup.used)) {
      const noResp = respSup.used === "无";
      ov["T40_R5_C1_P0"] = noResp ? "☑无" : "□无";
      if (!noResp) {
        if (respSup.used.includes("普通氧疗")) {
          ov["T40_R5_C1_P1"] = `☑普通氧疗：${respSup.mode === "面罩" ? "□鼻导管 ☑面罩" : "☑鼻导管 □面罩"}`;
        }
        if (hasVal(respSup.flow)) ov["T40_R5_C1_P2"] = `氧流量：${respSup.flow} L/min`;
        if (hasVal(respSup.fio2)) ov["T40_R5_C1_P3"] = `FiO₂：${respSup.fio2}% `;
        for (let p = 4; p <= 6; p++) {
          ov[`T40_R5_C1_P${p}`] = orig => checkOpt(orig, respSup.used);
        }
      }
      if (hasVal(respSup.startDate)) ov["T40_R5_C2_P0"] = fmtLineDate(respSup.startDate);
      if (hasVal(respSup.endDate)) ov["T40_R5_C3_P0"] = fmtLineDate(respSup.endDate);
      if (hasVal(respSup.reasons)) {
        for (let p = 0; p <= 3; p++) {
          ov[`T40_R5_C4_P${p}`] = orig => checkOpt(orig, respSup.reasons);
        }
      }
    }

    const airway = tubesObj.airway || {};
    if (hasVal(airway.used)) {
      ov["T40_R6_C1_P0"] = orig => checkOpt(orig, airway.used);
      if (hasVal(airway.startDate)) ov["T40_R6_C2_P0"] = fmtLineDate(airway.startDate);
      if (hasVal(airway.endDate)) ov["T40_R6_C3_P0"] = fmtLineDate(airway.endDate);
      if (hasVal(airway.reasons)) {
        ov["T40_R6_C4_P0"] = orig => checkOpt(orig, airway.reasons);
      }
    }

    // =========================================================================
    // 27. T41: 西药 + 中成药合并用药记录 (精确对应原版 T41 R2..R34 预设药品行)
    // =========================================================================
    const presetMedRows = [
      [2, "阿司匹林"],
      [3, "氯吡格雷"],
      [4, "替格瑞洛"],
      [6, "阿托伐他汀"],
      [7, "瑞舒伐他汀"],
      [9, "依达拉奉"],
      [10, "丁苯酞"],
      [11, "尤瑞克林"],
      [12, "川芎嗪"],
      [13, "银杏叶"],
      [16, "甘露醇"],
      [18, "氨氯地平"],
      [21, "头孢哌酮"],
      [22, "多西环素"],
      [23, "米诺环素"],
      [25, "醒脑治瘫"],
      [26, "益肾养肝"],
      [27, "扶正合剂"],
      [28, "脑血栓丸"],
      [29, "中风丸"]
    ];
    const medList = Array.isArray(txObj.medications) ? txObj.medications : [];
    const usedPresetRows = new Set();

    function fillMedRow(rIdx, m, isCustomRow) {
      if (isCustomRow && hasVal(m.name)) {
        ov[`T41_R${rIdx}_C1_P0`] = `其他：${m.name}`;
      }
      const isUsed = m.used === "是";
      ov[`T41_R${rIdx}_C2_P0`] = `是${isUsed ? "☑" : "□"} 否${!isUsed ? "☑" : "□"}`;
      if (isUsed && hasVal(m.reason)) {
        ov[`T41_R${rIdx}_C3_P0`] = m.reason;
      }
      if (hasVal(m.dose)) ov[`T41_R${rIdx}_C4_P0`] = String(m.dose);
      if (hasVal(m.unit)) ov[`T41_R${rIdx}_C5_P0`] = m.unit;
      if (hasVal(m.freq)) ov[`T41_R${rIdx}_C6_P0`] = m.freq;
      if (hasVal(m.route)) ov[`T41_R${rIdx}_C7_P0`] = m.route;
      if (hasVal(m.startDate)) ov[`T41_R${rIdx}_C8_P0`] = fmtLineDate(m.startDate);
      if (hasVal(m.endDate)) ov[`T41_R${rIdx}_C9_P0`] = fmtLineDate(m.endDate);
    }

    const customOtherRows = [5, 8, 14, 15, 17, 19, 20, 24, 30, 31, 32, 33, 34];
    let customPtr = 0;
    medList.forEach(m => {
      if (!m || !m.name) return;
      const found = presetMedRows.find(([, kw]) => m.name.includes(kw));
      if (found) {
        usedPresetRows.add(found[0]);
        fillMedRow(found[0], m, false);
      } else if (m.used === "是" && customPtr < customOtherRows.length) {
        fillMedRow(customOtherRows[customPtr++], m, true);
      }
    });
    presetMedRows.forEach(([rIdx]) => {
      if (!usedPresetRows.has(rIdx)) {
        ov[`T41_R${rIdx}_C2_P0`] = "是□ 否☑";
      }
    });

    // =========================================================================
    // 28. T42: 中草药汤剂记录
    // =========================================================================
    const herbal = Array.isArray(txObj.herbalList) ? txObj.herbalList : [];
    herbal.slice(0, 5).forEach((h, idx) => {
      const rIdx = idx + 2;
      if (hasVal(h.name)) ov[`T42_R${rIdx}_C0_P0`] = h.name;
      if (hasVal(h.formula || h.composition)) ov[`T42_R${rIdx}_C1_P0`] = h.formula || h.composition;
      if (hasVal(h.reason)) ov[`T42_R${rIdx}_C2_P0`] = orig => checkOpt(orig, h.reason);
      if (hasVal(h.freq)) ov[`T42_R${rIdx}_C3_P0`] = h.freq;
      if (hasVal(h.route)) ov[`T42_R${rIdx}_C4_P0`] = h.route;
      if (hasVal(h.startDate)) ov[`T42_R${rIdx}_C5_P0`] = fmtLineDate(h.startDate);
      if (hasVal(h.endDate)) ov[`T42_R${rIdx}_C6_P0`] = fmtLineDate(h.endDate);
    });

    // =========================================================================
    // 29. T43: 非药物疗法记录
    // =========================================================================
    const nonDrug = Array.isArray(txObj.nonDrug) ? txObj.nonDrug : [];
    const nonDrugRowMap = [
      [2, "针"],
      [3, "贴敷"],
      [4, "耳穴"],
      [5, "脑反射"],
      [6, "激光"]
    ];
    nonDrug.forEach(nd => {
      if (!nd || !nd.name) return;
      const found = nonDrugRowMap.find(([, kw]) => nd.name.includes(kw));
      if (!found) return;
      const rIdx = found[0];
      const isUsed = nd.used === "有" || nd.used === "是";
      ov[`T43_R${rIdx}_C1_P0`] = !isUsed ? "☑无" : "□无";
      ov[`T43_R${rIdx}_C1_P1`] = isUsed ? "☑有" : "□有";
      if (rIdx === 2 && isUsed) {
        if ((nd.subtype || "").includes("醒脑开窍")) {
          ov["T43_R2_C0_P2"] = "☑醒脑开窍针法";
        } else if (hasVal(nd.subtype)) {
          ov["T43_R2_C0_P3"] = "☑其他针法：";
          ov["T43_R2_C0_P4"] = nd.subtype;
        }
      } else if (rIdx >= 3 && isUsed && hasVal(nd.detail)) {
        ov[`T43_R${rIdx}_C0_P2`] = nd.detail;
      }
      if (isUsed && hasVal(nd.reason)) {
        ov[`T43_R${rIdx}_C2_P0`] = orig => checkOpt(orig, nd.reason);
      }
      if (hasVal(nd.freq)) ov[`T43_R${rIdx}_C3_P0`] = nd.freq;
      if (hasVal(nd.startDate)) ov[`T43_R${rIdx}_C4_P0`] = fmtLineDate(nd.startDate);
      if (hasVal(nd.endDate)) ov[`T43_R${rIdx}_C5_P0`] = fmtLineDate(nd.endDate);
    });

    // =========================================================================
    // 30. T44: 不良事件 (AE) 记录
    // =========================================================================
    const aes = Array.isArray(aeObj.events) ? aeObj.events : [];
    const hasAE = aeObj.hasAE === "有" || aes.length > 0;
    ov["T44_R0_C0_P0"] = `有无不良事件发生？ ${!hasAE ? "☑" : "□"}无  ${hasAE ? "☑" : "□"}有（请填下表）`;
    aes.slice(0, 3).forEach((ae, idx) => {
      const cIdx = idx + 1;
      ov[`T44_R1_C${cIdx}_P0`] = ae.name || "";
      ov[`T44_R2_C${cIdx}_P0`] = ae.desc || "";
      if (hasVal(ae.startTime)) ov[`T44_R3_C${cIdx}_P0`] = fmtBoxDate(ae.startTime);
      if (hasVal(ae.endTime)) ov[`T44_R4_C${cIdx}_P0`] = fmtBoxDate(ae.endTime);
      if (hasVal(ae.severity)) ov[`T44_R5_C${cIdx}_P0`] = orig => checkOpt(orig, ae.severity);
      if (hasVal(ae.isSAE)) ov[`T44_R6_C${cIdx}_P0`] = orig => checkOpt(orig, ae.isSAE);
      if (hasVal(ae.outcome)) {
        for (let p = 0; p <= 2; p++) {
          ov[`T44_R7_C${cIdx}_P${p}`] = orig => checkOpt(orig, ae.outcome);
        }
      }
      if (hasVal(ae.action)) ov[`T44_R8_C${cIdx}_P0`] = orig => checkOpt(orig, ae.action);
      if (hasVal(ae.relation)) ov[`T44_R11_C${cIdx}_P0`] = orig => checkOpt(orig, ae.relation);
    });

    // =========================================================================
    // 31. T45 (试验总结表) & T46 (审核签名)
    // =========================================================================
    ov["T45_R0_C0_P0"] = `研究干预结束日期（如适用）：${fmtBoxDate(cs.interventionEndDate || endDate)}`;
    const isWithdrawn = cs.withdrawn === "是";
    ov["T45_R1_C0_P0"] = `病例是否退出（${!isWithdrawn ? "√" : "  "}）否 （${isWithdrawn ? "√" : "  "}）是——退出试验日期：${isWithdrawn ? fmtBoxDate(cs.withdrawDate) : "20□□年□□月□□日"}`;
    if (isWithdrawn && hasVal(cs.withdrawReasonCode)) {
      ov["T45_R2_C0_P0"] = `退出试验的主要原因：☑${cs.withdrawReasonCode} `;
      if (hasVal(cs.withdrawOtherDetail)) {
        ov["T45_R3_C0_P11"] = `(10)其他：${cs.withdrawOtherDetail}。`;
      }
    }

    ov["T46_R0_C0_P2"] = `主要研究者签名：${cs.piSignature || invName}                ${fmtBoxDate(cs.piSignDate || endDate || startDate)}`;
    if (hasVal(cs.piNote)) {
      ov["T46_R1_C0_P0"] = `备注：${cs.piNote}`;
    }

    return ov;
  }

  // 将含有 ⟦KEY|ORIG⟧ 标记的模版字符串替换为填好后的内容
  function fillTemplateString(templateStr, overrides, isHtml) {
    return templateStr.replace(/⟦([^|]+)\|([^⟧]*)⟧/g, function (_, key, origText) {
      if (!(key in overrides)) {
        return origText;
      }
      const rawOrig = origText
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&");
      const rule = overrides[key];
      const newVal = typeof rule === "function" ? rule(rawOrig) : String(rule);
      const escaped = escXml(newVal);
      if (isHtml && escaped !== origText) {
        return `<span class="text-sky-900 font-semibold">${escaped}</span>`;
      }
      return escaped;
    });
  }

  // ===========================================================================
  // 纯前端混合式 ZIP 打包器 (支持预压缩 DEFLATE 静态条目 + 动态 STORED XML 条目)
  // ===========================================================================
  const CRC_TABLE = (function () {
    const table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }
      table[i] = c >>> 0;
    }
    return table;
  })();

  function crc32(bytes) {
    let crc = 0xffffffff;
    for (let i = 0; i < bytes.length; i++) {
      crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function b64ToUint8Array(b64) {
    const bin = atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) {
      arr[i] = bin.charCodeAt(i);
    }
    return arr;
  }

  function buildHybridZip(staticEntries, dynamicFiles) {
    const enc = new TextEncoder();
    const allEntries = [];

    Object.keys(staticEntries).forEach(name => {
      const st = staticEntries[name];
      allEntries.push({
        nameBytes: enc.encode(name),
        compressType: st.compressType,
        crc: st.crc32 >>> 0,
        compBytes: b64ToUint8Array(st.b64),
        uncompressedSize: st.uncompressedSize >>> 0
      });
    });

    Object.keys(dynamicFiles).forEach(name => {
      const dataBytes = enc.encode(dynamicFiles[name]);
      allEntries.push({
        nameBytes: enc.encode(name),
        compressType: 0,
        crc: crc32(dataBytes),
        compBytes: dataBytes,
        uncompressedSize: dataBytes.length >>> 0
      });
    });

    const localParts = [];
    const centralParts = [];
    let offset = 0;

    allEntries.forEach(entry => {
      const nameLen = entry.nameBytes.length;
      const compLen = entry.compBytes.length;

      const lhdr = new Uint8Array(30 + nameLen);
      const lv = new DataView(lhdr.buffer);
      lv.setUint32(0, 0x04034b50, true);
      lv.setUint16(4, 20, true);
      lv.setUint16(6, 0x0800, true);
      lv.setUint16(8, entry.compressType, true);
      lv.setUint16(10, 0, true);
      lv.setUint16(12, 0x5421, true);
      lv.setUint32(14, entry.crc, true);
      lv.setUint32(18, compLen, true);
      lv.setUint32(22, entry.uncompressedSize, true);
      lv.setUint16(26, nameLen, true);
      lv.setUint16(28, 0, true);
      lhdr.set(entry.nameBytes, 30);

      localParts.push(lhdr, entry.compBytes);

      const chdr = new Uint8Array(46 + nameLen);
      const cv = new DataView(chdr.buffer);
      cv.setUint32(0, 0x02014b50, true);
      cv.setUint16(4, 20, true);
      cv.setUint16(6, 20, true);
      cv.setUint16(8, 0x0800, true);
      cv.setUint16(10, entry.compressType, true);
      cv.setUint16(12, 0, true);
      cv.setUint16(14, 0x5421, true);
      cv.setUint32(16, entry.crc, true);
      cv.setUint32(20, compLen, true);
      cv.setUint32(24, entry.uncompressedSize, true);
      cv.setUint16(28, nameLen, true);
      cv.setUint16(30, 0, true);
      cv.setUint16(32, 0, true);
      cv.setUint16(34, 0, true);
      cv.setUint16(36, 0, true);
      cv.setUint32(38, 0, true);
      cv.setUint32(42, offset, true);
      chdr.set(entry.nameBytes, 46);

      centralParts.push(chdr);
      offset += lhdr.length + compLen;
    });

    const centralSize = centralParts.reduce((s, p) => s + p.length, 0);
    const eocd = new Uint8Array(22);
    const ev = new DataView(eocd.buffer);
    ev.setUint32(0, 0x06054b50, true);
    ev.setUint16(4, 0, true);
    ev.setUint16(6, 0, true);
    ev.setUint16(8, allEntries.length, true);
    ev.setUint16(10, allEntries.length, true);
    ev.setUint32(12, centralSize, true);
    ev.setUint32(16, offset, true);
    ev.setUint16(20, 0, true);

    const totalLen = offset + centralSize + 22;
    const out = new Uint8Array(totalLen);
    let pos = 0;
    localParts.forEach(p => { out.set(p, pos); pos += p.length; });
    centralParts.forEach(p => { out.set(p, pos); pos += p.length; });
    out.set(eocd, pos);
    return out;
  }

  // 生成填好后的《病例报告表.docx》二进制字节数组
  function generateFilledDocxBytes(subj) {
    const tpl = window.CRF_DOCX_TEMPLATE;
    if (!tpl || !tpl.dynamicXml || !tpl.staticEntries) {
      throw new Error("未加载原版《病例报告表.docx》模版数据 (CRF_DOCX_TEMPLATE)");
    }
    const overrides = buildOverrides(subj);
    const filledDynamic = {};
    Object.keys(tpl.dynamicXml).forEach(fn => {
      filledDynamic[fn] = fillTemplateString(tpl.dynamicXml[fn], overrides, false);
    });
    return buildHybridZip(tpl.staticEntries, filledDynamic);
  }

  // 下载填好后的原版《病例报告表.docx》
  function downloadFilledDocx(subj) {
    const zipBytes = generateFilledDocxBytes(subj);
    const blob = new Blob([zipBytes], {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `病例报告表_${subj.id}_${subj.initials || "CRF"}.docx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  // 生成与原版《病例报告表.docx》1:1 一致的在线打印预览 HTML
  function renderFullPrintHTML(subj) {
    const tpl = window.CRF_DOCX_TEMPLATE;
    if (!tpl || !tpl.htmlPreviewTemplate) {
      return `<div class="p-8 text-center text-rose-600">未加载原版《病例报告表.docx》预览模版</div>`;
    }
    const overrides = buildOverrides(subj);
    return fillTemplateString(tpl.htmlPreviewTemplate, overrides, true);
  }

  return {
    buildOverrides,
    generateFilledDocxBytes,
    downloadFilledDocx,
    renderFullPrintHTML
  };
})();
