SHELL ?= /bin/bash
TEX_DIR ?= docs/tex
MAIN_TEX ?= main.tex
OUT_DIR ?= out/tex
OUT_DIR_ABS := $(abspath $(OUT_DIR))
LATEXMK ?= latexmk
LATEXMK_FLAGS := -pdf -interaction=nonstopmode -file-line-error -synctex=1
LATEXMK_EXTRA_FLAGS ?=

.PHONY: install-deps setup tex-cmd build watch clean distclean

install-deps:
	brew install --cask mactex-no-gui

setup:
	mkdir -p $(OUT_DIR)

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