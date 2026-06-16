import { useState, useMemo } from 'react';

const DOW = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

function toStr(date) {
  // Use LOCAL date parts, not UTC — toISOString() is UTC and causes a date
  // offset in timezones east of UTC (e.g. Berlin UTC+2) that breaks addDays.
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return toStr(d);
}

export default function DateRangePicker({ bookedRanges = [], start, end, onChange }) {
  const todayStr = toStr(new Date());

  const [month, setMonth] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const [hover, setHover] = useState(null);

  // Expand booked ranges into a flat Set of date strings for O(1) lookup
  const bookedSet = useMemo(() => {
    const s = new Set();
    for (const r of bookedRanges) {
      let cur = r.start_date;
      while (cur <= r.end_date) {
        s.add(cur);
        cur = addDays(cur, 1);
      }
    }
    return s;
  }, [bookedRanges]);

  function isBooked(d) { return bookedSet.has(d); }
  function isPast(d) { return d < todayStr; }
  function isDisabled(d) { return isPast(d) || isBooked(d); }

  function rangeHasBooked(s, e) {
    let cur = addDays(s, 1);
    while (cur < e) {
      if (bookedSet.has(cur)) return true;
      cur = addDays(cur, 1);
    }
    return false;
  }

  function handleClick(d) {
    if (isDisabled(d)) return;
    if (!start || (start && end)) {
      onChange(d, null);
    } else if (d < start) {
      onChange(d, null);
    } else if (rangeHasBooked(start, d)) {
      // Range crosses a booked date — restart from clicked date
      onChange(d, null);
    } else {
      onChange(start, d);
    }
  }

  // Effective hover end — clamp at first booked date after start
  const effectiveHover = useMemo(() => {
    if (!start || end || !hover || hover <= start) return null;
    let cur = addDays(start, 1);
    while (cur <= hover) {
      if (bookedSet.has(cur)) return addDays(cur, -1); // stop before booked
      cur = addDays(cur, 1);
    }
    return hover;
  }, [start, end, hover, bookedSet]);

  function dayClass(d) {
    const classes = ['cal-day'];
    if (!d) return 'cal-day cal-day--empty';
    if (d === todayStr) classes.push('cal-day--today');

    if (isPast(d)) {
      classes.push('cal-day--past');
    } else if (isBooked(d)) {
      classes.push('cal-day--booked');
    } else {
      classes.push('cal-day--open');
      const isStart = d === start;
      const isEnd = d === end;
      const inRange = start && end && d > start && d < end;
      const inHover = start && !end && effectiveHover && d > start && d <= effectiveHover;

      if (isStart || isEnd) classes.push('cal-day--sel');
      else if (inRange) classes.push('cal-day--in-range');
      else if (inHover) classes.push('cal-day--hover-range');
    }
    return classes.join(' ');
  }

  // Build the days grid for the current month
  const year = month.getFullYear();
  const mon = month.getMonth();
  const firstDow = (new Date(year, mon, 1).getDay() + 6) % 7; // Mon=0
  const daysInMonth = new Date(year, mon + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(`${year}-${String(mon + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  }

  const monthLabel = month.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  function prevMonth() { setMonth(new Date(year, mon - 1, 1)); }
  function nextMonth() { setMonth(new Date(year, mon + 1, 1)); }

  // Don't allow going before current month
  const canGoPrev = new Date(year, mon - 1, 1) >= new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  return (
    <div className="cal">
      <div className="cal-header">
        <button type="button" className="cal-nav" onClick={prevMonth} disabled={!canGoPrev}>‹</button>
        <span className="cal-month">{monthLabel}</span>
        <button type="button" className="cal-nav" onClick={nextMonth}>›</button>
      </div>

      <div className="cal-grid">
        {DOW.map((d) => <div key={d} className="cal-dow">{d}</div>)}
        {cells.map((d, i) => (
          <div
            key={d ?? `e-${i}`}
            className={dayClass(d)}
            onClick={() => d && handleClick(d)}
            onMouseEnter={() => d && start && !end && !isDisabled(d) && setHover(d)}
            onMouseLeave={() => setHover(null)}
          >
            {d ? new Date(d + 'T00:00:00').getDate() : ''}
          </div>
        ))}
      </div>

      <div className="cal-legend">
        {bookedRanges.length > 0 && (
          <span className="cal-legend-item"><span className="cal-swatch cal-swatch--booked" /> Unavailable</span>
        )}
        <span className="cal-legend-item"><span className="cal-swatch cal-swatch--sel" /> Your selection</span>
        <span className="cal-legend-item" style={{ color: 'var(--text-muted)', opacity: 0.5 }}>
          <span className="cal-swatch" style={{ background: 'var(--border)' }} /> Past
        </span>
      </div>
    </div>
  );
}
