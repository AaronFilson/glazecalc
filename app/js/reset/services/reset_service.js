module.exports = function(app) {
  app.factory('ResetService', ['$http', '$window', function($http, $window) {
    var token;
    var user;
    var rs = {
      submit: function(email, token, cb) {
        cb = cb || function() {};
        $http.post('http://localhost:4000/reset', email, token)
          .then(function(res) {
            token = $window.localStorage.token = res.data.token;
            cb(null);
          }, function(res) {
            console.log('Reset submit fail promise, res status : ' + res.status);
            cb(res);
          });
      },
      getToken: function() {
        token = token || $window.localStorage.token;
        return token;
      },
      setToken: function(newTok) {
        if (!newTok) return false;
        $window.localStorage.token = newTok;
        token = newTok;
        return true;
      },
      verify: function(tkn, cb) {
        cb = cb || function() {};
        $http({
          method: 'GET',
          url: 'http://localhost:4000/verify',
          headers: {
            token: tkn
          }
        })
          .then(function() {
            cb(null);
          },
          function(res) {
            console.log('Verify fail promise, res status : ' + res.status);
            cb(res);
          });

      },
      getEmail: function(cb) {
        cb = cb || function() {};
        $http({
          method: 'GET',
          url: 'http://localhost:4000/verify',
          headers: {
            token: rs.getToken()
          }
        })
        .then(function(res) {
          user = res.data.email;
          cb(res);
        }, function(res) {
          cb(res);
        });
      }
    };
    return rs;
  }]);
};
