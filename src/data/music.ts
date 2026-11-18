/**
 * Chiptune tracks. Each room names one via `RoomDef.music`.
 * Notes are frequencies in Hz (0 = rest). `bass` plays every other step, `lead` every step.
 * To give a new room its own song, add a track here and reference its id.
 */
export interface Track {
  bpm: number;
  bass: number[];
  lead: number[];
  bassWave: OscillatorType;
  leadWave: OscillatorType;
  leadVol: number;
}

export const TRACKS: Record<string, Track> = {
  // Lobby: bright, bouncy elevator music.
  lobby: {
    bpm: 108,
    bass: [131, 131, 165, 165, 175, 175, 196, 196],
    lead: [523, 659, 784, 659, 698, 880, 784, 0, 659, 784, 988, 784, 698, 587, 523, 0],
    bassWave: 'triangle',
    leadWave: 'square',
    leadVol: 0.035,
  },
  // Stakeholders: sleepy, slightly wonky meeting-room lounge.
  stakeholders: {
    bpm: 88,
    bass: [110, 110, 82.4, 82.4, 98, 98, 73.4, 73.4],
    lead: [392, 0, 330, 392, 0, 494, 440, 0, 392, 0, 330, 294, 0, 330, 0, 0],
    bassWave: 'triangle',
    leadWave: 'square',
    leadVol: 0.03,
  },
};
