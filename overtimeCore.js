// ---- DayType & holidays ----
const DayType = {
  WEEKDAY: "weekday",
  RESTDAY: "restDay",
  HOLIDAY: "holiday",
};

const DayTypeLabel = {
  [DayType.WEEKDAY]: "平日",
  [DayType.RESTDAY]: "休息日",
  [DayType.HOLIDAY]: "假日",
};

// 從 Swift 專案的 holidays_tw_sample.json 移植
const HOLIDAYS_TW = {
  "2025-01-01": "開國紀念日",
  "2025-01-27": "春節前放假日",
  "2025-01-28": "春節",
  "2025-01-29": "春節",
  "2025-01-30": "春節",
  "2025-02-28": "和平紀念日",
};

// ---- 小工具 ----

function parseTimeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function minutesToHours(min) {
  return min / 60;
}

function roundToPlaces(num, places) {
  const m = Math.pow(10, places);
  return Math.round(num * m) / m;
}

// ---- OvertimeCore (JS 版) ----

const OvertimeCore = {
  ADJ_1_00: 1.0,
  ADJ_1_34: 1.34,
  ADJ_1_67: 1.67,
  ADJ_2_67: 2.67,

  hourlyFromMonthly(monthly) {
    if (!monthly || monthly <= 0) return 0;
    return monthly / 240.0;
  },

  normalize(dateStr, startTimeStr, endTimeStr) {
    const sMin = parseTimeToMinutes(startTimeStr);
    let eMin = parseTimeToMinutes(endTimeStr);
    if (eMin <= sMin) {
      eMin += 24 * 60;
    }
    return { startMin: sMin, endMin: eMin };
  },

  overlapHours(a, b) {
    const s = Math.max(a.startMin, b.startMin);
    const e = Math.min(a.endMin, b.endMin);
    if (e <= s) return 0;
    return minutesToHours(e - s);
  },

  intervalsOverlap(a, b) {
    return Math.max(a.startMin, b.startMin) < Math.min(a.endMin, b.endMin);
  },

  lunchBreak(breakStartStr, breakEndStr) {
    const bs = parseTimeToMinutes(breakStartStr);
    const be = parseTimeToMinutes(breakEndStr);
    return { startMin: bs, endMin: be };
  },

  dayType(dateStr) {
    const d = new Date(dateStr + "T00:00:00");
    const weekday = d.getDay(); // 0=Sun, 6=Sat
    if (weekday === 0 || Object.prototype.hasOwnProperty.call(HOLIDAYS_TW, dateStr)) {
      return DayType.HOLIDAY;
    }
    if (weekday === 6) {
      return DayType.RESTDAY;
    }
    return DayType.WEEKDAY;
  },

  calcCompanyAdd(hourly, dayType, workedHours) {
    let h = Math.max(0, workedHours);
    let add = 0;
    const lines = [];

    function push(used, mul, label) {
      if (used <= 0) return;
      const part = used * hourly * mul;
      add += part;
      const line = `${label} ${used.toFixed(2)}×${hourly.toFixed(2)}×${mul.toFixed(2)}=${part.toFixed(2)}`;
      lines.push(line);
      h -= used;
    }

    switch (dayType) {
      case DayType.WEEKDAY:
        push(Math.min(h, 2), OvertimeCore.ADJ_1_34, "前2h");
        if (h <= 0) break;
        push(Math.min(h, 2), OvertimeCore.ADJ_1_67, "再2h");
        if (h <= 0) break;
        push(Math.max(h, 0), OvertimeCore.ADJ_1_67, ">4h");
        break;

      case DayType.RESTDAY:
        push(Math.min(h, 2), OvertimeCore.ADJ_1_34, "前2h");
        if (h <= 0) break;
        push(Math.min(h, 6), OvertimeCore.ADJ_1_67, "後6h");
        if (h <= 0) break;
        push(Math.max(h, 0), OvertimeCore.ADJ_2_67, ">8h");
        break;

      case DayType.HOLIDAY:
        push(Math.min(h, 8), OvertimeCore.ADJ_1_00, "≤8h");
        if (h <= 0) break;
        push(Math.min(h, 2), OvertimeCore.ADJ_1_34, "第9-10h");
        if (h <= 0) break;
        push(Math.max(h, 0), OvertimeCore.ADJ_1_67, "≥第11h");
        break;
    }

    add = roundToPlaces(add, 2);
    return { add, detail: lines.join(" | ") };
  },

  toCSV(records) {
    const rows = ["日期,類型,開始,結束,時數,加發金額,計算過程"];
    for (const r of records) {
      const calc = (r.breakdown || "").replace(/"/g, '""');
      const line = [
        r.date,
        r.dayTypeLabel,
        r.start,
        r.end,
        r.hours.toFixed(2),
        r.addPay.toFixed(2),
        `"${calc}"`
      ].join(",");
      rows.push(line);
    }
    return rows.join("\n");
  },
};
