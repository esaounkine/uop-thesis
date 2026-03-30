# 0001 — Document authoring and review process

## Status

In review

## Context

This project serves the purpose of development of a structured document (academic, LaTeX-based) along with the supporting code.

The following constraints are deemed good practice:

- [hard requirement] The document must be written in LaTeX.
- Iteration cycles involve review and feedback (from supervisor).
- The review and decision history should be preserved.
- The document evolves over time and requires traceability of changes.

Other workflows (Google Docs, Overleaf) do not provide:

- strong version control
- structured review history
- reproducible builds
- separation between content and commentary

## Decision

Adopt a Git-based, CI-automated workflow with the following principles:

### 1. Single source of truth and separation of source/artifacts

The document content must have a single canonical representation.
Generated files must not pollute the source tree.

Decision

- Use LaTeX as the editing format.
- Keep the editable LaTeX source files versioned.
- Generated files (PDF, aux, logs) are not versioned.
- All build output is written to a gitignored directory.

Rationale

- Prevent transcoding losses between formats (Markdown, HTML).
- Reduce noise in diffs and pull requests.
- Ensure consistency with academic submission requirements.
- Enables deterministic builds.

### 2. Versioned history

All changes must be traceable over time.

Decision

- Use Git for version control.
- Use branches and pull requests for changes.

Rationale

- Enables switching to any previous version.
- Provides full edit history.
- Supports structured review cycles.

### 3. Review and commentary separation

Comments and discussion (editorial metadata) must not be embedded in the document source.

Decision

- Use GitHub pull requests for line-level comments.
- Use issues or ADRs for higher-level discussions and decisions.

Rationale

- Keeps LaTeX source clean.
- Preserves reasoning and review history externally.
- Review history is preserved in the PR's discussion.
- Clearly structured comments encourage discussion.

### 4. Rendered output for review

Reviewers receive rendered documents, not source code.

Decision

- CI builds a PDF artifact on every push/PR.
- Artifact is made accessible via GitHub Actions.
- A PR includes a link to the relevant build, containing the respective artifact.

Rationale

- Enables immediate review without local setup.

## Consequences

### Positive

- Clean and maintainable document source.
- Traceability of changes and decisions.
- Industry-standard interactive review process via PRs.
- (Almost) no dependency on proprietary collaboration tools.

### Negative

- Reviewers must have access to GitHub.
- CI dependency for rendered output (can be built locally otherwise).
