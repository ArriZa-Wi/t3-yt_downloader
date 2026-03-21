"use client";

import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

interface FormatPickerProps {
  format: "mp3" | "mp4";
  quality: string;
  onFormatChange: (f: "mp3" | "mp4") => void;
  onQualityChange: (q: string) => void;
}

export function FormatPicker({
  format,
  quality,
  onFormatChange,
  onQualityChange,
}: FormatPickerProps) {
  return (
    <div className="space-y-3">
      <RadioGroup
        value={format}
        onValueChange={(v) => onFormatChange(v as "mp3" | "mp4")}
        className="flex gap-6"
      >
        <div className="flex items-center gap-2">
          <RadioGroupItem value="mp3" id="fmt-mp3" className="border-primary text-primary" />
          <Label htmlFor="fmt-mp3" className="cursor-pointer text-sm text-foreground">
            MP3 — Audio only
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <RadioGroupItem value="mp4" id="fmt-mp4" className="border-primary text-primary" />
          <Label htmlFor="fmt-mp4" className="cursor-pointer text-sm text-foreground">
            MP4 — Video
          </Label>
        </div>
      </RadioGroup>

      {format === "mp4" && (
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Quality:</span>
          <Select value={quality} onValueChange={(v) => v && onQualityChange(v)}>
            <SelectTrigger className="w-32 bg-secondary border-border text-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-secondary border-border text-foreground">
              <SelectItem value="best">Best</SelectItem>
              <SelectItem value="1080p">1080p</SelectItem>
              <SelectItem value="720p">720p</SelectItem>
              <SelectItem value="480p">480p</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
