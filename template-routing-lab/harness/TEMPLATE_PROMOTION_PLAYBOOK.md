# 模板升格程序化计划

## 目标
将当前扩仓得到的 `candidate` 模板，按统一规则升格为 `active` 模板，避免后续模板库失控增长或出现大量“看得见但不能用”的候选。

本计划用于：
- 记录升格流程
- 统一团队执行标准
- 为后续持续扩仓提供固定模板

## 适用范围
适用于所有新扩入模板，尤其是以下状态：
- `status = candidate`
- `sourceType = variant_seed`
- 尚未拥有正式 voxel 几何来源

## 升格原则

### 硬约束
- 没有最小可用几何来源，不得升格为 `active`
- 没有完整 metadata，不得升格
- 没有可解释的适用场景和 `editableParts`，不得升格
- 未经过至少一轮检索验证，不得升格
- 来源不合规，不得升格

### 推荐流程
- 先补最小几何或生成器
- 再跑检索与排序验证
- 再调整 metadata
- 最后改状态为 `active`

## 升格分阶段流程

### Phase 1：选定升格候选
从 `candidate` 中选择优先级最高、价值最高的模板。

优先标准：
- 高频题材
- 当前模板库空白明显
- 容易体素化
- 适合 `reuse / adapt`

推荐当前优先顺序：
1. `exp-sedan-car`
2. `exp-house-small`
3. `exp-dog-corgi`

### Phase 2：补最小可用几何来源
必须至少满足以下任一条件：
- 有真实 `generator`
- 有固定 `static_voxel`
- 有可以稳定产出的模板几何脚本

不允许：
- 只靠 metadata 升格
- 用参考图直接假设几何已存在

### Phase 3：补充 metadata 完整度
升格前必须复查：
- `tags`
- `styleTags`
- `shapeTags`
- `colorTags`
- `editableParts`
- `promptAliases`
- `negativeKeywords`
- `rebuildSuitability`
- `voxelBudgetRange`

必须做到：
- 有明显的适用 prompt
- 有明确的冲突 prompt
- 有明确的可改造部位

### Phase 4：检索验证
至少验证以下内容：
- 目标 prompt 能命中该模板
- 明显无关 prompt 不会高分误命中
- 与相近模板竞争时排序合理
- 在 `create` 与 `morph` 模式下行为符合预期

最小验证样例建议：
- 正向样例 3 个
- 负向样例 2 个
- 冲突样例 1 个

### Phase 5：状态升级
满足前四阶段后，执行：
- `status: candidate -> active`
- 如果来源已经稳定，可视情况将 `sourceType` 从 `variant_seed` 升级为 `generator` 或 `static_voxel`

### Phase 6：记录升格日志
每次升格都必须记录：
- 升格对象
- 来源类型
- 升格原因
- 验证样例
- 是否涉及 metadata 调整
- 是否还存在已知缺口

## 升格模板记录格式
建议以后每次都按下面格式记录：

```md
## 模板升格记录
- templateId:
- fromStatus:
- toStatus:
- sourceType:
- geometrySource:
- positivePrompts:
- negativePrompts:
- rankingCheck:
- routeCheck:
- notes:
```

## 当前候选的建议处理

### 已完成升格 ✓

#### exp-sedan-car 升格完成（2026-04-19）
- **Phase 2**: Generator Function `generateSedanCar()` ✓
- **Phase 3**: 生产级元数据（8 aliases, 10 negative keywords）✓
- **Phase 4**: 检索验证 6/6 test cases通过 ✓
- **Phase 5**: Status `candidate` → `active` ✓
- **Phase 6**: 升格日志已记录 ✓
- **报告**: `SEDAN_CAR_PROMOTION_REPORT_2026-04-19.md`

结果：Vehicle类别初始覆盖完成，预计覆盖10-15%车辆相关提示

#### exp-house-small 升格完成（2026-04-19）
- **Phase 2**: Generator Function `generateSmallHouse()` ✓
- **Phase 3**: 生产级元数据（8 aliases, 9 negative keywords）✓
- **Phase 4**: 几何与契约测试通过 ✓
- **Phase 5**: Status `candidate` → `active` ✓
- **Phase 6**: 并入统一测试入口 ✓
- **来源**: `src/templates/generators/houseSmallGenerator.ts#generateSmallHouse`

结果：Building类别从候选进入可用，支持roof/window/chimney可编辑

#### exp-dog-corgi 升格完成（2026-04-19）
- **Phase 2**: Generator Function `generateDogCorgi()` ✓
- **Phase 3**: 生产级元数据（8 aliases, 9 negative keywords）✓
- **Phase 4**: 几何与契约测试通过 ✓
- **Phase 5**: Status `candidate` → `active` ✓
- **Phase 6**: 并入统一测试入口 ✓
- **来源**: `src/templates/generators/dogCorgiGenerator.ts#generateDogCorgi`

结果：Animal类别扩展完成第一轮基础犬类模板

### 第一轮候选精修结论
- 已按优先级完成三项升格：`exp-sedan-car`、`exp-house-small`、`exp-dog-corgi`
- 三者均为 `active + generator`，且采用统一 `path#symbol` 来源登记格式
- 当前全量测试通过，可进入下一轮候选升格

### 第二轮候选精修结论（2026-04-20）
- 已按同一 Phase 2-6 流程完成两项升格：`exp-fox-sitting`、`exp-penguin-standing`
- 两者均已切换为 `active + generator`，并接入统一几何测试与路由验证测试
- 统一登记格式核验通过：`source.ref = src/templates/generators/*.ts#symbol`
- 全量测试通过（含新增 Fox/Penguin 几何与 Round2 路由回归）

### 第三轮候选精修结论（2026-04-20）
- 已按同一 Phase 2-6 流程完成两项升格：`exp-bus-city`、`exp-fire-truck`
- 两者均已切换为 `active + generator`，并接入统一几何测试与路由验证测试
- 统一登记格式核验通过：`source.ref = src/templates/generators/*.ts#symbol`
- 全量测试通过（含新增 Bus/Fire-truck 几何与 Round3 路由回归）

### 可以优先升格
- `exp-turtle-low`
- `exp-boat-small`

### 可以继续保留为 candidate
- `exp-turtle-low`
- `exp-boat-small`

原因：
- 第一批优先升格高频基础题材
- 其余对象后续继续补几何与测试

## 与数据库和日志的关系
后续如果引入数据库记录模板演化过程，建议单独记录：
- 候选创建事件
- 升格事件
- 下线或降级事件

但这些事件不得自动驱动升格，仍然必须人工确认。

## 结论
扩仓和升格要分开执行：
- 扩仓解决覆盖面
- 升格解决可用性

下一步执行建议：
- 基于相同流程推进第四轮：`exp-turtle-low`、`exp-boat-small`
- 数据库侧继续沉淀升格事件：bus/fire-truck 候选->升格

## 第四轮候选精修结论（2026-05-18）

### exp-turtle-low 升格完成
- templateId: `exp-turtle-low`
- fromStatus: `candidate`
- toStatus: `active`
- sourceType: `generator`
- geometrySource: `src/templates/generators/turtleLowGenerator.ts#generateLowTurtle`
- positivePrompts: `turtle`, `cute turtle`, `sea turtle`, `pond turtle`
- negativePrompts: `car`, `bus`, `house`, `penguin`
- rankingCheck: `cute turtle` 命中 `exp-turtle-low`
- routeCheck: `cute turtle` 路由为 `reuse`
- notes: 已补低矮龟壳、短头部、四肢、尾部、眼睛和 shell pattern 变体；默认生成约 190 voxels，落在 `130-195` 预算内。

### exp-boat-small 升格完成
- templateId: `exp-boat-small`
- fromStatus: `candidate`
- toStatus: `active`
- sourceType: `generator`
- geometrySource: `src/templates/generators/boatSmallGenerator.ts#generateSmallBoat`
- positivePrompts: `boat`, `small boat`, `fishing boat`, `rescue boat`
- negativePrompts: `animal`, `house`, `car`, `penguin`
- rankingCheck: `small boat` 命中 `exp-boat-small`
- routeCheck: `small boat` 路由为 `reuse`
- notes: 已补船体、甲板、船头、船尾、舱体和 cabin variant；默认生成约 148 voxels，落在 `140-210` 预算内。

### 第四轮结果
- `EXPANSION_TEMPLATE_REGISTRY` 当前无剩余 `candidate`。
- 当前模板库共 `13` 个模板，`13` 个均为 `active`。
- 本轮同时同步主 API `templateMatcher`，使 `turtle` 与 `boat` 能写入 `template_match`。
