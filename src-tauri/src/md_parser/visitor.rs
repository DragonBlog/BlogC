use crate::error::Result;
use markdown::mdast::{self, Node};

pub trait Visitor {
    fn visit(&mut self, node: &mdast::Node) -> Result<()> {
        visit_node(self, node)
    }

    fn visit_blockquote(&mut self, _blockquote: &mdast::Blockquote) -> Result<()> {
        Ok(())
    }
    fn visit_code(&mut self, _code: &mdast::Code) -> Result<()> {
        Ok(())
    }
    fn visit_definition(&mut self, _definition: &mdast::Definition) -> Result<()> {
        Ok(())
    }
    fn visit_emphasis(&mut self, _emphasis: &mdast::Emphasis) -> Result<()> {
        Ok(())
    }
    fn visit_heading(&mut self, _heading: &mdast::Heading) -> Result<()> {
        Ok(())
    }
    fn visit_html(&mut self, _html: &mdast::Html) -> Result<()> {
        Ok(())
    }
    fn visit_image(&mut self, _image: &mdast::Image) -> Result<()> {
        Ok(())
    }
    fn visit_image_reference(&mut self, _image_reference: &mdast::ImageReference) -> Result<()> {
        Ok(())
    }
    fn visit_link(&mut self, _link: &mdast::Link) -> Result<()> {
        Ok(())
    }
    fn visit_link_reference(&mut self, _link_reference: &mdast::LinkReference) -> Result<()> {
        Ok(())
    }
    fn visit_list(&mut self, _list: &mdast::List) -> Result<()> {
        Ok(())
    }
    fn visit_list_item(&mut self, _list_item: &mdast::ListItem) -> Result<()> {
        Ok(())
    }
    fn visit_paragraph(&mut self, _paragraph: &mdast::Paragraph) -> Result<()> {
        Ok(())
    }
    fn visit_strong(&mut self, _strong: &mdast::Strong) -> Result<()> {
        Ok(())
    }
    fn visit_table(&mut self, _table: &mdast::Table) -> Result<()> {
        Ok(())
    }
    fn visit_table_cell(&mut self, _table_cell: &mdast::TableCell) -> Result<()> {
        Ok(())
    }
    fn visit_table_row(&mut self, _table_row: &mdast::TableRow) -> Result<()> {
        Ok(())
    }
    fn visit_text(&mut self, _text: &mdast::Text) -> Result<()> {
        Ok(())
    }
    fn visit_thematic_break(&mut self, _thematic_break: &mdast::ThematicBreak) -> Result<()> {
        Ok(())
    }
    fn visit_yaml(&mut self, _yaml: &mdast::Yaml) -> Result<()> {
        Ok(())
    }
    fn visit_toml(&mut self, _toml: &mdast::Toml) -> Result<()> {
        Ok(())
    }

    fn visit_mdx_jsx_flow_element(
        &mut self,
        _mdx_jsx_flow_element: &mdast::MdxJsxFlowElement,
    ) -> Result<()> {
        Ok(())
    }
    fn visit_mdx_jsx_text_element(
        &mut self,
        _mdx_jsx_text_element: &mdast::MdxJsxTextElement,
    ) -> Result<()> {
        Ok(())
    }
    fn visit_mdx_flow_expression(
        &mut self,
        _mdx_flow_expression: &mdast::MdxFlowExpression,
    ) -> Result<()> {
        Ok(())
    }
    fn visit_mdx_text_expression(
        &mut self,
        _mdx_text_expression: &mdast::MdxTextExpression,
    ) -> Result<()> {
        Ok(())
    }
    fn visit_mdxjs_esm(&mut self, _mdxjs_esm: &mdast::MdxjsEsm) -> Result<()> {
        Ok(())
    }
    fn visit_inline_code(&mut self, _inline_code: &mdast::InlineCode) -> Result<()> {
        Ok(())
    }
    fn visit_inline_math(&mut self, _inline_math: &mdast::InlineMath) -> Result<()> {
        Ok(())
    }
    fn visit_math(&mut self, _math: &mdast::Math) -> Result<()> {
        Ok(())
    }
    fn visit_footnote_definition(
        &mut self,
        _footnote_definition: &mdast::FootnoteDefinition,
    ) -> Result<()> {
        Ok(())
    }
    fn visit_footnote_reference(
        &mut self,
        _footnote_reference: &mdast::FootnoteReference,
    ) -> Result<()> {
        Ok(())
    }
    fn visit_delete(&mut self, _delete: &mdast::Delete) -> Result<()> {
        Ok(())
    }
    fn visit_break(&mut self, _break_node: &mdast::Break) -> Result<()> {
        Ok(())
    }
}

fn visit_node<V: Visitor + ?Sized>(visitor: &mut V, node: &Node) -> Result<()> {
    match node {
        Node::Blockquote(blockquote) => {
            visitor.visit_blockquote(blockquote)?;
            for child in &blockquote.children {
                visitor.visit(child)?;
            }
        }
        Node::Code(code) => {
            visitor.visit_code(code)?;
        }
        Node::Definition(definition) => {
            visitor.visit_definition(definition)?;
        }
        Node::Emphasis(emphasis) => {
            visitor.visit_emphasis(emphasis)?;
            for child in &emphasis.children {
                visitor.visit(child)?;
            }
        }
        Node::Heading(heading) => {
            visitor.visit_heading(heading)?;
            for child in &heading.children {
                visitor.visit(child)?;
            }
        }
        Node::Html(html) => {
            visitor.visit_html(html)?;
        }
        Node::Image(image) => {
            visitor.visit_image(image)?;
        }
        Node::ImageReference(image_reference) => {
            visitor.visit_image_reference(image_reference)?;
        }
        Node::Link(link) => {
            visitor.visit_link(link)?;
            for child in &link.children {
                visitor.visit(child)?;
            }
        }
        Node::LinkReference(link_reference) => {
            visitor.visit_link_reference(link_reference)?;
            for child in &link_reference.children {
                visitor.visit(child)?;
            }
        }
        Node::List(list) => {
            visitor.visit_list(list)?;
            for item in &list.children {
                visitor.visit(item)?;
            }
        }
        Node::ListItem(list_item) => {
            visitor.visit_list_item(list_item)?;
            for child in &list_item.children {
                visitor.visit(child)?;
            }
        }
        Node::Paragraph(paragraph) => {
            visitor.visit_paragraph(paragraph)?;
            for child in &paragraph.children {
                visitor.visit(child)?;
            }
        }
        Node::Strong(strong) => {
            visitor.visit_strong(strong)?;
            for child in &strong.children {
                visitor.visit(child)?;
            }
        }
        Node::Table(table) => {
            visitor.visit_table(table)?;
            for row in &table.children {
                visitor.visit(row)?;
            }
        }
        Node::TableCell(table_cell) => {
            visitor.visit_table_cell(table_cell)?;
            for child in &table_cell.children {
                visitor.visit(child)?;
            }
        }
        Node::TableRow(table_row) => {
            visitor.visit_table_row(table_row)?;
            for cell in &table_row.children {
                visitor.visit(cell)?;
            }
        }
        Node::Text(text) => {
            visitor.visit_text(text)?;
        }
        Node::ThematicBreak(thematic_break) => {
            visitor.visit_thematic_break(thematic_break)?;
        }
        Node::Yaml(yaml) => {
            visitor.visit_yaml(yaml)?;
        }
        Node::Root(root) => {
            for child in &root.children {
                visitor.visit(child)?;
            }
        }
        Node::FootnoteDefinition(footnote_definition) => {
            visitor.visit_footnote_definition(footnote_definition)?;
            for child in &footnote_definition.children {
                visitor.visit(child)?;
            }
        }
        Node::MdxJsxFlowElement(mdx_jsx_flow_element) => {
            visitor.visit_mdx_jsx_flow_element(mdx_jsx_flow_element)?;

            for child in &mdx_jsx_flow_element.children {
                visitor.visit(child)?;
            }
        }
        Node::MdxjsEsm(mdxjs_esm) => {
            visitor.visit_mdxjs_esm(mdxjs_esm)?;
        }
        Node::Toml(toml) => {
            visitor.visit_toml(toml)?;
        }
        Node::Break(break_node) => {
            visitor.visit_break(break_node)?;
        }
        Node::InlineCode(inline_code) => {
            visitor.visit_inline_code(inline_code)?;
        }
        Node::InlineMath(inline_math) => {
            visitor.visit_inline_math(inline_math)?;
        }
        Node::Delete(delete) => {
            visitor.visit_delete(delete)?;
            for child in &delete.children {
                visitor.visit(child)?;
            }
        }
        Node::MdxTextExpression(mdx_text_expression) => {
            visitor.visit_mdx_text_expression(mdx_text_expression)?;
        }
        Node::FootnoteReference(footnote_reference) => {
            visitor.visit_footnote_reference(footnote_reference)?;
        }
        Node::MdxJsxTextElement(mdx_jsx_text_element) => {
            visitor.visit_mdx_jsx_text_element(mdx_jsx_text_element)?;

            for child in &mdx_jsx_text_element.children {
                visitor.visit(child)?;
            }
        }
        Node::Math(math) => {
            visitor.visit_math(math)?;
        }
        Node::MdxFlowExpression(mdx_flow_expression) => {
            visitor.visit_mdx_flow_expression(mdx_flow_expression)?;
        }
    }
    Ok(())
}
