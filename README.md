# 安徽骊威科技集团有限公司官网及后台管理系统

这是一个使用 Node.js, Express, better-sqlite3 和纯 HTML/CSS/JS 构建的公司官网项目，包含一个完整的后台管理功能，用于管理首页的轮播图片、服务项目和"关于我们"页面的内容。

## 项目结构与文件说明

```
.
├── admin
│   ├── index.html              # 后台管理主入口/仪表盘页面
│   ├── admin-carousel.html     # 后台管理页面：管理首页轮播图片
│   ├── admin-services.html     # 后台管理页面：管理服务项目
│   ├── admin-about.html        # 后台管理页面：管理"关于我们"内容
│   ├── admin-styles.css        # 后台管理页面的通用样式文件
│   └── login.html              # 后台登录页面
├── node_modules/               # (自动生成) 存放项目的所有 Node.js 依赖库
├── public
│   ├── images/                 # 存放网站使用的静态图片 (如服务图标等)
│   ├── uploads/
│   │   ├── carousel/           # (自动生成/更新) 存放后台上传的轮播图片文件
│   │   └── services/           # (自动生成/更新) 存放后台上传的服务图片文件
│   ├── index.html              # 网站前台主页面
│   ├── script.js               # 网站前台的 JavaScript 文件 (处理导航、轮播、服务加载、关于我们加载等)
│   ├── styles.css              # 网站前台的主要样式文件
│   └── WechatIMG5.jpg          # 网站的 favicon 图标
├── .gitignore                  # 指定 Git 版本控制系统忽略的文件和目录
├── data.db                     # (自动生成) SQLite 数据库文件，存储轮播图片、服务和关于我们信息
├── package-lock.json           # (自动生成) 锁定项目依赖的确切版本
├── package.json                # Node.js 项目配置文件，定义项目信息、依赖和脚本
├── README.md                   # (本文档) 项目说明文件
└── server.js                   # Express 服务器主文件，处理路由、API、数据库交互、会话和认证
```

### 数据库表结构

*   **`carousel_images`**: 存储轮播图片信息
    *   `id`: INTEGER (主键)
    *   `image_path`: TEXT (图片路径)
    *   `title`: TEXT (图片标题)
    *   `description`: TEXT (图片描述)
    *   `created_at`: TEXT (创建时间)

*   **`services`**: 存储服务项目信息
    *   `id`: INTEGER (主键)
    *   `title`: TEXT (服务标题)
    *   `description`: TEXT (服务描述)
    *   `image_path`: TEXT (服务图片路径)
    *   `created_at`: TEXT (创建时间)

*   **`about_content`**: 存储"关于我们"内容
    *   `id`: INTEGER (主键)
    *   `paragraph1`: TEXT (第一段文本)
    *   `paragraph2`: TEXT (第二段文本)
    *   `years_experience`: INTEGER (经验年数)
    *   `projects_completed`: INTEGER (完成项目数)
    *   `team_members`: INTEGER (团队成员数)
    *   `updated_at`: TEXT (更新时间)

### API 接口说明

*   **前台 API**:
    *   `GET /api/carousel-images`: 获取轮播图片列表
    *   `GET /api/services`: 获取服务项目列表
    *   `GET /api/about`: 获取"关于我们"内容

*   **后台 API**:
    *   `POST /api/login`: 管理员登录
    *   `GET /api/logout`: 管理员登出
    *   `POST /api/carousel-images`: 添加轮播图片
    *   `DELETE /api/carousel-images/:id`: 删除轮播图片
    *   `POST /api/services`: 添加服务项目
    *   `PUT /api/services/:id`: 更新服务项目
    *   `DELETE /api/services/:id`: 删除服务项目
    *   `GET /api/about`: 获取"关于我们"内容
    *   `PUT /api/about`: 更新"关于我们"内容

## 如何运行

1.  **确保已安装 Node.js 和 npm**: 从 [https://nodejs.org/](https://nodejs.org/) 下载并安装。
2.  **克隆或下载项目代码**。
3.  **打开终端/命令行**，进入项目根目录。
4.  **安装依赖**: 运行 `npm install`。
5.  **启动开发服务器**: 运行 `npm run dev` (使用 nodemon 自动重启) 或 `npm start`。
6.  **访问网站**: 在浏览器中打开 `http://localhost:3000`。
7.  **访问后台管理**: 在浏览器中打开 **`http://localhost:3000/admin`** (主入口)。需要使用用户名 `admin` 和您设置的密码登录。

## 注意事项

*   后台管理页面 (`/admin` 及其子页面) 已实现身份验证，请使用管理员账号登录。
*   数据库文件 (`data.db`) 包含了所有动态内容，注意备份。
*   上传的图片文件存储在 `public/uploads/` 下的对应子目录中。
*   默认管理员账号：`admin`，密码需要在首次运行时设置。 