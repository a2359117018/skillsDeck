## ADDED Requirements

### Requirement: npm mirror setting persistence

The system SHALL store the user's npm mirror preference in `AppSettings.npmRegistry` as a string. Empty string means no mirror is used. The value SHALL persist across app restarts via electron-store.

#### Scenario: Default value on first launch

- **WHEN** the app launches for the first time with no saved settings
- **THEN** `npmRegistry` SHALL be an empty string

#### Scenario: Save mirror selection

- **WHEN** user selects a mirror preset or enters a custom URL and clicks save
- **THEN** the value SHALL be persisted to electron-store and available on next launch

### Requirement: npm mirror preset options

The system SHALL provide the following preset mirror options in the settings UI:

1. "不使用镜像" (value: empty string)
2. "淘宝" (value: `https://npmmirror.com/mirrors/npm/`)
3. "清华大学" (value: `https://mirrors.tuna.tsinghua.edu.cn/nodejs-release/npm/`)
4. "自定义..." (triggers custom URL input)

#### Scenario: Select preset mirror

- **WHEN** user selects "淘宝" from the npm mirror dropdown
- **THEN** the mirror value SHALL be set to `https://npmmirror.com/mirrors/npm/`

#### Scenario: Select no mirror

- **WHEN** user selects "不使用镜像" from the npm mirror dropdown
- **THEN** the mirror value SHALL be an empty string

### Requirement: Custom npm mirror URL input

The system SHALL allow users to enter a custom npm mirror URL when "自定义..." is selected. The custom URL MUST start with `https://`.

#### Scenario: Valid custom URL

- **WHEN** user selects "自定义..." and enters `https://my-mirror.example.com/npm/`
- **THEN** the mirror value SHALL be set to that URL after save

#### Scenario: Invalid custom URL rejected

- **WHEN** user enters a custom URL that does not start with `https://` and clicks save
- **THEN** the system SHALL show a warning and NOT save the setting

### Requirement: npm commands use mirror registry

The system SHALL append `--registry <mirror-url>` to all npm install/update commands when a mirror is configured. This applies to:

- `npm install -g npx skills` (installSkillsCli)
- `npm update -g npx` (update-npx background task)
- `npm update -g skills` (update-skills background task)
- `npm install -g npx skills` (install-skills background task)

#### Scenario: Update npx with mirror configured

- **WHEN** npmRegistry is set to `https://npmmirror.com/mirrors/npm/` and user triggers npx update
- **THEN** the executed command SHALL be `npm update -g npx --registry https://npmmirror.com/mirrors/npm/`

#### Scenario: Update npx without mirror

- **WHEN** npmRegistry is empty and user triggers npx update
- **THEN** the executed command SHALL be `npm update -g npx` (no --registry flag)

#### Scenario: Install skills CLI with mirror

- **WHEN** npmRegistry is set to a valid URL and user triggers skills CLI install
- **THEN** the executed command SHALL include `--registry <url>` in the arguments
