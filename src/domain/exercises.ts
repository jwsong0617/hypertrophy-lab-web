import type { Exercise, Muscle } from './types.ts';

function ex(id: string, name: string, aliases: string[], direct: Muscle[], indirect: Muscle[], equipment: Exercise['equipment'], alternative: string, cue: string, load: Exercise['load'] = 'external', note = ''): Exercise {
  return { id, name, aliases: [name, ...aliases], direct, indirect, equipment, alternative, cue, load, note };
}
export const EXERCISES: Exercise[] = [
  ex('back-extension', '백 익스텐션', ['Back Extension'], ['back'], ['glutes', 'hamstrings'], 'bodyweight', '통증 없는 가벼운 브리지', '허리 통증이 있으면 중단하고 현재 허용 범위를 확인하세요.', 'bodyweight', '몸통·골반 움직임에 따라 기여 근육이 다릅니다. 추가 중량과 체중 부하를 확정하지 않아 톤수에서 제외합니다.'),
  ex('superman', '슈퍼맨', ['Superman'], ['back'], ['glutes'], 'bodyweight', '통증 없는 데드버그', '무리한 허리 젖힘을 피하고 통증이 있으면 중단하세요.', 'timed'),
  ex('bench-dip', '벤치 딥', ['Bench Dip'], ['triceps'], ['chest', 'frontDelts'], 'bodyweight', '트라이셉스 푸시다운', '어깨가 불편하면 지지형 푸시다운으로 바꾸세요.', 'bodyweight'),
  ex('leg-raise', '누워서 레그 레이즈', ['Flat Leg Raise'], ['core'], [], 'bodyweight', '데드버그', '골반과 허리를 통제할 수 있는 범위에서 움직이세요.', 'bodyweight'),
  ex('russian-twist', '러시안 트위스트', ['Russian Twist'], ['core'], [], 'bodyweight', '데드버그', '허리 통증이 있으면 회전 동작을 멈추고 대안을 확인하세요.', 'bodyweight', '추가 중량 및 체중 기여가 불명확하여 톤수에서 제외합니다.'),
  ex('smith-deadlift', '스미스 데드리프트', ['Deadlift (Smith Machine)'], ['glutes'], ['hamstrings', 'back', 'quads'], 'machine', '레그 컬 + 통증 없는 브리지', '현재 운동 허용 범위를 먼저 확인하세요.', 'external', '스미스 기구 표시값은 자유중량과 비교하지 않습니다. 동작에 따라 근육 기여가 달라집니다.'),
  ex('goblet-squat', '덤벨 스쿼트', ['Squat (Dumbbell)', 'Goblet Squat'], ['quads'], ['glutes', 'core'], 'dumbbell', '지지형 맨몸 스플릿 스쿼트', '가볍고 통제 가능한 범위에서 시작하세요.', 'external', '덤벨 한 개/두 개와 합계 여부를 확인하세요. 입력값을 자동으로 두 배 하지 않습니다.'),
  ex('bodyweight-squat', '맨몸 스쿼트', ['Squat (Bodyweight)'], ['quads'], ['glutes'], 'bodyweight', '지지형 스쿼트', '지지대를 잡고 통증 없는 깊이를 사용하세요.', 'bodyweight'),
  ex('band-row', '밴드 로우', ['Band Row'], ['back'], ['biceps', 'rearDelts'], 'bodyweight', '덤벨 로우', '밴드 고정 상태를 확인하고 몸통을 지지해 당기세요.', 'bodyweight'),
  ex('heel-slide', '힐 슬라이드', ['Heel Slide'], ['hamstrings'], ['glutes'], 'bodyweight', '짧은 범위의 글루트 브리지', '미끄러지지 않는 환경에서 편한 범위로 발꿈치를 당기세요.', 'bodyweight'),
  ex('band-pullapart', '밴드 풀어파트', ['Band Pull Apart'], ['rearDelts'], ['back'], 'bodyweight', '가벼운 리어 델트 플라이', '가벼운 밴드를 편한 범위에서 벌리세요.', 'bodyweight'),
  ex('glute-bridge', '맨몸 글루트 브리지', ['Bodyweight Glute Bridge'], ['glutes'], ['hamstrings'], 'bodyweight', '짧은 범위의 브리지', '호흡을 유지하고 허리 대신 둔근으로 움직이세요.', 'bodyweight'),
  ex('bodyweight-calf', '맨몸 카프 레이즈', ['Bodyweight Calf Raise'], ['calves'], [], 'bodyweight', '앉아서 카프 레이즈', '지지대를 잡고 천천히 움직이세요.', 'bodyweight'),
  ex('band-triceps', '밴드 트라이셉스 익스텐션', ['Band Triceps Extension'], ['triceps'], [], 'bodyweight', '가벼운 덤벨 익스텐션', '밴드 고정 상태를 확인하고 팔꿈치를 편하게 유지하세요.', 'bodyweight'),
  ex('chest-press', '머신 체스트 프레스', ['Chest Press (Machine)', 'Chest Press', 'Seated Chest Press'], ['chest'], ['frontDelts', 'triceps'], 'machine', '덤벨 벤치 프레스', '등받이에 몸을 지지하고 통증 없는 범위에서 밀어 주세요.'),
  ex('bench-barbell', '바벨 벤치 프레스', ['Bench Press (Barbell)', 'Bench Press', '벤치프레스'], ['chest'], ['frontDelts', 'triceps'], 'barbell', '머신 체스트 프레스', '견갑과 발을 안정시키고 보조자 또는 안전바를 사용하세요.', 'external', '바벨 포함 여부를 확인하세요. 다른 기구의 중량과 직접 비교하지 않습니다.'),
  ex('bench-dumbbell', '덤벨 벤치 프레스', ['Bench Press (Dumbbell)', 'Dumbbell Bench Press'], ['chest'], ['frontDelts', 'triceps'], 'dumbbell', '머신 체스트 프레스', '반동 없이 제어하며 가동 범위를 조절하세요.', 'external', '한 손 기준인지 양손 합계인지 입력 기준을 확인하세요. 자동으로 두 배 하지 않습니다.'),
  ex('incline-press', '인클라인 덤벨 프레스', ['Incline Bench Press (Dumbbell)', 'Incline Dumbbell Press'], ['chest'], ['frontDelts', 'triceps'], 'dumbbell', '인클라인 머신 프레스', '낮은 경사에서 시작하고 어깨가 편한 궤도를 찾으세요.', 'external', '덤벨 중량은 입력값 그대로 집계합니다. 좌우 합계 여부는 미확인입니다.'),
  ex('incline-barbell', '인클라인 바벨 프레스', ['Incline Bench Press (Barbell)', 'Incline Bench Press'], ['chest'], ['frontDelts', 'triceps'], 'barbell', '인클라인 머신 프레스', '안전바를 조절하고 무리한 깊이를 피하세요.'),
  ex('smith-bench', '스미스 벤치 프레스', ['Bench Press (Smith Machine)', 'Smith Machine Bench Press', 'Incline Bench Press (Smith Machine)'], ['chest'], ['frontDelts', 'triceps'], 'machine', '머신 체스트 프레스', '안전장치를 확인하고 편한 궤도를 선택하세요.', 'external', '스미스 기구 표시값은 자유중량과 비교할 수 없습니다.'),
  ex('chest-fly', '체스트 플라이', ['Chest Fly', 'Chest Fly (Machine)', 'Pec Deck (Machine)', 'Pec Deck', 'Chest Fly (Dumbbell)', 'Cable Fly', 'Cable Crossover'], ['chest'], [], 'machine', '케이블 플라이', '어깨가 편한 범위에서 팔꿈치 각도를 유지하세요.'),
  ex('pushup', '푸시업', ['Push Up', 'Push-up', 'Push Ups'], ['chest'], ['triceps', 'frontDelts'], 'bodyweight', '높은 지지대 푸시업', '몸통을 고정하고 난이도는 지지대 높이로 조절하세요.', 'bodyweight', '체중 부하를 모르므로 톤수와 e1RM을 계산하지 않습니다.'),
  ex('lat-pulldown', '랫 풀다운', ['Lat Pulldown (Cable)', 'Lat Pulldown (Machine)', 'Lat Pulldown', 'Wide Grip Lat Pulldown', '랫풀다운'], ['back'], ['biceps'], 'cable', '머신 풀다운', '몸통을 과도하게 젖히지 않고 팔꿈치를 옆구리 쪽으로 내리세요.'),
  ex('assisted-pullup', '보조 턱걸이', ['Pull Up (Assisted)', 'Assisted Pull Up', 'Assisted Pull-up', 'Chin Up (Assisted)'], ['back'], ['biceps'], 'machine', '랫 풀다운', '보조량이 높을수록 더 쉬울 수 있습니다.', 'assistance', '중량은 보조량입니다. 부하 톤수/e1RM에서 제외하며 보조량 감소를 따로 봅니다.'),
  ex('pullup', '턱걸이', ['Pull Up', 'Pull-up', 'Chin Up', 'Pull Up (Bodyweight)'], ['back'], ['biceps'], 'bodyweight', '보조 턱걸이', '반동 없이 통제 가능한 범위를 사용하세요.', 'bodyweight'),
  ex('supported-row', '체스트 서포티드 로우', ['Chest Supported Row (Machine)', 'Chest Supported Row (Dumbbell)', 'Chest Supported Row', 'Seated Row (Machine)'], ['back'], ['biceps', 'rearDelts'], 'machine', '시티드 케이블 로우', '가슴을 패드에 지지하고 팔꿈치를 뒤로 당기세요.'),
  ex('cable-row', '시티드 케이블 로우', ['Seated Row (Cable)', 'Seated Cable Row', 'Cable Row'], ['back'], ['biceps', 'rearDelts'], 'cable', '체스트 서포티드 로우', '몸통을 흔들지 않고 편한 가동 범위를 유지하세요.'),
  ex('barbell-row', '바벨 로우', ['Bent Over Row (Barbell)', 'Barbell Row', 'Bent Over Row'], ['back'], ['biceps', 'rearDelts'], 'barbell', '체스트 서포티드 로우', '몸통을 지지하기 어렵거나 통증이 있으면 지지형 로우로 바꾸세요.'),
  ex('dumbbell-row', '덤벨 로우', ['Bent Over Row (Dumbbell)', 'Dumbbell Row', 'One Arm Dumbbell Row'], ['back'], ['biceps', 'rearDelts'], 'dumbbell', '체스트 서포티드 로우', '한 손으로 지지하고 몸통 회전을 제어하세요.', 'external', '한 손/양손 중량 및 반복 집계 기준은 미확인입니다.'),
  ex('leg-press', '레그 프레스', ['Leg Press', 'Leg Press (Machine)', 'Seated Leg Press (Machine)', 'Horizontal Leg Press'], ['quads'], ['glutes'], 'machine', '지지대 잡고 스플릿 스쿼트', '골반이 말리지 않는 편한 깊이를 사용하고 숨을 오래 참지 마세요.', 'external', '기구 각도와 빈 썰매 중량이 달라 다른 기구와 비교할 수 없습니다.'),
  ex('squat', '바벨 스쿼트', ['Squat (Barbell)', 'Squat', 'Back Squat', 'Front Squat (Barbell)'], ['quads'], ['glutes', 'core'], 'barbell', '레그 프레스', '현재 허용 범위와 기술을 확인하고 필요하면 지지형 동작을 선택하세요.'),
  ex('smith-squat', '스미스 스쿼트', ['Squat (Smith Machine)', 'Smith Machine Squat', 'Hack Squat (Machine)', 'Hack Squat'], ['quads'], ['glutes'], 'machine', '레그 프레스', '안전장치를 확인하고 골반과 허리가 편한 범위에서 움직이세요.'),
  ex('split-squat', '지지형 스플릿 스쿼트', ['Split Squat', 'Bulgarian Split Squat', 'Lunge (Dumbbell)', 'Lunge', 'Bulgarian Split Squat (Dumbbell)'], ['quads'], ['glutes'], 'dumbbell', '레그 익스텐션', '지지대를 잡고 맨몸부터 시작하세요. 좌우를 한 쌍으로 기록하세요.'),
  ex('leg-extension', '레그 익스텐션', ['Leg Extension (Machine)', 'Leg Extension'], ['quads'], [], 'machine', '레그 프레스', '무릎이 편한 범위에서 천천히 펴 주세요.'),
  ex('leg-curl', '시티드 레그 컬', ['Seated Leg Curl (Machine)', 'Seated Leg Curl', 'Leg Curl', 'Lying Leg Curl (Machine)', 'Lying Leg Curl'], ['hamstrings'], [], 'machine', '라잉 레그 컬', '골반을 고정하고 반동 없이 무릎을 굽히세요.'),
  ex('rdl', '루마니안 데드리프트', ['Romanian Deadlift (Barbell)', 'Romanian Deadlift (Dumbbell)', 'Romanian Deadlift'], ['hamstrings', 'glutes'], ['back'], 'barbell', '레그 컬 + 힙 스러스트', '통증과 운동 허용 여부를 먼저 확인하세요. 자동 고중량 처방은 하지 않습니다.'),
  ex('deadlift', '데드리프트', ['Deadlift (Barbell)', 'Deadlift', 'Sumo Deadlift (Barbell)'], ['glutes'], ['hamstrings', 'back', 'quads'], 'barbell', '레그 컬 + 지지형 힙 스러스트', '현재 상태와 기술을 확인한 뒤 선택하세요. 과거 기록으로 부하를 설정하지 않습니다.'),
  ex('hip-thrust', '머신 힙 스러스트', ['Hip Thrust (Machine)', 'Hip Thrust (Barbell)', 'Hip Thrust', 'Glute Bridge'], ['glutes'], ['hamstrings'], 'machine', '맨몸 글루트 브리지', '허리를 과하게 젖히지 말고 둔근으로 움직이세요.'),
  ex('ohp-barbell', '바벨 OHP', ['Overhead Press (Barbell)', 'Barbell Overhead Press', 'Military Press (Barbell)'], ['frontDelts'], ['triceps', 'sideDelts'], 'barbell', '등받이 있는 머신 숄더 프레스', '허리를 과하게 젖히지 말고 통제 가능한 범위에서 밀어 주세요. 안전바와 주변 공간을 확인하세요.', 'external', '기존 머신·덤벨 숄더 프레스 기록과 중량을 섞어 비교하지 않습니다.'),
  ex('shoulder-press', '숄더 프레스', ['Shoulder Press (Dumbbell)', 'Shoulder Press (Machine)', 'Overhead Press (Dumbbell)', 'Overhead Press (Smith Machine)', 'Seated Overhead Press (Dumbbell)', 'Shoulder Press'], ['frontDelts'], ['triceps', 'sideDelts'], 'machine', '높은 경사 체스트 프레스', '등을 지지하고 어깨가 편한 범위에서 밀어 주세요.'),
  ex('lateral-raise', '레터럴 레이즈', ['Lateral Raise (Dumbbell)', 'Lateral Raise (Cable)', 'Lateral Raise (Machine)', 'Lateral Raise', '사이드 레터럴 레이즈'], ['sideDelts'], [], 'dumbbell', '머신 레터럴 레이즈', '반동 없이 팔꿈치를 옆으로 올리고 통증 없는 높이까지만 움직이세요.'),
  ex('rear-delt', '리버스 펙덱', ['Rear Delt Reverse Fly (Machine)', 'Reverse Fly (Machine)', 'Rear Delt Fly (Dumbbell)', 'Reverse Pec Deck', 'Face Pull (Cable)', 'Face Pull'], ['rearDelts'], ['back'], 'machine', '가슴 지지 리어 델트 플라이', '어깨를 으쓱하지 말고 팔을 옆으로 벌리세요.'),
  ex('biceps-curl', '바이셉스 컬', ['Bicep Curl (Dumbbell)', 'Bicep Curl (Barbell)', 'Bicep Curl (Cable)', 'Hammer Curl (Dumbbell)', 'Biceps Curl', 'Hammer Curl', 'Preacher Curl (Machine)'], ['biceps'], [], 'dumbbell', '케이블 컬', '팔꿈치를 고정하고 몸통 반동을 줄이세요.'),
  ex('triceps', '트라이셉스 푸시다운', ['Triceps Pushdown (Cable)', 'Triceps Pushdown (Cable - Straight Bar)', 'Triceps Extension', 'Triceps Extension (Cable)', 'Triceps Extension (Dumbbell)', 'Triceps Pushdown', 'Skullcrusher (Barbell)'], ['triceps'], [], 'cable', '머신 트라이셉스 익스텐션', '팔꿈치를 편한 위치에 두고 통제해서 펴 주세요.'),
  ex('calf', '카프 레이즈', ['Calf Raise (Machine)', 'Seated Calf Raise (Machine)', 'Standing Calf Raise (Machine)', 'Calf Raise', 'Seated Calf Raise'], ['calves'], [], 'machine', '지지대 잡고 맨몸 카프 레이즈', '천천히 올리고 내리며 아킬레스가 편한 범위를 선택하세요.'),
  ex('core', '데드버그', ['Dead Bug', 'Crunch', 'Crunch (Machine)', 'Cable Crunch', 'Ab Wheel'], ['core'], [], 'bodyweight', '짧은 범위의 데드버그', '편하게 호흡하며 몸통을 제어하세요.', 'bodyweight'),
  ex('plank', '플랭크', ['Plank', 'Side Plank'], ['core'], [], 'bodyweight', '데드버그', '숨을 참지 않고 짧게 유지하세요.', 'timed'),
  ex('cardio', '유산소', ['Running', 'Running (Treadmill)', 'Treadmill', 'Walking', 'Cycling', 'Cycling (Indoor)', 'Elliptical', 'Stair Machine', '운동 자전거'], [], [], 'machine', '편한 속도의 걷기', '허용된 강도에서 대화 가능한 속도로 시작하세요.', 'cardio'),
];
const normalize = (value: string) => value.toLowerCase().replace(/[\s_-]+/g, ' ').trim();
const byAlias = new Map(EXERCISES.flatMap(item => item.aliases.map(alias => [normalize(alias), item] as const)));
export function findExercise(name: string): Exercise | undefined { return byAlias.get(normalize(name)); }
export function getExercise(id: string | null): Exercise | undefined { return EXERCISES.find(item => item.id === id); }
