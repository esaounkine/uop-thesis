# Thesis setup

## Documentation

The documentation is written in LaTeX and is located in the `docs/tex` directory.

### Local Build

To build the documentation, run `make build` or `make watch` to auto-rebuild on changes.

The output is generated in the `out/tex` (gitignored) directory.

NOTE: this project is set up for Mac - it relies on Homebrew and MacTeX. For other systems adjust the `Makefile` and install the required dependencies manually.

## Application

The application (backend API + web) runs with docker compose (both run on the same server):

1. Copy the .env file and populate it:

```sh
cp src/packages/backend/env.example .env
```

2. Build and start the dockerised server

```sh
make docker-up-build
```

The app should be available at http://localhost:3000/

3. Use make targets to control the server (in daemon mode)

```sh
make docker-up
make docker-down
make docker-restart
```

The SQLite database file is stored in `./db-data` (it's mounted into the container) to be reused or inspected after the containers stop. Delete the directory or the .sqlite file in it to reset data.

### CI/CD Build

The documentation is built automatically on every push to the `master` branch and the resulting PDF is uploaded as an artifact of the GitHub Actions workflow.

## Process

The project focuses to output the paper as the main deliverable.
Any accompanying code will be added to the `packages` directory.

Decisions (topic- or project- specific) will be recorded in the `docs/decisions` directory.
This is a lightweight approach to remember the rationale behind the decisions. It follows the [Decision Records](https://adr.github.io/) pattern.

Content discussions (line- or paragraph- level) should occur in the PR's.

The project will follow a git-flow process to introduce all changes via PR's.

[Process ADR](docs/decisions/0001-process.md)

