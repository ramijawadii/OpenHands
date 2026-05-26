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
    visit(
      tree,
      "element",
      (
        node: Element,
        index: number | undefined,
        parent: Element | Root | undefined,
      ) => {
        if (node.tagName !== "p" || !parent || index == null) return;

        const svgChildren = node.children.filter(
          (c) => c.type === "element" && (c as Element).tagName === "svg",
        );
        const nonWhitespace = node.children.filter(
          (c) =>
            !(
              c.type === "text" && /^\s*$/.test((c as { value: string }).value)
            ),
        );

        if (
          svgChildren.length > 0 &&
          svgChildren.length === nonWhitespace.length
        ) {
          parent.children.splice(index, 1, ...svgChildren);
        }
      },
    );
  };
}
