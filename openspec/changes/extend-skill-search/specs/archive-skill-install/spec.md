## ADDED Requirements

### Requirement: Select local archive file

The system SHALL allow users to select a local archive file through a file picker dialog.

#### Scenario: Select supported archive

- **WHEN** user clicks the file selection button
- **THEN** system opens a file picker dialog filtered to `.zip`, `.tar.gz`, `.tgz` extensions
- **AND** returns the selected file path to the renderer

#### Scenario: Cancel file selection

- **WHEN** user closes the file picker without selecting a file
- **THEN** system returns without error and leaves the UI in its previous state

### Requirement: Extract archive and scan skills

The system SHALL extract the selected archive to a temporary directory and scan for skills.

#### Scenario: Valid zip archive with skills

- **WHEN** user selects a valid `.zip` file containing skills
- **THEN** system extracts it to a temporary directory
- **AND** scans the extracted directory for SKILL.md files up to depth 2
- **AND** returns the list of discovered skills to the UI

#### Scenario: Archive contains no valid skills

- **WHEN** the extracted archive contains no SKILL.md within 2 levels
- **THEN** system returns an empty skill list
- **AND** reports "未找到有效的 skill（需要在目录中包含 SKILL.md）"

#### Scenario: Corrupted archive

- **WHEN** the selected file is not a valid archive
- **THEN** system reports a decompression error
- **AND** cleans up temporary files

### Requirement: Clean up temporary files after archive extraction

The system SHALL delete temporary extraction directories after the install operation completes or fails.

#### Scenario: Successful extraction and scan

- **WHEN** extraction and scanning complete
- **THEN** system retains the temporary directory only until installation finishes
- **AND** deletes it immediately after

#### Scenario: Failed extraction

- **WHEN** extraction fails
- **THEN** system cleans up any partially extracted temporary files
