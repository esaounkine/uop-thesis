# Thesis setup

The main artifact of this project is the thesis paper.

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

The two components making up this project are:

- [Backend](src/packages/backend/README.md) - the API, CLI and data pipeline.
- [Web](src/packages/web/README.md) - the UI.

### CI/CD Build

The documentation is built automatically on every push to the `master` branch and the resulting PDF is uploaded as an artifact of the GitHub Actions workflow.


