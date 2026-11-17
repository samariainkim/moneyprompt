#!/usr/bin/env python3
"""계산 엔진(JS)의 결과를 엔진과 다른 방식(파이썬 Decimal/날짜 계산)으로 다시 계산해 비교한다(독립 검산).
build_cards.py 가 자동으로 부른다. 불일치하면 카드를 만들지 않는다.
지원: fx(wire·cash), loan. 지원하지 않는 항목은 건너뛰고 경고만 낸다."""
import json, os, glob, re, calendar, datetime
from decimal import Decimal as D, ROUND_FLOOR


def _latest_rules(root, prefix):
    fs = sorted(glob.glob(os.path.join(root, 'calc', 'data', f'{prefix}.rules.v*.json')),
                key=lambda p: [int(x) for x in re.findall(r'\d+', os.path.basename(p).split('.rules.v')[1])])
    return json.load(open(fs[-1], encoding='utf-8'))


def _add_months(d, n):
    t = d.year * 12 + d.month - 1 + n
    y, m = divmod(t, 12)
    m += 1
    return datetime.date(y, m, min(d.day, calendar.monthrange(y, m)[1]))


def check(root, calc, results):
    """returns (오류 목록, 경고 목록)"""
    errs, warns = [], []
    rates = json.load(open(os.path.join(root, 'calc', 'data', 'fx', 'rates.json'), encoding='utf-8'))
    rules_fx = _latest_rules(root, 'fx')
    for cid, c in calc.items():
        eng, r = c.get('engine'), results.get(cid)
        if eng == 'fx':
            i = c['input']
            e = rates['currencies'][i['currency']]
            base, tts, ttb, unit = D(e['base']), D(e['tts']), D(e['ttb']), D(e['unit'])
            pref = D(str(i['prefPercent'])) / 100
            if i['mode'] == 'wire':
                applied = base + (tts - base) * (1 - pref) if i['direction'] == 'out' else base - (base - ttb) * (1 - pref)
            else:
                side = 'buy' if i['direction'] == 'out' else 'sell'
                sp = D(rules_fx['cash_spread'][i['currency']][side]) / 100
                applied = base * (1 + sp * (1 - pref)) if i['direction'] == 'out' else base * (1 - sp * (1 - pref))
            total = int((D(i['amount']) / unit * applied).to_integral_value(ROUND_FLOOR))
            if total != r['total_krw']:
                errs.append(f"{cid}: 환전 결과 불일치 엔진 {r['total_krw']} ≠ 독립 계산 {total}")
        elif eng == 'loan':
            i = c['input']
            y, m, d = map(int, i['executionDate'].split('-'))
            ex = datetime.date(y, m, d)
            y, m, d = map(int, i['repaymentDate'].split('-'))
            rp = datetime.date(y, m, d)
            end = _add_months(ex, int(i['periodMonths']))
            tot = (end - ex).days
            rem = 0 if rp >= end else (end - rp).days
            fee = int((D(i['amountKrw']) * D(i['ratePercent']) / 100 * D(rem) / D(tot)).to_integral_value(ROUND_FLOOR))
            if fee != r['fee_krw']:
                errs.append(f"{cid}: 중도상환수수료 불일치 엔진 {r['fee_krw']} ≠ 독립 계산 {fee}")
        elif eng == 'savings':
            i = c['input']
            # 엔진은 닫힌 식, 여기서는 납입 회차마다 이자를 더하는 방식으로 다시 계산한다
            m, n, rate = D(str(i['monthlyKrw'])), int(i['months']), D(str(r['rate_percent'])) / 100
            tax = D(str(i.get('taxPercent', 15.4))) / 100
            pre = sum(m * rate * D(n - k + 1) / 12 for k in range(1, n + 1))
            pre_i = int(pre.to_integral_value(ROUND_FLOOR))
            tax_i = int((D(pre_i) * tax).to_integral_value(ROUND_FLOOR))
            if (pre_i, pre_i - tax_i) != (r['interest_pre'], r['interest_post']):
                errs.append(f"{cid}: 적금 이자 불일치 엔진 {r['interest_pre']}/{r['interest_post']} ≠ 독립 계산 {pre_i}/{pre_i - tax_i}")
        elif eng in ('fx_rate', 'loan_compare', 'const'):
            pass  # 환율 원본값, 위 loan 결과에서 파생된 값, 1차 자료 값
        else:
            warns.append(f"{cid}: '{eng}' 는 독립 검산을 지원하지 않습니다(수동 확인).")
    return errs, warns
