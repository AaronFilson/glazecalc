var host = 'http://' + 'ec2-35-163-34-249.us-west-2.compute.amazonaws.com';

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
        url: host + ':4000' + this.resourceName + 'getAll',
        headers: {
          token: userAuth.getToken()
        }
      })
        .then(handleSuccess(callback), handleFailure(callback));
    };

    Resource.prototype.getLatest = function(callback) {
      $http({
        method: 'GET',
        url: host + ':4000' + this.resourceName + 'getLatest',
        headers: {
          token: userAuth.getToken()
        }
      })
        .then(handleSuccess(callback), handleFailure(callback));
    };

    Resource.prototype.create = function(data, callback) {
      $http({
        method: 'POST',
        url: host + ':4000' + this.resourceName + 'create',
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
        url: host + ':4000' + this.resourceName + '/' + data._id,
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
        url: host + ':4000' + this.resourceName + 'delete/' + data._id,
        headers: {
          token: userAuth.getToken()
        }
      })
        .then(handleSuccess(callback), handleFailure(callback));
    };

    Resource.prototype.verify = function(callback) {
      $http({
        method: 'GET',
        url: host + ':4000/verify',
        headers: {
          token: $window.localStorage.token
        }
      })
        .then(handleSuccess(callback), handleFailure(callback));
    };

    Resource.prototype.getStandard = function(callback) {
      $http({
        method: 'GET',
        url: host + ':4000' + this.resourceName + 'getStandard',
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
