import Link from 'next/link';
import { signOut } from '@/app/actions';
import { rdPageOn } from '@/lib/redesign';

/** 새 디자인의 공통 헤더 — web/redesign/partials/header.html 과 같은 구조(frame.css·frame.js 가 동작을 맡는다). */
export function RdHeader({ signedIn, nickname, email }: { signedIn: boolean; nickname?: string; email?: string }) {
  const who = nickname || (email ? email.split('@')[0] : '회원');
  const brief = rdPageOn('/brief/'); // /brief/ 가 켜진 환경에서만 메뉴를 보여 준다
  return (
    <>
      <header className="hdr over">
        <div className="wrap">
          <a className="logo" href="/"><img src="/redesign/img/logo.png" alt="돈버프 DONBUFF" /></a>
          <nav className="pc" aria-label="주 메뉴">
            <a href="/prompt/" data-nav="prompt">돈 버는 프롬프트</a>
            <a href="/invest-mbti/" data-nav="invest">나의 투자성향 찾기</a>
            <div className="dd" id="ddCalc">
              <button type="button" aria-expanded="false" aria-controls="ddCalcPanel" data-dd="ddCalc">금융계산기 <span style={{ fontSize: 11 }} aria-hidden="true">▾</span></button>
              <div className="panel" id="ddCalcPanel">
                <a href="/calc/brokerage/"><span className="ic" aria-hidden="true">🏠</span><div><b>부동산 중개보수</b><small>거래 금액으로 상한 보수 계산</small></div></a>
                <a href="/calc/loan-prepay/"><span className="ic" aria-hidden="true">🏦</span><div><b>대출 중도상환</b><small>중도상환수수료 추정</small></div></a>
                <a href="/calc/fx/"><span className="ic" aria-hidden="true">💱</span><div><b>환전수수료</b><small>환율 우대율별 예상 차액</small></div></a>
                <hr /><a className="all" href="/calc/" data-ga="nav">금융계산기 전체 보기 <span aria-hidden="true">→</span></a>
              </div>
            </div>
            {brief && <a href="/brief/" data-nav="brief" data-ga="brief">MONEY BRIEF</a>}
            {signedIn ? (
              <div className="dd right" id="ddAcc">
                <button type="button" className="acc-btn" aria-expanded="false" aria-controls="ddAccPanel" data-dd="ddAcc">내 계정 <span style={{ fontSize: 11 }} aria-hidden="true">▾</span></button>
                <div className="panel acc-panel" id="ddAccPanel">
                  <div className="who"><b>{who} 님</b>{email && <small>{email}</small>}</div>
                  <hr />
                  <Link href="/account/saved/">내 결과 <span aria-hidden="true">→</span></Link>
                  <a href="/prompt/?fav=1">즐겨찾기 프롬프트 <span aria-hidden="true">→</span></a>
                  <Link href="/account/#p">프로필·관심 설정 <span aria-hidden="true">→</span></Link>
                  <Link href="/account/">마이페이지 <span aria-hidden="true">→</span></Link>
                  <hr />
                  <form action={signOut}><button type="submit" className="out">로그아웃</button></form>
                </div>
              </div>
            ) : (
              <Link className="login" href="/login/">로그인</Link>
            )}
          </nav>
          <button className="burger" type="button" id="menuBtn" aria-label="메뉴 열기" aria-expanded="false" aria-controls="menuPanel">☰</button>
        </div>
      </header>
      <div className="mm" id="menuPanel" role="dialog" aria-modal="true" aria-label="전체 메뉴" hidden>
        <div className="top"><a className="logo" href="/"><img src="/redesign/img/logo.png" alt="돈버프" /></a><button className="x" type="button" id="menuClose" aria-label="메뉴 닫기">✕</button></div>
        <a className="big" href="/prompt/">돈 버는 프롬프트 <span aria-hidden="true">→</span></a>
        <a className="big" href="/invest-mbti/">나의 투자성향 찾기 <span aria-hidden="true">→</span></a>
        <a className="big" href="/calc/" data-ga="menu" style={{ borderBottom: 0 }}>금융계산기 <span aria-hidden="true">→</span></a>
        <div className="sub"><a href="/calc/brokerage/">🏠 부동산 중개보수</a><a href="/calc/loan-prepay/">🏦 대출 중도상환</a><a href="/calc/fx/">💱 환전수수료</a></div>
        {brief && <a className="big" href="/brief/" data-ga="brief" style={{ borderBottom: 0 }}>MONEY BRIEF <span aria-hidden="true">→</span></a>}
        {signedIn ? (
          <div className="acc" style={{ marginTop: 22 }}>
            <small>{who} 님</small>
            <div className="row"><Link href="/account/">마이페이지</Link><Link href="/account/saved/">내 결과</Link></div>
            <form action={signOut}><button type="submit" className="mm-out">로그아웃</button></form>
          </div>
        ) : (
          <Link className="mm-login" href="/login/">로그인</Link>
        )}
      </div>
    </>
  );
}

export function RdFooter() {
  return (
    <>
      <div className="closing"><img src="/redesign/img/logo.png" alt="DONBUFF 오늘보다 돈을 잘 다루는 나로 +1" /></div>
      <footer>
        <div className="fb"><img src="/redesign/img/symbol.png" alt="" />돈버프 (DONBUFF)</div>
        <p>『AI로 부자되기』 | 저자 김태형(사마리아인)<br />
          <a href="https://donbuff.com" target="_blank" rel="noopener">donbuff.com</a> &nbsp;·&nbsp;{' '}
          <a href="https://www.youtube.com/@samariaintv" target="_blank" rel="noopener">사마리아인TV</a> &nbsp;·&nbsp;{' '}
          <a href="/calc/">돈버프 금융계산기</a> &nbsp;·&nbsp;{' '}
          <a href="https://open.kakao.com/o/g2JnL4Ai" target="_blank" rel="noopener">독자 오픈채팅방</a> &nbsp;·&nbsp;{' '}
          <a href="mailto:samariain.kim@gmail.com">✉️ 협업·강연 문의</a></p>
        <p className="note">금융계산기 결과는 참고용이며, 최종 의사결정은 이용자 본인에게 있습니다.</p>
        <p className="note"><Link href="/terms/">이용약관</Link> &nbsp;·&nbsp; <Link href="/privacy/">개인정보처리방침</Link></p>
      </footer>
    </>
  );
}

/** 로그인·가입처럼 가운데 카드 한 장으로 보여 주는 화면의 틀 */
export function RdAuthCard({ kicker, title, lead, wide = false, children }: { kicker: string; title: string; lead?: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <section className="hero-s">
      <div className={wide ? 'auth wide' : 'auth'}>
        <div className="acard">
          <div className="kicker">{kicker}</div>
          <h1>{title}</h1>
          {lead && <p className="l">{lead}</p>}
          {children}
        </div>
      </div>
    </section>
  );
}
