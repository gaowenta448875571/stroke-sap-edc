// 重症卒中临床科研电子数据采集系统 (eCRF / EDC) - 访视表单渲染模块

Object.assign(window.App, {
  // 辅助渲染单选按钮组（支持当选择含“其他/无法”选项时自动展开具体说明输入框）
  renderRadioGroup(path, currentVal, options, labelForAudit = "", customOtherPath = "") {
    const valStr = String(currentVal ?? "");
    const hasOtherSelected = valStr && (valStr.includes("其他") || valStr.includes("无法"));
    const otherPath = customOtherPath || `${path}_other`;
    const otherVal = hasOtherSelected ? (this.getByPath(otherPath) || "") : "";

    return `
      <div class="space-y-1.5">
        <div class="flex flex-wrap gap-2">
          ${options
            .map(opt => {
              const active = valStr === String(opt);
              return `
                <label onclick="App.setByPath('${path}', '${opt}', '${labelForAudit}')"
                  class="crf-option-pill ${active ? "active" : ""}">
                  <span>${active ? "☑" : "□"}</span>
                  <span>${opt}</span>
                </label>
              `;
            })
            .join("")}
        </div>
        ${
          hasOtherSelected
            ? `
          <div class="flex items-center gap-2 pt-0.5">
            <span class="text-[11px] font-semibold text-amber-700 shrink-0">↳ 请具体说明 (${valStr})：</span>
            <input type="text" value="${String(otherVal).replace(/"/g, "&quot;")}"
              placeholder="请填写具体内容/备注说明..."
              onchange="App.setByPath('${otherPath}', this.value, '${labelForAudit || path}-其他说明', true)"
              class="crf-input text-xs py-1 px-2.5 max-w-md border-amber-300 bg-amber-50/40 focus:bg-white" />
          </div>
        `
            : ""
        }
      </div>
    `;
  },

  // 辅助渲染多选按钮组（支持当勾选含“其他/无法”选项时自动展开具体说明输入框）
  renderCheckboxGroup(path, currentArr, options, labelForAudit = "", customOtherPath = "") {
    const arr = Array.isArray(currentArr) ? currentArr : [];
    const matchedOthers = arr.filter(x => String(x).includes("其他") || String(x).includes("无法"));
    const hasOtherSelected = matchedOthers.length > 0;
    const otherPath = customOtherPath || `${path}_other`;
    const otherVal = hasOtherSelected ? (this.getByPath(otherPath) || "") : "";

    return `
      <div class="space-y-1.5">
        <div class="flex flex-wrap gap-2">
          ${options
            .map(opt => {
              const active = arr.includes(opt);
              return `
                <label onclick="App.toggleArrayItem('${path}', '${opt}', '${labelForAudit}')"
                  class="crf-option-pill ${active ? "active" : ""}">
                  <span>${active ? "☑" : "□"}</span>
                  <span>${opt}</span>
                </label>
              `;
            })
            .join("")}
        </div>
        ${
          hasOtherSelected
            ? `
          <div class="flex items-center gap-2 pt-0.5">
            <span class="text-[11px] font-semibold text-amber-700 shrink-0">↳ 请具体说明 (${matchedOthers.join(" / ")})：</span>
            <input type="text" value="${String(otherVal).replace(/"/g, "&quot;")}"
              placeholder="请填写具体内容/备注说明..."
              onchange="App.setByPath('${otherPath}', this.value, '${labelForAudit || path}-其他说明', true)"
              class="crf-input text-xs py-1 px-2.5 max-w-md border-amber-300 bg-amber-50/40 focus:bg-white" />
          </div>
        `
            : ""
        }
      </div>
    `;
  },

  // 辅助渲染实验室检查通用面板（修复列宽挤压与失焦重绘导致备注无法输入的问题）
  renderLabTable(subj, visitKey, panelKeys) {
    const labs = subj[visitKey]?.labs || {};
    return `
      <div class="overflow-x-auto">
        <table class="w-full crf-table">
          <thead>
            <tr>
              <th class="w-28">指标分类</th>
              <th class="w-44">检测项目</th>
              <th class="w-36">检验结果 (数值)</th>
              <th class="w-28">单位 / 参考值</th>
              <th class="w-52">临床意义评估*</th>
              <th class="min-w-[180px]">备注 / 说明</th>
            </tr>
          </thead>
          <tbody>
            ${panelKeys
              .map(pKey => {
                const panel = window.CRF_CONFIG.labPanels[pKey];
                if (!panel) return "";
                const items = panel.items.filter(it => !(visitKey === "v2_1" && it.inV2_1 === false));
                return items
                  .map((item, idx) => {
                    const rowData = labs[item.id] || { val: "", eval: "0", note: "" };
                    const evalVal = rowData.eval ?? "0";
                    const needReRenderOnValChange = item.id === "neut" || item.id === "lymph";
                    return `
                      <tr>
                        ${
                          idx === 0
                            ? `<td rowspan="${items.length}" class="font-bold text-slate-700 bg-slate-50/70">${panel.title}</td>`
                            : ""
                        }
                        <td class="font-medium text-slate-800">
                          ${item.name}
                          ${item.autoCalc ? `<span class="ml-1 text-[11px] px-1.5 py-0.5 rounded bg-sky-100 text-sky-700">自动计算</span>` : ""}
                        </td>
                        <td>
                          <div class="flex items-center gap-1">
                            <input type="text" value="${String(rowData.val ?? "").replace(/"/g, "&quot;")}"
                              placeholder="${item.autoCalc ? "由NEUT/LYMPH计算" : "输入数值或ND"}"
                              onchange="App.setByPath('${visitKey}.labs.${item.id}.val', this.value, '${visitKey}-${item.name}', ${!needReRenderOnValChange})"
                              class="crf-input font-mono" />
                          </div>
                        </td>
                        <td class="text-xs text-slate-500">
                          <div class="font-semibold text-slate-700">${item.unit}</div>
                          <div>参考: ${item.ref}</div>
                        </td>
                        <td>
                          <div class="flex flex-wrap gap-1">
                            ${[
                              { code: "0", text: "0正常" },
                              { code: "1", text: "1异常无意义" },
                              { code: "2", text: "2异常有意义" },
                              { code: "9", text: "9未查" }
                            ]
                              .map(
                                ev => `
                              <button type="button" onclick="App.setByPath('${visitKey}.labs.${item.id}.eval', '${ev.code}', '${item.name}临床意义')"
                                class="px-2 py-1 rounded text-xs border transition ${
                                  String(evalVal) === ev.code
                                    ? ev.code === "2"
                                      ? "bg-rose-600 text-white border-rose-600 font-semibold"
                                      : "bg-sky-600 text-white border-sky-600 font-semibold"
                                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                                }">
                                □${ev.code}
                              </button>
                            `
                              )
                              .join("")}
                          </div>
                        </td>
                        <td class="min-w-[180px]">
                          <input type="text" value="${String(rowData.note ?? "").replace(/"/g, "&quot;")}" placeholder="填写备注/异常说明..."
                            onchange="App.setByPath('${visitKey}.labs.${item.id}.note', this.value, '${item.name}备注', true)"
                            class="crf-input text-xs w-full" />
                        </td>
                      </tr>
                    `;
                  })
                  .join("");
              })
              .join("")}
          </tbody>
        </table>
        <p class="text-xs text-slate-500 mt-2">*注：<strong>0</strong>=正常；<strong>1</strong>=异常，无临床意义；<strong>2</strong>=异常，有临床意义；<strong>9</strong>=未查（ND）。</p>
      </div>
    `;
  },

  // 辅助渲染量表评分汇总表（支持一键打开详细评分计算器弹窗）
  renderScalesSummaryTable(subj, visitKey, scaleKeys) {
    const scales = subj[visitKey]?.scales || {};
    return `
      <div class="overflow-x-auto">
        <table class="w-full crf-table">
          <thead>
            <tr>
              <th>临床评估量表</th>
              <th class="w-40">量表总分 / 结果</th>
              <th class="w-36">评估者签字</th>
              <th class="w-44">是否为针刺操作者</th>
              <th class="w-44 text-center no-print">逐项评分计算器</th>
              <th class="min-w-[150px]">备注 / 说明</th>
            </tr>
          </thead>
          <tbody>
            ${scaleKeys
              .map(sKey => {
                const def = window.CLINICAL_SCALES[sKey];
                const sc = scales[sKey] || { score: "", signer: subj.investigator, isAcupuncturist: "否", note: "" };
                return `
                  <tr>
                    <td>
                      <div class="font-bold text-slate-800">${def.name}</div>
                      <div class="text-xs text-slate-500">${def.description}</div>
                    </td>
                    <td>
                      <input type="text" value="${sc.score ?? ""}" placeholder="填分或点击右侧计算"
                        onchange="App.setByPath('${visitKey}.scales.${sKey}.score', this.value, '${visitKey}-${def.name}', true)"
                        class="crf-input font-bold text-sky-700 text-center" />
                    </td>
                    <td>
                      <input type="text" value="${sc.signer || ""}" placeholder="评估者姓名"
                        onchange="App.setByPath('${visitKey}.scales.${sKey}.signer', this.value, '${def.name}签名', true)"
                        class="crf-input" />
                    </td>
                    <td>
                      ${
                        def.needAcupunctureFlag
                          ? this.renderRadioGroup(`${visitKey}.scales.${sKey}.isAcupuncturist`, sc.isAcupuncturist || "否", ["是", "否"], `${def.name}是否针刺者`)
                          : `<span class="text-xs text-slate-400">— (患者/家属自评或代理)</span>`
                      }
                    </td>
                    <td class="text-center no-print">
                      <button type="button" onclick="App.openScaleModal('${visitKey}', '${sKey}')"
                        class="px-3 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 text-xs font-semibold transition">
                        🧮 展开量表细则算分
                      </button>
                    </td>
                    <td>
                      <input type="text" value="${String(sc.note ?? "").replace(/"/g, "&quot;")}" placeholder="选填评估备注..."
                        onchange="App.setByPath('${visitKey}.scales.${sKey}.note', this.value, '${def.name}备注', true)"
                        class="crf-input text-xs" />
                    </td>
                  </tr>
                `;
              })
              .join("")}
          </tbody>
        </table>
      </div>
    `;
  },

  // 辅助渲染生命体征表
  renderVitalsTable(subj, visitKey) {
    const v = subj[visitKey]?.vitals || {};
    return `
      <div class="grid grid-cols-2 sm:grid-cols-6 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
        <div>
          <label class="text-xs font-semibold text-slate-600 block mb-1">体温 (T, ℃)</label>
          <input type="text" value="${v.temp || ""}" placeholder="36.5"
            onchange="App.setByPath('${visitKey}.vitals.temp', this.value, '${visitKey}体温', true)"
            class="crf-input font-mono" />
        </div>
        <div>
          <label class="text-xs font-semibold text-slate-600 block mb-1">呼吸 (R, 次/分)</label>
          <input type="text" value="${v.resp || ""}" placeholder="18"
            onchange="App.setByPath('${visitKey}.vitals.resp', this.value, '${visitKey}呼吸', true)"
            class="crf-input font-mono" />
        </div>
        <div>
          <label class="text-xs font-semibold text-slate-600 block mb-1">脉搏 (P, 次/分)</label>
          <input type="text" value="${v.pulse || ""}" placeholder="76"
            onchange="App.setByPath('${visitKey}.vitals.pulse', this.value, '${visitKey}脉搏', true)"
            class="crf-input font-mono" />
        </div>
        <div>
          <label class="text-xs font-semibold text-slate-600 block mb-1">收缩压 (SBP, mmHg)</label>
          <input type="text" value="${v.sbp || ""}" placeholder="140"
            onchange="App.setByPath('${visitKey}.vitals.sbp', this.value, '${visitKey}收缩压', true)"
            class="crf-input font-mono" />
        </div>
        <div>
          <label class="text-xs font-semibold text-slate-600 block mb-1">舒张压 (DBP, mmHg)</label>
          <input type="text" value="${v.dbp || ""}" placeholder="85"
            onchange="App.setByPath('${visitKey}.vitals.dbp', this.value, '${visitKey}舒张压', true)"
            class="crf-input font-mono" />
        </div>
        <div>
          <label class="text-xs font-semibold text-slate-600 block mb-1">备注 / 说明</label>
          <input type="text" value="${v.note || ""}" placeholder="选填备注..."
            onchange="App.setByPath('${visitKey}.vitals.note', this.value, '${visitKey}生命体征备注', true)"
            class="crf-input text-xs" />
        </div>
      </div>
    `;
  },

  // 辅助渲染生物样本采集表
  renderBiosamplesBlock(subj, visitKey) {
    const bio = subj[visitKey]?.biosamples || { plasma: "是", swab: "是", stool: "是" };
    return `
      <div class="overflow-x-auto">
        <table class="w-full crf-table">
          <thead>
            <tr>
              <th class="w-36">样本类型</th>
              <th>标准采样操作规范 (SOP)</th>
              <th class="w-40">是否完成采集</th>
              <th class="min-w-[180px]">样本编号 / 备注说明</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="font-bold text-slate-800">🩸 血浆样本</td>
              <td class="text-xs text-slate-600">采集血样当天，受试者空腹（至少8小时）于早晨 8:00-9:00 由专业采血人员进行血液采集。</td>
              <td>${this.renderRadioGroup(`${visitKey}.biosamples.plasma`, bio.plasma, ["是", "否"], `${visitKey}血浆样本`)}</td>
              <td>
                <input type="text" value="${bio.plasmaNote || ""}" placeholder="填写冻存管号或未采原因..."
                  onchange="App.setByPath('${visitKey}.biosamples.plasmaNote', this.value, '${visitKey}血浆备注', true)"
                  class="crf-input text-xs" />
              </td>
            </tr>
            <tr>
              <td class="font-bold text-slate-800">🧪 咽拭子样本</td>
              <td class="text-xs text-slate-600">在采样前30分钟，禁止进食、饮水、吸烟或嚼口香糖，用饮用水将口腔内的杂物洗漱干净。</td>
              <td>${this.renderRadioGroup(`${visitKey}.biosamples.swab`, bio.swab, ["是", "否"], `${visitKey}咽拭子样本`)}</td>
              <td>
                <input type="text" value="${bio.swabNote || ""}" placeholder="填写采样管号或未采原因..."
                  onchange="App.setByPath('${visitKey}.biosamples.swabNote', this.value, '${visitKey}咽拭子备注', true)"
                  class="crf-input text-xs" />
              </td>
            </tr>
            <tr>
              <td class="font-bold text-slate-800">🧫 粪便样本</td>
              <td class="text-xs text-slate-600">将粪便排泄到干净的容器中，尽量避免粪便样本污染，用无菌勺挖取排泄中后段、靠近中部内侧位的粪便装进管道。</td>
              <td>${this.renderRadioGroup(`${visitKey}.biosamples.stool`, bio.stool, ["是", "否"], `${visitKey}粪便样本`)}</td>
              <td>
                <input type="text" value="${bio.stoolNote || ""}" placeholder="填写采样管号或未采原因..."
                  onchange="App.setByPath('${visitKey}.biosamples.stoolNote', this.value, '${visitKey}粪便备注', true)"
                  class="crf-input text-xs" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    `;
  },

  // ==================== V1 基线采集表 (含 9 个子页签) ====================
  renderVisitV1(subj) {
    const subTabs = [
      "1. 知情同意与人口学",
      "2. 病史与入院查体",
      "3. 生命体征与心电图",
      "4. 颅脑与胸部影像",
      "5. 基线实验室检查",
      "6. 临床量表评分",
      "7. 中医四诊与诊断",
      "8. 纳排标准与入组",
      "9. 生物样本采集"
    ];
    const curIdx = this.state.v1SubTab || 0;
    const d = subj.v1.demographics;
    const h = subj.v1.history;
    const ex = subj.v1.exam;
    const ecg = subj.v1.ecg;
    const img = subj.v1.imaging;

    return `
      <div class="space-y-6">
        <!-- V1 子模块快速切换栏 -->
        <div class="flex flex-wrap gap-1.5 bg-slate-100 p-2 rounded-xl border border-slate-200 no-print">
          ${subTabs
            .map(
              (title, idx) => `
            <button type="button" onclick="App.selectV1SubTab(${idx})"
              class="px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                curIdx === idx ? "bg-sky-700 text-white shadow-sm" : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200/80"
              }">
              ${title}
            </button>
          `
            )
            .join("")}
        </div>

        ${
          curIdx === 0
            ? `
          <!-- 1. 知情同意与人口学资料 -->
          <div class="space-y-5">
            <div class="bg-sky-50/60 border border-sky-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 class="font-bold text-sky-950 text-sm">✍️ 签署知情同意书日期</h3>
                <p class="text-xs text-slate-600 mt-0.5">入组前必须由受试者本人或法定监护人签署知情同意书</p>
              </div>
              <input type="date" value="${subj.v1.consentDate || ""}"
                onchange="App.setByPath('v1.consentDate', this.value, '知情同意书日期')"
                class="crf-input w-48 font-mono font-bold" />
            </div>

            <h3 class="font-bold text-slate-800 text-base border-l-4 border-sky-600 pl-3">人口学资料</h3>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label class="text-xs font-semibold text-slate-600 block mb-1">医疗机构登记号（住院号/门急诊号）</label>
                <input type="text" value="${d.hospitalId || ""}"
                  onchange="App.setByPath('v1.demographics.hospitalId', this.value, '住院号/门急诊号', true)"
                  class="crf-input font-mono" />
              </div>
              <div>
                <label class="text-xs font-semibold text-slate-600 block mb-1">性别</label>
                ${this.renderRadioGroup("v1.demographics.gender", d.gender, ["男", "女"], "性别")}
              </div>
              <div>
                <label class="text-xs font-semibold text-slate-600 block mb-1">出生日期（年龄：${d.age || "-"} 岁）</label>
                <input type="date" value="${d.birthDate || ""}"
                  onchange="App.setByPath('v1.demographics.birthDate', this.value, '出生日期')"
                  class="crf-input" />
              </div>

              <div class="sm:col-span-3">
                <label class="text-xs font-semibold text-slate-600 block mb-1">入院来源</label>
                ${this.renderRadioGroup("v1.demographics.admissionSource", d.admissionSource, ["急诊", "门诊", "外院转入", "院内转科", "其他"], "入院来源")}
              </div>

              <div>
                <label class="text-xs font-semibold text-slate-600 block mb-1">手机号 1</label>
                <input type="text" value="${d.phone1 || ""}"
                  onchange="App.setByPath('v1.demographics.phone1', this.value, '手机号1', true)"
                  class="crf-input font-mono" />
              </div>
              <div>
                <label class="text-xs font-semibold text-slate-600 block mb-1">手机号 2</label>
                <input type="text" value="${d.phone2 || ""}"
                  onchange="App.setByPath('v1.demographics.phone2', this.value, '手机号2', true)"
                  class="crf-input font-mono" />
              </div>
              <div class="grid grid-cols-3 gap-2">
                <div>
                  <label class="text-xs font-semibold text-slate-600 block mb-1">身高 (cm)</label>
                  <input type="number" value="${d.height || ""}"
                    onchange="App.setByPath('v1.demographics.height', this.value, '身高')"
                    class="crf-input font-mono" />
                </div>
                <div>
                  <label class="text-xs font-semibold text-slate-600 block mb-1">体重 (kg)</label>
                  <input type="number" value="${d.weight || ""}"
                    onchange="App.setByPath('v1.demographics.weight', this.value, '体重')"
                    class="crf-input font-mono" />
                </div>
                <div>
                  <label class="text-xs font-semibold text-sky-700 block mb-1">BMI (自动计算)</label>
                  <input type="text" value="${d.bmi || ""} kg/m²" readonly class="crf-input font-mono font-bold text-sky-700" />
                </div>
              </div>

              <div class="sm:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="text-xs font-semibold text-slate-600 block mb-1">籍贯（省 / 市 / 县区）</label>
                  <div class="grid grid-cols-3 gap-2">
                    <input type="text" placeholder="省/直辖市" value="${d.nativeProvince || ""}" onchange="App.setByPath('v1.demographics.nativeProvince', this.value, '籍贯省', true)" class="crf-input" />
                    <input type="text" placeholder="市/地区" value="${d.nativeCity || ""}" onchange="App.setByPath('v1.demographics.nativeCity', this.value, '籍贯市', true)" class="crf-input" />
                    <input type="text" placeholder="县/区" value="${d.nativeCounty || ""}" onchange="App.setByPath('v1.demographics.nativeCounty', this.value, '籍贯县', true)" class="crf-input" />
                  </div>
                </div>
                <div>
                  <label class="text-xs font-semibold text-slate-600 block mb-1">久居地（省 / 市 / 县区）</label>
                  <div class="grid grid-cols-3 gap-2">
                    <input type="text" placeholder="省/直辖市" value="${d.resideProvince || ""}" onchange="App.setByPath('v1.demographics.resideProvince', this.value, '久居省', true)" class="crf-input" />
                    <input type="text" placeholder="市/地区" value="${d.resideCity || ""}" onchange="App.setByPath('v1.demographics.resideCity', this.value, '久居市', true)" class="crf-input" />
                    <input type="text" placeholder="县/区" value="${d.resideCounty || ""}" onchange="App.setByPath('v1.demographics.resideCounty', this.value, '久居县', true)" class="crf-input" />
                  </div>
                </div>
              </div>

              <div class="sm:col-span-3">
                <label class="text-xs font-semibold text-slate-600 block mb-1">婚况</label>
                ${this.renderRadioGroup("v1.demographics.marital", d.marital, ["未婚", "已婚", "离异", "丧偶", "再婚", "不详", "其他"], "婚况")}
              </div>
              <div class="sm:col-span-3">
                <label class="text-xs font-semibold text-slate-600 block mb-1">民族</label>
                ${this.renderRadioGroup("v1.demographics.ethnicity", d.ethnicity, ["汉族", "回族", "满族", "维吾尔族", "苗族", "朝鲜族", "壮族", "蒙古族", "其他"], "民族", "v1.demographics.ethnicityOther")}
              </div>
              <div class="sm:col-span-3">
                <label class="text-xs font-semibold text-slate-600 block mb-1">文化程度</label>
                ${this.renderRadioGroup(
                  "v1.demographics.education",
                  d.education,
                  ["研究生", "大学本科", "大学专科或专科学校", "中等专业或中等技术学校", "技工学校", "高中", "初中", "小学", "文盲或半文盲", "其他"],
                  "文化程度"
                )}
              </div>
              <div class="sm:col-span-3">
                <label class="text-xs font-semibold text-slate-600 block mb-1">职业</label>
                ${this.renderRadioGroup(
                  "v1.demographics.occupation",
                  d.occupation,
                  ["国家公务员", "专业技术人员", "职员", "企业管理人员", "工人", "农民", "学生", "现役军人", "自由职业者", "个体经营者", "无业人员", "退（离）休人员", "其他"],
                  "职业",
                  "v1.demographics.occupationOther"
                )}
              </div>
            </div>
          </div>
        `
            : ""
        }

        ${
          curIdx === 1
            ? `
          <!-- 2. 病史资料与入院查体 -->
          <div class="space-y-6">
            <h3 class="font-bold text-slate-800 text-base border-l-4 border-sky-600 pl-3">病史资料采集</h3>
            <div>
              <label class="text-xs font-semibold text-slate-600 block mb-1.5">病史提供者 / 资料来源（可多选）</label>
              ${this.renderCheckboxGroup("v1.history.source", h.source, ["患者本人", "家属/照护者", "院前急救/转诊资料", "既往病历", "无法获得(昏迷/失语/无知情者)", "其他"], "病史来源")}
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <label class="text-xs font-semibold text-slate-600 block mb-1">症状首次出现时间（发病时间）</label>
                <input type="datetime-local" value="${h.onsetTime || ""}" onchange="App.setByPath('v1.history.onsetTime', this.value, '发病时间', true)" class="crf-input" />
              </div>
              <div>
                <label class="text-xs font-semibold text-slate-600 block mb-1">最后正常时间</label>
                <input type="datetime-local" value="${h.lastNormalTime || ""}" onchange="App.setByPath('v1.history.lastNormalTime', this.value, '最后正常时间', true)" class="crf-input" />
              </div>
              <div>
                <label class="text-xs font-semibold text-slate-600 block mb-1">首次就诊时间</label>
                <input type="datetime-local" value="${h.firstVisitTime || ""}" onchange="App.setByPath('v1.history.firstVisitTime', this.value, '首次就诊时间', true)" class="crf-input" />
              </div>
              <div>
                <label class="text-xs font-semibold text-slate-600 block mb-1">静脉溶栓</label>
                ${this.renderRadioGroup("v1.history.ivThrombolysis", h.ivThrombolysis, ["实施", "未实施"], "静脉溶栓")}
              </div>
              <div>
                <label class="text-xs font-semibold text-slate-600 block mb-1">溶栓开始时间 / 未实施原因</label>
                <input type="text" value="${h.ivThrombolysis === "实施" ? h.ivStartTime : h.ivNotReason}"
                  placeholder="填写时间或未溶栓原因"
                  onchange="App.setByPath('${h.ivThrombolysis === "实施" ? "v1.history.ivStartTime" : "v1.history.ivNotReason"}', this.value, '溶栓时间或原因', true)"
                  class="crf-input" />
              </div>
              <div>
                <label class="text-xs font-semibold text-slate-600 block mb-1">收入本院时间</label>
                <input type="datetime-local" value="${h.admissionTime || ""}" onchange="App.setByPath('v1.history.admissionTime', this.value, '收入院时间', true)" class="crf-input" />
              </div>
            </div>

            <!-- 主诉与现病史 -->
            <div class="space-y-3">
              <label class="text-xs font-bold text-slate-700 block">主诉与现病史核心要素</label>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span class="text-xs text-slate-500 block mb-1">主要表现（多选）：</span>
                  ${this.renderCheckboxGroup("v1.history.mainSymptoms", h.mainSymptoms, ["意识障碍", "言语障碍", "肢体无力/瘫痪", "头晕/眩晕", "剧烈头痛", "呕吐", "抽搐", "其他"], "主诉症状")}
                </div>
                <div>
                  <span class="text-xs text-slate-500 block mb-1">伴随情况（多选）：</span>
                  ${this.renderCheckboxGroup("v1.history.accompany", h.accompany, ["饮水呛咳", "吞咽困难", "呃逆", "发热", "咳嗽/咳痰", "大小便失禁", "其他"], "伴随情况")}
                </div>
              </div>
              <div>
                <label class="text-xs text-slate-500 block mb-1">补充病程（含转诊经过、用药及重要阴性症状）：</label>
                <textarea rows="2" onchange="App.setByPath('v1.history.hpiNarrative', this.value, '现病史描述', true)"
                  class="crf-input">${h.hpiNarrative || ""}</textarea>
              </div>
            </div>

            <!-- 既往史与发病前mRS -->
            <div class="space-y-3 pt-3 border-t border-slate-200">
              <label class="text-xs font-bold text-slate-700 block">既往病史（发病前已明确诊断的疾病）</label>
              ${this.renderCheckboxGroup(
                "v1.history.pastDiseases",
                h.pastDiseases,
                ["高血压", "糖尿病", "血脂异常", "房颤/房扑", "冠心病", "心肌梗死", "心力衰竭", "脑梗死/TIA", "脑出血", "肾功能不全", "反复肺部感染", "慢性肾病", "慢性肝病", "恶性肿瘤", "既往体健", "其他"],
                "既往病史"
              )}
              <input type="text" value="${h.pastDetail || ""}" placeholder="所选疾病的诊断年份/病程、治疗及控制情况..."
                onchange="App.setByPath('v1.history.pastDetail', this.value, '既往史详情', true)" class="crf-input" />
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label class="text-xs font-semibold text-slate-600 block mb-1">发病前 mRS 评分 (0-5分)</label>
                ${this.renderRadioGroup("v1.history.preMrs", h.preMrs, ["0", "1", "2", "3", "4", "5"], "发病前mRS")}
              </div>
              <div>
                <label class="text-xs font-semibold text-slate-600 block mb-1">吸烟史</label>
                ${this.renderRadioGroup("v1.history.smoking", h.smoking, ["吸烟", "已戒烟", "无"], "吸烟史")}
              </div>
              <div>
                <label class="text-xs font-semibold text-slate-600 block mb-1">饮酒史</label>
                ${this.renderRadioGroup("v1.history.drinking", h.drinking, ["饮酒", "已戒酒", "无"], "饮酒史")}
              </div>
            </div>

            <!-- 入院专科查体 -->
            <h3 class="font-bold text-slate-800 text-base border-l-4 border-teal-600 pl-3 pt-2">入院查体</h3>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <label class="text-xs font-semibold text-slate-600 block mb-1">一般情况</label>
                ${this.renderRadioGroup("v1.exam.generalState", ex.generalState, ["平稳", "危重", "其他"], "一般情况")}
              </div>
              <div>
                <label class="text-xs font-semibold text-slate-600 block mb-1">呼吸道听诊</label>
                ${this.renderRadioGroup("v1.exam.airway", ex.airway, ["无明显异常", "痰鸣音", "其他"], "呼吸道")}
              </div>
              <div>
                <label class="text-xs font-semibold text-slate-600 block mb-1">痰液性状</label>
                ${this.renderRadioGroup("v1.exam.sputum", ex.sputum, ["无", "白黏", "黄稠", "血性", "其他"], "痰液性状")}
              </div>
              <div>
                <label class="text-xs font-semibold text-slate-600 block mb-1">意识状态</label>
                ${this.renderRadioGroup("v1.exam.consciousness", ex.consciousness, ["清醒", "嗜睡", "昏睡", "昏迷", "意识模糊", "其他"], "查体意识")}
              </div>
              <div>
                <label class="text-xs font-semibold text-slate-600 block mb-1">言语功能</label>
                ${this.renderRadioGroup("v1.exam.speech", ex.speech, ["正常", "构音障碍", "失语", "不能评估", "其他"], "查体言语")}
              </div>
              <div>
                <label class="text-xs font-semibold text-slate-600 block mb-1">吞咽功能</label>
                ${this.renderRadioGroup("v1.exam.swallow", ex.swallow, ["正常", "障碍", "不能评估", "其他"], "查体吞咽")}
              </div>
              <div class="sm:col-span-2 grid grid-cols-4 gap-2">
                <div>
                  <label class="text-xs text-slate-500 block mb-1">左上肢肌力(级)</label>
                  <input type="text" value="${ex.strengthLU || ""}" onchange="App.setByPath('v1.exam.strengthLU', this.value, '左上肢肌力', true)" class="crf-input text-center" />
                </div>
                <div>
                  <label class="text-xs text-slate-500 block mb-1">右上肢肌力(级)</label>
                  <input type="text" value="${ex.strengthRU || ""}" onchange="App.setByPath('v1.exam.strengthRU', this.value, '右上肢肌力', true)" class="crf-input text-center" />
                </div>
                <div>
                  <label class="text-xs text-slate-500 block mb-1">左下肢肌力(级)</label>
                  <input type="text" value="${ex.strengthLL || ""}" onchange="App.setByPath('v1.exam.strengthLL', this.value, '左下肢肌力', true)" class="crf-input text-center" />
                </div>
                <div>
                  <label class="text-xs text-slate-500 block mb-1">右下肢肌力(级)</label>
                  <input type="text" value="${ex.strengthRL || ""}" onchange="App.setByPath('v1.exam.strengthRL', this.value, '右下肢肌力', true)" class="crf-input text-center" />
                </div>
              </div>
              <div>
                <label class="text-xs font-semibold text-slate-600 block mb-1">肌张力</label>
                ${this.renderRadioGroup("v1.exam.muscleTone", ex.muscleTone, ["正常", "增高", "降低", "其他"], "肌张力")}
              </div>
            </div>
          </div>
        `
            : ""
        }

        ${
          curIdx === 2
            ? `
          <!-- 3. 基础生命体征与入院心电图 -->
          <div class="space-y-6">
            <h3 class="font-bold text-slate-800 text-base border-l-4 border-sky-600 pl-3">基础生命体征监测表 (V1 入院基线)</h3>
            ${this.renderVitalsTable(subj, "v1")}

            <h3 class="font-bold text-slate-800 text-base border-l-4 border-sky-600 pl-3">入院心电图 (ECG)</h3>
            <div class="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div class="grid grid-cols-2 sm:grid-cols-6 gap-3">
                <div><label class="text-xs text-slate-500 block mb-1">心率 (次/分)</label><input type="text" value="${ecg.hr || ""}" onchange="App.setByPath('v1.ecg.hr', this.value, '心电图心率', true)" class="crf-input font-mono" /></div>
                <div><label class="text-xs text-slate-500 block mb-1">PR间期 (ms)</label><input type="text" value="${ecg.pr || ""}" onchange="App.setByPath('v1.ecg.pr', this.value, 'PR间期', true)" class="crf-input font-mono" /></div>
                <div><label class="text-xs text-slate-500 block mb-1">QRS时限 (ms)</label><input type="text" value="${ecg.qrs || ""}" onchange="App.setByPath('v1.ecg.qrs', this.value, 'QRS时限', true)" class="crf-input font-mono" /></div>
                <div><label class="text-xs text-slate-500 block mb-1">QT间期 (ms)</label><input type="text" value="${ecg.qt || ""}" onchange="App.setByPath('v1.ecg.qt', this.value, 'QT间期', true)" class="crf-input font-mono" /></div>
                <div><label class="text-xs text-slate-500 block mb-1">QTc间期 (ms)</label><input type="text" value="${ecg.qtc || ""}" onchange="App.setByPath('v1.ecg.qtc', this.value, 'QTc间期', true)" class="crf-input font-mono" /></div>
                <div><label class="text-xs text-slate-500 block mb-1">电轴 (°)</label><input type="text" value="${ecg.axis || ""}" onchange="App.setByPath('v1.ecg.axis', this.value, '心电轴', true)" class="crf-input font-mono" /></div>
              </div>
              <div>
                <label class="text-xs font-semibold text-slate-600 block mb-1">心律判定（可多选）</label>
                ${this.renderCheckboxGroup("v1.ecg.rhythm", ecg.rhythm, ["窦性心律", "窦性心动过速", "窦性心动过缓", "房颤", "房扑", "房性早搏", "室性早搏", "起搏心律", "其他"], "心电图心律")}
              </div>
              <div>
                <label class="text-xs font-semibold text-slate-600 block mb-1">缺血/损伤与 ST-T 改变</label>
                ${this.renderCheckboxGroup("v1.ecg.stT", ecg.stT, ["无明显异常", "非特异ST段改变", "ST段压低", "ST段抬高", "T波倒置/低平", "病理性Q波", "其他"], "ST-T改变")}
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="text-xs font-semibold text-slate-600 block mb-1">心电图机自动报告原文</label>
                  <textarea rows="2" onchange="App.setByPath('v1.ecg.autoReport', this.value, 'ECG自动报告', true)" class="crf-input">${ecg.autoReport || ""}</textarea>
                </div>
                <div>
                  <label class="text-xs font-semibold text-slate-600 block mb-1">研究者复核结论</label>
                  <textarea rows="2" onchange="App.setByPath('v1.ecg.reviewerConclusion', this.value, 'ECG复核结论', true)" class="crf-input">${ecg.reviewerConclusion || ""}</textarea>
                </div>
              </div>
            </div>
          </div>
        `
            : ""
        }

        ${
          curIdx === 3
            ? `
          <!-- 4. 颅脑影像与胸部影像 -->
          <div class="space-y-5">
            <h3 class="font-bold text-slate-800 text-base border-l-4 border-sky-600 pl-3">颅脑影像与基线胸部影像</h3>
            <div class="overflow-x-auto">
              <table class="w-full crf-table">
                <thead>
                  <tr>
                    <th class="w-28">检查项目</th>
                    <th class="w-36">是否检测</th>
                    <th class="w-40">影像来源</th>
                    <th class="w-32">检查日期</th>
                    <th class="min-w-[200px]">影像学所见</th>
                    <th class="min-w-[200px]">影像学诊断</th>
                  </tr>
                </thead>
                <tbody>
                  ${[
                    { key: "brainMR", name: "颅脑 MR" },
                    { key: "brainCT", name: "颅脑 CT" },
                    { key: "chestCT", name: "胸部 CT" },
                    { key: "chestXray", name: "胸部 X 线" }
                  ]
                    .map(row => {
                      const it = img[row.key] || { done: "否", source: "本院", date: "", findings: "", diagnosis: "" };
                      return `
                        <tr>
                          <td class="font-bold text-slate-800">${row.name}</td>
                          <td>${this.renderRadioGroup(`v1.imaging.${row.key}.done`, it.done, ["是", "否"], row.name)}</td>
                          <td>${this.renderRadioGroup(`v1.imaging.${row.key}.source`, it.source || "本院", ["本院", "外院报告", "其他"], `${row.name}来源`)}</td>
                          <td><input type="text" placeholder="如 05月02日" value="${it.date || ""}" onchange="App.setByPath('v1.imaging.${row.key}.date', this.value, '${row.name}日期', true)" class="crf-input text-xs" /></td>
                          <td><textarea rows="2" placeholder="输入影像学所见..." onchange="App.setByPath('v1.imaging.${row.key}.findings', this.value, '${row.name}所见', true)" class="crf-input text-xs">${it.findings || ""}</textarea></td>
                          <td><textarea rows="2" placeholder="输入影像学诊断..." onchange="App.setByPath('v1.imaging.${row.key}.diagnosis', this.value, '${row.name}诊断', true)" class="crf-input text-xs">${it.diagnosis || ""}</textarea></td>
                        </tr>
                      `;
                    })
                    .join("")}
                </tbody>
              </table>
            </div>
          </div>
        `
            : ""
        }

        ${
          curIdx === 4
            ? `
          <!-- 5. 基线实验室全套检查 -->
          <div class="space-y-4">
            <h3 class="font-bold text-slate-800 text-base border-l-4 border-sky-600 pl-3">V1 基线实验室全套检查（五大模块 24 项指标）</h3>
            ${this.renderLabTable(subj, "v1", ["inflammation", "coagulation", "nutrition", "organ", "cytokines"])}
          </div>
        `
            : ""
        }

        ${
          curIdx === 5
            ? `
          <!-- 6. 临床量表评分 -->
          <div class="space-y-4">
            <h3 class="font-bold text-slate-800 text-base border-l-4 border-sky-600 pl-3">V1 基线临床量表评估 (GCS / NIHSS / SOFA / FOIS / EQ-5D-3L)</h3>
            ${this.renderScalesSummaryTable(subj, "v1", ["GCS", "NIHSS", "SOFA", "FOIS", "EQ5D"])}
          </div>
        `
            : ""
        }

        ${
          curIdx === 6
            ? `
          <!-- 7. 中医四诊信息采集与诊断 -->
          <div class="space-y-6">
            <h3 class="font-bold text-slate-800 text-base border-l-4 border-teal-600 pl-3">中医四诊信息采集表（八大模块 + 舌脉关键信息）</h3>
            <div class="overflow-x-auto">
              <table class="w-full crf-table">
                <thead>
                  <tr>
                    <th class="w-44">模块分类</th>
                    <th class="w-40">采集项目</th>
                    <th>中医四诊选项（请勾选；主观项目无法获取时须勾选“无法评估”；选项不符勾选“其他”并注明）</th>
                  </tr>
                </thead>
                <tbody>
                  ${window.CRF_CONFIG.tcmFourDiagnostics
                    .map(cat =>
                      cat.fields
                        .map(
                          (f, idx) => `
                        <tr>
                          ${idx === 0 ? `<td rowspan="${cat.fields.length}" class="font-bold text-teal-900 bg-teal-50/40">${cat.category}</td>` : ""}
                          <td class="font-semibold text-slate-700">${f.label}</td>
                          <td>
                            ${
                              f.type === "radio"
                                ? this.renderRadioGroup(`v1.tcm.${f.id}`, subj.v1.tcm?.[f.id], f.options, `四诊-${f.label}`)
                                : this.renderCheckboxGroup(`v1.tcm.${f.id}`, subj.v1.tcm?.[f.id], f.options, `四诊-${f.label}`)
                            }
                          </td>
                        </tr>
                      `
                        )
                        .join("")
                    )
                    .join("")}
                </tbody>
              </table>
            </div>

            <h3 class="font-bold text-slate-800 text-base border-l-4 border-sky-600 pl-3">西医与中医证候诊断</h3>
            <div class="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <label class="text-xs font-bold text-slate-700 block mb-1.5">TOAST 病因分型（单选）</label>
                ${this.renderRadioGroup(
                  "v1.diagnosis.toast",
                  subj.v1.diagnosis?.toast,
                  ["大动脉粥样硬化型", "心源性栓塞型", "小动脉闭塞型", "其他明确病因型", "不明原因"],
                  "TOAST分型",
                  "v1.diagnosis.toastOther"
                )}
              </div>
              <div>
                <label class="text-xs font-bold text-slate-700 block mb-1.5">疾病分型（可多选）</label>
                ${this.renderCheckboxGroup(
                  "v1.diagnosis.diseaseSubtype",
                  subj.v1.diagnosis?.diseaseSubtype,
                  ["重症脑梗死", "大面积脑梗死", "恶性脑水肿", "危重症脑梗死", "其他"],
                  "疾病分型"
                )}
              </div>
              <div>
                <label class="text-xs font-bold text-slate-700 block mb-1.5">中医证候诊断（可多选）</label>
                ${this.renderCheckboxGroup(
                  "v1.diagnosis.tcmSyndrome",
                  subj.v1.diagnosis?.tcmSyndrome,
                  ["风痰入络证", "风阳上扰证", "阴虚风动证", "痰蒙清窍证", "痰热腑实证", "元气败脱证", "其他"],
                  "中医证候",
                  "v1.diagnosis.tcmSyndromeOther"
                )}
              </div>
            </div>
          </div>
        `
            : ""
        }

        ${
          curIdx === 7
            ? `
          <!-- 8. 纳入标准与排除标准 -->
          ${this.renderEligibilitySubSection(subj)}
        `
            : ""
        }

        ${
          curIdx === 8
            ? `
          <!-- 9. 基线生物样本采集 -->
          <div class="space-y-4">
            <h3 class="font-bold text-slate-800 text-base border-l-4 border-teal-600 pl-3">V1 基线多组学生物样本采集（血浆 / 咽拭子 / 粪便）</h3>
            ${this.renderBiosamplesBlock(subj, "v1")}
          </div>
        `
            : ""
        }
      </div>
    `;
  },

  // 纳入与排除标准子视图（含自动准入逻辑校验）
  renderEligibilitySubSection(subj) {
    const cfg = window.CRF_CONFIG.eligibility;
    const el = subj.v1.eligibility || {};
    const anyIncNo = cfg.inclusion.some(item => el[item.id] === "否");
    const anyExcYes = cfg.exclusion.some(item => el[item.id] === "是");
    const eligible = !anyIncNo && !anyExcYes;

    return `
      <div class="space-y-6">
        <div class="flex items-center justify-between flex-wrap gap-2">
          <h3 class="font-bold text-slate-800 text-base border-l-4 border-sky-600 pl-3">
            纳入标准与排除标准核查
          </h3>
          <span class="px-3 py-1 rounded-full text-xs font-bold ${
            eligible ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
          }">
            ${eligible ? "✓ 逻辑校验通过：符合入组条件" : "✕ 逻辑校验拦截：不符合入组条件！"}
          </span>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full crf-table">
            <thead>
              <tr>
                <th>一、纳入标准（如果以下任何一项回答“否”，则患者不能进入研究）</th>
                <th class="w-40 text-center">判定</th>
              </tr>
            </thead>
            <tbody>
              ${cfg.inclusion
                .map(
                  it => `
                <tr>
                  <td class="font-medium text-slate-800">${it.text}</td>
                  <td class="text-center">${this.renderRadioGroup(`v1.eligibility.${it.id}`, el[it.id] || "是", ["是", "否"], it.id)}</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full crf-table">
            <thead>
              <tr>
                <th>二、排除标准（如果以下任何一项回答“是”，则患者不能进入研究）</th>
                <th class="w-40 text-center">判定</th>
              </tr>
            </thead>
            <tbody>
              ${cfg.exclusion
                .map(
                  it => `
                <tr>
                  <td class="font-medium text-slate-800">${it.text}</td>
                  <td class="text-center">${this.renderRadioGroup(`v1.eligibility.${it.id}`, el[it.id] || "否", ["是", "否"], it.id)}</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
        </div>

        <div class="p-4 rounded-xl border-2 ${
          eligible ? "bg-emerald-50/70 border-emerald-300" : "bg-rose-50 border-rose-300"
        } flex flex-wrap items-center justify-between gap-4">
          <div class="flex items-center gap-4">
            <span class="font-bold text-sm text-slate-900">可否入选：</span>
            ${this.renderRadioGroup("v1.eligibility.enrolled", el.enrolled || (eligible ? "是" : "否"), ["是", "否"], "可否入选")}
          </div>
          <div class="flex items-center gap-3 text-xs">
            <span>分配患者编号：<strong class="font-mono text-sm text-sky-800">${subj.id}</strong></span>
            <span>入组时间：</span>
            <input type="date" value="${el.enrollDate || subj.startDate}"
              onchange="App.setByPath('v1.eligibility.enrollDate', this.value, '入组时间')"
              class="crf-input w-40" />
          </div>
        </div>
      </div>
    `;
  },

  // 辅助渲染第3天、第7天、第30天、第90天访视顶部的节点提醒与完成确认栏
  renderMilestoneBanner(subj, visitId) {
    const ms = this.getSubjectMilestones(subj).find(m => m.visitId === visitId);
    if (!ms) return "";
    const vObj = subj[ms.key] || {};
    return `
      <div class="p-4 rounded-xl border ${
        ms.done
          ? "bg-emerald-50/70 border-emerald-200"
          : ms.status === "overdue"
          ? "bg-rose-50 border-rose-300"
          : ms.status === "today"
          ? "bg-amber-50 border-amber-300"
          : "bg-sky-50/60 border-sky-200"
      } flex flex-wrap items-center justify-between gap-4">
        <div class="space-y-1.5">
          <div class="flex flex-wrap items-center gap-2">
            <span class="px-2.5 py-0.5 rounded-full text-xs border ${ms.badgeCls}">${ms.statusText}</span>
            <h4 class="font-bold text-sm text-slate-900">
              ⏰ ${ms.windowDesc}数据采集节点（计划采集日期：<span class="font-mono text-sky-800">${ms.dueDate}</span>）
            </h4>
            <span class="px-2.5 py-0.5 rounded-md bg-white/90 border border-sky-200 text-xs text-slate-800">
              👤 提醒负责人：<strong class="text-slate-900">${ms.ownerName}</strong> <span class="font-mono text-sky-700">(账号: ${ms.ownerAccount})</span>
            </span>
          </div>
          <p class="text-xs text-slate-600">
            受试者入组日期：<span class="font-mono font-semibold">${ms.enrollDate}</span> · 本节点需完成：${ms.tasks}
          </p>
        </div>

        <div class="flex items-center gap-3 text-xs no-print">
          <div class="flex items-center gap-1.5">
            <span class="text-slate-600 font-medium">实际采集日期：</span>
            <input type="date" value="${vObj.visitDate || ms.dueDate}"
              onchange="App.setByPath('${ms.key}.visitDate', this.value, '${ms.code}实际采集日期')"
              class="crf-input w-36 font-mono" />
          </div>
          <button type="button" onclick="App.setByPath('${ms.key}.completed', ${!ms.done}, '${ms.code}采集完成状态');App.showToast('${!ms.done ? "已标记 " + ms.code + " 节点采集完成！" : "已取消完成标记"}')"
            class="px-3.5 py-2 rounded-lg font-bold transition shadow-xs ${
              ms.done
                ? "bg-white text-emerald-700 border border-emerald-300 hover:bg-emerald-100"
                : "bg-emerald-600 text-white hover:bg-emerald-500"
            }">
            ${ms.done ? "✓ 已完成本节点采集 (点击可撤回)" : "✓ 标记本节点已完成采集"}
          </button>
        </div>
      </div>
    `;
  },

  // ==================== V2-1 住院第3天观察表 ====================
  renderVisitV2_1(subj) {
    return `
      <div class="space-y-6">
        ${this.renderMilestoneBanner(subj, "V2_1")}
        <h3 class="font-bold text-slate-800 text-base border-l-4 border-sky-600 pl-3">1. 基础生命体征监测表 (V2-1 第3天)</h3>
        ${this.renderVitalsTable(subj, "v2_1")}

        <h3 class="font-bold text-slate-800 text-base border-l-4 border-sky-600 pl-3">2. 实验室检查（炎症指标5项 / 出凝血5项 / 器官功能3项）</h3>
        ${this.renderLabTable(subj, "v2_1", ["inflammation", "coagulation", "organ"])}

        <h3 class="font-bold text-slate-800 text-base border-l-4 border-sky-600 pl-3">3. 量表评分（GCS / NIHSS / FOIS / SOFA / EQ-5D-3L）</h3>
        ${this.renderScalesSummaryTable(subj, "v2_1", ["GCS", "NIHSS", "FOIS", "SOFA", "EQ5D"])}
      </div>
    `;
  },

  // ==================== V2-2 住院第7天观察表 ====================
  renderVisitV2_2(subj) {
    return `
      <div class="space-y-6">
        ${this.renderMilestoneBanner(subj, "V2_2")}
        <h3 class="font-bold text-slate-800 text-base border-l-4 border-sky-600 pl-3">1. 基础生命体征监测表 (V2-2 第7天)</h3>
        ${this.renderVitalsTable(subj, "v2_2")}

        <h3 class="font-bold text-slate-800 text-base border-l-4 border-sky-600 pl-3">2. 实验室检查（炎症指标6项含PCT / 出凝血5项 / 器官功能3项）</h3>
        ${this.renderLabTable(subj, "v2_2", ["inflammation", "coagulation", "organ"])}

        <h3 class="font-bold text-slate-800 text-base border-l-4 border-sky-600 pl-3">3. 量表评分（GCS / NIHSS / FOIS / SOFA / EQ-5D-3L）</h3>
        ${this.renderScalesSummaryTable(subj, "v2_2", ["GCS", "NIHSS", "FOIS", "SOFA", "EQ5D"])}

        <h3 class="font-bold text-slate-800 text-base border-l-4 border-teal-600 pl-3">4. 第7天生物样本采集</h3>
        ${this.renderBiosamplesBlock(subj, "v2_2")}
      </div>
    `;
  },

  // ==================== V2-3 出现肺感染指征专表 ====================
  renderVisitV2_3(subj) {
    const v23 = subj.v2_3;
    const hasImgCriteria = (v23.imagingCriteria || []).length > 0;
    const hasClinCriteria = (v23.clinicalCriteria || []).length > 0;
    const autoSapReady = hasImgCriteria && hasClinCriteria;

    return `
      <div class="space-y-6">
        <div class="bg-rose-50 border border-rose-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 class="font-bold text-rose-900 text-base">🫁 肺部感染诊断及相关指标数据采集表</h3>
            <p class="text-xs text-rose-700 mt-0.5">确诊通常需满足：胸部影像学改变（必要条件）+ 临床表现（1-4项中至少满足 1 项）</p>
          </div>
          <div class="px-3 py-1.5 rounded-lg text-xs font-bold ${
            autoSapReady ? "bg-rose-600 text-white" : "bg-white text-slate-600 border border-slate-300"
          }">
            ${autoSapReady ? "⚠️ 已满足影像+临床诊断依据" : "尚未同时满足影像+临床依据"}
          </div>
        </div>

        <h3 class="font-bold text-slate-800 text-base border-l-4 border-rose-600 pl-3">1. 出现肺感染指征时点 - 基础生命体征</h3>
        ${this.renderVitalsTable(subj, "v2_3")}

        <h3 class="font-bold text-slate-800 text-base border-l-4 border-rose-600 pl-3">2. 肺部感染诊断结论与诊断依据核查</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div class="space-y-2">
            <label class="text-xs font-bold text-slate-700 block">胸部影像学改变（必要条件，可多选）：</label>
            ${this.renderCheckboxGroup(
              "v2_3.imagingCriteria",
              v23.imagingCriteria,
              ["新出现的斑片状浸润影", "叶或段实变影", "磨玻璃影", "间质性改变", "伴随征象：胸腔积液", "其他"],
              "SAP影像依据"
            )}
          </div>
          <div class="space-y-2">
            <label class="text-xs font-bold text-slate-700 block">临床表现（至少满足一项，可多选）：</label>
            ${this.renderCheckboxGroup(
              "v2_3.clinicalCriteria",
              v23.clinicalCriteria,
              ["呼吸道症状", "发热", "肺部体征", "外周血常规异常", "其他"],
              "SAP临床表现"
            )}
            <div class="pt-2">
              <span class="text-xs text-slate-500 block mb-1">伴随呼吸道症状（可选）：</span>
              ${this.renderCheckboxGroup("v2_3.sputumSymptoms", v23.sputumSymptoms, ["脓痰", "胸痛", "呼吸困难", "咯血", "其他"], "SAP伴随症状")}
            </div>
          </div>

          <div class="md:col-span-2 pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4">
            <div class="flex items-center gap-3">
              <span class="text-sm font-bold text-slate-900">肺部感染诊断结论：</span>
              ${this.renderRadioGroup("v2_3.sapConclusion", v23.sapConclusion, ["确诊", "排除"], "肺部感染结论")}
            </div>
            <div class="flex flex-wrap items-center gap-2 text-xs">
              <span>确诊日期：</span>
              <input type="text" placeholder="如 05月05日" value="${v23.confirmDate || ""}"
                onchange="App.setByPath('v2_3.confirmDate', this.value, 'SAP确诊日期', true)" class="crf-input w-32" />
              <span>判定者签名：</span>
              <input type="text" value="${v23.judgeSigner || ""}"
                onchange="App.setByPath('v2_3.judgeSigner', this.value, 'SAP判定签名', true)" class="crf-input w-32" />
            </div>
          </div>
        </div>

        <h3 class="font-bold text-slate-800 text-base border-l-4 border-rose-600 pl-3">3. 实验室及病原学检查（当天与 3 日后动态监测）</h3>
        <div class="overflow-x-auto">
          <table class="w-full crf-table">
            <thead>
              <tr>
                <th class="w-44">检测项目</th>
                <th class="w-28">是否检测</th>
                <th class="w-32">当天数值</th>
                <th class="w-32">3日后复查数值</th>
                <th class="w-24">参考单位</th>
                <th class="w-48">临床意义评估*</th>
                <th class="min-w-[180px]">备注 / 说明</th>
              </tr>
            </thead>
            <tbody>
              ${[
                { id: "wbc", name: "白细胞数 (WBC)", unit: "×10⁹/L" },
                { id: "neut", name: "中性粒细胞绝对值", unit: "×10⁹/L" },
                { id: "lymph", name: "淋巴细胞绝对值", unit: "×10⁹/L" },
                { id: "nlr", name: "中性粒/淋巴细胞比值 (NLR)", unit: "自动计算" },
                { id: "crp", name: "C-反应蛋白 (CRP)", unit: "mg/L" },
                { id: "pct", name: "降钙素原-PCT定量", unit: "ng/mL" }
              ]
                .map(it => {
                  const row = v23.infLabs?.[it.id] || { done: "是", day0: "", day3: "", eval: "0", note: "" };
                  const evalVal = row.eval ?? "0";
                  return `
                    <tr>
                      <td class="font-medium text-slate-800">${it.name}</td>
                      <td>${this.renderRadioGroup(`v2_3.infLabs.${it.id}.done`, row.done, ["是", "否"], `V2_3-${it.name}`)}</td>
                      <td><input type="text" value="${row.day0 || ""}" onchange="App.setByPath('v2_3.infLabs.${it.id}.day0', this.value, '${it.name}当天', true)" class="crf-input font-mono" /></td>
                      <td><input type="text" value="${row.day3 || ""}" onchange="App.setByPath('v2_3.infLabs.${it.id}.day3', this.value, '${it.name}3日后', true)" class="crf-input font-mono" /></td>
                      <td class="text-xs text-slate-500">${it.unit}</td>
                      <td>
                        <div class="flex flex-wrap gap-1">
                          ${["0", "1", "2", "9"]
                            .map(
                              code => `
                            <button type="button" onclick="App.setByPath('v2_3.infLabs.${it.id}.eval', '${code}', 'V2_3-${it.name}临床意义')"
                              class="px-2 py-1 rounded text-xs border transition ${
                                String(evalVal) === code
                                  ? code === "2"
                                    ? "bg-rose-600 text-white border-rose-600 font-semibold"
                                    : "bg-sky-600 text-white border-sky-600 font-semibold"
                                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                              }">
                              □${code}
                            </button>
                          `
                            )
                            .join("")}
                        </div>
                      </td>
                      <td class="min-w-[180px]">
                        <input type="text" value="${String(row.note ?? "").replace(/"/g, "&quot;")}" placeholder="填写备注/说明..."
                          onchange="App.setByPath('v2_3.infLabs.${it.id}.note', this.value, 'V2_3-${it.name}备注', true)"
                          class="crf-input text-xs w-full" />
                      </td>
                    </tr>
                  `;
                })
                .join("")}
            </tbody>
          </table>
        </div>

        <!-- 病原学四项 -->
        <div class="overflow-x-auto">
          <table class="w-full crf-table">
            <thead>
              <tr>
                <th class="w-60">病原学与耐药基因检测项目</th>
                <th class="w-32">是否检测</th>
                <th class="min-w-[200px]">培养 / 药敏 / 基因检测具体结果（未检测填 ND）</th>
                <th class="min-w-[180px]">备注 / 说明</th>
              </tr>
            </thead>
            <tbody>
              ${[
                { id: "sputumCulture", name: "痰培养 + 药敏" },
                { id: "swabCulture", name: "咽拭子培养 + 药敏" },
                { id: "resp11", name: "呼吸道11项 + 肺炎支原体耐药基因检测" },
                { id: "fungiEndotoxin", name: "真菌七项 + 内毒素快速检测" }
              ]
                .map(p => {
                  const row = v23.pathogens?.[p.id] || { done: "否", result: "", note: "" };
                  return `
                    <tr>
                      <td class="font-bold text-slate-800">${p.name}</td>
                      <td>${this.renderRadioGroup(`v2_3.pathogens.${p.id}.done`, row.done, ["是", "否"], p.name)}</td>
                      <td><input type="text" value="${row.result || ""}" onchange="App.setByPath('v2_3.pathogens.${p.id}.result', this.value, '${p.name}结果', true)" class="crf-input" /></td>
                      <td><input type="text" value="${row.note || ""}" placeholder="填写备注/说明..." onchange="App.setByPath('v2_3.pathogens.${p.id}.note', this.value, '${p.name}备注', true)" class="crf-input text-xs" /></td>
                    </tr>
                  `;
                })
                .join("")}
            </tbody>
          </table>
        </div>

        <!-- 肺炎 PSI 评分自动计算表 -->
        <h3 class="font-bold text-slate-800 text-base border-l-4 border-rose-600 pl-3">4. 肺炎 PSI 评分表（自动汇总与风险分级）</h3>
        <div class="overflow-x-auto">
          <table class="w-full crf-table">
            <thead>
              <tr>
                <th class="w-36">评估维度</th>
                <th>PSI 评估指标</th>
                <th class="w-40">评分规则与勾选</th>
                <th class="min-w-[240px]">实测值 / 备注说明</th>
              </tr>
            </thead>
            <tbody>
              <tr class="bg-slate-50">
                <td class="font-bold">基础年龄分</td>
                <td>男性=年龄(岁)；女性=年龄(岁)-10</td>
                <td class="font-bold text-sky-700">
                  当前：${subj.v1.demographics.gender}，${subj.v1.demographics.age}岁 → +${
                    subj.v1.demographics.gender === "女" ? Math.max(0, subj.v1.demographics.age - 10) : subj.v1.demographics.age
                  } 分
                </td>
                <td class="text-xs text-slate-400">系统根据人口学自动计算</td>
              </tr>
              ${window.CRF_CONFIG.psiItems
                .map(item => {
                  const checked = !!v23.psi?.checks?.[item.id];
                  const val = v23.psi?.values?.[item.id] || "";
                  const note = v23.psi?.notes?.[item.id] || "";
                  return `
                    <tr>
                      <td class="text-xs font-semibold text-slate-500">${item.category}</td>
                      <td class="font-medium text-slate-800">${item.label}</td>
                      <td>
                        <label onclick="App.setByPath('v2_3.psi.checks.${item.id}', ${!checked}, 'PSI-${item.label}')"
                          class="crf-option-pill ${checked ? "active" : ""}">
                          <span>${checked ? "☑" : "□"}</span>
                          <span>是 (+${item.points}分)</span>
                        </label>
                      </td>
                      <td>
                        ${
                          item.type === "check_val"
                            ? `<div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                <input type="text" placeholder="实测值 (${item.unit})" value="${val}" onchange="App.setByPath('v2_3.psi.values.${item.id}', this.value, 'PSI-${item.label}实测值', true)" class="crf-input text-xs font-mono" />
                                <input type="text" placeholder="选填备注说明..." value="${note}" onchange="App.setByPath('v2_3.psi.notes.${item.id}', this.value, 'PSI-${item.label}备注', true)" class="crf-input text-xs" />
                              </div>`
                            : `<input type="text" placeholder="填写备注说明/疾病详情..." value="${note}" onchange="App.setByPath('v2_3.psi.notes.${item.id}', this.value, 'PSI-${item.label}备注', true)" class="crf-input text-xs w-full" />`
                        }
                      </td>
                    </tr>
                  `;
                })
                .join("")}
              <tr class="bg-rose-50 font-bold">
                <td colspan="2" class="text-rose-950 text-base">PSI 肺炎严重度合计总分</td>
                <td class="text-rose-700 text-lg font-mono">${v23.psi?.totalScore || 0} 分</td>
                <td class="text-rose-800">${v23.psi?.riskClass || ""}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 class="font-bold text-slate-800 text-base border-l-4 border-teal-600 pl-3">5. 出现肺感染指征时 - 生物样本采集</h3>
        ${this.renderBiosamplesBlock(subj, "v2_3")}
      </div>
    `;
  },

  // ==================== V3 出院时观察表 ====================
  renderVisitV3(subj) {
    const out = subj.v3.outcome || {};
    return `
      <div class="space-y-6">
        <h3 class="font-bold text-slate-800 text-base border-l-4 border-sky-600 pl-3">1. 出院时量表评分 (GCS / NIHSS / FOIS / EQ-5D-3L / mRS)</h3>
        ${this.renderScalesSummaryTable(subj, "v3", ["GCS", "NIHSS", "FOIS", "EQ5D", "MRS"])}

        <h3 class="font-bold text-slate-800 text-base border-l-4 border-sky-600 pl-3">2. 出院时结局</h3>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div>
            <label class="text-xs font-semibold text-slate-600 block mb-1">出院状态</label>
            ${this.renderRadioGroup("v3.outcome.status", out.status, ["存活出院", "住院死亡"], "出院状态")}
          </div>
          <div>
            <label class="text-xs font-semibold text-slate-600 block mb-1">出院 / 死亡日期</label>
            <input type="date" value="${out.date || ""}" onchange="App.setByPath('v3.outcome.date', this.value, '出院日期', true)" class="crf-input" />
          </div>
          <div>
            <label class="text-xs font-semibold text-slate-600 block mb-1">出院去向</label>
            ${this.renderRadioGroup("v3.outcome.destination", out.destination, ["回家", "转院", "康复机构", "其他"], "出院去向", "v3.outcome.destinationOther")}
          </div>
          <div class="sm:col-span-3">
            <label class="text-xs font-semibold text-slate-600 block mb-1">死亡原因 / 出院备注</label>
            <input type="text" value="${out.deathReason || ""}" onchange="App.setByPath('v3.outcome.deathReason', this.value, '出院备注', true)" class="crf-input" />
          </div>
        </div>
      </div>
    `;
  },

  // ==================== V4 (第30天) & V5 (第90天) 随访表 ====================
  renderVisitFollowup(subj, visitKey, dayLabel, readmTitle) {
    const vData = subj[visitKey] || {};
    const surv = vData.survival || { alive: "是", deathDate: "", deathReason: "" };
    const readms = vData.readmissions || [];
    const visitId = visitKey === "v4" ? "V4" : "V5";

    return `
      <div class="space-y-6">
        ${this.renderMilestoneBanner(subj, visitId)}
        <h3 class="font-bold text-slate-800 text-base border-l-4 border-sky-600 pl-3">1. ${dayLabel}随访量表评分 (FOIS / EQ-5D-3L / mRS)</h3>
        ${this.renderScalesSummaryTable(subj, visitKey, ["FOIS", "EQ5D", "MRS"])}

        <h3 class="font-bold text-slate-800 text-base border-l-4 border-sky-600 pl-3">2. 发病${dayLabel}生存状态</h3>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div>
            <label class="text-xs font-semibold text-slate-600 block mb-1">发病${dayLabel}是否生存</label>
            ${this.renderRadioGroup(`${visitKey}.survival.alive`, surv.alive, ["是", "否"], `${dayLabel}生存状态`)}
          </div>
          <div>
            <label class="text-xs font-semibold text-slate-600 block mb-1">死亡时间（若否）</label>
            <input type="date" value="${surv.deathDate || ""}" onchange="App.setByPath('${visitKey}.survival.deathDate', this.value, '${dayLabel}死亡时间', true)" class="crf-input" />
          </div>
          <div>
            <label class="text-xs font-semibold text-slate-600 block mb-1">死亡原因（若否）</label>
            <input type="text" value="${surv.deathReason || ""}" onchange="App.setByPath('${visitKey}.survival.deathReason', this.value, '${dayLabel}死亡原因', true)" class="crf-input" />
          </div>
        </div>

        <div class="flex items-center justify-between">
          <h3 class="font-bold text-slate-800 text-base border-l-4 border-sky-600 pl-3">3. ${readmTitle}</h3>
          <div class="flex items-center gap-3">
            ${this.renderRadioGroup(`${visitKey}.hasReadmission`, vData.hasReadmission || "无", ["无", "有"], `${dayLabel}有无再入院`)}
            <button type="button" onclick="App.addReadmissionRow('${visitKey}')"
              class="px-3 py-1 rounded-lg bg-sky-600 text-white text-xs font-semibold hover:bg-sky-500">
              + 添加再入院记录
            </button>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full crf-table">
            <thead>
              <tr>
                <th class="w-40">再入院时间</th>
                <th>入住医院</th>
                <th>入院原因</th>
                <th class="w-36">住院时长 (天)</th>
                <th class="min-w-[150px]">备注 / 说明</th>
                <th class="w-20 text-center">操作</th>
              </tr>
            </thead>
            <tbody>
              ${
                readms.length === 0
                  ? `<tr><td colspan="6" class="text-center text-slate-400 py-4">暂无再入院事件记录</td></tr>`
                  : readms
                      .map(
                        (r, idx) => `
                    <tr>
                      <td><input type="date" value="${r.date || ""}" onchange="App.setByPath('${visitKey}.readmissions.${idx}.date', this.value, '再入院时间', true)" class="crf-input" /></td>
                      <td><input type="text" value="${r.hospital || ""}" onchange="App.setByPath('${visitKey}.readmissions.${idx}.hospital', this.value, '再入院医院', true)" class="crf-input" /></td>
                      <td><input type="text" value="${r.reason || ""}" onchange="App.setByPath('${visitKey}.readmissions.${idx}.reason', this.value, '再入院原因', true)" class="crf-input" /></td>
                      <td><input type="text" value="${r.duration || ""}" onchange="App.setByPath('${visitKey}.readmissions.${idx}.duration', this.value, '住院时长', true)" class="crf-input" /></td>
                      <td><input type="text" value="${r.note || ""}" placeholder="选填备注..." onchange="App.setByPath('${visitKey}.readmissions.${idx}.note', this.value, '再入院备注', true)" class="crf-input text-xs" /></td>
                      <td class="text-center">
                        <button type="button" onclick="App.removeArrayIdx('${visitKey}.readmissions', ${idx})" class="text-rose-600 text-xs hover:underline">删除</button>
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
    `;
  },

  addReadmissionRow(visitKey) {
    const subj = this.getCurrentSubject();
    if (subj?.locked) {
      this.showToast("当前病例已锁定，无法修改！");
      return;
    }
    subj[visitKey].hasReadmission = "有";
    subj[visitKey].readmissions = subj[visitKey].readmissions || [];
    subj[visitKey].readmissions.push({ date: "", hospital: "", reason: "", duration: "", note: "" });
    this.persist("新增再入院事件行", visitKey);
    this.render();
  },

  removeArrayIdx(path, idx) {
    const subj = this.getCurrentSubject();
    if (subj?.locked) {
      this.showToast("当前病例已锁定，无法删除！");
      return;
    }
    const parts = path.split(".");
    let cur = subj;
    for (let i = 0; i < parts.length - 1; i++) cur = cur[parts[i]];
    cur[parts[parts.length - 1]].splice(idx, 1);
    this.persist("删除列表行", `${path}[${idx}]`);
    this.render();
  }
});
