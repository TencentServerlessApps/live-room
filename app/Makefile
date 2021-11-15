.PHONY: all clean dev prod help

all: .build

.build: package.json Makefile
	npm install && rm -f .build && touch .build

clean:
	rm -rf ./node_modules .build

prod:
	sls deploy --stage=prod

help:
	@echo 'Usage: make [all|clean|dev|prod|remove]'
	@echo 'Options:'
	@echo '    all        Default]Build all apps'
	@echo '    clean      Cleanup all apps'
	@echo '    dev        Build all apps and deploy to dev environment'
	@echo '    prod       Build all apps and deploy to prod environment'
