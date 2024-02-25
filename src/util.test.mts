import { describe, expect, test } from '@jest/globals';
import { getTestable, setTestable, testable } from "./util.js";

/* istanbul ignore next */
describe('util.ts', () => {

  class Test {
    @testable
    #private: string = "";

    get private(): string {
      return this.#private;
    }
  }


  describe('testable', () => {
    test("should throw when not called on a field", () => {
      expect(() => class {
        //@ts-ignore
        @testable
        method() { }
      }).toThrow("Currently only Class Fields are supported");
    });
    test("should throw when not called on a private field", () => {
      expect(() => class {
        //@ts-ignore
        @testable
        test = 10;
      }).toThrow("this decorator can only be used on private members");
    });
    test("should throw when not called on a non static private field", () => {
      expect(() => class {
        //@ts-ignore
        @testable
        //@ts-ignore
        static #test = 10;
      }).toThrow("Currently static members are not supported");
    });
  });

  describe('getTestable', () => {
    test("should throw on an not decorated class", () => {
      const test = new class { }();
      expect(() => getTestable(test, "#private")).toThrow("Only Object Instances with metadata available can be accessed");
    });
    test("should throw if metadata is null", () => {
      class C {
        @testable
        //@ts-ignore
        #test = 10;
      };
      const test = new C();
      C[Symbol.metadata] = null;
      expect(() => getTestable(test, "#private")).toThrow("Only Object Instances with metadata available can be accessed");
    });
    test("should throw if metadata is not registered", () => {
      class C {
        @testable
        //@ts-ignore
        #test = 10;
      };
      const test = new C();
      C[Symbol.metadata] = {};
      expect(() => getTestable(test, "#private")).toThrow("Only Object Instances with metadata available can be accessed");
    });
    test("should throw if key is not registered", () => {
      const test = new Test();
      expect(() => getTestable(test, "#nonexistent")).toThrow("Only Object Instances with metadata available can be accessed");
    });
    test("should return the private field data", () => {
      const test = new Test();
      expect(getTestable(test, "#private")).toEqual(test.private);
    });
  });

  describe('setTestable', () => {
    test("should set the private field data", () => {
      const test = new Test();
      setTestable(test, "#private", "testing");
      expect(test.private).toEqual("testing");
    });
  });

});