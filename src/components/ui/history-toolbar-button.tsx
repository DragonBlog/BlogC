"use client";

import { Trans } from "@lingui/react/macro";
import { Redo2Icon, Undo2Icon } from "lucide-react";
import { useEditorRef, useEditorSelector } from "platejs/react";
import * as React from "react";

import { ToolbarButton } from "./toolbar";

export function RedoToolbarButton(
  props: React.ComponentProps<typeof ToolbarButton>,
) {
  const editor = useEditorRef();
  const disabled = useEditorSelector(
    (editor) => editor.history.redos.length === 0,
    [],
  );

  return (
    <ToolbarButton
      {...props}
      disabled={disabled}
      onClick={() => editor.redo()}
      onMouseDown={(e) => e.preventDefault()}
      tooltip={<Trans>重做</Trans>}
    >
      <Redo2Icon />
    </ToolbarButton>
  );
}

export function UndoToolbarButton(
  props: React.ComponentProps<typeof ToolbarButton>,
) {
  const editor = useEditorRef();
  const disabled = useEditorSelector(
    (editor) => editor.history.undos.length === 0,
    [],
  );

  return (
    <ToolbarButton
      {...props}
      disabled={disabled}
      onClick={() => editor.undo()}
      onMouseDown={(e) => e.preventDefault()}
      tooltip={<Trans>撤销</Trans>}
    >
      <Undo2Icon />
    </ToolbarButton>
  );
}
