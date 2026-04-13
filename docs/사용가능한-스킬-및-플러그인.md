# ECC (Everything Claude Code) 스킬 목록

> 사용법: Claude Code에서 `/ecc:스킬명` 입력

---

## 코드 품질 / 리뷰

| 명령어             | 설명                                    |
| ------------------ | --------------------------------------- |
| `/ecc:code-review` | 로컬 변경 또는 GitHub PR 코드 리뷰      |
| `/ecc:review-pr`   | PR 전문 리뷰 (전문 에이전트 활용)       |
| `/ecc:santa-loop`  | 이중 독립 리뷰어 승인 루프              |
| `/ecc:simplify`    | 변경 코드 재사용/품질/효율 검토 후 수정 |
| `/ecc:verify`      | 완료 전 검증 루프                       |

## 계획 / 설계

| 명령어           | 설명                                       |
| ---------------- | ------------------------------------------ |
| `/ecc:plan`      | 요구사항 분석 → 단계별 구현 계획           |
| `/ecc:prp-plan`  | 코드베이스 분석 + 패턴 추출 기반 구현 계획 |
| `/ecc:prp-prd`   | 인터랙티브 PRD 생성기                      |
| `/ecc:blueprint` | 한 줄 목표 → 멀티 세션 공사 계획           |
| `/ecc:council`   | 4인 회의체로 모호한 결정 논의              |

## 개발 워크플로

| 명령어               | 설명                           |
| -------------------- | ------------------------------ |
| `/ecc:tdd`           | TDD 워크플로 (테스트 먼저)     |
| `/ecc:feature-dev`   | 가이드 기반 기능 개발          |
| `/ecc:prp-implement` | 계획 기반 구현 + 검증 루프     |
| `/ecc:prp-commit`    | 자연어로 커밋 대상 설명 → 커밋 |
| `/ecc:prp-pr`        | 현재 브랜치에서 PR 생성        |

## 에이전트 / 자동화

| 명령어                   | 설명                                   |
| ------------------------ | -------------------------------------- |
| `/ecc:orchestrate`       | 멀티 에이전트 오케스트레이션           |
| `/ecc:devfleet`          | 병렬 에이전트 디스패치 (worktree 격리) |
| `/ecc:loop`              | 반복 실행 (예: 5분마다 체크)           |
| `/ecc:schedule`          | 크론 스케줄 기반 원격 에이전트         |
| `/ecc:gan-style-harness` | GAN 스타일 Generator-Evaluator 루프    |

## 리서치 / 문서

| 명령어                     | 설명                                 |
| -------------------------- | ------------------------------------ |
| `/ecc:docs`                | 라이브러리 최신 문서 조회 (Context7) |
| `/ecc:deep-research`       | 멀티소스 딥 리서치                   |
| `/ecc:codebase-onboarding` | 코드베이스 분석 → 온보딩 가이드 생성 |
| `/ecc:exa-search`          | 웹/코드/회사 뉴럴 검색               |

## 보안

| 명령어                        | 설명                           |
| ----------------------------- | ------------------------------ |
| `/ecc:security-scan`          | `.claude/` 설정 보안 스캔      |
| `/ecc:security-review`        | 인증/입력/시크릿/API 보안 리뷰 |
| `/ecc:security-bounty-hunter` | 바운티급 취약점 헌팅           |

## 세션 / 메모리

| 명령어                | 설명                      |
| --------------------- | ------------------------- |
| `/ecc:save-session`   | 현재 세션 상태 저장       |
| `/ecc:resume-session` | 이전 세션 복원            |
| `/ecc:ck`             | 프로젝트별 영구 메모리    |
| `/ecc:learn-eval`     | 세션에서 재사용 패턴 추출 |

## 언어별 빌드 / 리뷰 / 테스트

| 언어        | 빌드                 | 리뷰                  | 테스트                |
| ----------- | -------------------- | --------------------- | --------------------- |
| TypeScript  | -                    | `/ecc:code-review`    | `/ecc:tdd`            |
| Go          | `/ecc:go-build`      | `/ecc:go-review`      | `/ecc:go-test`        |
| Rust        | `/ecc:rust-build`    | `/ecc:rust-review`    | `/ecc:rust-test`      |
| C++         | `/ecc:cpp-build`     | `/ecc:cpp-review`     | `/ecc:cpp-test`       |
| Kotlin      | `/ecc:kotlin-build`  | `/ecc:kotlin-review`  | `/ecc:kotlin-test`    |
| Python      | -                    | `/ecc:python-review`  | `/ecc:python-testing` |
| Flutter     | `/ecc:flutter-build` | `/ecc:flutter-review` | `/ecc:flutter-test`   |
| Java/Spring | `/ecc:gradle-build`  | -                     | `/ecc:springboot-tdd` |
| Laravel     | -                    | -                     | `/ecc:laravel-tdd`    |

## 프론트엔드 / UI

| 명령어                   | 설명                                   |
| ------------------------ | -------------------------------------- |
| `/ecc:frontend-design`   | 프로덕션급 프론트엔드 인터페이스 생성  |
| `/ecc:frontend-patterns` | React/Next.js 상태관리/성능 패턴       |
| `/ecc:frontend-slides`   | HTML 프레젠테이션 생성 (PPT 변환 포함) |
| `/ecc:design-system`     | 디자인 시스템 생성/감사                |
| `/ecc:e2e-testing`       | Playwright E2E 테스트                  |
| `/ecc:browser-qa`        | 브라우저 자동화 UI 테스트              |

## GitHub / Git

| 명령어              | 설명                                 |
| ------------------- | ------------------------------------ |
| `/ecc:github-ops`   | GitHub 레포 운영 (이슈/PR/CI/릴리스) |
| `/ecc:git-workflow` | Git 브랜칭/커밋/머지 전략            |
| `/ecc:jira`         | Jira 티켓 조회/분석/업데이트         |

## 인프라 / 배포

| 명령어                     | 설명                                |
| -------------------------- | ----------------------------------- |
| `/ecc:docker-patterns`     | Docker/Compose 패턴                 |
| `/ecc:deployment-patterns` | CI/CD 파이프라인/롤백/헬스체크      |
| `/ecc:dashboard-builder`   | 모니터링 대시보드 구축 (Grafana 등) |

## 콘텐츠 / 마케팅

| 명령어                 | 설명                                    |
| ---------------------- | --------------------------------------- |
| `/ecc:article-writing` | 글/가이드/블로그/튜토리얼 작성          |
| `/ecc:content-engine`  | 멀티플랫폼 콘텐츠 시스템                |
| `/ecc:crosspost`       | X/LinkedIn/Threads/Bluesky 크로스포스팅 |
| `/ecc:seo`             | 기술 SEO 감사 및 구현                   |
| `/ecc:x-api`           | X(Twitter) API 연동                     |

## 설정 / 관리

| 명령어                         | 설명                          |
| ------------------------------ | ----------------------------- |
| `/ecc:configure-ecc`           | ECC 인터랙티브 설치           |
| `/ecc:context-budget`          | 컨텍스트 윈도우 사용량 감사   |
| `/ecc:skill-health`            | 스킬 포트폴리오 헬스 대시보드 |
| `/ecc:workspace-surface-audit` | 레포/MCP/플러그인/env 감사    |
| `/ecc:hookify`                 | 대화 분석에서 hook 자동 생성  |

---

## AdInsight 프로젝트에서 추천 스킬

| 스킬                   | 용도                      |
| ---------------------- | ------------------------- |
| `/ecc:code-review`     | 코드 변경 후 즉시 리뷰    |
| `/ecc:plan`            | 새 기능 구현 전 계획 수립 |
| `/ecc:security-review` | API/인증 코드 보안 점검   |
| `/ecc:save-session`    | 긴 작업 세션 상태 저장    |
| `/ecc:verify`          | 배포 전 최종 검증         |
| `/ecc:docs`            | 라이브러리 최신 API 확인  |
