## ADDED Requirements

### Requirement: Dispatch API endpoint
The system SHALL provide `POST /api/dispatch` that accepts `{ agent, prompt, permissionMode?, timeout? }` and spawns a `claude` CLI process to execute the task.

#### Scenario: Successful dispatch
- **WHEN** a valid dispatch request is received with agent name and prompt
- **THEN** the system SHALL spawn `claude -p --agent <agent> --output-format stream-json "<prompt>"` using `child_process.spawn` with `shell: false`, assign a UUID jobId, and return `{ jobId, status: "running" }`

#### Scenario: Agent not found
- **WHEN** the requested agent name does not match any file in `~/.claude/agents/`
- **THEN** the system SHALL return HTTP 400 with `{ error: "Agent not found" }`

#### Scenario: CLI not available
- **WHEN** `claude` CLI is not installed or not in PATH
- **THEN** the system SHALL return HTTP 503 with `{ error: "Claude CLI not available" }`

#### Scenario: Concurrent job limit reached
- **WHEN** the number of running jobs equals the max concurrent limit (default 3)
- **THEN** the system SHALL return HTTP 429 with `{ error: "Max concurrent jobs reached" }`

### Requirement: Job cancellation
The system SHALL provide `DELETE /api/dispatch/[jobId]` to cancel a running job.

#### Scenario: Cancel running job
- **WHEN** DELETE is called for a running job
- **THEN** the system SHALL send SIGTERM to the process, wait 5 seconds, then SIGKILL if still alive, and return `{ status: "cancelled" }`

#### Scenario: Cancel non-existent job
- **WHEN** DELETE is called for an unknown jobId
- **THEN** the system SHALL return HTTP 404

### Requirement: Job timeout
The system SHALL enforce a configurable timeout (default 300 seconds) on dispatch jobs.

#### Scenario: Job exceeds timeout
- **WHEN** a running job exceeds the timeout duration
- **THEN** the system SHALL send SIGTERM, wait 5 seconds, then SIGKILL, and mark the job status as "timeout"

### Requirement: Dispatch UI
The system SHALL provide a dispatch interface accessible from the Teams panel where users can select an agent/team and enter a natural language task.

#### Scenario: Open dispatch form
- **WHEN** user clicks Dispatch button on a team or agent card
- **THEN** the system SHALL show a form pre-filled with the agent/team name and a text input for the task

#### Scenario: Submit dispatch
- **WHEN** user enters a task and clicks Run
- **THEN** the system SHALL POST to `/api/dispatch` and navigate to a live output view

### Requirement: Process safety
The system SHALL use `spawn(file, args, {shell: false})` for all CLI execution to prevent shell injection. User prompt text SHALL be passed as a single CLI argument, never interpolated into a shell command.

#### Scenario: Prompt with special characters
- **WHEN** user submits a prompt containing shell metacharacters (e.g., `; rm -rf /`)
- **THEN** the system SHALL pass it as a literal string argument to `claude`, not interpreted by a shell
