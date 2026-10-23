# Hypertrophy Lab

한국어로 운동 기록을 분석하고 훈련·영양·회복을 관리하는 로컬 우선 React 앱입니다. 이 공개 코드에는 개인 CSV·건강 이력·개인 분석 결과가 포함되지 않습니다.

[웹 앱 열기](https://jwsong0617.github.io/hypertrophy-lab-web/) · [앱 코드](https://github.com/jwsong0617/hypertrophy-lab-web)

## 시작

Node 24에서 `npm ci`, `npm run dev`를 실행하세요. 기본 경로는 `/hypertrophy-lab/`입니다.

1. 설정에서 Strong UTF-8 CSV를 선택하고 품질 감사와 병합 결과를 확인합니다.
2. 체중·빈도·가용 시간·운동 환경은 필요한 만큼 입력합니다.
3. 주 2/3/4회 프로그램에서 지지형 또는 3대·OHP 중심 구성을 선택합니다. 카프 레이즈·힙 스러스트는 원할 때 추가하고 실제 수행한 세트만 기록합니다.
4. 주간 체크인과 이력의 직접·간접 노출을 함께 확인합니다.
5. 다른 기기에서 사용하려면 JSON을 직접 내보내고 복원합니다.

CSV와 개인 상태는 브라우저에서 처리·저장됩니다. 계정·클라우드 동기화·별도 암호화는 제공하지 않습니다. URL 접근과 데이터 동기화는 서로 다릅니다. 공유 기기와 브라우저 데이터 삭제에 주의하고 안전하게 백업하세요. 첫 방문 후 정적 앱은 오프라인에서도 열립니다.

`npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npm run audit:public`, `npm run test:e2e`로 검증합니다. CLI 분석은 `npm run analyze -- <개인 CSV>`이며 결과는 Git에서 제외하는 `reports/private/`에만 저장합니다.

## 배포

GitHub Pages Source를 GitHub Actions로 설정하고 **Deploy public app**을 수동 실행하세요. 워크플로가 실제 저장소 이름으로 Vite base를 지정하고 정적 dist만 게시합니다. 기본 수동 빌드 경로를 바꾸려면 `VITE_BASE_PATH=/<저장소 이름>/ npm run build`를 사용합니다. 비공개 개발 저장소의 이력을 이 저장소로 복사하지 마세요.

게시 후에는 실제 HTTPS 주소를 데스크톱·모바일 Chromium으로 검사합니다. 8개 화면, 바벨 구성, 합성 CSV 가져오기, 로컬 저장 유지, 오프라인 실행과 데이터 업로드 요청이 없는지 확인합니다. 결과와 합성 화면 캡처는 배포 워크플로의 `production-browser-verification` 아티팩트에 보관합니다.

## 근거와 한계

운동 기록이 실제 운동 전체를 대표하지 않을 수 있습니다. 미입력 신체 수치·RIR·섭취량은 생성하지 않습니다. 일반적인 연구와 보수적인 운영 규칙을 바탕으로 한 참고 프로그램이며 진단·치료·운동 허가가 아닙니다. 최신 문헌 검증 상태는 앱과 `docs/research-evidence.md`에 표시합니다.

계산 정의는 `docs/data-dictionary.md`, 프로그램은 `docs/program-12weeks.md`, 안전과 배포는 `docs/assumptions-and-safety.md`, `docs/privacy-and-deployment.md`, 테스트는 `docs/TESTING.md`를 참조하세요.
