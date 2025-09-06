"use client";

import { Trans } from "@lingui/react/macro";
import { useIndentButton, useOutdentButton } from "@platejs/indent/react";
import { IndentIcon, OutdentIcon } from "lucide-react";
import * as React from "react";

import { ToolbarButton } from "./toolbar";

export function IndentToolbarButton(
  props: React.ComponentProps<typeof ToolbarButton>,
) {
  const { props: buttonProps } = useIndentButton();

  return (
    <ToolbarButton
      {...props}
      {...buttonProps}
      tooltip={<Trans>增加缩进</Trans>}
    >
      <IndentIcon />
    </ToolbarButton>
  );
}

export function OutdentToolbarButton(
  props: React.ComponentProps<typeof ToolbarButton>,
) {
  const { props: buttonProps } = useOutdentButton();

  return (
    <ToolbarButton
      {...props}
      {...buttonProps}
      tooltip={<Trans>减少缩进</Trans>}
    >
      <OutdentIcon />
    </ToolbarButton>
  );
}
