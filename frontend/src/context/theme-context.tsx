import React from "react";

type Theme = "dark" | "light";

interface ThemeContextValue {
  theme: Theme;
  toggle: () => void;
}

const ThemeContext = React.createContext<ThemeContextValue>({
  theme: "dark",
  toggle: () => {},
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

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return React.useContext(ThemeContext);
}
