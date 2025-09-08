use serde::{Deserialize, Serialize};

use crate::error::Result;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BlogTemplate {
    /// 作者
    pub author: String,
    /// 模板名称
    pub name: String,
    /// 模板仓库URL
    pub url: String,
    /// 模板分支
    pub branch: String,
}

impl Default for BlogTemplate {
    fn default() -> Self {
        BlogTemplate {
            author: "yexiyue".to_string(),
            name: "ratatui-kit-website".to_string(),
            url: "https://github.com/yexiyue/ratatui-kit-website.git".to_string(),
            branch: "main".to_string(),
        }
    }
}

impl BlogTemplate {
    /// 从GitHub URL和分支创建BlogTemplate实例
    pub fn from_url(url: &str, branch: String) -> Result<Self> {
        let (author, name) = parse_github_url(url)?;

        Ok(BlogTemplate {
            author,
            name,
            url: url.to_string(),
            branch,
        })
    }

    pub fn to_branch_name(&self) -> String {
        format!("{}/{}/{}", self.author, self.name, self.branch)
    }

    pub fn to_remote_name(&self) -> String {
        format!("template-{}-{}", self.author, self.name)
    }
}

/// 解析GitHub URL，支持HTTPS和SSH格式
pub fn parse_github_url(url: &str) -> Result<(String, String)> {
    // 移除 .git 后缀（如果存在）
    let url = url.trim_end_matches(".git");

    // 处理 SSH 格式: git@github.com:author/repo
    if url.contains('@') && url.contains(':') {
        // 找到冒号位置
        if let Some(colon_pos) = url.rfind(':') {
            // 提取冒号后的内容
            let path_part = &url[colon_pos + 1..];

            // 按照斜杠分割获取作者和仓库名
            let parts: Vec<&str> = path_part.split('/').collect();
            if parts.len() >= 2 {
                return Ok((parts[0].to_string(), parts[1].to_string()));
            }
        }
    }
    // 处理 HTTPS 格式: https://github.com/author/repo
    else if url.contains("github.com") {
        // 查找 github.com 后的第一个斜杠位置
        if let Some(github_pos) = url.find("github.com") {
            let after_github = &url[github_pos + 10..]; // "github.com".len() = 10

            // 查找第一个斜杠
            if let Some(first_slash) = after_github.find('/') {
                let path_part = &after_github[first_slash + 1..];

                // 按照斜杠分割获取作者和仓库名
                let parts: Vec<&str> = path_part.split('/').collect();
                if parts.len() >= 2 {
                    return Ok((parts[0].to_string(), parts[1].to_string()));
                }
            }
        }
    }

    Err(anyhow::anyhow!("Invalid GitHub URL format: {}", url).into())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_github_url() {
        // 测试 HTTPS 格式
        let (owner, repo) = parse_github_url("https://github.com/yexiyue/ratatui-kit-website.git")
            .expect("Failed to parse HTTPS GitHub URL");
        assert_eq!(owner, "yexiyue");
        assert_eq!(repo, "ratatui-kit-website");

        let (owner, repo) = parse_github_url("https://github.com/yexiyue/ratatui-kit-website")
            .expect("Failed to parse HTTPS GitHub URL without .git");
        assert_eq!(owner, "yexiyue");
        assert_eq!(repo, "ratatui-kit-website");

        // 测试 SSH 格式
        let (owner, repo) = parse_github_url("git@github.com:DragonBlog/BlogC.git")
            .expect("Failed to parse SSH GitHub URL");
        assert_eq!(owner, "DragonBlog");
        assert_eq!(repo, "BlogC");

        let (owner, repo) = parse_github_url("git@github.com:DragonBlog/BlogC")
            .expect("Failed to parse SSH GitHub URL without .git");
        assert_eq!(owner, "DragonBlog");
        assert_eq!(repo, "BlogC");
    }
}
