import Link from 'next/link';
import { signOut } from '@/app/actions';
import { rdPageOn } from '@/lib/redesign';
import { coreNav, hotIssue, megaInnerHtml, mobileListHtml, footerHtml } from '../../../redesign/shared/chrome.mjs';
import menu from '../../../redesign/data/menu.json';

/** 새 디자인의 공통 헤더 — web/redesign/partials/header.html 과 같은 구조(frame.css·frame.js 가 동작을 맡는다). */
export function RdHeader({ signedIn, nickname, email }: { signedIn: boolean; nickname?: string; email?: string }) {
  const who = nickname || (email ? email.split('@')[0] : '회원');
  // 메뉴는 menu.json 하나로 만든다(정적 페이지와 같은 함수) — 이 환경에서 꺼진 페이지는 자동으로 빠진다.
  const core = coreNav(menu, rdPageOn);
  const hot = hotIssue(menu, rdPageOn);
  return (
    <>
      <header className="hdr over">
        <div className="wrap">
          <a className="logo" href="/"><img src="/redesign/img/logo.png" alt="돈버프 DONBUFF" /></a>
          <nav className="pc" aria-label="주 메뉴">
            {core.map((c) => <a key={c.id} className="core" href={c.href} data-nav={c.id}>{c.label}</a>)}
            {hot && <a className="hot" href={hot.href} data-ga="menu_hot"><i aria-hidden="true" />{hot.label}</a>}
            <button type="button" className="nav-all" id="megaBtn" aria-expanded="false" aria-controls="megaPanel"><span className="bgr" aria-hidden="true" />전체 메뉴</button>
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
        <div className="mega-dim" id="megaDim" hidden />
        <div className="mega" id="megaPanel" aria-label="전체 메뉴" hidden dangerouslySetInnerHTML={{ __html: megaInnerHtml(menu, rdPageOn) }} />
      </header>
      <div className="mm" id="menuPanel" role="dialog" aria-modal="true" aria-label="전체 메뉴" hidden>
        <div className="top"><a className="logo" href="/"><img src="/redesign/img/logo.png" alt="돈버프" /></a><button className="x" type="button" id="menuClose" aria-label="메뉴 닫기">✕</button></div>
        <div dangerouslySetInnerHTML={{ __html: mobileListHtml(menu, rdPageOn) }} />
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
      <div dangerouslySetInnerHTML={{ __html: footerHtml(menu, rdPageOn) }} />
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
