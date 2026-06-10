import React from "react";

type Theme = "dark" | "light";

interface ThemeContextValue {
  theme: Theme;
  toggle: () => void;
  set: (t: Theme) => void;
}

const ThemeContext = React.createContext<ThemeContextValue>({
  theme: "dark",
  toggle: () => {},
  set: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = React.useState<Theme>(() => {
    try {
      return (localStorage.getItem("cg_theme") as Theme) ?? "dark";
    } catch {
      return "dark";
    }
  });

  React.useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem("cg_theme", theme);
    } catch {
      // ignore
    }
  }, [theme]);

  const toggle = React.useCallback(() => {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }, []);
  const set = React.useCallback((t: Theme) => setTheme(t), []);

  const value = React.useMemo(
    () => ({ theme, toggle, set }),
    [theme, toggle, set],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  return React.useContext(ThemeContext);
}
