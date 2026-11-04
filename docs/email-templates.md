# 인증 메일 템플릿 (한국어)

Supabase 대시보드 → **Authentication → Emails → Templates** 에서 각 항목의 **Subject**(제목)와 **Message body**(본문)에 붙여넣습니다.
영어 메일은 네이버 등 일부 메일 서비스의 "영어 메일 스팸 분류" 설정에 걸릴 수 있어, 모든 템플릿을 한국어로 맞춰 둡니다.

사용 변수: `{{ .ConfirmationURL }}`(확인 링크), `{{ .Token }}`(6자리 코드), `{{ .Email }}`, `{{ .NewEmail }}`

---

## 1. Confirm signup (회원가입 인증) — 적용 완료

**Subject**
```
[돈버프] 이메일 인증을 완료해 주세요
```

**Message body**
```html
<p>안녕하세요, 돈버프입니다.</p>
<p>돈버프 회원가입을 요청하셨어요. 아래 버튼을 눌러 이메일 인증을 완료해 주세요.</p>
<p><a href="{{ .ConfirmationURL }}">이메일 인증하기</a></p>
<p>버튼이 보이지 않으면 아래 주소를 브라우저에 붙여넣어 주세요.<br>{{ .ConfirmationURL }}</p>
<p>본인이 요청하지 않았다면 이 메일을 무시하셔도 됩니다.</p>
<p>돈버프 · donbuff.com</p>
```

## 2. Reset password (비밀번호 재설정) — 이번 기능에서 사용

**Subject**
```
[돈버프] 비밀번호 재설정 안내
```

**Message body**
```html
<p>안녕하세요, 돈버프입니다.</p>
<p>비밀번호 재설정을 요청하셨어요. 아래 버튼을 눌러 새 비밀번호를 정해 주세요.</p>
<p><a href="{{ .ConfirmationURL }}">비밀번호 재설정하기</a></p>
<p>버튼이 보이지 않으면 아래 주소를 브라우저에 붙여넣어 주세요.<br>{{ .ConfirmationURL }}</p>
<p>링크는 요청하신 브라우저에서 열어야 하고, 일정 시간이 지나면 만료돼요.</p>
<p>본인이 요청하지 않았다면 이 메일을 무시하셔도 됩니다. 비밀번호는 바뀌지 않아요.</p>
<p>돈버프 · donbuff.com</p>
```

## 3. Change Email Address (이메일 변경)

**Subject**
```
[돈버프] 이메일 변경을 확인해 주세요
```

**Message body**
```html
<p>안녕하세요, 돈버프입니다.</p>
<p>이메일 주소를 {{ .Email }} 에서 {{ .NewEmail }} 로 변경하도록 요청하셨어요. 아래 버튼을 눌러 변경을 확인해 주세요.</p>
<p><a href="{{ .ConfirmationURL }}">이메일 변경 확인하기</a></p>
<p>본인이 요청하지 않았다면 이 메일을 무시하시고, 비밀번호를 바꿔 주세요.</p>
<p>돈버프 · donbuff.com</p>
```

## 4. Magic Link (로그인 링크) — 현재 앱에서는 사용하지 않음

**Subject**
```
[돈버프] 로그인 링크를 보내드려요
```

**Message body**
```html
<p>안녕하세요, 돈버프입니다.</p>
<p>아래 버튼을 누르면 로그인돼요.</p>
<p><a href="{{ .ConfirmationURL }}">로그인하기</a></p>
<p>본인이 요청하지 않았다면 이 메일을 무시하셔도 됩니다.</p>
<p>돈버프 · donbuff.com</p>
```

## 5. Invite user (초대) — 현재 앱에서는 사용하지 않음

**Subject**
```
[돈버프] 초대가 도착했어요
```

**Message body**
```html
<p>안녕하세요, 돈버프입니다.</p>
<p>돈버프에 초대되셨어요. 아래 버튼을 눌러 가입을 완료해 주세요.</p>
<p><a href="{{ .ConfirmationURL }}">초대 수락하기</a></p>
<p>돈버프 · donbuff.com</p>
```

## 6. Reauthentication (본인 확인) — 현재 앱에서는 사용하지 않음

**Subject**
```
[돈버프] 본인 확인 코드
```

**Message body**
```html
<p>안녕하세요, 돈버프입니다.</p>
<p>본인 확인 코드는 아래와 같아요.</p>
<p><b>{{ .Token }}</b></p>
<p>본인이 요청하지 않았다면 이 메일을 무시하셔도 됩니다.</p>
<p>돈버프 · donbuff.com</p>
```

---

## 참고
- 인증 링크는 현재 `…supabase.co/auth/v1/verify?…` 주소를 거쳐 돌아옵니다. 발신 도메인(`donbuff.com`)과 달라 신뢰도에 다소 불리할 수 있어, 도메인 전환 시 링크를 자체 도메인으로 바꾸는 작업을 함께 검토합니다.
- 비밀번호 재설정 링크는 **요청한 브라우저와 같은 브라우저**에서 열어야 합니다(PKCE 방식).
