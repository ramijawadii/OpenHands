/**
 * Re-export shim.
 *
 * The Elements import `./surfaces`, but the registry installs it through the
 * `lib` alias, so it landed in src/utils. Re-exporting keeps the vendor files
 * byte-identical to upstream — the alternative was editing 90-odd components,
 * which would have to be redone on every `assistant-ui add`.
 */
export * from "#/utils/surfaces";
