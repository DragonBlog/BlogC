use crate::error::Result;
use anyhow::anyhow;
use git2::{
    build::RepoBuilder, BranchType, Cred, FetchOptions, IndexAddOption, Oid, Progress, PushOptions,
    RemoteCallbacks, Repository, Signature,
};
use std::{
    fs,
    path::{Path, PathBuf},
};

/// 用户信息结构体
#[derive(Debug, Clone)]
pub struct UserInfo {
    /// 用户名
    pub name: String,
    /// 用户邮箱
    pub email: String,
}

/// Git操作结构体
pub struct Git {
    /// Git仓库对象
    pub repo: Repository,
}

impl Git {
    pub fn new<T: AsRef<Path>>(repo_path: T) -> Result<Self> {
        // 创建Git仓库对象
        let repo = Repository::open(repo_path)?;
        Ok(Self { repo })
    }

    pub fn init<T: AsRef<Path>>(path: T) -> Result<Self> {
        // 创建初始化选项并设置初始分支为 main
        let mut options = git2::RepositoryInitOptions::new();
        options.initial_head("main");
        // 创建Git仓库对象
        let repo = Repository::init_opts(path, &options)?;
        println!("Git repository initialized at: {}", repo.path().display());
        Ok(Self { repo })
    }

    pub fn clone<T: AsRef<Path>, F: Fn(&Progress)>(
        url: &str,
        path: T,
        on_progress: Option<F>,
    ) -> Result<Self> {
        // 创建远程回调对象，用于处理克隆过程中的各种事件
        let mut callbacks = RemoteCallbacks::new();

        // 如果提供了进度回调函数，则设置传输进度回调
        if let Some(on_progress) = on_progress {
            callbacks.transfer_progress(move |progress| {
                // 调用用户提供的进度回调函数
                on_progress(&progress);
                // 返回 true 表示继续克隆过程
                true
            });
        }

        // 创建获取选项并设置回调函数
        let mut fetch_options = FetchOptions::new();
        fetch_options.remote_callbacks(callbacks);

        // 创建仓库构建器并设置获取选项
        let mut builder = RepoBuilder::new();
        builder.fetch_options(fetch_options);

        // 执行克隆操作
        let repo = builder.clone(url, path.as_ref())?;
        Ok(Self { repo })
    }

    /// 将所有更改添加到索引中
    pub fn add_all(&self) -> Result<()> {
        // 获取仓库的索引
        let mut index = self.repo.index()?;
        // 将所有文件添加到索引中
        index.add_all(["."], IndexAddOption::DEFAULT, None)?;
        // 将索引写入磁盘
        index.write()?;
        Ok(())
    }

    /// 提交更改
    ///
    /// # 参数
    /// * `message` - 提交信息
    /// * `author` - 作者名称
    /// * `email` - 作者邮箱
    ///
    /// # 返回值
    /// 返回提交的Oid对象
    pub fn commit(&self, message: &str, user_info: UserInfo) -> Result<Oid> {
        // 创建提交签名（包括作者信息和当前时间戳）
        let signature = Signature::now(&user_info.name, &user_info.email)?;
        // 获取仓库索引
        let mut index = self.repo.index()?;
        // 将索引写入树对象并获取树的 ID
        let tree_id = index.write_tree()?;
        // 根据树的 ID 查找树对象
        let tree = self.repo.find_tree(tree_id)?;

        // 尝试获取当前 HEAD 提交作为父提交
        let parent_commit = if let Ok(head) = self.repo.head() {
            if let Some(target) = head.target() {
                Some(self.repo.find_commit(target)?)
            } else {
                None
            }
        } else {
            None
        };

        // 创建提交对象
        let commit_id = if let Some(parent) = parent_commit {
            // 如果存在父提交，则创建一个具有父提交的提交
            self.repo.commit(
                Some("HEAD"),
                &signature,
                &signature,
                message,
                &tree,
                &[&parent],
            )?
        } else {
            // 如果不存在父提交（首次提交），则创建没有父提交的提交
            self.repo
                .commit(Some("HEAD"), &signature, &signature, message, &tree, &[])?
        };

        Ok(commit_id)
    }

    /// 切换到指定分支
    ///
    /// # 参数
    /// * `branch_name` - 要切换到的分支名称
    pub fn checkout_branch(&self, branch_name: &str) -> Result<()> {
        let branch = self.repo.find_branch(branch_name, BranchType::Local)?;

        self.repo
            .set_head(branch.get().name().ok_or(anyhow!("Invalid branch name"))?)?;

        let mut checkout_builder = git2::build::CheckoutBuilder::new();
        checkout_builder.force();

        self.repo.checkout_head(Some(&mut checkout_builder))?;
        Ok(())
    }

    /// 创建并切换到新分支
    ///
    /// # 参数
    /// * `branch_name` - 新分支名称
    pub fn checkout_new_branch(&self, branch_name: &str) -> Result<()> {
        // 获取当前 HEAD 提交
        let head = self.repo.head()?;
        let commit = self
            .repo
            .find_commit(head.target().ok_or(anyhow!("无法找到 HEAD 提交"))?)?;

        // 创建新分支
        self.repo.branch(branch_name, &commit, false)?;

        // 切换到新分支
        self.checkout_branch(branch_name)?;

        Ok(())
    }

    /// 切换到远程分支
    ///
    /// # 参数
    /// * `local_branch_name` - 本地分支名称
    /// * `remote_name` - 远程仓库名称
    /// * `remote_branch_name` - 远程分支名称
    pub fn checkout_remote_branch(
        &self,
        local_branch_name: &str,
        remote_name: &str,
        remote_branch_name: &str,
    ) -> Result<()> {
        // 查找远程分支引用
        let remote_branch = self.repo.find_branch(
            &format!("{}/{}", remote_name, remote_branch_name),
            BranchType::Remote,
        )?;

        // 获取远程分支指向的提交
        let commit = self.repo.find_commit(
            remote_branch
                .get()
                .target()
                .ok_or(anyhow!("无法找到远程分支的提交"))?,
        )?;

        // 创建本地分支（不跟踪远程分支）
        self.repo.branch(local_branch_name, &commit, true)?;

        self.checkout_branch(local_branch_name)?;

        Ok(())
    }

    /// 添加远程仓库
    ///
    /// # 参数
    /// * `name` - 远程仓库名称
    /// * `url` - 远程仓库URL
    pub fn add_remote(&self, name: &str, url: &str) -> Result<()> {
        // 添加远程仓库
        self.repo.remote(name, url)?;
        Ok(())
    }

    /// 获取远程仓库更新
    ///
    /// # 参数
    /// * `remote_name` - 远程仓库名称
    /// * `on_progress` - 进度回调函数（可选）
    pub fn fetch_remote<F: Fn(&Progress)>(
        &self,
        remote_name: &str,
        on_progress: Option<F>,
    ) -> Result<()> {
        // 查找远程仓库
        let mut remote = self.repo.find_remote(remote_name)?;

        // 创建远程回调对象
        let mut callbacks = RemoteCallbacks::new();
        // 设置传输进度回调
        if let Some(ref f) = on_progress {
            callbacks.transfer_progress(move |progress| {
                f(&progress);
                true
            });
        }

        // 创建获取选项并设置回调函数
        let mut fetch_options = FetchOptions::new();
        fetch_options.remote_callbacks(callbacks);

        // 执行获取操作
        remote.fetch(&[] as &[&str], Some(&mut fetch_options), None)?;
        Ok(())
    }

    /// 复制指定分支到目标目录
    ///
    /// # 参数
    /// * `branch_name` - 分支名称
    /// * `target_dir` - 目标目录路径
    pub fn copy_branch_to_dir<P: AsRef<Path>>(
        &self,
        branch_name: &str,
        target_dir: P,
    ) -> Result<()> {
        let remote_branch = self.repo.find_branch(branch_name, BranchType::Local)?;
        let commit = self.repo.find_commit(
            remote_branch
                .get()
                .target()
                .ok_or(anyhow!("找不到分支提交"))?,
        )?;
        let tree = commit.tree()?;

        let workdir = self.repo.workdir().ok_or(anyhow!("找不到工作目录"))?;
        let target_path = workdir.join(target_dir);

        copy_tree_recursive(&self.repo, &tree, &target_path, Path::new(""))?;

        Ok(())
    }

    /// 检查远程分支是否有更新
    ///
    /// # 参数
    /// * `remote_name` - 远程仓库名称
    /// * `remote_branch_name` - 远程分支名称
    /// * `local_branch_name` - 本地分支名称
    ///
    /// # 返回值
    /// 如果远程分支有更新返回true，否则返回false
    pub fn is_remote_branch_updated(
        &self,
        remote_name: &str,
        remote_branch_name: &str,
        local_branch_name: &str,
    ) -> Result<bool> {
        let remote_branch = self.repo.find_branch(
            &format!("{}/{}", remote_name, remote_branch_name),
            BranchType::Remote,
        )?;
        let local_branch = self
            .repo
            .find_branch(local_branch_name, BranchType::Local)?;

        let remote_oid = remote_branch
            .get()
            .target()
            .ok_or(anyhow!("无法找到远程分支的提交"))?;

        let local_oid = local_branch
            .get()
            .target()
            .ok_or(anyhow!("无法找到本地分支的提交"))?;

        Ok(remote_oid != local_oid)
    }

    /// 推送分支到远程仓库
    ///
    /// # 参数
    /// * `remote_name` - 远程仓库名称
    /// * `branch_name` - 要推送的分支名称
    /// * `force` - 是否强制推送
    /// * `on_progress` - 推送进度回调函数（可选）
    pub fn push<F: FnMut(usize, usize, usize)>(
        &self,
        remote_name: &str,
        branch_name: &str,
        force: bool,
        on_progress: Option<F>,
        token: Option<String>,
        ssh_key: Option<PathBuf>,
    ) -> Result<()> {
        // 查找远程仓库
        let mut remote = self.repo.find_remote(remote_name)?;

        // 创建远程回调对象
        let mut callbacks = RemoteCallbacks::new();
        // 设置传输进度回调
        if let Some(f) = on_progress {
            callbacks.push_transfer_progress(f);
        }

        // 添加认证回调
        callbacks.credentials(|_url, username_from_url, _allowed_types| {
            // 使用 SSH 密钥进行认证
            if let Some(username) = username_from_url {
                // 尝试使用默认SSH密钥
                if let Some(key_path) = &ssh_key {
                    if key_path.exists() {
                        return Cred::ssh_key(username, None, &key_path, None);
                    }
                }
            }

            if let Some(token) = &token {
                return Cred::userpass_plaintext(token, "");
            }
            Cred::default()
        });

        // 创建推送选项并设置回调函数
        let mut push_options = PushOptions::new();
        push_options.remote_callbacks(callbacks);

        // 推送分支到远程仓库
        let mut ref_spec = format!("refs/heads/{branch_name}:refs/heads/{branch_name}");

        if force {
            ref_spec = format!("+{ref_spec}"); // 强制推送
        }

        remote.push(&[&ref_spec], Some(&mut push_options))?;

        Ok(())
    }

    /// 获取用户信息
    ///
    /// # 参数
    /// * `repo` - Git仓库对象
    ///
    /// # 返回值
    /// 返回包含用户名和邮箱的UserInfo结构体
    pub fn get_user_info(&self) -> Result<UserInfo> {
        let config = self.repo.config()?;
        let user_name = config.get_string("user.name")?;
        let user_email = config.get_string("user.email")?;

        Ok(UserInfo {
            name: user_name,
            email: user_email,
        })
    }

    pub fn get_remote_default_branch(&self, remote_name: &str) -> Result<String> {
        let mut remote = self.repo.find_remote(remote_name)?;

        remote.connect(git2::Direction::Fetch)?;

        Ok(remote
            .default_branch()?
            .as_str()
            .unwrap_or("main")
            .to_string())
    }

    pub fn get_remotes_names(&self) -> Result<Vec<String>> {
        Ok(self
            .repo
            .remotes()?
            .iter()
            .flatten()
            .map(|s| s.to_string())
            .collect())
    }
}

/// 递归复制Git树对象到指定目录
///
/// # 参数
/// * `repo` - Git仓库对象
/// * `tree` - Git树对象
/// * `target_dir` - 目标目录路径
/// * `prefix` - 路径前缀
fn copy_tree_recursive(
    repo: &Repository,
    tree: &git2::Tree,
    target_dir: &Path,
    prefix: &Path,
) -> Result<()> {
    for entry in tree.iter() {
        let name = entry.name().ok_or(anyhow!("无效文件名"))?;
        let mut rel_path = PathBuf::from(prefix);
        rel_path.push(name);

        let dest_path = target_dir.join(&rel_path);

        let obj = entry.to_object(repo)?;

        if let Some(subtree) = obj.as_tree() {
            // 递归处理子目录
            copy_tree_recursive(repo, subtree, target_dir, &rel_path)?;
        } else if let Some(blob) = obj.as_blob() {
            if let Some(parent) = dest_path.parent() {
                fs::create_dir_all(parent)?;
            }
            fs::write(dest_path, blob.content())?;
        }
    }
    Ok(())
}
