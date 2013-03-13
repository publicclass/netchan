
0.3.0 / 2013-03-13
==================

  * Got the tests to work in node for that pretty green badge.
  * Removed latency code. Better to be dealt with in the app.

0.2.0 / 2013-02-18
==================

  * Updated tests to work with the correct shrink behavior
  * Cache encoded message until it changes
  * Shrink based on received ack, not own ack (duh)

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