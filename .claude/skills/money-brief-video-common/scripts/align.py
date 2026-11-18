#!/usr/bin/env python3
"""나레이션 음성의 쉼(pauses.json)과 대본(video.json)을 맞춰 장면·자막 줄별 시간표(timeline.json)를 만든다.
사용: python3 align.py <video.json> <pauses.json> <timeline.json>

방법(장면별 음성이 따로 없을 때): 장면 경계를 먼저 찾고(긴 쉼 ≥0.6초 중에서 글자 수 비례로 고름), 장면 안에서 문구(쉼표·마침표 단위)를 맞춘다.
- 한국어 TTS 는 일정한 속도(약 6~8음절/초)로 읽고 문장부호에서 쉬므로, "음절 수 ÷ 속도 ≈ 발화 시간" 모델로 동적계획법(DP)을 푼다.
- 장면 안 맞춤 비용이 크면(음절당 3 초과) 그 장면은 uncertain=true 로 표시하고 줄별 시간을 비례 배분 + 가까운 쉼에 붙이는 방식으로 대신한다.
- 결과의 uncertain 장면은 사용자에게 "장면별 음성을 주시면 정확해진다"고 알린다.
video.json: {"scenes":[{"id","name","visual","lines":[{"tts":"읽는 문장(소리 나는 대로)","sub":"화면 자막(\\n 줄바꿈)"}]}]}"""
import json, re, sys

INF = 1e18
syl = lambda t: len(re.findall(r'[가-힣]', t))


def main():
    if len(sys.argv) < 4:
        raise SystemExit(__doc__)
    vj, pj, out = sys.argv[1:4]
    bounds = json.load(open(sys.argv[sys.argv.index('--bounds') + 1], encoding='utf-8')) if '--bounds' in sys.argv else None
    V = json.load(open(vj, encoding='utf-8'))
    P = json.load(open(pj))
    sil, first, last = [tuple(x) for x in P['sil']], P['first'], P['last']

    def inner(t0, t1):
        return sum(max(0, min(b, t1) - max(a, t0)) for a, b in sil)

    scenes = V['scenes']
    sc_text = [' '.join(l['tts'] for l in s['lines']) for s in scenes]
    tot = sum(syl(t) for t in sc_text)
    r = tot / ((last - first) - inner(first, last))
    print(f'장면 {len(scenes)}개, 음절 {tot}, 평균 속도 {r:.2f} 음절/초')

    def dp_align(items, cands, t0, t1, rate0=None, relative=False):
        """items=[(음절수, 끝문자)] → 각 항목의 (시작,끝). 후보 쉼 cands 중에서 경계를 고른다."""
        m, k = len(items), len(cands)
        rr = rate0 or r

        def span(i, j):
            a0 = t0 if i < 0 else cands[i][1]
            b0 = t1 if j >= k else cands[j][0]
            return (b0 - a0) - inner(a0, b0)

        def cost(i, pj, j):
            s = items[i][0]
            e = s / rr
            sp = span(pj, j)
            if sp <= 0.05:
                return INF
            rate = s / sp
            c = ((sp - e) / max(e, 0.6)) ** 2 * s
            lo, hi = (0.6 * rr, 1.6 * rr) if relative else (5.0, 9.6)
            if rate > hi or rate < lo:
                c += 40 + abs(rate - rr) * 40
            if j < k:
                pl = cands[j][1] - cands[j][0]
                end = items[i][1]
                c += max(0, 0.3 - pl) * 15 if end in '.?!' else max(0, 0.14 - pl) * 15
            return c

        dp = [[INF] * (k + 1) for _ in range(m)]
        bk = [[None] * (k + 1) for _ in range(m)]
        for j in range(k + 1):
            if (m == 1) != (j == k):
                continue
            dp[0][j] = cost(0, -1, j)
        for i in range(1, m):
            for j in range(k + 1):
                if (i == m - 1) != (j == k):
                    continue
                for pj in range(0, (j if j < k else k)):
                    if dp[i - 1][pj] >= INF:
                        continue
                    c = dp[i - 1][pj] + cost(i, pj, j)
                    if c < dp[i][j]:
                        dp[i][j], bk[i][j] = c, pj
        if dp[m - 1][k] >= INF:
            return None, INF
        j, ends = k, [0] * m
        for i in range(m - 1, -1, -1):
            ends[i] = j
            j = bk[i][j] if i > 0 else None
        res, prev = [], t0
        for i in range(m):
            e = ends[i]
            et = t1 if e >= k else cands[e][0]
            res.append((prev, et))
            prev = t1 if e >= k else cands[e][1]
        return res, dp[m - 1][k]

    # 1) 장면 경계: 긴 쉼(≥0.6초)
    big = [(a, b) for a, b in sil if b - a >= 0.6]
    if bounds:   # 장면별 음성을 이어 붙였을 때(concat_scenes.py)는 장면 경계가 정확히 알려져 있다
        bm = {x['id']: (x['start'], x['end']) for x in bounds['scenes']}
        sc_spans, c1 = [bm[s['id']] for s in scenes], 0.0
    else:
        sc_spans, c1 = dp_align([(syl(t), '.') for t in sc_text], big, first, last)
    if sc_spans is None:
        raise SystemExit('장면 경계를 찾지 못했습니다. 긴 쉼이 장면 수만큼 있는지(analyze_audio 의 0.6초 이상 쉼) 확인하세요. 장면별 음성 파일이 있으면 그 길이를 쓰는 편이 정확합니다.')
    print(f'장면 경계 비용 {c1:.1f}')
    lines_out, scenes_out = [], []
    for s, (a, b) in zip(scenes, sc_spans):
        pz = [(x, y) for x, y in sil if x > a and y < b]
        # 줄 → 문구 분해(쉼표·마침표·물음표)
        phr, owner = [], []
        for li, l in enumerate(s['lines']):
            for p in [p.strip() for p in re.findall(r'[^,.?!]+[,.?!]?', l['tts']) if p.strip()]:
                phr.append((syl(p), p[-1]))
                owner.append(li)
        sylsum = max(1, sum(x[0] for x in phr))
        r_loc = sylsum / max(0.5, (b - a) - inner(a, b))   # 장면 안에서는 그 장면의 실제 속도를 기준으로 맞춘다
        sp, c = dp_align(phr, pz, a, b, r_loc, relative=True)
        uncertain = sp is None or (c / sylsum) > 3.0
        nl = len(s['lines'])
        line_t = [None] * nl
        if not uncertain:
            for (st, en), li in zip(sp, owner):
                line_t[li] = (st, en) if line_t[li] is None else (line_t[li][0], en)
        else:
            segs, cur = [], a
            for x, y in pz:
                segs.append((cur, x))
                cur = y
            segs.append((cur, b))
            tot_sp = sum(e - s_ for s_, e in segs)
            w = [max(1, syl(l['tts'])) for l in s['lines']]
            W, cum, bd = sum(w), 0, []

            def t_at(spv):
                rem = spv
                for s_, e in segs:
                    if rem <= e - s_:
                        return s_ + rem
                    rem -= e - s_
                return b
            for wi in w:
                cum += wi
                bd.append(t_at(cum / W * tot_sp))
            # 경계를 가까운 쉼(≥0.4초)에 붙이되, 줄 하나가 0.6초보다 짧아지면 붙이지 않는다
            sn = []
            for t in bd[:-1]:
                cnd = [(abs(x - t), x, y) for x, y in pz if y - x >= 0.6 and abs(x - t) <= 1.8]
                cnd = cnd or [(abs(x - t), x, y) for x, y in pz if y - x >= 0.4 and abs(x - t) <= 0.8]
                sn.append(min(cnd)[1:] if cnd else (t, t))
            for _ in range(2):
                for i in range(len(sn)):
                    prev_start = a if i == 0 else sn[i - 1][1]
                    nxt_end = b if i == len(sn) - 1 else sn[i + 1][0]
                    if sn[i][0] - prev_start < 0.6 or nxt_end - sn[i][1] < 0.6:
                        sn[i] = (bd[i], bd[i])
            starts = [a] + [x[1] for x in sn]
            ends = [x[0] for x in sn] + [b]
            line_t = list(zip(starts, ends))
        scenes_out.append({'id': s['id'], 'start': round(a, 2), 'end': round(b, 2), 'uncertain': uncertain, 'cost_per_syl': round(c / sylsum, 3) if sp else None})
        for li, l in enumerate(s['lines']):
            lines_out.append({'scene': s['id'], 'a': round(line_t[li][0], 2), 'b': round(line_t[li][1], 2), 'text': l['sub'], 'uncertain': uncertain})
        print(f"  {s['id']:4s} {a:7.2f}-{b:7.2f}  {'추정(uncertain)' if uncertain else '정확'}")
    json.dump({'speech_first': first, 'speech_last': last, 'scenes': scenes_out, 'lines': lines_out}, open(out, 'w'), ensure_ascii=False, indent=1)
    unc = [s['id'] for s in scenes_out if s['uncertain']]
    print('→', out, '| 추정 장면:', ', '.join(unc) if unc else '없음')


if __name__ == '__main__':
    main()
