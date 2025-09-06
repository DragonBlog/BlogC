"use client";

import { Trans } from "@lingui/react/macro";
import {
  useLinkToolbarButton,
  useLinkToolbarButtonState,
} from "@platejs/link/react";
import { Link } from "lucide-react";
import * as React from "react";

import { ToolbarButton } from "./toolbar";

export function LinkToolbarButton(
  props: React.ComponentProps<typeof ToolbarButton>,
) {
  const state = useLinkToolbarButtonState();
  const { props: buttonProps } = useLinkToolbarButton(state);

  return (
    <ToolbarButton
      {...props}
      {...buttonProps}
      data-plate-focus
      tooltip={<Trans>链接</Trans>}
    >
      <Link />
    </ToolbarButton>
  );
}
