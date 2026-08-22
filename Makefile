SHELL ?= /bin/bash
TEX_DIR ?= docs/tex
MAIN_TEX ?= Saunkin.tex
OUT_DIR ?= out/tex
OUT_DIR_ABS := $(abspath $(OUT_DIR))
LATEXMK ?= latexmk
LATEXMK_FLAGS := -pdf -interaction=nonstopmode -file-line-error -synctex=1
LATEXMK_EXTRA_FLAGS ?=
BASE_BRANCH ?= master

.PHONY: install-deps setup tex-cmd build watch clean distclean docker-build docker-push docker-up docker-down deploy install-cicd

install-deps:
	brew install --cask mactex-no-gui

setup:
	mkdir -p $(OUT_DIR)
	cd $(TEX_DIR) && find . -type d -mindepth 1 -exec mkdir -p $(abspath $(OUT_DIR))/{} \;

# internal tex cmd shortcut
tex-cmd: setup
	cd $(TEX_DIR) && $(LATEXMK) \
    		$(LATEXMK_FLAGS) \
    		$(LATEXMK_EXTRA_FLAGS) \
    		-outdir=$(OUT_DIR_ABS) \
    		$(MAIN_TEX)

build:
	$(MAKE) tex-cmd

watch:
	LATEXMK_EXTRA_FLAGS="-pvc" $(MAKE) tex-cmd

clean:
	cd $(TEX_DIR) && $(LATEXMK) \
    		$(LATEXMK_FLAGS) \
    		-outdir=$(OUT_DIR_ABS) \
    		-c \
    		$(MAIN_TEX)

distclean:
	rm -rf $(OUT_DIR)

diff:
	@test -n "$(BASE_BRANCH)" || (echo "BASE_BRANCH=<git-ref> required" && exit 1)

	cd $(TEX_DIR) && rm -f diff.tex base.tex

	git show $(BASE_BRANCH):docs/tex/Saunkin.tex > $(TEX_DIR)/base.tex

	cd $(TEX_DIR) && latexdiff base.tex Saunkin.tex > diff.tex

	cd $(TEX_DIR) && latexmk -pdf \
		-output-directory=$(OUT_DIR_ABS) \
		diff.tex

	cd $(TEX_DIR) && rm -f diff.tex base.tex

IMAGE ?= ghcr.io/esaounkine/uop-thesis:latest

docker-build:
	docker build -t $(IMAGE) -f src/Dockerfile src

docker-push:
	docker push $(IMAGE)

docker-up:
	docker compose up -d

docker-down:
	docker compose down

deploy:
	docker compose pull
	docker compose up -d
	docker image prune -f

install-cicd:
	echo "*/5 * * * * $(CURDIR)/src/infra/deploy.sh >> /tmp/deploy.log 2>&1" | crontab -