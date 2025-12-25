let records = [];
let editingId = null;

const dateEl = document.getElementById("date");
const startEl = document.getElementById("startTime");
const endEl = document.getElementById("endTime");
const bodyEl = document.getElementById("recordsBody");

const editBackdrop = document.getElementById("editModalBackdrop");
const editDateEl = document.getElementById("editDate");
const editStartEl = document.getElementById("editStartTime");
const editEndEl = document.getElementById("editEndTime");
const editDayTypeEl = document.getElementById("editDayType");

document.getElementById("btnAdd").onclick = () => {
  const r = createRecord(dateEl.value, startEl.value, endEl.value, "auto");
  records.push(r);
  render();
};

function createRecord(date, start, end, manualType) {
  const type = manualType === "auto"
    ? OvertimeCore.dayType(date)
    : manualType;

  const norm = OvertimeCore.normalize(date, start, end);
  const hours = (norm.endMin - norm.startMin)/60;
  const pay = OvertimeCore.calcCompanyAdd(200, type, hours).add;

  return {
    id: crypto.randomUUID(),
    date, start, end,
    manualType,
    dayType: type,
    hours, pay
  };
}

function render() {
  bodyEl.innerHTML = "";
  for (const r of records) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${r.date}</td>
      <td><span class="badge badge-${r.dayType}">${DayTypeLabel[r.dayType]}</span></td>
      <td>${r.start}-${r.end}</td>
      <td>${r.hours.toFixed(2)}</td>
      <td>${r.pay.toFixed(2)}</td>
      <td><button onclick="edit('${r.id}')">編輯</button></td>
    `;
    bodyEl.appendChild(tr);
  }
}

window.edit = id => {
  const r = records.find(x=>x.id===id);
  editingId = id;
  editDateEl.value = r.date;
  editStartEl.value = r.start;
  editEndEl.value = r.end;
  editDayTypeEl.value = r.manualType;
  editBackdrop.classList.add("show");
};

document.getElementById("btnEditCancel").onclick = () => {
  editBackdrop.classList.remove("show");
};

document.getElementById("btnEditSave").onclick = () => {
  const idx = records.findIndex(r=>r.id===editingId);
  records[idx] = createRecord(
    editDateEl.value,
    editStartEl.value,
    editEndEl.value,
    editDayTypeEl.value
  );
  editBackdrop.classList.remove("show");
  render();
};
