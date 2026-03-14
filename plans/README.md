# Plans

该目录用于存放项目的计划文件、阶段路线图、执行清单与补充说明。

后续如需新增规划类文档，默认放入 [`plans`](plans) 目录。

---

## 当前项目目录骨架

目前项目已整理为以下结构：

```text
plans/
  README.md

public/
  .gitkeep

scripts/
  .gitkeep

dist/
  .gitkeep

src/
  .gitkeep
  app/
    bootstrap/
      .gitkeep
    providers/
      .gitkeep
    router/
      .gitkeep
    store/
      .gitkeep
  assets/
    audio/
      .gitkeep
    icons/
      .gitkeep
    images/
      .gitkeep
  components/
    battle/
      .gitkeep
    character/
      .gitkeep
    common/
      .gitkeep
    event/
      .gitkeep
    layout/
      .gitkeep
    map/
      .gitkeep
  data/
    archetypes/
      .gitkeep
    constants/
      .gitkeep
    enemies/
      .gitkeep
    events/
      .gitkeep
    items/
      .gitkeep
    skills/
      .gitkeep
    templates/
      .gitkeep
  domain/
    ai/
      .gitkeep
    battle/
      .gitkeep
    character/
      .gitkeep
    formulas/
      .gitkeep
    reward/
      .gitkeep
    run/
      .gitkeep
    save/
      .gitkeep
  hooks/
    .gitkeep
  screens/
    battle/
      .gitkeep
    camp/
      .gitkeep
    event/
      .gitkeep
    map/
      .gitkeep
    recruit/
      .gitkeep
    result/
      .gitkeep
    start/
      .gitkeep
    title/
      .gitkeep
  styles/
    globals/
      .gitkeep
    themes/
      .gitkeep
  tests/
    battle/
      .gitkeep
    formulas/
      .gitkeep
    run/
      .gitkeep
  types/
    .gitkeep
  utils/
    .gitkeep
```

---

## 当前目录说明

### 根目录

- [`plans`](plans) 存放计划、路线图、执行清单和阶段说明
- [`public`](public) 存放少量无需编译处理的公开资源
- [`scripts`](scripts) 存放构建辅助脚本，例如单文件输出处理脚本
- [`dist`](dist) 存放最终构建产物，例如单一 [`index.html`](index.html)；如需本地离线打开页面，应执行构建后打开 [`dist/index.html`](dist/index.html)
- [`src`](src) 是后续正式开发的主目录

### [`src/app`](src/app)

应用装配层，负责：

- 启动入口初始化
- provider 注册
- store 组装
- 页面切换与应用级流程编排

### [`src/assets`](src/assets)

静态资源目录，负责：

- [`src/assets/audio`](src/assets/audio) 音频资源
- [`src/assets/icons`](src/assets/icons) 图标资源
- [`src/assets/images`](src/assets/images) 图片资源

### [`src/components`](src/components)

可复用 UI 组件目录，负责：

- 战斗相关组件
- 角色卡片组件
- 通用面板与按钮组件
- 事件展示组件
- 布局组件
- 地图图元组件

### [`src/data`](src/data)

静态数据与模板目录，负责：

- 角色原型池
- 常量配置
- 敌人模板
- 事件模板
- 道具模板
- 技能模板
- AI fallback 文本模板

### [`src/domain`](src/domain)

核心规则层，负责：

- AI 内容适配与修正
- 战斗结算
- 角色规则处理
- 数值公式
- 奖励结算
- 单局流程推进
- 本地存档与序列化预留

### [`src/hooks`](src/hooks)

存放通用自定义 hook。

### [`src/screens`](src/screens)

页面级目录，负责：

- 标题页
- 开局页
- 地图页
- 事件页
- 招募页
- 战斗页
- 营地页
- 结算页

### [`src/styles`](src/styles)

样式目录，负责：

- 全局样式
- 主题样式

### [`src/tests`](src/tests)

测试目录，负责：

- 战斗流程测试
- 公式验算测试
- 单局流程测试

### [`src/types`](src/types)

通用类型导出目录，不承载业务逻辑。

### [`src/utils`](src/utils)

通用工具目录，例如：

- 随机种子工具
- 安全解析工具
- 格式化工具
- 通用纯函数工具

---

## 当前阶段的整理原则

当前目录整理遵循以下原则：

1. 先建立长期稳定的目录骨架
2. 用 [`.gitkeep`](src/.gitkeep) 保留空目录
3. 暂不生成大量空业务实现文件
4. 等进入编码阶段再逐步补充实际模块文件

这样做的目的，是先把工程边界固定下来，避免后续开发过程中目录混乱、职责重叠或文件位置反复迁移。

---

## 当前架构结论摘要

目前项目默认采用以下主架构：

- [`TypeScript`](plans/README.md) 作为基础语言
- [`React`](plans/README.md) 作为 UI 框架
- [`Vite`](plans/README.md) 作为构建工具
- [`Zustand`](plans/README.md) 作为全局状态管理
- 建议补充 [`ESLint`](plans/README.md)、[`Prettier`](plans/README.md)、[`Vitest`](plans/README.md) 作为工程基础设施
- 开发期保持多文件模块化
- 发布期输出单一 [`index.html`](index.html)

详细架构规范以 [`ARCHITECTURE.md`](ARCHITECTURE.md) 为准。