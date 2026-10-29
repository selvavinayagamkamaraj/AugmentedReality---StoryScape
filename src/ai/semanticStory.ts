import type { StoryData, StoryCharacter, StoryObject3D, CharacterAction, CharacterActionType, CharacterType, StoryScene } from '../types/story.ts';

const verbs: Record<string, CharacterActionType> = {
  walk: 'walk', walks: 'walk', walked: 'walk', walking: 'walk', approach: 'walk', approaches: 'walk',
  run: 'run', runs: 'run', ran: 'run', jump: 'jump', jumps: 'jump', jumped: 'jump', hops: 'jump',
  eat: 'eat', eats: 'eat', ate: 'eat', eating: 'eat', say: 'talk', says: 'talk', said: 'talk', talks: 'talk',
  fly: 'fly', flies: 'fly', flew: 'fly', sit: 'sit', sits: 'sit', sat: 'sit',
  see: 'look', sees: 'look', saw: 'look', looks: 'look', reads: 'read', read: 'read',
  drinks: 'drink', drink: 'drink', chases: 'chase', chase: 'chase', picks: 'pick', pick: 'pick',
  waves: 'wave', wave: 'wave', turns: 'turn', turn: 'turn', sleeps: 'sleep', climbs: 'climb',
  meets: 'look', discovers: 'look', finds: 'look', watches: 'look', dances: 'happy', smiles: 'happy',
  swing: 'jump', swings: 'jump', swung: 'jump', swoop: 'fly', swoops: 'fly', swooped: 'fly',
  glide: 'fly', glides: 'fly', crawl: 'walk', crawls: 'walk',
};
const characterKinds: Record<string, CharacterType> = {
  cat: 'cat', kitten: 'cat', dog: 'dog', puppy: 'dog', bird: 'bird', parrot: 'bird', sparrow: 'bird',
  rabbit: 'rabbit', bunny: 'rabbit', human: 'human', boy: 'human', girl: 'human', wizard: 'human',
  astronaut: 'human', knight: 'human', robot: 'robot', alien: 'alien', butterfly: 'butterfly', dragon: 'dragon',
  bat: 'bat', spiderman: 'spiderman', 'spider-man': 'spiderman', 'spider man': 'spiderman',
  batman: 'hero', superman: 'hero', ironman: 'hero', 'iron man': 'hero', superhero: 'hero',
  hero: 'hero', ninja: 'human', pirate: 'human', princess: 'human',
};
const colors: Record<string, string> = { orange: '#fb923c', red: '#ef4444', blue: '#38bdf8', green: '#22c55e', white: '#ffffff',
  black: '#334155', purple: '#a855f7', pink: '#ec4899', yellow: '#facc15', golden: '#eab308', brown: '#92400e' };
const sizes: Record<string, number> = { apple: 0.08, cat: 0.3, bird: 0.22, human: 1.7, spiderman: 1.7, bat: 0.28, hero: 1.75, table: 0.75, chair: 0.9,
  book: 0.24, cup: 0.12, bicycle: 1.1, tree: 1.8, crystal: 0.2, ball: 0.15, fruit: 0.15, chest: 0.35 };
export const environmentRecipes: Record<string, string[]> = {
  forest: ['tree', 'tree', 'bush', 'rock', 'flower', 'leaves'], garden: ['tree', 'flower', 'bush', 'rock'],
  beach: ['sand', 'water', 'rock', 'plant', 'waves'], city: ['building', 'road', 'vehicle', 'sign'],
  space: ['star', 'planet', 'asteroid', 'spacecraft'], underwater: ['water', 'fish', 'rock', 'plant'],
};
const idOf = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'entity';
const wordPattern = new RegExp(`\\b(${Object.keys(verbs).join('|')})\\b`, 'gi');
const stop = new Set(['across', 'onto', 'on', 'into', 'in', 'under', 'over', 'toward', 'towards', 'to', 'from', 'with', 'and', 'then', 'who', 'that', 'where', 'is', 'are', 'was', 'named', 'behind', 'beside', 'at', 'of', 'as', 'near']);
const excluded = new Set(['floor', 'room', 'ground', 'wall', ...Object.keys(environmentRecipes)]);
const knownShape = /apple|carrot|cheese|fish|chest|book|ball|tree|rock|stone|flower|bush|plant|chair|table|spaceship|saucer|rocket|cup|crystal|bicycle|fruit|sand|water|wave|star|planet|asteroid|building|road|sign|leaves/;

/** Transparent English fallback: preserve unknown noun phrases and disclose unparsed text. */
export function parseStory(prompt: string): StoryData {
  const originalPrompt = prompt.trim().slice(0, 12000);
  const quotes = [...originalPrompt.matchAll(/["“']([^"”']+)["”']/g)];
  const source = originalPrompt.replace(/["“']([^"”']+)["”']/g, m => ' '.repeat(m.length));
  const words = [...source.matchAll(/[a-z][a-z'-]*/gi)].map(m => ({ word: m[0].toLowerCase(), index: m.index! }));
  const entities = new Map<string, { name: string; head: string; at: number; actor: boolean }>();
  for (let i = 0; i < words.length; i++) {
    if (!['a', 'an', 'the', 'some', 'my', 'his', 'her', 'their'].includes(words[i].word)) continue;
    const phrase: typeof words = [];
    let j = i + 1;
    while (j < words.length && phrase.length < 7 && !verbs[words[j].word] && !stop.has(words[j].word)
      && !['a', 'an', 'the'].includes(words[j].word)) {
      if (j > i + 1 && /[,.!?;]/.test(source.slice(words[j - 1].index + words[j - 1].word.length, words[j].index))) break;
      phrase.push(words[j++]);
    }
    if (!phrase.length) continue;
    const head = phrase.at(-1)!.word; // Preserve compound and unfamiliar nouns.
    if (excluded.has(head)) continue;
    const key = ['fruit', 'crystal', 'chest'].includes(head) ? phrase.map(w => w.word).filter(w => !colors[w]).slice(-2).join(' ') : head;
    if (!entities.has(key)) entities.set(key, { name: phrase.map(w => w.word).join(' '), head, at: phrase[0].index,
      actor: !!characterKinds[head] || (!!verbs[words[j]?.word] && !/[,.;!?]/.test(source.slice(phrase.at(-1)!.index + head.length, words[j]?.index))) });
  }
  // Bare known nouns and proper-name subjects are also retained.
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (characterKinds[w.word] && ![...entities.values()].some(e => e.name.split(' ').includes(w.word))) entities.set(w.word, { name: w.word, head: w.word, at: w.index, actor: true });
    if (verbs[words[i + 1]?.word] && !verbs[w.word] && !stop.has(w.word) && !['it', 'he', 'she', 'they'].includes(w.word)
      && ![...entities.values()].some(e => e.head === w.word) && !excluded.has(w.word)) {
      entities.set(w.word, { name: w.word, head: w.word, at: w.index, actor: true });
    }
  }
  // A bare direct object ("cat eats apple") still becomes its own entity.
  for (let i = 0; i < words.length - 1; i++) {
    if (!verbs[words[i].word]) continue;
    let j = i + 1;
    while (['up', 'at', 'toward', 'towards'].includes(words[j]?.word)) j++;
    const w = words[j];
    if (!w || stop.has(w.word) || verbs[w.word] || excluded.has(w.word) || ['a', 'an', 'the', 'it', 'he', 'she', 'they', 'them'].includes(w.word)) continue;
    if (![...entities.values()].some(e => e.name.split(' ').includes(w.word))) entities.set(w.word, { name: w.word, head: w.word, at: w.index, actor: false });
  }
  const characters: StoryCharacter[] = [];
  const objects: StoryObject3D[] = [];
  for (const [key, e] of entities) {
    const color = Object.entries(colors).find(([name]) => e.name.split(' ').includes(name))?.[1];
    const id = idOf(key);
    if (e.actor) {
      let resolvedType = characterKinds[e.head] || characterKinds[key];
      if (!resolvedType) {
        const lower = e.name.toLowerCase();
        if (/spider[- ]?man/i.test(lower)) resolvedType = 'spiderman';
        else if (/\bbat\b|\bbats\b/i.test(lower)) resolvedType = 'bat';
        else if (/batman|superman|ironman|iron man|hero|avenger/i.test(lower)) resolvedType = 'hero';
        else resolvedType = e.head;
      }
      characters.push({
        id,
        name: e.name,
        type: resolvedType,
        appearance: e.name,
        color,
        initialScale: sizes[resolvedType] || sizes[e.head] || (/spiderman|hero|human/.test(resolvedType) ? 1.75 : 0.35)
      });
    }
    else objects.push({ id, name: e.name, type: /table|chair|bed|desk/.test(e.head) ? 'furniture' : 'prop', appearance: e.name,
      color, scale: sizes[e.head], placeholder: !knownShape.test(e.head), surfaceAnchor: 'floor' });
  }
  const warnings = ['Rule-based English parsing is approximate. Original text is retained; review the cast, objects and timeline.'];
  if (!characters.length) characters.push({ id: 'story_guide', name: 'Story guide', type: 'generic', appearance: 'narrative guide' });
  const scenes: StoryScene[] = [];
  let actor = characters[0].id;
  let lastObject: StoryObject3D | undefined;
  let currentSurface: CharacterAction['targetSurface'] = 'floor';
  const matches = [...source.matchAll(wordPattern)];
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i]; const start = match.index!; const end = matches[i + 1]?.index ?? source.length;
    const prefix = source.slice(i ? matches[i - 1].index! : 0, start).toLowerCase();
    const candidates = characters.map(c => ({ c, index: prefix.lastIndexOf(c.id.replaceAll('_', ' ')) })).filter(c => c.index >= 0).sort((a, b) => b.index - a.index);
    if (candidates.length && actor !== candidates[0].c.id) { actor = candidates[0].c.id; currentSurface = 'floor'; }
    const clause = source.slice(start, end).toLowerCase();
    const action = verbs[match[0].toLowerCase()];
    const target = objects.filter(o => clause.includes(o.id.replaceAll('_', ' ')) || clause.includes(o.name.split(' ').at(-1)!))[0];
    if (target) lastObject = target;
    const support = clause.match(/\b(table|chair|floor|wall)\b/)?.[1] as CharacterAction['targetSurface'];
    const targetObject = target || (/\b(it|them)\b/.test(clause) ? lastObject : undefined);
    if (support && ['jump', 'sit', 'climb'].includes(action)) currentSurface = support;
    if (targetObject && targetObject.type !== 'furniture' && currentSurface === 'table') targetObject.surfaceAnchor = 'table';
    const quotesHere = quotes.filter(q => q.index! >= start && q.index! < end);
    scenes.push({ scene_number: scenes.length + 1, title: `${characters.find(c => c.id === actor)?.name} · ${action}`, duration: 3,
      actions: [{ characterId: actor, action, targetObjectId: targetObject?.id,
        targetSurface: support || (['walk', 'run', 'fly'].includes(action) ? currentSurface : undefined), duration: action === 'jump' ? 1.4 : 2.4 }],
      dialogue: action === 'talk' ? quotesHere.map(q => ({ characterId: actor, text: q[1] })) : [] });
  }
  if (!scenes.length) scenes.push({ scene_number: 1, title: 'Your story', duration: 5, narration: originalPrompt,
    actions: [{ characterId: actor, action: 'idle' }], dialogue: [] });
  const theme = Object.keys(environmentRecipes).find(t => new RegExp(`\\b${t}\\b`, 'i').test(source)) || 'room';
  const unrecognized = words.filter(w => !verbs[w.word] && !stop.has(w.word) && !excluded.has(w.word)
    && !['a', 'an', 'the', 'it', 'he', 'she', 'they', 'this', 'is', 'delicious', 'up'].includes(w.word)
    && ![...entities.values()].some(e => e.name.split(' ').includes(w.word))).map(w => w.word);
  if (unrecognized.length) warnings.push(`Unresolved terms retained in original prompt: ${[...new Set(unrecognized)].join(', ')}`);
  return { title: originalPrompt.slice(0, 65) || 'Your story', summary: originalPrompt, originalPrompt, characters, objects, scenes,
    environment: { theme, isHybrid: true, virtualElements: environmentRecipes[theme] || [] }, warnings, nlpSource: 'rules',
    relationships: scenes.flatMap(s => s.actions.filter(a => a.targetObjectId).map(a => ({ subject: a.characterId, predicate: a.action, object: a.targetObjectId! }))) };
}

const string = (value: unknown, fallback = '') => typeof value === 'string' ? value.slice(0, 12000) : fallback;
const finite = (value: unknown, fallback: number, min: number, max: number) => typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
type RecordValue = Record<string, unknown>;
const record = (value: unknown): RecordValue => value && typeof value === 'object' && !Array.isArray(value) ? value as RecordValue : {};
const list = (value: unknown): unknown[] => Array.isArray(value) ? value.slice(0, 100) : [];
const position = (value: unknown) => { const p = record(value); return { x: finite(p.x, 0, -10, 10), y: finite(p.y, 0, -2, 10), z: finite(p.z, 0, -10, 10) }; };
const safeModel = (value: unknown) => typeof value === 'string' && /^\/models\/[a-zA-Z0-9_/-]+\.(glb|gltf)$/.test(value) && !value.includes('..') ? value : undefined;

/** Same boundary validation in browser and server. Keep objects and relationship IDs. */
export function normalizeStory(value: unknown, prompt = ''): StoryData {
  const data = record(value);
  if (!Array.isArray(data.characters) || !Array.isArray(data.scenes) || !data.scenes.length) return parseStory(prompt || string(data.summary));
  const used = new Set<string>();
  const unique = (id: string) => { let result = id; let i = 1; while (used.has(result)) result = `${id}_${i++}`; used.add(result); return result; };
  const characters = list(data.characters).map((raw, i): StoryCharacter => {
    const c = record(raw);
    let type = string(c.type) as CharacterType;
    const nameStr = string(c.name, `Character ${i + 1}`);
    const idStr = string(c.id, `character_${i}`);
    if (!type || type === 'generic') {
      const lower = `${idStr} ${nameStr}`.toLowerCase();
      if (/spider[- ]?man/i.test(lower)) type = 'spiderman';
      else if (/\bbat\b|\bbats\b/i.test(lower)) type = 'bat';
      else if (/hero|superhero|batman|superman|ironman/i.test(lower)) type = 'hero';
    }
    const validTypes = ['human', 'rabbit', 'cat', 'dog', 'robot', 'alien', 'bird', 'butterfly', 'dragon', 'bat', 'spiderman', 'hero', 'generic'];
    return { id: unique(idOf(idStr)), name: nameStr,
      type: validTypes.includes(type) ? type : (type || 'generic'),
      appearance: string(c.appearance, nameStr), color: /^#[0-9a-f]{6}$/i.test(string(c.color)) ? string(c.color) : undefined,
      initialScale: c.initialScale === undefined ? undefined : finite(c.initialScale, 0.3, 0.05, 3), modelUrl: safeModel(c.modelUrl) };
  });
  if (!characters.length) return parseStory(prompt || string(data.summary));
  const normalizeObject = (raw: unknown, i: number): StoryObject3D => {
    const o = record(raw); const name = string(o.name, `Unknown object ${i + 1}`);
    return { id: unique(idOf(string(o.id, name))), name, appearance: string(o.appearance, name),
      type: ['food', 'furniture', 'nature', 'prop', 'vehicle', 'tool'].includes(string(o.type)) ? o.type as StoryObject3D['type'] : 'prop',
      color: /^#[0-9a-f]{6}$/i.test(string(o.color)) ? string(o.color) : undefined,
      scale: o.scale === undefined ? undefined : finite(o.scale, 0.2, 0.02, 4),
      initialPosition: o.initialPosition ? position(o.initialPosition) : undefined,
      surfaceAnchor: ['table', 'chair'].includes(string(o.surfaceAnchor)) ? o.surfaceAnchor as 'table' | 'chair' : 'floor',
      modelUrl: safeModel(o.modelUrl), placeholder: !knownShape.test(name.toLowerCase()) };
  };
  const objects = list(data.objects).map(normalizeObject);
  // Scene objects are promoted once so interactions reference persistent entities.
  for (const raw of list(data.scenes)) for (const o of list(record(raw).objects)) {
    if (!objects.some(existing => existing.id === idOf(string(record(o).id, string(record(o).name))))) objects.push(normalizeObject(o, objects.length));
  }
  const warnings = list(data.warnings).map(w => string(w)).filter(Boolean);
  const validIds = new Set(characters.map(c => c.id)); const objectIds = new Set(objects.map(o => o.id));
  const scenes = list(data.scenes).map((raw, i): StoryScene => {
    const s = record(raw);
    return { scene_number: i + 1, title: string(s.title, `Scene ${i + 1}`), duration: finite(s.duration, 5, 1, 120), narration: string(s.narration),
      actions: list(s.actions).flatMap(rawAction => {
        const a = record(rawAction); const id = idOf(string(a.characterId));
        if (!validIds.has(id)) { warnings.push(`Unresolved actor: ${string(a.characterId)}`); return []; }
        const action = string(a.action) as CharacterActionType;
        const validAction = [...new Set(Object.values(verbs)), 'idle', 'appear', 'disappear', 'sad', 'surprised'].includes(action);
        if (!validAction) warnings.push(`Unsupported action retained for review: ${action}`);
        const targetId = a.targetObjectId ? idOf(string(a.targetObjectId)) : undefined;
        if (targetId && !objectIds.has(targetId)) warnings.push(`Unresolved object reference: ${targetId}`);
        return [{ characterId: id, action: validAction ? action : 'idle', targetObjectId: targetId && objectIds.has(targetId) ? targetId : undefined,
          targetSurface: ['floor', 'table', 'chair', 'wall'].includes(string(a.targetSurface)) ? a.targetSurface as CharacterAction['targetSurface'] : undefined,
          targetPosition: a.targetPosition ? position(a.targetPosition) : undefined,
          duration: finite(a.duration, 2.4, 0.5, 20) }];
      }),
      dialogue: list(s.dialogue).flatMap(rawDialogue => {
        const d = record(rawDialogue); const id = idOf(string(d.characterId));
        return validIds.has(id) ? [{ characterId: id, text: string(d.text) }] : [];
      }) };
  });
  const env = record(data.environment);
  const theme = string(env.theme, 'room');
  return { title: string(data.title, 'Your story'), summary: string(data.summary, prompt), characters, objects, scenes,
    originalPrompt: prompt || string(data.originalPrompt), warnings, nlpSource: string(data.nlpSource, 'local model'),
    environment: { theme, mood: string(env.mood), isHybrid: true, virtualElements: list(env.virtualElements).map(x => string(x)).filter(Boolean).length
      ? list(env.virtualElements).map(x => string(x)).filter(Boolean) : environmentRecipes[theme] || [] },
    relationships: scenes.flatMap(s => s.actions.filter(a => a.targetObjectId).map(a => ({ subject: a.characterId, predicate: a.action, object: a.targetObjectId! }))) };
}

/** Reject local-model outputs which omit explicit actions or duplicate user dialogue. */
export function coverageProblems(story: StoryData, prompt: string): string[] {
  const expected = parseStory(prompt);
  const actual = story.scenes.flatMap(scene => [...scene.actions.map(a => a.action), ...scene.dialogue.filter(d => d.text.trim()).map(() => 'talk')]);
  const problems: string[] = [];
  let cursor = 0;
  for (const action of expected.scenes.flatMap(s => s.actions)) {
    if (action.action === 'idle') continue;
    const index = actual.indexOf(action.action, cursor);
    if (index < 0) problems.push(`omitted or reordered ${action.action}`); else cursor = index + 1;
  }
  for (const line of expected.scenes.flatMap(s => s.dialogue)) {
    const count = story.scenes.flatMap(s => s.dialogue).filter(d => d.text === line.text).length;
    if (count !== 1) problems.push(`dialogue expected once: ${line.text}`);
  }
  return [...new Set(problems)];
}
