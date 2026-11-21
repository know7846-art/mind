// 마음이 AI 답변 — Supabase Edge Function (Deno)
// - Google Gemini API 키는 이 함수의 비밀값(GEMINI_API_KEY)으로만 보관한다. 브라우저 코드에는 넣지 않는다.
// - 이용자가 보낸 글은 저장·기록하지 않는다 (로그에는 상태 코드만 남김).
// - 위기·위험 표현은 AI를 호출하지 않고 센터 고정 문구를 돌려준다.
import { SAFETY_TEXT, buildRequest, isSafety, readReply, safeModel, sanitizeReply, validateMessages } from './logic.mjs';

const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') ?? 'https://know7846-art.github.io')
  .split(',').map((s) => s.trim()).filter(Boolean);
// 쓸 모델 순서. 앞 모델의 하루 한도가 차면(429) 다음 모델로 넘어간다 — 키 하나 안에서 모델별로 정해진 한도를 쓰는 것
const MODELS = (Deno.env.get('GEMINI_MODELS') ?? Deno.env.get('GEMINI_MODEL') ?? 'gemini-3.5-flash-lite,gemini-3.1-flash-lite')
  .split(',').map((m) => safeModel(m.trim(), '')).filter(Boolean);
if (!MODELS.length) MODELS.push('gemini-3.5-flash-lite');
// 한도가 찬 모델은 잠시 건너뛴다 (인스턴스 메모리 기준)
const COOL_MS = 30 * 60 * 1000;
const coolUntil = new Map<string, number>();
const API_KEY = Deno.env.get('GEMINI_API_KEY');

// 같은 IP의 과다 호출 제한 (인스턴스 메모리 기준의 간단한 제한 — 총 사용 한도는 Google Cloud 결제 예산·할당량에서 따로 설정)
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 20;
const hits = new Map<string, number[]>();
function limited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > MAX_PER_WINDOW;
}

function json(body: unknown, status: number, cors: Record<string, string>) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8' } });
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin') ?? '';
  const cors = {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin'
  };
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405, cors);
  if (!ALLOWED_ORIGINS.includes(origin)) return json({ error: 'forbidden_origin' }, 403, cors);
  if (!API_KEY) return json({ error: 'ai_unavailable' }, 503, cors);

  const ip = (req.headers.get('x-forwarded-for') ?? 'unknown').split(',')[0].trim();
  if (limited(ip)) return json({ error: 'rate_limited' }, 429, cors);

  let body: unknown;
  try { body = await req.json(); } catch { return json({ error: 'bad_request' }, 400, cors); }
  const v = validateMessages(body);
  if (!v.ok) return json({ error: 'bad_request', message: v.error }, 400, cors);

  // 이용자의 마지막 글에 위기·위험 표현이 있으면 AI를 부르지 않고 고정 문구로 답한다
  const last = v.messages[v.messages.length - 1].content;
  if (isSafety(last)) return json({ safety: true, text: SAFETY_TEXT }, 200, cors);

  const reqBody = JSON.stringify(buildRequest(v.messages, MODELS[0]));
  const now = Date.now();
  const order = MODELS.filter((m) => (coolUntil.get(m) ?? 0) <= now);
  let quotaHit = false;
  for (const model of (order.length ? order : MODELS)) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'x-goog-api-key': API_KEY, 'content-type': 'application/json' },
        body: model === MODELS[0] ? reqBody : JSON.stringify(buildRequest(v.messages, model)),
        signal: ctrl.signal
      });
      if (res.status === 429) { quotaHit = true; coolUntil.set(model, Date.now() + COOL_MS); console.error('gemini quota', model); continue; }
      if (!res.ok) { console.error('gemini status', model, res.status); continue; }
      const data = await res.json();
      const text = sanitizeReply(readReply(data));
      if (!text) return json({ error: 'unsafe_reply' }, 502, cors);
      return json({ text }, 200, cors);
    } catch (e) {
      console.error('gemini call failed', model, (e as Error).name);
    } finally {
      clearTimeout(timer);
    }
  }
  // 모든 모델이 한도에 걸렸거나 실패 → 화면은 정해진 안내로 답한다
  return json({ error: quotaHit ? 'quota_exhausted' : 'ai_unavailable' }, quotaHit ? 429 : 502, cors);
});
