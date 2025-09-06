"use client";

import { Trans, useLingui } from "@lingui/react/macro";
import type { DropdownMenuProps } from "@radix-ui/react-dropdown-menu";
import {
  CalendarIcon,
  ChevronRightIcon,
  Columns3Icon,
  FileCodeIcon,
  FilmIcon,
  Heading1Icon,
  Heading2Icon,
  Heading3Icon,
  ImageIcon,
  Link2Icon,
  ListIcon,
  ListOrderedIcon,
  MinusIcon,
  PilcrowIcon,
  PlusIcon,
  QuoteIcon,
  RadicalIcon,
  SquareIcon,
  TableIcon,
  TableOfContentsIcon,
} from "lucide-react";
import { KEYS } from "platejs";
import { type PlateEditor, useEditorRef } from "platejs/react";
import * as React from "react";
import {
  insertBlock,
  insertInlineElement,
} from "@/components/editor/transforms";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { ToolbarButton, ToolbarMenuGroup } from "./toolbar";

type Group = {
  group: string;
  items: Item[];
};

interface Item {
  icon: React.ReactNode;
  value: string;
  onSelect: (editor: PlateEditor, value: string) => void;
  focusEditor?: boolean;
  label?: React.ReactNode;
}

export function InsertToolbarButton(props: DropdownMenuProps) {
  const editor = useEditorRef();
  const [open, setOpen] = React.useState(false);
  const { t } = useLingui();
  const groups: Group[] = [
    {
      group: t`基本`,
      items: [
        {
          icon: <PilcrowIcon />,
          label: <Trans>段落</Trans>,
          value: KEYS.p,
        },
        {
          icon: <Heading1Icon />,
          label: <Trans>标题 1</Trans>,
          value: "h1",
        },
        {
          icon: <Heading2Icon />,
          label: <Trans>标题 2</Trans>,
          value: "h2",
        },
        {
          icon: <Heading3Icon />,
          label: <Trans>标题 3</Trans>,
          value: "h3",
        },
        {
          icon: <TableIcon />,
          label: <Trans>表格</Trans>,
          value: KEYS.table,
        },
        {
          icon: <FileCodeIcon />,
          label: <Trans>代码</Trans>,
          value: KEYS.codeBlock,
        },
        {
          icon: <QuoteIcon />,
          label: <Trans>引用</Trans>,
          value: KEYS.blockquote,
        },
        {
          icon: <MinusIcon />,
          label: <Trans>分隔线</Trans>,
          value: KEYS.hr,
        },
      ].map((item) => ({
        ...item,
        onSelect: (editor, value) => {
          insertBlock(editor, value);
        },
      })),
    },
    {
      group: t`列表`,
      items: [
        {
          icon: <ListIcon />,
          label: <Trans>项目符号列表</Trans>,
          value: KEYS.ul,
        },
        {
          icon: <ListOrderedIcon />,
          label: <Trans>编号列表</Trans>,
          value: KEYS.ol,
        },
        {
          icon: <SquareIcon />,
          label: <Trans>待办列表</Trans>,
          value: KEYS.listTodo,
        },
        {
          icon: <ChevronRightIcon />,
          label: <Trans>切换列表</Trans>,
          value: KEYS.toggle,
        },
      ].map((item) => ({
        ...item,
        onSelect: (editor, value) => {
          insertBlock(editor, value);
        },
      })),
    },
    {
      group: t`媒体`,
      items: [
        {
          icon: <ImageIcon />,
          label: <Trans>图片</Trans>,
          value: KEYS.img,
        },
        {
          icon: <FilmIcon />,
          label: <Trans>视频</Trans>,
          value: KEYS.mediaEmbed,
        },
      ].map((item) => ({
        ...item,
        onSelect: (editor, value) => {
          insertBlock(editor, value);
        },
      })),
    },
    {
      group: t`高级`,
      items: [
        {
          icon: <TableOfContentsIcon />,
          label: <Trans>目录</Trans>,
          value: KEYS.toc,
        },
        {
          icon: <Columns3Icon />,
          label: <Trans>3列</Trans>,
          value: "action_three_columns",
        },
        {
          focusEditor: false,
          icon: <RadicalIcon />,
          label: <Trans>公式</Trans>,
          value: KEYS.equation,
        },
      ].map((item) => ({
        ...item,
        onSelect: (editor, value) => {
          insertBlock(editor, value);
        },
      })),
    },
    {
      group: t`内联`,
      items: [
        {
          icon: <Link2Icon />,
          label: <Trans>链接</Trans>,
          value: KEYS.link,
        },
        {
          focusEditor: true,
          icon: <CalendarIcon />,
          label: <Trans>日期</Trans>,
          value: KEYS.date,
        },
        {
          focusEditor: false,
          icon: <RadicalIcon />,
          label: <Trans>行内公式</Trans>,
          value: KEYS.inlineEquation,
        },
      ].map((item) => ({
        ...item,
        onSelect: (editor, value) => {
          insertInlineElement(editor, value);
        },
      })),
    },
  ];

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false} {...props}>
      <DropdownMenuTrigger asChild>
        <ToolbarButton pressed={open} tooltip={<Trans>插入</Trans>} isDropdown>
          <PlusIcon />
        </ToolbarButton>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className="flex max-h-[500px] min-w-0 flex-col overflow-y-auto"
        align="start"
      >
        {groups.map(({ group, items: nestedItems }) => (
          <ToolbarMenuGroup key={group as string} label={group as string}>
            {nestedItems.map(({ icon, label, value, onSelect }) => (
              <DropdownMenuItem
                key={value}
                className="min-w-[180px]"
                onSelect={() => {
                  onSelect(editor, value);
                  editor.tf.focus();
                }}
              >
                {icon}
                {label}
              </DropdownMenuItem>
            ))}
          </ToolbarMenuGroup>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
