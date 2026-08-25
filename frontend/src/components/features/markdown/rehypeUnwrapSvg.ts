import { visit } from "unist-util-visit";
import type { Root, Element } from "hast";

/**
 * Rehype plugin: lift <svg> out of wrapping <p> tags.
 *
 * remark treats inline SVG as inline content and wraps it in <p>.
 * A <p> containing a block element is invalid HTML — the browser
 * auto-closes the <p> before the <svg>, breaking the tree.
 * This plugin splices the SVG children directly into the parent,
 * removing the invalid <p> wrapper.
 */
export function rehypeUnwrapSvg() {
  return (tree: Root) => {
    // The visitor's types are INFERRED, not annotated.
    //
    // Annotating `node: Element` looks right and does not compile: a hast `Root`
    // in this project can also contain MDX JSX nodes, so the visitor `visit`
    // expects is wider than `Element` and the two signatures do not match.
    // Letting inference supply the union and narrowing inside is both correct
    // and the only version that typechecks.
    visit(tree, "element", (node, index, parent) => {
      const el = node as Element;
      if (el.tagName !== "p" || !parent || index == null) return;

      const svgChildren = el.children.filter(
        (c) => c.type === "element" && (c as Element).tagName === "svg",
      );
      const nonWhitespace = el.children.filter(
        (c) =>
          !(c.type === "text" && /^\s*$/.test((c as { value: string }).value)),
      );

      if (
        svgChildren.length > 0 &&
        svgChildren.length === nonWhitespace.length
      ) {
        // `parent.children` is the wider union; the SVG elements are valid
        // members of it, so the cast is narrowing the ARRAY, not the nodes.
        (parent.children as unknown[]).splice(index, 1, ...svgChildren);
      }
    });
  };
}
