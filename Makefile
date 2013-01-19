test: test.js node_modules
	./node_modules/.bin/mocha test.js

build: build/build.js

components: component.json
	@component install --dev

test.js: build/build.js
	./node_modules/.bin/mocha test.js

build/build.js: components index.js
	@component build --dev

node_modules:
	npm i --dev

clean:
	rm -fr build components template.js

.PHONY: clean test build
