import * as THREE from 'three';
import type { Story } from './story.ts';

export interface ConversationTopic { id: string; question: string; answer: string }

// Small, optional conversations connect the commissions to lives beyond the brief.
// Asking a question never changes a story gate or spends game time.
export function conversationTopics(speaker: string, story: Story): ConversationTopic[] {
  switch (speaker) {
    case 'ranger': return [
      { id: 'arthur', question: 'What was Arthur like on the trail?', answer: 'Slow. Not because he couldn’t walk faster. He kept stopping to straighten a step or show someone a nest. I used to get impatient. Now I catch myself doing it. He left us a way of paying attention.' },
      { id: 'woods', question: 'What should I watch for in the woods?', answer: story.reportPublished ? 'People will be walking the proposed route before the hearing. Give them room, and give the animals more. Your bear photograph is for Arthur. It doesn’t need a location printed underneath it.' : 'Look for movement at the edge of a clearing. Stop before an animal stops for you. Arthur always said a picture ought to leave its subject with the same choices it had before you arrived.' },
    ];
    case 'coach': return [
      { id: 'steps', question: 'Why raise money for the ridge steps?', answer: 'Arthur built the first ones with scrap timber from the harbor. People who couldn’t manage the slope could reach the lookout again. We’re replacing the rotten boards, one club run at a time. A finish line is useful. So is a path that lets everyone get somewhere.' },
      { id: 'home', question: 'Did you always want to stay here?', answer: 'No. I left to race. Came back after an injury and thought it was temporary. Then someone needed a coach, someone needed a lift, and suddenly I had a life again. Staying can be a decision you make more than once.' },
    ];
    case 'editor': return [
      { id: 'paper', question: 'Why keep a little paper going?', answer: 'My father printed ferry times on the back page. Nobody framed them, but people got home because of them. I want the paper to be useful in that way. A face with a name. A plan people can read. A question someone finally has to answer.' },
      { id: 'reporting', question: 'What makes a fair photograph?', answer: story.workshopShared ? 'Those workshop captions are a good start. Kit asked to be called an apprentice. One word changed what the picture said about him. Listening is part of your work, even after the shutter closes.' : 'Ask what your frame leaves out. A meeting gives us questions, not a verdict. A road can threaten a path and help someone keep a job. We need enough context for the people reading to make up their own minds.' },
    ];
    case 'planner': return [
      { id: 'wedding', question: 'What do you hope the couple remembers?', answer: 'The bit just after the ceremony, when everyone exhales. People ask for perfect pictures, but later they look for the crooked tie and the aunt who wouldn’t stop laughing. Leave a little room for the day to be itself.' },
      { id: 'bread', question: 'Arthur mentioned bread on Briar Hill.', answer: 'My grandmother brought jam. Arthur brought bread and insisted he hadn’t baked it, although there was flour on his sleeve. Your mother knew and never said. That is how I remember them: a small kindness, with nobody trying to take credit.' },
    ];
    case 'maker': return [
      { id: 'clay', question: 'What does the old railway mean to you?', answer: 'My grandfather’s clay came over Hollowstone. After the trains stopped he kept a little jar of the last delivery. We still use local clay, but the viaduct reminds me that making something here has always depended on people elsewhere.' },
      { id: 'portrait', question: 'How would you like to be photographed?', answer: 'With the work, but not hidden behind it. There is a thumb mark inside every vase that nobody sees. I like that. Your closer frame can show a person; the wider one can show what their hands have been doing.' },
    ];
    case 'astronomer': return [
      { id: 'roof', question: 'Did Arthur help build the observatory?', answer: 'Repair it. He brought a ladder, two sandwiches and no opinion about astronomy. When the clouds came in he stayed to fix the gutter. I think he understood the place perfectly.' },
      { id: 'night', question: 'What keeps you coming up here?', answer: 'Most nights nothing spectacular happens. The town lights get smaller, somebody makes tea, and we wait. You don’t have to bring a photograph back from every evening. You can tell Arthur about a cloudy one, too.' },
    ];
    case 'boatbuilder': return [
      { id: 'teacher', question: 'How did Arthur teach you?', answer: 'He let me blunt that plane three times before showing me the angle. Then he said his teacher had let him do it four times. I’m not sure I believe that. I say the same thing to Nessa now.' },
      { id: 'crew', question: 'What do Nessa and Kit want for the yard?', answer: 'Nessa wants to build a boat here, not just repair everyone else’s. Kit wants an apprenticeship he can afford to finish. A delivery bay won’t solve everything. But there should be a future here they can picture themselves in.' },
    ];
    default: return [];
  }
}

export function dialoguePages(text: string, limit = 240): string[] {
  const sentences = text.trim().match(/[^.!?]+(?:[.!?]+[”’"]*|$)/g) ?? [];
  const pages: string[] = [];
  for (const sentence of sentences) {
    const words = sentence.trim().split(/\s+/);
    for (const word of words) {
      const last = pages.length - 1;
      if (last < 0 || pages[last].length + word.length + 1 > limit) pages.push(word);
      else pages[last] += `${pages[last] ? ' ' : ''}${word}`;
    }
    // Prefer sentence endings to mid-sentence breaks for the next page.
    if (pages.at(-1)!.length > limit * 0.55) pages.push('');
  }
  return pages.filter(Boolean);
}

export const speakerObjectName = (id: string) => id === 'arthur' ? 'uncle-arthur' : id === 'boatbuilder' ? 'ruth-boatbuilder' : `npc-${id}`;

// A separate lens leaves the player's position, aim, gear and photo framing intact.
export function frameConversation(camera: THREE.PerspectiveCamera, speaker: THREE.Object3D, width: number, height: number, obstacles: THREE.Object3D[] = []) {
  speaker.updateWorldMatrix(true, false);
  const scale = speaker.getWorldScale(new THREE.Vector3()).y;
  const target = speaker.localToWorld(new THREE.Vector3(0, 1.42, 0));
  const front = new THREE.Vector3(0, 0, 1).transformDirection(speaker.matrixWorld);
  const side = new THREE.Vector3(1, 0, 0).transformDirection(speaker.matrixWorld);
  const ray = new THREE.Raycaster();
  const face = speaker.localToWorld(new THREE.Vector3(0, 1.65, 0.22));
  const blocked = (position: THREE.Vector3) => {
    const direction = face.clone().sub(position);
    ray.set(position, direction.clone().normalize()); ray.far = Math.max(0, direction.length() - 0.35);
    return ray.intersectObjects(obstacles, true).some(hit => {
      for (let object: THREE.Object3D | null = hit.object; object; object = object.parent) if (object === speaker) return false;
      return true;
    });
  };
  // A strolling local can stop beside a building. Try nearby front angles before
  // shortening the lens distance, rather than looking through a wall.
  let found = false;
  for (const distance of [3.7, 3, 2.5]) {
    for (const angle of [0, -0.4, 0.4, -0.75, 0.75]) {
      const position = target.clone().addScaledVector(front, Math.cos(angle) * distance * scale)
        .addScaledVector(side, Math.sin(angle) * distance * scale + 0.35);
      position.y += 0.15;
      if (!blocked(position)) { camera.position.copy(position); found = true; break; }
    }
    if (found) break;
  }
  if (!found) camera.position.copy(target).addScaledVector(front, 2.5 * scale);
  camera.fov = 38; camera.aspect = width / height;
  camera.lookAt(target);
  const narrow = width < 700;
  camera.setViewOffset(width, height, narrow ? 0 : width * 0.23, narrow ? height * 0.2 : 0, width, height);
  camera.updateMatrixWorld(true);
}
