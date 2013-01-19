test: test.js node_modules
	./node_modules/.bin/mocha -r expect.js test.js

build: build/build.js
	@:

components: component.json
	@component install --dev

test.js: build/build.js
	./node_modules/.bin/mocha test.js

build/build.js: index.js
	@component build --dev

node_modules:
	npm i --dev

clean:
	rm -fr build components template.js

.PHONY: clean test build
