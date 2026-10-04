var apiBase = require('../api_base');

var handleSuccess = function(callback) {
  return function(res) {
    callback(null, res.data);
  };
};

var handleFailure = function(callback) {
  return function(res) {
    callback(res);
  };
};

module.exports = exports = function(app) {
  app.factory('gcaResource', ['$http', '$window', 'userAuth', function($http, $window, userAuth) {
    var Resource = function(resourceName) {
      this.resourceName = resourceName;
    };

    Resource.prototype.getAll = function(callback) {
      $http({
        method: 'GET',
        url: apiBase + this.resourceName + 'getAll',
        headers: {
          token: userAuth.getToken()
        }
      })
        .then(handleSuccess(callback), handleFailure(callback));
    };

    Resource.prototype.getLatest = function(callback) {
      $http({
        method: 'GET',
        url: apiBase + this.resourceName + 'getLatest',
        headers: {
          token: userAuth.getToken()
        }
      })
        .then(handleSuccess(callback), handleFailure(callback));
    };

    Resource.prototype.create = function(data, callback) {
      $http({
        method: 'POST',
        url: apiBase + this.resourceName + 'create',
        data: data,
        headers: {
          token: userAuth.getToken()
        }
      })
        .then(handleSuccess(callback), handleFailure(callback));
    };

    Resource.prototype.update = function(data, callback) {
      $http({
        method: 'PUT',
        url: apiBase + this.resourceName + '/' + data._id,
        data: data,
        headers: {
          token: userAuth.getToken()
        }
      })
        .then(handleSuccess(callback), handleFailure(callback));
    };

    Resource.prototype.delete = function(data, callback) {
      $http({
        method: 'DELETE',
        url: apiBase + this.resourceName + 'delete/' + data._id,
        headers: {
          token: userAuth.getToken()
        }
      })
        .then(handleSuccess(callback), handleFailure(callback));
    };

    Resource.prototype.verify = function(callback) {
      $http({
        method: 'GET',
        url: apiBase + '/verify',
        headers: {
          token: $window.localStorage.token
        }
      })
        .then(handleSuccess(callback), handleFailure(callback));
    };

    Resource.prototype.getStandard = function(callback) {
      $http({
        method: 'GET',
        url: apiBase + this.resourceName + 'getStandard',
        headers: {
          token: userAuth.getToken()
        }
      })
        .then(handleSuccess(callback), handleFailure(callback));
    };

    return function(resourceName) {
      return new Resource(resourceName);
    };
  }]);
};
