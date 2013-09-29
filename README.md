# BackboneVo

BackboneVo is a library for improving your application code by adding value semantics. Lots of concepts in our apps don't have a specific 'identity' - for instance every `new Point({x: 0, y: 0})` is conceptually the same point. It's more natural if these concepts uphold these value semantics in our code, namely that ["two value objects are equal if all their fields are equal"](http://martinfowler.com/bliki/ValueObject.html). But by default in Javascript object equality is based on identity, so:

```javascript

function Point(x,y) {
  this.x = x;
  this.y = y;
}

var a = new Point(0,0);
var b = new Point(0,0);

assert( a == b ); // fails - based on object identity
```

BackboneVo uses an `eql()` method to allow us to compare two value objects based on their value:

```javascript
function Point() {
  this.check(arguments)
}
BackboneVo.augment(Point,"x","y");
var a = new Point(0,0);
var b = new Point(0,0);

assert( a.eql(b) ); // succeeds - follows value semantics
```

BackboneVo gives access to fields via a `get()` method to fit naturally into Backbone apps. It also provides a `set()` method, but this simply throws an error to remind you it's a value object, or to let developers who've not learned about them know how to use them.

## Install

values-backbone supports require.js and other AMD loaders, or you can simply include it as normal and it'll define `window.BackboneVo`.

## Value semantics

So values should be comparable by value. `valueOf` is the method JS gives us to control how our objects are compared, but unfortunately it doesn't work for `==` and `===`, only the inequality operators. Equality operations for objects are always based on identity. Values.js works around this by ensuring the same object is returned for the same arguments to a value object constructor.

```javascript
var a = new Range(1,10);
var b = new Range(1,10);

assert( a === b );
```

If your value object can meaningfully use the inequality operators `<`, `>` - for instance a set can be bigger than another set - then define a `valueOf` method to return a comparable value (a String or Number). That'll cover all comparisons for your value object!


```javascript
function Line() {
  this.check(arguments)
}
BackboneVo.augment(Line,"x1","y1","x2","y2");
Line.prototype.valueOf = function() {
  // Pythagorus' theorem
  return Math.sqrt( Math.pow(this.y2 - this.y1,2) + Math.pow(this.x2 - this.x1,2) );
}

var a = new Line(0, 0,   0, 10);
var b = new Line(19,19,  20,20);

assert( a > b );
```

BackboneVo supplies an `eql()` implementation for `Backbone.Model` too - this again allows more natural interoperability. Either set `Backbone.Model.prototype.eql = BackboneVo.modelEql`, or run `BackboneVo.applyPlugin(Backbone)`. `eql()` for models checks for equality of `id` and `constructor`.

## Immutability

ValueObjects [should be immutable](http://c2.com/cgi/wiki?ValueObjectsShouldBeImmutable). Like numbers, it doesn't make sense to 'change' (mutate) a value, you simply have a new one. Allowing values to change in place leads to confusing semantics:

```javascript
var today = MutableDateLibrary.today();
var event = { at: today, text: "started using values" };

// `addDays()` is implemented mutably, changing the date in place and returning it
var remindAt = event.at.addDays(1);

// fails! today has been changed
assert( today.timestamp() === MutableDateLibrary.today().timestamp() );
```

This [really happens](http://arshaw.com/xdate/#Adding), and we've probably all made something that should be a value type mutable. The above is equally true for: intervals, ranges, dates and sets of any type.

Value objects created by BackboneVo are immutable.

## Mixin

Rather than requiring you to use a subclassing mechanism, values-backbone lets you setup your constructor & prototype as normal, and use `BackboneVo.augment` to mixin value object behaviour into your prototype. Just make sure you call `check()` on your constructor arguments and you're away - you can easily mix this into existing types.

```javascript
var Period = function() {
  this.check(arguments)
};
BackboneVo.augment(Period,"from","to")
```

## 'Changing' a value via `derive`

<a id="derive"></a>

To create a new version of a value object based on an old one, use the `derive` method. This eases the creation of modified value objects, without losing the benefits of their immutability.

```javascript
var periodA = new Period(2012,2015);
var periodB = periodA.derive({from:2013});

assert(periodA.get("from") === 2012);
assert(periodB.get("from") === 2013);

var periodC = periodB.derive({from: 2012});

assert(periodA.eql(periodC));
```

The derive method takes a map of named arguments.

You'd use the `derive` method to update references to values in variables or as object properties. Values are used in mutable systems, they're just immutable themselves.

## API

### Instance methods on value objects

#### vo#get

```javascript
aValueObject.get("fieldName")
```

Returns value of field name.

#### vo#derive

```javascript
aValueObject.derive(newValuesMap)
var derivedVersionOfValue = aValueObject.derive({field: "newValue"})
```

Instance method that returns a new value object with field values taken by preference from newValuesMap, with any missing fields taken from the existing value object `derive` is called on.

#### vo#eql

```javascript
voA.eql(voB);
```

`eql()` returns true when passed another value object of the same type with the same values for all fields. It works recursively, so you can have value objects that themselves contain value objects.

## Running the tests

To verify the logic works quickly, you can run the test suite in node.

```bash
npm install # installs testing library
make test
```

For browser testing simply open up `test.html`.

## Philosophy

- Small (~75 lines, <1.5kb uglified + gzipped)
- Contracts upheld strongly in all Javascript environments (e.g immutability, equality)
- No additional dependencies above Backbone's: underscore
