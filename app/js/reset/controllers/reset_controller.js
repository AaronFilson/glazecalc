module.exports = function(app) {
  app.controller('ResetController',
    ['$scope', '$location', '$routeParams', 'ResetService',
    function($scope, $location, $routeParams, resetserv) {
      $scope.errors = [];
      $scope.sent = false;
      $scope.working = false;
      $scope.delay = 1;

      $scope.ready = false;

      $scope.dismissError = function(err) {
        $scope.errors.splice($scope.errors.indexOf(err), 1);
      };

      $scope.submit = function(email) {
        if (!email) {
          $scope.errors.push('Error: there was no info to submit.');
          return console.log('No information in the object when calling submit!');
        }
        $scope.delay++;
        $scope.working = true;

        resetserv.submit(email, function(err) {
          if (err) {
            $scope.errors.push(err.data.msg);
            $scope.working = false;
            return console.log('Error in reset : ', err);
          }
          $scope.sent = true;
          $scope.working = false;
        });
      };

      $scope.checktoken = function() {
        // check for saved token or token in paramaters of url
        var storedToken = resetserv.getToken();
        if ((!storedToken) && (!$routeParams || !$routeParams.token)) return false;
        if (storedToken) {
          resetserv.verify(storedToken, function(err) {
            if (err) {
              console.log('Error in verify: ', err);
              $scope.ready = false;
            }
            $scope.ready = true;
          });
        } else {
          resetserv.verify($routeParams.token, function(err) {
            if (err) {
              console.log('Error in verify: ', err);
              $scope.ready = false;
            }
            $scope.ready = true;
          });
        }
      };

    }]);
};
