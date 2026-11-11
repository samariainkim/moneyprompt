import type { Metadata } from 'next';

export const metadata: Metadata = { title: '페이지를 찾을 수 없어요', robots: { index: false } };

export default function NotFound() {
  return (
    <div className="card narrow" style={{ margin: '40px auto' }}>
      <h1>페이지를 찾을 수 없어요</h1>
      <p className="lead">주소가 바뀌었거나 없어진 페이지예요. 아래에서 원하는 곳으로 이동해 보세요.</p>
      <p style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <a className="btn" href="/">돈버프 홈으로</a>
        <a className="btn ghost" href="/calc/">금융계산기</a>
        <a className="btn ghost" href="/prompt/">프롬프트</a>
        <a className="btn ghost" href="/invest-mbti/">투자 성향 검사</a>
      </p>
    </div>
  );
}
