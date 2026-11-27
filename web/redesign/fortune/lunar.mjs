// 음력(한국) → 양력 변환 — 한국천문연구원 자료 기반 라이브러리(korean-lunar-calendar)를 쓴다.
// 중국식 음력 라이브러리는 1930~2026년 중 약 3.6%의 날(설날이 다른 해 6번)에서 한국 음력과 달라 쓰지 않는다.
import KoreanLunarCalendar from 'korean-lunar-calendar';

function lib() { return new KoreanLunarCalendar(); }
/** 해당 한국 음력 달의 날수(29/30). 달이 없으면 0 */
export function monthDays(y, m, leap) { const k = lib(); if (k.setLunarDate(y, m, 30, !!leap)) return 30; return k.setLunarDate(y, m, 29, !!leap) ? 29 : 0; }
export function toSolar(y, m, d, leap) {
  try {
    const n = monthDays(y, m, leap);
    if (!n) return { ok: false, msg: leap ? y + '년에는 윤' + m + '월이 없어요. 윤달을 해제해 주세요.' : y + '년 ' + m + '월 정보를 찾지 못했어요.' };
    if (d > n) return { ok: false, msg: y + '년 ' + (leap ? '윤' : '') + m + '월은 ' + n + '일까지 있어요.' };
    const k = lib(); if (!k.setLunarDate(y, m, d, !!leap)) return { ok: false, msg: '날짜를 다시 확인해 주세요.' };
    const s = k.getSolarCalendar(); return { ok: true, y: s.year, m: s.month, d: s.day };
  } catch (e) { return { ok: false, msg: '날짜를 다시 확인해 주세요.' }; }
}
