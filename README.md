description
===========

this is opinion on how JSX should be implemented inspired by:
 1. curiosity to [crank-js](https://crank.js.org/)
 2. and hate to [react](https://reactjs.org/)

supports 3 types of elements:

 1. static - regular elements

    this is either intrinsic HTML elements or custom elements withour state

 2. active - elements which return AsyncIterator (e.g. `function*`)

    each value returned from iterator should be valid element to be rendered

    these are stateful elements which may change over time

 3. future - elements which return promise (e.g. `async function`)

    these elements are like static, but require asynchronous operations to get data

does not support fragments, nodejs and other shit. only quality poo here.


TODO
====

 * finish TODO demo
 * write real docs
 * write at least some tests
 * check for memory leaks
 * check for performance
 * structure project properly
 * and ⬜ of course
