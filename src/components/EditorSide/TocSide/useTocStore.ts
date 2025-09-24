import { createWithEqualityFn } from "zustand/traditional";
import { HeadingWithElement } from "./util";

type TocStore = {
  headingMaps: Record<
    string,
    {
      headings: HeadingWithElement[];
      blockSelectFn: (id: string) => void;
    }
  >;
  setHeadingMaps: (
    id: string,
    list: HeadingWithElement[],
    fn: (id: string) => void,
  ) => void;
};

export const useTocStore = createWithEqualityFn<TocStore>((set) => ({
  headingMaps: {},
  setHeadingMaps: (id, list, fn) =>
    set((prev) => {
      const newHeadingMaps = {
        ...prev.headingMaps,
        [id]: { headings: list, blockSelectFn: fn },
      };
      return { headingMaps: newHeadingMaps };
    }),
}));
