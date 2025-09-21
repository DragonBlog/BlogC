import { useLingui } from "@lingui/react/macro";
import { BlockSelectionPlugin } from "@platejs/selection/react";
import { Empty, Typography } from "antd";
import clsx from "clsx";
import { NodeApi } from "platejs";
import { useEffect, useRef, useState } from "react";
import {
  getHeadingList,
  headingItemVariants,
} from "@/components/ui/toc-node-static";
import { useEditorTabsStore } from "@/store/useEditorTabsStore";
import { Button } from "../../ui/button";

export const TocSideBar = () => {
  const { t } = useLingui();
  const [editor] = useEditorTabsStore((store) => [store.currentMonitorEditor]);
  const tocRef = useRef<HTMLDivElement>(null);
  const tocButtonRefs = useRef<Record<string, HTMLButtonElement>>({});
  const headingList = getHeadingList(editor);
  const [activeItem, setActiveItem] = useState<string>();
  const headingElementsRef = useRef<Record<string, IntersectionObserverEntry>>(
    {},
  );

  useEffect(() => {
    if (!editor) return;
    const callback: IntersectionObserverCallback = (headings) => {
      headingElementsRef.current = headings.reduce((map, headingElement) => {
        const blockId = (headingElement.target as HTMLElement).dataset.blockId;

        if (blockId) {
          map[blockId] = headingElement;
        }

        return map;
      }, headingElementsRef.current);

      const visibleHeadings: string[] = [];

      Object.keys(headingElementsRef.current).forEach((key) => {
        const headingElement = headingElementsRef.current[key];

        if (headingElement.isIntersecting) visibleHeadings.push(key);
      });
      const lastKey = Object.keys(headingElementsRef.current).pop()!;
      const activeItem = visibleHeadings[0] || lastKey;
      visibleHeadings.length > 0 && setActiveItem(activeItem);
      const btn = tocButtonRefs.current[activeItem];

      if (btn && tocRef.current) {
        const { offsetTop: btnOffsetTop, offsetHeight: btnOffsetHeight } = btn;
        const { scrollTop, offsetHeight } = tocRef.current;
        if (btnOffsetTop < scrollTop) {
          btn.scrollIntoView({ behavior: "smooth", block: "start" });
        } else if (btnOffsetTop + btnOffsetHeight > scrollTop + offsetHeight) {
          btn.scrollIntoView({ behavior: "smooth", block: "end" });
        }
      }
      headingElementsRef.current = {};
    };

    const observer = new IntersectionObserver(callback, {
      rootMargin: "-200px 0px -200px 0px",
    });

    headingList.forEach((item) => {
      const { path } = item;

      const node = NodeApi.get(editor, path);

      if (!node) return;

      const element = editor.api.toDOMNode(node);

      return element && observer.observe(element);
    });

    return () => observer.disconnect();
  }, [headingList, editor]);

  return (
    <div ref={tocRef} className="w-full h-full overflow-x-hidden p-2">
      {headingList.length > 0 ? (
        headingList.map((item) => (
          <Button
            key={item.title}
            ref={(ref) => {
              if (ref) tocButtonRefs.current[item.id] = ref;
              return () => {
                delete tocButtonRefs.current[item.id];
              };
            }}
            variant={"ghost"}
            className={clsx(
              headingItemVariants({
                depth: item.depth as 1 | 2 | 3,
              }),
              "rounded-md",
            )}
            onClick={() => {
              const node = NodeApi.get(editor!, item.path);
              if (!node) return;
              const el = editor?.api.toDOMNode(node);
              if (el) {
                el.scrollIntoView({ behavior: "smooth", block: "center" });
                editor
                  ?.getApi(BlockSelectionPlugin)
                  .blockSelection.set([item.id]);
                setActiveItem(item.id);
              }
            }}
          >
            <Typography.Text
              ellipsis={{
                tooltip: {
                  placement: "right",
                  mouseEnterDelay: 0.5,
                  arrow: false,
                },
              }}
              className={clsx(
                item.id === activeItem && "text-info! transition",
              )}
            >
              {item.title}
            </Typography.Text>
          </Button>
        ))
      ) : (
        <div className="w-full flex items-center justify-center mt-10">
          <Empty
            description={t`请创建一个标题以显示目录`}
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        </div>
      )}
    </div>
  );
};
