// 음력 → 양력 변환 (음력 생일 입력용). 결과 화면과 별개로 '음력' 선택 때만 불러온다.
import { Lunar, LunarYear, LunarMonth } from 'lunar-javascript';

export function leapMonthOf(y) { return LunarYear.fromYear(y).getLeapMonth(); }

export function toSolar(y, m, d, leap) {
  try {
    if (leap && leapMonthOf(y) !== m) return { ok: false, msg: `${y}년에는 윤${m}월이 없어요. 윤달을 해제해 주세요.` };
    const days = LunarMonth.fromYm(y, leap ? -m : m).getDayCount();
    if (d > days) return { ok: false, msg: `${y}년 ${leap ? '윤' : ''}${m}월은 ${days}일까지 있어요.` };
    const s = Lunar.fromYmd(y, leap ? -m : m, d).getSolar();
    return { ok: true, y: s.getYear(), m: s.getMonth(), d: s.getDay() };
  } catch (e) { return { ok: false, msg: '날짜를 다시 확인해 주세요.' }; }
}
