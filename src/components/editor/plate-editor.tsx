"use client";

// import { normalizeNodeId } from "platejs";
import { Plate, usePlateEditor } from "platejs/react";

import { EditorKit } from "@/components/editor/editor-kit";
import { SettingsDialog } from "@/components/editor/settings-dialog";
import { Editor, EditorContainer } from "@/components/ui/editor";

export function PlateEditor() {
  const editor = usePlateEditor({
    plugins: EditorKit,
  });

  return (
    <Plate editor={editor}>
      <EditorContainer>
        <Editor variant="fullWidth" />
      </EditorContainer>

      <SettingsDialog />
    </Plate>
  );
}
