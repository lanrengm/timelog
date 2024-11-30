# 时光日志

Obsidian 插件。

像记账一样记录每日的工作内容。

## 安装方式

### 下载插件

在右侧发行版中选择最新的版本，下载 obsidian-timelog.zip 文件。

### 安装插件

将 obsidian-timelog.zip 解压，解压后的目录结构如下：

- obsidian-timelog/
  - manifest.json
  - main.js
  - styles.css

将 obsidian-timelog 移动到 Obsidian 插件目录，移动后的目录结构如下

- 您的Obsidian仓库/.obsidian/plugins/
  - obsidian-timelog/
    - manifest.json
    - main.js
    - styles.css

### 启用插件

进入 Obsidian 设置，左侧列表【通用选项】-【第三方插件】，右侧详情【已安装插件】，点击刷新图标【重新加载插件】，找到 Timelog 并启用。

![启用插件](doc/assets/启用插件.png)

## 使用方式

### 新建时光日志

### 新建计划

### 计划管理

## 开发者

1. 克隆仓库到本地

2. NodeJS 版本: 20.15.0

3. 包管理器: yarn

4. 安装依赖

```shell
yarn
```

### 开发

项目目录要放在 `Obsidian库/.obsidian/plugins/` 目录中

启动开发模式：

```shell
yarn dev
```

上述命令会在项目根目录生成 main.js

### 发行

```shell
yarn build
```

上述命令会生成 dist 目录，并且会自动打包发行文件为 zip

- dist/
  - manifest.json
  - main.js
  - styles.css
  - obsidian-timelog.zip
    - manifest.json
    - main.js
    - styles.css
