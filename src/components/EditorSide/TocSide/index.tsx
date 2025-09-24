import { useLingui } from "@lingui/react/macro";
import { Empty, Typography } from "antd";
import clsx from "clsx";
import { useEffect, useMemo, useRef, useState } from "react";
import { headingItemVariants } from "@/components/ui/toc-node-static";
import { useEditorTabsStore } from "@/store/useEditorTabsStore";
import { Button } from "../../ui/button";
import { useTocStore } from "./useTocStore";

export const TocSideBar = () => {
  const { t } = useLingui();
  const tocRef = useRef<HTMLDivElement>(null);
  const tocButtonRefs = useRef<Record<string, HTMLButtonElement>>({});
  const [headingMaps] = useTocStore((store) => [store.headingMaps]);
  const [activeTabId] = useEditorTabsStore((store) => [store.activeTabId]);

  const { headings: headingList, blockSelectFn } = useMemo(() => {
    if (headingMaps[activeTabId]) {
      return headingMaps[activeTabId];
    } else {
      return {
        headings: [],
        blockSelectFn: () => {},
      };
    }
  }, [headingMaps, activeTabId]);

  const [activeItem, setActiveItem] = useState<string>();
  const headingElementsRef = useRef<Record<string, IntersectionObserverEntry>>(
    {},
  );
  const clickRef = useRef(false);

  useEffect(() => {
    const callback: IntersectionObserverCallback = (headings) => {
      if (clickRef.current) return;
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
      const { element } = item;
      return element && observer.observe(element);
    });

    return () => observer.disconnect();
  }, [headingList]);

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
              if (item.element) {
                item.element.scrollIntoView({
                  behavior: "smooth",
                  block: "center",
                });
                blockSelectFn?.(item.id);
                setActiveItem(item.id);
                setTimeout(() => {
                  clickRef.current = false;
                }, 300);
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
