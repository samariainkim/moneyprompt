#!/usr/bin/env python3
"""DSR 엔진 독립 검산용 기준값 생성기. 엔진(JS BigInt 닫힌 식)과 다른 방식(파이썬 Decimal, 원금균등은 12개월을 직접 합산)으로 계산한다.
사용: python3 calc/tests/dsr_vectors_gen.py > calc/tests/dsr-vectors.json"""
import json, itertools
from decimal import Decimal as D, getcontext, ROUND_FLOOR
getcontext().prec = 80

def cap(income, rate_pct, years, rep, dsr=D('0.4')):
    A = (D(income) * dsr).to_integral_value(ROUND_FLOOR)       # 연 상환 여력(원 미만 절사)
    r = D(rate_pct) / 100 / 12
    n = years * 12
    if rep == 'annuity':
        if r == 0: L = A * n / 12
        else: L = A / 12 * (1 - (1 + r) ** (-n)) / r
    else:  # 원금균등: 첫 12개월 실제 상환액(원금 L/n + 남은 원금 이자)을 직접 합산해 원금 1원당 값 산출
        f = D(0)
        for k in range(12):
            f += D(1) / n + (1 - D(k) / n) * r
        L = A / f
    return int(L.to_integral_value(ROUND_FLOOR))

STRESS = {('mortgage', 'metro'): D('3.00'), ('mortgage', 'non_metro'): D('0.75'), ('credit', None): D('1.50')}
out = []
for income, rate, years, rep in itertools.product([30000000, 60000000, 100000000, 287654321], ['2.5', '4.2', '5.75'], [10, 30, 40], ['annuity', 'principal_equal']):
    for typ, region in [('mortgage', 'metro'), ('mortgage', 'non_metro')]:
        st = STRESS[(typ, region)]
        out.append({'incomeKrw': income, 'loanType': typ, 'region': region, 'repayment': rep, 'ratePercent': rate, 'years': years, 'asOf': '2026-11-17',
                    'limit_no_stress_krw': cap(income, D(rate), years, rep), 'limit_with_stress_krw': cap(income, D(rate) + st, years, rep)})
print(json.dumps(out, ensure_ascii=False, indent=0))
