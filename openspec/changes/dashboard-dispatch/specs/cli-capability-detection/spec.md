## ADDED Requirements

### Requirement: CLI detection at startup
The system SHALL detect whether the `claude` CLI is installed and available in PATH when the server starts, and cache the result.

#### Scenario: CLI found
- **WHEN** `claude --version` executes successfully
- **THEN** the system SHALL set `capabilities.canDispatch = true` and store the CLI version string

#### Scenario: CLI not found
- **WHEN** `claude` is not in PATH or execution fails
- **THEN** the system SHALL set `capabilities.canDispatch = false`

### Requirement: Capability in stream data
The system SHALL include `capabilities: { canDispatch: boolean, cliVersion?: string }` in the SSE dashboard data stream so the UI can enable/disable dispatch features.

#### Scenario: Dashboard data includes capabilities
- **WHEN** dashboard SSE stream emits data
- **THEN** the data SHALL include a `capabilities` field indicating dispatch availability

### Requirement: UI adaptation based on capability
The system SHALL disable all dispatch-related UI elements when `canDispatch` is false and show an installation guide instead.

#### Scenario: CLI not available
- **WHEN** `canDispatch` is false
- **THEN** the Teams panel SHALL hide dispatch buttons and show "Install Claude Code to enable agent dispatch" message

#### Scenario: CLI available
- **WHEN** `canDispatch` is true
- **THEN** the Teams panel SHALL show dispatch buttons on team/agent cards
