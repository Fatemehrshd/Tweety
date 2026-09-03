/**
 * Pure report logic for the tweet-summarizer skill: date validation,
 * time-range filtering, and extractive summarization. No I/O, no MCP,
 * no secrets — fully unit-testable.
 */

export class SkillError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SkillError";
  }
}

export interface PostLike {
  id: string;
  text: string;
  createdAt: string;
}

export interface TimeRange {
  start: string;
  end: string;
}

export interface Summary {
  totalChars: number;
  avgLength: number;
  perDay: Record<string, number>;
  topTerms: { term: string; count: number }[];
  longestExcerpt: string | null;
  note: string | null;
}

export interface SummarizerReport {
  timeRange: TimeRange;
  postCount: number;
  posts: PostLike[];
  summary: Summary;
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

function parseBound(raw: string, endOfDay: boolean, label: string): number {
  let iso = raw;
  if (DATE_ONLY.test(raw)) {
    iso = endOfDay ? `${raw}T23:59:59.999Z` : `${raw}T00:00:00.000Z`;
  }
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) {
    throw new SkillError(`Invalid ${label} date: ${JSON.stringify(raw)}. Use YYYY-MM-DD or full ISO-8601.`);
  }
  return ms;
}

/** Validate the requested range. Returns normalized [startMs, endMs] (inclusive). */
export function validateRange(start: string, end: string): { startMs: number; endMs: number } {
  const startMs = parseBound(start, false, "start");
  const endMs = parseBound(end, true, "end");
  if (startMs > endMs) {
    throw new SkillError(`Invalid range: start (${start}) is after end (${end}).`);
  }
  return { startMs, endMs };
}

/** Keep posts whose createdAt falls inside [startMs, endMs] (inclusive). */
export function filterPosts(posts: PostLike[], startMs: number, endMs: number): PostLike[] {
  return posts.filter((p) => {
    const ms = Date.parse(p.createdAt);
    return !Number.isNaN(ms) && ms >= startMs && ms <= endMs;
  });
}

const STOPWORDS = new Set(
  "a,an,and,are,as,at,be,but,by,for,from,has,have,had,he,she,it,its,in,into,is,of,on,or,that,the,their,them,they,this,to,was,were,will,with,you,your,we,our,us,not,no,so,if,do,does,did,can,just,than,then,there,when,what,which,who,how,all,any,more,my,me,hi,hey,oh,ok,yes".split(
    ",",
  ),
);

/** Extractive summary: stats + frequent terms + longest excerpt. Deterministic. */
export function summarizePosts(posts: PostLike[]): Summary {
  if (posts.length === 0) {
    return {
      totalChars: 0,
      avgLength: 0,
      perDay: {},
      topTerms: [],
      longestExcerpt: null,
      note: "No posts found in the requested range.",
    };
  }

  const totalChars = posts.reduce((n, p) => n + p.text.length, 0);
  const perDay: Record<string, number> = {};
  const counts = new Map<string, number>();
  let longest = posts[0]!;

  for (const p of posts) {
    const day = p.createdAt.slice(0, 10);
    perDay[day] = (perDay[day] ?? 0) + 1;
    if (p.text.length > longest.text.length) longest = p;
    for (const token of p.text.toLowerCase().split(/[^a-z0-9]+/)) {
      if (token.length < 3 || STOPWORDS.has(token)) continue;
      counts.set(token, (counts.get(token) ?? 0) + 1);
    }
  }

  const topTerms = [...counts.entries()]
    .map(([term, count]) => ({ term, count }))
    .sort((a, b) => b.count - a.count || (a.term < b.term ? -1 : 1))
    .slice(0, 10);

  const sortedDays = Object.fromEntries(Object.entries(perDay).sort(([a], [b]) => (a < b ? -1 : 1)));

  return {
    totalChars,
    avgLength: Math.round((totalChars / posts.length) * 10) / 10,
    perDay: sortedDays,
    topTerms,
    longestExcerpt: longest.text.length > 140 ? `${longest.text.slice(0, 140)}…` : longest.text,
    note: null,
  };
}

export function buildReport(start: string, end: string, posts: PostLike[]): SummarizerReport {
  const { startMs, endMs } = validateRange(start, end);
  const inRange = filterPosts(posts, startMs, endMs);
  return {
    timeRange: { start, end },
    postCount: inRange.length,
    posts: inRange,
    summary: summarizePosts(inRange),
  };
}
