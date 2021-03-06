(function() {

  function ValueObject() {
    this["-keys"] = [].slice.call(arguments)
  }

  ValueObject.mixin = function(type) {
    _.extend(type.prototype,ValueObject.prototype,{
      "-keys": [].slice.call(arguments,1)
    })
  }

  ValueObject.modelEql = function(to) {
    return to.id === this.id && this.constructor === to.constructor
  }
  ValueObject.applyPlugin = function(backbone) {
    backbone.Model.prototype.eql = ValueObject.ModelEql
  }

  var deriveAttrs
  ValueObject.prototype = {
    eql: function(to) {
      if(!to || !(typeof to.get == "function")) return false
      // not the same type of value object: e.g MsgParticants{from,to} != Period{from,to}
      if(this.constructor !== to.constructor) return false
      return _.every(this["-keys"],function(key) {
        var v1 = this.get(key)
        var v2 = to.get(key)
        return typeof v1.eql == "function" ? v1.eql(v2) : v1 === v2
      },this)
    },
    set: function(attrs) {
      throw new Error(this.constructor.name + " is a value object - it can't be changed. Instead, use derive() to base a new value on this one")
    },
    check: function(vals) {
      var attrs
      if(deriveLock()) {
        attrs = deriveAttrs
      } else {
        assert(vals.length === this["-keys"].length,
            "Wrong number of fields, " + this.constructor.name + " expected " + this["-keys"].length + " got " + vals.length)
        var missing = _.reduce(vals,function(missingFields,arg,index) {
          return arg == null ? missingFields.concat(this["-keys"][index]) : missingFields
        },[])
        assert(missing.length === 0,this.constructor.name + " is missing fields: " + missing.join(", "))
        attrs = _.reduce(this["-keys"],function(all,key,index) {
          all[key] = vals[index]
          return all;
        },this)
      }
      this.get = getter(attrs,this)
      return attrs;
    },
    get: function() {
      throw new Error("You must call 'check()' before using get")
    },
    derive: function(difference) {
      var values = _.reduce(this["-keys"],_.bind(function(all,key) {
        all[key] = difference[key] == null ? this.get(key) : difference[key]
        return all
      },this),{})
      deriveLockSet(values)
      var value = new this.constructor()
      deriveLockUnset()
      return value
    }
  }

  function deriveLock() {
    return !!deriveAttrs
  }
  function deriveLockSet(attrs) {
    deriveAttrs = attrs
  }
  function deriveLockUnset() {
    deriveAttrs = undefined
  }

  function getter(vals,vo) {
    return _.bind(function(k) {
      assert(_.include(vo["-keys"],k),vo.constructor.name + " does not have field '" + k + "'")
      return vals[k]
    },this)
  }
  function assert(test,msg) {
    if(!test) throw new Error(msg)
  }

  if(typeof module != "undefined") {
    module.exports = ValueObject
  }
  if(typeof define != "undefined") {
    define("values-backbone",ValueObject)
  } else if(typeof window != "undefined") {
    window.BackboneVo = ValueObject
  }
})()
