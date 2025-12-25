const DayType = {
  WEEKDAY: "weekday",
  RESTDAY: "restDay",
  HOLIDAY: "holiday",
};

const DayTypeLabel = {
  weekday: "平日",
  restDay: "休息日",
  holiday: "假日",
};

const HOLIDAYS_TW = {
  "2025-01-01": "開國紀念日",
  "2025-02-28": "和平紀念日",
  "2025-12-25": "行憲紀念日",
};

const OvertimeCore = {
  hourlyFromMonthly(m) {
    return m / 240;
  },

  normalize(date, s, e) {
    const toMin = t => {
      const [h,m] = t.split(":").map(Number);
      return h*60+m;
    };
    let sm = toMin(s);
    let em = toMin(e);
    if (em <= sm) em += 1440;
    return { startMin: sm, endMin: em };
  },

  dayType(date) {
    const d = new Date(date+"T00:00:00");
    if (d.getDay() === 0 || HOLIDAYS_TW[date]) return DayType.HOLIDAY;
    if (d.getDay() === 6) return DayType.RESTDAY;
    return DayType.WEEKDAY;
  },

  calcCompanyAdd(hourly, type, hours) {
    let add = 0;
    if (type === DayType.HOLIDAY) add = hours * hourly * 1.0;
    if (type === DayType.RESTDAY) add = hours * hourly * 1.67;
    if (type === DayType.WEEKDAY) add = hours * hourly * 1.34;
    return { add: Math.round(add*100)/100 };
  }
};
