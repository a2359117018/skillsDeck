## MODIFIED Requirements

### Requirement: 安装对话框预选默认 Agent
安装对话框打开时 SHALL 自动预选设置页配置的默认安装目标（defaultAgent），用户无需每次手动选择。

#### Scenario: 打开安装对话框时预选默认 Agent
- **WHEN** 用户点击安装技能，安装对话框打开
- **THEN** 默认安装目标自动被选中，用户可以直接确认安装

#### Scenario: 重置安装对话框时恢复默认 Agent
- **WHEN** 安装完成或用户重置安装状态
- **THEN** selectedAgents 重置为默认 agent，而非空数组

#### Scenario: 用户可修改预选的 Agent
- **WHEN** 安装对话框已预选默认 Agent
- **THEN** 用户仍可手动更改选择，预选不限制用户操作
