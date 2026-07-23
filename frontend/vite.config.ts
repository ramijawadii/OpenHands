/// <reference types="vitest" />
/// <reference types="vite-plugin-svgr/client" />
import { readFileSync } from "node:fs";
import { resolve as pathResolve } from "node:path";
import { defineConfig, loadEnv, type Plugin } from "vite";
import viteTsconfigPaths from "vite-tsconfig-paths";
import svgr from "vite-plugin-svgr";
import { reactRouter } from "@react-router/dev/vite";
import { configDefaults } from "vitest/config";
import tailwindcss from "@tailwindcss/vite";

/**
 * Load webpack-style `?text` imports as raw strings.
 *
 * @datalayer/jupyter-react's JupyterLite server code does
 * `import SW_URL from './service-worker?text'` (a webpack raw-loader idiom Vite
 * doesn't understand). We never use the in-browser JupyterLite kernel — we talk
 * to the server-backed kernel through the control-plane proxy — but the module
 * is still in the graph, so it must at least resolve to a valid default export.
 * We vendor the transform here rather than pull an external loader dep
 * (own-the-supply-chain). The `\0` prefix marks the id virtual so no other
 * plugin touches it.
 */
function jupyterTextLoader(): Plugin {
  const SUFFIX = "?text";
  const MARK = "\0cg-text:";
  return {
    name: "cg-jupyter-text-loader",
    enforce: "pre",
    async resolveId(source, importer, options) {
      if (!source.endsWith(SUFFIX)) return null;
      const base = source.slice(0, -SUFFIX.length);
      const resolved = await this.resolve(base, importer, {
        ...options,
        skipSelf: true,
      });
      return resolved ? MARK + resolved.id : null;
    },
    load(id) {
      if (!id.startsWith(MARK)) return null;
      const file = id.slice(MARK.length);
      return `export default ${JSON.stringify(readFileSync(file, "utf-8"))};`;
    },
  };
}

/**
 * Load `*.raw.css` as a raw STRING (default export), not a stylesheet.
 *
 * JupyterLab's apputils-extension does `import scrollbarCss from
 * './scrollbar.raw.css'` (webpack `raw-loader` idiom — the CSS text as a string,
 * injected at runtime). Vite treats any `.css` as a side-effect stylesheet with
 * no default export, so the import throws `"default" is not exported`. We resolve
 * the file, then serve it from a VIRTUAL id that does NOT end in `.css` (so
 * Vite's CSS pipeline ignores it) whose content is `export default "<text>"`.
 */
function rawCssLoader(): Plugin {
  const SUFFIX = ".rawcssjs";
  return {
    name: "cg-raw-css-loader",
    enforce: "pre",
    async resolveId(source, importer, options) {
      if (!source.endsWith(".raw.css")) return null;
      const resolved = await this.resolve(source, importer, {
        ...options,
        skipSelf: true,
      });
      return resolved ? `\0${resolved.id}${SUFFIX}` : null;
    },
    load(id) {
      if (!id.startsWith("\0") || !id.endsWith(SUFFIX)) return null;
      const file = id.slice(1, -SUFFIX.length);
      return `export default ${JSON.stringify(readFileSync(file, "utf-8"))};`;
    },
  };
}

/**
 * Strip the legacy webpack `~` prefix from CSS `@import` / `url()` specifiers.
 *
 * The full JupyterLab app-shell extensions (pulled in by JupyterLabApp) ship CSS
 * like `@import '~react-toastify/dist/ReactToastify.min.css'`. The `~` is a
 * webpack convention meaning "resolve from node_modules"; Vite / @tailwindcss's
 * CSS resolver doesn't understand it and the build fails with "Can't resolve
 * '~react-toastify/...'". Rewriting `~pkg` → `pkg` makes it a bare specifier that
 * resolves normally (react-toastify et al. are installed). Runs `pre` so the
 * rewrite happens before Tailwind/Vite try to resolve the import.
 */
function stripTildeCssImports(): Plugin {
  return {
    name: "cg-strip-tilde-css-imports",
    enforce: "pre",
    transform(code, id) {
      if (!id.endsWith(".css") || !code.includes("~")) return null;
      const out = code
        .replace(/@import\s+(['"])~/g, "@import $1")
        .replace(/url\(\s*(['"]?)~/g, "url($1");
      return out === code ? null : { code: out, map: null };
    },
  };
}

export default defineConfig(({ mode }) => {
  const {
    VITE_BACKEND_HOST = "127.0.0.1:3000",
    VITE_USE_TLS = "false",
    VITE_FRONTEND_PORT = "3001",
    VITE_INSECURE_SKIP_VERIFY = "false",
  } = loadEnv(mode, process.cwd());

  const USE_TLS = VITE_USE_TLS === "true";
  const INSECURE_SKIP_VERIFY = VITE_INSECURE_SKIP_VERIFY === "true";
  const PROTOCOL = USE_TLS ? "https" : "http";
  const WS_PROTOCOL = USE_TLS ? "wss" : "ws";

  const API_URL = `${PROTOCOL}://${VITE_BACKEND_HOST}/`;
  const WS_URL = `${WS_PROTOCOL}://${VITE_BACKEND_HOST}/`;
  const FE_PORT = Number.parseInt(VITE_FRONTEND_PORT, 10);

  return {
    plugins: [
      jupyterTextLoader(),
      rawCssLoader(),
      stripTildeCssImports(),
      !process.env.VITEST && reactRouter(),
      viteTsconfigPaths(),
      svgr(),
      tailwindcss(),
    ],
    resolve: {
      alias: [
        // json5 ships an ESM build (dist/index.mjs) that only default-exports;
        // @jupyterlab/settingregistry does `import { parse } from 'json5'`, which
        // Rollup can't satisfy from the ESM entry. Point at the CJS build so the
        // commonjs plugin synthesises the named exports.
        { find: /^json5$/, replacement: "json5/lib/index.js" },
        // Rewrite the legacy webpack `~` prefix in CSS @import specifiers (e.g.
        // `@import '~react-toastify/...'` in the JupyterLab app-shell CSS) to an
        // ABSOLUTE node_modules path. Tailwind's CSS loader honours this alias
        // but resolves a bare `pkg/...` relative to the project root (ENOENT), so
        // we must point it straight at node_modules. No dep starts with `~`.
        {
          find: /^~/,
          replacement: `${pathResolve(process.cwd(), "node_modules")}/`,
        },
      ],
    },
    optimizeDeps: {
      include: [
        // Pre-bundle ALL dependencies to prevent runtime optimization and page reloads
        // These are discovered during initial app load:
        "posthog-js",
        "@tanstack/react-query",
        "react-hot-toast",
        "i18next",
        "i18next-http-backend",
        "i18next-browser-languagedetector",
        "react-i18next",
        "axios",
        "date-fns",
        "@uidotdev/usehooks",
        "react-icons/fa6",
        "react-icons/fa",
        "clsx",
        "tailwind-merge",
        "@heroui/react",
        "lucide-react",
        "react-select",
        "react-select/async",
        "@microlink/react-json-view",
        "socket.io-client",
        // These are discovered when launching conversations:
        "react-icons/vsc",
        "react-icons/lu",
        "react-icons/di",
        "react-icons/io5",
        "react-icons/io", // Added to prevent runtime optimization
        "@monaco-editor/react",
        "react-textarea-autosize",
        "react-markdown",
        "remark-gfm",
        "remark-breaks",
        "react-syntax-highlighter",
        "react-syntax-highlighter/dist/esm/styles/prism",
        "react-syntax-highlighter/dist/esm/styles/hljs",
        // Terminal dependencies - added to prevent runtime optimization
        "@xterm/addon-fit",
        "@xterm/xterm",
        "@xterm/xterm/css/xterm.css",
      ],
    },
    server: {
      port: FE_PORT,
      host: true,
      allowedHosts: true,
      proxy: {
        "/api": {
          target: API_URL,
          changeOrigin: true,
          secure: !INSECURE_SKIP_VERIFY,
        },
        "/ws": {
          target: WS_URL,
          ws: true,
          changeOrigin: true,
          secure: !INSECURE_SKIP_VERIFY,
        },
        "/socket.io": {
          target: WS_URL,
          ws: true,
          changeOrigin: true,
          secure: !INSECURE_SKIP_VERIFY,
          // rewriteWsOrigin: true,
        },
      },
      watch: {
        ignored: ["**/node_modules/**", "**/.git/**"],
      },
    },
    ssr: {
      noExternal: ["react-syntax-highlighter"],
    },
    clearScreen: false,
    test: {
      environment: "jsdom",
      setupFiles: ["vitest.setup.ts"],
      exclude: [...configDefaults.exclude, "tests"],
      coverage: {
        reporter: ["text", "json", "html", "lcov", "text-summary"],
        reportsDirectory: "coverage",
        include: ["src/**/*.{ts,tsx}"],
      },
    },
  };
});
