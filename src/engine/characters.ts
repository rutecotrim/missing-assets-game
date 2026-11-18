import type { CharacterLook, Facing } from '../core/types';
import { INK, ellipse, shade } from './pixel';
import type { Ctx } from './pixel';

export type R = [number, number, number, number, string]; // x, y, w, h, color

/** Draw a rect list with a 1px dark outline around the whole silhouette. */
export function drawRects(c: Ctx, ox: number, oy: number, rects: R[], withOutline = true) {
  if (withOutline) {
    c.fillStyle = INK;
    for (const [x, y, w, h] of rects) {
      c.fillRect(ox + x - 1, oy + y, w + 2, h);
      c.fillRect(ox + x, oy + y - 1, w, h + 2);
    }
  }
  for (const [x, y, w, h, col] of rects) {
    c.fillStyle = col;
    c.fillRect(ox + x, oy + y, w, h);
  }
}

export interface Pose {
  walking?: boolean;
  step?: number; // animation phase (0..1)
  bob?: number; // idle breathing offset in px
  sleeping?: boolean;
  talking?: boolean;
}

/** Builds the sprite for a character, origin at the feet (0,0), y up is negative. */
export function characterRects(look: CharacterLook, face: Facing, pose: Pose = {}): R[] {
  const r: R[] = [];
  const tall = look.tall ?? 0;
  const walking = !!pose.walking;
  const ph = Math.floor(((pose.step ?? 0) % 1) * 4); // 0..3
  const lift = walking ? [0, 1, 0, 1][ph] : 0;
  const swing = walking ? [0, 1, 0, -1][ph] : 0;
  const bob = pose.bob ?? 0;
  const dir = face.right ? 1 : -1;
  const pantsDark = shade(look.pants, -0.25);

  // legs
  r.push([-3, -6 - tall, 2, 6 + tall - lift, look.pants]);
  r.push([1, -6 - tall, 2, 6 + tall - (walking ? 1 - lift : 0), pantsDark]);
  // shoes
  r.push([-4, -1, 3, 1, '#3a2a3a']);
  r.push([1, -1, 3, 1, '#3a2a3a']);

  const top = -13 - tall + bob;
  // arms (behind body for back view is irrelevant at this scale)
  r.push([-6, top + 1 + swing, 2, 6, look.shirt]);
  r.push([4, top + 1 - swing, 2, 6, look.shirt]);
  r.push([-6, top + 7 + swing, 2, 2, look.skin]);
  r.push([4, top + 7 - swing, 2, 2, look.skin]);
  // torso
  r.push([-4, top, 8, 7 + tall - 0, look.shirt]);
  r.push([-4, top + 5, 8, 2, shade(look.shirt, -0.18)]);
  if (look.tie && face.front) {
    r.push([-1, top, 2, 1, '#ffffff']);
    r.push([0, top + 1, 1, 5, look.tie]);
  }
  if (look.lanyard && face.front) {
    r.push([-2, top, 1, 4, '#ff8a3d']);
    r.push([1, top, 1, 4, '#ff8a3d']);
    r.push([-1, top + 4, 2, 3, '#ffffff']);
  }

  // head
  const hy = top - 8;
  r.push([-4, hy + 1, 8, 7, look.skin]);
  r.push([-3, hy, 6, 1, look.skin]);
  r.push([-3, hy + 8, 6, 1, look.skin]);
  hair(r, look, face, hy);

  if (face.front) {
    const sx = dir > 0 ? 1 : -1;
    // eyes (shifted toward the facing direction)
    r.push([-2 + sx, hy + 4, 1, 2, INK]);
    r.push([1 + sx, hy + 4, 1, 2, INK]);
    // blush
    r.push([-3 + sx, hy + 6, 1, 1, '#f08a8a']);
    r.push([2 + sx, hy + 6, 1, 1, '#f08a8a']);
    // mouth
    if (pose.talking) r.push([sx, hy + 7, 2, 1, '#8a2d3a']);
    else r.push([sx, hy + 7, 1, 1, '#8a4b3a']);
    if (look.glasses) {
      r.push([-3 + sx, hy + 3, 3, 1, '#2b1d3a']);
      r.push([sx, hy + 3, 3, 1, '#2b1d3a']);
      r.push([-3 + sx, hy + 6, 3, 1, '#2b1d3a']);
      r.push([sx, hy + 6, 3, 1, '#2b1d3a']);
    }
  }
  return r;
}

function hair(r: R[], look: CharacterLook, face: Facing, hy: number) {
  const h = look.hair;
  const hl = shade(h, 0.2);
  const back = !face.front;
  switch (look.hairStyle) {
    case 'bald':
      r.push([-3, hy, 6, 1, shade(look.skin, 0.1)]);
      break;
    case 'short':
      r.push([-4, hy, 8, back ? 7 : 3, h]);
      r.push([-3, hy - 1, 6, 1, h]);
      break;
    case 'slick':
      r.push([-4, hy, 8, back ? 6 : 3, h]);
      r.push([-3, hy - 1, 6, 1, hl]);
      break;
    case 'long':
      r.push([-5, hy, 10, back ? 12 : 4, h]);
      r.push([-3, hy - 1, 6, 1, h]);
      if (!back) {
        r.push([-5, hy + 4, 2, 7, h]);
        r.push([3, hy + 4, 2, 7, h]);
      }
      break;
    case 'bun':
      r.push([-4, hy, 8, back ? 7 : 3, h]);
      r.push([-3, hy - 1, 6, 1, h]);
      r.push([face.right ? -3 : 1, hy - 4, 4, 4, h]);
      r.push([face.right ? -2 : 2, hy - 3, 1, 1, hl]);
      break;
    case 'curly':
      r.push([-5, hy - 1, 10, back ? 8 : 4, h]);
      r.push([-4, hy - 3, 8, 3, h]);
      r.push([-2, hy - 4, 4, 1, h]);
      r.push([-3, hy - 2, 1, 1, hl]);
      r.push([1, hy - 3, 2, 1, hl]);
      break;
    case 'cap':
      r.push([-4, hy, 8, 3, '#e8453c']);
      r.push([-3, hy - 1, 6, 1, '#e8453c']);
      r.push([face.right ? 0 : -6, hy + 2, 6, 1, '#b8302a']);
      if (back) r.push([-4, hy + 3, 8, 3, h]);
      break;
  }
}

/** Shadow under a character. */
export function drawShadow(c: Ctx, x: number, y: number) {
  c.globalAlpha = 0.28;
  ellipse(c, x, y, 6, 2, '#1a1030');
  c.globalAlpha = 1;
}

/** Looks for the star of the show. */
export const PLAYER_LOOK: CharacterLook = {
  skin: '#f0c7a0',
  hair: '#ff5d8f',
  hairStyle: 'bun',
  shirt: '#2f2a3a',
  pants: '#4a6fa5',
  glasses: true,
  lanyard: true,
};
