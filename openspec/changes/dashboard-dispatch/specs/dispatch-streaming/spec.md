## ADDED Requirements

### Requirement: Job output streaming
The system SHALL provide `GET /api/dispatch/[jobId]/stream` that streams the job's stdout/stderr as Server-Sent Events.

#### Scenario: Stream running job
- **WHEN** client connects to the stream endpoint for a running job
- **THEN** the system SHALL emit SSE events with `{ type: "stdout"|"stderr", data: string, timestamp: string }` as output arrives from the claude process

#### Scenario: Stream completed job
- **WHEN** client connects to the stream endpoint for a completed job
- **THEN** the system SHALL emit buffered log events followed by a final `{ type: "done", exitCode: number, duration: number }` event and close the stream

#### Scenario: Stream connection closed
- **WHEN** client disconnects from the SSE stream
- **THEN** the running claude process SHALL continue executing (background mode) — the process is NOT killed on disconnect

### Requirement: Job status API
The system SHALL provide `GET /api/dispatch` that returns the list of all jobs (running, completed, failed, cancelled, timeout) in the current session.

#### Scenario: List all jobs
- **WHEN** client requests the job list
- **THEN** the system SHALL return `{ jobs: DispatchJob[] }` including jobId, agent, prompt, status, startedAt, duration, exitCode for each job

### Requirement: Live output view
The system SHALL display a live output panel that shows streamed output from a running dispatch job.

#### Scenario: View running job output
- **WHEN** user dispatches a job or selects a running job
- **THEN** the system SHALL display a scrolling terminal-style output view with stdout content and a cancel button

#### Scenario: View completed job
- **WHEN** user selects a completed job
- **THEN** the system SHALL display the final output with exit status and duration
