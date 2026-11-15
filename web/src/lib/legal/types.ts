/** 약관·방침 본문 데이터: 문단(p)·번호 목록(ol)·점 목록(ul). 화면(목차·조항)은 이 데이터로 그린다. */
export type Block = { t: 'p'; x: string } | { t: 'ol'; items: string[] } | { t: 'ul'; items: string[] } | { t: 'h3'; x: string };
export type Section = { id: string; title: string; blocks: Block[] };
export type LegalDocData = { title: string; effective: string; intro?: Block[]; sections: Section[] };
