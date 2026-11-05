export const NPC_MODEL_PATHS = [
  "/models/minion-b01.glb",
  "/models/minion-c01.glb",
  "/models/minion-d01.glb",
] as const;

export const NPC_DIALOGUES = [
  "授人以鱼不如授人以渔",
  "爱你所爱",
  "今天你吃饭没？",
  "今天也要好好睡觉",
  "受苦比解决问题更轻松",
  "你对我的百般注解和认识，并不构成万分之一的我，却是一览无余的你",
  "看看小茄的作品集吧",
] as const;

export type NpcPlacement = {
  id: number;
  modelPath: (typeof NPC_MODEL_PATHS)[number];
  text: (typeof NPC_DIALOGUES)[number];
  x: number;
  z: number;
  rotation: number;
};

export type NpcObstacle = { x: number; z: number; halfWidth: number; halfDepth: number; height?: number };
export type NpcPosition = { x: number; y: number; z: number };
export type NpcDialogue = { id: number; name: string; text: string | null };
export const NPC_INTERACTION_DISTANCE = 4.2;
export const NPC_COLLISION_DISTANCE = 1.15;

// Three visitors along the street, two around the plaza and two on the open
// starfield side. All points are inside the player's [-43, 18] Z bounds.
const SPAWN_ZONES = [
  { count: 3, points: [[-4, -3], [4, -8], [-4, -14], [4, -19]] },
  { count: 2, points: [[-4, -25], [4, -28], [4, -38]] },
  { count: 2, points: [[-5, 10], [5, 12], [0, 16]] },
] as const;

function shuffle<T>(items: readonly T[], random: () => number) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index--) {
    const next = Math.floor(Math.max(0, Math.min(0.999999, random())) * (index + 1));
    [result[index], result[next]] = [result[next], result[index]];
  }
  return result;
}

export function createNpcPlacements(obstacles: readonly NpcObstacle[], random: () => number = Math.random): NpcPlacement[] {
  const points = SPAWN_ZONES.flatMap((zone) => shuffle(zone.points.filter(([x, z]) =>
    !obstacles.some((block) => Math.abs(x - block.x) < block.halfWidth + 1.5 && Math.abs(z - block.z) < block.halfDepth + 1.5),
  ), random).slice(0, zone.count));
  // Repeating the three supplied models keeps GPU memory bounded while the
  // model assignment changes with the scene's random arrangement.
  const models = shuffle([...NPC_MODEL_PATHS, ...NPC_MODEL_PATHS, NPC_MODEL_PATHS[0]], random);
  const texts = shuffle(NPC_DIALOGUES, random);
  return points.map(([x, z], index) => ({
    id: index + 1,
    modelPath: models[index],
    text: texts[index],
    x,
    z,
    rotation: (random() - 0.5) * Math.PI * 2,
  }));
}

const distanceSquared = (npc: NpcPlacement, player: NpcPosition) => (npc.x - player.x) ** 2 + (npc.z - player.z) ** 2;

export function createNpcConversation(npcs: readonly NpcPlacement[]) {
  let nearest: NpcPlacement | null = null;
  let speaker: NpcPlacement | null = null;
  let remaining = 0;
  let snapshot: NpcDialogue | null = null;

  function publish() {
    const target = speaker ?? nearest;
    const text = speaker?.text ?? null;
    if (!target && !snapshot) return;
    if (snapshot?.id === target?.id && snapshot?.text === text) return;
    snapshot = target ? { id: target.id, name: `街区访客 ${String(target.id).padStart(2, "0")}`, text } : null;
  }

  return {
    update(player: NpcPosition, dt: number, enabled: boolean, visible: (npc: NpcPlacement) => boolean) {
      nearest = null;
      if (!enabled || Math.abs(player.y) > 2.5) {
        speaker = null;
        remaining = 0;
      } else {
        let bestDistance = NPC_INTERACTION_DISTANCE ** 2;
        for (const npc of npcs) {
          const distance = distanceSquared(npc, player);
          if (distance <= bestDistance && visible(npc)) { nearest = npc; bestDistance = distance; }
        }
        if (speaker) {
          remaining -= Math.max(0, dt);
          if (remaining <= 0 || distanceSquared(speaker, player) > (NPC_INTERACTION_DISTANCE + 0.8) ** 2 || !visible(speaker)) {
            speaker = null;
            remaining = 0;
          }
        }
      }
      publish();
    },
    interact() {
      // Holding F or tapping repeatedly never restarts an open sentence.
      if (!nearest || speaker) return false;
      speaker = nearest;
      remaining = Math.max(4.8, [...speaker.text].length * 0.18 + 1.5);
      publish();
      return true;
    },
    reset() { nearest = null; speaker = null; remaining = 0; publish(); },
    getSnapshot: () => snapshot,
    getTarget: () => speaker ?? nearest,
    getSpeakerId: () => speaker?.id ?? null,
  };
}
