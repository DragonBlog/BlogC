use crate::config::BlogBuildConfig;
use crate::error::Result;
use crate::{blog_manager::template::BlogTemplate, git::Git};
use git2::Progress;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
mod template;

pub static TEMPLATE_DIR: &str = "template";
pub static BLOG_CONFIG_FILE: &str = "dragon-config.json";
pub static BLOG_BUILD_CONFIG_FILE: &str = "dragon.json";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BlogManagerConfig {
    current_template: BlogTemplate,
}

pub struct BlogManager {
    config: BlogManagerConfig,
    path: PathBuf,
    git: Git,
}

impl BlogManager {
    pub fn get_template_path(&self) -> PathBuf {
        self.path.join(TEMPLATE_DIR)
    }

    pub fn get_blog_build_config_path(&self) -> PathBuf {
        self.get_template_path().join(BLOG_BUILD_CONFIG_FILE)
    }

    pub fn get_blog_config_path(&self) -> PathBuf {
        self.path.join(BLOG_CONFIG_FILE)
    }

    pub fn init<P: AsRef<Path>>(path: P, template: Option<BlogTemplate>) -> Result<Self> {
        let path = path.as_ref();

        if !path.exists() {
            return Err(anyhow::anyhow!("Path does not exist: {:?}", path).into());
        }

        let template = template.unwrap_or_default();
        let git = Git::init(path)?;

        let blog_manager_config = BlogManagerConfig {
            current_template: template,
        };

        let blog_manager = BlogManager {
            config: blog_manager_config,
            path: path.to_path_buf(),
            git,
        };

        blog_manager.save_blog_config()?;

        blog_manager.git.add_all()?;

        let user_info = blog_manager.git.get_user_info()?;
        blog_manager.git.commit("init", user_info)?;

        Ok(blog_manager)
    }

    pub fn open<P: AsRef<Path>>(path: P) -> Result<Self> {
        let path = path.as_ref();
        let git = Git::new(path)?;
        let config_path = path.join(BLOG_CONFIG_FILE);
        if !config_path.exists() {
            return Err(
                anyhow::anyhow!("Blog config file does not exist: {:?}", config_path).into(),
            );
        }

        let str = std::fs::read_to_string(&config_path)?;
        let config = serde_json::from_str::<BlogManagerConfig>(&str)?;

        Ok(Self {
            config,
            git,
            path: path.to_path_buf(),
        })
    }

    pub fn should_install_template(&self) -> bool {
        let template = &self.config.current_template;
        let remote_name = template.to_remote_name();
        let branch_name = template.to_branch_name();

        self.git.repo.find_remote(&remote_name).is_err()
            || self
                .git
                .repo
                .find_branch(&branch_name, git2::BranchType::Local)
                .is_err()
            || !self.get_template_path().exists()
    }

    pub fn install_template<F: Fn(&Progress)>(&self, on_progress: Option<F>) -> Result<()> {
        let template = &self.config.current_template;
        let remote_name = template.to_remote_name();
        let branch_name = template.to_branch_name();
        let template_branch = &template.branch;

        if self.git.repo.find_remote(&remote_name).is_err() {
            self.git.add_remote(&remote_name, &template.url)?;
        }

        if self
            .git
            .repo
            .find_branch(&branch_name, git2::BranchType::Local)
            .is_err()
        {
            self.git.fetch_remote(&remote_name, on_progress)?;
            self.git
                .checkout_remote_branch(&branch_name, &remote_name, template_branch)?;
            self.git.checkout_branch("main")?;
        }

        if !self.get_template_path().exists() {
            self.git.copy_branch_to_dir(&branch_name, TEMPLATE_DIR)?;
            let blog_build_config_path = self.get_blog_build_config_path();
            let str = fs::read_to_string(&blog_build_config_path)?;

            let mut build_config = serde_json::from_str::<BlogBuildConfig>(&str)?;

            for (name, item) in build_config.entries.iter_mut() {
                item.entry_base = format!("../{name}");
                fs::create_dir(self.path.join(&name))?;
            }

            // 覆盖写入配置文件
            fs::write(
                &blog_build_config_path,
                serde_json::to_string_pretty(&build_config)?,
            )?;
        }

        Ok(())
    }

    pub fn save_blog_config(&self) -> Result<()> {
        let blog_config_path = self.get_blog_config_path();
        fs::write(
            &blog_config_path,
            serde_json::to_string_pretty(&self.config)?,
        )?;
        Ok(())
    }
}
