## ADDED Requirements

### Requirement: Scan directory for skills

The system SHALL scan a directory recursively to discover skills by locating `SKILL.md` files, with a maximum scanning depth of 2 levels from the root.

#### Scenario: Single skill at root

- **WHEN** scanning a directory where `SKILL.md` exists at the root level
- **THEN** system returns exactly one skill pointing to the root directory
- **AND** does not scan any subdirectories

#### Scenario: Multiple skills at first level

- **WHEN** scanning a directory with no root-level `SKILL.md`
- **AND** subdirectories `review/` and `commit/` each contain `SKILL.md`
- **THEN** system returns two skills: `review` and `commit`

#### Scenario: Multiple skills at second level

- **WHEN** scanning a directory with no root-level or first-level `SKILL.md`
- **AND** `packages/review/SKILL.md` and `packages/commit/SKILL.md` exist
- **THEN** system returns two skills: `review` and `commit`

#### Scenario: Mixed depth with early termination

- **WHEN** scanning a directory where `core/SKILL.md` exists at first level
- **AND** `core/sub/SKILL.md` exists at second level under `core/`
- **THEN** system returns only `core` (first-level match prevents deeper scanning)

#### Scenario: No skills found

- **WHEN** scanning a directory with no `SKILL.md` within 2 levels
- **THEN** system returns an empty array

#### Scenario: Hidden directories ignored

- **WHEN** scanning a directory containing `.git/SKILL.md`
- **THEN** system ignores the `.git` directory and its contents

### Requirement: Install skills to agent directories

The system SHALL copy selected skill directories to the target agents' global skills directories.

#### Scenario: Install single skill to one agent

- **WHEN** user selects skill `review` and agent `claude-code`
- **THEN** system copies the skill directory to `~/.claude/skills/review/`

#### Scenario: Install single skill to multiple agents

- **WHEN** user selects skill `review` and agents `claude-code` and `cursor`
- **THEN** system copies the skill directory to both `~/.claude/skills/review/` and `~/.cursor/skills/review/`

#### Scenario: Install multiple skills to multiple agents

- **WHEN** user selects skills `review` and `commit` with agents `claude-code` and `cursor`
- **THEN** system copies all selected skills to all selected agents

#### Scenario: Overwrite existing skill

- **WHEN** the target agent directory already contains a skill with the same name
- **THEN** system overwrites the existing skill directory with the new content
- **AND** reports which skills were overwritten in the result

### Requirement: Report installation results

The system SHALL return a detailed result indicating which skills were successfully installed and which failed.

#### Scenario: All skills install successfully

- **WHEN** all selected skills are copied to all target agents without error
- **THEN** system returns success status with a list of installed skill names

#### Scenario: Partial failure

- **WHEN** one skill fails to copy due to a permission error
- **THEN** system continues installing remaining skills
- **AND** returns success list plus failure list with error details

### Requirement: Clean up temporary source directories

The system SHALL delete temporary source directories after installation completes or fails.

#### Scenario: Successful installation

- **WHEN** all skills are successfully installed
- **THEN** system deletes the temporary source directory immediately

#### Scenario: Failed installation

- **WHEN** installation fails partially or completely
- **THEN** system still deletes the temporary source directory
