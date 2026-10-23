import { cp, mkdir, mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';

const root = process.cwd();
await mkdir(resolve(root, 'release'), { recursive: true });
const target = await mkdtemp(resolve(root, 'release/public-code-'));
const entries = ['package.json', 'package-lock.json', 'tsconfig.json', 'vite.config.ts', 'eslint.config.js', 'playwright.config.ts', 'index.html', '.gitignore', '.env.example', 'src', 'public', 'tests', 'scripts', '.github'];
for (const entry of entries) await cp(resolve(root, entry), join(target, entry), { recursive: true });
await mkdir(join(target, 'docs'));
for (const name of ['data-dictionary.md', 'research-evidence.md', 'research-verification.json', 'program-12weeks.md', 'roadmap-24weeks.md', 'assumptions-and-safety.md', 'privacy-and-deployment.md', 'TESTING.md']) await cp(resolve(root, 'docs', name), join(target, 'docs', name));
await writeFile(join(target, 'README.md'), await readFile(resolve(root, 'docs/public-README.md')));
for (const forbidden of ['.git', 'data', 'reports', 'AGENTS.md', 'codex_bodybuilding_master_prompt.md', '.env']) {
  if ((await readdir(target)).includes(forbidden)) throw new Error('공개 코드 staging에 비공개 파일이 발견되었습니다.');
}
console.log(`공개 코드 전용 staging 준비 완료: ${target}`);
console.log('Git 이력·CSV·개인 보고서는 복사하지 않았습니다. 기존 비공개 저장소의 공개 전환을 금지합니다.');
console.log('별도의 공개 저장소에 이 디렉터리의 파일만 새 이력으로 올리고 GitHub Pages의 Source를 GitHub Actions로 설정한 다음 Deploy public app workflow를 실행하세요.');
