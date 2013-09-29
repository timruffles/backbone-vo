.PHONY : test

test:
	mocha -r test/test_setup.js test/backbone_vo_test.js


