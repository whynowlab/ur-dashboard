## ADDED Requirements

### Requirement: Team configuration API
The system SHALL provide `GET /api/teams-config` to return the current team configuration and `POST /api/teams-config` to save team definitions to `~/.claude/agents/teams.json`.

#### Scenario: Read existing teams.json
- **WHEN** `~/.claude/agents/teams.json` exists
- **THEN** `GET /api/teams-config` SHALL return the file contents as JSON with `{ teams, source: "file" }`

#### Scenario: Read with no teams.json (fallback to auto-detect)
- **WHEN** `~/.claude/agents/teams.json` does not exist
- **THEN** `GET /api/teams-config` SHALL return auto-detected groups from filename prefix scanning with `{ teams, source: "auto" }`

#### Scenario: Save team configuration
- **WHEN** `POST /api/teams-config` receives a valid `{ teams }` body
- **THEN** the system SHALL write the teams to `~/.claude/agents/teams.json` and return `{ success: true }`

### Requirement: Team configuration UI
The system SHALL provide a Team Configuration section in the Settings tab where users can view, edit, and save team groupings.

#### Scenario: View auto-detected teams
- **WHEN** user opens Settings tab and no teams.json exists
- **THEN** the system SHALL display auto-detected team groups with a banner "Teams auto-detected from agent filenames — Save to customize"

#### Scenario: Edit team membership
- **WHEN** user removes an agent from a team or moves an agent to a different team
- **THEN** the UI SHALL reflect the change and enable the Save button

#### Scenario: Save configuration
- **WHEN** user clicks Save
- **THEN** the system SHALL POST to `/api/teams-config` and display success/error feedback

### Requirement: teams.json takes priority over auto-detection
The system SHALL use `~/.claude/agents/teams.json` for team grouping when the file exists, falling back to filename prefix auto-detection only when the file is absent.

#### Scenario: teams.json overrides auto-detection
- **WHEN** `~/.claude/agents/teams.json` exists with team definitions
- **THEN** the Teams panel and stream API SHALL use those definitions instead of filename prefix grouping
