// Supabase 대시보드(Edge Functions > 새 함수)에 한 번에 붙여넣을 수 있도록, index.ts와 logic.mjs를 한 파일로 합친다.
// 사용: node supabase/functions/mindi-chat/build-single.mjs  → supabase/functions/mindi-chat/paste-into-dashboard.ts 생성
// logic.mjs나 index.ts를 고치면 다시 실행해야 하며, test/mindi-chat.test.js가 최신 상태인지 검사한다.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

export function buildSingle(dir) {
  const logic = readFileSync(join(dir, 'logic.mjs'), 'utf8').replace(/\r\n/g, '\n');
  const index = readFileSync(join(dir, 'index.ts'), 'utf8').replace(/\r\n/g, '\n');
  const logicBody = logic.replace(/^export /gm, '');
  const indexBody = index.replace(/^import \{[^}]*\} from '\.\/logic\.mjs';\n/m, '');
  if (indexBody === index) throw new Error('index.ts에서 logic.mjs 가져오기 줄을 찾지 못했어요');
  return `// ★ 이 파일은 build-single.mjs가 index.ts + logic.mjs를 합쳐 만든 것입니다. 직접 고치지 말고 원본을 고친 뒤 다시 만드세요.\n// Supabase 대시보드 > Edge Functions > 새 함수(이름: mindi-chat)에 이 파일 내용 전체를 붙여넣으세요.\n\n${logicBody}\n${indexBody}`;
}

const here = dirname(fileURLToPath(import.meta.url));
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  writeFileSync(join(here, 'paste-into-dashboard.ts'), buildSingle(here));
  console.log('생성됨: supabase/functions/mindi-chat/paste-into-dashboard.ts');
}
