// Reference Switches so that the const:production and const:development packages are defined
/// <reference types="@iiimaddiniii/js-build-tool/switches" />

import prod from "consts:production";

prod;

export function helloWorld(): string {
  return "Hello World!";
}
