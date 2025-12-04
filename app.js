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

const dateEl         = document.getElementById("date");
const startTimeEl    = document.getElementById("startTime");
const endTimeEl      = document.getElementById("endTime");

const btnPlus2       = document.getElementById("btnPlus2");
const btnAdd         = document.getElementById("btnAdd");
const btnDownloadCsv = document.getElementById("btnDownloadCsv");

const recordsEmpty   = document.getElementById("recordsEmpty");
const recordsTable   = document.getElementById("recordsTable");
const recordsBody    = document.getElementById("recordsBody");
const summaryRow     = document.getElementById("summaryRow");
const sumHoursEl     = document.getElementById("sumHours");
const sumPayEl       = document.getElementById("sumPay");

// 預設日期 = 今天
(function initDate() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  dateEl.value = `${yyyy}-${mm}-${dd}`;
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

// 切換「月薪制 / 時薪制」時的畫面
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

function addRecord() {
  const dateStr  = dateEl.value;
  const startStr = startTimeEl.value;
  const endStr   = endTimeEl.value;
  const breakStartStr = breakStartEl.value;
  const breakEndStr   = breakEndEl.value;

  if (!dateStr || !startStr || !endStr) {
    alert("請先輸入日期與開始/結束時間");
    return;
  }

  const hourly = currentHourly();
  if (hourly <= 0) {
    alert("請先確認時薪或月薪（不得為 0）");
    return;
  }

  const norm = OvertimeCore.normalize(dateStr, startStr, endStr);
  const sMin = norm.startMin;
  const eMin = norm.endMin;

  const hasOverlap = records.some((r) => {
    if (r.date !== dateStr) return false;
    const otherNorm = OvertimeCore.normalize(r.date, r.start, r.end);
    return OvertimeCore.intervalsOverlap(
      { startMin: sMin, endMin: eMin },
      otherNorm
    );
  });
  if (hasOverlap) {
    alert("與既有加班時段重疊，請調整時間再新增。");
    return;
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
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random(),
    date: dateStr,
    start: startStr,
    end: endStr,
    dayType: dType,
    dayTypeLabel: DayTypeLabel[dType],
    hours: workedRounded,
    addPay: add,
    breakdown,
  };

  records.push(record);
  renderRecords();
}

function deleteRecord(id) {
  records = records.filter((r) => r.id !== id);
  renderRecords();
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

    const tdDel = document.createElement("td");
    const delBtn = document.createElement("button");
    delBtn.textContent = "刪除";
    delBtn.className = "btn-danger";
    delBtn.onclick = () => deleteRecord(r.id);
    tdDel.appendChild(delBtn);

    tr.appendChild(tdDate);
    tr.appendChild(tdType);
    tr.appendChild(tdTime);
    tr.appendChild(tdHours);
    tr.appendChild(tdPay);
    tr.appendChild(tdBreak);
    tr.appendChild(tdDel);

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

function roundToPlaces(num, places) {
  const m = Math.pow(10, places);
  return Math.round(num * m) / m;
}

// events
salaryModeEl.addEventListener("change", () => {
  updateSalaryModeUI();
});
monthlyEl.addEventListener("input", updateHourlyDisplay);
hourlyEl.addEventListener("input", updateHourlyDisplay);

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
btnDownloadCsv.addEventListener("click", downloadCsv);

// init
updateSalaryModeUI();
renderRecords();
