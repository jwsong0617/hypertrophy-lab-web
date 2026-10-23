import { readdir, readFile, lstat } from 'node:fs/promises';
import { resolve, relative, extname } from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const directory = resolve(root, process.argv[2] || 'dist');
const allowed = new Set(['.html', '.js', '.css', '.svg', '.webmanifest', '.png', '.ico', '.woff2']);
const prohibited = [/codex_bodybuilding_master_prompt/i, /AGENTS\.md/, /__PRIVATE_TEST_RECORD__/, /data\/private\//];
let personalFiles = [];
try { personalFiles = (await readdir(resolve(root, 'data/private'))).filter(name => /\.(csv|json|parquet)$/i.test(name)); } catch (error) { if (error.code !== 'ENOENT') throw error; }
async function walk(path) {
  const stat = await lstat(path);
  if (stat.isSymbolicLink()) throw new Error('배포 디렉터리의 심볼릭 링크는 허용하지 않습니다.');
  if (stat.isDirectory()) return (await Promise.all((await readdir(path)).map(name => walk(resolve(path, name))))).flat();
  return [path];
}
const files = await walk(directory);
if (!files.length || !files.some(path => relative(directory, path) === 'index.html')) throw new Error('현재 빌드의 index.html이 없습니다.');
for (const file of files) {
  const name = relative(directory, file);
  if (!allowed.has(extname(file)) || /(?:^|\/)(?:data|reports|docs|\.git)(?:\/|$)/i.test(name)) throw new Error('배포 허용 목록 밖의 파일이 있습니다. 빌드만 배포하세요.');
  const text = await readFile(file, 'utf8');
  if (prohibited.some(pattern => pattern.test(text)) || personalFiles.some(name => text.includes(name))) throw new Error('비공개 자료 표식이 빌드에서 발견되었습니다. 배포를 중단합니다.');
}
try {
  const tracked = execFileSync('git', ['ls-files', 'data/private', 'reports/private', 'docs/private'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  if (tracked) throw new Error('민감 데이터 디렉터리에 추적된 파일이 있습니다.');
} catch (error) { if (!String(error.message).includes('not a git repository') && !error.stderr?.toString().includes('not a git repository')) throw error; }
console.log(`배포 검사 통과: ${files.length}개 정적 앱 파일. 원본 CSV·개인 보고서·개발 지침은 포함하지 않습니다.`);
console.log('자동 검사는 완전한 개인정보 감사를 대신하지 않습니다. 공개 저장소에는 코드 전용 staging만 복사하고 기존 Git 이력을 절대 복사하지 마세요.');
