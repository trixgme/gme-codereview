# GME Code Review Bot

Bitbucket 커밋과 PR에 대한 자동 코드 리뷰 시스템입니다. OpenAI GPT-4를 사용하여 코드 변경사항을 분석하고 피드백을 제공합니다.

## 기능

- **자동 PR 리뷰**: Pull Request 생성/업데이트 시 자동으로 코드 리뷰
- **커밋 리뷰**: Push 이벤트 시 각 커밋에 대한 리뷰
- **상세한 피드백**: 버그, 보안 이슈, 성능 개선 사항 등 제안
- **Bitbucket 통합**: 리뷰 결과를 자동으로 코멘트로 추가

## 설정 방법

### 1. 환경 변수 설정

`.env` 파일을 생성하고 다음 변수들을 설정하세요:

```env
# OpenAI API Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Bitbucket Configuration
BITBUCKET_WORKSPACE=your_workspace_name
BITBUCKET_USERNAME=your_bitbucket_username
BITBUCKET_APP_PASSWORD=your_bitbucket_app_password

# Webhook Secret (optional but recommended)
WEBHOOK_SECRET=your_webhook_secret_here

# Server Configuration
PORT=3000
NODE_ENV=production
```

### 2. Bitbucket App Password 생성

1. Bitbucket 계정 설정으로 이동
2. Personal settings > App passwords
3. Create app password
4. 필요한 권한 선택:
   - Repositories: Read, Write
   - Pull requests: Read, Write
   - Webhooks: Read, Write

### 3. Vercel 배포

```bash
# Vercel CLI 설치 (아직 설치하지 않은 경우)
npm i -g vercel

# 배포
vercel

# 환경 변수 설정
vercel env add OPENAI_API_KEY
vercel env add BITBUCKET_WORKSPACE
vercel env add BITBUCKET_USERNAME
vercel env add BITBUCKET_APP_PASSWORD
vercel env add WEBHOOK_SECRET
```

### 4. Bitbucket Webhook 설정

1. Bitbucket 저장소 설정으로 이동
2. Repository settings > Webhooks
3. Add webhook
4. 설정:
   - Title: Code Review Bot
   - URL: `https://your-vercel-app.vercel.app/webhook/bitbucket`
   - Triggers:
     - Repository: Push
     - Pull Request: Created, Updated

## API 엔드포인트

- `GET /` - API 정보
- `GET /health` - 헬스체크
- `POST /webhook/bitbucket` - Bitbucket webhook 수신

## 로컬 개발

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

## 보안 고려사항

- 환경 변수는 절대 Git에 커밋하지 마세요
- Webhook Secret을 사용하여 요청을 검증하세요
- HTTPS를 통해서만 webhook을 수신하세요
- API 키와 앱 패스워드는 안전하게 관리하세요

## 문제 해결

### 리뷰가 게시되지 않는 경우
1. Bitbucket App Password 권한 확인
2. 환경 변수가 올바르게 설정되었는지 확인
3. Vercel 로그에서 오류 메시지 확인

### OpenAI API 오류
1. API 키가 유효한지 확인
2. API 사용량 한도 확인
3. 네트워크 연결 상태 확인

## 라이선스

ISC