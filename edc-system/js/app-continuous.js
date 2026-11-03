// 重症卒中临床科研电子数据采集系统 (eCRF / EDC) - 全程记录模块与弹窗渲染

Object.assign(window.App, {
  // ==================== 全程：并发症记录表 ====================
  renderComplicationsSection(subj) {
    const comp = subj.complications || { hasComplication: "无", items: [] };
    return `
      <div class="space-y-5">
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 class="font-bold text-slate-800 text-base border-l-4 border-amber-500 pl-3">重症脑卒中相关并发症记录表</h3>
            <p class="text-xs text-slate-500 mt-0.5">住院后新发肺部感染、消化道出血、肺水肿、深静脉血栓、脑心综合征等统一在此表记录发生与转归时间</p>
          </div>
          <div class="flex items-center gap-3">
            ${this.renderRadioGroup("complications.hasComplication", comp.hasComplication, ["无", "有"], "有无并发症")}
            <button type="button" onclick="App.addComplicationRow()"
              class="px-3 py-1.5 rounded-lg bg-sky-600 text-white text-xs font-semibold hover:bg-sky-500">
              + 新增并发症记录
            </button>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full crf-table">
            <thead>
              <tr>
                <th class="min-w-[180px]">并发症疾病名称</th>
                <th class="w-40">疾病开始时间</th>
                <th class="w-52">观察结束时是否持续？</th>
                <th class="w-40">否 → 结束时间</th>
                <th class="min-w-[160px]">备注 / 说明</th>
                <th class="w-20 text-center">操作</th>
              </tr>
            </thead>
            <tbody>
              ${
                (comp.items || []).length === 0
                  ? `<tr><td colspan="6" class="text-center text-slate-400 py-5">暂无并发症记录，点击右上角“+ 新增并发症记录”添加</td></tr>`
                  : comp.items
                      .map(
                        (it, idx) => `
                    <tr>
                      <td>
                        <input type="text" placeholder="如：卒中相关性肺炎 / 应激性消化道出血 / 下肢深静脉血栓" value="${it.disease || ""}"
                          onchange="App.setByPath('complications.items.${idx}.disease', this.value, '并发症名称', true)" class="crf-input font-semibold" />
                      </td>
                      <td>
                        <input type="date" value="${it.startDate || ""}"
                          onchange="App.setByPath('complications.items.${idx}.startDate', this.value, '并发症开始时间', true)" class="crf-input" />
                      </td>
                      <td>
                        <label onclick="App.setByPath('complications.items.${idx}.ongoing', ${!it.ongoing})"
                          class="crf-option-pill ${it.ongoing ? "active" : ""}">
                          <span>${it.ongoing ? "☑" : "□"}</span>
                          <span>是（持续中，请同步填治疗表）</span>
                        </label>
                      </td>
                      <td>
                        <input type="date" value="${it.endDate || ""}" ${it.ongoing ? "disabled" : ""}
                          onchange="App.setByPath('complications.items.${idx}.endDate', this.value, '并发症结束时间', true)" class="crf-input" />
                      </td>
                      <td>
                        <input type="text" placeholder="选填备注/处理说明..." value="${it.note || ""}"
                          onchange="App.setByPath('complications.items.${idx}.note', this.value, '并发症备注', true)" class="crf-input text-xs" />
                      </td>
                      <td class="text-center">
                        <button type="button" onclick="App.removeArrayIdx('complications.items', ${idx})" class="text-rose-600 text-xs hover:underline">删除</button>
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

  addComplicationRow() {
    const subj = this.getCurrentSubject();
    if (subj?.locked) {
      this.showToast("当前病例已锁定，无法修改！");
      return;
    }
    subj.complications.hasComplication = "有";
    subj.complications.items = subj.complications.items || [];
    subj.complications.items.push({ disease: "", startDate: new Date().toISOString().slice(0, 10), ongoing: true, endDate: "", note: "" });
    this.persist("新增并发症记录", "");
    this.render();
  },

  // ==================== 全程：治疗与用药记录表 ====================
  renderTreatmentSection(subj) {
    const tx = subj.treatment;
    return `
      <div class="space-y-8">
        <!-- 1. 急性期再灌注治疗 -->
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="font-bold text-slate-800 text-base border-l-4 border-sky-600 pl-3">1. 急性期再灌注治疗（静脉溶栓）</h3>
            ${this.renderRadioGroup("treatment.reperfusion.ivUsed", tx.reperfusion?.ivUsed || "否", ["是", "否"], "再灌注静脉溶栓")}
          </div>
          <div class="overflow-x-auto">
            <table class="w-full crf-table">
              <thead>
                <tr>
                  <th class="w-48">溶栓药物名称</th>
                  <th class="w-36">单次剂量</th>
                  <th class="w-28">剂量单位</th>
                  <th class="w-40">给药方式</th>
                  <th>开始时间 (精确到分)</th>
                  <th>结束时间</th>
                </tr>
              </thead>
              <tbody>
                ${(tx.reperfusion?.drugs || [])
                  .map(
                    (d, idx) => `
                  <tr>
                    <td class="font-bold text-slate-800">${d.name}</td>
                    <td><input type="text" value="${d.dose || ""}" onchange="App.setByPath('treatment.reperfusion.drugs.${idx}.dose', this.value, '溶栓剂量', true)" class="crf-input font-mono" /></td>
                    <td class="text-xs text-slate-500">${d.unit}</td>
                    <td class="text-xs text-slate-600">${d.route}</td>
                    <td><input type="datetime-local" value="${d.startTime || ""}" onchange="App.setByPath('treatment.reperfusion.drugs.${idx}.startTime', this.value, '溶栓开始时间', true)" class="crf-input" /></td>
                    <td><input type="time" value="${d.endTime || ""}" onchange="App.setByPath('treatment.reperfusion.drugs.${idx}.endTime', this.value, '溶栓结束时间', true)" class="crf-input" /></td>
                  </tr>
                `
                  )
                  .join("")}
              </tbody>
            </table>
          </div>
        </div>

        <!-- 2. 管道管理与呼吸支持 -->
        <div class="space-y-3">
          <h3 class="font-bold text-slate-800 text-base border-l-4 border-sky-600 pl-3">2. 管道管理与呼吸/气道支持</h3>
          <div class="overflow-x-auto">
            <table class="w-full crf-table">
              <thead>
                <tr>
                  <th class="w-36">干预措施</th>
                  <th class="w-60">实施情况 / 模式</th>
                  <th class="w-40">置管 / 开始日期</th>
                  <th class="w-40">拔管 / 结束日期</th>
                  <th>原因 / 指征 (可多选)</th>
                </tr>
              </thead>
              <tbody>
                ${[
                  {
                    key: "ngTube",
                    name: "留置胃管",
                    opts: ["无", "有"],
                    reasons: ["吞咽困难", "意识障碍", "营养支持", "其他"]
                  },
                  {
                    key: "foley",
                    name: "留置尿管",
                    opts: ["无", "有"],
                    reasons: ["排尿困难", "危重监测尿量", "其他"]
                  },
                  {
                    key: "cvc",
                    name: "深静脉置管",
                    opts: ["无", "有"],
                    reasons: ["长期或静脉高营养支持", "需要快速补液或输血", "其他"]
                  },
                  {
                    key: "respSupport",
                    name: "呼吸支持",
                    opts: ["无", "普通氧疗(鼻导管/面罩)", "高流量鼻导管", "无创机械通气", "有创机械通气", "其他"],
                    reasons: ["氧合指数下降", "意识障碍/气道保护差", "误吸风险/肺部感染相关", "其他"]
                  },
                  {
                    key: "airway",
                    name: "人工气道",
                    opts: ["无", "气管插管", "气管切开", "其他"],
                    reasons: ["意识障碍/气道保护差", "误吸风险", "排痰困难/痰液引流", "呼吸衰竭需有创机械通气", "其他"]
                  }
                ]
                  .map(row => {
                    const t = tx.tubes?.[row.key] || { used: "无", startDate: "", endDate: "", reasons: [] };
                    return `
                      <tr>
                        <td class="font-bold text-slate-800">${row.name}</td>
                        <td>${this.renderRadioGroup(`treatment.tubes.${row.key}.used`, t.used, row.opts, row.name)}</td>
                        <td><input type="date" value="${t.startDate || ""}" onchange="App.setByPath('treatment.tubes.${row.key}.startDate', this.value, '${row.name}开始日期', true)" class="crf-input" /></td>
                        <td><input type="date" value="${t.endDate || ""}" onchange="App.setByPath('treatment.tubes.${row.key}.endDate', this.value, '${row.name}结束日期', true)" class="crf-input" /></td>
                        <td>${this.renderCheckboxGroup(`treatment.tubes.${row.key}.reasons`, t.reasons, row.reasons, `${row.name}指征`)}</td>
                      </tr>
                    `;
                  })
                  .join("")}
              </tbody>
            </table>
          </div>
        </div>

        <!-- 3. 用药记录（西药 + 中成药） -->
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="font-bold text-slate-800 text-base border-l-4 border-sky-600 pl-3">3. 用药记录（西药 + 中成药）</h3>
            <button type="button" onclick="App.addCustomMedRow()"
              class="px-3 py-1 rounded-lg bg-slate-800 text-white text-xs font-semibold hover:bg-slate-700">
              + 新增其他药物行
            </button>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full crf-table">
              <thead>
                <tr>
                  <th class="w-28">药物种类</th>
                  <th class="min-w-[150px]">药物名称</th>
                  <th class="w-32">是否应用</th>
                  <th class="min-w-[160px]">用药原因 / 备注</th>
                  <th class="w-24">每次剂量</th>
                  <th class="w-20">单位</th>
                  <th class="w-24">频次</th>
                  <th class="w-24">途径</th>
                  <th class="w-36">开始日期</th>
                  <th class="w-36">结束日期</th>
                </tr>
              </thead>
              <tbody>
                ${(tx.medications || [])
                  .map(
                    (m, idx) => `
                  <tr class="${m.used === "是" ? "bg-sky-50/40" : ""}">
                    <td class="text-xs font-bold text-slate-600">${m.category}</td>
                    <td>
                      <input type="text" value="${m.name}" onchange="App.setByPath('treatment.medications.${idx}.name', this.value, '药物名称', true)" class="crf-input font-semibold" />
                    </td>
                    <td>${this.renderRadioGroup(`treatment.medications.${idx}.used`, m.used, ["是", "否"], m.name)}</td>
                    <td class="min-w-[160px]"><input type="text" value="${m.reason || ""}" placeholder="填写用药指征/备注..." onchange="App.setByPath('treatment.medications.${idx}.reason', this.value, '${m.name}原因', true)" class="crf-input text-xs w-full" /></td>
                    <td><input type="text" value="${m.dose || ""}" onchange="App.setByPath('treatment.medications.${idx}.dose', this.value, '${m.name}剂量', true)" class="crf-input font-mono text-xs" /></td>
                    <td><input type="text" value="${m.unit || ""}" onchange="App.setByPath('treatment.medications.${idx}.unit', this.value, '${m.name}单位', true)" class="crf-input text-xs" /></td>
                    <td><input type="text" placeholder="qd/bid" value="${m.freq || ""}" onchange="App.setByPath('treatment.medications.${idx}.freq', this.value, '${m.name}频次', true)" class="crf-input text-xs" /></td>
                    <td><input type="text" value="${m.route || ""}" onchange="App.setByPath('treatment.medications.${idx}.route', this.value, '${m.name}途径', true)" class="crf-input text-xs" /></td>
                    <td><input type="date" value="${m.startDate || ""}" onchange="App.setByPath('treatment.medications.${idx}.startDate', this.value, '${m.name}开始日期', true)" class="crf-input text-xs" /></td>
                    <td><input type="date" value="${m.endDate || ""}" onchange="App.setByPath('treatment.medications.${idx}.endDate', this.value, '${m.name}结束日期', true)" class="crf-input text-xs" /></td>
                  </tr>
                `
                  )
                  .join("")}
              </tbody>
            </table>
          </div>
        </div>

        <!-- 4. 用药记录（中草药汤剂/颗粒） -->
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="font-bold text-slate-800 text-base border-l-4 border-teal-600 pl-3">4. 用药记录（中草药辨证方药）</h3>
            <button type="button" onclick="App.addHerbalRow()"
              class="px-3 py-1 rounded-lg bg-teal-600 text-white text-xs font-semibold hover:bg-teal-500">
              + 新增中草药处方
            </button>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full crf-table">
              <thead>
                <tr>
                  <th class="min-w-[220px]">药物组成及具体剂量</th>
                  <th class="w-40">治法</th>
                  <th class="w-28">剂型</th>
                  <th class="w-28">每日剂数</th>
                  <th class="w-24">总剂数</th>
                  <th class="w-28">给药途径</th>
                  <th class="w-36">开药日期</th>
                  <th class="w-16">操作</th>
                </tr>
              </thead>
              <tbody>
                ${
                  (tx.herbalList || []).length === 0
                    ? `<tr><td colspan="8" class="text-center text-slate-400 py-4">暂无中草药处方记录</td></tr>`
                    : tx.herbalList
                        .map(
                          (h, idx) => `
                      <tr>
                        <td><textarea rows="2" onchange="App.setByPath('treatment.herbalList.${idx}.formula', this.value, '中药组成', true)" class="crf-input text-xs">${h.formula || ""}</textarea></td>
                        <td><input type="text" value="${h.method || ""}" onchange="App.setByPath('treatment.herbalList.${idx}.method', this.value, '中药治法', true)" class="crf-input text-xs" /></td>
                        <td><input type="text" value="${h.form || ""}" onchange="App.setByPath('treatment.herbalList.${idx}.form', this.value, '中药剂型', true)" class="crf-input text-xs" /></td>
                        <td><input type="text" value="${h.dailyDoses || ""}" onchange="App.setByPath('treatment.herbalList.${idx}.dailyDoses', this.value, '每日剂数', true)" class="crf-input text-xs" /></td>
                        <td><input type="text" value="${h.totalDoses || ""}" onchange="App.setByPath('treatment.herbalList.${idx}.totalDoses', this.value, '总剂数', true)" class="crf-input text-xs" /></td>
                        <td><input type="text" value="${h.route || ""}" onchange="App.setByPath('treatment.herbalList.${idx}.route', this.value, '中药途径', true)" class="crf-input text-xs" /></td>
                        <td><input type="date" value="${h.date || ""}" onchange="App.setByPath('treatment.herbalList.${idx}.date', this.value, '中药日期', true)" class="crf-input text-xs" /></td>
                        <td class="text-center"><button type="button" onclick="App.removeArrayIdx('treatment.herbalList', ${idx})" class="text-rose-600 text-xs">删除</button></td>
                      </tr>
                    `
                        )
                        .join("")
                }
              </tbody>
            </table>
          </div>
        </div>

        <!-- 5. 非药物疗法（醒脑开窍针刺、贴敷、耳穴、脑反射、激光） -->
        <div class="space-y-3">
          <h3 class="font-bold text-slate-800 text-base border-l-4 border-teal-600 pl-3">5. 非药物疗法（针刺干预及中医特色理疗）</h3>
          <div class="overflow-x-auto">
            <table class="w-full crf-table">
              <thead>
                <tr>
                  <th class="w-44">非药物疗法名称</th>
                  <th class="w-32">是否治疗</th>
                  <th class="min-w-[240px]">针法选择 / 穴位部位与药物具体描述</th>
                  <th class="w-44">治疗原因</th>
                  <th class="w-28">频次</th>
                  <th class="w-36">开始日期</th>
                  <th class="w-36">结束日期</th>
                </tr>
              </thead>
              <tbody>
                ${(tx.nonDrug || [])
                  .map(
                    (nd, idx) => `
                  <tr class="${nd.used === "有" ? "bg-teal-50/40" : ""}">
                    <td class="font-bold text-slate-800">${nd.name}</td>
                    <td>${this.renderRadioGroup(`treatment.nonDrug.${idx}.used`, nd.used, ["无", "有"], nd.name)}</td>
                    <td class="space-y-1.5 min-w-[240px]">
                      ${
                        nd.id === "acupuncture"
                          ? this.renderRadioGroup(`treatment.nonDrug.${idx}.subtype`, nd.subtype || "醒脑开窍针法", ["醒脑开窍针法", "其他针法"], "针法类型")
                          : ""
                      }
                      <input type="text" placeholder="描述具体穴位、部位或贴敷药物..." value="${nd.detail || ""}"
                        onchange="App.setByPath('treatment.nonDrug.${idx}.detail', this.value, '${nd.name}详情', true)" class="crf-input text-xs w-full" />
                    </td>
                    <td>${this.renderRadioGroup(`treatment.nonDrug.${idx}.reason`, nd.reason || "重症卒中", ["重症卒中", "合并症", "并发症", "其他"], `${nd.name}原因`)}</td>
                    <td><input type="text" placeholder="如 每日2次" value="${nd.freq || ""}" onchange="App.setByPath('treatment.nonDrug.${idx}.freq', this.value, '${nd.name}频次', true)" class="crf-input text-xs" /></td>
                    <td><input type="date" value="${nd.startDate || ""}" onchange="App.setByPath('treatment.nonDrug.${idx}.startDate', this.value, '${nd.name}开始日期', true)" class="crf-input text-xs" /></td>
                    <td><input type="date" value="${nd.endDate || ""}" onchange="App.setByPath('treatment.nonDrug.${idx}.endDate', this.value, '${nd.name}结束日期', true)" class="crf-input text-xs" /></td>
                  </tr>
                `
                  )
                  .join("")}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  },

  addCustomMedRow() {
    const subj = this.getCurrentSubject();
    if (subj?.locked) {
      this.showToast("当前病例已锁定，无法修改！");
      return;
    }
    subj.treatment.medications.push({
      id: "med_custom_" + Date.now(),
      category: "其他药物",
      name: "",
      used: "是",
      reason: "",
      dose: "",
      unit: "mg",
      freq: "qd",
      route: "PO/IV",
      startDate: new Date().toISOString().slice(0, 10),
      endDate: ""
    });
    this.persist("新增自定义药物记录", "");
    this.render();
  },

  addHerbalRow() {
    const subj = this.getCurrentSubject();
    if (subj?.locked) {
      this.showToast("当前病例已锁定，无法修改！");
      return;
    }
    subj.treatment.herbalList = subj.treatment.herbalList || [];
    subj.treatment.herbalList.push({
      id: "h_" + Date.now(),
      formula: "",
      method: "",
      form: "水煎剂",
      dailyDoses: "1剂",
      totalDoses: "7剂",
      route: "PO/NG",
      date: new Date().toISOString().slice(0, 10)
    });
    this.persist("新增中草药记录", "");
    this.render();
  },

  // ==================== 全程：不良事件 (AE / SAE) 记录表 ====================
  renderAESection(subj) {
    const ae = subj.adverseEvents || { hasAE: "无", events: [] };
    return `
      <div class="space-y-5">
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 class="font-bold text-slate-800 text-base border-l-4 border-rose-600 pl-3">不良事件 (AE) 与严重不良事件 (SAE) 记录表</h3>
            <p class="text-xs text-slate-500 mt-0.5">如有严重不良事件 (SAE) 发生，无论是否与研究相关干预（如针刺）有关，请研究者立即向申办者报告</p>
          </div>
          <div class="flex items-center gap-3">
            ${this.renderRadioGroup("adverseEvents.hasAE", ae.hasAE, ["无", "有"], "有无不良事件")}
            <button type="button" onclick="App.addAERow()"
              class="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-500">
              + 新增不良事件 (AE)
            </button>
          </div>
        </div>

        ${
          (ae.events || []).length === 0
            ? `<div class="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center text-slate-400 text-sm">
                当前受试者无不良事件发生记录。如发生晕针、滞针、皮下血肿或其他医疗不良事件，请点击右上角按钮添加。
              </div>`
            : (ae.events || [])
                .map(
                  (ev, idx) => `
              <div class="bg-slate-50 rounded-xl border border-slate-300 p-4 space-y-4">
                <div class="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span class="font-bold text-sm text-rose-800">不良事件 #${idx + 1}</span>
                  <button type="button" onclick="App.removeArrayIdx('adverseEvents.events', ${idx})" class="text-xs text-rose-600 hover:underline">删除此事件</button>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label class="text-xs font-semibold text-slate-600 block mb-1">不良事件名称</label>
                    <input type="text" placeholder="如：针刺部位皮下瘀斑 / 晕针" value="${ev.name || ""}"
                      onchange="App.setByPath('adverseEvents.events.${idx}.name', this.value, 'AE名称', true)" class="crf-input font-bold" />
                  </div>
                  <div>
                    <label class="text-xs font-semibold text-slate-600 block mb-1">发生时间</label>
                    <input type="datetime-local" value="${ev.startTime || ""}"
                      onchange="App.setByPath('adverseEvents.events.${idx}.startTime', this.value, 'AE发生时间', true)" class="crf-input" />
                  </div>
                  <div>
                    <label class="text-xs font-semibold text-slate-600 block mb-1">结束时间</label>
                    <input type="datetime-local" value="${ev.endTime || ""}"
                      onchange="App.setByPath('adverseEvents.events.${idx}.endTime', this.value, 'AE结束时间', true)" class="crf-input" />
                  </div>
                  <div class="sm:col-span-3">
                    <label class="text-xs font-semibold text-slate-600 block mb-1">不良事件详细临床描述</label>
                    <input type="text" value="${ev.desc || ""}"
                      onchange="App.setByPath('adverseEvents.events.${idx}.desc', this.value, 'AE描述', true)" class="crf-input" />
                  </div>
                  <div>
                    <label class="text-xs font-semibold text-slate-600 block mb-1">严重程度分级 (1-5级)*</label>
                    ${this.renderRadioGroup(`adverseEvents.events.${idx}.severity`, ev.severity || "1级", ["1级", "2级", "3级", "4级", "5级"], "AE严重程度")}
                  </div>
                  <div>
                    <label class="text-xs font-semibold text-slate-600 block mb-1">是否严重不良事件 (SAE)</label>
                    ${this.renderRadioGroup(`adverseEvents.events.${idx}.isSAE`, ev.isSAE || "否", ["否", "是"], "是否SAE")}
                  </div>
                  <div>
                    <label class="text-xs font-semibold text-slate-600 block mb-1">转归</label>
                    ${this.renderRadioGroup(`adverseEvents.events.${idx}.outcome`, ev.outcome || "消失", ["消失", "缓解", "持续", "后遗症", "加重", "死亡", "其他"], "AE转归")}
                  </div>
                  <div class="sm:col-span-2">
                    <label class="text-xs font-semibold text-slate-600 block mb-1">对研究干预/研究相关操作采取的措施</label>
                    ${this.renderRadioGroup(
                      `adverseEvents.events.${idx}.actionTaken`,
                      ev.actionTaken || "继续研究相关干预",
                      ["继续研究相关干预", "调整/缩短", "暂停", "永久停止", "干预已结束", "不适用", "其他"],
                      "AE措施"
                    )}
                  </div>
                  <div>
                    <label class="text-xs font-semibold text-slate-600 block mb-1">是否因此退出试验</label>
                    ${this.renderRadioGroup(`adverseEvents.events.${idx}.withdrawn`, ev.withdrawn || "否", ["否", "是"], "AE退出")}
                  </div>
                  <div class="sm:col-span-2">
                    <label class="text-xs font-semibold text-slate-600 block mb-1">与研究相关干预的关联性评价△</label>
                    ${this.renderRadioGroup(
                      `adverseEvents.events.${idx}.causality`,
                      ev.causality || "可能无关",
                      ["肯定有关", "很可能有关", "可能有关", "可能无关", "待评价", "无法评价"],
                      "AE关联性"
                    )}
                  </div>
                  <div>
                    <label class="text-xs font-semibold text-slate-600 block mb-1">是否判定为研究相关不良反应</label>
                    ${this.renderRadioGroup(`adverseEvents.events.${idx}.isADR`, ev.isADR || "否", ["否", "是"], "是否不良反应")}
                  </div>
                </div>
              </div>
            `
                )
                .join("")
        }

        <div class="text-xs text-slate-500 bg-slate-100 p-3 rounded-lg leading-relaxed">
          <p><strong>注① 严重程度分级标准：</strong>1级=轻度，无或轻微症状，不需治疗；2级=中度，需微量/局部/非侵入性治疗；3级=重度或有重要医学意义但不会立即危及生命，导致住院或延长住院；4级=危及生命，需紧急治疗；5级=与试验针刺相关的死亡。</p>
          <p><strong>注② △不良反应判定规则：</strong>将“肯定有关、很可能有关、可能有关、无法评价”统一视为针刺不良反应。</p>
        </div>
      </div>
    `;
  },

  addAERow() {
    const subj = this.getCurrentSubject();
    if (subj?.locked) {
      this.showToast("当前病例已锁定，无法修改！");
      return;
    }
    subj.adverseEvents.hasAE = "有";
    subj.adverseEvents.events = subj.adverseEvents.events || [];
    subj.adverseEvents.events.push({
      name: "",
      desc: "",
      startTime: "",
      endTime: "",
      severity: "1级",
      isSAE: "否",
      outcome: "消失",
      actionTaken: "继续研究相关干预",
      withdrawn: "否",
      causality: "可能无关",
      isADR: "否"
    });
    this.persist("新增不良事件记录", "");
    this.render();
  },

  // ==================== 总结与 PI 审核签字页 ====================
  renderSummarySection(subj) {
    const sum = subj.summary || {};
    const reasons = [
      { code: "1", group: "研究者决定退出", text: "(1) 入组后发现不符合纳入标准：如事后核查发现年龄＜18岁、入院至发病时间＞24小时或影像学资料缺失" },
      { code: "2", group: "研究者决定退出", text: "(2) 违反排除标准未被及时发现：如后续发现入组时已存在活动性感染、使用免疫抑制剂或合并严重脏器疾病" },
      { code: "3", group: "研究者决定退出", text: "(3) 干预措施未按方案执行：如针灸治疗未达规定次数或偏离标准操作流程" },
      { code: "4", group: "研究者决定退出", text: "(4) 发生重要方案偏离或合并可能影响主要结局判定的干预；临床必需的抗感染及急救治疗不得延误，但须完整记录" },
      { code: "5", group: "研究者决定退出", text: "(5) 数据严重缺失：关键结局指标（如肺炎发生率）无法获取，影响研究评价" },
      { code: "6", group: "受试者决定退出", text: "(6) 患者/监护人主动要求退出：因个人意愿、无法耐受治疗或其他非医疗原因终止参与研究" },
      { code: "7", group: "受试者决定退出", text: "(7) 不良事件或严重不良事件导致无法继续参加" },
      { code: "8", group: "受试者决定退出", text: "(8) 死亡（死亡同时作为结局事件记录，不等同于受试者主动退出）" },
      { code: "9", group: "受试者决定退出", text: "(9) 失访或无法完成后续随访" },
      { code: "10", group: "其他", text: "(10) 其他原因" }
    ];

    return `
      <div class="space-y-6">
        <h3 class="font-bold text-slate-800 text-base border-l-4 border-sky-600 pl-3">1. 试验总结表</h3>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div>
            <label class="text-xs font-semibold text-slate-600 block mb-1">研究干预结束日期（如适用）</label>
            <input type="date" value="${sum.interventionEndDate || ""}"
              onchange="App.setByPath('summary.interventionEndDate', this.value, '干预结束日期', true)" class="crf-input" />
          </div>
          <div>
            <label class="text-xs font-semibold text-slate-600 block mb-1">病例是否中途退出试验</label>
            ${this.renderRadioGroup("summary.withdrawn", sum.withdrawn || "否", ["否", "是"], "是否退出试验")}
          </div>
          <div>
            <label class="text-xs font-semibold text-slate-600 block mb-1">退出试验日期（若退出）</label>
            <input type="date" value="${sum.withdrawDate || ""}"
              onchange="App.setByPath('summary.withdrawDate', this.value, '退出日期', true)" class="crf-input" />
          </div>
        </div>

        <div class="space-y-2">
          <label class="text-xs font-bold text-slate-700 block">退出试验的主要原因（若病例退出，请勾选对应编号 1-10）：</label>
          <div class="space-y-1.5 bg-white border border-slate-200 rounded-xl p-3">
            ${reasons
              .map(r => {
                const active = String(sum.withdrawReasonCode) === r.code;
                return `
                  <div onclick="App.setByPath('summary.withdrawReasonCode', '${r.code}', '退出原因代码')"
                    class="p-2 rounded-lg border text-xs cursor-pointer flex items-center justify-between transition ${
                      active ? "bg-rose-50 border-rose-400 text-rose-900 font-semibold" : "border-transparent hover:bg-slate-50 text-slate-700"
                    }">
                    <span>${active ? "☑" : "□"} <strong class="text-slate-500">[${r.group}]</strong> ${r.text}</span>
                  </div>
                `;
              })
              .join("")}
            ${
              String(sum.withdrawReasonCode) === "10"
                ? `
              <div class="flex items-center gap-2 pt-2 px-2">
                <span class="text-xs font-semibold text-amber-700 shrink-0">↳ 请说明其他退出原因：</span>
                <input type="text" value="${sum.withdrawOtherDetail || ""}" placeholder="请填写具体退出原因..."
                  onchange="App.setByPath('summary.withdrawOtherDetail', this.value, '退出其他原因说明', true)"
                  class="crf-input text-xs border-amber-300 bg-amber-50/40" />
              </div>
            `
                : ""
            }
          </div>
        </div>

        <!-- PI 审核签名页 -->
        <h3 class="font-bold text-slate-800 text-base border-l-4 border-emerald-600 pl-3 pt-2">2. 审核签名（主要研究者 PI 终审）</h3>
        <div class="bg-emerald-50/60 border-2 border-emerald-300 rounded-xl p-5 space-y-4">
          <p class="text-sm font-medium text-emerald-950">
            “此病例报告表已审阅，是真实、准确、完整无误的，包括了在相应日期所进行的各项检查的结果及评价。”
          </p>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label class="text-xs font-bold text-emerald-900 block mb-1">主要研究者签名 (PI Signature)</label>
              <input type="text" placeholder="输入主要研究者姓名" value="${sum.piSignature || ""}"
                onchange="App.setByPath('summary.piSignature', this.value, 'PI审核签名', true)" class="crf-input font-bold" />
            </div>
            <div>
              <label class="text-xs font-bold text-emerald-900 block mb-1">审核签署日期</label>
              <input type="date" value="${sum.piSignDate || ""}"
                onchange="App.setByPath('summary.piSignDate', this.value, 'PI签字日期', true)" class="crf-input" />
            </div>
            <div class="flex items-end">
              ${
                subj.locked
                  ? `<button type="button" onclick="var r=prompt('【PI 权限操作】请输入解锁此份病例报告表的原因（将记入GCP稽查轨迹）：');if(r){App.setByPath('locked', false, 'PI授权解锁CRF，原因：'+r);App.showToast('已由PI授权解锁该病例报告表');}"
                      class="w-full py-2 px-4 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow transition">
                      🔓 PI 授权解锁（需登记原因）
                    </button>`
                  : `<button type="button" onclick="if(!App.getCurrentSubject().summary.piSignature){App.showToast('请先填写主要研究者签名！');return;}App.setByPath('status', '已完成');App.setByPath('locked', true, 'PI审核签字并锁定病例');App.showToast('已完成PI审核签名并锁定该受试者eCRF！')"
                      class="w-full py-2 px-4 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold shadow transition">
                      🔏 PI 确认签审并锁定此份 CRF
                    </button>`
              }
            </div>
            <div class="sm:col-span-3">
              <label class="text-xs font-bold text-emerald-900 block mb-1">备注</label>
              <textarea rows="2" onchange="App.setByPath('summary.piNote', this.value, 'PI审核备注', true)" class="crf-input">${sum.piNote || ""}</textarea>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  // ==================== 交互式临床量表逐项评分弹窗 (Modal) ====================
  // 修复：给弹窗滚动区绑定 id="edc-scale-modal-body"，App.render() 时自动保留滚动位置，不会滚回顶部
  renderScaleModal() {
    const { visitKey, scaleKey, tempDetails, tempMeasured, tempVas, tempSigner, tempIsAcu } = this.state.scaleModal;
    const def = window.CLINICAL_SCALES[scaleKey];
    if (!def) return "";

    let liveTotal = 0;
    if (scaleKey === "EQ5D") {
      const m = tempDetails.mobility || 1;
      const s = tempDetails.selfcare || 1;
      const a = tempDetails.activity || 1;
      const p = tempDetails.pain || 1;
      const x = tempDetails.anxiety || 1;
      liveTotal = `${m}-${s}-${a}-${p}-${x} (VAS: ${tempVas}分)`;
    } else {
      def.items.forEach(item => {
        const val = parseInt(tempDetails[item.id], 10);
        const opt = item.options.find(o => o.score === val);
        if (!isNaN(val) && !(opt && opt.excludeFromSum)) {
          liveTotal += val;
        }
      });
    }

    return `
      <div class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
        <div class="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
          <!-- 弹窗头部 -->
          <div class="px-4 sm:px-6 py-3.5 sm:py-4 bg-slate-900 text-white flex items-center justify-between">
            <div>
              <span class="text-xs px-2 py-0.5 rounded bg-sky-500/30 text-sky-200 font-mono uppercase">${visitKey} 访视量表评估</span>
              <h3 class="text-base sm:text-lg font-bold mt-1">${def.name} · 交互式自动评分器</h3>
            </div>
            <div class="flex items-center gap-4">
              <div class="text-right">
                <span class="text-xs text-slate-400 block">实时计算得分</span>
                <span id="edc-scale-live-total" class="text-lg sm:text-xl font-bold text-emerald-400 font-mono">${liveTotal}</span>
              </div>
              <button type="button" onclick="App.closeScaleModal()" class="text-slate-400 hover:text-white text-2xl leading-none">×</button>
            </div>
          </div>

          <!-- 弹窗主体：逐项评分标准（id="edc-scale-modal-body" 保持滚动条位置不跳回顶部） -->
          <div id="edc-scale-modal-body" class="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
            <p class="text-xs text-slate-600 bg-slate-100 p-3 rounded-lg">${def.description}</p>
            ${def.items
              .map(item => {
                const curScore = tempDetails[item.id];
                const curMeasured = tempMeasured?.[item.id] ?? "";
                return `
                  <div class="border border-slate-200 rounded-xl p-4 space-y-2.5 bg-slate-50/50">
                    <div class="flex flex-wrap items-center justify-between gap-2">
                      <h4 class="font-bold text-sm text-slate-900">${item.title}</h4>
                      <div class="flex items-center gap-3">
                        ${
                          item.hasMeasuredInput
                            ? `
                          <div class="flex items-center gap-1.5 text-xs">
                            <span class="text-slate-500">实测值:</span>
                            <input type="text" value="${String(curMeasured).replace(/"/g, "&quot;")}" placeholder="填实测值"
                              oninput="App.state.scaleModal.tempMeasured['${item.id}']=this.value"
                              onchange="App.state.scaleModal.tempMeasured['${item.id}']=this.value"
                              class="crf-input w-24 py-1 px-2 text-xs font-mono text-center bg-white" />
                            <span class="text-slate-400">${item.unit || ""}</span>
                          </div>
                        `
                            : ""
                        }
                        <span class="text-xs font-mono font-bold text-sky-700">当前项得分: ${curScore ?? "未选"}</span>
                      </div>
                    </div>
                    ${item.method ? `<p class="text-xs text-slate-500 leading-relaxed">评估方法：${item.method}</p>` : ""}
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      ${item.options
                        .map(opt => {
                          const selected = Number(curScore) === opt.score;
                          return `
                            <button type="button"
                              onclick="App.state.scaleModal.tempDetails['${item.id}']=${opt.score};App.render()"
                              class="text-left p-2.5 rounded-lg border text-xs transition flex items-start gap-2 ${
                                selected
                                  ? "bg-sky-600 text-white border-sky-600 font-semibold shadow-xs"
                                  : "bg-white text-slate-700 border-slate-200 hover:border-sky-300"
                              }">
                              <span>${selected ? "☑" : "□"}</span>
                              <span>${opt.label}</span>
                            </button>
                          `;
                        })
                        .join("")}
                    </div>
                  </div>
                `;
              })
              .join("")}

            ${
              def.hasVasScore
                ? `
              <div class="border border-sky-200 rounded-xl p-4 bg-sky-50/60 space-y-3">
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <label class="font-bold text-sm text-slate-800">6. 今日健康 VAS 视觉模拟评分 (0 - 100分，可左右顺滑拖动或直接输入)</label>
                  <div class="flex items-center gap-2">
                    <input id="edc-scale-vas-num" type="number" min="0" max="100" step="1" value="${tempVas}"
                      oninput="App.updateScaleModalVas(this.value, 'num')"
                      class="crf-input w-20 py-1 px-2 text-center font-mono font-bold text-base text-sky-700 bg-white border-sky-300" />
                    <span id="edc-scale-vas-display" class="font-mono font-bold text-lg text-sky-700">${tempVas} 分</span>
                  </div>
                </div>
                <input id="edc-scale-vas-range" type="range" min="0" max="100" step="1" value="${tempVas}"
                  oninput="App.updateScaleModalVas(this.value, 'range')"
                  class="w-full h-2.5 bg-slate-200 rounded-lg cursor-pointer accent-sky-600" />
                <div class="flex justify-between text-[11px] text-slate-500 font-mono px-0.5">
                  <span>0分 (想象中最差健康状况)</span>
                  <span>25分</span>
                  <span>50分</span>
                  <span>75分</span>
                  <span>100分 (想象中最好健康状况)</span>
                </div>
              </div>
            `
                : ""
            }

            <!-- 评估者签名与是否针刺操作者盲法核查 -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-200">
              <div>
                <label class="text-xs font-bold text-slate-700 block mb-1">量表评估者签名</label>
                <input type="text" value="${tempSigner}"
                  oninput="App.state.scaleModal.tempSigner=this.value"
                  onchange="App.state.scaleModal.tempSigner=this.value"
                  class="crf-input font-semibold" />
              </div>
              ${
                def.needAcupunctureFlag
                  ? `
                <div>
                  <label class="text-xs font-bold text-slate-700 block mb-1">评估者是否为针刺操作者（盲法评价质控）</label>
                  <div class="flex gap-3 pt-1">
                    ${["是", "否"]
                      .map(
                        v => `
                      <button type="button" onclick="App.state.scaleModal.tempIsAcu='${v}';App.render()"
                        class="crf-option-pill ${tempIsAcu === v ? "active" : ""}">
                        ${tempIsAcu === v ? "☑" : "□"} ${v}
                      </button>
                    `
                      )
                      .join("")}
                  </div>
                </div>
              `
                  : ""
              }
            </div>
          </div>

          <!-- 弹窗底部 -->
          <div class="px-4 sm:px-6 py-3.5 sm:py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
            <span class="text-xs text-slate-500">点击“确认回填”将自动把总分与各子项明细写入当前访视 CRF</span>
            <div class="flex items-center gap-3">
              <button type="button" onclick="App.closeScaleModal()" class="px-4 py-2 rounded-lg border border-slate-300 text-xs font-medium text-slate-600 hover:bg-slate-100">
                取消
              </button>
              <button id="edc-scale-confirm-btn" type="button" onclick="App.saveScaleModal()" class="px-5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow">
                ✓ 确认算分并回填 (${liveTotal})
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  // ==================== 稽查轨迹弹窗 (Audit Trail Modal) ====================
  renderAuditModal(subj) {
    const logs = subj?.auditLogs || [];
    return `
      <div class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[80vh] flex flex-col overflow-hidden">
          <div class="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
            <div>
              <h3 class="text-base font-bold">🕒 电子数据稽查轨迹 (GCP Audit Trail)</h3>
              <p class="text-xs text-slate-400">受试者编号：${subj.id} (${subj.initials}) · 临床研究数据修改溯源记录</p>
            </div>
            <button type="button" onclick="App.state.auditModalOpen=false;App.render()" class="text-slate-400 hover:text-white text-2xl">×</button>
          </div>
          <div class="p-6 overflow-y-auto flex-1 divide-y divide-slate-100">
            ${logs
              .map(
                l => `
              <div class="py-2.5 flex items-start justify-between gap-4 text-xs">
                <div>
                  <span class="font-bold text-slate-800">${l.action}</span>
                  <p class="text-slate-600 font-mono mt-0.5">${l.field}</p>
                </div>
                <div class="text-right shrink-0 text-slate-400">
                  <div class="font-semibold text-slate-600">${l.user}</div>
                  <div>${l.time}</div>
                </div>
              </div>
            `
              )
              .join("")}
          </div>
        </div>
      </div>
    `;
  },

  // ==================== 新增受试者弹窗（自动绑定首次录入账号与负责人姓名） ====================
  renderNewSubjectModal() {
    const maxNumId = (this.state.subjects || []).reduce((max, s) => {
      const n = parseInt(s.id, 10);
      return !isNaN(n) && n > max ? n : max;
    }, 0);
    const nextId = String(maxNumId + 1).padStart(3, "0");
    const curUser = this.state.currentUser || { account: "dr_wangqiang", name: "王强", role: "主治医师" };
    return `
      <div class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
        <form onsubmit="event.preventDefault();App.createNewSubject(this)"
          class="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden">
          <div class="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
            <div>
              <h3 class="text-base font-bold">＋ 新增入组筛查受试者</h3>
              <p class="text-[11px] text-slate-400 mt-0.5">新增患者将与首次录入账号自动绑定，作为后续随访节点提醒负责人</p>
            </div>
            <button type="button" onclick="App.state.newSubjectModalOpen=false;App.render()" class="text-slate-400 hover:text-white text-2xl">×</button>
          </div>
          <div class="p-6 space-y-4 text-xs">
            <div class="p-3 rounded-xl bg-sky-50 border border-sky-200 space-y-2.5">
              <div class="flex items-center justify-between">
                <span class="font-bold text-sky-900">👤 首次录入账号与负责人绑定</span>
                <span class="text-[11px] px-2 py-0.5 rounded bg-sky-600 text-white font-semibold">自动绑定当前账号</span>
              </div>
              <div class="grid grid-cols-2 gap-2.5">
                <div>
                  <label class="text-slate-600 block mb-1">负责人账号</label>
                  <input name="new_owner_account" type="text" value="${curUser.account}" required class="crf-input font-mono font-bold bg-white text-sky-800" />
                </div>
                <div>
                  <label class="text-slate-600 block mb-1">负责人姓名</label>
                  <input name="new_owner_name" type="text" value="${curUser.name}" required class="crf-input font-bold bg-white text-slate-900" />
                </div>
              </div>
            </div>
            <div>
              <label class="font-bold text-slate-700 block mb-1">患者编号（三位数字，如 005）</label>
              <input name="new_id" type="text" maxlength="3" value="${nextId}" required class="crf-input font-mono font-bold" />
            </div>
            <div>
              <label class="font-bold text-slate-700 block mb-1">患者姓名</label>
              <input name="new_name" type="text" placeholder="如：张学良 或 李四" required class="crf-input" />
            </div>
            <div>
              <label class="font-bold text-slate-700 block mb-1">患者姓名拼音缩写（□□□）</label>
              <input name="new_initials" type="text" maxlength="3" placeholder="如：ZXL（两字姓名加填第二字第二字母）" required class="crf-input font-mono uppercase" />
              <p class="text-[11px] text-slate-400 mt-1">规则：三字填首字母；两字加填第二字第二字母；四字填前三字首字母</p>
            </div>
            <div>
              <label class="font-bold text-slate-700 block mb-1">入组/研究开始日期（自动生成第3/7/30/90天采集提醒）</label>
              <input name="new_enroll_date" type="date" value="${window.getTodayDateStr()}" required class="crf-input font-mono" />
            </div>
          </div>
          <div class="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
            <button type="button" onclick="App.state.newSubjectModalOpen=false;App.render()" class="px-4 py-2 rounded-lg border border-slate-300 text-xs">取消</button>
            <button type="submit" class="px-5 py-2 rounded-lg bg-sky-600 text-white text-xs font-bold">绑定账号并进入 V1 基线填报</button>
          </div>
        </form>
      </div>
    `;
  }
});
