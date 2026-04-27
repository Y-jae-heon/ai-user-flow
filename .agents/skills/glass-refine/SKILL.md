---
name: glass-refine
description: Glass SaaS UI quality elevation skill. Use when UI passes design-review but feels visually flat, monotonous, or unpolished. Also use during implementation to guide aesthetic decisions. Diagnoses weaknesses across 5 axes (Glass Depth, Layout Rhythm, Typography Hierarchy, Motion, Surface Density) and delivers concrete code fixes within Glass SaaS design system constraints.
---

# Glass Refine

코드가 design-review를 통과했지만 시각적으로 만족스럽지 않을 때, 또는 구현 중 UI 보정이 필요할 때 사용한다.

규칙 준수(pass/fail)가 아닌 **미적 품질 향상(good → great)**이 목적이다.

## 진입점

- `/glass-refine` — git diff로 변경된 UI 파일 전체 보정
- `/glass-refine <파일경로>` — 특정 파일 지정 보정
- `/glass-refine <파일경로1> <파일경로2>` — 복수 파일 지정

## 실행 순서

### Step 0: Prerequisites Check

design-reviewer가 CRITICAL 위반을 낸 파일에는 glass-refine을 적용하지 않는다.

```
규칙: CRITICAL 위반 → 먼저 design-review 통과 → 그 다음 glass-refine
```

`git diff --staged --name-only && git diff --name-only`로 대상 파일을 확인한다. 인자가 있으면 해당 파일을 직접 사용한다.

### Step 1: Design Constraints 로드

반드시 아래 파일을 읽고 시작한다. 이 단계를 건너뛰면 안 된다.

1. `DESIGN.md` — Glass SaaS 방향과 색상/타이포/Glass Level 정의
2. `rules/common/design-system.md` — CRITICAL 금지 패턴과 토큰 시스템
3. `rules/common/ui-components.md` — 컴포넌트별 구현 패턴
4. `apps/web/src/app/styles/theme.css` — 실제 CSS 변수 값 확인

### Step 2: 대상 파일 읽기

대상 UI 파일(.tsx, .css)을 전부 읽는다. 컴포넌트 전체 구조, 클래스명, 인라인 스타일, 레이아웃 패턴을 파악한다.

### Step 3: 5축 진단

아래 5가지 축으로 각각 독립적으로 진단한다. 축마다 심각도(HIGH / MEDIUM / LOW)를 부여한다.

---

#### Axis 1 — Glass Depth (글래스 깊이 단조로움)

**진단 기준**:
- 같은 뷰의 모든 Card가 동일한 blur/opacity 값을 사용함
- `var(--glass-blur-medium)`만 사용하고 Soft/Strong 변화 없음
- 배경과 카드 표면 사이 depth감이 없음

**처방 — Glass Level 계층화**:

| 요소 | 권장 Level | 이유 |
|------|-----------|------|
| 사이드바 / 헤더 | Soft | 배경에 가깝게 — 콘텐츠보다 뒤에 있어야 함 |
| 일반 Card / Widget | Medium | 기본값 |
| 모달 / 드로어 / 포커스 영역 | Strong | 최전면 — 배경을 가장 강하게 차단 |
| 중첩 카드 내부 섹션 | Soft | 외부 카드보다 한 단계 뒤로 |

```tsx
// BEFORE: 모든 카드가 동일
<div className="backdrop-blur-[var(--glass-blur-medium)] bg-white/[var(--glass-opacity-medium)] ...">
<aside className="backdrop-blur-[var(--glass-blur-medium)] bg-white/[var(--glass-opacity-medium)] ...">

// AFTER: 계층 차별화
<aside className="backdrop-blur-[var(--glass-blur-soft)] bg-white/[var(--glass-opacity-soft)] border border-white/15 ...">
<div className="backdrop-blur-[var(--glass-blur-medium)] bg-white/[var(--glass-opacity-medium)] border border-white/20 ...">
```

---

#### Axis 2 — Layout Rhythm (레이아웃 리듬 부재)

**진단 기준**:
- 모든 카드 간격이 동일한 `gap-4`나 `gap-6`으로 균일함
- 정보 계층 없이 카드들이 동등하게 배치됨
- 대칭 배치로 시각적 긴장감이 없음

**처방 — 비대칭과 강조**:

```tsx
// BEFORE: 균일한 격자감
<div className="flex flex-col gap-4">
  <KpiCard />
  <KpiCard />
  <ChartCard />
</div>

// AFTER: 주요 정보 강조 + 리듬
<div className="flex flex-col gap-6">
  {/* 핵심 KPI — 더 큰 존재감 */}
  <div className="rounded-3xl ...">
    <PrimaryKpiCard />
  </div>
  {/* 보조 정보 — 더 조밀하게 */}
  <div className="flex gap-3">
    <SecondaryKpiCard />
    <SecondaryKpiCard />
  </div>
  {/* 차트 — 충분한 숨공간 */}
  <div className="mt-2">
    <ChartCard />
  </div>
</div>
```

강조 포인트:
- 주요 카드는 `rounded-3xl`(24px), 보조는 `rounded-2xl`(16px)로 크기 차이 부여
- 섹션 간 `mt-2`~`mt-4` 추가로 그룹핑 표현
- 카드 내 padding도 중요도에 따라 `p-6` vs `p-4` 차별화

---

#### Axis 3 — Typography Hierarchy (타이포그래피 평탄함)

**진단 기준**:
- KPI 수치와 레이블이 시각적으로 구분되지 않음
- 모든 텍스트가 비슷한 크기와 weight를 사용
- `text-sm font-medium`이 지나치게 많이 반복됨

**처방 — 정보 위계 강화**:

DESIGN.md 기준: 숫자(KPI) > 제목 > 설명 > 메타

```tsx
// BEFORE: 계층 없음
<div>
  <span className="text-lg font-medium">42</span>
  <span className="text-sm">활성 프로젝트</span>
</div>

// AFTER: 명확한 위계
<div className="flex flex-col gap-1">
  {/* KPI 수치 — 최대 강조 */}
  <span className="text-4xl font-bold tracking-tight text-[var(--color-fg)] tabular-nums">
    42
  </span>
  {/* 레이블 — 뒤로 물러남 */}
  <span className="text-xs font-medium tracking-wide uppercase text-[var(--color-muted)]">
    활성 프로젝트
  </span>
</div>
```

패턴별 처방:
- KPI 수치: `text-3xl`~`text-4xl font-bold tracking-tight tabular-nums`
- Section Title: `text-lg font-semibold` + `text-[var(--color-fg)]`
- Body: `text-sm` + `text-[var(--color-muted)]`
- Meta/Badge: `text-xs tracking-wide uppercase`

`tabular-nums` — 숫자가 변할 때 레이아웃 흔들림 방지. KPI에 항상 추가.

---

#### Axis 4 — Motion (모션 부재)

**진단 기준**:
- 페이지 로드 시 모든 요소가 동시에 즉각 표시됨
- 인터랙션(hover, focus)에 시각적 피드백 없음
- 데이터 로딩 → 표시 전환이 즉각적이어서 뚝 끊김

**처방 — 의미 있는 모션만**:

원칙: 모션 하나를 잘 연출하는 것이 열 개를 나열하는 것보다 낫다.

**1. Reveal 시퀀스 (가장 효과적)**
```tsx
// Tailwind animate 유틸리티 사용
// tailwind.config에 없으면 inline style로 대체

// 카드 그룹에 stagger 적용
<div className="flex flex-col gap-4">
  <Card className="animate-in fade-in slide-in-from-bottom-2 duration-300" />
  <Card className="animate-in fade-in slide-in-from-bottom-2 duration-300 delay-75" />
  <Card className="animate-in fade-in slide-in-from-bottom-2 duration-300 delay-150" />
</div>

// tailwind-animate 없으면 CSS로
<Card style={{ animation: 'fadeInUp 0.3s ease both', animationDelay: '0ms' }} />
<Card style={{ animation: 'fadeInUp 0.3s ease both', animationDelay: '75ms' }} />
```

**2. Hover 피드백 (Card 기본 패턴)**
```tsx
<div className="
  backdrop-blur-[var(--glass-blur-medium)]
  bg-white/[var(--glass-opacity-medium)]
  border border-white/20
  rounded-2xl p-4
  transition-all duration-200
  hover:bg-white/[0.75]
  hover:border-white/30
  hover:shadow-lg
  hover:-translate-y-0.5
  cursor-pointer
">
```

**3. KPI 수치 변화 (숫자 업데이트)**
```tsx
// 숫자가 바뀔 때 transition 적용
<span className="transition-all duration-500 tabular-nums">
  {value}
</span>
```

금지:
- 랜덤한 요소에 `animate-bounce`, `animate-ping` 남발
- 500ms 이상의 reveal 딜레이 (답답하게 느껴짐)
- 기능과 무관한 continuous animation

---

#### Axis 5 — Surface Density (표면 밀도 불균형)

**진단 기준**:
- 카드 내부 콘텐츠가 여백 없이 빽빽하거나, 반대로 너무 듬성듬성함
- 카드 테두리 투명도가 배경과 구분이 안 됨
- Shadow가 없어 카드가 배경에서 분리되지 않음

**처방 — 표면 계층 분리**:

```tsx
// BEFORE: 밀도 없음
<div className="backdrop-blur-[var(--glass-blur-medium)] bg-white/[var(--glass-opacity-medium)] border border-white/20 rounded-2xl p-4">
  <h2>제목</h2>
  <p>내용</p>
</div>

// AFTER: 내부 계층 + 분리감
<div className="
  backdrop-blur-[var(--glass-blur-medium)]
  bg-white/[var(--glass-opacity-medium)]
  border border-white/20
  rounded-2xl
  shadow-sm shadow-black/5      /* 카드 하단 분리 */
  overflow-hidden               /* 내부 요소가 radius 밖으로 나가지 않도록 */
">
  {/* 카드 헤더 — 구분선으로 섹션 분리 */}
  <div className="px-5 pt-5 pb-3 border-b border-white/10">
    <h2 className="text-sm font-semibold text-[var(--color-fg)]">제목</h2>
  </div>
  {/* 카드 바디 */}
  <div className="px-5 py-4">
    <p className="text-sm text-[var(--color-muted)]">내용</p>
  </div>
</div>
```

border-white 투명도 가이드:
- 어두운 테마 배경: `border-white/20` ~ `border-white/30`
- 밝은 배경: `border-white/15` ~ `border-white/20`
- 내부 구분선: `border-white/10`

---

### Step 4: 수정안 작성

진단된 각 축에 대해 다음 형식으로 수정안을 제시한다.

```
[Axis 이름] [심각도] — 한 줄 요약
File: 파일경로:라인번호
현재: <현재 코드>
개선: <수정 코드>
이유: 한 줄 설명
```

### Step 5: 코드 수정 적용

수정안을 실제 파일에 적용한다. 각 수정 후:
- Design system 제약(CRITICAL 규칙) 위반 여부를 재확인
- 수정이 다른 컴포넌트에 영향을 주는지 확인

---

## 출력 형식

```
## Glass Refine — 진단 결과

### [Axis 1] Glass Depth — HIGH
File: apps/web/src/widgets/kpi-grid/ui/kpi-card.tsx:12
현재: 사이드바와 카드 모두 `var(--glass-blur-medium)` 동일 적용
개선: 사이드바 → Soft, 카드 → Medium으로 계층 분리
이유: depth 없이 평면적으로 보임

### [Axis 3] Typography Hierarchy — MEDIUM
File: apps/web/src/widgets/kpi-grid/ui/kpi-card.tsx:24
현재: `text-lg font-medium` — KPI 수치와 레이블이 비슷한 크기
개선: 수치 `text-4xl font-bold tabular-nums`, 레이블 `text-xs uppercase tracking-wide`
이유: 숫자 강조가 없어 KPI 카드로서 임팩트 없음

---

## 적용 완료

수정한 항목 요약 (축 / 파일 / 변경 내용)
```

---

## 경계 조건

다음은 glass-refine이 **하지 않는** 것이다:

- design-review의 CRITICAL 위반 수정 (→ design-reviewer 역할)
- 컴포넌트 구조 전면 재설계
- DESIGN.md 외 방향으로의 미적 판단 (예: "이 프로젝트는 minimalist가 어울린다" 식 재해석)
- 새 CSS 변수 생성 (기존 `--glass-*`, `--color-*` 토큰만 사용)
- i18n 없이 인라인 한국어 문자열 추가

---

## design-reviewer와 역할 분리

| | design-reviewer | glass-refine |
|---|---|---|
| 목적 | 규칙 위반 탐지 | 미적 품질 향상 |
| 트리거 | 코드 작성 직후 | 리뷰 통과 후 또는 구현 중 |
| 판단 기준 | 규칙 준수 여부 | 시각적 완성도 |
| 출력 | 위반 목록 + Fix 강제 | 진단 + 개선안 제안 후 적용 |
| 선행 조건 | 없음 | design-reviewer CRITICAL 0개 권장 |
