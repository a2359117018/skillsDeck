## MODIFIED Requirements

### Requirement: Agent 技能列表实时响应

Agent 技能列表抽屉 SHALL 实时反映当前 Agent 已安装的技能状态，删除或安装技能后列表自动更新。

#### Scenario: 删除技能后列表自动刷新

- **WHEN** 用户在 Agent 技能抽屉中删除一个技能
- **THEN** 该技能立即从列表中消失，无需手动刷新或关闭重开抽屉

#### Scenario: 技能列表与 Store 数据同步

- **WHEN** skillsStore 中的 Agent 扫描数据更新
- **THEN** 已打开的 Agent 技能抽屉自动显示最新数据
