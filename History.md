
0.1.0 / 2013-02-04
==================

  * Better binary and message length check
  * Don't rebind NetChan#recv so it can be overwritten if necessary (like base64 wrapping)
  * Updated the tests with both mock and real DataChannels and more data.
  * Added built-in latency tracking. Breaks the tests in node because dependencies are missing package.json

0.0.1 / 2012-01-20
==================

  * Got the tests to pass with the new, better, shrink().
  * Refactored buffer shrinking into method. Fixed shrinking bug when index is 0 by checking for null.
  * Initial commit. Encode and decode seems to pass the unit tests.