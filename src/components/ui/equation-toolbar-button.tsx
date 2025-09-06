"use client";

import { Trans } from "@lingui/react/macro";
import { insertInlineEquation } from "@platejs/math";
import { RadicalIcon } from "lucide-react";
import { useEditorRef } from "platejs/react";
import * as React from "react";

import { ToolbarButton } from "./toolbar";

export function InlineEquationToolbarButton(
  props: React.ComponentProps<typeof ToolbarButton>,
) {
  const editor = useEditorRef();

  return (
    <ToolbarButton
      {...props}
      onClick={() => {
        insertInlineEquation(editor);
      }}
      tooltip={<Trans>标记为公式</Trans>}
    >
      <RadicalIcon />
    </ToolbarButton>
  );
}
