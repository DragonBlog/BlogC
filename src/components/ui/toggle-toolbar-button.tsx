"use client";

import { Trans } from "@lingui/react/macro";
import {
  useToggleToolbarButton,
  useToggleToolbarButtonState,
} from "@platejs/toggle/react";
import { ListCollapseIcon } from "lucide-react";
import * as React from "react";

import { ToolbarButton } from "./toolbar";

export function ToggleToolbarButton(
  props: React.ComponentProps<typeof ToolbarButton>,
) {
  const state = useToggleToolbarButtonState();
  const { props: buttonProps } = useToggleToolbarButton(state);

  return (
    <ToolbarButton {...props} {...buttonProps} tooltip={<Trans>切换</Trans>}>
      <ListCollapseIcon />
    </ToolbarButton>
  );
}
