"use client";

import { Trans } from "@lingui/react/macro";
import { SuggestionPlugin } from "@platejs/suggestion/react";
import { PencilLineIcon } from "lucide-react";
import { useEditorPlugin, usePluginOption } from "platejs/react";
import * as React from "react";

import { cn } from "@/lib/utils";

import { ToolbarButton } from "./toolbar";

export function SuggestionToolbarButton() {
  const { setOption } = useEditorPlugin(SuggestionPlugin);
  const isSuggesting = usePluginOption(SuggestionPlugin, "isSuggesting");

  return (
    <ToolbarButton
      className={cn(isSuggesting && "text-brand/80 hover:text-brand/80")}
      onClick={() => setOption("isSuggesting", !isSuggesting)}
      onMouseDown={(e) => e.preventDefault()}
      tooltip={
        isSuggesting ? <Trans>关闭建议模式</Trans> : <Trans>建议编辑</Trans>
      }
    >
      <PencilLineIcon />
    </ToolbarButton>
  );
}
