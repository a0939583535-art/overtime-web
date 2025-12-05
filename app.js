// app.js

let records = [];

// DOM elements
const salaryModeEl   = document.getElementById("salaryMode");
const monthlyEl      = document.getElementById("monthly");
const hourlyEl       = document.getElementById("hourly");
const hourlyDisplay  = document.getElementById("hourlyDisplay");
const monthlyRow     = document.getElementById("monthlyRow");
const hourlyRow      = document.getElementById("hourlyRow");

const breakStartEl   = document.getElementById("breakStart");
const breakEndEl     = document.getElementById("breakEnd");

const adj100El = document.getElementById("adj100");
const adj134El = document.getElementById("adj134");
const adj167El = document.getElementById("adj167");
const adj267El = document.getElementById("adj267");

const dateEl         = document.getElementById("date");
const startTimeEl    = document.getElementById("startTime");
const endTimeEl      = document.getElementById("endTime");

const bulkStartDateEl = document.getElementById("bulkStartDate");
const bulkEndDateEl   = document.getElementById("bulkEndDate");
const bulkStartTimeEl = document.getElementById("bulkStartTime");
const bulkEndTimeEl   = document.getElementById("bulkEndTime");
const bulkModeRadios  = document.getElementsByName("bulkMode");
const bulkRangePanel  = document.getElementById("bulkRangePanel");
const bulkPickPanel   = document.getElementById("bulkPickPanel");
const bulkMonthEl     = document.getElementById("bulkMonth");
const pickCalendarEl  = document.getElementById("pickCalendar");

const btnPlus2       = document.getElementById("btnPlus2");
const btnAdd         = document.getElementById("btnAdd");
const btnBulkAdd     = document.getElementById("btnBulkAdd");
const btnDownloadCsv = document.getElementById("btnDownloadCsv");
const btnClearAll    = document.getElementById("btnClearAll");

const recordsEmpty   = document.getElementById("recordsEmpty");
const recordsTable   = document.getElementById("recordsTable");
const recordsBody    = document.getElementById("recordsBody");
const summaryRow     = document.getElementById("summaryRow");
const sumHoursEl     = document.getElementById("sumHours");
const sumPayEl       = document.getElementById("sumPay");

const editModalBackdrop = document.getElementById("editModalBackdrop");
const editDateEl        = document.getElementById("editDate");
const editStartTimeEl   = document.getElementById("editStartTime");
const editEndTimeEl     = document.getElementById("editEndTime");
const editHintEl        = document.getElementById("editHint");
const btnEditCancel     = document.getElementById("btnEditCancel");
const btnEditSave       = document.getElementById("btnEditSave");

let editingRecordId = null;
let pickSelectedDates = [];

// init today
(function initDate() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const todayStr = `${yyyy}-${mm}-${dd}`;
  dateEl.value = todayStr;
  bulkStartDateEl.value = todayStr;
  bulkEndDateEl.value = todayStr;
  bulkMonthEl.value = `${yyyy}-${mm}`;
})();

function currentHourly() {
  const mode = salaryModeEl.value;
  const monthly = parseFloat(monthlyEl.value) || 0;
  const hourly = parseFloat(hourlyEl.value) || 0;
  if (mode === "monthly") {
    return OvertimeCore.hourlyFromMonthly(monthly);
  } else {
    return hourly;
  }
}

function updateHourlyDisplay() {
  const mode = salaryModeEl.value;
  const h = currentHourly();
  if (mode === "monthly") {
    hourlyDisplay.textContent = `時薪 ≈ ${h.toFixed(2)}`;
  } else {
    hourlyDisplay.textContent = "";
  }
}

function updateSalaryModeUI() {
  const mode = salaryModeEl.value;
  if (mode === "monthly") {
    monthlyRow.style.display = "flex";
    hourlyRow.style.display  = "none";
  } else {
    monthlyRow.style.display = "none";
    hourlyRow.style.display  = "flex";
  }
  updateHourlyDisplay();
}

function roundToPlaces(num, places) {
  const m = Math.pow(10, places);
  return Math.round(num * m) / m;
}

function applyMultipliersFromUI() {
  const adj100 = parseFloat(adj100El.value) || 1.0;
  const adj134 = parseFloat(adj134El.value) || 1.34;
  const adj167 = parseFloat(adj167El.value) || 1.67;
  const adj267 = parseFloat(adj267El.value) || 2.67;

  OvertimeCore.ADJ_1_00 = adj100;
  OvertimeCore.ADJ_1_34 = adj134;
  OvertimeCore.ADJ_1_67 = adj167;
  OvertimeCore.ADJ_2_67 = adj267;
}

function upsertRecord(dateStr, startStr, endStr, editId) {
  const breakStartStr = breakStartEl.value;
  const breakEndStr   = breakEndEl.value;

  if (!dateStr || !startStr || !endStr) {
    return { ok: false, error: "日期與時間不得為空" };
  }

  const hourly = currentHourly();
  if (hourly <= 0) {
    return { ok: false, error: "請先確認時薪或月薪（不得為 0）" };
  }

  applyMultipliersFromUI();

  const norm = OvertimeCore.normalize(dateStr, startStr, endStr);
  const sMin = norm.startMin;
  const eMin = norm.endMin;

  const hasOverlap = records.some((r) => {
    if (r.date !== dateStr) return false;
    if (editId && r.id === editId) return false;
    const otherNorm = OvertimeCore.normalize(r.date, r.start, r.end);
    return OvertimeCore.intervalsOverlap(
      { startMin: sMin, endMin: eMin },
      otherNorm
    );
  });
  if (hasOverlap) {
    return { ok: false, error: "與既有加班時段重疊，請調整時間再新增。" };
  }

  const rawHours = (eMin - sMin) / 60.0;

  const lunch = OvertimeCore.lunchBreak(breakStartStr, breakEndStr);
  const lunchHours = OvertimeCore.overlapHours(
    { startMin: sMin, endMin: eMin },
    lunch
  );

  const worked = Math.max(0, rawHours - lunchHours);
  const workedRounded = roundToPlaces(worked, 2);

  const dType = OvertimeCore.dayType(dateStr);

  const { add, detail } = OvertimeCore.calcCompanyAdd(
    hourly,
    dType,
    workedRounded
  );

  const breakdown =
    `- 扣除午休 ${lunchHours.toFixed(2)} 小時 | ` + detail;

  const record = {
    id: editId || (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random()),
    date: dateStr,
    start: startStr,
    end: endStr,
    dayType: dType,
    dayTypeLabel: DayTypeLabel[dType],
    hours: workedRounded,
    addPay: add,
    breakdown,
  };

  if (editId) {
    const idx = records.findIndex((r) => r.id === editId);
    if (idx !== -1) {
      records[idx] = record;
    }
  } else {
    records.push(record);
  }

  return { ok: true };
}

function addRecord() {
  const dateStr  = dateEl.value;
  const startStr = startTimeEl.value;
  const endStr   = endTimeEl.value;

  const res = upsertRecord(dateStr, startStr, endStr, null);
  if (!res.ok) {
    alert(res.error);
    return;
  }
  renderRecords();
}

function openEditModal(id) {
  const rec = records.find((r) => r.id === id);
  if (!rec) return;
  editingRecordId = id;
  editDateEl.value = rec.date;
  editStartTimeEl.value = rec.start;
  editEndTimeEl.value = rec.end;
  editHintEl.textContent = "調整日期與時間後按「儲存」。會重新計算時數與加發金額。";
  editModalBackdrop.classList.add("show");
}

function closeEditModal() {
  editingRecordId = null;
  editModalBackdrop.classList.remove("show");
}

function saveEditModal() {
  if (!editingRecordId) {
    closeEditModal();
    return;
  }
  const newDate  = editDateEl.value;
  const newStart = editStartTimeEl.value;
  const newEnd   = editEndTimeEl.value;

  const res = upsertRecord(newDate, newStart, newEnd, editingRecordId);
  if (!res.ok) {
    alert(res.error);
    return;
  }
  closeEditModal();
  renderRecords();
}

function deleteRecord(id) {
  records = records.filter((r) => r.id !== id);
  renderRecords();
}

function clearAllRecords() {
  if (!records.length) return;
  if (!confirm("確定要刪除全部加班紀錄嗎？此動作無法復原。")) return;
  records = [];
  renderRecords();
}

function getBulkMode() {
  for (const r of bulkModeRadios) {
    if (r.checked) return r.value;
  }
  return "range";
}

function bulkAdd() {
  const mode = getBulkMode();
  const startTimeStr = bulkStartTimeEl.value;
  const endTimeStr   = bulkEndTimeEl.value;

  if (!startTimeStr || !endTimeStr) {
    alert("請先設定開始/結束時間。");
    return;
  }

  let targetDates = [];

  if (mode === "range") {
    const startDateStr = bulkStartDateEl.value;
    const endDateStr   = bulkEndDateEl.value;
    if (!startDateStr || !endDateStr) {
      alert("請先選擇起始與結束日期。");
      return;
    }
    const startDate = new Date(startDateStr + "T00:00:00");
    const endDate   = new Date(endDateStr + "T00:00:00");
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || startDate > endDate) {
      alert("日期區間不正確（起始日期需早於或等於結束日期）。");
      return;
    }
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      targetDates.push(`${yyyy}-${mm}-${dd}`);
    }
  } else {
    targetDates = pickSelectedDates.slice();
    if (!targetDates.length) {
      alert("請先在月曆上勾選至少一個日期。");
      return;
    }
  }

  let success = 0;
  const errors = [];

  for (const dateStr of targetDates) {
    const res = upsertRecord(dateStr, startTimeStr, endTimeStr, null);
    if (!res.ok) {
      errors.push(`${dateStr}：${res.error}`);
    } else {
      success++;
    }
  }

  renderRecords();

  let msg = `成功新增 ${success} 筆。`;
  if (errors.length > 0) {
    msg += "\n\n以下日期未加入：\n" + errors.join("\n");
  }
  alert(msg);
}

function daysInMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function renderPickCalendar() {
  pickCalendarEl.innerHTML = "";

  const monthValue = bulkMonthEl.value;
  if (!monthValue) return;
  const [yearStr, monthStr] = monthValue.split("-");
  const year = parseInt(yearStr, 10);
  const monthIndex = parseInt(monthStr, 10) - 1;
  if (isNaN(year) || isNaN(monthIndex)) return;

  pickSelectedDates = pickSelectedDates.filter((d) => {
    return d.startsWith(`${yearStr}-${monthStr}`);
  });

  const firstDay = new Date(year, monthIndex, 1);
  const firstWeekday = firstDay.getDay();
  const dim = daysInMonth(year, monthIndex);

  const weekdayLabels = ["日","一","二","三","四","五","六"];
  for (let i = 0; i < 7; i++) {
    const h = document.createElement("div");
    h.textContent = weekdayLabels[i];
    h.className = "calendar-day-header";
    pickCalendarEl.appendChild(h);
  }

  for (let i = 0; i < firstWeekday; i++) {
    const cell = document.createElement("div");
    pickCalendarEl.appendChild(cell);
  }

  for (let day = 1; day <= dim; day++) {
    const cell = document.createElement("div");
    cell.className = "calendar-day";
    cell.textContent = day;
    const dd = String(day).padStart(2, "0");
    const iso = `${yearStr}-${monthStr}-${dd}`;
    if (pickSelectedDates.includes(iso)) {
      cell.classList.add("selected");
    }
    cell.addEventListener("click", () => {
      const idx = pickSelectedDates.indexOf(iso);
      if (idx >= 0) {
        pickSelectedDates.splice(idx, 1);
        cell.classList.remove("selected");
      } else {
        pickSelectedDates.push(iso);
        cell.classList.add("selected");
      }
    });
    pickCalendarEl.appendChild(cell);
  }
}

function renderRecords() {
  if (records.length === 0) {
    recordsEmpty.style.display = "block";
    recordsTable.style.display = "none";
    summaryRow.style.display   = "none";
    sumHoursEl.textContent = "0.00";
    sumPayEl.textContent   = "0.00";
    return;
  }

  recordsEmpty.style.display = "none";
  recordsTable.style.display = "";
  summaryRow.style.display   = "";

  recordsBody.innerHTML = "";

  let totalHours = 0;
  let totalPay   = 0;

  for (const r of records) {
    totalHours += r.hours;
    totalPay   += r.addPay;

    const tr = document.createElement("tr");

    const tdDate = document.createElement("td");
    tdDate.textContent = r.date;

    const tdType = document.createElement("td");
    const badge = document.createElement("span");
    badge.textContent = r.dayTypeLabel;
    badge.classList.add("badge");
    if (r.dayType === DayType.WEEKDAY) badge.classList.add("badge-weekday");
    if (r.dayType === DayType.RESTDAY) badge.classList.add("badge-rest");
    if (r.dayType === DayType.HOLIDAY) badge.classList.add("badge-holiday");
    tdType.appendChild(badge);

    const tdTime = document.createElement("td");
    tdTime.textContent = `${r.start}–${r.end}`;

    const tdHours = document.createElement("td");
    tdHours.className = "text-right";
    tdHours.textContent = r.hours.toFixed(2);

    const tdPay = document.createElement("td");
    tdPay.className = "text-right";
    tdPay.textContent = r.addPay.toFixed(2);

    const tdBreak = document.createElement("td");
    const pre = document.createElement("div");
    pre.className = "breakdown";
    pre.textContent = r.breakdown;
    tdBreak.appendChild(pre);

    const tdOps = document.createElement("td");
    const editBtn = document.createElement("button");
    editBtn.textContent = "編輯";
    editBtn.className = "btn-secondary btn-small";
    editBtn.onclick = () => openEditModal(r.id);

    const delBtn = document.createElement("button");
    delBtn.textContent = "刪除";
    delBtn.className = "btn-danger btn-small";
    delBtn.style.marginLeft = "4px";
    delBtn.onclick = () => deleteRecord(r.id);

    tdOps.appendChild(editBtn);
    tdOps.appendChild(delBtn);

    tr.appendChild(tdDate);
    tr.appendChild(tdType);
    tr.appendChild(tdTime);
    tr.appendChild(tdHours);
    tr.appendChild(tdPay);
    tr.appendChild(tdBreak);
    tr.appendChild(tdOps);

    recordsBody.appendChild(tr);
  }

  sumHoursEl.textContent = totalHours.toFixed(2);
  sumPayEl.textContent   = totalPay.toFixed(2);
}

function downloadCsv() {
  if (records.length === 0) {
    alert("目前沒有紀錄可以匯出");
    return;
  }
  const csv = OvertimeCore.toCSV(records);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "overtime.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// events
salaryModeEl.addEventListener("change", updateSalaryModeUI);
monthlyEl.addEventListener("input", updateHourlyDisplay);
hourlyEl.addEventListener("input", updateHourlyDisplay);

[adj100El, adj134El, adj167El, adj267El].forEach((el) => {
  el.addEventListener("input", applyMultipliersFromUI);
});

btnPlus2.addEventListener("click", () => {
  const t = startTimeEl.value;
  if (!t) return;
  const [h, m] = t.split(":").map(Number);
  const baseMin = (h || 0) * 60 + (m || 0);
  const newMin = baseMin + 120;
  const nh = Math.floor((newMin % (24 * 60)) / 60);
  const nm = newMin % 60;
  endTimeEl.value = `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`;
});

btnAdd.addEventListener("click", addRecord);
btnBulkAdd.addEventListener("click", bulkAdd);
btnDownloadCsv.addEventListener("click", downloadCsv);
btnClearAll.addEventListener("click", clearAllRecords);

bulkModeRadios.forEach((r) => {
  r.addEventListener("change", () => {
    const mode = getBulkMode();
    if (mode === "range") {
      bulkRangePanel.style.display = "";
      bulkPickPanel.style.display  = "none";
    } else {
      bulkRangePanel.style.display = "none";
      bulkPickPanel.style.display  = "";
      renderPickCalendar();
    }
  });
});

bulkMonthEl.addEventListener("change", renderPickCalendar);

btnEditCancel.addEventListener("click", closeEditModal);
btnEditSave.addEventListener("click", saveEditModal);
editModalBackdrop.addEventListener("click", (e) => {
  if (e.target === editModalBackdrop) closeEditModal();
});

// init
updateSalaryModeUI();
applyMultipliersFromUI();
renderPickCalendar();
renderRecords();
