module.exports = function(app) {
  app.controller('ResetController',
    ['$scope', '$location', '$routeParams', 'ResetService',
    function($scope, $location, $routeParams, resetserv) {
      $scope.errors = [];
      $scope.sent = false;
      // $scope.working = false;
      // ^-- to show a spinner while in delay. idea on hold for now
      // $scope.delay = 1;
      // ^-- possible idea to put a time delay on repeated requests. 2^delay seconds for the next...
      $scope.tokenValid = null;

      $scope.ready = false;

      $scope.dismissError = function(err) {
        $scope.errors.splice($scope.errors.indexOf(err), 1);
      };

      $scope.submit = function(email) {
        if (!email) {
          $scope.errors.push('Error: Email in submit was missing.');
          return console.log('Email was null in submit.');
        }
        // $scope.delay++;
        // $scope.working = true;

        resetserv.submit(email, $scope.tokenValid, function(err) {
          if (err) {
            $scope.errors.push(err.data.msg);
            // $scope.working = false;
            $scope.sent = false;
            return console.log('Error in reset : ', err);
          }
          $scope.sent = true;
          // $scope.working = false;
        });
      };

      $scope.checktoken = function() {
        // check for saved token or token in paramaters of url
        var storedToken = resetserv.getToken();
        if ((!storedToken) && (!$routeParams || !$routeParams.token)) return;
        var whichtoken = storedToken || $routeParams.token;
        resetserv.verify(whichtoken, function(err) {
          if (err) {
            console.log('Error in verify: ', err);
            $scope.errors.push('Error in link or saved login info. Try again please.');
            $scope.ready = false;
            return;
          }
          $scope.ready = true;
          $scope.tokenValid = whichtoken;
        });
      };

      $scope.change = function(newpassword, emailaddy) {
        // at this point the app has gotten a valid token
        if (!newpassword || !emailaddy) return;
        resetserv.change(newpassword, emailaddy, $scope.tokenValid, function(err) {
          if (err) {
            $scope.errors.push('Error in update. Try again please.');
            return console.log('Error delivered in callback for change: ', err);
          }
          $scope.success = true;
        });
      };

    }]);
};
