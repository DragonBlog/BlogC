"use client";
import { Plate, PlateProps } from "platejs/react";
import { Editor, EditorContainer } from "@/components/ui/editor";

export function PlateEditor(props: Pick<PlateProps, "editor">) {
  return (
    <Plate editor={props.editor}>
      <EditorContainer variant="default">
        <Editor variant="fullWidth" />
      </EditorContainer>
      {/* <SettingsDialog /> */}
    </Plate>
  );
}
