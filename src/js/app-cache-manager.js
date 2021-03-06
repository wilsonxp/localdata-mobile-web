/*jslint nomen: true */
/*globals define: true */

define(function (require) {
  'use strict';

  var settings = require('settings');
  var _ = require('lib/underscore');
  var $ = require('jquery');

  var appCache = window.applicationCache;

  var manager = {};

  // Set up the App Cache logic.
  // Reload the page if we have an update. Otherwise, proceed once we've
  // determined there are no updates.
  // @param {Function} done Gets called when we've determined that there are no
  // updates. Takes no arguments.
  manager.init = function init(done) {
    if (!appCache) {
      return done();
    }

    function handleUpdate(e) {
      if (appCache.status === window.applicationCache.UPDATEREADY) {
        // We got a new app cache.
        // Swap in the new cache and reload the page, so we're using the new
        // code.
        window.applicationCache.swapCache();
        // TODO: we need to make sure this is not a jarring user experience.
        window.location.reload();
      } else {
        // If the manifest didn't change, we can proceed with the rest of the app.
        done();
      }
    }

    // Nothing to do. Proceed with current app code.
    function proceed(e) {
      console.info(e.type);
      console.log('Proceeding');
      done();
    }

    // New versions of the manifest resources have been downloaded.
    appCache.addEventListener('updateready', handleUpdate, false);

    // We encountered an error getting the manifest or one of the resources.
    appCache.addEventListener('error', proceed, false);

    // Manifest hasn't changed.
    appCache.addEventListener('noupdate', proceed, false);

    // Manifest no longer exists.
    appCache.addEventListener('obsolete', proceed, false);

    // Manifest resources have been downloaded and cached. This is not an
    // update of existing cached data.
    appCache.addEventListener('cached', proceed, false);
  };

  return manager;
});
