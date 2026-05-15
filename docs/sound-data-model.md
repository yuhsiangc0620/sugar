# SUGAR Sound Data Model

SUGAR should treat MediaPipe/YAMNet output as a noisy signal and store a curated work-from-home category beside the raw model label. The app never stores raw audio.

## Work-From-Home Sound Categories

| SUGAR category | UI copy | Typical YAMNet labels |
| --- | --- | --- |
| `keyboard_typing` | 鍵盤敲擊 | Typing, Computer keyboard, Typewriter |
| `mouse_clicking` | 滑鼠點擊 | Mouse, Clicking, Click |
| `speech` | 說話聲 | Speech, Conversation, Narration |
| `silence` | 安靜 | Silence, quiet low-confidence windows |
| `notification_sound` | 通知聲 | Beep, Ding, Ringtone, Telephone bell ringing, Alarm |
| `writing` | 書寫聲 | Writing |
| `paper_rustle` | 紙張摩擦 | Rustle, Crumpling, crinkling, Tearing |
| `drinkware` | 杯盤聲 | Dishes, Cutlery, Glass, Pour, Drip |
| `desk_movement` | 桌面移動 | Tap, Knock, Thump, Keys jangling |
| `door_or_drawer` | 門與抽屜 | Door, Doorbell, Drawer open or close, Cupboard open or close |
| `footsteps` | 腳步聲 | Walk, footsteps, Shuffle |
| `cough_sneeze` | 咳嗽噴嚏 | Cough, Sneeze, Throat clearing, Sniff |
| `music` | 音樂 | Music, Radio, Television, Jingle |
| `fan_or_ac` | 風扇冷氣 | Mechanical fan, Air conditioning, Hum, Whir |
| `printer_or_device` | 設備運轉 | Printer, Clock, Camera, Mechanical |
| `kitchen_appliance` | 廚房電器 | Microwave oven, Blender, Water tap, Chopping, Frying |
| `pet_sound` | 寵物聲 | Dog, Bark, Cat, Meow, Purr |
| `environment_noise` | 環境聲 | Environmental noise, Vehicle, Traffic, Rain, Wind |

## Notion Sound Events Database

Use one Notion database for derived sound windows. Each row represents one local classification window, usually about 5 seconds.

| Property | Type | Purpose |
| --- | --- | --- |
| `Name` | title | Human-readable row title, such as `Sound keyboard_typing` |
| `date` | date | Taipei local date for rollups |
| `started_at` | date with time | Start of the classified audio window |
| `ended_at` | date with time | End of the classified audio window |
| `duration_seconds` | number | Window duration, used for sound proportions |
| `category` | select | Curated SUGAR category |
| `raw_category` | text | Top MediaPipe/YAMNet category name |
| `confidence` | percent number | Top category confidence |
| `session_id` | text | Browser session identifier |
| `user_name` | text | User label, usually from `NEXT_PUBLIC_SUGAR_USER_NAME` |
| `source` | select | `browser_mediapipe`, `demo`, or `device_api` |

## API Payload

```json
{
  "timestamp": "2026-05-15T09:00:00.000+08:00",
  "endedAt": "2026-05-15T09:00:05.000+08:00",
  "durationSeconds": 5,
  "label": "keyboard_typing",
  "rawLabel": "Computer keyboard",
  "confidence": 0.74,
  "sessionId": "sugar-session-id",
  "userName": "yuhsiang",
  "source": "browser_mediapipe"
}
```

Daily summaries should use duration-weighted proportions. A long stretch of fan noise should count differently from one brief click.
