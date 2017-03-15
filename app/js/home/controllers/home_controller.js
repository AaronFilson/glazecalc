module.exports = function(app) {
  app.controller('HomeController',
    ['$scope', '$http', 'gcaResource', function($scope, $http, Resource) {
      $scope.errors = [];
      var homeService = Resource('/home');

      $scope.dismissError = function(err) {
        $scope.errors.splice($scope.errors.indexOf(err), 1);
      };

      $scope.submit = function(settings) {
        if (!settings) {
          $scope.errors.push('Error: there was no info to submit.');
          return console.log('No information in the object when calling submit!');
        }
        homeService.create(settings, function(err) {
          if (err) {
            $scope.errors.push(err);
            return console.dir('Error: ', err);
          }
        });
      };
    }]);
};
