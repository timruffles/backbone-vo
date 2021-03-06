# BackboneVo

BackboneVo is a library for improving your application code by adding the concept of values. Lots of concepts in our apps don't have a specific 'identity' - for instance every `new Point({x: 0, y: 0})` is conceptually the same point. It's more natural if these concepts work like values, namely:

1. ["two value objects are equal if all their fields are equal"](http://martinfowler.com/bliki/ValueObject.html)
2. value objects can't be changed once created

You'll notice lots of things should behave like this: everything involving time, numbers, strings etc. There's a longer discussion of [equality](#value-based-equality) and [change](#values-dont-change) below.

By default in Javascript object equality is based on identity, so we don't get value-like equality for free:

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
BackboneVo.mixin(Point,"x","y");
var a = new Point(0,0);
var b = new Point(0,0);

assert( a.eql(b) ); // succeeds - follows value semantics
```

Towards preventing changes to our values, we could use the ES5 `Object.defineProperty` to make an object with non-writable properties, but it'd confusing to have half our objects in Backbone using `get()` and the values using normal properties. So BackboneVo gives access to fields via a `get()` method. It also provides a `set()` method, but this simply throws an error to remind you it's a value object, or to help developers who've not learned about them.


## Install

values-backbone supports require.js and other AMD loaders, or you can simply include it as normal and it'll define `window.BackboneVo`. If you want an `eql()` method on `Backbone.Model` too ([why](#modeleql)), you can run: 

```javascript
BackboneVo.applyPlugin(Backbone)
```

## Value based equality

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
BackboneVo.mixin(Line,"x1","y1","x2","y2");
Line.prototype.valueOf = function() {
  // Pythagorus' theorem
  return Math.sqrt( Math.pow(this.y2 - this.y1,2) + Math.pow(this.x2 - this.x1,2) );
}

var a = new Line(0, 0,   0, 10);
var b = new Line(19,19,  20,20);

assert( a > b );
```

### `Model#eql()`

BackboneVo supplies an `eql()` implementation for `Backbone.Model` too - this again allows more natural interoperability. Either set `Backbone.Model.prototype.eql = BackboneVo.modelEql`, or run `BackboneVo.applyPlugin(Backbone)`. `eql()` for models checks for equality of `id` and `constructor`.

## Values don't change

It [should not be possible](http://c2.com/cgi/wiki?ValueObjectsShouldBeImmutable) to change value objects (fancy version: 'immutable', as in can't mutate/change). Like numbers, it doesn't make sense to 'change' (mutate) a value, you simply have a totally different value. Allowing values to change in place leads to confusing code:

```javascript
var today = MutableDateLibrary.today();
var event = { at: today, text: "started using values" };

// `addDays()` is implemented mutably, changing the date in place and returning it
var remindAt = event.at.addDays(1);

// fails! today has been changed
assert( today.timestamp() === MutableDateLibrary.today().timestamp() );
```

This [really happens](http://arshaw.com/xdate/#Adding), and we've probably all made something that should be a value type mutable. The above is equally true for: intervals, ranges, dates and sets of any type.

Value objects created by BackboneVo are immutable - you can only access fields via `get()`, and their values are safely stored inside a closure, inaccessible to the outside world.

## Mixin

Rather than requiring you to use a subclassing mechanism, values-backbone lets you setup your constructor & prototype as normal, and use `BackboneVo.mixin` to mixin value object behaviour into your prototype. Just make sure you call `check()` on your constructor arguments and you're away - you can easily mix this into existing types.

```javascript
var Period = function() {
  this.check(arguments)
};
BackboneVo.mixin(Period,"from","to")
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
