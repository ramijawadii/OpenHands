import React from "react";

type Theme = "dark" | "light";
type Preference = "light" | "dark" | "system";

interface ThemeContextValue {
  theme: Theme; // effective theme actually applied
  preference: Preference; // user choice (system follows the OS)
  toggle: () => void; // light <-> dark (sets an explicit preference)
  set: (t: Theme) => void; // backward-compat explicit set
  setPreference: (p: Preference) => void;
}

const systemTheme = (): Theme =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";

const ThemeContext = React.createContext<ThemeContextValue>({
  theme: "dark",
  preference: "dark",
  toggle: () => {},
  set: () => {},
  setPreference: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPref] = React.useState<Preference>(() => {
    try {
      const v = localStorage.getItem("cg_theme");
      return v === "light" || v === "dark" || v === "system" ? v : "dark";
    } catch {
      return "dark";
    }
  });
  const [sysTheme, setSysTheme] = React.useState<Theme>(systemTheme);

  React.useEffect(() => {
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!mq) return undefined;
    const onChange = () => setSysTheme(mq.matches ? "dark" : "light");
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  const theme: Theme = preference === "system" ? sysTheme : preference;

  React.useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem("cg_theme", preference);
    } catch {
      // ignore
    }
  }, [theme, preference]);

  const setPreference = React.useCallback((p: Preference) => setPref(p), []);
  const toggle = React.useCallback(
    () =>
      setPref((p) => {
        const eff = p === "system" ? systemTheme() : p;
        return eff === "dark" ? "light" : "dark";
      }),
    [],
  );
  const set = React.useCallback((t: Theme) => setPref(t), []);

  const value = React.useMemo(
    () => ({ theme, preference, toggle, set, setPreference }),
    [theme, preference, toggle, set, setPreference],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  return React.useContext(ThemeContext);
}
