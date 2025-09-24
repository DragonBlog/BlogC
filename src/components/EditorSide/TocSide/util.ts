import { BaseTocPlugin, Heading, isHeading } from "@platejs/toc";
import { NodeApi, SlateEditor, TElement } from "platejs";

const headingDepth: Record<string, number> = {
  h1: 1,
  h2: 2,
  h3: 3,
  h4: 4,
  h5: 5,
  h6: 6,
};

export type HeadingWithElement = Heading & { element?: HTMLElement };
export const getHeadingList = (editor?: SlateEditor) => {
  if (!editor) return [];

  const options = editor.getOptions(BaseTocPlugin);

  if (options.queryHeading) {
    return options.queryHeading(editor);
  }

  const headingList: HeadingWithElement[] = [];

  const values = editor.api.nodes<TElement>({
    at: [],
    match: (n) => isHeading(n),
  });

  if (!values) return [];

  Array.from(values, ([node, path]) => {
    const { type } = node;
    const title = NodeApi.string(node);
    const depth = headingDepth[type];
    const id = node.id as string;
    const element = editor.api.toDOMNode(node);

    if (title) {
      headingList.push({ id, depth, path, title, type, element });
    }
  });

  return headingList;
};
