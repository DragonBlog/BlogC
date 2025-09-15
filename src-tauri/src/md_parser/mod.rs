use crate::error::Result;
use anyhow::anyhow;
use markdown::{mdast, unist::Position};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::{
    fs,
    path::{Path, PathBuf},
};
mod visitor;
pub use visitor::Visitor;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(transparent)]
pub struct Frontmatter(Value);

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImageResource {
    pub file_path: PathBuf,
    pub position: Option<Position>,
}

pub fn parse_markdown<P: AsRef<Path>>(path: P) -> Result<MarkdownInfo> {
    let path = path.as_ref();
    if !path.exists() {
        return Err(anyhow!("file not exists: {}", path.display()).into());
    }

    let ext = path.extension().and_then(|s| s.to_str());

    let mut ops = if ext == Some("md") {
        markdown::ParseOptions::gfm()
    } else if ext == Some("mdx") {
        markdown::ParseOptions::mdx()
    } else {
        return Err(anyhow!("file is not markdown: {}", path.display()).into());
    };

    ops.constructs.frontmatter = true;

    let tree = markdown::to_mdast(&fs::read_to_string(path)?, &ops)
        .map_err(|e| anyhow!("parse markdown error: {}", e))?;

    let mut visitor = MarkdownInfo::default();
    visitor.visit(&tree)?;
    Ok(visitor)
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct MarkdownInfo {
    pub frontmatter: Option<Frontmatter>,
    pub links: Vec<ImageResource>,
}

impl Visitor for MarkdownInfo {
    fn visit_yaml(&mut self, yaml: &mdast::Yaml) -> Result<()> {
        self.frontmatter = serde_yaml::from_str(&yaml.value)?;
        Ok(())
    }

    fn visit_toml(&mut self, toml: &mdast::Toml) -> Result<()> {
        self.frontmatter = toml::from_str(&toml.value)?;
        Ok(())
    }

    fn visit_image(&mut self, image: &mdast::Image) -> Result<()> {
        self.links.push(ImageResource {
            file_path: PathBuf::from(&image.url),
            position: image.position.clone(),
        });
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn test_parse_markdown() {
        let result = parse_markdown("test_mdx/principle/03-渲染与布局.mdx").unwrap();
        println!("{:#?}", result);
    }
}
