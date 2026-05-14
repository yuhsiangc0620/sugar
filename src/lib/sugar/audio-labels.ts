import { soundLabels, type SoundLabel } from "./types";

const labelMatchers: Array<[SoundLabel, RegExp]> = [
  ["keyboard_typing", /typing|keyboard|computer keyboard|typewriter/i],
  ["mouse_clicking", /mouse|clicking|click\b|clickety-clack/i],
  ["speech", /speech|conversation|talking|narration|voice|vocal/i],
  ["silence", /silence|quiet|inside small room/i],
  ["notification_sound", /notification|beep|ringtone|alarm|chime|ding|telephone/i],
  ["writing", /writing|pencil|\bpen\b/i],
  ["paper_rustle", /paper|rustle|crumpling|crinkling|tearing|scratch|scrape|rub/i],
  ["drinkware", /cup|glass|chink|clink|dishes|cutlery|silverware|pour|drip|liquid/i],
  ["desk_movement", /tap|knock|thump|thud|slap|keys jangling|coin|zipper/i],
  ["door_or_drawer", /door|doorbell|ding-dong|drawer|cupboard|sliding door|slam/i],
  ["footsteps", /footsteps|walk|shuffle|run/i],
  ["cough_sneeze", /cough|sneeze|throat clearing|sniff|breathing|sigh/i],
  ["music", /music|song|radio|television|jingle|piano|guitar|ambient music/i],
  ["fan_or_ac", /fan|air conditioning|air conditioner|mains hum|hum|whir/i],
  ["printer_or_device", /printer|camera|mechanical|clock|tick|cash register/i],
  ["kitchen_appliance", /microwave|blender|water tap|faucet|sink|boiling|kettle|chopping|frying/i],
  ["pet_sound", /dog|bark|cat|meow|purr|domestic animals|pets/i],
  ["environment_noise", /noise|environment|ambient|vehicle|traffic|rain|wind|outside/i],
];

export function mapAudioCategory(rawLabel: string, confidence = 0): SoundLabel {
  const normalized = rawLabel.trim();

  if (confidence < 0.08) {
    return "silence";
  }

  for (const [label, matcher] of labelMatchers) {
    if (matcher.test(normalized)) {
      return label;
    }
  }

  return "environment_noise";
}

export function isSoundLabel(value: string): value is SoundLabel {
  return soundLabels.includes(value as SoundLabel);
}

export const soundLabelCopy: Record<SoundLabel, string> = {
  keyboard_typing: "鍵盤敲擊",
  mouse_clicking: "滑鼠點擊",
  speech: "說話聲",
  silence: "安靜",
  notification_sound: "通知聲",
  writing: "書寫聲",
  paper_rustle: "紙張摩擦",
  drinkware: "杯盤聲",
  desk_movement: "桌面移動",
  door_or_drawer: "門與抽屜",
  footsteps: "腳步聲",
  cough_sneeze: "咳嗽噴嚏",
  music: "音樂",
  fan_or_ac: "風扇冷氣",
  printer_or_device: "設備運轉",
  kitchen_appliance: "廚房電器",
  pet_sound: "寵物聲",
  environment_noise: "環境聲",
};

export const soundLabelColors: Record<SoundLabel, string> = {
  keyboard_typing: "#ff7e79",
  mouse_clicking: "#f8a65d",
  speech: "#eaa0c8",
  silence: "#cfc9f2",
  notification_sound: "#c84f5f",
  writing: "#f3bd72",
  paper_rustle: "#dccda7",
  drinkware: "#99c8d6",
  desk_movement: "#d9987c",
  door_or_drawer: "#b8a6df",
  footsteps: "#a9c18f",
  cough_sneeze: "#efb3aa",
  music: "#c48ec5",
  fan_or_ac: "#8eb9c4",
  printer_or_device: "#8aa0c2",
  kitchen_appliance: "#f2a779",
  pet_sound: "#d8a0a8",
  environment_noise: "#6d88b8",
};
