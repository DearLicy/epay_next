"use client";

import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export function FormSwitch({ name, label, defaultChecked }: { name: string; label: string; defaultChecked?: boolean }) {
  const [checked, setChecked] = useState(Boolean(defaultChecked));

  return (
    <div className="flex items-center justify-between rounded-lg border bg-background px-3 py-2">
      <Label className="text-sm font-medium">{label}</Label>
      <input type="hidden" name={name} value={checked ? "on" : ""} />
      <Switch checked={checked} onCheckedChange={setChecked} />
    </div>
  );
}