import { MarkdownPlugin, remarkMdx, remarkMention } from "@platejs/markdown";
import { KEYS } from "platejs";
import { createPlatePlugin, PlateElement } from "platejs/react";
import remarkEmoji from "remark-emoji";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

const frontMatterPlugin = createPlatePlugin({
  key: "frontmatter",
  node: {
    isElement: true,
    type: "frontmatter",
    component: (props) => {
      console.log("frontMatterPlugin", props);
      return <PlateElement {...props} />;
    },
  },
});

export const MarkdownKit = [
  MarkdownPlugin.configure({
    options: {
      disallowedNodes: [KEYS.suggestion],
      remarkPlugins: [
        remarkFrontmatter,
        remarkEmoji as any,
        remarkMath,
        remarkGfm,
        remarkMdx,
        remarkMention,
      ],
      rules: {
        yaml: {
          deserialize(mdastNode, deco, options) {
            console.log("deserialize", mdastNode, deco, options);
            return {
              type: "frontmatter",
              value: mdastNode.value,
              children: [{ text: mdastNode.value }],
            };
          },
        },
        frontmatter: {
          serialize(node, children) {
            console.log("serialize", node, children);
            return {
              type: "yaml",
              value: node.value,
            };
          },
        },
      },
    },
  }),
  frontMatterPlugin,
];
