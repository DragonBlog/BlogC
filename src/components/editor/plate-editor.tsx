"use client";
import { Plate, PlateProps } from "platejs/react";
import { Ref } from "react";
import { Editor, EditorContainer } from "@/components/ui/editor";

export function PlateEditor(
  props: Pick<PlateProps, "editor"> & {
    ref?: Ref<HTMLDivElement>;
  },
) {
  return (
    <Plate editor={props.editor}>
      <EditorContainer variant="default" ref={props.ref}>
        <Editor variant="fullWidth" />
      </EditorContainer>
      {/* <SettingsDialog /> */}
    </Plate>
  );
}
