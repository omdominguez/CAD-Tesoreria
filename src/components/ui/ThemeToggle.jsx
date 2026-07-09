import React from "react";
import { Monitor, Sun, Moon } from "lucide-react";
import { useThemeMode } from "../../hooks/useThemeMode";
import { Segmented } from "./Buttons";

export function ThemeToggle({ compact }) {
  const { mode, setMode } = useThemeMode();

  const options = [
    { id: "auto", label: compact ? "" : "Auto", icon: Monitor },
    { id: "light", label: compact ? "" : "Claro", icon: Sun },
    { id: "dark", label: compact ? "" : "Oscuro", icon: Moon },
  ];

  return <Segmented value={mode} onChange={setMode} options={options} />;
}
