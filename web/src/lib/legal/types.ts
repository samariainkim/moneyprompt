/** 약관·방침 본문 데이터: 문단(p)·번호 목록(ol)·점 목록(ul)·소제목(h3·h4)·표(table). 화면(목차·조항)은 이 데이터로 그린다. */
export type Block =
  | { t: 'p'; x: string }
  | { t: 'ol'; items: string[] }
  | { t: 'ul'; items: string[] }
  | { t: 'h3'; x: string }
  | { t: 'h4'; x: string }
  | { t: 'table'; head: string[]; rows: string[][] };
export type Section = { id: string; title: string; blocks: Block[] };
/** highlightBrackets: 대괄호([ ])로 적힌 '운영자가 확정할 항목'을 눈에 띄게 표시한다. */
export type LegalDocData = { title: string; effective: string; intro?: Block[]; sections: Section[]; highlightBrackets?: boolean };
