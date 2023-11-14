module.exports = function(app) {
  app.controller('authController',
  ['$scope', '$location', 'userAuth', function($scope, $location, userAuth) {
    $scope.email = null;

    $scope.updateEmail = function() {
      userAuth.getEmail(function(res) {
        $scope.email = res.data ? res.data.email : null;
      });
    };

    $scope.logout = function() {
      userAuth.signOut(function() {
        $scope.email = null;
        $location.path('/signin');
      });
    };
  }]);
};
