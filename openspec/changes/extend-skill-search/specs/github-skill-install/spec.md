## ADDED Requirements

### Requirement: Parse GitHub URL

The system SHALL parse a user-provided GitHub URL into owner, repository, branch, and optional sub-path components.

#### Scenario: Standard repository URL

- **WHEN** user provides `https://github.com/vercel-labs/agent-skills`
- **THEN** system extracts owner=`vercel-labs`, repo=`agent-skills`, branch=`main`, subPath=`null`

#### Scenario: URL with branch and sub-path

- **WHEN** user provides `https://github.com/vercel-labs/agent-skills/tree/main/packages/review`
- **THEN** system extracts owner=`vercel-labs`, repo=`agent-skills`, branch=`main`, subPath=`packages/review`

#### Scenario: URL without protocol

- **WHEN** user provides `github.com/vercel-labs/agent-skills`
- **THEN** system normalizes to `https://github.com/vercel-labs/agent-skills` and extracts components successfully

#### Scenario: Invalid or non-GitHub URL

- **WHEN** user provides `https://gitlab.com/owner/repo`
- **THEN** system returns a parse error indicating unsupported URL format

### Requirement: Download GitHub repository as zipball

The system SHALL download the specified GitHub repository branch as a zipball to a temporary directory.

#### Scenario: Successful download

- **WHEN** user submits a valid GitHub URL after parsing
- **THEN** system fetches `https://github.com/{owner}/{repo}/archive/{branch}.zip`
- **AND** saves it to a temporary directory
- **AND** reports download progress to the UI

#### Scenario: Repository not found

- **WHEN** the repository or branch does not exist
- **THEN** system reports a 404 error with a clear message

#### Scenario: Network timeout

- **WHEN** download exceeds 30 seconds
- **THEN** system aborts the download and reports a timeout error
- **AND** cleans up any partial temporary files

### Requirement: Cancel GitHub download

The system SHALL allow users to cancel an in-progress GitHub download.

#### Scenario: User cancels download

- **WHEN** user clicks cancel during download
- **THEN** system aborts the fetch request
- **AND** cleans up temporary files
