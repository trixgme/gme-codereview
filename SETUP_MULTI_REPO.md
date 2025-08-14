# 🚀 다중 저장소 설정 가이드

## 1. 환경변수 설정 (.env)

### 기본 Workspace (gmeremittance)
```bash
# 이미 설정됨
BITBUCKET_WORKSPACE=gmeremittance
BITBUCKET_USERNAME=trixh
BITBUCKET_APP_PASSWORD=ATBBqpXVbar4YCvtCgBqrLmhha5q404DCBA3
```

### 추가 Workspace 설정 (필요시)
`.env` 파일에서 주석을 해제하고 실제 값으로 변경:

```bash
# 두 번째 Workspace
BITBUCKET_WORKSPACE_2=another-workspace
BITBUCKET_USERNAME_2=another-username
BITBUCKET_APP_PASSWORD_2=another-app-password

# 세 번째 Workspace
BITBUCKET_WORKSPACE_3=third-workspace
BITBUCKET_USERNAME_3=third-username
BITBUCKET_APP_PASSWORD_3=third-app-password
```

## 2. 저장소별 설정 (`src/config/repositories.js`)

현재 설정된 저장소들:

### GME 프로젝트 저장소
- **gme-frontend**: React/TypeScript 프론트엔드
- **gme-backend**: API 서버
- **gme-admin**: 관리자 대시보드
- **gme-mobile**: React Native 모바일 앱
- **gme-codereview**: 이 코드 리뷰 봇

각 저장소는 맞춤형 리뷰 설정이 적용됩니다.

## 3. Bitbucket Webhook 추가 방법

### 각 저장소에 Webhook 추가하기:

1. **Bitbucket 저장소로 이동**
   ```
   https://bitbucket.org/gmeremittance/[저장소명]
   ```

2. **Repository settings → Webhooks → Add webhook**

3. **설정 입력**:
   - **Title**: `GME Code Review Bot`
   - **URL**: `https://gme-codereview.vercel.app/webhook/bitbucket`
   - **Triggers** 선택:
     - ✅ Repository → Push
     - ✅ Pull Request → Created
     - ✅ Pull Request → Updated
     - ✅ Pull Request → Approved (선택)
     - ✅ Pull Request → Unapproved (선택)

4. **Save** 클릭

## 4. 지원되는 저장소 목록

### 현재 설정된 저장소들 (총 30개):

#### 📱 모바일 앱
| 저장소 | 리뷰 포커스 | 특별 관리 사항 |
|--------|-------------|--------------|
| gmeios | Swift, iOS 가이드라인, 메모리 | Pods, DerivedData 제외 |
| gmeandroid | Kotlin, Material Design, ANR | gradle, build 제외 |
| mobile | Cross-platform, 반응형 | assets, build 제외 |

#### 🎯 코어 서비스
| 저장소 | 리뷰 포커스 | 특별 관리 사항 |
|--------|-------------|--------------|
| core | 비즈니스 로직, 시스템 안정성 | 아키텍처 검토 |
| database | SQL injection, 쿼리 최적화 | 트랜잭션 관리 |
| online-service | API 응답시간, 가용성 | Rate limiting |

#### 🏦 뱅킹 파트너
| 저장소 | 리뷰 포커스 | 특별 관리 사항 |
|--------|-------------|--------------|
| alifbank_v2 | 뱅킹 규정, 트랜잭션 보안 | 컴플라이언스 |
| sacombank | 뱅킹 보안, API 호환성 | 컴플라이언스 |
| kbank-service | 서비스 신뢰성, API 보안 | 트랜잭션 처리 |
| bracbank | 보안 프로토콜, 데이터 프라이버시 | 컴플라이언스 |
| kbank | 뱅킹 통합, 트랜잭션 처리 | API 신뢰성 |

#### 💰 결제 서비스
| 저장소 | 리뷰 포커스 | 특별 관리 사항 |
|--------|-------------|--------------|
| sendmn-billpayment | 결제 처리, 청구 검증 | 트랜잭션 무결성 |
| schedulepaymentsvc | 결제 스케줄링, 보안 | 스케줄 신뢰성 |
| paysend_outbound | 결제 보안, 발신 검증 | 트랜잭션 추적 |
| payform_outbound | 결제 검증, API 계약 | 에러 처리 |

#### 🔐 인증 & 보안
| 저장소 | 리뷰 포커스 | 특별 관리 사항 |
|--------|-------------|--------------|
| gmehom-auth | 인증 보안, 토큰 관리 | 세션 처리, 권한 체크 |
| gmehom-finance | 금융 계산, 컴플라이언스 | 감사 추적 |

#### 🔌 통합 서비스
| 저장소 | 리뷰 포커스 | 특별 관리 사항 |
|--------|-------------|--------------|
| zalo-api | Zalo 통합, API 인증 | 메시지 처리 |
| e4net-api | E4Net 통합, 데이터 매핑 | API 보안 |

#### ⏰ 스케줄러 & 동기화
| 저장소 | 리뷰 포커스 | 특별 관리 사항 |
|--------|-------------|--------------|
| inboundscheduler | 스케줄링 정확도, 큐 관리 | 작업 신뢰성 |
| statussynchronize_v2 | 데이터 동기화, 일관성 | 충돌 해결 |

#### 🌐 웹 & 포털
| 저장소 | 리뷰 포커스 | 특별 관리 사항 |
|--------|-------------|--------------|
| gme-frontend | React, TypeScript, 접근성 | 성능 최적화 |
| gme-backend | API 설계, 보안, 데이터베이스 | SQL injection |
| gme-admin | 권한 체크, 관리자 보안 | 데이터 유출 방지 |
| partner_portal_upgrade | 파트너 인증, UX | 포털 보안 |

#### 📊 모니터링 & 기타
| 저장소 | 리뷰 포커스 | 특별 관리 사항 |
|--------|-------------|--------------|
| gme-monitor | 모니터링 정확도, 알림 | 대시보드 최적화 |
| kt-promotion | 프로모션 로직, 검증 규칙 | 캠페인 관리 |
| galaxia | API 설계, 성능 최적화 | 핵심 기능 |
| gme-codereview | 웹훅 처리, API 통합 | 로깅 |

## 5. 새 저장소 추가하기

### Step 1: `src/config/repositories.js` 수정
```javascript
'새-저장소-이름': {
  enableReview: true,
  reviewTypes: ['bug', 'security', 'performance'],
  focusAreas: ['특별히 주의할 점'],
  skipPaths: ['제외할 폴더/']
}
```

### Step 2: Bitbucket에서 Webhook 추가
위의 "Bitbucket Webhook 추가 방법" 참조

### Step 3: 배포
```bash
git add .
git commit -m "feat: Add new repository configuration"
git push origin main
```

## 6. 테스트 방법

### 로컬 테스트
```bash
# 서버 실행
npm run dev

# 테스트 webhook 전송
node test-bitbucket-webhook.js
```

### 실제 테스트
1. 설정한 저장소에 테스트 커밋 푸시
2. Vercel 로그 확인
3. Bitbucket에서 코멘트 확인

## 7. 문제 해결

### Webhook이 작동하지 않을 때
1. **Vercel 로그 확인**
   - Vercel Dashboard → Functions → Logs

2. **환경변수 확인**
   - Vercel Dashboard → Settings → Environment Variables

3. **Webhook URL 확인**
   - `https://` 프로토콜 사용
   - 마지막에 `/` 없음

### 특정 저장소만 리뷰가 안 될 때
1. **저장소 이름 확인**
   - Bitbucket의 정확한 저장소 이름 사용
   - 대소문자 구분

2. **설정 확인**
   - `src/config/repositories.js`에서 `enableReview: true` 확인

## 8. 고급 설정

### 글로벌 설정 (.env)
```bash
# 최대 파일 크기 (바이트)
MAX_FILE_SIZE=500000

# 리뷰당 최대 파일 수
MAX_FILES_PER_REVIEW=20

# 제외할 확장자
SKIP_EXTENSIONS=.min.js,.min.css,.lock

# 제외할 경로
SKIP_PATHS=node_modules/,dist/,build/
```

### 커스텀 프롬프트
```bash
# 보안 중심 리뷰
CUSTOM_PROMPT_SECURITY=SQL injection, XSS, 인증 이슈 중점 검토

# 성능 중심 리뷰
CUSTOM_PROMPT_PERFORMANCE=N+1 쿼리, 메모리 누수, 비효율적 알고리즘 검토
```

## 9. 모니터링

### 로그 확인 (로컬)
```bash
# 로그 상태 확인
./check-logs.sh

# 특정 날짜 로그 보기
curl http://localhost:3002/logs?date=2025-08-14
```

### Vercel 대시보드
- Real-time logs
- Function metrics
- Error tracking

## 10. 연락처

문제가 있거나 도움이 필요하면:
- GitHub Issues: https://github.com/trixgme/gme-codereview/issues
- 담당자: [담당자 이메일]

---

## 체크리스트

### 초기 설정
- [ ] `.env` 파일 생성 및 설정
- [ ] OpenAI API 키 설정
- [ ] Bitbucket App Password 생성
- [ ] Vercel 배포

### 각 저장소별
- [ ] Webhook URL 추가
- [ ] Triggers 선택
- [ ] 테스트 커밋으로 동작 확인
- [ ] 리뷰 코멘트 확인

### 운영
- [ ] 정기적인 로그 확인
- [ ] API 사용량 모니터링
- [ ] 에러 발생 시 대응