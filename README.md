# Hypertrophy Lab

Strong 기록과 스포츠과학 근거를 바탕으로 **프로그램 설계·증량 계획·주간 검토**를 하는 한국어 웹 앱입니다. 운동 중 기록은 Strong, 식사·생활 기록은 사용 중인 앱에 계속 남기고 이곳에서는 다음 훈련을 계획합니다. 이 공개 코드에는 개인 CSV·건강 이력·개인 분석 결과가 포함되지 않습니다.

[웹 앱 열기](https://jwsong0617.github.io/hypertrophy-lab-web/) · [앱 코드](https://github.com/jwsong0617/hypertrophy-lab-web)

## 시작

Node 24에서 `npm ci`, `npm run dev`를 실행하세요. 기본 경로는 `/hypertrophy-lab/`입니다.

1. **내 프로그램**에서 주차별 계획을 읽고 Markdown 계획표를 내려받아 Strong에 직접 옮겨 적습니다.
2. **프로그램 설계**에서 주 2/3/4회·시간·환경·지지형/3대·OHP를 선택하고 종목·순서·세트·반복·RIR·휴식을 수정합니다. 해당 슬롯을 저장하고 주간 직접/간접 노출과 선택 근거를 확인합니다.
3. Strong에서 실제 운동을 기록한 뒤 **설정·데이터**에서 최신 UTF-8 CSV를 가져옵니다. 자동 연동은 제공하지 않습니다.
4. **증량 계획**에서 같은 동작·기구의 원래 Strong 종목명을 직접 연결하고, 최근 두 노출·목표 반복·RIR·오늘의 회복 조건을 확인합니다. 누락 RIR는 추측하지 않습니다.
5. **주간 검토**에서 실제 기록과 현재 계획의 차이를 확인하고 유지·축소·변경 이유를 남깁니다. 과거 계획의 완료율로 단정하거나 프로그램을 자동 변경하지 않습니다.
6. 다른 기기에서 사용하려면 JSON을 직접 내보내고 복원합니다. 기존 버전-1 백업도 읽을 수 있습니다.

웹 세트 기록·휴식 타이머와 영양·회복 체크인은 **보조 도구**로 유지합니다. 삼성 헬스 자동 연동·식품별 식단 기록·잠금 화면/워치 연동은 제공하지 않습니다.

CSV와 개인 상태는 브라우저에서 처리·저장됩니다. 계정·클라우드 동기화·별도 암호화는 제공하지 않습니다. URL 접근과 데이터 동기화는 서로 다릅니다. 공유 기기와 브라우저 데이터 삭제에 주의하고 안전하게 백업하세요. 첫 방문 후 정적 앱은 오프라인에서도 열립니다.

`npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npm run audit:public`, `npm run test:e2e`로 검증합니다. CLI 분석은 `npm run analyze -- <개인 CSV>`이며 결과는 Git에서 제외하는 `reports/private/`에만 저장합니다.

## 배포

GitHub Pages Source를 GitHub Actions로 설정하고 **Deploy public app**을 수동 실행하세요. 워크플로가 실제 저장소 이름으로 Vite base를 지정하고 정적 dist만 게시합니다. 기본 수동 빌드 경로를 바꾸려면 `VITE_BASE_PATH=/<저장소 이름>/ npm run build`를 사용합니다. 비공개 개발 저장소의 이력을 이 저장소로 복사하지 마세요.

게시 후에는 실제 HTTPS 주소를 데스크톱·모바일 Chromium으로 검사합니다. 10개 화면, 설계 수정, 바벨 구성, 주간 검토, 합성 CSV 가져오기, 로컬 저장 유지, 오프라인 실행과 데이터 업로드 요청이 없는지 확인합니다. 결과와 합성 화면 캡처는 배포 워크플로의 `production-browser-verification` 아티팩트에 보관합니다.

## 근거와 한계

운동 기록이 실제 운동 전체를 대표하지 않을 수 있습니다. 미입력 신체 수치·RIR·섭취량은 생성하지 않습니다. 일반적인 연구와 보수적인 운영 규칙을 바탕으로 한 참고 프로그램이며 진단·치료·운동 허가가 아닙니다. 최신 문헌 검증 상태는 앱과 `docs/research-evidence.md`에 표시합니다.

계산 정의는 `docs/data-dictionary.md`, 프로그램은 `docs/program-12weeks.md`, 안전과 배포는 `docs/assumptions-and-safety.md`, `docs/privacy-and-deployment.md`, 테스트는 `docs/TESTING.md`를 참조하세요.
