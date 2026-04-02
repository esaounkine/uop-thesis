SHELL ?= /bin/bash
TEX_DIR ?= docs/tex
MAIN_TEX ?= Saunkin.tex
OUT_DIR ?= out/tex
OUT_DIR_ABS := $(abspath $(OUT_DIR))
LATEXMK ?= latexmk
LATEXMK_FLAGS := -pdf -interaction=nonstopmode -file-line-error -synctex=1
LATEXMK_EXTRA_FLAGS ?=
BASE_BRANCH ?= master

.PHONY: install-deps setup tex-cmd build watch clean distclean

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