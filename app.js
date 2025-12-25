// ===== 原本內容全部保留，只標 ⭐ 新增 / 修改的地方 =====

let records = [];
let editingRecordId = null;

// ⭐ 新增：抓 editDayType
const editDayTypeEl = document.getElementById("editDayType");

// ===== upsertRecord：多支援 manualDayType =====
function upsertRecord(dateStr, startStr, endStr, editId, manualType = "auto") {

  const hourly = currentHourly();
  applyMultipliersFromUI();

  const norm = OvertimeCore.normalize(dateStr, startStr, endStr);
  const worked = (norm.endMin - norm.startMin) / 60;

  const dType =
    manualType === "auto"
      ? OvertimeCore.dayType(dateStr)
      : manualType;

  const { add, detail } = OvertimeCore.calcCompanyAdd(
    hourly,
    dType,
    worked
  );

  const record = {
    id: editId || crypto.randomUUID(),
    date: dateStr,
    start: startStr,
    end: endStr,
    dayType: dType,
    dayTypeLabel: DayTypeLabel[dType],
    manualDayType: manualType,   // ⭐ 新增
    hours: worked,
    addPay: add,
    breakdown: detail,
  };

  if (editId) {
    const idx = records.findIndex(r => r.id === editId);
    records[idx] = record;
  } else {
    records.push(record);
  }
  return { ok: true };
}

// ===== 編輯視窗 =====
function openEditModal(id) {
  const rec = records.find(r => r.id === id);
  if (!rec) return;

  editingRecordId = id;
  editDateEl.value = rec.date;
  editStartTimeEl.value = rec.start;
  editEndTimeEl.value = rec.end;

  // ⭐ 把原本類型帶回來
  editDayTypeEl.value = rec.manualDayType || "auto";

  editModalBackdrop.classList.add("show");
}

function saveEditModal() {
  const manualType = editDayTypeEl.value || "auto";

  const res = upsertRecord(
    editDateEl.value,
    editStartTimeEl.value,
    editEndTimeEl.value,
    editingRecordId,
    manualType
  );

  if (!res.ok) return alert(res.error);

  editingRecordId = null;
  editModalBackdrop.classList.remove("show");
  renderRecords();
}
