import { describe, expect, it } from "vitest";
import { mapAudioCategory } from "./audio-labels";

describe("mapAudioCategory", () => {
  it("maps classifier labels into SUGAR labels", () => {
    expect(mapAudioCategory("Computer keyboard", 0.7)).toBe("keyboard_typing");
    expect(mapAudioCategory("Mouse click", 0.7)).toBe("mouse_clicking");
    expect(mapAudioCategory("Speech", 0.7)).toBe("speech");
    expect(mapAudioCategory("Notification bell", 0.7)).toBe("notification_sound");
    expect(mapAudioCategory("Air conditioner", 0.7)).toBe("fan_or_ac");
    expect(mapAudioCategory("Writing", 0.7)).toBe("writing");
    expect(mapAudioCategory("Crumpling, crinkling", 0.7)).toBe("paper_rustle");
    expect(mapAudioCategory("Drawer open or close", 0.7)).toBe("door_or_drawer");
    expect(mapAudioCategory("Dishes, pots, and pans", 0.7)).toBe("drinkware");
    expect(mapAudioCategory("Printer", 0.7)).toBe("printer_or_device");
  });

  it("treats low confidence as silence", () => {
    expect(mapAudioCategory("Speech", 0.02)).toBe("silence");
  });
});
