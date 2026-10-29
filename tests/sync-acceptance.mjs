import assert from 'node:assert/strict';
import {parseStory} from '../src/ai/semanticStory.ts';
const prompt="A small orange cat walks across the floor, jumps onto the wooden table, sees a red apple, walks toward it, eats it and says 'This is delicious!' Then a blue bird flies into the room and sits on the chair.";
const response=await fetch('http://localhost:3001/api/active-story',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({story:parseStory(prompt)})});
const result=await response.json();
assert.equal(result.story.objects.length,3); assert.equal(result.story.scenes.length,8);
console.log('Acceptance fixture synced through /api/active-story; objects and actions retained');
